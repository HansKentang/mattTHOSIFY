// =============================================
// MATTHOSIFY - AI Music Generator + Smart Features
// Hugging Face MusicGen + Browser-based AI Music
// Smart Playlists, Social Features, Enhanced Spotify
// =============================================

// =============================================
// 1. HUGGING FACE MUSICGEN INTEGRATION
// =============================================

const HF_MODEL = 'facebook/musicgen-small';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// State for AI generation
if (!window.__aiGenState) {
  window.__aiGenState = {
    isGenerating: false,
    generatedSongs: [],
    currentSeed: null,
  };
}

/**
 * Generate music using Hugging Face MusicGen API
 * @param {string} prompt - Text description of the music to generate
 * @param {number} duration - Duration in seconds (approx 5-30)
 * @returns {Promise<Blob|null>} Audio blob
 */
async function generateMusicWithHF(prompt, duration = 10) {
  const token = state.settings.hfToken || '';
  const proxyUrl = state.settings.hfProxy || '';
  
  if (!token) {
    showToast('⚠️ Set your Hugging Face token in Settings first!', 'fa-circle-exclamation');
    return null;
  }

  showToast('🎵 Generating AI music... this may take 30-60s', 'fa-wand-magic-sparkles');
  window.__aiGenState.isGenerating = true;
  updateAIGenUI();

  try {
    const apiUrl = proxyUrl ? proxyUrl + encodeURIComponent(HF_API_URL) : HF_API_URL;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: Math.round(duration * 50),  // ~50 tokens per second
          temperature: 0.7,
          top_k: 250,
          top_p: 0.95,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`HF API Error: ${response.status} - ${err}`);
    }

    const audioBlob = await response.blob();
    
    if (!audioBlob || audioBlob.size < 1000) {
      throw new Error('Generated audio is too small or empty');
    }

    showToast('✅ AI music generated! Converting to song...', 'fa-check');
    window.__aiGenState.isGenerating = false;
    return audioBlob;
  } catch (error) {
    console.error('HF Generation error:', error);
    showToast('⚠️ HF API failed. Falling back to browser generation...', 'fa-circle-exclamation');
    window.__aiGenState.isGenerating = false;
    updateAIGenUI();
    return null;
  }
}

/**
 * Browser-based AI music generation using Web Audio API
 * Creates procedural music based on text prompt analysis
 */
function generateBrowserMusic(prompt, duration = 15) {
  return new Promise((resolve) => {
    showToast('🎹 Generating AI music in browser...', 'fa-wand-magic-sparkles');
    window.__aiGenState.isGenerating = true;
    updateAIGenUI();

    try {
      // Analyze prompt for musical characteristics
      const analysis = analyzePrompt(prompt);
      
      // Create audio context and generate audio
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = audioCtx.sampleRate;
      const numChannels = 2;
      const totalSamples = Math.round(sampleRate * duration);
      
      // Create raw audio buffer
      const buffer = audioCtx.createBuffer(numChannels, totalSamples, sampleRate);
      
      // Generate music based on analysis
      generateProceduralMusic(buffer, analysis, sampleRate, duration);
      
      // Convert to WAV blob
      const wavBlob = audioBufferToWav(buffer);
      
      // Create a playable URL
      const audioUrl = URL.createObjectURL(wavBlob);
      
      window.__aiGenState.isGenerating = false;
      updateAIGenUI();
      
      resolve({
        url: audioUrl,
        blob: wavBlob,
        duration: duration,
        title: generateSongTitle(prompt),
        coverData: generateCoverArt(analysis),
      });
    } catch (error) {
      console.error('Browser generation error:', error);
      showToast('⚠️ Browser generation failed', 'fa-circle-exclamation');
      window.__aiGenState.isGenerating = false;
      updateAIGenUI();
      resolve(null);
    }
  });
}

/**
 * Analyze text prompt to extract musical characteristics
 */
