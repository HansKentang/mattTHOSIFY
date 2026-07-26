// =========================================
// MATTHOSIFY - Full Spotify-like Player v2
// =========================================

// ---- State ----
const state = {
  songs: [],
  currentIndex: -1,
  isPlaying: false,
  isShuffled: false,
  repeatMode: 'off',
  isMuted: false,
  volume: 70,
  queue: [],
  customQueue: [],
  searchQuery: '',
  currentPage: 'home',
  currentPlaylist: 'my-library',
  likedSongs: new Set(),
  currentTime: 0,
  duration: 0,
  settings: {
    displayName: 'Matthosify User',
    accentColor: '#1ed760',
    quality: 'normal',
    crossfade: false,
    crossfadeDuration: 3,
    gapless: false,
    autoplay: true,
    profilePic: null,
    ytApiKey: '',
    spotifyClientId: '',
    spotifySecret: '',
    spotifyToken: null,
    spotifyTokenExpiry: null,
    eqPreset: 'flat',
    eqValues: {32:0,64:0,125:0,250:0,500:0,1000:0,2000:0,4000:0,8000:0,16000:0},
  },
  sleepTimer: {
    active: false,
    endTime: null,
    interval: null,
  },
  contextSongId: null,
  currentArtist: null,
  currentAlbumId: null,
  playlists: [],
  currentPlaylistId: null,
  recentlyPlayed: [],
  playCounts: {},
  listeningHistory: [],
  podcasts: [],
  currentPodcastId: null,
  genres: [],
  eqNodes: null,
  audioCtx: null,
  ytPlayer: null,
  ytReady: false,
  ytCurrentVideoId: null,
  isYtPlaying: false,
  npIsDragging: false,
  isCrossfading: false,
};

// ---- DOM refs ----
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// Core player
const audio = $('#audioPlayer');
const playBtn = $('#playBtn');
const prevBtn = $('#prevBtn');
const nextBtn = $('#nextBtn');
const shuffleBtn = $('#shuffleBtn');
const repeatBtn = $('#repeatBtn');
const muteBtn = $('#muteBtn');
const progressBar = $('#progressBar');
const progressFilled = $('#progressBarFilled');
const progressThumb = $('#progressThumb');
const volumeBar = $('#volumeBar');
const volumeFilled = $('#volumeBarFilled');
const volumeThumb = $('#volumeThumb');
const currentTime = $('#currentTime');
const totalTime = $('#totalTime');
const currentTitle = $('#currentSongTitle');
const currentArtist = $('#currentSongArtist');
const currentImg = $('#currentSongImg');
const likeBtn = $('.btn-like');
const songGrid = $('#songGrid-home');
const libraryBody = $('#libraryBody');
const libraryStats = $('#libraryStats');
const searchInput = $('#searchInput');
const searchResults = $('#searchResults');
const searchResultsList = $('#searchResultsList');
const navLinks = $$('.nav-link');
const pages = {};
$$('.page').forEach(p => { pages[p.id.replace('page-', '')] = p; });
const greetingText = $('#greetingText');

// Modal
const addSongModal = $('#addSongModal');
const closeModalBtn = $('#closeModalBtn');
const cancelModalBtn = $('#cancelModalBtn');
const confirmAddBtn = $('#confirmAddSongBtn');
const songTitleInput = $('#songTitle');
const songArtistInput = $('#songArtist');
const songDurationInput = $('#songDuration');
const songFileInput = $('#songFile');
const songCoverInput = $('#songCover');
const fileName = $('#fileName');
const coverName = $('#coverName');
const fileUploadArea = $('#fileUploadArea');
const coverUploadArea = $('#coverUploadArea');
const addSongBtn = $('#addSongBtn');
const importBtn = $('#importBtn');

// Toast
const toast = $('#toast');
const toastMsg = $('#toastMessage');

// Queue
const queuePanel = $('#queuePanel');
const queueBody = $('#queueBody');
const closeQueueBtn = $('#closeQueueBtn');
const queueBtn = $('#queueBtn');

// Profile dropdown
const profileBtn = $('#profileBtn');
const profileMenu = $('#profileMenu');
const profileName = $('#profileName');

// Context menu
const contextMenu = $('#contextMenu');
const settingsTabBtns = $$('.settings-tab');
const settingsPanels = {};
$$('.settings-panel').forEach(p => { settingsPanels[p.id] = p; });

// Settings
const settingsDisplayName = $('#settingsDisplayName');
const saveDisplayName = $('#saveDisplayName');
const settingsQuality = $('#settingsQuality');
const settingsCrossfade = $('#settingsCrossfadeDuration');
const settingsAutoplay = $('#settingsAutoplay');
const colorOptions = $$('.color-option');
const customColorPicker = $('#customColorPicker');
const profilePicInput = $('#profilePicInput');
const changePicBtn = $('#changePicBtn');
const profilePicPreview = $('#profilePicPreview');
const settingsExportBtn = $('#settingsExportBtn');
const settingsImportBtn = $('#settingsImportBtn');
const settingsImportInput = $('#settingsImportInput');
const settingsClearBtn = $('#settingsClearBtn');
const exportLibraryBtn = $('#exportLibraryBtn');
const importLibraryBtn = $('#importLibraryBtn');
const clearAllBtn = $('#clearAllBtn');

// Confirm dialog
const confirmDialog = $('#confirmDialog');
const confirmTitle = $('#confirmTitle');
const confirmMessage = $('#confirmMessage');
const confirmIcon = $('#confirmIcon');
const confirmOkBtn = $('#confirmOkBtn');
const confirmCancelBtn = $('#confirmCancelBtn');

// Sleep timer
const sleepTimerBtn = $('#sleepTimerBtn');

// Upgrade modal
const upgradeModal = $('#upgradeModal');
const closeUpgradeBtn = $('#closeUpgradeBtn');
const premiumCtaBtn = $('#premiumCtaBtn');
const upgradeBtn = $('.btn-upgrade');
const sleepTimerBadge = $('#sleepTimerBadge');
const sleepTimerPopup = $('#sleepTimerPopup');
const sleepTimerClose = $('#sleepTimerClose');
const sleepOptions = $$('.sleep-option');
const sleepTimerOff = $('#sleepTimerOff');

// About
const aboutSongCount = $('#aboutSongCount');
const aboutDuration = $('#aboutDuration');
const aboutLikedCount = $('#aboutLikedCount');

// Now Playing full-screen
const npFullscreen = $('#nowPlayingFullscreen');
const npCloseBtn = $('#npCloseBtn');
const npMoreBtn = $('#npMoreBtn');
const npArt = $('#npArt');
const npArtImg = $('#npArtImg');
const npSongTitle = $('#npSongTitle');
const npSongArtist = $('#npSongArtist');
const npLikeBtn = $('#npLikeBtn');
const npPlayBtn = $('#npPlayBtn');
const npPrevBtn = $('#npPrevBtn');
const npNextBtn = $('#npNextBtn');
const npShuffleBtn = $('#npShuffleBtn');
const npRepeatBtn = $('#npRepeatBtn');
const npMuteBtn = $('#npMuteBtn');
const npProgressBar = $('#npProgressBar');
const npProgressFilled = $('#npProgressFilled');
const npProgressThumb = $('#npProgressThumb');
const npCurrentTime = $('#npCurrentTime');
const npTotalTime = $('#npTotalTime');
const npVolumeBar = $('#npVolumeBar');
const npVolumeFilled = $('#npVolumeFilled');
const npVolumeThumb = $('#npVolumeThumb');
const npSourceText = $('#npSourceText');
const nowPlayingArea = $('#nowPlaying');

// Playlist detail
const playlistDetailArt = $('#playlistDetailArt');
const playlistDetailTitle = $('#playlistDetailTitle');
const playlistDetailDesc = $('#playlistDetailDesc');
const playlistDetailOwner = $('#playlistDetailOwner');
const playlistDetailCount = $('#playlistDetailCount');
const playlistPlayBtn = $('#playlistPlayBtn');
const playlistShuffleBtn = $('#playlistShuffleBtn');
const playlistLikeBtn = $('#playlistLikeBtn');
const playlistDeleteBtn = $('#playlistDeleteBtn');
const playlistBody = $('#playlistBody');

// Artist page
const artistImageLarge = $('#artistImageLarge');
const artistNameLarge = $('#artistNameLarge');
const artistSongCount = $('#artistSongCount');
const artistPlayBtn = $('#artistPlayBtn');
const artistShuffleBtn = $('#artistShuffleBtn');
const artistBody = $('#artistBody');

// Create playlist modal
const createPlaylistModal = $('#createPlaylistModal');
const createPlaylistInput = $('#createPlaylistInput');
const confirmCreatePlaylistBtn = $('#confirmCreatePlaylistBtn');
const cancelCreatePlaylistBtn = $('#cancelCreatePlaylistBtn');
const closeCreatePlaylistBtn = $('#closeCreatePlaylistBtn');
const btnCreatePlaylist = $('.btn-create-playlist');

