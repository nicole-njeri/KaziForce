const pool = require('../config/db')

// CREATE APPLICATION
const createApplication = async (req, res) => {
  try {
    const {
      workerId,
      gigId,
      coverMessage = ''
    } = req.body

    if (!workerId) {
      return res.status(400).json({
        message: 'workerId is required'
      })
    }

    if (!gigId) {
      return res.status(400).json({
        message: 'gigId is required'
      })
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
    const {
      workerId
    } = req.params

    if (!workerId) {
      return res.status(400).json({
        message:
          'workerId is required'
      })
    }

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

    return res.json({
      application:
        result.rows[0]
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


module.exports = {
  createApplication,
  getWorkerApplications,
  getApplicationById
}