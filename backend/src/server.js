const express = require('express')
const cors = require('cors')
require('dotenv').config()

const pool = require('./config/db')

const authRoutes = require('./routes/authRoutes')
const profileRoutes = require('./routes/profileRoutes')
const matchingRoutes = require('./routes/matchingRoutes')
const applicationRoutes = require('./routes/applicationRoutes')

const app = express()

const PORT =
  process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({
    message:
      'KaziForce backend is running'
  })
})

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

app.listen(
  PORT,
  () => {
    console.log(
      `KaziForce backend running on port ${PORT}`
    )
  }
)