// Add to playlist menu
const addToPlaylistMenu = $('#addToPlaylistMenu');
const addToPlaylistList = $('#addToPlaylistList');

let confirmCallback = null;
let addToPlaylistSongId = null;

// ---- Helpers ----
function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function randomId() {
  return 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg, icon = 'fa-check-circle') {
  toastMsg.textContent = msg;
  toast.querySelector('.toast-icon i').className = `fa-solid ${icon}`;
  toast.classList.add('active');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('active'), 3000);
}

function getDefaultCover() {
  return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'56\' height=\'56\' viewBox=\'0 0 56 56\'%3E%3Crect width=\'56\' height=\'56\' fill=\'%23282828\'/%3E%3Ctext x=\'28\' y=\'38\' font-size=\'28\' text-anchor=\'middle\' fill=\'%23b3b3b3\' font-family=\'Arial\'%3E♫%3C/text%3E%3C/svg%3E';
}

function updateGreeting() {
  const h = new Date().getHours();
  let msg = 'Good evening';
  if (h < 12) msg = 'Good morning';
  else if (h < 18) msg = 'Good afternoon';
  if (greetingText) greetingText.textContent = msg;
}

function getTotalDuration() {
  const total = state.songs.reduce((sum, s) => sum + (s.duration || 0), 0);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

// ---- Local Storage ----
function saveState() {
  try {
    const data = {
      songs: state.songs.map(s => ({
        ...s,
        audioData: s.audioData || null,
        coverData: s.coverData || null,
      })),
      currentIndex: state.currentIndex,
      isShuffled: state.isShuffled,
      repeatMode: state.repeatMode,
      volume: state.volume,
      likedSongs: [...state.likedSongs],
      settings: state.settings,
      playlists: state.playlists,
      recentlyPlayed: state.recentlyPlayed,
      playCounts: state.playCounts,
      listeningHistory: state.listeningHistory.slice(-500),
      podcasts: state.podcasts,
      customQueue: state.customQueue,
    };
    localStorage.setItem('matthosify_state', JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save state:', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem('matthosify_state');
    if (!raw) return false;
    const data = JSON.parse(raw);
    state.songs = data.songs || [];
    state.currentIndex = data.currentIndex ?? -1;
    state.isShuffled = data.isShuffled || false;
    state.repeatMode = data.repeatMode || 'off';
    state.volume = data.volume ?? 70;
    state.likedSongs = new Set(data.likedSongs || []);
    state.playlists = data.playlists || [];
    state.recentlyPlayed = data.recentlyPlayed || [];
    state.playCounts = data.playCounts || {};
    state.listeningHistory = data.listeningHistory || [];
    state.podcasts = data.podcasts || [];
    state.customQueue = data.customQueue || [];
    if (data.settings) state.settings = { ...state.settings, ...data.settings };
    return true;
  } catch (e) {
    return false;
  }
}

// ---- Song management ----
function addSong(song) {
  state.songs.push(song);
  saveState();
  renderAll();
  updateAboutStats();
  showToast(`"${song.title}" added to Your Library`);
}

function removeSong(id) {
  const idx = state.songs.findIndex(s => s.id === id);
  if (idx === -1) return;
  state.songs.splice(idx, 1);
  if (state.currentIndex === idx) {
    stopPlayback();
  } else if (state.currentIndex > idx) {
    state.currentIndex--;
  }
  saveState();
  renderAll();
  updateAboutStats();
  showToast('Song removed from library', 'fa-trash-can');
}

function stopPlayback() {
  audio.pause();
  if (simInterval) clearInterval(simInterval);
  state.isPlaying = false;
  state.currentIndex = -1;
  updatePlayerUI();
  renderAll();
}

// ---- Audio playback ----
let simInterval = null;

function loadSong(index) {
  if (index >= 0 && index < state.songs.length) {
    addToRecentlyPlayed(state.songs[index].id);
  }
  if (index < 0 || index >= state.songs.length) {
    stopPlayback();
    return;
  }

  const song = state.songs[index];
  state.currentIndex = index;

  if (simInterval) clearInterval(simInterval);

  if (song.audioData) {
    audio.src = song.audioData;
    audio.load();
    playAudio();
  } else {
    state.isPlaying = true;
    updatePlayerUI();
    renderAll();
    simulatePlayback(song);
    return;
  }

  currentTitle.textContent = song.title;
  currentArtist.textContent = song.artist;
  currentImg.src = song.coverData || getDefaultCover();
  currentImg.alt = song.title;
  audio.currentTime = 0;
  state.currentTime = 0;
  state.duration = song.duration || 0;
  likeBtn.classList.toggle('liked', state.likedSongs.has(song.id));
  renderAll();
  saveState();
}

function simulatePlayback(song) {
  if (simInterval) clearInterval(simInterval);
  state.currentTime = 0;
  state.duration = song.duration || 180;
  totalTime.textContent = formatTime(state.duration);
  updateProgressUI();
  simInterval = setInterval(() => {
    if (!state.isPlaying) return;
    state.currentTime += 0.25;
    if (state.currentTime >= state.duration) {
      state.currentTime = state.duration;
      updateProgressUI();
      nextSong();
      return;
    }
    updateProgressUI();
  }, 250);
}

function playAudio() {
  if (!audio.src && state.currentIndex >= 0) {
    state.isPlaying = true;
    updatePlayerUI();
    renderAll();
    if (state.songs[state.currentIndex]) simulatePlayback(state.songs[state.currentIndex]);
    return;
  }
  if (!audio.src) return;
  audio.play().then(() => {
    state.isPlaying = true;
    if (simInterval) clearInterval(simInterval);
    updatePlayerUI();
    renderAll();
  }).catch(() => {
    state.isPlaying = true;
    updatePlayerUI();
    renderAll();
    if (state.currentIndex >= 0) simulatePlayback(state.songs[state.currentIndex]);
  });
}

function togglePlay() {
  if (state.currentIndex < 0 && state.songs.length > 0) { loadSong(0); return; }
  if (state.currentIndex < 0) return;
  if (state.isPlaying) {
    if (audio.src && audio.src.startsWith('blob:')) audio.pause();
    state.isPlaying = false;
    if (simInterval) clearInterval(simInterval);
  } else {
    playAudio();
  }
  updatePlayerUI();
  renderAll();
}

function prevSong() {
  if (state.songs.length === 0) return;
  loadSong(state.currentIndex <= 0 ? state.songs.length - 1 : state.currentIndex - 1);
}

function nextSong() {
  if (state.songs.length === 0) return;
  if (state.repeatMode === 'one') { loadSong(state.currentIndex); return; }
  let newIdx;
  if (state.isShuffled) {
    do { newIdx = Math.floor(Math.random() * state.songs.length); }
    while (newIdx === state.currentIndex && state.songs.length > 1);
  } else {
    newIdx = state.currentIndex + 1;
    if (newIdx >= state.songs.length) {
      if (state.repeatMode === 'all') { newIdx = 0; }
      else {
        state.isPlaying = false;
        updatePlayerUI();
        renderAll();
        return;
      }
    }
  }
  loadSong(newIdx);
}

function seekTo(e) {
  const rect = progressBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  state.currentTime = pct * (state.duration || 180);
  if (audio.src && audio.src.startsWith('blob:')) audio.currentTime = state.currentTime;
  updateProgressUI();
}

function setVolume(e) {
  const rect = volumeBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  state.volume = Math.round(pct * 100);
  audio.volume = state.volume / 100;
  updateVolumeUI();
  saveState();
}

function toggleMute() {
  state.isMuted = !state.isMuted;
  audio.muted = state.isMuted;
  updateVolumeUI();
}

function toggleShuffle() {
  state.isShuffled = !state.isShuffled;
  shuffleBtn.classList.toggle('active', state.isShuffled);
  saveState();
}

function toggleRepeat() {
  const modes = ['off', 'all', 'one'];
  const idx = modes.indexOf(state.repeatMode);
  state.repeatMode = modes[(idx + 1) % modes.length];
  repeatBtn.classList.toggle('active', state.repeatMode !== 'off');
  repeatBtn.classList.toggle('repeat-one', state.repeatMode === 'one');
  saveState();
}

function toggleLike() {
  if (state.currentIndex < 0) return;
  const song = state.songs[state.currentIndex];
  if (!song) return;
  toggleLikeById(song.id);
}

function toggleLikeById(id) {
  if (state.likedSongs.has(id)) {
    state.likedSongs.delete(id);
    if (state.currentIndex >= 0 && state.songs[state.currentIndex]?.id === id) {
      likeBtn.classList.remove('liked');
      npLikeBtn.classList.remove('liked');
    }
    showToast('Removed from Liked Songs', 'fa-heart');
  } else {
    state.likedSongs.add(id);
    if (state.currentIndex >= 0 && state.songs[state.currentIndex]?.id === id) {
      likeBtn.classList.add('liked');
      npLikeBtn.classList.add('liked');
    }
    showToast('Added to Liked Songs', 'fa-heart');
  }
  saveState();
  renderAll();
  updateAboutStats();
}

// ---- UI updates ----
function updatePlayerUI() {
  const icon = playBtn.querySelector('i');
  icon.className = state.isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';

  if (state.currentIndex >= 0) {
    const song = state.songs[state.currentIndex];
    currentTitle.textContent = song.title;
    currentArtist.textContent = song.artist;
    currentImg.src = song.coverData || getDefaultCover();
    likeBtn.classList.toggle('liked', state.likedSongs.has(song.id));
  } else {
    currentTitle.textContent = 'No song playing';
    currentArtist.textContent = 'Add a song to get started';
    currentImg.src = getDefaultCover();
    likeBtn.classList.remove('liked');
  }
  shuffleBtn.classList.toggle('active', state.isShuffled);
  repeatBtn.classList.toggle('active', state.repeatMode !== 'off');
  repeatBtn.classList.toggle('repeat-one', state.repeatMode === 'one');
}

function updateProgressUI() {
  const dur = state.duration || 1;
  const pct = Math.min(1, (state.currentTime || 0) / dur);
  progressFilled.style.width = `${pct * 100}%`;
  progressThumb.style.left = `${pct * 100}%`;
  currentTime.textContent = formatTime(state.currentTime);
  totalTime.textContent = formatTime(state.duration);
}

function updateVolumeUI() {
  const pct = state.isMuted ? 0 : state.volume / 100;
  volumeFilled.style.width = `${pct * 100}%`;
  volumeThumb.style.left = `${pct * 100}%`;
  const icon = muteBtn.querySelector('i');
  if (state.isMuted || state.volume === 0) icon.className = 'fa-solid fa-volume-xmark';
  else if (state.volume < 30) icon.className = 'fa-solid fa-volume-low';
  else if (state.volume < 70) icon.className = 'fa-solid fa-volume';
  else icon.className = 'fa-solid fa-volume-high';
}

function updateAboutStats() {
  if (aboutSongCount) aboutSongCount.textContent = state.songs.length;
  if (aboutDuration) aboutDuration.textContent = getTotalDuration();
  if (aboutLikedCount) aboutLikedCount.textContent = state.likedSongs.size;
  if (libraryStats) {
    const total = state.songs.length;
    libraryStats.textContent = total > 0 ? `${total} song${total !== 1 ? 's' : ''} · ${getTotalDuration()}` : '';
  }
}

// ---- Navigation ----
function navigateTo(page) {
  state.currentPage = page;
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });
  Object.entries(pages).forEach(([key, el]) => {
    el.classList.toggle('active', key === page);
  });
  closeProfileMenu();
  if (page === 'settings') loadSettingsUI();
}

