import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { hasRequiredProfileFields } from '../utils/profileValidation'
import './Login.css'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isSignUp) {
      const { user, error: signUpError } = await authService.signUp(email, password, displayName)
      if (signUpError) {
        setError(signUpError)
        setLoading(false)
      } else if (user) {
        // Check if user has required profile fields
        const hasFields = await hasRequiredProfileFields(user.uid)
        if (!hasFields) {
          navigate('/onboarding?mode=onboarding')
        } else {
          navigate('/dashboard')
        }
      }
    } else {
      const { user, error: signInError } = await authService.signIn(email, password)
      if (signInError) {
        setError(signInError)
        setLoading(false)
      } else if (user) {
        // Check if user has required profile fields
        const hasFields = await hasRequiredProfileFields(user.uid)
        if (!hasFields) {
          navigate('/onboarding?mode=onboarding')
        } else {
          navigate('/dashboard')
        }
      }
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    const { user, error: googleError } = await authService.signInWithGoogle()
    if (googleError) {
      setError(googleError)
      setLoading(false)
    } else if (user) {
      // Check if user has required profile fields
      const hasFields = await hasRequiredProfileFields(user.uid)
      if (!hasFields) {
        navigate('/onboarding?mode=onboarding')
      } else {
        navigate('/dashboard')
      }
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <Link to="/" className="logo">
          <img src="/logo.svg" alt="Boatra.com" className="logo-svg" />
        </Link>

        <div className="login-card">
          <h1>{isSignUp ? 'Vytvořit účet' : 'Přihlásit se'}</h1>
          <p className="subtitle">
            {isSignUp 
              ? 'Zaregistrujte se a začněte organizovat plavby' 
              : 'Přihlaste se do svého účtu'}
          </p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form id="login-form" onSubmit={handleSubmit} className="login-form">
            {isSignUp && (
              <div className="form-group">
                <label>Jméno</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Vaše jméno"
                />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
                required
              />
            </div>

            <div className="form-group">
              <label>Heslo</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </form>

          <div style={{ marginTop: 'var(--space-md)' }}>
            <button 
              type="submit" 
              form="login-form"
              className="btn btn-primary btn-block" 
              disabled={loading}
            >
              {loading ? 'Načítání...' : (isSignUp ? 'Vytvořit účet' : 'Přihlásit se')}
            </button>
            <div style={{ textAlign: 'center', margin: 'var(--space-xs) 0', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
              nebo
            </div>
            <button 
              type="button" 
              className="btn btn-google btn-block" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Pokračovat s Google
            </button>
          </div>

          <div className="login-footer">
            {!isSignUp && (
              <p style={{ textAlign: 'center', margin: 0, color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                Nemáte účet?{' '}
                <Link to="/register" className="link-button">
                  Zaregistrujte se
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

