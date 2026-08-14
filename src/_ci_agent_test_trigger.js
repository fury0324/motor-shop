// Temporary file to trigger a real CI failure and verify ai-ci-agent
// posts an assessment. Safe to delete after the test.
const unusedVariableToTriggerLintFailure = 'this is intentional'

export function ciAgentTestTrigger() {
  return 'ok'
}
