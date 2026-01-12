import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { auth } from '../config/firebase'
import { authService } from '../services/authService'
import { userService } from '../services/userService'
import { participantService } from '../services/participantService'
import { tripService } from '../services/tripService'
import { validateProfileData } from '../utils/profileValidation'
import './Onboarding.css'

export default function Onboarding() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuthState()
  
  const mode = searchParams.get('mode') || 'register' // register, join-trip, onboarding
  const tripId = searchParams.get('tripId') || null
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: ''
  })
  const [isGoogleAuth, setIsGoogleAuth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [tripData, setTripData] = useState(null)
  const [tripPassword, setTripPassword] = useState('')
  const [tripCode, setTripCode] = useState(tripId || '')
  
  // Load trip data if in join-trip mode
  useEffect(() => {
    if (mode === 'join-trip' && tripId) {
      loadTripData()
      setTripCode(tripId) // ID is case-sensitive, don't convert to uppercase
    }
  }, [mode, tripId])
  
  const handleSignOut = async () => {
    await authService.signOut()
    navigate('/')
  }
  
  // Pre-fill email if user is logged in
  useEffect(() => {
    if (authLoading) return
    
    if (user && mode === 'onboarding') {
      loadUserProfile()
    } else if (user && user.email) {
      setFormData(prev => ({ ...prev, email: user.email || '' }))
    }
  }, [user, mode, authLoading])
  
  // Update isGoogleAuth when user becomes available after Google sign in
  useEffect(() => {
    if (user) {
      // Check if user is signed in via Google
      const hasGoogleProvider = user.providerData && user.providerData.some(
        provider => provider.providerId === 'google.com'
      )
      if (hasGoogleProvider) {
        setIsGoogleAuth(true)
        if (!formData.email && user.email) {
          setFormData(prev => ({
            ...prev,
            email: user.email || '',
            name: user.displayName || prev.name,
            phone: user.phoneNumber || prev.phone
          }))
        }
      }
    }
  }, [user])
  
  const loadTripData = async () => {
    try {
      const { data } = await tripService.getTrip(tripId)
      if (data) {
        setTripData(data)
      }
    } catch (error) {
      console.error('Error loading trip:', error)
    }
  }
  
  const loadUserProfile = async () => {
    if (!user) return
    try {
      const { data } = await userService.getProfile(user.uid)
      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || user.email || ''
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          email: user.email || ''
        }))
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }
  
  const handleGoogleSignIn = async () => {
    setErrors({})
    setGoogleLoading(true)
    
    try {
      const { user: googleUser, userData, error: googleError } = await authService.signInWithGoogle()
      
      if (googleError) {
        setErrors({ general: googleError })
        setGoogleLoading(false)
        return
      }
      
      if (googleUser && userData) {
        // Pre-fill form with Google data
        setFormData(prev => ({
          ...prev,
          email: userData.email || '',
          name: userData.displayName || '',
          phone: userData.phoneNumber || ''
        }))
        setIsGoogleAuth(true)
      }
    } catch (error) {
      setErrors({ general: error.message || 'Chyba při přihlášení přes Google' })
    } finally {
      setGoogleLoading(false)
    }
  }
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }
  
  const validateForm = () => {
    const newErrors = {}
    
    // If not logged in, validate auth fields
    if (!user) {
      if (!isGoogleAuth) {
        if (!formData.email.trim()) {
          newErrors.email = 'Email je povinný'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Email není ve správném formátu'
        }
        
        if (!formData.password) {
          newErrors.password = 'Heslo je povinné'
        } else if (formData.password.length < 6) {
          newErrors.password = 'Heslo musí obsahovat alespoň 6 znaků'
        }
        
        if (formData.password !== formData.passwordConfirm) {
          newErrors.passwordConfirm = 'Hesla se neshodují'
        }
      }
    }
    
    // Validate profile fields
    const profileValidation = validateProfileData({
      name: formData.name,
      phone: formData.phone,
      email: formData.email
    })
    
    Object.assign(newErrors, profileValidation.errors)
    
    // For join-trip mode, validate trip code and password
    if (mode === 'join-trip') {
      if (!tripCode.trim() && !tripId) {
        newErrors.tripCode = 'ID plavby je povinné'
      }
      if (!tripPassword.trim()) {
        newErrors.tripPassword = 'Heslo plavby je povinné'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setErrors({})
    
    try {
      let currentUser = user
      
      // Register user if not logged in
      if (!currentUser) {
        if (isGoogleAuth) {
          // User already signed in with Google - get current user from auth
          currentUser = auth.currentUser
          if (!currentUser) {
            setErrors({ general: 'Uživatel není přihlášen' })
            setLoading(false)
            return
          }
        } else {
          // Register with email and password
          const { user: newUser, error: signUpError } = await authService.signUp(
            formData.email,
            formData.password,
            formData.name
          )
          
          if (signUpError) {
            setErrors({ general: signUpError })
            setLoading(false)
            return
          }
          
          currentUser = newUser
        }
      }
      
      // Save profile
      const profileData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim()
      }
      
      const { error: profileError } = await userService.saveProfile(currentUser.uid, profileData)
      
      if (profileError) {
        setErrors({ general: 'Chyba při ukládání profilu: ' + profileError })
        setLoading(false)
        return
      }
      
      // Handle join-trip mode
      if (mode === 'join-trip') {
        // Validate trip code (ID is case-sensitive, don't convert to uppercase)
        const codeToUse = tripCode.trim() || tripId?.trim()
        if (!codeToUse) {
          setErrors({ tripCode: 'ID plavby je povinné' })
          setLoading(false)
          return
        }
        
        // Verify trip password
        const { data: trip, error: tripError } = await tripService.getTripByCodeAndPassword(
          codeToUse,
          tripPassword.trim()
        )
        
        if (tripError || !trip) {
          console.error('[Onboarding] Chyba při hledání plavby:', {
            tripCode: codeToUse,
            passwordLength: tripPassword.trim().length,
            error: tripError,
            tripFound: !!trip,
            mode: 'join-trip'
          })
          setErrors({ tripPassword: 'Nesprávné heslo plavby' })
          setLoading(false)
          return
        }
        
        // Add user as participant
        const { id, error: addError } = await participantService.addParticipant(
          trip.id,
          currentUser.uid,
          'participant',
          null
        )
        
        if (addError) {
          console.error('[Onboarding] Chyba při přidávání účastníka:', {
            tripId: trip.id,
            userId: currentUser.uid,
            role: 'participant',
            error: addError,
            participantId: id,
            mode: 'join-trip'
          })
          setErrors({ general: addError })
          setLoading(false)
          return
        }
        
        // Redirect to trip page
        navigate(`/trip/${trip.id}/participant`)
        return
      }
      
      // Handle other modes
      if (mode === 'onboarding') {
        // Redirect to original page or dashboard
        const returnUrl = sessionStorage.getItem('onboardingReturnUrl') || '/dashboard'
        sessionStorage.removeItem('onboardingReturnUrl')
        navigate(returnUrl)
      } else {
        // Register mode - go to dashboard
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('[Onboarding] Neočekávaná chyba:', {
        error,
        message: error.message,
        stack: error.stack,
        mode,
        tripId,
        tripCode: mode === 'join-trip' ? tripCode : undefined,
        passwordLength: mode === 'join-trip' ? tripPassword.trim().length : undefined,
        userId: currentUser?.uid
      })
      setErrors({ general: error.message || 'Došlo k chybě' })
      setLoading(false)
    }
  }
  
  // Determine page title and description based on mode
  const getPageInfo = () => {
    switch (mode) {
      case 'join-trip':
        return {
          title: 'Přidat se k plavbě',
          subtitle: tripData 
            ? `Připojte se k plavbě "${tripData.name || 'Bez názvu'}"`
            : 'Vyplňte údaje pro připojení k plavbě',
          note: 'Přidáním se k plavbě dojde k registraci. Po plavbě je možné účet zrušit.'
        }
      case 'onboarding':
        return {
          title: 'Doplnit údaje',
          subtitle: 'Pro pokračování prosím doplňte své kontaktní údaje',
          note: null
        }
      default:
        return {
          title: 'Vytvořit účet',
          subtitle: 'Zaregistrujte se a začněte organizovat plavby',
          note: null
        }
    }
  }
  
  const pageInfo = getPageInfo()
  // Show auth section if user is not logged in OR if they're logged in via Google (to show success state)
  const showAuthSection = !user || (user && isGoogleAuth)
  
  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <Link to="/" className="logo">
          <img src="/logo.svg" alt="Boatra.com" className="logo-svg" />
        </Link>
        
        <div className="onboarding-card">
          <h1>{pageInfo.title}</h1>
          <p className="subtitle">{pageInfo.subtitle}</p>
          
          {errors.general && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {errors.general}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="onboarding-form" autoComplete="off">
            <div className="form-sections-container">
              {/* Account Section */}
              {showAuthSection && (
                <div className="form-section">
                <h3 className="form-section-title">
                  <i className="fas fa-user-circle"></i>
                  Účet
                </h3>
                
                {!isGoogleAuth && (
                  <div className="form-section-note">
                    <p>Již máte účet? <Link to="/login" className="link-inline">Přihlaste se</Link></p>
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="vas@email.cz"
                    disabled={isGoogleAuth || !!user}
                    required={!isGoogleAuth && !user}
                  />
                  {errors.email && (
                    <p className="form-error">{errors.email}</p>
                  )}
                  {isGoogleAuth && (
                    <p className="form-help" style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '4px' }}>
                      <i className="fas fa-lock" style={{ marginRight: '4px' }}></i>
                      Email je propojen s vaším Google účtem a nelze ho změnit
                    </p>
                  )}
                </div>
                
                {!isGoogleAuth && (
                  <>
                    <div className="password-fields-group">
                      <div className="form-group">
                        <label className="form-label">Heslo *</label>
                        <input
                          type="password"
                          className={`form-input ${errors.password ? 'error' : ''}`}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        {errors.password && (
                          <p className="form-error">{errors.password}</p>
                        )}
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Potvrzení hesla *</label>
                        <input
                          type="password"
                          className={`form-input ${errors.passwordConfirm ? 'error' : ''}`}
                          value={formData.passwordConfirm}
                          onChange={(e) => handleInputChange('passwordConfirm', e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        {errors.passwordConfirm && (
                          <p className="form-error">{errors.passwordConfirm}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                {!isGoogleAuth && (
                  <>
                    <div className="divider">
                      <span>nebo</span>
                    </div>
                    
                    <button
                      type="button"
                      className="btn btn-google btn-block"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loading}
                    >
                      {googleLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Přihlašování...
                        </>
                      ) : (
                        <>
                          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Pokračovat s Google
                        </>
                      )}
                    </button>
                  </>
                )}
                
                {isGoogleAuth && (
                  <div className="google-success">
                    <i className="fas fa-check-circle"></i>
                    Úspěšně přihlášeno přes Google
                  </div>
                )}
              </div>
            )}
            
            {/* Contact Details Section */}
            <div className="form-section">
              <h3 className="form-section-title">
                <i className="fas fa-user"></i>
                Kontaktní údaje
              </h3>
              
              <div className="form-group">
                <label className="form-label">Jméno a příjmení *</label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="např. Jan Novák"
                  required
                  minLength={2}
                />
                {errors.name && (
                  <p className="form-error">{errors.name}</p>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Telefon *</label>
                <input
                  type="tel"
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="např. +420 123 456 789"
                  required
                />
                {errors.phone && (
                  <p className="form-error">{errors.phone}</p>
                )}
              </div>
              
              {!isGoogleAuth && !user && (
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="vas@email.cz"
                    required
                  />
                  {errors.email && (
                    <p className="form-error">{errors.email}</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Trip Details Section (only for join-trip mode) */}
            {mode === 'join-trip' && (
              <div className="form-section trip-password-section">
                <h3 className="form-section-title">
                  <i className="fas fa-ship"></i>
                  Údaje o plavbě
                </h3>
                
                <div className="form-group">
                  <label className="form-label">ID plavby *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.tripCode ? 'error' : ''}`}
                    value={tripCode}
                    onChange={(e) => {
                      setTripCode(e.target.value) // ID is case-sensitive, don't convert to uppercase
                      if (errors.tripCode) {
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.tripCode
                          return newErrors
                        })
                      }
                    }}
                    placeholder="např. ABC123"
                    disabled={!!tripId}
                    required
                    maxLength={50}
                    style={{ fontFamily: 'monospace' }}
                    autoComplete="off"
                  />
                  {errors.tripCode && (
                    <p className="form-error">{errors.tripCode}</p>
                  )}
                  <p className="form-help">ID plavby vám poskytl organizátor.</p>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Heslo plavby *</label>
                  <input
                    type="password"
                    className={`form-input ${errors.tripPassword ? 'error' : ''}`}
                    value={tripPassword}
                    onChange={(e) => {
                      setTripPassword(e.target.value)
                      if (errors.tripPassword) {
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.tripPassword
                          return newErrors
                        })
                      }
                    }}
                    placeholder="Zadejte heslo plavby"
                    required
                    autoComplete="new-password"
                  />
                  {errors.tripPassword && (
                    <p className="form-error">{errors.tripPassword}</p>
                  )}
                  <p className="form-help">Heslo vám poskytl organizátor plavby.</p>
                </div>
              </div>
            )}
            </div>
            
            <div className="form-actions">
              {mode === 'onboarding' && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleSignOut}
                >
                  <i className="fas fa-sign-out-alt"></i>
                  Odhlásit se
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Zpracovávání...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    Pokračovat
                  </>
                )}
              </button>
            </div>
          </form>
          
          {pageInfo.note && (
            <div className="info-note-subtle">
              {pageInfo.note}
            </div>
          )}
          
          {mode !== 'onboarding' && (
            <div className="onboarding-footer">
              <p>
                Již máte účet?{' '}
                <Link to="/login" className="link-button">
                  Přihlaste se
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

