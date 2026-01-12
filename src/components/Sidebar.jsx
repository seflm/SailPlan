import { Link, useLocation } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'
import './Sidebar.css'

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuthState()

  return (
    <aside className="sidebar">
      <Link to="/dashboard" className="brand">
        <img src="/logo.svg" alt="Boatra.com" className="logo-svg" style={{ height: '40px' }} />
        <div>
          <div className="brandTag">dashboard</div>
        </div>
      </Link>

      <div className="nav">
        <div className="hint">Plavby</div>
        <Link
          to="/dashboard"
          className={location.pathname === '/dashboard' ? 'active' : ''}
        >
          <span className="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3c3.4 3.7 6 8.1 7.6 13.3-3.4 1.9-7.2 2.8-11.4 2.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M12 3v16.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </span>
          Domů
        </Link>
        <Link
          to="/trips"
          className={location.pathname === '/trips' ? 'active' : ''}
        >
          <span className="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 6h10.8c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M8 10h8M8 13.5h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".85"/>
            </svg>
          </span>
          Přehled plaveb
        </Link>
        <Link
          to="/settings/organizer"
          className={location.pathname === '/settings/organizer' ? 'active' : ''}
        >
          <span className="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M19.4 13.2l1.2-1.2-1.6-2.8-1.6.4a7.8 7.8 0 0 0-1.3-1.3l.4-1.6L13.7 5 12.5 6.2h-1L10.3 5 7.5 6.7l.4 1.6c-.5.4-.9.8-1.3 1.3l-1.6-.4L3.4 12l1.2 1.2v1l-1.2 1.2L5 18.2l1.6-.4c.4.5.8.9 1.3 1.3l-.4 1.6 2.8 1.6 1.2-1.2h1l1.2 1.2 2.8-1.6-.4-1.6c.5-.4.9-.8 1.3-1.3l1.6.4 1.6-2.8-1.2-1.2v-1z" stroke="currentColor" strokeWidth="1.2" opacity=".85" strokeLinejoin="round"/>
            </svg>
          </span>
          Nastavení organizátora
        </Link>
      </div>

      <div className="divider"></div>
      <Link to="/trip/new" className="btn block">
        + Zorganizovat plavbu
      </Link>
    </aside>
  )
}

