import { useCallback, useEffect, useState } from 'react'

const API = 'http://localhost:5000/api/admin'

function AdminVerificationQueue() {
  const [items, setItems] = useState([])
  const [confirmations, setConfirmations] = useState({})
  const [reasons, setReasons] = useState({})
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch(`${API}/verifications/pending`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load pending verifications.')
      setItems(data.verifications || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])

  const review = async (item, status) => {
    setError(''); setNotice('')
    if (status === 'Verified' && confirmations[item.verification_id] !== true) {
      setError('Confirm the completed manual review before approving this request.')
      return
    }
    if (status === 'Rejected' && !reasons[item.verification_id]?.trim()) {
      setError('Add a client-facing explanation before rejecting this request.')
      return
    }
    setBusyId(item.verification_id)
    try {
      const response = await fetch(`${API}/verifications/${item.verification_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status, reviewConfirmed: confirmations[item.verification_id] === true, rejectionExplanation: reasons[item.verification_id] || '', internalNotes: notes[item.verification_id] || '' })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to review request.')
      setNotice(data.message)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return <section style={styles.section} aria-labelledby="admin-verifications-heading">
    <h2 id="admin-verifications-heading" style={styles.heading}>Client verification review</h2>
    <p style={styles.notice}>This feature does not collect or store identity or business documents. Approve only after completing a legitimate review through the approved process outside KaziForce. Do not treat an unreviewed request statement as proof.</p>
    {error && <p role="alert" style={styles.error}>{error}</p>}{notice && <p role="status" style={styles.success}>{notice}</p>}
    {loading ? <p role="status">Loading pending requests…</p> : items.length === 0 ? <p>No pending client verification requests.</p> : items.map((item) => <article key={item.verification_id} style={styles.card}>
      <div><strong>{item.client_name || `Client #${item.client_id}`}</strong><p>{item.organization_name || 'No organization name'} · {item.verification_type === 'identity' ? 'Identity' : 'Business'} verification</p><small>Submitted {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : 'date unavailable'}</small></div>
      <p style={styles.details}>{item.request_details || 'No additional non-sensitive details supplied.'}</p>
      <label style={styles.confirm}><input type="checkbox" checked={confirmations[item.verification_id] === true} onChange={(event) => setConfirmations({ ...confirmations, [item.verification_id]: event.target.checked })} /> I confirm I completed the manual review through the approved process outside KaziForce.</label>
      <label style={styles.label}>Client-facing correction explanation (required only when rejecting)
        <textarea maxLength={1000} value={reasons[item.verification_id] || ''} onChange={(event) => setReasons({ ...reasons, [item.verification_id]: event.target.value })} style={styles.input} />
      </label>
      <label style={styles.label}>Internal review notes (optional; never shown publicly)
        <textarea maxLength={2000} value={notes[item.verification_id] || ''} onChange={(event) => setNotes({ ...notes, [item.verification_id]: event.target.value })} style={styles.input} />
      </label>
      <div style={styles.actions}>
        <button type="button" style={styles.approve} disabled={busyId === item.verification_id} onClick={() => review(item, 'Verified')}>{busyId === item.verification_id ? 'Saving…' : 'Approve as verified'}</button>
        <button type="button" style={styles.reject} disabled={busyId === item.verification_id} onClick={() => review(item, 'Rejected')}>Reject request</button>
      </div>
    </article>)}
  </section>
}

const styles = {
  section: { maxWidth: 1100, margin: '24px auto', padding: '0 20px' },
  heading: { color: '#172b4d', textAlign: 'left' },
  notice: { padding: 12, borderRadius: 7, background: '#fff8e8', color: '#735400', lineHeight: 1.5 },
  error: { color: '#a32222' },
  success: { color: '#086a45' },
  card: { display: 'grid', gap: 10, marginBottom: 12, padding: 16, border: '1px solid #dce5e2', borderRadius: 9, background: 'white' },
  details: { margin: 0, color: '#536679', whiteSpace: 'pre-wrap' },
  confirm: { display: 'flex', gap: 8, alignItems: 'flex-start', color: '#34485d' },
  label: { display: 'grid', gap: 6, color: '#34485d', fontWeight: 600 },
  input: { minHeight: 55, padding: 9, border: '1px solid #cbd5e1', borderRadius: 7, font: 'inherit' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 9 },
  approve: { background: '#0b7665', color: 'white', border: 0, borderRadius: 7, padding: '9px 13px', cursor: 'pointer' },
  reject: { background: 'white', color: '#96332b', border: '1px solid #dba9a4', borderRadius: 7, padding: '9px 13px', cursor: 'pointer' }
}

export default AdminVerificationQueue
