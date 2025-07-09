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
        // Load the master CSV
        const masterResponse = await fetch('leetcode_master.csv');
        const masterCsvText = await masterResponse.text();
        const masterLines = masterCsvText.split('\n');
        const header = masterLines[0].split(',');

        // Parse master CSV data
        const problems = [];
        for (let i = 1; i < masterLines.length; i++) {
            if (masterLines[i].trim()) {
                const values = parseCSVLine(masterLines[i]);
                if (values.length >= 5) {
                    const [title, concept, difficulty, acceptance, leetcodeLink] = values;
                    problems.push({
                        title: title.trim(),
                        concept: concept.trim(),
                        difficulty: difficulty.trim(),
                        acceptance: acceptance.trim(),
                        leetcodeLink: leetcodeLink.trim()
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
                <span>(0 / ${problemCount})</span>
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
        problemItem.onclick = () => {
            selectProblem(problem, index);
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
    // Automatically select the first problem if available
    if (problems.length > 0) {
        selectProblem(problems[0], 0);
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

window.copyProblemLink = function() {
    const currentProblem = window.currentProblem;
    if (currentProblem && currentProblem.leetcodeLink) {
        // Use the actual LeetCode link from CSV
        navigator.clipboard.writeText(currentProblem.leetcodeLink).then(() => {
            alert('Problem link copied to clipboard!');
        });
    } else {
        alert('LeetCode link not available for this problem.');
    }
};

window.markAsSolved = function() {
    const currentProblem = window.currentProblem;
    if (currentProblem) {
        // Update progress
        const progressBar = document.querySelector('.progress-fill');
        const currentProgress = parseInt(progressBar.style.width) || 0;
        const newProgress = Math.min(currentProgress + 1, 150);
        progressBar.style.width = newProgress + '%';
        
        // Update progress text
        document.querySelector('.progress-text').textContent = `${newProgress} / 150`;
        
        // Mark problem as solved in UI
        const problemElement = document.querySelector(`[data-problem="${currentProblem.Title}"]`);
        if (problemElement) {
            problemElement.classList.add('solved');
        }
        
        alert('Problem marked as solved!');
    }
};

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



