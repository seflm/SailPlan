import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { participantService } from '../services/participantService'
import './AddParticipantModal.css'

export default function JoinTripModal({ tripId: providedTripId, onClose, onSuccess }) {
  const navigate = useNavigate()
  const { user } = useAuthState()
  const [tripCode, setTripCode] = useState(providedTripId || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Role is always 'participant' when joining - organizer can change it later
  const role = 'participant'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!tripCode.trim() || !password.trim()) {
      setError('Vyplňte ID plavby i heslo.')
      return
    }

    if (!user) {
      // Redirect to onboarding for join-trip
      navigate(`/onboarding?mode=join-trip&tripId=${tripCode}`)
      return
    }

    setLoading(true)

    try {
      // Find trip by code and password
      const { data: trip, error: tripError } = await tripService.getTripByCodeAndPassword(tripCode.toUpperCase().trim(), password.trim())
      
      if (tripError || !trip) {
        setError('Nesprávné ID nebo heslo. Zkuste to znovu.')
        setLoading(false)
        return
      }

      // Check if user is already a participant
      const { data: existingParticipant } = await participantService.getParticipant(trip.id, user.uid)
      if (existingParticipant) {
        setError('Již jsi účastníkem této plavby.')
        setLoading(false)
        return
      }

      // Add user as participant
      const { id, error: addError } = await participantService.addParticipant(trip.id, user.uid, role, null)
      
      if (addError) {
        setError(addError)
        setLoading(false)
        return
      }

      // Success - close modal and navigate to trip
      if (onSuccess) {
        onSuccess()
      } else {
        onClose()
        if (user) {
          navigate(`/trip/${trip.id}/${role === 'captain' ? 'captain' : 'participant'}`)
        } else {
          navigate('/login')
        }
      }
    } catch (err) {
      setError(err.message || 'Došlo k chybě')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4>Připojit se k plavbě</h4>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">ID plavby {providedTripId ? '' : '*'}</label>
              <input
                type="text"
                className="form-input"
                value={tripCode}
                onChange={(e) => setTripCode(e.target.value.toUpperCase())}
                placeholder="např. ABC123"
                style={{ fontFamily: 'monospace', textTransform: 'uppercase', background: providedTripId ? 'var(--gray-50)' : 'var(--white)' }}
                maxLength={6}
                readOnly={!!providedTripId}
                required={!providedTripId}
              />
              <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                {providedTripId ? 'ID plavby je automaticky předvyplněno.' : 'Zadejte ID plavby, které vám poskytl organizátor.'}
              </p>
            </div>
            
            <div className="form-group">
              <label className="form-label">Heslo *</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Zadejte heslo"
                style={{ fontFamily: 'monospace' }}
                maxLength={20}
                required
              />
              <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                Zadejte heslo, které vám poskytl organizátor.
              </p>
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

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Zrušit
              </button>
              <button type="submit" className="btn btn-coral" disabled={loading}>
                <i className="fas fa-sign-in-alt"></i>
                {loading ? 'Připojování...' : 'Připojit se'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

