const express = require('express')
const cors = require('cors')
require('dotenv').config()

const pool = require('./config/db')
const authRoutes = require('./routes/authRoutes')

const app = express()

const PORT = process.env.PORT || 5000

// Middleware - allows the ract frontend on port 5173
app.use(cors())
// allows the backend to receive JSON data in requests
app.use(express.json())

// Test backend
app.get('/', (req, res) => {
  res.json({
    message: 'KaziForce backend is running'
  })
})

// Authentication routes - API
app.use('/api/auth', authRoutes)

// Test database
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')

    res.json({
      message: 'Database connection successful',
      time: result.rows[0].now
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Database connection failed'
    })
  }
})

app.listen(PORT, () => {
  console.log(`KaziForce backend running on port ${PORT}`)
})