import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { participantService } from '../services/participantService'
import { boatService } from '../services/boatService'
import useMediaQuery from '../hooks/useMediaQuery'
import JoinTripModal from '../components/JoinTripModal'
import './Dashboard.css'

export default function Dashboard() {
  const { user } = useAuthState()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [upcomingTrip, setUpcomingTrip] = useState(null)
  const [tripStats, setTripStats] = useState({
    boatCount: 0,
    participantCount: 0
  })
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0
  })
  const [loading, setLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Uživateli'

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    setLoading(true)
    
    // Load all trips (organizing and participating)
    const [organizingResult, participatingResult] = await Promise.all([
      tripService.getUserOrganizingTrips(user.uid),
      tripService.getUserParticipatingTrips(user.uid)
    ])

    // Merge trips - if user is both organizer and participant, mark both
    const tripsMap = new Map()
    
    organizingResult.trips.forEach(t => {
      tripsMap.set(t.id, { ...t, isOrganizing: true })
    })
    
    participatingResult.trips.forEach(t => {
      if (tripsMap.has(t.id)) {
        // User is both organizer and participant
        const existingTrip = tripsMap.get(t.id)
        tripsMap.set(t.id, { 
          ...existingTrip, 
          participationRole: t.participationRole || existingTrip.participationRole, 
          participationId: t.participationId || existingTrip.participationId, 
          boatId: t.boatId || existingTrip.boatId 
        })
      } else {
        tripsMap.set(t.id, { ...t, isOrganizing: false })
      }
    })
    
    const allTrips = Array.from(tripsMap.values())

    // Helper to convert Firestore timestamp to Date
    const toDate = (timestamp) => {
      if (!timestamp) return null
      if (timestamp.toDate) return timestamp.toDate()
      if (timestamp.seconds) return new Date(timestamp.seconds * 1000)
      return null
    }

    // Find upcoming trip (nearest future trip) and calculate stats in one pass
    const now = new Date()
    let upcoming = null
    let upcomingCount = 0
    let completedCount = 0
    const total = allTrips.length

    allTrips.forEach(trip => {
      const startDate = toDate(trip.startDate)
      const endDate = toDate(trip.endDate)

      if (startDate && startDate > now) {
        upcomingCount++
        if (!upcoming || startDate < toDate(upcoming.startDate)) {
          upcoming = trip
        }
      } else if (!upcoming && trip.isOrganizing) {
        // If no upcoming trip found, show the most recent organizing trip
        const tripStartDate = toDate(trip.startDate)
        if (!upcoming || (tripStartDate && tripStartDate > toDate(upcoming.startDate))) {
          upcoming = trip
        }
      }

      if (endDate && endDate < now) {
        completedCount++
      }
    })

    setUpcomingTrip(upcoming)
    setStats({ total, upcoming: upcomingCount, completed: completedCount })

    // Load boat and participant counts for upcoming trip
    if (upcoming) {
      const [boatsResult, participantsResult] = await Promise.all([
        boatService.getTripBoats(upcoming.id),
        participantService.getTripParticipants(upcoming.id)
      ])
      
      setTripStats({
        boatCount: boatsResult.boats?.length || 0,
        participantCount: participantsResult.participants?.length || 0
      })
    } else {
      setTripStats({ boatCount: 0, participantCount: 0 })
    }

    setLoading(false)
  }

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

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Neuvedeno'
    const start = formatDate(startDate)
    const end = formatDate(endDate)
    return `${start} – ${end}`
  }

  const getDaysUntil = (date) => {
    if (!date) return null
    const tripDate = date.toDate ? date.toDate() : new Date(date.seconds * 1000)
    const now = new Date()
    const diffTime = tripDate - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : null
  }

  const getTripViewPath = (trip) => {
    // Default navigation goes to participant/captain view (not organizer)
    if (trip.participationRole === 'captain') {
      return `/trip/${trip.id}/captain`
    } else {
      return `/trip/${trip.id}/participant`
    }
  }

  const getRoleLabel = (role) => {
    const labels = {
      'participant': 'Účastník',
      'captain': 'Kapitán',
      'organizer': 'Organizátor'
    }
    return labels[role] || role
  }

  const getPrimaryRole = (trip) => {
    // Primary role is participant/captain (not organizer) for default navigation
    return trip.participationRole || 'participant'
  }

  const getAllRoles = (trip) => {
    const roles = []
    // Always add organizer first if user is organizing
    if (trip.isOrganizing) {
      roles.push('organizer')
    }
    // Add participation role if exists (participant or captain)
    // Check both participationRole and role properties for compatibility
    const participationRole = trip.participationRole || trip.role
    if (participationRole && participationRole !== 'organizer') {
      roles.push(participationRole)
    }
    // If no roles at all, default to participant
    if (roles.length === 0) {
      roles.push('participant')
    }
    return roles
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--gray-500)' }}>
          Načítání...
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Welcome Banner */}
      <div className="welcome-banner animate-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
          <div>
            <h2>Ahoj, {userName}! 👋</h2>
            {upcomingTrip ? (
              <p>Máš blížící se plavbu za {getDaysUntil(upcomingTrip.startDate)} dní. Nezapomeň zkontrolovat checklist.</p>
            ) : (
              <p>Zatím nemáš žádné nadcházející plavby. Vytvoř novou nebo se připoj k existující.</p>
            )}
          </div>
          <div className="welcome-stats" style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{stats.total}</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Celkem plaveb</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{stats.upcoming}</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Nadcházející</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{stats.completed}</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Dokončené</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Main Content */}
        <div className="main-content">
          {/* Upcoming Trip */}
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>
            <i className="fas fa-calendar-alt" style={{ color: 'var(--turquoise)', marginRight: 'var(--space-sm)' }}></i>
            {upcomingTrip ? 'Nadcházející plavba' : 'Nemáš nadcházející plavbu'}
          </h3>
          
          {upcomingTrip ? (
            <div className="trip-card animate-in delay-1" style={{ marginBottom: 'var(--space-xl)' }}>
              <div 
                onClick={() => {
                  const path = getTripViewPath(upcomingTrip)
                  window.location.href = path
                }}
                style={{ display: 'block', textDecoration: 'none', cursor: 'pointer' }}
              >
                <div 
                  className="trip-card-image" 
                  style={upcomingTrip.bannerImageUrl ? {
                    background: `url(${upcomingTrip.bannerImageUrl}) center/cover no-repeat`,
                    position: 'relative'
                  } : {
                    background: 'linear-gradient(135deg, #1a5f7a, #06b6d4)'
                  }}
                >
                  {upcomingTrip.bannerImageUrl && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.6), rgba(10, 22, 40, 0.4))'
                    }}></div>
                  )}
                  <h3 style={{ position: 'relative', zIndex: 1 }}>{upcomingTrip.name || 'Bez názvu'}</h3>
                </div>
                <div className="trip-card-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                    <div className="trip-meta">
                      <div className="trip-meta-item">
                        <i className="fas fa-calendar"></i>
                        {formatDateRange(upcomingTrip.startDate, upcomingTrip.endDate)}
                      </div>
                      {upcomingTrip.startLocation && (
                        <div className="trip-meta-item">
                          <i className="fas fa-map-marker-alt"></i>
                          {upcomingTrip.startLocation}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'var(--space-md)', alignItems: 'center' }}>
                      {getAllRoles(upcomingTrip).map((role) => {
                        if (role === 'organizer') {
                          return (
                            <Link
                              key={role}
                              to={`/trip/${upcomingTrip.id}/organizer`}
                              className={`role-badge ${role}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: 'pointer', textDecoration: 'none' }}
                              title="Otevřít jako organizátor"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)'
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'
                                e.currentTarget.style.boxShadow = 'none'
                              }}
                            >
                              <i className="fas fa-crown"></i>
                              {getRoleLabel(role)}
                              <i className="fas fa-external-link-alt" style={{ marginLeft: '4px', fontSize: '0.7rem' }}></i>
                            </Link>
                          )
                        }
                        return (
                          <span key={role} className={`role-badge ${role}`}>
                            <i className={`fas fa-${role === 'captain' ? 'ship' : 'user'}`}></i>
                            {getRoleLabel(role)}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div className="trip-stats">
                    <div className="trip-stat">
                      <div className="trip-stat-value">{tripStats.boatCount}</div>
                      <div className="trip-stat-label">Lodě</div>
                    </div>
                    <div className="trip-stat">
                      <div className="trip-stat-value">{tripStats.participantCount}</div>
                      <div className="trip-stat-label">Účastníků</div>
                    </div>
                    {upcomingTrip.startDate && (
                      <div className="trip-stat">
                        <div className="trip-stat-value">{getDaysUntil(upcomingTrip.startDate) || '-'}</div>
                        <div className="trip-stat-label">Dní do startu</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <div className="empty-state-icon" style={{ margin: '0 auto var(--space-lg)' }}>
                <i className="fas fa-sailboat"></i>
              </div>
              <h3>Nemáš nadcházející plavbu</h3>
              <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                Vytvoř novou plavbu, připoj se k existující pomocí ID a hesla, nebo počkej až tě organizátor pozve.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/trip/new" className="btn btn-primary">
                  <i className="fas fa-plus"></i>
                  Zorganizovat plavbu
                </Link>
                <button 
                  className="btn btn-coral"
                  onClick={() => setShowJoinModal(true)}
                >
                  <i className="fas fa-sign-in-alt"></i>
                  Zúčastnit se plavby
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside>
          {/* Upcoming Events - Placeholder for future implementation */}
          {upcomingTrip && (
            <div className="sidebar-card animate-in delay-3">
              <h4>
                <i className="fas fa-bell" style={{ color: 'var(--warning)' }}></i>
                Připomínky
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--foam)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ color: 'var(--turquoise)', fontSize: '1.25rem' }}>
                    <i className="fas fa-info-circle"></i>
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--ocean-deep)' }}>Připrav se na plavbu</div>
                    <div className="text-sm text-muted">Zkontroluj checklist a crewlist</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {showJoinModal && (
        <JoinTripModal onClose={() => setShowJoinModal(false)} />
      )}
    </div>
  )
}
