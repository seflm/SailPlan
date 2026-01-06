import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getUserInitials } from '../utils/userDisplay';
import './SideDrawer.css';

/**
 * SideDrawer - Boční drawer menu pro mobilní zařízení
 * Vysouvá se zleva s animací
 */
const SideDrawer = ({ 
  isOpen, 
  onClose, 
  currentUser = null
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [userInitials, setUserInitials] = useState('U');
  const animationDuration = 300;

  useEffect(() => {
    if (currentUser?.uid) {
      getUserInitials(currentUser.uid).then(initials => {
        setUserInitials(initials);
      });
    }
  }, [currentUser]);

  // Řízení lifecycle a scroll lock
  useEffect(() => {
    let openTimer;
    let closeTimer;

    if (isOpen) {
      setIsMounted(true);
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      
      openTimer = setTimeout(() => {
        setIsAnimating(true);
      }, 50);
    } else {
      setIsAnimating(false);
      
      closeTimer = setTimeout(() => {
        setIsMounted(false);
        document.documentElement.style.removeProperty('overflow');
        document.body.style.removeProperty('overflow');
      }, animationDuration);
    }

    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
    };
  }, [isOpen, animationDuration]);

  if (!isMounted) {
    return null;
  }
    
  const handleNavClick = (path) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '⛵' },
    { path: '/trips', label: 'Mé plavby', icon: '📋' },
    { path: '/organizing', label: 'Organizuji', icon: '👑' },
  ];

  const backdropTransition = isAnimating ? 'opacity-100' : 'opacity-0';
  const drawerTransition = isAnimating ? 'translate-x-0' : '-translate-x-full';

  return (
    <>
      <div
        className={`side-drawer-backdrop ${backdropTransition}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`side-drawer ${drawerTransition}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="side-drawer-header">
          <div className="side-drawer-brand">
            <div className="side-drawer-logo">⛵</div>
            <div>
              <div className="side-drawer-app-name">SailPlan</div>
            </div>
          </div>
          <button onClick={onClose} className="side-drawer-close" aria-label="Zavřít">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <nav className="side-drawer-nav">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button 
                key={item.path} 
                onClick={() => handleNavClick(item.path)} 
                className={`side-drawer-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="side-drawer-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="side-drawer-footer">
          <button onClick={() => handleNavClick('/profile')} className="side-drawer-nav-item">
            <i className="fas fa-user"></i>
            <span>Můj profil</span>
          </button>
          <button onClick={() => handleNavClick('/settings/organizer')} className="side-drawer-nav-item">
            <span className="side-drawer-nav-icon">⚙️</span>
            <span>Nastavení organizátora</span>
          </button>
          <div className="side-drawer-divider"></div>
          {currentUser && (
            <div className="side-drawer-user">
              <div className="side-drawer-avatar">{userInitials}</div>
              <div className="side-drawer-user-info">
                <div className="side-drawer-user-name">{currentUser.displayName || 'Uživatel'}</div>
                <div className="side-drawer-user-email">{currentUser.email}</div>
              </div>
            </div>
          )}
          <button onClick={handleSignOut} className="side-drawer-nav-item">
            <i className="fas fa-sign-out-alt"></i>
            <span>Odhlásit se</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default SideDrawer;
