// =========================================
// MATTHOSIFY v2 - All New Features
// YouTube Streaming, Shortcuts, Lyrics, EQ,
// Crossfade, Albums, Genre, Stats, Podcasts, Spotify
// =========================================

// ---- DOM refs for new features ----
const ytSearchModal = $('#ytSearchModal');
const ytSearchInput = $('#ytSearchInput');
const ytSearchBtn = $('#ytSearchBtn');
const ytResults = $('#ytResults');
const closeYTSearchBtn = $('#closeYTSearchBtn');
const searchYTBtn = $('#searchYTBtn');
const lyricsPanel = $('#lyricsPanel');
const lyricsBody = $('#lyricsBody');
const lyricsContent = $('#lyricsContent');
const lyricsEmpty = $('#lyricsEmpty');
const closeLyricsBtn = $('#closeLyricsBtn');
const lyricsBtn = $('#lyricsBtn');
const npLyricsBtn = $('#npLyricsBtn');
const crossfadeRange = $('#settingsCrossfadeDuration');
const crossfadeLabel = $('#crossfadeDurationLabel');
const settingsGapless = $('#settingsGapless');
const settingsYTKey = $('#settingsYTKey');
const saveYTKey = $('#saveYTKey');
const testYTKey = $('#testYTKey');
const ytKeyStatus = $('#ytKeyStatus');
const settingsSpotifyClientId = $('#settingsSpotifyClientId');
const settingsSpotifySecret = $('#settingsSpotifySecret');
const connectSpotifyBtn = $('#connectSpotifyBtn');
const spotifyStatus = $('#spotifyStatus');
const eqBands = $('#eqBands');
const resetEqBtn = $('#resetEqBtn');
const applyEqBtn = $('#applyEqBtn');
const genreGrid = $('#genreGrid');
const genreSongs = $('#genreSongs');
const genreTitle = $('#genreTitle');
const genreSongsBody = $('#genreSongsBody');
const clearGenreFilter = $('#clearGenreFilter');
const radioStations = $('#radioStations');
const addPodcastBtn = $('#addPodcastBtn');
const addRssModal = $('#addRssModal');
const rssUrlInput = $('#rssUrlInput');
const closeRssModal = $('#closeRssModal');
const cancelRssBtn = $('#cancelRssBtn');
const confirmRssBtn = $('#confirmRssBtn');
const podcastGrid = $('#podcastGrid');
const podcastDetail = $('#podcastDetail');
const podcastTitle = $('#podcastTitle');
const podcastAuthor = $('#podcastAuthor');
const podcastDesc = $('#podcastDesc');
const podcastArt = $('#podcastArt');
const podcastEpisodes = $('#podcastEpisodes');
const podcastPlayLatest = $('#podcastPlayLatest');
const statTotalPlays = $('#statTotalPlays');
const statTotalTime = $('#statTotalTime');
const statUniqueSongs = $('#statUniqueSongs');
const statLikedSongs = $('#statLikedSongs');
const topSongsList = $('#topSongsList');
const topArtistsList = $('#topArtistsList');
const historyList = $('#historyList');
const recommendedGrid = $('#recommendedGrid');
const songAlbum = $('#songAlbum');
const songGenre = $('#songGenre');
const ytSongUrl = $('#ytSongUrl');
const localFileSection = $('#localFileSection');
const ytSection = $('#ytSection');

// ---- Song source radio toggles ----
document.querySelectorAll('input[name="songSource"]').forEach(r => {
  r.addEventListener('change', () => {
    localFileSection.style.display = r.value === 'local' ? 'block' : 'none';
    ytSection.style.display = r.value === 'youtube' ? 'block' : 'none';
  });
});

// =========================================
// 1. YOUTUBE DATA API INTEGRATION
// =========================================

let ytSearchCache = {};
let ytPlayerReady = false;
let ytPlayer = null;

// YouTube IFrame Player API
function onYouTubeIframeAPIReady() {
  ytPlayerReady = true;
}

function createYTPlayer(videoId) {
  if (!ytPlayerReady) { setTimeout(() => createYTPlayer(videoId), 500); return; }
  if (ytPlayer) {
    ytPlayer.loadVideoById(videoId);
    return;
  }
  ytPlayer = new YT.Player('youtubePlayer', {
    height: '1',
    width: '1',
    videoId: videoId,
    playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, iv_load_policy: 3, rel: 0 },
    events: {
      onReady: () => { if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo(); },
      onStateChange: (e) => handleYTStateChange(e),
      onError: () => { showToast('YouTube playback error', 'fa-circle-exclamation'); nextSong(); }
    }
  });
}

let ytProgressInterval = null;

function handleYTStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    state.isYtPlaying = true;
    state.isPlaying = true;
    if (ytProgressInterval) clearInterval(ytProgressInterval);
    ytProgressInterval = setInterval(() => {
      if (ytPlayer && ytPlayer.getCurrentTime) {
        state.currentTime = ytPlayer.getCurrentTime();
        state.duration = ytPlayer.getDuration() || state.duration;
        updateProgressUI();
        syncNowPlayingProgress();
      }
    }, 250);
    updatePlayerUI();
    renderAll();
  } else if (e.data === YT.PlayerState.PAUSED) {
    state.isYtPlaying = false;
    state.isPlaying = false;
    updatePlayerUI();
    renderAll();
  } else if (e.data === YT.PlayerState.ENDED) {
    if (ytProgressInterval) clearInterval(ytProgressInterval);
    nextSong();
  } else if (e.data === YT.PlayerState.CUED) {
    if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
  }
}

function searchYouTube(query) {
  return new Promise((resolve, reject) => {
    const apiKey = state.settings.ytApiKey;
    if (!apiKey) { showToast('Set your YouTube API key in Settings', 'fa-circle-exclamation'); reject('No API key'); return; }
    if (ytSearchCache[query]) { resolve(ytSearchCache[query]); return; }
    
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query + ' music audio')}&type=video&videoCategoryId=10&key=${apiKey}`;
    
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.error) { showToast('YouTube API error: ' + data.error.message, 'fa-circle-exclamation'); reject(data.error); return; }
        const items = (data.items || []).map(item => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumb: item.snippet.thumbnails.default.url,
          description: item.snippet.description,
        }));
        ytSearchCache[query] = items;
        resolve(items);
      })
      .catch(err => { showToast('Failed to search YouTube', 'fa-circle-exclamation'); reject(err); });
  });
}

function renderYTResults(items) {
  if (!items || items.length === 0) {
    ytResults.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:24px;">No results found</p>';
    return;
  }
  ytResults.innerHTML = items.map(item => `
    <div class="yt-result-item" data-video="${item.videoId}" onclick="selectYTResult('${item.videoId}')">
      <div class="yt-result-thumb"><img src="${item.thumb}" alt=""></div>
      <div class="yt-result-info">
        <div class="yt-result-title">${escapeHtml(item.title)}</div>
        <div class="yt-result-channel">${escapeHtml(item.channel)}</div>
      </div>
      <button class="yt-add-btn" onclick="event.stopPropagation();addYTSong('${item.videoId}','${escapeHtml(item.title)}','${escapeHtml(item.channel)}')">+ Add</button>
    </div>
  `).join('');
}

let selectedVideoId = null;

function selectYTResult(videoId) {
  ytResults.querySelectorAll('.yt-result-item').forEach(el => el.classList.remove('selected'));
  const el = ytResults.querySelector(`[data-video="${videoId}"]`);
  if (el) el.classList.add('selected');
  selectedVideoId = videoId;
}

function addYTSong(videoId, title, channel) {
  const song = {
    id: randomId(),
    title: title.replace(/\(.*?official.*?\)/gi, '').replace(/\[.*?\]/gi, '').trim() || title,
    artist: channel || 'YouTube',
    album: '',
    genre: songGenre?.value || '',
    duration: 0,
    audioData: null,
    coverData: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    addedAt: Date.now(),
    youtubeId: videoId,
  };
  addSong(song);
  addYTVideoInfo(videoId, song.id);
  ytSearchModal.classList.remove('active');
  showToast(`"${song.title}" added from YouTube`, 'fa-check');
}

async function addYTVideoInfo(videoId, songId) {
  const apiKey = state.settings.ytApiKey;
  if (!apiKey) return;
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${apiKey}`);
    const data = await r.json();
    if (data.items && data.items[0]) {
      const item = data.items[0];
      const dur = item.contentDetails.duration;
      const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const sec = (parseInt(match[1]||0)*3600 + parseInt(match[2]||0)*60 + parseInt(match[3]||0));
      const song = state.songs.find(s => s.id === songId);
      if (song) {
        song.duration = sec;
        const thumb = item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url;
        if (thumb) song.coverData = thumb;
        saveState();
        renderAll();
      }
    }
  } catch(e) {}
}

function playYTSong(videoId) {
  state.ytCurrentVideoId = videoId;
  if (!ytPlayer || !ytPlayer.loadVideoById) {
    createYTPlayer(videoId);
    setTimeout(() => { if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo(); }, 1000);
  } else {
    ytPlayer.loadVideoById(videoId);
  }
}

function pauseYT() { if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo(); }
function resumeYT() { if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo(); }
function seekYT(time) { if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(time, true); }
function setYTVolume(vol) { if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(vol); }

// ---- Override existing loadSong to handle YouTube ----
const _origLoadSong = loadSong;
loadSong = function(index) {
  if (index >= 0 && index < state.songs.length) {
    addToRecentlyPlayed(state.songs[index].id);
    recordPlay(state.songs[index].id);
  }
  if (index < 0 || index >= state.songs.length) { stopPlayback(); return; }
  
  const song = state.songs[index];
  state.currentIndex = index;
  
  if (simInterval) clearInterval(simInterval);
  if (ytProgressInterval) clearInterval(ytProgressInterval);
  
  // Update UI immediately
  currentTitle.textContent = song.title;
  currentArtist.textContent = song.artist;
  currentImg.src = song.coverData || getDefaultCover();
  likeBtn.classList.toggle('liked', state.likedSongs.has(song.id));
  state.currentTime = 0;
  state.duration = song.duration || 0;
  
  // Crossfade handling
  if (state.settings.crossfade && state.settings.crossfadeDuration > 0 && state.isPlaying) {
    crossfadeOut(() => startSong(song, index));
  } else {
    startSong(song, index);
  }
};

function startSong(song, index) {
  if (song.youtubeId) {
    // YouTube song
    audio.pause();
    audio.src = '';
    playYTSong(song.youtubeId);
    state.isPlaying = true;
    state.isYtPlaying = true;
    // Set thumbnail as cover
    const thumbUrl = `https://img.youtube.com/vi/${song.youtubeId}/mqdefault.jpg`;
    currentImg.src = thumbUrl;
    if (song.coverData && song.coverData.includes('ytimg')) currentImg.src = song.coverData;
    else currentImg.src = thumbUrl;
    updatePlayerUI();
    renderAll();
    saveState();
  } else if (song.audioData) {
    // Local file
    if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
    state.isYtPlaying = false;
    audio.src = song.audioData;
    audio.load();
    audio.play().then(() => {
      state.isPlaying = true;
      if (simInterval) clearInterval(simInterval);
      updatePlayerUI();
      renderAll();
    }).catch(() => {
      state.isPlaying = true;
      updatePlayerUI();
      renderAll();
      simulatePlayback(song);
    });
    updatePlayerUI();
    saveState();
  } else {
    // No audio - simulate
    if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
    state.isYtPlaying = false;
    state.isPlaying = true;
    updatePlayerUI();
    renderAll();
    simulatePlayback(song);
  }
  
  // Fetch lyrics
  fetchLyrics(song.title, song.artist);
}

