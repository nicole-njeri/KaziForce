import { useState } from 'react'
import './Registration.css'

function Registration() {
  const [selectedRole, setSelectedRole] = useState('Worker')

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })

    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!formData.fullName.trim()) {
      setError('Please enter your full name.')
      return
    }

    if (!formData.email.trim()) {
      setError('Please enter your email address.')
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!formData.phone.trim()) {
      setError('Please enter your phone number.')
      return
    }

    if (!formData.location.trim()) {
      setError('Please enter your location.')
      return
    }

    if (!formData.password) {
      setError('Please enter a password.')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!formData.termsAccepted) {
      setError('Please accept the terms and conditions.')
      return
    }

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            location: formData.location,
            password: formData.password,
            role: selectedRole
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Registration failed.')
        return
      }

      setSuccess('Account created successfully!')

      console.log('Registered user:', data.user)

      setFormData({
        fullName: '',
        email: '',
        phone: '',
        location: '',
        password: '',
        confirmPassword: '',
        termsAccepted: false
      })
    } catch (error) {
      console.error('Registration error:', error)

      setError(
        'Unable to connect to the server. Please make sure the backend is running.'
      )
    }
  }

  return (
    <div className="registration-page">

      <div className="registration-left">
        <div className="brand">
          <h1>KaziForce</h1>
          <p>Connect. Work. Grow.</p>
        </div>

        <div className="left-content">
          <h2>Build your future with KaziForce</h2>

          <p>
            Connect with opportunities, showcase your skills, and build
            meaningful professional relationships.
          </p>

          <div className="benefits">
            <div className="benefit">
              <span>✓</span>
              <div>
                <h3>Find Opportunities</h3>
                <p>Discover gigs that match your skills.</p>
              </div>
            </div>

            <div className="benefit">
              <span>✓</span>
              <div>
                <h3>Showcase Your Skills</h3>
                <p>Build a profile that represents your experience.</p>
              </div>
            </div>

            <div className="benefit">
              <span>✓</span>
              <div>
                <h3>Grow Your Network</h3>
                <p>Connect with workers and clients.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="registration-right">
        <div className="registration-card">

          <div className="form-header">
            <h2>Create your account</h2>
            <p>Join KaziForce today</p>
          </div>

          {error && (
            <div className="form-message error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="form-message success-message">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="role-section">
              <label>Register as</label>

              <div className="role-options">

                <button
                  type="button"
                  className={`role-card ${
                    selectedRole === 'Worker' ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedRole('Worker')}
                >
                  <span className="role-icon">👤</span>
                  <strong>Worker</strong>
                  <small>Find gigs and opportunities</small>
                </button>

                <button
                  type="button"
                  className={`role-card ${
                    selectedRole === 'Client' ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedRole('Client')}
                >
                  <span className="role-icon">💼</span>
                  <strong>Client</strong>
                  <small>Post gigs and find workers</small>
                </button>

                <button
                  type="button"
                  className={`role-card ${
                    selectedRole === 'Administrator' ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedRole('Administrator')}
                >
                  <span className="role-icon">⚙️</span>
                  <strong>Administrator</strong>
                  <small>Manage the platform</small>
                </button>

              </div>
            </div>

            <div className="form-row">

              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

            </div>

            <div className="form-row">

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">Location</label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g. Nairobi"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

            </div>

            <div className="form-row">

              <div className="form-group">
                <label htmlFor="password">Password</label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirm Password
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

            </div>

            <div className="terms-section">

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                />

                <span>
                  I agree to the KaziForce terms and conditions.
                </span>
              </label>

            </div>

            <button
              className="create-account"
              type="submit"
            >
              Create Account →
            </button>

          </form>

          <div className="social-section">
            <p>Or continue with</p>

            <div className="social-buttons">
              <button type="button">Google</button>
              <button type="button">Microsoft</button>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}

export default Registration