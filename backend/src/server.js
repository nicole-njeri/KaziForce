const express = require('express')
const cors = require('cors')
require('dotenv').config()

const pool = require('./config/db')

const authRoutes = require('./routes/authRoutes')
const profileRoutes = require('./routes/profileRoutes')
const matchingRoutes = require('./routes/matchingRoutes')
const applicationRoutes = require('./routes/applicationRoutes')
const gigRoutes = require('./routes/gigRoutes')
const adminRoutes = require('./routes/adminRoutes')

const app = express()

const PORT =
  process.env.PORT || 5000


// -------------------------------------------------------
// MIDDLEWARE
// -------------------------------------------------------

// CORS is open for local development; production deployment must restrict
// origins to the hosted frontend.
app.use(cors())
app.use(express.json())


// -------------------------------------------------------
// ROOT ROUTE
// -------------------------------------------------------

app.get('/', (req, res) => {
  res.json({
    message:
      'KaziForce backend is running'
  })
})


// -------------------------------------------------------
// API ROUTES
// -------------------------------------------------------

app.use(
  '/api/auth',
  authRoutes
)

app.use(
  '/api/profiles',
  profileRoutes
)

app.use(
  '/api/matching',
  matchingRoutes
)

app.use(
  '/api/applications',
  applicationRoutes
)

app.use(
  '/api/gigs',
  gigRoutes
)

app.use('/api/admin', adminRoutes)


// -------------------------------------------------------
// Lightweight database health endpoint used during local setup and demos.
// -------------------------------------------------------

app.get(
  '/api/test-db',
  async (req, res) => {
    try {

      const result =
        await pool.query(
          'SELECT NOW()'
        )

      res.json({
        message:
          'Database connection successful',
        time:
          result.rows[0].now
      })

    } catch (error) {

      console.error(
        'Database test error:',
        error
      )

      res.status(500).json({
        message:
          'Database connection failed'
      })
    }
  }
)


// -------------------------------------------------------
// START SERVER
// -------------------------------------------------------

app.listen(
  PORT,
  () => {
    console.log(
      `KaziForce backend running on port ${PORT}`
    )
  }
)
