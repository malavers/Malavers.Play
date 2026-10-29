// ui.js: screens, controls and events. Entry point for the page.

import { ACCENTS, CATEGORIES, DIFFICULTIES, MAX_LIVES, MODES, PATHS, PICTURE_SETS, RECENT_WORDS_KEPT, SCORING, SOUND_PACKS, TIMED_SECONDS, VOLUMES } from './config.js';
import { getAchievements, getLeaderboard, getSettings, getStats, recordGame, resetProgress, updateSettings } from './gameData.js';
import { checkTime, chooseWord, guessLetter, livesLeft, loadPool, newGame, runningScore, timeLeft, useHint } from './hangman.js';
import * as Audio from './audio.js';

const $ = id => document.getElementById(id);
const SCREENS = ['home', 'play', 'settings', 'scores'];
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

let settings = getSettings();
let screen = null;
let game = null;
let pool = null;
let poolKey = '';
let loading = null;
let ticker = null;
const recent = [];

const nameOf = (list, id) => list.find(item => item.id === id)?.name ?? '';
const picture = (set, step) => `${PATHS.images}/${set}/${step}.png`;

function make(tag, props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children.filter(child => child !== null && child !== undefined));
    return node;
}

// ---------- Look ----------

function applyAccent() {
    const accent = ACCENTS.find(a => a.id === settings.accent) ?? ACCENTS[0];
    document.documentElement.style.setProperty('--accent-light', accent.light);
    document.documentElement.style.setProperty('--accent-dark', accent.dark);
}

let toastTimer = null;
function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 3500);
}

// ---------- Navigation ----------
// Screens follow the URL hash, so the phone's back button works.

function go(name) {
    if (location.hash === `#${name}`) route();
    else location.hash = name;
}

function route() {
    const name = SCREENS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
    if (name !== 'play') stopGame();
    screen = name;
    for (const id of SCREENS) $(`screen-${id}`).hidden = id !== name;
    window.scrollTo(0, 0);
    if (name === 'home') renderHome();
    if (name === 'settings') renderSettings();
    if (name === 'scores') renderScores();
    if (name === 'play' && !game) startGame();
}

// ---------- Home ----------

function categorySummary() {
    if (!settings.categories.length) return 'All categories';
    const names = settings.categories.map(id => nameOf(CATEGORIES, id));
    return names.length <= 2 ? names.join(' & ') : `${names[0]} + ${names.length - 1} more`;
}

function renderHome() {
    $('home-picture').src = picture(settings.pictures, 6);
    $('home-summary').textContent = `${nameOf(DIFFICULTIES, settings.difficulty)} · ${nameOf(MODES, settings.mode)} · ${categorySummary()}`;
    const stats = getStats();
    $('home-streak').textContent = stats.streak > 1 ? `${stats.streak} wins in a row. Keep it going!` : stats.played ? `${stats.wins} of ${stats.played} words found` : '';
}

// ---------- Play ----------

async function startGame() {
    $('result').hidden = true;
    const key = JSON.stringify([settings.categories, settings.difficulty]);
    if (!pool || key !== poolKey) {
        loading ??= loadPool(settings).then(words => { pool = words; poolKey = key; }).finally(() => { loading = null; });
        $('game-word').replaceChildren(make('span', { className: 'muted', textContent: 'Loading words…' }));
        await loading;
    }
    if (screen !== 'play') return;
    if (!pool.length) {
        toast("Couldn't load the words. Check your connection and try again.");
        go('home');
        return;
    }
    const entry = chooseWord(pool, recent);
    recent.push(entry.word);
    if (recent.length > RECENT_WORDS_KEPT) recent.shift();

    game = newGame(entry, settings);
    $('hint-text').hidden = true;
    $('hint-btn').hidden = false;
    $('hint-cost').textContent = `−${SCORING.hintCost}`;
    $('game-category').textContent = nameOf(CATEGORIES, game.category);
    $('game-timer').hidden = !game.endsAt;
    $('game-timer').classList.remove('low');
    buildKeyboard();
    renderGame();
    if (game.endsAt) {
        ticker = setInterval(onTick, 250);
        onTick();
    }
}

