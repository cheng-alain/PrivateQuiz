let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let score = 0;
let totalQuestions = 0;
let wrongAnswers = [];
let maxQuestionsAvailable = 0;
let selectedCategory = null;
let selectedTheme = null;
let selectedDifficulty = null;
let themes = [];

// Historique des réponses pour chaque question validée
// Structure: { questionId, userAnswer, isCorrect, timestamp }
let answersHistory = [];

// Helper: Check if question is multiple choice
function isMultipleChoice(question) {
    return Array.isArray(question.correct) && question.correct.length > 1;
}

// Helper: Build API URL
function buildApiUrl(baseUrl, theme, count, difficulty = null, random = false) {
    let url = `${baseUrl}?theme=${theme}&count=${count}`;
    if (difficulty) url += `&difficulty=${difficulty}`;
    if (random) url += '&random=true';
    return url;
}

window.addEventListener('DOMContentLoaded', async function() {
    await loadThemes();
});

async function loadThemes() {
    try {
        const response = await fetch('/api/themes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        themes = data.themes;

        displayThemes();

    } catch (error) {
        console.error('Error loading themes:', error);
        document.getElementById('themesContainer').innerHTML = '<p>Error loading themes</p>';
    }
}

function displayThemes() {
    const container = document.getElementById('themesContainer');
    container.innerHTML = '';

    // Group themes by category
    const categories = {};
    themes.forEach(theme => {
        const cat = theme.category || 'Autres';
        if (!categories[cat]) {
            categories[cat] = [];
        }
        categories[cat].push(theme);
    });

    // Display categories
    Object.keys(categories).sort().forEach(categoryName => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'theme-card category-card';

        const icon = document.createElement('div');
        icon.className = 'theme-icon';
        icon.textContent = '📁';

        const content = document.createElement('div');
        content.className = 'theme-content';

        const title = document.createElement('h3');
        title.textContent = categoryName;

        const description = document.createElement('p');
        const themeCount = categories[categoryName].length;
        const totalQuestions = categories[categoryName].reduce((sum, t) => sum + t.questions_count, 0);
        description.textContent = `${themeCount} thème${themeCount > 1 ? 's' : ''} • ${totalQuestions} questions`;

        content.appendChild(title);
        content.appendChild(description);

        categoryCard.appendChild(icon);
        categoryCard.appendChild(content);
        categoryCard.onclick = () => selectCategory(categoryName);

        container.appendChild(categoryCard);
    });
}

function selectCategory(categoryName) {
    selectedCategory = categoryName;
    displayThemesOfCategory(categoryName);
}

function displayThemesOfCategory(categoryName) {
    const container = document.getElementById('themesContainer');
    container.innerHTML = '';

    // Show back button and update title
    document.getElementById('backToCategoriesBtn').style.display = 'inline-flex';
    document.getElementById('themeTitle').textContent = categoryName;

    // Filter themes by category
    const categoryThemes = themes.filter(t => (t.category || 'Autres') === categoryName);

    categoryThemes.forEach(theme => {
        const themeCard = document.createElement('div');
        themeCard.className = 'theme-card';

        const content = document.createElement('div');
        content.className = 'theme-content';

        const title = document.createElement('h3');
        title.textContent = theme.title;

        const description = document.createElement('p');
        description.textContent = theme.description;

        const meta = document.createElement('div');
        meta.className = 'theme-meta';
        meta.innerHTML = `
            <span class="difficulty ${theme.difficulty.toLowerCase()}">${theme.difficulty}</span>
            <span class="question-count">${theme.questions_count} questions</span>
        `;

        content.appendChild(title);
        content.appendChild(description);
        content.appendChild(meta);

        themeCard.appendChild(content);
        themeCard.onclick = () => selectTheme(theme);

        container.appendChild(themeCard);
    });
}

function goBackToCategories() {
    selectedCategory = null;
    document.getElementById('backToCategoriesBtn').style.display = 'none';
    document.getElementById('themeTitle').textContent = 'Sélectionner un thème';
    displayThemes();
}

async function selectTheme(theme) {
    selectedTheme = theme;

    document.getElementById('themeSelection').style.display = 'none';

    if (theme.has_difficulty) {
        document.getElementById('difficultySelection').style.display = 'block';
        updateDifficultyThemeInfo();
        await updateDifficultyCounts();
    } else {
        document.getElementById('controls').style.display = 'block';
        updateSelectedThemeInfo();
        await updateMaxQuestions();
    }
}

