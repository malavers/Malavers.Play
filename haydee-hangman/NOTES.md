# Haydee Hangman

Classic hangman with 8 word categories, 3 picture sets, 3 sound packs, 24 colour themes, stats, achievements and a local leaderboard.

| | |
|---|---|
| Play | https://malavers.github.io/Malavers.Play/haydee-hangman/ |
| Players | Haydee, then other family members |
| Saves | Browser `localStorage` on each device (settings, history, achievements). Falls back to memory when storage is blocked. |
| Source | Imported 2026-10-29 from `Malavers.Games/Haydee Hangman/app` (unversioned) |

## Publishing

Hosted by GitHub Pages from this public repo: push to `main` and it goes live. Home-screen install uses `manifest.json` and the icons in `resources/icons/`. There is no service worker, so the game needs a connection to load.

An artifact copy briefly went to the work Claude account by mistake on 2026-10-29 and was deleted. Games are not published as artifacts.

## Port Changes (2026-10-29)

- Root-absolute `/resources/...` paths made relative.
- Removed the service worker and the unused Font Awesome stylesheet; achievement icons are now plain symbols. The PWA manifest is back with relative paths, for home-screen install.
- `index.js` called UI functions that didn't exist; it now only starts audio on the first tap, using the chosen sound pack.
- `ui.js` initialises even when the page has already loaded.
- **Reset Stats** uses tap-twice-to-confirm, because `confirm()` is blocked in artifacts.
- `localStorage` is guarded with an in-memory fallback.
- Difficulty 2 and 4 now use the nearest word list (the lists only define 1, 3 and 5); previously every game fell back to the word "HANGMAN".
- Timed and Rush modes now use their configured 3:00 and 2:00 durations instead of a 60-second fallback.
- Removed the unwinnable movie `se7en`.

## Known Issues / Ideas

- On narrow phones the keyboard is 4 columns × 7 rows. A QWERTY layout would be shorter.
- The leaderboard is per device. A shared family leaderboard would need a backend, which is out of scope for now.
- Some word lists have duplicates (e.g. `lisbon`, `paella`) and a misspelling (`zepplin`).
