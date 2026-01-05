import React from 'react'

export default function ContactsCard({ contacts = [] }) {
  if (!contacts || contacts.length === 0) {
    return null
  }

  const getAvatarInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'organizer':
        return 'Organizátor plavby'
      case 'captain':
        return 'Kapitán vaší lodě'
      default:
        return ''
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'organizer':
        return 'linear-gradient(135deg, var(--coral), var(--coral-light))'
      case 'captain':
        return 'linear-gradient(135deg, var(--turquoise), var(--turquoise-light))'
      default:
        return 'linear-gradient(135deg, var(--ocean-mid), var(--ocean-light))'
    }
  }

  return (
    <div className="sidebar-card animate-in">
      <h4>
        <i className="fas fa-address-book" style={{ color: 'var(--turquoise)' }}></i>
        Kontakty
      </h4>
      
      <div style={{ marginTop: 'var(--space-md)' }}>
        {contacts.map((contact, index) => {
          if (!contact || (!contact.name && !contact.email && !contact.phone)) {
            return null
          }

          return (
            <div key={index} style={{ marginBottom: index < contacts.length - 1 ? 'var(--space-lg)' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div 
                  className="crew-avatar" 
                  style={{ 
                    background: getRoleColor(contact.role),
                    width: contact.role === 'captain' ? '40px' : '48px',
                    height: contact.role === 'captain' ? '40px' : '48px',
                    fontSize: contact.role === 'captain' ? '0.875rem' : '1rem'
                  }}
                >
                  {contact.role === 'organizer' ? 'O' : contact.role === 'captain' ? 'K' : getAvatarInitials(contact.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-medium">{contact.name || (contact.role === 'organizer' ? 'Organizátor' : contact.role === 'captain' ? 'Kapitán' : 'Kontakt')}</div>
                  {contact.role && (
                    <div className="text-sm text-muted">{getRoleLabel(contact.role)}</div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {contact.email && (
                  <div>
                    <div className="text-xs text-muted">Email</div>
                    <a 
                      href={`mailto:${contact.email}`}
                      className="font-medium"
                      style={{ color: 'var(--ocean-deep)', textDecoration: 'none' }}
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <div className="text-xs text-muted">Telefon</div>
                    <a 
                      href={`tel:${contact.phone}`}
                      className="font-medium"
                      style={{ color: 'var(--ocean-deep)', textDecoration: 'none' }}
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.address && (
                  <div>
                    <div className="text-xs text-muted">Adresa</div>
                    <div className="font-medium" style={{ whiteSpace: 'pre-wrap' }}>{contact.address}</div>
                  </div>
                )}
              </div>
              
              {index < contacts.length - 1 && (
                <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--gray-100)' }}></div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


