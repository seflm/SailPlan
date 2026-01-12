import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { participantService } from '../services/participantService'
import { boatService } from '../services/boatService'
import { timelineService } from '../services/timelineService'
import { checklistService } from '../services/checklistService'
import { organizerService } from '../services/organizerService'
import { userService } from '../services/userService'
import { loadUserProfiles, getUserInitials } from '../utils/userDisplay'
import { getUserTripRoles, getRoleLabel } from '../utils/permissions'
import useMediaQuery from '../hooks/useMediaQuery'
import CrewlistForm from '../components/CrewlistForm'
import TripInfoCard from '../components/TripInfoCard'
import TripLocationCard from '../components/TripLocationCard'
import UsefulLinksCard from '../components/UsefulLinksCard'
import ContactsCard from '../components/ContactsCard'
import BoatCard from '../components/BoatCard'
import BeforeTripTab from '../components/BeforeTripTab'
import ScrollableTabs from '../components/ScrollableTabs'
import TripTabsBottomDrawer from '../components/TripTabsBottomDrawer'
import ParticipationManagementModal from '../components/ParticipationManagementModal'
import BottomDrawer from '../components/BottomDrawer'
import './TripDetail.css'

export default function TripParticipant() {
  const { tripId } = useParams()
  const { user } = useAuthState()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [trip, setTrip] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [boat, setBoat] = useState(null)
  const [boatParticipants, setBoatParticipants] = useState([])
  const [timelineEvents, setTimelineEvents] = useState([])
  const [eventCompletions, setEventCompletions] = useState({})
  const [checklistInstances, setChecklistInstances] = useState([])
  const [organizerContacts, setOrganizerContacts] = useState(null)
  const [captainContacts, setCaptainContacts] = useState(null)
  const [userProfiles, setUserProfiles] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('prehled')
  const [activeChecklist, setActiveChecklist] = useState(null)
  const [showParticipationModal, setShowParticipationModal] = useState(false)

  const tripTabs = [
    { id: 'prehled', label: 'Přehled', icon: <i className="fas fa-info-circle"></i> },
    { id: 'pred-plavbou', label: 'Před plavbou', icon: <i className="fas fa-flag-checkered"></i> },
    { id: 'moje-lod', label: 'Moje loď', icon: <i className="fas fa-ship"></i> },
    { id: 'crew-list', label: 'Crew list', icon: <i className="fas fa-clipboard-list"></i> },
    { id: 'checklisty', label: 'Checklisty', icon: <i className="fas fa-tasks"></i> },
  ]

  useEffect(() => {
    if (tripId && user) {
      loadTripData()
    }
  }, [tripId, user])

  // Check URL hash to set active tab
  useEffect(() => {
    const hash = window.location.hash
    if (hash === '#crew-list') {
      setActiveTab('crew-list')
    } else if (hash === '#checklisty') {
      setActiveTab('checklisty')
    } else if (hash === '#pred-plavbou') {
      setActiveTab('pred-plavbou')
    }
  }, [])

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#crew-list') {
        setActiveTab('crew-list')
      } else if (hash === '#checklisty') {
        setActiveTab('checklisty')
      } else if (hash === '#pred-plavbou') {
        setActiveTab('pred-plavbou')
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const loadTripData = async () => {
    setLoading(true)
    
    const [tripResult, participantResult] = await Promise.all([
      tripService.getTrip(tripId),
      participantService.getParticipant(tripId, user.uid)
    ])

    if (tripResult.data) {
      setTrip(tripResult.data)
      
      // Load organizer contact details
      if (tripResult.data.organizerId) {
        const { data: contacts } = await organizerService.getContactDetails(tripResult.data.organizerId)
        if (contacts) {
          setOrganizerContacts(contacts)
        }
      }
    }

    if (participantResult.data) {
      setParticipant(participantResult.data)
      
      // Load boat if assigned
      if (participantResult.data.boatId) {
        const { data: boatData } = await boatService.getBoat(participantResult.data.boatId)
        if (boatData) {
          setBoat(boatData)
          
      // Load boat participants
      const { participants } = await participantService.getBoatParticipants(tripId, boatData.id)
      setBoatParticipants(participants)
      
      // Load user profiles for all boat participants
      const userIds = participants.map(p => p.userId)
      if (userIds.length > 0) {
        const profiles = await loadUserProfiles(userIds)
        setUserProfiles(profiles)
      }
      
      // Load captain contacts if there is a captain
      const captain = participants.find(p => p.role === 'captain')
      if (captain) {
        const captainProfile = userProfiles.get(captain.userId) || await userService.getProfile(captain.userId).then(r => r.data)
        if (captainProfile) {
          setCaptainContacts(captainProfile)
        }
      }
      
      // Load checklist instances for this boat and role
      const { instances } = await checklistService.getTripInstances(tripId, { 
        boatId: boatData.id,
        role: 'participant'
      })
      if (instances) {
        setChecklistInstances(instances)
      }
      
      // Also load instances for this specific user
      const { instances: userInstances } = await checklistService.getTripInstances(tripId, { 
        userId: user.uid
      })
      if (userInstances && userInstances.length > 0) {
        setChecklistInstances(prev => {
          const combined = [...prev]
        userInstances.forEach(inst => {
            if (!combined.find(i => i.id === inst.id)) {
              combined.push(inst)
            }
          })
          return combined
        })
      }
    }
  }
    }

    // Load timeline events
    const { events, error: eventsError } = await timelineService.getTripEvents(tripId)
    if (!eventsError && events) {
      // Filter events based on user role
      const userRole = participantResult.data?.role || 'participant'
      const filteredEvents = events.filter(event => {
        if (!event.roles || event.roles.length === 0) return true
        // Check if user's role is in the event's roles array
        if (userRole === 'captain' && event.roles.includes('captain')) return true
        if (userRole === 'participant' && event.roles.includes('participant')) return true
        return false
      })
      setTimelineEvents(filteredEvents)
      
      // Load completion status for each event
      const completions = {}
      for (const event of filteredEvents) {
        if (event.checkable) {
          const { completed } = await timelineService.getEventCompletion(event.id, user.uid)
          completions[event.id] = completed
        }
      }
      setEventCompletions(completions)
    }

    setLoading(false)
  }

  const handleEventToggle = async (eventId) => {
    const currentCompletion = eventCompletions[eventId] || false
    const newCompletion = !currentCompletion
    
    const { error } = await timelineService.setEventCompletion(eventId, user.uid, newCompletion)
    if (!error) {
      setEventCompletions(prev => ({
        ...prev,
        [eventId]: newCompletion
      }))
    }
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

  const getDaysUntil = (date) => {
    if (!date) return null
    const tripDate = date.toDate ? date.toDate() : new Date(date.seconds * 1000)
    const now = new Date()
    const diffTime = tripDate - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : null
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

  if (!trip || !participant) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <h2>Plavba nenalezena nebo nejsi účastníkem</h2>
          <Link to="/trips" className="btn btn-primary">Zpět na plavby</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Trip Header */}
      <div 
        className="trip-header"
        style={trip.bannerImageUrl ? {
          backgroundImage: `url(${trip.bannerImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative'
        } : {}}
      >
        {trip.bannerImageUrl && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.8), rgba(10, 22, 40, 0.6))'
          }}></div>
        )}
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="trip-header-content">
            <div className="breadcrumb">
              <Link to="/dashboard"><i className="fas fa-home"></i></Link>
              <i className="fas fa-chevron-right"></i>
              <Link to="/trips">Mé plavby</Link>
              <i className="fas fa-chevron-right"></i>
              <span>{trip.name || 'Bez názvu'}</span>
            </div>
            
            <div className="trip-title-row">
              <div>
                <h1 className="trip-title">{trip.name || 'Bez názvu'}</h1>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(() => {
                    const isOrganizer = trip.organizerId === user.uid
                    const allRoles = getUserTripRoles(trip, participant, user.uid)
                    const currentView = participant?.role === 'captain' ? 'captain' : 'participant'
                    
                    // Sort roles so current view is first
                    const sortedRoles = [...allRoles].sort((a, b) => {
                      if (a === currentView) return -1
                      if (b === currentView) return 1
                      return 0
                    })
                    
                    return sortedRoles.map((role) => {
                      const isCurrentView = role === currentView
                      const roleIcon = role === 'organizer' ? 'fa-crown' : role === 'captain' ? 'fa-ship' : 'fa-user'
                      
                      if (isCurrentView) {
                        return (
                          <span key={role} className={`role-badge ${role}`}>
                            <i className={`fas ${roleIcon}`}></i>
                            {getRoleLabel(role)}
                          </span>
                        )
                      } else {
                        // Clickable badge to switch view
                        const viewPath = role === 'organizer' ? `/trip/${tripId}/organizer` : role === 'captain' ? `/trip/${tripId}/captain` : `/trip/${tripId}/participant`
                        return (
                          <Link
                            key={role}
                            to={viewPath}
                            className={`role-badge ${role}`}
                            style={{ 
                              cursor: 'pointer', 
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 'var(--space-xs)'
                            }}
                            title={`Zobrazit jako ${getRoleLabel(role).toLowerCase()}`}
                            onMouseEnter={(e) => {
                              if (role === 'organizer') {
                                e.currentTarget.style.transform = 'scale(1.05)'
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)'
                                e.currentTarget.style.background = 'rgba(249, 115, 22, 0.4)'
                              } else {
                                e.currentTarget.style.transform = 'scale(1.05)'
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.3)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)'
                              e.currentTarget.style.boxShadow = 'none'
                              if (role === 'organizer') {
                                e.currentTarget.style.background = 'rgba(249, 115, 22, 0.3)'
                              }
                            }}
                          >
                            <i className={`fas ${roleIcon}`}></i>
                            {getRoleLabel(role)}
                            <i className="fas fa-external-link-alt" style={{ marginLeft: '4px', fontSize: '0.7rem' }}></i>
                          </Link>
                        )
                      }
                    })
                  })()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0' }}>Organizuje</div>
                <div style={{ fontWeight: 600, color: 'var(--white)' }}>{organizerContacts?.name || 'Organizátor'}</div>
              </div>
            </div>
            
            <div className="trip-header-meta">
              <div className="trip-header-meta-item">
                <i className="fas fa-calendar"></i>
                <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
              </div>
              {(trip.locationName || trip.startLocation) && (
                <div className="trip-header-meta-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{trip.locationName || trip.startLocation}</span>
                </div>
              )}
              {getDaysUntil(trip.startDate) !== null && (
                <div className="trip-header-meta-item">
                  <i className="fas fa-clock"></i>
                  <span>{getDaysUntil(trip.startDate) === 0 ? 'Začíná dnes' : getDaysUntil(trip.startDate) === 1 ? 'Začíná zítra' : `${getDaysUntil(trip.startDate)} dní do startu`}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Settings button - positioned in bottom right corner */}
        <button
          onClick={() => setShowParticipationModal(true)}
          className="trip-header-settings-btn"
          aria-label="Správa účasti"
        >
          <i className="fas fa-cog"></i>
        </button>
      </div>

      {/* Trip Tabs */}
      {isMobile ? (
        <TripTabsBottomDrawer
          tabs={tripTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : (
        <div className="trip-tabs">
          <div className="container">
            <div className="trip-tabs-inner">
              <button
                className={`trip-tab ${activeTab === 'prehled' ? 'active' : ''}`}
                onClick={() => setActiveTab('prehled')}
              >
                <i className="fas fa-info-circle"></i>
                Přehled
              </button>
              <button
                className={`trip-tab ${activeTab === 'pred-plavbou' ? 'active' : ''}`}
                onClick={() => setActiveTab('pred-plavbou')}
              >
                <i className="fas fa-flag-checkered"></i>
                Před plavbou
              </button>
              <button
                className={`trip-tab ${activeTab === 'moje-lod' ? 'active' : ''}`}
                onClick={() => setActiveTab('moje-lod')}
              >
                <i className="fas fa-ship"></i>
                Moje loď
              </button>
              <button
                className={`trip-tab ${activeTab === 'crew-list' ? 'active' : ''}`}
                onClick={() => setActiveTab('crew-list')}
              >
                <i className="fas fa-clipboard-list"></i>
                Crew list
              </button>
              <button
                className={`trip-tab ${activeTab === 'checklisty' ? 'active' : ''}`}
                onClick={() => setActiveTab('checklisty')}
              >
                <i className="fas fa-tasks"></i>
                Checklisty
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Content */}
      <main className="trip-content">
        <div className="container">
          {/* TAB: Přehled */}
          {activeTab === 'prehled' && (
            <div className="trip-layout">
              {/* Main Content */}
              <div className="main-content">
                {/* Karta: Informace o plavbě */}
                <TripInfoCard trip={trip} />

                {/* Karta: Lokalita */}
                <TripLocationCard trip={trip} />

                {/* Karta: Lodě */}
                <div className="card animate-in delay-2">
                  <div className="card-header">
                    <h4 className="card-title">
                      <i className="fas fa-ship" style={{ color: 'var(--turquoise)' }}></i>
                      Lodě ve flotile
                    </h4>
                  </div>
                  
                  {boat ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-lg)' }}>
                      <BoatCard
                        boat={boat}
                        participantCount={boatParticipants.length}
                        highlighted={true}
                        clickable={true}
                        onClick={() => setActiveTab('moje-lod')}
                        viewType="participant"
                      />
                    </div>
                  ) : (
                    <p style={{ color: 'var(--gray-500)' }}>
                      Zatím ti není přiřazena žádná loď. Organizátor ti přiřadí loď později.
                    </p>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <aside>
                {/* Contacts Card */}
                <ContactsCard contacts={[
                  ...(captainContacts && (captainContacts.name || captainContacts.email || captainContacts.phone) ? [{
                    ...captainContacts,
                    role: 'captain'
                  }] : []),
                  ...(organizerContacts && (organizerContacts.name || organizerContacts.email || organizerContacts.phone) ? [{
                    ...organizerContacts,
                    role: 'organizer'
                  }] : [])
                ]} />
                
                {/* Useful Links Card */}
                {trip.usefulLinks && trip.usefulLinks.length > 0 && (
                  <UsefulLinksCard usefulLinks={trip.usefulLinks} />
                )}
              </aside>
            </div>
          )}

          {/* TAB: Před plavbou */}
          {activeTab === 'pred-plavbou' && (
            <BeforeTripTab
              events={timelineEvents}
              eventCompletions={eventCompletions}
              onEventToggle={handleEventToggle}
              viewType="participant"
              tripId={tripId}
              trip={trip}
            />
          )}

          {/* TAB: Moje loď */}
          {activeTab === 'moje-lod' && (
            <div className="trip-layout">
              <div className="main-content">
                {boat ? (
                  <>
                    {/* Boat Details Card */}
                    <div className="card animate-in" style={{ marginBottom: 'var(--space-lg)' }}>
                      {boat.thumbnailUrl && (
                        <div style={{ 
                          height: '200px', 
                          backgroundImage: `url(${boat.thumbnailUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
                        }}></div>
                      )}
                      <div style={{ padding: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                          <div>
                            <h4 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-xs)' }}>{boat.model || 'Model neuveden'}</h4>
                            <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>{boat.name || 'Bez názvu'}</p>
                          </div>
                          <span className="status-pill info" style={{ fontSize: '0.75rem' }}>
                            Vaše loď
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-md)' }}>
                          {boat.length && (
                            <div>
                              <div className="text-xs text-muted">Délka</div>
                              <div className="font-semibold">{boat.length} m</div>
                            </div>
                          )}
                          {boat.year && (
                            <div>
                              <div className="text-xs text-muted">Rok výroby</div>
                              <div className="font-semibold">{boat.year}</div>
                            </div>
                          )}
                          {boat.cabins && (
                            <div>
                              <div className="text-xs text-muted">Kajuty</div>
                              <div className="font-semibold">{boat.cabins}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-xs text-muted">Obsazenost</div>
                            <div className="font-semibold">{boatParticipants.length}{boat.capacity ? `/${boat.capacity}` : ''}</div>
                          </div>
                        </div>
                        {boat.charterLink && (
                          <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--gray-100)' }}>
                            <a 
                              href={boat.charterLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-ghost"
                              style={{ fontSize: '0.875rem' }}
                            >
                              <i className="fas fa-external-link-alt"></i>
                              Detail lodi
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Crew List (read-only for participants) */}
                    <div className="card animate-in delay-1">
                      <div className="card-header">
                        <h4 className="card-title">
                          <i className="fas fa-users" style={{ color: 'var(--turquoise)' }}></i>
                          Posádka ({boatParticipants.length}{boat.capacity ? `/${boat.capacity}` : ''})
                        </h4>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {boatParticipants && boatParticipants.length > 0 ? (
                          boatParticipants.map((p) => {
                            const isCaptain = p.role === 'captain'
                            const isCurrentUser = p.userId === user.uid
                            const profile = userProfiles.get(p.userId)
                            const displayName = profile?.name || 'Neznámý uživatel'
                            
                            // Calculate initials from name or fallback to userId
                            let initials = '??'
                            if (profile?.name) {
                              const nameParts = profile.name.trim().split(/\s+/)
                              if (nameParts.length >= 2) {
                                initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                              } else {
                                initials = profile.name.substring(0, 2).toUpperCase()
                              }
                            } else {
                              initials = p.userId.substring(0, 2).toUpperCase()
                            }
                            
                            return (
                              <div
                                key={p.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-md)',
                                  padding: 'var(--space-md)',
                                  background: isCurrentUser ? 'rgba(6, 182, 212, 0.1)' : 'var(--white)',
                                  border: `1px solid ${isCurrentUser ? 'rgba(6, 182, 212, 0.2)' : 'var(--gray-200)'}`,
                                  borderRadius: 'var(--radius-md)'
                                }}
                              >
                                <div className={`crew-avatar ${isCaptain ? 'captain' : ''}`} style={{ width: '48px', height: '48px', fontSize: '1rem' }}>
                                  {initials}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <h5 style={{ margin: 0, marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                    {displayName}
                                    {isCurrentUser && (
                                      <span className="status-pill info" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                        Já
                                      </span>
                                    )}
                                  </h5>
                                  <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                                    {isCaptain ? 'Kapitán' : 'Posádka'}
                                  </p>
                                </div>
                                {isCaptain && (
                                  <span className="crew-badge" style={{ padding: 'var(--space-xs) var(--space-md)', background: 'var(--turquoise)', color: 'white', borderRadius: 'var(--radius-full)', fontSize: '0.875rem' }}>
                                    Kapitán
                                  </span>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: 'var(--space-md)' }}>
                            Zatím není přiřazena žádná posádka.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="card">
                    <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                      Zatím ti není přiřazena žádná loď. Organizátor ti přiřadí loď později.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Crew list */}
          {activeTab === 'crew-list' && (
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-clipboard-list" style={{ color: 'var(--turquoise)' }}></i>
                  Crew list
                </h4>
              </div>
              
              {!boat ? (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                  <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--space-lg)' }}>
                    Zatím ti není přiřazena žádná loď. Organizátor ti přiřadí loď později, poté budeš moci vyplnit crewlist.
                  </p>
                </div>
              ) : (
                <CrewlistForm
                  tripId={tripId}
                  boatId={boat.id}
                  userId={user.uid}
                  role={participant?.role || 'participant'}
                  onSave={() => {
                    // Reload data if needed
                  }}
                />
              )}
            </div>
          )}

          {/* TAB: Checklisty */}
          {activeTab === 'checklisty' && !activeChecklist && (
            <div className="trip-layout">
              <div className="main-content">
                <div className="card animate-in">
                  <div className="card-header">
                    <h4 className="card-title">
                      <i className="fas fa-clipboard-list" style={{ color: 'var(--turquoise)' }}></i>
                      Dostupné checklisty
                    </h4>
                  </div>
                  
                  <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                    Tyto checklisty vám přidělil organizátor. Kliknutím je otevřete a můžete je vyplňovat.
                  </p>
                  
                  {boat ? (
                    checklistInstances.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {checklistInstances.map((instance) => {
                          const completedCount = instance.items?.filter(item => item.completed).length || 0
                          const totalCount = instance.items?.length || 0
                          
                          return (
                            <div
                              key={instance.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 'var(--space-lg)',
                                background: 'var(--gray-50)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                              onClick={() => setActiveChecklist(instance.id)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                <div style={{
                                  width: '48px',
                                  height: '48px',
                                  background: 'rgba(6, 182, 212, 0.1)',
                                  borderRadius: 'var(--radius-md)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--turquoise)',
                                  fontSize: '1.25rem'
                                }}>
                                  <i className="fas fa-clipboard-check"></i>
                                </div>
                                <div>
                                  <div className="font-medium">{instance.name || 'Checklist'}</div>
                                  <div className="text-sm text-muted">{instance.description || 'Osobní checklist'}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                <span className={`status-pill ${completedCount === totalCount && totalCount > 0 ? 'success' : 'warning'}`} style={{ fontSize: '0.75rem' }}>
                                  {completedCount}/{totalCount}
                                </span>
                                <i className="fas fa-chevron-right" style={{ color: 'var(--gray-400)' }}></i>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--gray-500)' }}>
                        Zatím nejsou přiřazeny žádné checklisty pro tuto loď. Organizátor může přiřadit checklisty v nastavení.
                      </p>
                    )
                  ) : (
                    <p style={{ color: 'var(--gray-500)' }}>
                      Zatím ti není přiřazena žádná loď. Organizátor ti přiřadí loď později, poté budou dostupné checklisty.
                    </p>
                  )}
                </div>
              </div>

              <aside>
                <div className="sidebar-card animate-in delay-1">
                  <h4>
                    <i className="fas fa-info-circle" style={{ color: 'var(--turquoise)' }}></i>
                    Tip
                  </h4>
                  <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>
                    Kliknutím na checklist ho otevřete. Položky můžete označovat jako splněné a váš postup se automaticky ukládá.
                  </p>
                </div>
              </aside>
            </div>
          )}

          {/* Checklist Detail Modal */}
          {activeTab === 'checklisty' && activeChecklist && (() => {
            const instance = checklistInstances.find(i => i.id === activeChecklist)
            if (!instance) {
              setActiveChecklist(null)
              return null
            }
            
            const completedCount = instance.items?.filter(item => item.completed).length || 0
            const totalCount = instance.items?.length || 0

            // Group items by category
            const itemsByCategory = {}
            const uncategorizedItems = []
            
            instance.items?.forEach((item, idx) => {
              const itemId = item.id || idx.toString()
              const category = item.category || ''
              if (category) {
                if (!itemsByCategory[category]) {
                  itemsByCategory[category] = []
                }
                itemsByCategory[category].push({ ...item, itemId })
              } else {
                uncategorizedItems.push({ ...item, itemId })
              }
            })
            
            return (
                <div className="card">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <button
                        className="btn btn-icon btn-ghost"
                        onClick={() => setActiveChecklist(null)}
                        style={{ marginRight: 'var(--space-sm)' }}
                      >
                        <i className="fas fa-arrow-left"></i>
                      </button>
                      <h4 className="card-title">
                        <i className="fas fa-clipboard-check" style={{ color: 'var(--turquoise)' }}></i>
                        {instance.name || 'Checklist'}
                      </h4>
                    </div>
                    <span className={`status-pill ${completedCount === totalCount && totalCount > 0 ? 'success' : 'warning'}`}>
                      {completedCount}/{totalCount}
                    </span>
                  </div>
                  
                  <div style={{ padding: 'var(--space-xl)' }}>
                  {instance.description && (
                    <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                      {instance.description}
                    </p>
                  )}
                  
                  {instance.items && instance.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                      {/* Items grouped by category */}
                      {Object.keys(itemsByCategory).map(category => (
                        <div key={category}>
                          <div style={{ 
                            fontSize: '0.875rem', 
                            fontWeight: 600, 
                            color: 'var(--gray-700)', 
                            marginBottom: 'var(--space-sm)',
                            paddingBottom: 'var(--space-xs)',
                            borderBottom: '1px solid var(--gray-200)'
                          }}>
                            {category}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {itemsByCategory[category].map((item) => {
                              const inputType = item.inputType || 'checkbox'
                              const allowNote = item.allowNote || false
                              const isCompleted = item.completed || false
                              const currentValue = item.value !== undefined ? item.value : (isCompleted ? true : '')
                              
                              return (
                                <div
                                  key={item.itemId}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-xs)',
                                    padding: 'var(--space-sm)',
                                    background: isCompleted && inputType === 'checkbox' ? 'rgba(16, 185, 129, 0.1)' : 'var(--white)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: `1px solid ${isCompleted && inputType === 'checkbox' ? 'var(--success)' : 'var(--gray-200)'}`
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    {inputType === 'checkbox' ? (
                                      <input
                                        type="checkbox"
                                        checked={isCompleted}
                                        onChange={async () => {
                                          const newCompleted = !isCompleted
                                          // Optimistic update
                                          setChecklistInstances(prev => prev.map(inst => {
                                            if (inst.id === instance.id) {
                                              return {
                                                ...inst,
                                                items: inst.items.map(it => {
                                                  if ((it.id || it.itemId) === item.itemId) {
                                                    return { ...it, completed: newCompleted }
                                                  }
                                                  return it
                                                })
                                              }
                                            }
                                            return inst
                                          }))
                                          // Save to backend
                                          await checklistService.updateItem(instance.id, item.itemId, {
                                            completed: newCompleted
                                          })
                                        }}
                                      />
                                    ) : null}
                                    <span style={{ flex: 1, textDecoration: isCompleted && inputType === 'checkbox' ? 'line-through' : 'none', opacity: isCompleted && inputType === 'checkbox' ? 0.7 : 1 }}>
                                      {item.name || item.text || 'Položka'}
                                    </span>
                                    {inputType === 'number' && (
                                      <input
                                        type="number"
                                        className="form-input"
                                        style={{ width: '100px', fontSize: '0.875rem' }}
                                        value={currentValue}
                                        onChange={async (e) => {
                                          const newValue = e.target.value ? parseFloat(e.target.value) : null
                                          // Optimistic update
                                          setChecklistInstances(prev => prev.map(inst => {
                                            if (inst.id === instance.id) {
                                              return {
                                                ...inst,
                                                items: inst.items.map(it => {
                                                  if ((it.id || it.itemId) === item.itemId) {
                                                    return { ...it, value: newValue, completed: newValue !== null && newValue !== '' }
                                                  }
                                                  return it
                                                })
                                              }
                                            }
                                            return inst
                                          }))
                                          // Save to backend
                                          await checklistService.updateItem(instance.id, item.itemId, {
                                            value: newValue,
                                            completed: newValue !== null && newValue !== ''
                                          })
                                        }}
                                        placeholder="0"
                                      />
                                    )}
                                    {inputType === 'text' && (
                                      <input
                                        type="text"
                                        className="form-input"
                                        style={{ width: '200px', fontSize: '0.875rem' }}
                                        value={currentValue || ''}
                                        onChange={async (e) => {
                                          const newValue = e.target.value
                                          // Optimistic update
                                          setChecklistInstances(prev => prev.map(inst => {
                                            if (inst.id === instance.id) {
                                              return {
                                                ...inst,
                                                items: inst.items.map(it => {
                                                  if ((it.id || it.itemId) === item.itemId) {
                                                    return { ...it, value: newValue, completed: newValue !== '' }
                                                  }
                                                  return it
                                                })
                                              }
                                            }
                                            return inst
                                          }))
                                          // Save to backend
                                          await checklistService.updateItem(instance.id, item.itemId, {
                                            value: newValue,
                                            completed: newValue !== ''
                                          })
                                        }}
                                        placeholder="Zadejte text..."
                                      />
                                    )}
                  </div>
                                  {allowNote && (
                                    <div style={{ marginTop: 'var(--space-xs)' }}>
                                      <input
                                        type="text"
                                        className="form-input"
                                        style={{ width: '100%', fontSize: '0.875rem' }}
                                        value={item.note || ''}
                                        onChange={async (e) => {
                                          const newNote = e.target.value
                                          // Optimistic update
                                          setChecklistInstances(prev => prev.map(inst => {
                                            if (inst.id === instance.id) {
                                              return {
                                                ...inst,
                                                items: inst.items.map(it => {
                                                  if ((it.id || it.itemId) === item.itemId) {
                                                    return { ...it, note: newNote }
                                                  }
                                                  return it
                                                })
                                              }
                                            }
                                            return inst
                                          }))
                                          // Save to backend
                                          await checklistService.updateItem(instance.id, item.itemId, {
                                            note: newNote
                                          })
                                        }}
                                        placeholder="Poznámka (volitelně)..."
                                      />
                </div>
                                  )}
                                  {!allowNote && item.note && (
                                    <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: 'var(--space-xs)' }}>
                                      <i className="fas fa-sticky-note"></i> {item.note}
                                    </div>
                                  )}
              </div>
            )
                            })}
        </div>
                        </div>
                      ))}
                      
                      {/* Uncategorized items */}
                      {uncategorizedItems.length > 0 && (
                        <div>
                          {Object.keys(itemsByCategory).length > 0 && (
          <div style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: 600, 
                              color: 'var(--gray-700)', 
                              marginBottom: 'var(--space-sm)',
                              paddingBottom: 'var(--space-xs)',
                              borderBottom: '1px solid var(--gray-200)'
                            }}>
                              Ostatní
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {uncategorizedItems.map((item) => {
                              const inputType = item.inputType || 'checkbox'
                              const allowNote = item.allowNote || false
                              const isCompleted = item.completed || false
                              const currentValue = item.value !== undefined ? item.value : (isCompleted ? true : '')
                              
                              return (
                                <div
                                  key={item.itemId}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-xs)',
                                    padding: 'var(--space-sm)',
                                    background: isCompleted && inputType === 'checkbox' ? 'rgba(16, 185, 129, 0.1)' : 'var(--white)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: `1px solid ${isCompleted && inputType === 'checkbox' ? 'var(--success)' : 'var(--gray-200)'}`
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    {inputType === 'checkbox' ? (
                                      <input
                                        type="checkbox"
                                        checked={isCompleted}
                                        onChange={async () => {
                                          const newCompleted = !isCompleted
                                          // Optimistic update
                                          setChecklistInstances(prev => prev.map(inst => {
                                            if (inst.id === instance.id) {
                                              return {
                                                ...inst,
                                                items: inst.items.map(it => {
                                                  if ((it.id || it.itemId) === item.itemId) {
                                                    return { ...it, completed: newCompleted }
                                                  }
                                                  return it
                                                })
                                              }
                                            }
                                            return inst
                                          }))
                                          // Save to backend
                                          await checklistService.updateItem(instance.id, item.itemId, {
                                            completed: newCompleted
                                          })
                                        }}
                                      />
                                    ) : null}
                                    <span style={{ flex: 1, textDecoration: isCompleted && inputType === 'checkbox' ? 'line-through' : 'none', opacity: isCompleted && inputType === 'checkbox' ? 0.7 : 1 }}>
                                      {item.name || item.text || 'Položka'}
                                    </span>
                                    {inputType === 'number' && (
                                      <input
                                        type="number"
                                        className="form-input"
                                        style={{ width: '100px', fontSize: '0.875rem' }}
                                        value={currentValue}
                                        onChange={async (e) => {
                                          const newValue = e.target.value ? parseFloat(e.target.value) : null
                                          // Optimistic update
                                          setChecklistInstances(prev => prev.map(inst => {
                                            if (inst.id === instance.id) {
                                              return {
                                                ...inst,
                                                items: inst.items.map(it => {
                                                  if ((it.id || it.itemId) === item.itemId) {
                                                    return { ...it, value: newValue, completed: newValue !== null && newValue !== '' }
                                                  }
                                                  return it
                                                })
                                              }
                                            }
                                            return inst
                                          }))
                                          // Save to backend
                                          await checklistService.updateItem(instance.id, item.itemId, {
                                            value: newValue,
                                            completed: newValue !== null && newValue !== ''
                                          })
                                        }}
                                        placeholder="0"
                                      />
                                    )}
                                    {inputType === 'text' && (
                                      <input
                                        type="text"
                                        className="form-input"
                                        style={{ width: '200px', fontSize: '0.875rem' }}
                                        value={currentValue || ''}
                                        onChange={async (e) => {
                                          const newValue = e.target.value
                                          // Optimistic update
                                          setChecklistInstances(prev => prev.map(inst => {
                                            if (inst.id === instance.id) {
                                              return {
                                                ...inst,
                                                items: inst.items.map(it => {
                                                  if ((it.id || it.itemId) === item.itemId) {
                                                    return { ...it, value: newValue, completed: newValue !== '' }
                                                  }
                                                  return it
                                                })
                                              }
                                            }
                                            return inst
                                          }))
                                          // Save to backend
                                          await checklistService.updateItem(instance.id, item.itemId, {
                                            value: newValue,
                                            completed: newValue !== ''
                                          })
                                        }}
                                        placeholder="Zadejte text..."
                                      />
                                    )}
          </div>
                                  {allowNote && (
                                    <div style={{ marginTop: 'var(--space-xs)' }}>
                                      <input
                                        type="text"
                                        className="form-input"
                                        style={{ width: '100%', fontSize: '0.875rem' }}
                                        value={item.note || ''}
                                        onChange={async (e) => {
                                          const newNote = e.target.value
                                          // Optimistic update
                                          setChecklistInstances(prev => prev.map(inst => {
                                            if (inst.id === instance.id) {
                                              return {
                                                ...inst,
                                                items: inst.items.map(it => {
                                                  if ((it.id || it.itemId) === item.itemId) {
                                                    return { ...it, note: newNote }
                                                  }
                                                  return it
                                                })
                                              }
                                            }
                                            return inst
                                          }))
                                          // Save to backend
                                          await checklistService.updateItem(instance.id, item.itemId, {
                                            note: newNote
                                          })
                                        }}
                                        placeholder="Poznámka (volitelně)..."
                                      />
        </div>
                                  )}
                                  {!allowNote && item.note && (
                                    <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: 'var(--space-xs)' }}>
                                      <i className="fas fa-sticky-note"></i> {item.note}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--gray-500)' }}>Tento checklist neobsahuje žádné položky.</p>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </main>

      {/* Participation Management Modal (Desktop) */}
      {!isMobile && (
        <ParticipationManagementModal
          isOpen={showParticipationModal}
          onClose={() => setShowParticipationModal(false)}
          participantId={participant?.id}
          tripName={trip?.name}
        />
      )}

      {/* Participation Management BottomDrawer (Mobile) */}
      {isMobile && (
        <BottomDrawer
          isOpen={showParticipationModal}
          onClose={() => setShowParticipationModal(false)}
          title="Správa účasti"
        >
          <ParticipationManagementContent
            participantId={participant?.id}
            tripName={trip?.name}
            onClose={() => setShowParticipationModal(false)}
          />
        </BottomDrawer>
      )}
    </>
  )
}

// Content component for BottomDrawer
function ParticipationManagementContent({ participantId, tripName, onClose }) {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

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
    <div style={{ padding: 'var(--space-md) 0' }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
        <button
          className="btn"
          onClick={handleLeaveTrip}
          disabled={leaving}
          style={{ 
            background: 'var(--danger)',
            borderColor: 'var(--danger)',
            color: 'white',
            width: '100%'
          }}
        >
          <i className="fas fa-user-minus"></i>
          {leaving ? 'Odhlašování...' : 'Nezůčastnit se plavby'}
        </button>
      </div>
    </div>
  )
}
