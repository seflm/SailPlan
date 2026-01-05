import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { participantService } from '../services/participantService'

export default function ParticipationManagementModal({ 
  isOpen, 
  onClose, 
  participantId,
  tripName 
}) {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  if (!isOpen) return null

  const handleLeaveTrip = async () => {
    const message = 'Opravdu se chcete nezůčastnit této plavby?\n\nTato akce vás odebere z plavby a ztratíte přístup ke všem informacím o této plavbě. Tuto akci nelze vrátit zpět.'
    
    if (!window.confirm(message)) {
      return
    }

    setLeaving(true)
    const { error } = await participantService.removeParticipant(participantId)
    
    if (!error) {
      navigate('/trips')
    } else {
      alert('Chyba při odhlášení z plavby: ' + error)
      setLeaving(false)
      onClose()
    }
  }

  return (
    <div 
      className="modal-overlay active" 
      onClick={onClose}
    >
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="modal-header">
          <h4>
            <i className="fas fa-user-cog" style={{ color: 'var(--gray-600)', marginRight: 'var(--space-sm)' }}></i>
            Správa účasti
          </h4>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
            Zde můžete spravovat svou účast na této plavbě{tripName ? ` "${tripName}"` : ''}.
          </p>
          
          {/* Warning section for leave trip */}
          <div style={{ 
            padding: 'var(--space-md)', 
            background: 'var(--danger-light)', 
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-md)'
          }}>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--danger)',
              margin: 0,
              fontWeight: 500
            }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 'var(--space-xs)' }}></i>
              Odhlášení z plavby je nevratná akce. Po odhlášení ztratíte přístup ke všem informacím o této plavbě.
            </p>
          </div>

          {/* Future: Additional management options can be added here */}
          {/* Example:
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
              Další možnosti
            </h5>
            <button className="btn btn-sm btn-ghost" style={{ width: '100%' }}>
              Změnit roli
            </button>
          </div>
          */}
        </div>
        
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={onClose}
            disabled={leaving}
          >
            Zrušit
          </button>
          <button
            className="btn"
            onClick={handleLeaveTrip}
            disabled={leaving}
            style={{ 
              background: 'var(--danger)',
              borderColor: 'var(--danger)',
              color: 'white'
            }}
          >
            <i className="fas fa-user-minus"></i>
            {leaving ? 'Odhlašování...' : 'Nezůčastnit se plavby'}
          </button>
        </div>
      </div>
    </div>
  )
}