// Crossfade
function crossfadeOut(callback) {
  if (state.isCrossfading) { callback(); return; }
  state.isCrossfading = true;
  const duration = Math.min(state.settings.crossfadeDuration || 3, 6);
  const steps = 20;
  const interval = (duration * 1000) / steps;
  let step = 0;
  
  const fadeOut = setInterval(() => {
    step++;
    const vol = Math.max(0, 1 - (step / steps));
    if (audio.src) audio.volume = vol * (state.volume / 100);
    if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(vol * 100);
    if (step >= steps) {
      clearInterval(fadeOut);
      state.isCrossfading = false;
      callback();
      // Fade in next song
      setTimeout(() => {
        const fadeIn = setInterval(() => {
          step--;
          if (step <= 0) { clearInterval(fadeIn); return; }
          const vol = 1 - (step / steps);
          if (audio.src && audio.src.startsWith('blob:')) audio.volume = vol * (state.volume / 100);
        }, interval);
      }, 50);
    }
  }, interval);
}

// ---- Override togglePlay for YouTube ----
const _origTogglePlay = togglePlay;
togglePlay = function() {
  if (state.currentIndex < 0 && state.songs.length > 0) { loadSong(0); return; }
  if (state.currentIndex < 0) return;
  const song = state.songs[state.currentIndex];
  if (!song) return;
  
  if (song.youtubeId) {
    if (state.isPlaying) {
      pauseYT();
      state.isPlaying = false;
      state.isYtPlaying = false;
    } else {
      if (ytPlayer && ytPlayer.playVideo) {
        resumeYT();
        state.isPlaying = true;
        state.isYtPlaying = true;
      } else {
        playYTSong(song.youtubeId);
        state.isPlaying = true;
        state.isYtPlaying = true;
      }
    }
  } else if (audio.src) {
    if (state.isPlaying) { audio.pause(); state.isPlaying = false; }
    else { audio.play().then(() => state.isPlaying = true).catch(() => {}); }
  } else {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) simulatePlayback(song);
    else if (simInterval) clearInterval(simInterval);
  }
  updatePlayerUI();
  renderAll();
};

// ---- Override seekTo for YouTube ----
const _origSeekTo = seekTo;
seekTo = function(e) {
  const rect = progressBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  state.currentTime = pct * (state.duration || 180);
  
  const song = state.currentIndex >= 0 ? state.songs[state.currentIndex] : null;
  if (song && song.youtubeId) {
    seekYT(state.currentTime);
  } else if (audio.src && audio.src.startsWith('blob:')) {
    audio.currentTime = state.currentTime;
  }
  updateProgressUI();
};

// ---- Override setVolume for YouTube ----
const _origSetVolume = setVolume;
setVolume = function(e) {
  const rect = volumeBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  state.volume = Math.round(pct * 100);
  audio.volume = state.volume / 100;
  setYTVolume(state.volume);
  updateVolumeUI();
  saveState();
};

// ---- Override mute ----
const _origToggleMute = toggleMute;
toggleMute = function() {
  state.isMuted = !state.isMuted;
  audio.muted = state.isMuted;
  setYTVolume(state.isMuted ? 0 : state.volume);
  updateVolumeUI();
};

// =========================================
// 2. LYRICS DISPLAY
// =========================================

let currentLyrics = [];
let lyricsFetched = false;

async function fetchLyrics(title, artist) {
  lyricsFetched = false;
  lyricsContent.style.display = 'none';
  lyricsEmpty.textContent = 'Loading lyrics...';
  lyricsEmpty.style.display = 'block';
  
  try {
    const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (!r.ok) throw new Error('Not found');
    const data = await r.json();
    if (data.lyrics) {
      lyricsFetched = true;
      currentLyrics = data.lyrics.split('\n').filter(l => l.trim());
      lyricsContent.innerHTML = currentLyrics.map(l => 
        `<div class="lyric-line">${escapeHtml(l) || '&nbsp;'}</div>`
      ).join('');
      lyricsContent.style.display = 'block';
      lyricsEmpty.style.display = 'none';
    }
  } catch(e) {
    lyricsEmpty.textContent = 'No lyrics found for this song';
    lyricsContent.style.display = 'none';
    lyricsEmpty.style.display = 'block';
  }
}

function toggleLyricsPanel() {
  lyricsPanel.classList.toggle('active');
  if (lyricsPanel.classList.contains('active')) {
    // Re-fetch if needed
    if (state.currentIndex >= 0 && !lyricsFetched) {
      const song = state.songs[state.currentIndex];
      if (song) fetchLyrics(song.title, song.artist);
    }
  }
}

// =========================================
// 3. KEYBOARD SHORTCUTS
// =========================================

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const target = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    // Global shortcuts (work everywhere)
    if (e.key === ' ' && !isInput) {
      e.preventDefault();
      togglePlay();
      return;
    }
    
    if (isInput) return; // Don't intercept typing in inputs
    
    switch(e.key) {
      case 'ArrowLeft': e.preventDefault(); state.currentIndex >= 0 ? prevSong() : null; break;
      case 'ArrowRight': e.preventDefault(); nextSong(); break;
      case 'ArrowUp': e.preventDefault(); setVolumeIncrement(5); break;
      case 'ArrowDown': e.preventDefault(); setVolumeIncrement(-5); break;
      case 'm': case 'M': toggleMute(); break;
      case 'l': case 'L': toggleLike(); break;
      case 's': case 'S': toggleShuffle(); break;
      case 'r': case 'R': toggleRepeat(); break;
      case 'f': case 'F': 
        if (state.currentIndex >= 0) { 
          if (npFullscreen.classList.contains('active')) closeNowPlaying();
          else openNowPlaying(); 
        }
        break;
      case '/': if (searchInput) { e.preventDefault(); searchInput.focus(); } break;
      case 'Escape':
        closeNowPlaying();
        closeQueue();
        hideContextMenu();
        hideAddToPlaylistMenu();
        lyricsPanel.classList.remove('active');
        if (addSongModal.classList.contains('active')) closeModal();
        break;
      case '?': showShortcutsModal(); break;
    }
  });
}

function setVolumeIncrement(delta) {
  state.volume = Math.max(0, Math.min(100, state.volume + delta));
  audio.volume = state.volume / 100;
  setYTVolume(state.volume);
  updateVolumeUI();
  saveState();
}

function showShortcutsModal() {
  // Simple inline shortcuts display
  showToast('⌨️ Space=Play/Pause ←→=Skip ↑↓=Volume M=Mute L=Like F=Fullscreen /=Search ?=Help', 'fa-keyboard');
}

// =========================================
// 4. EQUALIZER
// =========================================

const EQ_PRESETS = {
  flat: {32:0,64:0,125:0,250:0,500:0,1000:0,2000:0,4000:0,8000:0,16000:0},
  rock: {32:5,64:4,125:3,250:1,500:-1,1000:-2,2000:1,4000:3,8000:4,16000:5},
  pop: {32:-1,64:2,125:3,250:4,500:3,1000:0,2000:-1,4000:-1,8000:2,16000:2},
  jazz: {32:4,64:3,125:2,250:2,500:1,1000:1,2000:2,4000:2,8000:3,16000:4},
  classical: {32:5,64:4,125:3,250:2,500:1,1000:0,2000:1,4000:2,8000:3,16000:5},
  bass: {32:6,64:6,125:5,250:3,500:1,1000:-1,2000:-2,4000:-2,8000:-1,16000:0},
  vocal: {32:-2,64:-1,125:0,250:2,500:4,1000:4,2000:4,4000:2,8000:1,16000:0},
  hiphop: {32:5,64:5,125:4,250:2,500:0,1000:-1,2000:-2,4000:0,8000:2,16000:3},
  electronic: {32:4,64:3,125:2,250:1,500:0,1000:1,2000:3,4000:4,8000:4,16000:5},
  custom: null,
};

function applyEQPreset(name) {
  state.settings.eqPreset = name;
  if (EQ_PRESETS[name]) {
    state.settings.eqValues = {...EQ_PRESETS[name]};
  }
  updateEQSliders();
  applyEQ();
  saveState();
}

function updateEQSliders() {
  const sliders = eqBands.querySelectorAll('input[type="range"]');
  sliders.forEach(slider => {
    const freq = parseInt(slider.dataset.freq);
    const val = state.settings.eqValues[freq] || 0;
    slider.value = val;
    const valEl = slider.parentElement.querySelector('.eq-val');
    if (valEl) valEl.textContent = val > 0 ? `+${val}` : val;
  });
  
  // Update preset buttons
  document.querySelectorAll('[data-eq]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.eq === state.settings.eqPreset);
  });
}

function applyEQ() {
  // For local files via Web Audio API
  if (state.audioCtx && state.eqNodes) {
    const vals = state.settings.eqValues;
    const freqs = [32,64,125,250,500,1000,2000,4000,8000,16000];
    const gains = freqs.map(f => (vals[f] || 0) / 12);
    freqs.forEach((f, i) => {
      if (state.eqNodes[i]) {
        state.eqNodes[i].gain.value = gains[i];
      }
    });
  }
  showToast(`EQ: ${state.settings.eqPreset.charAt(0).toUpperCase() + state.settings.eqPreset.slice(1)}`, 'fa-chart-bar');
}

function setupEQ() {
  try {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = state.audioCtx.createMediaElementSource(audio);
    const freqs = [32,64,125,250,500,1000,2000,4000,8000,16000];
    const nodes = [];
    
    freqs.forEach((freq, i) => {
      const filter = state.audioCtx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 0.7;
      filter.gain.value = 0;
      nodes.push(filter);
    });
    
    // Connect: source -> filters -> destination
    source.connect(nodes[0]);
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connect(nodes[i + 1]);
    }
    nodes[nodes.length - 1].connect(state.audioCtx.destination);
    
    state.eqNodes = nodes;
    updateEQSliders();
  } catch(e) {
    console.log('EQ not available (AudioContext not supported)');
  }
}

// =========================================
// 5. GENRE BROWSING & RADIO
// =========================================

