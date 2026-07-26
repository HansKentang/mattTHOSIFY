// =========================================
// MATTHOSIFY FL STUDIO - Beat Maker
// Channel Rack, Transport, Pattern System, Mixer
// =========================================

// ---- FL Studio State ----
const FL = {
  bpm: 130,
  swing: 0,
  stepLen: 16,
  currStep: 0,
  isPlaying: false,
  isRecording: false,
  patternMode: false,
  masterVol: 80,
  currPattern: 1,
  patterns: { 1: [] },
  interval: null,
  audioCtx: null,
  _initialized: false,
  currentKit: 'hiphop',
  // Custom samples storage: trackId -> { name: 'filename.wav', data: base64ArrayBuffer, decoded: AudioBuffer|null }
  customSamples: {},

  // tracks is dynamically set based on currentKit (see updateFLKitTracks)
  tracks: [],

  // ---- Piano Roll / Melody State ----
  viewMode: 'drums', // 'drums' | 'piano-roll'
  selectedMelodyTrack: 0,

  melodyTracks: [
    { id: 'melody_bass',  label: 'Bass',  color: '#ffcc00', synth: { type: 'sawtooth', filter: 'lowpass', cutoff: 300, env: { a: 0.02, d: 0.15, s: 0.5, r: 0.2 } } },
    { id: 'melody_synth', label: 'Synth', color: '#4fc3f7', synth: { type: 'square',    filter: 'lowpass', cutoff: 800, env: { a: 0.01, d: 0.1, s: 0.6, r: 0.15 } } },
    { id: 'melody_lead',  label: 'Lead',  color: '#ff6b6b', synth: { type: 'sawtooth',  filter: 'highpass', cutoff: 1200, env: { a: 0.01, d: 0.08, s: 0.5, r: 0.1 } } },
    { id: 'melody_pad',   label: 'Pad',   color: '#a29bfe', synth: { type: 'sine',      filter: 'lowpass', cutoff: 600, env: { a: 0.05, d: 0.2, s: 0.7, r: 0.4 } } },
  ],

  // melodyNotes[patternId][trackId] = [{pitch: MIDI, step: 0-15, length: 1+, velocity: 0-100}]
  melodyNotes: {},
};

// ---- Piano Roll - Note name helpers ----
const FL_NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function flMidiToName(pitch) {
  const oct = Math.floor(pitch / 12) - 1;
  const note = FL_NOTE_NAMES[pitch % 12];
  return note + oct;
}

