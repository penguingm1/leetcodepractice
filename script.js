// Proper CSV parser that handles quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, ''));
}

// Fetch all problems from backend and use for app state
async function loadBackendProblems() {
    try {
        const response = await fetch('http://localhost:3001/api/problems');
        if (!response.ok) {
            throw new Error('Backend is not responding properly.');
        }
        const problems = await response.json();
        if (!Array.isArray(problems) || problems.length === 0) {
            alert('No problems loaded. Please check if the database is connected.');
            return;
        }
        
        // Group by concept
        const conceptGroups = {};
        problems.forEach(problem => {
            if (!conceptGroups[problem.concept]) {
                conceptGroups[problem.concept] = [];
            }
            conceptGroups[problem.concept].push(problem);
        });
        window.problemData = conceptGroups;
        updateProblemList(conceptGroups);
        updateTotalProgress(problems.length);
        // Update stats section
        const easyCount = problems.filter(p => p.difficulty === 'Easy').length;
        const mediumCount = problems.filter(p => p.difficulty === 'Medium').length;
        const hardCount = problems.filter(p => p.difficulty === 'Hard').length;
        document.querySelector('.stat-label.easy').nextElementSibling.textContent = `${easyCount}`;
        document.querySelector('.stat-label.medium').nextElementSibling.textContent = `${mediumCount}`;
        document.querySelector('.stat-label.hard').nextElementSibling.textContent = `${hardCount}`;
    } catch (error) {
        console.error('Error loading problems from backend:', error);
        alert('Cannot connect to database. Please check if the server is running.');
    }
}

document.addEventListener('DOMContentLoaded', loadBackendProblems);

// Update problem list to use backend data for selection
function updateProblemList(conceptGroups) {
    const problemList = document.querySelector('.problem-list');
    problemList.innerHTML = '';
    Object.keys(conceptGroups).forEach(concept => {
        const problemCount = conceptGroups[concept].length;
        const problemItem = document.createElement('div');
        problemItem.className = 'problem-item';
        problemItem.onclick = () => openProblemDetail(concept, conceptGroups[concept]);
        problemItem.innerHTML = `
            <div class="problem-title">${concept}</div>
            <div class="problem-progress">
                <span>(0/${problemCount})</span>
                <div class="problem-bar">
                    <div class="problem-bar-fill" style="width: 0%"></div>
                </div>
            </div>
        `;
        problemList.appendChild(problemItem);
    });
}

function updateTotalProgress(totalProblems) {
    const progressText = document.querySelector('.progress-text');
    progressText.textContent = `0 / ${totalProblems}`;
}

// Tab switching functionality
function setActiveOnClick(selector) {
    document.querySelectorAll(selector).forEach(el => {
        el.addEventListener('click', function() {
            document.querySelectorAll(selector).forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});
}
setActiveOnClick('.filter-tab');
setActiveOnClick('.menu-item');

// Search functionality
function attachSearchInputHandler() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    document.querySelectorAll('.problem-item').forEach(item => {
        const title = item.querySelector('.problem-title').textContent.toLowerCase();
        item.style.display = title.includes(searchTerm) ? 'flex' : 'none';
    });
});
    }
}

// Problem detail view functions
function openProblemDetail(concept, problems) {
    // Sort problems by popularity (highest first)
    problems.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    const detailView = document.getElementById('problemDetailView');
    const conceptTitle = document.getElementById('detailConceptTitle');
    const problemCount = document.getElementById('detailProblemCount');
    const problemList = document.getElementById('detailProblemList');
    conceptTitle.textContent = concept;
    problemCount.textContent = `Problems (0 / ${problems.length})`;
    problemList.innerHTML = '';
    problems.forEach((problem, index) => {
        const problemItem = document.createElement('div');
        problemItem.className = 'problem-item-detail';
        problemItem.onclick = (event) => {
            // Find the problem by title instead of relying on index
            const title = event.currentTarget.querySelector('.problem-title-detail').textContent;
            const currentConcept = document.getElementById('detailConceptTitle').textContent;
            const currentProblems = window.problemData[currentConcept] || [];
            const problemData = currentProblems.find(p => p.title === title);
            
            if (problemData) {
                // Find the current index for visual selection
                const items = document.querySelectorAll('.problem-item-detail');
                const currentIndex = Array.from(items).indexOf(event.currentTarget);
                
                selectProblem(problemData, currentIndex);
            document.querySelectorAll('.problem-item-detail').forEach(item => {
                item.classList.remove('selected');
            });
            event.currentTarget.classList.add('selected');
            }
        };
        const difficultyClass = getDifficultyClass(problem.difficulty);
        const difficultyText = problem.difficulty || 'Medium';
        problemItem.innerHTML = `
            <div class="problem-title-flex">
                <span class="text-white font-medium problem-title-detail">${problem.title}</span>
                <span class="difficulty-badge ${difficultyClass}">${difficultyText}</span>
            </div>
        `;
        problemList.appendChild(problemItem);
    });
    detailView.classList.add('active');
    // Set default sort button text
    const sortBtn = document.querySelector('.sort-btn');
    if (sortBtn) {
        sortBtn.innerHTML = 'Sort by: Popularity ▼';
    }
    // Don't auto-select - let user choose
    // Clear any existing problem details
    window.currentProblem = null;
    
    // Clear problem detail area
    const difficultyBadge = document.getElementById('problemDetailDifficultyBadge');
    if (difficultyBadge) {
        difficultyBadge.textContent = 'Click on a problem';
        difficultyBadge.className = 'difficulty-badge difficulty-medium';
    }
    
    const codeHeaderTitle = document.querySelector('.code-header h3');
    if (codeHeaderTitle) {
        codeHeaderTitle.textContent = 'Select a problem to view details';
    }
    
    // Clear and disable notes panel
    resetNotesPanel();
}

function closeProblemDetail() {
    const detailView = document.getElementById('problemDetailView');
    detailView.classList.remove('active');
    
    // Show the appropriate main view based on current menu state
    showMainProblemList();
}

// Hide detail view (used by menu items)
function hideDetailView() {
    const detailView = document.getElementById('problemDetailView');
    if (detailView) {
        detailView.classList.remove('active');
    }
}

function getDifficultyClass(difficulty) {
    switch (difficulty?.toLowerCase()) {
        case 'easy': return 'difficulty-easy';
        case 'medium': return 'difficulty-medium';
        case 'hard': return 'difficulty-hard';
        default: return 'difficulty-medium';
    }
}

