export default function TripLocationCard({ trip }) {
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

  if (!trip.startLocation && !trip.endLocation && !trip.tripStops && !trip.locationName) {
    return null
  }

  return (
    <div className="card animate-in delay-1" style={{ marginBottom: 'var(--space-xl)' }}>
      <h4 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>
        <i className="fas fa-map-marked-alt" style={{ color: 'var(--coral)' }}></i>
        Lokalita
      </h4>
      
      <div 
        className="map-placeholder"
        style={trip.locationImageUrl ? {
          background: `url(${trip.locationImageUrl}) center/cover no-repeat`,
          minHeight: '200px',
          opacity: 1
        } : {}}
      >
        {!trip.locationImageUrl && <i className="fas fa-map"></i>}
      </div>
      
      {(trip.locationName || trip.locationDescription) && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          {trip.locationName && (
            <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '1.25rem', fontWeight: 600 }}>
              {trip.locationName}
            </h3>
          )}
          {trip.locationDescription && (
            <p style={{ color: 'var(--gray-600)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {trip.locationDescription}
            </p>
          )}
        </div>
      )}
      
      <div className="location-info">
        {trip.startLocation && (
          <div className="location-item">
            <div className="location-icon">
              <i className="fas fa-anchor"></i>
            </div>
            <div className="location-text">
              <h5>Místo startu</h5>
              <p>{trip.startLocation}</p>
              {trip.checkInDateTime && (
                <p className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                  Check-in: {formatDateTime(trip.checkInDateTime)}
                </p>
              )}
            </div>
          </div>
        )}
        
        {trip.endLocation && (
          <div className="location-item">
            <div className="location-icon">
              <i className="fas fa-flag-checkered"></i>
            </div>
            <div className="location-text">
              <h5>Cíl plavby</h5>
              <p>{trip.endLocation}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Místa k navštívení */}
      {trip.tripStops && (
        <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-xl)', borderTop: '1px solid var(--gray-100)' }}>
          <h5 style={{ marginBottom: 'var(--space-lg)' }}>
            <i className="fas fa-map-pin" style={{ color: 'var(--turquoise)', marginRight: 'var(--space-sm)' }}></i>
            Zastávky během plavby
          </h5>
          {Array.isArray(trip.tripStops) && trip.tripStops.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
              {trip.tripStops.map((stop) => (
                <div key={stop.id || stop.name} style={{ 
                  background: 'var(--gray-50)', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden',
                  border: '1px solid var(--gray-200)'
                }}>
                  <div style={{ 
                    height: '100px', 
                    background: stop.imageUrl 
                      ? `url(${stop.imageUrl})` 
                      : 'linear-gradient(135deg, var(--ocean-mid), var(--turquoise))',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: stop.imageUrl ? 'transparent' : 'white', 
                    fontSize: '1.5rem',
                    position: 'relative'
                  }}>
                    {!stop.imageUrl && <i className="fas fa-map-marker-alt"></i>}
                  </div>
                  <div style={{ padding: 'var(--space-md)' }}>
                    <div className="font-medium">{stop.name || 'Bez názvu'}</div>
                    {stop.description && (
                      <div className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>{stop.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : typeof trip.tripStops === 'string' && trip.tripStops.trim() ? (
            // Fallback for old string format
            <p style={{ color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>{trip.tripStops}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}

