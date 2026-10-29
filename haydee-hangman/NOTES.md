# Haydee Hangman

Hangman where each wrong letter grows a picture (butterfly, robot or tree) instead of hanging someone. 8 word categories, Easy / Normal / Hard, Relaxed or Timed, stats, awards and a leaderboard on the device.

| | |
|---|---|
| Play | https://malavers.github.io/Malavers.Play/haydee-hangman/ |
| Players | Haydee, then other family members |
| Saves | Browser `localStorage` on each device: `hangman_settings` and `hangman_game_history`. Falls back to memory when storage is blocked. |
| Source | Imported 2026-10-29 from `Malavers.Games/Haydee Hangman/app` (unversioned), redesigned the same day |

## Layout

| File | Job |
|---|---|
| `index.html` | Four screens (Home, Play, Settings, Scores), the result sheet and a toast |
| `css/styles.css` | Design tokens; light/dark follow the phone; the player picks one accent colour |
| `js/config.js` | Categories, difficulties, scoring, accents, awards |
| `js/hangman.js` | Rules and scoring, no DOM (testable in Node) |
| `js/gameData.js` | Saves; stats and awards are derived from the history |
| `js/audio.js` | Web Audio, unlocked on the first tap |
| `js/ui.js` | Screens and events; entry point. Screens follow the URL hash (`#play`, `#settings`, `#scores`) so the phone's back button works |

## Rules

- 6 lives. Score: 10 per letter found, 50 for solving, 10 per life left, 1 per second left (Timed, 90 s per word), minus 20 for the clue. Normal ×1.5, Hard ×2. Never below 0.
- Word files group words by length (level 1: up to 4 letters, 3: 5–6, 5: 7+). Easy and Hard top up thin categories with 5- or 6-letter words, so every category has at least 12 words per difficulty.
- The last 30 words are not repeated.
- Physical keyboard: letters guess, Enter = next word, Escape = home.

## Redesign (2026-10-29)

- One Play button on Home; no duplicate nav bar. Settings are cards with segmented controls, category chips, named colours and picture previews.
- QWERTY keyboard with ~48 px keys that turn green (in the word) or fade (not in the word). The whole game fits a 375×667 screen without scrolling.
- The clue stays on screen. The result sheet shows the word, its clue, a score breakdown, streak and new awards, with **Next word** as the main action.
- 24 colour themes replaced by automatic light/dark plus 6 contrast-checked accents. Picture backgrounds made transparent and resized (2.2 MB → 0.8 MB).
- Fixed: physical-keyboard guesses all marked wrong; Easy halving scores; "No-Hint Wins" counting every win; sound pack changes needing a reload; double volume scaling; Rush mode dropped (it was Timed with a shorter clock, and old Rush scores count as Timed).
- Word lists: 16 duplicates removed, `zepplin` → `zeppelin`.
- Version-1 saves (numeric difficulty, categories and themes) are converted on load.

## Testing

Tested in Node (rules, scoring, saves, migration) and in headless Edge at 390×844 and 375×667, light and dark: full games won and lost, Timed, clue, keyboard input, settings, scores. Touch feel still needs a real phone.

## Ideas

- A shared family leaderboard would need a backend, which is out of scope.
- No service worker, so the game needs a connection to load.
