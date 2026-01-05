import { Link } from 'react-router-dom'
import { useState } from 'react'
import PaymentInfoModal from './PaymentInfoModal'

export default function TripInfoCard({ trip, tripId, showEditButton = false, viewType = 'participant', onShowMore = null }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const formatDateTime = (dateTime) => {
    if (!dateTime) return ''
    try {
      let date
      if (dateTime.toDate) {
        date = dateTime.toDate()
      } else if (dateTime.seconds) {
        date = new Date(dateTime.seconds * 1000)
      } else if (typeof dateTime === 'string') {
        date = new Date(dateTime)
      } else {
        date = new Date(dateTime)
      }
      if (isNaN(date.getTime())) {
        return ''
      }
      return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="card animate-in" style={{ marginBottom: 'var(--space-xl)' }}>
      <div className="card-header">
        <h4 className="card-title">
          <i className="fas fa-info-circle" style={{ color: 'var(--turquoise)' }}></i>
          Informace o plavbě
        </h4>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {onShowMore && (viewType !== 'public' || trip.description) && (
            <button className="btn btn-sm btn-ghost" onClick={onShowMore}>
              <i className="fas fa-expand"></i>
              Více informací
            </button>
          )}
          {showEditButton && tripId && (
            <Link to={`/trip/${tripId}/edit`} className="btn btn-sm btn-ghost">
              <i className="fas fa-edit"></i> Upravit
            </Link>
          )}
        </div>
      </div>
      <div style={{ color: 'var(--gray-600)', lineHeight: 1.8 }}>
        {viewType === 'public' ? (
          // Public view: show description (zkrácený popis) if available, otherwise show descriptionForParticipants
          trip.description ? (
            <p style={{ marginBottom: 'var(--space-md)', whiteSpace: 'pre-wrap' }}>{trip.description}</p>
          ) : trip.descriptionForParticipants ? (
            <p style={{ marginBottom: 'var(--space-md)', whiteSpace: 'pre-wrap' }}>{trip.descriptionForParticipants}</p>
          ) : (
            <p style={{ marginBottom: 'var(--space-md)', color: 'var(--gray-400)' }}>Zatím není přidán popis plavby.</p>
          )
        ) : (
          // Participant/Organizer/Captain view: show only description for participants
          trip.descriptionForParticipants ? (
            <p style={{ marginBottom: 'var(--space-md)', whiteSpace: 'pre-wrap' }}>{trip.descriptionForParticipants}</p>
          ) : (
            <p style={{ marginBottom: 'var(--space-md)', color: 'var(--gray-400)' }}>Zatím není přidán popis plavby.</p>
          )
        )}
      </div>
      
      {/* Důležité termíny */}
      {(trip.checkInDateTime || trip.checkOutDateTime) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--gray-100)' }}>
          {trip.checkInDateTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--turquoise)' }}>
                <i className="fas fa-calendar-check"></i>
              </div>
              <div>
                <div className="text-sm text-muted">Check-in</div>
                <div className="font-medium">{formatDateTime(trip.checkInDateTime)}</div>
              </div>
            </div>
          )}
          {trip.checkOutDateTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(251, 113, 133, 0.1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--coral)' }}>
                <i className="fas fa-calendar-times"></i>
              </div>
              <div>
                <div className="text-sm text-muted">Check-out</div>
                <div className="font-medium">{formatDateTime(trip.checkOutDateTime)}</div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Cena a platby */}
      {trip.price && (
        <div style={{ 
          background: 'var(--gray-50)', 
          border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius-md)', 
          padding: 'var(--space-lg)', 
          marginTop: 'var(--space-lg)' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-md)',
            marginBottom: trip.priceNote ? 'var(--space-sm)' : 0
          }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              background: 'rgba(251, 113, 133, 0.1)', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--coral)',
              fontSize: '1rem',
              flexShrink: 0
            }}>
              <i className="fas fa-tag"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div className="text-sm text-muted" style={{ marginBottom: '2px' }}>Cena</div>
              <div className="font-semibold" style={{ fontSize: '1.125rem', color: 'var(--coral)' }}>
                {trip.price}
              </div>
            </div>
            {viewType !== 'public' && trip.paymentInfo && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowPaymentModal(true)}
                style={{ flexShrink: 0 }}
              >
                <i className="fas fa-money-bill-wave"></i>
                Informace o platbách
              </button>
            )}
          </div>
          {trip.priceNote && (
            <p className="text-sm text-muted" style={{ marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--gray-200)' }}>{trip.priceNote}</p>
          )}
        </div>
      )}

      {/* Payment Info Modal */}
      <PaymentInfoModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentInfo={trip?.paymentInfo}
      />
    </div>
  )
}

