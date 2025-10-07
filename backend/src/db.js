const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const databaseFilePath = path.join(__dirname, '..', 'data.sqlite');
const database = new sqlite3.Database(databaseFilePath);

const initializeDatabase = () => {
	database.serialize(() => {
		database.run(`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`);
	});
};

module.exports = { database, initializeDatabase };
