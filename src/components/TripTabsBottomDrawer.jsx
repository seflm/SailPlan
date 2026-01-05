import React, { useRef, useEffect, useState } from 'react';
import './TripTabsBottomDrawer.css';

/**
 * TripTabsBottomDrawer - Fixní bottom drawer s horizontálně scrollovatelnými záložkami
 * Zobrazuje se ve spodní části obrazovky na mobilních zařízeních
 */
const TripTabsBottomDrawer = ({ 
  tabs = [],
  activeTab,
  onTabChange
}) => {
  const scrollContainerRef = useRef(null);
  const activeTabRef = useRef(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(true);

  // Check scroll position to show/hide indicators
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftIndicator(scrollLeft > 0);
      setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [tabs]);

  // Scroll to active tab when it changes
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeElement = activeTabRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeElement.getBoundingClientRect();
      
      const scrollLeft = activeElement.offsetLeft - (containerRect.width / 2) + (activeRect.width / 2);
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
      
      // Check scroll after animation
      setTimeout(checkScroll, 300);
    }
  }, [activeTab]);

  return (
    <div className="trip-tabs-bottom-drawer">
      {showLeftIndicator && (
        <div className="trip-tabs-scroll-indicator trip-tabs-scroll-indicator-left">
          <i className="fas fa-chevron-left"></i>
        </div>
      )}
      <div 
        ref={scrollContainerRef}
        className="trip-tabs-scroll-container"
        onScroll={checkScroll}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              className={`trip-tabs-tab ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon && <span className="trip-tabs-tab-icon">{tab.icon}</span>}
              <span className="trip-tabs-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
      {showRightIndicator && (
        <div className="trip-tabs-scroll-indicator trip-tabs-scroll-indicator-right">
          <i className="fas fa-chevron-right"></i>
        </div>
      )}
    </div>
  );
};

export default TripTabsBottomDrawer;

