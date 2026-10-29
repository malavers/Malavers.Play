// =========================================================
// gameData.js
// Version: 1.2025.0714.2200.MAL
// =========================================================
import { APP_CONSTANTS, IMAGE_THEMES } from './config.js';
import * as UI from './ui.js';

// ---------------------------------------------------------
// private
// ---------------------------------------------------------

const localStorage = (() => {
    try {
        const probe = '__hangman_probe__';
        window.localStorage.setItem(probe, probe);
        window.localStorage.removeItem(probe);
        return window.localStorage;
    } catch {
        const memory = new Map();
        return {
            getItem: key => (memory.has(key) ? memory.get(key) : null),
            setItem: (key, value) => memory.set(key, String(value)),
            removeItem: key => memory.delete(key),
        };
    }
})();

const STORAGE_KEYS = {
    SETTINGS: 'hangman_settings',
    GAME_HISTORY: 'hangman_game_history',
    ACHIEVEMENTS: 'hangman_achievements',
    PLAYER_ID: 'hangman_player_id',
};

const defaultSettings = {
    playerInitials: 'AAA',
    theme: APP_CONSTANTS.THEME_DEFAULT_ID,
    imageSet: APP_CONSTANTS.IMAGE_SET_DEFAULT,
    soundPack: APP_CONSTANTS.SOUND_PACK_DEFAULT,
    volume: 2,
    difficulty: APP_CONSTANTS.DIFFICULTY_DEFAULT,
    categories: APP_CONSTANTS.CATEGORIES_DEFAULT,
    gameMode: APP_CONSTANTS.GAME_MODE_DEFAULT,
};

// Generate or retrieve a unique player ID
function getPlayerId() {
    let playerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    if (!playerId) {
        playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(STORAGE_KEYS.PLAYER_ID, playerId);
    }
    return playerId;
}

// ---------------------------------------------------------
// export
// ---------------------------------------------------------

export function getSettings() {
    const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    let settings;
    try {
        settings = storedSettings ? JSON.parse(storedSettings) : defaultSettings;
    } catch (error) {
        console.warn('Invalid settings in localStorage, falling back to defaults:', error);
        settings = defaultSettings;
    }

    settings.playerInitials = (settings.playerInitials || defaultSettings.playerInitials).toUpperCase().slice(0, 3);
    settings.theme = Number.isInteger(Number(settings.theme)) ? Number(settings.theme) : defaultSettings.theme;
    settings.imageSet = settings.imageSet && IMAGE_THEMES.some(theme => theme.name === settings.imageSet) ? settings.imageSet : defaultSettings.imageSet;
    settings.soundPack = settings.soundPack || defaultSettings.soundPack;
    settings.volume = Math.min(Math.max(Number(settings.volume) || defaultSettings.volume, 0), 3);
    settings.difficulty = Math.min(Math.max(Number(settings.difficulty) || defaultSettings.difficulty, 1), 5);
    if (!Array.isArray(settings.categories) || settings.categories.length === 0) {
        console.warn('Invalid or empty categories detected, using default:', settings.categories);
        settings.categories = defaultSettings.categories;
    }
    settings.gameMode = settings.gameMode || defaultSettings.gameMode;

    return settings;
}

export function saveSettings(settings) {
    const currentSettings = getSettings();
    const validatedSettings = {
        playerInitials: (settings.playerInitials || currentSettings.playerInitials).toUpperCase().slice(0, 3),
        theme: Number.isInteger(Number(settings.theme)) ? Number(settings.theme) : currentSettings.theme,
        imageSet: settings.imageSet || currentSettings.imageSet,
        soundPack: settings.soundPack || currentSettings.soundPack,
        volume: Math.min(Math.max(Number(settings.volume) || currentSettings.volume, 0), 3),
        difficulty: Math.min(Math.max(Number(settings.difficulty) || currentSettings.difficulty, 1), 5),
        categories: Array.isArray(settings.categories) && settings.categories.length > 0 ? settings.categories : currentSettings.categories,
        gameMode: settings.gameMode || currentSettings.gameMode,
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(validatedSettings));
}

export function getLeaderboard(mode = 'all') {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAME_HISTORY) || '[]');
    const validModes = ['all', 'casual', 'timed', 'rush'];
    if (!validModes.includes(mode)) {
        console.warn(`Invalid mode "${mode}", falling back to "all".`);
        mode = 'all';
    }
    const filteredHistory = mode === 'all' ? history : history.filter(entry => entry.gameMode === mode);
    return filteredHistory
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
        .map(entry => ({
            initials: entry.playerInitials,
            score: entry.score,
            gameMode: entry.gameMode,
            timestamp: entry.timestamp,
        }));
}

