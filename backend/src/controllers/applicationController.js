const pool = require('../config/db')

// CREATE APPLICATION
const createApplication = async (req, res) => {
  try {
    const {
      gigId,
      coverMessage = ''
    } = req.body

    // Worker identity comes from the verified JWT, not the submitted payload.
    const workerId = req.user.userId

    if (!gigId) {
      return res.status(400).json({
        message: 'gigId is required'
      })
    }

    const gigResult = await pool.query(
      'SELECT gig_id, status FROM gigs WHERE gig_id = $1',
      [gigId]
    )
    if (gigResult.rows.length === 0) {
      return res.status(404).json({ message: 'Gig not found.' })
    }
    if (gigResult.rows[0].status !== 'Open') {
      return res.status(409).json({ message: 'This gig is no longer accepting applications.' })
    }

    // Check whether the worker has already applied
    // for this gig.
    const existingApplication =
      await pool.query(
        `
        SELECT
          application_id,
          worker_id,
          gig_id,
          status,
          applied_at
        FROM applications
        WHERE worker_id = $1
          AND gig_id = $2
        `,
        [
          workerId,
          gigId
        ]
      )

    if (
      existingApplication.rows.length > 0
    ) {
      return res.status(409).json({
        message:
          'You have already applied for this gig.',
        application:
          existingApplication.rows[0]
      })
    }

    // Create the application
    // The database's worker/gig uniqueness constraint protects against
    // duplicate applications even if two requests arrive at the same time.
    const result =
      await pool.query(
        `
        INSERT INTO applications (
          worker_id,
          gig_id,
          cover_message
        )
        VALUES ($1, $2, $3)
        RETURNING
          application_id,
          worker_id,
          gig_id,
          cover_message,
          status,
          applied_at,
          updated_at
        `,
        [
          workerId,
          gigId,
          coverMessage
        ]
      )

    return res.status(201).json({
      message:
        'Application submitted successfully.',
      application:
        result.rows[0]
    })

  } catch (error) {
    console.error(
      'Create application error:',
      error
    )

    return res.status(500).json({
      message:
        'Unable to submit application.'
    })
  }
}


// GET WORKER APPLICATIONS
const getWorkerApplications = async (
  req,
  res
) => {
  try {
    const workerId = req.user.userId

    const result =
      await pool.query(
        `
        SELECT
          application_id,
          worker_id,
          gig_id,
          cover_message,
          status,
          applied_at,
          updated_at
        FROM applications
        WHERE worker_id = $1
        ORDER BY applied_at DESC
        `,
        [
          workerId
        ]
      )

    return res.json({
      worker_id: workerId,
      applications:
        result.rows
    })

  } catch (error) {
    console.error(
      'Get worker applications error:',
      error
    )

    return res.status(500).json({
      message:
        'Unable to retrieve applications.'
    })
  }
}


// GET SINGLE APPLICATION
const getApplicationById = async (
  req,
  res
) => {
  try {
    const {
      applicationId
    } = req.params

    const result =
      await pool.query(
        `
        SELECT
          application_id,
          worker_id,
          gig_id,
          cover_message,
          status,
          applied_at,
          updated_at
        FROM applications
        WHERE application_id = $1
        `,
        [
          applicationId
        ]
      )

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        message:
          'Application not found.'
      })
    }

    const application = result.rows[0]
    // Application details are visible only to the applicant, owning client,
    // or an administrator.
    const ownsApplication = req.user.role === 'Worker'
      ? String(application.worker_id) === String(req.user.userId)
      : req.user.role === 'Client' && (await pool.query(
        'SELECT 1 FROM gigs WHERE gig_id = $1 AND client_id = $2',
        [application.gig_id, req.user.userId]
      )).rowCount > 0
    if (!ownsApplication && req.user.role !== 'Administrator') {
      return res.status(403).json({ message: 'You are not allowed to view this application.' })
    }

    return res.json({
      application
    })

  } catch (error) {
    console.error(
      'Get application error:',
      error
    )

    return res.status(500).json({
      message:
        'Unable to retrieve application.'
    })
  }
}