function flMidiToFreq(pitch) {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

// ---- Initialize ----
function initFLPatterns() {
  // Update tracks from current kit first
  updateFLKitTracks(FL.currentKit);
  // Initialize pattern 1 with empty steps
  FL.patterns[1] = FL.tracks.map(t => ({
    ...t,
    steps: new Array(FL.stepLen).fill(0),
    vol: t.vol,
    pan: t.pan || 0,
    mute: false,
    solo: false
  }));
  FL.currPattern = 1;
  // Initialize melody notes for pattern 1
  initFLMelodyNotes(1);
}

function initFLMelodyNotes(patternId) {
  if (!FL.melodyNotes[patternId]) {
    FL.melodyNotes[patternId] = {};
    FL.melodyTracks.forEach(t => {
      FL.melodyNotes[patternId][t.id] = [];
    });
  }
}

function getFLMelodyNotes() {
  const pid = FL.currPattern;
  if (!FL.melodyNotes[pid]) initFLMelodyNotes(pid);
  return FL.melodyNotes[pid];
}

function getFLMelodyTrackNotes(trackId) {
  const notes = getFLMelodyNotes();
  if (!notes[trackId]) notes[trackId] = [];
  return notes[trackId];
}

// ---- Stargate DAW Sample URLs (Public Domain) ----
// Source: https://github.com/stargatedaw/stargate-sample-pack
const FL_STARGATE_BASE = 'https://raw.githubusercontent.com/stargatedaw/stargate-sample-pack/main/';
// Pearl Master Studio acoustic drums (CC0)
// Source: https://oramics.github.io/sampled/DRUMS/pearl-master-studio/
const FL_PEARL_BASE = 'https://raw.githubusercontent.com/Oramics/sampled/master/';

// Default base URL (Stargate)
let FL_SAMPLE_BASE = FL_STARGATE_BASE;

// ---- Sample Kits (Genre-based) ----
// Percussion/fills tracks that stay consistent across kits
const FL_KIT_FILLS = {
  shaker:  FL_STARGATE_BASE + 'stargate-sample-pack/fugue-state-audio/drums/percussion/x0xproc2-maracas.wav',
  tamb:    FL_STARGATE_BASE + 'stargate-sample-pack/fugue-state-audio/drums/percussion/distkit-cowbell.wav',
  cowbell: FL_STARGATE_BASE + 'stargate-sample-pack/fugue-state-audio/drums/percussion/x0xproc2-cowbell.wav',
  conga:   FL_STARGATE_BASE + 'stargate-sample-pack/freesound/drums/bongo/219157__jagadamba__bongo01.wav',
  bongo:   FL_STARGATE_BASE + 'stargate-sample-pack/freesound/drums/bongo/99752__menegass__bongo2.wav',
  maracas: FL_STARGATE_BASE + 'stargate-sample-pack/fugue-state-audio/drums/percussion/x0xproc2-claves.wav',
};

// Genre-themed drum kits with real samples
// Each kit uses samples from a different SOURCE for truly distinct sound
// Sources: Stargate DAW (electronic), LM-2 LinnDrum (classic 80s), CR-78 (vintage analog), Pearl acoustic, AVL drums
const FL_KITS = {
  // === GENRE KITS ===
  'hiphop': {
    label: '🎤 Hip Hop',
    desc: 'Classic LM-2 LinnDrum · Crisp electro-funk beats',
    baseUrl: FL_PEARL_BASE,
    prefix: '',
    map: {
      kick:    'DM/LM-2/samples/kick.wav',
      snare:   'DM/LM-2/samples/snare-m.wav',
      hihat_c: 'DM/LM-2/samples/hihat-closed-short.wav',
      hihat_o: 'DM/LM-2/samples/hihat-open.wav',
      clap:    'DM/LM-2/samples/clap.wav',
      snare2:  'DM/LM-2/samples/snare-h.wav',
      tom_h:   'DM/LM-2/samples/tom-h.wav',
      tom_m:   'DM/LM-2/samples/tom-m.wav',
      tom_l:   'DM/LM-2/samples/tom-l.wav',
      crash:   'DM/LM-2/samples/crash.wav',
      ride:    'DM/LM-2/samples/ride.wav',
    }
  },
  'rock': {
    label: '🎸 Rock',
    desc: 'Big Ludwig kick + Pearl acoustic · Live drum energy',
    baseUrl: FL_PEARL_BASE,
    prefix: '',
    map: {
      kick:    'DRUMS/avl-drumkits-1.1/36-Ludwig26Kick-1.wav',
      snare:   'DRUMS/pearl-master-studio/samples/snare-02.wav',
      hihat_c: 'DRUMS/pearl-master-studio/samples/hihat-closed.wav',
      hihat_o: 'DRUMS/pearl-master-studio/samples/hihat-open.wav',
      clap:    'DRUMS/pearl-master-studio/samples/splash-01.wav',
      snare2:  'DRUMS/pearl-master-studio/samples/snare-01.wav',
      tom_h:   'DRUMS/pearl-master-studio/samples/tom-01.wav',
      tom_m:   'DRUMS/pearl-master-studio/samples/tom-02.wav',
      tom_l:   'DRUMS/pearl-master-studio/samples/tom-03.wav',
      crash:   'DRUMS/pearl-master-studio/samples/crash-01.wav',
      ride:    'DRUMS/pearl-master-studio/samples/ride-01.wav',
    }
  },
  'phonk': {
    label: '🔊 Phonk',
    desc: 'Distorted 808s + CR-78 cowbell · Memphis phonk vibes',
    baseUrl: FL_STARGATE_BASE,
    prefix: 'stargate-sample-pack/',
    map: {
      kick:    'fugue-state-audio/drums/kicks/distkit-kick.wav',
      snare:   'fugue-state-audio/drums/snares/distkit-snare.wav',
      hihat_c: 'fugue-state-audio/drums/hihats/distkit-hatclsd.wav',
      hihat_o: 'fugue-state-audio/drums/hihats/distkit-hatopen.wav',
      clap:    'fugue-state-audio/drums/claps/distkit-clap.wav',
      snare2:  'fugue-state-audio/drums/snares/x0xproc1-snare.wav',
      tom_h:   'fugue-state-audio/drums/toms/distkit-hitom.wav',
      tom_m:   'fugue-state-audio/drums/toms/distkit-midtom.wav',
      tom_l:   'fugue-state-audio/drums/toms/distkit-lotom.wav',
      crash:   'fugue-state-audio/drums/cymbals/distkit-crash.wav',
      ride:    'fugue-state-audio/drums/cymbals/distkit-ride.wav',
    }
  },
  'electronic': {
    label: '⚡ Electronic',
    desc: 'Clean synth drums · Punchy EDM production',
    baseUrl: FL_STARGATE_BASE,
    prefix: 'stargate-sample-pack/',
    map: {
      kick:    'fugue-state-audio/drums/kicks/synthkit-kick.wav',
      snare:   'fugue-state-audio/drums/snares/synthkit-snare.wav',
      hihat_c: 'fugue-state-audio/drums/hihats/synthkit-hatclsd.wav',
      hihat_o: 'fugue-state-audio/drums/hihats/synthkit-hatopen.wav',
      clap:    'fugue-state-audio/drums/claps/synthkit-clap.wav',
      snare2:  'fugue-state-audio/drums/snares/x0xproc2-snare.wav',
      tom_h:   'fugue-state-audio/drums/toms/synthkit-hitom.wav',
      tom_m:   'fugue-state-audio/drums/toms/synthkit-midtom.wav',
      tom_l:   'fugue-state-audio/drums/toms/synthkit-lotom.wav',
      crash:   'fugue-state-audio/drums/cymbals/synthkit-crash.wav',
      ride:    'fugue-state-audio/drums/cymbals/synthkit-ride.wav',
    }
  },
  'lofi': {
    label: '☕ Lo-Fi',
    desc: 'Vintage CR-78 analog · Warm lo-fi character',
    baseUrl: FL_PEARL_BASE,
    prefix: '',
    map: {
      kick:    'DM/CR-78/samples/kick.wav',
      snare:   'DM/CR-78/samples/snare.wav',
      hihat_c: 'DM/CR-78/samples/hihat.wav',
      hihat_o: 'DM/CR-78/samples/hihat-accent.wav',
      clap:    'DM/CR-78/samples/rim.wav',
      snare2:  'DM/CR-78/samples/snare-accent.wav',
      tom_h:   'DRUMS/pearl-master-studio/samples/tom-01.wav',
      tom_m:   'DRUMS/pearl-master-studio/samples/tom-02.wav',
      tom_l:   'DRUMS/pearl-master-studio/samples/tom-03.wav',
      crash:   'DM/CR-78/samples/cymbal.wav',
      ride:    'DM/CR-78/samples/guiro-long.wav',
    }
  },
  'trap': {
    label: '⛓ Trap',
    desc: '909-style machine · Rolling hi-hats & heavy 808s',
    baseUrl: FL_STARGATE_BASE,
    prefix: 'stargate-sample-pack/',
    map: {
      kick:    'fugue-state-audio/drums/kicks/x0xproc2-kick.wav',
      snare:   'fugue-state-audio/drums/snares/x0xproc2-snare.wav',
      hihat_c: 'fugue-state-audio/drums/hihats/x0xproc2-hatclsd.wav',
      hihat_o: 'fugue-state-audio/drums/hihats/x0xproc2-hatopen.wav',
      clap:    'fugue-state-audio/drums/claps/x0xproc2-clap.wav',
      snare2:  'fugue-state-audio/drums/snares/synthkit-snare.wav',
      tom_h:   'fugue-state-audio/drums/toms/x0xproc2-hitom.wav',
      tom_m:   'fugue-state-audio/drums/toms/x0xproc2-midtom.wav',
      tom_l:   'fugue-state-audio/drums/toms/x0xproc2-lotom.wav',
      crash:   'fugue-state-audio/drums/cymbals/x0xproc2-cymbal.wav',
      ride:    'fugue-state-audio/drums/cymbals/x0xproc1-ride.wav',
    }
  },
  'jazz': {
    label: '🎷 Jazz',
    desc: 'Soft Pearl acoustic + LM-2 ride · Smooth & nuanced',
    baseUrl: FL_PEARL_BASE,
    prefix: '',
    map: {
      kick:    'DRUMS/pearl-master-studio/samples/kick-01.wav',
      snare:   'DRUMS/pearl-master-studio/samples/snare-01.wav',
      hihat_c: 'DRUMS/pearl-master-studio/samples/hihat-closed.wav',
      hihat_o: 'DRUMS/pearl-master-studio/samples/hihat-open.wav',
      clap:    'DRUMS/pearl-master-studio/samples/splash-02.wav',
      snare2:  'DM/LM-2/samples/snare-l.wav',
      tom_h:   'DRUMS/pearl-master-studio/samples/tom-01.wav',
      tom_m:   'DRUMS/pearl-master-studio/samples/tom-02.wav',
      tom_l:   'DRUMS/pearl-master-studio/samples/tom-03.wav',
      ride:    'DM/LM-2/samples/ride.wav',
      crash:   'DRUMS/pearl-master-studio/samples/crash-02.wav',
    }
  },
  // === LEGACY KITS (kept for backward compatibility) ===
  'synthkit': {
    label: '🔊 Synth Kit',
    desc: 'Modern synthesized electronic drums',
    baseUrl: FL_STARGATE_BASE,
    prefix: 'stargate-sample-pack/',
    map: {
      kick:    'fugue-state-audio/drums/kicks/synthkit-kick.wav',
      snare:   'fugue-state-audio/drums/snares/synthkit-snare.wav',
      hihat_c: 'fugue-state-audio/drums/hihats/synthkit-hatclsd.wav',
      hihat_o: 'fugue-state-audio/drums/hihats/synthkit-hatopen.wav',
      clap:    'fugue-state-audio/drums/claps/synthkit-clap.wav',
      snare2:  'fugue-state-audio/drums/snares/x0xproc1-snare.wav',
      tom_h:   'fugue-state-audio/drums/toms/synthkit-hitom.wav',
      tom_m:   'fugue-state-audio/drums/toms/synthkit-midtom.wav',
      tom_l:   'fugue-state-audio/drums/toms/synthkit-lotom.wav',
      crash:   'fugue-state-audio/drums/cymbals/synthkit-crash.wav',
      ride:    'fugue-state-audio/drums/cymbals/synthkit-ride.wav',
    }
  },
  'distkit': {
    label: '⚡ Dist Kit',
    desc: 'Aggressive distorted drums',
    baseUrl: FL_STARGATE_BASE,
    prefix: 'stargate-sample-pack/',
    map: {
      kick:    'fugue-state-audio/drums/kicks/distkit-kick.wav',
      snare:   'fugue-state-audio/drums/snares/distkit-snare.wav',
      hihat_c: 'fugue-state-audio/drums/hihats/distkit-hatclsd.wav',
      hihat_o: 'fugue-state-audio/drums/hihats/distkit-hatopen.wav',
      clap:    'fugue-state-audio/drums/claps/distkit-clap.wav',
      snare2:  'fugue-state-audio/drums/snares/x0xproc2-snare.wav',
      tom_h:   'fugue-state-audio/drums/toms/distkit-hitom.wav',
      tom_m:   'fugue-state-audio/drums/toms/distkit-midtom.wav',
      tom_l:   'fugue-state-audio/drums/toms/distkit-lotom.wav',
      crash:   'fugue-state-audio/drums/cymbals/distkit-crash.wav',
      ride:    'fugue-state-audio/drums/cymbals/distkit-ride.wav',
    }
  },
  'sdbkit': {
    label: '🥁 Standard Kit',
    desc: 'Standard acoustic-ish samples',
    baseUrl: FL_STARGATE_BASE,
    prefix: 'stargate-sample-pack/',
    map: {
      kick:    'fugue-state-audio/drums/kicks/sdbkit-kick.wav',
      snare:   'fugue-state-audio/drums/snares/sdbkit-snare.wav',
      hihat_c: 'fugue-state-audio/drums/hihats/sdbkit-hatclsd.wav',
      hihat_o: 'fugue-state-audio/drums/hihats/sdbkit-hatopen.wav',
      clap:    'fugue-state-audio/drums/claps/sdbkit-clap.wav',
      snare2:  'fugue-state-audio/drums/snares/distkit-snare.wav',
      tom_h:   'fugue-state-audio/drums/toms/sdbkit-hitom.wav',
      tom_m:   'fugue-state-audio/drums/toms/sdbkit-midtom.wav',
      tom_l:   'fugue-state-audio/drums/toms/sdbkit-lotom.wav',
    }
  },
  'x0xproc1': {
    label: '🎛 808 Machine',
    desc: 'Classic Roland 808 drum machine',
    baseUrl: FL_STARGATE_BASE,
    prefix: 'stargate-sample-pack/',
    map: {
      kick:    'fugue-state-audio/drums/kicks/x0xproc1-kick.wav',
      snare:   'fugue-state-audio/drums/snares/x0xproc1-snare.wav',
      hihat_c: 'fugue-state-audio/drums/hihats/x0xproc1-hatclsd.wav',
      hihat_o: 'fugue-state-audio/drums/hihats/x0xproc1-hatopen.wav',
      clap:    'fugue-state-audio/drums/claps/x0xproc1-clap.wav',
      snare2:  'fugue-state-audio/drums/snares/x0xproc2-snare.wav',
      tom_h:   'fugue-state-audio/drums/toms/x0xproc1-hitom.wav',
      tom_m:   'fugue-state-audio/drums/toms/x0xproc1-midtom.wav',
      tom_l:   'fugue-state-audio/drums/toms/x0xproc1-lotom.wav',
      crash:   'fugue-state-audio/drums/cymbals/x0xproc1-crash.wav',
      ride:    'fugue-state-audio/drums/cymbals/x0xproc1-ride.wav',
    }
  },
  'x0xproc2': {
    label: '🎛 909 Machine',
    desc: 'Classic Roland 909 drum machine',
    baseUrl: FL_STARGATE_BASE,
    prefix: 'stargate-sample-pack/',
    map: {
      kick:    'fugue-state-audio/drums/kicks/x0xproc2-kick.wav',
      snare:   'fugue-state-audio/drums/snares/x0xproc2-snare.wav',
      hihat_c: 'fugue-state-audio/drums/hihats/x0xproc2-hatclsd.wav',
      hihat_o: 'fugue-state-audio/drums/hihats/x0xproc2-hatopen.wav',
      clap:    'fugue-state-audio/drums/claps/x0xproc2-clap.wav',
      snare2:  'fugue-state-audio/drums/snares/distkit-snare.wav',
      tom_h:   'fugue-state-audio/drums/toms/x0xproc2-hitom.wav',
      tom_m:   'fugue-state-audio/drums/toms/x0xproc2-midtom.wav',
      tom_l:   'fugue-state-audio/drums/toms/x0xproc2-lotom.wav',
      crash:   'fugue-state-audio/drums/cymbals/x0xproc2-cymbal.wav',
    }
  }
};

// ---- Per-Kit Track Definitions ----
// Each kit shows only the instruments that match its genre
const FL_KIT_TRACKS = {
  'hiphop': [
    { id: 'kick',    label: 'Kick',      short: 'Kk', color: '#FF6B6B', vol: 85, pan: 0 },
    { id: 'snare',   label: 'Snare',     short: 'Sn', color: '#FECA57', vol: 75, pan: 0 },
    { id: 'hihat_c', label: 'Hi-Hat',    short: 'HH', color: '#48DBFB', vol: 65, pan: 0 },
    { id: 'hihat_o', label: 'Open Hat',  short: 'HO', color: '#0ABDE3', vol: 55, pan: 0 },
    { id: 'clap',    label: 'Clap',      short: 'Cp', color: '#FF9FF3', vol: 70, pan: 0 },
    { id: 'snare2',  label: 'Snare 2',   short: 'S2', color: '#F368E0', vol: 65, pan: 0 },
    { id: 'bass808', label: '808 Bass',  short: 'B8', color: '#C44569', vol: 80, pan: 0, synth: true },
  ],
  'rock': [
    { id: 'kick',    label: 'Kick',      short: 'Kk', color: '#FF6B6B', vol: 85, pan: 0 },
    { id: 'snare',   label: 'Snare',     short: 'Sn', color: '#FECA57', vol: 75, pan: 0 },
    { id: 'hihat_c', label: 'Hi-Hat',    short: 'HH', color: '#48DBFB', vol: 65, pan: 0 },
    { id: 'hihat_o', label: 'Open Hat',  short: 'HO', color: '#0ABDE3', vol: 55, pan: 0 },
    { id: 'crash',   label: 'Crash',     short: 'Cr', color: '#F368E0', vol: 50, pan: 0 },
    { id: 'ride',    label: 'Ride',      short: 'Rd', color: '#C44569', vol: 45, pan: 0 },
    { id: 'tom_h',   label: 'Tom Hi',    short: 'TH', color: '#54A0FF', vol: 55, pan: 0 },
    { id: 'tom_m',   label: 'Tom Mid',   short: 'TM', color: '#2E86DE', vol: 55, pan: 0 },
    { id: 'tom_l',   label: 'Tom Lo',    short: 'TL', color: '#1B4F72', vol: 55, pan: 0 },
  ],
  'phonk': [
    { id: 'kick',    label: 'Kick',      short: 'Kk', color: '#FF6B6B', vol: 85, pan: 0 },
    { id: 'snare',   label: 'Snare',     short: 'Sn', color: '#FECA57', vol: 75, pan: 0 },
    { id: 'hihat_c', label: 'Hi-Hat',    short: 'HH', color: '#48DBFB', vol: 65, pan: 0 },
    { id: 'hihat_o', label: 'Open Hat',  short: 'HO', color: '#0ABDE3', vol: 55, pan: 0 },
    { id: 'cowbell', label: 'Cowbell',   short: 'Cb', color: '#E17055', vol: 60, pan: 0 },
    { id: 'bass808', label: '808 Bass',  short: 'B8', color: '#C44569', vol: 80, pan: 0, synth: true },
  ],
  'electronic': [
    { id: 'kick',    label: 'Kick',      short: 'Kk', color: '#FF6B6B', vol: 85, pan: 0 },
    { id: 'snare',   label: 'Snare',     short: 'Sn', color: '#FECA57', vol: 75, pan: 0 },
    { id: 'hihat_c', label: 'Hi-Hat',    short: 'HH', color: '#48DBFB', vol: 65, pan: 0 },
    { id: 'hihat_o', label: 'Open Hat',  short: 'HO', color: '#0ABDE3', vol: 55, pan: 0 },
    { id: 'clap',    label: 'Clap',      short: 'Cp', color: '#FF9FF3', vol: 70, pan: 0 },
    { id: 'crash',   label: 'Crash',     short: 'Cr', color: '#F368E0', vol: 50, pan: 0 },
    { id: 'ride',    label: 'Ride',      short: 'Rd', color: '#C44569', vol: 45, pan: 0 },
  ],
  'lofi': [
    { id: 'kick',    label: 'Kick',      short: 'Kk', color: '#FF6B6B', vol: 75, pan: 0 },
    { id: 'snare',   label: 'Snare',     short: 'Sn', color: '#FECA57', vol: 65, pan: 0 },
    { id: 'hihat_c', label: 'Hi-Hat',    short: 'HH', color: '#48DBFB', vol: 55, pan: 0 },
    { id: 'hihat_o', label: 'Open Hat',  short: 'HO', color: '#0ABDE3', vol: 45, pan: 0 },
    { id: 'rimshot', label: 'Rimshot',   short: 'Rm', color: '#E17055', vol: 50, pan: 0, synth: true },
    { id: 'crash',   label: 'Cymbal',    short: 'Cy', color: '#F368E0', vol: 40, pan: 0 },
  ],
  'trap': [
    { id: 'kick',    label: 'Kick',      short: 'Kk', color: '#FF6B6B', vol: 85, pan: 0 },
    { id: 'snare',   label: 'Snare',     short: 'Sn', color: '#FECA57', vol: 75, pan: 0 },
    { id: 'hihat_c', label: 'Hi-Hat',    short: 'HH', color: '#48DBFB', vol: 65, pan: 0 },
    { id: 'hihat_o', label: 'Open Hat',  short: 'HO', color: '#0ABDE3', vol: 55, pan: 0 },
    { id: 'clap',    label: 'Clap',      short: 'Cp', color: '#FF9FF3', vol: 70, pan: 0 },
    { id: 'snare2',  label: 'Snare 2',   short: 'S2', color: '#F368E0', vol: 65, pan: 0 },
    { id: 'bass808', label: '808 Bass',  short: 'B8', color: '#C44569', vol: 80, pan: 0, synth: true },
  ],
  'jazz': [
    { id: 'kick',    label: 'Kick',      short: 'Kk', color: '#FF6B6B', vol: 65, pan: 0 },
    { id: 'snare',   label: 'Snare',     short: 'Sn', color: '#FECA57', vol: 55, pan: 0 },
    { id: 'hihat_c', label: 'Hi-Hat',    short: 'HH', color: '#48DBFB', vol: 45, pan: 0 },
    { id: 'hihat_o', label: 'Open Hat',  short: 'HO', color: '#0ABDE3', vol: 35, pan: 0 },
    { id: 'ride',    label: 'Ride',      short: 'Rd', color: '#C44569', vol: 40, pan: 0 },
    { id: 'crash',   label: 'Crash',     short: 'Cr', color: '#F368E0', vol: 35, pan: 0 },
    { id: 'tamb',    label: 'Saxophone', short: 'Sx', color: '#FDCB6E', vol: 60, pan: 0, synth: true },
  ],
};

// ---- Helper: Update FL.tracks for current kit ----
function updateFLKitTracks(kitName) {
  const kit = FL_KITS[kitName];
  if (!kit) return;
  const trackDefs = FL_KIT_TRACKS[kitName];
  if (!trackDefs) return;
  FL.tracks = trackDefs.map(t => ({
    ...t,
    steps: [],
    mute: false,
    solo: false
  }));
}

// Build the full FL_SAMPLE_MAP from current kit + fills
// Returns map of trackId -> full URL
function buildFLSampleMap(kitName) {
  const kit = FL_KITS[kitName] || FL_KITS['hiphop'];
  const map = {};
  // Apply kit samples using per-kit baseUrl + prefix
  for (const [trackId, path] of Object.entries(kit.map)) {
    map[trackId] = kit.baseUrl + (kit.prefix || '') + path;
  }
  // Apply fills (fallback for tracks not in the kit)
  // FL_KIT_FILLS already stores full URLs
  for (const [trackId, url] of Object.entries(FL_KIT_FILLS)) {
    if (!map[trackId]) map[trackId] = url;
  }
  return map;
}

// Current sample map (default to hiphop)
let FL_SAMPLE_MAP = buildFLSampleMap('hiphop');

const FL_KIT_STORAGE_KEY = 'matthosify_fl_kit';

// Switch to a different sample kit
async function switchFLKit(kitName) {
  if (!FL_KITS[kitName]) return;
  if (FL.isPlaying) stopFLBeat();
  
  FL.currentKit = kitName;
  localStorage.setItem(FL_KIT_STORAGE_KEY, kitName);
  
  // Rebuild the sample map
  FL_SAMPLE_MAP = buildFLSampleMap(kitName);
  
  // Update tracks for this kit's genre-specific instruments
  updateFLKitTracks(kitName);
  // Reinitialize patterns with new tracks
  initFLPatterns();
  
  updateFLStatusBar(`⏳ Switching to ${FL_KITS[kitName].label}...`);
  
  const ctx = getFLAudioCtx();
  if (!ctx) return;
  
  // Clear existing samples (keep custom ones)
  const customTrackIds = new Set(Object.keys(FL.customSamples));
  for (const trackId of Object.keys(FL.samples || {})) {
    if (!customTrackIds.has(trackId)) {
      delete FL.samples[trackId];
    }
  }
  
  // Load new kit samples + fill samples
  const kit = FL_KITS[kitName];
  
  // Build combined list: kit tracks (with per-kit baseUrl) + fill tracks
  const allSamples = [];
  for (const [trackId, path] of Object.entries(kit.map)) {
    const url = kit.baseUrl + (kit.prefix || '') + path;
    allSamples.push({ trackId, url });
  }
  for (const [trackId, url] of Object.entries(FL_KIT_FILLS)) {
    // Don't add if the kit already has this track
    if (!kit.map[trackId]) {
      allSamples.push({ trackId, url });
    }
  }
  
  const promises = allSamples.map(({ trackId, url }) => {
    // Skip if user has a custom sample for this track
    if (FL.customSamples && FL.customSamples[trackId]) return Promise.resolve();
    
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(buf => ctx.decodeAudioData(buf))
      .then(audioBuf => {
        FL.samples[trackId] = audioBuf;
      })
      .catch(err => {
        console.warn('Failed to load sample for', trackId, '- using synth fallback');
        FL.samples[trackId] = null;
      });
  });
  
  await Promise.all(promises);
  
  const loaded = Object.values(FL.samples).filter(Boolean).length;
  updateFLStatusBar(`✅ ${FL_KITS[kitName].label} loaded (${loaded} samples)`);
  renderFLChannelRack();
}

// ---- Audio Engine ----
function getFLAudioCtx() {
  if (!FL.audioCtx) {
    try {
      FL.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { return null; }
  }
  if (FL.audioCtx.state === 'suspended') FL.audioCtx.resume();
  return FL.audioCtx;
}

// Preload all Stargate DAW samples into AudioBuffers
function preloadFLSamples() {
  const ctx = getFLAudioCtx();
  if (!ctx) return Promise.resolve();
  
  // Restore saved kit preference
  const savedKit = localStorage.getItem(FL_KIT_STORAGE_KEY);
  if (savedKit && FL_KITS[savedKit]) {
    FL.currentKit = savedKit;
    FL_SAMPLE_MAP = buildFLSampleMap(savedKit);
  }
  
  FL.samples = {};
  const entries = Object.entries(FL_SAMPLE_MAP);
  
  // Show loading status
  const statusBar = document.getElementById('flStatusBar');
  if (statusBar) statusBar.innerHTML = '<span class="fl-status-msg">⏳ Loading drum samples...</span>';
  
  const promises = entries.map(([trackId, url]) => {
    // url is already a full URL from buildFLSampleMap
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(buf => ctx.decodeAudioData(buf))
      .then(audioBuf => {
        FL.samples[trackId] = audioBuf;
      })
      .catch(err => {
        console.warn('Failed to load sample for', trackId, '- will use synth fallback');
        FL.samples[trackId] = null;
      });
  });
  
  return Promise.all(promises).then(() => {
    const loaded = Object.values(FL.samples).filter(Boolean).length;
    
    // Restore any custom samples from localStorage
    flLoadCustomSamples(ctx);
    
    if (statusBar) statusBar.innerHTML = `<span class="fl-status-msg">✅ ${loaded}/${entries.length} drum samples loaded</span>`;
    updateFLStatusBar('🎛 FL Studio Ready');
    renderFLChannelRack(); // Re-render to show custom sample badges
  });
}

// ---- Synth Fallback (for tracks where sample loading fails) ----
// ---- Melody Synth Engine ----
function playFLMelodyNote(trackId, pitch, time, duration, velocity) {
  const ctx = getFLAudioCtx();
  if (!ctx) return;
  
  const track = FL.melodyTracks.find(t => t.id === trackId);
  if (!track) return;
  
  const vol = (velocity / 100) * (FL.masterVol / 100);
  const freq = flMidiToFreq(pitch);
  const cfg = track.synth;
  const now = ctx.currentTime;
  
  // Main oscillator
  const osc = ctx.createOscillator();
  osc.type = cfg.type;
  osc.frequency.setValueAtTime(freq, now);
  // Add slight vibrato for expression
  if (cfg.type === 'sawtooth' || cfg.type === 'square') {
    osc.frequency.linearRampToValueAtTime(freq * 1.001, now + 0.05);
  }
  
  // Gain envelope
  const gainNode = ctx.createGain();
  const env = cfg.env || { a: 0.01, d: 0.1, s: 0.6, r: 0.15 };
  const dur = Math.max(0.05, duration);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(vol * 0.7, now + env.a); // attack
  gainNode.gain.linearRampToValueAtTime(vol * 0.5 * env.s, now + env.a + env.d); // decay
  gainNode.gain.setValueAtTime(vol * 0.5 * env.s, now + dur - env.r); // sustain
  gainNode.gain.linearRampToValueAtTime(0.001, now + dur); // release
  
  // Filter
  const filter = ctx.createBiquadFilter();
  filter.type = cfg.filter || 'lowpass';
  filter.frequency.setValueAtTime(cfg.cutoff || 800, now);
  filter.Q.value = 1;
  
  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + dur + 0.05);
  
  // For pad/sine, add a second detuned oscillator for richness
  if (cfg.type === 'sine' || cfg.type === 'sawtooth') {
    try {
      const osc2 = ctx.createOscillator();
      osc2.type = cfg.type === 'sine' ? 'sine' : 'triangle';
      osc2.frequency.setValueAtTime(freq * (cfg.type === 'sine' ? 1.005 : 0.995), now);
      const g2 = ctx.createGain();
      g2.gain.value = vol * 0.15;
      osc2.connect(g2);
      g2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + dur + 0.05);
    } catch(e) { /* optional detune */ }
  }
}