export function getPlayerStats() {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAME_HISTORY) || '[]');
    const settings = getSettings();
    const playerId = getPlayerId();

    const stats = {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        winStreak: 0,
        maxWinStreak: 0,
        perfectGames: 0,
        noHintWins: 0,
        speedRuns: 0,
    };

    let currentWinStreak = 0;
    history
        .filter(entry => entry.playerId === playerId)
        .forEach(entry => {
            stats.gamesPlayed++;
            if (entry.outcome === 'win') {
                stats.gamesWon++;
                currentWinStreak++;
                stats.winStreak = currentWinStreak;
                stats.maxWinStreak = Math.max(stats.maxWinStreak, currentWinStreak);
                if (entry.perfectGame) stats.perfectGames++;
                if (!entry.settings.hasUsedHint) stats.noHintWins++;
                if (entry.gameDuration <= APP_CONSTANTS.SPEED_RUN_THRESHOLD_SECONDS) stats.speedRuns++;
            } else {
                currentWinStreak = 0;
            }
            stats.totalScore += entry.score;
        });

    return stats;
}

export function getAchievements() {
    let storedAchievements;
    try {
        const rawData = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
        storedAchievements = rawData ? JSON.parse(rawData) : [];
        if (!Array.isArray(storedAchievements)) {
            console.warn('Stored achievements is not an array, resetting to empty array.');
            storedAchievements = [];
        }
    } catch (error) {
        console.error('Failed to parse stored achievements:', error);
        storedAchievements = [];
    }

    const defaultAchievements = [
        { id: 'first_win', name: 'First Win', progress: 0, target: 1, unlocked: false },
        { id: 'win_5_games', name: 'Win 5 Games', progress: 0, target: 5, unlocked: false },
        { id: 'perfect_game', name: 'Perfect Game', progress: 0, target: 1, unlocked: false },
        { id: 'no_hint_win', name: 'No-Hint Win', progress: 0, target: 1, unlocked: false },
        { id: 'speed_run', name: 'Speed Run', progress: 0, target: 1, unlocked: false },
        { id: 'high_score_500', name: 'Score 500+', progress: 0, target: 1, unlocked: false },
        { id: 'win_streak_3', name: 'Win Streak of 3', progress: 0, target: 3, unlocked: false },
    ];

    const achievements = defaultAchievements.map(defaultAch => {
        const storedAch = storedAchievements.find(ach => ach.id === defaultAch.id);
        return storedAch ? { ...defaultAch, ...storedAch } : defaultAch;
    });

    const stats = getPlayerStats();
    achievements.forEach(ach => {
        if (ach.id === 'first_win' || ach.id === 'win_5_games') ach.progress = stats.gamesWon;
        if (ach.id === 'perfect_game') ach.progress = stats.perfectGames;
        if (ach.id === 'no_hint_win') ach.progress = stats.noHintWins;
        if (ach.id === 'speed_run') ach.progress = stats.speedRuns;
        if (ach.id === 'win_streak_3') ach.progress = stats.maxWinStreak;
        if (ach.id === 'high_score_500') ach.progress = stats.totalScore >= 500 ? 1 : 0;
        ach.unlocked = ach.progress >= ach.target;
    });

    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    return achievements;
}

export function checkAchievements(outcome, gameState, settings) {
    const achievements = getAchievements();
    const updatedAchievements = achievements.map(ach => {
        const updatedAch = { ...ach };
        if (outcome === 'win') {
            if (ach.id === 'first_win' || ach.id === 'win_5_games') {
                updatedAch.progress = Math.min(updatedAch.progress + 1, ach.target);
            }
            if (ach.id === 'perfect_game' && gameState.isPerfectGame) {
                updatedAch.progress = Math.min(updatedAch.progress + 1, ach.target);
            }
            if (ach.id === 'no_hint_win' && !gameState.hasUsedHint) {
                updatedAch.progress = Math.min(updatedAch.progress + 1, ach.target);
            }
            if (ach.id === 'speed_run' && gameState.gameDuration <= APP_CONSTANTS.SPEED_RUN_THRESHOLD_SECONDS) {
                updatedAch.progress = Math.min(updatedAch.progress + 1, ach.target);
            }
        }
        if (ach.id === 'high_score_500' && gameState.score >= 500) {
            updatedAch.progress = Math.min(updatedAch.progress + 1, ach.target);
        }
        if (ach.id === 'win_streak_3') {
            const stats = getPlayerStats();
            updatedAch.progress = stats.maxWinStreak;
        }
        if (!ach.unlocked && updatedAch.progress >= ach.target) {
            updatedAch.unlocked = true;
            UI.showAchievementToast(ach.name);
        }
        return updatedAch;
    });

    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(updatedAchievements));
}

export function saveGameResult(gameResult) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAME_HISTORY) || '[]');
    gameResult.playerId = getPlayerId();
    history.push(gameResult);
    localStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(history));
}

export function resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.GAME_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
    UI.showToast('All data reset successfully.', 'success');
}
// line_number_235