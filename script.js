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

// Load CSV data and populate the interface
async function loadCSVData() {
    try {
        // Load the master CSV with popularity data
        const masterResponse = await fetch('leetcode_master_with_popularity.csv');
        const masterCsvText = await masterResponse.text();
        const masterLines = masterCsvText.split('\n');
        const header = masterLines[0].split(',');

        // Parse master CSV data
        const problems = [];
        for (let i = 1; i < masterLines.length; i++) {
            if (masterLines[i].trim()) {
                const values = parseCSVLine(masterLines[i]);
                if (values.length >= 6) {
                    const [title, concept, difficulty, acceptance, leetcodeLink, popularity] = values;
                    problems.push({
                        title: title.trim(),
                        concept: concept.trim(),
                        difficulty: difficulty.trim(),
                        acceptance: acceptance.trim(),
                        leetcodeLink: leetcodeLink.trim(),
                        popularity: popularity.trim(),
                        solved: false // Add solved attribute, default to false
                    });
                }
            }
        }

        // Group problems by concept
        const conceptGroups = {};
        problems.forEach(problem => {
            if (!conceptGroups[problem.concept]) {
                conceptGroups[problem.concept] = [];
            }
            conceptGroups[problem.concept].push(problem);
        });

        // Store the full data for later use
        window.problemData = conceptGroups;

        // Update the problem list with real data
        updateProblemList(conceptGroups);

        // Update total progress
        updateTotalProgress(problems.length);

        // Update stats section with real difficulty counts
        const easyCount = problems.filter(p => p.difficulty === 'Easy').length;
        const mediumCount = problems.filter(p => p.difficulty === 'Medium').length;
        const hardCount = problems.filter(p => p.difficulty === 'Hard').length;

        document.querySelector('.stat-label.easy').nextElementSibling.textContent = `${easyCount}`;
        document.querySelector('.stat-label.medium').nextElementSibling.textContent = `${mediumCount}`;
        document.querySelector('.stat-label.hard').nextElementSibling.textContent = `${hardCount}`;

    } catch (error) {
        console.error('Error loading CSV:', error);
        // Fallback to static data if CSV can't be loaded
    }
}

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

// Sample functionality for interactive elements
function updateProgress(element, completed) {
    const progressText = element.querySelector('.problem-progress span');
    const progressBar = element.querySelector('.problem-bar-fill');
    
    // Simple demo - you can expand this with actual progress tracking
    const total = parseInt(progressText.textContent.match(/\d+$/)[0]);
    const newCompleted = Math.min(completed + 1, total);
    const percentage = (newCompleted / total) * 100;
    
    progressText.textContent = `(${newCompleted} / ${total})`;
    progressBar.style.width = percentage + '%';
    
    if (newCompleted > 0) {
        progressBar.style.background = '#68d391';
    }
}

// Tab switching functionality
document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
    });
});

// Menu item switching
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

// Search functionality
document.querySelector('.search-input').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    document.querySelectorAll('.problem-item').forEach(item => {
        const title = item.querySelector('.problem-title').textContent.toLowerCase();
        item.style.display = title.includes(searchTerm) ? 'flex' : 'none';
    });
});

