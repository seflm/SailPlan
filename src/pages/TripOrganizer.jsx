import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { participantService } from '../services/participantService'
import { boatService } from '../services/boatService'
import { timelineService } from '../services/timelineService'
import { documentService } from '../services/documentService'
import { checklistService } from '../services/checklistService'
import { crewlistService } from '../services/crewlistService'
import { canEditTrip, canManageParticipants, canManageBoats, canManageDocuments, canManageTimelineEvents, getUserTripRoles, getRoleLabel } from '../utils/permissions'
import { loadUserProfiles } from '../utils/userDisplay'
import AddParticipantModal from '../components/AddParticipantModal'
import CrewlistView from '../components/CrewlistView'
import ChecklistView from '../components/ChecklistView'
import TripInfoCard from '../components/TripInfoCard'
import TripLocationCard from '../components/TripLocationCard'
import UsefulLinksCard from '../components/UsefulLinksCard'
import BoatCard from '../components/BoatCard'
import BeforeTripTab from '../components/BeforeTripTab'
import './TripDetail.css'

export default function TripOrganizer() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthState()
  const [trip, setTrip] = useState(null)
  const [participants, setParticipants] = useState([])
  const [boats, setBoats] = useState([])
  const [timelineEvents, setTimelineEvents] = useState([])
  const [eventCompletions, setEventCompletions] = useState({})
  const [documents, setDocuments] = useState([])
  const [checklistInstances, setChecklistInstances] = useState([])
  const [crewlistData, setCrewlistData] = useState([])
  const [userProfiles, setUserProfiles] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('prehled')
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [showTimelineModal, setShowTimelineModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [activeChecklist, setActiveChecklist] = useState(null)

  useEffect(() => {
    if (tripId && user) {
      loadTripData()
    }
  }, [tripId, user])

  // Check URL hash to set active tab
  useEffect(() => {
    const hash = window.location.hash
    if (hash === '#crew-listy') {
      setActiveTab('crew-listy')
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
      if (hash === '#crew-listy') {
        setActiveTab('crew-listy')
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
    
    const [tripResult, participantsResult, boatsResult, documentsResult] = await Promise.all([
      tripService.getTrip(tripId),
      participantService.getTripParticipants(tripId),
      boatService.getTripBoats(tripId),
      documentService.getTripDocuments(tripId)
    ])

    if (tripResult.data) {
      setTrip(tripResult.data)
    }

    // Always set participants, even if empty array
    const allParticipants = participantsResult.participants || []
    
    // Check if organizer is already in participants list
    if (tripResult.data && user && tripResult.data.organizerId === user.uid) {
      const organizerInList = allParticipants.find(p => p.userId === user.uid)
      if (!organizerInList) {
        // Organizer is not in the list, but we'll show them in the UI if they're also a participant
        // This is handled in the UI rendering
      }
    }
    
    setParticipants(allParticipants)
    
    // Load user profiles for all participants
    const userIds = allParticipants.map(p => p.userId)
    if (userIds.length > 0) {
      const profiles = await loadUserProfiles(userIds)
      setUserProfiles(profiles)
    }
    
    // Log error if there was one (for debugging)
    if (participantsResult.error) {
      console.error('Error loading participants:', participantsResult.error)
    }

    if (boatsResult.boats) {
      setBoats(boatsResult.boats)
    }

    if (documentsResult.documents) {
      setDocuments(documentsResult.documents)
    }

    // Load checklist instances
    // Filter to avoid duplicates: if organizer is also a participant, 
    // show only organizer role instances (not userId-specific ones) in organizer view
    const { instances } = await checklistService.getTripInstances(tripId)
    if (instances) {
      // If organizer is also a participant, filter out instances assigned to their userId
      // to avoid showing the same checklist twice
      const organizerParticipant = allParticipants.find(p => p.userId === user?.uid)
      if (organizerParticipant && tripResult.data?.organizerId === user?.uid) {
        // Filter: keep organizer role instances (role='organizer' without userId) 
        // and instances assigned to boats or other users, but exclude instances assigned to organizer's userId
        const filteredInstances = instances.filter(inst => {
          // Keep if it's an organizer role instance (no userId)
          if (inst.role === 'organizer' && !inst.userId) return true
          // Keep if it's assigned to a boat
          if (inst.boatId) return true
          // Keep if it's assigned to another user
          if (inst.userId && inst.userId !== user.uid) return true
          // Exclude if it's assigned to organizer's userId
          return false
        })
        setChecklistInstances(filteredInstances)
      } else {
        setChecklistInstances(instances)
      }
    }

    // Load crewlist data
    const { data: crewlistDataResult } = await crewlistService.getTripCrewlistData(tripId)
    if (crewlistDataResult) {
      setCrewlistData(crewlistDataResult)
    }

    // Load timeline events
    const { events, error: eventsError } = await timelineService.getTripEvents(tripId)
    if (!eventsError && events) {
      setTimelineEvents(events)
      
      // Load all completions for organizer view
      const { completions, error: completionsError } = await timelineService.getTripCompletions(tripId)
      if (!completionsError && completions) {
        // Group completions by eventId
        const completionsMap = {}
        completions.forEach(completion => {
          if (!completionsMap[completion.eventId]) {
            completionsMap[completion.eventId] = []
          }
          if (completion.completed) {
            completionsMap[completion.eventId].push(completion.userId)
          }
        })
        setEventCompletions(completionsMap)
      }
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

  const getRoleLabel = (role) => {
    const labels = {
      'participant': 'Účastník',
      'captain': 'Kapitán',
      'organizer': 'Organizátor'
    }
    return labels[role] || role
  }

  const handleAddParticipant = async (userId, role, boatId) => {
    const { id, error } = await participantService.addParticipant(tripId, userId, role, boatId || null)
    if (!error) {
      await loadTripData()
      setShowAddParticipant(false)
    } else {
      alert('Chyba při přidávání účastníka: ' + error)
    }
  }

  const handleRemoveParticipant = async (participantId) => {
    const participant = participants.find(p => p.id === participantId)
    const isOrganizer = participant && participant.userId === user.uid
    const message = isOrganizer 
      ? 'Opravdu chcete odstranit sebe ze seznamu účastníků? (Zůstaneš organizátorem plavby.)'
      : 'Opravdu chcete odstranit tohoto účastníka?'
    
    if (confirm(message)) {
      const { error } = await participantService.removeParticipant(participantId)
      if (!error) {
        // Update local state without reloading
        setParticipants(prev => prev.filter(p => p.id !== participantId))
      } else {
        alert('Chyba při odstraňování účastníka: ' + error)
      }
    }
  }

  const handleUpdateParticipantRole = async (participantId, newRole) => {
    const { error } = await participantService.updateParticipantRole(participantId, newRole)
    if (!error) {
      // Update local state without reloading
      setParticipants(prev => prev.map(p => 
        p.id === participantId ? { ...p, role: newRole } : p
      ))
    } else {
      alert('Chyba při aktualizaci role: ' + error)
    }
  }

  const handleUpdateParticipantBoat = async (participantId, newBoatId) => {
    const { error } = await participantService.assignToBoat(participantId, newBoatId || null)
    if (!error) {
      // Update local state without reloading
      setParticipants(prev => prev.map(p => 
        p.id === participantId ? { ...p, boatId: newBoatId || null } : p
      ))
    } else {
      alert('Chyba při aktualizaci lodě: ' + error)
    }
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

  if (!trip) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <h2>Plavba nenalezena</h2>
          <Link to="/organizing" className="btn btn-primary">Zpět na plavby</Link>
        </div>
      </div>
    )
  }

  // Check if user is organizer
  if (!trip || !user) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--gray-500)' }}>
          Načítání...
        </div>
      </div>
    )
  }

  if (!canEditTrip(trip, user.uid)) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <h2>Nemáš oprávnění k této plavbě</h2>
          <Link to="/organizing" className="btn btn-primary">Zpět na plavby</Link>
        </div>
      </div>
    )
  }

  const participantCount = participants.length
  const boatCount = boats.length
  const daysUntil = getDaysUntil(trip.startDate)

  // Helper function to calculate crewlist completion stats
  const getCrewlistStats = () => {
    const systemFields = ['id', 'tripId', 'boatId', 'userId', 'createdAt', 'updatedAt']
    let participantsWithFilledCrewlist = 0
    const totalParticipants = participants.length
    
    // Count participants (including captains) who have filled crewlist
    participants.forEach(participant => {
      if (!participant.boatId) return // Skip participants without boat assignment
      
      const userCrewlist = crewlistData.find(c => 
        c.boatId === participant.boatId && 
        c.userId === participant.userId
      )
      
      if (userCrewlist) {
        // Check if there are any non-system fields with values
        const hasData = Object.keys(userCrewlist).some(key => {
          if (systemFields.includes(key)) return false
          const value = userCrewlist[key]
          return value !== null && value !== undefined && value !== ''
        })
        
        if (hasData) {
          participantsWithFilledCrewlist++
        }
      }
    })
    
    return {
      complete: participantsWithFilledCrewlist,
      total: totalParticipants,
      percentage: totalParticipants > 0 ? (participantsWithFilledCrewlist / totalParticipants * 100) : 0
    }
  }

  const crewlistStats = getCrewlistStats()

  return (
    <>
      {/* Trip Header */}
      <div 
        className="trip-header organizer"
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
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <Link to="/organizing">Organizuji</Link>
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <span>{trip.name || 'Bez názvu'}</span>
            </div>
            
            <div className="trip-title-row">
              <div>
                <h1 className="trip-title">{trip.name || 'Bez názvu'}</h1>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(() => {
                    const organizerParticipant = participants.find(p => p.userId === user.uid)
                    const allRoles = getUserTripRoles(trip, organizerParticipant, user.uid)
                    const currentView = 'organizer'
                    
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
                        const viewPath = role === 'captain' ? `/trip/${tripId}/captain` : `/trip/${tripId}/participant`
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
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowAddParticipant(true)}
                >
                  <i className="fas fa-share-alt"></i>
                  Sdílet
                </button>
                <Link to={`/trip/${tripId}/edit`} className="btn btn-primary">
                  <i className="fas fa-edit"></i>
                  Upravit plavbu
                </Link>
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
              {daysUntil !== null && (
                <div className="trip-header-meta-item">
                  <i className="fas fa-clock"></i>
                  <span>{daysUntil === 0 ? 'Začíná dnes' : daysUntil === 1 ? 'Začíná zítra' : `${daysUntil} dní do startu`}</span>
                </div>
              )}
              <div className="trip-header-meta-item">
                <i className="fas fa-ship"></i>
                <span>{boatCount} {boatCount === 1 ? 'loď' : boatCount < 5 ? 'lodě' : 'lodí'}</span>
              </div>
              <div className="trip-header-meta-item">
                <i className="fas fa-users"></i>
                <span>{participantCount} {participantCount === 1 ? 'účastník' : participantCount < 5 ? 'účastníci' : 'účastníků'}</span>
              </div>
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
              className={`trip-tab ${activeTab === 'lode' ? 'active' : ''}`}
              onClick={() => setActiveTab('lode')}
            >
              <i className="fas fa-ship"></i>
              Lodě
            </button>
            <button
              className={`trip-tab ${activeTab === 'ucastnici' ? 'active' : ''}`}
              onClick={() => setActiveTab('ucastnici')}
            >
              <i className="fas fa-users"></i>
              Účastníci
            </button>
            <button
              className={`trip-tab ${activeTab === 'crew-listy' ? 'active' : ''}`}
              onClick={() => setActiveTab('crew-listy')}
            >
              <i className="fas fa-clipboard-list"></i>
              Crew listy
            </button>
            <button
              className={`trip-tab ${activeTab === 'checklisty' ? 'active' : ''}`}
              onClick={() => setActiveTab('checklisty')}
            >
              <i className="fas fa-tasks"></i>
              Checklisty
            </button>
            <button
              className={`trip-tab ${activeTab === 'dokumenty' ? 'active' : ''}`}
              onClick={() => setActiveTab('dokumenty')}
            >
              <i className="fas fa-file-alt"></i>
              Dokumenty
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
              {/* Admin Panel */}
              <div className="admin-panel animate-in" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="admin-panel-header">
                  <i className="fas fa-crown"></i>
                  Správa plavby
                </div>
                <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                  Jako organizátor máte plný přístup ke všem funkcím správy plavby.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <Link to={`/trip/${tripId}/edit`} className="btn btn-sm btn-primary">
                    <i className="fas fa-edit"></i> Upravit plavbu
                  </Link>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => setShowAddParticipant(true)}
                  >
                    <i className="fas fa-user-plus"></i> Pozvat účastníky
                  </button>
                </div>
              </div>

              <div className="trip-layout">
                {/* Main Content */}
                <div className="main-content">
                  {/* Quick Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    <div className="card animate-in" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--coral)' }}>{participantCount}</div>
                      <div className="text-sm text-muted">Účastníků</div>
                    </div>
                    <div className="card animate-in delay-1" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--turquoise)' }}>{boatCount}</div>
                      <div className="text-sm text-muted">Lodě</div>
                    </div>
                    <div className="card animate-in delay-2" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: crewlistStats.percentage === 100 ? 'var(--success)' : 'var(--warning)' }}>
                        {crewlistStats.complete}/{crewlistStats.total}
                      </div>
                      <div className="text-sm text-muted">Crew listy</div>
                    </div>
                    <div className="card animate-in delay-3" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ocean-light)' }}>{daysUntil || '-'}</div>
                      <div className="text-sm text-muted">Dní do startu</div>
                    </div>
                  </div>

                  {/* Karta: Informace o plavbě */}
                  <TripInfoCard trip={trip} tripId={tripId} showEditButton={true} />

                  {/* Karta: Lokalita */}
                  <TripLocationCard trip={trip} />

                  {/* Karta: Lodě */}
                  <div className="card animate-in delay-2">
                    <div className="card-header">
                      <h4 className="card-title">
                        <i className="fas fa-ship" style={{ color: 'var(--turquoise)' }}></i>
                        Lodě
                      </h4>
                      <button 
                        className="btn btn-sm btn-ghost" 
                        onClick={() => setActiveTab('lode')}
                      >
                        <i className="fas fa-cog"></i> Spravovat
                      </button>
                    </div>
                    
                    {boats.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-lg)' }}>
                        {boats.map((boat) => {
                          const boatParticipants = participants.filter(p => p.boatId === boat.id)
                          return (
                            <BoatCard
                              key={boat.id}
                              boat={boat}
                              participantCount={boatParticipants.length}
                              clickable={true}
                              onClick={() => setActiveTab('lode')}
                              showDetails={true}
                              viewType="organizer"
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                        <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--space-lg)' }}>
                          Zatím nejsou žádné lodě. Přidej první loď.
                        </p>
                        <Link to={`/trip/${tripId}/boat/new`} className="btn btn-primary">
                          <i className="fas fa-plus"></i>
                          Přidat loď
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <aside>
                  {/* Status Box */}
                  <div className="sidebar-card animate-in" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h4>
                      <i className="fas fa-chart-bar" style={{ color: 'var(--turquoise)' }}></i>
                      Stav příprav
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                          <span className="text-sm text-muted">Obsazenost lodí</span>
                          <span className="text-sm font-medium">
                            {(() => {
                              const totalParticipants = participants.filter(p => p.boatId).length
                              const totalCapacity = boats.reduce((sum, boat) => sum + (boat.capacity || 0), 0)
                              return `${totalParticipants}${totalCapacity > 0 ? `/${totalCapacity}` : ''}`
                            })()}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ 
                            width: `${(() => {
                              const totalParticipants = participants.filter(p => p.boatId).length
                              const totalCapacity = boats.reduce((sum, boat) => sum + (boat.capacity || 0), 0)
                              return totalCapacity > 0 ? (totalParticipants / totalCapacity * 100) : 0
                            })()}%` 
                          }}></div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                          <span className="text-sm text-muted">Crew listy kompletní</span>
                          <span className="text-sm font-medium">{crewlistStats.complete}/{crewlistStats.total}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ 
                            width: `${crewlistStats.percentage}%`, 
                            background: 'var(--success)' 
                          }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Useful Links Card */}
                  {trip.usefulLinks && trip.usefulLinks.length > 0 && (
                    <UsefulLinksCard usefulLinks={trip.usefulLinks} />
                  )}
                </aside>
              </div>
            </>
          )}

          {/* TAB: Účastníci */}
          {activeTab === 'ucastnici' && (
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-users" style={{ color: 'var(--turquoise)' }}></i>
                  Účastníci
                </h4>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAddParticipant(true)}
                >
                  <i className="fas fa-user-plus"></i>
                  Přidat účastníka
                </button>
              </div>

              {participants.length > 0 ? (
                <div className="participants-table">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                        <th style={{ textAlign: 'left', padding: 'var(--space-md)', color: 'var(--gray-600)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Jméno</th>
                        <th style={{ textAlign: 'left', padding: 'var(--space-md)', color: 'var(--gray-600)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Role</th>
                        <th style={{ textAlign: 'left', padding: 'var(--space-md)', color: 'var(--gray-600)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Loď</th>
                        <th style={{ textAlign: 'left', padding: 'var(--space-md)', color: 'var(--gray-600)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                        <th style={{ textAlign: 'right', padding: 'var(--space-md)', color: 'var(--gray-600)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Akce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((participant) => {
                        const boat = boats.find(b => b.id === participant.boatId)
                        return (
                          <tr key={participant.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                            <td style={{ padding: 'var(--space-md)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                {(() => {
                                  const profile = userProfiles.get(participant.userId)
                                  const displayName = profile?.name || 'Neznámý uživatel'
                                  return participant.userId === user.uid ? (
                                    <strong>{displayName} (organizátor)</strong>
                                  ) : (
                                    displayName
                                  )
                                })()}
                                {participant.userId === user.uid && (
                                  <span className="status-pill info" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                    Já
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: 'var(--space-md)' }}>
                              <select
                                className="form-input badge"
                                style={{ 
                                  width: 'auto', 
                                  minWidth: '120px', 
                                  padding: 'var(--space-xs) var(--space-md) var(--space-xs) var(--space-sm)',
                                  paddingRight: 'var(--space-xl)',
                                  border: '1px solid var(--gray-200)',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: 'normal',
                                  borderRadius: 'var(--radius-sm)',
                                  transition: 'all 0.2s'
                                }}
                                value={participant.role}
                                onChange={(e) => handleUpdateParticipantRole(participant.id, e.target.value)}
                              >
                                <option value="participant">Posádka</option>
                                <option value="captain">Kapitán</option>
                              </select>
                            </td>
                            <td style={{ padding: 'var(--space-md)' }}>
                              <select
                                className="form-input badge editable-cell"
                                style={{ 
                                  width: 'auto', 
                                  minWidth: '140px', 
                                  padding: 'var(--space-xs) var(--space-md) var(--space-xs) var(--space-sm)',
                                  paddingRight: 'var(--space-xl)',
                                  border: participant.boatId ? '1px solid var(--gray-200)' : '1px solid var(--warning)',
                                  backgroundColor: participant.boatId ? 'var(--white)' : 'rgba(245, 158, 11, 0.1)',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: participant.boatId ? 'normal' : '500',
                                  color: participant.boatId ? 'var(--gray-700)' : 'var(--warning)',
                                  borderRadius: 'var(--radius-sm)',
                                  transition: 'all 0.2s'
                                }}
                                value={participant.boatId || ''}
                                onChange={(e) => handleUpdateParticipantBoat(participant.id, e.target.value)}
                              >
                                <option value="" style={{ color: 'var(--warning)', fontWeight: '500' }}>Loď nepřiřazena</option>
                                {boats.map(b => (
                                  <option key={b.id} value={b.id}>{b.name || 'Bez názvu'}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: 'var(--space-md)' }}>
                              <span className="status-pill success">{participant.status || 'confirmed'}</span>
                            </td>
                            <td style={{ padding: 'var(--space-md)', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                                <Link
                                  to={`/trip/${tripId}/participant/${participant.id}`}
                                  className="btn btn-sm btn-ghost"
                                >
                                  <i className="fas fa-eye"></i>
                                </Link>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  onClick={() => handleRemoveParticipant(participant.id)}
                                  title={participant.userId === user.uid ? 'Můžeš se smazat ze seznamu účastníků' : 'Smazat účastníka'}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                  <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--space-lg)' }}>
                    Zatím nejsou žádní účastníci. Přidej první účastníka.
                  </p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowAddParticipant(true)}
                  >
                    <i className="fas fa-user-plus"></i>
                    Přidat účastníka
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: Lodě */}
          {activeTab === 'lode' && (
            <div className="card animate-in">
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-ship" style={{ color: 'var(--turquoise)' }}></i>
                  Lodě a posádky
                </h4>
                <Link to={`/trip/${tripId}/boat/new`} className="btn btn-sm btn-primary">
                  <i className="fas fa-plus"></i>
                  Přidat loď
                </Link>
              </div>
              {boats.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
                  {boats.map((boat) => {
                    const boatParticipants = participants.filter(p => p.boatId === boat.id)
                    const boatCaptain = boatParticipants.find(p => p.role === 'captain')
                    const boatCrewlistData = crewlistData.filter(c => c.boatId === boat.id)
                    
                    // Check which participants have actually filled crewlist (not just empty records)
                    const systemFields = ['id', 'tripId', 'boatId', 'userId', 'createdAt', 'updatedAt']
                    const participantsWithFilledCrewlist = boatParticipants.filter(participant => {
                      const userCrewlist = boatCrewlistData.find(c => c.userId === participant.userId)
                      if (!userCrewlist) return false
                      // Check if there are any non-system fields with values
                      return Object.keys(userCrewlist).some(key => {
                        if (systemFields.includes(key)) return false
                        const value = userCrewlist[key]
                        return value !== null && value !== undefined && value !== ''
                      })
                    })
                    
                    const crewlistCount = participantsWithFilledCrewlist.length
                    const isCrewlistComplete = crewlistCount === boatParticipants.length && boatParticipants.length > 0
                    
                    return (
                      <div
                        key={boat.id}
                        style={{
                          background: 'var(--white)',
                          border: '1px solid var(--gray-200)',
                          borderRadius: 'var(--radius-lg)',
                          overflow: 'hidden',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--turquoise)'
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--gray-200)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <Link
                          to={`/trip/${tripId}/boat/${boat.id}`}
                          style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            display: 'block'
                          }}
                        >
                          {boat.thumbnailUrl && (
                            <div style={{ 
                              height: '150px', 
                              backgroundImage: `url(${boat.thumbnailUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}></div>
                          )}
                          <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--gray-100)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ margin: 0, marginBottom: 'var(--space-xs)', fontSize: '1.125rem' }}>
                                  {boat.model || 'Model neuveden'}
                                </h4>
                                <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                                  {boat.name || 'Bez názvu'}
                                </p>
                              </div>
                              <span className={`status-pill ${boatParticipants.length === boat.capacity && boat.capacity ? 'success' : ''}`} style={{ fontSize: '0.75rem' }}>
                                {boatParticipants.length}{boat.capacity ? `/${boat.capacity}` : ''}
                              </span>
                            </div>
                          </div>
                          <div style={{ padding: 'var(--space-lg)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Kapitán</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                  {(() => {
                                    if (!boatCaptain) return 'Nepřiřazen'
                                    const profile = userProfiles.get(boatCaptain.userId)
                                    return profile?.name || 'Neznámý uživatel'
                                  })()}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Crew list</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: isCrewlistComplete ? 'var(--success)' : 'var(--warning)' }}>
                                  {isCrewlistComplete ? 'Kompletní' : `${crewlistCount}/${boatParticipants.length}`}
                                </span>
                              </div>
                              {boat.charterLink && (
                                <div style={{ marginTop: 'var(--space-xs)', paddingTop: 'var(--space-xs)', borderTop: '1px solid var(--gray-100)' }}>
                                  <a 
                                    href={boat.charterLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-sm btn-ghost"
                                    style={{ fontSize: '0.875rem' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <i className="fas fa-external-link-alt"></i>
                                    Detail lodi
                                  </a>
                                </div>
                              )}
                            </div>
                            {boatParticipants.length > 0 && (
                              <div style={{ display: 'flex', gap: 'var(--space-xs)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                                {boatParticipants.slice(0, 6).map((p) => (
                                  <div
                                    key={p.id}
                                    className={`crew-avatar ${p.role === 'captain' ? 'captain' : ''}`}
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      fontSize: '0.7rem',
                                      marginLeft: 0
                                    }}
                                    title={(() => {
                                      const profile = userProfiles.get(p.userId)
                                      return profile?.name || 'Neznámý uživatel'
                                    })()}
                                  >
                                    {(() => {
                                      const profile = userProfiles.get(p.userId)
                                      if (profile?.name) {
                                        const nameParts = profile.name.trim().split(/\s+/)
                                        if (nameParts.length >= 2) {
                                          return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                                        } else {
                                          return profile.name.substring(0, 2).toUpperCase()
                                        }
                                      }
                                      return p.userId.substring(0, 2).toUpperCase()
                                    })()}
                                  </div>
                                ))}
                                {boatParticipants.length > 6 && (
                                  <div
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      background: 'var(--gray-200)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.7rem',
                                      color: 'var(--gray-600)',
                                      fontWeight: 600
                                    }}
                                  >
                                    +{boatParticipants.length - 6}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </Link>
                        <div style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--gray-100)', background: 'var(--gray-50)', display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                          <Link
                            to={`/trip/${tripId}/boat/${boat.id}/edit`}
                            className="btn btn-sm btn-ghost"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <i className="fas fa-edit"></i>
                            Upravit
                          </Link>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={async (e) => {
                              e.stopPropagation()
                              const boatParticipants = participants.filter(p => p.boatId === boat.id)
                              if (boatParticipants.length > 0) {
                                if (!confirm(`Na této lodi jsou přiřazeni účastníci (${boatParticipants.length}). Opravdu chcete loď smazat? Účastníci budou odpojeni od lodě.`)) {
                                  return
                                }
                              } else {
                                if (!confirm(`Opravdu chcete smazat loď "${boat.name || boat.model || 'Bez názvu'}"?`)) {
                                  return
                                }
                              }
                              
                              const { error } = await boatService.deleteBoat(boat.id)
                              if (error) {
                                alert('Chyba při mazání lodě: ' + error)
                              } else {
                                await loadTripData()
                              }
                            }}
                            style={{ color: 'var(--danger)' }}
                          >
                            <i className="fas fa-trash"></i>
                            Smazat
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                  <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--space-lg)' }}>
                    Zatím nejsou žádné lodě. Přidej první loď.
                  </p>
                  <Link to={`/trip/${tripId}/boat/new`} className="btn btn-primary">
                    <i className="fas fa-plus"></i>
                    Přidat loď
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB: Před plavbou */}
          {activeTab === 'pred-plavbou' && (
            <BeforeTripTab
              events={timelineEvents}
              eventCompletions={eventCompletions}
              viewType="organizer"
              tripId={tripId}
              participantCount={participants.length}
              trip={trip}
              onEditEvents={() => {
                setEditingEvent(null)
                setShowTimelineModal(true)
              }}
              showEditButton={true}
            />
          )}

          {/* TAB: Crew listy */}
          {activeTab === 'crew-listy' && (
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-clipboard-list" style={{ color: 'var(--turquoise)' }}></i>
                  Crew listy lodí
                </h4>
              </div>
              
              <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                Přehled vyplnění crew listů všemi loděmi.
              </p>
              
              {boats.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {boats.map((boat) => {
                    const boatCrewlistData = crewlistData.filter(c => c.boatId === boat.id)
                    const boatParticipants = participants.filter(p => p.boatId === boat.id)
                    
                    // Check which participants have actually filled crewlist (not just empty records)
                    const systemFields = ['id', 'tripId', 'boatId', 'userId', 'createdAt', 'updatedAt']
                    const participantsWithFilledCrewlist = boatParticipants.filter(participant => {
                      const userCrewlist = boatCrewlistData.find(c => c.userId === participant.userId)
                      if (!userCrewlist) return false
                      // Check if there are any non-system fields with values
                      return Object.keys(userCrewlist).some(key => {
                        if (systemFields.includes(key)) return false
                        const value = userCrewlist[key]
                        return value !== null && value !== undefined && value !== ''
                      })
                    })
                    
                    const completedCount = participantsWithFilledCrewlist.length
                    const totalCount = boatParticipants.length
                    const isComplete = completedCount === totalCount && totalCount > 0
                    
                    return (
                      <Link
                        key={boat.id}
                        to={`/trip/${tripId}/boat/${boat.id}#crew-list`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 'var(--space-lg)',
                          background: 'var(--gray-50)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'linear-gradient(135deg, var(--ocean-mid), var(--turquoise))',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '1.25rem'
                          }}>
                            <i className="fas fa-ship"></i>
                          </div>
                          <div>
                            <div className="font-medium">{boat.model || 'Model neuveden'} – {boat.name || 'Bez názvu'}</div>
                            <div className="text-sm text-muted">
                              Kapitán: {(() => {
                                const captain = boatParticipants.find(p => p.role === 'captain')
                                if (!captain) return 'Nepřiřazen'
                                const profile = userProfiles.get(captain.userId)
                                return profile?.name || 'Neznámý uživatel'
                              })()}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                          <span className={`status-pill ${isComplete ? 'success' : 'warning'}`} style={{ fontSize: '0.75rem' }}>
                            {completedCount}/{totalCount} {isComplete ? 'kompletní' : ''}
                          </span>
                          <i className="fas fa-chevron-right" style={{ color: 'var(--gray-400)' }}></i>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--gray-500)' }}>Zatím nejsou žádné lodě. Přidej první loď.</p>
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
                      <i className="fas fa-tasks" style={{ color: 'var(--turquoise)' }}></i>
                      Systémové checklisty
                    </h4>
                    <Link to="/settings/organizer" className="btn btn-sm btn-ghost">
                      <i className="fas fa-cog"></i> Spravovat checklisty
                    </Link>
                  </div>
                  
                  <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                    Přehled vyplnění checklistů všemi loděmi. Kliknutím otevřete a upravíte checklist.
                  </p>
                  
                  {checklistInstances.length > 0 ? (() => {
                    // Separate own checklists from others
                    const ownChecklists = []
                    const otherChecklists = []
                    
                    checklistInstances.forEach(instance => {
                      const isOwnChecklist = instance.role === 'organizer' && !instance.userId && !instance.boatId
                      if (isOwnChecklist) {
                        ownChecklists.push(instance)
                      } else {
                        otherChecklists.push(instance)
                      }
                    })
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                        {/* Own Checklists Section */}
                        {ownChecklists.length > 0 && (
                          <div>
                            <h5 style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: 600, 
                              color: 'var(--gray-700)', 
                              marginBottom: 'var(--space-md)',
                              paddingBottom: 'var(--space-sm)',
                              borderBottom: '2px solid rgba(249, 115, 22, 0.3)'
                            }}>
                              <i className="fas fa-user" style={{ color: 'var(--coral)', marginRight: 'var(--space-xs)' }}></i>
                              Vaše checklisty
                            </h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                              {ownChecklists.map((instance) => {
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
                                      background: 'rgba(249, 115, 22, 0.05)',
                                      borderRadius: 'var(--radius-md)',
                                      border: '1px solid rgba(249, 115, 22, 0.2)',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(249, 115, 22, 0.05)'}
                                    onClick={() => setActiveChecklist(instance.id)}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                      <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: 'rgba(249, 115, 22, 0.15)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--coral)',
                                        fontSize: '1.25rem'
                                      }}>
                                        <i className="fas fa-clipboard-check"></i>
                                      </div>
                                      <div>
                                        <div className="font-medium">{instance.name || 'Checklist'}</div>
                                        <div className="text-sm text-muted">{instance.description || 'Váš osobní checklist'}</div>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                                      <div style={{ textAlign: 'right' }}>
                                        <div className="text-sm text-muted">Vyplněno</div>
                                        <div className="font-medium">{completedCount}/{totalCount} položek</div>
                                      </div>
                                      <i className="fas fa-chevron-right" style={{ color: 'var(--gray-400)' }}></i>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Other Checklists Section */}
                        {otherChecklists.length > 0 && (
                          <div>
                            <h5 style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: 600, 
                              color: 'var(--gray-700)', 
                              marginBottom: 'var(--space-md)',
                              paddingBottom: 'var(--space-sm)',
                              borderBottom: '2px solid var(--gray-200)'
                            }}>
                              <i className="fas fa-eye" style={{ color: 'var(--gray-500)', marginRight: 'var(--space-xs)' }}></i>
                              Checklisty k zobrazení a úpravě
                            </h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                              {otherChecklists.map((instance) => {
                                const boat = boats.find(b => b.id === instance.boatId)
                                const completedCount = instance.items?.filter(item => item.completed).length || 0
                                const totalCount = instance.items?.length || 0
                                const isUserChecklist = instance.userId !== null && instance.userId !== user?.uid
                                
                                // Get user name if it's a user-specific checklist
                                let userName = null
                                if (isUserChecklist) {
                                  const participant = participants.find(p => p.userId === instance.userId)
                                  if (participant) {
                                    const profile = userProfiles.get(instance.userId)
                                    userName = profile?.name || 'Neznámý uživatel'
                                  }
                                }
                                
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
                                        background: 'rgba(249, 115, 22, 0.1)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--coral)',
                                        fontSize: '1.25rem'
                                      }}>
                                        <i className="fas fa-clipboard-check"></i>
                                      </div>
                                      <div>
                                        <div className="font-medium">{instance.name || 'Checklist'}</div>
                                        <div className="text-sm text-muted">
                                          {boat ? `Loď: ${boat.name || 'Bez názvu'}` : 
                                           isUserChecklist && userName ? `Účastník: ${userName}` :
                                           instance.role ? `Role: ${instance.role === 'organizer' ? 'Organizátor' : instance.role === 'captain' ? 'Kapitán' : 'Účastník'}` : 
                                           instance.description || 'Systémový checklist'}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                                      <div style={{ textAlign: 'right' }}>
                                        <div className="text-sm text-muted">Vyplněno</div>
                                        <div className="font-medium">{completedCount}/{totalCount} položek</div>
                                      </div>
                                      <i className="fas fa-chevron-right" style={{ color: 'var(--gray-400)' }}></i>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })() : (
                    <p style={{ color: 'var(--gray-500)' }}>
                      Zatím nejsou přiřazeny žádné checklisty. Vytvořte checklisty v Nastavení organizátora.
                    </p>
                  )}
                </div>
              </div>

              <aside>
                <div className="sidebar-card animate-in delay-1">
                  <h4>
                    <i className="fas fa-info-circle" style={{ color: 'var(--turquoise)' }}></i>
                    O checklistech
                  </h4>
                  <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>
                    Systémové checklisty se definují v Nastavení organizátora a přiřazují se k jednotlivým lodím nebo rolím. Kliknutím na checklist ho otevřete a můžete ho upravovat.
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
            
            const boat = boats.find(b => b.id === instance.boatId)
            const completedCount = instance.items?.filter(item => item.completed).length || 0
            const totalCount = instance.items?.length || 0

            const handleChecklistUpdate = (updatedInstance) => {
              setChecklistInstances(prev => prev.map(inst => 
                inst.id === updatedInstance.id ? updatedInstance : inst
              ))
            }

            // Determine if this is organizer's own checklist
            const isOwnChecklist = instance.role === 'organizer' && !instance.userId && !instance.boatId
            const isBoatChecklist = instance.boatId !== null
            const isUserChecklist = instance.userId !== null && instance.userId !== user?.uid
            
            // Get user name if it's a user-specific checklist
            let userName = null
            if (isUserChecklist) {
              const participant = participants.find(p => p.userId === instance.userId)
              if (participant) {
                const profile = userProfiles.get(instance.userId)
                userName = profile?.name || 'Neznámý uživatel'
              }
            }

            return (
              <div className="main-content">
                <div className="card animate-in">
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
                    {boat && (
                      <div style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                        <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Loď:</div>
                        <div className="font-medium">{boat.name || 'Bez názvu'}</div>
                      </div>
                    )}
                    
                    {isUserChecklist && userName && (
                      <div style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                        <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Účastník:</div>
                        <div className="font-medium">{userName}</div>
                      </div>
                    )}
                    
                    <ChecklistView 
                      instance={instance} 
                      onUpdate={handleChecklistUpdate}
                      canEdit={true}
                      canView={true}
                      isOwnChecklist={isOwnChecklist}
                      defaultMode={isOwnChecklist ? 'edit' : 'view'}
                    />
                  </div>
                </div>
              </div>
            )
          })()}

          {/* TAB: Dokumenty */}
          {activeTab === 'dokumenty' && (
            <div className="trip-layout">
              <div className="main-content">
                <div className="card animate-in">
                  <div className="card-header">
                    <h4 className="card-title">
                      <i className="fas fa-file-alt" style={{ color: 'var(--turquoise)' }}></i>
                      Dokumenty plavby
                    </h4>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => setShowDocumentModal(true)}
                    >
                      <i className="fas fa-plus"></i> Přidat dokument
                    </button>
                  </div>
                  
                  <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
                    Dokumenty sdílené se všemi účastníky plavby.
                  </p>
                  
                  {documents.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                      {documents.map((doc) => {
                        const uploadDate = doc.createdAt?.toDate ? doc.createdAt.toDate() : (doc.createdAt?.seconds ? new Date(doc.createdAt.seconds * 1000) : null)
                        const fileType = doc.fileType || ''
                        const isPDF = fileType.includes('pdf')
                        const isImage = fileType.includes('image')
                        const fileSizeMB = doc.fileSize ? (doc.fileSize / (1024 * 1024)).toFixed(1) : '0'
                        
                        return (
                          <div key={doc.id} className="doc-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                            <div className="doc-item-info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                              <div className={`doc-icon ${isPDF ? 'pdf' : isImage ? 'image' : 'link'}`} style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', background: isPDF ? 'var(--danger-light)' : isImage ? 'var(--turquoise-light)' : 'var(--gray-200)', color: isPDF ? 'var(--danger)' : isImage ? 'var(--turquoise)' : 'var(--gray-600)' }}>
                                {isPDF ? <i className="fas fa-file-pdf"></i> : isImage ? <i className="fas fa-image"></i> : <i className="fas fa-link"></i>}
                              </div>
                              <div>
                                <div className="font-medium">{doc.name || doc.fileName || 'Bez názvu'}</div>
                                <div className="text-sm text-muted">
                                  {fileSizeMB} MB • {uploadDate ? uploadDate.toLocaleDateString('cs-CZ') : 'Datum neuvedeno'}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                              <a
                                href={doc.downloadURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-ghost"
                              >
                                <i className="fas fa-download"></i>
                              </a>
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={async () => {
                                  if (confirm('Opravdu chcete smazat tento dokument?')) {
                                    const { error } = await documentService.deleteDocument(doc.id)
                                    if (!error) {
                                      await loadTripData()
                                    }
                                  }
                                }}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
                      <p>Zatím nejsou nahrány žádné dokumenty.</p>
                    </div>
                  )}
                </div>
              </div>

              <aside>
                <div className="sidebar-card animate-in">
                  <h4>
                    <i className="fas fa-info-circle" style={{ color: 'var(--turquoise)' }}></i>
                    O dokumentech
                  </h4>
                  <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>
                    Nahrané dokumenty jsou dostupné všem účastníkům plavby. Můžete nahrávat PDF, obrázky nebo přidat odkazy na externí zdroje.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      {showAddParticipant && (
        <AddParticipantModal
          tripId={tripId}
          onClose={() => setShowAddParticipant(false)}
          onSuccess={async () => {
            // Reload participants without full page reload
            const participantsResult = await participantService.getTripParticipants(tripId)
            if (participantsResult.participants) {
              setParticipants(participantsResult.participants)
            }
          }}
        />
      )}

      {showDocumentModal && (
        <DocumentUploadModal
          tripId={tripId}
          userId={user.uid}
          onClose={() => setShowDocumentModal(false)}
          onSuccess={loadTripData}
        />
      )}

      {showTimelineModal && (
        <TimelineEventModal
          tripId={tripId}
          event={editingEvent}
          events={timelineEvents}
          onClose={() => {
            setShowTimelineModal(false)
            setEditingEvent(null)
          }}
          onSuccess={loadTripData}
        />
      )}
    </>
  )
}

// Timeline Event Management Modal
function TimelineEventModal({ tripId, event, events, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: event?.name || '',
    description: event?.description || '',
    type: event?.type || 'custom',
    date: event?.date ? (event.date.toDate ? event.date.toDate().toISOString().slice(0, 16) : '') : '',
    roles: event?.roles || [],
    checkable: event?.checkable !== false
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const eventData = {
      ...formData,
      date: formData.date || null,
      order: event ? event.order : (events.length || 0)
    }

    let result
    if (event) {
      result = await timelineService.updateEvent(event.id, eventData)
    } else {
      result = await timelineService.createEvent(tripId, eventData)
    }

    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      onSuccess()
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!event) return
    if (!confirm('Opravdu chcete smazat tuto událost?')) return

    const { error } = await timelineService.deleteEvent(event.id)
    if (error) {
      setError(error)
    } else {
      onSuccess()
      onClose()
    }
  }

  const toggleRole = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10, 22, 40, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', maxWidth: 600, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4>{event ? 'Upravit událost' : 'Nová událost'}</h4>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: 'var(--space-xl)' }}>
            {error && (
              <div style={{ padding: 'var(--space-md)', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Název *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Popis</label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Typ</label>
              <select
                className="form-input"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="custom">Vlastní</option>
                <option value="crewlist">Crewlist</option>
                <option value="payment">Platba</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Datum a čas (volitelně)</label>
              <input
                type="datetime-local"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Pro role</label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {['organizer', 'captain', 'participant'].map(role => (
                  <button
                    key={role}
                    type="button"
                    className={`btn btn-sm ${formData.roles.includes(role) ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => toggleRole(role)}
                  >
                    {role === 'organizer' ? 'Organizátoři' : role === 'captain' ? 'Kapitáni' : 'Účastníci'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                Pokud není vybrána žádná role, událost se zobrazí všem.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <input
                  type="checkbox"
                  checked={formData.checkable}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkable: e.target.checked }))}
                />
                <span>Účastníci mohou označit jako splněno</span>
              </label>
            </div>
          </div>
          <div className="modal-footer" style={{ padding: 'var(--space-lg) var(--space-xl)', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <div>
              {event && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleDelete}
                  style={{ color: 'var(--danger)' }}
                >
                  <i className="fas fa-trash"></i> Smazat
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Zrušit</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Ukládání...' : (event ? 'Uložit změny' : 'Vytvořit událost')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// Document Upload Modal Component
function DocumentUploadModal({ tripId, userId, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other'
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!formData.name) {
        setFormData(prev => ({ ...prev, name: selectedFile.name }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Vyberte soubor k nahrání')
      return
    }

    setUploading(true)
    setError(null)

    const { id, error: uploadError } = await documentService.uploadDocument(tripId, file, {
      ...formData,
      uploadedBy: userId
    })

    if (uploadError) {
      setError(uploadError)
      setUploading(false)
    } else {
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10, 22, 40, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', maxWidth: 600, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4>
            <i className="fas fa-plus" style={{ color: 'var(--turquoise)', marginRight: 'var(--space-sm)' }}></i>
            Přidat dokument
          </h4>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: 'var(--space-xl)' }}>
            {error && (
              <div style={{ padding: 'var(--space-md)', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
                {error}
              </div>
            )}
            
            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Soubor *</label>
              <input
                type="file"
                className="form-input"
                onChange={handleFileChange}
                required
              />
              {file && (
                <div className="text-sm text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Název *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Název dokumentu"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Popis</label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Popis dokumentu..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kategorie</label>
              <select
                className="form-input"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="other">Ostatní</option>
                <option value="itinerary">Itinerář</option>
                <option value="rules">Pravidla</option>
                <option value="map">Mapa</option>
                <option value="weather">Předpověď počasí</option>
              </select>
            </div>
          </div>
          <div className="modal-footer" style={{ padding: 'var(--space-lg) var(--space-xl)', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
              {uploading ? 'Nahrávání...' : 'Nahrát dokument'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
