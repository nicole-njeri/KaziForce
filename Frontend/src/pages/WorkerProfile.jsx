import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { WorkerLayout } from '../components/WorkerLayout'
import { apiHeaders, readAccount, splitTags } from '../components/workerApi'

const emptyProfile = { bio: '', experienceYears: '', education: '', availability: '', skills: '' }
function WorkerProfile({ editing = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const accountUser = useMemo(() => readAccount(), [])
  const [profile, setProfile] = useState({ ...emptyProfile, fullName: '', email: '', phone: '', location: '' })
  const [rating, setRating] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    const loadProfile = async () => {
      setLoading(true); setError('')
      try {
        const response = await fetch('http://localhost:5000/api/profiles/mine', { headers: apiHeaders() })
        let saved = {}
        if (response.status !== 404) {
          const data = await response.json()
          if (!response.ok) throw new Error(data.message || 'Unable to load your profile.')
          saved = data.profile || {}
        }
        if (live) setProfile({ bio: saved.bio || '', experienceYears: saved.experience_years ?? '', education: saved.education || '', availability: saved.availability || '', skills: saved.skills || '', fullName: saved.full_name || accountUser.full_name || accountUser.fullName || '', email: saved.email || accountUser.email || '', phone: saved.phone || accountUser.phone || '', location: saved.location || accountUser.location || '' })
        if (live && !editing && response.ok) {
          try {
            const matchResponse = await fetch('http://localhost:5000/api/matching/gigs', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ topN: 1 }) })
            if (matchResponse.ok) { const matchData = await matchResponse.json(); const reputation = Number(matchData.worker?.reputation || 0); if (reputation > 0 && live) setRating(reputation) }
          } catch { /* Rating is optional; the profile data remains available without matching. */ }
        }
      } catch (loadError) { if (live) setError(loadError.message || 'Unable to load your profile.') }
      finally { if (live) setLoading(false) }
    }
    loadProfile()
    return () => { live = false }
  }, [accountUser, editing])
  const notice = !editing && location.state?.saved ? 'Your profile changes have been saved.' : ''

  const skills = splitTags(profile.skills)
  const completionFields = [profile.skills, profile.bio, profile.education, profile.availability, profile.experienceYears !== '' && profile.experienceYears !== null && profile.experienceYears !== undefined]
  const completion = Math.round(completionFields.filter(Boolean).length * 100 / completionFields.length)
  const workerName = profile.fullName || 'Worker'
  const saveProfile = async (event) => {
    event.preventDefault(); setError('')
    const years = profile.experienceYears
    if (years !== '' && (!Number.isInteger(Number(years)) || Number(years) < 0)) { setError('Experience must be a non-negative whole number.'); return }
    setSaving(true)
    try {
      const response = await fetch('http://localhost:5000/api/profiles/mine', { method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ bio: profile.bio, experienceYears: years === '' ? null : Number(years), education: profile.education, availability: profile.availability, skills: profile.skills }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save your profile.')
      navigate('/worker/profile', { replace: true, state: { saved: true } })
    } catch (saveError) { setError(saveError.message || 'Unable to save your profile.') }
    finally { setSaving(false) }
  }

  return <WorkerLayout><div className="wf-heading"><div><p className="wf-eyebrow">MY PROFILE</p><h1>{editing ? 'Edit profile' : 'Profile overview'}</h1><p>{editing ? 'Keep your professional information up to date so clients can understand your experience.' : 'Review the professional information clients use to understand your experience.'}</p></div>{!editing && <Link className="wf-primary" to="/worker/profile/edit">Edit profile</Link>}</div>
    {notice && !editing && <p className="wf-notice" role="status" style={{ marginBottom:16 }}>{notice}</p>}
    {loading ? <div className="wf-state" role="status"><span className="wf-spinner"/><p>Loading your profile…</p></div> : error ? <div className="wf-error" role="alert">{error}<p style={{marginTop:9}}><button type="button" className="wf-secondary" onClick={() => window.location.reload()}>Try again</button></p></div> : editing ? <form className="wf-card wf-profile-card wf-edit-form" onSubmit={saveProfile}>
      {error && <p className="wf-error" role="alert">{error}</p>}
      <label className="wf-field">Full name <input value={workerName} readOnly /></label><label className="wf-field">Location <input value={profile.location || 'Not provided'} readOnly /></label>
      <label className="wf-field">Experience (years) <input type="number" min="0" step="1" value={profile.experienceYears} onChange={(event) => setProfile({ ...profile, experienceYears: event.target.value })} /></label>
      <label className="wf-field">Availability <input maxLength="100" value={profile.availability} onChange={(event) => setProfile({ ...profile, availability: event.target.value })} placeholder="e.g. Available for new projects" /></label>
      <label className="wf-field wide">Education <input maxLength="255" value={profile.education} onChange={(event) => setProfile({ ...profile, education: event.target.value })} placeholder="Education or qualification" /></label>
      <label className="wf-field wide">Skills <textarea value={profile.skills} onChange={(event) => setProfile({ ...profile, skills: event.target.value })} rows="3" placeholder="Separate skills with commas" /></label>
      <label className="wf-field wide">About you <textarea maxLength="5000" value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} rows="5" placeholder="Describe your experience and the work you do"/><small>{profile.bio.length}/5000 characters</small></label>
      <div className="wf-form-actions"><button type="button" className="wf-secondary" disabled={saving} onClick={() => navigate('/worker/profile')}>Cancel</button><button type="submit" className="wf-primary" disabled={saving}>{saving ? 'Saving changes…' : 'Save changes'}</button></div>
    </form> : <div className="wf-profile-grid">
      <section className="wf-card wf-profile-card"><div className="wf-profile-identity"><span className="wf-profile-avatar" aria-hidden="true">{workerName.charAt(0).toUpperCase()}</span><div><p className="wf-eyebrow">WORKER</p><h2>{workerName}</h2><p>{profile.location || 'Location not provided'}</p></div></div><div className="wf-completion" role="progressbar" aria-label="Profile completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow={completion}><span style={{width:`${completion}%`}}/></div><div className="wf-completion-label"><span>Profile completion</span><strong>{completion}%</strong></div><div className="wf-profile-details"><div><span>Email</span><strong>{profile.email || 'Not provided'}</strong></div><div><span>Phone</span><strong>{profile.phone || 'Not provided'}</strong></div><div><span>Availability</span><strong>{profile.availability || 'Not provided'}</strong></div><div><span>Experience</span><strong>{profile.experienceYears === '' ? 'Not provided' : `${profile.experienceYears} years`}</strong></div><div><span>Education</span><strong>{profile.education || 'Not provided'}</strong></div>{rating > 0 && <div><span>Client rating</span><strong>{rating.toFixed(1)} / 5</strong></div>}</div></section>
      <div className="wf-mini-list"><section className="wf-card wf-profile-card"><h2 className="wf-card-title">Professional skills</h2>{skills.length ? <div className="wf-tags">{skills.map((skill) => <span className="wf-tag" key={skill}>{skill}</span>)}</div> : <p className="wf-profile-bio">No skills have been added yet.</p>}</section><section className="wf-card wf-profile-card"><h2 className="wf-card-title">About me</h2><p className="wf-profile-bio">{profile.bio || 'No professional bio has been added yet.'}</p></section></div>
    </div>}
  </WorkerLayout>
}
export default WorkerProfile
