import React from 'react';
import { Problem as BaseProblem } from './ProblemList';
import ProblemDetail from './ProblemDetail';
import SolvedToggleButton from './SolvedToggleButton';

interface Problem extends BaseProblem {
  leetcode_link?: string;
}

interface SolvedDetailViewProps {
  problems: Problem[];
  selectedProblem: Problem;
  onSelectProblem: (problem: Problem) => void;
  onBack: () => void;
  onMarkAsUnsolved: (problemId: number) => Promise<void>;
}

const SolvedDetailView: React.FC<SolvedDetailViewProps> = ({ problems, selectedProblem, onSelectProblem, onBack, onMarkAsUnsolved }) => {
  return (
    <div className="problem-detail-view active" id="solvedDetailView">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back to Menu</button>
        <h2 id="solvedDetailTitle">Solved Problems</h2>
        <div className="progress-bar-detail">
          <div className="progress-fill-detail" id="solvedDetailProgressFill"></div>
        </div>
      </div>
      <div className="detail-content">
        {/* Solved Problem List Panel */}
        <div className="problem-list-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" id="solvedDetailProblemCount">Solved Problems ({problems.length})</h3>
            {/* Sort controls can be added here */}
          </div>
          <div className="space-y-2" id="solvedDetailProblemList">
            {problems.map(problem => (
              <div
                key={problem.id}
                id={`solvedProblemItem-${problem.id}`}
                className={`problem-item-detail${problem.id === selectedProblem.id ? ' selected' : ''} ${problem.difficulty.toLowerCase()}`}
                onClick={() => onSelectProblem(problem)}
                style={{ cursor: 'pointer' }}
              >
                <div className="problem-title-flex">
                  <div className="problem-title-group">
                    <span className="text-white font-medium problem-title-detail">{problem.title}</span>
                  </div>
                  <div className="solved-problem-actions">
                    <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Solved Problem Code Panel */}
        <div className="code-panel" style={{ flex: 2, marginLeft: '2rem' }}>
          <div className="code-header">
            <h3 id="solvedDetailProblemTitle">{selectedProblem.title}</h3>
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
                onToggle={onMarkAsUnsolved}
              />
            </div>
          </div>
          <div className="notes-panel">
            {/* Use the same ProblemDetail component as in ProblemDetailView */}
            <ProblemDetail problem={selectedProblem} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolvedDetailView; 