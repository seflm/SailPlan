import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { boatService } from '../services/boatService'
import { participantService } from '../services/participantService'
import { organizerService } from '../services/organizerService'
import JoinTripModal from '../components/JoinTripModal'
import TripLocationCard from '../components/TripLocationCard'
import TripInfoCard from '../components/TripInfoCard'
import ContactsCard from '../components/ContactsCard'
import BoatCard from '../components/BoatCard'
import './TripDetail.css'

export default function TripPublic() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthState()
  const [trip, setTrip] = useState(null)
  const [boats, setBoats] = useState([])
  const [participants, setParticipants] = useState([])
  const [organizerContacts, setOrganizerContacts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  useEffect(() => {
    if (tripId) {
      loadTripData()
    }
  }, [tripId])

  const loadTripData = async () => {
    setLoading(true)
    
    try {
      // Load trip and boats (public data)
      const [tripResult, boatsResult] = await Promise.all([
        tripService.getTrip(tripId),
        boatService.getTripBoats(tripId)
      ])

      if (tripResult.data) {
        // Remove sensitive data (password) from trip data for public view
        const { password, ...publicTripData } = tripResult.data
        setTrip(publicTripData)
        
        // Load organizer contact details (public-safe)
        if (publicTripData.organizerId) {
          const { data: contacts } = await organizerService.getContactDetails(publicTripData.organizerId)
          if (contacts) {
            setOrganizerContacts(contacts)
          }
        }
      }

      // Always set boats, even if empty array or error
      if (boatsResult && boatsResult.boats) {
        setBoats(boatsResult.boats)
      } else if (boatsResult && boatsResult.error) {
        console.error('Error loading boats:', boatsResult.error)
        setBoats([])
      } else {
        setBoats([])
      }

      // Load participants for public view (to show count)
      // For public trips, we load participants to display count, but don't show personal details
      const participantsResult = await participantService.getTripParticipants(tripId)
      if (participantsResult) {
        if (participantsResult.participants && Array.isArray(participantsResult.participants)) {
          setParticipants(participantsResult.participants)
        } else if (participantsResult.error) {
          console.error('Error loading participants:', participantsResult.error)
          setParticipants([])
        } else {
          setParticipants([])
        }
      } else {
        setParticipants([])
      }
    } catch (error) {
      console.error('Error loading trip data:', error)
      setBoats([])
      setParticipants([])
    } finally {
      setLoading(false)
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

  const getAvailableSpots = () => {
    const totalCapacity = boats.reduce((sum, boat) => sum + (boat.capacity || 0), 0)
    const totalParticipants = participants.length
    // Calculate actual available spots
    return Math.max(0, totalCapacity - totalParticipants)
  }

  const getBoatAvailability = (boat) => {
    const capacity = boat.capacity || 0
    const boatParticipants = participants.filter(p => p.boatId === boat.id)
    const occupied = boatParticipants.length
    const available = capacity - occupied

    if (available <= 0) return { status: 'full', text: 'Plno', spots: 0 }
    if (available <= 2) return { status: 'limited', text: `${available} místa`, spots: available }
    if (capacity > 0) {
      return { status: 'available', text: `${available} míst`, spots: available }
    }
    return { status: 'unknown', text: 'Kapacita neuvedena', spots: 0 }
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

  if (!trip) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <h2>Plavba nenalezena</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--space-lg)' }}>
            Plavba s tímto ID neexistuje nebo není veřejně dostupná.
          </p>
          <Link to="/" className="btn btn-primary">
            Zpět na hlavní stránku
          </Link>
        </div>
      </div>
    )
  }

  const availableSpots = getAvailableSpots()
  const daysUntil = getDaysUntil(trip.startDate)

  return (
    <>
      {/* Header (Unauthenticated) */}
      <header className="header">
        <div className="container">
          <div className="header-inner">
            <Link to="/" className="logo">
              <div className="logo-icon">
                <i className="fas fa-sailboat"></i>
              </div>
              SailPlan
            </Link>
            
            <div className="header-actions">
              <Link to="/login" className="btn btn-ghost">Přihlásit se</Link>
              <Link to="/register" className="btn btn-primary">Registrace</Link>
            </div>
          </div>
        </div>
      </header>

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
            <div className="trip-title-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <h1 className="trip-title" style={{ marginBottom: 0 }}>{trip.name || 'Bez názvu'}</h1>
                <span className="role-badge" style={{ background: availableSpots > 0 ? 'linear-gradient(135deg, var(--success), #059669)' : 'var(--gray-500)' }}>
                  <i className="fas fa-door-open"></i>
                  {availableSpots > 0 ? `Volná místa: ${availableSpots}` : 'Plno'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>Organizuje</div>
                <div style={{ fontWeight: 600, color: 'var(--white)' }}>
                  {organizerContacts?.name 
                    || organizerContacts?.fullName 
                    || organizerContacts?.displayName 
                    || 'Organizátor'}
                </div>
              </div>
            </div>
            
            <div className="trip-header-meta" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
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
                  <span>{boats.length} {boats.length === 1 ? 'loď' : boats.length < 5 ? 'lodě' : 'lodí'}</span>
                </div>
              </div>
              <button 
                className="btn btn-lg" 
                onClick={() => {
                  if (!user) {
                    navigate(`/onboarding?mode=join-trip&tripId=${tripId}`)
                  } else {
                    setShowJoinModal(true)
                  }
                }}
                style={{ flexShrink: 0, background: 'linear-gradient(135deg, var(--coral), #ea580c)', color: 'white', boxShadow: '0 4px 14px rgba(251, 113, 133, 0.4)' }}
              >
                <i className="fas fa-plus-circle"></i>
                Chci se přidat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="trip-content">
        <div className="container">
          <div className="trip-layout">
            {/* Main Content */}
            <div className="main-content">
              {/* Karta: Informace o plavbě */}
              <TripInfoCard trip={trip} viewType="public" onShowMore={() => setShowInfoModal(true)} />

              {/* Karta: Lokalita */}
              <TripLocationCard trip={trip} />

              {/* Karta: Lodě */}
              <div className="card animate-in delay-2">
                <div className="card-header">
                  <h4 className="card-title">
                    <i className="fas fa-ship" style={{ color: 'var(--turquoise)' }}></i>
                    Lodě
                  </h4>
                </div>
                
                {boats.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-lg)' }}>
                    {boats.map((boat) => {
                      // Only show participant count if user is authenticated (has access to participant data)
                      const showParticipantCount = user && participants.length > 0
                      const boatParticipants = showParticipantCount ? participants.filter(p => p.boatId === boat.id) : []
                      
                      return (
                        <BoatCard
                          key={boat.id}
                          boat={boat}
                          participantCount={boatParticipants.length}
                          showDetails={true}
                          viewType="public"
                        />
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                    Zatím nejsou přidány žádné lodě.
                  </p>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <aside>
              {/* Info Card */}
                <div className="sidebar-card animate-in delay-1" style={{ marginBottom: 'var(--space-lg)' }}>
                <h4>
                  <i className="fas fa-info-circle" style={{ color: 'var(--turquoise)' }}></i>
                  Základní info
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                  {trip.price && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                      <span className="text-muted" style={{ flexShrink: 0 }}>Cena</span>
                      <span className="font-semibold" style={{ textAlign: 'right', wordBreak: 'break-word' }}>{trip.price}</span>
                    </div>
                  )}
                  {trip.startDate && trip.endDate && (() => {
                    const start = trip.startDate.toDate ? trip.startDate.toDate() : new Date(trip.startDate.seconds * 1000)
                    const end = trip.endDate.toDate ? trip.endDate.toDate() : new Date(trip.endDate.seconds * 1000)
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                        <span className="text-muted" style={{ flexShrink: 0 }}>Délka plavby</span>
                        <span className="font-semibold" style={{ textAlign: 'right', wordBreak: 'break-word' }}>{days} {days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}</span>
                      </div>
                    )
                  })()}
                  {trip.checkInDateTime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                      <span className="text-muted" style={{ flexShrink: 0 }}>Check-in</span>
                      <span className="font-semibold" style={{ textAlign: 'right', wordBreak: 'break-word' }}>{formatDateTime(trip.checkInDateTime)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contacts Card */}
              {organizerContacts && (
                <ContactsCard contacts={[{
                  ...organizerContacts,
                  role: 'organizer'
                }]} />
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: 'var(--ocean-deep)', color: 'white', padding: 'var(--space-xl) 0', textAlign: 'center' }}>
        <div className="container">
          <Link to="/" className="logo" style={{ justifyContent: 'center', color: 'white', marginBottom: 'var(--space-md)' }}>
            <div className="logo-icon" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <i className="fas fa-sailboat"></i>
            </div>
            SailPlan
          </Link>
          <p style={{ opacity: 0.6, fontSize: '0.875rem' }}>© 2025 SailPlan. Všechna práva vyhrazena.</p>
        </div>
      </footer>

      {/* Více informací Modal */}
      {showInfoModal && (
        <div className="modal-overlay active" onClick={() => setShowInfoModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Informace o plavbě</h4>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowInfoModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ color: 'var(--gray-600)', lineHeight: 1.8 }}>
                {trip.descriptionForParticipants ? (
                  <p style={{ marginBottom: 'var(--space-md)', whiteSpace: 'pre-wrap' }}>{trip.descriptionForParticipants}</p>
                ) : (
                  <p style={{ marginBottom: 'var(--space-md)', color: 'var(--gray-400)' }}>
                    Zatím není přidán popis plavby.
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowInfoModal(false)}>Zavřít</button>
              <button className="btn btn-primary" onClick={() => { 
                setShowInfoModal(false)
                if (!user) {
                  navigate(`/onboarding?mode=join-trip&tripId=${tripId}`)
                } else {
                  setShowJoinModal(true)
                }
              }}>
                <i className="fas fa-plus-circle"></i>
                Chci se přidat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <JoinTripModal 
          tripId={tripId}
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false)
            // Redirect to login or dashboard after successful join
            navigate('/login')
          }}
        />
      )}
    </>
  )
}
