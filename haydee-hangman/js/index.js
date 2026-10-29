/* index.js */
/* Version: 1.2026.1029.MAL — artifact port: UI boots itself in ui.js; no service worker. */

import './ui.js';
import * as Audio from './audio.js';
import * as Storage from './gameData.js';

// Browsers only allow audio after the player interacts, so load the chosen sound pack on the first tap.
// Capture phase runs this before button handlers, so the player's sound pack wins over the default.
function handleFirstUserInteraction() {
    const settings = Storage.getSettings();
    Audio.initializeAudio(settings.soundPack).then(() => {
        Audio.setMasterVolume(settings.volume);
    });
}

document.addEventListener('pointerdown', handleFirstUserInteraction, { once: true, capture: true });
document.addEventListener('keydown', handleFirstUserInteraction, { once: true, capture: true });
