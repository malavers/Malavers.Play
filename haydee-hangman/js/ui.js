/* ui.js */
/* Version: 1.2025.0714.2301.MAL */

import { initializeAudio as initAudio, playSound } from './audio.js';
import { APP_CONSTANTS, WORD_CATEGORIES, THEME_SELECTION_OPTIONS, THEME_DEFINITIONS } from './config.js';
import { getSettings, saveSettings, getLeaderboard, getPlayerStats, getAchievements, resetAllData } from './gameData.js';
import { startNewGame, handleKeyPress, requestHint } from './hangman.js';

// Private variables and functions
const elements = {
    achievementModal: document.getElementById('achievement-modal'),
    achievementModalCloseBtn: document.getElementById('achievement-modal-close-btn'),
    achievementModalMessage: document.getElementById('achievement-modal-message'),
    achievementModalTitle: document.getElementById('achievement-modal-title'),
    appToast: document.getElementById('app-toast'),
    categoryDisplay: document.getElementById('category-display'),
    categoryList: document.getElementById('category-list'),
    difficulty: document.getElementById('difficulty'),
    gameInfoScore: document.getElementById('game-info-score'),
    gameInfoMistakes: document.getElementById('game-info-mistakes'),
    gameMode: document.getElementById('game-mode'),
    gameplaySection: document.getElementById('gameplay-section'),
    guessedWordDisplay: document.getElementById('guessed-word-display'),
    hangmanImage: document.getElementById('hangman-image'),
    hintBtn: document.getElementById('hint-btn'),
    imageSet: document.getElementById('image-set'),
    keyboard: document.getElementById('keyboard'),
    leaderboardBtn: document.getElementById('leaderboard-btn'),
    leaderboardFilter: document.getElementById('leaderboard-filter'),
    leaderboardList: document.getElementById('leaderboard-list'),
    leaderboardSection: document.getElementById('leaderboard-section'),
    mainMenuSection: document.getElementById('main-menu-section'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    modalMessage: document.getElementById('modal-message'),
    modalDetails: document.getElementById('modal-details'),
    modalPlayAgainBtn: document.getElementById('modal-play-again-btn'),
    modalSettingsBtn: document.getElementById('modal-settings-btn'),
    modalQuitBtn: document.getElementById('modal-quit-btn'),
    navLeaderboardBtn: document.getElementById('nav-leaderboard-btn'),
    navMainMenuBtn: document.getElementById('nav-main-menu-btn'),
    navSettingsBtn: document.getElementById('nav-settings-btn'),
    navStatsBtn: document.getElementById('nav-stats-btn'),
    playerInitials: document.getElementById('player-initials'),
    resetStatsBtn: document.getElementById('reset-stats-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsSection: document.getElementById('settings-section'),
    soundPack: document.getElementById('sound-pack'),
    startGameBtn: document.getElementById('start-game-btn'),
    statsAchievementsList: document.getElementById('stats-achievements-list'),
    statsBtn: document.getElementById('stats-btn'),
    statsGrid: document.getElementById('stats-grid'),
    statsSection: document.getElementById('stats-section'),
    themeNameDisplay: document.getElementById('theme-name-display'),
    themeSelector: document.getElementById('theme-selector'),
    timerDisplay: document.getElementById('timer-display'),
    volume: document.getElementById('volume'),
};

let currentSection = elements.mainMenuSection;
let modalQueue = [];

function hideModal() {
    console.log('Hiding modal.');
    if (elements.modalOverlay) {
        elements.modalOverlay.classList.remove('show-modal');
    }
    if (modalQueue.length > 0) {
        const nextModal = modalQueue.shift();
        UI.showModal(nextModal.title, nextModal.message, nextModal.details);
    }
}

function hideAchievementModal() {
    console.log('Hiding achievement modal.');
    elements.achievementModal.classList.remove('show-modal');
}

function setupEventListeners() {
    if (!elements.startGameBtn) {
        console.error('Start game button not found.');
        UI.showToast('Error: Start game button missing.', 'error');
        return;
    }

    elements.startGameBtn.addEventListener('click', () => {
        console.log('Start Game button clicked.');
        initAudio();
        UI.switchSection(elements.gameplaySection);
        startNewGame(getSettings());
    });

    elements.settingsBtn.addEventListener('click', () => {
        console.log('Settings button clicked.');
        playSound('click', getSettings().volume);
        UI.switchSection(elements.settingsSection);
    });
    elements.statsBtn.addEventListener('click', () => {
        console.log('Stats button clicked.');
        playSound('click', getSettings().volume);
        UI.switchSection(elements.statsSection);
    });
    elements.leaderboardBtn.addEventListener('click', () => {
        console.log('Leaderboard button clicked.');
        playSound('click', getSettings().volume);
        UI.switchSection(elements.leaderboardSection);
    });
    elements.navMainMenuBtn.addEventListener('click', () => {
        console.log('Nav Main Menu button clicked.');
        playSound('click', getSettings().volume);
        UI.switchSection(elements.mainMenuSection);
    });
    elements.navSettingsBtn.addEventListener('click', () => {
        console.log('Nav Settings button clicked.');
        playSound('click', getSettings().volume);
        UI.switchSection(elements.settingsSection);
    });
    elements.navStatsBtn.addEventListener('click', () => {
        console.log('Nav Stats button clicked.');
        playSound('click', getSettings().volume);
        UI.switchSection(elements.statsSection);
    });
    elements.navLeaderboardBtn.addEventListener('click', () => {
        console.log('Nav Leaderboard button clicked.');
        playSound('click', getSettings().volume);
        UI.switchSection(elements.leaderboardSection);
    });

    elements.playerInitials.addEventListener('input', UI.saveCurrentSettings);
    elements.imageSet.addEventListener('change', UI.saveCurrentSettings);
    elements.soundPack.addEventListener('change', UI.saveCurrentSettings);
    elements.volume.addEventListener('change', UI.saveCurrentSettings);
    elements.difficulty.addEventListener('change', UI.saveCurrentSettings);
    elements.gameMode.addEventListener('change', UI.saveCurrentSettings);
    elements.categoryList.addEventListener('change', UI.saveCurrentSettings);

    elements.themeSelector.addEventListener('click', (e) => {
        const themeId = Number(e.target.dataset.themeId);
        if (themeId) {
            console.log(`Theme swatch clicked: ID ${themeId}`);
            playSound('click', getSettings().volume);
            elements.themeSelector.querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.classList.toggle('selected', Number(swatch.dataset.themeId) === themeId);
            });
            UI.applyTheme(themeId);
            UI.saveCurrentSettings();
        }
    });

    elements.resetStatsBtn.addEventListener('click', () => {
        console.log('Reset Stats button clicked.');
        playSound('click', getSettings().volume);
        const btn = elements.resetStatsBtn;
        if (btn.dataset.armed !== 'true') {
            btn.dataset.armed = 'true';
            btn.textContent = 'Tap again to reset everything';
            setTimeout(() => {
                btn.dataset.armed = 'false';
                btn.textContent = 'Reset Stats';
            }, 4000);
            return;
        }
        btn.dataset.armed = 'false';
        btn.textContent = 'Reset Stats';
        resetAllData();
        UI.renderStats();
        UI.renderLeaderboard();
        UI.showToast('All data reset.', 'success');
    });

    elements.leaderboardFilter.addEventListener('change', () => {
        console.log('Leaderboard filter changed.');
        playSound('click', getSettings().volume);
        UI.renderLeaderboard();
    });

    elements.modalPlayAgainBtn.addEventListener('click', () => {
        console.log('Play Again button clicked.');
        playSound('click', getSettings().volume);
        hideModal();
        startNewGame(getSettings());
    });
    elements.modalSettingsBtn.addEventListener('click', () => {
        console.log('Settings button clicked in modal.');
        playSound('click', getSettings().volume);
        hideModal();
        UI.handleSectionChange('settings-section');
    });
    elements.modalQuitBtn.addEventListener('click', () => {
        console.log('Quit button clicked.');
        playSound('click', getSettings().volume);
        hideModal();
        window.close();
        setTimeout(() => {
            if (!document.hidden) {
                UI.showToast('Unable to close window. Returning to main menu.', 'info');
                UI.handleSectionChange('main-menu-section');
            }
        }, 100);
    });
    elements.achievementModalCloseBtn.addEventListener('click', () => {
        console.log('Achievement modal close button clicked.');
        playSound('click', getSettings().volume);
        hideAchievementModal();
    });

    elements.hintBtn.addEventListener('click', () => {
        console.log('Hint button clicked.');
        playSound('click', getSettings().volume);
        requestHint(getSettings());
    });

    document.addEventListener('keydown', (e) => {
        const letter = e.key.toUpperCase();
        if (/^[A-Z]$/.test(letter) && UI.getActiveSectionId() === 'gameplay-section') {
            console.log(`Physical key pressed: ${letter}`);
            playSound('click', getSettings().volume);
            handleKeyPress(letter, getSettings);
            const key = elements.keyboard.querySelector(`.key[data-letter="${letter}"]`);
            if (key) {
                const word = getSettings().currentWord || '';
                if (word.includes(letter)) {
                    key.classList.add('correct');
                } else {
                    key.classList.add('incorrect');
                }
                key.disabled = true;
                key.classList.add('disabled');
            }
        }
    });
}