// CLIENT: review applicants for a gig owned by the signed-in client.
const getGigApplications = async (req, res) => {
  try {
    const { gigId } = req.params
    // Scope the applicant list to the signed-in client's gig.
    const result = await pool.query(
      `SELECT a.application_id, a.gig_id, a.worker_id, a.cover_message,
              a.status, a.applied_at, a.updated_at, u.full_name, u.email,
              u.phone, u.location, wp.bio, wp.experience_years, wp.education,
              wp.availability, wr.rating AS review_rating, wr.review AS client_review
       FROM applications a
       JOIN gigs g ON g.gig_id = a.gig_id
       JOIN users u ON u.user_id::text = a.worker_id::text
       LEFT JOIN worker_profiles wp ON wp.user_id = u.user_id
       LEFT JOIN worker_reviews wr ON wr.application_id = a.application_id
       WHERE a.gig_id = $1 AND g.client_id = $2
       ORDER BY a.applied_at DESC`,
      [gigId, req.user.userId]
    )
    const gig = await pool.query(
      'SELECT gig_id FROM gigs WHERE gig_id = $1 AND client_id = $2',
      [gigId, req.user.userId]
    )
    if (!gig.rowCount) return res.status(404).json({ message: 'Gig not found.' })
    return res.json({ applications: result.rows })
  } catch (error) {
    console.error('Get gig applications error:', error)
    return res.status(500).json({ message: 'Unable to retrieve applications.' })
  }
}

// CLIENT: accept or reject a pending application.
const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params
    const { status } = req.body
    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Accepted or Rejected.' })
    }
    // Change only a pending application attached to a gig owned by this client.
    const result = await pool.query(
      `UPDATE applications a SET status = $1, updated_at = CURRENT_TIMESTAMP
       FROM gigs g
       WHERE a.application_id = $2 AND a.gig_id = g.gig_id
         AND g.client_id = $3 AND a.status = 'Pending'
       RETURNING a.application_id, a.gig_id, a.worker_id, a.status, a.updated_at`,
      [status, applicationId, req.user.userId]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Pending application not found for your gig.' })
    return res.json({ message: `Application ${status.toLowerCase()}.`, application: result.rows[0] })
  } catch (error) {
    console.error('Update application status error:', error)
    return res.status(500).json({ message: 'Unable to update application status.' })
  }
}

const reviewWorker = async (req, res) => {
  try {
    const { applicationId } = req.params
    const { rating, review = '' } = req.body
    const numericRating = Number(rating)
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5.' })
    }
    // The INSERT...SELECT enforces gig ownership and accepted status in the
    // same database operation that writes the review.
    const result = await pool.query(
      `INSERT INTO worker_reviews (application_id, client_id, worker_id, rating, review)
       SELECT a.application_id, g.client_id::text::integer, a.worker_id::text::integer, $1, $2
       FROM applications a JOIN gigs g ON g.gig_id = a.gig_id
       WHERE a.application_id = $3 AND g.client_id = $4 AND a.worker_id::text ~ '^[0-9]+$'
         AND a.status IN ('Accepted', 'Completed')
       ON CONFLICT (application_id) DO UPDATE
         SET rating = EXCLUDED.rating, review = EXCLUDED.review, created_at = CURRENT_TIMESTAMP
       RETURNING review_id, application_id, worker_id, rating, review, created_at`,
      [numericRating, String(review).trim(), applicationId, req.user.userId]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Accepted application not found for your gig.' })
    return res.status(201).json({ message: 'Review saved.', review: result.rows[0] })
  } catch (error) {
    console.error('Review worker error:', error)
    return res.status(500).json({ message: 'Unable to save review.' })
  }
}


module.exports = {
  createApplication,
  getWorkerApplications,
  getApplicationById,
  getGigApplications,
  updateApplicationStatus,
  reviewWorker
}