function analyzePrompt(prompt) {
  const lower = prompt.toLowerCase();
  
  // Genre detection
  const genres = {
    rock: { tempo: [120, 160], root: ['C','A','E'], scale: 'major', drive: 0.8 },
    pop: { tempo: [100, 130], root: ['C','G','F'], scale: 'major', drive: 0.5 },
    jazz: { tempo: [80, 140], root: ['C','F','Bb'], scale: 'jazz', drive: 0.3 },
    'hip hop': { tempo: [85, 110], root: ['D','E','A'], scale: 'minor', drive: 0.6 },
    hiphop: { tempo: [85, 110], root: ['D','E','A'], scale: 'minor', drive: 0.6 },
    electronic: { tempo: [120, 150], root: ['C','E','G'], scale: 'minor', drive: 0.7 },
    classical: { tempo: [60, 120], root: ['C','G','D'], scale: 'major', drive: 0.2 },
    lofi: { tempo: [70, 95], root: ['C','G','A'], scale: 'minor', drive: 0.2 },
    ambient: { tempo: [60, 80], root: ['C','F','G'], scale: 'major', drive: 0.1 },
    chill: { tempo: [75, 95], root: ['C','G','A'], scale: 'major', drive: 0.15 },
    blues: { tempo: [80, 120], root: ['A','D','E'], scale: 'blues', drive: 0.4 },
  };
  
  // Mood detection
  const moods = {
    happy: { brightness: 0.8, complexity: 0.4 },
    sad: { brightness: 0.2, complexity: 0.3 },
    energetic: { brightness: 0.9, complexity: 0.7 },
    calm: { brightness: 0.3, complexity: 0.2 },
    dark: { brightness: 0.1, complexity: 0.5 },
    uplifting: { brightness: 0.85, complexity: 0.5 },
    dreamy: { brightness: 0.5, complexity: 0.6 },
  };
  
  // Find best matching genre
  let matchedGenre = 'pop';
  let bestScore = 0;
  for (const [genre, _] of Object.entries(genres)) {
    if (lower.includes(genre)) {
      const score = genre.length; // longer match = more specific
      if (score > bestScore) {
        bestScore = score;
        matchedGenre = genre;
      }
    }
  }
  
  // Find mood
  let matchedMood = 'calm';
  bestScore = 0;
  for (const [mood, _] of Object.entries(moods)) {
    if (lower.includes(mood)) {
      const score = mood.length;
      if (score > bestScore) {
        bestScore = score;
        matchedMood = mood;
      }
    }
  }
  
  const genre = genres[matchedGenre] || genres.pop;
  const mood = moods[matchedMood] || moods.calm;
  
  // Generate parameters
  const tempoRange = genre.tempo;
  const tempo = tempoRange[0] + Math.random() * (tempoRange[1] - tempoRange[0]);
  const root = genre.root[Math.floor(Math.random() * genre.root.length)];
  const isMinor = genre.scale === 'minor';
  const brightness = mood.brightness * (0.8 + Math.random() * 0.4);
  const complexity = genre.drive * (0.5 + Math.random() * 0.5);
  
  return {
    tempo: Math.round(tempo),
    root,
    isMinor,
    brightness: Math.min(1, brightness),
    complexity: Math.min(1, complexity),
    drive: genre.drive,
    scale: genre.scale,
    genre: matchedGenre,
    mood: matchedMood,
  };
}

/**
 * Generate procedural music into an AudioBuffer
 */