// Problem detail view functions
function openProblemDetail(concept, problems) {
    const detailView = document.getElementById('problemDetailView');
    const conceptTitle = document.getElementById('detailConceptTitle');
    const problemCount = document.getElementById('detailProblemCount');
    const problemList = document.getElementById('detailProblemList');
    
    // Update header
    conceptTitle.textContent = concept;
    problemCount.textContent = `Problems (0 / ${problems.length})`;
    
    // Populate problem list
    problemList.innerHTML = '';
    problems.forEach((problem, index) => {
        const problemItem = document.createElement('div');
        problemItem.className = 'problem-item-detail';
        problemItem.onclick = (event) => {
            selectProblem(problem, index);
            // Visually update selected state
            document.querySelectorAll('.problem-item-detail').forEach(item => {
                item.classList.remove('selected');
            });
            event.currentTarget.classList.add('selected');
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
    // Show detail view
    detailView.classList.add('active');

    // Set default sort to popularity
    const sortBtn = document.querySelector('.sort-btn');
    if (sortBtn) {
        sortBtn.innerHTML = 'Sort by: Popularity ▼';
    }
    sortProblems('popularity');

    // Automatically select the first problem if available
    if (problems.length > 0) {
        selectProblem(problems[0], 0);
        // Visually select the first problem in the left panel
        const firstItem = problemList.querySelector('.problem-item-detail');
        if (firstItem) firstItem.classList.add('selected');
    }
}

function closeProblemDetail() {
    const detailView = document.getElementById('problemDetailView');
    detailView.classList.remove('active');
}

function getDifficultyClass(difficulty) {
    switch (difficulty?.toLowerCase()) {
        case 'easy': return 'difficulty-easy';
        case 'medium': return 'difficulty-medium';
        case 'hard': return 'difficulty-hard';
        default: return 'difficulty-medium';
    }
}

function selectProblem(problem, index) {
    // Set the current problem for LeetCode link functionality
    window.currentProblem = problem;
    
    // Only update elements if they exist (for future compatibility)
    const difficultyBadge = document.getElementById('problemDetailDifficultyBadge');
    if (difficultyBadge) {
        difficultyBadge.className = `difficulty-badge ${getDifficultyClass(problem.difficulty)}`;
        difficultyBadge.textContent = problem.difficulty || 'Medium';
    }
    const categoryElem = document.getElementById('problemCategory');
    if (categoryElem) categoryElem.textContent = problem.concept || 'Unknown';
    const acceptanceElem = document.getElementById('problemAcceptance');
    if (acceptanceElem) acceptanceElem.textContent = problem.acceptance || 'N/A';
    
    // Update selected state
    document.querySelectorAll('.problem-item-detail').forEach(item => {
        item.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    // Update code-header problem title
    const codeHeaderTitle = document.querySelector('.code-header h3');
    if (codeHeaderTitle) {
        codeHeaderTitle.textContent = problem.title || problem.Title || 'Notes';
    }

    // Update the Mark as Solved button to reflect the current problem's solved state
    const solveBtn = document.getElementById('solveBtn');
    if (solveBtn) {
        if (problem.solved) {
            solveBtn.classList.add('solved');
            solveBtn.classList.remove('unsolving', 'solving');
            solveBtn.querySelector('.btn-text').textContent = 'Solved!';
            solveBtn.setAttribute('title', 'Problem Solved! Click to unmark');
        } else {
            solveBtn.classList.remove('solved', 'unsolving', 'solving');
            solveBtn.querySelector('.btn-text').textContent = 'Mark as Solved';
            solveBtn.setAttribute('title', 'Mark as Solved');
        }
    }

    // Load the note for the selected problem
    loadNoteForProblem(problem);
}

// Load CSV data when page loads
document.addEventListener('DOMContentLoaded', loadCSVData);

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
            if (problem.leetcodeLink) {
                window.open(problem.leetcodeLink, '_blank');
            } else {
                alert('LeetCode link not available for this problem.');
            }
        });
        problemList.appendChild(problemItem);
    });

    // Show concept view in main content area
    const conceptView = document.getElementById('conceptView');
    conceptView.style.display = 'block';
    conceptView.classList.add('active');
};

window.closeConceptView = function() {
    // Hide concept view
    const conceptView = document.getElementById('conceptView');
    conceptView.style.display = 'none';
    conceptView.classList.remove('active');
    
    // Show main content again
    document.querySelector('.main-content').style.display = 'block';
};

// Add click event to problem items (concepts)
document.querySelectorAll('.problem-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const conceptName = this.querySelector('.problem-title').textContent;
        showConceptView(conceptName);
    });
});

