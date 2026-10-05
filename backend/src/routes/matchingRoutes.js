const express = require('express')
const { authenticate, authorize } = require('../middleware/authenticate')

const {
  getWorkerRecommendations,
  getGigRecommendations
} = require('../controllers/matchingController')

const router = express.Router()

// Restrict each recommendation direction to the role whose data it uses;
// controllers additionally verify client ownership of the gig.

// ---------------------------------------------------------
// RECOMMEND WORKERS FOR A GIG
// ---------------------------------------------------------

router.post(
  '/workers',
  authenticate,
  authorize('Client', 'Administrator'),
  getWorkerRecommendations
)


// ---------------------------------------------------------
// RECOMMEND GIGS FOR A WORKER
// ---------------------------------------------------------

router.post(
  '/gigs',
  authenticate,
  authorize('Worker'),
  getGigRecommendations
)


module.exports = router
