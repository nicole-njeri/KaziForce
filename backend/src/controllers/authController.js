const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')

const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      location,
      password,
      role
    } = req.body

    // Check required fields
    if (
      !fullName ||
      !email ||
      !phone ||
      !location ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        message: 'All required fields must be provided.'
      })
    }

    // Check valid role
    const validRoles = ['Worker', 'Client', 'Administrator']

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid user role.'
      })
    }

    // Check if email already exists
    const existingEmail = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    )

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      })
    }

    // Check if phone already exists
    const existingPhone = await pool.query(
      'SELECT user_id FROM users WHERE phone = $1',
      [phone]
    )

    if (existingPhone.rows.length > 0) {
      return res.status(409).json({
        message: 'An account with this phone number already exists.'
      })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Save user
    const result = await pool.query(
      `INSERT INTO users
      (full_name, email, phone, location, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, full_name, email, phone, location, role, created_at`,
      [
        fullName,
        email,
        phone,
        location,
        passwordHash,
        role
      ]
    )

    res.status(201).json({
      message: 'Account created successfully.',
      user: result.rows[0]
    })

  } catch (error) {
    console.error('Registration error:', error)

    res.status(500).json({
      message: 'Server error while creating account.'
    })
  }
}
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      })
    }

    const result = await pool.query(
      `SELECT
        user_id,
        full_name,
        email,
        phone,
        location,
        password_hash,
        role
       FROM users
       WHERE email = $1`,
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      })
    }

    const user = result.rows[0]

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      })
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h'
      }
    )

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Login error:', error)

    res.status(500).json({
      message: 'Server error while logging in.'
    })
  }
}

module.exports = {
  registerUser,
  loginUser
}