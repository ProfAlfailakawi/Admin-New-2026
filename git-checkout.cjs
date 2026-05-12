const { execSync } = require('child_process');
try {
  execSync('git checkout src/components/CustomerPage.tsx');
  console.log("Git checkout successful.");
} catch (e) {
  console.log("Git checkout failed.", e.message);
}