// ---- Rendering ----
function renderSongGrid() {
  if (!songGrid) return;
  if (state.songs.length === 0) {
    songGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);">
        <i class="fa-solid fa-music" style="font-size:48px;margin-bottom:16px;opacity:0.3;"></i>
        <p style="font-size:16px;font-weight:600;">No songs yet</p>
        <p style="font-size:14px;margin-top:8px;">Click "Add Song" to add your first song</p>
        <button style="margin-top:16px;padding:12px 24px;border-radius:20px;background:var(--accent-color);color:var(--bg-primary);font-weight:700;font-size:14px;cursor:pointer;" onclick="document.getElementById('addSongBtn').click()">
          <i class="fa-solid fa-plus"></i> Add Your First Song
        </button>
      </div>
    `;
    return;
  }
  songGrid.innerHTML = state.songs.map((song, i) => `
    <div class="song-card ${i === state.currentIndex ? 'active-song' : ''}" data-index="${i}"
         onclick="loadSong(${i})" oncontextmenu="event.preventDefault();showContextMenu(event,'${song.id}',${i})">
      <div class="song-card-image">
        ${song.coverData ? `<img src="${song.coverData}" alt="${escapeHtml(song.title)}">` : `<i class="fa-solid fa-music"></i>`}
      </div>
      <p class="song-card-title">${escapeHtml(song.title)}</p>
      <p class="song-card-artist" onclick="event.stopPropagation();openArtist('${escapeHtml(song.artist)}')" style="cursor:pointer;">${escapeHtml(song.artist)}</p>
    </div>
  `).join('');
}

function renderLibrary() {
  if (!libraryBody) return;
  if (state.songs.length === 0) {
    libraryBody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;padding:48px;color:var(--text-secondary);">
        <i class="fa-solid fa-music" style="font-size:32px;margin-bottom:12px;opacity:0.3;display:block;"></i>
        Your library is empty — add some songs!</td></tr>`;
    return;
  }

  libraryBody.innerHTML = state.songs.map((song, i) => `
    <tr data-index="${i}" class="${i === state.currentIndex ? 'active-song' : ''}" draggable="true"
        oncontextmenu="event.preventDefault();showContextMenu(event,'${song.id}',${i})">
      <td>
        <span class="row-number">${i + 1}</span>
        <div class="btn-row-play"><i class="fa-solid fa-play"></i></div>
      </td>
      <td>
        <div class="song-info">
          <div class="song-row-image">
            ${song.coverData ? `<img src="${song.coverData}" alt="">` : `<i class="fa-solid fa-music"></i>`}
          </div>
          <div>
            <div class="song-title-cell">${escapeHtml(song.title)}</div>
          </div>
        </div>
      </td>
      <td class="song-artist-cell" onclick="event.stopPropagation();openArtist('${escapeHtml(song.artist)}')" style="cursor:pointer;">${escapeHtml(song.artist)}</td>
      <td style="color:var(--text-secondary);">—</td>
      <td class="song-duration-cell">${formatTime(song.duration)}</td>
      <td class="song-action-cell">
        <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;">
          <button style="color:${state.likedSongs.has(song.id) ? 'var(--accent-color)' : 'var(--text-secondary)'};font-size:14px;${!state.likedSongs.has(song.id) ? 'opacity:0;transition:opacity 0.2s' : ''}" class="row-heart-btn">
            <i class="fa-solid fa-heart"></i>
          </button>
          <button style="color:var(--text-secondary);font-size:14px;opacity:0;transition:opacity 0.2s;" class="row-remove-btn">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  updateAboutStats();
}

function renderSearchResults(query) {
  if (!query.trim()) { searchResults.style.display = 'none'; return; }
  const q = query.toLowerCase().trim();
  const results = state.songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
  searchResults.style.display = 'block';
  if (results.length === 0) {
    searchResultsList.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-secondary);">
      <i class="fa-solid fa-search" style="font-size:32px;margin-bottom:12px;opacity:0.3;display:block;"></i>
      No results found for "${escapeHtml(query)}"</div>`;
    return;
  }
  searchResultsList.innerHTML = results.map(song => {
    const idx = state.songs.findIndex(s => s.id === song.id);
    return `<div class="queue-item" onclick="loadSong(${idx});" style="cursor:pointer;"
                oncontextmenu="event.preventDefault();event.stopPropagation();showContextMenu(event,'${song.id}',${idx})">
      <div class="queue-item-img">
        ${song.coverData ? `<img src="${song.coverData}" alt="">` : `<i class="fa-solid fa-music"></i>`}
      </div>
      <div class="queue-item-info">
        <div class="queue-item-title">${escapeHtml(song.title)}</div>
        <div class="queue-item-artist">${escapeHtml(song.artist)}</div>
      </div>
      <span style="color:var(--text-secondary);font-size:12px;">${formatTime(song.duration)}</span>
    </div>`;
  }).join('');
}

