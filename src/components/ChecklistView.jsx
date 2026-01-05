import { useState, useEffect } from 'react'
import { checklistService } from '../services/checklistService'

export default function ChecklistView({ 
  instance, 
  onUpdate, 
  canEdit = true,
  canView = true,
  isOwnChecklist = false,
  defaultMode = 'view' // 'view' or 'edit'
}) {
  const [localInstance, setLocalInstance] = useState(instance)
  const [editMode, setEditMode] = useState(defaultMode === 'edit' && canEdit)

  // Update local state when instance prop changes
  useEffect(() => {
    setLocalInstance(instance)
  }, [instance])

  // Determine if we should show in view mode (read-only) or edit mode
  const isViewMode = !editMode || !canEdit
  const showEditButton = canEdit && !isOwnChecklist && !editMode

  const handleItemUpdate = async (itemId, updateData) => {
    if (!canEdit || isViewMode) return

    // Optimistic update
    const updatedItems = localInstance.items.map(item => {
      const itemIdToCheck = item.id || item.itemId
      if (itemIdToCheck === itemId) {
        return { ...item, ...updateData }
      }
      return item
    })
    
    const updatedInstance = { ...localInstance, items: updatedItems }
    setLocalInstance(updatedInstance)

    // Save to backend
    const { error } = await checklistService.updateItem(localInstance.id, itemId, updateData)
    if (error) {
      // Revert on error
      setLocalInstance(instance)
      alert('Chyba při ukládání: ' + error)
    } else if (onUpdate) {
      onUpdate(updatedInstance)
    }
  }

  if (!canView) {
    return <p style={{ color: 'var(--gray-500)' }}>Nemáte oprávnění zobrazit tento checklist.</p>
  }

  if (!localInstance || !localInstance.items) {
    return <p style={{ color: 'var(--gray-500)' }}>Checklist neobsahuje žádné položky.</p>
  }

  const completedCount = localInstance.items.filter(item => item.completed).length
  const totalCount = localInstance.items.length

  // Group items by category
  const itemsByCategory = {}
  const uncategorizedItems = []

  localInstance.items.forEach((item, idx) => {
    const itemId = item.id || item.itemId || idx.toString()
    const category = item.category || ''
    if (category) {
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = []
      }
      itemsByCategory[category].push({ ...item, itemId })
    } else {
      uncategorizedItems.push({ ...item, itemId })
    }
  })

  return (
    <div>
      {/* Header with edit button for non-own checklists */}
      {showEditButton && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setEditMode(true)}
          >
            <i className="fas fa-edit"></i> Upravit
          </button>
        </div>
      )}
      
      {editMode && !isOwnChecklist && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setEditMode(false)}
          >
            <i className="fas fa-eye"></i> Zobrazit
          </button>
        </div>
      )}

      {localInstance.description && (
        <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
          {localInstance.description}
        </p>
      )}

      {Object.keys(itemsByCategory).length > 0 || uncategorizedItems.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Items grouped by category */}
          {Object.keys(itemsByCategory).map(category => (
            <div key={category}>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: 'var(--gray-700)', 
                marginBottom: 'var(--space-sm)',
                paddingBottom: 'var(--space-xs)',
                borderBottom: '1px solid var(--gray-200)'
              }}>
                {category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {itemsByCategory[category].map((item) => {
                  const inputType = item.inputType || 'checkbox'
                  const allowNote = item.allowNote || false
                  const isCompleted = item.completed || false
                  const currentValue = item.value !== undefined ? item.value : (isCompleted ? true : '')
                  
                  return (
                    <div
                      key={item.itemId}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-xs)',
                        padding: 'var(--space-sm)',
                        background: isCompleted && inputType === 'checkbox' ? 'rgba(16, 185, 129, 0.1)' : 'var(--white)',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${isCompleted && inputType === 'checkbox' ? 'var(--success)' : 'var(--gray-200)'}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        {inputType === 'checkbox' ? (
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => handleItemUpdate(item.itemId, { completed: !isCompleted })}
                            disabled={isViewMode || !canEdit}
                          />
                        ) : null}
                        <span style={{ flex: 1, textDecoration: isCompleted && inputType === 'checkbox' ? 'line-through' : 'none', opacity: isCompleted && inputType === 'checkbox' ? 0.7 : 1 }}>
                          {item.name || item.text || 'Položka'}
                        </span>
                        {inputType === 'number' && (
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '100px', fontSize: '0.875rem' }}
                            value={currentValue}
                            onChange={(e) => {
                              const newValue = e.target.value ? parseFloat(e.target.value) : null
                              handleItemUpdate(item.itemId, {
                                value: newValue,
                                completed: newValue !== null && newValue !== ''
                              })
                            }}
                            disabled={isViewMode || !canEdit}
                            placeholder="0"
                          />
                        )}
                        {inputType === 'text' && (
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '200px', fontSize: '0.875rem' }}
                            value={currentValue || ''}
                            onChange={(e) => {
                              const newValue = e.target.value
                              handleItemUpdate(item.itemId, {
                                value: newValue,
                                completed: newValue !== ''
                              })
                            }}
                            disabled={isViewMode || !canEdit}
                            placeholder="Zadejte text..."
                          />
                        )}
                      </div>
                      {allowNote && (
                        <div style={{ marginTop: 'var(--space-xs)' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '100%', fontSize: '0.875rem' }}
                            value={item.note || ''}
                            onChange={(e) => handleItemUpdate(item.itemId, { note: e.target.value })}
                            disabled={isViewMode || !canEdit}
                            placeholder="Poznámka (volitelně)..."
                          />
                        </div>
                      )}
                      {!allowNote && item.note && (
                        <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: 'var(--space-xs)' }}>
                          <i className="fas fa-sticky-note"></i> {item.note}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          
          {/* Uncategorized items */}
          {uncategorizedItems.length > 0 && (
            <div>
              {Object.keys(itemsByCategory).length > 0 && (
                <div style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600, 
                  color: 'var(--gray-700)', 
                  marginBottom: 'var(--space-sm)',
                  paddingBottom: 'var(--space-xs)',
                  borderBottom: '1px solid var(--gray-200)'
                }}>
                  Ostatní
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {uncategorizedItems.map((item) => {
                  const inputType = item.inputType || 'checkbox'
                  const allowNote = item.allowNote || false
                  const isCompleted = item.completed || false
                  const currentValue = item.value !== undefined ? item.value : (isCompleted ? true : '')
                  
                  return (
                    <div
                      key={item.itemId}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-xs)',
                        padding: 'var(--space-sm)',
                        background: isCompleted && inputType === 'checkbox' ? 'rgba(16, 185, 129, 0.1)' : 'var(--white)',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${isCompleted && inputType === 'checkbox' ? 'var(--success)' : 'var(--gray-200)'}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        {inputType === 'checkbox' ? (
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => handleItemUpdate(item.itemId, { completed: !isCompleted })}
                            disabled={isViewMode || !canEdit}
                          />
                        ) : null}
                        <span style={{ flex: 1, textDecoration: isCompleted && inputType === 'checkbox' ? 'line-through' : 'none', opacity: isCompleted && inputType === 'checkbox' ? 0.7 : 1 }}>
                          {item.name || item.text || 'Položka'}
                        </span>
                        {inputType === 'number' && (
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '100px', fontSize: '0.875rem' }}
                            value={currentValue}
                            onChange={(e) => {
                              const newValue = e.target.value ? parseFloat(e.target.value) : null
                              handleItemUpdate(item.itemId, {
                                value: newValue,
                                completed: newValue !== null && newValue !== ''
                              })
                            }}
                            disabled={isViewMode || !canEdit}
                            placeholder="0"
                          />
                        )}
                        {inputType === 'text' && (
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '200px', fontSize: '0.875rem' }}
                            value={currentValue || ''}
                            onChange={(e) => {
                              const newValue = e.target.value
                              handleItemUpdate(item.itemId, {
                                value: newValue,
                                completed: newValue !== ''
                              })
                            }}
                            disabled={isViewMode || !canEdit}
                            placeholder="Zadejte text..."
                          />
                        )}
                      </div>
                      {allowNote && (
                        <div style={{ marginTop: 'var(--space-xs)' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '100%', fontSize: '0.875rem' }}
                            value={item.note || ''}
                            onChange={(e) => handleItemUpdate(item.itemId, { note: e.target.value })}
                            disabled={isViewMode || !canEdit}
                            placeholder="Poznámka (volitelně)..."
                          />
                        </div>
                      )}
                      {!allowNote && item.note && (
                        <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: 'var(--space-xs)' }}>
                          <i className="fas fa-sticky-note"></i> {item.note}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: 'var(--gray-500)' }}>Tento checklist neobsahuje žádné položky.</p>
      )}
    </div>
  )
}

