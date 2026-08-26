// Temporary file for a final end-to-end check: an unused variable
// triggers the CI lint failure, and the hardcoded-looking credential
// below should be flagged as a separate finding, with both showing up
// as a native GitHub-style Discord message. Safe to delete after
// viewing.
const unusedFinalTestVariable = 'this failure is intentional'

const NOTIFICATION_SERVICE_TOKEN = 'hardcoded-not-a-real-token-9876543210zyxwvu'

export function sendNotification(message) {
  return fetch('https://api.example-notify.test/v1/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${NOTIFICATION_SERVICE_TOKEN}` },
    body: JSON.stringify({ message }),
  })
}
