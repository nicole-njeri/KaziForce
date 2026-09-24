const bcrypt = require('bcrypt')
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

module.exports = {
  registerUser
}