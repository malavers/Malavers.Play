// gameData.js: saved settings and game history. Stats and achievements are
// derived from the history, so they can never drift out of step with it.

import { ACHIEVEMENTS, CATEGORIES, DEFAULT_SETTINGS, SPEED_RUN_SECONDS, ACCENTS, PICTURE_SETS, SOUND_PACKS, DIFFICULTIES, MODES } from './config.js';

const KEYS = { settings: 'hangman_settings', history: 'hangman_game_history' };
const OLD_KEYS = ['hangman_achievements', 'hangman_player_id'];
const HISTORY_LIMIT = 500;

// localStorage can throw (private browsing, blocked storage); fall back to memory.
const store = (() => {
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

function read(key, fallback) {
    try {
        const raw = store.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function write(key, value) {
    try {
        store.setItem(key, JSON.stringify(value));
    } catch {
        // Storage full or blocked: the game still plays, it just won't remember.
    }
}

const pick = (list, id, fallback) => (list.some(item => item.id === id) ? id : fallback);

// Version 1 saves used numeric ids (difficulty 1-5, category 1-8, theme 1-24).
const OLD_DIFFICULTY = { 1: 'easy', 2: 'easy', 3: 'normal', 4: 'hard', 5: 'hard' };
const oldCategory = id => CATEGORIES[Number(id) - 1]?.id;

function normaliseSettings(raw = {}) {
    let categories = raw.categories;
    if (!Array.isArray(categories) || categories.includes('all')) categories = [];
    categories = categories.map(id => (/^\d+$/.test(String(id)) ? oldCategory(id) : id)).filter(id => CATEGORIES.some(c => c.id === id));
    if (categories.length === CATEGORIES.length) categories = [];

    const initials = String(raw.initials ?? raw.playerInitials ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    return {
        initials: initials === 'AAA' ? '' : initials,
        accent: pick(ACCENTS, raw.accent, DEFAULT_SETTINGS.accent),
        pictures: pick(PICTURE_SETS, raw.pictures ?? raw.imageSet, DEFAULT_SETTINGS.pictures),
        soundPack: pick(SOUND_PACKS, raw.soundPack, DEFAULT_SETTINGS.soundPack),
        volume: [0, 1, 2, 3].includes(Number(raw.volume)) ? Number(raw.volume) : DEFAULT_SETTINGS.volume,
        difficulty: pick(DIFFICULTIES, OLD_DIFFICULTY[raw.difficulty] ?? raw.difficulty, DEFAULT_SETTINGS.difficulty),
        mode: pick(MODES, (raw.mode ?? raw.gameMode) === 'rush' ? 'timed' : raw.mode ?? raw.gameMode, DEFAULT_SETTINGS.mode),
        categories,
    };
}

function normaliseEntry(e) {
    return {
        initials: String(e.initials ?? e.playerInitials ?? '').slice(0, 3),
        score: Number(e.score) || 0,
        outcome: e.outcome === 'win' ? 'win' : 'lose',
        at: e.at ?? e.timestamp,
        word: e.word,
        category: CATEGORIES.some(c => c.id === e.category) ? e.category : oldCategory(e.categoryId),
        difficulty: OLD_DIFFICULTY[e.difficulty] ?? e.difficulty ?? 'normal',
        mode: (e.mode ?? e.gameMode ?? 'casual') === 'casual' ? 'casual' : 'timed', // old 'rush' counts as timed
        seconds: Number(e.seconds ?? e.gameDuration) || 0,
        mistakes: Number(e.mistakes ?? e.incorrectGuesses) || 0,
        usedHint: e.usedHint ?? true, // version 1 never recorded it
    };
}

export function getSettings() {
    return normaliseSettings(read(KEYS.settings, {}));
}

export function updateSettings(changes) {
    const settings = normaliseSettings({ ...getSettings(), ...changes });
    write(KEYS.settings, settings);
    return settings;
}

export function getHistory() {
    const history = read(KEYS.history, []);
    return Array.isArray(history) ? history.map(normaliseEntry) : [];
}

export function getStats(history = getHistory()) {
    const stats = {
        played: history.length, wins: 0, streak: 0, bestStreak: 0, bestScore: 0,
        perfectWins: 0, noHintWins: 0, speedyWins: 0, hardWins: 0, categoriesWon: 0,
    };
    const categories = new Set();
    for (const game of history) {
        if (game.outcome !== 'win') {
            stats.streak = 0;
            continue;
        }
        stats.wins++;
        stats.streak++;
        stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
        stats.bestScore = Math.max(stats.bestScore, game.score);
        if (game.mistakes === 0) stats.perfectWins++;
        if (!game.usedHint) stats.noHintWins++;
        if (game.seconds > 0 && game.seconds < SPEED_RUN_SECONDS) stats.speedyWins++;
        if (game.difficulty === 'hard') stats.hardWins++;
        if (game.category) categories.add(game.category);
    }
    stats.categoriesWon = categories.size;
    stats.winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    return stats;
}

export function getAchievements(stats = getStats()) {
    return ACHIEVEMENTS.map(a => {
        const progress = Math.min(a.progress(stats), a.target);
        return { ...a, progress, unlocked: progress >= a.target };
    });
}

// Saves a finished game and reports which achievements it unlocked.
export function recordGame(entry) {
    const history = getHistory();
    const before = new Set(getAchievements(getStats(history)).filter(a => a.unlocked).map(a => a.id));
    history.push(normaliseEntry({ ...entry, at: new Date().toISOString() }));
    write(KEYS.history, history.slice(-HISTORY_LIMIT));
    const stats = getStats(history);
    const unlocked = getAchievements(stats).filter(a => a.unlocked && !before.has(a.id));
    return { stats, unlocked };
}

export function getLeaderboard(mode = 'all') {
    return getHistory()
        .filter(game => game.outcome === 'win' && game.score > 0 && (mode === 'all' || game.mode === mode))
        .sort((a, b) => b.score - a.score || String(b.at).localeCompare(String(a.at)))
        .slice(0, 10);
}

export function resetProgress() {
    store.removeItem(KEYS.history);
    OLD_KEYS.forEach(key => store.removeItem(key));
}
