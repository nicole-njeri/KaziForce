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

  const handleApply = async () => {
    try {
      if (!selectedGig) {
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
              gigId: selectedGig.gig_id,
              coverMessage:
                `I am interested in this ${getGigTitle(
                  selectedGig
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
  // RENDER
  // -------------------------------------------------------

  return (

    <div className="worker-dashboard">

      {/* =================================================
          HEADER
      ================================================== */}

      <header className="dashboard-header">

        <div className="brand-section">

          <h1>
            KaziForce
          </h1>

          <p>
            Worker Dashboard
          </p>

        </div>


        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </header>


      {/* =================================================
          MAIN CONTENT
      ================================================== */}

      <main className="dashboard-content">


        {/* =================================================
            GIG DETAILS
        ================================================== */}

        {selectedGig && (

          <section className="gig-details-panel">

            <button
              className="back-button"
              onClick={closeGigDetails}
            >
              ← Back to Recommendations
            </button>


            <div className="details-header">

              <div>

                <span className="gig-id">
                  {selectedGig.gig_id}
                </span>

                <h2>
                  {getGigTitle(
                    selectedGig
                  )}
                </h2>

              </div>


              {selectedGig.recommendation && (

                <div
                  className={`details-match-score ${getMatchClass(
                    selectedGig
                      .recommendation
                      .match_strength
                  )}`}
                >

                  <strong>
                    {
                      selectedGig
                        .recommendation
                        .score
                    }%
                  </strong>

                  <span>
                    {
                      selectedGig
                        .recommendation
                        .match_strength
                    }
                  </span>

                </div>

              )}

            </div>


            <div className="details-grid">


              {/* LOCATION */}

              <div className="details-item">

                <span>
                  Location
                </span>

                <strong>
                  {getGigValue(
                    selectedGig,
                    [
                      'location',
                      'gig_location'
                    ],
                    'Not specified'
                  )}
                </strong>

              </div>


              {/* CATEGORY */}

              <div className="details-item">

                <span>
                  Category
                </span>

                <strong>
                  {getGigValue(
                    selectedGig,
                    [
                      'category'
                    ],
                    'Technology'
                  )}
                </strong>

              </div>


              {/* BUDGET */}

              <div className="details-item">

                <span>
                  Budget
                </span>

                <strong>
                  {getGigValue(
                    selectedGig,
                    [
                      'budget',
                      'pay',
                      'payment'
                    ],
                    'Not specified'
                  )}
                </strong>

              </div>


              {/* DURATION */}

              <div className="details-item">

                <span>
                  Duration
                </span>

                <strong>
                  {getGigValue(
                    selectedGig,
                    [
                      'duration',
                      'deadline'
                    ],
                    'Not specified'
                  )}
                </strong>

              </div>

            </div>


            {/* DESCRIPTION */}

            <div className="details-section">

              <h3>
                Gig Description
              </h3>

              <p>
                {getGigValue(
                  selectedGig,
                  [
                    'description',
                    'gig_description',
                    'requirements',
                    'details'
                  ],
                  'No description available.'
                )}
              </p>

            </div>


            {/* REQUIRED SKILLS */}

            <div className="details-section">

              <h3>
                Required Skills
              </h3>


              <div className="tag-list">

                {getSkillList(
                  selectedGig.required_skills || selectedGig.skills || selectedGig.gig_tags?.skills
                ).map(
                  (skill) => (

                    <span
                      key={skill}
                      className="tag"
                    >
                      {skill}
                    </span>

                  )
                )}

              </div>

            </div>


            {/* MATCHING SKILLS */}

            {selectedGig.recommendation && (

              <div className="details-section">

                <h3>
                  Why This Gig Matches You
                </h3>


                <div className="match-explanation">

                  <div>

                    <span>
                      Match Score
                    </span>

                    <strong>
                      {
                        selectedGig
                          .recommendation
                          .score
                      }%
                    </strong>

                  </div>


                  <div>

                    <span>
                      Matching Skills
                    </span>

                    <div className="tag-list">

                      {selectedGig
                        .recommendation
                        .similarity
                        ?.common_tags
                        ?.map(
                          (tag) => (

                            <span
                              key={tag}
                              className="tag"
                            >
                              {tag}
                            </span>

                          )
                        )}

                    </div>

                  </div>


                  {selectedGig
                    .recommendation
                    .similarity
                    ?.missing_tags
                    ?.length > 0 && (

                    <div>

                      <span>
                        Skills You May Need
                      </span>

                      <div className="tag-list">

                        {selectedGig
                          .recommendation
                          .similarity
                          .missing_tags
                          .map(
                            (tag) => (

                              <span
                                key={tag}
                                className="missing-tag"
                              >
                                {tag}
                              </span>

                            )
                          )}

                      </div>

                    </div>

                  )}

                </div>

              </div>

            )}


            {/* APPLICATION STATUS */}

            {applicationMessage && (

              <div className="application-message">
                {applicationMessage}
              </div>

            )}


            {applicationError && (

              <div className="application-error">
                {applicationError}
              </div>

            )}


            {/* APPLY BUTTON */}

            <button
              className="apply-button"
              onClick={handleApply}
              disabled={
                applying ||
                Boolean(applicationMessage)
              }
            >
              {applying
                ? 'Submitting Application...'
                : applicationMessage
                  ? 'Application Submitted'
                  : 'Apply for This Gig'}
            </button>

          </section>

        )}


        {/* =================================================
            RECOMMENDATIONS
        ================================================== */}

        {!selectedGig && (

          <>

            <section className="worker-summary">
              <form onSubmit={saveProfile} style={{ width: '100%' }}>
                <h2>My worker profile</h2>
                <label>Skills (comma-separated)<input value={profile.skills} onChange={(event) => setProfile({ ...profile, skills: event.target.value })} /></label>
                <label>Experience (years)<input type="number" min="0" value={profile.experienceYears} onChange={(event) => setProfile({ ...profile, experienceYears: event.target.value })} /></label>
                <label>Education<input value={profile.education} onChange={(event) => setProfile({ ...profile, education: event.target.value })} /></label>
                <label>Availability<input value={profile.availability} onChange={(event) => setProfile({ ...profile, availability: event.target.value })} /></label>
                <label>About me<textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
                <button type="submit" className="view-gig-button">Save profile</button>
                {profileSaved && <p role="status">{profileSaved}</p>}
              </form>
            </section>

            <section className="recommendations">
              <div className="section-heading"><h2>My Applications</h2><span>{applications.length} submitted</span></div>
              {applications.length === 0 ? <p>You have not applied to any gigs yet.</p> : applications.map((application) => {
                const gig = allGigs.find((item) => String(item.gig_id) === String(application.gig_id))
                return <article key={application.application_id} className="gig-card">
                  <h3>{gig?.title || `Gig #${application.gig_id}`}</h3>
                  <p>Applied {new Date(application.applied_at).toLocaleDateString()} · Status: <strong>{application.status}</strong></p>
                </article>
              })}
            </section>

            <section className="welcome-section">

              <div>

                <h2>
                  Recommended Gigs
                </h2>

                <p>
                  Opportunities matched to
                  your skills and profile.
                </p>

              </div>

            </section>


            {/* WORKER SUMMARY */}

            {worker && (

              <section className="worker-summary">

                <div className="summary-item">

                  <span className="summary-label">
                    Worker ID
                  </span>

                  <span className="summary-value">
                    {worker.worker_id}
                  </span>

                </div>


                <div className="summary-item">

                  <span className="summary-label">
                    Location
                  </span>

                  <span className="summary-value">
                    {worker.location}
                  </span>

                </div>


                <div className="summary-item">

                  <span className="summary-label">
                    Experience
                  </span>

                  <span className="summary-value">
                    {worker.experience_years}
                    {' '}
                    years
                  </span>

                </div>


                <div className="summary-item">

                  <span className="summary-label">
                    Reputation
                  </span>

                  <span className="summary-value">
                    {Number(worker.reputation || 0).toFixed(1)}
                  </span>

                </div>

              </section>

            )}


            {/* LOADING */}

            {loading && (

              <div className="status-message">

                <div className="loading-spinner"></div>

                <p>
                  Finding gigs that match
                  your skills...
                </p>

              </div>

            )}


            {/* ERROR */}

            {!loading &&
              error && (

              <div className="status-message error-message">

                <h3>
                  Unable to load recommendations
                </h3>

                <p>
                  {error}
                </p>

              </div>

            )}


            {/* RECOMMENDATIONS */}

            {!loading &&
              !error &&
              recommendations.length > 0 && (

              <section className="recommendations">

                <div className="section-heading">

                  <h2>
                    Your Matches
                  </h2>

                  <span>
                    {
                      recommendations.length
                    }
                    {' '}
                    recommendations
                  </span>

                </div>


                <div className="gig-grid">

                  {recommendations.map(
                    (gig) => (

                    <article
                      key={gig.gig_id}
                      className="gig-card"
                    >

                      <div className="gig-card-header">

                        <div className="gig-title-section">

                          <span className="gig-id">
                            {gig.gig_id}
                          </span>

                          <h3>
                            {getGigTitle(
                              allGigs.find(
                                (item) =>
                                  String(
                                    item.gig_id ||
                                    item.id
                                  ) ===
                                  String(
                                    gig.gig_id
                                  )
                              ) || gig
                            )}
                          </h3>

                        </div>


                        <div
                          className={`match-score ${getMatchClass(
                            gig.match_strength
                          )}`}
                        >

                          <strong>
                            {gig.score}%
                          </strong>

                          <span>
                            {gig.match_strength}
                          </span>

                        </div>

                      </div>


                      <div className="gig-details">

                        <div className="detail-item">

                          <span>
                            Location
                          </span>

                          <strong>
                            {
                              gig.gig_location ||
                              'Not specified'
                            }
                          </strong>

                        </div>


                        <div className="detail-item">

                          <span>
                            Ranking
                          </span>

                          <strong>
                            #{gig.rank}
                          </strong>

                        </div>

                      </div>


                      <div className="match-information">

                        <h4>
                          Matching Skills
                        </h4>


                        {gig.similarity
                          ?.common_tags
                          ?.length > 0 ? (

                          <div className="tag-list">

                            {gig.similarity
                              .common_tags
                              .map(
                                (tag) => (

                                  <span
                                    key={tag}
                                    className="tag"
                                  >
                                    {tag}
                                  </span>

                                )
                              )}

                          </div>

                        ) : (

                          <p className="no-skills">
                            No direct skill matches.
                          </p>

                        )}

                      </div>


                      {gig.similarity
                        ?.missing_tags
                        ?.length > 0 && (

                        <div className="missing-skills">

                          <h4>
                            Skills to Consider
                          </h4>


                          <div className="tag-list">

                            {gig.similarity
                              .missing_tags
                              .map(
                                (tag) => (

                                  <span
                                    key={tag}
                                    className="missing-tag"
                                  >
                                    {tag}
                                  </span>

                                )
                              )}

                          </div>

                        </div>

                      )}


                      <button
                        className="view-gig-button"
                        onClick={() =>
                          handleViewGig(gig)
                        }
                      >
                        View Gig
                      </button>

                    </article>

                  ))}

                </div>

              </section>

            )}


            {/* NO RESULTS */}

            {!loading &&
              !error &&
              recommendations.length === 0 && (

              <div className="status-message">

                <h3>
                  No matching gigs found
                </h3>

                <p>
                  Try updating your worker
                  profile and skills.
                </p>

              </div>

            )}

          </>

        )}

      </main>

    </div>
  )
}


export default WorkerDashboard
