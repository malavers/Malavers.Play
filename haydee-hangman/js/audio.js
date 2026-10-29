// audio.js: Web Audio playback. Browsers only allow sound after a tap, so
// unlock() is called from the first pointer or key press.

import { PATHS, SOUND_FILES, VOLUMES } from './config.js';

let context = null;
let master = null;
let buffers = {};
let loadedPack = null;

export async function unlock(pack, volume) {
    if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        context = new AudioContext();
        master = context.createGain();
        master.connect(context.destination);
    }
    if (context.state === 'suspended') await context.resume().catch(() => {});
    setVolume(volume);
    await loadPack(pack);
}

export async function loadPack(pack) {
    if (!context || pack === loadedPack) return;
    loadedPack = pack;
    const next = {};
    await Promise.all(Object.entries(SOUND_FILES).map(async ([id, file]) => {
        try {
            const response = await fetch(`${PATHS.sounds}/${pack}/${file}`);
            if (!response.ok) return;
            next[id] = await context.decodeAudioData(await response.arrayBuffer());
        } catch {
            // A missing sound is not worth interrupting the game for.
        }
    }));
    if (loadedPack === pack) buffers = next;
}

export function setVolume(volume) {
    if (!master) return;
    const gain = VOLUMES.find(v => v.id === volume)?.gain ?? 0.55;
    master.gain.setValueAtTime(gain, context.currentTime);
}

export function play(id) {
    const buffer = buffers[id];
    if (!context || !buffer || master.gain.value === 0) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(master);
    source.start();
}
