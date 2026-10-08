import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { WorkerLayout } from '../components/WorkerLayout'
import { apiHeaders, formatBudget, splitTags } from '../components/workerApi'

function WorkerApplicationDetails() {
  const { applicationId } = useParams()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  useEffect(() => {
    let live = true
    fetch(`http://localhost:5000/api/applications/${encodeURIComponent(applicationId)}`, { headers: apiHeaders() }).then(async (response) => {
      const data = await response.json()
      if (response.status === 404) { if (live) setNotFound(true); return }
      if (!response.ok) throw new Error(data.message || 'Unable to load application details.')
      if (live) setApplication(data.application)
    }).catch((loadError) => { if (live) setError(loadError.message || 'Unable to load application details.') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [applicationId])
  const updatedAt = application?.updated_at ? new Date(application.updated_at).getTime() : 0
  const appliedAt = application?.applied_at ? new Date(application.applied_at).getTime() : 0
  const hasStatusUpdate = updatedAt > appliedAt + 1000
  return <WorkerLayout><Link className="wf-back" to="/worker/applications">← Back to My Applications</Link>
    {loading ? <div className="wf-state" role="status"><span className="wf-spinner"/><p>Loading application details…</p></div> : error ? <div className="wf-error" role="alert">{error}</div> : notFound || !application ? <div className="wf-state"><h2>Application not found</h2><p>The application may have been removed.</p><Link className="wf-secondary" to="/worker/applications">Back to applications</Link></div> : <section className="wf-card wf-app-detail"><header className="wf-app-detail-head"><div><p className="wf-eyebrow">APPLICATION DETAILS</p><h1>{application.gig_title || `Gig #${application.gig_id}`}</h1><p>{application.client_name || 'Client'}</p></div><span className={`wf-status ${String(application.status || '').toLowerCase()}`}>{application.status}</span></header>
      <div className="wf-app-detail-body"><h2>Your application</h2><div className="wf-app-meta"><span>Applied {application.applied_at ? new Date(application.applied_at).toLocaleString() : 'date unavailable'}</span><span>{application.gig_location || 'Location not specified'}</span>{application.gig_budget != null && <span>{formatBudget(application.gig_budget)}</span>}{application.gig_duration && <span>{application.gig_duration}</span>}</div>
        <section className="wf-detail-section" style={{ padding: '20px 0 0', border: 0 }}><h2>Cover message</h2><p>{application.cover_message || 'No cover message was included with this application.'}</p></section>
        {splitTags(application.gig_required_skills).length > 0 && <section className="wf-detail-section" style={{ padding: '18px 0 0', border: 0 }}><h2>Gig requirements</h2><div className="wf-tags">{splitTags(application.gig_required_skills).map((skill) => <span className="wf-tag" key={skill}>{skill}</span>)}</div></section>}
        <section className="wf-detail-section" style={{ padding: '20px 0 0', border: 0 }}><h2>Application timeline</h2><div className="wf-application-list"><div className="wf-application-row"><span className="wf-gig-mark" style={{ width:22,height:22,fontSize:10 }}>✓</span><div><strong>Application submitted</strong><small>{application.applied_at ? new Date(application.applied_at).toLocaleString() : 'Date unavailable'}</small></div></div>{hasStatusUpdate && <div className="wf-application-row"><span className="wf-gig-mark" style={{ width:22,height:22,fontSize:10 }}>•</span><div><strong>Status updated to {application.status}</strong><small>{new Date(application.updated_at).toLocaleString()}</small></div></div>}</div></section>
      </div>
    </section>}
  </WorkerLayout>
}
export default WorkerApplicationDetails