function stopGame() {
    clearInterval(ticker);
    ticker = null;
    game = null;
    $('result').hidden = true;
}

function buildKeyboard() {
    $('keyboard').replaceChildren(...KEY_ROWS.map(row => make('div', { className: 'key-row' },
        ...[...row].map(letter => make('button', { className: 'key', type: 'button', textContent: letter, value: letter, ariaLabel: letter })))));
}

function renderGame(lastLetter) {
    const lives = livesLeft(game);
    $('game-lives').ariaLabel = `${lives} of ${MAX_LIVES} lives left`;
    $('game-lives').replaceChildren(...Array.from({ length: MAX_LIVES }, (_, i) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `heart${i < lives ? '' : ' lost'}`);
        svg.innerHTML = '<use href="#i-heart"/>';
        return svg;
    }));

    $('game-picture').src = picture(settings.pictures, Math.min(game.mistakes, 6));
    $('game-score').textContent = runningScore(game);

    const word = $('game-word');
    word.style.setProperty('--n', game.word.length);
    word.ariaLabel = `${game.word.length} letters: ${[...game.word].map(l => (game.guessed.has(l) ? l : 'blank')).join(', ')}`;
    word.replaceChildren(...[...game.word].map(letter => {
        const found = game.guessed.has(letter);
        const missed = !found && game.outcome === 'lose';
        return make('span', {
            className: `tile${found ? ' found' : ''}${missed ? ' missed' : ''}${letter === lastLetter ? ' pop' : ''}`,
            textContent: found || missed ? letter : '',
        });
    }));

    for (const key of $('keyboard').querySelectorAll('.key')) {
        const used = game.guessed.has(key.value);
        const hit = used && game.word.includes(key.value);
        key.disabled = used || Boolean(game.outcome);
        key.classList.toggle('hit', hit);
        key.classList.toggle('miss', used && !hit);
        key.ariaLabel = used ? `${key.value}, ${hit ? 'in the word' : 'not in the word'}` : key.value;
    }
    $('hint-btn').disabled = Boolean(game.outcome);
}

function onGuess(letter) {
    if (screen !== 'play' || !game || game.outcome) return;
    const result = guessLetter(game, letter);
    if (!result) return;
    if (result === 'correct') {
        Audio.play('correct');
    } else {
        Audio.play('incorrect');
        if (settings.volume > 0) navigator.vibrate?.(40);
        $('game-lives').classList.remove('shake');
        void $('game-lives').offsetWidth;
        $('game-lives').classList.add('shake');
    }
    renderGame(letter);
    if (game.outcome) endGame();
}

function onTick() {
    if (!game) return;
    const left = timeLeft(game);
    $('game-timer').lastElementChild.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    $('game-timer').classList.toggle('low', left <= 10);
    if (checkTime(game)) {
        renderGame();
        endGame(true);
    }
}

function endGame(timedOut = false) {
    clearInterval(ticker);
    ticker = null;
    const finished = game;
    const { stats, unlocked } = recordGame({
        initials: settings.initials,
        score: finished.score,
        outcome: finished.outcome,
        word: finished.word.toLowerCase(),
        category: finished.category,
        difficulty: finished.difficulty,
        mode: finished.mode,
        seconds: finished.seconds,
        mistakes: finished.mistakes,
        usedHint: finished.usedHint,
    });
    Audio.play(finished.outcome === 'win' ? 'win' : 'lose');
    $('game-score').textContent = finished.score;
    setTimeout(() => {
        if (game === finished) showResult(finished, stats, unlocked, timedOut);
    }, 700);
}

