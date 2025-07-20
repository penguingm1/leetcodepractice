import React from 'react';

interface StatsCardProps {
  easy: number;
  medium: number;
  hard: number;
}

const StatsCard: React.FC<StatsCardProps> = ({ easy, medium, hard }) => (
  <div className="stats-card">
    <div className="stat-label easy">Easy</div>
    <div className="stat-value easy">{easy}</div>
    <div className="stat-label medium">Medium</div>
    <div className="stat-value medium">{medium}</div>
    <div className="stat-label hard">Hard</div>
    <div className="stat-value hard">{hard}</div>
  </div>
);

export default StatsCard; 