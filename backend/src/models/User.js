const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true,
		validate: {
			validator: (v) => validator.isEmail(v),
			message: 'Invalid email address'
		}
	},
	passwordHash: { type: String, required: true },
	createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