function renderQueue() {
  if (state.songs.length === 0) {
    queueBody.innerHTML = '<p class="queue-empty">No songs in queue. Add songs to your library first!</p>';
    return;
  }
  let items = state.songs;
  if (state.currentIndex >= 0) {
    const before = items.slice(0, state.currentIndex);
    const after = items.slice(state.currentIndex);
    items = [...after, ...before];
  }
  queueBody.innerHTML = items.map((song, i) => {
    const isCurrent = state.currentIndex >= 0 && song.id === state.songs[state.currentIndex]?.id;
    const idx = state.songs.findIndex(s => s.id === song.id);
    return `<div class="queue-item ${isCurrent ? 'active-song' : ''}"
                onclick="loadSong(${idx});closeQueue();"
                oncontextmenu="event.preventDefault();event.stopPropagation();showContextMenu(event,'${song.id}',${idx})"
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
}

function renderAll() {
  renderSongGrid();
  renderLibrary();
  updatePlayerUI();
  updateProgressUI();
  updateVolumeUI();
  updateAboutStats();
  renderPlaylists();
  renderRecentlyPlayed();
  if (state.currentPlaylistId && state.currentPage === 'playlist') renderPlaylistDetail();
  if (state.currentArtist && state.currentPage === 'artist') renderArtistPage(state.currentArtist);
}

// ---- Settings ----
function loadSettingsUI() {
  settingsDisplayName.value = state.settings.displayName || 'Matthosify User';
  settingsQuality.value = state.settings.quality || 'normal';
  if (settingsCrossfade && settingsCrossfade.type !== 'range') settingsCrossfade.checked = state.settings.crossfade || false;
  // Crossfade duration is handled in features.js
  settingsAutoplay.checked = state.settings.autoplay !== false;

  // Update profile pic preview
  if (state.settings.profilePic) {
    profilePicPreview.innerHTML = `<img src="${state.settings.profilePic}" alt="Profile">`;
  } else {
    profilePicPreview.innerHTML = '<i class="fa-solid fa-user"></i>';
  }

  // Update profile name in top bar
  profileName.textContent = state.settings.displayName || 'Matthosify User';
}

function applyAccentColor(color) {
  document.documentElement.style.setProperty('--accent-color', color);
  state.settings.accentColor = color;
  colorOptions.forEach(o => o.classList.toggle('active', o.dataset.color === color));
  customColorPicker.value = color;
  saveState();
}

// ---- Context Menu ----
function showContextMenu(e, songId, index) {
  e.preventDefault();
  state.contextSongId = songId;
  contextMenu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
  contextMenu.style.top = Math.min(e.clientY, window.innerHeight - 250) + 'px';
  contextMenu.classList.add('active');

  // Update like item text
  const likeItem = contextMenu.querySelector('[data-action="like"]');
  const isLiked = state.likedSongs.has(songId);
  likeItem.innerHTML = `<i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i> ${isLiked ? 'Unlike' : 'Like'}`;
}

function hideContextMenu() {
  contextMenu.classList.remove('active');
}

function handleContextAction(action) {
  const id = state.contextSongId;
  const idx = state.songs.findIndex(s => s.id === id);
  if (idx === -1) return;

  switch (action) {
    case 'play':
      loadSong(idx);
      break;
    case 'play-next':
      showToast('Song queued to play next', 'fa-forward-step');
      break;
    case 'like':
      toggleLikeById(id);
      break;
    case 'remove':
      showConfirm('Remove Song', `Delete "${state.songs[idx].title}" from your library?`, () => removeSong(id), 'Delete');
      break;
    case 'add-to-playlist':
      showAddToPlaylistMenu({ clientX: contextMenu.style.left.replace('px',''), clientY: contextMenu.style.top.replace('px','') }, id);
      break;
    case 'share':
      const song = state.songs[idx];
      const shareText = `${song.title} - ${song.artist} (on Matthosify)`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => showToast('Copied to clipboard!', 'fa-share-nodes'));
      } else {
        showToast(shareText, 'fa-share-nodes');
      }
      break;
  }
  hideContextMenu();
}

// ---- Confirm Dialog ----
function showConfirm(title, message, callback, btnText = 'Delete') {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOkBtn.textContent = btnText;
  confirmCallback = callback;
  confirmDialog.classList.add('active');
}

function closeConfirm() {
  confirmDialog.classList.remove('active');
  confirmCallback = null;
}

// ---- Sleep Timer ----
function setSleepTimer(minutes) {
  if (minutes === 0) {
    state.sleepTimer.active = false;
    if (state.sleepTimer.interval) clearInterval(state.sleepTimer.interval);
    state.sleepTimer.interval = null;
    state.sleepTimer.endTime = null;
    sleepTimerBtn.classList.remove('active');
    sleepTimerBadge.style.display = 'none';
    sleepTimerPopup.classList.remove('active');
    saveState();
    return;
  }

  state.sleepTimer.active = true;
  state.sleepTimer.endTime = Date.now() + minutes * 60 * 1000;
  sleepTimerBtn.classList.add('active');
  sleepTimerBadge.style.display = 'flex';
  sleepTimerBadge.textContent = minutes;
  sleepTimerPopup.classList.remove('active');

  if (state.sleepTimer.interval) clearInterval(state.sleepTimer.interval);
  state.sleepTimer.interval = setInterval(() => {
    const remaining = state.sleepTimer.endTime - Date.now();
    if (remaining <= 0) {
      clearInterval(state.sleepTimer.interval);
      state.sleepTimer.active = false;
      state.sleepTimer.interval = null;
      sleepTimerBtn.classList.remove('active');
      sleepTimerBadge.style.display = 'none';
      // Stop playback
      if (state.isPlaying) {
        togglePlay();
        showToast('Sleep timer: playback stopped', 'fa-moon');
      }
      saveState();
      return;
    }
    const mins = Math.ceil(remaining / 60000);
    sleepTimerBadge.textContent = mins;
  }, 10000);

  saveState();
  showToast(`Sleep timer set for ${minutes} minutes`, 'fa-moon');
}

// ---- Import / Export ----
function exportLibrary() {
  if (state.songs.length === 0) {
    showToast('No songs to export', 'fa-circle-exclamation');
    return;
  }
  try {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      songs: state.songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        duration: s.duration,
        addedAt: s.addedAt,
        // Note: audioData/coverData are omitted for file size, only metadata exported
      })),
      likedSongs: [...state.likedSongs],
      settings: state.settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matthosify_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${state.songs.length} songs`, 'fa-download');
  } catch (e) {
    showToast('Export failed', 'fa-circle-exclamation');
  }
}

function importLibrary(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.songs || !Array.isArray(data.songs)) {
        showToast('Invalid backup file', 'fa-circle-exclamation');
        return;
      }
      const count = data.songs.length;
      data.songs.forEach(s => {
        if (!state.songs.find(ex => ex.id === s.id)) {
          state.songs.push({
            id: s.id || randomId(),
            title: s.title || 'Unknown',
            artist: s.artist || 'Unknown',
            duration: s.duration || 180,
            addedAt: s.addedAt || Date.now(),
            audioData: null,
            coverData: null,
          });
        }
      });
      if (data.likedSongs) data.likedSongs.forEach(id => state.likedSongs.add(id));
      if (data.settings) state.settings = { ...state.settings, ...data.settings };
      saveState();
      renderAll();
      loadSettingsUI();
      updateAboutStats();
      showToast(`Imported ${count} song${count !== 1 ? 's' : ''}!`, 'fa-upload');
    } catch (err) {
      showToast('Failed to import file', 'fa-circle-exclamation');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  showConfirm('Clear All Data', 'This will permanently delete all your songs, settings, and preferences. This cannot be undone!', () => {
    state.songs = [];
    state.currentIndex = -1;
    state.likedSongs = new Set();
    state.isPlaying = false;
    stopPlayback();
    state.settings = { displayName: 'Matthosify User', accentColor: '#1ed760', quality: 'normal', crossfade: false, autoplay: true, profilePic: null };
    localStorage.removeItem('matthosify_state');
    applyAccentColor('#1ed760');
    updateAboutStats();
    loadSettingsUI();
    showToast('All data cleared', 'fa-trash-can');
    navigateTo('home');
  }, 'Clear Everything');
}

// ---- Queue ----
function toggleQueue() { queuePanel.classList.toggle('active'); renderQueue(); }
function closeQueue() { queuePanel.classList.remove('active'); }

// ---- Profile Dropdown ----
function toggleProfileMenu() { profileMenu.classList.toggle('active'); }
function closeProfileMenu() { profileMenu.classList.remove('active'); }

// ---- Modal ----
function openModal() {
  addSongModal.classList.add('active');
  songTitleInput.value = '';
  songArtistInput.value = '';
  songDurationInput.value = '';
  songFileInput.value = '';
  songCoverInput.value = '';
  fileName.textContent = '';
  coverName.textContent = '';
  songTitleInput.focus();
}

function closeModal() { addSongModal.classList.remove('active'); }

function handleFileSelect(file) {
  return new Promise((resolve) => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => { showToast('Failed to read file', 'fa-circle-exclamation'); resolve(null); };
    reader.readAsDataURL(file);
  });
}

async function confirmAddSong() {
  const title = songTitleInput.value.trim();
  const artist = songArtistInput.value.trim() || 'Unknown Artist';
  const duration = parseInt(songDurationInput.value) || 180;
  const audioFile = songFileInput.files[0];
  const coverFile = songCoverInput.files[0];
  if (!title) {
    songTitleInput.style.borderColor = '#f00';
    songTitleInput.focus();
    showToast('Please enter a song title', 'fa-circle-exclamation');
    setTimeout(() => songTitleInput.style.borderColor = '', 2000);
    return;
  }
  const audioData = audioFile ? await handleFileSelect(audioFile) : null;
  const coverData = coverFile ? await handleFileSelect(coverFile) : null;
  addSong({ id: randomId(), title, artist, duration, audioData, coverData, addedAt: Date.now() });
  closeModal();
  if (state.currentIndex < 0) loadSong(state.songs.length - 1);
}