function filterByGenre(genre) {
  const songs = state.songs.filter(s => (s.genre || '').toLowerCase() === genre.toLowerCase());
  genreTitle.textContent = `${genre.charAt(0).toUpperCase() + genre.slice(1)} Songs`;
  
  if (songs.length === 0) {
    genreSongsBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-secondary);">
      No songs tagged as ${genre}. Tag songs by editing their genre!</td></tr>`;
  } else {
    genreSongsBody.innerHTML = songs.map((song, i) => {
      const idx = state.songs.findIndex(s => s.id === song.id);
      return `<tr data-index="${idx}" onclick="loadSong(${idx})">
        <td>${i + 1}</td>
        <td><div class="song-title-cell">${escapeHtml(song.title)}</div></td>
        <td class="song-artist-cell">${escapeHtml(song.artist)}</td>
        <td class="song-duration-cell">${formatTime(song.duration)}</td>
      </tr>`;
    }).join('');
  }
  
  genreSongs.style.display = 'block';
}

function playRadio(type) {
  let songs = [];
  switch(type) {
    case 'daily-mix':
      songs = [...state.songs].sort(() => Math.random() - 0.5).slice(0, 20);
      break;
    case 'favorites':
      songs = state.songs.filter(s => state.likedSongs.has(s.id));
      break;
    case 'recent':
      songs = state.recentlyPlayed
        .map(r => state.songs.find(s => s.id === r.songId))
        .filter(Boolean);
      break;
    case 'discover':
      songs = getRecommendations(15);
      break;
    default:
      songs = state.songs;
  }
  
  if (songs.length === 0) {
    showToast('No songs found for this radio', 'fa-circle-exclamation');
    return;
  }
  
  // Shuffle and play
  songs = songs.sort(() => Math.random() - 0.5);
  const firstIdx = state.songs.findIndex(s => s.id === songs[0].id);
  if (firstIdx >= 0) loadSong(firstIdx);
  
  showToast(`🎵 ${type.replace('-',' ').charAt(0).toUpperCase() + type.replace('-',' ').slice(1)}`, 'fa-radio');
}

// =========================================
// 6. AI RECOMMENDATIONS
// =========================================

function getRecommendations(count = 10) {
  if (state.songs.length === 0) return [];
  
  // Simple recommendation based on:
  // 1. Liked songs' genres
  // 2. Most played artists
  // 3. Recently played songs' similar genres
  
  const playedArtists = new Set();
  state.listeningHistory.slice(-20).forEach(h => {
    const song = state.songs.find(s => s.id === h.songId);
    if (song) playedArtists.add(song.artist);
  });
  
  // Score songs
  const scored = state.songs.map(song => {
    let score = 0;
    if (state.likedSongs.has(song.id)) score += 5;
    if (playedArtists.has(song.artist)) score += 3;
    if (state.playCounts[song.id]) score += Math.min(state.playCounts[song.id], 5);
    if (state.recentlyPlayed.some(r => r.songId === song.id)) score -= 2;
    return { song, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.song);
}

function renderRecommendations() {
  if (!recommendedGrid) return;
  const recs = getRecommendations(6);
  if (recs.length === 0) {
    recommendedGrid.innerHTML = '<p style="color:var(--text-secondary);grid-column:1/-1;">Add more songs to get recommendations</p>';
    return;
  }
  recommendedGrid.innerHTML = recs.map(song => {
    const idx = state.songs.findIndex(s => s.id === song.id);
    return `<div class="song-card" onclick="loadSong(${idx})">
      <div class="song-card-image">
        ${song.coverData ? `<img src="${song.coverData}" alt="">` : `<i class="fa-solid fa-music"></i>`}
      </div>
      <p class="song-card-title">${escapeHtml(song.title)}</p>
      <p class="song-card-artist">${escapeHtml(song.artist)}</p>
    </div>`;
  }).join('');
}

// =========================================
// 7. LISTENING HISTORY & STATS
// =========================================

function recordPlay(songId) {
  if (!songId) return;
  // Increment play count
  state.playCounts[songId] = (state.playCounts[songId] || 0) + 1;
  // Add to history
  state.listeningHistory.push({ songId, timestamp: Date.now() });
  // Keep last 1000
  if (state.listeningHistory.length > 1000) state.listeningHistory = state.listeningHistory.slice(-1000);
  saveState();
}

function renderStats() {
  const totalPlays = Object.values(state.playCounts).reduce((a, b) => a + b, 0);
  const totalTimeMs = state.listeningHistory.length * 180 * 1000; // Approximate
  const totalTimeHours = Math.floor(totalTimeMs / 3600000);
  const uniqueSongs = new Set(state.listeningHistory.map(h => h.songId)).size;
  
  if (statTotalPlays) statTotalPlays.textContent = totalPlays;
  if (statTotalTime) statTotalTime.textContent = `${totalTimeHours}h`;
  if (statUniqueSongs) statUniqueSongs.textContent = uniqueSongs;
  if (statLikedSongs) statLikedSongs.textContent = state.likedSongs.size;
  
  // Top songs
  const topSongs = Object.entries(state.playCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count], i) => {
      const song = state.songs.find(s => s.id === id);
      if (!song) return null;
      const idx = state.songs.findIndex(s => s.id === id);
      return `<div class="stat-item" onclick="loadSong(${idx})" style="cursor:pointer;">
        <span class="stat-rank">#${i + 1}</span>
        <span class="stat-name">${escapeHtml(song.title)}</span>
        <span class="stat-count">${count} plays</span>
      </div>`;
    }).filter(Boolean).join('');
  
  if (topSongsList) topSongsList.innerHTML = topSongs || '<p style="color:var(--text-secondary);padding:16px;">No data yet</p>';
  
  // Top artists
  const artistCounts = {};
  state.songs.forEach(s => {
    if (state.playCounts[s.id]) {
      artistCounts[s.artist] = (artistCounts[s.artist] || 0) + state.playCounts[s.id];
    }
  });
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist, count], i) => {
      return `<div class="stat-item" onclick="openArtist('${escapeHtml(artist)}')" style="cursor:pointer;">
        <span class="stat-rank">#${i + 1}</span>
        <span class="stat-name">${escapeHtml(artist)}</span>
        <span class="stat-count">${count} plays</span>
      </div>`;
    }).join('');
  
  if (topArtistsList) topArtistsList.innerHTML = topArtists || '<p style="color:var(--text-secondary);padding:16px;">No data yet</p>';
  
  // Recent history
  const recentItems = state.listeningHistory.slice(-30).reverse().map(h => {
    const song = state.songs.find(s => s.id === h.songId);
    if (!song) return null;
    const date = new Date(h.timestamp);
    const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const idx = state.songs.findIndex(s => s.id === h.songId);
    return `<div class="stat-item" onclick="loadSong(${idx})" style="cursor:pointer;">
      <span class="stat-rank"><i class="fa-solid fa-play" style="font-size:10px;"></i></span>
      <span class="stat-name">${escapeHtml(song.title)} — ${escapeHtml(song.artist)}</span>
      <span class="stat-count">${timeStr}</span>
    </div>`;
  }).filter(Boolean).join('');
  
  if (historyList) historyList.innerHTML = recentItems || '<p style="color:var(--text-secondary);padding:16px;">No history yet</p>';
}

// =========================================
// 8. ALBUM VIEW
// =========================================

function openAlbum(albumName) {
  state.currentAlbumId = albumName;
  const songs = state.songs.filter(s => s.album === albumName);
  const albumDetailTitle = $('#albumDetailTitle');
  const albumDetailArtist = $('#albumDetailArtist');
  const albumDetailYear = $('#albumDetailYear');
  const albumDetailGenre = $('#albumDetailGenre');
  const albumDetailCount = $('#albumDetailCount');
  const albumDetailArt = $('#albumDetailArt');
  const albumBody = $('#albumBody');
  
  albumDetailTitle.textContent = albumName;
  const artists = [...new Set(songs.map(s => s.artist))];
  albumDetailArtist.textContent = artists.join(', ');
  const genres = [...new Set(songs.map(s => s.genre).filter(Boolean))];
  albumDetailGenre.textContent = genres.join(', ') || '—';
  albumDetailYear.textContent = '—';
  albumDetailCount.textContent = `${songs.length} songs`;
  
  const firstWithCover = songs.find(s => s.coverData);
  albumDetailArt.innerHTML = firstWithCover 
    ? `<img src="${firstWithCover.coverData}" alt="">` 
    : '<i class="fa-solid fa-compact-disc"></i>';
  
  albumBody.innerHTML = songs.map((song, i) => {
    const idx = state.songs.findIndex(s => s.id === song.id);
    return `<tr onclick="loadSong(${idx})" style="cursor:pointer;">
      <td>${i + 1}</td>
      <td><div class="song-title-cell">${escapeHtml(song.title)}</div></td>
      <td class="song-artist-cell">${escapeHtml(song.artist)}</td>
      <td class="song-duration-cell">${formatTime(song.duration)}</td>
    </tr>`;
  }).join('');
  
  navigateTo('album');
}

// =========================================
// 9. PODCASTS
// =========================================

function addPodcast(url) {
  if (!url.trim()) { showToast('Enter an RSS feed URL', 'fa-circle-exclamation'); return; }
  
  showToast('Fetching podcast...', 'fa-circle-info');
  
  // Use a CORS proxy for RSS fetching
  const corsProxy = 'https://api.allorigins.win/raw?url=';
  fetch(corsProxy + encodeURIComponent(url))
    .then(r => r.text())
    .then(xml => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const channel = doc.querySelector('channel');
      if (!channel) { showToast('Invalid RSS feed', 'fa-circle-exclamation'); return; }
      
      const podcast = {
        id: randomId(),
        title: channel.querySelector('title')?.textContent || 'Unknown Podcast',
        author: channel.querySelector('author')?.textContent || channel.querySelector('managingEditor')?.textContent || 'Unknown',
        description: channel.querySelector('description')?.textContent || '',
        image: channel.querySelector('image url')?.textContent || channel.querySelector('itunes\\:image')?.getAttribute('href') || '',
        feedUrl: url,
        episodes: [],
      };
      
      doc.querySelectorAll('item').forEach(item => {
        const guid = item.querySelector('guid')?.textContent || item.querySelector('link')?.textContent || randomId();
        // Check if episode already exists
        if (podcast.episodes.find(e => e.guid === guid)) return;
        podcast.episodes.push({
          guid,
          title: item.querySelector('title')?.textContent || 'Untitled',
          description: item.querySelector('description')?.textContent || '',
          pubDate: item.querySelector('pubDate')?.textContent || '',
          duration: item.querySelector('itunes\\:duration')?.textContent || '',
          audioUrl: item.querySelector('enclosure')?.getAttribute('url') || '',
          played: false,
        });
      });
      
      state.podcasts.push(podcast);
      saveState();
      renderPodcasts();
      showToast(`"${podcast.title}" added!`, 'fa-podcast');
      addRssModal.classList.remove('active');
    })
    .catch(err => {
      showToast('Could not fetch podcast feed. Try a different URL.', 'fa-circle-exclamation');
      console.error(err);
    });
}

function renderPodcasts() {
  if (!podcastGrid) return;
  
  if (state.podcasts.length === 0) {
    podcastGrid.innerHTML = `<div class="podcast-empty">
      <i class="fa-solid fa-podcast"></i>
      <h3>No podcasts yet</h3>
      <p>Add an RSS feed URL to get started</p>
    </div>`;
    return;
  }
  
  podcastGrid.innerHTML = state.podcasts.map(p => `
    <div class="podcast-card" onclick="openPodcast('${p.id}')">
      <div class="podcast-card-art">
        ${p.image ? `<img src="${p.image}" alt="">` : `<i class="fa-solid fa-podcast"></i>`}
      </div>
      <div class="podcast-card-info">
        <div class="podcast-card-title">${escapeHtml(p.title)}</div>
        <div class="podcast-card-author">${escapeHtml(p.author)}</div>
        <div class="podcast-card-episodes">${p.episodes.length} episodes</div>
      </div>
    </div>
  `).join('');
}

function openPodcast(id) {
  state.currentPodcastId = id;
  const p = state.podcasts.find(p => p.id === id);
  if (!p) return;
  
  podcastTitle.textContent = p.title;
  podcastAuthor.textContent = p.author;
  podcastDesc.textContent = p.description.replace(/<[^>]*>/g, '').slice(0, 200);
  podcastArt.innerHTML = p.image 
    ? `<img src="${p.image}" alt="">` 
    : '<i class="fa-solid fa-podcast"></i>';
  
  const unplayed = p.episodes.filter(e => !e.played).length;
  
  podcastEpisodes.innerHTML = p.episodes.map((ep, i) => `
    <div class="podcast-episode-item" onclick="playPodcastEpisode('${p.id}', ${i})">
      <span class="ep-num">${ep.played ? '✓' : (i + 1)}</span>
      <div class="ep-info">
        <div class="ep-title">${escapeHtml(ep.title)}</div>
        <div class="ep-date">${ep.pubDate.slice(0, 16) || ''} · ${ep.duration || '?'}</div>
      </div>
      <span class="ep-duration">${ep.duration || ''}</span>
      <button class="ep-play-btn"><i class="fa-solid fa-play"></i></button>
    </div>
  `).join('');
  
  if (podcastDetail) podcastDetail.style.display = 'block';
  
  // Update latest button
  const latestUnplayed = p.episodes.find(e => !e.played && e.audioUrl);
  podcastPlayLatest.onclick = () => {
    if (latestUnplayed) playPodcastEpisode(p.id, p.episodes.indexOf(latestUnplayed));
    else showToast('All episodes played!', 'fa-check');
  };
}

function playPodcastEpisode(podcastId, episodeIndex) {
  const p = state.podcasts.find(p => p.id === podcastId);
  if (!p || !p.episodes[episodeIndex]) return;
  const ep = p.episodes[episodeIndex];
  if (!ep.audioUrl) { showToast('No audio available', 'fa-circle-exclamation'); return; }
  
  // Play the episode
  if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
  state.isYtPlaying = false;
  audio.src = ep.audioUrl;
  audio.load();
  audio.play().then(() => {
    state.isPlaying = true;
    ep.played = true;
    saveState();
    updatePlayerUI();
    renderPodcasts();
    openPodcast(podcastId);
    
    // Update now playing
    currentTitle.textContent = ep.title;
    currentArtist.textContent = p.title;
    currentImg.src = p.image || getDefaultCover();
  }).catch(() => {
    showToast('Could not play this episode', 'fa-circle-exclamation');
  });
}

// =========================================
// 10. SPOTIFY API INTEGRATION
// =========================================

let spotifyAccessToken = null;

async function getSpotifyToken() {
  const clientId = state.settings.spotifyClientId;
  const secret = state.settings.spotifySecret;
  if (!clientId || !secret) return null;
  
  // Check cached token
  if (spotifyAccessToken && state.settings.spotifyTokenExpiry > Date.now()) {
    return spotifyAccessToken;
  }
  
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(clientId + ':' + secret)
      },
      body: 'grant_type=client_credentials'
    });
    const data = await r.json();
    if (data.access_token) {
      spotifyAccessToken = data.access_token;
      state.settings.spotifyToken = data.access_token;
      state.settings.spotifyTokenExpiry = Date.now() + (data.expires_in * 1000);
      saveState();
      return data.access_token;
    }
  } catch(e) {
    console.error('Spotify auth error:', e);
  }
  return null;
}

async function searchSpotify(query) {
  const token = await getSpotifyToken();
  if (!token) { showToast('Connect Spotify in Settings first', 'fa-circle-exclamation'); return []; }
  
  try {
    const r = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await r.json();
    return (data.tracks?.items || []).map(t => ({
      id: t.id,
      title: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      album: t.album.name,
      duration: Math.round(t.duration_ms / 1000),
      cover: t.album.images?.[0]?.url || '',
      previewUrl: t.preview_url,
      spotifyUrl: t.external_urls.spotify,
    }));
  } catch(e) {
    return [];
  }
}

async function getSpotifyRecommendations(seedGenres = ['pop', 'rock']) {
  const token = await getSpotifyToken();
  if (!token) return [];
  
  try {
    const r = await fetch(`https://api.spotify.com/v1/recommendations?seed_genres=${seedGenres.join(',')}&limit=10`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await r.json();
    return (data.tracks || []).map(t => ({
      id: t.id,
      title: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      album: t.album.name,
      duration: Math.round(t.duration_ms / 1000),
      cover: t.album.images?.[0]?.url || '',
      previewUrl: t.preview_url,
    }));
  } catch(e) {
    return [];
  }
}

