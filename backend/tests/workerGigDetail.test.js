const assert = require('node:assert/strict')
const test = require('node:test')

const pool = require('../src/config/db')
const { getGigById } = require('../src/controllers/gigController')

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

test('Worker gig detail API returns stored requirements and available client profile fields', async () => {
  const originalQuery = pool.query
  const row = {
    gig_id: 'gig-7',
    title: 'IT Support Assistant',
    required_skills: 'Troubleshooting, Networking',
    client_name: 'Example Organization',
    client_bio: 'We support small businesses with their IT needs.',
  }
  let sql = ''
  pool.query = async (query) => {
    sql = query
    return { rows: [row] }
  }

  try {
    const res = responseRecorder()
    await getGigById({ params: { gigId: 'gig-7' } }, res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.gig, row)
    assert.match(sql, /gigs\.required_skills/i)
    assert.match(sql, /client_profiles\.bio AS client_bio/i)
  } finally {
    pool.query = originalQuery
  }
})

test('Worker gig detail API preserves missing optional client profile fields as null', async () => {
  const originalQuery = pool.query
  pool.query = async () => ({ rows: [{ gig_id: 'gig-8', required_skills: null, client_name: 'Client Name', client_bio: null }] })

  try {
    const res = responseRecorder()
    await getGigById({ params: { gigId: 'gig-8' } }, res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.gig.required_skills, null)
    assert.equal(res.body.gig.client_bio, null)
  } finally {
    pool.query = originalQuery
  }
})
