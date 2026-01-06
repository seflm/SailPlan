import React, { useState, useEffect, useRef } from 'react';
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
  const [isScrollable, setIsScrollable] = useState(false);
  const contentRef = useRef(null);
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

  // Check if content is scrollable and if user is at bottom
  useEffect(() => {
    const checkScrollable = () => {
      if (contentRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = contentRef.current;
        const isScrollableContent = scrollHeight > clientHeight;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
        setIsScrollable(isScrollableContent && !isAtBottom);
      }
    };

    if (isMounted && isAnimating) {
      // Check after a short delay to ensure content is rendered
      setTimeout(checkScrollable, 100);
      window.addEventListener('resize', checkScrollable);
      
      if (contentRef.current) {
        contentRef.current.addEventListener('scroll', checkScrollable);
      }
    }

    return () => {
      window.removeEventListener('resize', checkScrollable);
      if (contentRef.current) {
        contentRef.current.removeEventListener('scroll', checkScrollable);
      }
    };
  }, [isMounted, isAnimating]);

  if (typeof document === 'undefined') {
    return null;
  }
  
  // Don't render if not mounted
  // But keep rendering during closing animation (isMounted but !isAnimating)
  if (!isMounted) {
    return null;
  }

  const backdropStyle = {
    position: 'fixed',
    inset: '0px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    transition: `opacity ${animationDuration}ms ease-in-out`,
    opacity: isAnimating ? 1 : 0,
    pointerEvents: isAnimating ? 'auto' : 'none',
    touchAction: 'none', // Prevent scrolling through backdrop
  };

  const drawerStyle = {
    position: 'fixed',
    bottom: '0px',
    left: '0px',
    right: '0px',
    zIndex: 110,
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
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    willChange: 'transform',
  };
  
  // Determine animation class
  const animationClass = isAnimating ? 'opening' : 'closing';

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
        className={`bottom-drawer-wrapper ${animationClass}`}
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
          ref={contentRef}
          className={`bottom-drawer-content ${isScrollable ? 'scrollable' : ''}`}
          style={{ 
            maxHeight: `${Math.min(maxHeight, 90)}vh`, 
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
            position: 'relative'
          }}
        >
          {children}
          {isScrollable && (
            <div className="bottom-drawer-scroll-indicator">
              <i className="fas fa-chevron-down"></i>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default BottomDrawer;

