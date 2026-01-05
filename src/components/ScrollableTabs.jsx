import React, { useRef, useEffect } from 'react';
import './ScrollableTabs.css';

/**
 * ScrollableTabs - Horizontálně scrollovatelná lišta záložek pro mobilní zařízení
 * Používá se pro zobrazení mnoha záložek v trip views
 */
const ScrollableTabs = ({ 
  tabs = [],
  activeTab,
  onTabChange,
  className = ''
}) => {
  const scrollContainerRef = useRef(null);
  const activeTabRef = useRef(null);

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
    }
  }, [activeTab]);

  return (
    <div className={`scrollable-tabs-container ${className}`}>
      <div 
        ref={scrollContainerRef}
        className="scrollable-tabs"
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              className={`scrollable-tab ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon && <span className="scrollable-tab-icon">{tab.icon}</span>}
              <span className="scrollable-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
      {/* Scroll indicators */}
      <div className="scrollable-tabs-indicator scrollable-tabs-indicator-left"></div>
      <div className="scrollable-tabs-indicator scrollable-tabs-indicator-right"></div>
    </div>
  );
};

export default ScrollableTabs;

