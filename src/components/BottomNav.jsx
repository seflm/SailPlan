import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './BottomNav.css';

/**
 * BottomNav - Fixní spodní navigační lišta pro mobilní zařízení
 * 
 * @param {function} onMenuClick - Callback pro otevření menu
 */
const BottomNav = React.memo(({ 
  onMenuClick
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: <i className="fas fa-tachometer-alt"></i>,
      action: () => navigate('/dashboard')
    },
    { 
      path: '/trips', 
      label: 'Mé plavby', 
      icon: <i className="fas fa-ship"></i>,
      action: () => navigate('/trips')
    },
    { 
      path: '/organizing', 
      label: 'Organizuji', 
      icon: <i className="fas fa-sitemap"></i>,
      action: () => navigate('/organizing')
    },
    { 
      path: '/profile', 
      label: 'Profil', 
      icon: <i className="fas fa-user"></i>,
      action: () => navigate('/profile')
    },
    { 
      path: 'menu', 
      label: 'Menu', 
      icon: <i className="fas fa-bars"></i>, 
      action: onMenuClick 
    },
  ];

  const isActive = (path) => {
    if (path === 'menu') return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            onClick={item.action}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;

