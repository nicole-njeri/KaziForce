const pool = require('../config/db')

const createWorkerProfile = async (req, res) => {
  try {
    const {
      userId,
      bio,
      experienceYears,
      education,
      availability
    } = req.body

    if (!userId) {
      return res.status(400).json({
        message: 'User ID is required.'
      })
    }

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
       (user_id, bio, experience_years, education, availability)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        bio || null,
        experienceYears || null,
        education || null,
        availability || null
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
    const { userId } = req.params

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

module.exports = {
  createWorkerProfile,
  getWorkerProfile
}