window.openInLeetCode = function() {
    const currentProblem = window.currentProblem;
    if (currentProblem && currentProblem.leetcodeLink) {
        // Use the actual LeetCode link from CSV
        window.open(currentProblem.leetcodeLink, '_blank');
    } else {
        alert('LeetCode link not available for this problem.');
    }
};

function markAsSolved(button) {
    // Prevent multiple clicks during animation
    if (button.classList.contains('solving') || button.classList.contains('unsolving')) {
        return;
    }
    
    // Get the current problem
    const currentProblem = window.currentProblem;
    if (!currentProblem) return;
    
    // Check current state and toggle
    if (button.classList.contains('solved')) {
        // Currently solved, switch back to unsolved
        button.classList.add('unsolving');
        button.classList.remove('solved');
        currentProblem.solved = false; // Set attribute to false
        setTimeout(() => {
            button.querySelector('.btn-text').textContent = 'Mark as Solved';
            button.classList.remove('unsolving');
            button.setAttribute('title', 'Mark as Solved');
        }, 300);
    } else {
        // Currently unsolved, switch to solved
        button.classList.add('solving');
        setTimeout(() => {
            button.querySelector('.btn-text').textContent = 'Solved!';
            button.classList.remove('solving');
            button.classList.add('solved');
            button.setAttribute('title', 'Problem Solved! Click to unmark');
            currentProblem.solved = true; // Set attribute to true
        }, 300);
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
    const link = problem.leetcodeLink || problem.LeetCodeLink || '';
    const match = link.match(/leetcode.com\/problems\/([\w-]+)\//);
    return match ? match[1] : (problem.title || problem.Title || 'unknown');
}

function getNoteKey(problem) {
    // Use the slug as the unique key
    return 'note_' + getProblemSlug(problem);
}

function loadNoteForProblem(problem) {
    const key = getNoteKey(problem);
    const note = localStorage.getItem(key) || '';
    const editor = document.getElementById('notesEditor');
    console.log('[Notes] Loading for key:', key, '| Value:', note);
    if (editor) {
        if (note) {
            editor.innerHTML = note;
        } else {
            editor.innerHTML = '';
            // The placeholder will show automatically if contenteditable is empty
        }
    } else {
        console.warn('[Notes] notesEditor not found in DOM');
    }
}

function saveNoteForProblem(problem) {
    const key = getNoteKey(problem);
    const editor = document.getElementById('notesEditor');
    if (editor) {
        // Remove localStorage entry if note is empty (restores placeholder)
        if (!editor.textContent.trim()) {
            localStorage.removeItem(key);
            editor.innerHTML = '';
        } else {
            localStorage.setItem(key, editor.innerHTML);
        }
        const status = document.getElementById('notesStatus');
        if (status) {
            status.textContent = 'Saved!';
            setTimeout(() => { status.textContent = ''; }, 1200);
        }
    }
}

// Auto-save on input
const notesEditor = document.getElementById('notesEditor');
if (notesEditor) {
    notesEditor.addEventListener('input', function() {
        if (window.currentProblem) {
            saveNoteForProblem(window.currentProblem);
        }
    });
}

// Integrate with problem selection
// In selectProblem and showProblemDetail, call loadNoteForProblem(problem)
const originalSelectProblem = window.selectProblem;
window.selectProblem = function(problem, index) {
    if (originalSelectProblem) originalSelectProblem(problem, index);
    loadNoteForProblem(problem);
};

const originalShowProblemDetail = window.showProblemDetail;
window.showProblemDetail = function(problem) {
    if (originalShowProblemDetail) originalShowProblemDetail(problem);
    loadNoteForProblem(problem);
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
                const aAcc = parseFloat(aProblem?.acceptance?.replace('%', '') || 0);
                const bAcc = parseFloat(bProblem?.acceptance?.replace('%', '') || 0);
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
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const sortContainer = document.querySelector('.sort-container');
    const dropdown = document.getElementById('sortDropdown');
    
    if (!sortContainer.contains(event.target)) {
        dropdown.classList.remove('active');
    }
}); 



