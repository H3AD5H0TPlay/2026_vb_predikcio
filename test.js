const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('prediction.db');
console.log(db.prepare("SELECT * FROM matches WHERE stage IN ('r32', 'r16')").all());
