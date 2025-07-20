import React from 'react';
import { Problem } from './ProblemList';

interface ConceptListProps {
  problems: Problem[];
  onSelect: (concept: string) => void;
}

const ConceptList: React.FC<ConceptListProps> = ({ problems, onSelect }) => {
  // Get unique concepts and their problem counts
  const conceptMap: Record<string, number> = {};
  problems.forEach(p => {
    if (p.concept) {
      conceptMap[p.concept] = (conceptMap[p.concept] || 0) + 1;
    }
  });
  const concepts = Object.entries(conceptMap);

  return (
    <div className="problem-list">
      {concepts.map(([concept, count]) => (
        <div
          className="problem-item"
          key={concept}
          onClick={() => onSelect(concept)}
        >
          <div className="problem-title">{concept}</div>
          <div className="problem-progress">
            <span>0 / {count}</span>
            <div className="problem-bar">
              <div className="problem-bar-fill" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConceptList; 