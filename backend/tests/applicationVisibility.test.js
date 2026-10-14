const assert = require('node:assert/strict')
const test = require('node:test')

const pool = require('../src/config/db')
const {
  getApplicationById,
  getGigApplications,
  getWorkerApplications,
} = require('../src/controllers/applicationController')

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

const application = {
  application_id: 'app-1',
  worker_id: 'worker-1',
  gig_id: 'gig-1',
  status: 'Pending',
  gig_title: 'Web developer',
  client_name: 'Example Client',
}

test('worker application list preserves application with all related records', async () => {
  const originalQuery = pool.query
  let sql = ''
  pool.query = async (query) => { sql = query; return { rows: [application] } }

  try {
    const res = responseRecorder()
    await getWorkerApplications({ user: { userId: 'worker-1' } }, res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.applications, [application])
    assert.match(sql, /LEFT JOIN gigs/i)
    assert.match(sql, /LEFT JOIN users/i)
  } finally {
    pool.query = originalQuery
  }
})

test('worker application list preserves application when its gig is missing', async () => {
  const originalQuery = pool.query
  const unresolvedGigApplication = { ...application, gig_title: null, client_name: null }
  let sql = ''
  pool.query = async (query) => { sql = query; return { rows: [unresolvedGigApplication] } }

  try {
    const res = responseRecorder()
    await getWorkerApplications({ user: { userId: 'worker-1' } }, res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.applications, [unresolvedGigApplication])
    assert.match(sql, /LEFT JOIN gigs/i)
  } finally {
    pool.query = originalQuery
  }
})

test('worker application list preserves gig when its client user is missing', async () => {
  const originalQuery = pool.query
  const unresolvedClientApplication = { ...application, client_name: null }
  let sql = ''
  pool.query = async (query) => { sql = query; return { rows: [unresolvedClientApplication] } }

  try {
    const res = responseRecorder()
    await getWorkerApplications({ user: { userId: 'worker-1' } }, res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.applications, [unresolvedClientApplication])
    assert.match(sql, /LEFT JOIN users/i)
  } finally {
    pool.query = originalQuery
  }
})

test('application detail returns an owned application when its gig and client are missing', async () => {
  const originalQuery = pool.query
  const unresolvedApplication = { ...application, gig_title: null, client_name: null }
  let sql = ''
  pool.query = async (query) => { sql = query; return { rows: [unresolvedApplication] } }

  try {
    const res = responseRecorder()
    await getApplicationById({
      params: { applicationId: 'app-1' },
      user: { userId: 'worker-1', role: 'Worker' },
    }, res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.application, unresolvedApplication)
    assert.match(sql, /LEFT JOIN gigs/i)
    assert.match(sql, /LEFT JOIN users/i)
  } finally {
    pool.query = originalQuery
  }
})

test('client applicant list preserves an application with a missing worker user', async () => {
  const originalQuery = pool.query
  const unresolvedWorkerApplication = { ...application, full_name: null, email: null }
  let queryCount = 0
  let applicationSql = ''
  pool.query = async (query) => {
    queryCount += 1
    if (queryCount === 1) {
      applicationSql = query
      return { rows: [unresolvedWorkerApplication] }
    }
    return { rows: [{ gig_id: 'gig-1' }], rowCount: 1 }
  }

  try {
    const res = responseRecorder()
    await getGigApplications({ params: { gigId: 'gig-1' }, user: { userId: 'client-1' } }, res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.applications, [unresolvedWorkerApplication])
    assert.match(applicationSql, /LEFT JOIN users/i)
  } finally {
    pool.query = originalQuery
  }
})
