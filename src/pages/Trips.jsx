import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { participantService } from '../services/participantService'
import JoinTripModal from '../components/JoinTripModal'
import './Trips.css'

export default function Trips() {
  const { user } = useAuthState()
  const [participatingTrips, setParticipatingTrips] = useState([])
  const [tripProgress, setTripProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)

  useEffect(() => {
    if (user) {
      loadTrips()
    }
  }, [user])

  const loadTrips = async () => {
    if (!user) return
    
    setLoading(true)
    
    // Load participating trips only
    const { trips: participating, error: participatingError } = await tripService.getUserParticipatingTrips(user.uid)
    if (!participatingError) {
      setParticipatingTrips(participating)
      
      // Calculate progress for each trip
      const progressMap = {}
      for (const trip of participating) {
        // For now, progress is 0% until crewlist/checklist system is implemented
        // This will be updated when those features are added
        progressMap[trip.id] = 0
      }
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

  const getRoleLabel = (role) => {
    const labels = {
      'participant': 'Účastník',
      'captain': 'Kapitán',
      'organizer': 'Organizátor'
    }
    return labels[role] || role
  }

  const getTripViewPath = (trip, role) => {
    if (role === 'organizer') {
      return `/trip/${trip.id}/organizer`
    } else if (role === 'captain') {
      return `/trip/${trip.id}/captain`
    } else {
      return `/trip/${trip.id}/participant`
    }
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
          <h1 className="h1">Mé plavby</h1>
          <p className="subtitle" style={{ textAlign: 'left' }}>Plavby, kterých se účastníš jako účastník nebo kapitán.</p>
        </div>
        <button 
          className="btn btn-coral"
          onClick={() => setShowJoinModal(true)}
        >
          <i className="fas fa-sign-in-alt"></i>
          Zúčastnit se plavby
        </button>
      </div>

      <div className="trips-content">
        {participatingTrips.length > 0 ? (
          <div className="grid two">
            {participatingTrips.map((trip) => {
              const role = trip.participationRole || 'participant'
              return (
                <Link 
                  key={trip.id} 
                  to={getTripViewPath(trip, role)} 
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
                      <div style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span className={`role-badge ${role}`} style={{ fontSize: '0.75rem' }}>
                          <i className={`fas fa-${role === 'captain' ? 'ship' : 'user'}`}></i>
                          {getRoleLabel(role)}
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
              <i className="fas fa-sailboat"></i>
            </div>
            <h3>Zatím se neúčastníš žádné plavby</h3>
            <p>Připoj se k plavbě pomocí ID a hesla, nebo počkej až tě organizátor pozve.</p>
          </div>
        )}
      </div>

      {showJoinModal && (
        <JoinTripModal onClose={() => setShowJoinModal(false)} />
      )}
    </div>
  )
}
