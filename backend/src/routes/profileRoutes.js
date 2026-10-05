const express = require('express')
const { authenticate, authorize } = require('../middleware/authenticate')

const {
  createWorkerProfile,
  getWorkerProfile,
  updateWorkerProfile,
  getClientProfile,
  updateClientProfile
} = require('../controllers/profileController')

const router = express.Router()

// Profile writes and the self-service endpoint are worker-only; viewing a
// different worker's profile is restricted by the ownership check below.
router.post('/', authenticate, authorize('Worker'), createWorkerProfile)

router.get('/mine', authenticate, authorize('Worker'), getWorkerProfile)

router.put('/mine', authenticate, authorize('Worker'), updateWorkerProfile)

// Client profiles are self-service resources and are always scoped to the
// authenticated Client account.
router.get('/client/mine', authenticate, authorize('Client'), getClientProfile)
router.put('/client/mine', authenticate, authorize('Client'), updateClientProfile)

router.get('/:userId', authenticate, authorize('Worker', 'Client', 'Administrator'), (req, res, next) => {
  if (req.user.role === 'Worker' && String(req.user.userId) !== req.params.userId) {
    return res.status(403).json({ message: 'You are not allowed to view this profile.' })
  }
  req.user.userId = Number(req.params.userId)
  return getWorkerProfile(req, res, next)
})

module.exports = router
