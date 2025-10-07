const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { database } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const User = (() => { try { return require('../models/User'); } catch (_) { return null; } })();

const router = express.Router();

const getJwtSecret = () => {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT_SECRET not set');
	}
	return secret;
};

const usingMongo = !!(process.env.MONGODB_URI && User);

router.post('/register', async (req, res) => {
	const { name, email, password } = req.body;
	if (!name || !email || !password) {
		return res.status(400).json({ error: 'name, email and password are required' });
	}

	try {
		if (usingMongo) {
			const existing = await User.findOne({ email: (email||'').toLowerCase().trim() }).lean();
			if (existing) return res.status(409).json({ error: 'email already registered' });
			const passwordHash = bcrypt.hashSync(password, 10);
			const doc = await User.create({ name, email, passwordHash });
			const token = jwt.sign({ sub: doc._id.toString(), email: doc.email }, getJwtSecret(), { expiresIn: '7d' });
			return res.status(201).json({ token, user: { id: doc._id, name: doc.name, email: doc.email } });
		}

		// SQLite fallback
		database.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
			if (err) return res.status(500).json({ error: 'database error' });
			if (row) return res.status(409).json({ error: 'email already registered' });

			const passwordHash = bcrypt.hashSync(password, 10);
			database.run(
				'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
				[name, email, passwordHash],
				function (insertErr) {
					if (insertErr) return res.status(500).json({ error: 'failed to create user' });
					const userId = this.lastID;
					const token = jwt.sign({ sub: userId, email }, getJwtSecret(), { expiresIn: '7d' });
					return res.status(201).json({ token, user: { id: userId, name, email } });
				}
			);
		});
	} catch (e) {
		return res.status(400).json({ error: e.message || 'validation error' });
	}
});

router.post('/login', async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) {
		return res.status(400).json({ error: 'email and password are required' });
	}

	try {
		if (usingMongo) {
			const user = await User.findOne({ email: (email||'').toLowerCase().trim() });
			if (!user) return res.status(401).json({ error: 'invalid credentials' });
			const valid = bcrypt.compareSync(password, user.passwordHash);
			if (!valid) return res.status(401).json({ error: 'invalid credentials' });
			const token = jwt.sign({ sub: user._id.toString(), email: user.email }, getJwtSecret(), { expiresIn: '7d' });
			return res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
		}

		// SQLite fallback
		database.get('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email], (err, user) => {
			if (err) return res.status(500).json({ error: 'database error' });
			if (!user) return res.status(401).json({ error: 'invalid credentials' });

			const valid = bcrypt.compareSync(password, user.password_hash);
			if (!valid) return res.status(401).json({ error: 'invalid credentials' });

			const token = jwt.sign({ sub: user.id, email: user.email }, getJwtSecret(), { expiresIn: '7d' });
			return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
		});
	} catch (e) {
		return res.status(400).json({ error: 'login error' });
	}
});

router.get('/me', authMiddleware, async (req, res) => {
	try {
		if (usingMongo) {
			const user = await User.findById(req.user.id).select('name email');
			if (!user) return res.status(404).json({ error: 'user not found' });
			return res.json({ user: { id: user._id, name: user.name, email: user.email } });
		}
		// SQLite fallback
		database.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id], (err, user) => {
			if (err) return res.status(500).json({ error: 'database error' });
			if (!user) return res.status(404).json({ error: 'user not found' });
			return res.json({ user });
		});
	} catch (_) {
		return res.status(500).json({ error: 'failed to load user' });
	}
});

module.exports = router;
