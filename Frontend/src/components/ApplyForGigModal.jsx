import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiHeaders, formatBudget } from './workerApi'

export default function ApplyForGigModal({ gig, onClose, alreadyApplied = false }) {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(alreadyApplied ? 'You have already applied for this gig.' : '')
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape' && !submitting) onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, submitting])

  const submit = async (event) => {
    event.preventDefault()
    if (alreadyApplied || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('http://localhost:5000/api/applications', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ gigId: gig.gig_id, coverMessage: message.trim() }) })
      const data = await response.json()
      if (!response.ok) throw new Error(response.status === 409 ? 'You have already applied for this gig, or applications have closed.' : data.message || 'Unable to submit your application.')
      navigate('/worker/applications', { replace: true, state: { success: data.message || 'Application submitted successfully.' } })
    } catch (submitError) { setError(submitError.message || 'Unable to submit your application.') }
    finally { setSubmitting(false) }
  }

  return <div className="wf-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose() }}><section className="wf-modal" role="dialog" aria-modal="true" aria-labelledby="apply-title"><div className="wf-modal-head"><div><p className="wf-eyebrow">APPLICATION</p><h2 id="apply-title">Apply for this gig</h2></div><button type="button" aria-label="Close application" onClick={onClose}>×</button></div>
    <div className="wf-modal-summary"><span className="wf-gig-mark">{String(gig.category || gig.title || 'G').charAt(0).toUpperCase()}</span><div><strong>{gig.title}</strong><span>{gig.client_name || 'Client'}{gig.location ? ` · ${gig.location}` : ''}{formatBudget(gig.budget) ? ` · ${formatBudget(gig.budget)}` : ''}</span></div></div>
    {error && <p className="wf-error" role="alert" style={{ marginTop: 14 }}>{error}</p>}
    <form onSubmit={submit}><label className="wf-field">Cover message <textarea maxLength={3000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Introduce yourself and explain why you are a good fit for this gig."/><small>Optional · {message.length}/3000 characters</small></label><p style={{ marginTop: 10, color: '#8996a3', fontSize: 9 }}>File attachments are not available for this application.</p><div className="wf-modal-actions"><button className="wf-secondary" type="button" disabled={submitting} onClick={onClose}>Cancel</button><button className="wf-primary" type="submit" disabled={submitting || alreadyApplied}>{submitting ? 'Submitting…' : alreadyApplied ? 'Already applied' : 'Submit Application'}</button></div></form>
  </section></div>
}