function showResult(finished, stats, unlocked, timedOut) {
    const won = finished.outcome === 'win';
    $('result-title').textContent = won ? 'You got it!' : timedOut ? "Time's up" : 'Out of lives';
    $('result-word').textContent = finished.word;
    $('result-hint').textContent = finished.hint;
    $('result-breakdown').replaceChildren(...finished.breakdown.flatMap(([label, points]) => [
        make('dt', { textContent: label }),
        make('dd', { textContent: points === null ? '' : points > 0 ? `+${points}` : String(points) }),
    ]));
    $('result-score').textContent = finished.score;
    $('result-streak').textContent = won && stats.streak > 1 ? `${stats.streak} wins in a row!` : '';
    $('result-awards').replaceChildren(...unlocked.map(a => make('li', { textContent: `★ ${a.name}`, title: a.detail })));
    $('next-btn').textContent = won ? 'Next word' : 'Try another word';
    $('result').hidden = false;
    $('result').querySelector('.sheet').scrollTop = 0;
    $('next-btn').focus({ preventScroll: true });
}

function onHint() {
    if (!game || !useHint(game)) return;
    $('hint-text').textContent = game.hint;
    $('hint-text').hidden = false;
    $('hint-btn').hidden = true;
    $('game-score').textContent = runningScore(game);
}

// ---------- Settings ----------

function radios(containerId, name, options, render = option => option.name) {
    $(containerId).replaceChildren(...options.map(option => make('label', { className: 'option' },
        make('input', { type: 'radio', name, value: String(option.id) }),
        render(option))));
}

function buildSettings() {
    $('set-categories').replaceChildren(
        make('label', { className: 'chip' }, make('input', { type: 'checkbox', name: 'category', value: 'all' }), make('span', { textContent: 'All' })),
        ...CATEGORIES.map(c => make('label', { className: 'chip' },
            make('input', { type: 'checkbox', name: 'category', value: c.id }), make('span', { textContent: c.name }))));
    radios('set-difficulty', 'difficulty', DIFFICULTIES, d => make('span', { textContent: d.name }));
    radios('set-mode', 'mode', MODES, m => make('span', { textContent: m.name }));
    radios('set-volume', 'volume', VOLUMES, v => make('span', { textContent: v.name }));
    radios('set-sound', 'soundPack', SOUND_PACKS, p => make('span', { textContent: p.name }));
    radios('set-accent', 'accent', ACCENTS, a => make('span', { className: 'swatch-label' },
        make('span', { className: 'swatch', style: `--light:${a.light};--dark:${a.dark}` }), a.name));
    radios('set-pictures', 'pictures', PICTURE_SETS, p => make('span', { className: 'picture-option' },
        make('img', { src: picture(p.id, 6), alt: '', loading: 'lazy' }), p.name));
    radios('board-filter', 'board', [{ id: 'all', name: 'All' }, ...MODES], m => make('span', { textContent: m.name }));
    $('board-filter').querySelector('input').checked = true;
}

function renderSettings() {
    const form = $('settings-form');
    for (const input of form.querySelectorAll('input[type=radio]')) input.checked = String(settings[input.name]) === input.value;
    for (const input of form.querySelectorAll('input[name=category]')) {
        input.checked = input.value === 'all' ? !settings.categories.length : settings.categories.includes(input.value);
    }
    $('set-initials').value = settings.initials;
    $('mode-note').textContent = settings.mode === 'timed'
        ? `${TIMED_SECONDS} seconds per word, with a bonus point for every second left.`
        : 'No clock. Take your time.';
}

function onSettingsChange(event) {
    const input = event.target;
    let changes;
    if (input.name === 'category') {
        let chosen = input.value === 'all' ? [] : [...settings.categories];
        if (input.value !== 'all') {
            chosen = input.checked ? [...chosen, input.value] : chosen.filter(id => id !== input.value);
        }
        changes = { categories: chosen };
    } else if (input.name === 'initials') {
        input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
        changes = { initials: input.value };
    } else if (input.type === 'radio') {
        changes = { [input.name]: input.name === 'volume' ? Number(input.value) : input.value };
    } else {
        return;
    }
    const before = settings;
    settings = updateSettings(changes);
    if (input.name !== 'initials') renderSettings();
    if (settings.accent !== before.accent) applyAccent();
    if (settings.volume !== before.volume) Audio.setVolume(settings.volume);
    if (settings.soundPack !== before.soundPack) Audio.loadPack(settings.soundPack).then(() => Audio.play('correct'));
    else if (input.name === 'volume') Audio.play('correct');
}

