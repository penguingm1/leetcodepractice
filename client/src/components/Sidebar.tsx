import React from 'react';

interface SidebarProps {
  easy: number;
  medium: number;
  hard: number;
  dueToday: number;
  activeMenu: string;
  onMenuSelect: (menu: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ easy, medium, hard, dueToday, activeMenu, onMenuSelect }) => (
  <div className="sidebar" id="sidebar">
    <div className="menu-header" id="menuToggle">
      <span>Menu</span>
      <span className="dropdown-arrow">▼</span>
    </div>
    <div className="menu-content" id="menuContent">
      <div className={`menu-item${activeMenu === 'practice' ? ' active' : ''}`} onClick={() => onMenuSelect('practice')}>
        <div className="icon"></div>
        <span>Practice Problems</span>
      </div>
      <div className={`menu-item${activeMenu === 'solved' ? ' active' : ''}`} id="menu-solved" onClick={() => onMenuSelect('solved')}>
        <div className="icon"></div>
        <span>Solved</span>
      </div>
      <div className={`menu-item${activeMenu === 'due-today' ? ' active' : ''}`} id="menu-due-today" onClick={() => onMenuSelect('due-today')}>
        <div className="icon"></div>
        <span>Due Today</span>
        <div className="badge">{dueToday}</div>
      </div>
      <div className={`menu-item${activeMenu === 'pomodoro' ? ' active' : ''}`} id="menu-pomodoro" onClick={() => onMenuSelect('pomodoro')}>
        <div className="icon"></div>
        <span>Pomodoro Timer</span>
      </div>
      <div className="stats-section">
        <div className="stats-title"><span>Stats</span></div>
        <div className="stat-item">
          <span className="stat-label easy">Easy</span>
          <span className="stat-value">{easy}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label medium">Medium</span>
          <span className="stat-value">{medium}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label hard">Hard</span>
          <span className="stat-value">{hard}</span>
        </div>
      </div>
    </div>
  </div>
);

export default Sidebar; 