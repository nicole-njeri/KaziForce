const express = require('express')

const {
  getWorkerRecommendations,
  getGigRecommendations
} = require('../controllers/matchingController')

const router = express.Router()


// ---------------------------------------------------------
// RECOMMEND WORKERS FOR A GIG
// ---------------------------------------------------------

router.post(
  '/workers',
  getWorkerRecommendations
)


// ---------------------------------------------------------
// RECOMMEND GIGS FOR A WORKER
// ---------------------------------------------------------

router.post(
  '/gigs',
  getGigRecommendations
)


module.exports = router