function renderSettings() {
    const settings = getSettings();
    
    elements.playerInitials.value = settings.playerInitials;
    elements.imageSet.value = settings.imageSet;
    elements.soundPack.value = settings.soundPack;
    elements.volume.value = settings.volume;
    elements.difficulty.value = settings.difficulty;
    elements.gameMode.value = settings.gameMode;

    renderThemeSelector(settings.theme);
    renderCategorySelector(settings.categories);
}

function renderThemeSelector(selectedThemeId) {
    elements.themeSelector.innerHTML = '';
    THEME_SELECTION_OPTIONS.forEach(theme => {
        const swatch = document.createElement('div');
        swatch.className = `color-swatch ${theme.id === selectedThemeId ? 'selected' : ''}`;
        swatch.dataset.themeId = theme.id;
        swatch.style.backgroundColor = THEME_DEFINITIONS.find(t => t.id === theme.id).variables['--theme-primary'];
        elements.themeSelector.appendChild(swatch);
    });
}

function renderCategorySelector(selectedCategories) {
    elements.categoryList.innerHTML = '';
    const allCheckbox = document.createElement('div');
    allCheckbox.className = 'checkbox-item';
    allCheckbox.innerHTML = `
        <input type="checkbox" id="category-all" value="all" ${selectedCategories.includes('all') ? 'checked' : ''}>
        <label for="category-all">All</label>
    `;
    elements.categoryList.appendChild(allCheckbox);

    WORD_CATEGORIES.forEach(category => {
        const checkbox = document.createElement('div');
        checkbox.className = 'checkbox-item';
        checkbox.innerHTML = `
            <input type="checkbox" id="category-${category.id}" value="${category.id}" ${selectedCategories.includes(category.id.toString()) ? 'checked' : ''}>
            <label for="category-${category.id}">${category.display}</label>
        `;
        elements.categoryList.appendChild(checkbox);
    });

    allCheckbox.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) {
            elements.categoryList.querySelectorAll('input').forEach(input => {
                input.checked = input.value === 'all';
            });
        }
        UI.saveCurrentSettings();
    });

    elements.categoryList.querySelectorAll('input:not(#category-all)').forEach(input => {
        input.addEventListener('change', () => {
            const all = elements.categoryList.querySelector('#category-all');
            if (Array.from(elements.categoryList.querySelectorAll('input:not(#category-all)')).some(inp => inp.checked)) {
                all.checked = false;
            } else {
                all.checked = true;
            }
            UI.saveCurrentSettings();
        });
    });
}