// selectProblem now always sets window.currentProblem to backend object
async function selectProblem(problem, index) {
    try {
        // Fetch the latest data from the backend using the problem's id
        const response = await fetch(`http://localhost:3001/api/problems/${problem.id}`);
        if (!response.ok) {
            throw new Error('Backend is not responding properly.');
        }
        const latestProblem = await response.json();
        window.currentProblem = latestProblem;

        // Update the notes panel and any other UI elements with the latest data
        loadNoteForProblem(latestProblem);
        
        // Only update elements if they exist (for future compatibility)
        const difficultyBadge = document.getElementById('problemDetailDifficultyBadge');
        if (difficultyBadge) {
            difficultyBadge.className = `difficulty-badge ${getDifficultyClass(latestProblem.difficulty)}`;
            difficultyBadge.textContent = latestProblem.difficulty;
        }
        const categoryElem = document.getElementById('problemCategory');
        if (categoryElem) categoryElem.textContent = latestProblem.concept || 'Unknown';
        const acceptanceElem = document.getElementById('problemAcceptance');
        if (acceptanceElem) acceptanceElem.textContent = latestProblem.acceptance || 'N/A';
        
        // Update selected state
        document.querySelectorAll('.problem-item-detail').forEach(item => {
            item.classList.remove('selected');
        });
        if (index !== undefined) {
            const items = document.querySelectorAll('.problem-item-detail');
            if (items[index]) items[index].classList.add('selected');
        }

        // Update code-header problem title
        const codeHeaderTitle = document.querySelector('.code-header h3');
        if (codeHeaderTitle) {
            codeHeaderTitle.textContent = latestProblem.title || latestProblem.Title;
        }

        // Update the Mark as Solved button to reflect the current problem's solved state
        const solveBtn = document.getElementById('solveBtn');
        if (solveBtn) {
            if (latestProblem.solved) {
                solveBtn.classList.add('solved');
                solveBtn.classList.remove('unsolving', 'solving');
                solveBtn.querySelector('.btn-text').textContent = 'Solved!';
            } else {
                solveBtn.classList.remove('solved', 'unsolving', 'solving');
                solveBtn.querySelector('.btn-text').textContent = 'Mark as Solved';
            }
        }
    } catch (error) {
        console.error('Error selecting problem:', error);
        alert('Cannot connect to database. Please check if the server is running.');
    }
}

// Add concept view functions
window.showConceptView = function(conceptName) {
    // Hide main content
    document.querySelector('.main-content').style.display = 'none';
    
    // Update concept title
    document.getElementById('conceptTitle').textContent = conceptName;

    // Filter problems for this concept
    const conceptProblems = window.problemData[conceptName] || [];

    // Update concept stats
    const easyCount = conceptProblems.filter(p => p.difficulty === 'Easy').length;
    const mediumCount = conceptProblems.filter(p => p.difficulty === 'Medium').length;
    const hardCount = conceptProblems.filter(p => p.difficulty === 'Hard').length;

    document.getElementById('easyCount').textContent = easyCount;
    document.getElementById('mediumCount').textContent = mediumCount;
    document.getElementById('hardCount').textContent = hardCount;

    // Populate problem list
    const problemList = document.getElementById('conceptProblemList');
    problemList.innerHTML = '';

    conceptProblems.forEach(problem => {
        const problemItem = document.createElement('div');
        problemItem.className = 'concept-problem-item';
        problemItem.innerHTML = `
            <div class="problem-title">${problem.title}</div>
            <div class="problem-progress">
                <span class="difficulty-badge difficulty-${problem.difficulty?.toLowerCase() || 'medium'}">${problem.difficulty || 'Medium'}</span>
                <span>0%</span>
            </div>
        `;
        problemItem.addEventListener('click', () => {
            // Set current problem and open LeetCode link directly
            window.currentProblem = problem;
            if (problem.leetcode_link) {
                window.open(problem.leetcode_link, '_blank');
            } else {
                alert('LeetCode link not available for this problem.');
            }
        });
        problemList.appendChild(problemItem);
    });
};


// Add click event to problem items (concepts)
document.querySelectorAll('.problem-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const conceptName = this.querySelector('.problem-title').textContent;
        showConceptView(conceptName);
    });
});

// Update openInLeetCode to use leetcode_link
window.openInLeetCode = function() {
    const currentProblem = window.currentProblem;
    if (currentProblem && currentProblem.leetcode_link) {
        window.open(currentProblem.leetcode_link, '_blank');
    } else {
        alert('LeetCode link not available for this problem.');
    }
};

// When marking as solved, update the problems table
async function markAsSolved(button) {
    if (button.classList.contains('solving') || button.classList.contains('unsolving')) {
        return;
    }
    const currentProblem = window.currentProblem;
    if (!currentProblem) return;
    
    try {
        if (button.classList.contains('solved')) {
            button.classList.add('unsolving');
            button.classList.remove('solved');
            currentProblem.solved = false;
            const response = await fetch(`http://localhost:3001/api/problems/${currentProblem.id}/progress`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    solved: false,
                    notes: currentProblem.notes || '',
                    solution: currentProblem.solution || ''
                })
            });
            if (!response.ok) {
                throw new Error('Failed to update solved state in database.');
            } else {
                // Refresh backend data to update all views
                await loadBackendProblems();
            }
            setTimeout(() => {
                button.querySelector('.btn-text').textContent = 'Mark as Solved';
                button.classList.remove('unsolving');
            }, 300);
        } else {
            button.classList.add('solving');
            setTimeout(async () => {
                try {
                    button.querySelector('.btn-text').textContent = 'Solved!';
                    button.classList.remove('solving');
                    button.classList.add('solved');
                    currentProblem.solved = true;
                    const response = await fetch(`http://localhost:3001/api/problems/${currentProblem.id}/progress`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            solved: true,
                            notes: currentProblem.notes || '',
                            solution: currentProblem.solution || ''
                        })
                    });
                    if (!response.ok) {
                        throw new Error('Failed to update solved state in database.');
                    } else {
                        // Refresh backend data to update all views
                        await loadBackendProblems();
                    }
                } catch (error) {
                    console.error('Error marking as solved:', error);
                    // Revert button state on error
                    button.classList.remove('solved', 'solving');
                    button.querySelector('.btn-text').textContent = 'Mark as Solved';
                    alert('Cannot connect to database. Please check if the server is running.');
                }
            }, 300);
        }
    } catch (error) {
        console.error('Error updating solved state:', error);
        // Revert button state on error
        if (button.classList.contains('unsolving')) {
            button.classList.remove('unsolving');
            button.classList.add('solved');
            button.querySelector('.btn-text').textContent = 'Solved!';
        }
        alert('Cannot connect to database. Please check if the server is running.');
    }
}

function mergeProblemData(conceptsData, problemsData) {
    const merged = [];
    
    conceptsData.forEach(conceptProblem => {
        const detailedProblem = problemsData.find(p => 
            p.Title === conceptProblem.Title
        );
        
        if (detailedProblem) {
            merged.push({
                ...conceptProblem,
                Difficulty: detailedProblem.Difficulty,
                Acceptance: detailedProblem.Acceptance,
                LeetCodeLink: detailedProblem.LeetCodeLink || detailedProblem['LeetCode Link'] || null
            });
        } else {
            merged.push({
                ...conceptProblem,
                Difficulty: 'Medium',
                Acceptance: 'N/A',
                LeetCodeLink: null
            });
        }
    });
    
    return merged;
}