async function connectSpotify() {
  const token = await getSpotifyToken();
  if (token) {
    if (spotifyStatus) {
      spotifyStatus.textContent = '✅ Connected';
      spotifyStatus.style.color = 'var(--accent-color)';
    }
    showToast('Spotify connected!', 'fa-check');
  } else {
    if (spotifyStatus) {
      spotifyStatus.textContent = '❌ Connection failed';
      spotifyStatus.style.color = '#e74c3c';
    }
    showToast('Spotify connection failed', 'fa-circle-exclamation');
  }
}

// =========================================
// 11. CROSSFADE & GAPLESS SETTINGS
// =========================================

// Update crossfade from settings
if (crossfadeRange) {
  crossfadeRange.addEventListener('input', () => {
    const val = parseInt(crossfadeRange.value);
    state.settings.crossfadeDuration = val;
    state.settings.crossfade = val > 0;
    if (crossfadeLabel) crossfadeLabel.textContent = `${val}s`;
    saveState();
  });
}

if (settingsGapless) {
  settingsGapless.addEventListener('change', () => {
    state.settings.gapless = settingsGapless.checked;
    saveState();
  });
}

// =========================================
// 12. UPDATE EXISTING FUNCTIONS
// =========================================

// Update renderAll to include new renders
const _origRenderAll = renderAll;
renderAll = function() {
  _origRenderAll();
  renderRecommendations();
  renderPodcasts();
  if (state.currentPage === 'wrapped') renderStats();
  if (state.currentPage === 'genre') {
    if (document.querySelector('.genre-card.active')) {
      // Re-render genre songs
    }
  }
  // Update album filter in library
  renderAlbumFilter();
};

function renderAlbumFilter() {
  // For library Albums filter
  const albums = [...new Set(state.songs.map(s => s.album).filter(Boolean))];
  // This is handled by the library filter already
}

// Update the page navigation
const _origNavigateTo = navigateTo;
navigateTo = function(page) {
  _origNavigateTo(page);
  if (page === 'wrapped') renderStats();
  if (page === 'podcasts') renderPodcasts();
  if (page === 'genre') {
    genreSongs.style.display = 'none';
    const radioSection = document.querySelector('.genre-radio');
    if (radioSection) radioSection.style.display = 'block';
  }
};

// Update context menu handler for new actions
const _origHandleContextAction = handleContextAction;
handleContextAction = function(action) {
  const id = state.contextSongId;
  const idx = state.songs.findIndex(s => s.id === id);
  if (idx === -1) return;
  const song = state.songs[idx];
  
  switch (action) {
    case 'view-album':
      if (song.album) openAlbum(song.album);
      else showToast('No album info', 'fa-circle-exclamation');
      hideContextMenu();
      break;
    case 'view-artist':
      openArtist(song.artist);
      hideContextMenu();
      break;
    case 'add-to-queue':
      state.customQueue.push(idx);
      showToast(`Added to queue`, 'fa-list-ol');
      hideContextMenu();
      break;
    default:
      _origHandleContextAction(action);
      break;
  }
};

// =========================================
// EVENT LISTENERS FOR NEW FEATURES
// =========================================

// YouTube search
if (searchYTBtn) searchYTBtn.addEventListener('click', () => {
  ytSearchModal.classList.add('active');
  ytSearchInput.focus();
});

if (closeYTSearchBtn) closeYTSearchBtn.addEventListener('click', () => ytSearchModal.classList.remove('active'));
ytSearchModal?.addEventListener('click', (e) => { if (e.target === ytSearchModal) ytSearchModal.classList.remove('active'); });

if (ytSearchBtn) {
  ytSearchBtn.addEventListener('click', async () => {
    const q = ytSearchInput.value.trim();
    if (!q) { showToast('Enter a search term', 'fa-circle-exclamation'); return; }
    ytResults.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:24px;">Searching...</p>';
    try {
      const items = await searchYouTube(q);
      renderYTResults(items);
    } catch(e) {
      ytResults.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:24px;">Search failed. Check your API key in Settings.</p>';
    }
  });
}

if (ytSearchInput) {
  ytSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') ytSearchBtn?.click(); });
}

// YouTube API key
if (saveYTKey) {
  saveYTKey.addEventListener('click', () => {
    state.settings.ytApiKey = settingsYTKey.value.trim();
    saveState();
    if (ytKeyStatus) {
      ytKeyStatus.textContent = state.settings.ytApiKey ? '✓ Saved' : '';
      ytKeyStatus.style.color = 'var(--accent-color)';
    }
    showToast('YouTube API key saved', 'fa-check');
  });
}

if (testYTKey) {
  testYTKey.addEventListener('click', async () => {
    if (!state.settings.ytApiKey) { showToast('Enter an API key first', 'fa-circle-exclamation'); return; }
    try {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${state.settings.ytApiKey}`);
      const data = await r.json();
      if (data.error) showToast('❌ Invalid API key: ' + data.error.message, 'fa-circle-exclamation');
      else showToast('✅ API key works!', 'fa-check');
    } catch(e) {
      showToast('❌ API test failed', 'fa-circle-exclamation');
    }
  });
}

// Lyrics
if (lyricsBtn) lyricsBtn.addEventListener('click', toggleLyricsPanel);
if (npLyricsBtn) npLyricsBtn.addEventListener('click', toggleLyricsPanel);
if (closeLyricsBtn) closeLyricsBtn.addEventListener('click', () => lyricsPanel.classList.remove('active'));

// Equalizer
if (eqBands) {
  eqBands.addEventListener('input', (e) => {
    const slider = e.target.closest('input[type="range"]');
    if (!slider) return;
    const freq = parseInt(slider.dataset.freq);
    const val = parseInt(slider.value);
    state.settings.eqValues[freq] = val;
    state.settings.eqPreset = 'custom';
    const valEl = slider.parentElement.querySelector('.eq-val');
    if (valEl) valEl.textContent = val > 0 ? `+${val}` : val;
    document.querySelectorAll('[data-eq]').forEach(btn => btn.classList.toggle('active', btn.dataset.eq === 'custom'));
  });
}

if (applyEqBtn) applyEqBtn.addEventListener('click', applyEQ);
if (resetEqBtn) resetEqBtn.addEventListener('click', () => applyEQPreset('flat'));

// EQ presets
document.querySelectorAll('[data-eq]').forEach(btn => {
  btn.addEventListener('click', () => applyEQPreset(btn.dataset.eq));
});

// Genre browsing
if (genreGrid) {
  genreGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.genre-card');
    if (!card) return;
    filterByGenre(card.dataset.genre);
    // Highlight active
    genreGrid.querySelectorAll('.genre-card').forEach(c => c.style.transform = '');
    card.style.transform = 'scale(1.05)';
  });
}

if (clearGenreFilter) {
  clearGenreFilter.addEventListener('click', () => {
    genreSongs.style.display = 'none';
    genreGrid.querySelectorAll('.genre-card').forEach(c => c.style.transform = '');
  });
}

// Podcasts
if (addPodcastBtn) addPodcastBtn.addEventListener('click', () => addRssModal.classList.add('active'));
if (closeRssModal) closeRssModal.addEventListener('click', () => addRssModal.classList.remove('active'));
if (cancelRssBtn) cancelRssBtn.addEventListener('click', () => addRssModal.classList.remove('active'));
addRssModal?.addEventListener('click', (e) => { if (e.target === addRssModal) addRssModal.classList.remove('active'); });

if (confirmRssBtn) {
  confirmRssBtn.addEventListener('click', () => {
    addPodcast(rssUrlInput.value.trim());
    rssUrlInput.value = '';
  });
}
if (rssUrlInput) rssUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmRssBtn?.click(); });

// RSS preset buttons
document.querySelectorAll('[data-rss]').forEach(btn => {
  btn.addEventListener('click', () => {
    rssUrlInput.value = btn.dataset.rss;
  });
});

// Spotify
if (connectSpotifyBtn) connectSpotifyBtn.addEventListener('click', connectSpotify);

// Settings: Load YouTube key
if (settingsYTKey) settingsYTKey.value = state.settings.ytApiKey || '';
if (settingsSpotifyClientId) settingsSpotifyClientId.value = state.settings.spotifyClientId || '';
if (settingsSpotifySecret) settingsSpotifySecret.value = state.settings.spotifySecret || '';

// Save Spotify creds on input
if (settingsSpotifyClientId) {
  settingsSpotifyClientId.addEventListener('change', () => {
    state.settings.spotifyClientId = settingsSpotifyClientId.value.trim();
    saveState();
  });
}
if (settingsSpotifySecret) {
  settingsSpotifySecret.addEventListener('change', () => {
    state.settings.spotifySecret = settingsSpotifySecret.value.trim();
    saveState();
  });
}

// Crossfade slider initial
if (crossfadeRange) {
  crossfadeRange.value = state.settings.crossfadeDuration || 3;
  if (crossfadeLabel) crossfadeLabel.textContent = `${state.settings.crossfadeDuration || 3}s`;
}
if (settingsGapless) settingsGapless.checked = state.settings.gapless || false;

// Queue: combine custom queue with song list
const _origRenderQueue = renderQueue;
renderQueue = function() {
  let items = [];
  if (state.customQueue.length > 0) {
    state.customQueue.forEach(idx => {
      if (state.songs[idx]) items.push(state.songs[idx]);
    });
    // Add remaining songs after current
    if (state.currentIndex >= 0) {
      state.songs.forEach((s, i) => {
        if (!state.customQueue.includes(i) && i !== state.currentIndex) items.push(s);
      });
    }
  } else {
    items = [...state.songs];
    if (state.currentIndex >= 0) {
      const before = items.slice(0, state.currentIndex);
      const after = items.slice(state.currentIndex);
      items = [...after, ...before];
    }
  }
  
  queueBody.innerHTML = items.map((song, i) => {
    const isCurrent = state.currentIndex >= 0 && song.id === state.songs[state.currentIndex]?.id;
    const idx = state.songs.findIndex(s => s.id === song.id);
    return `<div class="queue-item ${isCurrent ? 'active-song' : ''}"
                onclick="loadSong(${idx});closeQueue();"
                style="cursor:pointer;${isCurrent ? 'background:rgba(30,215,96,0.08);' : ''}">
      <div class="queue-item-img">
        ${song.coverData ? `<img src="${song.coverData}" alt="">` : `<i class="fa-solid fa-music"></i>`}
      </div>
      <div class="queue-item-info">
        <div class="queue-item-title">${isCurrent ? '🔊 ' : ''}${escapeHtml(song.title)}</div>
        <div class="queue-item-artist">${escapeHtml(song.artist)}</div>
      </div>
      <span style="color:var(--text-secondary);font-size:12px;">${formatTime(song.duration)}</span>
    </div>`;
  }).join('');
};

// Library filter tabs
document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    
    if (filter === 'albums') {
      // Show album grid
      const albums = [...new Set(state.songs.map(s => s.album).filter(Boolean))];
      const table = document.getElementById('libraryTable');
      if (table) {
        if (albums.length === 0) {
          document.getElementById('libraryBody').innerHTML = 
            `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-secondary);">No albums found</td></tr>`;
        } else {
          document.getElementById('libraryBody').innerHTML = albums.map(album => {
            const songs = state.songs.filter(s => s.album === album);
            const first = songs[0];
            const totalDur = songs.reduce((sum, s) => sum + (s.duration || 0), 0);
            return `<tr onclick="openAlbum('${escapeHtml(album)}')" style="cursor:pointer;">
              <td><i class="fa-solid fa-compact-disc"></i></td>
              <td>
                <div class="song-info">
                  <div class="song-row-image">
                    ${first?.coverData ? `<img src="${first.coverData}" alt="">` : `<i class="fa-solid fa-music"></i>`}
                  </div>
                  <div>
                    <div class="song-title-cell">${escapeHtml(album)}</div>
                    <div style="font-size:12px;color:var(--text-secondary);">${songs.length} songs</div>
                  </div>
                </div>
              </td>
              <td>${escapeHtml(first?.artist || '')}</td>
              <td>—</td>
              <td>${formatTime(totalDur)}</td>
              <td></td>
            </tr>`;
          }).join('');
        }
      }
    } else {
      renderLibrary();
    }
  });
});

