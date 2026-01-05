import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { checklistService } from '../services/checklistService'
import { tripTemplateService } from '../services/tripTemplateService'
import { organizerService } from '../services/organizerService'
import './OrganizerSettings.css'

export default function OrganizerSettings() {
  const { user } = useAuthState()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('checklists')
  const [checklistTemplates, setChecklistTemplates] = useState([])
  const [tripTemplates, setTripTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingChecklist, setEditingChecklist] = useState(null)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [contactDetails, setContactDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [savingContacts, setSavingContacts] = useState(false)

  useEffect(() => {
    if (user) {
      if (activeTab === 'contacts') {
        loadContactDetails()
      } else {
        loadData()
      }
    }
  }, [user, activeTab])

  const loadData = async () => {
    setLoading(true)
    if (activeTab === 'checklists') {
      const { templates, error } = await checklistService.getTemplates(user.uid)
      if (!error) {
        setChecklistTemplates(templates)
      }
    } else {
      const { templates, error } = await tripTemplateService.getTemplates(user.uid)
      if (!error) {
        setTripTemplates(templates)
      }
    }
    setLoading(false)
  }

  const loadContactDetails = async () => {
    setLoading(true)
    const { data, error } = await organizerService.getContactDetails(user.uid)
    if (!error && data) {
      setContactDetails({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || ''
      })
    }
    setLoading(false)
  }

  const handleSaveContacts = async (e) => {
    e.preventDefault()
    setSavingContacts(true)
    const { error } = await organizerService.saveContactDetails(user.uid, contactDetails)
    if (error) {
      alert('Chyba při ukládání: ' + error)
    } else {
      alert('Kontaktní údaje byly uloženy.')
    }
    setSavingContacts(false)
  }

  const handleDeleteChecklist = async (templateId) => {
    if (confirm('Opravdu chcete smazat tento checklist?')) {
      const { error } = await checklistService.deleteTemplate(templateId)
      if (!error) {
        await loadData()
      }
    }
  }

  const handleExportChecklist = (template) => {
    // Prepare export data (remove Firestore-specific fields)
    const exportData = {
      name: template.name,
      description: template.description,
      categories: template.categories || [],
      items: (template.items || []).map(item => ({
        id: item.id,
        text: item.text || item.name,
        name: item.name || item.text,
        category: item.category || '',
        inputType: item.inputType || 'checkbox',
        allowNote: item.allowNote || false
      }))
    }

    // Create JSON blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${template.name || 'checklist'}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportChecklist = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        const importData = JSON.parse(text)

        // Validate import data
        if (!importData.name || !Array.isArray(importData.items)) {
          alert('Neplatný formát souboru. Checklist musí obsahovat název a pole položek.')
          return
        }

        // Create new checklist from import
        const { id, error } = await checklistService.createTemplate(user.uid, {
          name: importData.name,
          description: importData.description || '',
          categories: importData.categories || [],
          items: importData.items.map((item, idx) => ({
            id: item.id || Date.now().toString() + idx,
            text: item.text || item.name || '',
            name: item.name || item.text || '',
            category: item.category || '',
            inputType: item.inputType || 'checkbox',
            allowNote: item.allowNote || false
          }))
        })

        if (error) {
          alert('Chyba při importu: ' + error)
        } else {
          alert('Checklist byl úspěšně importován.')
          await loadData()
        }
      } catch (error) {
        alert('Chyba při načítání souboru: ' + error.message)
      }
    }
    input.click()
  }

  const handleDeleteTemplate = async (templateId) => {
    if (confirm('Opravdu chcete smazat tento templát?')) {
      const { error } = await tripTemplateService.deleteTemplate(templateId)
      if (!error) {
        await loadData()
      }
    }
  }

  const handleUseTemplate = (templateId) => {
    navigate(`/trip/new?template=${templateId}`)
  }

  return (
    <>
      <div className="trip-header" style={{ padding: 'var(--space-xl) 0' }}>
        <div className="container">
          <div className="trip-header-content">
            <div className="breadcrumb">
              <Link to="/dashboard"><i className="fas fa-home"></i></Link>
              <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
              <span>Nastavení organizátora</span>
            </div>
            
            <div className="trip-title-row" style={{ marginTop: 'var(--space-lg)' }}>
              <div>
                <h1 className="trip-title" style={{ fontSize: '2rem' }}>Nastavení organizátora</h1>
                <p style={{ color: 'var(--gray-400)', marginTop: 'var(--space-sm)' }}>Správa checklistů a templatů plaveb</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="trip-content">
        <div className="container" style={{ maxWidth: 1000 }}>
          {/* Settings Navigation */}
          <div className="settings-nav">
            <button
              className={`settings-nav-item ${activeTab === 'checklists' ? 'active' : ''}`}
              onClick={() => setActiveTab('checklists')}
            >
              <i className="fas fa-clipboard-list" style={{ marginRight: 'var(--space-sm)' }}></i>
              Checklisty
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <i className="fas fa-copy" style={{ marginRight: 'var(--space-sm)' }}></i>
              Templaty plaveb
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'contacts' ? 'active' : ''}`}
              onClick={() => setActiveTab('contacts')}
            >
              <i className="fas fa-address-card" style={{ marginRight: 'var(--space-sm)' }}></i>
              Kontaktní údaje
            </button>
          </div>
          
          {/* TAB: Checklisty */}
          {activeTab === 'checklists' && (
            <div className="card animate-in" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-clipboard-list" style={{ color: 'var(--turquoise)' }}></i>
                  Moje checklisty
                </h4>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleImportChecklist}
                    title="Importovat checklist z JSON"
                  >
                    <i className="fas fa-upload"></i>
                    Import
                  </button>
                  <Link 
                    to="/checklist/new"
                    className="btn btn-primary"
                  >
                    <i className="fas fa-plus"></i>
                    Nový checklist
                  </Link>
                </div>
              </div>
              
              <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
                Vytvořte si vlastní checklisty pro různé účely – předání lodě, vracení lodě, balení pro posádku a další. Checklisty pak můžete přiřadit k jednotlivým plavbám.
              </p>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
                  Načítání...
                </div>
              ) : checklistTemplates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {checklistTemplates.map((template) => {
                    const itemCount = template.items?.length || 0
                    const categoryCount = new Set(template.items?.map(i => i.category).filter(Boolean)).size
                    return (
                      <div key={template.id} className="checklist-template-card">
                        <div className="checklist-template-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <div style={{ width: 48, height: 48, background: 'rgba(249, 115, 22, 0.1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--coral)', fontSize: '1.25rem' }}>
                              <i className="fas fa-clipboard-check"></i>
                            </div>
                            <div>
                              <div className="font-semibold" style={{ fontSize: '1.125rem' }}>{template.name || 'Bez názvu'}</div>
                              <div className="text-sm text-muted">{itemCount} položek • {categoryCount} kategorií</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleExportChecklist(template)}
                              title="Exportovat checklist"
                            >
                              <i className="fas fa-download"></i>
                            </button>
                            <Link
                              to={`/checklist/${template.id}/edit`}
                              className="btn btn-sm btn-secondary"
                            >
                              <i className="fas fa-edit"></i> Upravit
                            </Link>
                            <button 
                              className="btn btn-sm btn-ghost"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeleteChecklist(template.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        {template.categories && template.categories.length > 0 && (
                          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                            {template.categories.map((cat, idx) => (
                              <span key={idx} className="status-pill info" style={{ fontSize: '0.6875rem' }}>{cat}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-clipboard-list"></i>
                  <p>Zatím nemáte žádné checklisty. Vytvořte první checklist.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Kontaktní údaje */}
          {activeTab === 'contacts' && (
            <div className="card animate-in" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-address-card" style={{ color: 'var(--coral)' }}></i>
                  Kontaktní údaje organizátora
                </h4>
              </div>
              
              <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
                Tyto kontaktní údaje budou zobrazeny účastníkům plaveb, které organizujete. Jsou oddělené od vašich uživatelských kontaktních údajů (ty se nastavují v "Můj profil").
              </p>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
                  Načítání...
                </div>
              ) : (
                <form onSubmit={handleSaveContacts}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Jméno</label>
                      <input
                        type="text"
                        className="form-input"
                        value={contactDetails.name}
                        onChange={(e) => setContactDetails(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="např. Jan Novák"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-input"
                        value={contactDetails.email}
                        onChange={(e) => setContactDetails(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="např. jan@example.com"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Telefon</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={contactDetails.phone}
                        onChange={(e) => setContactDetails(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="např. +420 123 456 789"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label className="form-label">Adresa (volitelně)</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={contactDetails.address}
                        onChange={(e) => setContactDetails(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Adresa pro korespondenci..."
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--gray-100)' }}>
                    <button type="submit" className="btn btn-primary" disabled={savingContacts}>
                      <i className="fas fa-save"></i>
                      {savingContacts ? 'Ukládání...' : 'Uložit kontaktní údaje'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB: Templaty */}
          {activeTab === 'templates' && (
            <div className="card animate-in" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="card-header">
                <h4 className="card-title">
                  <i className="fas fa-copy" style={{ color: 'var(--coral)' }}></i>
                  Templaty plaveb
                </h4>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingTemplate(null)
                    setShowTemplateModal(true)
                  }}
                >
                  <i className="fas fa-plus"></i>
                  Nový templát
                </button>
              </div>
              
              <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
                Uložte si oblíbená nastavení plaveb jako templaty a používejte je pro rychlé vytvoření nových plaveb.
              </p>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
                  Načítání...
                </div>
              ) : tripTemplates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {tripTemplates.map((template) => {
                    const startDate = template.startDate?.toDate ? template.startDate.toDate() : null
                    const endDate = template.endDate?.toDate ? template.endDate.toDate() : null
                    const days = startDate && endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : null
                    return (
                      <div key={template.id} className="trip-template-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, var(--coral), var(--coral-light))', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.25rem' }}>
                            <i className="fas fa-sailboat"></i>
                          </div>
                          <div>
                            <div className="font-semibold" style={{ fontSize: '1.125rem' }}>{template.name || 'Bez názvu'}</div>
                            <div className="text-sm text-muted">
                              {template.location || 'Lokace neuvedena'}
                              {days && ` • ${days} dní`}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => handleUseTemplate(template.id)}
                          >
                            <i className="fas fa-plus"></i> Použít
                          </button>
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setEditingTemplate(template)
                              setShowTemplateModal(true)
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-copy"></i>
                  <p>Zatím nemáte žádné templaty. Vytvořte první templát z existující plavby.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Checklist Modal */}
      {showChecklistModal && (
        <div className="modal-overlay active" onClick={() => {
          setShowChecklistModal(false)
          setEditingChecklist(null)
        }}>
          <ChecklistModal
            checklist={editingChecklist}
            onClose={() => {
              setShowChecklistModal(false)
              setEditingChecklist(null)
            }}
            onSave={loadData}
            userId={user.uid}
          />
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowTemplateModal(false)
            setEditingTemplate(null)
          }}
          onSave={loadData}
          userId={user.uid}
        />
      )}
    </>
  )
}

// Checklist Modal Component
function ChecklistModal({ checklist, onClose, onSave, userId }) {
  const [formData, setFormData] = useState({
    name: checklist?.name || '',
    description: checklist?.description || '',
    categories: checklist?.categories || [],
    items: checklist?.items || []
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [newCategory, setNewCategory] = useState('')
  const [newItem, setNewItem] = useState({ text: '', category: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

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
    if (checklist) {
      result = await checklistService.updateTemplate(checklist.id, formData)
      // Sync all instances with the updated template
      if (!result.error) {
        const syncResult = await checklistService.syncInstancesFromTemplate(checklist.id)
        if (syncResult.error) {
          console.error('Chyba při synchronizaci instancí:', syncResult.error)
        }
      }
    } else {
      result = await checklistService.createTemplate(userId, formData)
    }

    if (result.error) {
      setError(result.error)
    } else {
      onSave()
      onClose()
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
          category: newItem.category || '',
          required: false
        }]
      }))
      setNewItem({ text: '', category: '' })
    }
  }

  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }

  return (
    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', maxWidth: 600, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4>
            <i className="fas fa-plus" style={{ color: 'var(--turquoise)', marginRight: 'var(--space-sm)' }}></i>
            {checklist ? 'Upravit checklist' : 'Nový checklist'}
          </h4>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: 'var(--space-xl)', maxHeight: '60vh', overflowY: 'auto' }}>
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

            <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h5>Kategorie</h5>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: 200 }}
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                    placeholder="Název kategorie"
                  />
                  <button type="button" className="btn btn-sm btn-secondary" onClick={addCategory}>
                    <i className="fas fa-plus"></i> Přidat
                  </button>
                </div>
              </div>
              {formData.categories.length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
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

              <div style={{ marginTop: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <h5>Položky</h5>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: 200 }}
                      value={newItem.text}
                      onChange={(e) => setNewItem(prev => ({ ...prev, text: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
                      placeholder="Název položky"
                    />
                    {formData.categories.length > 0 && (
                      <select
                        className="form-input"
                        style={{ width: 150 }}
                        value={newItem.category}
                        onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="">Bez kategorie</option>
                        {formData.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                    <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}>
                      <i className="fas fa-plus"></i> Přidat
                    </button>
                  </div>
                </div>
                {formData.items.length > 0 ? (
                  <>
                    {/* Search and filter */}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1 }}
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
                    
                    {/* Items list with pagination */}
                    <div style={{ 
                      maxHeight: '300px', 
                      overflowY: 'auto',
                      border: '1px solid var(--gray-200)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-sm)'
                    }}>
                      {(() => {
                        const filteredItems = formData.items.filter(item => {
                          const matchesSearch = !searchTerm || item.text.toLowerCase().includes(searchTerm.toLowerCase())
                          const matchesCategory = !selectedCategory || item.category === selectedCategory
                          return matchesSearch && matchesCategory
                        })
                        
                        return filteredItems.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                            {filteredItems.map((item) => (
                              <div key={item.id} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 'var(--space-sm)', 
                                padding: 'var(--space-sm)', 
                                background: 'var(--gray-50)', 
                                borderRadius: 'var(--radius-sm)',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                              >
                                <span style={{ flex: 1, fontSize: '0.875rem' }}>{item.text}</span>
                                {item.category && (
                                  <span className="status-pill info" style={{ fontSize: '0.75rem' }}>{item.category}</span>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-icon btn-ghost btn-sm"
                                  style={{ color: 'var(--danger)' }}
                                  onClick={() => removeItem(item.id)}
                                  title="Odstranit položku"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center', padding: 'var(--space-md)' }}>
                            {searchTerm || selectedCategory ? 'Žádné položky neodpovídají filtru' : 'Zatím nejsou žádné položky'}
                          </p>
                        )
                      })()}
                    </div>
                    <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                      Celkem: {formData.items.length} položek
                      {(searchTerm || selectedCategory) && ` (zobrazeno: ${formData.items.filter(item => {
                        const matchesSearch = !searchTerm || item.text.toLowerCase().includes(searchTerm.toLowerCase())
                        const matchesCategory = !selectedCategory || item.category === selectedCategory
                        return matchesSearch && matchesCategory
                      }).length})`}
                    </div>
                  </>
                ) : (
                  <p className="text-muted" style={{ fontSize: '0.875rem' }}>Zatím nejsou žádné položky</p>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer" style={{ padding: 'var(--space-lg) var(--space-xl)', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Ukládání...' : (checklist ? 'Uložit změny' : 'Vytvořit')}
            </button>
          </div>
        </form>
      </div>
  )
}

// Template Modal Component
function TemplateModal({ template, onClose, onSave, userId }) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!formData.name.trim()) {
      setError('Název templatu je povinný')
      setSaving(false)
      return
    }

    let result
    if (template) {
      result = await tripTemplateService.updateTemplate(template.id, formData)
    } else {
      // For new templates, user needs to create from a trip
      // This modal just collects the name, then redirects to trip form
      onClose()
      // Navigate to trip form with template creation flag
      window.location.href = '/trip/new?createTemplate=true&templateName=' + encodeURIComponent(formData.name)
      return
    }

    if (result.error) {
      setError(result.error)
    } else {
      onSave()
      onClose()
    }

    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10, 22, 40, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', maxWidth: 500, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4>
            <i className="fas fa-plus" style={{ color: 'var(--coral)', marginRight: 'var(--space-sm)' }}></i>
            {template ? 'Upravit templát' : 'Nový templát plavby'}
          </h4>
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
            
            {!template && (
              <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                Vytvoříte nový templát vyplněním formuláře plavby. Templát si pak budete moci použít pro rychlé vytvoření nových plaveb.
              </p>
            )}
            
            <div className="form-group">
              <label className="form-label">Název templatu *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="např. Chorvatsko 2025"
                required
              />
            </div>
            {template && (
              <div className="form-group">
                <label className="form-label">Popis</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Popis templatu..."
                />
              </div>
            )}
          </div>
          <div className="modal-footer" style={{ padding: 'var(--space-lg) var(--space-xl)', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Zrušit</button>
            {template ? (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Ukládání...' : 'Uložit změny'}
              </button>
            ) : (
              <Link to="/trip/new" className="btn btn-primary" onClick={(e) => {
                if (!formData.name.trim()) {
                  e.preventDefault()
                  alert('Nejprve zadejte název templatu')
                }
              }}>
                <i className="fas fa-arrow-right"></i>
                Pokračovat na formulář
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