function generateProceduralMusic(buffer, analysis, sampleRate, duration) {
  const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
  const numSamples = channels[0].length;
  const numBeats = Math.round((duration * analysis.tempo) / 60);
  const samplesPerBeat = Math.round(sampleRate / (analysis.tempo / 60));
  const beatLength4 = samplesPerBeat * 4; // One bar
  
  // Root note frequency mapping
  const noteFreqs = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
    'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
    'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
  };
  
  // Create scale notes based on root
  const majorScale = [0, 2, 4, 5, 7, 9, 11];
  const minorScale = [0, 2, 3, 5, 7, 8, 10];
  const bluesScale = [0, 3, 5, 6, 7, 10];
  const jazzScale = [0, 2, 3, 4, 5, 7, 8, 9, 10, 11];
  
  let scale;
  switch(analysis.scale) {
    case 'minor': scale = minorScale; break;
    case 'blues': scale = bluesScale; break;
    case 'jazz': scale = jazzScale; break;
    default: scale = majorScale;
  }
  
  const rootFreq = noteFreqs[analysis.root] || 440;
  const scaleFreqs = scale.map(s => rootFreq * Math.pow(2, s / 12));
  
  // Generate kick drum pattern (4-on-the-floor or syncopated)
  const kickPattern = [];
  for (let beat = 0; beat < numBeats; beat++) {
    const inBar = beat % 4;
    // Strong on beats 1 and 3, variably on 2 and 4
    kickPattern.push(inBar === 0 || inBar === 2 || (analysis.drive > 0.5 && inBar === 1 && Math.random() > 0.5) || (analysis.drive > 0.7 && inBar === 3 && Math.random() > 0.6));
  }
  
  // Generate snare/clap pattern (backbeat)
  const snarePattern = [];
  for (let beat = 0; beat < numBeats; beat++) {
    snarePattern.push(beat % 4 === 1 || beat % 4 === 3);
  }
  
  // Generate hi-hat pattern (8th notes with swing)
  const hatPattern = [];
  for (let i = 0; i < numBeats * 2; i++) {
    hatPattern.push(Math.random() < 0.85);
  }
  
  // Generate melody
  const melodyNotes = [];
  for (let bar = 0; bar < numBeats / 4; bar++) {
    const numNotes = Math.floor(2 + Math.random() * 4);
    for (let n = 0; n < numNotes; n++) {
      const noteIdx = Math.floor(Math.random() * scaleFreqs.length);
      const noteFreq = scaleFreqs[noteIdx] * (Math.random() > 0.7 ? 2 : 1);
      const noteStart = bar * beatLength4 + Math.random() * beatLength4 * 0.8;
      const noteDur = (0.2 + Math.random() * 0.6) * samplesPerBeat;
      melodyNotes.push({
        freq: noteFreq,
        start: Math.round(noteStart),
        duration: Math.round(noteDur),
        velocity: 0.3 + Math.random() * 0.4,
      });
    }
  }
  
  // Generate bass line
  const bassNotes = [];
  for (let beat = 0; beat < numBeats; beat++) {
    if (beat % 2 === 0 || Math.random() > 0.5) {
      const noteIdx = Math.min(Math.floor(Math.random() * 3), scaleFreqs.length - 1);
      bassNotes.push({
        freq: scaleFreqs[noteIdx] * 0.5, // One octave down
        start: Math.round(beat * samplesPerBeat),
        duration: Math.round(samplesPerBeat * (0.5 + Math.random() * 0.5)),
        velocity: 0.4 + Math.random() * 0.3,
      });
    }
  }
  
  // Pad/chord progression
  const chordProgression = [
    [0, 2, 4], // I, iii, V
    [3, 5, 7], // iv, vi, I
    [4, 6, 8], // V, vii, ii
    [0, 2, 4], // I, iii, V
  ];
  
  const padActive = analysis.drive < 0.6; // Pad is active for chill genres
  
  // Audio generation
  for (let i = 0; i < numSamples; i++) {
    let sampleL = 0;
    let sampleR = 0;
    
    const beatPos = i / samplesPerBeat;
    const beatIdx = Math.floor(beatPos);
    const subBeatPos = (beatPos - beatIdx);
    const hatIdx = Math.floor(subBeatPos * 2);
    
    // Master envelope (fade in/out)
    const fadeIn = Math.min(1, i / (sampleRate * 0.02));
    const fadeOut = Math.min(1, (numSamples - i) / (sampleRate * 0.05));
    const masterEnv = fadeIn * fadeOut * 0.5;
    
    // HAT - high frequency oscillator
    if (hatIdx < hatPattern.length && hatPattern[hatIdx]) {
      const hatEnv = Math.exp(-subBeatPos * 40) * 0.15 * (0.5 + analysis.brightness * 0.5);
      const noise = Math.random() * 2 - 1;
      sampleL += noise * hatEnv * 0.5;
      sampleR += noise * hatEnv * 0.5;
    }
    
    // KICK
    if (beatIdx < kickPattern.length && kickPattern[beatIdx]) {
      const kickPos = subBeatPos;
      const kickEnv = Math.exp(-kickPos * 60);
      const kickFreq = 150 * Math.exp(-kickPos * 8) + 40;
      const kickWave = Math.sin(2 * Math.PI * kickFreq * (i % samplesPerBeat) / sampleRate);
      const kickSample = kickWave * kickEnv * 0.4;
      sampleL += kickSample;
      sampleR += kickSample;
    }
    
    // SNARE
    if (beatIdx < snarePattern.length && snarePattern[beatIdx]) {
      const snarePos = subBeatPos;
      const snareEnv = Math.exp(-snarePos * 30);
      const snareNoise = (Math.random() * 2 - 1) * 0.3 + Math.sin(2 * Math.PI * 200 * (i % samplesPerBeat) / sampleRate) * 0.05;
      sampleL += snareNoise * snareEnv * 0.3;
      sampleR += snareNoise * snareEnv * 0.3;
    }
    
    // MELODY
    for (const note of melodyNotes) {
      const noteEnd = note.start + note.duration;
      if (i >= note.start && i < noteEnd) {
        const notePos = (i - note.start) / note.duration;
        const noteEnv = Math.sin(notePos * Math.PI) * note.velocity;
        // Use triangle wave for warmth
        const phase = (i * note.freq / sampleRate) % 1;
        const wave = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
        sampleL += wave * noteEnv * 0.12 * (0.5 + analysis.brightness * 0.5);
        sampleR += wave * noteEnv * 0.12 * (0.5 + analysis.brightness * 0.5);
      }
    }
    
    // BASS
    for (const note of bassNotes) {
      const noteEnd = note.start + note.duration;
      if (i >= note.start && i < noteEnd) {
        const notePos = (i - note.start) / note.duration;
        const noteEnv = Math.sin(notePos * Math.PI) * note.velocity;
        const phase = (i * note.freq / sampleRate) % 1;
        const wave = Math.sin(2 * Math.PI * phase) * 0.8 + Math.sin(2 * Math.PI * phase * 2) * 0.2;
        sampleL += wave * noteEnv * 0.25;
        sampleR += wave * noteEnv * 0.25;
      }
    }
    
    // PAD (ambient chords) - for chill/ambient genres
    if (padActive) {
      const barIdx = Math.floor(beatIdx / 4) % chordProgression.length;
      const chord = chordProgression[barIdx] || chordProgression[0];
      for (const noteIdx of chord) {
        if (noteIdx < scaleFreqs.length) {
          const freq = scaleFreqs[noteIdx] * 0.5;
          const phase = (i * freq / sampleRate) % 1;
          const wave = Math.sin(2 * Math.PI * phase);
          const padEnv = 0.03 * (0.3 + analysis.brightness * 0.3);
          sampleL += wave * padEnv;
          sampleR += wave * padEnv;
        }
      }
    }
    
    // Apply master envelope
    channels[0][i] = sampleL * masterEnv;
    channels[1][i] = sampleR * masterEnv;
  }
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const data = [];
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      data.push(intSample & 0xFF);
      data.push((intSample >> 8) & 0xFF);
    }
  }
  
  const dataLength = data.length;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write samples
  for (let i = 0; i < dataLength; i++) {
    view.setUint8(44 + i, data[i]);
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Generate a song title from the prompt
 */
function generateSongTitle(prompt) {
  const words = prompt.split(' ').filter(w => w.length > 2);
  const prefixes = ['Dream', 'Echo', 'Neon', 'Crystal', 'Velvet', 'Cosmic', 'Solar', 'Lunar', 'Digital', 'Phantom', 'Aurora', 'Zen', 'Astral', 'Prism'];
  const suffixes = ['Waves', 'Vibes', 'Dreams', 'Light', 'Flow', 'Rhythm', 'Space', 'Glow', 'Sound', 'Motion', 'Horizon', 'Pulse'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix} ${suffix}`;
}

/**
 * Generate cover art SVG data URL based on analysis
 */
function generateCoverArt(analysis) {
  const colors = {
    rock: ['#e74c3c', '#c0392b', '#2c3e50'],
    pop: ['#e84393', '#fd79a8', '#6c5ce7'],
    jazz: ['#6c5ce7', '#a29bfe', '#2d3436'],
    'hip hop': ['#f39c12', '#e67e22', '#2c3e50'],
    electronic: ['#00cec9', '#55efc4', '#0984e3'],
    classical: ['#0984e3', '#74b9ff', '#dfe6e9'],
    lofi: ['#b2bec3', '#636e72', '#2d3436'],
    ambient: ['#74b9ff', '#55efc4', '#dfe6e9'],
    chill: ['#55efc4', '#74b9ff', '#81ecec'],
  };
  
  const palette = colors[analysis.genre] || colors.pop;
  const bg = palette[0];
  const accent = palette[1];
  const accent2 = palette[2];
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <rect width="300" height="300" fill="${bg}"/>
    <circle cx="150" cy="150" r="120" fill="${accent}" opacity="0.3"/>
    <circle cx="150" cy="150" r="80" fill="${accent}" opacity="0.4"/>
    <circle cx="150" cy="150" r="40" fill="${accent2}" opacity="0.5"/>
    <text x="150" y="240" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif" opacity="0.8">♫ AI Generated</text>
    <text x="150" y="260" text-anchor="middle" fill="white" font-size="11" font-family="sans-serif" opacity="0.5">${analysis.genre} · ${analysis.tempo} BPM</text>
    ${Array.from({length: 6}, (_, i) => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const r1 = 60 + Math.random() * 40;
      const r2 = 80 + Math.random() * 40;
      const x1 = 150 + Math.cos(angle) * r1;
      const y1 = 150 + Math.sin(angle) * r1;
      const x2 = 150 + Math.cos(angle + 0.2) * r2;
      const y2 = 150 + Math.sin(angle + 0.2) * r2;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="white" stroke-width="2" opacity="0.2"/>`;
    }).join('')}
    <text x="150" y="150" text-anchor="middle" dominant-baseline="central" fill="white" font-size="48" font-family="serif" opacity="0.6">♪</text>
  </svg>`;
  
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/**
 * Main AI Music Generation function
 * Tries Hugging Face first, falls back to browser generation
 */
async function generateAIMusic() {
  const promptInput = document.getElementById('aiMusicPrompt');
  const durationInput = document.getElementById('aiMusicDuration');
  const nameInput = document.getElementById('aiMusicName');
  
  const prompt = (promptInput?.value || '').trim();
  const customName = (nameInput?.value || '').trim();
  const duration = parseInt(durationInput?.value || '15');
  
  if (!prompt) {
    showToast('✏️ Describe what kind of music you want to generate!', 'fa-circle-exclamation');
    promptInput?.focus();
    return;
  }
  
  const genBtn = document.getElementById('aiGenerateBtn');
  if (genBtn) { genBtn.disabled = true; genBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...'; }
  
  // Track generation
  const startTime = Date.now();
  
  // Try Hugging Face first
  const hfBlob = await generateMusicWithHF(prompt, duration);
  
  let result;
  if (hfBlob) {
    // HF succeeded
    const audioUrl = URL.createObjectURL(hfBlob);
    result = {
      url: audioUrl,
      blob: hfBlob,
      duration: duration,
      title: customName || generateSongTitle(prompt) + ' (AI)',
      coverData: null,
      fromHF: true,
    };
  } else {
    // Fallback to browser generation
    result = await generateBrowserMusic(prompt, duration);
  }
  
  if (!result) {
    showToast('❌ Could not generate music. Try a different prompt.', 'fa-circle-exclamation');
    if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate'; }
    return;
  }
  
  // Add to library
  const song = {
    id: randomId(),
    title: result.title,
    artist: 'Matthosify AI',
    album: 'AI Generated',
    genre: analyzePrompt(prompt).genre || 'electronic',
    duration: result.duration,
    audioData: result.url,
    coverData: result.coverData || generateCoverArt(analyzePrompt(prompt)),
    addedAt: Date.now(),
    fromAI: true,
    aiGenerated: true,
    aiPrompt: prompt,
  };
  
  addSong(song);
  
  const genTime = ((Date.now() - startTime) / 1000).toFixed(1);
  showToast(`🎵 "${song.title}" generated in ${genTime}s!`, 'fa-wand-magic-sparkles');
  
  // Clear form
  if (promptInput) promptInput.value = '';
  if (nameInput) nameInput.value = '';
  
  if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate'; }
  
  // Load the song
  const idx = state.songs.findIndex(s => s.id === song.id);
  if (idx >= 0) loadSong(idx);
  
  updateAIGenUI();
}

// =============================================
// 2. AI MUSIC GENERATOR UI
// =============================================

function setupAIGenUI() {
  const container = document.getElementById('aiMusicGenContainer');
  if (!container || container.dataset.setup) return;
  container.dataset.setup = 'true';
  
  container.innerHTML = `
    <div class="ai-gen-header">
      <div class="ai-gen-title">
        <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--accent-color);font-size:24px;"></i>
        <div>
          <h3>AI Music Generator</h3>
          <p style="color:var(--text-secondary);font-size:13px;">Describe the music you want — AI creates it instantly</p>
        </div>
      </div>
      <div class="ai-gen-status" id="aiGenStatus">
        <span class="ai-song-count" id="aiSongCount">0 AI songs</span>
      </div>
    </div>
    
    <div class="ai-gen-form">
      <div class="ai-gen-prompt-row">
        <div class="form-group" style="flex:1;">
          <label>Describe your music</label>
          <input type="text" id="aiMusicPrompt" placeholder="e.g. 'upbeat electronic dance with heavy bass and synth melodies'" class="ai-prompt-input">
        </div>
      </div>
      
      <div class="ai-gen-options">
        <div class="form-group" style="flex:1;max-width:200px;">
          <label>Duration</label>
          <select id="aiMusicDuration">
            <option value="8">8 seconds</option>
            <option value="15" selected>15 seconds</option>
            <option value="30">30 seconds</option>
          </select>
        </div>
        <div class="form-group" style="flex:2;">
          <label>Custom name (optional)</label>
          <input type="text" id="aiMusicName" placeholder="e.g. 'My AI Beat'">
        </div>
      </div>
      
      <div class="ai-gen-prompt-suggestions">
        <label style="font-size:11px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Try these:</label>
        <div class="prompt-chips">
          <button class="prompt-chip" onclick="document.getElementById('aiMusicPrompt').value='chill lo-fi hip hop with vinyl crackle and smooth piano'"><span>🎧</span> Lo-Fi Beats</button>
          <button class="prompt-chip" onclick="document.getElementById('aiMusicPrompt').value='upbeat electronic dance music with heavy bass drops'"><span>⚡</span> EDM Drop</button>
          <button class="prompt-chip" onclick="document.getElementById('aiMusicPrompt').value='smooth jazz with saxophone and piano for studying'"><span>🎷</span> Smooth Jazz</button>
          <button class="prompt-chip" onclick="document.getElementById('aiMusicPrompt').value='dark ambient atmospheric soundscape for relaxation'"><span>🌙</span> Ambient</button>
          <button class="prompt-chip" onclick="document.getElementById('aiMusicPrompt').value='energetic rock with driving guitars and drums'"><span>🎸</span> Rock</button>
          <button class="prompt-chip" onclick="document.getElementById('aiMusicPrompt').value='uplifting pop song with catchy melody and acoustic guitar'"><span>⭐</span> Pop</button>
          <button class="prompt-chip" onclick="document.getElementById('aiMusicPrompt').value='deep house with groovy bassline and electronic synths'"><span>🏠</span> House</button>
          <button class="prompt-chip" onclick="document.getElementById('aiMusicPrompt').value='calm classical piano piece with strings'"><span>🎹</span> Classical</button>
        </div>
      </div>
      
      <button class="btn-ai-generate" id="aiGenerateBtn" onclick="generateAIMusic()">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>Generate Music</span>
      </button>
    </div>
    
    <div class="ai-gen-info">
      <p><i class="fa-solid fa-lightbulb" style="color:#fbbf24;"></i> 
      <strong>How it works:</strong> First tries Hugging Face MusicGen (set token in Settings). If unavailable, generates music right in your browser using Web Audio API — no API key needed!</p>
    </div>
  `;
}

function updateAIGenUI() {
  const aiCount = state.songs.filter(s => s.aiGenerated).length;
  const countEl = document.getElementById('aiSongCount');
  if (countEl) countEl.textContent = aiCount > 0 ? `${aiCount} AI song${aiCount !== 1 ? 's' : ''}` : '0 AI songs';
  
  const genBtn = document.getElementById('aiGenerateBtn');
  if (genBtn && !window.__aiGenState.isGenerating) {
    genBtn.disabled = false;
    genBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Music';
  }
}

// =============================================
// 3. SMART PLAYLISTS
// =============================================

/**
 * Generate smart playlists based on listening habits
 * Similar to Spotify's Discover Weekly, Daily Mix, Release Radar
 */
function generateSmartPlaylists() {
  if (state.songs.length === 0) return;
  
  const now = Date.now();
  const oneDay = 86400000;
  
  // 1. Discover Weekly — songs you haven't played much but might like
  const discoverWeekly = generateDiscoverWeekly();
  
  // 2. Daily Mix — genre-specific mixes based on most listened genres
  const dailyMixes = generateDailyMixes();
  
  // 3. Release Radar — recently added songs
  const releaseRadar = generateReleaseRadar();
  
  // Store smart playlists in state
  state.smartPlaylists = {
    discoverWeekly: {
      id: 'smart_discover_weekly',
      name: 'Discover Weekly',
      description: 'Songs we think you\'ll love',
      icon: 'fa-compass',
      songIds: discoverWeekly,
      generatedAt: now,
    },
    dailyMixes: dailyMixes,
    releaseRadar: {
      id: 'smart_release_radar',
      name: 'Release Radar',
      description: 'Newest additions to your library',
      icon: 'fa-clock',
      songIds: releaseRadar,
      generatedAt: now,
    },
    lastGenerated: now,
  };
  
  renderSmartPlaylists();
}

function generateDiscoverWeekly() {
  // Get liked songs' artists and genres
  const likedArtists = new Set();
  const likedGenres = new Set();
  
  state.likedSongs.forEach(id => {
    const song = state.songs.find(s => s.id === id);
    if (song) {
      likedArtists.add(song.artist.toLowerCase());
      if (song.genre) likedGenres.add(song.genre.toLowerCase());
    }
  });
  
  // Get most played artists
  const artistPlays = {};
  Object.entries(state.playCounts).forEach(([songId, count]) => {
    const song = state.songs.find(s => s.id === songId);
    if (song) {
      artistPlays[song.artist] = (artistPlays[song.artist] || 0) + count;
    }
  });
  
  const topArtists = Object.entries(artistPlays)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([artist]) => artist.toLowerCase());
  
  // Score each song for recommendation
  const scored = state.songs.map(song => {
    let score = 0;
    
    // Bonus for similar artists to liked songs
    if (likedArtists.has(song.artist.toLowerCase())) score += 10;
    if (topArtists.includes(song.artist.toLowerCase())) score += 8;
    
    // Bonus for similar genres
    if (song.genre && likedGenres.has(song.genre.toLowerCase())) score += 5;
    
    // Penalize recently played
    if (state.recentlyPlayed.some(r => r.songId === song.id)) score -= 3;
    
    // Penalize already liked
    if (state.likedSongs.has(song.id)) score -= 5;
    
    // Bonus for newer songs
    if (song.addedAt && song.addedAt > Date.now() - 7 * 86400000) score += 3;
    
    return { song, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 20).filter(s => s.score > 0).map(s => s.song.id);
}

function generateDailyMixes() {
  // Find top 5 genres
  const genreCounts = {};
  state.songs.forEach(s => {
    if (s.genre) {
      genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
    }
  });
  
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);
  
  return topGenres.map((genre, i) => {
    const songs = state.songs
      .filter(s => s.genre === genre)
      .sort(() => Math.random() - 0.5)
      .slice(0, 15)
      .map(s => s.id);
    
    return {
      id: `smart_daily_mix_${i}`,
      name: `Daily Mix ${i + 1}`,
      description: `${genre.charAt(0).toUpperCase() + genre.slice(1)} mix for you`,
      icon: 'fa-headphones',
      genre: genre,
      songIds: songs.length > 0 ? songs : state.songs.slice(0, 10).map(s => s.id),
      generatedAt: Date.now(),
    };
  });
}

function generateReleaseRadar() {
  // Recently added songs (last 30 days)
  const recentThreshold = Date.now() - 30 * 86400000;
  const recent = state.songs
    .filter(s => s.addedAt && s.addedAt > recentThreshold)
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
    .slice(0, 30)
    .map(s => s.id);
  
  // If not enough recent, add random songs
  if (recent.length < 10) {
    const rest = state.songs
      .filter(s => !recent.includes(s.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 20 - recent.length)
      .map(s => s.id);
    return [...recent, ...rest];
  }
  
  return recent.slice(0, 20);
}

function openSmartPlaylist(id) {
  if (!state.smartPlaylists) return;
  
  let playlist = null;
  if (state.smartPlaylists.discoverWeekly?.id === id) {
    playlist = state.smartPlaylists.discoverWeekly;
  } else if (state.smartPlaylists.releaseRadar?.id === id) {
    playlist = state.smartPlaylists.releaseRadar;
  } else {
    playlist = state.smartPlaylists.dailyMixes?.find(m => m.id === id);
  }
  
  if (!playlist) return;
  
  // Play the first song
  const firstSongId = playlist.songIds[0];
  const idx = state.songs.findIndex(s => s.id === firstSongId);
  if (idx >= 0) loadSong(idx);
  showToast(`🎧 ${playlist.name} — ${playlist.description}`, 'fa-radio');
}

function renderSmartPlaylists() {
  // Update home page smart playlist cards
  const container = document.getElementById('smartPlaylistsContainer');
  if (!container) return;
  
  if (!state.smartPlaylists || !state.smartPlaylists.discoverWeekly) {
    container.innerHTML = '';
    return;
  }
  
  const { discoverWeekly, dailyMixes, releaseRadar } = state.smartPlaylists;
  
  let html = `<div class="smart-playlist-grid">`;
  
  // Discover Weekly
  html += `
    <div class="album-card smart-playlist-card" onclick="openSmartPlaylist('${discoverWeekly.id}')">
      <div class="album-image" style="background:linear-gradient(135deg,#1ed760,#169c46);">
        <i class="fa-solid fa-compass" style="font-size:36px;"></i>
        <button class="play-album-btn"><i class="fa-solid fa-play"></i></button>
      </div>
      <p class="album-title">${discoverWeekly.name}</p>
      <p class="album-desc">${discoverWeekly.description}</p>
    </div>
  `;
  
  // Daily Mixes
  if (dailyMixes) {
    dailyMixes.slice(0, 3).forEach(mix => {
      html += `
        <div class="album-card smart-playlist-card" onclick="openSmartPlaylist('${mix.id}')">
          <div class="album-image" style="background:linear-gradient(135deg,#e74c3c,#c0392b);">
            <i class="fa-solid fa-headphones" style="font-size:36px;"></i>
            <button class="play-album-btn"><i class="fa-solid fa-play"></i></button>
          </div>
          <p class="album-title">${mix.name}</p>
          <p class="album-desc">${mix.description}</p>
        </div>
      `;
    });
  }
  
  // Release Radar
  html += `
    <div class="album-card smart-playlist-card" onclick="openSmartPlaylist('${releaseRadar.id}')">
      <div class="album-image" style="background:linear-gradient(135deg,#0984e3,#74b9ff);">
        <i class="fa-solid fa-clock" style="font-size:36px;"></i>
        <button class="play-album-btn"><i class="fa-solid fa-play"></i></button>
      </div>
      <p class="album-title">${releaseRadar.name}</p>
      <p class="album-desc">${releaseRadar.description}</p>
    </div>
  `;
  
  html += `</div>`;
  container.innerHTML = html;
}

// =============================================
// 4. SOCIAL FEATURES
// =============================================

/**
 * Friend activity (mock data since real friends require auth)
 */
const MOCK_FRIENDS = [
  { name: 'Alex M.', avatar: null, color: '#e74c3c' },
  { name: 'Sarah K.', avatar: null, color: '#6c5ce7' },
  { name: 'Jamie R.', avatar: null, color: '#00cec9' },
  { name: 'Chris D.', avatar: null, color: '#f39c12' },
  { name: 'Morgan P.', avatar: null, color: '#e84393' },
];

function getFriendActivity() {
  // Generate mock activity based on actual songs in library
  const activity = [];
  
  if (state.songs.length === 0) return activity;
  
  MOCK_FRIENDS.forEach((friend, i) => {
    // Each friend has recently listened to some songs
    const numSongs = 1 + Math.floor(Math.random() * 3);
    const shuffled = [...state.songs].sort(() => Math.random() - 0.5);
    
    for (let j = 0; j < Math.min(numSongs, shuffled.length); j++) {
      const song = shuffled[j];
      const minutesAgo = Math.floor(Math.random() * 120) + 1;
      
      activity.push({
        friend: friend,
        song: song,
        timestamp: Date.now() - minutesAgo * 60000,
        timeAgo: minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`,
        action: Math.random() > 0.5 ? 'listened' : 'liked',
      });
    }
  });
  
  // Sort by most recent
  activity.sort((a, b) => b.timestamp - a.timestamp);
  
  return activity.slice(0, 20);
}