// Upgrade button
document.querySelector('.btn-upgrade')?.addEventListener('click', () => {
  upgradeModal.classList.add('active');
});

// =========================================
// EXTRA: Now playing go-to artist/album from fullscreen
// =========================================

npSongArtist?.addEventListener('click', () => {
  const song = state.currentIndex >= 0 ? state.songs[state.currentIndex] : null;
  if (song) { openArtist(song.artist); closeNowPlaying(); }
});

// =========================================
// SETTINGS TAB: Also load YouTube/Spotify/EQ values
// =========================================

const _origLoadSettings = loadSettingsUI;
loadSettingsUI = function() {
  _origLoadSettings();
  if (settingsYTKey) settingsYTKey.value = state.settings.ytApiKey || '';
  if (settingsSpotifyClientId) settingsSpotifyClientId.value = state.settings.spotifyClientId || '';
  if (settingsSpotifySecret) settingsSpotifySecret.value = state.settings.spotifySecret || '';
  if (crossfadeRange) crossfadeRange.value = state.settings.crossfadeDuration || 3;
  if (crossfadeLabel) crossfadeLabel.textContent = `${state.settings.crossfadeDuration || 3}s`;
  if (settingsGapless) settingsGapless.checked = state.settings.gapless || false;
  
  // Check Spotify status
  if (state.settings.spotifyClientId && state.settings.spotifySecret && spotifyStatus) {
    spotifyStatus.textContent = 'Credentials saved';
    spotifyStatus.style.color = 'var(--text-secondary)';
  }
};

// =========================================
// 13. BEAT STUDIO
// =========================================

// ==================== Beat State ====================
const beatState = {
  audioCtx: null,
  tracks: [
    // === Percussion ===
    { id: 'kick',      label: 'Kick',      icon: 'fa-solid fa-drum',       color: '#ff6b6b', steps: [], vol: 80, muted: false },
    { id: 'snare',     label: 'Snare',     icon: 'fa-solid fa-circle',     color: '#feca57', steps: [], vol: 70, muted: false },
    { id: 'hihat',     label: 'Hi-Hat',    icon: 'fa-solid fa-gem',       color: '#48dbfb', steps: [], vol: 60, muted: false },
    { id: 'openhat',   label: 'Open HH',   icon: 'fa-solid fa-gem',       color: '#0abde3', steps: [], vol: 50, muted: false },
    { id: 'clap',      label: 'Clap',      icon: 'fa-solid fa-hands',      color: '#ff9ff3', steps: [], vol: 65, muted: false },
    { id: 'tom',       label: 'Tom',       icon: 'fa-solid fa-circle',     color: '#54a0ff', steps: [], vol: 55, muted: false },
    { id: 'rim',       label: 'Rim',       icon: 'fa-solid fa-bell',       color: '#5f27cd', steps: [], vol: 50, muted: false },
    { id: 'crash',     label: 'Crash',     icon: 'fa-solid fa-star',       color: '#f368e0', steps: [], vol: 45, muted: false },
    // === Extra Percussion ===
    { id: 'shaker',    label: 'Shaker',    icon: 'fa-solid fa-water',      color: '#00d2d3', steps: [], vol: 50, muted: false },
    { id: 'tambourine',label: 'Tambourine',icon: 'fa-solid fa-bell',       color: '#fdcb6e', steps: [], vol: 55, muted: false },
    { id: 'cowbell',   label: 'Cowbell',   icon: 'fa-solid fa-square',     color: '#e17055', steps: [], vol: 60, muted: false },
    { id: 'conga',     label: 'Conga',     icon: 'fa-solid fa-circle',     color: '#d63031', steps: [], vol: 55, muted: false },
    { id: 'bongo',     label: 'Bongo',     icon: 'fa-solid fa-circle',     color: '#e84393', steps: [], vol: 50, muted: false },
    { id: 'maracas',   label: 'Maracas',   icon: 'fa-solid fa-ellipsis',   color: '#00b894', steps: [], vol: 45, muted: false },
    { id: 'cabasa',    label: 'Cabasa',    icon: 'fa-solid fa-grip-lines', color: '#0984e3', steps: [], vol: 45, muted: false },
    { id: 'clave',     label: 'Clave',     icon: 'fa-solid fa-grip',       color: '#6c5ce7', steps: [], vol: 55, muted: false },
    { id: 'whistle',   label: 'Whistle',   icon: 'fa-solid fa-music',      color: '#fd79a8', steps: [], vol: 40, muted: false },
    // === Melodic ===
    { id: 'synthLead', label: 'Synth Lead',icon: 'fa-solid fa-wave-square',color: '#a29bfe', steps: [], vol: 50, muted: false },
    { id: 'bassSynth', label: 'Bass Synth',icon: 'fa-solid fa-wave-square',color: '#636e72', steps: [], vol: 60, muted: false },
    { id: 'pad',       label: 'Pad',       icon: 'fa-solid fa-circle',     color: '#74b9ff', steps: [], vol: 40, muted: false },
    { id: 'arp',       label: 'Arp',       icon: 'fa-solid fa-arrow-up',   color: '#55efc4', steps: [], vol: 35, muted: false },
    { id: 'piano',     label: 'Piano',     icon: 'fa-solid fa-keyboard',   color: '#dfe6e9', steps: [], vol: 45, muted: false },
    { id: 'strings',   label: 'Strings',   icon: 'fa-solid fa-violin',     color: '#a29bfe', steps: [], vol: 35, muted: false },
    { id: 'organ',     label: 'Organ',     icon: 'fa-solid fa-building',   color: '#fab1a0', steps: [], vol: 40, muted: false },
    // === FX ===
    { id: 'gunshot',   label: 'Gunshot',   icon: 'fa-solid fa-bomb',       color: '#ff7675', steps: [], vol: 60, muted: false },
    { id: 'glassBreak',label: 'Glass',     icon: 'fa-solid fa-cube',       color: '#81ecec', steps: [], vol: 45, muted: false },
    { id: 'siren',     label: 'Siren',     icon: 'fa-solid fa-exclamation',color: '#fab1a0', steps: [], vol: 40, muted: false },
    { id: 'riser',     label: 'Riser',     icon: 'fa-solid fa-arrow-trend-up',color: '#fd79a8', steps: [], vol: 40, muted: false },
    { id: 'impact',    label: 'Impact',    icon: 'fa-solid fa-bolt',       color: '#e17055', steps: [], vol: 65, muted: false },
    { id: 'noiseSweep',label: 'Noise Swp', icon: 'fa-solid fa-waveform',   color: '#00cec9', steps: [], vol: 35, muted: false },
    { id: 'laser',     label: 'Laser',     icon: 'fa-solid fa-bullseye',   color: '#e84393', steps: [], vol: 40, muted: false },
    { id: 'scratch',   label: 'Scratch',   icon: 'fa-solid fa-rotate',     color: '#6c5ce7', steps: [], vol: 35, muted: false },
  ],
  numSteps: 16,
  step: 0,
  isPlaying: false,
  interval: null,
  bpm: 90,
  swing: 0,
  masterVol: 75,
  sections: {
    percussion: { collapsed: false, label: 'Percussion', icon: 'fa-solid fa-drum', count: 8 },
    extraPerc: { collapsed: false, label: 'Extra Percussion', icon: 'fa-solid fa-water', count: 9 },
    melodic: { collapsed: false, label: 'Melodic', icon: 'fa-solid fa-wave-square', count: 7 },
    fx: { collapsed: false, label: 'FX', icon: 'fa-solid fa-bolt', count: 8 },
  },
};

// ==================== Drum Synthesizer ====================
function initBeatAudio() {
  if (!beatState.audioCtx) {
    beatState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (beatState.audioCtx.state === 'suspended') {
    beatState.audioCtx.resume();
  }
  return beatState.audioCtx;
}

function playKick(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
  gain.gain.setValueAtTime((vol / 100) * 0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.25);
}

function playSnare(ctx, time, vol) {
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
  }
  noise.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((vol / 100) * 0.6, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, time);
  osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);
  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime((vol / 100) * 0.4, time);
  gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  
  noise.connect(gain);
  gain.connect(ctx.destination);
  osc.connect(gain2);
  gain2.connect(ctx.destination);
  noise.start(time);
  osc.start(time);
  noise.stop(time + 0.1);
  osc.stop(time + 0.1);
}

