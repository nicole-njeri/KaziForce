const MATCHING_SERVICE_URL =
  process.env.MATCHING_SERVICE_URL ||
  'http://127.0.0.1:5001'

// ---------------------------------------------------------
// MATCH WORKERS TO A GIG
// ---------------------------------------------------------

const getWorkerRecommendations = async (req, res) => {
  try {
    const { gigId, topN = 5 } = req.body

    if (!gigId) {
      return res.status(400).json({
        message: 'gigId is required'
      })
    }

    const response = await fetch(
      `${MATCHING_SERVICE_URL}/api/match/workers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gig_id: gigId,
          top_n: topN
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.json(data)
  } catch (error) {
    console.error(
      'Worker recommendation error:',
      error
    )

    return res.status(500).json({
      message:
        'Unable to connect to the matching service'
    })
  }
}


// ---------------------------------------------------------
// MATCH GIGS TO A WORKER
// ---------------------------------------------------------

const getGigRecommendations = async (req, res) => {
  try {
    const { workerId, topN = 5 } = req.body

    if (!workerId) {
      return res.status(400).json({
        message: 'workerId is required'
      })
    }

    const response = await fetch(
      `${MATCHING_SERVICE_URL}/api/match/gigs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          worker_id: workerId,
          top_n: topN
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.json(data)
  } catch (error) {
    console.error(
      'Gig recommendation error:',
      error
    )

    return res.status(500).json({
      message:
        'Unable to connect to the matching service'
    })
  }
}


module.exports = {
  getWorkerRecommendations,
  getGigRecommendations
}