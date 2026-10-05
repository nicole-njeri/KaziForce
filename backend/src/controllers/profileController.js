const pool = require('../config/db')

const createWorkerProfile = async (req, res) => {
  try {
    const {
      bio,
      experienceYears,
      education,
      availability,
      skills = ''
    } = req.body
    const userId = req.user.userId

    const userResult = await pool.query(
      `SELECT user_id, role
       FROM users
       WHERE user_id = $1`,
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found.'
      })
    }

    if (userResult.rows[0].role !== 'Worker') {
      return res.status(403).json({
        message: 'Only workers can create worker profiles.'
      })
    }

    const existingProfile = await pool.query(
      `SELECT profile_id
       FROM worker_profiles
       WHERE user_id = $1`,
      [userId]
    )

    if (existingProfile.rows.length > 0) {
      return res.status(409).json({
        message: 'Worker profile already exists.'
      })
    }

    const result = await pool.query(
      `INSERT INTO worker_profiles
       (user_id, bio, experience_years, education, availability, skills)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        bio || null,
        experienceYears || null,
        education || null,
        availability || null,
        skills
      ]
    )

    res.status(201).json({
      message: 'Worker profile created successfully.',
      profile: result.rows[0]
    })

  } catch (error) {
    console.error('Create worker profile error:', error)

    res.status(500).json({
      message: 'Server error while creating worker profile.'
    })
  }
}

const getWorkerProfile = async (req, res) => {
  try {
    // The profile route supplies this ID from the authenticated session or
    // has already applied its role-based ownership check.
    const userId = req.user.userId

    const result = await pool.query(
      `SELECT
        wp.profile_id,
        wp.user_id,
        u.full_name,
        u.email,
        u.phone,
        u.location,
        wp.bio,
        wp.experience_years,
        wp.education,
        wp.availability,
        wp.skills,
        wp.created_at,
        wp.updated_at
       FROM worker_profiles wp
       INNER JOIN users u
       ON wp.user_id = u.user_id
       WHERE wp.user_id = $1`,
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Worker profile not found.'
      })
    }

    res.status(200).json({
      profile: result.rows[0]
    })

  } catch (error) {
    console.error('Get worker profile error:', error)

    res.status(500).json({
      message: 'Server error while retrieving worker profile.'
    })
  }
}

const updateWorkerProfile = async (req, res) => {
  try {
    const { bio = '', experienceYears = null, education = '', availability = '', skills = '' } = req.body
    if (experienceYears !== null && (!Number.isInteger(Number(experienceYears)) || Number(experienceYears) < 0)) {
      return res.status(400).json({ message: 'Experience must be a non-negative whole number.' })
    }
    // Use the authenticated user ID and upsert to support both first-time
    // profile creation and later edits without duplicate profiles.
    const result = await pool.query(
      `INSERT INTO worker_profiles (user_id, bio, experience_years, education, availability, skills)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio,
         experience_years = EXCLUDED.experience_years, education = EXCLUDED.education,
         availability = EXCLUDED.availability, skills = EXCLUDED.skills,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.userId, bio, experienceYears === null || experienceYears === '' ? null : Number(experienceYears), education, availability, skills]
    )
    return res.json({ message: 'Worker profile saved.', profile: result.rows[0] })
  } catch (error) {
    console.error('Update worker profile error:', error)
    return res.status(500).json({ message: 'Unable to save worker profile.' })
  }
}

// Client self-service exposes only the organization fields in client_profiles;
// account identity always comes from the verified JWT, never the request body.
const getClientProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT organization_name, bio, created_at, updated_at
       FROM client_profiles
       WHERE user_id = $1`,
      [req.user.userId]
    )

    return res.json({ profile: result.rows[0] || null })
  } catch (error) {
    console.error('Get client profile error:', error)
    return res.status(500).json({ message: 'Unable to retrieve client profile.' })
  }
}

const updateClientProfile = async (req, res) => {
  const { organizationName = '', bio = '' } = req.body || {}
  if (typeof organizationName !== 'string' || organizationName.trim().length > 150) {
    return res.status(400).json({ message: 'Organization name must be text with at most 150 characters.' })
  }
  if (typeof bio !== 'string' || bio.length > 5000) {
    return res.status(400).json({ message: 'Bio must be text with at most 5000 characters.' })
  }

  try {
    // Parameterized upsert creates the first profile and updates later edits
    // while the unique user_id constraint guarantees one profile per client.
    const result = await pool.query(
      `INSERT INTO client_profiles (user_id, organization_name, bio)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         organization_name = EXCLUDED.organization_name,
         bio = EXCLUDED.bio,
         updated_at = CURRENT_TIMESTAMP
       RETURNING organization_name, bio, created_at, updated_at`,
      [req.user.userId, organizationName.trim() || null, bio.trim() || null]
    )

    return res.json({ message: 'Client profile saved successfully.', profile: result.rows[0] })
  } catch (error) {
    console.error('Update client profile error:', error)
    return res.status(500).json({ message: 'Unable to save client profile.' })
  }
}

module.exports = {
  createWorkerProfile,
  getWorkerProfile,
  updateWorkerProfile,
  getClientProfile,
  updateClientProfile
}
