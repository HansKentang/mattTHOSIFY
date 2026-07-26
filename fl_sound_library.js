// ============================================================
// Sound Library - Connects Beat Studio to Freesound.org
// ============================================================
(function() {
  'use strict';

  const SL_API = 'https://freesound.org/apiv2';
  const SL_KEY_STORAGE = 'freesound_api_key';
  const SL_FAVS_STORAGE = 'freesound_favorites';
  const SL_PER_PAGE = 15;

  let slTargetTrack = -1; // Track index for replace mode (-1 = add new)
  let slCurrentAudio = null;
  let slPlaying = null;
  let slResults = [];
  let slFavorites = JSON.parse(localStorage.getItem(SL_FAVS_STORAGE) || '[]');
  let slCurrentCategory = 'all';
  let slSelectedSound = null; // Currently previewing sound

  const SL_CATS = {
    all: '',
    drums: 'tag:kick OR tag:snare OR tag:hihat OR tag:drum OR tag:percussion',
    loops: 'tag:loop',
    fx: 'tag:fx OR tag:effect OR tag:riser OR tag:transition OR tag:sweep',
    instruments: 'tag:piano OR tag:guitar OR tag:bass OR tag:synth OR tag:strings'
  };

  // Track type to search query mapping
  const TRACK_SEARCH_MAP = {
    kick: 'kick drum',
    snare: 'snare drum',
    hihat_c: 'closed hi-hat',
    hihat_o: 'open hi-hat',
    clap: 'hand clap',
    crash: 'crash cymbal',
    ride: 'ride cymbal',
    tom_h: 'high tom drum',
    tom_m: 'mid tom drum',
    tom_l: 'low tom drum',
    snare2: 'snare rimshot',
    cowbell: 'cowbell',
    rimshot: 'rimshot percussion',
    bass808: '808 bass sub',
    saxophone: 'saxophone',
    cymbal: 'cymbal',
    shaker: 'shaker percussion',
    tamb: 'tambourine',
    conga: 'conga drum',
    bongo: 'bongo drum',
    maracas: 'maracas'
  };

  function getSlKey() {
    return localStorage.getItem(SL_KEY_STORAGE) || '';
  }

  // ============================================================
  // Open/close Sound Library panel
  // ============================================================
  window.flBrowseSounds = function(tIdx) {
    slTargetTrack = tIdx;
    const panel = document.getElementById('flSoundLibrary');
    const title = document.getElementById('flSlTitle');
    if (!panel) return;

    panel.style.display = 'flex';

    // Auto-search for relevant sounds based on track type
    if (typeof FL !== 'undefined' && FL.tracks && FL.tracks[tIdx]) {
      const track = FL.tracks[tIdx];
      const query = TRACK_SEARCH_MAP[track.id] || track.label || 'drum';
      if (title) title.textContent = '🔍 ' + track.label;
      const input = document.getElementById('flSlSearchInput');
      if (input) input.value = query;
      slDoSearch(query);
    } else {
      if (title) title.textContent = '🎵 Sound Library';
    }
  };

  window.flOpenSoundLibrary = function() {
    slTargetTrack = -1;
    const panel = document.getElementById('flSoundLibrary');
    const title = document.getElementById('flSlTitle');
    if (panel) panel.style.display = 'flex';
    if (title) title.textContent = '🎵 Sound Library';
  };

  function closeSoundLibrary() {
    const panel = document.getElementById('flSoundLibrary');
    if (panel) panel.style.display = 'none';
    if (slCurrentAudio) { slCurrentAudio.pause(); slCurrentAudio = null; }
    slPlaying = null;
    slTargetTrack = -1;
    slSelectedSound = null;
  }

  // ============================================================
  // Search Freesound
  // ============================================================
  async function slDoSearch(query, page) {
    const key = getSlKey();
    if (!key) {
      slSetStatus('⚠️ Set your Freesound API key in Settings → Freesound', 'error');
      return;
    }

    const searchInput = document.getElementById('flSlSearchInput');
    const q = query || (searchInput ? searchInput.value.trim() : '');
    // Allow searching without a query when a category filter is active
    if (!q && slCurrentCategory === 'all') return;

    const pageNum = page || 1;
    slSetStatus('🔍 Searching...', 'info');

    let filterParts = ['license:"Creative Commons 0"'];
    if (q) filterParts.push(q);
    if (slCurrentCategory !== 'all' && SL_CATS[slCurrentCategory]) {
      filterParts.push('(' + SL_CATS[slCurrentCategory] + ')');
    }

    const params = new URLSearchParams({
      query: q || '*',
      filter: filterParts.join(' '),
      sort: 'rating_desc',
      fields: 'id,name,username,license,tags,duration,previews,download_count',
      page_size: SL_PER_PAGE,
      page: pageNum
    });

    try {
      const res = await fetch(SL_API + '/search/?' + params.toString() + '&token=' + key);
      if (!res.ok) throw new Error('API error: ' + res.status);
      const data = await res.json();

      slResults = data.results || [];
      slSetStatus('🎵 Found ' + (data.count || 0) + ' sounds', 'success');
      slRenderResults();
    } catch (err) {
      slSetStatus('❌ ' + err.message, 'error');
    }
  }

  function slSetStatus(msg, type) {
    const el = document.getElementById('flSlStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'fl-sl-status fl-sl-status-' + (type || 'info');
    el.style.display = msg ? 'block' : 'none';
  }

  function slRenderResults() {
    const container = document.getElementById('flSlResults');
    if (!container) return;

    if (!slResults.length) {
      container.innerHTML = '<div class="fl-sl-empty"><i class="fa-solid fa-search"></i><p>No sounds found</p></div>';
      return;
    }

    container.innerHTML = slResults.map(function(s, i) {
      const dur = slFmtDur(s.duration);
      const isPlaying = slPlaying === s.id;
      const isFav = slFavorites.some(function(f) { return f.id === s.id; });
      return '<div class="fl-sl-card" data-idx="' + i + '">' +
        '<div class="fl-sl-card-play" data-action="play" data-idx="' + i + '">' +
          '<i class="fa-solid fa-' + (isPlaying ? 'pause' : 'play') + '"></i>' +
        '</div>' +
        '<div class="fl-sl-card-info">' +
          '<div class="fl-sl-card-name">' + s.name.replace(/</g, '&lt;') + '</div>' +
          '<div class="fl-sl-card-meta">' + s.username + ' · ' + dur + '</div>' +
        '</div>' +
        '<div class="fl-sl-card-actions">' +
          '<button class="fl-btn-sm" data-action="fav" data-idx="' + i + '" title="Favorite"><i class="fa-' + (isFav ? 'solid' : 'regular') + ' fa-heart"></i></button>' +
          '<button class="fl-btn-sm sl-import-btn" data-action="add" data-idx="' + i + '" title="Import to Beat Maker"><i class="fa-solid fa-plus"></i></button>' +
        '</div>' +
      '</div>';
    }).join('');

    // Event delegation for results
    container.onclick = function(e) {
      var card = e.target.closest('[data-action]');
      if (!card) return;
      var idx = parseInt(card.dataset.idx);
      var action = card.dataset.action;
      if (action === 'play') slPlay(idx);
      else if (action === 'fav') slFav(idx);
      else if (action === 'add') slImport(idx);
    };
  }

  // ============================================================
  // Playback
  // ============================================================
  function slPlay(idx) {
    var s = slResults[idx];
    if (!s) return;
    if (slCurrentAudio) { slCurrentAudio.pause(); slCurrentAudio = null; }
    if (slPlaying === s.id) {
      slPlaying = null;
      slSelectedSound = null;
      slHideNowPlaying();
      slRenderResults();
      return;
    }

    const url = (s.previews && s.previews['preview-hq-mp3']) || (s.previews && s.previews['preview-lq-mp3']);
    if (!url) return;

    slSelectedSound = s;
    slPlaying = s.id;
    slCurrentAudio = new Audio(url);
    slCurrentAudio.play().catch(function() {});
    slCurrentAudio.ontimeupdate = function() {
      var fill = document.getElementById('flSlProgressFill');
      var time = document.getElementById('flSlNowTime');
      if (fill && slCurrentAudio) fill.style.width = (slCurrentAudio.currentTime / slCurrentAudio.duration * 100) + '%';
      if (time && slCurrentAudio) time.textContent = slFmtDur(slCurrentAudio.currentTime);
    };
    slCurrentAudio.onended = function() { slPlaying = null; slRenderResults(); };

    // Show now playing bar
    slShowNowPlaying(s);
    slRenderResults();
  }

  function slShowNowPlaying(s) {
    var now = document.getElementById('flSlNow');
    var nameEl = document.getElementById('flSlNowName');
    var userEl = document.getElementById('flSlNowUser');
    var playBtn = document.getElementById('flSlNowPlay');
    if (now) now.style.display = 'flex';
    if (nameEl) nameEl.textContent = s.name;
    if (userEl) userEl.textContent = 'by ' + s.username + ' · ' + slFmtDur(s.duration);
    if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';

    // Show/hide replace button based on target track
    var replaceBtn = document.getElementById('flSlReplaceBtn');
    if (replaceBtn) replaceBtn.style.display = slTargetTrack >= 0 ? 'inline-flex' : 'none';
  }

  function slHideNowPlaying() {
    var now = document.getElementById('flSlNow');
    if (now) now.style.display = 'none';
  }

  function slToggleNowPlay() {
    if (!slCurrentAudio) return;
    var playBtn = document.getElementById('flSlNowPlay');
    if (slCurrentAudio.paused) {
      slCurrentAudio.play();
      if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
      slCurrentAudio.pause();
      if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
  }

  // ============================================================
  // Import: Replace existing track sample OR add as new track
  // ============================================================
  async function slImport(idx) {
    var s = slResults[idx];
    if (!s) return;
    const url = (s.previews && s.previews['preview-hq-mp3']) || (s.previews && s.previews['preview-lq-mp3']);
    if (!url) return;

    // Fetch and decode the audio
    slSetStatus('⏳ Loading "' + s.name + '"...', 'info');
    try {
      const res = await fetch(url);
      const arrayBuf = await res.arrayBuffer();
      var audioCtx = (typeof FL !== "undefined" && FL.audioCtx) ? FL.audioCtx : new (window.AudioContext || window.webkitAudioContext)();
      const audioBuf = await audioCtx.decodeAudioData(arrayBuf);

      if (slTargetTrack >= 0 && typeof FL !== 'undefined' && FL.tracks && FL.tracks[slTargetTrack]) {
        // REPLACE MODE: Replace the sample on the target track
        const track = FL.tracks[slTargetTrack];
        FL.samples[track.id] = audioBuf;
        FL.customSamples = FL.customSamples || {};
        FL.customSamples[track.id] = { buffer: audioBuf, name: s.name, url: url };
        slSetStatus('✅ Replaced "' + track.label + '" with "' + s.name + '"', 'success');
        if (typeof flSaveCustomSamples === 'function') flSaveCustomSamples();
        if (typeof renderFLChannelRack === 'function') renderFLChannelRack();
      } else {
        // ADD MODE: Add as a new track
        const trackId = 'sl_' + s.id;
        if (typeof FL !== 'undefined' && FL.tracks) {
          // Check if already exists
          const exists = FL.tracks.find(function(t) { return t.id === trackId; });
          if (!exists) {
            FL.tracks.push({
              id: trackId,
              label: s.name.substring(0, 20),
              short: 'FS',
              color: '#1ed760'
            });
          }
          FL.samples = FL.samples || {};
          FL.samples[trackId] = audioBuf;
          // Add empty pattern data
          if (FL.patterns && FL.patterns[FL.currPattern]) {
            FL.patterns[FL.currPattern][trackId] = new Array(FL.stepLen).fill(null);
          }
          slSetStatus('✅ Added "' + s.name + '" as new track', 'success');
          if (typeof renderFLChannelRack === 'function') renderFLChannelRack();
          if (typeof renderFLMixer === 'function') renderFLMixer();
        }
      }
    } catch (err) {
      slSetStatus('❌ Failed to load: ' + err.message, 'error');
    }
  }

  // Replace the currently playing sound on the target track
  async function slReplaceCurrent() {
    if (!slSelectedSound) return;
    var idx = slResults.findIndex(function(r) { return r.id === slSelectedSound.id; });
    if (idx >= 0) slImport(idx);
  }

  // Add the currently playing sound as a new track
  async function slAddCurrent() {
    if (!slSelectedSound) return;
    var idx = slResults.findIndex(function(r) { return r.id === slSelectedSound.id; });
    if (idx >= 0) {
      slTargetTrack = -1; // Force add mode
      slImport(idx);
    }
  }

  function slFav(idx) {
    var s = slResults[idx];
    if (!s) return;
    var existing = slFavorites.findIndex(function(f) { return f.id === s.id; });
    if (existing >= 0) {
      slFavorites.splice(existing, 1);
    } else {
      slFavorites.push({ id: s.id, name: s.name, username: s.username, previews: s.previews, duration: s.duration });
    }
    localStorage.setItem(SL_FAVS_STORAGE, JSON.stringify(slFavorites));
    slRenderResults();
  }

  // ============================================================
  // Utility
  // ============================================================
  function slFmtDur(sec) {
    if (!sec && sec !== 0) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ============================================================
  // Init event listeners
  // ============================================================
  function initSoundLibrary() {
    // Close button
    var closeBtn = document.getElementById('flSlCloseBtn');
    if (closeBtn) closeBtn.onclick = closeSoundLibrary;

    // Search
    var searchBtn = document.getElementById('flSlSearchBtn');
    var searchInput = document.getElementById('flSlSearchInput');
    if (searchBtn) searchBtn.onclick = function() { slDoSearch(); };
    if (searchInput) searchInput.onkeydown = function(e) { if (e.key === 'Enter') slDoSearch(); };

    // Favorites
    var favBtn = document.getElementById('flSlFavBtn');
    if (favBtn) favBtn.onclick = function() {
      slResults = slFavorites.map(function(f) {
        return { id: f.id, name: f.name, username: f.username, previews: f.previews, duration: f.duration, tags: [], download_count: 0 };
      });
      slSetStatus('⭐ Favorites (' + slFavorites.length + ')', 'info');
      slRenderResults();
    };

    // Now playing controls
    var nowPlay = document.getElementById('flSlNowPlay');
    var nowReplace = document.getElementById('flSlReplaceBtn');
    var nowAdd = document.getElementById('flSlAddBtn');
    if (nowPlay) nowPlay.onclick = slToggleNowPlay;
    if (nowReplace) nowReplace.onclick = slReplaceCurrent;
    if (nowAdd) nowAdd.onclick = slAddCurrent;

    // Category filters
    document.querySelectorAll('[data-flsl-cat]').forEach(function(btn) {
      btn.onclick = function() {
        document.querySelectorAll('[data-flsl-cat]').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        slCurrentCategory = btn.dataset.flslCat;
        slDoSearch();
      };
    });
  }

  // ============================================================
  // Also enhance the Freesound tab's import to use Sound Library
  // ============================================================
  window.slImportFromFreesound = function(soundUrl, soundName) {
    // Used by the Freesound tab to send a sound to the Sound Library
    slSelectedSound = { id: Date.now(), name: soundName, previews: { 'preview-hq-mp3': soundUrl } };
    slTargetTrack = -1; // Add as new track
    slAddCurrent();
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSoundLibrary);
  } else {
    initSoundLibrary();
  }
})();
