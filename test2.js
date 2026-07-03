const { triggerEngine } = require('./src/lib/engine.js');
const { getDb } = require('./src/db/index.js');

try {
  triggerEngine();
  const db = getDb();
  console.log(db.prepare("SELECT * FROM matches WHERE stage IN ('r32', 'r16')").all());
} catch(e) {
  console.error(e);
}
