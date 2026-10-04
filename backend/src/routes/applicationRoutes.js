const express = require('express')

const {
  createApplication,
  getWorkerApplications,
  getApplicationById
} = require('../controllers/applicationController')

const router = express.Router()

// Submit a new application
router.post(
  '/',
  createApplication
)

// Get all applications for a worker
router.get(
  '/worker/:workerId',
  getWorkerApplications
)

// Get one application
router.get(
  '/:applicationId',
  getApplicationById
)

module.exports = router