import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './WorkerDashboard.css'


function WorkerDashboard() {
  const navigate = useNavigate()

  const [recommendations, setRecommendations] = useState([])
  const [worker, setWorker] = useState(null)
  const [allGigs, setAllGigs] = useState([])
  const [selectedGig, setSelectedGig] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [applying, setApplying] = useState(false)
  const [applicationMessage, setApplicationMessage] = useState('')
  const [applicationError, setApplicationError] = useState('')
  const [applications, setApplications] = useState([])
  const [profile, setProfile] = useState({ bio: '', experienceYears: '', education: '', availability: '', skills: '' })
  const [profileSaved, setProfileSaved] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [showAllApplications, setShowAllApplications] = useState(false)
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [accountUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  })


  // -------------------------------------------------------
  // Load the signed-in worker's recommendations and profile from protected
  // APIs; never derive account identity from form or URL input.
  // -------------------------------------------------------

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError('')

        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }


        // -----------------------------------------------
        // GET RECOMMENDATIONS
        // -----------------------------------------------

        const recommendationResponse =
          await fetch(
            'http://localhost:5000/api/matching/gigs',
            {
              method: 'POST',

              headers,
              body: JSON.stringify({ topN: 5 })
            }
          )


        const recommendationData =
          await recommendationResponse.json()


        if (!recommendationResponse.ok) {
          throw new Error(
            recommendationData.message ||
            recommendationData.error ||
            'Unable to load recommendations.'
          )
        }


        setWorker(
          recommendationData.worker || null
        )

        setRecommendations(
          recommendationData.recommendations || []
        )


        // -----------------------------------------------
        // GET FULL GIG INFORMATION
        // -----------------------------------------------

        const gigsResponse =
          await fetch(
            'http://localhost:5000/api/gigs'
          )


        if (gigsResponse.ok) {

          const gigsData =
            await gigsResponse.json()

          setAllGigs(
            gigsData.gigs ||
            gigsData ||
            []
          )
        }

        const applicationResponse = await fetch('http://localhost:5000/api/applications/worker/mine', { headers })
        if (applicationResponse.ok) {
          const applicationData = await applicationResponse.json()
          setApplications(applicationData.applications || [])
        }
        const profileResponse = await fetch('http://localhost:5000/api/profiles/mine', { headers })
        if (profileResponse.ok) {
          const { profile: savedProfile } = await profileResponse.json()
          setProfile({ bio: savedProfile.bio || '', experienceYears: savedProfile.experience_years ?? '', education: savedProfile.education || '', availability: savedProfile.availability || '', skills: savedProfile.skills || '' })
        }


          } catch (loadError) {

        console.error(
          'Dashboard error:',
          loadError
        )

        setError(
          loadError.message ||
          'Unable to load dashboard information.'
        )

      } finally {

        setLoading(false)

      }
    }


    loadDashboard()

  }, [])


  // -------------------------------------------------------
  // MATCH STRENGTH
  // -------------------------------------------------------

  const getMatchClass = (
    strength
  ) => {

    if (
      strength === 'Strong'
    ) {
      return 'match-strong'
    }

    if (
      strength === 'Moderate'
    ) {
      return 'match-moderate'
    }

    return 'match-weak'
  }


  // -------------------------------------------------------
  // FIND VALUE FROM GIG
  // -------------------------------------------------------

  const getGigValue = (
    gig,
    keys,
    fallback = ''
  ) => {

    for (const key of keys) {

      if (
        gig &&
        gig[key] !== undefined &&
        gig[key] !== null &&
        gig[key] !== ''
      ) {
        return gig[key]
      }

    }

    return fallback
  }


  // -------------------------------------------------------
  // GET GIG TITLE
  // -------------------------------------------------------

  const getGigTitle = (
    gig
  ) => {

    return getGigValue(
      gig,
      [
        'title',
        'gig_title',
        'gig_name',
        'name'
      ],
      'Recommended Gig'
    )
  }

  const getSkillList = (skills) => Array.isArray(skills) ? skills : typeof skills === 'string' ? skills.split(',').map((skill) => skill.trim()).filter(Boolean) : []


  // -------------------------------------------------------
  // GET GIG DETAILS
  // -------------------------------------------------------

  const getFullGig = (
    recommendation
  ) => {

    const gigId =
      recommendation.gig_id

    const matchingGig =
      allGigs.find(
        (gig) =>
          String(
            gig.gig_id ||
            gig.id
          ) === String(gigId)
      )


    if (matchingGig) {

      return {
        ...matchingGig,
        recommendation
      }

    }


    return {
      ...recommendation,
      recommendation
    }
  }


  // -------------------------------------------------------
  // VIEW GIG
  // -------------------------------------------------------

  const handleViewGig = (
    recommendation
  ) => {

    const gig =
      getFullGig(
        recommendation
      )

    setSelectedGig(gig)

    setApplicationMessage('')
    setApplicationError('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }


  // -------------------------------------------------------
  // Submit applications under the JWT identity and update local status
  // immediately so the worker can see the new application without a reload.
  // -------------------------------------------------------

  const handleApply = async (gig = selectedGig) => {
    try {
      if (!gig) {
        return
      }

      setApplying(true)
      setApplicationMessage('')
      setApplicationError('')

      const token = localStorage.getItem('token')
      if (!token) throw new Error('Please sign in again to apply.')

      const response =
        await fetch(
          'http://localhost:5000/api/applications',
          {
            method: 'POST',

            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

            body: JSON.stringify({
              gigId: gig.gig_id,
              coverMessage:
                `I am interested in this ${getGigTitle(
                  gig
                )} opportunity.`
            })
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setApplicationError(
            'You have already applied for this gig.'
          )
        } else {
          setApplicationError(
            data.message ||
            'Unable to submit application.'
          )
        }

        return
      }

      setApplicationMessage(
        data.message ||
        'Application submitted successfully.'
      )
      setApplications((current) => [
        data.application,
        ...current.filter((item) => item.application_id !== data.application.application_id)
      ])

    } catch (error) {

      console.error(
        'Application error:',
        error
      )

      setApplicationError(
        error.message ||
        'Unable to submit application.'
      )

    } finally {

      setApplying(false)

    }
  }


  // -------------------------------------------------------
  // CLOSE GIG DETAILS
  // -------------------------------------------------------

  const closeGigDetails = () => {
    setSelectedGig(null)
    setApplicationMessage('')
    setApplicationError('')
  }

  // Save profile changes first, then refresh recommendations using the new skills.
  const saveProfile = async (event) => {
    event.preventDefault()
    setProfileSaved('')
    try {
      const response = await fetch('http://localhost:5000/api/profiles/mine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(profile)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save profile.')
      const matchResponse = await fetch('http://localhost:5000/api/matching/gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ topN: 5 })
      })
      if (matchResponse.ok) {
        const matchData = await matchResponse.json()
        setRecommendations(matchData.recommendations || [])
        setWorker(matchData.worker || null)
      }
      setProfileSaved('Profile saved. Recommendations will use your updated skills.')
    } catch (err) { setProfileSaved(err.message) }
  }


  // -------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------

  const handleLogout = () => {

    localStorage.removeItem(
      'token'
    )

    localStorage.removeItem(
      'user'
    )

    navigate('/login')
  }


  // -------------------------------------------------------
  const profileCompletionFields = [
    profile.skills,
    profile.bio,
    profile.education,
    profile.availability,
    profile.experienceYears !== '' && profile.experienceYears !== null && profile.experienceYears !== undefined
  ]
  const profileCompletion = Math.round(
    (profileCompletionFields.filter(Boolean).length / profileCompletionFields.length) * 100
  )
  const workerName = accountUser.full_name || accountUser.fullName || 'there'
  const firstName = workerName.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const filteredRecommendations = recommendations.filter((gig) => {
    const fullGig = getFullGig(gig)
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    return [
      getGigTitle(fullGig),
      fullGig.category,
      fullGig.location,
      fullGig.gig_location,
      fullGig.required_skills
    ].some((value) => String(value || '').toLowerCase().includes(query))
  })
  const formatBudget = (value) => {
    if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return null
    return new Intl.NumberFormat('en-KE', {
      style: 'currency', currency: 'KES', maximumFractionDigits: 0
    }).format(Number(value))
  }
  const visibleApplications = showAllApplications ? applications : applications.slice(0, 3)
  const rating = Number(worker?.reputation || 0)
  const summaryItems = [
    { label: 'Recommended gigs', value: recommendations.length, detail: 'Open opportunities matched to you', tone: 'green' },
    { label: 'Applications', value: applications.length, detail: 'Applications you have submitted', tone: 'blue' },
    { label: 'Profile complete', value: `${profileCompletion}%`, detail: 'Based on your saved profile details', tone: 'sand' },
    rating > 0
      ? { label: 'Average rating', value: `${rating.toFixed(1)} / 5`, detail: 'From client reviews', tone: 'violet' }
      : { label: 'Experience', value: `${worker?.experience_years ?? profile.experienceYears ?? 0} yrs`, detail: 'Experience on your profile', tone: 'violet' }
  ]

  return (
    <div className="worker-dashboard">
      <aside className="dashboard-sidebar">
        <a className="brand-section" href="#dashboard-top" onClick={() => setActiveSection('dashboard')}>
          <span className="brand-mark" aria-hidden="true">K</span>
          <span className="brand-copy"><strong>Kazi<span>Force</span></strong><small>Skills. People. Opportunities.</small></span>
        </a>

        <p className="sidebar-label">WORKSPACE</p>
        <nav className="sidebar-nav" aria-label="Worker dashboard navigation">
          <a className={`sidebar-link ${activeSection === 'dashboard' ? 'active' : ''}`} href="#dashboard-top" onClick={() => setActiveSection('dashboard')}><span aria-hidden="true">⌂</span>Dashboard</a>
          <a className={`sidebar-link ${activeSection === 'gigs' ? 'active' : ''}`} href="#recommendations" onClick={() => setActiveSection('gigs')}><span aria-hidden="true">⌕</span>Find gigs</a>
          <a className={`sidebar-link ${activeSection === 'applications' ? 'active' : ''}`} href="#applications" onClick={() => setActiveSection('applications')}><span aria-hidden="true">▤</span>My applications</a>
          <a className={`sidebar-link ${activeSection === 'profile' ? 'active' : ''}`} href="#profile" onClick={() => setActiveSection('profile')}><span aria-hidden="true">◯</span>My profile</a>
        </nav>

        <div className="sidebar-prompt">
          <span className="prompt-kicker">YOUR NEXT STEP</span>
          <strong>Keep your skills up to date.</strong>
          <p>A complete profile helps the matching engine find relevant gigs.</p>
          <button type="button" className="text-action" onClick={() => { setShowProfileEditor(true); setActiveSection('profile'); document.getElementById('profile')?.scrollIntoView({ behavior: 'smooth' }) }}>Update profile <span aria-hidden="true">→</span></button>
        </div>

        <button type="button" className="sidebar-logout" onClick={handleLogout}><span aria-hidden="true">↪</span>Log out</button>
      </aside>

      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <label className="dashboard-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Search recommended gigs"
              placeholder="Search gigs by title, category or skill"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && <button type="button" aria-label="Clear search" onClick={() => setSearchQuery('')}>×</button>}
          </label>
          <div className="account-summary">
            <span className="account-avatar" aria-hidden="true">{workerName.charAt(0).toUpperCase()}</span>
            <span><strong>{workerName}</strong><small>Worker</small></span>
          </div>
        </header>

        <main className="dashboard-content" id="dashboard-top">
          {selectedGig ? (
            <section className="gig-details-panel" aria-labelledby="gig-detail-title">
              <button type="button" className="back-button" onClick={closeGigDetails}>← Back to recommendations</button>
              <div className="details-header">
                <div>
                  <p className="eyebrow">GIG DETAILS</p>
                  <h1 id="gig-detail-title">{getGigTitle(selectedGig)}</h1>
                  <p className="detail-subtitle">{getGigValue(selectedGig, ['location', 'gig_location'], 'Location not specified')}</p>
                </div>
                {selectedGig.recommendation && <div className={`details-match-score ${getMatchClass(selectedGig.recommendation.match_strength)}`}><strong>{selectedGig.recommendation.score}%</strong><span>match</span></div>}
              </div>

              <div className="details-grid">
                {[
                  ['Category', getGigValue(selectedGig, ['category'], 'Not specified')],
                  ['Budget', formatBudget(getGigValue(selectedGig, ['budget', 'pay', 'payment'], null)) || 'Not specified'],
                  ['Duration', getGigValue(selectedGig, ['duration', 'deadline'], 'Not specified')],
                  ['Location', getGigValue(selectedGig, ['location', 'gig_location'], 'Not specified')]
                ].map(([label, value]) => <div className="details-item" key={label}><span>{label}</span><strong>{value}</strong></div>)}
              </div>

              <section className="details-section">
                <h2>About this gig</h2>
                <p>{getGigValue(selectedGig, ['description', 'gig_description', 'requirements', 'details'], 'No description available.')}</p>
              </section>
              <section className="details-section">
                <h2>Skills for this gig</h2>
                <div className="tag-list">{getSkillList(selectedGig.required_skills || selectedGig.skills || selectedGig.gig_tags?.skills).map((skill, index) => <span className="tag" key={`${skill}-${index}`}>{skill}</span>)}</div>
              </section>
              {selectedGig.recommendation && <section className="details-section">
                <h2>Why this matches your profile</h2>
                <p className="match-note">Your recommendation score is calculated from how closely your saved skills match the gig requirements.</p>
                <div className="tag-list">{(selectedGig.recommendation.similarity?.common_tags || []).map((tag, index) => <span className="tag" key={`${tag}-${index}`}>{tag}</span>)}</div>
              </section>}
              {applicationMessage && <p className="application-message" role="status">{applicationMessage}</p>}
              {applicationError && <p className="application-error" role="alert">{applicationError}</p>}
              <button type="button" className="apply-button" onClick={() => handleApply()} disabled={applying || Boolean(applicationMessage)}>
                {applying ? 'Submitting application…' : applicationMessage ? 'Application submitted' : 'Apply for this gig'}
              </button>
            </section>
          ) : (
            <>
              <section className="welcome-section">
                <div>
                  <p className="eyebrow">WORKER DASHBOARD</p>
                  <h1>{greeting}, {firstName}</h1>
                  <p>Here are opportunities that match your skills and profile.</p>
                </div>
                {worker?.location && <span className="location-chip"><span aria-hidden="true">⌖</span>{worker.location}</span>}
              </section>

              <section className="worker-summary" aria-label="Your marketplace summary">
                {summaryItems.map((item) => <article className={`summary-card summary-${item.tone}`} key={item.label}>
                  <span className="summary-label">{item.label}</span>
                  <strong className="summary-value">{item.value}</strong>
                  <span className="summary-detail">{item.detail}</span>
                </article>)}
              </section>

              <div className="dashboard-grid">
                <section className="recommendations main-column" id="recommendations" aria-labelledby="recommendations-title">
                  <div className="section-heading">
                    <div><p className="eyebrow">CURATED FOR YOU</p><h2 id="recommendations-title">Recommended gigs</h2></div>
                    {!loading && !error && <span className="result-count">{filteredRecommendations.length} {filteredRecommendations.length === 1 ? 'opportunity' : 'opportunities'}</span>}
                  </div>

                  {applicationMessage && <p className="application-message" role="status">{applicationMessage}</p>}
                  {applicationError && <p className="application-error" role="alert">{applicationError}</p>}

                  {loading && <div className="status-message" role="status"><span className="loading-spinner" /><p>Finding gigs that match your skills…</p></div>}
                  {!loading && error && <div className="status-message error-message" role="alert"><h2>Unable to load recommendations</h2><p>{error}</p></div>}
                  {!loading && !error && recommendations.length > 0 && filteredRecommendations.length === 0 && <div className="status-message"><h2>No gigs match that search</h2><p>Try a different title, category or skill.</p></div>}
                  {!loading && !error && recommendations.length === 0 && <div className="status-message"><h2>No matching gigs yet</h2><p>Update your skills to help us find relevant opportunities.</p><button type="button" className="text-action" onClick={() => { setShowProfileEditor(true); document.getElementById('profile')?.scrollIntoView({ behavior: 'smooth' }) }}>Review your profile →</button></div>}

                  {!loading && !error && filteredRecommendations.length > 0 && <div className="gig-list">
                    {filteredRecommendations.map((recommendation) => {
                      const gig = getFullGig(recommendation)
                      const title = getGigTitle(gig)
                      const skills = recommendation.similarity?.common_tags?.length
                        ? recommendation.similarity.common_tags.slice(0, 4)
                        : getSkillList(gig.required_skills || gig.skills || gig.gig_tags?.skills).slice(0, 4)
                      const budget = formatBudget(getGigValue(gig, ['budget', 'pay', 'payment'], null))
                      const location = getGigValue(gig, ['location', 'gig_location'], 'Location not specified')
                      const duration = getGigValue(gig, ['duration', 'deadline'], '')
                      const hasApplied = applications.some((application) => String(application.gig_id) === String(recommendation.gig_id))
                      return <article className="gig-card" key={recommendation.gig_id}>
                        <div className="gig-card-main">
                          <span className="gig-mark" aria-hidden="true">{String(gig.category || title).charAt(0).toUpperCase()}</span>
                          <div className="gig-title-section">
                            <span className="gig-category">{getGigValue(gig, ['category'], 'Open opportunity')}</span>
                            <h3>{title}</h3>
                            <p className="gig-meta"><span>⌖ {location}</span>{duration && <span>◷ {duration}</span>}</p>
                          </div>
                          <div className={`match-score ${getMatchClass(recommendation.match_strength)}`}><strong>{recommendation.score}%</strong><span>match</span></div>
                        </div>
                        {skills.length > 0 && <div className="tag-list gig-tags">{skills.map((skill, index) => <span className="tag" key={`${skill}-${index}`}>{skill}</span>)}</div>}
                        <div className="gig-card-footer">
                          <div className="gig-budget">{budget ? <><small>Budget</small><strong>{budget}</strong></> : <small>Budget not specified</small>}</div>
                          <div className="gig-actions">
                            <button type="button" className="secondary-action" onClick={() => handleViewGig(recommendation)}>View details</button>
                            <button type="button" className="primary-action" onClick={() => handleApply(gig)} disabled={applying || hasApplied}>{applying ? 'Applying…' : hasApplied ? 'Applied' : 'Apply'}</button>
                          </div>
                        </div>
                      </article>
                    })}
                  </div>}
                </section>

                <aside className="dashboard-aside" aria-label="Worker profile and applications">
                  <section className="side-panel profile-panel" id="profile" aria-labelledby="profile-title">
                    <div className="panel-heading"><div><p className="eyebrow">YOUR PROFILE</p><h2 id="profile-title">Profile completion</h2></div><strong className="completion-value">{profileCompletion}%</strong></div>
                    <div className="completion-track" role="progressbar" aria-label="Profile completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow={profileCompletion}><span style={{ width: `${profileCompletion}%` }} /></div>
                    <p className="panel-copy">{profileCompletion === 100 ? 'Your profile is ready to support better matches.' : 'Add the missing details below to help clients understand your experience.'}</p>
                    <button type="button" className="primary-action profile-toggle" onClick={() => setShowProfileEditor((visible) => !visible)}>{showProfileEditor ? 'Close profile editor' : profileCompletion === 100 ? 'Edit profile' : 'Complete profile'}</button>
                    {showProfileEditor && <form className="profile-editor" onSubmit={saveProfile}>
                      <label>Skills <input value={profile.skills} onChange={(event) => setProfile({ ...profile, skills: event.target.value })} placeholder="e.g. Carpentry, React" /></label>
                      <label>Experience (years) <input type="number" min="0" value={profile.experienceYears} onChange={(event) => setProfile({ ...profile, experienceYears: event.target.value })} /></label>
                      <label>Education <input value={profile.education} onChange={(event) => setProfile({ ...profile, education: event.target.value })} /></label>
                      <label>Availability <input value={profile.availability} onChange={(event) => setProfile({ ...profile, availability: event.target.value })} /></label>
                      <label>About you <textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} rows="3" /></label>
                      <button type="submit" className="primary-action">Save profile</button>
                      {profileSaved && <p className="profile-feedback" role="status">{profileSaved}</p>}
                    </form>}
                  </section>

                  <section className="side-panel" aria-labelledby="skills-title">
                    <div className="panel-heading"><div><p className="eyebrow">WHAT YOU DO</p><h2 id="skills-title">Your skills</h2></div><button type="button" className="text-action" onClick={() => { setShowProfileEditor(true); setActiveSection('profile'); document.getElementById('profile')?.scrollIntoView({ behavior: 'smooth' }) }}>Edit</button></div>
                    {getSkillList(profile.skills).length > 0
                      ? <div className="tag-list">{getSkillList(profile.skills).slice(0, 8).map((skill, index) => <span className="tag" key={`${skill}-${index}`}>{skill}</span>)}</div>
                      : <p className="panel-copy">Add your skills to improve your recommendations.</p>}
                  </section>

                  <section className="side-panel applications-panel" id="applications" aria-labelledby="applications-title">
                    <div className="panel-heading"><div><p className="eyebrow">YOUR ACTIVITY</p><h2 id="applications-title">Recent applications</h2></div>{applications.length > 3 && <button type="button" className="text-action" onClick={() => setShowAllApplications((show) => !show)}>{showAllApplications ? 'Show recent' : 'View all'}</button>}</div>
                    {applications.length === 0 ? <p className="panel-copy">Applications you submit will appear here.</p> : <div className="application-list">
                      {visibleApplications.map((application) => {
                        const gig = allGigs.find((item) => String(item.gig_id) === String(application.gig_id))
                        return <article className="application-row" key={application.application_id}>
                          <div className="application-mark" aria-hidden="true">{String(gig?.category || gig?.title || 'G').charAt(0).toUpperCase()}</div>
                          <div className="application-copy"><strong>{gig?.title || `Gig #${application.gig_id}`}</strong><span>{application.applied_at ? new Date(application.applied_at).toLocaleDateString() : 'Submitted'}</span></div>
                          <span className={`application-status status-${String(application.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`}>{application.status}</span>
                        </article>
                      })}
                    </div>}
                  </section>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}


export default WorkerDashboard
