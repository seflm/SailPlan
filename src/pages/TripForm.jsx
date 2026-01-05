import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { tripTemplateService } from '../services/tripTemplateService'
import { participantService } from '../services/participantService'
import { crewlistService } from '../services/crewlistService'
import { timelineService } from '../services/timelineService'
import { checklistService } from '../services/checklistService'
import { boatService } from '../services/boatService'
import { Timestamp } from 'firebase/firestore'
import './TripForm.css'

// Collapsable Item Component
function CollapsableItem({ title, icon, children, defaultCollapsed = false, isNew = false, onDelete, deleteLabel }) {
  const [collapsed, setCollapsed] = useState(isNew ? false : defaultCollapsed)
  
  return (
    <div className={`collapsable-item ${collapsed ? 'collapsed' : ''}`}>
      <div className="collapsable-item-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="collapsable-item-header-content">
          <i className={`fas ${icon}`} style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginRight: 'var(--space-xs)' }}></i>
          <h5 className="collapsable-item-title">{title || '(Bez názvu)'}</h5>
        </div>
        <div className="collapsable-item-actions" onClick={(e) => e.stopPropagation()}>
          {onDelete && (
            <button
              type="button"
              className="btn btn-icon btn-ghost btn-sm"
              style={{ color: 'var(--danger)' }}
              onClick={onDelete}
              title={deleteLabel || 'Smazat'}
            >
              <i className="fas fa-trash"></i>
            </button>
          )}
          <i className={`fas fa-chevron-down`} style={{ 
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition-fast)',
            fontSize: '0.75rem',
            color: 'var(--gray-400)',
            marginLeft: 'var(--space-sm)'
          }}></i>
        </div>
      </div>
      {!collapsed && (
        <div className="collapsable-item-content">
          {children}
        </div>
      )}
    </div>
  )
}

