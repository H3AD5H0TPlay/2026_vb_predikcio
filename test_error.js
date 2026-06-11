const { triggerEngine } = require('./src/lib/engine.js');
try {
  triggerEngine();
  console.log("Success");
} catch(e) {
  console.error("Error:", e);
}
