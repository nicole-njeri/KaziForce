const pool = require('../config/db')
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

    if (req.user?.role !== 'Client' && req.user?.role !== 'Administrator') {
      return res.status(403).json({ message: 'Only clients can request worker recommendations.' })
    }

    // Verify the client owns the requested gig before loading records for
    // the matching service; administrators may inspect any gig.
    const gigResult = await pool.query(
      `SELECT gig_id::text, title, description, category, required_skills,
              location, budget, duration, status
       FROM gigs WHERE gig_id = $1 AND ($2 = 'Administrator' OR client_id = $3)`,
      [gigId, req.user.role, req.user.userId]
    )
    if (!gigResult.rowCount) return res.status(404).json({ message: 'Gig not found.' })

    // Match against active workers using live profile skills and review averages.
    const workersResult = await pool.query(
      `SELECT u.user_id::text AS worker_id, u.location,
              COALESCE(wp.skills, '') AS skills,
              COALESCE(wp.experience_years, 0) AS experience_years,
              COALESCE(AVG(wr.rating), 0) AS reputation
       FROM users u LEFT JOIN worker_profiles wp ON wp.user_id = u.user_id
       LEFT JOIN worker_reviews wr ON wr.worker_id = u.user_id
       WHERE u.role = 'Worker' AND u.is_active = TRUE
       GROUP BY u.user_id, u.location, wp.skills, wp.experience_years`
    )

    // Flask applies the shared tag scoring and ranking pipeline to these live
    // records while the standalone CSV fixtures remain the original test data.
    const response = await fetch(
      `${MATCHING_SERVICE_URL}/api/match/workers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gig_id: gigId,
          gig: gigResult.rows[0],
          workers: workersResult.rows,
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
    const { topN = 5 } = req.body
    if (req.user?.role !== 'Worker') return res.status(403).json({ message: 'Only workers can request gig recommendations.' })

    const workerResult = await pool.query(
      `SELECT u.user_id::text AS worker_id, u.location,
              COALESCE(wp.skills, '') AS skills,
              COALESCE(wp.experience_years, 0) AS experience_years,
              COALESCE((SELECT AVG(rating) FROM worker_reviews WHERE worker_id = u.user_id), 0) AS reputation
       FROM users u LEFT JOIN worker_profiles wp ON wp.user_id = u.user_id
       WHERE u.user_id = $1 AND u.is_active = TRUE`,
      [req.user.userId]
    )
    if (!workerResult.rowCount) return res.status(404).json({ message: 'Worker account not found.' })

    // Recommend only open gigs to the authenticated worker.
    const gigsResult = await pool.query(
      `SELECT gig_id::text, title, description, category, required_skills,
              location, budget, duration
       FROM gigs WHERE status = 'Open' ORDER BY created_at DESC`
    )
    const worker = workerResult.rows[0]

    // Use the same Flask tag-scoring pipeline for the reverse recommendation direction.
    const response = await fetch(
      `${MATCHING_SERVICE_URL}/api/match/gigs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          worker_id: worker.worker_id,
          worker,
          gigs: gigsResult.rows,
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
