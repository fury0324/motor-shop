// Throwaway file: intentionally triggers an ESLint failure (unused
// variable) to compare pr-review.yml (standalone) and investigate.yml
// (vendored) posting on the same failing-CI PR. Safe to delete.
function ciAgentTestUnusedVariable2() {
  const unusedTestVariable = 42;
  return "ok";
}

export default ciAgentTestUnusedVariable2;