// ---- Now Playing Fullscreen ----
let npIsDragging = false;

function syncNowPlayingUI() {
  if (state.currentIndex < 0 || !state.songs[state.currentIndex]) {
    npSongTitle.textContent = 'No song playing';
    npSongArtist.textContent = 'Add a song to get started';
    npArtImg.src = getDefaultCover();
    npLikeBtn.classList.remove('liked');
    return;
  }
  const song = state.songs[state.currentIndex];
  npSongTitle.textContent = song.title;
  npSongArtist.textContent = song.artist;
  npArtImg.src = song.coverData || getDefaultCover();
  npLikeBtn.classList.toggle('liked', state.likedSongs.has(song.id));
  
  // Sync play icon
  const icon = npPlayBtn.querySelector('i');
  icon.className = state.isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  npArt.classList.toggle('playing', state.isPlaying);
  
  // Sync controls
  npShuffleBtn.classList.toggle('active', state.isShuffled);
  npRepeatBtn.classList.toggle('active', state.repeatMode !== 'off');
  npRepeatBtn.classList.toggle('repeat-one', state.repeatMode === 'one');
}

function syncNowPlayingProgress() {
  const dur = state.duration || 1;
  const pct = Math.min(1, (state.currentTime || 0) / dur);
  npProgressFilled.style.width = `${pct * 100}%`;
  npProgressThumb.style.left = `${pct * 100}%`;
  npCurrentTime.textContent = formatTime(state.currentTime);
  npTotalTime.textContent = formatTime(state.duration);
  
  // Volume
  const volPct = state.isMuted ? 0 : state.volume / 100;
  npVolumeFilled.style.width = `${volPct * 100}%`;
  npVolumeThumb.style.left = `${volPct * 100}%`;
  const npIcon = npMuteBtn.querySelector('i');
  if (state.isMuted || state.volume === 0) npIcon.className = 'fa-solid fa-volume-xmark';
  else if (state.volume < 30) npIcon.className = 'fa-solid fa-volume-low';
  else if (state.volume < 70) npIcon.className = 'fa-solid fa-volume';
  else npIcon.className = 'fa-solid fa-volume-high';
}

function openNowPlaying() {
  syncNowPlayingUI();
  syncNowPlayingProgress();
  npFullscreen.classList.add('active');
}

function closeNowPlaying() {
  npFullscreen.classList.remove('active');
}

function npSeek(e) {
  const rect = npProgressBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  state.currentTime = pct * (state.duration || 180);
  if (audio.src && audio.src.startsWith('blob:')) audio.currentTime = state.currentTime;
  syncNowPlayingProgress();
  updateProgressUI();
}

function npSetVolume(e) {
  const rect = npVolumeBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  state.volume = Math.round(pct * 100);
  audio.volume = state.volume / 100;
  syncNowPlayingProgress();
  updateVolumeUI();
  saveState();
}

// ---- Playlist Management ----
function createPlaylist(name) {
  const playlist = {
    id: randomId(),
    name: name || `My Playlist #${state.playlists.length + 1}`,
    songIds: [],
    createdAt: Date.now(),
  };
  state.playlists.push(playlist);
  saveState();
  renderPlaylists();
  showToast(`Playlist "${playlist.name}" created`, 'fa-list');
}

function deletePlaylist(id) {
  const idx = state.playlists.findIndex(p => p.id === id);
  if (idx === -1) return;
  const name = state.playlists[idx].name;
  state.playlists.splice(idx, 1);
  if (state.currentPlaylistId === id) {
    state.currentPlaylistId = null;
    navigateTo('library');
  }
  saveState();
  renderPlaylists();
  showToast(`Playlist "${name}" deleted`, 'fa-trash-can');
}

function addSongToPlaylist(playlistId, songId) {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (!playlist) return;
  if (playlist.songIds.includes(songId)) {
    showToast('Song already in playlist', 'fa-circle-exclamation');
    return;
  }
  playlist.songIds.push(songId);
  saveState();
  renderPlaylists();
  if (state.currentPlaylistId === playlistId) renderPlaylistDetail();
  showToast(`Added to "${playlist.name}"`, 'fa-list');
}

function removeSongFromPlaylist(playlistId, songId) {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (!playlist) return;
  const idx = playlist.songIds.indexOf(songId);
  if (idx === -1) return;
  playlist.songIds.splice(idx, 1);
  saveState();
  if (state.currentPlaylistId === playlistId) renderPlaylistDetail();
  showToast('Removed from playlist', 'fa-trash-can');
}

function openPlaylist(id) {
  state.currentPlaylistId = id;
  renderPlaylistDetail();
  navigateTo('playlist');
}

function renderPlaylists() {
  const container = document.getElementById('playlists');
  if (!container) return;
  
  let html = '';
  
  // User-created playlists
  state.playlists.forEach(p => {
    const count = p.songIds.filter(sid => state.songs.find(s => s.id === sid)).length;
    const isActive = state.currentPlaylistId === p.id;
    html += `<div class="playlist-item ${isActive ? 'active' : ''}" onclick="openPlaylist('${p.id}')" style="position:relative;">
      <i class="fa-solid fa-list"></i>
      <span>${escapeHtml(p.name)}</span>
      <span style="position:absolute;right:8px;font-size:11px;color:var(--text-subdued);">${count}</span>
    </div>`;
  });
  
  // Show 'My Music' and 'Favorites' if no playlists
  if (state.playlists.length === 0) {
    html += `<a href="#" class="playlist-item active" onclick="navigateTo('library')">
      <i class="fa-solid fa-music"></i>
      <span>My Music</span>
    </a>
    <a href="#" class="playlist-item" onclick="navigateTo('liked')">
      <i class="fa-solid fa-heart"></i>
      <span>Favorites</span>
    </a>`;
  }
  
  container.innerHTML = html;
}

