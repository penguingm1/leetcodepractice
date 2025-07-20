import React from 'react';

export interface Problem {
  id: number;
  title: string;
  concept: string;
  difficulty: string;
  notes?: string;
  solution?: string;
  solved?: boolean;
  in_review_cycle?: boolean;
  next_review_date?: string;
}

interface ProblemListProps {
  problems: Problem[];
  onSelect: (problem: Problem) => void;
}

const ProblemList: React.FC<ProblemListProps> = ({ problems, onSelect }) => (
  <div className="problem-list">
    {problems.map(problem => (
      <div
        key={problem.id}
        className="problem-item"
        onClick={() => onSelect(problem)}
      >
        <div className="problem-title">{problem.title}</div>
        <div className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</div>
      </div>
    ))}
  </div>
);

export default ProblemList; 