function playSynthFallback(trackId, ctx, time, vol) {
  const dest = ctx.destination;
  
  switch(trackId) {
    case 'kick': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
      gain.gain.setValueAtTime(vol * 0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time); osc.stop(time + 0.15);
      break;
    }
    case 'snare': case 'snare2': {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const env = Math.max(0, 1 - i / d.length);
        d[i] = (Math.random() * 2 - 1) * env + Math.sin(i * 0.02) * env * 0.3;
      }
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.8, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      s.connect(g);
      g.connect(dest);
      s.start(time);
      break;
    }
    case 'hihat_c': case 'hihat_o': {
      const len = ctx.sampleRate * (trackId === 'hihat_o' ? 0.25 : 0.08);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / d.length) * 0.6;
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
      const g = ctx.createGain(); g.gain.value = vol * 0.5;
      s.connect(f);
      f.connect(g);
      g.connect(dest);
      s.start(time);
      break;
    }
    case 'clap': {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / d.length) * 0.5;
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.7, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      s.connect(g);
      g.connect(dest);
      s.start(time);
      break;
    }
    case 'tom_h': case 'tom_m': case 'tom_l': {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const freq = trackId === 'tom_h' ? 300 : trackId === 'tom_m' ? 200 : 130;
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.1);
      g.gain.setValueAtTime(vol * 0.6, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(g);
      g.connect(dest);
      osc.start(time); osc.stop(time + 0.15);
      break;
    }
    case 'crash': case 'ride': {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / d.length) * 0.4;
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = trackId === 'ride' ? 2000 : 4000;
      const g = ctx.createGain(); g.gain.value = vol * 0.4;
      s.connect(f);
      f.connect(g);
      g.connect(dest);
      s.start(time);
      break;
    }
    case 'shaker': case 'maracas': {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain(); g.gain.value = vol * 0.5;
      s.connect(g);
      g.connect(dest);
      s.start(time);
      break;
    }
    case 'tamb': case 'cowbell': {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = trackId === 'cowbell' ? 'square' : 'triangle';
      osc.frequency.value = trackId === 'cowbell' ? 800 : 2500;
      g.gain.setValueAtTime(vol * 0.5, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      osc.connect(g);
      g.connect(dest);
      osc.start(time); osc.stop(time + 0.06);
      break;
    }
    case 'conga': case 'bongo': {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const freq = trackId === 'conga' ? 180 : 250;
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, time + 0.06);
      g.gain.setValueAtTime(vol * 0.6, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(g);
      g.connect(dest);
      osc.start(time); osc.stop(time + 0.1);
      break;
    }
    case 'bass808': {
      // Deep sub-bass 808 kick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, time);
      osc.frequency.exponentialRampToValueAtTime(28, time + 0.35);
      gain.gain.setValueAtTime(vol * 0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time); osc.stop(time + 0.45);
      break;
    }
    case 'saxophone': case 'tamb': {
      // Warm sax-like synth (sawtooth + lowpass filter)
      const saxOsc = ctx.createOscillator();
      const saxGain = ctx.createGain();
      const saxFilter = ctx.createBiquadFilter();
      saxOsc.type = 'sawtooth';
      saxOsc.frequency.setValueAtTime(220, time);
      saxOsc.frequency.linearRampToValueAtTime(180, time + 0.25);
      saxFilter.type = 'lowpass';
      saxFilter.frequency.setValueAtTime(600, time);
      saxFilter.frequency.exponentialRampToValueAtTime(200, time + 0.3);
      saxFilter.Q.value = 3;
      saxGain.gain.setValueAtTime(vol * 0.6, time);
      saxGain.gain.linearRampToValueAtTime(vol * 0.3, time + 0.08);
      saxGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
      saxOsc.connect(saxFilter);
      saxFilter.connect(saxGain);
      saxGain.connect(dest);
      saxOsc.start(time); saxOsc.stop(time + 0.5);
      break;
    }
    case 'rimshot': {
      // Sharp rimshot click
      const rBuf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
      const rD = rBuf.getChannelData(0);
      for (let i = 0; i < rD.length; i++) {
        rD[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / rD.length) * 0.7;
      }
      const rSrc = ctx.createBufferSource();
      rSrc.buffer = rBuf;
      const rF = ctx.createBiquadFilter();
      rF.type = 'highpass';
      rF.frequency.value = 5000;
      const rG = ctx.createGain();
      rG.gain.value = vol * 0.6;
      rSrc.connect(rF);
      rF.connect(rG);
      rG.connect(dest);
      rSrc.start(time);
      break;
    }
    default: {
      // Generic noise burst
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / d.length);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain(); g.gain.value = vol * 0.5;
      s.connect(g);
      g.connect(dest);
      s.start(time);
    }
  }
}

