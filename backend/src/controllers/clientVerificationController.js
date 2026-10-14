const pool = require('../config/db')

const verificationTypes = new Set(['identity', 'business'])
const publicFields = `verification_id, verification_type, status, request_details,
                      submitted_at, reviewed_at, updated_at, rejection_explanation`

const getMyVerifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (verification_type) ${publicFields}
       FROM client_verification_requests
       WHERE client_id = $1
       ORDER BY verification_type, submitted_at DESC, verification_id DESC`,
      [req.user.userId]
    )
    return res.json({ verifications: result.rows })
  } catch (error) {
    console.error('Get client verifications error:', error)
    return res.status(500).json({ message: 'Unable to retrieve verification requests.' })
  }
}

const submitVerification = async (req, res) => {
  const { type, details = '' } = req.body || {}
  if (!verificationTypes.has(type)) {
    return res.status(400).json({ message: 'Choose identity or business verification.' })
  }
  if (typeof details !== 'string' || details.length > 1000) {
    return res.status(400).json({ message: 'Request details must be text with at most 1000 characters.' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO client_verification_requests (client_id, verification_type, request_details)
       VALUES ($1, $2, $3)
       RETURNING ${publicFields}`,
      [req.user.userId, type, details.trim() || null]
    )
    return res.status(201).json({ message: 'Verification request submitted for administrator review.', verification: result.rows[0] })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A request for this verification type is already pending or verified.' })
    }
    console.error('Submit client verification error:', error)
    return res.status(500).json({ message: 'Unable to submit verification request.' })
  }
}

const getPendingVerifications = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.verification_id, v.client_id, u.full_name AS client_name,
              cp.organization_name, v.verification_type, v.status,
              v.request_details, v.submitted_at
       FROM client_verification_requests v
       JOIN users u ON u.user_id = v.client_id
       LEFT JOIN client_profiles cp ON cp.user_id = v.client_id
       WHERE v.status = 'Pending'
       ORDER BY v.submitted_at ASC, v.verification_id ASC`
    )
    return res.json({ verifications: result.rows })
  } catch (error) {
    console.error('Get pending verifications error:', error)
    return res.status(500).json({ message: 'Unable to retrieve pending verification requests.' })
  }
}

const reviewVerification = async (req, res) => {
  const { status, reviewConfirmed, rejectionExplanation = '', internalNotes = '' } = req.body || {}
  if (!/^[1-9]\d*$/.test(String(req.params.verificationId || ''))) {
    return res.status(400).json({ message: 'Verification request ID is invalid.' })
  }
  if (!['Verified', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Choose Verified or Rejected.' })
  }
  if (status === 'Verified' && reviewConfirmed !== true) {
    return res.status(400).json({ message: 'Confirm that the request was reviewed through the approved manual process before approval.' })
  }
  if (typeof rejectionExplanation !== 'string' || rejectionExplanation.length > 1000) {
    return res.status(400).json({ message: 'The client-facing explanation must be text with at most 1000 characters.' })
  }
  if (status === 'Rejected' && !rejectionExplanation.trim()) {
    return res.status(400).json({ message: 'Provide an explanation the client can use to correct and resubmit the request.' })
  }
  if (typeof internalNotes !== 'string' || internalNotes.length > 2000) {
    return res.status(400).json({ message: 'Internal notes must be text with at most 2000 characters.' })
  }

  try {
    const result = await pool.query(
      `UPDATE client_verification_requests
       SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2,
           rejection_explanation = $3, internal_notes = $4, updated_at = CURRENT_TIMESTAMP
       WHERE verification_id = $5 AND status = 'Pending'
       RETURNING verification_id, client_id, verification_type, status,
                 submitted_at, reviewed_at, updated_at, rejection_explanation`,
      [status, req.user.userId, status === 'Rejected' ? rejectionExplanation.trim() : null,
        internalNotes.trim() || null, req.params.verificationId]
    )
    if (!result.rowCount) return res.status(409).json({ message: 'This request is no longer pending review.' })
    return res.json({ message: `Verification request ${status.toLowerCase()}.`, verification: result.rows[0] })
  } catch (error) {
    console.error('Review client verification error:', error)
    return res.status(500).json({ message: 'Unable to review verification request.' })
  }
}

module.exports = { getMyVerifications, submitVerification, getPendingVerifications, reviewVerification }