function renderPlaylistDetail() {
  const playlist = state.playlists.find(p => p.id === state.currentPlaylistId);
  if (!playlist) {
    navigateTo('library');
    return;
  }
  
  // Get songs in playlist order
  const songs = playlist.songIds
    .map(sid => state.songs.find(s => s.id === sid))
    .filter(Boolean);
  
  playlistDetailTitle.textContent = playlist.name;
  playlistDetailDesc.textContent = 'Custom playlist';
  playlistDetailOwner.textContent = state.settings.displayName || 'Matthosify User';
  playlistDetailCount.textContent = `${songs.length} song${songs.length !== 1 ? 's' : ''}`;
  
  // Set art
  if (songs.length > 0 && songs[0].coverData) {
    playlistDetailArt.innerHTML = `<img src="${songs[0].coverData}" alt="">`;
  } else {
    playlistDetailArt.innerHTML = `<i class="fa-solid fa-music"></i>`;
  }
  
  // Render songs
  if (songs.length === 0) {
    playlistBody.innerHTML = `<tr><td colspan="5" class="playlist-empty">
      <i class="fa-solid fa-music"></i>
      <p>This playlist is empty</p>
      <p style="font-size:13px;margin-top:8px;">Right-click any song and select "Add to Playlist"</p>
    </td></tr>`;
    return;
  }
  
  playlistBody.innerHTML = songs.map((song, i) => {
    const globalIdx = state.songs.findIndex(s => s.id === song.id);
    return `<tr data-index="${globalIdx}" class="${globalIdx === state.currentIndex ? 'active-song' : ''}"
                oncontextmenu="event.preventDefault();showContextMenu(event,'${song.id}',${globalIdx})">
      <td>${i + 1}</td>
      <td>
        <div class="song-info">
          <div class="song-row-image">
            ${song.coverData ? `<img src="${song.coverData}" alt="">` : `<i class="fa-solid fa-music"></i>`}
          </div>
          <div>
            <div class="song-title-cell" onclick="loadSong(${globalIdx})">${escapeHtml(song.title)}</div>
          </div>
        </div>
      </td>
      <td class="song-artist-cell">${escapeHtml(song.artist)}</td>
      <td class="song-duration-cell">${formatTime(song.duration)}</td>
      <td>
        <button style="color:var(--text-secondary);font-size:14px;" onclick="showConfirm('Remove from Playlist','Remove "${escapeHtml(song.title)}" from this playlist?',()=>removeSongFromPlaylist('${playlist.id}','${song.id}'),'Remove')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

// ---- Recently Played ----
function addToRecentlyPlayed(songId) {
  // Remove if already exists
  state.recentlyPlayed = state.recentlyPlayed.filter(r => r.songId !== songId);
  // Add to front
  state.recentlyPlayed.unshift({ songId, timestamp: Date.now() });
  // Keep max 20
  if (state.recentlyPlayed.length > 20) state.recentlyPlayed = state.recentlyPlayed.slice(0, 20);
  saveState();
}

function renderRecentlyPlayed() {
  const container = document.querySelector('.recently-played-grid');
  if (!container) return;
  
  const recent = state.recentlyPlayed
    .map(r => ({ song: state.songs.find(s => s.id === r.songId), ...r }))
    .filter(r => r.song);
  
  if (recent.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);grid-column:1/-1;padding:24px;text-align:center;">No recently played songs</p>';
    return;
  }
  
  container.innerHTML = recent.slice(0, 6).map(r => {
    const idx = state.songs.findIndex(s => s.id === r.song.id);
    return `<div class="recently-played-item" onclick="loadSong(${idx})"
                oncontextmenu="event.preventDefault();event.stopPropagation();showContextMenu(event,'${r.song.id}',${idx})">
      <div class="rp-image">
        ${r.song.coverData ? `<img src="${r.song.coverData}" alt="">` : `<i class="fa-solid fa-music"></i>`}
      </div>
      <div class="rp-info">
        <div class="rp-title">${escapeHtml(r.song.title)}</div>
        <div class="rp-artist">${escapeHtml(r.song.artist)}</div>
      </div>
    </div>`;
  }).join('');
}

// ---- Artist Page ----
function openArtist(artistName) {
  // Store current artist
  state.currentArtist = artistName;
  renderArtistPage(artistName);
  navigateTo('artist');
}

function renderArtistPage(artistName) {
  const songs = state.songs.filter(s => s.artist === artistName);
  
  artistNameLarge.textContent = artistName;
  artistSongCount.textContent = `${songs.length} song${songs.length !== 1 ? 's' : ''}`;
  
  // Set image
  const firstWithCover = songs.find(s => s.coverData);
  if (firstWithCover) {
    artistImageLarge.innerHTML = `<img src="${firstWithCover.coverData}" alt="${escapeHtml(artistName)}">`;
  } else {
    artistImageLarge.innerHTML = `<i class="fa-solid fa-user"></i>`;
  }
  
  if (songs.length === 0) {
    artistBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:48px;color:var(--text-secondary);">No songs by this artist</td></tr>`;
    return;
  }
  
  artistBody.innerHTML = songs.map((song, i) => {
    const idx = state.songs.findIndex(s => s.id === song.id);
    return `<tr data-index="${idx}" class="${idx === state.currentIndex ? 'active-song' : ''}"
                onclick="loadSong(${idx})"
                oncontextmenu="event.preventDefault();showContextMenu(event,'${song.id}',${idx})">
      <td>${i + 1}</td>
      <td>
        <div class="song-info">
          <div class="song-row-image">
            ${song.coverData ? `<img src="${song.coverData}" alt="">` : `<i class="fa-solid fa-music"></i>`}
          </div>
          <div>
            <div class="song-title-cell">${escapeHtml(song.title)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(song.artist)}</td>
      <td class="song-duration-cell">${formatTime(song.duration)}</td>
    </tr>`;
  }).join('');
}

// ---- Drag & Drop Reorder ----
let dragSourceIndex = -1;

function setupDragDrop(tableId, bodyId) {
  const table = document.getElementById(tableId);
  if (!table || table.dataset.dragSetup) return;
  table.dataset.dragSetup = 'true';
  
  table.addEventListener('dragstart', (e) => {
    const row = e.target.closest('tr[data-index]');
    if (!row) return;
    dragSourceIndex = parseInt(row.dataset.index);
    if (isNaN(dragSourceIndex)) return;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  
  table.addEventListener('dragend', (e) => {
    const rows = table.querySelectorAll('tr[data-index]');
    rows.forEach(r => r.classList.remove('dragging', 'drag-over'));
  });
  
  table.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.target.closest('tr[data-index]');
    if (!row) return;
    const targetIdx = parseInt(row.dataset.index);
    if (isNaN(targetIdx) || targetIdx === dragSourceIndex) return;
    // Clear all drag-over
    table.querySelectorAll('tr[data-index]').forEach(r => r.classList.remove('drag-over'));
    row.classList.add('drag-over');
  });
  
  table.addEventListener('drop', (e) => {
    e.preventDefault();
    const row = e.target.closest('tr[data-index]');
    if (!row) return;
    const targetIdx = parseInt(row.dataset.index);
    if (isNaN(targetIdx) || targetIdx === dragSourceIndex) return;
    
    // Reorder songs array
    const [moved] = state.songs.splice(dragSourceIndex, 1);
    state.songs.splice(targetIdx, 0, moved);
    
    // Update current index if needed
    if (state.currentIndex === dragSourceIndex) {
      state.currentIndex = targetIdx;
    } else if (state.currentIndex > dragSourceIndex && state.currentIndex <= targetIdx) {
      state.currentIndex--;
    } else if (state.currentIndex < dragSourceIndex && state.currentIndex >= targetIdx) {
      state.currentIndex++;
    }
    
    saveState();
    renderAll();
    showToast('Song reordered', 'fa-arrow-up-arrow-down');
  });
}

// ---- Show Add to Playlist Menu ----
function showAddToPlaylistMenu(e, songId) {
  e.preventDefault();
  e.stopPropagation();
  addToPlaylistSongId = songId;
  
  if (state.playlists.length === 0) {
    showToast('No playlists yet. Create one first!', 'fa-circle-exclamation');
    return;
  }
  
  addToPlaylistList.innerHTML = state.playlists.map(p => {
    const inPlaylist = p.songIds.includes(songId);
    return `<div class="context-menu-item" onclick="addSongToPlaylist('${p.id}','${songId}');hideAddToPlaylistMenu()">
      <i class="fa-${inPlaylist ? 'solid fa-check' : 'regular fa-circle'}"></i>
      ${escapeHtml(p.name)}
    </div>`;
  }).join('');
  
  addToPlaylistMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
  addToPlaylistMenu.style.top = Math.min(e.clientY, window.innerHeight - 300) + 'px';
  addToPlaylistMenu.classList.add('active');
}

function hideAddToPlaylistMenu() {
  addToPlaylistMenu.classList.remove('active');
  addToPlaylistSongId = null;
}

// ---- Enhanced Context Menu ----
// Add "Add to Playlist" item to context menu

// ---- Event Listeners ----

// Player controls
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', prevSong);
nextBtn.addEventListener('click', nextSong);
shuffleBtn.addEventListener('click', toggleShuffle);
repeatBtn.addEventListener('click', toggleRepeat);
muteBtn.addEventListener('click', toggleMute);
likeBtn.addEventListener('click', toggleLike);

// Progress bar
let isDragging = false;
progressBar.addEventListener('mousedown', (e) => { isDragging = true; seekTo(e); });
document.addEventListener('mousemove', (e) => { if (isDragging) seekTo(e); });
document.addEventListener('mouseup', () => { isDragging = false; });

// Volume bar
let isDraggingVol = false;
volumeBar.addEventListener('mousedown', (e) => { isDraggingVol = true; setVolume(e); });
document.addEventListener('mousemove', (e) => { if (isDraggingVol) setVolume(e); });
document.addEventListener('mouseup', () => { isDraggingVol = false; });

// Audio events
audio.addEventListener('timeupdate', () => {
  state.currentTime = audio.currentTime;
  state.duration = audio.duration || state.duration;
  updateProgressUI();
});
audio.addEventListener('loadedmetadata', () => {
  state.duration = audio.duration;
  totalTime.textContent = formatTime(audio.duration);
  updateProgressUI();
});
audio.addEventListener('ended', () => nextSong());
audio.addEventListener('play', () => { state.isPlaying = true; updatePlayerUI(); renderAll(); });
audio.addEventListener('pause', () => { if (state.isPlaying) { state.isPlaying = false; updatePlayerUI(); renderAll(); } });

// Navigation
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

// Sidebar settings link
$$('.sidebar-settings-link').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('settings');
  });
});

// Quick link cards
$$('.quick-link-card[data-page]').forEach(card => {
  card.addEventListener('click', () => navigateTo(card.dataset.page));
});
$$('.quick-link-card[data-action="add-song"]').forEach(card => {
  card.addEventListener('click', openModal);
});

// Search
searchInput.addEventListener('input', (e) => renderSearchResults(e.target.value));

// Modal
addSongBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
addSongModal.addEventListener('click', (e) => { if (e.target === addSongModal) closeModal(); });
confirmAddBtn.addEventListener('click', confirmAddSong);
[songTitleInput, songArtistInput, songDurationInput].forEach(input => {
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmAddSong(); });
});

// File uploads
fileUploadArea.addEventListener('click', () => songFileInput.click());
songFileInput.addEventListener('change', () => { fileName.textContent = songFileInput.files[0]?.name || ''; });
coverUploadArea.addEventListener('click', () => songCoverInput.click());
songCoverInput.addEventListener('change', () => { coverName.textContent = songCoverInput.files[0]?.name || ''; });