function playFLSound(trackId, time, velocity, pan) {
  const ctx = getFLAudioCtx();
  if (!ctx) return;
  
  const vol = (velocity / 100) * (FL.masterVol / 100);
  const panVal = (pan || 0) / 100;
  
  // Try to use loaded sample first
  const sampleBuffer = FL.samples && FL.samples[trackId];
  if (sampleBuffer) {
    try {
      const source = ctx.createBufferSource();
      source.buffer = sampleBuffer;
      
      // Stereo panner for panning
      const stereoPanner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const gainNode = ctx.createGain();
      gainNode.gain.value = vol * 0.8;
      
      if (stereoPanner) {
        stereoPanner.pan.value = panVal;
        source.connect(gainNode);
        gainNode.connect(stereoPanner);
        stereoPanner.connect(ctx.destination);
      } else {
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
      }
      
      source.start(time);
      return;
    } catch(e) {
      // Fall through to synth
    }
  }
  
  // Fallback: synthesize
  playSynthFallback(trackId, ctx, time, vol);
}

// ---- Transport ----
function startFLBeat() {
  getFLAudioCtx();
  FL.currStep = 0;
  FL.isPlaying = true;
  
  const pattern = FL.patterns[FL.currPattern];
  if (!pattern) return;
  
  // Check if any solo is active
  const hasSolo = pattern.some(t => t.solo);
  
  function playStep() {
    if (!FL.isPlaying) return;
    
    const step = FL.currStep;
    const now = FL.audioCtx.currentTime;
    const stepDuration = (60 / FL.bpm) / 4;
    
    // Play drum sounds
    pattern.forEach((track, tIdx) => {
      if (track.mute) return;
      if (hasSolo && !track.solo) return;
      if (track.steps[step] > 0) {
        playFLSound(track.id, now, track.steps[step], track.pan);
      }
    });
    
    // Play melody notes scheduled for this step
    const melodyNotes = getFLMelodyNotes();
    FL.melodyTracks.forEach(mTrack => {
      const notes = melodyNotes[mTrack.id] || [];
      notes.forEach(note => {
        if (note.step === step) {
          const dur = note.length * stepDuration;
          playFLMelodyNote(mTrack.id, note.pitch, now, dur, note.velocity);
        }
      });
    });
    
    updateFLStepUI(step);
    updateFLPRStepUI(step);
    updateFLPlayBtn();
    
    FL.currStep = (FL.currStep + 1) % FL.stepLen;
    
    // Calculate interval with swing
    const baseInterval = stepDuration * 1000;
    const swingAmount = FL.swing / 100;
    let delay = baseInterval;
    if (FL.currStep % 2 === 0) {
      delay = baseInterval * (1 - swingAmount * 0.2);
    } else {
      delay = baseInterval * (1 + swingAmount * 0.2);
    }
    
    FL.interval = setTimeout(playStep, delay);
  }
  
  playStep();
  updateFLStatusBar('▶ Playing');
}

