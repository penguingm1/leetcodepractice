import React, { useState, useEffect } from 'react';

interface SolvedToggleButtonProps {
  problem: {
    id: number;
    solved?: boolean;
  };
  onToggle: (problemId: number) => Promise<void>;
  className?: string;
}

const SolvedToggleButton: React.FC<SolvedToggleButtonProps> = ({ problem, onToggle, className = '' }) => {
  const [isSolved, setIsSolved] = useState(problem.solved || false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Update isSolved when problem changes
  useEffect(() => {
    setIsSolved(problem.solved || false);
  }, [problem.solved]);

  const handleToggleSolved = async () => {
    console.log('Toggle button clicked!', { isSolved, isAnimating, problem });
    if (isAnimating) return; // Prevent multiple clicks during animation
    
    console.log('Starting animation...');
    setIsAnimating(true);
    
    if (isSolved) {
      // Currently solved, so unsolve it
      console.log('Unsolving...');
      setIsSolved(false);
      setTimeout(async () => {
        try {
          await onToggle(problem.id);
          console.log('Unsolved successfully');
        } catch (error) {
          console.error('Error unsolving:', error);
          // Revert on error
          setIsSolved(true);
        } finally {
          setIsAnimating(false);
        }
      }, 300);
    } else {
      // Currently unsolved, so solve it
      console.log('Solving...');
      setIsSolved(true);
      setTimeout(async () => {
        try {
          await onToggle(problem.id);
          console.log('Solved successfully');
        } catch (error) {
          console.error('Error solving:', error);
          // Revert on error
          setIsSolved(false);
        } finally {
          setIsAnimating(false);
        }
      }, 300);
    }
  };

  return (
    <button
      className={`action-btn${isSolved ? ' solved' : ''}${isAnimating ? (isSolved ? ' unsolving' : ' solving') : ''} ${className}`}
      onClick={handleToggleSolved}
    >
      {isSolved && <span className="checkmark">✓</span>}
      <span className="btn-text">{isSolved ? 'Solved!' : 'Mark as Solved'}</span>
    </button>
  );
};

export default SolvedToggleButton; 