function updateDifficultyThemeInfo() {
    const infoElement = document.getElementById('difficultyThemeInfo');
    if (selectedTheme && infoElement) {
        const title = document.createElement('span');
        title.className = 'theme-title-small';
        title.textContent = selectedTheme.title;

        const container = document.createElement('div');
        container.className = 'selected-theme';
        container.appendChild(title);

        infoElement.innerHTML = '';
        infoElement.appendChild(container);
    }
}

async function updateDifficultyCounts() {
    if (!selectedTheme) return;

    const difficulties = ['easy', 'intermediate', 'advanced', 'all'];

    // Optimize: Fetch all in parallel
    await Promise.all(difficulties.map(async (difficulty) => {
        const countElement = document.getElementById(`${difficulty}Count`);
        if (!countElement) return;

        try {
            const url = buildApiUrl('/api/qcm', selectedTheme.id, 999, difficulty !== 'all' ? difficulty : null);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const count = data.total;

            countElement.textContent = `${count} question${count > 1 ? 's' : ''}`;
        } catch (error) {
            console.error(`Error loading ${difficulty} question count:`, error);
            countElement.textContent = '? questions';
        }
    }));
}

async function selectDifficulty(difficulty) {
    selectedDifficulty = difficulty;

    document.getElementById('difficultySelection').style.display = 'none';
    document.getElementById('controls').style.display = 'block';

    updateSelectedThemeInfo();
    await updateMaxQuestions();
}

function updateSelectedThemeInfo() {
    const infoElement = document.getElementById('selectedThemeInfo');
    if (selectedTheme && infoElement) {
        let difficultyBadge = '';
        if (selectedDifficulty) {
            const difficultyLabels = {
                'easy': 'Facile',
                'intermediate': 'Moyen',
                'advanced': 'Difficile',
                'all': '🏆 Examen Final'
            };
            difficultyBadge = `<span class="difficulty-badge">${difficultyLabels[selectedDifficulty]}</span>`;
        }

        const title = document.createElement('span');
        title.className = 'theme-title-small';
        title.textContent = selectedTheme.title;

        const container = document.createElement('div');
        container.className = 'selected-theme';
        container.appendChild(title);
        if (difficultyBadge) {
            container.innerHTML += difficultyBadge;
        }

        infoElement.innerHTML = '';
        infoElement.appendChild(container);
    }
}

function goBackToThemes() {
    document.getElementById('controls').style.display = 'none';
    document.getElementById('difficultySelection').style.display = 'none';
    document.getElementById('themeSelection').style.display = 'block';
    selectedTheme = null;
    selectedDifficulty = null;
}

async function updateMaxQuestions() {
    const maxQuestionsElement = document.getElementById('maxQuestions');
    if (!maxQuestionsElement || !selectedTheme) return;

    try {
        const url = buildApiUrl('/api/qcm', selectedTheme.id, 999, selectedDifficulty);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        maxQuestionsAvailable = data.total;

        maxQuestionsElement.textContent = `(max: ${maxQuestionsAvailable})`;

        const questionCountInput = document.getElementById('questionCount');
        if (questionCountInput) {
            questionCountInput.max = maxQuestionsAvailable;
            questionCountInput.value = Math.min(5, maxQuestionsAvailable);
        }

    } catch (error) {
        console.error('Error loading theme questions:', error);
        maxQuestionsElement.textContent = '(max: ?)';
    }
}

async function startQuiz() {
    if (!selectedTheme) {
        alert('Please select a theme first');
        return;
    }

    const questionCount = document.getElementById('questionCount').value;
    const randomOrder = document.getElementById('randomOrder').checked;

    document.getElementById('controls').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    try {
        const url = buildApiUrl('/api/qcm', selectedTheme.id, questionCount, selectedDifficulty, randomOrder);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        questions = data.questions;
        totalQuestions = data.total;

        document.getElementById('loading').style.display = 'none';
        document.getElementById('quizContainer').style.display = 'block';

        resetQuizState();
        displayQuestion();
    } catch (error) {
        console.error('Error:', error);
        alert('Error while loading the quiz');
        resetQuiz();
    }
}

function resetQuizState() {
    currentQuestionIndex = 0;
    userAnswers = {};
    score = 0;
    wrongAnswers = [];
    answersHistory = [];
    updateUI();
}

