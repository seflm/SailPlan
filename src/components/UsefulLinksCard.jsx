export default function UsefulLinksCard({ usefulLinks = [] }) {
  if (!usefulLinks || usefulLinks.length === 0) {
    return null
  }

  const getIconClass = (icon) => {
    if (!icon) return 'fas fa-external-link-alt'
    
    // Brand icons that need 'fab' prefix
    const brandIcons = ['whatsapp', 'facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'github', 'telegram', 'discord']
    
    // Check if icon is a brand icon
    const iconName = icon.replace(/^fa-/, '').replace(/^fas fa-/, '').replace(/^fab fa-/, '')
    if (brandIcons.includes(iconName)) {
      return `fab fa-${iconName}`
    }
    
    // If icon already has prefix, use it as is
    if (icon.startsWith('fa-') || icon.startsWith('fas ') || icon.startsWith('fab ') || icon.startsWith('far ')) {
      return icon
    }
    
    // Default to 'fas' prefix
    return `fas fa-${icon}`
  }

  return (
    <div className="sidebar-card animate-in">
      <h4>
        <i className="fas fa-link" style={{ color: 'var(--turquoise)' }}></i>
        Užitečné odkazy
      </h4>
      
      <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        {usefulLinks.map((link) => (
          <a
            key={link.id || link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              color: 'var(--turquoise)',
              fontWeight: 500,
              transition: 'all 0.2s',
              fontSize: '0.875rem',
              border: '1px solid var(--gray-200)',
              background: 'var(--white)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--turquoise)'
              e.currentTarget.style.color = 'var(--white)'
              e.currentTarget.style.borderColor = 'var(--turquoise)'
              e.currentTarget.style.transform = 'translateX(4px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--white)'
              e.currentTarget.style.color = 'var(--turquoise)'
              e.currentTarget.style.borderColor = 'var(--gray-200)'
              e.currentTarget.style.transform = 'translateX(0)'
            }}
          >
            <i className={getIconClass(link.icon)} style={{ width: '20px', textAlign: 'center', color: 'inherit' }}></i>
            <span>{link.name || link.label || 'Odkaz'}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

