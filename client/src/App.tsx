import React, { useEffect, useState } from 'react';
import ProblemList, { Problem } from './components/ProblemList';
import ProblemDetail from './components/ProblemDetail';
import Sidebar from './components/Sidebar';
import ConceptList from './components/ConceptList';
import ProblemDetailView from './components/ProblemDetailView';
import SolvedProblemsList from './components/SolvedProblemsList';
import SolvedDetailView from './components/SolvedDetailView';
import DueTodayFlashcards from './components/DueTodayFlashcards';
import './styles.css';

const MENU_KEYS = ['practice', 'solved', 'due-today', 'pomodoro'] as const;
type MenuKey = typeof MENU_KEYS[number];

const App: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [view, setView] = useState<MenuKey>('practice');
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [solvedDetailOpen, setSolvedDetailOpen] = useState(false);
  const [solvedDetailProblem, setSolvedDetailProblem] = useState<Problem | null>(null);
  const [dueTodayProblems, setDueTodayProblems] = useState<Problem[]>([]);
  const [loadingDueToday, setLoadingDueToday] = useState(false);
  const [solvedProblems, setSolvedProblems] = useState<Problem[]>([]);
  const [loadingSolved, setLoadingSolved] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/problems')
      .then(res => res.json())
      .then(setProblems);
  }, []);

  useEffect(() => {
    if (view === 'due-today') {
      setLoadingDueToday(true);
      fetch('http://localhost:3001/api/due-today')
        .then(res => res.json())
        .then(data => setDueTodayProblems(data))
        .finally(() => setLoadingDueToday(false));
    }
  }, [view]);

  useEffect(() => {
    if (view === 'solved') {
      setLoadingSolved(true);
      fetch('http://localhost:3001/api/solved')
        .then(res => res.json())
        .then(data => setSolvedProblems(data))
        .finally(() => setLoadingSolved(false));
    }
  }, [view]);

  if (problems.length === 0) {
    return <div>Loading problems...</div>;
  }

  // Calculate stats
  const easy = problems.filter(p => p.difficulty === 'Easy').length;
  const medium = problems.filter(p => p.difficulty === 'Medium').length;
  const hard = problems.filter(p => p.difficulty === 'Hard').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const dueToday = problems.filter(
    p => p.in_review_cycle && p.next_review_date === todayStr
  ).length;

  // Filter problems based on view
  let filteredProblems = problems;
  if (view === 'solved') {
    filteredProblems = problems.filter(p => p.solved);
  } else if (view === 'due-today') {
    filteredProblems = problems.filter(p => p.in_review_cycle && p.next_review_date === todayStr);
  }
  if (selectedConcept) {
    filteredProblems = filteredProblems.filter(p => p.concept === selectedConcept);
  }

  const handleMenuSelect = (menu: string) => {
    if (MENU_KEYS.includes(menu as MenuKey)) {
      setView(menu as MenuKey);
      setSelectedConcept(null); // Reset concept selection when changing menu
      setSelectedProblem(null);
    }
  };

  const handleConceptSelect = (concept: string) => {
    setSelectedConcept(concept);
    // Always select the first problem for the concept from the full problems list
    const first = problems.find(p => p.concept === concept);
    setSelectedProblem(first || null);
  };

  const handleBackToConcepts = () => {
    setSelectedConcept(null);
    setSelectedProblem(null);
  };

  const handleSelectProblem = (problem: Problem) => {
    setSelectedProblem(problem);
  };

  const handleSolvedProblemClick = (problem: Problem) => {
    setSolvedDetailOpen(true);
    setSolvedDetailProblem(problem);
  };
  const handleCloseSolvedDetail = () => {
    setSolvedDetailOpen(false);
    setSolvedDetailProblem(null);
  };

  // Mark as solved/unsolved handlers
  const markAsSolvedToggle = async (problemId: number) => {
    // Get the current problem to check its solved state
    const currentProblem = problems.find(p => p.id === problemId);
    if (!currentProblem) return;
    
    const newSolvedState = !currentProblem.solved;
    
    await fetch(`http://localhost:3001/api/problems/${problemId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solved: newSolvedState })
    });
    // Refresh problems and solvedProblems
    fetch('http://localhost:3001/api/problems')
      .then(res => res.json())
      .then(setProblems);
    fetch('http://localhost:3001/api/solved')
      .then(res => res.json())
      .then(setSolvedProblems);
  };

  return (
    <div className="main-layout" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        easy={easy}
        medium={medium}
        hard={hard}
        dueToday={dueToday}
        activeMenu={view}
        onMenuSelect={handleMenuSelect}
      />
      <div className="main-content" style={{ flex: 1, padding: '2rem' }}>
        <h1>LeetCode Practice</h1>
        {view === 'pomodoro' ? (
          <div className="pomodoro-placeholder">Pomodoro Timer Coming Soon!</div>
        ) : view === 'solved' ? (
          loadingSolved ? (
            <div>Loading solved problems...</div>
          ) : (
            <>
              <SolvedProblemsList
                problems={solvedProblems}
                selectedProblem={solvedDetailProblem}
                onSelectProblem={handleSolvedProblemClick}
              />
              {solvedDetailOpen && solvedDetailProblem && (
                <SolvedDetailView
                  problems={solvedProblems}
                  selectedProblem={solvedDetailProblem}
                  onSelectProblem={handleSolvedProblemClick}
                  onBack={handleCloseSolvedDetail}
                  onMarkAsUnsolved={markAsSolvedToggle}
                />
              )}
            </>
          )
        ) : view === 'due-today' ? (
          loadingDueToday ? (
            <div>Loading due today problems...</div>
          ) : (
            <DueTodayFlashcards problems={dueTodayProblems} />
          )
        ) : view === 'practice' && !selectedConcept ? (
          <ConceptList problems={filteredProblems} onSelect={handleConceptSelect} />
        ) : selectedConcept && selectedProblem ? (
          <ProblemDetailView
            concept={selectedConcept}
            problems={filteredProblems}
            selectedProblem={selectedProblem}
            onSelectProblem={handleSelectProblem}
            onBack={handleBackToConcepts}
            onMarkAsSolved={markAsSolvedToggle}
          />
        ) : selectedConcept && filteredProblems.length === 0 ? (
          <div>No problems found for this concept.</div>
        ) : (
          <>
            {selectedConcept && (
              <button className="back-btn" onClick={handleBackToConcepts} style={{ marginBottom: '1rem' }}>
                ← Back to Concepts
              </button>
            )}
            <ProblemList problems={filteredProblems} onSelect={setSelectedProblem} />
            {selectedProblem && <ProblemDetail problem={selectedProblem} />}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
