import React, { useState } from 'react';
import { Problem as BaseProblem } from './ProblemList';
import ProblemDetail from './ProblemDetail';
import SolvedToggleButton from './SolvedToggleButton';

// Extend Problem type to include popularity and acceptance
interface Problem extends BaseProblem {
  popularity?: number;
  acceptance?: number;
  leetcode_link?: string;
}

interface ProblemDetailViewProps {
  concept: string;
  problems: Problem[];
  selectedProblem: Problem;
  onSelectProblem: (problem: Problem) => void;
  onBack: () => void;
  onMarkAsSolved: (problemId: number) => Promise<void>;
}

const SORT_OPTIONS = [
  { key: 'popularity', label: 'Popularity' },
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'acceptance', label: 'Acceptance Rate' },
  { key: 'solved', label: 'Solved' },
  { key: 'unsolved', label: 'Unsolved' },
];

type SortKey = 'popularity' | 'difficulty' | 'acceptance' | 'solved' | 'unsolved';

const ProblemDetailView: React.FC<ProblemDetailViewProps> = ({ concept, problems, selectedProblem, onSelectProblem, onBack, onMarkAsSolved }) => {
  const [sortKey, setSortKey] = useState<SortKey>('popularity');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Sorting logic
  const sortedProblems = [...problems as Problem[]].sort((a, b) => {
    if (sortKey === 'popularity') {
      return (b.popularity || 0) - (a.popularity || 0);
    } else if (sortKey === 'acceptance') {
      return (b.acceptance || 0) - (a.acceptance || 0);
    } else if (sortKey === 'difficulty') {
      const order: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      // Normalize to capitalized form
      const aDiff = a.difficulty.charAt(0).toUpperCase() + a.difficulty.slice(1).toLowerCase();
      const bDiff = b.difficulty.charAt(0).toUpperCase() + b.difficulty.slice(1).toLowerCase();
      return (order[aDiff] || 0) - (order[bDiff] || 0);
    } else if (sortKey === 'solved') {
      // Solved first
      return (b.solved ? 1 : 0) - (a.solved ? 1 : 0);
    } else if (sortKey === 'unsolved') {
      // Unsolved first
      return (a.solved ? 1 : 0) - (b.solved ? 1 : 0);
    }
    return 0;
  });

  const handleSortSelect = (key: SortKey) => {
    setSortKey(key);
    setSortDropdownOpen(false);
  };

  return (
    <div className="problem-detail-view active">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back to Concepts</button>
        <h2 className="detailConceptTitle">{concept}</h2>
        {/* Progress bar can be implemented here if needed */}
      </div>
      <div className="detail-content">
        {/* Left: Problem List Panel */}
        <div className="problem-list-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" id="detailProblemCount">Problems ({problems.length})</h3>
            <div className="sort-container" >
              <button
                className="sort-btn"
                onClick={() => setSortDropdownOpen(v => !v)}
                tabIndex={0}
                aria-haspopup="listbox"
                aria-expanded={sortDropdownOpen}
              >
                Sort by: {SORT_OPTIONS.find(opt => opt.key === sortKey)?.label} ▼
              </button>
              <div
                className={`sort-dropdown${sortDropdownOpen ? ' active' : ''}`}
                style={{ position: 'absolute', right: 0, zIndex: 10 }}
              >
                {SORT_OPTIONS.map(opt => (
                  <div
                    key={opt.key}
                    className={`sort-option${sortKey === opt.key ? ' active' : ''}`}
                    onClick={() => handleSortSelect(opt.key as SortKey)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2" id="detailProblemList">
            {sortedProblems.map(problem => {
              const difficulty = problem.difficulty.toLowerCase();
              const difficultyBadgeClass =
                difficulty === 'hard'
                  ? 'difficulty-hard'
                  : difficulty === 'medium'
                  ? 'difficulty-medium'
                  : 'difficulty-easy';
              return (
                <div
                  key={problem.id}
                  id={`problemItemDetail-${problem.id}`}
                  className={`problem-item-detail ${difficulty}${problem.id === selectedProblem.id ? ' selected' : ''}`}
                  onClick={() => onSelectProblem(problem)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="problem-title-flex">
                    <span className="font-medium problem-title-detail">{problem.title}</span>
                    <span className={`difficulty-badge ${difficultyBadgeClass}`}>{problem.difficulty}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Right: Code/Notes Panel */}
        <div className="code-panel" style={{ flex: 2 }}>
          <div className="code-header">
            <h3 id="problemDetailTitle">{selectedProblem.title}</h3>
            <div className="action-buttons">
              <button
                className="action-btn"
                title="Open in LeetCode"
                onClick={() => window.open(selectedProblem.leetcode_link, '_blank')}
              >
                Open link in new tab
              </button>
              <SolvedToggleButton
                problem={selectedProblem}
                onToggle={onMarkAsSolved}
              />
            </div>
          </div>
          <div className="notes-panel">
            <ProblemDetail 
              problem={selectedProblem} 
              onNotesSaved={(problemId, notes) => {
                // Update the selected problem in memory
                selectedProblem.notes = notes;
              }}
              onSolutionSaved={(problemId, solution) => {
                // Update the selected problem in memory
                selectedProblem.solution = solution;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetailView; 