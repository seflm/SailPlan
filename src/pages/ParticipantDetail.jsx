import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { participantService } from '../services/participantService'
import { boatService } from '../services/boatService'
import { timelineService } from '../services/timelineService'
import { crewlistService } from '../services/crewlistService'
import { organizerService } from '../services/organizerService'
import { canViewParticipantDetails, canEditParticipant, canEditChecklist, isTripOrganizer } from '../utils/permissions'
import { loadUserProfiles } from '../utils/userDisplay'
import { checklistService } from '../services/checklistService'
import CrewlistView from '../components/CrewlistView'
import ChecklistView from '../components/ChecklistView'
import TimelineView from '../components/TimelineView'
import './TripDetail.css'
import './ParticipantDetail.css'

export default function ParticipantDetail() {
  const { tripId, participantId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthState()
  const [trip, setTrip] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [boat, setBoat] = useState(null)
  const [boatCaptain, setBoatCaptain] = useState(null)
  const [timelineEvents, setTimelineEvents] = useState([])
  const [eventCompletions, setEventCompletions] = useState({})
  const [crewlistData, setCrewlistData] = useState(null)
  const [crewlistTemplate, setCrewlistTemplate] = useState(null)
  const [checklistInstances, setChecklistInstances] = useState([])
  const [userProfiles, setUserProfiles] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('prehled')
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeChecklist, setActiveChecklist] = useState(null)

  useEffect(() => {
    if (tripId && participantId && user) {
      loadParticipantData()
    }
  }, [tripId, participantId, user])

  const loadParticipantData = async () => {
    setLoading(true)
    
    const [tripResult, participantResult] = await Promise.all([
      tripService.getTrip(tripId),
      participantService.getParticipantById(participantId)
    ])

    if (tripResult.data) {
      setTrip(tripResult.data)
    }

    if (participantResult.data) {
      setParticipant(participantResult.data)
      
      // Load user profiles for participant and related users
      const userIds = [participantResult.data.userId]
      if (participantResult.data.boatId) {
        const { participants: boatParticipants } = await participantService.getBoatParticipants(tripId, participantResult.data.boatId)
        boatParticipants.forEach(p => {
          if (!userIds.includes(p.userId)) {
            userIds.push(p.userId)
          }
        })
        const captain = boatParticipants.find(p => p.role === 'captain')
        if (captain) {
          setBoatCaptain(captain)
        }
      }
      
      if (userIds.length > 0) {
        const profiles = await loadUserProfiles(userIds)
        setUserProfiles(profiles)
      }
      
      // Load boat if assigned
      if (participantResult.data.boatId) {
        const { data: boatData } = await boatService.getBoat(participantResult.data.boatId)
        if (boatData) {
          setBoat(boatData)
        }
      }

      // Load crewlist data and template
      if (participantResult.data.boatId) {
        const [crewlistResult, templateResult] = await Promise.all([
          crewlistService.getCrewlistData(tripId, participantResult.data.boatId, participantResult.data.userId),
          crewlistService.getTemplate(tripId)
        ])
        if (crewlistResult.data) {
          setCrewlistData(crewlistResult.data)
        }
        if (templateResult.data) {
          setCrewlistTemplate(templateResult.data)
        }
      }

      // Load timeline events and completions
      const { events, error: eventsError } = await timelineService.getTripEvents(tripId)
      if (!eventsError && events) {
        setTimelineEvents(events)
        
        // Load completion status for this participant
        const completions = {}
        for (const event of events) {
          if (event.checkable) {
            const { completed } = await timelineService.getEventCompletion(event.id, participantResult.data.userId)
            completions[event.id] = completed
          }
        }
        setEventCompletions(completions)
      }

      // Load checklist instances for this participant
      // Only load instances assigned to this user's userId (not boat instances)
      const { instances } = await checklistService.getTripInstances(tripId, { 
        userId: participantResult.data.userId
      })
      if (instances) {
        // Deduplicate by templateId to avoid duplicates
        const uniqueInstances = []
        const seenTemplateIds = new Set()
        instances.forEach(inst => {
          if (inst.templateId && !seenTemplateIds.has(inst.templateId)) {
            seenTemplateIds.add(inst.templateId)
            uniqueInstances.push(inst)
          } else if (!inst.templateId) {
            // If no templateId, use instance id for deduplication
            if (!seenTemplateIds.has(inst.id)) {
              seenTemplateIds.add(inst.id)
              uniqueInstances.push(inst)
            }
          }
        })
        setChecklistInstances(uniqueInstances)
      } else {
        setChecklistInstances([])
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
      'participant': 'Posádka',
      'captain': 'Kapitán',
      'organizer': 'Organizátor'
    }
    return labels[role] || role
  }

  const handleToggleEvent = async (eventId) => {
    if (!canEdit) return
    
    const currentStatus = eventCompletions[eventId] || false
    const { error } = await timelineService.setEventCompletion(eventId, participant.userId, !currentStatus)
    if (!error) {
      setEventCompletions(prev => ({
        ...prev,
        [eventId]: !currentStatus
      }))
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

  if (!participant || !trip) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <h2>Účastník nenalezen</h2>
          <Link to={`/trip/${tripId}/organizer`} className="btn btn-primary">Zpět na plavbu</Link>
        </div>
      </div>
    )
  }

  if (!canViewParticipantDetails(trip, user?.uid)) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <h2>Nemáš oprávnění k této stránce</h2>
          <Link to={`/trip/${tripId}/organizer`} className="btn btn-primary">Zpět na plavbu</Link>
        </div>
      </div>
    )
  }

  const canEdit = canEditParticipant(trip, participant, user?.uid)

  const completedCount = Object.values(eventCompletions).filter(c => c === true).length
  const totalCheckable = timelineEvents.filter(e => e.checkable).length

  return (
    <>
      {/* Participant Header */}
      <div className="trip-header organizer" style={{ padding: 'var(--space-xl) 0' }}>
        <div className="container">
          <div className="trip-header-content">
            <div className="breadcrumb">
              <Link to="/dashboard"><i className="fas fa-home"></i></Link>
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <Link to={`/trip/${tripId}/organizer`}>{trip.name || 'Plavba'}</Link>
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <Link to={`/trip/${tripId}/organizer#tab-ucastnici`}>Účastníci</Link>
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <span>{(() => {
                const profile = userProfiles.get(participant.userId)
                return profile?.name || 'Neznámý uživatel'
              })()}</span>
            </div>
            
            <div className="trip-title-row" style={{ marginTop: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                <div className="crew-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem', background: 'linear-gradient(135deg, var(--coral), var(--coral-light))' }}>
                  {(() => {
                    const profile = userProfiles.get(participant.userId)
                    if (profile?.name) {
                      const nameParts = profile.name.trim().split(/\s+/)
                      if (nameParts.length >= 2) {
                        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                      } else {
                        return profile.name.substring(0, 2).toUpperCase()
                      }
                    }
                    return participant.userId.substring(0, 2).toUpperCase()
                  })()}
                </div>
                <div>
                  <h1 className="trip-title" style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>
                    {(() => {
                      const profile = userProfiles.get(participant.userId)
                      const displayName = profile?.name || 'Neznámý uživatel'
                      return participant.userId === user.uid ? `${displayName} (organizátor)` : displayName
                    })()}
                  </h1>
                  <p style={{ color: 'var(--gray-400)', margin: 0 }}>Účastník plavby</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <Link to={`/trip/${tripId}/organizer#tab-ucastnici`} className="btn btn-secondary">
                  <i className="fas fa-arrow-left"></i>
                  Zpět na seznam
                </Link>
                {canEdit && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowEditModal(true)}
                  >
                    <i className="fas fa-edit"></i>
                    Upravit přiřazení
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Participant Tabs */}
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
              className={`trip-tab ${activeTab === 'crew-list' ? 'active' : ''}`}
              onClick={() => setActiveTab('crew-list')}
            >
              <i className="fas fa-clipboard-list"></i>
              Crewlist
            </button>
            <button
              className={`trip-tab ${activeTab === 'pred-plavbou' ? 'active' : ''}`}
              onClick={() => setActiveTab('pred-plavbou')}
            >
              <i className="fas fa-flag-checkered"></i>
              Před plavbou
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

      {/* Content */}
      <main className="trip-content">
        <div className="container">
          {/* TAB: Přehled */}
          {activeTab === 'prehled' && (
            <div className="trip-layout">
              <div className="main-content">
                {/* Assignment Info */}
                <div className="card animate-in" style={{ marginBottom: 'var(--space-xl)' }}>
                  <div className="card-header">
                    <h4 className="card-title">
                      <i className="fas fa-ship" style={{ color: 'var(--turquoise)' }}></i>
                      Přiřazení do lodě
                    </h4>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-lg)' }}>
                    <div>
                      <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Loď</div>
                      <div className="font-medium" style={{ fontSize: '1.125rem' }}>
                        {boat ? `${boat.model || ''} ${boat.model && boat.name ? '–' : ''} ${boat.name || 'Bez názvu'}`.trim() : 'Nepřiřazeno'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Role</div>
                      <div className="font-medium" style={{ fontSize: '1.125rem' }}>{getRoleLabel(participant.role)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Podrole</div>
                      <div className="font-medium" style={{ fontSize: '1.125rem' }}>—</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Kapitán lodě</div>
                      <div className="font-medium" style={{ fontSize: '1.125rem' }}>
                        {(() => {
                          if (!boatCaptain) return '—'
                          const profile = userProfiles.get(boatCaptain.userId)
                          return profile?.name || 'Neznámý uživatel'
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Overview Card */}
                <div className="card animate-in delay-1" style={{ marginBottom: 'var(--space-xl)' }}>
                  <div className="card-header">
                    <h4 className="card-title">
                      <i className="fas fa-info-circle" style={{ color: 'var(--turquoise)' }}></i>
                      Přehled stavu
                    </h4>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-lg)' }}>
                    <div>
                      <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Hlavní checklist</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span className={`status-pill ${completedCount === totalCheckable && totalCheckable > 0 ? 'success' : 'warning'}`} style={{ fontSize: '0.875rem' }}>
                          {completedCount}/{totalCheckable} {completedCount === totalCheckable && totalCheckable > 0 ? 'splněno' : 'nesplněno'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Crewlist</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span className={`status-pill ${crewlistData ? 'success' : 'warning'}`} style={{ fontSize: '0.875rem' }}>
                          {crewlistData ? (
                            <>
                              <i className="fas fa-check"></i> Vyplněno
                            </>
                          ) : (
                            <>
                              <i className="fas fa-exclamation"></i> Nevyplněno
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <aside>
                {/* Contact Info */}
                <div className="sidebar-card animate-in">
                  <h4>
                    <i className="fas fa-address-card" style={{ color: 'var(--turquoise)' }}></i>
                    Kontaktní údaje
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                    {(() => {
                      const profile = userProfiles.get(participant.userId)
                      const email = profile?.email || crewlistData?.email
                      const phone = profile?.phone || crewlistData?.telefon || crewlistData?.phone
                      
                      if (email || phone) {
                        return (
                          <>
                            {email && (
                              <div>
                                <div className="text-xs text-muted">Email</div>
                                <div className="font-medium">{email}</div>
                              </div>
                            )}
                            {phone && (
                              <div>
                                <div className="text-xs text-muted">Telefon</div>
                                <div className="font-medium">{phone}</div>
                              </div>
                            )}
                          </>
                        )
                      }
                      return <div className="text-sm text-muted">Kontaktní údaje nejsou k dispozici</div>
                    })()}
                  </div>
                  
                  {(() => {
                    const profile = userProfiles.get(participant.userId)
                    const email = profile?.email || crewlistData?.email
                    const phone = profile?.phone || crewlistData?.telefon || crewlistData?.phone
                    
                    if (email || phone) {
                      return (
                        <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--gray-100)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {email && (
                              <a href={`mailto:${email}`} className="btn btn-sm btn-secondary" style={{ width: '100%' }}>
                                <i className="fas fa-envelope"></i>
                                Poslat email
                              </a>
                            )}
                            {phone && (
                              <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn btn-sm btn-secondary" style={{ width: '100%' }}>
                                <i className="fas fa-phone"></i>
                                Zavolat
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </aside>
            </div>
          )}

          {/* TAB: Crewlist */}
          {activeTab === 'crew-list' && (
            <div className="card animate-in">
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-clipboard-list" style={{ color: 'var(--turquoise)' }}></i>
                  Crewlist
                </h4>
              </div>
              
              {boat ? (
                <div>
                  {crewlistData ? (
                    <div>
                      <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                        Údaje vyplněné účastníkem do crewlistu.
                      </p>
                      <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                        {(() => {
                          // Get all fields from template
                          const allFields = []
                          if (crewlistTemplate?.fields) {
                            Object.keys(crewlistTemplate.fields).forEach(role => {
                              crewlistTemplate.fields[role].forEach(field => {
                                if (!allFields.find(f => f.id === field.id)) {
                                  allFields.push(field)
                                }
                              })
                            })
                          }
                          
                          // Map crewlist data to fields with labels
                          return Object.entries(crewlistData)
                            .filter(([key]) => !['id', 'tripId', 'boatId', 'userId', 'createdAt', 'updatedAt'].includes(key))
                            .map(([key, value]) => {
                              // Find field in template by id
                              const field = allFields.find(f => f.id === key)
                              const label = field?.label || key
                              
                              return (
                                <div key={key} style={{ padding: 'var(--space-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                                  <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>{label}</div>
                                  <div className="font-medium">{value || '-'}</div>
                                </div>
                              )
                            })
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
                      <p>Účastník zatím nevyplnil crewlist.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
                  <p>Účastník není přiřazen k žádné lodi.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Před plavbou */}
          {activeTab === 'pred-plavbou' && (
            <div className="card animate-in">
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-flag-checkered" style={{ color: 'var(--coral)' }}></i>
                  Hlavní checklist
                </h4>
              </div>
              
              {timelineEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', padding: 'var(--space-xl)' }}>
                  {timelineEvents.map((event) => {
                    const isCompleted = eventCompletions[event.id] || false
                    const eventDate = event.date?.toDate ? event.date.toDate() : (event.date?.seconds ? new Date(event.date.seconds * 1000) : null)
                    
                    return (
                      <div 
                        key={event.id} 
                        className={`checklist-event ${isCompleted ? 'completed' : ''}`}
                      >
                        <div className="checklist-event-header">
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                            {event.checkable ? (
                              <div 
                                className={`checklist-event-checkbox ${isCompleted ? 'completed' : ''}`}
                                onClick={() => canEdit && handleToggleEvent(event.id)}
                                style={{ cursor: canEdit ? 'pointer' : 'default' }}
                              >
                                {isCompleted && <i className="fas fa-check" style={{ fontSize: '0.75rem' }}></i>}
                              </div>
                            ) : (
                              <div className="checklist-event-checkbox" style={{ cursor: 'default' }}></div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div className="font-medium" style={{ marginBottom: 'var(--space-xs)' }}>
                                {event.name || 'Bez názvu'}
                              </div>
                              {event.description && (
                                <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>
                                  {event.description}
                                </div>
                              )}
                              <div className="text-sm text-muted" style={{ textTransform: 'capitalize' }}>
                                {event.type === 'crewlist' ? 'Crewlist' : event.type === 'payment' ? 'Platba' : 'Vlastní'}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {eventDate && (
                              <div className={`text-xs ${eventDate < new Date() && !isCompleted ? 'text-danger' : 'text-muted'}`} style={{ marginTop: 'var(--space-xs)' }}>
                                do {formatDate(event.date)}
                              </div>
                            )}
                            {isCompleted && (
                              <span className="status-pill success" style={{ fontSize: '0.75rem', marginTop: 'var(--space-xs)', display: 'block' }}>Splněno</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding: 'var(--space-xl)' }}>
                  <p style={{ color: 'var(--gray-500)' }}>Zatím nejsou definované žádné události v timeline.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Checklisty */}
          {activeTab === 'checklisty' && (
            <div className="trip-layout">
              <div className="main-content">
                <div className="card animate-in">
                  <div className="card-header">
                    <h4 className="card-title">
                      <i className="fas fa-tasks" style={{ color: 'var(--turquoise)' }}></i>
                      Systémové checklisty
                    </h4>
                  </div>
                  
                  <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                    Checklisty přiřazené tomuto účastníkovi. Kliknutím je otevřete.
                  </p>
                  
                  {checklistInstances.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', padding: 'var(--space-xl)' }}>
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
                    <div style={{ padding: 'var(--space-xl)' }}>
                      <p style={{ color: 'var(--gray-500)' }}>
                        Zatím nejsou přiřazeny žádné checklisty pro tohoto účastníka.
                      </p>
                    </div>
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
            const canEditInstance = canEditChecklist(trip, instance, boat, participant, user?.uid)

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
                      canEdit={canEditInstance}
                      canView={true}
                      isOwnChecklist={false}
                      defaultMode="view"
                    />
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </main>

      {/* Edit Participant Modal */}
      {showEditModal && (
        <EditParticipantModal
          tripId={tripId}
          participant={participant}
          boats={[]}
          onClose={() => setShowEditModal(false)}
          onSave={loadParticipantData}
        />
      )}
    </>
  )
}

// Edit Participant Modal Component
function EditParticipantModal({ tripId, participant, boats, onClose, onSave }) {
  const [formData, setFormData] = useState({
    role: participant?.role || 'participant',
    boatId: participant?.boatId || null
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [availableBoats, setAvailableBoats] = useState([])

  useEffect(() => {
    loadBoats()
  }, [])

  const loadBoats = async () => {
    const { boats: tripBoats } = await boatService.getTripBoats(tripId)
    setAvailableBoats(tripBoats)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Update role
    if (formData.role !== participant.role) {
      const { error: roleError } = await participantService.updateParticipantRole(participant.id, formData.role)
      if (roleError) {
        setError(roleError)
        setSaving(false)
        return
      }
    }

    // Update boat assignment
    if (formData.boatId !== participant.boatId) {
      const { error: boatError } = await participantService.assignToBoat(participant.id, formData.boatId)
      if (boatError) {
        setError(boatError)
        setSaving(false)
        return
      }
    }

    onSave()
    onClose()
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10, 22, 40, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', maxWidth: 600, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4>Upravit přiřazení účastníka</h4>
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
              <label className="form-label">Loď</label>
              <select
                className="form-input"
                value={formData.boatId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, boatId: e.target.value || null }))}
              >
                <option value="">Nepřiřazeno</option>
                {availableBoats.map(boat => (
                  <option key={boat.id} value={boat.id}>{boat.name || 'Bez názvu'}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Role *</label>
              <select
                className="form-input"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                required
              >
                <option value="participant">Posádka</option>
                <option value="captain">Kapitán</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Podrole (volitelně)</label>
              <select className="form-input">
                <option value="">Bez podrole</option>
                <option value="kormidelnik">Kormidelník</option>
                <option value="mastman">Mastman</option>
                <option value="bowman">Bowman</option>
              </select>
            </div>
          </div>
          <div className="modal-footer" style={{ padding: 'var(--space-lg) var(--space-xl)', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className="fas fa-save"></i>
              {saving ? 'Ukládání...' : 'Uložit změny'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
