import { useState, useEffect } from 'react'
import { crewlistService } from '../services/crewlistService'
import { participantService } from '../services/participantService'
import { canEditCrewlistRow } from '../utils/permissions'
import { loadUserProfiles } from '../utils/userDisplay'
import './CrewlistView.css'

export default function CrewlistView({ tripId, boatId, canEdit = false, userId = null, viewContext = 'participant', trip = null }) {
  const [template, setTemplate] = useState(null)
  const [crewlistData, setCrewlistData] = useState([])
  const [participants, setParticipants] = useState([])
  const [userProfiles, setUserProfiles] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [editingRows, setEditingRows] = useState({}) // Track which rows are being edited: { participantId: { fieldId: value } }
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCrewlistData()
  }, [tripId, boatId])

  const loadCrewlistData = async () => {
    setLoading(true)
    
    // Load template
    const { data: templateData } = await crewlistService.getTemplate(tripId)
    if (templateData) {
      setTemplate(templateData)
    }
    
    // Load crewlist data for boat
    const { data: crewlist } = await crewlistService.getBoatCrewlistData(tripId, boatId)
    setCrewlistData(crewlist)
    
    // Load participants for boat
    const { participants: boatParticipants } = await participantService.getBoatParticipants(tripId, boatId)
    setParticipants(boatParticipants)
    
    // Load user profiles for all participants
    const userIds = boatParticipants.map(p => p.userId)
    if (userIds.length > 0) {
      const profiles = await loadUserProfiles(userIds)
      setUserProfiles(profiles)
    }
    
    setLoading(false)
  }

  // Initialize editing rows when data changes
  useEffect(() => {
    if (!template || !template.fields || !boatId || participants.length === 0) {
      setEditingRows({})
      return
    }
    // Don't auto-initialize editing - user must click edit icon
  }, [template, participants, crewlistData, boatId])

  if (loading) {
    return <div className="crewlist-loading">Načítání crewlistu...</div>
  }

  if (!template || !template.fields) {
    return (
      <div className="crewlist-empty">
        <p>Organizátor zatím nedefinoval požadované údaje pro crewlist.</p>
      </div>
    )
  }

  // Get all fields from all roles
  const allFields = []
  Object.keys(template.fields).forEach(role => {
    template.fields[role].forEach(field => {
      if (!allFields.find(f => f.id === field.id)) {
        allFields.push(field)
      }
    })
  })

  // Get all fields from template
  const participantFields = template.fields?.participant || []
  const captainFields = template.fields?.captain || []
  const allEditableFields = [...participantFields, ...captainFields]

  // Check if user can edit a specific row
  const canEditRow = (targetParticipant) => {
    if (!trip || !userId || !canEdit) return false
    return canEditCrewlistRow(trip, null, targetParticipant, userId, targetParticipant.userId, viewContext)
  }

  // Toggle edit mode for a row
  const toggleEditRow = (participantId) => {
    setEditingRows(prev => {
      if (prev[participantId]) {
        // If already editing, save and exit edit mode
        const editingData = prev[participantId]
        handleSaveRow(participantId, editingData)
        const newState = { ...prev }
        delete newState[participantId]
        return newState
      } else {
        // Enter edit mode - initialize with current data
        const participant = participants.find(p => p.id === participantId)
        if (!participant) return prev
        
        const userData = crewlistData.find(d => d.userId === participant.userId)
        const initialData = {}
        allEditableFields.forEach(field => {
          initialData[field.id] = userData?.[field.id] || ''
        })
        
        return { ...prev, [participantId]: initialData }
      }
    })
  }

  // Handle field change in editing row
  const handleFieldChange = (participantId, fieldId, value) => {
    setEditingRows(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [fieldId]: value
      }
    }))
  }

  // Save row data
  const handleSaveRow = async (participantId, rowData) => {
    const participant = participants.find(p => p.id === participantId)
    if (!participant || !boatId) return
    
    setSaving(true)
    const { id, error } = await crewlistService.saveCrewlistData(tripId, boatId, participant.userId, rowData)
    
    if (error) {
      alert('Chyba při ukládání: ' + error)
      // Revert on error - reload data
      await loadCrewlistData()
    } else {
      // Reload data
      await loadCrewlistData()
    }
    
    setSaving(false)
  }

  // Handle field blur (auto-save on blur)
  const handleFieldBlur = async (participantId, fieldId, value) => {
    const editingData = editingRows[participantId]
    if (!editingData) return
    
    const updatedData = { ...editingData, [fieldId]: value }
    await handleSaveRow(participantId, updatedData)
    
    // Update editing state
    setEditingRows(prev => ({
      ...prev,
      [participantId]: updatedData
    }))
  }

  return (
    <div className="crewlist-view">
      <div className="crewlist-table-container">
        <table className="crewlist-table">
          <thead>
            <tr>
              <th>Jméno</th>
              {allFields.map(field => (
                <th key={field.id}>{field.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participants.map(participant => {
              const userData = crewlistData.find(d => d.userId === participant.userId)
              const isCurrentUser = participant.userId === userId
              const isEditing = !!editingRows[participant.id]
              const canEditThisRow = canEditRow(participant)
              
              return (
                <tr key={participant.id} className={isEditing ? 'editing-row' : ''}>
                  <td className="participant-name" style={{ padding: 'var(--space-md)', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span>
                        {(() => {
                          const profile = userProfiles.get(participant.userId)
                          return profile?.name || 'Neznámý uživatel'
                        })()}
                      </span>
                      {isCurrentUser && (
                        <span className="status-pill info" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Já</span>
                      )}
                      {participant.role === 'captain' && (
                        <span className="status-pill info" style={{ fontSize: '0.75rem' }}>Kapitán</span>
                      )}
                      {canEditThisRow && (
                        <button
                          className="btn btn-icon btn-ghost"
                          style={{ 
                            padding: 'var(--space-xs)', 
                            marginLeft: 'auto',
                            color: isEditing ? 'var(--success)' : 'var(--gray-400)'
                          }}
                          onClick={() => toggleEditRow(participant.id)}
                          title={isEditing ? 'Uložit změny' : 'Upravit řádek'}
                          disabled={saving}
                        >
                          <i className={`fas ${isEditing ? 'fa-check' : 'fa-edit'}`}></i>
                        </button>
                      )}
                    </div>
                  </td>
                  {allFields.map(field => {
                    // Check if this field is editable for this participant
                    const isEditableField = allEditableFields.some(f => f.id === field.id)
                    const shouldBeEditable = isEditing && isEditableField
                    
                    // Get current value
                    let fieldValue = ''
                    if (isEditing && editingRows[participant.id]) {
                      // Use editing data if in edit mode
                      fieldValue = editingRows[participant.id][field.id] !== undefined 
                        ? editingRows[participant.id][field.id] 
                        : (userData?.[field.id] || '')
                    } else {
                      // Use saved data
                      fieldValue = userData?.[field.id] || '-'
                    }
                    
                    return (
                      <td key={field.id} style={{ padding: 'var(--space-md)' }}>
                        {shouldBeEditable ? (
                          field.type === 'textarea' ? (
                            <textarea
                              className="form-input"
                              style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
                              value={fieldValue}
                              onChange={(e) => handleFieldChange(participant.id, field.id, e.target.value)}
                              onBlur={(e) => handleFieldBlur(participant.id, field.id, e.target.value)}
                              placeholder={field.placeholder}
                              disabled={saving}
                            />
                          ) : (
                            <input
                              type={field.type || 'text'}
                              className="form-input"
                              style={{ width: '100%' }}
                              value={fieldValue}
                              onChange={(e) => handleFieldChange(participant.id, field.id, e.target.value)}
                              onBlur={(e) => handleFieldBlur(participant.id, field.id, e.target.value)}
                              placeholder={field.placeholder}
                              disabled={saving}
                            />
                          )
                        ) : (
                          fieldValue
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {participants.length === 0 && (
        <div className="crewlist-empty">
          <p>Na této lodi zatím nejsou žádní účastníci.</p>
        </div>
      )}
    </div>
  )
}


