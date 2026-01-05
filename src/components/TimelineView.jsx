import { Link } from 'react-router-dom'
import { useState } from 'react'
import PaymentInfoModal from './PaymentInfoModal'
import './TimelineView.css'

/**
 * TimelineView component for displaying timeline events in "Před plavbou" tab
 * @param {array} events - Array of timeline events
 * @param {object} eventCompletions - Object mapping eventId to completion data (varies by viewType)
 * @param {function} onEventToggle - Callback when event is toggled (for checkable events)
 * @param {string} viewType - 'organizer' | 'captain' | 'participant'
 * @param {string} tripId - Trip ID for links
 * @param {number} participantCount - Total participant count (for organizer view)
 * @param {object} trip - Trip data (for payment info modal)
 */
export default function TimelineView({
  events = [],
  eventCompletions = {},
  onEventToggle = null,
  viewType = 'participant',
  tripId = null,
  participantCount = 0,
  trip = null
}) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const formatDate = (date) => {
    if (!date) return ''
    if (date.toDate) {
      return date.toDate().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
    }
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
    }
    return ''
  }

  const formatDateTime = (date) => {
    if (!date) return ''
    try {
      let dateObj
      if (date.toDate) {
        dateObj = date.toDate()
      } else if (date.seconds) {
        dateObj = new Date(date.seconds * 1000)
      } else {
        dateObj = new Date(date)
      }
      if (isNaN(dateObj.getTime())) return ''
      return dateObj.toLocaleDateString('cs-CZ', { 
        day: 'numeric', 
        month: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }

  if (events.length === 0) {
    return (
      <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: 'var(--space-xl)' }}>
        Zatím nejsou definované žádné události v timeline.
      </p>
    )
  }

  // Sort events by date - nearest first (top), furthest last (bottom)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.date?.toDate ? a.date.toDate() : (a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(0))
    const dateB = b.date?.toDate ? b.date.toDate() : (b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(0))
    // Events without dates go to the end
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return dateA.getTime() - dateB.getTime()
  })

  return (
    <div className="timeline-view">
      {sortedEvents.map((event, index) => {
        const eventDate = event.date?.toDate ? event.date.toDate() : (event.date?.seconds ? new Date(event.date.seconds * 1000) : null)
        const isOverdue = eventDate && eventDate < new Date()
        
        // Get completion status based on view type
        let isCompleted = false
        let completedCount = 0
        let completionData = null
        
        if (viewType === 'organizer') {
          // Organizer view: eventCompletions[eventId] is array of userIds who completed
          const completedUserIds = eventCompletions[event.id] || []
          completedCount = completedUserIds.length
          completionData = completedUserIds
        } else {
          // Participant/Captain view: eventCompletions[eventId] is boolean
          isCompleted = eventCompletions[event.id] || false
        }

        const isLast = index === events.length - 1

        return (
          <div key={event.id} className="timeline-item">
            {/* Timeline line and dot */}
            <div className="timeline-line-container">
              <div className="timeline-dot-wrapper">
                <div 
                  className={`timeline-dot ${isCompleted || (viewType === 'organizer' && completedCount > 0) ? 'completed' : isOverdue && !isCompleted ? 'overdue' : 'pending'}`}
                  style={{
                    cursor: event.checkable ? 'pointer' : 'default'
                  }}
                  onClick={() => {
                    if (event.checkable && onEventToggle) {
                      onEventToggle(event.id)
                    }
                  }}
                  title={event.checkable ? (isCompleted ? 'Označit jako nesplněné' : 'Označit jako splněné') : ''}
                >
                  {isCompleted || (viewType === 'organizer' && completedCount > 0) ? (
                    <i className="fas fa-check"></i>
                  ) : isOverdue && !isCompleted ? (
                    <i className="fas fa-exclamation"></i>
                  ) : (
                    <i className="fas fa-circle"></i>
                  )}
                </div>
                {eventDate && (
                  <div className={`timeline-date ${isOverdue && !isCompleted ? 'overdue' : ''}`}>
                    {formatDate(event.date)}
                  </div>
                )}
              </div>
              {!isLast && <div className="timeline-line"></div>}
            </div>

            {/* Event content */}
            <div 
              className={`timeline-event ${isCompleted || (viewType === 'organizer' && completedCount === participantCount && participantCount > 0) ? 'completed' : ''}`}
            >
              <div className="timeline-event-content">
                {/* Header row: Title + Check button/Status */}
                <div className="timeline-event-header-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 className="timeline-event-title">
                      {event.name || 'Bez názvu'}
                    </h5>
                    {/* Description */}
                    {event.description && (
                      <p className="timeline-event-description">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="timeline-event-header-right">
                    {event.checkable && viewType !== 'organizer' && (
                      <button
                        className={`timeline-check-button ${isCompleted ? 'completed' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onEventToggle) {
                            onEventToggle(event.id)
                          }
                        }}
                        title={isCompleted ? 'Označit jako nesplněné' : 'Označit jako splněné'}
                      >
                        <i className={`fas fa-${isCompleted ? 'check' : 'circle'}`}></i>
                        <span className="timeline-check-button-label">
                          {isCompleted ? 'Splněno' : 'Splnit'}
                        </span>
                      </button>
                    )}
                    {viewType === 'organizer' && (
                      <div className="event-status">
                        <span className={`count ${completedCount === participantCount && participantCount > 0 ? 'completed' : ''}`}>
                          {completedCount}
                        </span>
                        <span>/</span>
                        <span className="count">{participantCount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Meta row: Actions on left, Roles on right bottom */}
                <div className="timeline-event-meta">
                  <div className="timeline-event-actions">
                    {event.type === 'crewlist' && tripId && (
                      <Link 
                        to={`/trip/${tripId}/${viewType === 'organizer' ? 'organizer' : viewType === 'captain' ? 'captain' : 'participant'}#crew-list`}
                        className="btn btn-sm btn-secondary timeline-action-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <i className="fas fa-clipboard-list"></i> Otevřít crew list
                      </Link>
                    )}
                    {event.type === 'payment' && trip && (
                      <button
                        className="btn btn-sm btn-secondary timeline-action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowPaymentModal(true)
                        }}
                      >
                        <i className="fas fa-money-bill-wave"></i> Informace o platbách
                      </button>
                    )}
                  </div>
                  {event.roles && event.roles.length > 0 && (
                    <div className="timeline-event-roles">
                      {event.roles.map((role, idx) => (
                        <span key={idx} className={`role-tag ${role}`}>
                          <i className={`fas fa-${role === 'captain' ? 'ship' : role === 'organizer' ? 'crown' : 'users'}`}></i>
                          {role === 'captain' ? 'Kapitáni' : role === 'organizer' ? 'Organizátoři' : 'Účastníci'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
      
      {/* Payment Info Modal */}
      <PaymentInfoModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentInfo={trip?.paymentInfo}
      />
    </div>
  )
}

