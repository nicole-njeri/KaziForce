const express = require('express')
const { authenticate, authorize } = require('../middleware/authenticate')

const {
  createApplication,
  getWorkerApplications,
  getApplicationById,
  getGigApplications,
  updateApplicationStatus,
  reviewWorker
} = require('../controllers/applicationController')

const router = express.Router()

// Workers create and list only their own applications; client actions are
// further checked against gig ownership inside the controller.
// Submit a new application
router.post(
  '/',
  authenticate,
  authorize('Worker'),
  createApplication
)

// Get all applications for a worker
router.get(
  '/worker/mine',
  authenticate,
  authorize('Worker'),
  getWorkerApplications
)

router.get(
  '/gig/:gigId',
  authenticate,
  authorize('Client'),
  getGigApplications
)

router.patch(
  '/:applicationId/status',
  authenticate,
  authorize('Client'),
  updateApplicationStatus
)

router.post(
  '/:applicationId/review',
  authenticate,
  authorize('Client'),
  reviewWorker
)

// Get one application
router.get(
  '/:applicationId',
  authenticate,
  getApplicationById
)

module.exports = router
