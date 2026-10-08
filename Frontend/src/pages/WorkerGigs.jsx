import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { WorkerLayout } from '../components/WorkerLayout'
import { apiHeaders, formatBudget, splitTags } from '../components/workerApi'

function WorkerGigs() {
  const [gigs, setGigs] = useState([])
  const [scores, setScores] = useState({})
  const [applications, setApplications] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    const load = async () => {
      try {
        const [gigResponse, appResponse, matchResponse] = await Promise.all([
          fetch('http://localhost:5000/api/gigs'),
          fetch('http://localhost:5000/api/applications/worker/mine', { headers: apiHeaders() }),
          fetch('http://localhost:5000/api/matching/gigs', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ topN: 100 }) }).catch(() => null)
        ])
        const [gigData, appData, matchData] = await Promise.all([gigResponse.json(), appResponse.json(), matchResponse?.json?.().catch(() => ({})) || {}])
        if (!gigResponse.ok) throw new Error(gigData.message || 'Unable to load open gigs.')
        if (!appResponse.ok) throw new Error(appData.message || 'Unable to check your applications.')
        if (live) {
          setGigs(gigData.gigs || [])
          setApplications(appData.applications || [])
          if (matchResponse?.ok) setScores(Object.fromEntries((matchData.recommendations || []).map((recommendation) => [String(recommendation.gig_id), recommendation])))
        }
      } catch (loadError) { if (live) setError(loadError.message || 'Unable to load gigs.') }
      finally { if (live) setLoading(false) }
    }
    load()
    return () => { live = false }
  }, [])
  const categories = useMemo(() => [...new Set(gigs.map((gig) => gig.category).filter(Boolean))].sort(), [gigs])
  const filtered = useMemo(() => gigs.filter((gig) => {
    if (category && gig.category !== category) return false
    const text = `${gig.title} ${gig.client_name} ${gig.category} ${gig.location} ${gig.description} ${gig.required_skills}`.toLowerCase()
    return text.includes(query.trim().toLowerCase())
  }), [gigs, category, query])
  const appliedIds = new Set(applications.map((application) => String(application.gig_id)))

  return <WorkerLayout>
    <div className="wf-heading"><div><p className="wf-eyebrow">MARKETPLACE</p><h1>Find gigs</h1><p>Browse open opportunities and find work that fits your skills.</p></div></div>
    <section className="wf-card wf-panel">
      <div className="wf-search-row"><label className="wf-search-box"><span aria-hidden="true">⌕</span><input aria-label="Search gigs" type="search" placeholder="Search by title, client, location or skill" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
      {loading ? <div className="wf-state" role="status"><span className="wf-spinner"/><p>Loading open gigs…</p></div> : error ? <div className="wf-error" role="alert">{error}</div> : <><p className="wf-results-count">{filtered.length} {filtered.length === 1 ? 'gig' : 'gigs'} found</p>{filtered.length ? <div className="wf-gig-grid">{filtered.map((gig) => {
        const recommendation = scores[String(gig.gig_id)]
        const hasApplied = appliedIds.has(String(gig.gig_id))
        return <article className="wf-card wf-gig-card" key={gig.gig_id}><div className="wf-gig-top"><span className="wf-gig-mark">{String(gig.category || gig.title || 'G').charAt(0).toUpperCase()}</span><div className="wf-gig-main"><span className="wf-gig-category">{gig.category || 'Open opportunity'}</span><h2>{gig.title}</h2><p>{gig.client_name || 'Client'}{gig.location ? ` · ${gig.location}` : ''}</p></div>{recommendation && <span className="wf-match">{recommendation.score}% match</span>}</div>
          {splitTags(gig.required_skills).length > 0 && <div className="wf-tags">{splitTags(gig.required_skills).slice(0,5).map((tag) => <span className="wf-tag" key={tag}>{tag}</span>)}</div>}
          <div className="wf-gig-meta"><span>{formatBudget(gig.budget) || 'Budget not specified'}</span>{gig.duration && <span>{gig.duration}</span>}</div>
          <div className="wf-gig-actions"><Link className="wf-secondary" to={`/worker/gigs/${gig.gig_id}`}>View details</Link><Link className="wf-primary" to={`/worker/gigs/${gig.gig_id}`} state={{ openApply: !hasApplied }}>{hasApplied ? 'Applied' : 'Apply'}</Link></div>
        </article>
      })}</div> : <div className="wf-state"><h2>{gigs.length ? 'No gigs match those filters' : 'No open gigs right now'}</h2><p>{gigs.length ? 'Try another search or choose a different category.' : 'New open gigs will appear here when clients post them.'}</p></div>}</>}
    </section>
  </WorkerLayout>
}
export default WorkerGigs
