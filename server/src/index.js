import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initializeApp, cert } from 'firebase-admin/app'
import { authMiddleware } from './authMiddleware.js'

import usersRouter from './routes/users.js'
import customersRouter from './routes/customers.js'
import inventoryRouter from './routes/inventory.js'
import transactionsRouter from './routes/transactions.js'
import partsTransactionsRouter from './routes/partsTransactions.js'
import dashboardRouter from './routes/dashboard.js'
import notificationsRouter from './routes/notifications.js'
import aiRouter from './routes/ai.js'
import uploadsRouter from './routes/uploads.js'
import internalRouter from './routes/internal.js'
import settingsRouter from './routes/settings.js'

// Render doesn't run inside Google's infrastructure, so there's no ambient
// service identity the way Cloud Functions has — the service account key
// must be supplied explicitly via an env var (see server/.env.example).
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not set — cannot initialize firebase-admin.')
  process.exit(1)
}
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
initializeApp({ credential: cert(serviceAccount) })

const app = express()

// Same allowed-origins gate the client used to get for free from Cloud
// Functions' default CORS handling — restrict to the deployed app's actual
// origin(s), configurable via env so local dev + production both work.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`Origin ${origin} not allowed`))
  },
}))

app.use(express.json({ limit: '2mb' }))
app.use(authMiddleware)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api', usersRouter)
app.use('/api', customersRouter)
app.use('/api', inventoryRouter)
app.use('/api', transactionsRouter)
app.use('/api', partsTransactionsRouter)
app.use('/api', dashboardRouter)
app.use('/api', notificationsRouter)
app.use('/api', aiRouter)
app.use('/api', uploadsRouter)
app.use('/api', settingsRouter)
app.use('/internal', internalRouter)

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Euro Motor Shop API listening on port ${port}`)
})
