import React from 'react';
import './Sidebar.css';

const IconSidebar = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor" />
  </svg>
);

const SidebarToggle = ({ isOpen, onToggle }) => {
  return (
    <button 
      className={`sidebar-toggle ${isOpen ? 'open' : ''}`}
      onClick={onToggle}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
    >
      <IconSidebar />
    </button>
  );
};

export default SidebarToggle;