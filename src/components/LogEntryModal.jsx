import { useState } from 'react'
import { createPortal } from 'react-dom'
import { boatLogService } from '../services/boatLogService'

export default function LogEntryModal({ tripId, boatId, entry, onClose, onSave }) {
  const [formData, setFormData] = useState({
    date: entry?.date?.toDate 
      ? entry.date.toDate().toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0],
    route: entry?.route || '',
    engineHours: entry?.engineHours !== null && entry?.engineHours !== undefined ? entry.engineHours : '',
    distanceTotal: entry?.distanceTotal !== null && entry?.distanceTotal !== undefined ? entry.distanceTotal : '',
    distanceSails: entry?.distanceSails !== null && entry?.distanceSails !== undefined ? entry.distanceSails : '',
    fuel: entry?.fuel !== null && entry?.fuel !== undefined ? entry.fuel : '',
    notes: entry?.notes || ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const logData = {
      date: formData.date,
      route: formData.route,
      engineHours: formData.engineHours !== '' && formData.engineHours !== null && formData.engineHours !== undefined 
        ? parseFloat(formData.engineHours) 
        : null,
      distanceTotal: formData.distanceTotal !== '' && formData.distanceTotal !== null && formData.distanceTotal !== undefined 
        ? parseFloat(formData.distanceTotal) 
        : null,
      distanceSails: formData.distanceSails !== '' && formData.distanceSails !== null && formData.distanceSails !== undefined 
        ? parseFloat(formData.distanceSails) 
        : null,
      fuel: formData.fuel !== '' && formData.fuel !== null && formData.fuel !== undefined 
        ? parseFloat(formData.fuel) 
        : null,
      notes: formData.notes
    }

    let result
    if (entry) {
      result = await boatLogService.updateLogEntry(entry.id, logData)
    } else {
      result = await boatLogService.createLogEntry(tripId, boatId, logData)
    }

    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      onSave()
    }
  }

  const modalContent = (
    <div 
      className="modal-overlay active" 
      onClick={onClose}
    >
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className="modal-header">
          <h4>
            <i className="fas fa-book" style={{ color: 'var(--turquoise)', marginRight: 'var(--space-sm)' }}></i>
            {entry ? 'Upravit záznam' : 'Nový záznam v deníku'}
          </h4>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ 
                padding: 'var(--space-md)', 
                background: 'var(--danger-light)', 
                color: 'var(--danger)', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: 'var(--space-md)' 
              }}>
                {error}
              </div>
            )}
            
            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Datum *</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Trasa</label>
              <input
                type="text"
                className="form-input"
                value={formData.route}
                onChange={(e) => setFormData(prev => ({ ...prev, route: e.target.value }))}
                placeholder="např. Hvar → Vis"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Koncové motohodiny</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={formData.engineHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, engineHours: e.target.value }))}
                  placeholder="např. 127.5"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Stav paliva (%)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  className="form-input"
                  value={formData.fuel}
                  onChange={(e) => setFormData(prev => ({ ...prev, fuel: e.target.value }))}
                  placeholder="např. 80"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Upluto celkem (NM)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={formData.distanceTotal}
                  onChange={(e) => setFormData(prev => ({ ...prev, distanceTotal: e.target.value }))}
                  placeholder="např. 25"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Z toho na plachty (NM)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={formData.distanceSails}
                  onChange={(e) => setFormData(prev => ({ ...prev, distanceSails: e.target.value }))}
                  placeholder="např. 18"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Poznámka</label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Poznámky k dnešní plavbě..."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Zrušit
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Ukládání...' : (entry ? 'Uložit změny' : 'Uložit záznam')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

