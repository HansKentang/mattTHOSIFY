// ============================================================
// Freesound.org Sound Browser for Matthosify Beat Studio
// ============================================================
(function() {
  'use strict';

  const FS_API = 'https://freesound.org/apiv2';
  const FS_KEY_STORAGE = 'freesound_api_key';
  const FS_FAVS_STORAGE = 'freesound_favorites';
  const FS_PER_PAGE = 20;

  let fsKey = localStorage.getItem(FS_KEY_STORAGE) || '';
  let fsResults = [];
  let fsPage = 1;
  let fsTotalPages = 1;
  let fsCurrentAudio = null;
  let fsPlaying = null;
  let fsFavorites = JSON.parse(localStorage.getItem(FS_FAVS_STORAGE) || '[]');
  let fsCurrentCategory = 'all';

  // Category tag mappings
  const CAT_TAGS = {
    drums: 'tag:kick OR tag:snare OR tag:hihat OR tag:drum OR tag:percussion',
    loops: 'tag:loop',
    fx: 'tag:fx OR tag:effect OR tag:riser OR tag:transition OR tag:sweep',
    instruments: 'tag:piano OR tag:guitar OR tag:bass OR tag:synth OR tag:strings',
    vocals: 'tag:vocal OR tag:voice OR tag:acapella OR tag:beatbox',
    ambient: 'tag:ambient OR tag:atmosphere OR tag:pad OR tag:texture OR tag:nature'
  };

  function initFreesoundBrowser() {
    const keyInput = document.getElementById('fsApiKeyInput');
    const saveBtn = document.getElementById('fsSaveKeyBtn');
    const searchBtn = document.getElementById('fsSearchBtn');
    const searchInput = document.getElementById('fsSearchInput');
    const prevBtn = document.getElementById('fsPrevPage');
    const nextBtn = document.getElementById('fsNextPage');
    const playerPlay = document.getElementById('fsPlayerPlay');
    const playerFav = document.getElementById('fsPlayerFav');
    const playerAdd = document.getElementById('fsPlayerAdd');

    if (saveBtn) saveBtn.onclick = saveApiKey;
    if (keyInput) keyInput.onkeydown = function(e) { if (e.key === 'Enter') saveApiKey(); };
    if (searchBtn) searchBtn.onclick = function() { doSearch(); };
    if (searchInput) searchInput.onkeydown = function(e) { if (e.key === 'Enter') doSearch(); };
    if (prevBtn) prevBtn.onclick = function() { if (fsPage > 1) { fsPage--; doSearch(null, fsPage); } };
    if (nextBtn) nextBtn.onclick = function() { if (fsPage < fsTotalPages) { fsPage++; doSearch(null, fsPage); } };
    if (playerPlay) playerPlay.onclick = togglePlayerPlay;
    if (playerFav) playerFav.onclick = toggleCurrentFav;
    if (playerAdd) playerAdd.onclick = importCurrentSound;

    // Category filter buttons
    document.querySelectorAll('[data-fs-cat]').forEach(function(btn) {
      btn.onclick = function() {
        document.querySelectorAll('[data-fs-cat]').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        fsCurrentCategory = btn.dataset.fsCat;
        fsPage = 1;
        doSearch();
      };
    });

    // Favorites button
    var favBtn = document.querySelector('[data-fs-fav]');
    if (favBtn) favBtn.onclick = showFavorites;

    // Check if key exists
    if (fsKey) {
      showMainUI();
      var bsInput = document.getElementById('fsApiKeyInput');
      if (bsInput) bsInput.value = fsKey;
    }
  }

  function saveApiKey() {
    var input = document.getElementById('fsApiKeyInput');
    var key = input.value.trim();
    if (!key) return;
    fsKey = key;
    localStorage.setItem(FS_KEY_STORAGE, key);
    showMainUI();
    setStatus('✅ Connected to Freesound.org!', 'success');
  }

  function showMainUI() {
    var setup = document.getElementById('fsApiSetup');
    var main = document.getElementById('fsMain');
    if (setup) setup.style.display = 'none';
    if (main) main.style.display = 'block';
  }

  function setStatus(msg, type) {
    var el = document.getElementById('fsStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'fs-status fs-status-' + (type || 'info');
    el.style.display = msg ? 'block' : 'none';
  }

  async function doSearch(query, page) {
    if (!fsKey) { setStatus('⚠️ Please enter your Freesound API key first', 'error'); return; }
    var searchInput = document.getElementById('fsSearchInput');
    var q = query || (searchInput ? searchInput.value.trim() : '');
    if (!q && fsCurrentCategory === 'all') { setStatus('⚠️ Enter a search term', 'error'); return; }

    var pageNum = page || 1;
    setStatus('🔍 Searching...', 'info');

    var filterParts = ['license:"Creative Commons 0"'];
    if (q) filterParts.push(q);
    if (fsCurrentCategory !== 'all' && CAT_TAGS[fsCurrentCategory]) {
      filterParts.push('(' + CAT_TAGS[fsCurrentCategory] + ')');
    }

    var filter = filterParts.join(' ');
    var params = new URLSearchParams({
      query: q || '*',
      filter: filter,
      sort: 'rating_desc',
      fields: 'id,name,username,license,tags,duration,previews,description,download_count',
      page_size: FS_PER_PAGE,
      page: pageNum
    });

    try {
      var res = await fetch(FS_API + '/search/?' + params.toString() + '&token=' + fsKey);
      if (!res.ok) throw new Error('API error: ' + res.status);
      var data = await res.json();

      fsResults = data.results || [];
      fsTotalPages = Math.ceil((data.count || 0) / FS_PER_PAGE);
      fsPage = pageNum;

      setStatus('🎵 Found ' + (data.count || 0) + ' sounds', 'success');
      renderResults();
    } catch (err) {
      setStatus('❌ Search failed: ' + err.message, 'error');
      console.error('Freesound search error:', err);
    }
  }

  function renderResults() {
    var container = document.getElementById('fsResults');
    var pag = document.getElementById('fsPagination');
    var info = document.getElementById('fsPageInfo');
    if (!container) return;

    if (!fsResults.length) {
      container.innerHTML = '<div class="fs-empty"><i class="fa-solid fa-search" style="font-size:48px;color:var(--text-subdued);margin-bottom:12px;"></i><p style="color:var(--text-secondary);">No sounds found</p></div>';
      if (pag) pag.style.display = 'none';
      return;
    }

    container.innerHTML = fsResults.map(function(s, i) {
      var dur = formatDuration(s.duration);
      var tags = (s.tags || []).slice(0, 4).map(function(t) {
        return '<span class="fs-tag">' + escHtml(t) + '</span>';
      }).join('');
      var isFav = fsFavorites.some(function(f) { return f.id === s.id; });
      var isPlaying = fsPlaying === s.id;
      return '<div class="fs-card" data-idx="' + i + '">' +
        '<div class="fs-card-play" onclick="window.FreesoundBrowser.play(' + i + ')">' +
          '<i class="fa-solid fa-' + (isPlaying ? 'pause' : 'play') + '"></i>' +
        '</div>' +
        '<div class="fs-card-info">' +
          '<div class="fs-card-name" title="' + escHtml(s.name) + '">' + escHtml(s.name) + '</div>' +
          '<div class="fs-card-user">by ' + escHtml(s.username) + ' · ' + dur + '</div>' +
          '<div class="fs-card-tags">' + tags + '</div>' +
        '</div>' +
        '<div class="fs-card-actions">' +
          '<button class="fl-btn-sm" onclick="window.FreesoundBrowser.fav(' + i + ')" title="Favorite"><i class="fa-' + (isFav ? 'solid' : 'regular') + ' fa-heart"></i></button>' +
          '<button class="fl-btn-sm" onclick="window.FreesoundBrowser.import(' + i + ')" title="Import to Beat Maker"><i class="fa-solid fa-download"></i></button>' +
        '</div>' +
      '</div>';
    }).join('');

    if (pag) pag.style.display = 'flex';
    if (info) info.textContent = 'Page ' + fsPage + ' of ' + fsTotalPages;
  }

  function play(idx) {
    var s = fsResults[idx];
    if (!s) return;
    if (fsCurrentAudio) {
      fsCurrentAudio.pause();
      fsCurrentAudio = null;
    }
    if (fsPlaying === s.id) {
      fsPlaying = null;
      renderResults();
      return;
    }

    var url = (s.previews && s.previews['preview-hq-mp3']) || (s.previews && s.previews['preview-lq-mp3']);
    if (!url) return;

    fsPlaying = s.id;
    fsCurrentAudio = new Audio(url);
    fsCurrentAudio.play().catch(function(e) { console.warn('Play failed:', e); });
    fsCurrentAudio.ontimeupdate = updatePlayerProgress;
    fsCurrentAudio.onended = function() { fsPlaying = null; renderResults(); };

    // Update player bar
    var player = document.getElementById('fsPlayer');
    var nameEl = document.getElementById('fsPlayerName');
    var userEl = document.getElementById('fsPlayerUser');
    var playBtn = document.getElementById('fsPlayerPlay');
    if (player) player.style.display = 'flex';
    if (nameEl) nameEl.textContent = s.name;
    if (userEl) userEl.textContent = 'by ' + s.username + ' · ' + formatDuration(s.duration);
    if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';

    // Update fav button state
    var favBtn = document.getElementById('fsPlayerFav');
    if (favBtn) {
      var isFav = fsFavorites.some(function(f) { return f.id === s.id; });
      favBtn.innerHTML = isFav
        ? '<i class="fa-solid fa-heart" style="color:var(--accent-color);"></i>'
        : '<i class="fa-regular fa-heart"></i>';
    }

    renderResults();
  }

  function updatePlayerProgress() {
    if (!fsCurrentAudio) return;
    var fill = document.getElementById('fsProgressFill');
    var time = document.getElementById('fsPlayerTime');
    if (fill) fill.style.width = (fsCurrentAudio.currentTime / fsCurrentAudio.duration * 100) + '%';
    if (time) time.textContent = formatDuration(fsCurrentAudio.currentTime);
  }

  function togglePlayerPlay() {
    if (!fsCurrentAudio) return;
    var playBtn = document.getElementById('fsPlayerPlay');
    if (fsCurrentAudio.paused) {
      fsCurrentAudio.play();
      if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
      fsCurrentAudio.pause();
      if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
  }

  function toggleCurrentFav() {
    if (!fsPlaying) return;
    var s = fsResults.find(function(r) { return r.id === fsPlaying; });
    if (!s) return;
    var idx = fsFavorites.findIndex(function(f) { return f.id === s.id; });
    if (idx >= 0) {
      fsFavorites.splice(idx, 1);
      document.getElementById('fsPlayerFav').innerHTML = '<i class="fa-regular fa-heart"></i>';
    } else {
      fsFavorites.push({ id: s.id, name: s.name, username: s.username, previews: s.previews, duration: s.duration });
      document.getElementById('fsPlayerFav').innerHTML = '<i class="fa-solid fa-heart" style="color:var(--accent-color);"></i>';
    }
    localStorage.setItem(FS_FAVS_STORAGE, JSON.stringify(fsFavorites));
    renderResults();
  }

  function fav(idx) {
    var s = fsResults[idx];
    if (!s) return;
    var existing = fsFavorites.findIndex(function(f) { return f.id === s.id; });
    if (existing >= 0) {
      fsFavorites.splice(existing, 1);
    } else {
      fsFavorites.push({ id: s.id, name: s.name, username: s.username, previews: s.previews, duration: s.duration });
    }
    localStorage.setItem(FS_FAVS_STORAGE, JSON.stringify(fsFavorites));
    renderResults();
  }

  async function importSound(idx) {
    var s = fsResults[idx];
    if (!s) return;
    var url = (s.previews && s.previews['preview-hq-mp3']) || (s.previews && s.previews['preview-lq-mp3']);
    if (!url) { setStatus('❌ No preview URL available for this sound', 'error'); return; }

    // If FL Studio is active, add as a new track with this sample
    if (window.FL && window.FL.tracks) {
      var trackId = 'fs_' + s.id;
      // Check if track already exists
      if (!window.FL.tracks.find(function(t) { return t.id === trackId; })) {
        window.FL.tracks.push({
          id: trackId,
          label: s.name.substring(0, 20),
          short: 'FS',
          color: '#1ed760'
        });
        // Add empty pattern data for current pattern BEFORE loading
        if (window.FL.patterns && window.FL.patterns[window.FL.currPattern]) {
          window.FL.patterns[window.FL.currPattern][trackId] = new Array(window.FL.stepLen || 16).fill(null);
        }
        setStatus('⏳ Loading "' + s.name + '"...', 'info');
        
        // Fetch the audio and decode it into an AudioBuffer (required by the beat maker)
        try {
          var res = await fetch(url);
          var arrayBuf = await res.arrayBuffer();
          var ctx = window.FL.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
          var audioBuf = await ctx.decodeAudioData(arrayBuf);
          
          if (!window.FL.samples) window.FL.samples = {};
          window.FL.samples[trackId] = audioBuf;
          
          setStatus('✅ Added "' + s.name + '" to Channel Rack', 'success');
          // Trigger re-render if render function exists
          if (typeof window.renderFLChannelRack === 'function') window.renderFLChannelRack();
          if (typeof window.renderFLMixer === 'function') window.renderFLMixer();
        } catch (err) {
          setStatus('❌ Failed to load audio: ' + err.message, 'error');
          // Clean up track on failure
          var idx2 = window.FL.tracks.findIndex(function(t) { return t.id === trackId; });
          if (idx2 >= 0) window.FL.tracks.splice(idx2, 1);
          if (window.FL.patterns && window.FL.patterns[window.FL.currPattern]) {
            delete window.FL.patterns[window.FL.currPattern][trackId];
          }
        }
      } else {
        setStatus('⚠️ Track already exists', 'info');
      }
    } else {
      setStatus('⚠️ Open Beat Studio first to import sounds', 'error');
    }
  }

  function importCurrentSound() {
    if (!fsPlaying) return;
    var idx = fsResults.findIndex(function(r) { return r.id === fsPlaying; });
    if (idx >= 0) importSound(idx);
  }

  function showFavorites() {
    var container = document.getElementById('fsResults');
    var pag = document.getElementById('fsPagination');
    if (!container) return;

    if (!fsFavorites.length) {
      container.innerHTML = '<div class="fs-empty"><i class="fa-solid fa-heart" style="font-size:48px;color:var(--text-subdued);margin-bottom:12px;"></i><p style="color:var(--text-secondary);">No favorites yet</p><p style="color:var(--text-subdued);font-size:12px;">Click the ❤️ on any sound to save it here</p></div>';
      if (pag) pag.style.display = 'none';
      setStatus('⭐ Your favorites (' + fsFavorites.length + ')', 'info');
      return;
    }

    // Use favorites as results
    fsResults = fsFavorites.map(function(f) {
      return { id: f.id, name: f.name, username: f.username, previews: f.previews, duration: f.duration, tags: [], download_count: 0 };
    });
    container.innerHTML = fsResults.map(function(s, i) {
      var dur = formatDuration(s.duration);
      return '<div class="fs-card" data-idx="' + i + '">' +
        '<div class="fs-card-play" onclick="window.FreesoundBrowser.play(' + i + ')">' +
          '<i class="fa-solid fa-play"></i>' +
        '</div>' +
        '<div class="fs-card-info">' +
          '<div class="fs-card-name" title="' + escHtml(s.name) + '">' + escHtml(s.name) + '</div>' +
          '<div class="fs-card-user">by ' + escHtml(s.username) + ' · ' + dur + '</div>' +
        '</div>' +
        '<div class="fs-card-actions">' +
          '<button class="fl-btn-sm" onclick="window.FreesoundBrowser.fav(' + i + ')" title="Remove from favorites"><i class="fa-solid fa-heart" style="color:var(--accent-color);"></i></button>' +
          '<button class="fl-btn-sm" onclick="window.FreesoundBrowser.import(' + i + ')" title="Import to Beat Maker"><i class="fa-solid fa-download"></i></button>' +
        '</div>' +
      '</div>';
    }).join('');
    if (pag) pag.style.display = 'none';
    setStatus('⭐ Your favorites (' + fsFavorites.length + ')', 'info');
  }

  // Utility functions
  function formatDuration(sec) {
    if (!sec && sec !== 0) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ============================================================
  // Settings Panel Handlers (Settings > Freesound tab)
  // ============================================================
  function initSettingsPanel() {
    var settingsSaveBtn = document.getElementById('saveFsKey');
    var settingsTestBtn = document.getElementById('testFsKey');
    var settingsKeyInput = document.getElementById('settingsFsKey');
    var settingsStatus = document.getElementById('fsKeyStatus');

    if (settingsKeyInput && fsKey) settingsKeyInput.value = fsKey;

    if (settingsKeyInput) {
      settingsKeyInput.onkeydown = function(e) { if (e.key === 'Enter' && settingsSaveBtn) settingsSaveBtn.click(); };
    }

    if (settingsSaveBtn) {
      settingsSaveBtn.onclick = function() {
        var key = settingsKeyInput.value.trim();
        if (!key) {
          if (settingsStatus) { settingsStatus.textContent = 'Enter a key'; settingsStatus.style.color = '#ff5555'; }
          return;
        }
        fsKey = key;
        localStorage.setItem(FS_KEY_STORAGE, key);
        if (settingsStatus) { settingsStatus.textContent = '✅ Key saved!'; settingsStatus.style.color = 'var(--accent-color)'; }
        // Also update Beat Studio panel
        var bsInput = document.getElementById('fsApiKeyInput');
        if (bsInput) bsInput.value = key;
        showMainUI();
      };
    }

    if (settingsTestBtn) {
      settingsTestBtn.onclick = async function() {
        var key = (settingsKeyInput.value || '').trim() || fsKey;
        if (!key) {
          if (settingsStatus) { settingsStatus.textContent = 'Enter a key first'; settingsStatus.style.color = '#ff5555'; }
          return;
        }
        if (settingsStatus) { settingsStatus.textContent = '⏳ Testing...'; settingsStatus.style.color = '#8888ff'; }
        try {
          var res = await fetch(FS_API + '/search/?query=test&page_size=1&fields=id&token=' + key);
          if (res.ok) {
            if (settingsStatus) { settingsStatus.textContent = '✅ API key is valid!'; settingsStatus.style.color = 'var(--accent-color)'; }
          } else {
            if (settingsStatus) { settingsStatus.textContent = '❌ Invalid key (HTTP ' + res.status + ')'; settingsStatus.style.color = '#ff5555'; }
          }
        } catch (err) {
          if (settingsStatus) { settingsStatus.textContent = '❌ Test failed: ' + err.message; settingsStatus.style.color = '#ff5555'; }
        }
      };
    }
  }

  // ============================================================
  // Expose globally for onclick handlers
  // ============================================================
  window.FreesoundBrowser = {
    play: play,
    fav: fav,
    import: importSound
  };

  // ============================================================
  // Auto-init when DOM is ready
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initFreesoundBrowser();
      initSettingsPanel();
    });
  } else {
    initFreesoundBrowser();
    initSettingsPanel();
  }
})();
