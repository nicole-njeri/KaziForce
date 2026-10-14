import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { WorkerLayout } from '../components/WorkerLayout'
import { apiHeaders, formatBudget, splitTags } from '../components/workerApi'
import ApplyForGigModal from '../components/ApplyForGigModal'

function WorkerGigDetails() {
  const { gigId } = useParams()
  const location = useLocation()
  const [gig, setGig] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  useEffect(() => {
    let live = true
    const load = async () => {
      try {
        const [gigResponse, appResponse, matchResponse] = await Promise.all([
          fetch(`http://localhost:5000/api/gigs/${encodeURIComponent(gigId)}`),
          fetch('http://localhost:5000/api/applications/worker/mine', { headers: apiHeaders() }),
          fetch('http://localhost:5000/api/matching/gigs', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ topN: 100 }) }).catch(() => null)
        ])
        const [gigData, appData, matchData] = await Promise.all([gigResponse.json(), appResponse.json(), matchResponse?.json?.().catch(() => ({})) || {}])
        if (!gigResponse.ok) {
          if (gigResponse.status === 404) { if (live) setNotFound(true); return }
          throw new Error(gigData.message || 'Unable to load this gig.')
        }
        if (!appResponse.ok) throw new Error(appData.message || 'Unable to check whether you have applied.')
        if (live) {
          setGig(gigData.gig)
          setAlreadyApplied((appData.applications || []).some((application) => String(application.gig_id) === String(gigId)))
          if (matchResponse?.ok) setRecommendation((matchData.recommendations || []).find((item) => String(item.gig_id) === String(gigId)) || null)
          if (location.state?.openApply) setShowApply(true)
        }
      } catch (loadError) { if (live) setError(loadError.message || 'Unable to load this gig.') }
      finally { if (live) setLoading(false) }
    }
    load()
    return () => { live = false }
  }, [gigId, location.state])
  const closeApply = useCallback(() => setShowApply(false), [])

  return <WorkerLayout>{loading ? <div className="wf-state" role="status"><span className="wf-spinner"/><p>Loading gig details…</p></div> : error ? <div className="wf-error" role="alert">{error}<p style={{ marginTop: 9 }}><button className="wf-secondary" type="button" onClick={() => window.location.reload()}>Try again</button></p></div> : notFound || !gig ? <div className="wf-state"><h2>Gig not found</h2><p>This gig may have been removed or is no longer available.</p><Link className="wf-secondary" to="/worker/gigs">Back to gigs</Link></div> : <>
    <Link className="wf-back" to="/worker/gigs">← Back to Find Gigs</Link>
    <section className="wf-card" aria-labelledby="gig-title">
      <header className="wf-detail-header"><div><p className="wf-eyebrow">GIG DETAILS</p><h1 id="gig-title">{gig.title}</h1><p>{gig.client_name || 'Client'}{gig.location ? ` · ${gig.location}` : ''}</p></div><div className="wf-detail-budget"><span>Budget</span><strong>{formatBudget(gig.budget) || 'Not specified'}</strong>{recommendation && <span className="wf-match" style={{ display:'inline-flex', marginTop:8 }}>{recommendation.score}% match</span>}</div></header>
      <nav className="wf-detail-tabs wf-gig-detail-tabs" role="tablist" aria-label="Gig details sections">
        {[['overview', 'Overview'], ['requirements', 'Requirements'], ['client', 'About Client']].map(([tab, label]) => <button key={tab} id={`gig-tab-${tab}`} type="button" role="tab" aria-selected={activeTab === tab} aria-controls={`gig-panel-${tab}`} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{label}</button>)}
      </nav>
      {activeTab === 'overview' && <section className="wf-gig-detail-panel" id="gig-panel-overview" role="tabpanel" aria-labelledby="gig-tab-overview">
        <div className="wf-detail-grid">{[['Category', gig.category], ['Location', gig.location], ['Duration', gig.duration], ['Job status', gig.status]].map(([label,value]) => <div className="wf-detail-stat" key={label}><span>{label}</span><strong>{value || 'Not specified'}</strong></div>)}</div>
        <section className="wf-detail-section"><h2>Job description</h2><p>{gig.description || 'No description provided.'}</p></section>
      </section>}
      {activeTab === 'requirements' && <section className="wf-detail-section wf-gig-detail-panel" id="gig-panel-requirements" role="tabpanel" aria-labelledby="gig-tab-requirements"><h2>Requirements</h2>{splitTags(gig.required_skills).length ? <><p>Skills requested for this gig:</p><div className="wf-tags">{splitTags(gig.required_skills).map((skill) => <span className="wf-tag" key={skill}>{skill}</span>)}</div></> : <p>No requirements are listed for this gig.</p>}</section>}
      {activeTab === 'client' && <section className="wf-detail-section wf-gig-detail-panel" id="gig-panel-client" role="tabpanel" aria-labelledby="gig-tab-client"><h2>About the Client</h2><div className="wf-client-detail"><span>Client</span><strong>{gig.client_name || 'Client information is not available.'}</strong></div><div className="wf-client-detail"><span>Profile</span><p>{gig.client_bio || 'No additional client profile information is available.'}</p></div></section>}
      <footer className="wf-detail-footer"><span>{alreadyApplied ? 'You have already applied to this gig.' : gig.status === 'Open' ? 'Applications are open for this gig.' : 'This gig is not currently accepting applications.'}</span><button className="wf-primary" type="button" disabled={alreadyApplied || gig.status !== 'Open'} onClick={() => setShowApply(true)}>{alreadyApplied ? 'Already applied' : 'Apply Now'}</button></footer>
    </section>
    {showApply && <ApplyForGigModal gig={gig} alreadyApplied={alreadyApplied} onClose={closeApply}/>}
  </>}</WorkerLayout>
}
export default WorkerGigDetails