function showProblemDetail(problem) {
    window.currentProblem = problem;
    
    // Update problem info
    const difficultyBadge = document.getElementById('problemDetailDifficultyBadge');
    if (difficultyBadge) {
        difficultyBadge.className = `difficulty-badge ${getDifficultyClass(problem.Difficulty)}`;
        difficultyBadge.textContent = problem.Difficulty || 'Medium';
    }
    document.getElementById('problemCategory').textContent = problem.Concept || 'Unknown';
    document.getElementById('problemAcceptance').textContent = problem.Acceptance || 'N/A';
    
    // Show problem detail view
    document.getElementById('problemDetailView').classList.add('active');
} 

// --- Notion-style Notes Panel Logic ---

function getProblemSlug(problem) {
    // Extract the slug from the LeetCode link (e.g., 'https://leetcode.com/problems/two-sum/' => 'two-sum')
    const link = problem.leetcode_link || problem.LeetCodeLink || '';
    const match = link.match(/leetcode.com\/problems\/([\w-]+)\//);
    return match ? match[1] : (problem.title || problem.Title || 'unknown');
}

function getNoteKey(problem) {
    // Use the slug as the unique key
    return 'note_' + getProblemSlug(problem);
}

// Setup placeholder functionality for contentEditable div
function setupNotesPlaceholder(editor) {
    const placeholder = 'Write your notes here...';
    
    // Remove existing event listeners by cloning the element
    const newEditor = editor.cloneNode(true);
    editor.parentNode.replaceChild(newEditor, editor);
    
    // Set placeholder if content is empty
    if (!newEditor.textContent.trim()) {
        newEditor.textContent = placeholder;
        newEditor.classList.add('placeholder');
    }
    
    // Handle focus events
    newEditor.addEventListener('focus', function() {
        if (newEditor.textContent === placeholder) {
            newEditor.textContent = '';
            newEditor.classList.remove('placeholder');
        }
    });
    
    // Handle blur events - only show placeholder if truly empty
    newEditor.addEventListener('blur', function() {
        const content = newEditor.textContent.trim();
        if (content === '' || content === placeholder) {
            newEditor.textContent = placeholder;
            newEditor.classList.add('placeholder');
    } else {
            // If there's actual content, remove placeholder styling
            newEditor.classList.remove('placeholder');
        }
    });
    
    // Update the global reference
    window.notesEditor = newEditor;
    
    // Set up auto-save functionality
    setupAutoSave(newEditor);
}

// Reset notes panel to disabled state
function resetNotesPanel() {
    const editor = document.getElementById('notesEditor');
    if (editor) {
        editor.innerHTML = 'Select a problem to add notes...';
        editor.contentEditable = false;
        editor.style.opacity = '0.5';
        editor.style.pointerEvents = 'none';
        editor.classList.add('placeholder');
    }
    
    const solutionEditor = document.getElementById('solutionEditor');
    if (solutionEditor) {
        solutionEditor.innerHTML = 'Select a problem to add solution...';
        solutionEditor.contentEditable = false;
        solutionEditor.style.opacity = '0.5';
        solutionEditor.style.pointerEvents = 'none';
        solutionEditor.classList.add('placeholder');
    }
}

// Load notes from the problems table
function loadNoteForProblem(problem) {
    const editor = document.getElementById('notesEditor');
    if (editor) {
        // Clear any existing content and event listeners
            editor.innerHTML = '';
        
        // Set the notes content
        if (problem.notes && problem.notes.trim()) {
            editor.innerHTML = problem.notes;
            editor.classList.remove('placeholder');
        } else {
            editor.textContent = 'Write your notes here...';
            editor.classList.add('placeholder');
        }
        
        // Re-enable the notes editor when a problem is selected
        editor.contentEditable = true;
        editor.style.opacity = '1';
        editor.style.pointerEvents = 'auto';
        
        // Add placeholder functionality for contentEditable
        setupNotesPlaceholder(editor);
    }
}

// Save notes to the problems table
function saveNoteForProblem(problem) {
    const editor = window.notesEditor || document.getElementById('notesEditor');
    const noteContent = editor ? editor.innerHTML : '';
    if (problem && problem.id) {
        fetch(`http://localhost:3001/api/problems/${problem.id}/progress`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                solved: problem.solved || false,
                notes: noteContent,
                solution: problem.solution || ''
            })
        }).then(res => {
            if (!res.ok) {
                alert('Failed to save note to database.');
            }
        });
        }
        const status = document.getElementById('notesStatus');
        if (status) {
            status.textContent = 'Saved!';
            setTimeout(() => { status.textContent = ''; }, 1200);
    }
}

// Auto-save on input - will be updated when editor is recreated
function setupAutoSave(editor) {
    editor.addEventListener('input', function() {
        if (window.currentProblem) {
            saveNoteForProblem(window.currentProblem);
        }
    });
}

// Tab switching functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// Setup solution editor with placeholder functionality
function setupSolutionEditor(editor) {
    const placeholder = 'Write your solution here...';
    
    // Remove existing event listeners by cloning the element
    const newEditor = editor.cloneNode(true);
    editor.parentNode.replaceChild(newEditor, editor);
    
    // Set placeholder if content is empty
    if (!newEditor.textContent.trim()) {
        newEditor.textContent = placeholder;
        newEditor.classList.add('placeholder');
    }
    
    // Handle focus events
    newEditor.addEventListener('focus', function() {
        if (newEditor.textContent === placeholder) {
            newEditor.textContent = '';
            newEditor.classList.remove('placeholder');
        }
    });
    
    // Handle blur events - only show placeholder if truly empty
    newEditor.addEventListener('blur', function() {
        const content = newEditor.textContent.trim();
        if (content === '' || content === placeholder) {
            newEditor.textContent = placeholder;
            newEditor.classList.add('placeholder');
        } else {
            // If there's actual content, remove placeholder styling
            newEditor.classList.remove('placeholder');
        }
    });
    
    // Update the global reference
    window.solutionEditor = newEditor;
    
    // Set up auto-save functionality for solution
    setupSolutionAutoSave(newEditor);
}

// Auto-save solution
function setupSolutionAutoSave(editor) {
    editor.addEventListener('input', function() {
        if (window.currentProblem) {
            saveSolutionForProblem(window.currentProblem);
        }
    });
}

// Load solution from the problems table
function loadSolutionForProblem(problem) {
    const editor = document.getElementById('solutionEditor');
    if (editor) {
        // Clear any existing content and event listeners
        editor.innerHTML = '';
        
        // Set the solution content
        if (problem.solution && problem.solution.trim()) {
            editor.innerHTML = problem.solution;
            editor.classList.remove('placeholder');
        } else {
            editor.textContent = 'Write your solution here...';
            editor.classList.add('placeholder');
        }
        
        // Re-enable the solution editor when a problem is selected
        editor.contentEditable = true;
        editor.style.opacity = '1';
        editor.style.pointerEvents = 'auto';
        
        // Add placeholder functionality for contentEditable
        setupSolutionEditor(editor);
    }
}