// ---------- Scores ----------

function renderScores() {
    const stats = getStats();
    const tiles = [
        ['Played', stats.played], ['Won', stats.wins], ['Win rate', `${stats.winRate}%`],
        ['Streak', stats.streak], ['Best streak', stats.bestStreak], ['Best score', stats.bestScore],
    ];
    $('stats').replaceChildren(...tiles.map(([label, value]) => make('div', { className: 'stat' },
        make('dt', { textContent: label }), make('dd', { textContent: String(value) }))));

    renderBoard();

    const awards = getAchievements(stats);
    $('awards-count').textContent = `${awards.filter(a => a.unlocked).length} of ${awards.length}`;
    $('awards').replaceChildren(...awards.map(a => make('li', { className: a.unlocked ? 'unlocked' : '' },
        make('strong', { textContent: a.name }),
        make('span', { textContent: a.detail }),
        a.unlocked ? null : make('progress', { max: a.target, value: a.progress, ariaLabel: `${a.progress} of ${a.target}` }))));
}

function renderBoard() {
    const mode = $('board-filter').querySelector('input:checked')?.value ?? 'all';
    const entries = getLeaderboard(mode);
    $('board').replaceChildren(...(entries.length ? entries.map(e => make('li', {},
        make('span', { className: 'board-initials', textContent: e.initials || '—' }),
        make('span', { className: 'board-word', textContent: e.word ?? '' }),
        make('span', { className: 'board-score', textContent: String(e.score) }))) : [make('li', { className: 'empty', textContent: 'No wins yet. Play a game!' })]));
}

function onReset(event) {
    const button = event.currentTarget;
    if (button.dataset.armed !== 'true') {
        button.dataset.armed = 'true';
        button.textContent = 'Tap again to delete all scores';
        setTimeout(() => {
            button.dataset.armed = 'false';
            button.textContent = 'Reset scores and awards';
        }, 4000);
        return;
    }
    button.dataset.armed = 'false';
    button.textContent = 'Reset scores and awards';
    resetProgress();
    renderScores();
    toast('Scores and awards cleared.');
}

// ---------- Wiring ----------

function init() {
    applyAccent();
    buildSettings();

    document.addEventListener('click', event => {
        const target = event.target.closest('[data-go], [data-action]');
        if (!target) return;
        if (target.dataset.go) go(target.dataset.go);
        if (target.dataset.action === 'play') go('play');
    });
    $('keyboard').addEventListener('click', event => {
        const key = event.target.closest('.key');
        if (key) onGuess(key.value);
    });
    $('hint-btn').addEventListener('click', onHint);
    $('next-btn').addEventListener('click', startGame);
    $('settings-form').addEventListener('change', onSettingsChange);
    $('set-initials').addEventListener('input', onSettingsChange);
    $('board-filter').addEventListener('change', renderBoard);
    $('reset-btn').addEventListener('click', onReset);

    document.addEventListener('keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.target.matches('input')) return;
        if (screen === 'play' && !$('result').hidden && event.key === 'Enter') {
            event.preventDefault();
            startGame();
        } else if (screen !== 'home' && event.key === 'Escape') {
            go('home');
        } else if (screen === 'play' && /^[a-z]$/i.test(event.key)) {
            onGuess(event.key);
        }
    });

    // Browsers only allow sound after the first tap or key press.
    const unlockAudio = () => Audio.unlock(settings.soundPack, settings.volume);
    document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
    document.addEventListener('keydown', unlockAudio, { once: true, capture: true });

    window.addEventListener('hashchange', route);
    route();
}

init();
