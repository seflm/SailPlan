import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { tripService } from '../services/tripService'
import { boatService } from '../services/boatService'
import { canEditTrip } from '../utils/permissions'
import './TripForm.css'

export default function BoatForm() {
  const { tripId, boatId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthState()
  const isEdit = !!boatId

  const [trip, setTrip] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    length: '',
    year: '',
    cabins: '',
    capacity: '',
    charterLink: '',
    thumbnailUrl: ''
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tripId && user) {
      loadData()
    }
  }, [tripId, boatId, user])

  const loadData = async () => {
    setLoading(true)
    
    const tripResult = await tripService.getTrip(tripId)
    if (tripResult.data) {
      setTrip(tripResult.data)
    }

    if (isEdit && boatId) {
      const boatResult = await boatService.getBoat(boatId)
      if (boatResult.data) {
        setFormData({
          name: boatResult.data.name || '',
          model: boatResult.data.model || '',
          length: boatResult.data.length || '',
          year: boatResult.data.year || '',
          cabins: boatResult.data.cabins || '',
          capacity: boatResult.data.capacity || '',
          charterLink: boatResult.data.charterLink || '',
          thumbnailUrl: boatResult.data.thumbnailUrl || ''
        })
      }
    }

    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user) {
      alert('Musíte být přihlášeni')
      return
    }

    if (!trip || !canEditTrip(trip, user.uid)) {
      alert('Nemáte oprávnění upravovat tuto plavbu')
      return
    }

    setSaving(true)

    const boatData = {
      ...formData,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
      year: formData.year ? parseInt(formData.year) : null,
      cabins: formData.cabins ? parseInt(formData.cabins) : null
    }

    if (isEdit) {
      const { error } = await boatService.updateBoat(boatId, boatData)
      if (error) {
        alert('Chyba při ukládání: ' + error)
        setSaving(false)
        return
      }
      navigate(`/trip/${tripId}/organizer`)
    } else {
      const { id, error } = await boatService.createBoat(tripId, boatData)
      if (error) {
        alert('Chyba při vytváření: ' + error)
        setSaving(false)
        return
      }
      navigate(`/trip/${tripId}/organizer`)
    }
    
    setSaving(false)
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
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <Link to={`/trip/${tripId}/organizer`}>{trip.name || 'Plavba'}</Link>
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <span>{isEdit ? 'Upravit loď' : 'Nová loď'}</span>
            </div>
            
            <div className="trip-title-row" style={{ marginTop: 'var(--space-lg)' }}>
              <div>
                <h1 className="trip-title" style={{ fontSize: '2rem' }}>
                  {isEdit ? 'Upravit loď' : 'Nová loď'}
                </h1>
                {isEdit && formData.name && (
                  <p style={{ color: 'var(--gray-400)', marginTop: 'var(--space-sm)' }}>{formData.name}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
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
                  form="boat-form"
                  className="btn btn-coral"
                  disabled={saving}
                >
                  <i className="fas fa-save"></i>
                  {saving ? 'Ukládání...' : (isEdit ? 'Uložit změny' : 'Vytvořit loď')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="trip-content">
        <div className="container" style={{ maxWidth: '1000px' }}>
          <form id="boat-form" onSubmit={handleSubmit}>
            {/* Basic Info Section */}
            <div className="form-section animate-in">
              <div className="form-section-header">
                <div className="form-section-title">
                  <div>
                    <h3>
                      <i className="fas fa-ship" style={{ color: 'var(--turquoise)', marginRight: 'var(--space-sm)' }}></i>
                      Informace o lodi
                    </h3>
                    <p>Základní údaje o lodi</p>
                  </div>
                </div>
              </div>
              
              <div className="form-grid three-cols">
                <div className="form-group">
                  <label className="form-label">Název lodě</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="např. Mořská Víla"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="např. Bavaria 46"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kapacita</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="např. 8"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Délka</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    placeholder="např. 14.27m"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rok výroby</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="např. 2019"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kajuty</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.cabins}
                    onChange={(e) => setFormData({ ...formData, cabins: e.target.value })}
                    placeholder="např. 4"
                    min="1"
                  />
                </div>
              </div>
              
              <div className="form-grid two-cols" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="form-group">
                  <label className="form-label">Odkaz na chartrovku</label>
                  <input
                    type="url"
                    className="form-input"
                    value={formData.charterLink}
                    onChange={(e) => setFormData({ ...formData, charterLink: e.target.value })}
                    placeholder="https://..."
                  />
                  <p className="form-help">Odkaz na web chartrovky s informacemi o lodi</p>
                </div>
                <div className="form-group">
                  <label className="form-label">URL obrázku lodě</label>
                  <input
                    type="url"
                    className="form-input"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                    placeholder="https://..."
                  />
                  <p className="form-help">Odkaz na obrázek lodě (externí server)</p>
                </div>
              </div>
              
              {formData.thumbnailUrl && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <label className="form-label">Náhled obrázku</label>
                  <div style={{ marginTop: 'var(--space-sm)' }}>
                    <img 
                      src={formData.thumbnailUrl} 
                      alt="Náhled lodě" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px', 
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--gray-200)'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'block'
                      }}
                    />
                    <div style={{ display: 'none', padding: 'var(--space-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--gray-500)' }}>
                      Obrázek se nepodařilo načíst
                    </div>
                  </div>
                </div>
              )}
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
                {saving ? 'Ukládání...' : (isEdit ? 'Uložit změny' : 'Vytvořit loď')}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

