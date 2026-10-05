const express = require('express')
const { authenticate, authorize } = require('../middleware/authenticate')

const {
  createGig,
  getAllGigs,
  getGigById,
  getClientGigs,
  updateClientGig
} = require('../controllers/gigController')

const router = express.Router()

// Public reads expose only open gigs; client writes require authentication and
// ownership is derived from the verified token in the controller.

// Create a new gig
router.post(
  '/',
  authenticate,
  authorize('Client'),
  createGig
)


// Get all gigs
router.get(
  '/',
  getAllGigs
)


// Get gigs belonging to a client
router.get(
  '/client/mine',
  authenticate,
  authorize('Client'),
  getClientGigs
)

router.patch(
  '/:gigId',
  authenticate,
  authorize('Client'),
  updateClientGig
)


// Get one gig
router.get(
  '/:gigId',
  getGigById
)


module.exports = router
