import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { boatService } from '../services/boatService'
import { participantService } from '../services/participantService'
import { checklistService } from '../services/checklistService'
import { canEditBoat, canEditBoatLog, canViewBoatLog, isTripOrganizer, canEditChecklist } from '../utils/permissions'
import { loadUserProfiles } from '../utils/userDisplay'
import CrewlistView from '../components/CrewlistView'
import ChecklistView from '../components/ChecklistView'
import BoatLogView from '../components/BoatLogView'
import './BoatDetail.css'

export default function BoatDetail() {
  const { tripId, boatId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthState()
  const [trip, setTrip] = useState(null)
  const [boat, setBoat] = useState(null)
  const [participants, setParticipants] = useState([])
  const [userProfiles, setUserProfiles] = useState(new Map())
  const [checklistInstances, setChecklistInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posadka')
  const [activeChecklist, setActiveChecklist] = useState(null)

  useEffect(() => {
    if (tripId && boatId && user) {
      loadBoatData()
    }
  }, [tripId, boatId, user])

  // Check URL hash to set active tab
  useEffect(() => {
    const hash = window.location.hash
    if (hash === '#crew-list') {
      setActiveTab('crew-list')
    }
  }, [])

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#crew-list') {
        setActiveTab('crew-list')
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const loadBoatData = async () => {
    setLoading(true)
    
    const [tripResult, boatResult, participantsResult] = await Promise.all([
      tripService.getTrip(tripId),
      boatService.getBoat(boatId),
      participantService.getBoatParticipants(tripId, boatId)
    ])

    // Load checklist instances for this boat
    const { instances } = await checklistService.getTripInstances(tripId, { boatId })
    if (instances) {
      setChecklistInstances(instances)
    }

    if (tripResult.data) {
      setTrip(tripResult.data)
    }

    if (boatResult.data) {
      setBoat(boatResult.data)
    }

    if (participantsResult.participants) {
      setParticipants(participantsResult.participants)
      
      // Load user profiles for all participants
      const userIds = participantsResult.participants.map(p => p.userId)
      if (userIds.length > 0) {
        const profiles = await loadUserProfiles(userIds)
        setUserProfiles(profiles)
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
      const date = new Date(dateTime)
      return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateTime
    }
  }


  const currentParticipant = participants.find(p => p.userId === user?.uid)
  const canEdit = canEditBoat(trip, boat, currentParticipant, user?.uid)
  const canEditLog = canEditBoatLog(trip, boat, currentParticipant, user?.uid)
  const canViewLog = canViewBoatLog(trip, boat, currentParticipant, user?.uid)
  
  // Determine viewContext based on user's role
  const getViewContext = () => {
    if (isTripOrganizer(trip, user?.uid)) {
      return 'organizer'
    }
    if (currentParticipant?.role === 'captain' && currentParticipant?.boatId === boat?.id) {
      return 'captain'
    }
    return 'participant'
  }
  const viewContext = getViewContext()

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--gray-500)' }}>
          Načítání...
        </div>
      </div>
    )
  }

  if (!boat || !trip) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <h2>Loď nenalezena</h2>
          <Link to={`/trip/${tripId}/organizer`} className="btn btn-primary">Zpět na plavbu</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Boat Hero */}
      <div className="boat-hero" style={boat.thumbnailUrl ? { 
        backgroundImage: `url(${boat.thumbnailUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      } : {}}>
        {boat.thumbnailUrl && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.8), rgba(10, 22, 40, 0.6))'
          }}></div>
        )}
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="breadcrumb" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--space-lg)' }}>
            <Link to="/dashboard" style={{ color: 'inherit' }}><i className="fas fa-home"></i></Link>
            <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
            <Link to={`/trip/${tripId}/organizer`} style={{ color: 'inherit' }}>{trip.name || 'Plavba'}</Link>
            <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
            <span style={{ color: 'white' }}>{boat.name || 'Bez názvu'}</span>
          </div>
          
          <div className="boat-hero-content">
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 'var(--space-xs)', color: 'white' }}>
                {boat.model || 'Model neuveden'}
              </h1>
              <p style={{ fontSize: '1.25rem', opacity: 0.9, color: 'white' }}>{boat.name || 'Bez názvu'}</p>
              {boat.charterLink && (
                <a 
                  href={boat.charterLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{ 
                    marginTop: 'var(--space-sm)', 
                    background: 'rgba(255,255,255,0.2)', 
                    color: 'white', 
                    backdropFilter: 'blur(10px)',
                    borderColor: 'rgba(255,255,255,0.3)'
                  }}
                >
                  <i className="fas fa-external-link-alt"></i>
                  Detail lodi
                </a>
              )}
            </div>
            <Link to={`/trip/${tripId}/organizer`} className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(10px)' }}>
              <i className="fas fa-arrow-left"></i>
              Zpět na plavbu
            </Link>
          </div>
          
          <div className="boat-specs">
            {boat.length && (
              <div className="boat-spec">
                <div className="boat-spec-value">{boat.length}</div>
                <div className="boat-spec-label">Délka</div>
              </div>
            )}
            {boat.year && (
              <div className="boat-spec">
                <div className="boat-spec-value">{boat.year}</div>
                <div className="boat-spec-label">Rok výroby</div>
              </div>
            )}
            {boat.cabins && (
              <div className="boat-spec">
                <div className="boat-spec-value">{boat.cabins}</div>
                <div className="boat-spec-label">Kajuty</div>
              </div>
            )}
            <div className="boat-spec">
              <div className="boat-spec-value">{participants.length}{boat.capacity ? `/${boat.capacity}` : ''}</div>
              <div className="boat-spec-label">Obsazenost</div>
            </div>
          </div>
        </div>
      </div>

      {/* Boat Tabs */}
      <div className="trip-tabs">
        <div className="container">
          <div className="trip-tabs-inner">
            <button
              className={`trip-tab ${activeTab === 'posadka' ? 'active' : ''}`}
              onClick={() => setActiveTab('posadka')}
            >
              <i className="fas fa-users"></i>
              Posádka
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

      {/* Content */}
      <main className="trip-content">
        <div className="container">
          {/* TAB: Posádka */}
          {activeTab === 'posadka' && (
            <div className="trip-layout">
              <div className="main-content">
                <div className="card animate-in">
                  <div className="card-header">
                    <h4 className="card-title">
                      <i className="fas fa-users" style={{ color: 'var(--turquoise)' }}></i>
                      Posádka ({participants.length}{boat.capacity ? `/${boat.capacity}` : ''})
                    </h4>
                    {canEdit && (
                      <Link to={`/trip/${tripId}/organizer`} className="btn btn-sm btn-primary">
                        <i className="fas fa-user-plus"></i>
                        Spravovat posádku
                      </Link>
                    )}
                  </div>
                  
                  <div className="crew-list">
                    {participants.map((participant) => {
                      const isCaptain = participant.role === 'captain'
                      return (
                        <div 
                          key={participant.id} 
                          className="crew-member"
                          style={isCaptain ? { background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' } : {}}
                        >
                          <div className={`crew-avatar ${isCaptain ? 'captain' : ''}`}>
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
                          <div className="crew-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                              <h5>{(() => {
                                const profile = userProfiles.get(participant.userId)
                                return profile?.name || 'Neznámý uživatel'
                              })()}</h5>
                              {participant.userId === user?.uid && (
                                <span className="status-pill info" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                  Já
                                </span>
                              )}
                            </div>
                            <p className="text-muted">Účastník plavby</p>
                          </div>
                          {isCaptain && (
                            <span className="crew-badge">Kapitán</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <aside>
                <div className="sidebar-card animate-in">
                  <h4>
                    <i className="fas fa-chart-pie" style={{ color: 'var(--turquoise)' }}></i>
                    Stav posádky
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-muted">Obsazenost</span>
                      <span className="font-semibold">{participants.length}{boat.capacity ? `/${boat.capacity}` : ''}</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* TAB: Crew list */}
          {activeTab === 'crew-list' && (
            <div className="card animate-in">
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-clipboard-list" style={{ color: 'var(--turquoise)' }}></i>
                  Crew list – {boat.name || 'Bez názvu'}
                </h4>
              </div>
              
              <CrewlistView
                tripId={tripId}
                boatId={boatId}
                canEdit={canEdit}
                userId={user.uid}
                viewContext={viewContext}
                trip={trip}
              />
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
                  </div>
                  
                  <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                    Checklisty přiřazené této lodi. Kliknutím je otevřete a upravíte.
                  </p>
                  
                  {checklistInstances.length > 0 ? (
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
                                <div className="text-sm text-muted">{instance.description || 'Checklist lodě'}</div>
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
                  ) : (
                    <p style={{ color: 'var(--gray-500)' }}>
                      Zatím nejsou přiřazeny žádné checklisty pro tuto loď. Organizátor může přiřadit checklisty v nastavení.
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
                    Systémové checklisty se definují v Nastavení organizátora a přiřazují se k jednotlivým lodím nebo rolím.
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
            const canEditInstance = canEditChecklist(trip, instance, boat, currentParticipant, user?.uid)

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
                      viewContext={viewContext}
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
                  {boat && canViewLog ? (
                    <BoatLogView
                      tripId={tripId}
                      boatId={boatId}
                      boatName={boat.name || 'Bez názvu'}
                      canEdit={canEditLog}
                      canView={canViewLog}
                      showStats={false}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
                      Loď nenalezena nebo nemáte oprávnění k zobrazení lodního deníku.
                    </div>
                  )}
                </div>
              </div>

              <aside>
                {boat && canViewLog && (
                  <BoatLogView
                    tripId={tripId}
                    boatId={boatId}
                    boatName={boat.name || 'Bez názvu'}
                    canEdit={false}
                    canView={canViewLog}
                    showStats={true}
                    statsOnly={true}
                  />
                )}
              </aside>
            </div>
          )}
        </div>
      </main>

    </>
  )
}
