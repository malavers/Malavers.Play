// config.js: fixed game data. No DOM access, so it also loads in Node for tests.

export const MAX_LIVES = 6;
export const TIMED_SECONDS = 90;
export const RECENT_WORDS_KEPT = 30;
export const SPEED_RUN_SECONDS = 30;

export const PATHS = {
    words: 'resources/lexicon',
    sounds: 'resources/sounds',
    images: 'resources/images',
};

export const CATEGORIES = [
    { id: 'animals', name: 'Animals' },
    { id: 'cities', name: 'Cities' },
    { id: 'countries', name: 'Countries' },
    { id: 'food', name: 'Food' },
    { id: 'movies', name: 'Movies' },
    { id: 'plants', name: 'Plants' },
    { id: 'school', name: 'School' },
    { id: 'vehicles', name: 'Vehicles' },
];

// Word files group words by length: level 1 up to 4 letters, 3 is 5-6, 5 is 7+.
// A thin pool borrows the nearest-length level-3 words.
export const DIFFICULTIES = [
    { id: 'easy', name: 'Easy', level: 1, borrow: word => word.length <= 5, multiplier: 1 },
    { id: 'normal', name: 'Normal', level: 3, borrow: () => false, multiplier: 1.5 },
    { id: 'hard', name: 'Hard', level: 5, borrow: word => word.length >= 6, multiplier: 2 },
];
export const MIN_POOL = 12;

export const MODES = [
    { id: 'casual', name: 'Relaxed' },
    { id: 'timed', name: 'Timed' },
];

export const PICTURE_SETS = [
    { id: 'butterfly', name: 'Butterfly' },
    { id: 'robot', name: 'Robot' },
    { id: 'tree', name: 'Tree' },
];

export const SOUND_PACKS = [
    { id: 'classic', name: 'Classic' },
    { id: 'modern', name: 'Modern' },
    { id: 'retro', name: 'Retro' },
];

export const VOLUMES = [
    { id: 0, name: 'Off', gain: 0 },
    { id: 1, name: 'Low', gain: 0.25 },
    { id: 2, name: 'Medium', gain: 0.55 },
    { id: 3, name: 'High', gain: 1 },
];

export const SOUND_FILES = {
    click: 'click.mp3',
    correct: 'correct.mp3',
    incorrect: 'incorrect.mp3',
    win: 'win.mp3',
    lose: 'lose.mp3',
};

// Light and dark values are each contrast-checked against their text colour.
export const ACCENTS = [
    { id: 'purple', name: 'Purple', light: '#7c3aed', dark: '#a78bfa' },
    { id: 'blue', name: 'Blue', light: '#2563eb', dark: '#60a5fa' },
    { id: 'teal', name: 'Teal', light: '#0f766e', dark: '#2dd4bf' },
    { id: 'green', name: 'Green', light: '#15803d', dark: '#4ade80' },
    { id: 'orange', name: 'Orange', light: '#c2410c', dark: '#fb923c' },
    { id: 'pink', name: 'Pink', light: '#be185d', dark: '#f472b6' },
];

export const SCORING = {
    correctLetter: 10,
    winBonus: 50,
    perLifeLeft: 10,
    perSecondLeft: 1,
    hintCost: 20,
};

export const DEFAULT_SETTINGS = {
    initials: '',
    accent: 'purple',
    pictures: 'butterfly',
    soundPack: 'classic',
    volume: 2,
    difficulty: 'normal',
    mode: 'casual',
    categories: [], // empty means all
};

// Each test reads the saved game history, newest last.
export const ACHIEVEMENTS = [
    { id: 'first_win', name: 'First Win', detail: 'Win a game', target: 1, progress: s => s.wins },
    { id: 'win_10', name: 'Word Wizard', detail: 'Win 10 games', target: 10, progress: s => s.wins },
    { id: 'streak_3', name: 'Hat Trick', detail: 'Win 3 in a row', target: 3, progress: s => s.bestStreak },
    { id: 'streak_10', name: 'Unstoppable', detail: 'Win 10 in a row', target: 10, progress: s => s.bestStreak },
    { id: 'perfect', name: 'Perfect', detail: 'Win without a wrong letter', target: 1, progress: s => s.perfectWins },
    { id: 'no_hint', name: 'No Clues Needed', detail: 'Win without the clue', target: 1, progress: s => s.noHintWins },
    { id: 'speedy', name: 'Speedy', detail: `Win in under ${SPEED_RUN_SECONDS} seconds`, target: 1, progress: s => s.speedyWins },
    { id: 'hard_win', name: 'Brain Power', detail: 'Win on Hard', target: 1, progress: s => s.hardWins },
    { id: 'big_score', name: 'High Scorer', detail: 'Score 250 in one game', target: 250, progress: s => s.bestScore },
    { id: 'explorer', name: 'Explorer', detail: 'Win in every category', target: CATEGORIES.length, progress: s => s.categoriesWon },
];
