/* hangman.js */
/* Version: 1.2025.0714.2302.MAL */

import UI from './ui.js';
import * as Audio from './audio.js';
import * as Storage from './gameData.js';
import { APP_CONSTANTS, WORD_CATEGORIES, BASE_IMAGE_PATH, TOTAL_IMAGE_STATES, IMAGE_THEMES, BASE_WORD_PATH } from './config.js';

// Private variables
const state = {
    currentWord: '',
    currentHint: '',
    currentCategory: null,
    guessedLetters: new Set(),
    incorrectGuesses: 0,
    score: 0,
    gameStartedAt: null,
    gameEndedAt: null,
    timerInterval: null,
    hasUsedHint: false,
    guessedCategories: new Set(),
    perfectGame: true,
};

let availableWords = [];

async function loadWords(selectedCategories, difficulty) {
    availableWords = [];
    if (!Array.isArray(selectedCategories) || selectedCategories.length === 0) {
        console.warn('Invalid or empty selectedCategories, defaulting to "all":', selectedCategories);
        selectedCategories = ['all'];
        UI.showToast('Invalid category selection, defaulting to "All".', 'warning');
    }
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
        console.warn('Invalid difficulty, defaulting to normal:', difficulty);
        difficulty = APP_CONSTANTS.DIFFICULTY_DEFAULT; // 3
        UI.showToast('Invalid difficulty, defaulting to Normal.', 'warning');
    }
    const categoriesToLoad = selectedCategories.includes('all') ? WORD_CATEGORIES.map(c => c.id.toString()) : selectedCategories;
    let loadedAnyWords = false;
    for (const categoryId of categoriesToLoad) {
        const category = WORD_CATEGORIES.find(c => c.id.toString() === categoryId);
        if (!category) {
            console.warn(`Category ID "${categoryId}" not found in WORD_CATEGORIES. Skipping.`);
            UI.showToast(`Category ID "${categoryId}" not found.`, 'warning');
            continue;
        }
        const path = `${BASE_WORD_PATH}/${category.display.toLowerCase()}.json`;
        try {
            const response = await fetch(path);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Word file for category "${category.display}" not found at ${path}. Skipping.`);
                    UI.showToast(`Category "${category.display}" words not found.`, 'warning');
                } else {
                    throw new Error(`HTTP error! status: ${response.status} for ${path}`);
                }
                continue;
            }
            const data = await response.json();
            const levels = data && data.words_by_difficulty ? Object.keys(data.words_by_difficulty).map(Number) : [];
            const level = levels.length ? levels.reduce((best, l) => (Math.abs(l - difficulty) < Math.abs(best - difficulty) ? l : best)) : null;
            if (level !== null) {
                const words = data.words_by_difficulty[level].map(wordObj => ({
                    word: wordObj.word,
                    hint: wordObj.hint,
                    categoryId: category.id,
                }));
                if (words.length > 0) {
                    availableWords.push(...words);
                    state.guessedCategories.add(category.id.toString());
                    loadedAnyWords = true;
                } else {
                    console.warn(`No words found for difficulty ${difficulty} in ${path}`);
                    UI.showToast(`No words for difficulty ${difficulty} in "${category.display}".`, 'warning');
                }
            } else {
                console.warn(`Invalid word file format in ${path}`);
                UI.showToast(`Invalid word file for "${category.display}".`, 'warning');
            }
        } catch (error) {
            console.error(`Failed to load words from ${path}:`, error);
            UI.showToast(`Error loading words for "${category.display}".`, 'error');
        }
    }
    if (!loadedAnyWords) {
        console.error("No words loaded, using fallback word.");
        availableWords.push({ word: 'HANGMAN', hint: 'A word game', categoryId: 1 });
        state.guessedCategories.add('1');
    }
}

function guessLetter(letter, getSettings) {
    const settings = getSettings();
    letter = letter.toUpperCase();
    if (state.gameEndedAt || state.guessedLetters.has(letter) || !state.currentWord) {
        console.log('Ignoring guess: gameEndedAt=', state.gameEndedAt, 'guessed=', state.guessedLetters.has(letter), 'word=', state.currentWord);
        return;
    }

    state.guessedLetters.add(letter);
    UI.disableKey(letter);

    if (state.currentWord.includes(letter)) {
        Audio.playSound('correct', settings.volume);
        state.score += APP_CONSTANTS.BASE_SCORES.CORRECT_LETTER || 10;
        UI.updateGuessedWordDisplay(state.currentWord, state.guessedLetters);
        UI.updateScore(state.score);
        checkWinCondition(getSettings);
    } else {
        Audio.playSound('incorrect', settings.volume);
        state.incorrectGuesses++;
        state.perfectGame = false;
        state.score += APP_CONSTANTS.BASE_SCORES.INCORRECT_LETTER || -5;
        UI.updateHangmanImage(state.incorrectGuesses, settings.imageSet);
        UI.updateScore(state.score);
        UI.updateMistakes(state.incorrectGuesses);
        checkLoseCondition(getSettings);
    }
}

function useHint(getSettings) {
    const settings = getSettings();
    if (state.currentHint && !state.hasUsedHint && !state.gameEndedAt) {
        UI.showHint(state.currentHint);
        state.score -= APP_CONSTANTS.HINT_PENALTY || 10;
        state.hasUsedHint = true;
        state.perfectGame = false;
        UI.updateScore(state.score);
        UI.disableHintButton();
        Audio.playSound('hint', settings.volume);
    } else {
        console.log('Cannot use hint: hint=', state.currentHint, 'hasUsedHint=', state.hasUsedHint, 'gameEndedAt=', state.gameEndedAt);
    }
}

function checkWinCondition(getSettings) {
    console.log('Checking win condition: word=', state.currentWord, 'guessed=', [...state.guessedLetters]);
    const isWordGuessed = state.currentWord && state.currentWord.split('').every(letter => state.guessedLetters.has(letter));
    if (isWordGuessed) {
        console.log('Win condition met, calling winGame.');
        winGame(getSettings);
    }
}

function checkLoseCondition(getSettings) {
    console.log('Checking lose condition: incorrectGuesses=', state.incorrectGuesses, 'max=', APP_CONSTANTS.MAX_INCORRECT_GUESSES);
    if (state.incorrectGuesses >= (APP_CONSTANTS.MAX_INCORRECT_GUESSES || 6)) {
        console.log('Lose condition met, calling loseGame.');
        loseGame(getSettings);
    }
}

function winGame(getSettings) {
    console.log('Winning game: score=', state.score, 'word=', state.currentWord);
    stopTimer();
    state.gameEndedAt = new Date();
    state.score += APP_CONSTANTS.BASE_SCORES.WIN_BONUS || 100;
    applyDifficultyMultiplier(getSettings);
    UI.updateScore(state.score);
    const gameState = getCurrentGameState();
    console.log('Showing win modal with gameState:', gameState);
    UI.showWinModal(gameState);
    Audio.playSound('win', getSettings().volume);
    saveGameResult('win', getSettings);
    Storage.checkAchievements('win', gameState, getSettings());
}

function loseGame(getSettings) {
    console.log('Losing game: score=', state.score, 'word=', state.currentWord);
    stopTimer();
    state.gameEndedAt = new Date();
    state.score += APP_CONSTANTS.BASE_SCORES.LOSS_PENALTY || -50;
    applyDifficultyMultiplier(getSettings);
    UI.updateScore(state.score);
    const gameState = getCurrentGameState();
    console.log('Showing lose modal with gameState:', gameState);
    UI.showLoseModal(gameState);
    Audio.playSound('lose', getSettings().volume);
    saveGameResult('lose', getSettings);
    Storage.checkAchievements('lose', gameState, getSettings());
}

function applyDifficultyMultiplier(getSettings) {
    const settings = getSettings();
    const multiplier = APP_CONSTANTS.DIFFICULTY_MULTIPLIERS[settings.difficulty] || { win: 1, loss: 1 };
    state.score = Math.round(state.score * (state.gameEndedAt ? multiplier[state.score >= 0 ? 'win' : 'loss'] : 1));
    console.log('Applied difficulty multiplier:', multiplier, 'new score:', state.score);
}

function saveGameResult(outcome, getSettings) {
    const settings = getSettings();
    const gameResult = {
        playerInitials: settings.playerInitials,
        score: state.score,
        outcome,
        timestamp: new Date().toISOString(),
        word: state.currentWord,
        incorrectGuesses: state.incorrectGuesses,
        difficulty: settings.difficulty,
        gameMode: settings.gameMode,
        gameDuration: state.gameEndedAt ? (state.gameEndedAt.getTime() - state.gameStartedAt.getTime()) / 1000 : 0,
        perfectGame: state.perfectGame,
        settings: {
            theme: settings.theme,
            imageSet: settings.imageSet,
            soundPack: settings.soundPack,
            volume: settings.volume,
            categories: settings.categories,
        },
        categoryId: state.currentCategory,
    };
    console.log('Saving game result:', gameResult);
    Storage.saveGameResult(gameResult);
}

function startTimer(duration) {
    console.log('Starting timer with duration:', duration);
    stopTimer();
    let timeLeft = duration;
    UI.updateTimer(formatTime(timeLeft));

    state.timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) {
            UI.updateTimer(formatTime(timeLeft));
        }

        if (timeLeft <= 0 && !state.gameEndedAt) {
            console.log('Timer expired, triggering loseGame.');
            stopTimer();
            if (UI.getActiveSectionId() === 'gameplay-section') {
                loseGame(() => Storage.getSettings());
            }
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        console.log('Stopping timer.');
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Public functions
export const startNewGame = initializeGame;

export async function initializeGame(settings) {
    console.log('Starting new game with settings:', settings);
    state.currentWord = '';
    state.currentHint = '';
    state.currentCategory = null;
    state.guessedLetters.clear();
    state.incorrectGuesses = 0;
    state.score = APP_CONSTANTS.BASE_SCORES.STARTING_SCORE || 0;
    state.gameStartedAt = new Date();
    state.gameEndedAt = null;
    state.hasUsedHint = false;
    state.perfectGame = true;

    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }

    try {
        await loadWords(settings.categories, settings.difficulty);
        if (availableWords.length === 0) {
            console.error('No words available after loadWords.');
            UI.showModal('Error', 'No words available for selected categories and difficulty. Please adjust settings.', '');
            UI.handleSectionChange('settings-section');
            return;
        }

        const selectedWordData = availableWords[Math.floor(Math.random() * availableWords.length)];
        state.currentWord = selectedWordData.word.toUpperCase();
        state.currentHint = selectedWordData.hint;
        state.currentCategory = selectedWordData.categoryId;

        UI.resetGameDisplay(settings.imageSet);
        UI.updateCategoryDisplay(settings.categories);
        UI.updateGuessedWordDisplay(state.currentWord, state.guessedLetters);
        UI.updateHangmanImage(state.incorrectGuesses, settings.imageSet);
        UI.renderKeyboard();
        Audio.playSound('start_game', settings.volume);
        UI.updateScore(state.score);
        UI.updateMistakes(state.incorrectGuesses);
        if (settings.gameMode === 'timed' || settings.gameMode === 'rush') {
            const duration = settings.gameMode === 'timed' ? APP_CONSTANTS.TIMED_GAME_DURATION_SECONDS : APP_CONSTANTS.RUSH_GAME_DURATION_SECONDS;
            startTimer(duration || 60); // Fallback to 60 seconds
        }

        console.log("New game started with word:", state.currentWord, "categoryId:", state.currentCategory);
    } catch (error) {
        console.error('Error starting new game:', error);
        UI.showModal('Error', 'Failed to start game. Please try again later.', '');
        UI.handleSectionChange('main-menu-section');
    }
}

export function handleKeyPress(letter, getSettings) {
    console.log('Handling key press:', letter);
    guessLetter(letter, getSettings);
}

export function guessWord(word, getSettings) {
    console.log('Handling word guess:', word);
    const settings = getSettings();
    word = word.toUpperCase();
    if (state.gameEndedAt || !state.currentWord) {
        console.log('Ignoring word guess: gameEndedAt=', state.gameEndedAt, 'word=', state.currentWord);
        return;
    }

    if (word === state.currentWord) {
        state.score += APP_CONSTANTS.BASE_SCORES.CORRECT_WORD || 50;
        state.currentWord.split('').forEach(letter => state.guessedLetters.add(letter));
        UI.updateGuessedWordDisplay(state.currentWord, state.guessedLetters);
        UI.updateScore(state.score);
        Audio.playSound('correct', settings.volume);
        winGame(getSettings);
    } else {
        state.incorrectGuesses = APP_CONSTANTS.MAX_INCORRECT_GUESSES || 6;
        state.perfectGame = false;
        state.score += APP_CONSTANTS.BASE_SCORES.INCORRECT_WORD || -20;
        UI.updateHangmanImage(state.incorrectGuesses, settings.imageSet);
        UI.updateScore(state.score);
        Audio.playSound('incorrect', settings.volume);
        loseGame(getSettings);
    }
}

export function solveWord(getSettings) {
    console.log('Solving word:', state.currentWord);
    const settings = getSettings();
    if (state.gameEndedAt || !state.currentWord) {
        console.log('Ignoring solve: gameEndedAt=', state.gameEndedAt, 'word=', state.currentWord);
        return;
    }

    state.currentWord.split('').forEach(letter => state.guessedLetters.add(letter));
    UI.updateGuessedWordDisplay(state.currentWord, state.guessedLetters);
    state.score += APP_CONSTANTS.BASE_SCORES.CORRECT_WORD || 50;
    UI.updateScore(state.score);
    Audio.playSound('correct', settings.volume);
    winGame(getSettings);
}

export function requestHint(getSettings) {
    console.log('Requesting hint:', state.currentHint);
    useHint(getSettings);
}

export function canRequestHint() {
    const canRequest = state.currentHint && !state.hasUsedHint && !state.gameEndedAt;
    console.log('Can request hint:', canRequest);
    return canRequest;
}

export function getCurrentGameState() {
    const gameState = {
        word: state.currentWord || 'Unknown',
        hint: state.currentHint || '',
        guessedLetters: new Set(state.guessedLetters),
        incorrectGuesses: state.incorrectGuesses || 0,
        score: state.score || 0,
        gameDuration: state.gameEndedAt && state.gameStartedAt ? (state.gameEndedAt.getTime() - state.gameStartedAt.getTime()) / 1000 : 0,
        gameMode: Storage.getSettings().gameMode || 'casual',
        isPerfectGame: state.perfectGame,
        categoryId: state.currentCategory || 1,
    };
    console.log('Current game state:', gameState);
    return gameState;
}

export function getIncorrectGuesses() {
    return state.incorrectGuesses;
}

export function getImagePath(incorrectGuesses, imageSet) {
    if (!IMAGE_THEMES.some(theme => theme.name === imageSet)) {
        imageSet = APP_CONSTANTS.IMAGE_SET_DEFAULT;
    }
    const stateIndex = Math.min(Math.max(incorrectGuesses, 0), TOTAL_IMAGE_STATES - 1);
    return `${BASE_IMAGE_PATH}/${imageSet}/${stateIndex}.png`;
}
// line_number_393