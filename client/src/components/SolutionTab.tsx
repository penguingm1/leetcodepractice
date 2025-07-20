import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Problem } from './ProblemList';

interface SolutionTabProps {
  problem: Problem;
  onSolutionSaved?: (problemId: number, solution: string) => void;
}

const SolutionTab: React.FC<SolutionTabProps> = ({ problem, onSolutionSaved }) => {
  const [solution, setSolution] = useState('');
  const [status, setStatus] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const lastProblemId = useRef<number>(problem.id);

  // Load solution from problem object when problem changes (matching script.js logic)
  useEffect(() => {
    if (problem.solution && problem.solution.trim()) {
      setSolution(problem.solution);
    } else {
      setSolution('');
    }
  }, [problem.solution]);

  // Setup editor when problem changes (matching script.js loadSolutionForProblem)
  useEffect(() => {
    if (editorRef.current && lastProblemId.current !== problem.id) {
      // Clear any existing content and event listeners by cloning (matching script.js)
      const editor = editorRef.current;
      const newEditor = editor.cloneNode(true) as HTMLDivElement;
      editor.parentNode?.replaceChild(newEditor, editor);
      
      // Update the ref to point to the new element
      editorRef.current = newEditor;
      
      // Set the solution content (matching script.js logic)
      if (problem.solution && problem.solution.trim()) {
        newEditor.innerHTML = problem.solution;
        newEditor.classList.remove('placeholder');
      } else {
        newEditor.textContent = 'Write your solution here...';
        newEditor.classList.add('placeholder');
      }
      
      // Re-enable the solution editor when a problem is selected
      newEditor.contentEditable = 'true';
      newEditor.style.opacity = '1';
      newEditor.style.pointerEvents = 'auto';
      
      // Add placeholder functionality for contentEditable (matching script.js setupSolutionEditor)
      setupSolutionEditor(newEditor);
      
      lastProblemId.current = problem.id;
    }
  }, [problem.id, problem.solution]);

  const setupSolutionEditor = (editor: HTMLDivElement) => {
    const placeholder = 'Write your solution here...';
    
    // Set placeholder if content is empty
    if (!editor.textContent?.trim()) {
      editor.textContent = placeholder;
      editor.classList.add('placeholder');
    }
    
    // Handle focus events
    editor.addEventListener('focus', function() {
      if (editor.textContent === placeholder) {
        editor.textContent = '';
        editor.classList.remove('placeholder');
      }
    });
    
    // Handle blur events - only show placeholder if truly empty
    editor.addEventListener('blur', function() {
      const content = editor.textContent?.trim();
      if (content === '' || content === placeholder) {
        editor.textContent = placeholder;
        editor.classList.add('placeholder');
      } else {
        // If there's actual content, remove placeholder styling
        editor.classList.remove('placeholder');
      }
    });
    
    // Set up auto-save functionality for solution (matching script.js setupSolutionAutoSave)
    editor.addEventListener('input', function() {
      const content = editor.innerHTML;
      setSolution(content);
      saveSolution(content);
    });
  };

  const saveSolution = useCallback(async (content: string) => {
    setStatus('Saving...');
    try {
      const response = await fetch(`http://localhost:3001/api/problems/${problem.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solved: problem.solved || false,
          notes: problem.notes || '',
          solution: content
        })
      });

      if (response.ok) {
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 1200);
        // Update the problem object in memory (matching script.js behavior)
        problem.solution = content;
        // Notify parent component about the save
        onSolutionSaved?.(problem.id, content);
      } else {
        setStatus('Failed to save');
        setTimeout(() => setStatus(''), 3000);
      }
    } catch (error) {
      console.error('Error saving solution:', error);
      setStatus('Failed to save');
      setTimeout(() => setStatus(''), 3000);
    }
  }, [problem.solved, problem.notes, problem.id, problem, onSolutionSaved]);

  return (
    <>
      <div
        className="notes-editor"
        id="solutionEditor"
        contentEditable={true}
        spellCheck={false}
        ref={editorRef}
        suppressContentEditableWarning={true}
        style={{ width: '100%', minHeight: '120px' }}
      />
      <span id="solutionStatus" className="notes-status">{status}</span>
    </>
  );
};

export default SolutionTab; 