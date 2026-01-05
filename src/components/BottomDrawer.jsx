import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './BottomDrawer.css';

/**
 * BottomDrawer - Drawer, který se vysouvá ze spodu obrazovky
 * Ideální pro zobrazení detailů nebo formulářů na mobilních zařízeních
 */
const BottomDrawer = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxHeight = 80
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationDuration = 300;

  useEffect(() => {
    let openTimer;
    let closeTimer;

    if (isOpen) {
      setIsMounted(true);
      openTimer = setTimeout(() => {
        setIsAnimating(true);
      }, 50);
    } else {
      setIsAnimating(false);
      closeTimer = setTimeout(() => {
        setIsMounted(false);
      }, animationDuration);
    }

    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isMounted) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMounted]);

  if (typeof document === 'undefined' || !isMounted) {
    return null;
  }

  const backdropStyle = {
    position: 'fixed',
    inset: '0px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    zIndex: 40,
    transition: `opacity ${animationDuration}ms ease-in-out`,
    opacity: isAnimating ? 1 : 0,
  };

  const drawerStyle = {
    position: 'fixed',
    bottom: '0px',
    left: '0px',
    right: '0px',
    zIndex: 50,
    width: '100%',
    maxWidth: '48rem',
    marginLeft: 'auto',
    marginRight: 'auto',
    padding: '1.5rem',
    backgroundColor: 'var(--white)',
    color: 'var(--gray-800)',
    borderTopLeftRadius: '1.5rem',
    borderTopRightRadius: '1.5rem',
    boxShadow: '0 -10px 15px -3px rgb(0 0 0 / 0.1), 0 -4px 6px -4px rgb(0 0 0 / 0.1)',
    overflow: 'hidden',
    transition: `transform ${animationDuration}ms ease-in-out`,
    transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
  };

  return createPortal(
    <>
      <div 
        style={backdropStyle} 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      <div
        style={drawerStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-drawer-header">
          <h2 id="drawer-title" className="bottom-drawer-title">
            {typeof title === 'string' ? title : <span>{title}</span>}
          </h2>
          <button 
            onClick={onClose} 
            className="bottom-drawer-close" 
            aria-label="Zavřít"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div 
          className="bottom-drawer-content"
          style={{ maxHeight: `${maxHeight}vh`, overflowY: 'auto' }}
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  );
};

export default BottomDrawer;