function stopFLBeat() {
  FL.isPlaying = false;
  FL.currStep = 0;
  if (FL.interval) {
    clearTimeout(FL.interval);
    FL.interval = null;
  }
  updateFLStepUI(-1);
  updateFLPlayBtn();
  updateFLStatusBar('⏹ Stopped');
}

function toggleFLPlay() {
  if (FL.isPlaying) stopFLBeat();
  else startFLBeat();
}

// ---- Step Velocity System (FL Studio click & drag) ----
// Steps store velocity values 0-100 instead of just on/off
let _flDragStartY = 0;
let _flDragStep = null;
let _flDragTrack = null;

function flStepMouseDown(tIdx, sIdx, e) {
  e.preventDefault();
  const track = FL.patterns[FL.currPattern][tIdx];
  if (!track) return;
  
  // Left click: toggle step with velocity
  if (e.button === 0) {
    if (track.steps[sIdx] > 0) {
      track.steps[sIdx] = 0; // Remove
    } else {
      track.steps[sIdx] = 80; // Default velocity
    }
    renderFLChannelRack();
  }
}

function flStepMouseOver(tIdx, sIdx, e) {
  if (e.buttons === 1) { // Left mouse held - paint mode
    const track = FL.patterns[FL.currPattern][tIdx];
    if (!track) return;
    track.steps[sIdx] = 80;
    renderFLChannelRack();
    // Play preview
    playFLSound(track.id, getFLAudioCtx()?.currentTime || 0, 80, track.pan);
  }
}

