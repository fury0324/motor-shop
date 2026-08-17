// Temporary file to trigger a real CI failure AND demonstrate the new
// multi-finding capability: the unused variable below causes the actual
// lint failure (the mandatory "ci-failure" finding), while the
// hardcoded-looking API key is a separate issue in the same diff that
// the expanded review should flag as an additional "security" finding.
// Safe to delete after viewing.
const unusedMultiFindingVariable = 'this failure is intentional'

const PAYMENT_PROVIDER_SECRET = 'hardcoded-not-a-real-secret-1234567890abcdef'

export function chargeCard(amount) {
  return fetch('https://api.example-payments.test/v1/charges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAYMENT_PROVIDER_SECRET}` },
    body: JSON.stringify({ amount }),
  })
}
