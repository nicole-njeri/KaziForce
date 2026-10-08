import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { WorkerLayout } from '../components/WorkerLayout'
import { apiHeaders, formatBudget } from '../components/workerApi'

function WorkerApplications() {
  const location = useLocation()
  const [applications, setApplications] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    fetch('http://localhost:5000/api/applications/worker/mine', { headers: apiHeaders() }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load your applications.')
      if (live) setApplications(data.applications || [])
    }).catch((loadError) => { if (live) setError(loadError.message || 'Unable to load your applications.') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])
  const tabs = ['All', 'Pending', 'Accepted', 'Rejected', 'Completed', 'Withdrawn']
  const visible = filter === 'All' ? applications : applications.filter((item) => String(item.status).toLowerCase() === filter.toLowerCase())
  return <WorkerLayout><div className="wf-heading"><div><p className="wf-eyebrow">YOUR ACTIVITY</p><h1>My applications</h1><p>Track the status of the gigs you have applied for.</p></div></div>
    {location.state?.success && <p className="wf-notice" role="status" style={{ marginBottom:16 }}>{location.state.success}</p>}
    <div className="wf-search-row" role="tablist" aria-label="Filter applications">{tabs.map((tab) => <button key={tab} className={filter === tab ? 'wf-primary' : 'wf-secondary'} type="button" role="tab" aria-selected={filter === tab} onClick={() => setFilter(tab)}>{tab}{tab === 'All' ? ` (${applications.length})` : ` (${applications.filter((item) => String(item.status).toLowerCase() === tab.toLowerCase()).length})`}</button>)}</div>
    {loading ? <div className="wf-state" role="status"><span className="wf-spinner"/><p>Loading your applications…</p></div> : error ? <div className="wf-error" role="alert">{error}</div> : <section className="wf-card"><div className="wf-table" role="table" aria-label="Your applications"><div className="wf-table-head" role="row"><span>Gig and client</span><span>Applied</span><span>Status</span><span/></div>
      {visible.length ? visible.map((application) => <Link className="wf-table-row" role="row" key={application.application_id} to={`/worker/applications/${application.application_id}`}><div><strong>{application.gig_title || `Gig #${application.gig_id}`}</strong><small>{application.client_name || 'Client'}{application.gig_budget != null ? ` · ${formatBudget(application.gig_budget)}` : ''}</small></div><span>{application.applied_at ? new Date(application.applied_at).toLocaleDateString() : 'Not available'}</span><span className={`wf-status ${String(application.status || '').toLowerCase()}`}>{application.status || 'Unknown'}</span><span aria-hidden="true">→</span></Link>) : <div className="wf-state"><h2>{applications.length ? `No ${filter.toLowerCase()} applications` : 'No applications yet'}</h2><p>{applications.length ? 'Choose another status filter to see your applications.' : 'Applications you submit will appear here.'}</p>{!applications.length && <Link className="wf-secondary" to="/worker/gigs">Find gigs</Link>}</div>}
    </div></section>}
  </WorkerLayout>
}
export default WorkerApplications