function renderFriendActivity() {
  const container = document.getElementById('friendActivityContainer');
  if (!container) return;
  
  const activity = getFriendActivity();
  
  if (activity.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px;color:var(--text-secondary);">
        <i class="fa-solid fa-user-group" style="font-size:32px;margin-bottom:12px;opacity:0.3;display:block;"></i>
        <p>Add songs to see friend activity</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = activity.map(a => {
    const idx = state.songs.findIndex(s => s.id === a.song.id);
    return `
      <div class="friend-activity-item" onclick="${idx >= 0 ? `loadSong(${idx})` : ''}" style="cursor:pointer;">
        <div class="friend-avatar" style="background:${a.friend.color};">
          <span>${a.friend.name.charAt(0)}</span>
        </div>
        <div class="friend-activity-info">
          <div class="friend-activity-text">
            <strong>${a.friend.name}</strong> 
            ${a.action === 'liked' ? '❤️ liked' : '🎧 listened to'}
          </div>
          <div class="friend-activity-song">${escapeHtml(a.song.title)} — ${escapeHtml(a.song.artist)}</div>
        </div>
        <span class="friend-activity-time">${a.timeAgo}</span>
      </div>
    `;
  }).join('');
}

// =============================================
// 5. ENHANCED SPOTIFY INTEGRATION
// =============================================

/**
 * Spotify Web Playback SDK integration
 * This would require the Spotify SDK script loaded separately
 */
async function initSpotifyWebPlayback() {
  // This requires @spotify/web-playback-sdk
  // For now, we enhance the existing API-based integration
  const token = await getSpotifyToken();
  if (token) {
    // Check if we can get user's playlists
    try {
      const r = await fetch('https://api.spotify.com/v1/me/playlists?limit=10', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (r.ok) {
        const data = await r.json();
        return data.items || [];
      }
    } catch(e) {
      console.log('Spotify user playlists not available (need user auth)');
    }
  }
  return [];
}

/**
 * Enhanced Spotify recommendations with genre seeds
 */
async function getEnhancedSpotifyRecs() {
  // Get genres from user's liked songs
  const likedGenres = new Set();
  state.likedSongs.forEach(id => {
    const song = state.songs.find(s => s.id === id);
    if (song && song.genre) likedGenres.add(song.genre);
  });
  
  const seedGenres = likedGenres.size > 0 
    ? [...likedGenres].slice(0, 5) 
    : ['pop', 'rock', 'electronic'];
  
  const tracks = await getSpotifyRecommendations(seedGenres);
  
  if (tracks.length > 0) {
    tracks.forEach(track => {
      // Check if we already have it
      if (state.songs.find(s => s.title === track.title && s.artist === track.artist)) return;
      
      addSong({
        id: randomId(),
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        genre: '',
        duration: track.duration || 180,
        audioData: null,
        coverData: track.cover || null,
        addedAt: Date.now(),
        fromSpotify: true,
        spotifyId: track.id,
      });
    });
    
    showToast(`🎵 Added ${tracks.length} songs from Spotify recommendations!`, 'fa-spotify');
  }
}

// =============================================
// 6. UI SETUP & INTEGRATION
// =============================================

function setupNewFeatures() {
  setupAIGenUI();
  generateSmartPlaylists();
  renderFriendActivity();
  updateAIGenUI();
  
  // Ensure the existing AI Music Discovery section from ai_music_discover.js loads
  if (typeof setupAIMusicDiscovery === 'function') {
    setTimeout(setupAIMusicDiscovery, 200);
  }
  
  // Setup studio tab switching for AI Music tab (if not already bound)
  if (!document.querySelector('.studio-tab[data-studio-tab="ai-gen"]')?.dataset._handlerSetup) {
    document.querySelectorAll('.studio-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.studioTab;
        document.querySelectorAll('.studio-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.studio-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const content = document.getElementById('studio-' + tabId);
        if (content) {
          content.classList.add('active');
          if (tabId === 'ai-gen') {
            setupAIGenUI();
            updateAIGenUI();
          }
        }
      });
    });
    document.querySelectorAll('.studio-tab').forEach(t => t.dataset._handlerSetup = 'true');
  }
  
  // Re-generate smart playlists on navigation to home
  const homeNav = document.querySelector('.nav-link[data-page="home"]');
  if (homeNav && !homeNav.dataset._smartNavSetup) {
    homeNav.addEventListener('click', () => {
      setTimeout(() => {
        generateSmartPlaylists();
        renderFriendActivity();
      }, 100);
    });
    homeNav.dataset._smartNavSetup = 'true';
  }
}

// Auto-run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupNewFeatures, 500);
  });
} else {
  setTimeout(setupNewFeatures, 500);
}

// Hook into renderAll for continuous updates
// Use the existing patching pattern from features.js
if (typeof renderAll !== 'undefined') {
  const __origRenderAll = renderAll;
  renderAll = function() {
    __origRenderAll();
    renderSmartPlaylists();
    renderFriendActivity();
    updateAIGenUI();
  };
}

// Export functions
window.generateAIMusic = generateAIMusic;
window.generateMusicWithHF = generateMusicWithHF;
window.generateBrowserMusic = generateBrowserMusic;
window.generateSmartPlaylists = generateSmartPlaylists;
window.openSmartPlaylist = openSmartPlaylist;
window.renderSmartPlaylists = renderSmartPlaylists;
window.renderFriendActivity = renderFriendActivity;
window.getFriendActivity = getFriendActivity;
window.initSpotifyWebPlayback = initSpotifyWebPlayback;
window.getEnhancedSpotifyRecs = getEnhancedSpotifyRecs;
window.setupNewFeatures = setupNewFeatures;
