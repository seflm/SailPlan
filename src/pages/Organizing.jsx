import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { boatService } from '../services/boatService'
import { participantService } from '../services/participantService'
import './Trips.css'

export default function Organizing() {
  const { user } = useAuthState()
  const [organizingTrips, setOrganizingTrips] = useState([])
  const [tripStats, setTripStats] = useState({})
  const [tripProgress, setTripProgress] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadTrips()
    }
  }, [user])

  const loadTrips = async () => {
    if (!user) return
    
    setLoading(true)
    
    // Load organizing trips only
    const { trips: organizing, error: organizingError } = await tripService.getUserOrganizingTrips(user.uid)
    if (!organizingError) {
      setOrganizingTrips(organizing)
      
      // Load stats for each trip
      const statsMap = {}
      const progressMap = {}
      
      for (const trip of organizing) {
        const [boatsResult, participantsResult] = await Promise.all([
          boatService.getTripBoats(trip.id),
          participantService.getTripParticipants(trip.id)
        ])
        
        const boatCount = boatsResult.boats?.length || 0
        const participantCount = participantsResult.participants?.length || 0
        
        statsMap[trip.id] = { boatCount, participantCount }
        
        // Calculate crewlist progress (for now 0% until crewlist system is implemented)
        // This will be updated when crewlist feature is added
        progressMap[trip.id] = 0
      }
      
      setTripStats(statsMap)
      setTripProgress(progressMap)
    }

    setLoading(false)
  }

  const formatDate = (date) => {
    if (!date) return 'Neuvedeno'
    if (date.toDate) {
      return date.toDate().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
    }
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
    }
    return 'Neuvedeno'
  }

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Neuvedeno'
    const start = formatDate(startDate)
    const end = formatDate(endDate)
    return `${start} – ${end}`
  }

  const getTripRoute = (trip) => {
    if (trip.startLocation && trip.endLocation) {
      return `${trip.startLocation} → ${trip.endLocation}`
    }
    return 'Neuvedeno'
  }


  if (loading) {
    return (
      <div className="container">
        <div className="loading">Načítání plaveb...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="row wrap">
        <div className="grow">
          <h1 className="h1">Organizuji</h1>
          <p className="subtitle" style={{ textAlign: 'left' }}>Plavby, které organizuješ. Zde máš plný přístup ke všem funkcím správy plavby.</p>
        </div>
        <Link to="/trip/new" className="btn btn-primary">
          <i className="fas fa-plus"></i>
          Zorganizovat plavbu
        </Link>
      </div>

      <div className="trips-content">
        {organizingTrips.length > 0 ? (
          <div className="grid two">
            {organizingTrips.map((trip) => {
              const stats = tripStats[trip.id] || { boatCount: 0, participantCount: 0 }
              return (
                <Link 
                  key={trip.id} 
                  to={`/trip/${trip.id}/organizer`}
                  className="card"
                  style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                  }}
                >
                  <div className="hd">
                    <div className="grow">
                      <div className="h2" style={{ marginBottom: 'var(--space-sm)' }}>{trip.name || 'Bez názvu'}</div>
                      <div className="p" style={{ marginBottom: 'var(--space-xs)' }}>
                        <i className="fas fa-calendar" style={{ marginRight: '6px', color: 'var(--gray-400)' }}></i>
                        {formatDateRange(trip.startDate, trip.endDate)}
                      </div>
                      {trip.startLocation && (
                        <div className="p" style={{ marginBottom: 'var(--space-xs)' }}>
                          <i className="fas fa-map-marker-alt" style={{ marginRight: '6px', color: 'var(--gray-400)' }}></i>
                          {trip.startLocation}
                        </div>
                      )}
                      <div style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                          <i className="fas fa-ship" style={{ marginRight: '4px', color: 'var(--turquoise)' }}></i>
                          {stats.boatCount} {stats.boatCount === 1 ? 'loď' : stats.boatCount < 5 ? 'lodě' : 'lodí'}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                          <i className="fas fa-users" style={{ marginRight: '4px', color: 'var(--coral)' }}></i>
                          {stats.participantCount} {stats.participantCount === 1 ? 'účastník' : stats.participantCount < 5 ? 'účastníci' : 'účastníků'}
                        </span>
                        <span className="role-badge organizer" style={{ fontSize: '0.75rem' }}>
                          <i className="fas fa-crown"></i>
                          Organizátor
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h3>Zatím žádné plavby neorganizuješ</h3>
            <p>Začněte vytvořením nové plavby a pozvěte své přátele.</p>
          </div>
        )}
      </div>
    </div>
  )
}

