import TimelineView from './TimelineView'
import './BeforeTripTab.css'

/**
 * Universal BeforeTripTab component for all trip views
 * @param {array} events - Array of timeline events
 * @param {object} eventCompletions - Object mapping eventId to completion data (varies by viewType)
 * @param {function} onEventToggle - Callback when event is toggled (for checkable events)
 * @param {string} viewType - 'organizer' | 'captain' | 'participant'
 * @param {string} tripId - Trip ID for links
 * @param {number} participantCount - Total participant count (for organizer view)
 * @param {function} onEditEvents - Callback to edit events (for organizer view)
 * @param {boolean} showEditButton - Whether to show edit button (for organizer view)
 * @param {object} trip - Trip data (for payment info modal)
 */
export default function BeforeTripTab({
  events = [],
  eventCompletions = {},
  onEventToggle = null,
  viewType = 'participant',
  tripId = null,
  participantCount = 0,
  onEditEvents = null,
  showEditButton = false,
  trip = null
}) {
  // Determine header text and description based on view type
  const getHeaderConfig = () => {
    switch (viewType) {
      case 'organizer':
        return {
          title: 'Timeline před plavbou',
          description: 'Přehled splnění událostí všemi účastníky. Klikněte na událost pro detail.',
          icon: 'fa-flag-checkered',
          iconColor: 'var(--coral)'
        }
      case 'captain':
        return {
          title: 'Co je potřeba splnit před plavbou',
          description: 'Tyto události je potřeba splnit před odjezdem na plavbu. Některé mají stanovený termín.',
          icon: 'fa-flag-checkered',
          iconColor: 'var(--coral)'
        }
      case 'participant':
      default:
        return {
          title: 'Co je potřeba splnit před plavbou',
          description: 'Tyto události je potřeba splnit před odjezdem na plavbu. Některé mají stanovený termín.',
          icon: 'fa-flag-checkered',
          iconColor: 'var(--coral)'
        }
    }
  }

  const headerConfig = getHeaderConfig()

  // Check if all events are completed (for captain/participant view)
  const allCompleted = viewType !== 'organizer' && 
    events.filter(e => e.checkable).length > 0 &&
    events.filter(e => e.checkable).every(e => eventCompletions[e.id])

  return (
    <div className="card before-trip-tab">
      <div className="card-header">
        <h4 className="card-title">
          <i className={`fas ${headerConfig.icon}`} style={{ color: headerConfig.iconColor }}></i>
          {headerConfig.title}
        </h4>
        <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
          {allCompleted && (
            <span className="status-pill success">Vše splněno</span>
          )}
          {showEditButton && onEditEvents && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={onEditEvents}
            >
              <i className="fas fa-edit"></i> Upravit události
            </button>
          )}
        </div>
      </div>
      
      <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
        {headerConfig.description}
      </p>
      
      <TimelineView
        events={events}
        eventCompletions={eventCompletions}
        onEventToggle={onEventToggle}
        viewType={viewType}
        tripId={tripId}
        participantCount={participantCount}
        trip={trip}
      />
    </div>
  )
}

