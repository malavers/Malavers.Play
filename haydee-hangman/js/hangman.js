// hangman.js: game rules and scoring. No DOM access, so it can be tested in Node.

import { CATEGORIES, DIFFICULTIES, MAX_LIVES, MIN_POOL, PATHS, SCORING, TIMED_SECONDS } from './config.js';

const wordFiles = new Map();

async function loadCategory(id) {
    if (!wordFiles.has(id)) {
        wordFiles.set(id, fetch(`${PATHS.words}/${id}.json`)
            .then(response => (response.ok ? response.json() : null))
            .then(data => data?.words_by_difficulty ?? null)
            .catch(() => null));
    }
    return wordFiles.get(id);
}

export async function loadPool(settings) {
    const ids = settings.categories.length ? settings.categories : CATEGORIES.map(c => c.id);
    const files = await Promise.all(ids.map(async id => [id, await loadCategory(id)]));
    return buildPool(files.filter(([, levels]) => levels), settings.difficulty);
}

export function buildPool(files, difficultyId) {
    const difficulty = DIFFICULTIES.find(d => d.id === difficultyId) ?? DIFFICULTIES[1];
    const pool = [];
    for (const [category, levels] of files) {
        let entries = levels[difficulty.level] ?? [];
        if (entries.length < MIN_POOL) {
            entries = entries.concat((levels[3] ?? []).filter(e => difficulty.borrow(e.word)));
        }
        for (const e of entries) {
            const word = String(e.word).toUpperCase();
            if (/^[A-Z]+$/.test(word)) pool.push({ word, hint: e.hint, category });
        }
    }
    return pool;
}

export function chooseWord(pool, recent = [], random = Math.random) {
    const fresh = pool.filter(e => !recent.includes(e.word));
    const from = fresh.length ? fresh : pool;
    return from[Math.floor(random() * from.length)];
}

export function newGame(entry, settings, now = Date.now()) {
    return {
        word: entry.word,
        hint: entry.hint,
        category: entry.category,
        difficulty: settings.difficulty,
        mode: settings.mode,
        guessed: new Set(),
        mistakes: 0,
        usedHint: false,
        startedAt: now,
        endsAt: settings.mode === 'timed' ? now + TIMED_SECONDS * 1000 : null,
        outcome: null,
        seconds: 0,
        score: 0,
        breakdown: [],
    };
}

export const livesLeft = game => MAX_LIVES - game.mistakes;
export const isSolved = game => [...game.word].every(letter => game.guessed.has(letter));
const correctLetters = game => [...game.guessed].filter(letter => game.word.includes(letter)).length;

export function runningScore(game) {
    if (game.outcome) return game.score;
    return Math.max(0, correctLetters(game) * SCORING.correctLetter - (game.usedHint ? SCORING.hintCost : 0));
}

export function timeLeft(game, now = Date.now()) {
    return game.endsAt ? Math.max(0, Math.ceil((game.endsAt - now) / 1000)) : null;
}

// Returns 'correct', 'wrong' or null when the guess doesn't count.
export function guessLetter(game, letter, now = Date.now()) {
    letter = String(letter).toUpperCase();
    if (game.outcome || !/^[A-Z]$/.test(letter) || game.guessed.has(letter)) return null;
    game.guessed.add(letter);
    const hit = game.word.includes(letter);
    if (!hit) game.mistakes++;
    if (isSolved(game)) finish(game, 'win', now);
    else if (game.mistakes >= MAX_LIVES) finish(game, 'lose', now);
    return hit ? 'correct' : 'wrong';
}

export function useHint(game) {
    if (game.outcome || game.usedHint) return false;
    game.usedHint = true;
    return true;
}

export function checkTime(game, now = Date.now()) {
    if (game.outcome || !game.endsAt || now < game.endsAt) return false;
    finish(game, 'lose', now);
    return true;
}

function finish(game, outcome, now) {
    const secondsLeft = timeLeft(game, now) ?? 0;
    game.outcome = outcome;
    game.seconds = Math.round((now - game.startedAt) / 100) / 10;

    const lines = [['Letters found', correctLetters(game) * SCORING.correctLetter]];
    if (game.usedHint) lines.push(['Clue used', -SCORING.hintCost]);
    let total = lines.reduce((sum, [, points]) => sum + points, 0);

    if (outcome === 'win') {
        lines.push(['Word solved', SCORING.winBonus]);
        lines.push([`Lives left × ${SCORING.perLifeLeft}`, livesLeft(game) * SCORING.perLifeLeft]);
        if (game.endsAt) lines.push(['Time left', secondsLeft * SCORING.perSecondLeft]);
        total = lines.reduce((sum, [, points]) => sum + points, 0);
        const difficulty = DIFFICULTIES.find(d => d.id === game.difficulty);
        if (difficulty && difficulty.multiplier !== 1) {
            lines.push([`${difficulty.name} bonus × ${difficulty.multiplier}`, null]);
            total *= difficulty.multiplier;
        }
    }
    game.breakdown = lines;
    game.score = Math.max(0, Math.round(total));
}
