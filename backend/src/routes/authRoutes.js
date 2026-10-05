const express = require('express')

const {
  registerUser,
  loginUser
} = require('../controllers/authController')

const router = express.Router()

// Registration and login are public entry points; their controllers validate
// submitted data and never return stored password hashes.
router.post('/register', registerUser)

router.post('/login', loginUser)

module.exports = router
