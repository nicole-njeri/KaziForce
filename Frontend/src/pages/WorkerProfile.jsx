import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './WorkerDashboard.css'
import './WorkerProfile.css'

const emptyProfile = { bio: '', experienceYears: '', education: '', availability: '', skills: '' }

function WorkerProfile({ editing = false }) {
  const navigate = useNavigate()
  const accountUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  }, [])
  const [profile, setProfile] = useState(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('http://localhost:5000/api/profiles/mine', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        if (response.status === 404) {
          setProfile({
            ...emptyProfile,
            fullName: accountUser.full_name || accountUser.fullName || '',
            email: accountUser.email || '',
            phone: accountUser.phone || '',
            location: accountUser.location || ''
          })
          return
        }
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Unable to load your profile.')
        const saved = data.profile || {}
        setProfile({
          bio: saved.bio || '',
          experienceYears: saved.experience_years ?? '',
          education: saved.education || '',
          availability: saved.availability || '',
          skills: saved.skills || '',
          fullName: saved.full_name || accountUser.full_name || accountUser.fullName || '',
          email: saved.email || accountUser.email || '',
          phone: saved.phone || accountUser.phone || '',
          location: saved.location || accountUser.location || ''
        })
      } catch (loadError) {
        setError(loadError.message || 'Unable to load your profile.')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [accountUser, editing])

  const skills = String(profile.skills || '').split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean)
  const completeFields = [profile.skills, profile.bio, profile.education, profile.availability, profile.experienceYears !== '' && profile.experienceYears !== null && profile.experienceYears !== undefined]
  const completion = Math.round((completeFields.filter(Boolean).length / completeFields.length) * 100)
  const workerName = profile.fullName || accountUser.full_name || accountUser.fullName || 'Worker'

  const saveProfile = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const years = profile.experienceYears
    if (years !== '' && (!Number.isInteger(Number(years)) || Number(years) < 0)) {
      setError('Experience must be a non-negative whole number.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('http://localhost:5000/api/profiles/mine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          bio: profile.bio,
          experienceYears: years === '' ? null : Number(years),
          education: profile.education,
          availability: profile.availability,
          skills: profile.skills
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save your profile.')
      const saved = data.profile || {}
      setProfile((current) => ({
        ...current,
        bio: saved.bio ?? current.bio,
        experienceYears: saved.experience_years ?? '',
        education: saved.education ?? current.education,
        availability: saved.availability ?? current.availability,
        skills: saved.skills ?? current.skills
      }))
      setNotice('Your profile changes have been saved.')
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="worker-dashboard worker-profile-page">
      <aside className="dashboard-sidebar">
        <Link className="brand-section" to="/worker/dashboard"><span className="brand-mark" aria-hidden="true">K</span><span className="brand-copy"><strong>Kazi<span>Force</span></strong><small>Skills. People. Opportunities.</small></span></Link>
        <p className="sidebar-label">WORKSPACE</p>
        <nav className="sidebar-nav" aria-label="Worker dashboard navigation">
          <Link className="sidebar-link" to="/worker/dashboard"><span aria-hidden="true">⌂</span>Dashboard</Link>
          <Link className="sidebar-link" to="/worker/dashboard#recommendations"><span aria-hidden="true">⌕</span>Find gigs</Link>
          <Link className="sidebar-link" to="/worker/dashboard#applications"><span aria-hidden="true">▤</span>My applications</Link>
          <Link className="sidebar-link active" aria-current="page" to="/worker/profile"><span aria-hidden="true">◯</span>My profile</Link>
        </nav>
        <button type="button" className="sidebar-logout" onClick={handleLogout}><span aria-hidden="true">↪</span>Log out</button>
      </aside>

      <div className="dashboard-shell">
        <header className="dashboard-topbar"><div className="profile-topbar-copy"><span className="account-avatar" aria-hidden="true">{workerName.charAt(0).toUpperCase()}</span><span><strong>{workerName}</strong><small>Worker profile</small></span></div></header>
        <main className="dashboard-content profile-content">
          <div className="profile-page-heading"><div><p className="eyebrow">MY PROFILE</p><h1>{editing ? 'Edit Profile' : 'Profile Overview'}</h1><p>{editing ? 'Keep your professional information up to date so clients can better understand your skills and experience.' : 'Review the professional information clients use to understand your experience.'}</p></div>{!editing && <button type="button" className="primary-action" onClick={() => navigate('/worker/profile/edit')}>Edit Profile <span aria-hidden="true">→</span></button>}</div>
          {loading ? <section className="profile-state" role="status"><span className="loading-spinner" />Loading your profile…</section> : error && !editing ? <section className="profile-state profile-state-error" role="alert">{error}<button className="secondary-action" type="button" onClick={() => window.location.reload()}>Try again</button></section> : editing ? (
            <form className="profile-edit-card" onSubmit={saveProfile}>
              <div className="profile-form-identity"><span className="profile-avatar" aria-hidden="true">{workerName.charAt(0).toUpperCase()}</span><div><strong>{workerName}</strong><p>{profile.email || 'Your name and contact details come from your account.'}</p></div><span className="read-only-badge">Account details</span></div>
              {error && <p className="profile-alert profile-alert-error" role="alert">{error}</p>}
              {notice && <p className="profile-alert profile-alert-success" role="status">{notice}</p>}
              <div className="profile-form-grid">
                <label className="profile-field">Location <input value={profile.location || ''} readOnly aria-describedby="location-note" /></label>
                <label className="profile-field">Experience (years) <input type="number" min="0" step="1" value={profile.experienceYears} onChange={(event) => setProfile({ ...profile, experienceYears: event.target.value })} /></label>
                <p id="location-note" className="profile-field-note">Location is managed through your account details.</p>
                <label className="profile-field">Education <input maxLength="255" value={profile.education} onChange={(event) => setProfile({ ...profile, education: event.target.value })} /></label>
                <label className="profile-field">Availability <input maxLength="100" value={profile.availability} onChange={(event) => setProfile({ ...profile, availability: event.target.value })} placeholder="e.g. Available for new projects" /></label>
                <label className="profile-field profile-field-wide">Skills <textarea value={profile.skills} onChange={(event) => setProfile({ ...profile, skills: event.target.value })} rows="3" placeholder="Separate skills with commas" /></label>
                <label className="profile-field profile-field-wide">About you <textarea maxLength="5000" value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} rows="6" placeholder="Describe your experience and the work you do" /><small>{profile.bio.length}/5000 characters</small></label>
              </div>
              <div className="profile-form-actions"><button type="button" className="secondary-action" disabled={saving} onClick={() => navigate('/worker/profile')}>Cancel</button>{notice && <button type="button" className="secondary-action" disabled={saving} onClick={() => navigate('/worker/profile')}>View Profile</button>}<button type="submit" className="primary-action" disabled={saving}>{saving ? 'Saving changes…' : 'Save Changes'}</button></div>
            </form>
          ) : (
            <div className="profile-overview-grid">
              <section className="profile-identity-card"><div className="profile-identity-top"><span className="profile-avatar" aria-hidden="true">{workerName.charAt(0).toUpperCase()}</span><div><p className="eyebrow">WORKER</p><h2>{workerName}</h2><p>{profile.location || 'Location not provided'}</p></div></div><div className="profile-contact-list">{profile.email && <p><span>Email</span><strong>{profile.email}</strong></p>}{profile.phone && <p><span>Phone</span><strong>{profile.phone}</strong></p>}</div></section>
              <section className="profile-completion-card"><div className="profile-section-heading"><div><p className="eyebrow">PROFILE COMPLETION</p><h2>{completion}% complete</h2></div><strong>{completion}%</strong></div><div className="completion-track" role="progressbar" aria-label="Profile completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow={completion}><span style={{ width: `${completion}%` }} /></div><p>{completion === 100 ? 'Your profile has the details needed to support relevant recommendations.' : 'Complete the available details to improve your recommendations.'}</p></section>
              <section className="profile-details-card"><div className="profile-section-heading"><div><p className="eyebrow">PROFESSIONAL DETAILS</p><h2>Experience and availability</h2></div></div><dl className="profile-detail-list"><div><dt>Experience</dt><dd>{profile.experienceYears === '' ? 'Not provided' : `${profile.experienceYears} ${Number(profile.experienceYears) === 1 ? 'year' : 'years'}`}</dd></div><div><dt>Education</dt><dd>{profile.education || 'Not provided'}</dd></div><div><dt>Availability</dt><dd>{profile.availability || 'Not provided'}</dd></div></dl></section>
              <section className="profile-details-card"><div className="profile-section-heading"><div><p className="eyebrow">SKILLS</p><h2>Your skills</h2></div></div>{skills.length ? <div className="tag-list profile-skill-list">{skills.map((skill, index) => <span className="tag" key={`${skill}-${index}`}>{skill}</span>)}</div> : <p className="profile-empty-copy">Add your skills so clients can see what you do.</p>}</section>
              <section className="profile-details-card profile-bio-card"><div className="profile-section-heading"><div><p className="eyebrow">ABOUT</p><h2>Professional bio</h2></div></div><p className="profile-bio-copy">{profile.bio || 'Add a short introduction about your experience and the work you can do.'}</p></section>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default WorkerProfile