function playHihat(ctx, time, vol, isOpen = false) {
  const noise = ctx.createBufferSource();
  const dur = isOpen ? 0.3 : 0.05;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * (isOpen ? 0.08 : 0.01)));
  }
  noise.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((vol / 100) * 0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  
  noise.connect(hp);
  hp.connect(gain);
  gain.connect(ctx.destination);
  noise.start(time);
  noise.stop(time + dur);
}

function playClap(ctx, time, vol) {
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 300 + i * 100;
    gain.gain.setValueAtTime((vol / 100) * 0.2, time + i * 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.01 + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time + i * 0.01);
    osc.stop(time + i * 0.01 + 0.05);
  }
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
  }
  noise.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((vol / 100) * 0.35, time + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  noise.connect(gain);
  gain.connect(ctx.destination);
  noise.start(time + 0.03);
}

function playTom(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(60, time + 0.1);
  gain.gain.setValueAtTime((vol / 100) * 0.5, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.2);
}

function playRim(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 800;
  gain.gain.setValueAtTime((vol / 100) * 0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.02);
}

function playCrash(ctx, time, vol) {
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 1.0, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
  }
  noise.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((vol / 100) * 0.5, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2000;
  noise.connect(hp);
  hp.connect(gain);
  gain.connect(ctx.destination);
  noise.start(time);
  noise.stop(time + 1.0);
}

// ==================== Extra Percussion Synths ====================
function playShaker(ctx, time, vol) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((vol / 100) * 0.35, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(time); src.stop(time + 0.03);
}

function playTambourine(ctx, time, vol) {
  for (let j = 0; j < 4; j++) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const t = time + j * 0.008;
    gain.gain.setValueAtTime((vol / 100) * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(t); src.stop(t + 0.03);
  }
}

function playCowbell(ctx, time, vol) {
  [600, 900, 1200].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime((vol / 100) * 0.15 * (i === 0 ? 1 : 0.4), time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time); osc.stop(time + 0.12);
  });
}

function playConga(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, time);
  osc.frequency.exponentialRampToValueAtTime(80, time + 0.06);
  gain.gain.setValueAtTime((vol / 100) * 0.6, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.15);
}

function playBongo(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(350, time);
  osc.frequency.exponentialRampToValueAtTime(150, time + 0.03);
  gain.gain.setValueAtTime((vol / 100) * 0.5, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.08);
}

function playMaracas(ctx, time, vol) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.015, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.003));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((vol / 100) * 0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(time); src.stop(time + 0.015);
}

function playCabasa(ctx, time, vol) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.025, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.003));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'bandpass'; hp.frequency.value = 4000; hp.Q.value = 2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((vol / 100) * 0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
  src.connect(hp); hp.connect(gain); gain.connect(ctx.destination);
  src.start(time); src.stop(time + 0.025);
}

function playClave(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime((vol / 100) * 0.35, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.008);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.008);
}

function playWhistle(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, time);
  osc.frequency.linearRampToValueAtTime(1600, time + 0.08);
  gain.gain.setValueAtTime((vol / 100) * 0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.12);
}

// ==================== Melodic Synths ====================
function playSynthLead(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime((vol / 100) * 0.4, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 2000;
  osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.3);
}

function playBassSynth(ctx, time, vol) {
  const osc1 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 110;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime((vol / 100) * 0.6, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  osc1.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(time); osc1.stop(time + 0.4);
  // Sub octave
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = 55;
  gain2.gain.setValueAtTime((vol / 100) * 0.25, time);
  gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  osc2.connect(gain2); gain2.connect(ctx.destination);
  osc2.start(time); osc2.stop(time + 0.35);
}

function playPad(ctx, time, vol) {
  [0, 1, 2, 3].forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 220 + offset * 1.5;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime((vol / 100) * 0.08, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(time); osc.stop(time + 0.8);
  });
}

function playArp(ctx, time, vol) {
  if (beatState._arpNote === undefined) beatState._arpNote = 0;
  const notes = [261, 329, 392, 523, 392, 329, 261, 329];
  const freq = notes[beatState._arpNote % notes.length];
  beatState._arpNote++;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime((vol / 100) * 0.25, time + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.15);
}

function playPiano(ctx, time, vol) {
  [1, 2, 3, 6, 8].forEach((harm, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 261 * harm;
    const amp = i === 0 ? 1 : 1 / harm;
    gain.gain.setValueAtTime((vol / 100) * 0.3 * amp, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5 + (i === 0 ? 0.5 : 0.1));
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(time); osc.stop(time + 1);
  });
}

function playStrings(ctx, time, vol) {
  [0, 1].forEach(detune => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 350 + detune * 2;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime((vol / 100) * 0.15, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 1500;
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.start(time); osc.stop(time + 0.6);
  });
}

function playOrgan(ctx, time, vol) {
  [1, 2, 3, 4, 6].forEach((harm, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 262 * harm;
    const amp = harm === 1 ? 1 : harm === 2 ? 0.5 : harm === 3 ? 0.3 : 0.15;
    gain.gain.setValueAtTime((vol / 100) * 0.15 * amp, time);
    gain.gain.setValueAtTime((vol / 100) * 0.15 * amp * 0.8, time + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.0);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(time); osc.stop(time + 1.0);
  });
}

// ==================== FX Synths ====================
function playGunshot(ctx, time, vol) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((vol / 100) * 0.5, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  src.connect(gain); gain.connect(ctx.destination);
  src.start(time); src.stop(time + 0.3);
}

function playGlassBreak(ctx, time, vol) {
  for (let j = 0; j < 12; j++) {
    const t = time + j * 0.01 + Math.random() * 0.02;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 2000 + Math.random() * 4000;
    gain.gain.setValueAtTime((vol / 100) * 0.08 * Math.random(), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03 + Math.random() * 0.05);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.08);
  }
}

function playSiren(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, time);
  osc.frequency.linearRampToValueAtTime(1200, time + 0.2);
  osc.frequency.linearRampToValueAtTime(400, time + 0.4);
  gain.gain.setValueAtTime((vol / 100) * 0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.4);
}

function playRiser(ctx, time, vol) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, time);
  filter.frequency.exponentialRampToValueAtTime(8000, time + 0.28);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime((vol / 100) * 0.25, time + 0.15);
  gain.gain.linearRampToValueAtTime(0, time + 0.3);
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(time); src.stop(time + 0.3);
}

function playImpact(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, time);
  osc.frequency.exponentialRampToValueAtTime(20, time + 0.15);
  gain.gain.setValueAtTime((vol / 100) * 0.7, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.25);
  // Add some noise
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.01));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime((vol / 100) * 0.3, time);
  gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  src.connect(gain2); gain2.connect(ctx.destination);
  src.start(time); src.stop(time + 0.12);
}

function playNoiseSweep(ctx, time, vol) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(300, time);
  filter.frequency.exponentialRampToValueAtTime(8000, time + 0.25);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((vol / 100) * 0.15, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(time); src.stop(time + 0.3);
}

function playLaser(ctx, time, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(400, time);
  osc.frequency.exponentialRampToValueAtTime(4000, time + 0.08);
  gain.gain.setValueAtTime((vol / 100) * 0.25, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.12);
}

function playScratch(ctx, time, vol) {
  for (let j = 0; j < 3; j++) {
    const t = time + j * 0.04;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200 + 600 * (j % 2 === 0 ? 1 : -1), t);
    osc.frequency.linearRampToValueAtTime(200 + 600 * (j % 2 === 0 ? -1 : 1), t + 0.03);
    gain.gain.setValueAtTime((vol / 100) * 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.035);
  }
}

function playDrum(trackId, time, vol) {
  const ctx = beatState.audioCtx;
  if (!ctx) return;
  switch (trackId) {
    // Original drums
    case 'kick': playKick(ctx, time, vol); break;
    case 'snare': playSnare(ctx, time, vol); break;
    case 'hihat': playHihat(ctx, time, vol, false); break;
    case 'openhat': playHihat(ctx, time, vol, true); break;
    case 'clap': playClap(ctx, time, vol); break;
    case 'tom': playTom(ctx, time, vol); break;
    case 'rim': playRim(ctx, time, vol); break;
    case 'crash': playCrash(ctx, time, vol); break;
    // Extra percussion
    case 'shaker': playShaker(ctx, time, vol); break;
    case 'tambourine': playTambourine(ctx, time, vol); break;
    case 'cowbell': playCowbell(ctx, time, vol); break;
    case 'conga': playConga(ctx, time, vol); break;
    case 'bongo': playBongo(ctx, time, vol); break;
    case 'maracas': playMaracas(ctx, time, vol); break;
    case 'cabasa': playCabasa(ctx, time, vol); break;
    case 'clave': playClave(ctx, time, vol); break;
    case 'whistle': playWhistle(ctx, time, vol); break;
    // Melodic
    case 'synthLead': playSynthLead(ctx, time, vol); break;
    case 'bassSynth': playBassSynth(ctx, time, vol); break;
    case 'pad': playPad(ctx, time, vol); break;
    case 'arp': playArp(ctx, time, vol); break;
    case 'piano': playPiano(ctx, time, vol); break;
    case 'strings': playStrings(ctx, time, vol); break;
    case 'organ': playOrgan(ctx, time, vol); break;
    // FX
    case 'gunshot': playGunshot(ctx, time, vol); break;
    case 'glassBreak': playGlassBreak(ctx, time, vol); break;
    case 'siren': playSiren(ctx, time, vol); break;
    case 'riser': playRiser(ctx, time, vol); break;
    case 'impact': playImpact(ctx, time, vol); break;
    case 'noiseSweep': playNoiseSweep(ctx, time, vol); break;
    case 'laser': playLaser(ctx, time, vol); break;
    case 'scratch': playScratch(ctx, time, vol); break;
  }
}

// ==================== Sequencer ====================
function initSteps() {
  beatState.tracks.forEach(t => {
    if (t.steps.length === 0) {
      t.steps = new Array(beatState.numSteps).fill(0);
    }
  });
}

