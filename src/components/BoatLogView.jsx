import { useState, useEffect } from 'react'
import { boatLogService } from '../services/boatLogService'
import LogEntryModal from './LogEntryModal'
import './BoatLogView.css'

export default function BoatLogView({ 
  tripId, 
  boatId, 
  boatName = 'Bez názvu',
  canEdit = false,
  canView = true,
  showStats = true,
  statsOnly = false,
  onEntriesChange
}) {
  const [logEntries, setLogEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)
  const [editingLog, setEditingLog] = useState(null)

  useEffect(() => {
    if (tripId && boatId) {
      loadLogEntries()
    }
  }, [tripId, boatId])

  const loadLogEntries = async () => {
    setLoading(true)
    const { entries } = await boatLogService.getBoatLogs(tripId, boatId)
    setLogEntries(entries || [])
    setLoading(false)
    if (onEntriesChange) {
      onEntriesChange(entries || [])
    }
  }

  const handleDeleteLog = async (logId) => {
    if (confirm('Opravdu chcete smazat tento záznam?')) {
      const { error } = await boatLogService.deleteLogEntry(logId)
      if (!error) {
        await loadLogEntries()
      } else {
        alert('Chyba při mazání záznamu: ' + error)
      }
    }
  }

  const handleSaveLog = async () => {
    await loadLogEntries()
    setShowLogModal(false)
    setEditingLog(null)
  }

  // Calculate statistics
  const calculateStats = () => {
    if (logEntries.length === 0) {
      return {
        totalDistance: 0,
        totalDistanceSails: 0,
        totalEngineHours: 0,
        fuelConsumption: 0
      }
    }

    // Sort entries by date to find first and last
    const sortedEntries = [...logEntries].sort((a, b) => {
      const aDate = a.date?.toDate ? a.date.toDate() : (a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(0))
      const bDate = b.date?.toDate ? b.date.toDate() : (b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(0))
      return aDate - bDate
    })

    const firstEntry = sortedEntries[0]
    const lastEntry = sortedEntries[sortedEntries.length - 1]

    const stats = logEntries.reduce((acc, entry) => {
      acc.totalDistance += entry.distanceTotal || 0
      acc.totalDistanceSails += entry.distanceSails || 0
      return acc
    }, {
      totalDistance: 0,
      totalDistanceSails: 0
    })

    // Calculate engine hours as difference between first and last entry
    const firstEngineHours = firstEntry?.engineHours
    const lastEngineHours = lastEntry?.engineHours
    const totalEngineHours = (firstEngineHours !== null && firstEngineHours !== undefined && 
                               lastEngineHours !== null && lastEngineHours !== undefined)
      ? lastEngineHours - firstEngineHours
      : 0

    // Calculate fuel consumption (difference between first and last entry)
    const firstFuel = firstEntry?.fuel
    const lastFuel = lastEntry?.fuel
    const fuelConsumption = (firstFuel !== null && firstFuel !== undefined && 
                             lastFuel !== null && lastFuel !== undefined)
      ? firstFuel - lastFuel
      : 0

    return {
      totalDistance: stats.totalDistance,
      totalDistanceSails: stats.totalDistanceSails,
      totalEngineHours: totalEngineHours > 0 ? totalEngineHours : 0,
      fuelConsumption: fuelConsumption > 0 ? fuelConsumption : 0,
      sailsPercentage: stats.totalDistance > 0 
        ? Math.round((stats.totalDistanceSails / stats.totalDistance) * 100) 
        : 0
    }
  }

  const stats = calculateStats()

  if (!canView) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
        Nemáte oprávnění k zobrazení lodního deníku.
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
        Načítání...
        </div>
    )
  }

  // If statsOnly mode, show only statistics
  if (statsOnly) {
    return (
      <>
        {showStats && logEntries.length > 0 && (
          <>
            <div className="sidebar-card animate-in">
              <h4>
                <i className="fas fa-chart-line" style={{ color: 'var(--turquoise)' }}></i>
                Statistiky plavby
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                {stats.totalDistance > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Celkem upluto</span>
                    <span className="font-semibold">{stats.totalDistance.toFixed(1)} NM</span>
                  </div>
                )}
                {stats.totalDistanceSails > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Na plachty</span>
                    <span className="font-semibold">
                      {stats.totalDistanceSails.toFixed(1)} NM ({stats.sailsPercentage}%)
                    </span>
                  </div>
                )}
                {stats.totalEngineHours > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Motohodiny</span>
                    <span className="font-semibold">{stats.totalEngineHours.toFixed(1)} h</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="sidebar-card animate-in delay-1">
              <h4>
                <i className="fas fa-info-circle" style={{ color: 'var(--turquoise)' }}></i>
                O lodním deníku
              </h4>
              <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>
                Lodní deník slouží k záznamu průběhu plavby. Zapisujte motohodiny, uplutou vzdálenost a důležité události.
              </p>
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <div className="boat-log-view">
      <div className="boat-log-header">
        <h4 className="boat-log-title">
          <i className="fas fa-book" style={{ color: 'var(--turquoise)' }}></i>
          Lodní deník – {boatName}
        </h4>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {canEdit && (
            <button 
              className="btn btn-sm btn-secondary"
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Export do PDF bude brzy dostupný"
            >
              <i className="fas fa-download"></i>
              Export PDF
            </button>
          )}
          {canEdit && (
            <button 
              className="btn btn-sm btn-primary"
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setEditingLog(null)
                setShowLogModal(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Nový záznam
            </button>
          )}
        </div>
      </div>
      
      <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
        {canEdit 
          ? 'Zapisujte denní záznamy o plavbě. Doporučujeme vyplnit 1 záznam na den.' 
          : 'Záznamy vyplňuje kapitán lodě. Jako organizátor máte přístup k jejich zobrazení.'}
      </p>
      
      {logEntries.length > 0 ? (
        <div className="log-entries-list">
          {logEntries.map((entry) => {
            const entryDate = entry.date?.toDate 
              ? entry.date.toDate() 
              : (entry.date?.seconds 
                ? new Date(entry.date.seconds * 1000) 
                : null)
            
            return (
              <div key={entry.id} className="log-entry">
                <div className="log-entry-header">
                  <div>
                    <div className="font-medium">
                      {entryDate 
                        ? entryDate.toLocaleDateString('cs-CZ', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          }) 
                        : 'Datum neuvedeno'}
                    </div>
                    {entry.route && (
                      <div className="text-sm text-muted">Trasa: {entry.route}</div>
                    )}
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setEditingLog(entry)
                          setShowLogModal(true)
                        }}
                        title="Upravit záznam"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleDeleteLog(entry.id)}
                        title="Smazat záznam"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
                <div className="log-entry-stats">
                  {entry.engineHours !== null && entry.engineHours !== undefined && (
                    <div className="log-stat">
                      <div className="text-xs text-muted">Motohodiny</div>
                      <div className="font-semibold">{entry.engineHours}</div>
                    </div>
                  )}
                  {entry.distanceTotal !== null && entry.distanceTotal !== undefined && (
                    <div className="log-stat">
                      <div className="text-xs text-muted">Upluto celkem</div>
                      <div className="font-semibold">{entry.distanceTotal} NM</div>
                    </div>
                  )}
                  {entry.distanceSails !== null && entry.distanceSails !== undefined && (
                    <div className="log-stat">
                      <div className="text-xs text-muted">Z toho na plachty</div>
                      <div className="font-semibold">{entry.distanceSails} NM</div>
                    </div>
                  )}
                  {entry.fuel !== null && entry.fuel !== undefined && (
                    <div className="log-stat">
                      <div className="text-xs text-muted">Palivo</div>
                      <div className="font-semibold">{entry.fuel}%</div>
                    </div>
                  )}
                </div>
                {entry.notes && (
                  <div className="log-entry-notes">
                    <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>
                      Poznámka:
                    </div>
                    <div className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {entry.notes}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--gray-500)' }}>
          {canEdit 
            ? 'Zatím nejsou žádné záznamy. Vytvořte první záznam.' 
            : 'Zatím nejsou žádné záznamy v lodním deníku.'}
        </div>
      )}

      {/* Statistics in main content */}
      {showStats && logEntries.length > 0 && !statsOnly && (
        <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-xl)', borderTop: '1px solid var(--gray-100)' }}>
          <h4 style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <i className="fas fa-chart-line" style={{ color: 'var(--turquoise)' }}></i>
            Statistiky plavby
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)' }}>
            {stats.totalDistance > 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--space-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Celkem upluto</div>
                <div className="font-semibold" style={{ fontSize: '1.25rem' }}>{stats.totalDistance.toFixed(1)} NM</div>
              </div>
            )}
            {stats.totalDistanceSails > 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--space-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Na plachty</div>
                <div className="font-semibold" style={{ fontSize: '1.25rem' }}>
                  {stats.totalDistanceSails.toFixed(1)} NM ({stats.sailsPercentage}%)
                </div>
              </div>
            )}
            {stats.totalEngineHours > 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--space-md)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Motohodiny</div>
                <div className="font-semibold" style={{ fontSize: '1.25rem' }}>{stats.totalEngineHours.toFixed(1)} h</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Entry Modal */}
      {showLogModal && tripId && boatId && (
        <LogEntryModal
          tripId={tripId}
          boatId={boatId}
          entry={editingLog}
          onClose={() => {
            setShowLogModal(false)
            setEditingLog(null)
          }}
          onSave={handleSaveLog}
        />
      )}
    </div>
  )
}

