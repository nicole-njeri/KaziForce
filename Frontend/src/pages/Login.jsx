import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData({
      ...formData,
      [name]: value
    })

    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    // Validate email
    if (!formData.email.trim()) {
      setError('Please enter your email address.')
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    // Validate password
    if (!formData.password) {
      setError('Please enter your password.')
      return
    }

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Login failed.')
        return
      }

      // Store authentication information
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      setSuccess('Login successful!')

      // Redirect user according to their role
      setTimeout(() => {
        if (data.user.role === 'Worker') {
          navigate('/worker/dashboard')
        } else if (data.user.role === 'Client') {
          navigate('/client/dashboard')
        } else if (data.user.role === 'Administrator') {
          navigate('/admin/dashboard')
        } else {
          setError('Invalid user role.')
        }
      }, 500)

    } catch (error) {
      console.error('Login error:', error)

      setError(
        'Unable to connect to the server. Please make sure the backend is running.'
      )
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-brand">
          <h1>KaziForce</h1>

          <p>
            Connecting skilled workers with opportunities
          </p>
        </div>

        <div className="login-card">

          <h2>Welcome Back</h2>

          <p className="login-subtitle">
            Sign in to your KaziForce account
          </p>

          {error && (
            <div className="message error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="message success-message">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="form-group">

              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />

            </div>

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />

            </div>

            <div className="login-options">

              <label className="remember-me">

                <input type="checkbox" />

                <span>
                  Remember me
                </span>

              </label>

              <button
                type="button"
                className="forgot-password"
              >
                Forgot password?
              </button>

            </div>

            <button
              type="submit"
              className="login-button"
            >
              Sign In →
            </button>

          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <button className="social-login">
            Continue with Google
          </button>

          <p className="register-link">
            Don't have an account?{' '}

            <span>
              Register here
            </span>
          </p>

        </div>
      </div>
    </div>
  )
}

export default Login