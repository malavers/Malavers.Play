// =========================================================
// audio.js
// Version: 1.2025.0714.2200.MAL
// =========================================================
import { SOUND_EFFECTS, SOUND_THEMES, BASE_SOUND_PATH } from "./config.js"

let audioContext = null;
let masterGainNode = null;
let soundBuffers = {};

export async function initializeAudio(soundPack) {
    if (audioContext) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGainNode = audioContext.createGain();
        masterGainNode.connect(audioContext.destination);
        if (!SOUND_THEMES.some(theme => theme.name === soundPack)) {
            console.warn(`Sound pack "${soundPack}" not found, falling back to default.`);
            soundPack = 'classic';
        }

        const soundPromises = Object.keys(SOUND_EFFECTS).map(async (soundId) => {
            const path = `${BASE_SOUND_PATH}/${soundPack}/${SOUND_EFFECTS[soundId]}`;
            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                soundBuffers[soundId] = await audioContext.decodeAudioData(arrayBuffer);
            } catch (error) {
                console.error(`Error loading sound "${soundId}" from ${path}:`, error);
            }
        });

        await Promise.all(soundPromises);
        console.log(`Audio initialized with sound pack: ${soundPack}`);
    } catch (error) {
        console.error('Failed to initialize audio context:', error);
        // Retry initialization after user interaction
        document.addEventListener('click', initializeAudio, { once: true });
    }
}

export function setMasterVolume(volume) {
    if (masterGainNode) {
        // Logarithmic scaling for volume
        const mappedVolume = volume === 0 ? 0 : Math.pow(10, (volume - 3) / 3);
        masterGainNode.gain.setValueAtTime(mappedVolume, audioContext.currentTime);
        console.log(`Master volume set to: ${mappedVolume}`);
    }
}

export function playSound(soundId, volume = 1) {
    if (!audioContext || !masterGainNode) {
        console.warn('Audio context not initialized.');
        return;
    }

    if (!(soundId in SOUND_EFFECTS)) {
        console.warn(`Sound "${soundId}" not found in SOUND_EFFECTS.`);
        return;
    }

    const buffer = soundBuffers[soundId];
    if (!buffer) {
        console.warn(`Sound buffer for "${soundId}" not loaded.`);
        return;
    }

    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        const gainNode = audioContext.createGain();
        // Apply volume scaling
        gainNode.gain.value = volume === 0 ? 0 : Math.pow(10, (volume - 3) / 3);
        source.connect(gainNode).connect(masterGainNode);
        source.start(0);
    } catch (error) {
        console.error(`Error playing sound "${soundId}":`, error);
    }
}
// line_number_83