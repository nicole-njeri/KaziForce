const jwt = require('jsonwebtoken')
const pool = require('../config/db')

const authenticate = async (req, res, next) => {
  const authorization = req.headers.authorization || ''
  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication is required.' })
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Authentication is not configured.' })
  }

  try {
    // Verify signature and expiry before trusting any user or role claims.
    req.user = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or has expired.' })
  }

  try {
    // Recheck database activity on each request so suspension takes effect
    // immediately instead of waiting for an already-issued token to expire.
    const account = await pool.query('SELECT is_active FROM users WHERE user_id = $1', [req.user.userId])
    if (!account.rowCount || !account.rows[0].is_active) {
      return res.status(401).json({ message: 'This account is inactive or no longer exists.' })
    }
    return next()
  } catch (error) {
    console.error('Authentication account lookup error:', error)
    return res.status(500).json({ message: 'Unable to verify your account.' })
  }
}

// Route handlers use this after authentication to enforce least-privilege roles.
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'You are not allowed to perform this action.' })
  }

  return next()
}

module.exports = { authenticate, authorize }
