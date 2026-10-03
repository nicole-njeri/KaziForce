const express = require('express')

const {
  createWorkerProfile,
  getWorkerProfile
} = require('../controllers/profileController')

const router = express.Router()

router.post('/', createWorkerProfile)

router.get('/:userId', getWorkerProfile)

module.exports = router