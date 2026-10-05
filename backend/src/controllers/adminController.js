const pool = require('../config/db')

// Aggregate platform activity for the protected administrator dashboard.
const getOverview = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM users WHERE role = 'Worker' AND is_active) AS active_workers,
        (SELECT COUNT(*)::int FROM users WHERE role = 'Client' AND is_active) AS active_clients,
        (SELECT COUNT(*)::int FROM gigs) AS gigs,
        (SELECT COUNT(*)::int FROM gigs WHERE status = 'Open') AS open_gigs,
        (SELECT COUNT(*)::int FROM applications) AS applications,
        (SELECT COUNT(*)::int FROM applications WHERE status = 'Pending') AS pending_applications,
        (SELECT COUNT(*)::int FROM worker_reviews) AS reviews
    `)
    return res.json({ overview: result.rows[0] })
  } catch (error) {
    console.error('Admin overview error:', error)
    return res.status(500).json({ message: 'Unable to load platform overview.' })
  }
}

const getUsers = async (_req, res) => {
  try {
    const result = await pool.query(`SELECT user_id, full_name, email, phone, location, role, is_active, created_at FROM users ORDER BY created_at DESC`)
    return res.json({ users: result.rows })
  } catch (error) {
    console.error('Admin users error:', error)
    return res.status(500).json({ message: 'Unable to load users.' })
  }
}

const updateUserStatus = async (req, res) => {
  try {
    // Exclude administrator accounts to prevent an admin from disabling the
    // credentials needed to manage the platform.
    if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be true or false.' })
    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE user_id = $2 AND role <> 'Administrator'
       RETURNING user_id, full_name, role, is_active`,
      [req.body.isActive, req.params.userId]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'User not found or cannot be moderated.' })
    return res.json({ message: 'User status updated.', user: result.rows[0] })
  } catch (error) {
    console.error('Admin user moderation error:', error)
    return res.status(500).json({ message: 'Unable to update user status.' })
  }
}

const getGigs = async (_req, res) => {
  try {
    const result = await pool.query(`SELECT g.gig_id, g.title, g.status, g.location, g.created_at, u.full_name AS client_name, (SELECT COUNT(*)::int FROM applications a WHERE a.gig_id::text = g.gig_id::text) AS application_count FROM gigs g JOIN users u ON u.user_id::text = g.client_id::text ORDER BY g.created_at DESC`)
    return res.json({ gigs: result.rows })
  } catch (error) {
    console.error('Admin gigs error:', error)
    return res.status(500).json({ message: 'Unable to load gigs.' })
  }
}

const moderateGig = async (req, res) => {
  try {
    // Moderation only opens or closes a gig; operational client statuses are
    // managed through the gig workflow.
    const { status } = req.body
    if (!['Open', 'Closed'].includes(status)) return res.status(400).json({ message: 'Moderation status must be Open or Closed.' })
    const result = await pool.query(`UPDATE gigs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE gig_id = $2 RETURNING gig_id, title, status`, [status, req.params.gigId])
    if (!result.rowCount) return res.status(404).json({ message: 'Gig not found.' })
    return res.json({ message: `Gig ${status.toLowerCase()}.`, gig: result.rows[0] })
  } catch (error) {
    console.error('Admin gig moderation error:', error)
    return res.status(500).json({ message: 'Unable to moderate gig.' })
  }
}

module.exports = { getOverview, getUsers, updateUserStatus, getGigs, moderateGig }