// Drag & drop
fileUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = 'var(--accent-color)';
  fileUploadArea.style.background = 'rgba(30,215,96,0.05)';
});
fileUploadArea.addEventListener('dragleave', () => {
  fileUploadArea.style.borderColor = '';
  fileUploadArea.style.background = '';
});
fileUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = '';
  fileUploadArea.style.background = '';
  if (e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.type.startsWith('audio/')) {
      songFileInput.files = e.dataTransfer.files;
      fileName.textContent = file.name;
    }
  }
});

// Queue
queueBtn.addEventListener('click', toggleQueue);
closeQueueBtn.addEventListener('click', closeQueue);

// Profile dropdown
profileBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleProfileMenu(); });
document.addEventListener('click', (e) => {
  if (!profileMenu.contains(e.target) && e.target !== profileBtn) closeProfileMenu();
});

// Context menu
contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
  item.addEventListener('click', () => handleContextAction(item.dataset.action));
});
document.addEventListener('click', hideContextMenu);
const mainContent = $('.main-content');
if (mainContent) mainContent.addEventListener('scroll', hideContextMenu);
document.addEventListener('contextmenu', (e) => {
  if (!e.target.closest('.song-card') && !e.target.closest('tr[data-index]') && !e.target.closest('.queue-item')) {
    hideContextMenu();
  }
});

// Library table events (delegation)
function setupLibraryEvents() {
  const table = document.getElementById('libraryTable');
  if (!table || table.dataset.eventsSetup) return;
  table.dataset.eventsSetup = 'true';

  table.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-index]');
    const heartBtn = e.target.closest('.row-heart-btn');
    const removeBtn = e.target.closest('.row-remove-btn');
    const playBtnEl = e.target.closest('.btn-row-play');

    if (removeBtn) {
      const r = removeBtn.closest('tr[data-index]');
      if (r) {
        const idx = parseInt(r.dataset.index);
        if (!isNaN(idx) && state.songs[idx]) {
          const song = state.songs[idx];
          showConfirm('Remove Song', `Delete "${song.title}" from your library?`, () => removeSong(song.id), 'Delete');
        }
      }
      return;
    }
    if (heartBtn) {
      const r = heartBtn.closest('tr[data-index]');
      if (r) {
        const idx = parseInt(r.dataset.index);
        if (!isNaN(idx) && state.songs[idx]) toggleLikeById(state.songs[idx].id);
      }
      return;
    }
    if (playBtnEl) {
      const r = playBtnEl.closest('tr[data-index]');
      if (r) { const idx = parseInt(r.dataset.index); if (!isNaN(idx)) loadSong(idx); }
      return;
    }
    if (row) { const idx = parseInt(row.dataset.index); if (!isNaN(idx)) loadSong(idx); }
  });

  table.addEventListener('mouseover', (e) => {
    const row = e.target.closest('tr[data-index]');
    if (row) row.querySelectorAll('.row-heart-btn, .row-remove-btn').forEach(btn => btn.style.opacity = '1');
  });
  table.addEventListener('mouseout', (e) => {
    const row = e.target.closest('tr[data-index]');
    if (row) row.querySelectorAll('.row-heart-btn:not(.liked), .row-remove-btn').forEach(btn => btn.style.opacity = '0');
  });
}

// Settings tabs
settingsTabBtns.forEach(tab => {
  tab.addEventListener('click', () => {
    settingsTabBtns.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    Object.values(settingsPanels).forEach(p => p.classList.remove('active'));
    const panel = settingsPanels[`settings-${tab.dataset.tab}`];
    if (panel) panel.classList.add('active');
  });
});

// Settings: Display name
saveDisplayName.addEventListener('click', () => {
  const name = settingsDisplayName.value.trim() || 'Matthosify User';
  state.settings.displayName = name;
  profileName.textContent = name;
  saveState();
  showToast('Profile updated', 'fa-check');
});

// Settings: Quality
settingsQuality.addEventListener('change', () => {
  state.settings.quality = settingsQuality.value;
  saveState();
  showToast(`Audio quality set to ${settingsQuality.options[settingsQuality.selectedIndex].text}`, 'fa-sliders');
});

// Settings: Crossfade
if (settingsCrossfade && settingsCrossfade.type === 'checkbox') {
  settingsCrossfade.addEventListener('change', () => {
    state.settings.crossfade = settingsCrossfade.checked;
    saveState();
  });
}

// Settings: Autoplay
settingsAutoplay.addEventListener('change', () => {
  state.settings.autoplay = settingsAutoplay.checked;
  saveState();
});

// Settings: Color picker
colorOptions.forEach(opt => {
  opt.addEventListener('click', () => applyAccentColor(opt.dataset.color));
});
customColorPicker.addEventListener('input', () => applyAccentColor(customColorPicker.value));

// Settings: Profile picture
changePicBtn.addEventListener('click', () => profilePicInput.click());
profilePicInput.addEventListener('change', async () => {
  const file = profilePicInput.files[0];
  if (!file) return;
  const data = await handleFileSelect(file);
  if (data) {
    state.settings.profilePic = data;
    profilePicPreview.innerHTML = `<img src="${data}" alt="Profile">`;
    saveState();
    showToast('Profile picture updated', 'fa-check');
  }
});

// Settings: Import/Export
settingsExportBtn.addEventListener('click', exportLibrary);
exportLibraryBtn.addEventListener('click', exportLibrary);
settingsImportBtn.addEventListener('click', () => settingsImportInput.click());
importLibraryBtn.addEventListener('click', () => settingsImportInput.click());
settingsImportInput.addEventListener('change', (e) => {
  if (e.target.files[0]) importLibrary(e.target.files[0]);
  e.target.value = '';
});

// Settings: Clear all
settingsClearBtn.addEventListener('click', clearAllData);
clearAllBtn.addEventListener('click', clearAllData);

// Import btn in library
importBtn.addEventListener('click', () => settingsImportInput.click());

// Confirm dialog
confirmOkBtn.addEventListener('click', () => {
  if (confirmCallback) confirmCallback();
  closeConfirm();
});
confirmCancelBtn.addEventListener('click', closeConfirm);
confirmDialog.addEventListener('click', (e) => { if (e.target === confirmDialog) closeConfirm(); });

// Sleep timer
sleepTimerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  sleepTimerPopup.classList.toggle('active');
});
sleepTimerClose.addEventListener('click', () => sleepTimerPopup.classList.remove('active'));
document.addEventListener('click', (e) => {
  if (!sleepTimerPopup.contains(e.target) && e.target !== sleepTimerBtn && !sleepTimerBtn.contains(e.target)) {
    sleepTimerPopup.classList.remove('active');
  }
});
sleepOptions.forEach(opt => {
  opt.addEventListener('click', () => setSleepTimer(parseInt(opt.dataset.minutes)));
});

$('#fullscreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// Upgrade Modal
function openUpgradeModal() { upgradeModal.classList.add('active'); }
function closeUpgradeModal() { upgradeModal.classList.remove('active'); }

upgradeBtn.addEventListener('click', openUpgradeModal);
closeUpgradeBtn.addEventListener('click', closeUpgradeModal);
upgradeModal.addEventListener('click', (e) => { if (e.target === upgradeModal) closeUpgradeModal(); });
premiumCtaBtn.addEventListener('click', () => {
  closeUpgradeModal();
  showToast('🎉 You\'re already Premium! Enjoy Matthosify!', 'fa-crown');
});

// Library filter buttons
$$('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ---- Now Playing Event Listeners ----
npCloseBtn.addEventListener('click', closeNowPlaying);
npPlayBtn.addEventListener('click', togglePlay);
npPrevBtn.addEventListener('click', prevSong);
npNextBtn.addEventListener('click', nextSong);
npShuffleBtn.addEventListener('click', toggleShuffle);
npRepeatBtn.addEventListener('click', toggleRepeat);
npMuteBtn.addEventListener('click', toggleMute);
npLikeBtn.addEventListener('click', toggleLike);

// Now Playing: Progress bar
npIsDragging = false;
npProgressBar.addEventListener('mousedown', (e) => { npIsDragging = true; npSeek(e); });
document.addEventListener('mousemove', (e) => { if (npIsDragging) npSeek(e); });
document.addEventListener('mouseup', () => { npIsDragging = false; });

// Now Playing: Volume bar
npIsDraggingVol = false;
npVolumeBar.addEventListener('mousedown', (e) => { npIsDraggingVol = true; npSetVolume(e); });
document.addEventListener('mousemove', (e) => { if (npIsDraggingVol) npSetVolume(e); });
document.addEventListener('mouseup', () => { npIsDraggingVol = false; });

// Now Playing: Click now-playing area to open full-screen
nowPlayingArea.addEventListener('click', (e) => {
  // Don't open if clicking on buttons inside now-playing
  if (e.target.closest('button') || e.target.closest('.sleep-timer')) return;
  openNowPlaying();
});

// Now Playing: Close on backdrop click
npFullscreen.addEventListener('click', (e) => {
  if (e.target === npFullscreen) closeNowPlaying();
});

// Now Playing: Keyboard Escape
npFullscreen.addEventListener('keydown', (e) => {});
// Escape already handled by global keyboard handler

// ---- Playlist Event Listeners ----
btnCreatePlaylist.addEventListener('click', () => {
  createPlaylistModal.classList.add('active');
  createPlaylistInput.value = '';
  setTimeout(() => createPlaylistInput.focus(), 100);
});

closeCreatePlaylistBtn.addEventListener('click', () => createPlaylistModal.classList.remove('active'));
cancelCreatePlaylistBtn.addEventListener('click', () => createPlaylistModal.classList.remove('active'));
createPlaylistModal.addEventListener('click', (e) => {
  if (e.target === createPlaylistModal) createPlaylistModal.classList.remove('active');
});

confirmCreatePlaylistBtn.addEventListener('click', () => {
  const name = createPlaylistInput.value.trim();
  createPlaylist(name);
  createPlaylistModal.classList.remove('active');
});

createPlaylistInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmCreatePlaylistBtn.click();
});

