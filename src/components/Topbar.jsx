import { useState } from 'react'
import { useAuthState } from '../hooks/useAuthState'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import './Topbar.css'

export default function Topbar() {
  const { user } = useAuthState()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getInitials = (email) => {
    if (!email) return 'U'
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <header className="topbar">
      <div className="row">
        <div className="search" role="search">
          <span aria-hidden="true" style={{ opacity: 0.85 }}>⌘</span>
          <input placeholder="Hledat plavbu, loď, účastníka…" />
        </div>
        <div className="right row" style={{ gap: '10px' }}>
          <div className="dropdown" data-dropdown>
            <div 
              className="avatar" 
              data-dropdown-btn 
              aria-label="Profil"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <b>{getInitials(user?.email)}</b>
            </div>
            {dropdownOpen && (
              <div className="menu" data-dropdown-menu>
                <div className="p" style={{ padding: '8px 10px 10px 10px' }}>
                  <b>{user?.displayName || 'Uživatel'}</b>
                  <br />
                  <span className="small">{user?.email}</span>
                </div>
                <hr />
                <a href="#" onClick={(e) => { e.preventDefault(); setDropdownOpen(false) }}>
                  Upravit profil
                </a>
                <a href="/settings/organizer" onClick={() => setDropdownOpen(false)}>
                  Nastavení organizátora
                </a>
                <a href="/" onClick={() => setDropdownOpen(false)}>Landing</a>
                <hr />
                <button type="button" onClick={handleSignOut}>
                  Odhlásit se
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