// Save solution to the problems table
function saveSolutionForProblem(problem) {
    const editor = window.solutionEditor || document.getElementById('solutionEditor');
    const solutionContent = editor ? editor.innerHTML : '';
    if (problem && problem.id) {
        fetch(`http://localhost:3001/api/problems/${problem.id}/progress`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                solved: problem.solved,
                notes: problem.notes || '',
                solution: solutionContent
            })
        }).then(res => {
            if (!res.ok) {
                alert('Failed to save solution to database.');
            }
        });
        
        const status = document.getElementById('solutionStatus');
        if (status) {
            status.textContent = 'Saved!';
            setTimeout(() => { status.textContent = ''; }, 1200);
        }
    }
}

// Integrate with problem selection
// In selectProblem and showProblemDetail, call loadNoteForProblem(problem)
const originalSelectProblem = window.selectProblem;
window.selectProblem = function(problem, index) {
    if (originalSelectProblem) originalSelectProblem(problem, index);
    loadNoteForProblem(problem);
    loadSolutionForProblem(problem);
    initializeTabs();
};

const originalShowProblemDetail = window.showProblemDetail;
window.showProblemDetail = function(problem) {
    if (originalShowProblemDetail) originalShowProblemDetail(problem);
    loadNoteForProblem(problem);
    loadSolutionForProblem(problem);
    initializeTabs();
}; 

// Sort functionality
function toggleSortMenu() {
    const dropdown = document.getElementById('sortDropdown');
    dropdown.classList.toggle('active');
}

function sortProblems(sortType) {
    const problemList = document.getElementById('detailProblemList');
    const problems = Array.from(problemList.children);
    
    // Close dropdown
    document.getElementById('sortDropdown').classList.remove('active');
    
    // Update sort button text
    const sortBtn = document.querySelector('.sort-btn');
    const sortLabels = {
        'difficulty': 'Difficulty',
        'popularity': 'Popularity',
        'acceptance': 'Acceptance Rate',
        'solved': 'Solved',
        'unsolved': 'Unsolved'
    };
    sortBtn.innerHTML = `Sort by: ${sortLabels[sortType]} ▼`;
    
    // Get the current problems data from window.problemData
    const currentConcept = document.getElementById('detailConceptTitle').textContent;
    const currentProblems = window.problemData[currentConcept] || [];
    
    // Store the currently selected problem's title before sorting
    const currentProblemTitle = window.currentProblem?.title;
    
    // Sort problems based on type
    problems.sort((a, b) => {
        // Find the corresponding problem data
        const aTitle = a.querySelector('.problem-title-detail').textContent;
        const bTitle = b.querySelector('.problem-title-detail').textContent;
        const aProblem = currentProblems.find(p => p.title === aTitle);
        const bProblem = currentProblems.find(p => p.title === bTitle);
        
        switch(sortType) {
            case 'difficulty':
                const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                const aDiff = aProblem?.difficulty || 'Medium';
                const bDiff = bProblem?.difficulty || 'Medium';
                return difficultyOrder[aDiff] - difficultyOrder[bDiff];
            case 'popularity':
                const aPop = aProblem?.popularity === 'N/A' ? 0 : parseFloat(aProblem?.popularity || 0);
                const bPop = bProblem?.popularity === 'N/A' ? 0 : parseFloat(bProblem?.popularity || 0);
                return bPop - aPop; // Higher popularity first
            case 'acceptance':
                const aAcc = parseFloat(aProblem?.acceptance_rate || 0);
                const bAcc = parseFloat(bProblem?.acceptance_rate || 0);
                return bAcc - aAcc; // Higher acceptance first
            case 'solved':
                // Solved problems first
                return (bProblem?.solved === true) - (aProblem?.solved === true);
            case 'unsolved':
                // Unsolved problems first
                return (aProblem?.solved === true) - (bProblem?.solved === true);
            default:
                return 0;
        }
    });
    
    // Re-append sorted problems
    problems.forEach(problem => problemList.appendChild(problem));
    
    // After sorting, find and select the previously selected problem (if any)
    if (currentProblemTitle && window.currentProblem) {
        const newIndex = problems.findIndex(problem => {
            const title = problem.querySelector('.problem-title-detail').textContent;
            return title === currentProblemTitle;
        });
        
        if (newIndex !== -1) {
            // Update the selected state visually only
            document.querySelectorAll('.problem-item-detail').forEach(item => {
                item.classList.remove('selected');
            });
            problems[newIndex].classList.add('selected');
            
            // Don't call selectProblem here - it will be called when user clicks
            // Just ensure window.currentProblem still points to the correct problem
            const problemData = currentProblems.find(p => p.title === currentProblemTitle);
            if (problemData) {
                window.currentProblem = problemData;
            }
        }
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const sortContainer = document.querySelector('.sort-container');
    const dropdown = document.getElementById('sortDropdown');
    
    if (!sortContainer.contains(event.target)) {
        dropdown.classList.remove('active');
    }
}); 

// Practice Problems Menu Item Logic
const practiceMenuItem = document.querySelector('.menu-item:not(#menu-solved)');
if (practiceMenuItem) {
    practiceMenuItem.addEventListener('click', function() {
        // Remove active class from all menu items and set for this
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        // Hide any existing detail views
        hideDetailView();
        
        // Return to main problem list view
        showMainProblemList();
    });
}

// Solved Problems Menu Item Logic
const solvedMenuItem = document.getElementById('menu-solved');
if (solvedMenuItem) {
    solvedMenuItem.addEventListener('click', async function() {
        // Remove active class from all menu items and set for this
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        // Hide any existing detail views
        hideDetailView();
        
        // Fetch solved problems from backend
        try {
            const response = await fetch('http://localhost:3001/api/solved');
            const problems = await response.json();
            renderSolvedProblems(problems);
        } catch (err) {
            console.error('Error fetching solved problems:', err);
            renderSolvedProblems([]);
        }
    });
}

// Due Today Menu Item Logic
const dueTodayMenuItem = document.getElementById('menu-due-today');
if (dueTodayMenuItem) {
    dueTodayMenuItem.addEventListener('click', async function() {
        // Remove active class from all menu items and set for this
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        // Hide any existing detail views
        hideDetailView();
        
        // Fetch due today problems from backend
        try {
            const response = await fetch('http://localhost:3001/api/due-today');
            const problems = await response.json();
            renderDueTodayProblems(problems);
        } catch (err) {
            console.error('Error fetching due today problems:', err);
            renderDueTodayProblems([]);
        }
    });
}

