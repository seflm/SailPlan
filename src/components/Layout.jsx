import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import { getUserInitials } from '../utils/userDisplay'
import useMediaQuery from '../hooks/useMediaQuery'
import SideDrawer from './SideDrawer'
import BottomNav from './BottomNav'
import './Layout.css'

export default function Layout() {
  const { user } = useAuthState()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [userInitials, setUserInitials] = useState('U')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const timeoutRef = useRef(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    if (user?.uid) {
      getUserInitials(user.uid).then(initials => {
        setUserInitials(initials)
      })
    }
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setDropdownOpen(false)
    }, 200)
  }

  if (!user) {
    return null
  }

  return (
    <div className={`dashboard ${isMobile ? 'dashboard-mobile' : ''}`}>
      {isMobile ? (
        <>
          <header className="header header-mobile">
            <div className="container">
              <div className="header-inner">
                <button 
                  className="mobile-menu-btn"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Otevřít menu"
                >
                  <i className="fas fa-bars"></i>
                </button>
                <Link to="/dashboard" className="logo">
                  <div className="logo-icon">
                    <i className="fas fa-sailboat"></i>
                  </div>
                  SailPlan
                </Link>
                <Link to="/profile" className="profile-btn-mobile">
                  <div className="profile-avatar">{userInitials}</div>
                </Link>
              </div>
            </div>
          </header>
          <SideDrawer 
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            currentUser={user}
          />
          <BottomNav 
            onMenuClick={() => setDrawerOpen(true)}
          />
        </>
      ) : (
        <header className="header">
          <div className="container">
            <div className="header-inner">
              <Link to="/dashboard" className="logo">
                <div className="logo-icon">⛵</div>
                SailPlan
              </Link>
              
              <nav className="nav">
                <ul className="nav-links">
                  <li>
                    <Link 
                      to="/dashboard" 
                      className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/trips" 
                      className={`nav-link ${location.pathname === '/trips' ? 'active' : ''}`}
                    >
                      Mé plavby
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/organizing" 
                      className={`nav-link ${location.pathname === '/organizing' ? 'active' : ''}`}
                    >
                      Organizuji
                    </Link>
                  </li>
                </ul>
              </nav>

              <div className="header-actions">
                <div 
                  className="profile-btn" 
                  onMouseEnter={handleMouseEnter} 
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="profile-avatar">{userInitials}</div>
                  {dropdownOpen && (
                    <div 
                      className="dropdown" 
                      onMouseEnter={handleMouseEnter} 
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="dropdown-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 'var(--space-md)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ocean-deep)' }}>
                          {user?.displayName || 'Uživatel'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginTop: 'var(--space-xs)' }}>
                          {user?.email}
                        </div>
                      </div>
                      <div className="dropdown-divider"></div>
                      <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <i className="fas fa-user"></i>
                        Můj profil
                      </Link>
                      <Link to="/settings/organizer" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <i className="fas fa-cog"></i>
                        Nastavení organizátora
                      </Link>
                      <div className="dropdown-divider"></div>
                      <button 
                        className="dropdown-item" 
                        onClick={handleSignOut}
                        style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        <i className="fas fa-sign-out-alt"></i>
                        Odhlásit se
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={`dashboard-content ${isMobile ? 'dashboard-content-mobile' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}
