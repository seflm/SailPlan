import { useState, useEffect } from 'react'
import { crewlistService } from '../services/crewlistService'
import './CrewlistForm.css'

export default function CrewlistForm({ tripId, boatId, userId, role, onSave }) {
  const [template, setTemplate] = useState(null)
  const [formData, setFormData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadTemplateAndData()
  }, [tripId, boatId, userId])

  const loadTemplateAndData = async () => {
    setLoading(true)
    
    // Load template
    const { data: templateData } = await crewlistService.getTemplate(tripId)
    if (templateData) {
      setTemplate(templateData)
      
      // Get fields for this role
      const roleFields = templateData.fields?.[role] || templateData.fields?.participant || []
      
      // Initialize form data
      const initialData = {}
      roleFields.forEach(field => {
        initialData[field.id] = field.defaultValue || ''
      })
      setFormData(initialData)
      
      // Load existing data
      if (boatId) {
        const { data: existingData } = await crewlistService.getCrewlistData(tripId, boatId, userId)
        if (existingData) {
          setFormData(prev => ({ ...prev, ...existingData }))
        }
      }
    }
    
    setLoading(false)
  }

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!boatId) {
      setError('Nejste přiřazeni k žádné lodi')
      return
    }
    
    setSaving(true)
    setError(null)
    
    const { id, error: saveError } = await crewlistService.saveCrewlistData(tripId, boatId, userId, formData)
    
    if (saveError) {
      setError(saveError)
    } else {
      if (onSave) {
        onSave()
      }
    }
    
    setSaving(false)
  }

  if (loading) {
    return <div className="crewlist-loading">Načítání formuláře...</div>
  }

  if (!template || !template.fields) {
    return (
      <div className="crewlist-empty">
        <p>Organizátor zatím nedefinoval požadované údaje pro crewlist.</p>
      </div>
    )
  }

  const roleFields = template.fields[role] || template.fields.participant || []

  if (roleFields.length === 0) {
    return (
      <div className="crewlist-empty">
        <p>Pro vaši roli nejsou vyžadovány žádné údaje do crewlistu.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="crewlist-form">
      {error && (
        <div className="crewlist-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}
      
      {roleFields.map((field) => (
        <div key={field.id} className="form-group">
          <label className="form-label">
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              className="form-input"
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              placeholder={field.placeholder}
              rows={3}
            />
          ) : (
            <input
              type={field.type || 'text'}
              className="form-input"
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
            />
          )}
          {field.helpText && (
            <p className="form-help">{field.helpText}</p>
          )}
        </div>
      ))}
      
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving || !boatId}>
          {saving ? 'Ukládání...' : 'Uložit crewlist'}
        </button>
      </div>
    </form>
  )
}