function renderSolvedProblems(problems) {
    const mainContent = document.querySelector('.main-content');
    
    // Clear main content and create solved problems view
    mainContent.innerHTML = `
        <div class="solved-problems-header">
            <h2>Solved Problems</h2>
            <div class="solved-stats">
                <span class="solved-count">${problems.length} solved</span>
            </div>
        </div>
    `;
    
    if (!problems || problems.length === 0) {
        mainContent.innerHTML += `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No solved problems yet</h3>
                <p>Start solving problems to see them here!</p>
            </div>
        `;
        return;
    }
    
    // Create problem list with similar styling to problem-item-detail
    const problemList = document.createElement('div');
    problemList.className = 'problem-list solved-problems-list';
    
    problems.forEach(problem => {
        const problemItem = document.createElement('div');
        problemItem.className = `problem-item-detail solved-problem-item ${getDifficultyClass(problem.difficulty)}`;
        
        problemItem.innerHTML = `
            <div class="problem-title-flex">
                <div class="problem-title-group">
                    <span class="text-white font-medium problem-title-detail">${problem.title}</span>
                </div>
                <div class="solved-problem-actions">
                    <span class="difficulty-badge ${getDifficultyClass(problem.difficulty)}">${problem.difficulty}</span>
                    <span class="concept-badge">${problem.concept}</span>
                </div>
            </div>
        `;
        
        // Add click handler to open solved detail view
        problemItem.addEventListener('click', (e) => {
            // Don't trigger if clicking on links
            if (e.target.tagName === 'A' || 
                e.target.classList.contains('leetcode-link') || 
                e.target.classList.contains('concept-badge')) {
                return;
            }
            
            // Open the problem in solved detail view
            openSolvedDetail(problem);
        });
        
        problemList.appendChild(problemItem);
    });
    
    mainContent.appendChild(problemList);
}

// Function to render due today problems
    function renderDueTodayProblems(problems) {
        const mainContent = document.querySelector('.main-content');
        
        // Clear main content and create flashcard-style due today view
        mainContent.innerHTML = `
            <div class="flashcard-header">
                <h1>Due Today</h1>
            </div>
        `;
        
        if (!problems || problems.length === 0) {
            mainContent.innerHTML += `
                <div class="flashcard-study-complete">
                    <h2>🎉 Well done!</h2>
                    <p>You've completed all reviews for today. Great job!</p>
                </div>
            `;
            return;
        }
        
        // Create flashcard interface
        const flashcardContainer = document.createElement('div');
        flashcardContainer.className = 'flashcard-container';
        
        const studyInfo = document.createElement('div');
        studyInfo.className = 'flashcard-study-info';
        studyInfo.innerHTML = `
            <div class="flashcard-card-counter">
                <span>Card</span>
                <span id="currentCard">1</span>
                <span>of</span>
                <span id="totalCards">${problems.length}</span>
            </div>
            <div class="flashcard-progress-container">
                <div class="flashcard-progress-bar">
                    <div class="flashcard-progress-fill" id="progressFill"></div>
                </div>
                <span id="progressText">${Math.round((1 / problems.length) * 100)}%</span>
            </div>
        `;
        
        const flashcard = document.createElement('div');
        flashcard.className = 'flashcard';
        flashcard.id = 'flashcard';
        
        const flashcardFront = document.createElement('div');
        flashcardFront.className = 'flashcard-front';
        flashcardFront.innerHTML = `
            <div class="flashcard-label"><a href="${problems[0].leetcode_link}" target="_blank" class="flashcard-leetcode-link">
                View on LeetCode </a></div>
            <div class="flashcard-content" id="frontContent">
                ${problems[0].title}
            </div>
            <div class="flashcard-flip-hint">
                <span>Click to reveal details</span>
            </div>
        `;
        
        const flashcardBack = document.createElement('div');
        flashcardBack.className = 'flashcard-back';
        flashcardBack.innerHTML = `
            <div class="flashcard-label"><a href="${problems[0].leetcode_link}" target="_blank" class="flashcard-leetcode-link">
                View on LeetCode </a></div>
            <div class="flashcard-content" id="backContent">
                <div class="problem-details">
                    <div class="detail-row">
                        <strong>Difficulty:</strong> 
                        <span class="difficulty-badge ${getDifficultyClass(problems[0].difficulty)}">${problems[0].difficulty}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Concept:</strong> ${problems[0].concept}
                    </div>
                    <div class="detail-row">
                        <strong>Review Stage:</strong> ${(problems[0].current_interval || 0) + 1}
                    </div>
                    <div class="detail-row">
                        <strong>Review Count:</strong> ${(problems[0].review_count || 0) + 1}
                    </div>
                    <div class="detail-row">
                        <a href="${problems[0].leetcode_link}" target="_blank" class="leetcode-link-inline">
                            View on LeetCode →
                        </a>
                    </div>
                </div>
            </div>
            <div class="flashcard-flip-hint">
                <span>Click to flip back</span>
            </div>
        `;
        
        flashcard.appendChild(flashcardFront);
        flashcard.appendChild(flashcardBack);

        
        const reviewButtons = document.createElement('div');
        reviewButtons.className = 'flashcard-review-buttons';
        reviewButtons.innerHTML = `
            <button class="flashcard-btn flashcard-btn-success" id="rememberedBtn" onclick="markAsRemembered(${problems[0].id})">
                Remembered
            </button>
            <button class="flashcard-btn flashcard-btn-danger" id="forgotBtn" onclick="markAsForgot(${problems[0].id})">
                Forgot
            </button>
        `;
        
        // Add navigation controls
        const navigationControls = document.createElement('div');
        navigationControls.className = 'flashcard-navigation-controls';
        navigationControls.innerHTML = `
            <button class="flashcard-nav-btn" id="prevBtn" title="Previous Problem">
                <span>←</span>
            </button>
            <button class="flashcard-nav-btn" id="nextBtn" title="Next Problem">
                <span>→</span>
            </button>
            <button class="flashcard-nav-btn" id="shuffleBtn" title="Shuffle Problems">
                <span>🔀</span>
            </button>
        `;
        
        flashcardContainer.appendChild(studyInfo);
        flashcardContainer.appendChild(flashcard);
        flashcardContainer.appendChild(navigationControls);
        flashcardContainer.appendChild(reviewButtons);
        
        mainContent.appendChild(flashcardContainer);
        
        // Initialize flashcard functionality
        initializeFlashcard(problems);
    }

// Flashcard state variables
let flashcardProblems = [];
let currentCardIndex = 0;
let isFlipped = false;

// Initialize flashcard functionality
function initializeFlashcard(problems) {
    flashcardProblems = [...problems];
    currentCardIndex = 0;
    isFlipped = false;
    
    // Add event listeners
    const flashcard = document.getElementById('flashcard');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    
    if (flashcard) {
        flashcard.addEventListener('click', flipCard);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', prevCard);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', nextCard);
    }
    
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', shuffleCards);
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', handleFlashcardKeyboard);
    
    updateCard();
}

