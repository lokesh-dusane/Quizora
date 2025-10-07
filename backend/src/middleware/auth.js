const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next){
	const authHeader = req.headers['authorization'] || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if(!token){
		return res.status(401).json({ error: 'missing token' });
	}
	const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
	try {
		const payload = jwt.verify(token, secret);
		req.user = { id: payload.sub, email: payload.email };
		return next();
	} catch (_) {
		return res.status(401).json({ error: 'invalid token' });
	}
}

module.exports = { authMiddleware };