function saveCurrentSettings() {
    const categories = Array.from(elements.categoryList.querySelectorAll('input:checked')).map(input => input.value);
    const settings = {
        playerInitials: elements.playerInitials.value.toUpperCase().slice(0, 3),
        theme: Number(elements.themeSelector.querySelector('.color-swatch.selected')?.dataset.themeId) || APP_CONSTANTS.THEME_DEFAULT_ID,
        imageSet: elements.imageSet.value,
        soundPack: elements.soundPack.value,
        volume: Number(elements.volume.value),
        difficulty: Number(elements.difficulty.value),
        categories: categories.length > 0 ? categories : APP_CONSTANTS.CATEGORIES_DEFAULT,
        gameMode: elements.gameMode.value,
    };
    if (categories.length === 0) {
        console.warn('No categories selected, defaulting to "all".');
        UI.showToast('At least one category must be selected. Defaulting to "All".', 'warning');
        elements.categoryList.querySelector('#category-all').checked = true;
        elements.categoryList.querySelectorAll('input:not(#category-all)').forEach(input => input.checked = false);
    }
    saveSettings(settings);
    UI.applyTheme(settings.theme);
}

function renderStats() {
    const stats = getPlayerStats();
    elements.statsGrid.innerHTML = `
        <div class="stats-item"><h4>Games Played</h4><p>${stats.gamesPlayed}</p></div>
        <div class="stats-item"><h4>Games Won</h4><p>${stats.gamesWon}</p></div>
        <div class="stats-item"><h4>Total Score</h4><p>${stats.totalScore}</p></div>
        <div class="stats-item"><h4>Win Streak</h4><p>${stats.winStreak}</p></div>
        <div class="stats-item"><h4>Max Win Streak</h4><p>${stats.maxWinStreak}</p></div>
        <div class="stats-item"><h4>Perfect Games</h4><p>${stats.perfectGames}</p></div>
        <div class="stats-item"><h4>No-Hint Wins</h4><p>${stats.noHintWins}</p></div>
        <div class="stats-item"><h4>Speed Runs</h4><p>${stats.speedRuns}</p></div>
    `;

    const achievements = getAchievements();
    elements.statsAchievementsList.innerHTML = achievements.map(ach => `
        <li class="achievement-item ${ach.unlocked ? 'unlocked' : ''}">
            ${ach.name} (${ach.progress}/${ach.target})
        </li>
    `).join('');
}