function displayQuestion() {
    if (currentQuestionIndex >= questions.length) {
        showResults();
        return;
    }

    const question = questions[currentQuestionIndex];

    document.getElementById('questionText').textContent = question.question;
    document.getElementById('questionCounter').textContent = `Question ${currentQuestionIndex + 1}/${totalQuestions}`;

    const instructionElement = document.getElementById('questionInstruction');
    if (isMultipleChoice(question)) {
        instructionElement.textContent = `(Select ${question.correct.length} answers)`;
        instructionElement.style.display = 'block';
    } else {
        instructionElement.style.display = 'none';
    }

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';

        const letter = document.createElement('div');
        letter.className = 'option-letter';
        letter.textContent = String.fromCharCode(65 + index);

        const text = document.createElement('span');
        text.textContent = option;

        optionElement.appendChild(letter);
        optionElement.appendChild(text);
        optionElement.onclick = () => selectOption(index);

        // FIX: Check if array before using includes
        const userAnswer = userAnswers[question.id];
        const isSelected = Array.isArray(userAnswer)
            ? userAnswer.includes(index)
            : userAnswer === index;

        if (isSelected) {
            optionElement.classList.add('selected');
            letter.classList.add('selected');
        }

        optionsContainer.appendChild(optionElement);
    });

    updateUI();
}

function selectOption(optionIndex) {
    const question = questions[currentQuestionIndex];
    const multipleChoice = isMultipleChoice(question);

    if (!userAnswers[question.id]) {
        userAnswers[question.id] = multipleChoice ? [] : null;
    }

    if (multipleChoice) {
        const selectedAnswers = userAnswers[question.id];
        const optionAlreadySelected = selectedAnswers.includes(optionIndex);

        if (optionAlreadySelected) {
            userAnswers[question.id] = selectedAnswers.filter(index => index !== optionIndex);
        } else {
            if (selectedAnswers.length < question.correct.length) {
                userAnswers[question.id].push(optionIndex);
            }
        }
    } else {
        userAnswers[question.id] = optionIndex;
    }

    const options = document.querySelectorAll('.option');
    options.forEach((option, index) => {
        const optionLetter = option.querySelector('.option-letter');
        option.classList.remove('selected');
        optionLetter.classList.remove('selected');

        const userAnswer = userAnswers[question.id];
        const isSelected = Array.isArray(userAnswer)
            ? userAnswer.includes(index)
            : userAnswer === index;

        if (isSelected) {
            option.classList.add('selected');
            optionLetter.classList.add('selected');
        }
    });

    updateUI();
}

async function nextQuestion() {
    const question = questions[currentQuestionIndex];

    if (userAnswers[question.id] === undefined) return;

    try {
        const response = await fetch('/api/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                questionId: question.id,
                answer: userAnswers[question.id]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.correct) {
            score++;
        } else {
            const multipleChoice = isMultipleChoice(question);
            let userAnswerText, correctAnswerText;

            if (multipleChoice) {
                const userSelectedIndexes = userAnswers[question.id] || [];
                const correctIndexes = question.correct;

                userAnswerText = userSelectedIndexes.length > 0
                    ? userSelectedIndexes.map(i => question.options[i]).join(', ')
                    : 'No answer';
                correctAnswerText = correctIndexes.map(i => question.options[i]).join(', ');
            } else {
                userAnswerText = userAnswers[question.id] !== undefined
                    ? question.options[userAnswers[question.id]]
                    : 'No answer';
                correctAnswerText = question.options[result.correctAnswer];
            }

            wrongAnswers.push({
                question: question.question,
                userAnswer: userAnswerText,
                correctAnswer: correctAnswerText,
                explanation: result.explanation || ''
            });
        }

        showCorrection(result);

        setTimeout(() => {
            currentQuestionIndex++;
            displayQuestion();
        }, 1000);

    } catch (error) {
        console.error('Error:', error);
        currentQuestionIndex++;
        displayQuestion();
    }
}

function showCorrection(result) {
    const question = questions[currentQuestionIndex];
    const multipleChoice = isMultipleChoice(question);
    const options = document.querySelectorAll('.option');

    options.forEach((option, index) => {
        const optionLetter = option.querySelector('.option-letter');

        if (multipleChoice) {
            const correctAnswers = question.correct;
            const currentUserAnswers = userAnswers[question.id] || [];

            if (correctAnswers.includes(index)) {
                option.classList.add('correct');
                optionLetter.classList.add('correct');
            } else if (currentUserAnswers.includes(index)) {
                option.classList.add('incorrect');
                optionLetter.classList.add('incorrect');
            }
        } else {
            if (index === result.correctAnswer) {
                option.classList.add('correct');
                optionLetter.classList.add('correct');
            } else if (index === userAnswers[question.id] && !result.correct) {
                option.classList.add('incorrect');
                optionLetter.classList.add('incorrect');
            }
        }

        option.onclick = null;
    });

    updateScore();
}

