const { getDb } = require('./src/db/index.js');
const { triggerEngine } = require('./src/lib/engine.js');

const db = getDb();
const matches = db.prepare('SELECT * FROM matches').all();
if (matches.length > 0) {
  const match = matches[0];
  console.log("Módosítás előtt:", match);
  
  db.prepare(`UPDATE matches SET goals_home = 5, goals_away = 0 WHERE id = ?`).run(match.id);
  
  console.log("Módosítás megtörtént a DB-ben, futtatom a triggerEngine-t...");
  try {
    triggerEngine();
    console.log("triggerEngine lefutott!");
  } catch (e) {
    console.error("Hiba a triggerEngine-ben:", e);
  }
} else {
  console.log("Nincs meccs a db-ben.");
}
