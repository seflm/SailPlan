import { useState, useEffect } from 'react'
import { useAuthState } from '../hooks/useAuthState'
import { participantService } from '../services/participantService'
import { tripService } from '../services/tripService'
import { boatService } from '../services/boatService'
import useMediaQuery from '../hooks/useMediaQuery'
import BottomDrawer from './BottomDrawer'
import './AddParticipantModal.css'

export default function AddParticipantModal({ tripId, onClose, onSuccess }) {
  const { user } = useAuthState()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [trip, setTrip] = useState(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('participant')
  const [boatId, setBoatId] = useState('')
  const [boats, setBoats] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addingOrganizer, setAddingOrganizer] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [tripResult, boatsResult] = await Promise.all([
      tripService.getTrip(tripId),
      boatService.getTripBoats(tripId)
    ])
    
    if (tripResult.data) {
      let tripData = tripResult.data
      
      // If trip doesn't have a password, generate and save one
      if (!tripData.password) {
        const { password } = await tripService.generateAndSetPassword(tripId)
        if (password) {
          tripData = { ...tripData, password }
        }
      }
      
      setTrip(tripData)
    }
    
    if (boatsResult.boats) {
      setBoats(boatsResult.boats)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    })
  }

  const handleAddOrganizer = async () => {
    if (!user || !trip || user.uid !== trip.organizerId) {
      setError('Nemáte oprávnění')
      return
    }

    setAddingOrganizer(true)
    setError('')

    // Add organizer as participant with default role, no boat assignment
    const { id, error: addError } = await participantService.addParticipant(
      tripId,
      user.uid,
      'participant',
      null // No boat assignment - organizer will do it later in participant list
    )

    if (addError) {
      setError('Chyba při přidávání: ' + addError)
      setAddingOrganizer(false)
      return
    }

    setAddingOrganizer(false)
    if (onSuccess) {
      onSuccess()
    }
    // Close modal after successful addition
    onClose()
  }

  const handleEmailInvite = async (e) => {
    e.preventDefault()
    if (!email) {
      setError('Zadejte emailovou adresu')
      return
    }
    
    setLoading(true)
    setError('')
    
    // For now, show a message that email invitations will be sent
    // In a full implementation, this would send an invitation email
    setError('Email pozvánky budou odeslány. Pro okamžité připojení použijte ID a heslo.')
    setLoading(false)
  }

  const modalContent = (
    <>
      {/* Shareable Link and Password Section */}
      <div className="form-group">
        <label className="form-label">Sdílitelný odkaz a heslo</label>
        <div>
          <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Odkaz na plavbu</div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <input
              type="text"
              className="form-input"
              value={trip?.id ? `${window.location.origin}/trip/${trip.id}/public` : ''}
              readOnly
              style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => copyToClipboard(trip?.id ? `${window.location.origin}/trip/${trip.id}/public` : '')}
            >
              <i className="fas fa-copy"></i>
            </button>
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-md)' }}>
          <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Heslo pro připojení</div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <input
              type="text"
              className="form-input"
              value={trip?.password || ''}
              readOnly
              style={{ flex: 1, fontFamily: 'monospace', fontWeight: 600 }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => copyToClipboard(trip?.password || '')}
            >
              <i className="fas fa-copy"></i>
            </button>
          </div>
        </div>
        <p className="text-sm text-muted" style={{ marginTop: 'var(--space-md)' }}>
          Zkopírujte odkaz a pošlete jej zájemcům spolu s heslem. Odkaz můžete poslat i bez hesla, pokud chcete pouze informovat zájemce - heslo jim poskytnete později.
        </p>
      </div>

      <div style={{ margin: 'var(--space-xl) 0', borderTop: '1px solid var(--gray-200)' }}></div>

      {/* Email Invitation Section - Disabled until email service is implemented */}
      <div style={{ opacity: 0.6, pointerEvents: 'none' }}>
        <form onSubmit={handleEmailInvite}>
          <div className="form-group">
            <label className="form-label">
              Pozvat přes e-mail
              <span style={{ marginLeft: 'var(--space-xs)', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                (Funkce bude brzy dostupná)
              </span>
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                style={{ flex: 1 }}
                disabled
              />
              <button type="submit" className="btn btn-primary" disabled>
                <i className="fas fa-paper-plane"></i> Poslat pozvánku
              </button>
            </div>
            {boats.length > 0 && (
              <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                <label className="form-label">Přiřadit do lodě (volitelně)</label>
                <select
                  className="form-input"
                  value={boatId}
                  onChange={(e) => setBoatId(e.target.value)}
                  disabled
                >
                  <option value="">Nepřiřazeno</option>
                  {boats.map((boat) => (
                    <option key={boat.id} value={boat.id}>
                      {boat.name || `Loď ${boat.id.substring(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
              Email pozvánky budou brzy dostupné. Pro okamžité pozvání použijte sdílený odkaz a heslo výše.
            </p>
          </div>
        </form>
      </div>

      {error && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)',
          marginTop: 'var(--space-md)'
        }}>
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {user && trip && trip.organizerId === user.uid && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddOrganizer}
            disabled={addingOrganizer}
            style={{ flex: isMobile ? '1 1 100%' : '0 0 auto' }}
          >
            <i className="fas fa-user-plus"></i>
            {addingOrganizer ? 'Přidávání...' : 'Přidat sebe jako účastníka'}
          </button>
        )}
        {!isMobile && (
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={onClose}
            style={{ flex: '0 0 auto' }}
          >
            Zavřít
          </button>
        )}
      </div>
    </>
  )

  if (!trip) {
    if (isMobile) {
      return (
        <BottomDrawer isOpen={true} onClose={onClose} title="Pozvat účastníky" maxHeight={80}>
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            Načítání...
          </div>
        </BottomDrawer>
      )
    }
    return (
      <div className="modal-overlay active" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
          <div className="modal-header">
            <h4>Pozvat účastníky</h4>
            <button className="btn btn-icon btn-ghost" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="modal-body">
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              Načítání...
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <BottomDrawer isOpen={true} onClose={onClose} title="Pozvat účastníky" maxHeight={80}>
        {modalContent}
      </BottomDrawer>
    )
  }

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h4>Pozvat účastníky</h4>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {modalContent}
        </div>
      </div>
    </div>
  )
}