// Update current card display
function updateCard() {
    if (flashcardProblems.length === 0) return;
    
    const card = flashcardProblems[currentCardIndex];
    const frontContent = document.getElementById('frontContent');
    const backContent = document.getElementById('backContent');
    const currentCardEl = document.getElementById('currentCard');
    const totalCardsEl = document.getElementById('totalCards');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const rememberedBtn = document.getElementById('rememberedBtn');
    const forgotBtn = document.getElementById('forgotBtn');
    
    if (frontContent) frontContent.textContent = card.title;
    if (currentCardEl) currentCardEl.textContent = currentCardIndex + 1;
    if (totalCardsEl) totalCardsEl.textContent = flashcardProblems.length;
    
    // Update back content with solution
    if (backContent) {
        if (card.solution && card.solution.trim()) {
            backContent.innerHTML = `
                <div class="flashcard-solution">
                    <div class="flashcard-solution-header">
                        <h3>💻 Solution</h3>
                    </div>
                    <div class="flashcard-solution-content" style="user-select: text;">
                        ${card.solution}
                    </div>
                </div>
            `;
        } else {
            backContent.innerHTML = `
                <div class="flashcard-no-solution">
                    <div class="flashcard-solution-header">
                        <h3>💻 Solution</h3>
                    </div>
                    <div class="flashcard-no-solution-content">
                        <p>No solution recorded yet.</p>
                        <p>Add your solution in the problem detail view to see it here during review.</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Update progress
    const progress = ((currentCardIndex) / flashcardProblems.length) * 100;
    if (progressFill) progressFill.style.width = progress + '%';
    if (progressText) progressText.textContent = Math.round(progress) + '%';
    
    // Update navigation button states
    if (prevBtn) {
        prevBtn.disabled = currentCardIndex === 0;
        prevBtn.style.opacity = currentCardIndex === 0 ? '0.5' : '1';
    }
    if (nextBtn) {
        nextBtn.disabled = currentCardIndex === flashcardProblems.length - 1;
        nextBtn.style.opacity = currentCardIndex === flashcardProblems.length - 1 ? '0.5' : '1';
    }
    
    // Update review buttons
    if (rememberedBtn) {
        rememberedBtn.onclick = () => markAsRemembered(card.id);
    }
    if (forgotBtn) {
        forgotBtn.onclick = () => markAsForgot(card.id);
    }
    
    // Reset flip state
    if (isFlipped) {
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            flashcard.classList.remove('flipped');
            isFlipped = false;
        }
    }
}

// Flip card function
function flipCard() {
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.classList.toggle('flipped');
        isFlipped = !isFlipped;
    }
}

// Navigate to next card
function nextCard() {
    if (currentCardIndex < flashcardProblems.length - 1) {
        currentCardIndex++;
        updateCard();
    } else {
        showStudyComplete();
    }
}

// Navigate to previous card
function prevCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        updateCard();
    }
}

// Shuffle cards
function shuffleCards() {
    for (let i = flashcardProblems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flashcardProblems[i], flashcardProblems[j]] = [flashcardProblems[j], flashcardProblems[i]];
    }
    currentCardIndex = 0;
    updateCard();
}

// Show study complete screen
function showStudyComplete() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="flashcard-study-complete">
            <h2>🎉 Well done!</h2>
            <p>You've completed all reviews for today. Great job!</p>
            <button class="flashcard-btn flashcard-btn-primary" onclick="restartStudy()">Study Again</button>
        </div>
    `;
}

// Restart study session
function restartStudy() {
    const dueTodayMenuItem = document.getElementById('menu-due-today');
    if (dueTodayMenuItem) {
        dueTodayMenuItem.click();
    }
}

// Handle keyboard navigation
function handleFlashcardKeyboard(e) {
    if (e.key === 'ArrowLeft') prevCard();
    if (e.key === 'ArrowRight') nextCard();
    if (e.key === ' ') {
        e.preventDefault();
        flipCard();
    }
}

// Function to mark problem as remembered
function markAsRemembered(problemId) {
    fetch(`http://localhost:3001/api/problems/${problemId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: 'remembered' })
    }).then(async res => {
        if (res.ok) {
            // Remove the problem from the current flashcard set
            flashcardProblems = flashcardProblems.filter(p => p.id !== problemId);
            
            if (flashcardProblems.length === 0) {
                showStudyComplete();
            } else {
                // Adjust current index if needed
                if (currentCardIndex >= flashcardProblems.length) {
                    currentCardIndex = flashcardProblems.length - 1;
                }
                updateCard();
            }
        } else {
            alert('Failed to update review status.');
        }
    }).catch(err => {
        console.error('Error updating review:', err);
        alert('Failed to update review status.');
    });
}

// Function to mark problem as forgot
function markAsForgot(problemId) {
    fetch(`http://localhost:3001/api/problems/${problemId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: 'forgot' })
    }).then(async res => {
        if (res.ok) {
            // Remove the problem from the current flashcard set
            flashcardProblems = flashcardProblems.filter(p => p.id !== problemId);
            
            if (flashcardProblems.length === 0) {
                showStudyComplete();
            } else {
                // Adjust current index if needed
                if (currentCardIndex >= flashcardProblems.length) {
                    currentCardIndex = flashcardProblems.length - 1;
                }
                updateCard();
            }
        } else {
            alert('Failed to update review status.');
        }
    }).catch(err => {
        console.error('Error updating review:', err);
        alert('Failed to update review status.');
    });
}

// Function to open solved problem in detail view
function openSolvedProblemDetail(problem) {
    // Set current problem
    window.currentProblem = problem;
    
    // Store that we came from solved menu
    window.cameFromSolvedMenu = true;
    
    // Open the concept view for this problem
    const concept = problem.concept;
    const conceptProblems = window.problemData[concept] || [];
    
    // Find the problem in the concept's problem list
    const problemInConcept = conceptProblems.find(p => p.id === problem.id);
    if (problemInConcept) {
        // Open the concept detail view
        openProblemDetail(concept, conceptProblems);
        
        // Find and select the specific problem
        setTimeout(() => {
            const problemItems = document.querySelectorAll('.problem-item-detail');
            const targetItem = Array.from(problemItems).find(item => {
                const title = item.querySelector('.problem-title-detail').textContent;
                return title === problem.title;
            });
            
            if (targetItem) {
                // Remove all selections
                document.querySelectorAll('.problem-item-detail').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Select this problem
                targetItem.classList.add('selected');
                
                // Trigger the click to load problem details
                targetItem.click();
            }
        }, 100);
    }
}

// Function to mark a solved problem as unsolved
function markAsUnsolved(problemId) {
    if (confirm('Mark this problem as unsolved?')) {
        fetch(`http://localhost:3001/api/problems/${problemId}/progress`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                solved: false,
                notes: ''
            })
        }).then(async res => {
            if (res.ok) {
                // Refresh backend data to update all views
                await loadBackendProblems();
                
                // Refresh the solved problems list if we're on the solved view
                const solvedMenuItem = document.getElementById('menu-solved');
                if (solvedMenuItem && solvedMenuItem.classList.contains('active')) {
                    // Instead of clicking the menu item, directly refresh the solved problems
                    try {
                        const response = await fetch('http://localhost:3001/api/solved');
                        const problems = await response.json();
                        renderSolvedProblems(problems);
                    } catch (err) {
                        console.error('Error fetching solved problems:', err);
                        renderSolvedProblems([]);
                    }
                }
            } else {
                alert('Failed to update problem status.');
            }
        }).catch(err => {
            console.error('Error updating problem:', err);
            alert('Failed to update problem status.');
        });
    }
} 

