import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const API = 'http://localhost:5000/api/client-verifications'
const emptyForm = { type: 'identity', details: '' }

function ClientVerificationPanel() {
  const [verifications, setVerifications] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const selectedType = useRef('identity')

  const request = useCallback(async (path = '/mine', options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        ...options.headers
      }
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Verification request failed.')
    return data
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await request()
      const requests = data.verifications || []
      setVerifications(requests)
      const previousRequest = requests.find((item) => item.verification_type === selectedType.current)
      if (previousRequest?.status === 'Rejected' && previousRequest.request_details) {
        setForm((current) => current.details ? current : { ...current, details: previousRequest.request_details })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])

  const latestByType = useMemo(() => new Map(verifications.map((item) => [item.verification_type, item])), [verifications])

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      await request('/mine', { method: 'POST', body: JSON.stringify(form) })
      setForm({ ...emptyForm, type: form.type })
      setNotice('Your request is pending administrator review.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return <section style={styles.section} aria-labelledby="client-verification-heading">
    <h2 id="client-verification-heading" style={styles.heading}>Client verification</h2>
    <p style={styles.copy}>Identity and business verification are separate. Registration and email confirmation do not verify identity.</p>
    <p style={styles.notice}>This feature does not collect or store identity or business documents. Do not enter document numbers or sensitive evidence. Approval requires a legitimate review through the approved process outside KaziForce.</p>
    {loading ? <p role="status">Loading verification status…</p> : <>
      {error && <p role="alert" style={styles.error}>{error}</p>}
      {notice && <p role="status" style={styles.success}>{notice}</p>}
      <div style={styles.statusList}>
        {['identity', 'business'].map((type) => {
          const item = latestByType.get(type)
          return <article key={type} style={styles.statusCard}>
            <strong>{type === 'identity' ? 'Identity verification' : 'Business verification'}</strong>
            <span style={styles.status(item?.status)}>{item?.status || 'Not verified'}</span>
            {item?.status === 'Rejected' && <p style={styles.copy}>Correction requested: {item.rejection_explanation || 'Please submit a corrected request.'}</p>}
            {item?.status === 'Pending' && <p style={styles.copy}>Your request is awaiting administrator review.</p>}
          </article>
        })}
      </div>
      <form onSubmit={submit} style={styles.form}>
        <h3 style={styles.subheading}>Submit or resubmit a request</h3>
        <label style={styles.label}>Verification type
          <select value={form.type} onChange={(event) => {
            const type = event.target.value
            selectedType.current = type
            const previousRequest = latestByType.get(type)
            setForm({ ...form, type, details: previousRequest?.status === 'Rejected' ? previousRequest.request_details || '' : '' })
          }} style={styles.input}>
            <option value="identity">Identity</option>
            <option value="business">Business</option>
          </select>
        </label>
        <label style={styles.label}>Non-sensitive request details (optional)
          <textarea maxLength={1000} value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} style={{ ...styles.input, minHeight: 76 }} placeholder="Briefly explain the request. Do not include document numbers or sensitive personal information." />
        </label>
        <button type="submit" style={styles.button} disabled={saving || ['Pending', 'Verified'].includes(latestByType.get(form.type)?.status)}>
          {saving ? 'Submitting…' : latestByType.get(form.type)?.status === 'Pending' ? 'Request pending' : latestByType.get(form.type)?.status === 'Verified' ? 'Already verified' : 'Submit for review'}
        </button>
      </form>
    </>}
  </section>
}

const styles = {
  section: { margin: '0 0 30px', padding: 20, background: 'white', borderRadius: 12, boxShadow: '0 2px 12px #102a4320' },
  heading: { color: '#172b4d', textAlign: 'left', marginTop: 0 },
  subheading: { margin: '5px 0 0', fontSize: 16, color: '#243b53' },
  copy: { color: '#536679', lineHeight: 1.5 },
  notice: { padding: 12, borderRadius: 7, background: '#fff8e8', color: '#735400', lineHeight: 1.5 },
  error: { color: '#a32222' },
  success: { color: '#086a45' },
  statusList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  statusCard: { display: 'grid', gap: 8, padding: 14, border: '1px solid #dce5e2', borderRadius: 8, color: '#243b53' },
  status: (value) => ({ display: 'inline-block', width: 'fit-content', padding: '4px 9px', borderRadius: 99, background: value === 'Verified' ? '#e7f5ed' : value === 'Rejected' ? '#fff0ee' : value === 'Pending' ? '#fff5df' : '#edf1f4', color: value === 'Verified' ? '#087144' : value === 'Rejected' ? '#a3372d' : value === 'Pending' ? '#805900' : '#526170', fontSize: 12, fontWeight: 700 }),
  form: { display: 'grid', gap: 12, maxWidth: 620, marginTop: 18 },
  label: { display: 'grid', gap: 6, color: '#34485d', fontWeight: 600 },
  input: { width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 7, font: 'inherit' },
  button: { justifySelf: 'start', background: '#0b7665', color: 'white', border: 0, borderRadius: 7, padding: '10px 15px', cursor: 'pointer' }
}

export default ClientVerificationPanel
