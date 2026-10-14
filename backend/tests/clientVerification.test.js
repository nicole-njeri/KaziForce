const assert = require('node:assert/strict')
const test = require('node:test')
const express = require('express')
const jwt = require('jsonwebtoken')
const fs = require('node:fs')
const path = require('node:path')

const pool = require('../src/config/db')
const { createGig, getAllGigs, getGigById } = require('../src/controllers/gigController')
const {
  getMyVerifications,
  submitVerification,
  getPendingVerifications,
  reviewVerification,
} = require('../src/controllers/clientVerificationController')
const clientVerificationRoutes = require('../src/routes/clientVerificationRoutes')
const adminRoutes = require('../src/routes/adminRoutes')

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

const sample = {
  verification_id: '1',
  verification_type: 'identity',
  status: 'Pending',
  request_details: 'Please review my account.',
  submitted_at: '2026-10-14T10:00:00Z',
  reviewed_at: null,
  updated_at: '2026-10-14T10:00:00Z',
  rejection_explanation: null,
}

test('TCV-00 migration defines request history, review integrity, and one active request per type', () => {
  const migrationPath = path.join(__dirname, '../../database/migrations/004_client_verification.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')
  assert.match(sql, /verification_type IN \('identity', 'business'\)/i)
  assert.match(sql, /status IN \('Pending', 'Verified', 'Rejected'\)/i)
  assert.match(sql, /reviewed_by INTEGER REFERENCES users\(user_id\)/i)
  assert.match(sql, /rejection_explanation VARCHAR\(1000\)/i)
  assert.match(sql, /internal_notes VARCHAR\(2000\)/i)
  assert.match(sql, /UNIQUE INDEX[\s\S]*ON client_verification_requests \(client_id, verification_type\)[\s\S]*WHERE status IN \('Pending', 'Verified'\)/i)
  assert.match(sql, /status = 'Rejected'[\s\S]*length\(trim\(rejection_explanation\)\) > 0/i)
})

test('TCV-01 client can read only their own safe verification summary', async () => {
  const originalQuery = pool.query
  let sql = ''
  let params
  pool.query = async (query, values) => {
    sql = query; params = values
    return { rows: [sample] }
  }
  try {
    const res = responseRecorder()
    await getMyVerifications({ user: { userId: 41 } }, res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.verifications, [sample])
    assert.deepEqual(params, [41])
    assert.match(sql, /WHERE client_id = \$1/i)
    assert.match(sql, /DISTINCT ON \(verification_type\)/i)
    assert.doesNotMatch(sql, /reviewed_by|internal_notes/i)
  } finally { pool.query = originalQuery }
})

test('TCV-02 submission creates Pending and ignores client-supplied identity/status fields', async () => {
  const originalQuery = pool.query
  let sql = ''
  let params
  pool.query = async (query, values) => { sql = query; params = values; return { rows: [sample] } }
  try {
    const res = responseRecorder()
    await submitVerification({
      user: { userId: 41, role: 'Client' },
      body: { type: 'identity', details: 'Please review my account.', clientId: 99, status: 'Verified', reviewedBy: 99 },
    }, res)
    assert.equal(res.statusCode, 201)
    assert.equal(res.body.verification.status, 'Pending')
    assert.deepEqual(params, [41, 'identity', 'Please review my account.'])
    assert.match(sql, /INSERT INTO client_verification_requests/i)
    const insertColumns = sql.match(/INSERT INTO client_verification_requests\s*\(([^)]*)\)/i)?.[1] || ''
    assert.doesNotMatch(insertColumns, /reviewed_by|status/i)
  } finally { pool.query = originalQuery }
})

test('TCV-03 invalid verification type and oversized details are rejected before querying', async (t) => {
  const originalQuery = pool.query
  let calls = 0
  pool.query = async () => { calls += 1; return { rows: [] } }
  try {
    for (const body of [{ type: 'email' }, { type: 'identity', details: 'x'.repeat(1001) }]) {
      await t.test(`rejects ${body.type} request input`, async () => {
        const res = responseRecorder()
        await submitVerification({ user: { userId: 41 }, body }, res)
        assert.equal(res.statusCode, 400)
      })
    }
    assert.equal(calls, 0)
  } finally { pool.query = originalQuery }
})

test('TCV-04 duplicate active request returns 409 while a rejected request may be resubmitted', async (t) => {
  const originalQuery = pool.query
  let sql = ''
  pool.query = async (query) => {
    sql = query
    const error = new Error('unique conflict')
    error.code = '23505'
    throw error
  }
  try {
    await t.test('database uniqueness protects repeated pending or verified submissions', async () => {
      const res = responseRecorder()
      await submitVerification({ user: { userId: 41 }, body: { type: 'identity' } }, res)
      assert.equal(res.statusCode, 409)
    })
    assert.match(sql, /INSERT INTO client_verification_requests/i)
    assert.doesNotMatch(sql, /UPDATE client_verification_requests/i)
    await t.test('new request after prior rejection is created as a fresh Pending row', async () => {
      pool.query = async () => ({ rows: [{ ...sample, verification_id: '2', status: 'Pending' }] })
      const res = responseRecorder()
      await submitVerification({ user: { userId: 41 }, body: { type: 'identity', details: 'Corrected non-sensitive details.' } }, res)
      assert.equal(res.statusCode, 201)
      assert.equal(res.body.verification.verification_id, '2')
      assert.equal(res.body.verification.status, 'Pending')
    })
  } finally { pool.query = originalQuery }
})

