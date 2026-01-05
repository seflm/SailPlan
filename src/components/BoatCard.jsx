import { Link } from 'react-router-dom'
import './BoatCard.css'

/**
 * Universal BoatCard component for displaying boats across different views
 * @param {object} boat - Boat data object
 * @param {number} participantCount - Number of participants on this boat
 * @param {boolean} highlighted - Whether this boat should be highlighted (e.g., "Your boat")
 * @param {boolean} clickable - Whether the card should be clickable
 * @param {string|function} onClick - Click handler or route path
 * @param {boolean} showDetails - Whether to show detailed information
 * @param {string} viewType - View type: 'participant' | 'organizer' | 'captain' | 'public'
 */
export default function BoatCard({
  boat,
  participantCount = 0,
  highlighted = false,
  clickable = false,
  onClick = null,
  showDetails = false,
  viewType = 'participant'
}) {
  if (!boat) return null

  const capacity = boat.capacity || 0
  const hasThumbnail = !!boat.thumbnailUrl
  const isFull = capacity > 0 && participantCount >= capacity
  const availability = capacity > 0 ? `${participantCount}/${capacity}` : participantCount.toString()

  // Default gradient if no thumbnail
  const defaultGradient = 'linear-gradient(135deg, var(--ocean-mid), var(--turquoise))'

  // Card styling based on highlighted state
  const cardStyle = {
    background: highlighted 
      ? 'rgba(6, 182, 212, 0.05)' 
      : 'var(--gray-50)',
    border: highlighted 
      ? '2px solid var(--turquoise)' 
      : '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    cursor: clickable || onClick ? 'pointer' : 'default',
    transition: 'all 0.2s',
    position: 'relative'
  }

  // Image/thumbnail container
  const imageStyle = {
    height: '120px',
    background: hasThumbnail
      ? `url(${boat.thumbnailUrl}) center center / cover`
      : defaultGradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: hasThumbnail ? 'transparent' : 'rgba(255,255,255,0.3)',
    fontSize: '3rem',
    position: 'relative'
  }

  const handleClick = () => {
    if (onClick) {
      if (typeof onClick === 'function') {
        onClick()
      } else if (typeof onClick === 'string') {
        // Navigate to route
        window.location.href = onClick
      }
    }
  }

  const cardContent = (
    <>
      <div style={imageStyle}>
        {!hasThumbnail && <i className="fas fa-sailboat"></i>}
        {!highlighted && capacity > 0 && (
          <span 
            className={`status-pill ${isFull ? 'success' : ''}`} 
            style={{ 
              fontSize: '0.7rem', 
              position: 'absolute', 
              top: 'var(--space-sm)', 
              right: 'var(--space-sm)' 
            }}
          >
            {availability}
          </span>
        )}
      </div>
      <div style={{ padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
          <div className="font-semibold" style={{ flex: 1, minWidth: 0 }}>
            {boat.name || 'Bez názvu'}
          </div>
          {highlighted && (
            <span className="status-pill info" style={{ 
              fontSize: '0.7rem', 
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}>
              Vaše loď
            </span>
          )}
          {clickable || onClick ? (
            <i className="fas fa-chevron-right" style={{ 
              color: 'var(--gray-400)', 
              fontSize: '0.75rem',
              flexShrink: 0,
              marginTop: '2px'
            }}></i>
          ) : null}
        </div>
        <div className="text-sm text-muted" style={{ marginBottom: showDetails ? 'var(--space-sm)' : 'var(--space-xs)' }}>
          {boat.model || 'Model neuveden'} {boat.capacity ? `• ${boat.capacity} míst` : ''}
        </div>
        {showDetails && (
          <div className="text-sm" style={{ marginTop: 'var(--space-xs)' }}>
            <i className="fas fa-users" style={{ marginRight: '4px', color: 'var(--gray-400)' }}></i>
            {participantCount} {capacity ? `/${capacity}` : ''} osob
          </div>
        )}
      </div>
    </>
  )

  if (onClick && typeof onClick === 'string' && onClick.startsWith('/')) {
    return (
      <Link to={onClick} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={cardStyle}>
          {cardContent}
        </div>
      </Link>
    )
  }

  return (
    <div 
      style={cardStyle}
      onClick={clickable || onClick ? handleClick : undefined}
      onMouseEnter={(e) => {
        if (clickable || onClick) {
          e.currentTarget.style.borderColor = 'var(--turquoise)'
          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        }
      }}
      onMouseLeave={(e) => {
        if (clickable || onClick) {
          e.currentTarget.style.borderColor = highlighted ? 'var(--turquoise)' : 'var(--gray-200)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {cardContent}
    </div>
  )
}