// Function to show main problem list (concepts list)
function showMainProblemList() {
    const mainContent = document.querySelector('.main-content');
    
    // Check which menu is currently active or if we came from solved menu
    const solvedMenuItem = document.getElementById('menu-solved');
    const dueTodayMenuItem = document.getElementById('menu-due-today');
    const isSolvedMenuActive = solvedMenuItem && solvedMenuItem.classList.contains('active');
    const isDueTodayMenuActive = dueTodayMenuItem && dueTodayMenuItem.classList.contains('active');
    const cameFromSolvedMenu = window.cameFromSolvedMenu;
    
    if (isSolvedMenuActive || cameFromSolvedMenu) {
        // If solved menu is active or we came from solved menu, show solved problems
        // Clear the flag
        window.cameFromSolvedMenu = false;
        
        // Make sure solved menu is active
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        solvedMenuItem.classList.add('active');
        
        fetch('http://localhost:3001/api/solved')
            .then(response => response.json())
            .then(problems => {
                renderSolvedProblems(problems);
            })
            .catch(err => {
                console.error('Error fetching solved problems:', err);
                renderSolvedProblems([]);
            });
    } else if (isDueTodayMenuActive) {
        // If due today menu is active, show due today problems
        fetch('http://localhost:3001/api/due-today')
            .then(response => response.json())
            .then(problems => {
                renderDueTodayProblems(problems);
            })
            .catch(err => {
                console.error('Error fetching due today problems:', err);
                renderDueTodayProblems([]);
            });
    } else {
        // If practice problems menu is active, show concepts list
        mainContent.innerHTML = `
            <div class="progress-info">
                <div class="progress-text">0 / 150</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
            </div>

            <div class="search-section">
                <input type="text" class="search-input" placeholder="Search">
                <button class="search-btn">🔍</button>
            </div>

            <div class="problem-list">
                <!-- Problem items will be populated by updateProblemList -->
            </div>
        `;
        
        // Use the existing updateProblemList function to populate with backend data
        if (window.problemData) {
            updateProblemList(window.problemData);
        }
        
        // Re-attach search functionality
        attachSearchInputHandler();
        
        // Update progress info with actual data
        if (typeof updateTotalProgress === 'function' && window.problemData) {
            const totalProblems = Object.values(window.problemData).flat().length;
            updateTotalProgress(totalProblems);
        }
    }
}

// Solved Detail View Functions
function openSolvedDetail(problem) {
    // Set current problem
    window.currentProblem = problem;
    
    // Store that we came from solved menu
    window.cameFromSolvedMenu = true;
    
    // Fetch all solved problems to populate the list
    fetch('http://localhost:3001/api/solved')
        .then(response => response.json())
        .then(problems => {
            openSolvedDetailView(problems, problem);
        })
        .catch(err => {
            console.error('Error fetching solved problems:', err);
            openSolvedDetailView([], problem);
        });
}

function openSolvedDetailView(problems, selectedProblem) {
    // Sort problems by popularity (highest first)
    problems.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    const detailView = document.getElementById('solvedDetailView');
    const solvedTitle = document.getElementById('solvedDetailTitle');
    const problemCount = document.getElementById('solvedDetailProblemCount');
    const problemList = document.getElementById('solvedDetailProblemList');
    
    solvedTitle.textContent = 'Solved Problems';
    problemCount.textContent = `Solved Problems (${problems.length})`;
    problemList.innerHTML = '';
    
    problems.forEach((problem, index) => {
        const problemItem = document.createElement('div');
        problemItem.className = 'problem-item-detail';
        problemItem.onclick = (event) => {
            // Find the problem by title instead of relying on index
            const title = event.currentTarget.querySelector('.problem-title-detail').textContent;
            const problemData = problems.find(p => p.title === title);
            
            if (problemData) {
                // Find the current index for visual selection
                const items = document.querySelectorAll('#solvedDetailProblemList .problem-item-detail');
                const currentIndex = Array.from(items).indexOf(event.currentTarget);
                
                selectSolvedProblem(problemData, currentIndex);
                document.querySelectorAll('#solvedDetailProblemList .problem-item-detail').forEach(item => {
                    item.classList.remove('selected');
                });
                event.currentTarget.classList.add('selected');
            }
        };
        
        const difficultyClass = getDifficultyClass(problem.difficulty);
        const difficultyText = problem.difficulty || 'Medium';
        problemItem.innerHTML = `
            <div class="problem-title-flex">
                <span class="text-white font-medium problem-title-detail">${problem.title}</span>
                <span class="difficulty-badge ${difficultyClass}">${difficultyText}</span>
            </div>
        `;
        problemList.appendChild(problemItem);
    });
    
    detailView.classList.add('active');
    
    // Set default sort button text
    const sortBtn = document.querySelector('#solvedDetailView .sort-btn');
    if (sortBtn) {
        sortBtn.innerHTML = 'Sort by: Popularity ▼';
    }
    
    // Clear any existing problem details
    window.currentProblem = null;
    
    // Clear problem detail area
    const difficultyBadge = document.getElementById('solvedDetailView').querySelector('.code-header h3');
    if (difficultyBadge) {
        difficultyBadge.textContent = 'Select a problem to view details';
    }
    
    // Clear and disable notes panel
    resetSolvedNotesPanel();
    
    // Initialize tabs for solved detail view
    initializeSolvedTabs();
    
    // Select the initially selected problem if provided
    if (selectedProblem) {
        setTimeout(() => {
            const problemItems = document.querySelectorAll('#solvedDetailProblemList .problem-item-detail');
            const targetItem = Array.from(problemItems).find(item => {
                const title = item.querySelector('.problem-title-detail').textContent;
                return title === selectedProblem.title;
            });
            
            if (targetItem) {
                // Remove all selections
                document.querySelectorAll('#solvedDetailProblemList .problem-item-detail').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Select this problem
                targetItem.classList.add('selected');
                
                // Trigger the click to load problem details
                targetItem.click();
            }
        }, 100);
    }
}