// Playlist detail page actions
playlistPlayBtn.addEventListener('click', () => {
  const playlist = state.playlists.find(p => p.id === state.currentPlaylistId);
  if (!playlist) return;
  const songs = playlist.songIds.map(sid => state.songs.find(s => s.id === sid)).filter(Boolean);
  if (songs.length > 0) {
    const idx = state.songs.findIndex(s => s.id === songs[0].id);
    if (idx >= 0) loadSong(idx);
  }
});

playlistShuffleBtn.addEventListener('click', () => {
  const playlist = state.playlists.find(p => p.id === state.currentPlaylistId);
  if (!playlist) return;
  const songs = playlist.songIds.map(sid => state.songs.find(s => s.id === sid)).filter(Boolean);
  if (songs.length > 0) {
    const randIdx = Math.floor(Math.random() * songs.length);
    const idx = state.songs.findIndex(s => s.id === songs[randIdx].id);
    if (idx >= 0) loadSong(idx);
  }
});

playlistDeleteBtn.addEventListener('click', () => {
  const playlist = state.playlists.find(p => p.id === state.currentPlaylistId);
  if (!playlist) return;
  showConfirm('Delete Playlist', `Delete "${playlist.name}"? Songs won't be removed from your library.`, () => {
    deletePlaylist(playlist.id);
  }, 'Delete');
});

playlistLikeBtn.addEventListener('click', () => {
  const playlist = state.playlists.find(p => p.id === state.currentPlaylistId);
  if (!playlist) return;
  const songs = playlist.songIds.map(sid => state.songs.find(s => s.id === sid)).filter(Boolean);
  songs.forEach(s => {
    if (!state.likedSongs.has(s.id)) {
      state.likedSongs.add(s.id);
    }
  });
  saveState();
  renderAll();
  showToast(`Liked all ${songs.length} songs in playlist`, 'fa-heart');
});

// ---- Artist Page Event Listeners ----
artistPlayBtn.addEventListener('click', () => {
  if (!state.currentArtist) return;
  const songs = state.songs.filter(s => s.artist === state.currentArtist);
  if (songs.length > 0) {
    const idx = state.songs.findIndex(s => s.id === songs[0].id);
    if (idx >= 0) loadSong(idx);
  }
});

artistShuffleBtn.addEventListener('click', () => {
  if (!state.currentArtist) return;
  const songs = state.songs.filter(s => s.artist === state.currentArtist);
  if (songs.length > 0) {
    const randIdx = Math.floor(Math.random() * songs.length);
    const idx = state.songs.findIndex(s => s.id === songs[randIdx].id);
    if (idx >= 0) loadSong(idx);
  }
});

// ---- Add to Playlist Menu Events ----
document.addEventListener('click', (e) => {
  if (addToPlaylistMenu.classList.contains('active') && !addToPlaylistMenu.contains(e.target)) {
    hideAddToPlaylistMenu();
  }
});

// ---- Liked / Favorites Page Navigation ----
// Handle clicks on liked songs quick link
$$('.quick-link-card[data-page="liked"]').forEach(card => {
  card.addEventListener('click', () => {
    state.currentPage = 'library';
    // Filter to show only liked songs
    const likedSongs = state.songs.filter(s => state.likedSongs.has(s.id));
    if (likedSongs.length === 0) {
      showToast('No liked songs yet', 'fa-heart');
      navigateTo('library');
      return;
    }
    navigateTo('library');
    // Temporarily add a "liked" filter badge
    showToast(`Showing ${likedSongs.length} liked song${likedSongs.length !== 1 ? 's' : ''}`, 'fa-heart');
  });
});

// Sidebar Liked Songs button
const btnLikedSongs = $('.btn-liked-songs');
if (btnLikedSongs) {
  btnLikedSongs.addEventListener('click', () => {
    navigateTo('library');
    const likedSongs = state.songs.filter(s => state.likedSongs.has(s.id));
    showToast(`You have ${likedSongs.length} liked song${likedSongs.length !== 1 ? 's' : ''}`, 'fa-heart');
  });
}

// ---- Keyboard Shortcuts ----
function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  switch (e.code) {
    case 'Space': e.preventDefault(); togglePlay(); break;
    case 'ArrowLeft': e.preventDefault(); if (state.currentIndex >= 0) { state.currentTime = Math.max(0, (state.currentTime || 0) - 5); if (audio.src.startsWith('blob:')) audio.currentTime = state.currentTime; updateProgressUI(); } break;
    case 'ArrowRight': e.preventDefault(); if (state.currentIndex >= 0) { state.currentTime = Math.min(state.duration || 180, (state.currentTime || 0) + 5); if (audio.src.startsWith('blob:')) audio.currentTime = state.currentTime; updateProgressUI(); } break;
    case 'ArrowUp': e.preventDefault(); state.volume = Math.min(100, state.volume + 5); audio.volume = state.volume / 100; updateVolumeUI(); saveState(); break;
    case 'ArrowDown': e.preventDefault(); state.volume = Math.max(0, state.volume - 5); audio.volume = state.volume / 100; updateVolumeUI(); saveState(); break;
    case 'KeyM': toggleMute(); break;
    case 'KeyS': toggleShuffle(); break;
    case 'KeyR': toggleRepeat(); break;
    case 'KeyL': toggleLike(); break;
    case 'KeyQ': toggleQueue(); break;
    case 'KeyEscape': hideContextMenu(); closeQueue(); closeProfileMenu(); if (addSongModal.classList.contains('active')) closeModal(); if (confirmDialog.classList.contains('active')) closeConfirm(); sleepTimerPopup.classList.remove('active'); break;
    case 'NumpadAdd': case 'Equal': openModal(); break;
  }
}
document.addEventListener('keydown', handleKeyboard);

// ---- Init ----
function init() {
  const loaded = loadState();

  if (loaded && state.songs.length > 0) {
    if (state.currentIndex >= 0 && state.currentIndex < state.songs.length) {
      const song = state.songs[state.currentIndex];
      currentTitle.textContent = song.title;
      currentArtist.textContent = song.artist;
      currentImg.src = song.coverData || getDefaultCover();
      if (song.audioData) audio.src = song.audioData;
      state.duration = song.duration || 180;
      likeBtn.classList.toggle('liked', state.likedSongs.has(song.id));
    }
    audio.volume = state.volume / 100;
    updateVolumeUI();
  }

  // Apply saved accent color
  if (state.settings.accentColor && state.settings.accentColor !== '#1ed760') {
    applyAccentColor(state.settings.accentColor);
  }

  // Update profile name
  if (state.settings.displayName) {
    profileName.textContent = state.settings.displayName;
  }

  updateGreeting();
  setupLibraryEvents();
  setupDragDrop('libraryTable');
  renderAll();
  updateAboutStats();
  navigateTo('home');

  // Check for active sleep timer from saved state
  if (state.sleepTimer.endTime) {
    const remaining = state.sleepTimer.endTime - Date.now();
    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60000);
      setSleepTimer(mins);
    }
  }

  setTimeout(() => {
    if (state.songs.length === 0) {
      showToast('Welcome to Matthosify! Add your first song 🎵', 'fa-music');
    } else {
      showToast(`Matthosify — ${state.songs.length} song${state.songs.length !== 1 ? 's' : ''} in library`, 'fa-check');
    }
  }, 600);

  console.log('🎵 Matthosify v2 ready!');
  console.log('📋 Keyboard: Space=Play, ←→=Seek, ↑↓=Volume, S=Shuffle, R=Repeat, L=Like, Q=Queue, M=Mute, +=Add, Esc=Close');
}

document.addEventListener('DOMContentLoaded', init);
