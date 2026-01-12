import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { userService } from '../services/userService'
import { clearUserProfilesCache } from '../utils/userDisplay'
import './Profile.css'

export default function Profile() {
  const { user } = useAuthState()
  const [contactDetails, setContactDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [originalName, setOriginalName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [nameError, setNameError] = useState('')
  const [isGoogleUser, setIsGoogleUser] = useState(false)

  useEffect(() => {
    if (user) {
      // Check if user is signed in via Google
      const hasGoogleProvider = user.providerData && user.providerData.some(
        provider => provider.providerId === 'google.com'
      )
      setIsGoogleUser(hasGoogleProvider)
      loadContactDetails()
    }
  }, [user])

  const loadContactDetails = async () => {
    setLoading(true)
    const { data, error } = await userService.getProfile(user.uid)
    if (!error && data) {
      const name = data.name || ''
      setContactDetails({
        name: name,
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || ''
      })
      setOriginalName(name)
    } else {
      // Initialize with user's email if available
      const name = user?.displayName || ''
      setContactDetails({
        name: name,
        email: user?.email || '',
        phone: '',
        address: ''
      })
      setOriginalName(name)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setNameError('')
    
    // Validate required fields
    const trimmedName = contactDetails.name.trim()
    const trimmedEmail = contactDetails.email.trim()
    const trimmedPhone = contactDetails.phone.trim()
    
    if (trimmedName.length < 2) {
      setNameError('Jméno a příjmení musí obsahovat alespoň 2 znaky')
      return
    }
    
    if (trimmedEmail.length === 0) {
      alert('Email je povinný')
      return
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      alert('Email není ve správném formátu')
      return
    }
    
    if (trimmedPhone.length === 0) {
      alert('Telefon je povinný')
      return
    }
    
    // Prevent deleting name if it was previously set
    if (originalName && originalName.trim().length > 0 && trimmedName.length === 0) {
      setNameError('Jméno a příjmení nelze smazat. Musíte zadat nové jméno.')
      return
    }
    
    setSaving(true)
    setSaveSuccess(false)
    
    const { error } = await userService.saveProfile(user.uid, {
      ...contactDetails,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone
    })
    
    if (error) {
      alert('Chyba při ukládání: ' + error)
    } else {
      setOriginalName(trimmedName)
      // Clear user profiles cache so changes propagate to all trips
      clearUserProfilesCache()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
    
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--gray-500)' }}>
          Načítání...
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Profile Header */}
      <div className="trip-header" style={{ padding: 'var(--space-xl) 0' }}>
        <div className="container">
          <div className="trip-header-content">
            <div className="breadcrumb">
              <Link to="/dashboard"><i className="fas fa-home"></i></Link>
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <span>Můj profil</span>
            </div>
            
            <div className="trip-title-row" style={{ marginTop: 'var(--space-lg)' }}>
              <div>
                <h1 className="trip-title" style={{ fontSize: '2rem' }}>Můj profil</h1>
                <p style={{ color: 'var(--gray-400)', marginTop: 'var(--space-sm)' }}>
                  Spravujte své kontaktní údaje, které budou zobrazeny ostatním účastníkům plaveb
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <main className="trip-content">
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="card animate-in">
            <div className="card-header">
              <h4 className="card-title">
                <i className="fas fa-user" style={{ color: 'var(--turquoise)' }}></i>
                Kontaktní údaje
              </h4>
            </div>
            
            {saveSuccess && (
              <div style={{ 
                margin: 'var(--space-md) var(--space-xl)', 
                padding: 'var(--space-md)', 
                background: 'var(--success-light)', 
                color: 'var(--success)', 
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)'
              }}>
                <i className="fas fa-check-circle"></i>
                Kontaktní údaje byly úspěšně uloženy.
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ padding: 'var(--space-xl)' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Jméno a příjmení *</label>
                  <input
                    type="text"
                    className={`form-input ${nameError ? 'error' : ''}`}
                    value={contactDetails.name}
                    onChange={(e) => {
                      setContactDetails(prev => ({ ...prev, name: e.target.value }))
                      setNameError('')
                    }}
                    placeholder="např. Jan Novák"
                    required
                    minLength={2}
                  />
                  {nameError && (
                    <p className="form-error" style={{ color: 'var(--danger)', marginTop: 'var(--space-xs)', fontSize: '0.875rem' }}>
                      {nameError}
                    </p>
                  )}
                  <p className="form-help">Zobrazí se ostatním účastníkům plaveb.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={contactDetails.email}
                    onChange={(e) => setContactDetails(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="např. jan@example.com"
                    required
                    disabled={isGoogleUser}
                  />
                  {isGoogleUser ? (
                    <p className="form-help" style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: 'var(--space-xs)' }}>
                      <i className="fas fa-lock" style={{ marginRight: '4px' }}></i>
                      Email je propojen s vaším Google účtem a nelze ho změnit
                    </p>
                  ) : (
                    <p className="form-help">Email pro kontaktování</p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon *</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={contactDetails.phone}
                    onChange={(e) => setContactDetails(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="např. +420 123 456 789"
                    required
                  />
                  <p className="form-help">Telefonní číslo pro kontaktování</p>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Adresa (volitelně)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={contactDetails.address}
                    onChange={(e) => setContactDetails(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Adresa pro korespondenci..."
                  />
                  <p className="form-help">Adresa pro korespondenci nebo fakturaci</p>
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                marginTop: 'var(--space-xl)', 
                paddingTop: 'var(--space-lg)', 
                borderTop: '1px solid var(--gray-100)' 
              }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <i className="fas fa-save"></i>
                  {saving ? 'Ukládání...' : 'Uložit změny'}
                </button>
              </div>
            </form>
          </div>

          <div className="card animate-in delay-1" style={{ marginTop: 'var(--space-lg)' }}>
            <div className="card-header">
              <h4 className="card-title">
                <i className="fas fa-info-circle" style={{ color: 'var(--turquoise)' }}></i>
                Informace
              </h4>
            </div>
            <div style={{ padding: 'var(--space-xl)' }}>
              <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                Vaše kontaktní údaje budou zobrazeny:
              </p>
              <ul style={{ color: 'var(--gray-600)', lineHeight: 1.8, paddingLeft: 'var(--space-lg)' }}>
                <li>Účastníkům plaveb, které organizujete</li>
                <li>Kapitánům lodí, pokud jste kapitánem</li>
                <li>Ostatním účastníkům, pokud jste kapitánem jejich lodě</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