test('TCV-05 admin queue includes only the information needed for review', async () => {
  const originalQuery = pool.query
  let sql = ''
  pool.query = async (query) => { sql = query; return { rows: [{ verification_id: '1', client_name: 'Synthetic Client', verification_type: 'business', status: 'Pending' }] } }
  try {
    const res = responseRecorder()
    await getPendingVerifications({}, res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.verifications.length, 1)
    assert.match(sql, /WHERE v\.status = 'Pending'/i)
    assert.doesNotMatch(sql, /u\.email|u\.phone|internal_notes|reviewed_by/i)
  } finally { pool.query = originalQuery }
})

test('TCV-06 approval requires review confirmation and records the authenticated administrator', async (t) => {
  const originalQuery = pool.query
  const calls = []
  pool.query = async (sql, params) => { calls.push({ sql, params }); return { rowCount: 1, rows: [{ ...sample, status: 'Verified', reviewed_at: 'now' }] } }
  try {
    await t.test('approval without explicit confirmation is rejected', async () => {
      const res = responseRecorder()
      await reviewVerification({ user: { userId: 7 }, params: { verificationId: '1' }, body: { status: 'Verified' } }, res)
      assert.equal(res.statusCode, 400)
      assert.equal(calls.length, 0)
    })
    await t.test('confirmed approval uses pending-only transition and admin identity', async () => {
      const res = responseRecorder()
      await reviewVerification({ user: { userId: 7 }, params: { verificationId: '1' }, body: { status: 'Verified', reviewConfirmed: true, internalNotes: 'Manual review completed.' } }, res)
      assert.equal(res.statusCode, 200)
      assert.equal(res.body.verification.status, 'Verified')
      assert.equal(calls[0].params[0], 'Verified')
      assert.equal(calls[0].params[1], 7)
      assert.equal(calls[0].params[3], 'Manual review completed.')
      assert.match(calls[0].sql, /WHERE verification_id = \$5 AND status = 'Pending'/i)
      assert.doesNotMatch(JSON.stringify(res.body), /Manual review completed/)
    })
  } finally { pool.query = originalQuery }
})

test('TCV-07 rejection requires a client explanation and keeps it separate from internal notes', async (t) => {
  const originalQuery = pool.query
  let params
  pool.query = async (_sql, values) => { params = values; return { rowCount: 1, rows: [{ ...sample, status: 'Rejected', rejection_explanation: 'Please clarify the organization name.' }] } }
  try {
    await t.test('missing explanation is rejected without a database query', async () => {
      let calls = 0
      pool.query = async () => { calls += 1; return { rowCount: 1, rows: [sample] } }
      const res = responseRecorder()
      await reviewVerification({ user: { userId: 7 }, params: { verificationId: '1' }, body: { status: 'Rejected' } }, res)
      assert.equal(res.statusCode, 400)
      assert.equal(calls, 0)
    })
    await t.test('rejection stores separate client and internal messages', async () => {
      pool.query = async (_sql, values) => { params = values; return { rowCount: 1, rows: [{ ...sample, status: 'Rejected', rejection_explanation: 'Please clarify the organization name.' }] } }
      const res = responseRecorder()
      await reviewVerification({ user: { userId: 7 }, params: { verificationId: '1' }, body: { status: 'Rejected', rejectionExplanation: 'Please clarify the organization name.', internalNotes: 'Checked external listing.' } }, res)
      assert.equal(res.statusCode, 200)
      assert.equal(params[2], 'Please clarify the organization name.')
      assert.equal(params[3], 'Checked external listing.')
      assert.equal(res.body.verification.rejection_explanation, 'Please clarify the organization name.')
      assert.doesNotMatch(JSON.stringify(res.body), /Checked external listing/)
    })
  } finally { pool.query = originalQuery }
})

test('TCV-08 repeated review or invalid transition is rejected', async () => {
  const originalQuery = pool.query
  pool.query = async () => ({ rowCount: 0, rows: [] })
  try {
    const invalidId = responseRecorder()
    await reviewVerification({ user: { userId: 7 }, params: { verificationId: 'not-a-number' }, body: { status: 'Verified', reviewConfirmed: true } }, invalidId)
    assert.equal(invalidId.statusCode, 400)
    const res = responseRecorder()
    await reviewVerification({ user: { userId: 7 }, params: { verificationId: '1' }, body: { status: 'Verified', reviewConfirmed: true } }, res)
    assert.equal(res.statusCode, 409)
  } finally { pool.query = originalQuery }
})