export default function TripForm() {
  const { tripId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthState()
  const isEdit = !!tripId
  const templateId = searchParams.get('template')
  const createTemplate = searchParams.get('createTemplate') === 'true'
  const templateName = searchParams.get('templateName')

  const [formData, setFormData] = useState({
    name: templateName || '',
    startDate: '',
    endDate: '',
    startLocation: '',
    endLocation: '',
    locationName: '',
    locationDescription: '',
    locationImageUrl: '',
    checkInDateTime: '',
    checkOutDateTime: '',
    tripStops: [],
    description: '',
    descriptionForParticipants: '',
    price: '',
    priceNote: '',
    deposit: '',
    paymentInfo: {
      accountNumber: '',
      iban: '',
      notes: ''
    },
    bannerImageUrl: '',
    usefulLinks: []
  })
  const [crewlistFields, setCrewlistFields] = useState({
    participant: [],
    captain: []
  })
  const [timelineEvents, setTimelineEvents] = useState([])
  const [checklistTemplates, setChecklistTemplates] = useState([])
  const [assignedChecklists, setAssignedChecklists] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newItemIds, setNewItemIds] = useState(new Set())

  useEffect(() => {
    if (user) {
      loadChecklistTemplates()
    }
    if (isEdit && tripId) {
      loadTrip()
      loadCrewlistTemplate()
      loadTimelineEvents()
      loadAssignedChecklists()
    } else if (templateId) {
      loadTemplate()
    }
  }, [tripId, isEdit, templateId, user])

  const loadTrip = async () => {
    const { data, error } = await tripService.getTrip(tripId)
    if (!error && data) {
      // Helper to convert Firestore timestamp to datetime-local string
      const toDateTimeLocal = (timestamp) => {
        if (!timestamp) return ''
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }

      setFormData({
        name: data.name || '',
        startDate: data.startDate ? (data.startDate.toDate ? data.startDate.toDate().toISOString().split('T')[0] : new Date(data.startDate.seconds * 1000).toISOString().split('T')[0]) : '',
        endDate: data.endDate ? (data.endDate.toDate ? data.endDate.toDate().toISOString().split('T')[0] : new Date(data.endDate.seconds * 1000).toISOString().split('T')[0]) : '',
        startLocation: data.startLocation || '',
        endLocation: data.endLocation || '',
        locationName: data.locationName || '',
        locationDescription: data.locationDescription || '',
        locationImageUrl: data.locationImageUrl || '',
        description: data.description || '',
        descriptionForParticipants: data.descriptionForParticipants || '',
        price: data.price || '',
        priceNote: data.priceNote || '',
        deposit: data.deposit || '',
        paymentInfo: data.paymentInfo || {
          accountNumber: '',
          iban: '',
          notes: ''
        },
        bannerImageUrl: data.bannerImageUrl || '',
        usefulLinks: data.usefulLinks || [],
        checkInDateTime: data.checkInDateTime ? toDateTimeLocal(data.checkInDateTime) : '',
        checkOutDateTime: data.checkOutDateTime ? toDateTimeLocal(data.checkOutDateTime) : '',
        tripStops: Array.isArray(data.tripStops) ? data.tripStops : (data.tripStops ? [{ id: Date.now().toString(), name: data.tripStops, description: '', imageUrl: '' }] : [])
      })
    }
  }

  const loadCrewlistTemplate = async () => {
    const { data: template } = await crewlistService.getTemplate(tripId)
    if (template) {
      setCrewlistFields({
        participant: template.fields?.participant || [],
        captain: template.fields?.captain || []
      })
    } else {
      // No template exists yet, initialize with empty arrays
      setCrewlistFields({
        participant: [],
        captain: []
      })
    }
  }

  const loadTimelineEvents = async () => {
    const { events, error } = await timelineService.getTripEvents(tripId)
    if (!error && events) {
      // Convert timestamps to date strings for form inputs
      const eventsWithDates = events.map(event => ({
        ...event,
        date: event.date ? (event.date.toDate ? event.date.toDate().toISOString().split('T')[0] : new Date(event.date.seconds * 1000).toISOString().split('T')[0]) : ''
      }))
      setTimelineEvents(eventsWithDates)
    } else {
      setTimelineEvents([])
    }
  }

  const loadChecklistTemplates = async () => {
    if (!user) return
    const { templates, error } = await checklistService.getTemplates(user.uid)
    if (!error) {
      setChecklistTemplates(templates)
    }
  }

  const loadAssignedChecklists = async () => {
    const { data: trip } = await tripService.getTrip(tripId)
    if (trip && trip.assignedChecklists) {
      setAssignedChecklists(trip.assignedChecklists)
    } else {
      setAssignedChecklists([])
    }
  }

  const saveTimelineEvents = async (currentTripId) => {
    // Get existing events to compare
    const { events: existingEvents } = await timelineService.getTripEvents(currentTripId)
    const existingEventIds = new Set(existingEvents?.map(e => e.id) || [])
    const newEventIds = new Set(timelineEvents.map(e => e.id).filter(id => id))

    // Delete events that were removed
    for (const existingEvent of existingEvents || []) {
      if (!newEventIds.has(existingEvent.id)) {
        await timelineService.deleteEvent(existingEvent.id)
      }
    }

    // Save or update events
    for (let i = 0; i < timelineEvents.length; i++) {
      const event = timelineEvents[i]
      const eventData = {
        name: event.name || '',
        description: event.description || '',
        type: event.type || 'custom',
        date: event.date || null,
        roles: event.roles || [],
        checkable: event.checkable !== false,
        order: i
      }

      if (event.id && existingEventIds.has(event.id)) {
        // Update existing event
        await timelineService.updateEvent(event.id, eventData)
      } else {
        // Create new event
        await timelineService.createEvent(currentTripId, eventData)
      }
    }
  }

  const createChecklistInstances = async (currentTripId) => {
    // Get all participants and boats for the trip
    const { participants: tripParticipants } = await participantService.getTripParticipants(currentTripId)
    const { boats: tripBoats } = await boatService.getTripBoats(currentTripId)

    // Get all existing instances for this trip
    const { instances: existingInstances } = await checklistService.getTripInstances(currentTripId)

    // Build a set of expected instances based on current assignments
    // Format: "templateId:role:userId" or "templateId:boatId" or "templateId:organizer"
    const expectedInstances = new Set()

    // Process current assignments to determine which instances should exist
    for (const assignment of assignedChecklists) {
      const { templateId, roles, assignToBoats } = assignment
      if (!templateId) continue

      // If assigned to roles, add expected instances for each participant with that role
      if (roles && roles.length > 0) {
        for (const role of roles) {
          if (role === 'organizer') {
            expectedInstances.add(`${templateId}:organizer:`)
          } else {
            const roleParticipants = tripParticipants.filter(p => p.role === role)
            for (const participant of roleParticipants) {
              expectedInstances.add(`${templateId}:${role}:${participant.userId}`)
            }
          }
        }
      }

      // If assigned to boats, add expected instances for each boat
      if (assignToBoats) {
        for (const boat of tripBoats) {
          expectedInstances.add(`${templateId}::${boat.id}`)
        }
      }
    }

    // Find instances that should be deleted (exist but are not in expected set)
    const instancesToDelete = []
    for (const instance of existingInstances) {
      const templateId = instance.templateId
      const role = instance.role || ''
      const userId = instance.userId || ''
      const boatId = instance.boatId || ''
      
      let instanceKey = ''
      if (role === 'organizer') {
        instanceKey = `${templateId}:organizer:`
      } else if (boatId) {
        instanceKey = `${templateId}::${boatId}`
      } else if (role && userId) {
        instanceKey = `${templateId}:${role}:${userId}`
      }

      if (instanceKey && !expectedInstances.has(instanceKey)) {
        instancesToDelete.push(instance.id)
      }
    }

    // Delete instances that are no longer assigned
    if (instancesToDelete.length > 0) {
      const { error: deleteError } = await checklistService.deleteInstances(instancesToDelete)
      if (deleteError) {
        console.error('Chyba při mazání instancí checklistů:', deleteError)
        // Don't fail the whole operation, just log the error
      }
    }

    // Create instances for each assigned checklist
    // Note: createInstance now handles duplicate checking internally to prevent race conditions
    for (const assignment of assignedChecklists) {
      const { templateId, roles, assignToBoats } = assignment
      if (!templateId) continue

      // Track which users already have instances for this template to prevent duplicates
      // when the same checklist is assigned to multiple roles
      const usersWithInstances = new Set()

      // If assigned to roles, create instance for each participant with that role
      // Also create for organizer if they are assigned, even if not a participant
      if (roles && roles.length > 0) {
        for (const role of roles) {
          if (role === 'organizer') {
            // For organizer role, create instance with organizerId but no userId
            // This allows organizer to see checklist even if not a participant
            await checklistService.createInstance(currentTripId, templateId, {
              role: 'organizer'
            })
            // Note: createInstance handles duplicate checking
          } else {
            // For other roles, create instance for each participant with that role
            const roleParticipants = tripParticipants.filter(p => p.role === role)
            for (const participant of roleParticipants) {
              // Prevent creating multiple instances for the same user and template
              // even if assigned to multiple roles
              if (!usersWithInstances.has(participant.userId)) {
                const result = await checklistService.createInstance(currentTripId, templateId, {
                  role: role,
                  userId: participant.userId
                })
                // If instance was created (not duplicate), mark user as having instance
                if (result.id && !result.duplicate) {
                  usersWithInstances.add(participant.userId)
                }
              }
            }
          }
        }
      }

      // If assigned to boats, create instance for each boat
      if (assignToBoats) {
        for (const boat of tripBoats) {
          await checklistService.createInstance(currentTripId, templateId, {
            boatId: boat.id
          })
          // Note: createInstance handles duplicate checking
        }
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user) {
      alert('Musíte být přihlášeni')
      return
    }

    setSaving(true)

    const tripData = {
      ...formData,
      organizerId: user.uid,
      startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : null,
      endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
      checkInDateTime: formData.checkInDateTime ? Timestamp.fromDate(new Date(formData.checkInDateTime)) : null,
      checkOutDateTime: formData.checkOutDateTime ? Timestamp.fromDate(new Date(formData.checkOutDateTime)) : null,
      price: formData.price || null,
      deposit: formData.deposit ? parseFloat(formData.deposit) : null,
      assignedChecklists: assignedChecklists
    }

    // Remove UI-only fields
    delete tripData.addOrganizerAsParticipant
    delete tripData.organizerRole

    if (isEdit) {
      const { error } = await tripService.updateTrip(tripId, tripData)
      if (error) {
        alert('Chyba při ukládání: ' + error)
        setSaving(false)
        return
      }
      
      // Save crewlist template (always save, even if empty, to allow clearing)
      const { error: crewlistError } = await crewlistService.saveTemplate(tripId, {
        fields: {
          participant: crewlistFields.participant || [],
          captain: crewlistFields.captain || []
        }
      })
      if (crewlistError) {
        console.error('Chyba při ukládání crewlist templatu:', crewlistError)
        alert('Chyba při ukládání definice crewlistu: ' + crewlistError)
      }
      
      // Save timeline events
      await saveTimelineEvents(tripId)
      
      // Create checklist instances
      await createChecklistInstances(tripId)
      
      navigate(`/trip/${tripId}/organizer`)
    } else {
      const { id, password, error } = await tripService.createTrip(tripData)
      if (error) {
        alert('Chyba při vytváření: ' + error)
        setSaving(false)
        return
      }

      // Save crewlist template (always save, even if empty, to allow clearing)
      if (id) {
        const { error: crewlistError } = await crewlistService.saveTemplate(id, {
          fields: {
            participant: crewlistFields.participant || [],
            captain: crewlistFields.captain || []
          }
        })
        if (crewlistError) {
          console.error('Chyba při ukládání crewlist templatu:', crewlistError)
          alert('Chyba při ukládání definice crewlistu: ' + crewlistError)
        }
        
        // Save timeline events
        await saveTimelineEvents(id)
        
        // Create checklist instances
        await createChecklistInstances(id)
      }

      // If creating template, save it
      if (createTemplate && id) {
        const { error: templateError } = await tripTemplateService.createTemplate(user.uid, id, {
          name: formData.name || 'Bez názvu',
          description: formData.description || ''
        })
        if (templateError) {
          console.error('Chyba při vytváření templatu:', templateError)
        }
      }

      navigate(`/trip/${id}/organizer`)
      return
    }
    
    setSaving(false)
  }

  const handleDeleteTrip = async () => {
    if (!confirm('Opravdu chcete smazat tuto plavbu? Tato akce je nevratná a smaže všechny související data (účastníky, lodě, dokumenty, atd.).')) {
      return
    }
    
    if (!confirm('Jste si jisti? Tato akce je definitivní.')) {
      return
    }

    setDeleting(true)
    const { error } = await tripService.deleteTrip(tripId)
    if (error) {
      alert('Chyba při mazání plavby: ' + error)
      setDeleting(false)
    } else {
      navigate('/organizing')
    }
  }

  return (
    <div>
      {/* Trip Header */}
      <div className="trip-header" style={{ padding: 'var(--space-xl) 0' }}>
        <div className="container">
          <div className="trip-header-content">
            <div className="breadcrumb">
              <Link to="/dashboard"><i className="fas fa-home"></i></Link>
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <Link to="/organizing">Organizuji</Link>
              {isEdit && (
                <>
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
                  <Link to={`/trip/${tripId}/organizer`}>{formData.name || 'Plavba'}</Link>
                </>
              )}
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <span>{isEdit ? 'Upravit' : 'Nová plavba'}</span>
            </div>
            
            <div className="trip-title-row" style={{ marginTop: 'var(--space-lg)' }}>
              <div>
                <h1 className="trip-title" style={{ fontSize: '2rem' }}>
                  {isEdit ? 'Upravit plavbu' : 'Nová plavba'}
                </h1>
                {isEdit && formData.name && (
                  <p style={{ color: 'var(--gray-400)', marginTop: 'var(--space-sm)' }}>{formData.name}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                {isEdit && (
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    onClick={handleDeleteTrip}
                    disabled={deleting}
                    style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)', color: 'white' }}
                  >
                    <i className="fas fa-trash"></i>
                    {deleting ? 'Mazání...' : 'Smazat plavbu'}
                  </button>
                )}
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={() => navigate(-1)}
                  style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                >
                  <i className="fas fa-times"></i>
                  Zrušit
                </button>
                <button 
                  type="submit" 
                  form="trip-form"
                  className="btn btn-coral"
                  disabled={saving}
                >
                  <i className="fas fa-save"></i>
                  {saving ? 'Ukládání...' : (isEdit ? 'Uložit změny' : 'Vytvořit plavbu')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="trip-content">
        <div className="container" style={{ maxWidth: '1000px' }}>
          <form id="trip-form" onSubmit={handleSubmit}>
            {/* Basic Info Section */}
            <div className="form-section animate-in">
              <div className="form-section-header">
                <div className="form-section-title">
                  <div>
                    <h3>
                      <i className="fas fa-info-circle" style={{ color: 'var(--turquoise)', marginRight: 'var(--space-sm)' }}></i>
                      Základní informace
                    </h3>
                    <p>Hlavní údaje o plavbě viditelné pro účastníky</p>
                  </div>
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Název plavby *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">URL banner obrázku (volitelně)</label>
                  <input
                    type="url"
                    className="form-input"
                    value={formData.bannerImageUrl}
                    onChange={(e) => setFormData({ ...formData, bannerImageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                    Banner obrázek pro hlavičku plavby (doporučený poměr stran 4:1)
                  </p>
                  {formData.bannerImageUrl && (
                    <div style={{ marginTop: 'var(--space-sm)' }}>
                      <img 
                        src={formData.bannerImageUrl} 
                        alt="Náhled banneru" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '200px', 
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--gray-200)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Datum od *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Datum do *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cena zájezdu</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="např. 12 000 Kč"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Poznámka k ceně</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.priceNote}
                    onChange={(e) => setFormData({ ...formData, priceNote: e.target.value })}
                    placeholder="Co je/není v ceně..."
                  />
                </div>
              </div>

              {/* Payment Information Section */}
              <div style={{ 
                gridColumn: '1 / -1', 
                marginTop: 'var(--space-lg)',
                padding: 'var(--space-lg)',
                background: 'var(--gray-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)'
              }}>
                <h5 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem', fontWeight: 600 }}>
                  <i className="fas fa-money-bill-wave" style={{ color: 'var(--coral)', marginRight: 'var(--space-xs)' }}></i>
                  Informace o platbách
                </h5>
                <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                  Tyto informace se zobrazí účastníkům v modalu po kliknutí na tlačítko u ceny nebo v timeline eventech typu platba.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label className="form-label">Číslo účtu *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.paymentInfo?.accountNumber || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        paymentInfo: { 
                          ...formData.paymentInfo, 
                          accountNumber: e.target.value 
                        } 
                      })}
                      placeholder="např. 1234567890"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IBAN (volitelný)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.paymentInfo?.iban || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        paymentInfo: { 
                          ...formData.paymentInfo, 
                          iban: e.target.value 
                        } 
                      })}
                      placeholder="např. CZ6508000000192000145399"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Další informace</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={formData.paymentInfo?.notes || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        paymentInfo: { 
                          ...formData.paymentInfo, 
                          notes: e.target.value 
                        } 
                      })}
                      placeholder="Další informace k platbě, termíny, způsob platby..."
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
                <div className="form-group full-width">
                  <label className="form-label">Zkrácený popis (volitelný)</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    style={{ resize: 'vertical' }}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tento popis uvidí zájemci, kteří ještě nejsou účastníky plavby..."
                  />
                  <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                    Zobrazí se na veřejné stránce plavby pro zájemce. Pokud není vyplněn, zobrazí se popis pro účastníky.
                  </p>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Popis</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    style={{ resize: 'vertical' }}
                    value={formData.descriptionForParticipants}
                    onChange={(e) => setFormData({ ...formData, descriptionForParticipants: e.target.value })}
                    placeholder="Tento popis uvidí pouze účastníci, kteří se již připojili k plavbě..."
                  />
                  <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                    Zobrazí se pouze účastníkům, kteří se již připojili k plavbě.
                  </p>
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="form-section animate-in delay-1">
              <div className="form-section-header">
                <div className="form-section-title">
                  <div>
                    <h3>
                      <i className="fas fa-map-marker-alt" style={{ color: 'var(--coral)', marginRight: 'var(--space-sm)' }}></i>
                      Lokality
                    </h3>
                    <p>Místo startu, cíle a zastávky během plavby</p>
                  </div>
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Název lokality (volitelně)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.locationName}
                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                    placeholder="Např. Jadranské moře, Chorvatsko"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Popis lokality (volitelně)</label>
                  <textarea
                    className="form-input"
                    value={formData.locationDescription}
                    onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })}
                    placeholder="Popis lokality, zajímavosti, tipy..."
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Místo startu *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.startLocation}
                    onChange={(e) => setFormData({ ...formData, startLocation: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Místo cíle (volitelně)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.endLocation}
                    onChange={(e) => setFormData({ ...formData, endLocation: e.target.value })}
                    placeholder="Stejný jako start"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Obrázek lokality (volitelně)</label>
                  <input
                    type="url"
                    className="form-input"
                    value={formData.locationImageUrl}
                    onChange={(e) => setFormData({ ...formData, locationImageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                  <small className="text-muted" style={{ display: 'block', marginTop: 'var(--space-xs)', fontSize: '0.875rem' }}>
                    URL obrázku, který se zobrazí na kartě lokality
                  </small>
                </div>
                <div className="form-group">
                  <label className="form-label">Check-in datum a čas</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.checkInDateTime}
                    onChange={(e) => setFormData({ ...formData, checkInDateTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Check-out datum a čas</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.checkOutDateTime}
                    onChange={(e) => setFormData({ ...formData, checkOutDateTime: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Zastávky během plavby</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {formData.tripStops.map((stop, index) => (
                      <CollapsableItem
                        key={stop.id}
                        title={stop.name || `Zastávka ${index + 1}`}
                        icon="fa-map-marker-alt"
                        defaultCollapsed={true}
                        isNew={newItemIds.has(stop.id)}
                        onDelete={() => {
                          setNewItemIds(prev => {
                            const next = new Set(prev)
                            next.delete(stop.id)
                            return next
                          })
                          setFormData(prev => ({
                            ...prev,
                            tripStops: prev.tripStops.filter((_, i) => i !== index)
                          }))
                        }}
                        deleteLabel="Smazat zastávku"
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={stop.name || ''}
                            onChange={(e) => {
                              const updated = [...formData.tripStops]
                              updated[index] = { ...updated[index], name: e.target.value }
                              setFormData(prev => ({ ...prev, tripStops: updated }))
                            }}
                            placeholder="Název zastávky (např. Ostrov Brač)"
                          />
                          <textarea
                            className="form-input"
                            rows={2}
                            value={stop.description || ''}
                            onChange={(e) => {
                              const updated = [...formData.tripStops]
                              updated[index] = { ...updated[index], description: e.target.value }
                              setFormData(prev => ({ ...prev, tripStops: updated }))
                            }}
                            placeholder="Popis (volitelně)"
                          />
                          <input
                            type="url"
                            className="form-input"
                            value={stop.imageUrl || ''}
                            onChange={(e) => {
                              const updated = [...formData.tripStops]
                              updated[index] = { ...updated[index], imageUrl: e.target.value }
                              setFormData(prev => ({ ...prev, tripStops: updated }))
                            }}
                            placeholder="URL obrázku (volitelně)"
                          />
                          {stop.imageUrl && (
                            <div style={{ marginTop: 'var(--space-xs)' }}>
                              <img 
                                src={stop.imageUrl} 
                                alt={stop.name || 'Náhled'} 
                                style={{ 
                                  maxWidth: '100%', 
                                  maxHeight: '150px', 
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--gray-200)'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </CollapsableItem>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const newId = Date.now().toString()
                        setNewItemIds(prev => new Set([...prev, newId]))
                        setFormData(prev => ({
                          ...prev,
                          tripStops: [...prev.tripStops, { 
                            id: newId, 
                            name: '', 
                            description: '', 
                            imageUrl: '' 
                          }]
                        }))
                      }}
                    >
                      <i className="fas fa-plus"></i>
                      Přidat zastávku
                    </button>
                  </div>
                  <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                    Přidejte zastávky během plavby. Každá zastávka může mít název, popis a obrázek.
                  </p>
                </div>
              </div>
            </div>

            {/* Useful Links Section */}
            <div className="form-section animate-in delay-2">
              <div className="form-section-header">
                <div className="form-section-title">
                  <div>
                    <h3>
                      <i className="fas fa-link" style={{ color: 'var(--turquoise)', marginRight: 'var(--space-sm)' }}></i>
                      Užitečné odkazy
                    </h3>
                    <p>Přidejte odkazy na externí služby (WhatsApp skupina, SettleUp, atd.)</p>
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {formData.usefulLinks.map((link, index) => (
                    <CollapsableItem
                      key={link.id}
                      title={link.label || `Odkaz ${index + 1}`}
                      icon="fa-link"
                      defaultCollapsed={true}
                      isNew={newItemIds.has(link.id)}
                      onDelete={() => {
                        setNewItemIds(prev => {
                          const next = new Set(prev)
                          next.delete(link.id)
                          return next
                        })
                        setFormData(prev => ({
                          ...prev,
                          usefulLinks: prev.usefulLinks.filter((_, i) => i !== index)
                        }))
                      }}
                      deleteLabel="Smazat odkaz"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={link.label || ''}
                          onChange={(e) => {
                            const updated = [...formData.usefulLinks]
                            updated[index] = { ...updated[index], label: e.target.value }
                            setFormData(prev => ({ ...prev, usefulLinks: updated }))
                          }}
                          placeholder="Název odkazu (např. WhatsApp skupina)"
                        />
                        <input
                          type="url"
                          className="form-input"
                          value={link.url || ''}
                          onChange={(e) => {
                            const updated = [...formData.usefulLinks]
                            updated[index] = { ...updated[index], url: e.target.value }
                            setFormData(prev => ({ ...prev, usefulLinks: updated }))
                          }}
                          placeholder="URL (https://...)"
                        />
                        <input
                          type="text"
                          className="form-input"
                          value={link.icon || ''}
                          onChange={(e) => {
                            const updated = [...formData.usefulLinks]
                            updated[index] = { ...updated[index], icon: e.target.value }
                            setFormData(prev => ({ ...prev, usefulLinks: updated }))
                          }}
                          placeholder="FontAwesome ikona (např. fa-whatsapp) - volitelně"
                        />
                      </div>
                    </CollapsableItem>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const newId = Date.now().toString()
                      setNewItemIds(prev => new Set([...prev, newId]))
                      setFormData(prev => ({
                        ...prev,
                        usefulLinks: [...prev.usefulLinks, { 
                          id: newId, 
                          label: '', 
                          url: '', 
                          icon: '' 
                        }]
                      }))
                    }}
                  >
                    <i className="fas fa-plus"></i>
                    Přidat odkaz
                  </button>
                </div>
              </div>
            </div>

            {/* Crewlist Section */}
            <div className="form-section animate-in delay-2">
              <div className="form-section-header">
                <div className="form-section-title">
                  <div>
                    <h3>
                      <i className="fas fa-clipboard-list" style={{ color: 'var(--coral)', marginRight: 'var(--space-sm)' }}></i>
                      Definice crewlistu
                    </h3>
                    <p>Definujte, jaké údaje potřebujete od účastníků a kapitánů</p>
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <CrewlistFieldsEditor
                  title="Údaje pro účastníky"
                  fields={crewlistFields.participant}
                  onFieldsChange={(fields) => setCrewlistFields(prev => ({ ...prev, participant: fields }))}
                  newItemIds={newItemIds}
                  setNewItemIds={setNewItemIds}
                />
              </div>
              
              <div>
                <CrewlistFieldsEditor
                  title="Údaje pro kapitány"
                  fields={crewlistFields.captain}
                  onFieldsChange={(fields) => setCrewlistFields(prev => ({ ...prev, captain: fields }))}
                  newItemIds={newItemIds}
                  setNewItemIds={setNewItemIds}
                />
              </div>
            </div>

            {/* Timeline Events Section */}
            <div className="form-section animate-in delay-3">
              <div className="form-section-header">
                <div className="form-section-title">
                  <div>
                    <h3>
                      <i className="fas fa-flag-checkered" style={{ color: 'var(--turquoise)', marginRight: 'var(--space-sm)' }}></i>
                      Hlavní checklist (Před plavbou)
                    </h3>
                    <p>Definujte události a úkoly, které je potřeba splnit před plavbou</p>
                  </div>
                </div>
              </div>
              
              <TimelineEventsEditor
                events={timelineEvents}
                onEventsChange={setTimelineEvents}
                newItemIds={newItemIds}
                setNewItemIds={setNewItemIds}
              />
            </div>

            {/* Checklist Assignment Section */}
            <div className="form-section animate-in delay-4">
              <div className="form-section-header">
                <div className="form-section-title">
                  <div>
                    <h3>
                      <i className="fas fa-tasks" style={{ color: 'var(--coral)', marginRight: 'var(--space-sm)' }}></i>
                      Systémové checklisty
                    </h3>
                    <p>Přiřaďte systémové checklisty k rolím nebo lodím</p>
                  </div>
                </div>
              </div>
              
              <ChecklistAssignmentEditor
                checklistTemplates={checklistTemplates}
                assignedChecklists={assignedChecklists}
                onAssignedChange={setAssignedChecklists}
                newItemIds={newItemIds}
                setNewItemIds={setNewItemIds}
              />
            </div>

            {/* Sticky Actions */}
            <div className="sticky-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate(-1)}
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="btn btn-coral"
                disabled={saving}
              >
                <i className="fas fa-save"></i>
                {saving ? 'Ukládání...' : (isEdit ? 'Uložit změny' : 'Vytvořit plavbu')}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

// Crewlist Fields Editor Component
function CrewlistFieldsEditor({ title, fields, onFieldsChange, newItemIds, setNewItemIds }) {
  const addField = () => {
    const newId = `field_${Date.now()}`
    setNewItemIds(prev => new Set([...prev, newId]))
    const newField = {
      id: newId,
      label: '',
      type: 'text',
      required: false,
      helpText: ''
    }
    onFieldsChange([...fields, newField])
  }

  const updateField = (index, updates) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    onFieldsChange(newFields)
  }

  const removeField = (index) => {
    const field = fields[index]
    if (field?.id) {
      setNewItemIds(prev => {
        const next = new Set(prev)
        next.delete(field.id)
        return next
      })
    }
    onFieldsChange(fields.filter((_, i) => i !== index))
  }

  return (
    <div style={{ background: 'var(--gray-50)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
        <h4 style={{ fontSize: '1.125rem', margin: 0 }}>{title}</h4>
        <button type="button" className="btn btn-sm btn-secondary" onClick={addField}>
          <i className="fas fa-plus"></i>
          Přidat pole
        </button>
      </div>
      
      {fields.length === 0 ? (
        <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
          Zatím nejsou definována žádná pole. Klikněte na "Přidat pole" pro přidání prvního pole.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {fields.map((field, index) => (
            <CollapsableItem
              key={field.id}
              title={field.label || `Pole ${index + 1}`}
              icon="fa-list"
              defaultCollapsed={true}
              isNew={newItemIds?.has(field.id)}
              onDelete={() => removeField(index)}
              deleteLabel="Smazat pole"
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Název pole *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    placeholder="např. Jméno a příjmení"
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Typ</label>
                  <select
                    className="form-input"
                    value={field.type}
                    onChange={(e) => updateField(index, { type: e.target.value })}
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="tel">Telefon</option>
                    <option value="date">Datum</option>
                    <option value="textarea">Dlouhý text</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Povinné</label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '1.5rem' }}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(index, { required: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Nápověda (volitelně)</label>
                <input
                  type="text"
                  className="form-input"
                  value={field.helpText || ''}
                  onChange={(e) => updateField(index, { helpText: e.target.value })}
                  placeholder="Volitelná nápověda pro uživatele..."
                />
              </div>
            </CollapsableItem>
          ))}
        </div>
      )}
    </div>
  )
}

// Timeline Events Editor Component
function TimelineEventsEditor({ events, onEventsChange, newItemIds, setNewItemIds }) {
  const addEvent = () => {
    const newId = `event_${Date.now()}`
    setNewItemIds(prev => new Set([...prev, newId]))
    const newEvent = {
      id: newId,
      name: '',
      description: '',
      type: 'custom',
      date: '',
      roles: [],
      checkable: true,
      order: events.length
    }
    onEventsChange([...events, newEvent])
  }

  const updateEvent = (index, updates) => {
    const newEvents = [...events]
    newEvents[index] = { ...newEvents[index], ...updates }
    onEventsChange(newEvents)
  }

  const removeEvent = (index) => {
    const event = events[index]
    if (event?.id && typeof event.id === 'string' && event.id.startsWith('event_')) {
      setNewItemIds(prev => {
        const next = new Set(prev)
        next.delete(event.id)
        return next
      })
    }
    onEventsChange(events.filter((_, i) => i !== index))
  }

  const toggleRole = (index, role) => {
    const event = events[index]
    const roles = event.roles || []
    const newRoles = roles.includes(role)
      ? roles.filter(r => r !== role)
      : [...roles, role]
    updateEvent(index, { roles: newRoles })
  }

  return (
    <div style={{ background: 'var(--gray-50)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
        <h4 style={{ fontSize: '1.125rem', margin: 0 }}>Události před plavbou</h4>
        <button type="button" className="btn btn-sm btn-secondary" onClick={addEvent}>
          <i className="fas fa-plus"></i>
          Přidat událost
        </button>
      </div>
      
      {events.length === 0 ? (
        <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
          Zatím nejsou definované žádné události. Klikněte na "Přidat událost" pro přidání první události.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {events.map((event, index) => {
            const eventId = event.id || `new-${index}`
            return (
              <CollapsableItem
                key={eventId}
                title={event.name || `Událost ${index + 1}`}
                icon="fa-flag-checkered"
                defaultCollapsed={true}
                isNew={newItemIds?.has(eventId)}
                onDelete={() => removeEvent(index)}
                deleteLabel="Smazat událost"
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Název události *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={event.name}
                    onChange={(e) => updateEvent(index, { name: e.target.value })}
                    placeholder="např. Platba zálohy"
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Typ</label>
                  <select
                    className="form-input"
                    value={event.type}
                    onChange={(e) => updateEvent(index, { type: e.target.value })}
                  >
                    <option value="custom">Vlastní</option>
                    <option value="crewlist">Crewlist</option>
                    <option value="payment">Platba</option>
                  </select>
                </div>
              </div>
              
                <div className="form-group" style={{ margin: 0, marginBottom: 'var(--space-sm)' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Popis</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={event.description}
                    onChange={(e) => updateEvent(index, { description: e.target.value })}
                    placeholder="Popis události..."
                  />
                </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Datum splnění (volitelně)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={event.date || ''}
                    onChange={(e) => updateEvent(index, { date: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Možnost označit jako splněno</label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '1.5rem' }}>
                    <input
                      type="checkbox"
                      checked={event.checkable}
                      onChange={(e) => updateEvent(index, { checkable: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ marginLeft: 'var(--space-sm)', fontSize: '0.875rem' }}>Checkable</span>
                  </div>
                </div>
              </div>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 'var(--space-xs)' }}>Pro jaké role je událost určena</label>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  {['organizer', 'captain', 'participant'].map(role => {
                    const roleLabels = {
                      organizer: 'Organizátoři',
                      captain: 'Kapitáni',
                      participant: 'Účastníci'
                    }
                    return (
                      <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={(event.roles || []).includes(role)}
                          onChange={() => toggleRole(index, role)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.875rem' }}>{roleLabels[role]}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </CollapsableItem>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Checklist Assignment Editor Component
function ChecklistAssignmentEditor({ checklistTemplates, assignedChecklists, onAssignedChange, newItemIds, setNewItemIds }) {
  const addAssignment = () => {
    const newId = `assignment_${Date.now()}`
    setNewItemIds(prev => new Set([...prev, newId]))
    const newAssignment = {
      id: newId,
      templateId: '',
      roles: [],
      assignToBoats: false
    }
    onAssignedChange([...assignedChecklists, newAssignment])
  }

  const updateAssignment = (index, updates) => {
    const newAssignments = [...assignedChecklists]
    newAssignments[index] = { ...newAssignments[index], ...updates }
    onAssignedChange(newAssignments)
  }

  const removeAssignment = (index) => {
    const assignment = assignedChecklists[index]
    if (assignment?.id) {
      setNewItemIds(prev => {
        const next = new Set(prev)
        next.delete(assignment.id)
        return next
      })
    }
    onAssignedChange(assignedChecklists.filter((_, i) => i !== index))
  }

  const toggleRole = (index, role) => {
    const assignment = assignedChecklists[index]
    const roles = assignment.roles || []
    const newRoles = roles.includes(role)
      ? roles.filter(r => r !== role)
      : [...roles, role]
    updateAssignment(index, { roles: newRoles })
  }

  return (
    <div style={{ background: 'var(--gray-50)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
        <h4 style={{ fontSize: '1.125rem', margin: 0 }}>Přiřazené checklisty</h4>
        <button type="button" className="btn btn-sm btn-secondary" onClick={addAssignment}>
          <i className="fas fa-plus"></i>
          Přidat přiřazení
        </button>
      </div>
      
      {checklistTemplates.length === 0 ? (
        <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
          Zatím nemáte vytvořené žádné checklist templaty. Vytvořte je v <Link to="/settings/organizer" target="_blank">Nastavení organizátora</Link>.
        </p>
      ) : null}
      
      {assignedChecklists.length === 0 ? (
        <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
          Zatím nejsou přiřazeny žádné checklisty. Klikněte na "Přidat přiřazení" pro přidání prvního přiřazení.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {assignedChecklists.map((assignment, index) => {
            const template = checklistTemplates.find(t => t.id === assignment.templateId)
            const assignmentId = assignment.id || `assignment_${index}`
            return (
              <CollapsableItem
                key={assignmentId}
                title={template?.name || `Checklist ${index + 1}`}
                icon="fa-tasks"
                defaultCollapsed={true}
                isNew={newItemIds?.has(assignmentId)}
                onDelete={() => removeAssignment(index)}
                deleteLabel="Smazat přiřazení"
              >
                <div className="form-group" style={{ margin: 0, marginBottom: 'var(--space-sm)' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Checklist *</label>
                  <select
                    className="form-input"
                    value={assignment.templateId}
                    onChange={(e) => updateAssignment(index, { templateId: e.target.value })}
                    required
                  >
                    <option value="">Vyberte checklist</option>
                    {checklistTemplates.map(template => (
                      <option key={template.id} value={template.id}>{template.name || 'Bez názvu'}</option>
                    ))}
                  </select>
                </div>
                
                {template && (
                  <div style={{ marginBottom: 'var(--space-sm)', padding: 'var(--space-xs) var(--space-sm)', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Popis:</div>
                    <div className="text-sm">{template.description || 'Bez popisu'}</div>
                  </div>
                )}
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 'var(--space-xs)' }}>Přiřadit k</label>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    {['organizer', 'captain', 'participant'].map(role => {
                      const roleLabels = {
                        organizer: 'Organizátoři',
                        captain: 'Kapitáni',
                        participant: 'Účastníci'
                      }
                      return (
                        <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={(assignment.roles || []).includes(role)}
                            onChange={() => toggleRole(index, role)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.875rem' }}>{roleLabels[role]}</span>
                        </label>
                      )
                    })}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={assignment.assignToBoats || false}
                        onChange={() => updateAssignment(index, { assignToBoats: !assignment.assignToBoats })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.875rem' }}>Všem lodím</span>
                    </label>
                  </div>
                </div>
              </CollapsableItem>
            )
          })}
        </div>
      )}
    </div>
  )
}

