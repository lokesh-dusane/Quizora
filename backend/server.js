const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { initializeDatabase } = require('./src/db');

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || '';

const app = express();
app.use(cors());
app.use(express.json());

(async () => {
	if (MONGODB_URI) {
		try {
			await mongoose.connect(MONGODB_URI);
			console.log('Connected to MongoDB');
		} catch (err) {
			console.error('MongoDB connection error:', err.message);
		}
	} else {
		console.log('MONGODB_URI not set; using SQLite fallback');
		initializeDatabase();
	}
})();

// Health
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' });
});

// Routes
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
	console.log(`Auth server listening on port ${PORT}`);
});