function renderLeaderboard() {
    const filterMode = elements.leaderboardFilter.value;
    const leaderboard = getLeaderboard(filterMode);
    elements.leaderboardList.innerHTML = leaderboard.length === 0 ? `
        <li class="leaderboard-empty">No entries yet.</li>
    ` : leaderboard.map((entry, index) => `
        <li class="leaderboard-entry">
            <span class="leaderboard-rank">${index + 1}</span>
            <span class="leaderboard-initials">${entry.initials}</span>
            <span class="leaderboard-score">${entry.score}</span>
        </li>
    `).join('');
}

// UI object for export
const UI = {
    init: function() {
        if (!elements.mainMenuSection) {
            console.error('Main menu section not found. Check ID in index.html.');
            this.showToast('Error: Main menu section missing.', 'error');
            return;
        }
        console.log('Initializing UI...');

        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.remove('active-section');
            section.style.overflow = 'auto'; // Ensure scrollability
        });
        elements.mainMenuSection.classList.add('active-section');
        elements.mainMenuSection.style.overflow = 'auto';
        currentSection = elements.mainMenuSection;
        
        setupEventListeners();
        this.renderSettings();
        this.renderStats();
        this.renderLeaderboard();
        this.applyTheme(getSettings().theme);
    },

    populateSettingsUI: function() {
        console.log('Populating settings UI...');
        this.renderSettings();
    },

    switchSection: function(section) {
        if (!section) {
            console.error('Attempted to switch to undefined section.');
            this.showToast('Error: Invalid section.', 'error');
            return;
        }
        if (currentSection === section) {
            console.log(`Section already active: ${section.id}`);
            return;
        }
        console.log(`Switching to section: ${section.id}`);

        document.querySelectorAll('.app-section').forEach(s => {
            s.classList.remove('active-section');
            s.style.overflow = 'auto'; // Ensure scrollability
        });

        section.classList.add('active-section');
        section.style.overflow = 'auto'; // Ensure scrollability
        currentSection = section;

        [elements.navMainMenuBtn, elements.navSettingsBtn, elements.navStatsBtn, elements.navLeaderboardBtn].forEach(btn => btn.classList.remove('active'));
        if (section === elements.mainMenuSection) elements.navMainMenuBtn.classList.add('active');
        else if (section === elements.settingsSection) elements.navSettingsBtn.classList.add('active');
        else if (section === elements.statsSection) elements.navStatsBtn.classList.add('active');
        else if (section === elements.leaderboardSection) elements.navLeaderboardBtn.classList.add('active');

        // Scroll to top of new section
        section.scrollTop = 0;
    },

    applyTheme: function(themeId) {
        const theme = THEME_DEFINITIONS.find(t => t.id === themeId) || THEME_DEFINITIONS.find(t => t.id === APP_CONSTANTS.THEME_DEFAULT_ID);
        if (theme) {
            console.log(`Applying theme: ${theme.name}`);
            Object.entries(theme.variables).forEach(([key, value]) => {
                document.documentElement.style.setProperty(key, value);
            });
            elements.themeNameDisplay.textContent = theme.name;
        } else {
            console.error(`Theme ID ${themeId} not found.`);
            this.showToast(`Theme ID ${themeId} not found.`, 'error');
        }
    },

    resetGameDisplay: function(imageSet) {
        elements.hangmanImage.src = `resources/images/${imageSet}/0.png`;
        elements.gameInfoScore.textContent = 'Score: 0';
        elements.gameInfoMistakes.textContent = "Mistakes: 0/6";
        elements.keyboard.innerHTML = '';
        this.renderKeyboard();
        elements.hintBtn.disabled = false;
        elements.hintBtn.classList.remove('disabled');
    },

    renderKeyboard: function() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        elements.keyboard.innerHTML = letters.split('').map(letter => `
            <button class="key" data-letter="${letter}">${letter}</button>
        `).join('');
        elements.keyboard.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', () => {
                console.log(`Key clicked: ${key.dataset.letter}`);
                playSound('click', getSettings().volume);
                const letter = key.dataset.letter;
                handleKeyPress(letter, getSettings);
            });
        });
    },

    updateGuessedWordDisplay: function(word, guessedLetters) {
        const display = word.split('').map(letter => guessedLetters.has(letter) ? letter : '_').join(' ');
        elements.guessedWordDisplay.textContent = display;
    },

    updateHangmanImage: function(incorrectGuesses, imageSet) {
        const stateIndex = Math.min(Math.max(incorrectGuesses, 0), 6);
        elements.hangmanImage.src = `resources/images/${imageSet}/${stateIndex}.png`;
    },

    updateScore: function(score) {
        elements.gameInfoScore.textContent = `Score: ${score}`;
    },

    updateMistakes: function(mistakes) {
        elements.gameInfoMistakes.textContent = `Mistakes: ${mistakes}/6`;
    },

    updateHintButton: function(hint) {
        elements.hintBtn.disabled = !hint;
        if (!hint) {
            elements.hintBtn.classList.add('disabled');
        } else {
            elements.hintBtn.classList.remove('disabled');
        }
    },

    updateCategoryDisplay: function(categories) {
        console.log('Updating category display:', categories);
        let displayText;
        if (Array.isArray(categories)) {
            if (categories.includes('all')) {
                displayText = 'All';
            } else {
                const categoryNames = categories.map(id => {
                    const category = WORD_CATEGORIES.find(c => c.id.toString() === id.toString());
                    return category ? category.display : 'Unknown';
                }).filter(name => name !== 'Unknown');
                displayText = categoryNames.length > 0 ? categoryNames.join(', ') : 'Unknown';
            }
        } else {
            const category = WORD_CATEGORIES.find(c => c.id === categories) || { display: 'Unknown' };
            displayText = category.display;
        }
        elements.categoryDisplay.textContent = `Category: ${displayText}`;
    },

    updateTimer: function(time) {
        elements.timerDisplay.textContent = time;
    },

    disableKey: function(letter) {
        const key = elements.keyboard.querySelector(`.key[data-letter="${letter}"]`);
        if (key) {
            key.disabled = true;
            key.classList.add('disabled');
        }
    },

    showHint: function(hint) {
        this.showToast(`Hint: ${hint}`, 'info');
    },

    disableHintButton: function() {
        elements.hintBtn.disabled = true;
        elements.hintBtn.classList.add('disabled');
    },

    showWinModal: function(gameState) {
        console.log('Attempting to show win modal with gameState:', gameState);
        if (!gameState || !gameState.word || typeof gameState.score !== 'number' || typeof gameState.gameDuration !== 'number') {
            console.error('Invalid gameState for win modal:', gameState);
            this.showModal('You Won!', 'Word: Unknown', 'Score: 0\nTime: 0s');
            return;
        }
        this.showModal('You Won!', `Word: ${gameState.word}`, `Score: ${gameState.score}\nTime: ${gameState.gameDuration.toFixed(1)}s`);
    },

    showLoseModal: function(gameState) {
        console.log('Attempting to show lose modal with gameState:', gameState);
        if (!gameState || !gameState.word || typeof gameState.score !== 'number' || typeof gameState.gameDuration !== 'number') {
            console.error('Invalid gameState for lose modal:', gameState);
            this.showModal('Game Over', 'Word: Unknown', 'Score: 0\nTime: 0s');
            return;
        }
        this.showModal('Game Over', `Word: ${gameState.word}`, `Score: ${gameState.score}\nTime: ${gameState.gameDuration.toFixed(1)}s`);
    },

    handleSectionChange: function(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            this.switchSection(section);
        } else {
            console.error(`Section ID "${sectionId}" not found.`);
            this.showToast(`Section "${sectionId}" not found.`, 'error');
        }
    },

    getActiveSectionId: function() {
        return currentSection.id;
    },

    showModal: function(title, message, details = '') {
        console.log('Showing modal:', { title, message, details });
        if (!elements.modalOverlay) {
            console.error('Modal overlay element not found.');
            this.showToast('Error: Modal cannot be displayed.', 'error');
            return;
        }
        if (elements.modalOverlay.classList.contains('show-modal')) {
            modalQueue.push({ title, message, details });
            return;
        }
        elements.modalTitle.textContent = title;
        elements.modalMessage.textContent = message;
        elements.modalDetails.textContent = details;
        elements.modalOverlay.classList.add('show-modal');
    },

    showAchievementModal: function(name) {
        console.log('Showing achievement modal:', name);
        elements.achievementModalTitle.textContent = 'Achievement Unlocked';
        elements.achievementModalMessage.textContent = name;
        elements.achievementModal.classList.add('show-modal');
    },

    showToast: function(message, type = 'info') {
        console.log('Showing toast:', message, type);
        elements.appToast.textContent = message;
        elements.appToast.className = `show ${type}`;
        setTimeout(() => {
            elements.appToast.className = '';
        }, 3000);
    },

    showAchievementToast: function(name) {
        this.showToast(`Achievement Unlocked: ${name}`, 'success');
    },

    renderSettings: function() {
        renderSettings();
    },

    renderStats: function() {
        renderStats();
    },

    renderLeaderboard: function() {
        renderLeaderboard();
    },

    saveCurrentSettings: function() {
        saveCurrentSettings();
    }
};

// Initialize UI on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
} else {
    UI.init();
}
// Export UI object
export default UI;
// line_number_611