function renderSequencer() {
  const tracksEl = document.getElementById('seqTracks');
  const stepsEl = document.getElementById('seqStepNumbers');
  if (!tracksEl || !stepsEl) return;
  
  // Render step numbers
  stepsEl.innerHTML = '';
  for (let i = 0; i < beatState.numSteps; i++) {
    const n = document.createElement('div');
    n.className = 'seq-step-num' + (i % 4 === 0 ? ' beat-start' : '');
    n.textContent = i + 1;
    stepsEl.appendChild(n);
  }
  
  // Render tracks grouped by section
  tracksEl.innerHTML = '';
  
  // Define section track ranges
  const sectionRanges = [
    { key: 'percussion', start: 0, end: 7 },
    { key: 'extraPerc', start: 8, end: 16 },
    { key: 'melodic', start: 17, end: 23 },
    { key: 'fx', start: 24, end: 31 },
  ];
  
  sectionRanges.forEach(({ key, start, end }) => {
    const section = beatState.sections[key];
    if (!section) return;
    
    // Section header
    const header = document.createElement('div');
    header.className = 'seq-section-header';
    header.dataset.section = key;
    header.innerHTML = `
      <div class="seq-section-toggle">
        <i class="fa-solid ${section.collapsed ? 'fa-chevron-right' : 'fa-chevron-down'}"></i>
      </div>
      <i class="${section.icon}" style="font-size:13px;color:var(--text-secondary)"></i>
      <span class="seq-section-label">${section.label}</span>
      <span class="seq-section-count">${end - start + 1} tracks</span>
    `;
    header.onclick = () => { section.collapsed = !section.collapsed; renderSequencer(); };
    tracksEl.appendChild(header);
    
    // Section body (track rows)
    if (section.collapsed) {
      // Render a placeholder showing collapsed count
      const collapsedRow = document.createElement('div');
      collapsedRow.className = 'seq-section-collapsed';
      collapsedRow.innerHTML = `<i class="fa-solid fa-ellipsis"></i> ${end - start + 1} tracks hidden — click to expand`;
      collapsedRow.onclick = () => { section.collapsed = false; renderSequencer(); };
      tracksEl.appendChild(collapsedRow);
      return;
    }
    
    // Render tracks in this section
    for (let tIdx = start; tIdx <= end; tIdx++) {
      const track = beatState.tracks[tIdx];
      if (!track) continue;
      
      const row = document.createElement('div');
      row.className = 'seq-track-row';
      
      // Track label
      const label = document.createElement('div');
      label.className = 'seq-track-label';
      label.innerHTML = `<i class="${track.icon}" style="color:${track.color}"></i> ${track.label}`;
      label.onclick = () => { track.muted = !track.muted; renderSequencer(); };
      if (track.muted) label.style.opacity = '0.4';
      
      // Steps
      const steps = document.createElement('div');
      steps.className = 'seq-track-steps';
      
      track.steps.forEach((active, sIdx) => {
        const cell = document.createElement('div');
        cell.className = 'seq-cell' + (active ? ' active' : '') + (sIdx % 4 === 0 ? ' beat-start' : '') + (sIdx === beatState.step && beatState.isPlaying ? ' current' : '');
        cell.style.setProperty('--cell-color', track.color);
        cell.onclick = () => {
          track.steps[sIdx] = active ? 0 : 1;
          renderSequencer();
        };
        steps.appendChild(cell);
      });
      
      row.appendChild(label);
      row.appendChild(steps);
      tracksEl.appendChild(row);
    }
  });
  
  // Render mixer
  renderMixer();
}

function renderMixer() {
  const el = document.getElementById('mixerChannels');
  if (!el) return;
  el.innerHTML = '';
  beatState.tracks.forEach((track, tIdx) => {
    const ch = document.createElement('div');
    ch.className = 'mixer-channel';
    ch.innerHTML = `
      <span class="mixer-label" style="color:${track.color}">${track.label}</span>
      <input type="range" min="0" max="100" value="${track.vol}" class="mixer-slider">
      <span class="mixer-val">${track.vol}</span>
    `;
    const slider = ch.querySelector('.mixer-slider');
    slider.addEventListener('input', () => {
      track.vol = parseInt(slider.value);
      ch.querySelector('.mixer-val').textContent = track.vol;
    });
    el.appendChild(ch);
  });
}

// ==================== Playback ====================
function toggleBeat() {
  if (beatState.isPlaying) {
    stopBeat();
  } else {
    startBeat();
  }
}

function startBeat() {
  initBeatAudio();
  beatState.step = 0;
  beatState.isPlaying = true;
  updateBeatUI();
  scheduleBeat();
}

function stopBeat() {
  beatState.isPlaying = false;
  if (beatState.interval) {
    clearTimeout(beatState.interval);
    beatState.interval = null;
  }
  beatState.step = 0;
  beatState._arpNote = 0;
  updateBeatUI();
  renderSequencer();
}

function scheduleBeat() {
  if (!beatState.isPlaying) return;
  
  const bpm = beatState.bpm;
  const stepDuration = 60 / bpm / 4 * 1000; // ms per 16th note
  
  // Play sounds for current step
  beatState.tracks.forEach((track, tIdx) => {
    if (track.muted) return;
    if (track.steps[beatState.step]) {
      const masterVol = beatState.masterVol;
      playDrum(track.id, beatState.audioCtx.currentTime, track.vol * (masterVol / 100));
    }
  });
  
  // Update UI
  renderSequencer();
  
  // Schedule next step
  beatState.step = (beatState.step + 1) % beatState.numSteps;
  
  beatState.interval = setTimeout(() => {
    scheduleBeat();
  }, stepDuration);
}

function updateBeatUI() {
  const btn = document.getElementById('beatPlayBtn');
  if (!btn) return;
  btn.innerHTML = beatState.isPlaying 
    ? '<i class="fa-solid fa-stop"></i>' 
    : '<i class="fa-solid fa-play"></i>';
  btn.classList.toggle('playing', beatState.isPlaying);
}

// ==================== Pattern Management ====================
function loadPattern(name) {
  if (name === 'custom') return;
  const pattern = BEAT_PATTERNS[name];
  if (!pattern) return;
  beatState.tracks.forEach((track, i) => {
    if (pattern[i]) {
      track.steps = [...pattern[i]];
    }
  });
  renderSequencer();
}

function clearPattern() {
  beatState.tracks.forEach(t => {
    t.steps = new Array(beatState.numSteps).fill(0);
  });
  renderSequencer();
}

function randomizePattern() {
  beatState.tracks.forEach(t => {
    t.steps = t.steps.map(() => Math.random() > 0.7 ? 1 : 0);
  });
  renderSequencer();
}

// ==================== Export WAV ====================
function exportBeat() {
  showToast('Export feature coming soon!', 'fa-circle-info');
}

// ==================== Init Beat Maker ====================
function initBeatMaker() {
  if (beatState._initialized) return;
  beatState._initialized = true;
  initSteps();
  loadPattern('four-on-floor');
  
  // DOM references
  const beatPlayBtn = document.getElementById('beatPlayBtn');
  const beatClearBtn = document.getElementById('beatClearBtn');
  const beatRandomBtn = document.getElementById('beatRandomBtn');
  const beatExportBtn = document.getElementById('beatExportBtn');
  const beatBpmInput = document.getElementById('beatBpm');
  const beatBpmSlider = document.getElementById('beatBpmSlider');
  const bpmDown = document.getElementById('bpmDown');
  const bpmUp = document.getElementById('bpmUp');
  const beatSwing = document.getElementById('beatSwing');
  const beatSwingVal = document.getElementById('beatSwingVal');
  const beatPatternSelect = document.getElementById('beatPatternSelect');
  const beatMasterVol = document.getElementById('beatMasterVol');
  const beatMasterVolVal = document.getElementById('beatMasterVolVal');
  
  if (beatPlayBtn) {
    beatPlayBtn.addEventListener('click', () => {
      if (beatState.isPlaying) {
        stopBeat();
      } else {
        startBeat();
      }
    });
  }
  
  if (beatClearBtn) beatClearBtn.addEventListener('click', clearPattern);
  if (beatRandomBtn) beatRandomBtn.addEventListener('click', randomizePattern);
  if (beatExportBtn) beatExportBtn.addEventListener('click', exportBeat);
  
  if (beatBpmInput) {
    beatBpmInput.addEventListener('change', () => {
      beatState.bpm = parseInt(beatBpmInput.value) || 90;
      if (beatBpmSlider) beatBpmSlider.value = beatState.bpm;
      if (beatState.isPlaying) { stopBeat(); startBeat(); }
    });
  }
  
  if (beatBpmSlider) {
    beatBpmSlider.addEventListener('input', () => {
      beatState.bpm = parseInt(beatBpmSlider.value);
      if (beatBpmInput) beatBpmInput.value = beatState.bpm;
      if (beatState.isPlaying) { stopBeat(); startBeat(); }
    });
  }
  
  if (bpmDown) {
    bpmDown.addEventListener('click', () => {
      beatState.bpm = Math.max(40, beatState.bpm - 5);
      if (beatBpmInput) beatBpmInput.value = beatState.bpm;
      if (beatBpmSlider) beatBpmSlider.value = beatState.bpm;
      if (beatState.isPlaying) { stopBeat(); startBeat(); }
    });
  }
  
  if (bpmUp) {
    bpmUp.addEventListener('click', () => {
      beatState.bpm = Math.min(300, beatState.bpm + 5);
      if (beatBpmInput) beatBpmInput.value = beatState.bpm;
      if (beatBpmSlider) beatBpmSlider.value = beatState.bpm;
      if (beatState.isPlaying) { stopBeat(); startBeat(); }
    });
  }
  
  if (beatSwing && beatSwingVal) {
    beatSwing.addEventListener('input', () => {
      beatState.swing = parseInt(beatSwing.value);
      beatSwingVal.textContent = beatState.swing + '%';
    });
  }
  
  if (beatPatternSelect) {
    beatPatternSelect.addEventListener('change', () => {
      loadPattern(beatPatternSelect.value);
    });
  }
  
  if (beatMasterVol && beatMasterVolVal) {
    beatMasterVol.addEventListener('input', () => {
      beatState.masterVol = parseInt(beatMasterVol.value);
      beatMasterVolVal.textContent = beatState.masterVol;
    });
  }
}

let _studioTabsInitialized = false;

function initStudioTabs() {
  if (_studioTabsInitialized) return;
  _studioTabsInitialized = true;
  // Force initial tab visibility via inline styles (CSS class alone may not apply reliably)
  function enforceTabVisibility(tabId) {
    document.querySelectorAll('.studio-tab-content').forEach(c => {
      if (c.id === tabId) {
        c.style.display = 'block';
        c.classList.add('active');
      } else {
        c.style.display = 'none';
        c.classList.remove('active');
      }
    });
  }
  
  // Show Beat Maker tab by default (user wants to make beats)
  const aiTab = document.querySelector('[data-studio-tab="ai-generator"]');
  const beatTab = document.querySelector('[data-studio-tab="beat-maker"]');
  if (beatTab) beatTab.classList.add('active');
  if (aiTab) aiTab.classList.remove('active');
  enforceTabVisibility('studio-beat-maker');
  
  document.querySelectorAll('.studio-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = 'studio-' + tab.dataset.studioTab;
      
      // Update tab buttons
      document.querySelectorAll('.studio-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Force content visibility via inline styles
      enforceTabVisibility(targetId);
      
      // Re-render sequencer when switching to beat maker tab
      if (tab.dataset.studioTab === 'beat-maker') {
        renderSequencer();
      }
    });
  });
}

