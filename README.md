# Malavers.Play

Small phone games for the family, hosted free on GitHub Pages: **https://malavers.github.io/Malavers.Play/**

This repo is **public**. Put only finished games here; no personal notes or family details beyond a game's name. Scores and settings are saved in each player's browser, never in the repo.

## Games

| Game | Play | Notes |
|---|---|---|
| Haydee Hangman | [haydee-hangman/](https://malavers.github.io/Malavers.Play/haydee-hangman/) | [NOTES.md](haydee-hangman/NOTES.md) |

## Adding a Game

1. Create a folder `<game-name>/` with its own `index.html`, using relative paths only.
2. Plain HTML, CSS and JavaScript, with JSON data and `localStorage` saves guarded by `try/catch`. No build step and no backend.
3. Phone-first: portrait, thumb-sized buttons, playable in 1–3 minutes.
4. Add a card to the root `index.html` and a row to the table above.
5. Commit and push. Pages republishes within a minute or two.

## Hosting

Set up once under **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`. `.nojekyll` makes Pages serve the files exactly as they are.
