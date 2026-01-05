import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { checklistService } from '../services/checklistService'
import './ChecklistEdit.css'

export default function ChecklistEdit() {
  const { checklistId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthState()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categories: [],
    items: []
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newCategory, setNewCategory] = useState('')
  const [newItem, setNewItem] = useState({ text: '', category: '', inputType: 'checkbox', allowNote: false })
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    if (user && checklistId) {
      loadChecklist()
    } else if (user && !checklistId) {
      // New checklist
      setLoading(false)
    }
  }, [user, checklistId])

  const loadChecklist = async () => {
    setLoading(true)
    const { data, error } = await checklistService.getTemplate(checklistId)
    if (!error && data) {
      setFormData({
        name: data.name || '',
        description: data.description || '',
        categories: data.categories || [],
        items: data.items || []
      })
    } else {
      setError('Checklist nenalezen')
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!formData.name.trim()) {
      setError('Název checklistu je povinný')
      setSaving(false)
      return
    }

    let result
    if (checklistId) {
      result = await checklistService.updateTemplate(checklistId, formData)
      // Sync all instances with the updated template
      if (!result.error) {
        const syncResult = await checklistService.syncInstancesFromTemplate(checklistId)
        if (syncResult.error) {
          console.error('Chyba při synchronizaci instancí:', syncResult.error)
        }
      }
    } else {
      result = await checklistService.createTemplate(user.uid, formData)
    }

    if (result.error) {
      setError(result.error)
    } else {
      navigate('/settings/organizer?tab=checklists')
      // Reload the page to refresh the checklist list
      window.location.href = '/settings/organizer?tab=checklists'
    }

    setSaving(false)
  }

  const addCategory = () => {
    if (newCategory.trim() && !formData.categories.includes(newCategory.trim())) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()]
      }))
      setNewCategory('')
    }
  }

  const removeCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category),
      items: prev.items.map(item => item.category === category ? { ...item, category: '' } : item)
    }))
  }

  const addItem = () => {
    if (newItem.text.trim()) {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          id: Date.now().toString(),
          text: newItem.text.trim(),
          name: newItem.text.trim(),
          category: newItem.category || '',
          required: false,
          inputType: newItem.inputType || 'checkbox',
          allowNote: newItem.allowNote || false
        }]
      }))
      setNewItem({ text: '', category: '', inputType: 'checkbox', allowNote: false })
    }
  }

  const updateItem = (itemId, updates) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    }))
    setEditingItem(null)
  }

  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }

  const filteredItems = formData.items.filter(item => {
    const matchesSearch = !searchTerm || item.text.toLowerCase().includes(searchTerm.toLowerCase()) || item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--gray-500)' }}>
          Načítání...
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="trip-header">
        <div className="container">
          <div className="trip-header-content">
            <div className="breadcrumb">
              <Link to="/dashboard"><i className="fas fa-home"></i></Link>
              <i className="fas fa-chevron-right"></i>
              <Link to="/settings/organizer">Nastavení organizátora</Link>
              <i className="fas fa-chevron-right"></i>
              <span>{checklistId ? 'Upravit checklist' : 'Nový checklist'}</span>
            </div>
            
            <div className="trip-title-row">
              <div>
                <h1 className="trip-title">{checklistId ? 'Upravit checklist' : 'Nový checklist'}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="trip-content">
        <div className="container" style={{ maxWidth: 1200 }}>
          <form onSubmit={handleSubmit}>
            <div className="card animate-in">
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-clipboard-list" style={{ color: 'var(--turquoise)' }}></i>
                  Základní informace
                </h4>
              </div>
              
              <div style={{ padding: 'var(--space-xl)' }}>
                {error && (
                  <div style={{ padding: 'var(--space-md)', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
                    {error}
                  </div>
                )}
                
                <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                  <label className="form-label">Název checklistu *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="např. Předání lodě"
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                  <label className="form-label">Popis (volitelný)</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Stručný popis checklistu..."
                  />
                </div>
              </div>
            </div>

            <div className="card animate-in delay-1" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-tags" style={{ color: 'var(--coral)' }}></i>
                  Kategorie
                </h4>
              </div>
              
              <div style={{ padding: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1, maxWidth: 300 }}
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                    placeholder="Název kategorie"
                  />
                  <button type="button" className="btn btn-secondary" onClick={addCategory}>
                    <i className="fas fa-plus"></i> Přidat kategorii
                  </button>
                </div>
                {formData.categories.length > 0 && (
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    {formData.categories.map((cat) => (
                      <span key={cat} className="status-pill info" style={{ fontSize: '0.875rem' }}>
                        {cat}
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost"
                          style={{ marginLeft: 'var(--space-xs)', padding: 0, fontSize: '0.75rem' }}
                          onClick={() => removeCategory(cat)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card animate-in delay-2" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-list" style={{ color: 'var(--turquoise)' }}></i>
                  Položky ({formData.items.length})
                </h4>
              </div>
              
              <div style={{ padding: 'var(--space-xl)' }}>
                {/* Add new item */}
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, minWidth: 200 }}
                      value={newItem.text}
                      onChange={(e) => setNewItem(prev => ({ ...prev, text: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
                      placeholder="Název položky"
                    />
                    {formData.categories.length > 0 && (
                      <select
                        className="form-input"
                        style={{ width: 200 }}
                        value={newItem.category}
                        onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="">Bez kategorie</option>
                        {formData.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                    <button type="button" className="btn btn-primary" onClick={addItem}>
                      <i className="fas fa-plus"></i> Přidat položku
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.875rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <input
                        type="checkbox"
                        checked={newItem.allowNote}
                        onChange={(e) => setNewItem(prev => ({ ...prev, allowNote: e.target.checked }))}
                      />
                      <span>Povolit poznámku</span>
                    </label>
                    <select
                      className="form-input"
                      style={{ width: 150 }}
                      value={newItem.inputType}
                      onChange={(e) => setNewItem(prev => ({ ...prev, inputType: e.target.value }))}
                    >
                      <option value="checkbox">Zaškrtnutí</option>
                      <option value="number">Číslo</option>
                      <option value="text">Text</option>
                    </select>
                  </div>
                </div>

                {/* Search and filter */}
                {formData.items.length > 0 && (
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, minWidth: 200 }}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Vyhledat položku..."
                    />
                    {formData.categories.length > 0 && (
                      <select
                        className="form-input"
                        style={{ width: 200 }}
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">Všechny kategorie</option>
                        {formData.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Items list */}
                {filteredItems.length > 0 ? (
                  <div style={{ 
                    maxHeight: '500px', 
                    overflowY: 'auto',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-sm)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {filteredItems.map((item) => (
                        <div key={item.id} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 'var(--space-sm)', 
                          padding: 'var(--space-sm)', 
                          background: editingItem === item.id ? 'rgba(6, 182, 212, 0.1)' : 'var(--gray-50)', 
                          borderRadius: 'var(--radius-sm)',
                          transition: 'background 0.2s',
                          border: editingItem === item.id ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
                        }}
                        onMouseEnter={(e) => !editingItem && (e.currentTarget.style.background = 'var(--gray-100)')}
                        onMouseLeave={(e) => !editingItem && (e.currentTarget.style.background = 'var(--gray-50)')}
                        >
                          {editingItem === item.id ? (
                            <>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ fontSize: '0.875rem' }}
                                  value={item.text || item.name}
                                  onChange={(e) => updateItem(item.id, { text: e.target.value, name: e.target.value })}
                                  autoFocus
                                />
                                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                    <input
                                      type="checkbox"
                                      checked={item.allowNote || false}
                                      onChange={(e) => updateItem(item.id, { allowNote: e.target.checked })}
                                    />
                                    <span>Poznámka</span>
                                  </label>
                                  <select
                                    className="form-input"
                                    style={{ width: 120, fontSize: '0.75rem', padding: 'var(--space-xs)' }}
                                    value={item.inputType || 'checkbox'}
                                    onChange={(e) => updateItem(item.id, { inputType: e.target.value })}
                                  >
                                    <option value="checkbox">Zaškrtnutí</option>
                                    <option value="number">Číslo</option>
                                    <option value="text">Text</option>
                                  </select>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-icon btn-ghost btn-sm"
                                onClick={() => setEditingItem(null)}
                                title="Hotovo"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                <span style={{ fontSize: '0.875rem' }}>{item.text || item.name}</span>
                                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                                  {item.category && (
                                    <span className="status-pill info" style={{ fontSize: '0.75rem' }}>{item.category}</span>
                                  )}
                                  {item.inputType && item.inputType !== 'checkbox' && (
                                    <span className="status-pill" style={{ fontSize: '0.75rem', background: 'var(--turquoise-light)', color: 'var(--turquoise)' }}>
                                      {item.inputType === 'number' ? 'Číslo' : 'Text'}
                                    </span>
                                  )}
                                  {item.allowNote && (
                                    <span className="status-pill" style={{ fontSize: '0.75rem', background: 'var(--coral-light)', color: 'var(--coral)' }}>
                                      <i className="fas fa-sticky-note"></i> Poznámka
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-icon btn-ghost btn-sm"
                                onClick={() => setEditingItem(item.id)}
                                title="Upravit položku"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-icon btn-ghost btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => removeItem(item.id)}
                                title="Odstranit položku"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center', padding: 'var(--space-md)' }}>
                    {searchTerm || selectedCategory ? 'Žádné položky neodpovídají filtru' : 'Zatím nejsou žádné položky'}
                  </p>
                )}
                
                {formData.items.length > 0 && (
                  <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                    Celkem: {formData.items.length} položek
                    {(searchTerm || selectedCategory) && ` (zobrazeno: ${filteredItems.length})`}
                  </div>
                )}
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-xl)',
              paddingTop: 'var(--space-lg)',
              borderTop: '1px solid var(--gray-200)'
            }}>
              <Link to="/settings/organizer?tab=checklists" className="btn btn-ghost">
                Zrušit
              </Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Ukládání...' : (checklistId ? 'Uložit změny' : 'Vytvořit')}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}

