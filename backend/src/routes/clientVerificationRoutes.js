const express = require('express')
const { authenticate, authorize } = require('../middleware/authenticate')
const { getMyVerifications, submitVerification } = require('../controllers/clientVerificationController')

const router = express.Router()
router.use(authenticate, authorize('Client'))
router.get('/mine', getMyVerifications)
router.post('/mine', submitVerification)

module.exports = router