function flStepDragStart(tIdx, sIdx, e) {
  _flDragTrack = tIdx;
  _flDragStep = sIdx;
  _flDragStartY = e.clientY;
  
  const onMove = (ev) => {
    const track = FL.patterns[FL.currPattern][_flDragTrack];
    if (!track) return;
    const diff = (_flDragStartY - ev.clientY) * 2;
    let val = track.steps[_flDragStep] + diff;
    val = Math.max(0, Math.min(100, Math.round(val)));
    track.steps[_flDragStep] = val;
    renderFLChannelRack();
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    _flDragStep = null;
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ---- Patterns ----
function getFLPatternData() {
  return FL.patterns[FL.currPattern] || FL.patterns[1];
}

function addFLPattern() {
  const newId = Math.max(...Object.keys(FL.patterns).map(Number), 0) + 1;
  const src = FL.patterns[FL.currPattern];
  FL.patterns[newId] = src.map(t => ({
    ...t,
    steps: [...t.steps],
    vol: t.vol,
    pan: t.pan,
    mute: t.mute,
    solo: false
  }));
  // Copy melody notes
  initFLMelodyNotes(newId);
  const srcMelody = getFLMelodyNotes(); // gets notes for current pattern
  FL.melodyNotes[newId] = {};
  FL.melodyTracks.forEach(mt => {
    FL.melodyNotes[newId][mt.id] = (srcMelody[mt.id] || []).map(n => ({...n}));
  });
  FL.currPattern = newId;
  updateFLPatternSelect();
  renderFLChannelRack();
  if (FL.viewMode === 'piano-roll') {
    updateFLPianoTrackSelect();
    renderFLPianoRoll();
  }
  updateFLStatusBar(`📋 Pattern ${newId}`);
}

function duplicateFLPattern() {
  addFLPattern();
}

function deleteFLPattern(id) {
  const ids = Object.keys(FL.patterns).map(Number).sort((a,b) => a-b);
  if (ids.length <= 1) return;
  delete FL.patterns[id];
  delete FL.melodyNotes[id];
  if (FL.currPattern === id) {
    FL.currPattern = ids.find(i => i !== id) || ids[0];
  }
  updateFLPatternSelect();
  renderFLChannelRack();
  if (FL.viewMode === 'piano-roll') {
    renderFLPianoRoll();
  }
}

function selectFLPattern(id) {
  if (!FL.patterns[id]) return;
  FL.currPattern = Number(id);
  renderFLChannelRack();
  if (FL.viewMode === 'piano-roll') {
    renderFLPianoRoll();
  }
}

// ---- UI Renders ----

function renderFLChannelRack() {
  const container = document.getElementById('flChannelRack');
  if (!container) return;

  const pattern = getFLPatternData();
  const hasSolo = pattern.some(t => t.solo);
  
  let html = '<table class="fl-rack-table">';
  
  // Header row with step numbers
  html += '<thead><tr class="fl-step-header-row"><th class="fl-step-header fl-track-info-header"></th>';
  for (let i = 0; i < FL.stepLen; i++) {
    const cls = i % 4 === 0 ? 'fl-step-num fl-beat-num' : 'fl-step-num';
    html += `<th class="${cls}">${i + 1}</th>`;
  }
  html += '<th class="fl-step-header fl-track-pan-header">Pan</th>';
  html += '<th class="fl-step-header fl-track-vol-header">Vol</th>';
  html += '</tr></thead><tbody>';
  
  // Track rows
  pattern.forEach((track, tIdx) => {
    const isMuted = track.mute;
    const isSolo = track.solo;
    const rowActive = isSolo || (!hasSolo && !isMuted);
    
    const hasCustom = !!(FL.customSamples && FL.customSamples[track.id]);
    const customName = hasCustom ? FL.customSamples[track.id].name : '';
    
    html += `<tr class="fl-track-row ${rowActive ? '' : 'fl-track-muted'}" data-track="${tIdx}">`;
    // Track label
    html += `<td class="fl-track-label-cell" style="border-left: 3px solid ${track.color};">
      <div class="fl-track-label-content" ondblclick="flRenameTrack(${tIdx})">
        <span class="fl-track-short" style="background:${track.color}">${track.short}</span>
        <span class="fl-track-name">${track.label}</span>
        ${hasCustom ? `<span class="fl-custom-badge" title="Custom: ${customName}">📦</span>` : ''}
      </div>
      <div class="fl-track-actions">
        <button class="fl-btn-icon fl-btn-solo ${isSolo ? 'active' : ''}" 
          onclick="event.stopPropagation(); flToggleSolo(${tIdx})" title="Solo">S</button>
        <button class="fl-btn-icon fl-btn-mute ${isMuted ? 'active' : ''}" 
          onclick="event.stopPropagation(); flToggleMute(${tIdx})" title="Mute">M</button>
        <button class="fl-btn-icon fl-btn-upload" 
          onclick="event.stopPropagation(); flUploadSample(${tIdx})" title="Upload custom sample (WAV)">📂</button>
        ${hasCustom ? `<button class="fl-btn-icon fl-btn-reset" 
          onclick="event.stopPropagation(); flResetSample(${tIdx})" title="Reset to default sample">↺</button>` : ''}
      </div>
    </td>`;
    
    // Step buttons
    for (let s = 0; s < FL.stepLen; s++) {
      const val = track.steps[s] || 0;
      const isActive = val > 0;
      const isCurr = s === FL.currStep && FL.isPlaying;
      const beatStart = s % 4 === 0;
      const bgIntensity = isActive ? Math.floor(30 + (val / 100) * 70) : 10;
      const bgColor = isActive 
        ? `rgba(${hexToRgb(track.color)},${0.3 + (val / 100) * 0.7})`
        : 'transparent';
      const borderCls = beatStart ? 'fl-step-beat' : '';
      
      html += `<td class="fl-step-cell ${isCurr ? 'fl-step-current' : ''} ${isActive ? 'fl-step-on' : ''} ${borderCls}"
        data-track="${tIdx}" data-step="${s}"
        onmousedown="flStepMouseDown(${tIdx}, ${s}, event)"
        onmouseenter="flStepMouseOver(${tIdx}, ${s}, event)"
        ondblclick="flStepDragStart(${tIdx}, ${s}, event)"
        title="Step ${s+1}: ${isActive ? val + '%' : 'Off'} (double-click to adjust velocity)"
        style="${isActive ? `background: ${bgColor}; box-shadow: inset 0 0 0 1px ${track.color}44;` : ''}">
        ${isActive ? `<div class="fl-step-fill" style="height:${val}%;background:${track.color}"></div>` : ''}
      </td>`;
    }
    
    // Pan control
    html += `<td class="fl-track-pan-cell">
      <input type="range" min="-100" max="100" value="${track.pan || 0}" 
        class="fl-pan-slider" data-track="${tIdx}"
        oninput="flUpdateTrackPan(${tIdx}, this.value)">
      <span class="fl-pan-val">${(track.pan || 0) > 0 ? 'R' : (track.pan || 0) < 0 ? 'L' : 'C'}</span>
    </td>`;
    
    // Volume control
    html += `<td class="fl-track-vol-cell">
      <input type="range" min="0" max="100" value="${track.vol || 80}" 
        class="fl-vol-slider" data-track="${tIdx}"
        oninput="flUpdateTrackVol(${tIdx}, this.value)">
      <span class="fl-vol-val">${track.vol || 80}</span>
    </td>`;
    
    html += '</tr>';
  });
  
  html += '</tbody></table>';    container.innerHTML = html;
  
  // Highlight current step
  if (FL.isPlaying) {
    updateFLStepUI(FL.currStep);
  }
  
  // Sync the mixer with the current pattern state
  renderFLMixer();
}

function updateFLStepUI(step) {
  // Remove current class from all drum cells
  document.querySelectorAll('.fl-step-current').forEach(el => el.classList.remove('fl-step-current'));
  // Add to current step column
  if (step >= 0) {
    document.querySelectorAll(`.fl-step-cell[data-step="${step}"]`).forEach(el => {
      el.classList.add('fl-step-current');
    });
  }
}

function updateFLPRStepUI(step) {
  // Remove current class from all piano roll cells
  document.querySelectorAll('#flPianoRoll .fl-pr-cell-current').forEach(el => el.classList.remove('fl-pr-cell-current'));
  // Add to current step column
  if (step >= 0) {
    document.querySelectorAll(`#flPianoRoll .fl-pr-cell[data-step="${step}"]`).forEach(el => {
      el.classList.add('fl-pr-cell-current');
    });
  }
}

function updateFLPlayBtn() {
  const btn = document.getElementById('flPlayBtn');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = FL.isPlaying ? 'fa-solid fa-stop' : 'fa-solid fa-play';
  }
  btn.classList.toggle('fl-playing', FL.isPlaying);
}

function updateFLPatternSelect() {
  const sel = document.getElementById('flPatternSelect');
  if (!sel) return;
  const ids = Object.keys(FL.patterns).map(Number).sort((a,b) => a-b);
  sel.innerHTML = ids.map(id => 
    `<option value="${id}" ${id === FL.currPattern ? 'selected' : ''}>Pattern ${id}</option>`
  ).join('');
}

// ---- Piano Roll Renderer ----
function renderFLPianoRoll() {
  const container = document.getElementById('flPianoRoll');
  if (!container) return;
  
  const track = FL.melodyTracks[FL.selectedMelodyTrack];
  if (!track) return;
  
  const notes = getFLMelodyTrackNotes(track.id);
  
  // Build note map: step -> note for quick lookup
  const noteMap = {};
  notes.forEach(n => {
    for (let s = n.step; s < n.step + n.length && s < FL.stepLen; s++) {
      if (!noteMap[s]) noteMap[s] = {};
      noteMap[s][n.pitch] = n;
    }
  });
  
  // Piano roll range: C2 (36) to C5 (72) = 3 octaves
  const minPitch = 36; // C2
  const maxPitch = 72; // C5
  const numKeys = maxPitch - minPitch + 1;
  
  let html = '<div class="fl-pr-wrapper">';
  
  // Header row with step numbers
  html += '<div class="fl-pr-header-row">';
  html += '<div class="fl-pr-key-header"></div>';
  for (let s = 0; s < FL.stepLen; s++) {
    const cls = s % 4 === 0 ? 'fl-pr-step-num fl-pr-beat-num' : 'fl-pr-step-num';
    html += `<div class="${cls}">${s + 1}</div>`;
  }
  html += '</div>';
  
  // Scrollable grid area
  html += '<div class="fl-pr-scroll">';
  html += '<div class="fl-pr-grid" style="grid-template-rows: repeat(' + numKeys + ', 1fr);">';
  
  // Piano keys + grid cells
  for (let p = maxPitch; p >= minPitch; p--) {
    const isBlack = [1, 3, 6, 8, 10].includes(p % 12);
    const isC = p % 12 === 0;
    const noteName = flMidiToName(p);
    const pitchClass = p % 12;
    
    // Piano key label
    html += `<div class="fl-pr-key ${isBlack ? 'fl-pr-key-black' : 'fl-pr-key-white'} ${isC ? 'fl-pr-key-c' : ''}" 
      data-pitch="${p}" title="${noteName}">
      ${isC ? `<span class="fl-pr-key-label">${noteName}</span>` : ''}
    </div>`;
    
    // Step grid cells for this pitch
    for (let s = 0; s < FL.stepLen; s++) {
      const isBeat = s % 4 === 0;
      const existingNote = noteMap[s] && noteMap[s][p];
      const hasNote = !!existingNote;
      
      // Check if this cell is the START of a note (for drawing note bars)
      let isNoteStart = false;
      let noteLen = 1;
      let noteVel = 80;
      if (hasNote && existingNote.step === s) {
        isNoteStart = true;
        noteLen = existingNote.length;
        noteVel = existingNote.velocity;
      }
      
      const gridCls = isBlack ? 'fl-pr-cell-black' : 'fl-pr-cell-white';
      const beatCls = isBeat ? 'fl-pr-cell-beat' : '';
      const noteCls = hasNote ? 'fl-pr-cell-note' : '';
      const isCurr = s === FL.currStep && FL.isPlaying;
      const currCls = isCurr ? 'fl-pr-cell-current' : '';
      
      html += `<div class="fl-pr-cell ${gridCls} ${beatCls} ${noteCls} ${currCls}" 
        data-pitch="${p}" data-step="${s}"
        onmousedown="flPRMouseDown(event, ${p}, ${s})"
        onmouseenter="flPRMouseEnter(event, ${p}, ${s})"
        title="${noteName} · Step ${s+1}">`;        // Render note bar if this is the start of a note
      if (isNoteStart) {
        const widthPct = Math.max(100, noteLen * 100); // span noteLen cells
        const opacity = 0.5 + (noteVel / 100) * 0.5;
        html += `<div class="fl-pr-note-bar" style="
          width: ${widthPct}%;
          background: ${track.color};
          opacity: ${opacity};
          --note-vel: ${noteVel};
          --note-len: ${noteLen};
        " ondblclick="event.stopPropagation(); flPRRemoveNote(${p}, ${s})">
          <span class="fl-pr-note-label">${noteName}</span>
        </div>`;
      }
      
      html += '</div>';
    }
  }
  
  html += '</div></div></div>';
  
  container.innerHTML = html;
  
  // Update current step highlight for piano roll
  if (FL.isPlaying) {
    updateFLPRStepUI(FL.currStep);
  }
}

// ---- Piano Roll Interactions ----
let _prDrawActive = false;

function flPRMouseDown(e, pitch, step) {
  const track = FL.melodyTracks[FL.selectedMelodyTrack];
  if (!track) return;
  const notes = getFLMelodyTrackNotes(track.id);
  
  // Check if clicking on existing note
  const existingIdx = notes.findIndex(n => n.pitch === pitch && n.step === step);
  
  if (e.button === 0) {
    _prDrawActive = true;
    if (existingIdx >= 0) {
      // Remove note on click
      notes.splice(existingIdx, 1);
    } else {
      // Add note
      // Remove any overlapping notes at this pitch
      const overlapIdx = notes.findIndex(n => n.pitch === pitch && step >= n.step && step < n.step + n.length);
      if (overlapIdx >= 0) {
        notes.splice(overlapIdx, 1);
      }
      notes.push({ pitch, step, length: 1, velocity: 80 });
      // Sort notes by step
      notes.sort((a, b) => a.step - b.step);
      // Play preview
      const stepDuration = (60 / FL.bpm) / 4;
      playFLMelodyNote(track.id, pitch, getFLAudioCtx()?.currentTime || 0, stepDuration, 80);
    }
    renderFLPianoRoll();
    updateFLStatusBar(`🎹 ${track.label}: ${flMidiToName(pitch)}`);
  }
}

function flPRMouseEnter(e, pitch, step) {
  if (e.buttons === 1 && _prDrawActive) {
    // Paint notes while holding
    flPRPaintNote(pitch, step);
  }
}

function flPRPaintNote(pitch, step) {
  const track = FL.melodyTracks[FL.selectedMelodyTrack];
  if (!track) return;
  const notes = getFLMelodyTrackNotes(track.id);
  
  const existing = notes.find(n => n.pitch === pitch && n.step === step);
  if (!existing) {
    notes.push({ pitch, step, length: 1, velocity: 80 });
    notes.sort((a, b) => a.step - b.step);
    renderFLPianoRoll();
  }
}

function flPRRemoveNote(pitch, step) {
  const track = FL.melodyTracks[FL.selectedMelodyTrack];
  if (!track) return;
  const notes = getFLMelodyTrackNotes(track.id);
  const idx = notes.findIndex(n => n.pitch === pitch && n.step === step);
  if (idx >= 0) {
    notes.splice(idx, 1);
    renderFLPianoRoll();
  }
}

// Clear all melody paints on mouse up anywhere
document.addEventListener('mouseup', () => {
  _prDrawActive = false;
});

function clearFLMelodyPattern() {
  const notes = getFLMelodyNotes();
  FL.melodyTracks.forEach(t => {
    notes[t.id] = [];
  });
  renderFLPianoRoll();
  updateFLStatusBar('🗑 Melody cleared');
}

function updateFLPianoTrackSelect() {
  const sel = document.getElementById('flMelodyTrackSelect');
  if (!sel) return;
  sel.innerHTML = FL.melodyTracks.map((t, i) => 
    `<option value="${i}" ${i === FL.selectedMelodyTrack ? 'selected' : ''}>${t.label}</option>`
  ).join('');
}

// ---- Unified Mixer Renderer ----
function renderFLMixer() {
  const container = document.getElementById('flMixerChannels');
  if (!container) return;
  
  const pattern = getFLPatternData();
  
  let html = '';
  pattern.forEach((track, tIdx) => {
    const isMuted = track.mute;
    const isSolo = track.solo;
    const volPct = track.vol || 80;
    const panVal = track.pan || 0;
    const panLabel = panVal > 5 ? 'R' : panVal < -5 ? 'L' : 'C';
    
    html += `<div class="fl-mixer-channel" data-track="${tIdx}">
      <div class="fl-mixer-channel-label" style="border-bottom: 2px solid ${track.color};">
        <span class="fl-mixer-channel-name">${track.short}</span>
      </div>
      <div class="fl-mixer-channel-fader">
        <input type="range" class="fl-mixer-vol" min="0" max="100" value="${volPct}" 
          oninput="flMixerVol(${tIdx}, this.value)">
        <span class="fl-mixer-vol-val">${volPct}</span>
      </div>
      <div class="fl-mixer-channel-pan">
        <input type="range" class="fl-mixer-pan" min="-100" max="100" value="${panVal}" 
          oninput="flMixerPan(${tIdx}, this.value)">
        <span class="fl-mixer-pan-val">${panLabel}</span>
      </div>
      <div class="fl-mixer-channel-actions">
        <button class="fl-mixer-btn ${isSolo ? 'active' : ''}" 
          onclick="flToggleSolo(${tIdx})" title="Solo">S</button>
        <button class="fl-mixer-btn ${isMuted ? 'active-mute' : ''}" 
          onclick="flToggleMute(${tIdx})" title="Mute">M</button>
      </div>
    </div>`;
  });
  
  container.innerHTML = html;
}

function flMixerVol(tIdx, val) {
  const pattern = getFLPatternData();
  pattern[tIdx].vol = parseInt(val);
  const label = document.querySelector(`.fl-mixer-channel[data-track="${tIdx}"] .fl-mixer-vol-val`);
  if (label) label.textContent = val;
}

function flMixerPan(tIdx, val) {
  const pattern = getFLPatternData();
  pattern[tIdx].pan = parseInt(val);
  const label = document.querySelector(`.fl-mixer-channel[data-track="${tIdx}"] .fl-mixer-pan-val`);
  if (label) label.textContent = parseInt(val) > 5 ? 'R' : parseInt(val) < -5 ? 'L' : 'C';
}

function updateFLStatusBar(msg) {
  const bar = document.getElementById('flStatusBar');
  if (!bar) return;
  const step = FL.currStep;
  const beat = Math.floor(step / 4) + 1;
  const stepInBeat = (step % 4) + 1;
  bar.innerHTML = `<span class="fl-status-msg">${msg || ''}</span>
    <span class="fl-status-info">
      Pattern ${FL.currPattern} · Step ${step + 1}/${FL.stepLen} · Beat ${beat}.${stepInBeat} · ${FL.bpm} BPM
    </span>`;
}

// ---- Track Controls ----
function flToggleSolo(tIdx) {
  const pattern = getFLPatternData();
  pattern[tIdx].solo = !pattern[tIdx].solo;
  renderFLChannelRack();
}

function flToggleMute(tIdx) {
  const pattern = getFLPatternData();
  pattern[tIdx].mute = !pattern[tIdx].mute;
  renderFLChannelRack();
}

function flUpdateTrackVol(tIdx, val) {
  const pattern = getFLPatternData();
  pattern[tIdx].vol = parseInt(val);
  const cell = document.querySelector(`.fl-vol-slider[data-track="${tIdx}"]`);
  if (cell) cell.nextElementSibling.textContent = val;
}

function flUpdateTrackPan(tIdx, val) {
  const pattern = getFLPatternData();
  pattern[tIdx].pan = parseInt(val);
  const cell = document.querySelector(`.fl-pan-slider[data-track="${tIdx}"]`);
  if (cell) {
    const v = parseInt(val);
    cell.nextElementSibling.textContent = v > 5 ? 'R' : v < -5 ? 'L' : 'C';
  }
}

function flRenameTrack(tIdx) {
  const pattern = getFLPatternData();
  const name = prompt('Rename track:', pattern[tIdx].label);
  if (name && name.trim()) {
    pattern[tIdx].label = name.trim();
    renderFLChannelRack();
  }
}

// ---- Custom Sample Upload ----
// Track custom samples in memory + persist to localStorage as base64

const FL_CUSTOM_SAMPLES_KEY = 'matthosify_fl_custom_samples';

// Convert ArrayBuffer to base64 string
function abToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Convert base64 string back to ArrayBuffer
function base64ToAb(b64) {
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buf;
}

// Save custom samples metadata + base64 data to localStorage
function flSaveCustomSamples() {
  try {
    const toSave = {};
    for (const [trackId, info] of Object.entries(FL.customSamples)) {
      if (info && info.rawData) {
        toSave[trackId] = {
          name: info.name,
          size: info.size,
          data: abToBase64(info.rawData)
        };
      }
    }
    const json = JSON.stringify(toSave);
    // Check localStorage quota (max ~5MB). Warn if too large.
    if (json.length > 4_000_000) {
      updateFLStatusBar('⚠️ Samples too large for storage (>4MB). Upload again on next visit.');
      return;
    }
    localStorage.setItem(FL_CUSTOM_SAMPLES_KEY, json);
    updateFLStatusBar(`💾 ${Object.keys(toSave).length} custom sample(s) saved`);
  } catch(e) {
    console.warn('Could not save custom samples to localStorage:', e.message);
  }
}

// Load custom samples from localStorage and decode them into FL.samples
function flLoadCustomSamples(ctx) {
  try {
    const saved = localStorage.getItem(FL_CUSTOM_SAMPLES_KEY);
    if (!saved) return 0;
    const parsed = JSON.parse(saved);
    let count = 0;
    
    for (const [trackId, info] of Object.entries(parsed)) {
      if (info && info.data) {
        try {
          const ab = base64ToAb(info.data);
          const audioBuf = ctx.decodeAudioData(ab);
          audioBuf.then(buf => {
            FL.samples[trackId] = buf;
            FL.customSamples[trackId] = {
              name: info.name || 'custom.wav',
              size: info.size || ab.byteLength,
              rawData: ab,
              decoded: buf
            };
            count++;
          }).catch(() => {
            // Decode failed, keep default
          });
        } catch(e) {
          console.warn('Failed to load custom sample for', trackId);
        }
      }
    }
    return count;
  } catch(e) {
    return 0;
  }
}

// Upload a custom WAV sample for a track
function flUploadSample(tIdx) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.wav,.mp3,.ogg,.aiff,.flac,audio/*';
  input.style.display = 'none';
  document.body.appendChild(input);
  
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) { document.body.removeChild(input); return; }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      const ctx = getFLAudioCtx();
      
      try {
        const audioBuf = await ctx.decodeAudioData(arrayBuffer.slice(0));
        const track = FL.tracks[tIdx];
        if (!track) { document.body.removeChild(input); return; }
        
        // Store decoded buffer for immediate playback
        FL.samples[track.id] = audioBuf;
        
        // Store metadata + raw data for persistence
        FL.customSamples[track.id] = {
          name: file.name,
          size: file.size,
          rawData: arrayBuffer,
          decoded: audioBuf
        };
        
        renderFLChannelRack();
        updateFLStatusBar(`✅ Loaded "${file.name}" → ${track.label}`);
        
        // Auto-save to localStorage
        flSaveCustomSamples();
      } catch(err) {
        updateFLStatusBar(`❌ Invalid audio file: ${err.message}`);
      }
      
      document.body.removeChild(input);
    };
    reader.readAsArrayBuffer(file);
  });
  
  input.click();
}

// Reset a track back to its default Stargate DAW sample
async function flResetSample(tIdx) {
  const track = FL.tracks[tIdx];
  if (!track) return;
  
  // Remove custom sample
  delete FL.customSamples[track.id];
  
  // Reload default from Stargate DAW or synth
  const defaultPath = FL_SAMPLE_MAP[track.id];
  if (defaultPath) {
    const ctx = getFLAudioCtx();
    if (ctx) {
      try {
        // FL_SAMPLE_MAP[track.id] already stores the full URL
        const res = await fetch(defaultPath);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(ab);
          FL.samples[track.id] = buf;
          updateFLStatusBar(`🔄 Reset ${track.label} to default`);
        } else {
          FL.samples[track.id] = null;
          updateFLStatusBar(`🔄 Reset ${track.label} (synth fallback)`);
        }
      } catch(e) {
        FL.samples[track.id] = null;
        updateFLStatusBar(`🔄 Reset ${track.label} (synth fallback)`);
      }
    }
  } else {
    FL.samples[track.id] = null;
  }
  
  // Update localStorage
  flSaveCustomSamples();
  renderFLChannelRack();
}

// ---- Presets ----
const FL_PRESETS = {
  'four-on-floor': { desc: 'Four on the Floor', steps: (tIdx) => {
    switch(tIdx) {
      case 0: return [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]; // kick
      case 1: return [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]; // snare
      case 2: return [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]; // hihat
      default: return new Array(16).fill(0);
    }
  }},
  'trap': { desc: 'Trap', steps: (tIdx) => {
    switch(tIdx) {
      case 0: return [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0];
      case 1: return [0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0];
      case 2: return [1,0,1,0,1,0,1,0,1,1,1,1,1,0,1,0];
      case 3: return [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
      default: return new Array(16).fill(0);
    }
  }},
  'hiphop': { desc: 'Hip Hop', steps: (tIdx) => {
    switch(tIdx) {
      case 0: return [1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0];
      case 1: return [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
      case 2: return [1,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0];
      case 4: return [0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0];
      default: return new Array(16).fill(0);
    }
  }},
  'lofi': { desc: 'Lo-Fi', steps: (tIdx) => {
    switch(tIdx) {
      case 0: return [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      case 2: return [0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0];
      case 11: return [0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0];
      default: return new Array(16).fill(0);
    }
  }},
  'dnb': { desc: 'Drum & Bass', steps: (tIdx) => {
    switch(tIdx) {
      case 0: return [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0];
      case 1: return [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0];
      case 2: return [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
      case 3: return [0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1];
      default: return new Array(16).fill(0);
    }
  }},
  'rock': { desc: 'Rock', steps: (tIdx) => {
    switch(tIdx) {
      case 0: return [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0];
      case 1: return [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
      case 2: return [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1];
      case 6: return [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0];
      case 7: return [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0];
      default: return new Array(16).fill(0);
    }
  }},
  'house': { desc: 'House', steps: (tIdx) => {
    switch(tIdx) {
      case 0: return [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0];
      case 2: return [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0];
      case 3: return [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
      case 11: return [0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0];
      default: return new Array(16).fill(0);
    }
  }}
};

function loadFLPreset(name) {
  const preset = FL_PRESETS[name];
  if (!preset) return;
  
  const pattern = getFLPatternData();
  pattern.forEach((track, tIdx) => {
    const vals = preset.steps(tIdx);
    track.steps = vals.map(v => v > 0 ? 80 : 0);
  });
  renderFLChannelRack();
  updateFLStatusBar(`🎵 ${preset.desc}`);
}

function clearFLPattern() {
  const pattern = getFLPatternData();
  pattern.forEach(t => t.steps = new Array(FL.stepLen).fill(0));
  renderFLChannelRack();
  updateFLStatusBar('🗑 Cleared');
}

function randomizeFLPattern() {
  const pattern = getFLPatternData();
  pattern.forEach(t => {
    t.steps = t.steps.map(() => Math.random() > 0.7 ? Math.floor(Math.random() * 60 + 40) : 0);
  });
  renderFLChannelRack();
  updateFLStatusBar('🎲 Randomized');
}

// ---- Export ----
function exportFLBeat() {
  if (FL.isPlaying) stopFLBeat();
  const ctx = getFLAudioCtx();
  if (!ctx) return;
  
  updateFLStatusBar('⏳ Rendering beat...');
  
  const sampleRate = ctx.sampleRate;
  const totalSamples = sampleRate * 8; // 8 seconds for longer patterns
  
  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
  const pattern = getFLPatternData();
  const bpm = FL.bpm;
  const stepDuration = 60 / bpm / 4; // seconds per step
  
  const hasSolo = pattern.some(t => t.solo);
  
  // Render each step using loaded samples or synth fallback
  pattern.forEach((track, tIdx) => {
    if (track.mute) return;
    if (hasSolo && !track.solo) return;
    
    track.steps.forEach((val, s) => {
      if (val <= 0) return;
      const startTime = s * stepDuration;
      const vol = (val / 100) * (track.vol / 100) * (FL.masterVol / 100);
      
      // Use loaded sample first, fall back to synth
      const sampleBuffer = FL.samples && FL.samples[track.id];
      if (sampleBuffer) {
        const source = offlineCtx.createBufferSource();
        source.buffer = sampleBuffer;
        // Adjust playback rate for velocity (slight volume control via gain)
        const gain = offlineCtx.createGain();
        gain.gain.value = vol * 0.8;
        source.connect(gain);
        gain.connect(offlineCtx.destination);
        source.start(startTime);
      } else {
        // Synth fallback - create a short buffer with the right sound
        const bufLen = Math.ceil(sampleRate * 0.15);
        const buffer = offlineCtx.createBuffer(2, bufLen, sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < bufLen; i++) {
            const env = Math.max(0, 1 - (i / bufLen));
            data[i] = (Math.random() * 2 - 1) * env * 0.3 * Math.min(1, vol * 2);
          }
        }
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        const gain = offlineCtx.createGain();
        gain.gain.value = vol;
        source.connect(gain);
        gain.connect(offlineCtx.destination);
        source.start(startTime);
      }
    });
  });
  
  offlineCtx.startRendering().then(audioBuffer => {
    const wav = audioBufferToWav(audioBuffer);
    downloadWav(wav, `fl-beat-${FL.currPattern}.wav`);
    updateFLStatusBar('✅ Beat exported!');
    if (typeof showToast === 'function') {
      showToast('✅ Beat exported!', 'fa-download');
    }
  }).catch(err => {
    updateFLStatusBar('❌ Export failed');
    if (typeof showToast === 'function') {
      showToast('Export failed', 'fa-circle-exclamation');
    }
  });
}

// ---- Utilities ----
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,2), 16) * 17;
  const g = parseInt(hex.slice(2,3), 16) * 17;
  const b = parseInt(hex.slice(3,4), 16) * 17;
  // Color like 'FF6B6B' (6 chars)
  if (hex.length === 7) {
    return parseInt(hex.slice(1,3), 16) + ',' + 
           parseInt(hex.slice(3,5), 16) + ',' + 
           parseInt(hex.slice(5,7), 16);
  }
  return `${r},${g},${b}`;
}

function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const data = buffer.getChannelData(0);
  const dataLength = data.length * bytesPerSample;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  return arrayBuffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function downloadWav(arrayBuffer, filename) {
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Setup ----
function setupFLStudio() {
  if (FL._initialized) return;
  FL._initialized = true;
  
  initFLPatterns();
  loadFLPreset('four-on-floor');
  
  // Transport buttons
  const playBtn = document.getElementById('flPlayBtn');
  if (playBtn) playBtn.addEventListener('click', toggleFLPlay);
  
  const stopBtn = document.getElementById('flStopBtn');
  if (stopBtn) stopBtn.addEventListener('click', () => { stopFLBeat(); updateFLStatusBar('⏹ Stopped'); });
  
  const recBtn = document.getElementById('flRecBtn');
  if (recBtn) {
    recBtn.addEventListener('click', () => {
      FL.isRecording = !FL.isRecording;
      recBtn.classList.toggle('fl-recording', FL.isRecording);
      updateFLStatusBar(FL.isRecording ? '🔴 Recording' : '⏹ Rec stopped');
    });
  }
  
  // Tempo
  const bpmDisplay = document.getElementById('flBpm');
  const bpmSlider = document.getElementById('flBpmSlider');
  
  if (bpmDisplay) bpmDisplay.textContent = FL.bpm;
  if (bpmSlider) bpmSlider.value = FL.bpm;
  
  if (bpmSlider) {
    bpmSlider.addEventListener('input', () => {
      FL.bpm = parseInt(bpmSlider.value);
      if (bpmDisplay) bpmDisplay.textContent = FL.bpm;
      updateFLStatusBar();
      if (FL.isPlaying) {
        stopFLBeat();
        startFLBeat();
      }
    });
  }
  
  document.getElementById('flBpmDown')?.addEventListener('click', () => {
    FL.bpm = Math.max(40, FL.bpm - 5);
    if (bpmDisplay) bpmDisplay.textContent = FL.bpm;
    if (bpmSlider) bpmSlider.value = FL.bpm;
    if (FL.isPlaying) { stopFLBeat(); startFLBeat(); }
    updateFLStatusBar();
  });
  
  document.getElementById('flBpmUp')?.addEventListener('click', () => {
    FL.bpm = Math.min(300, FL.bpm + 5);
    if (bpmDisplay) bpmDisplay.textContent = FL.bpm;
    if (bpmSlider) bpmSlider.value = FL.bpm;
    if (FL.isPlaying) { stopFLBeat(); startFLBeat(); }
    updateFLStatusBar();
  });
  
  // Swing
  const swingSlider = document.getElementById('flSwing');
  const swingVal = document.getElementById('flSwingVal');
  if (swingSlider && swingVal) {
    swingSlider.addEventListener('input', () => {
      FL.swing = parseInt(swingSlider.value);
      swingVal.textContent = FL.swing + '%';
    });
  }
  
  // Pattern
  const patternSelect = document.getElementById('flPatternSelect');
  if (patternSelect) {
    updateFLPatternSelect();
    patternSelect.addEventListener('change', () => {
      selectFLPattern(parseInt(patternSelect.value));
    });
  }
  
  document.getElementById('flAddPattern')?.addEventListener('click', addFLPattern);
  document.getElementById('flDelPattern')?.addEventListener('click', () => deleteFLPattern(FL.currPattern));
  
  // Presets
  const presetSelect = document.getElementById('flPresetSelect');
  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      if (presetSelect.value) loadFLPreset(presetSelect.value);
      presetSelect.value = '';
    });
  }
  
  // Sample Kit selector
  const kitSelect = document.getElementById('flKitSelect');
  if (kitSelect) {
    kitSelect.value = FL.currentKit;
    kitSelect.addEventListener('change', () => {
      switchFLKit(kitSelect.value);
    });
  }
  
  // View Toggle
  const viewBtns = document.querySelectorAll('.fl-view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fl-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      FL.viewMode = btn.dataset.view;
      document.getElementById('flChannelRackView')?.classList.toggle('fl-hidden', FL.viewMode !== 'drums');
      document.getElementById('flPianoRollView')?.classList.toggle('fl-hidden', FL.viewMode !== 'piano-roll');
      if (FL.viewMode === 'piano-roll') {
        updateFLPianoTrackSelect();
        renderFLPianoRoll();
      }
      updateFLStatusBar(FL.viewMode === 'drums' ? '🥁 Channel Rack' : '🎹 Piano Roll');
    });
  });
  
  // Piano Roll track selector
  const melTrackSelect = document.getElementById('flMelodyTrackSelect');
  if (melTrackSelect) {
    melTrackSelect.addEventListener('change', () => {
      FL.selectedMelodyTrack = parseInt(melTrackSelect.value);
      renderFLPianoRoll();
    });
  }
  
  // Melody clear button
  document.getElementById('flMelodyClearBtn')?.addEventListener('click', clearFLMelodyPattern);
  
  // Clear/Randomize
  document.getElementById('flClearBtn')?.addEventListener('click', clearFLPattern);
  document.getElementById('flRandomBtn')?.addEventListener('click', randomizeFLPattern);
  
  // Export
  document.getElementById('flExportBtn')?.addEventListener('click', exportFLBeat);
  
  // Master volume
  const masterVol = document.getElementById('flMasterVol');
  const masterVal = document.getElementById('flMasterVolVal');
  if (masterVol && masterVal) {
    masterVol.addEventListener('input', () => {
      FL.masterVol = parseInt(masterVol.value);
      masterVal.textContent = FL.masterVol;
    });
  }
  
  // Render
  renderFLChannelRack();
  renderFLMixer();
  updateFLPlayBtn();
  updateFLStatusBar('🎛 Loading drum samples...');
  
  // Preload Stargate DAW samples (non-blocking)
  preloadFLSamples();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  // Wait for page to be ready
  setTimeout(setupFLStudio, 300);
});

// Re-render when FL Studio tab is clicked
document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-studio-tab="fl-studio"]');
  if (tab) {
    setTimeout(renderFLChannelRack, 100);
    // Also init if needed
    setTimeout(() => {
      if (!FL._initialized) setupFLStudio();
    }, 50);
  }
});