async function selectSolvedProblem(problem, index) {
    try {
        // Fetch the latest data from the backend using the problem's id
        const response = await fetch(`http://localhost:3001/api/problems/${problem.id}`);
        if (!response.ok) {
            throw new Error('Backend is not responding properly.');
        }
        const latestProblem = await response.json();
        window.currentProblem = latestProblem;

        // Update the notes panel and any other UI elements with the latest data
        loadSolvedNoteForProblem(latestProblem);
        
        // Only update elements if they exist (for future compatibility)
        const difficultyBadge = document.getElementById('solvedDetailView').querySelector('.code-header h3');
        if (difficultyBadge) {
            difficultyBadge.textContent = latestProblem.title || latestProblem.Title;
        }
        
        // Update selected state
        document.querySelectorAll('#solvedDetailProblemList .problem-item-detail').forEach(item => {
            item.classList.remove('selected');
        });
        if (index !== undefined) {
            const items = document.querySelectorAll('#solvedDetailProblemList .problem-item-detail');
            if (items[index]) items[index].classList.add('selected');
        }

        // Update the Mark as Unsolved button to reflect the current problem's solved state
        const unsolveBtn = document.getElementById('unsolveBtn');
        if (unsolveBtn) {
            if (latestProblem.solved) {
                unsolveBtn.classList.add('solved');
                unsolveBtn.classList.remove('unsolving', 'solving');
                unsolveBtn.querySelector('.btn-text').textContent = 'Solved';
            } else {
                unsolveBtn.classList.remove('solved', 'unsolving', 'solving');
                unsolveBtn.querySelector('.btn-text').textContent = 'Mark as Solved';
            }
        }
    } catch (error) {
        console.error('Error selecting solved problem:', error);
        alert('Cannot connect to database. Please check if the server is running.');
    }
}

function closeSolvedDetail() {
    const detailView = document.getElementById('solvedDetailView');
    detailView.classList.remove('active');
    
    // Show the appropriate main view based on current menu state
    showMainProblemList();
}

function resetSolvedNotesPanel() {
    const notesEditor = document.getElementById('solvedNotesEditor');
    const solutionEditor = document.getElementById('solvedSolutionEditor');
    const notesStatus = document.getElementById('solvedNotesStatus');
    const solutionStatus = document.getElementById('solvedSolutionStatus');
    
    if (notesEditor) {
        notesEditor.innerHTML = '';
        notesEditor.setAttribute('contenteditable', 'false');
    }
    if (solutionEditor) {
        solutionEditor.innerHTML = '';
        solutionEditor.setAttribute('contenteditable', 'false');
    }
    if (notesStatus) notesStatus.textContent = '';
    if (solutionStatus) solutionStatus.textContent = '';
}

function loadSolvedNoteForProblem(problem) {
    const notesEditor = document.getElementById('solvedNotesEditor');
    const solutionEditor = document.getElementById('solvedSolutionEditor');
    
    if (notesEditor) {
        notesEditor.innerHTML = problem.notes || '';
        notesEditor.setAttribute('contenteditable', 'true');
        setupSolvedAutoSave(notesEditor);
    }
    
    if (solutionEditor) {
        solutionEditor.innerHTML = problem.solution || '';
        solutionEditor.setAttribute('contenteditable', 'true');
        setupSolvedSolutionAutoSave(solutionEditor);
    }
}

function setupSolvedAutoSave(editor) {
    let timeout;
    editor.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            saveSolvedNoteForProblem(window.currentProblem);
        }, 1000);
    });
}

function setupSolvedSolutionAutoSave(editor) {
    let timeout;
    editor.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            saveSolvedSolutionForProblem(window.currentProblem);
        }, 1000);
    });
}

function saveSolvedNoteForProblem(problem) {
    if (!problem) return;
    
    const notesEditor = document.getElementById('solvedNotesEditor');
    if (!notesEditor) return;
    
    const notes = notesEditor.innerHTML;
    const notesStatus = document.getElementById('solvedNotesStatus');
    
    fetch(`http://localhost:3001/api/problems/${problem.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes })
    }).then(response => {
        if (response.ok) {
            if (notesStatus) notesStatus.textContent = 'Saved';
            setTimeout(() => {
                if (notesStatus) notesStatus.textContent = '';
            }, 2000);
        } else {
            if (notesStatus) notesStatus.textContent = 'Error saving';
        }
    }).catch(err => {
        console.error('Error saving notes:', err);
        if (notesStatus) notesStatus.textContent = 'Error saving';
    });
}

function saveSolvedSolutionForProblem(problem) {
    if (!problem) return;
    
    const solutionEditor = document.getElementById('solvedSolutionEditor');
    if (!solutionEditor) return;
    
    const solution = solutionEditor.innerHTML;
    const solutionStatus = document.getElementById('solvedSolutionStatus');
    
    fetch(`http://localhost:3001/api/problems/${problem.id}/solution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution: solution })
    }).then(response => {
        if (response.ok) {
            if (solutionStatus) solutionStatus.textContent = 'Saved';
            setTimeout(() => {
                if (solutionStatus) solutionStatus.textContent = '';
            }, 2000);
        } else {
            if (solutionStatus) solutionStatus.textContent = 'Error saving';
        }
    }).catch(err => {
        console.error('Error saving solution:', err);
        if (solutionStatus) solutionStatus.textContent = 'Error saving';
    });
}

function toggleSolvedSortMenu() {
    const dropdown = document.getElementById('solvedSortDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function sortSolvedProblems(sortType) {
    const problemList = document.getElementById('solvedDetailProblemList');
    const problems = Array.from(problemList.children);
    const sortBtn = document.querySelector('#solvedDetailView .sort-btn');
    
    // Sort problems based on sort type
    problems.sort((a, b) => {
        const aTitle = a.querySelector('.problem-title-detail').textContent;
        const bTitle = b.querySelector('.problem-title-detail').textContent;
        
        switch (sortType) {
            case 'difficulty':
                const aDifficulty = a.querySelector('.difficulty-badge').textContent;
                const bDifficulty = b.querySelector('.difficulty-badge').textContent;
                const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                return difficultyOrder[aDifficulty] - difficultyOrder[bDifficulty];
            case 'concept':
                // This would need concept data from the backend
                return aTitle.localeCompare(bTitle);
            case 'date':
                // This would need date data from the backend
                return aTitle.localeCompare(bTitle);
            case 'review':
                // This would need review count data from the backend
                return aTitle.localeCompare(bTitle);
            default:
                return aTitle.localeCompare(bTitle);
        }
    });
    
    // Clear and re-add sorted problems
    problemList.innerHTML = '';
    problems.forEach(problem => problemList.appendChild(problem));
    
    // Update sort button text
    if (sortBtn) {
        const sortTexts = {
            'difficulty': 'Sort by: Difficulty ▼',
            'concept': 'Sort by: Concept ▼',
            'date': 'Sort by: Date Solved ▼',
            'review': 'Sort by: Review Count ▼'
        };
        sortBtn.innerHTML = sortTexts[sortType] || 'Sort by ▼';
    }
    
    // Hide dropdown
    const dropdown = document.getElementById('solvedSortDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Tab switching functionality for solved detail view
function initializeSolvedTabs() {
    const tabButtons = document.querySelectorAll('#solvedDetailView .tab-btn');
    const tabContents = document.querySelectorAll('#solvedDetailView .tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(`solved${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}-tab`).classList.add('active');
        });
    });
} 