function updateUI() {
    const question = questions[currentQuestionIndex];
    let hasAnswer = false;

    if (question) {
        const userAnswer = userAnswers[question.id];

        if (isMultipleChoice(question)) {
            const selectedAnswers = userAnswer || [];
            hasAnswer = selectedAnswers.length === question.correct.length;
        } else {
            hasAnswer = userAnswer !== undefined;
        }
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.disabled = !hasAnswer;
}

function updateScore() {
    document.getElementById('scoreDisplay').textContent = `Score: ${score}/${totalQuestions}`;
}

function showResults() {
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('results').style.display = 'block';

    const percentage = Math.round((score / totalQuestions) * 100);
    document.getElementById('finalScore').textContent = `${score}/${totalQuestions} (${percentage}%)`;

    let message = '';
    if (percentage >= 80) {
        message = '🏆 Excellent ! Tu maîtrises parfaitement le sujet !';
    } else if (percentage >= 60) {
        message = '👍 Bien joué ! Quelques révisions et tu seras parfait !';
    } else if (percentage >= 40) {
        message = '📚 Pas mal, mais il reste du travail !';
    } else {
        message = '💪 Ne te décourage pas, continue à apprendre !';
    }

    document.getElementById('resultMessage').textContent = message;

    displayWrongAnswers();
}

function displayWrongAnswers() {
    const wrongAnswersSection = document.getElementById('wrongAnswersSection');
    const wrongAnswersContainer = document.getElementById('wrongAnswersContainer');

    if (wrongAnswers.length === 0) {
        wrongAnswersSection.style.display = 'none';
    } else {
        wrongAnswersSection.style.display = 'block';
        wrongAnswersContainer.innerHTML = '';

        wrongAnswers.forEach((wrong, index) => {
            const wrongQuestionDiv = document.createElement('div');
            wrongQuestionDiv.className = 'wrong-question';

            const questionText = document.createElement('div');
            questionText.className = 'wrong-question-text';
            questionText.textContent = `${index + 1}. ${wrong.question}`;

            const comparisonDiv = document.createElement('div');
            comparisonDiv.className = 'answer-comparison';

            const userAnswerDiv = document.createElement('div');
            userAnswerDiv.className = 'user-answer';
            userAnswerDiv.innerHTML = `
                <span class="answer-label">Ta réponse :</span>
                <span>${wrong.userAnswer}</span>
            `;

            const correctAnswerDiv = document.createElement('div');
            correctAnswerDiv.className = 'correct-answer';
            correctAnswerDiv.innerHTML = `
                <span class="answer-label">Bonne réponse :</span>
                <span>${wrong.correctAnswer}</span>
            `;

            comparisonDiv.appendChild(userAnswerDiv);
            comparisonDiv.appendChild(correctAnswerDiv);

            wrongQuestionDiv.appendChild(questionText);
            wrongQuestionDiv.appendChild(comparisonDiv);

            if (wrong.explanation) {
                const explanationDiv = document.createElement('div');
                explanationDiv.className = 'explanation';
                explanationDiv.innerHTML = `<strong>Explication :</strong> ${wrong.explanation}`;
                wrongQuestionDiv.appendChild(explanationDiv);
            }

            wrongAnswersContainer.appendChild(wrongQuestionDiv);
        });
    }
}

function goHome() {
    if (confirm('Es-tu sûr de vouloir quitter le quiz ?')) {
        resetQuiz();
    }
}

function resetQuiz() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    document.getElementById('difficultySelection').style.display = 'none';
    document.getElementById('themeSelection').style.display = 'block';

    questions = [];
    currentQuestionIndex = 0;
    userAnswers = {};
    score = 0;
    totalQuestions = 0;
    wrongAnswers = [];
    selectedCategory = null;
    selectedTheme = null;
    selectedDifficulty = null;

    // Reset theme header
    document.getElementById('backToCategoriesBtn').style.display = 'none';
    document.getElementById('themeTitle').textContent = 'Sélectionner un thème';

    // Go back to categories
    displayThemes();
}
