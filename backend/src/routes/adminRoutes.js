const express = require('express')
const { authenticate, authorize } = require('../middleware/authenticate')
const { getOverview, getUsers, updateUserStatus, getGigs, moderateGig } = require('../controllers/adminController')
const { getPendingVerifications, reviewVerification } = require('../controllers/clientVerificationController')

const router = express.Router()
// Apply both checks once here so every monitoring and moderation endpoint
// inherits authentication and administrator-only access.
router.use(authenticate, authorize('Administrator'))
router.get('/overview', getOverview)
router.get('/users', getUsers)
router.patch('/users/:userId/status', updateUserStatus)
router.get('/gigs', getGigs)
router.patch('/gigs/:gigId/moderation', moderateGig)
router.get('/verifications/pending', getPendingVerifications)
router.patch('/verifications/:verificationId', reviewVerification)

module.exports = router
