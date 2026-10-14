const pool = require('../config/db')

// Public gig responses expose only the current type and status for each
// verification request. Request details, explanations, reviewer IDs, and
// internal notes remain private to the owner and administrators.
const publicClientVerifications = `COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object('type', latest.verification_type, 'status', latest.status)
    ORDER BY latest.verification_type
  )
  FROM (
    SELECT DISTINCT ON (verification_type) verification_type, status
    FROM client_verification_requests
    WHERE client_id = gigs.client_id
    ORDER BY verification_type, submitted_at DESC, verification_id DESC
  ) latest
), '[]'::jsonb) AS client_verifications`


// CREATE GIG
const createGig = async (req, res) => {
  try {
    const {
      title,
      description,
      category = '',
      requiredSkills = '',
      location = '',
      budget = '',
      duration = ''
    } = req.body

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        message: 'title is required'
      })
    }

    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        message: 'description is required'
      })
    }

    const numericBudget = budget === '' || budget == null ? null : Number(budget)
    if (numericBudget !== null && (!Number.isFinite(numericBudget) || numericBudget < 0)) {
      return res.status(400).json({ message: 'budget must be a non-negative number.' })
    }

    // Bind ownership to the verified client identity rather than accepting a
    // client_id from request data.
    const result =
      await pool.query(
        `
        INSERT INTO gigs (
          client_id,
          title,
          description,
          category,
          required_skills,
          location,
          budget,
          duration
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        )
        RETURNING
          gig_id,
          client_id,
          title,
          description,
          category,
          required_skills,
          location,
          budget,
          duration,
          status,
          created_at,
          updated_at
        `,
        [
          req.user.userId,
          title.trim(),
          description.trim(),
          category,
          requiredSkills,
          location,
          numericBudget,
          duration
        ]
      )

    return res.status(201).json({
      message:
        'Gig posted successfully.',
      gig:
        result.rows[0]
    })

  } catch (error) {

    console.error(
      'Create gig error:',
      error
    )

    return res.status(500).json({
      message:
        'Unable to post gig.'
    })
  }
}


// GET ALL GIGS
const getAllGigs = async (
  req,
  res
) => {
  try {

    // The worker-facing feed contains only gigs that are still open.
    const result =
      await pool.query(
        `
        SELECT
          gigs.gig_id,
          gigs.client_id,
          COALESCE(client_profiles.organization_name, users.full_name) AS client_name,
          ${publicClientVerifications},
          gigs.title,
          gigs.description,
          gigs.category,
          gigs.required_skills,
          gigs.location,
          gigs.budget,
          gigs.duration,
          gigs.status,
          gigs.created_at,
          gigs.updated_at
        FROM gigs JOIN users ON users.user_id = gigs.client_id
        LEFT JOIN client_profiles ON client_profiles.user_id = users.user_id
        WHERE gigs.status = 'Open'
        ORDER BY gigs.created_at DESC
        `
      )

    return res.json({
      gigs:
        result.rows
    })

  } catch (error) {

    console.error(
      'Get gigs error:',
      error
    )

    return res.status(500).json({
      message:
        'Unable to retrieve gigs.'
    })
  }
}


// GET SINGLE GIG
const getGigById = async (
  req,
  res
) => {
  try {

    const {
      gigId
    } = req.params

    const result =
      await pool.query(
        `
        SELECT gigs.gig_id, gigs.client_id,
          COALESCE(client_profiles.organization_name, users.full_name) AS client_name,
          client_profiles.bio AS client_bio,
          ${publicClientVerifications},
          gigs.title, gigs.description, gigs.category, gigs.required_skills,
          gigs.location, gigs.budget, gigs.duration, gigs.status,
          gigs.created_at, gigs.updated_at
        FROM gigs JOIN users ON users.user_id = gigs.client_id
        LEFT JOIN client_profiles ON client_profiles.user_id = users.user_id
        WHERE gigs.gig_id = $1
        `,
        [gigId]
      )

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        message:
          'Gig not found.'
      })
    }

    return res.json({
      gig:
        result.rows[0]
    })

  } catch (error) {

    console.error(
      'Get gig error:',
      error
    )

    return res.status(500).json({
      message:
        'Unable to retrieve gig.'
    })
  }
}


// GET CLIENT GIGS
const getClientGigs = async (
  req,
  res
) => {
  try {

    // Scope the dashboard list to the client ID in the verified session.
    const clientId = req.user.userId

    const result =
      await pool.query(
        `
        SELECT
          gig_id,
          client_id,
          title,
          description,
          category,
          required_skills,
          location,
          budget,
          duration,
          status,
          created_at,
          updated_at,
          (SELECT COUNT(*)::int FROM applications a WHERE a.gig_id = gigs.gig_id) AS application_count
        FROM gigs
        WHERE client_id = $1
        ORDER BY created_at DESC
        `,
        [clientId]
      )

    return res.json({
      client_id: clientId,
      gigs:
        result.rows
    })

  } catch (error) {

    console.error(
      'Get client gigs error:',
      error
    )

    return res.status(500).json({
      message:
        'Unable to retrieve client gigs.'
    })
  }
}

const updateClientGig = async (req, res) => {
  try {
    const { gigId } = req.params
    const { status } = req.body
    if (!['Open', 'Closed', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Choose a valid gig status.' })
    }
    // Restrict status changes to the gig's owner and accept only supported
    // workflow states.
    const result = await pool.query(
      `UPDATE gigs SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE gig_id = $2 AND client_id = $3
       RETURNING gig_id, client_id, title, description, category, required_skills,
                 location, budget, duration, status, created_at, updated_at`,
      [status, gigId, req.user.userId]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Gig not found.' })
    return res.json({ message: 'Gig updated.', gig: result.rows[0] })
  } catch (error) {
    console.error('Update gig error:', error)
    return res.status(500).json({ message: 'Unable to update gig.' })
  }
}


module.exports = {
  createGig,
  getAllGigs,
  getGigById,
  getClientGigs,
  updateClientGig
}
