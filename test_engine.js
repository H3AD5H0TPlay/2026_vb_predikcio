const { triggerEngine } = require('./src/lib/engine.js');
try {
  triggerEngine();
  console.log("triggerEngine futás kész.");
} catch(err) {
  console.error("Hiba triggerEngine futása közben:", err);
}