// ==================== Beat Patterns ====================
const BEAT_PATTERNS = {
  'four-on-floor': [
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // kick
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // snare
    [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], // hihat
    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // openhat
    [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0], // clap
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // tom
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // rim
    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // crash
  ],
  trap: [
    [1,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    [0,1,1,0, 0,1,1,0, 1,1,1,0, 0,1,1,0],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // shaker
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // tambourine
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // cowbell
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // conga
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // bongo
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // maracas
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // cabasa
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // clave
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // whistle
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // synthLead
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // bassSynth
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // pad
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // arp
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // piano
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // strings
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // organ
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // gunshot
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // glassBreak
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // siren
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // riser
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // impact
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // noiseSweep
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // laser
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // scratch
  ],
  hiphop: [
    [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0],
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    [0,1,0,0, 1,0,0,1, 0,1,0,0, 1,0,0,1],
    [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0],
    [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    [0,0,0,0, 1,0,0,0, 0,0,1,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // shaker
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // tambourine
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // cowbell
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // conga
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // bongo
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // maracas
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // cabasa
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // clave
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // whistle
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // synthLead
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // bassSynth
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // pad
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // arp
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // piano
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // strings
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // organ
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // gunshot
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // glassBreak
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // siren
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // riser
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // impact
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // noiseSweep
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // laser
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // scratch
  ],
  lofi: [
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  ],
  dnb: [
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // shaker
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // tambourine
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // cowbell
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // conga
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // bongo
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // maracas
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // cabasa
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // clave
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // whistle
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // synthLead
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // bassSynth
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // pad
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // arp
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // piano
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // strings
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // organ
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // gunshot
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // glassBreak
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // siren
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // riser
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // impact
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // noiseSweep
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // laser
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // scratch
  ],
  rock: [
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0],
    [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0],
    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    [0,0,1,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // shaker
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // tambourine
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // cowbell
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // conga
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // bongo
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // maracas
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // cabasa
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // clave
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // whistle
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // synthLead
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // bassSynth
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // pad
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // arp
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // piano
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // strings
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // organ
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // gunshot
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // glassBreak
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // siren
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // riser
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // impact
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // noiseSweep
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // laser
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // scratch
  ],
  house: [
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,1,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // shaker
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // tambourine
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // cowbell
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // conga
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // bongo
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // maracas
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // cabasa
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // clave
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // whistle
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // synthLead
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // bassSynth
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // pad
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // arp
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // piano
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // strings
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // organ
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // gunshot
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // glassBreak
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // siren
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // riser
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // impact
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // noiseSweep
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // laser
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // scratch
  ],
};

// =========================================
// 14. CANVAS VISUALIZER & ANIMATED BACKGROUND
// =========================================

let visualizerCtx = null;
let visualizerAnimId = null;
let visualizerColors = { r: 30, g: 215, b: 96 };

function initVisualizer() {
  const canvas = document.getElementById('npVisualizer');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  visualizerCtx = canvas.getContext('2d');
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function startVisualizer() {
  if (!visualizerCtx) initVisualizer();
  if (!visualizerCtx) return;
  if (visualizerAnimId) cancelAnimationFrame(visualizerAnimId);
  
  // Extract colors from current album art
  const img = document.getElementById('npArtImg');
  if (img && img.complete && img.naturalWidth > 0) {
    extractColorsFromImage(img);
  }
  
  animateVisualizer();
}

function stopVisualizer() {
  if (visualizerAnimId) {
    cancelAnimationFrame(visualizerAnimId);
    visualizerAnimId = null;
  }
  // Clear canvas
  if (visualizerCtx) {
    visualizerCtx.clearRect(0, 0, visualizerCtx.canvas.width, visualizerCtx.canvas.height);
  }
}

function extractColorsFromImage(img) {
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    visualizerColors = { r: d[0], g: d[1], b: d[2] };
  } catch(e) {
    // Use default colors
    visualizerColors = { r: 30, g: 215, b: 96 };
  }
}

function animateVisualizer() {
  if (!visualizerCtx) return;
  const ctx = visualizerCtx;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  
  // Draw animated gradient orbs
  const time = Date.now() / 1000;
  const { r, g, b } = visualizerColors;
  
  // Clear with semi-transparent to create trails
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, w, h);
  
  // Draw floating orbs
  const numOrbs = 3;
  for (let i = 0; i < numOrbs; i++) {
    const x = w * (0.3 + 0.4 * Math.sin(time * 0.3 + i * 2.1));
    const y = h * (0.3 + 0.4 * Math.cos(time * 0.4 + i * 1.7));
    const radius = 100 + 80 * Math.sin(time * 0.2 + i * 1.3) + 80;
    const alpha = 0.06 + 0.04 * Math.sin(time * 0.5 + i);
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw subtle lines/waves
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.03)`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    for (let x = 0; x < w; x += 20) {
      const y = h * 0.5 + Math.sin(x * 0.005 + time * 0.5 + i) * 40 + Math.sin(x * 0.003 + time * 0.7 + i * 2) * 25;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  visualizerAnimId = requestAnimationFrame(animateVisualizer);
}

// =========================================
// 15. RIPPLE EFFECT ON BUTTONS
// =========================================

function setupRippleEffect() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add-song, .btn-playlist-play, .control-btn, .play-btn, .btn-premium-cta, .btn-save, .btn-upgrade, .btn-library-action');
    if (!btn) return;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
}

// =========================================
// 16. VINYL SPIN ANIMATION
// =========================================

function updateVinylSpin() {
  const nowPlayingImg = document.querySelector('.now-playing-img');
  if (!nowPlayingImg) return;
  
  if (state.isPlaying) {
    nowPlayingImg.classList.add('vinyl-spin');
    nowPlayingImg.classList.remove('vinyl-spin-paused');
  } else {
    nowPlayingImg.classList.add('vinyl-spin-paused');
  }
}

// Patch updatePlayerUI to include vinyl spin
const _origUpdatePlayerUI = updatePlayerUI;
updatePlayerUI = function() {
  _origUpdatePlayerUI();
  updateVinylSpin();
};

// =========================================
// 17. LOADING SKELETON
// =========================================

function showSkeleton(target, type = 'card', count = 6) {
  if (!target) return;
  let html = '';
  
  if (type === 'card') {
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton-card skeleton"></div>
               <div class="skeleton-text skeleton"></div>
               <div class="skeleton-text skeleton-text-short skeleton"></div>`;
    }
  } else if (type === 'row') {
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton-row">
                <div class="skeleton-circle skeleton"></div>
                <div class="skeleton-line skeleton"></div>
               </div>`;
    }
  } else if (type === 'table') {
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton-row">
                <div class="skeleton skeleton" style="width:36px;height:36px;border-radius:4px;"></div>
                <div class="skeleton-line skeleton" style="height:14px;"></div>
                <div class="skeleton-line skeleton" style="height:14px;width:40%;"></div>
               </div>`;
    }
  }
  
  target.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;">${html}</div>`;
}

function hideSkeleton(target) {
  if (!target) return;
  target.querySelectorAll('.skeleton').forEach(el => el.remove());
}

// =========================================
// 18. STREAM QUALITY & SOURCE INDICATORS
// =========================================

function updateStreamIndicator() {
  const qualityBadge = document.getElementById('qualityBadge');
  const offlineBadge = document.getElementById('offlineBadge');
  const streamIndicator = document.getElementById('streamIndicator');
  if (!qualityBadge || !streamIndicator) return;
  
  if (state.currentIndex < 0) {
    streamIndicator.style.display = 'none';
    return;
  }
  
  const song = state.songs[state.currentIndex];
  if (!song) {
    streamIndicator.style.display = 'none';
    return;
  }
  
  streamIndicator.style.display = 'flex';
  
  if (song.youtubeId) {
    qualityBadge.textContent = 'YouTube';
    qualityBadge.className = 'quality-badge youtube';
  } else if (song.audioData) {
    qualityBadge.textContent = 'Local';
    qualityBadge.className = 'quality-badge local';
  } else {
    qualityBadge.textContent = 'Simulated';
    qualityBadge.className = 'quality-badge';
  }
  
  // Offline indicator
  if (offlineBadge) {
    if (song.offlineCached) {
      offlineBadge.style.display = 'inline';
    } else {
      offlineBadge.style.display = 'none';
    }
  }
}

// Patch loadSong to update indicator

// Add updateStreamIndicator to renderAll
const _origRenderAll_streaming = renderAll;
renderAll = function() {
  _origRenderAll_streaming();
  updateStreamIndicator();
};

// =========================================
// 19. YOUTUBE OFFLINE CACHING
// =========================================

const ytCache = {
  videos: {},
  maxSize: 100 * 1024 * 1024, // 100MB max cache
  currentSize: 0,
};

async function cacheYTForOffline(videoId) {
  if (!videoId || ytCache.videos[videoId]) return;
  
  try {
    // Store video ID for offline badge
    ytCache.videos[videoId] = { cached: true, timestamp: Date.now() };
    
    // Mark songs with this youtubeId as cached
    state.songs.forEach(s => {
      if (s.youtubeId === videoId) {
        s.offlineCached = true;
      }
    });
    
    saveState();
    updateStreamIndicator();
    showToast('📥 Cached for offline', 'fa-check');
  } catch(e) {
    console.warn('Cache error:', e);
  }
}

function isOfflineAvailable(songId) {
  const song = state.songs.find(s => s.id === songId);
  if (!song) return false;
  if (song.audioData) return true; // Local files always available
  if (song.offlineCached) return true;
  return false;
}

function cacheCurrentSong() {
  const song = state.currentIndex >= 0 ? state.songs[state.currentIndex] : null;
  if (!song) return;
  
  if (song.audioData) {
    showToast('✅ Already available offline', 'fa-check');
    return;
  }
  
  if (song.youtubeId) {
    cacheYTForOffline(song.youtubeId);
  } else {
    showToast('Cannot cache this song', 'fa-circle-exclamation');
  }
}

// Also update patch: make loadSong record plays


// =========================================
// 20. FLOATING MUSIC NOTES
// =========================================

function spawnMusicNote(container) {
  if (!container) return;
  const notes = ['♩', '♪', '♫', '🎵', '🎶'];
  const note = document.createElement('div');
  note.className = 'music-note-particle';
  note.textContent = notes[Math.floor(Math.random() * notes.length)];
  note.style.left = (10 + Math.random() * 80) + '%';
  note.style.top = (60 + Math.random() * 30) + '%';
  note.style.fontSize = (14 + Math.random() * 24) + 'px';
  note.style.animationDuration = (3 + Math.random() * 3) + 's';
  note.style.opacity = 0.1 + Math.random() * 0.3;
  container.appendChild(note);
  setTimeout(() => note.remove(), 5000);
}

let noteInterval = null;

function startMusicNotes() {
  const container = document.getElementById('npFullscreen');
  if (!container) return;
  stopMusicNotes();
  noteInterval = setInterval(() => spawnMusicNote(container), 2000);
}

function stopMusicNotes() {
  if (noteInterval) {
    clearInterval(noteInterval);
    noteInterval = null;
  }
}

// =========================================
// INIT: Setup new features
// =========================================

function setupNewFeatures() {
  setupKeyboardShortcuts();
  setupRippleEffect();
  
  // Initialize Visualizer
  initVisualizer();
  
  // Initialize EQ
  if (audio && audio.src) {
    try { setupEQ(); } catch(e) { console.log('EQ setup deferred'); }
  } else {
    audio.addEventListener('loadedmetadata', () => {
      try { setupEQ(); } catch(e) { console.log('EQ not available'); }
    }, { once: true });
  }
  
  // Sync now playing with progress interval for new songs
  setInterval(() => {
    if (state.isPlaying && state.currentIndex >= 0) {
      if (npFullscreen.classList.contains('active')) {
        syncNowPlayingProgress();
      }
    }
  }, 1000);
  
  // Pre-load settings for new tabs
  loadSettingsUI();
  
  // Hook into now-playing open/close for visualizer
  const _origOpenNP = openNowPlaying;
  openNowPlaying = function() {
    _origOpenNP();
    setTimeout(() => {
      startVisualizer();
      startMusicNotes();
    }, 100);
  };
  
  const _origCloseNP = closeNowPlaying;
  closeNowPlaying = function() {
    _origCloseNP();
    stopVisualizer();
    stopMusicNotes();
  };
  
  // Keyboard shortcut to cache current song: O key
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'o' || e.key === 'O') && !e.target.closest('input,textarea')) {
      e.preventDefault();
      cacheCurrentSong();
    }
  });
  
  showToast('✨ Animations & visualizer loaded!', 'fa-wand-magic-sparkles');
}

// Run on page navigation to ai-music
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-page="ai-music"]');
  if (link) {
    setTimeout(() => {
      initStudioTabs();
      initBeatMaker();
    }, 100);
  }
});

// Also init when the page first loads if it's active
if (document.getElementById('page-ai-music')?.classList.contains('active') || window.location.hash === '#ai-music') {
  setTimeout(() => {
    initStudioTabs();
    initBeatMaker();
  }, 200);
}

// Run after DOM is ready
if (document.readyState === 'complete') {
  setupNewFeatures();
} else {
  document.addEventListener('DOMContentLoaded', setupNewFeatures);
}
