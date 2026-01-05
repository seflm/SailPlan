import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { participantService } from '../services/participantService'
import { boatService } from '../services/boatService'
import { timelineService } from '../services/timelineService'
import { checklistService } from '../services/checklistService'
import { organizerService } from '../services/organizerService'
import { loadUserProfiles } from '../utils/userDisplay'
import { getUserTripRoles, getRoleLabel } from '../utils/permissions'
import CrewlistView from '../components/CrewlistView'
import ChecklistView from '../components/ChecklistView'
import TripInfoCard from '../components/TripInfoCard'
import TripLocationCard from '../components/TripLocationCard'
import UsefulLinksCard from '../components/UsefulLinksCard'
import ContactsCard from '../components/ContactsCard'
import BeforeTripTab from '../components/BeforeTripTab'
import BoatLogView from '../components/BoatLogView'
import ParticipationManagementModal from '../components/ParticipationManagementModal'
import './TripDetail.css'

export default function TripCaptain() {
  const { tripId } = useParams()
  const { user } = useAuthState()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [boat, setBoat] = useState(null)
  const [boatParticipants, setBoatParticipants] = useState([])
  const [timelineEvents, setTimelineEvents] = useState([])
  const [eventCompletions, setEventCompletions] = useState({})
  const [checklistInstances, setChecklistInstances] = useState([])
  const [organizerContacts, setOrganizerContacts] = useState(null)
  const [userProfiles, setUserProfiles] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('prehled')
  const [activeChecklist, setActiveChecklist] = useState(null)
  const [showParticipationModal, setShowParticipationModal] = useState(false)

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
          
          // Load checklist instances for this user
          // Load all instances assigned to this user's userId first (these are user-specific)
          const { instances: userInstances } = await checklistService.getTripInstances(tripId, { 
            userId: user.uid
          })
          
          // Also load instances assigned to the boat (these are boat-specific, not user-specific)
          const { instances: boatInstances } = await checklistService.getTripInstances(tripId, { 
            boatId: boatData.id
          })
          
          // Combine and deduplicate by templateId (prefer user instances over boat instances)
          const allInstances = []
          const seenTemplateIds = new Set()
          
          // Add user instances first (these take priority)
          if (userInstances) {
              userInstances.forEach(inst => {
              if (inst.templateId && !seenTemplateIds.has(inst.templateId)) {
                seenTemplateIds.add(inst.templateId)
                allInstances.push(inst)
              }
            })
          }
          
          // Add boat instances that don't have a user instance with the same templateId
          if (boatInstances) {
            boatInstances.forEach(inst => {
              if (inst.templateId && !seenTemplateIds.has(inst.templateId)) {
                seenTemplateIds.add(inst.templateId)
                allInstances.push(inst)
              }
            })
          }
          
          setChecklistInstances(allInstances)
        }
      }
    }

    // Load timeline events
    const { events, error: eventsError } = await timelineService.getTripEvents(tripId)
    if (!eventsError && events) {
      // Filter events for captain role
      const filteredEvents = events.filter(event => {
        if (!event.roles || event.roles.length === 0) return true
        return event.roles.includes('captain')
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
      const date = new Date(dateTime)
      return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateTime
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

  if (!trip || !participant || participant.role !== 'captain') {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <h2>Plavba nenalezena nebo nejsi kapitánem</h2>
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
                    const currentView = 'captain'
                    
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
                        const viewPath = role === 'organizer' ? `/trip/${tripId}/organizer` : `/trip/${tripId}/participant`
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
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>Organizuje</div>
                <div style={{ fontWeight: 600, color: 'var(--white)' }}>{organizerContacts?.name || 'Organizátor'}</div>
              </div>
            </div>
            
            <div className="trip-header-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
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
              
              {/* Settings button */}
              <button
                onClick={() => setShowParticipationModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: 'var(--space-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color var(--transition-fast)',
                  fontSize: '0.875rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                }}
                title="Správa účasti"
              >
                <i className="fas fa-cog"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Tabs */}
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
              <i className="fas fa-users"></i>
              Crew list
            </button>
            <button
              className={`trip-tab ${activeTab === 'checklisty' ? 'active' : ''}`}
              onClick={() => setActiveTab('checklisty')}
            >
              <i className="fas fa-tasks"></i>
              Checklisty
            </button>
            <button
              className={`trip-tab ${activeTab === 'lodni-denik' ? 'active' : ''}`}
              onClick={() => setActiveTab('lodni-denik')}
            >
              <i className="fas fa-book"></i>
              Lodní deník
            </button>
          </div>
        </div>
      </div>

      {/* Trip Content */}
      <main className="trip-content">
        <div className="container">
          {/* TAB: Přehled */}
          {activeTab === 'prehled' && (
            <>
              {/* Captain Notice */}
              {boat && (
                <div className="admin-panel animate-in" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05), rgba(6, 182, 212, 0.1))', borderColor: 'rgba(6, 182, 212, 0.2)', marginBottom: 'var(--space-xl)' }}>
                  <div className="admin-panel-header" style={{ color: 'var(--turquoise)' }}>
                    <i className="fas fa-ship"></i>
                    Jste kapitánem lodě {boat.name || 'Bez názvu'}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                    Jako kapitán máte přístup k crew listu vaší posádky, můžete vyplňovat checklisty předání lodě a vést lodní deník.
                  </p>
                </div>
              )}
            <div className="trip-layout">
              {/* Main Content */}
              <div className="main-content">
                {/* Karta: Informace o plavbě */}
                <TripInfoCard trip={trip} />

                {/* Karta: Lokalita */}
                <TripLocationCard trip={trip} />
              </div>

              {/* Sidebar */}
              <aside>
                {/* Contacts Card */}
                {organizerContacts && (
                  <ContactsCard contacts={[{
                    ...organizerContacts,
                    role: 'organizer'
                  }]} />
                )}
                
                {/* Useful Links Card */}
                {trip.usefulLinks && trip.usefulLinks.length > 0 && (
                  <UsefulLinksCard usefulLinks={trip.usefulLinks} />
                )}
                
                {/* Quick Stats */}
                <div className="sidebar-card animate-in" style={{ marginBottom: 'var(--space-lg)' }}>
                  <h4>
                    <i className="fas fa-chart-bar" style={{ color: 'var(--turquoise)' }}></i>
                    Přehled
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-muted">Vaše loď</span>
                      <span className="font-semibold">{boat?.name || 'Nepřiřazeno'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-muted">Posádka</span>
                      <span className="font-semibold">{boatParticipants.length} osob</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-muted">Crew list</span>
                      <span className="status-pill success" style={{ fontSize: '0.75rem' }}>Kompletní</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-muted">Checklisty lodě</span>
                      <span className="status-pill warning" style={{ fontSize: '0.75rem' }}>1 k vyplnění</span>
                    </div>
                  </div>
                </div>

              </aside>
            </div>
            </>
          )}

          {/* TAB: Před plavbou */}
          {activeTab === 'pred-plavbou' && (
            <BeforeTripTab
              events={timelineEvents}
              eventCompletions={eventCompletions}
              onEventToggle={handleEventToggle}
              viewType="captain"
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
                            <i className="fas fa-anchor"></i> Váš kapitanát
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

                    {/* Crew List with Subrole Editing */}
                    <div className="card animate-in delay-1">
                      <div className="card-header">
                        <h4 className="card-title">
                          <i className="fas fa-users" style={{ color: 'var(--turquoise)' }}></i>
                          Posádka ({boatParticipants.length}{boat.capacity ? `/${boat.capacity}` : ''})
                        </h4>
                        <span className="text-sm text-muted">Jako kapitán můžete měnit podrole</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {boatParticipants.map((p) => {
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
                                <h5 style={{ margin: 0, marginBottom: 'var(--space-xs)' }}>
                                  {displayName}
                                </h5>
                                <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                                  {isCaptain ? 'Kapitán' : 'Posádka'}
                                </p>
                              </div>
                              {isCaptain ? (
                                <span className="crew-badge" style={{ padding: 'var(--space-xs) var(--space-md)', background: 'var(--turquoise)', color: 'white', borderRadius: 'var(--radius-full)', fontSize: '0.875rem' }}>
                                  Kapitán
                                </span>
                              ) : (
                                <select
                                  className="form-input"
                                  style={{ width: 'auto', minWidth: '150px', padding: 'var(--space-xs) var(--space-sm)', fontSize: '0.875rem' }}
                                  defaultValue=""
                                  onChange={async (e) => {
                                    // TODO: Implement subrole update when subrole field is added to data model
                                    console.log('Subrole update:', p.id, e.target.value)
                                  }}
                                >
                                  <option value="">Bez podrole</option>
                                  <option value="kormidelnik">Kormidelník</option>
                                  <option value="mastman">Mastman</option>
                                  <option value="bowman">Bowman</option>
                                </select>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Checklists Card */}
                    {(() => {
                      // Filter only boat checklists (not personal ones)
                      const boatChecklists = checklistInstances.filter(inst => inst.boatId && !inst.userId)
                      return boatChecklists.length > 0 && (
                        <div className="card animate-in delay-2">
                          <div className="card-header">
                            <h4 className="card-title">
                              <i className="fas fa-tasks" style={{ color: 'var(--turquoise)' }}></i>
                              Checklisty lodě
                            </h4>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => setActiveTab('checklisty')}
                            >
                              Zobrazit všechny
                              <i className="fas fa-chevron-right" style={{ marginLeft: 'var(--space-xs)' }}></i>
                            </button>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {boatChecklists.slice(0, 3).map((instance) => {
                            const completedCount = instance.items?.filter(item => item.completed).length || 0
                            const totalCount = instance.items?.length || 0
                            
                            return (
                              <div
                                key={instance.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: 'var(--space-md)',
                                  background: 'var(--gray-50)',
                                  borderRadius: 'var(--radius-md)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                                onClick={() => {
                                  setActiveChecklist(instance.id)
                                  setActiveTab('checklisty')
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    background: 'rgba(6, 182, 212, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--turquoise)',
                                    fontSize: '1rem'
                                  }}>
                                    <i className="fas fa-clipboard-check"></i>
                                  </div>
                                  <div>
                                    <div className="font-medium" style={{ fontSize: '0.875rem' }}>{instance.name || 'Checklist'}</div>
                                    <div className="text-sm text-muted" style={{ fontSize: '0.75rem' }}>
                                      {instance.userId === user.uid ? 'Osobní' : 'Checklist lodě'}
                                    </div>
                                  </div>
                                </div>
                                <span className={`status-pill ${completedCount === totalCount && totalCount > 0 ? 'success' : 'warning'}`} style={{ fontSize: '0.75rem' }}>
                                  {completedCount}/{totalCount}
                                </span>
                              </div>
                            )
                          })}
                          {boatChecklists.length > 3 && (
                            <div style={{ textAlign: 'center', paddingTop: 'var(--space-sm)' }}>
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => setActiveTab('checklisty')}
                              >
                                Zobrazit všechny checklisty ({boatChecklists.length})
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      )
                    })()}
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
              
              {boat ? (
                <CrewlistView
                  tripId={tripId}
                  boatId={boat.id}
                  canEdit={true}
                  userId={user.uid}
                  viewContext="captain"
                  trip={trip}
                />
              ) : (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
              <p style={{ color: 'var(--gray-500)' }}>
                    Zatím ti není přiřazena žádná loď.
              </p>
                </div>
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
                                  <div className="text-sm text-muted">
                                    {instance.userId === user.uid ? 'Osobní checklist' : 
                                     instance.boatId ? 'Checklist lodě' : 
                                     instance.description || 'Checklist'}
                                  </div>
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

          {/* Checklist Detail View */}
          {activeTab === 'checklisty' && activeChecklist && (() => {
            const instance = checklistInstances.find(i => i.id === activeChecklist)
            if (!instance) {
              setActiveChecklist(null)
              return null
            }
            
            const completedCount = instance.items?.filter(item => item.completed).length || 0
            const totalCount = instance.items?.length || 0
            
            const handleChecklistUpdate = (updatedInstance) => {
              setChecklistInstances(prev => prev.map(inst => 
                inst.id === updatedInstance.id ? updatedInstance : inst
              ))
            }
            
            return (
              <div className="main-content">
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
                    <ChecklistView 
                      instance={instance} 
                      onUpdate={handleChecklistUpdate}
                      canEdit={true}
                      canView={true}
                      isOwnChecklist={true}
                      defaultMode="edit"
                    />
                                  </div>
                </div>
              </div>
            )
          })()}

          {/* TAB: Lodní deník */}
          {activeTab === 'lodni-denik' && (
            <div className="trip-layout">
              <div className="main-content">
                <div className="card animate-in">
                  {boat ? (
                    <BoatLogView
                      tripId={tripId}
                      boatId={boat.id}
                      boatName={boat.name || 'Bez názvu'}
                      canEdit={true}
                      canView={true}
                      showStats={true}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
                      Zatím ti není přiřazena žádná loď.
                    </div>
                  )}
                </div>
              </div>

              <aside>
                {boat && (
                  <BoatLogView
                    tripId={tripId}
                    boatId={boat.id}
                    boatName={boat.name || 'Bez názvu'}
                    canEdit={false}
                    canView={true}
                    showStats={true}
                    statsOnly={true}
                  />
                )}
              </aside>
            </div>
          )}

        </div>
      </main>

      {/* Participation Management Modal */}
      <ParticipationManagementModal
        isOpen={showParticipationModal}
        onClose={() => setShowParticipationModal(false)}
        participantId={participant?.id}
        tripName={trip?.name}
      />

    </>
  )
}
