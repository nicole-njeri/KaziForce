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
      role,
      termsAccepted
    } = req.body || {}

    if ([fullName, email, phone, location, password, role].some((value) => typeof value !== 'string' || !value.trim())) {
      return res.status(400).json({
        message: 'All required fields must be provided.'
      })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Enter a valid email address.' })
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' })
    }

    if (termsAccepted !== true) {
      return res.status(400).json({ message: 'You must accept the terms and conditions.' })
    }

    // Administrator accounts are provisioned by the deployment owner, never
    // through public registration, so an anonymous caller cannot grant
    // themselves platform-wide privileges.
    const validRoles = ['Worker', 'Client']

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid user role.'
      })
    }

    // Check if email already exists
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = phone.trim()
    const existingEmail = await pool.query(
      'SELECT user_id FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    )

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      })
    }

    // Check if phone already exists
    const existingPhone = await pool.query(
      'SELECT user_id FROM users WHERE phone = $1',
      [normalizedPhone]
    )

    if (existingPhone.rows.length > 0) {
      return res.status(409).json({
        message: 'An account with this phone number already exists.'
      })
    }

    // Store only a one-way bcrypt hash; the returned registration record
    // deliberately excludes this field.
    const passwordHash = await bcrypt.hash(password, 10)

    // Save user
    const result = await pool.query(
      `INSERT INTO users
      (full_name, email, phone, location, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, full_name, email, phone, location, role, created_at`,
      [
        fullName.trim(),
        normalizedEmail,
        normalizedPhone,
        location.trim(),
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
    const { email, password } = req.body || {}

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
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
        is_active,
        password_hash,
        role
       FROM users
      WHERE LOWER(email) = LOWER($1)`,
      [typeof email === 'string' ? email.trim() : '']
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      })
    }

    const user = result.rows[0]

    // A suspended user must not receive a fresh token, even if the password
    // is correct; middleware also rechecks activity on existing tokens.
    if (user.is_active === false) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      })
    }

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