test('TCV-09 public gig responses expose only latest verification type/status and default to none', async (t) => {
  const originalQuery = pool.query
  const expected = [{ type: 'business', status: 'Verified' }]
  const responses = [
    { gig_id: 'gig-1', client_verifications: expected, client_name: 'Synthetic Client' },
    { gig_id: 'gig-1', client_verifications: expected, client_bio: 'Synthetic bio', client_name: 'Synthetic Client' },
  ]
  let call = 0
  const sqls = []
  pool.query = async (sql) => { sqls.push(sql); return { rows: [responses[call++]] } }
  try {
    await t.test('listing', async () => {
      const res = responseRecorder()
      await getAllGigs({}, res)
      assert.deepEqual(res.body.gigs[0].client_verifications, expected)
    })
    await t.test('detail', async () => {
      const res = responseRecorder()
      await getGigById({ params: { gigId: 'gig-1' } }, res)
      assert.deepEqual(res.body.gig.client_verifications, expected)
    })
    for (const sql of sqls) {
      assert.match(sql, /jsonb_build_object\('type', latest\.verification_type, 'status', latest\.status\)/i)
      assert.match(sql, /DISTINCT ON \(verification_type\)/i)
      assert.doesNotMatch(sql, /request_details|rejection_explanation|internal_notes|reviewed_by|email|phone/i)
    }
    let publicSql = ''
    pool.query = async (sql) => { publicSql = sql; return { rows: [{ gig_id: 'gig-new', client_verifications: [] }] } }
    const noHistory = responseRecorder()
    await getAllGigs({}, noHistory)
    assert.deepEqual(noHistory.body.gigs[0].client_verifications, [])
    assert.match(publicSql, /'\[\]'::jsonb/i)
  } finally { pool.query = originalQuery }
})

test('TCV-10 an unverified authenticated client can still post an open gig', async () => {
  const originalQuery = pool.query
  let sql = ''
  pool.query = async (query) => { sql = query; return { rows: [{ gig_id: 'gig-new', status: 'Open' }] } }
  try {
    const res = responseRecorder()
    await createGig({ user: { userId: 41, role: 'Client' }, body: { title: 'Synthetic gig', description: 'Synthetic description' } }, res)
    assert.equal(res.statusCode, 201)
    assert.equal(res.body.gig.status, 'Open')
    assert.match(sql, /INSERT INTO gigs/i)
    assert.doesNotMatch(sql, /verification/i)
  } finally { pool.query = originalQuery }
})

test('TCV-11 client and administrator endpoints enforce session roles over HTTP', async (t) => {
  const originalSecret = process.env.JWT_SECRET
  const originalQuery = pool.query
  const secret = 'tcv-isolated-http-secret'
  process.env.JWT_SECRET = secret
  pool.query = async (sql) => {
    if (/SELECT is_active FROM users/i.test(sql)) return { rowCount: 1, rows: [{ is_active: true }] }
    if (/SELECT DISTINCT ON \(verification_type\)/i.test(sql)) return { rows: [sample] }
    if (/SELECT v\.verification_id/i.test(sql)) return { rows: [] }
    throw new Error('Unexpected database call in isolated HTTP test')
  }
  const app = express()
  app.use(express.json())
  app.use('/api/client-verifications', clientVerificationRoutes)
  app.use('/api/admin', adminRoutes)
  const server = app.listen(0, '127.0.0.1')
  try {
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })
    const endpoint = `http://127.0.0.1:${server.address().port}`
    const token = (userId, role) => jwt.sign({ userId, role }, secret)
    await t.test('unauthenticated client request is denied', async () => {
      const response = await fetch(`${endpoint}/api/client-verifications/mine`)
      assert.equal(response.status, 401)
    })
    await t.test('Worker cannot access the client request endpoint', async () => {
      const response = await fetch(`${endpoint}/api/client-verifications/mine`, { headers: { Authorization: `Bearer ${token(12, 'Worker')}` } })
      assert.equal(response.status, 403)
    })
    await t.test('Client cannot access administrator verification queue', async () => {
      const response = await fetch(`${endpoint}/api/admin/verifications/pending`, { headers: { Authorization: `Bearer ${token(41, 'Client')}` } })
      assert.equal(response.status, 403)
    })
    await t.test('Client cannot call administrator review to approve their own request', async () => {
      const response = await fetch(`${endpoint}/api/admin/verifications/vr-1`, { method: 'PATCH', headers: { Authorization: `Bearer ${token(41, 'Client')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Verified', reviewConfirmed: true }) })
      assert.equal(response.status, 403)
    })
    await t.test('Administrator can access pending review queue', async () => {
      const response = await fetch(`${endpoint}/api/admin/verifications/pending`, { headers: { Authorization: `Bearer ${token(7, 'Administrator')}` } })
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { verifications: [] })
    })
    await t.test('Client summary is scoped to authenticated owner', async () => {
      const response = await fetch(`${endpoint}/api/client-verifications/mine`, { headers: { Authorization: `Bearer ${token(41, 'Client')}` } })
      assert.equal(response.status, 200)
      assert.deepEqual((await response.json()).verifications, [sample])
    })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    pool.query = originalQuery
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  }
})
