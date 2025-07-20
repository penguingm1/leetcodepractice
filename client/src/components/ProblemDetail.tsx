import React, { useState } from 'react';
import { Problem } from './ProblemList';
import NotesTab from './NotesTab';
import SolutionTab from './SolutionTab';
import ReviewHistoryTab from './ReviewHistoryTab';

interface ProblemDetailProps {
  problem: Problem;
  onNotesSaved?: (problemId: number, notes: string) => void;
  onSolutionSaved?: (problemId: number, solution: string) => void;
}

const ProblemDetail: React.FC<ProblemDetailProps> = ({ problem, onNotesSaved, onSolutionSaved }) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'solution' | 'review'>('notes');

  return (
    <div className="notes-panel">
      <div className="notes-tabs">
        <button
          className={`tab-btn${activeTab === 'notes' ? ' active' : ''}`}
          data-tab="notes"
          onClick={() => setActiveTab('notes')}
        >📝 Notes</button>
        <button
          className={`tab-btn${activeTab === 'solution' ? ' active' : ''}`}
          data-tab="solution"
          onClick={() => setActiveTab('solution')}
        >💻 Solution</button>
        <button
          className={`tab-btn${activeTab === 'review' ? ' active' : ''}`}
          data-tab="history"
          onClick={() => setActiveTab('review')}
        >📊 Review History</button>
      </div>
      {/* Notes Tab */}
      <div className={`tab-content${activeTab === 'notes' ? ' active' : ''}`} id="notes-tab">
        <div className="notes-header">
          <span>📝 Notes</span>
          <span id="notesStatus" className="notes-status"></span>
        </div>
        <NotesTab problem={problem} onNotesSaved={onNotesSaved} />
      </div>
      {/* Solution Tab */}
      <div className={`tab-content${activeTab === 'solution' ? ' active' : ''}`} id="solution-tab">
        <div className="notes-header">
          <span>💻 Solution</span>
          <span id="solutionStatus" className="notes-status"></span>
        </div>
        <SolutionTab problem={problem} onSolutionSaved={onSolutionSaved} />
      </div>
      {/* Review History Tab */}
      <div className={`tab-content${activeTab === 'review' ? ' active' : ''}`} id="history-tab">
        <ReviewHistoryTab
          problemId={problem.id}
          problemTitle={problem.title}
          problemDifficulty={problem.difficulty}
          problemConcept={problem.concept}
        />
      </div>
    </div>
  );
};

export default ProblemDetail; 