// =========================================
// MATTHOSIFY - AI Music Discovery Engine
// Free AI-Generated Music via YouTube Search
// =========================================

// ---- Verified Free AI Music Collection ----
// Only verified YouTube video IDs from research
// Only verified YouTube video IDs from actual AI music content
// Verified: x8CssaNuXXI (jazz radio), BWtbwlRvTTY (jazz), ikJho5jFOZk (electronic), QMjXM-7F-yk (electronic)
const AI_MUSIC_COLLECTION = {
  jazz: [
    { id: 'x8CssaNuXXI', title: 'AI Soft Jazz Radio', artist: 'AI Jazz Lounge', genre: 'jazz', duration: 600 },
    { id: 'BWtbwlRvTTY', title: 'Astro Jazz Lounge', artist: 'Cosmic AI', genre: 'jazz', duration: 540 },
  ],
  electronic: [
    { id: 'ikJho5jFOZk', title: 'Electronic AI Mix', artist: 'AI Electronica', genre: 'electronic', duration: 600 },
    { id: 'QMjXM-7F-yk', title: 'Swarm DJ AI', artist: 'AI Beats', genre: 'electronic', duration: 480 },
  ],
  lofi: [ // May not all be available - use YouTube Search for more
    { id: 'jfKfPfyJRdk', title: 'Lofi Beats Mix', artist: 'Lofi AI', genre: 'lofi', duration: 600 },
  ],
};

const AI_MUSIC_TOTAL = Object.values(AI_MUSIC_COLLECTION).reduce((sum, arr) => sum + arr.length, 0);

// ---- Bulk Add Curated AI Music ----

function addAIMusicToLibrary(genre = null) {
  let songsToAdd = [];
  
  if (genre && AI_MUSIC_COLLECTION[genre]) {
    songsToAdd = AI_MUSIC_COLLECTION[genre];
  } else {
    Object.values(AI_MUSIC_COLLECTION).forEach(tracks => {
      songsToAdd = songsToAdd.concat(tracks);
    });
  }
  
  const existingIds = new Set(state.songs.filter(s => s.youtubeId).map(s => s.youtubeId));
  const newSongs = songsToAdd.filter(s => !existingIds.includes(s.id));
  
  if (newSongs.length === 0) {
    showToast('✅ These AI songs are already in your library!', 'fa-check');
    return;
  }
  
  newSongs.forEach(songData => {
    addSong({
      id: randomId(),
      title: songData.title + ' (AI)',
      artist: songData.artist,
      album: 'AI Music',
      genre: songData.genre,
      duration: songData.duration,
      audioData: null,
      coverData: `https://img.youtube.com/vi/${songData.id}/mqdefault.jpg`,
      addedAt: Date.now(),
      youtubeId: songData.id,
      fromAI: true,
    });
  });
  
  const label = genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : 'AI Music';
  showToast(`🎵 Added ${newSongs.length} ${label} song${newSongs.length !== 1 ? 's' : ''}!`, 'fa-wand-magic-sparkles');
  
  if (state.currentIndex < 0 && state.songs.length > 0) {
    loadSong(state.songs.length - newSongs.length);
  }
  
  renderAIMusicUI();
}

// ---- Search AI Music on YouTube (requires API key) ----

async function searchAndAddAIMusic(genre = '') {
  const apiKey = state.settings.ytApiKey;
  if (!apiKey) {
    showToast('🔑 Need a YouTube API key! Go to Settings > YouTube to add one.', 'fa-circle-exclamation');
    return;
  }
  
  showToast('🔍 Searching for AI music...', 'fa-search');
  
  const query = genre ? `${genre} AI generated music` : 'AI generated music mix';
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${apiKey}`;
    const r = await fetch(url);
    const data = await r.json();
    
    if (data.error) {
      showToast('YouTube API error: ' + data.error.message, 'fa-circle-exclamation');
      return;
    }
    
    const items = (data.items || []).filter(item => item.id.videoId);
    
    if (items.length === 0) {
      showToast('No AI music found on YouTube. Try a different search!', 'fa-circle-exclamation');
      return;
    }
    
    const existingIds = new Set(state.songs.filter(s => s.youtubeId).map(s => s.youtubeId));
    let addedCount = 0;
    
    items.forEach(item => {
      const videoId = item.id.videoId;
      if (existingIds.has(videoId)) return;
      
      addSong({
        id: randomId(),
        title: item.snippet.title.replace(/\(.*?official.*?\)/gi, '').replace(/\[.*?\]/gi, '').trim() || item.snippet.title,
        artist: item.snippet.channelTitle || 'YouTube',
        album: 'AI Music Discovery',
        genre: genre || 'electronic',
        duration: 180,
        audioData: null,
        coverData: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        addedAt: Date.now(),
        youtubeId: videoId,
        fromAI: true,
      });
      addedCount++;
    });
    
    if (addedCount === 0) {
      showToast('✅ These AI songs are already in your library!', 'fa-check');
      return;
    }
    
    const label = genre ? ` ${genre} ` : ' ';
    showToast(`🎵 Added ${addedCount} AI${label}song${addedCount !== 1 ? 's' : ''} from YouTube!`, 'fa-youtube');
    
    if (state.currentIndex < 0 && state.songs.length > 0) {
      loadSong(state.songs.length - addedCount);
    }
  } catch(e) {
    showToast('Failed to search YouTube. Check your API key.', 'fa-circle-exclamation');
  }
}

// ---- AI Music Radio ----

function playAIMusicRadio(genre = null) {
  let aiSongs = state.songs.filter(s => s.fromAI);
  
  if (genre) {
    aiSongs = aiSongs.filter(s => s.genre === genre);
  }
  
  if (aiSongs.length < 3) {
    // Add more AI songs first
    if (genre && AI_MUSIC_COLLECTION[genre]) {
      addAIMusicToLibrary(genre);
    } else {
      addAIMusicToLibrary();
    }
    aiSongs = state.songs.filter(s => s.fromAI);
    if (genre) aiSongs = aiSongs.filter(s => s.genre === genre);
  }
  
  if (aiSongs.length === 0) {
    showToast('No AI music available. Try searching on YouTube!', 'fa-circle-exclamation');
    return;
  }
  
  const shuffled = [...aiSongs].sort(() => Math.random() - 0.5);
  const firstIdx = state.songs.findIndex(s => s.id === shuffled[0].id);
  if (firstIdx >= 0) loadSong(firstIdx);
  
  const label = genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : 'AI Music';
  showToast(`🎧 ${label} Radio starting...`, 'fa-radio');
}

// ---- AI Music UI Setup ----

function renderAIMusicUI() {
  const aiCount = state.songs.filter(s => s.fromAI).length;
  const status = document.getElementById('aiMusicStatus');
  if (status) {
    status.textContent = aiCount > 0 ? `${aiCount} AI songs in library` : '';
  }
}

function setupAIMusicDiscovery() {
  const homePage = document.getElementById('page-home');
  if (!homePage) return;
  if (document.getElementById('aiMusicDiscoverySection')) return;
  
  const contentSections = homePage.querySelectorAll('.content-section');
  const lastSection = contentSections[contentSections.length - 1];
  if (!lastSection || !lastSection.parentNode) return;
  
  const section = document.createElement('section');
  section.className = 'content-section';
  section.id = 'aiMusicDiscoverySection';
  section.innerHTML = `
    <div class="section-header">
      <h3>🎵 Free AI Music</h3>
      <a href="#" class="show-all" onclick="addAIMusicToLibrary();return false;">+ Add All (${AI_MUSIC_TOTAL})</a>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
      <button class="filter-btn" onclick="addAIMusicToLibrary('lofi')">🎧 Lo-Fi</button>
      <button class="filter-btn" onclick="addAIMusicToLibrary('jazz')">🎷 Jazz</button>
      <button class="filter-btn" onclick="addAIMusicToLibrary('electronic')">⚡ Electronic</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <button class="btn-library-action" onclick="playAIMusicRadio()" 
              style="background:var(--accent-color);color:var(--bg-primary);border:none;">
        <i class="fa-solid fa-radio"></i> AI Radio
      </button>
      <button class="btn-library-action" onclick="searchAndAddAIMusic('')">
        <i class="fa-brands fa-youtube"></i> Search AI on YouTube
      </button>
      <button class="btn-library-action" onclick="searchAndAddAIMusic('lofi')">🔍 Lo-Fi</button>
      <button class="btn-library-action" onclick="searchAndAddAIMusic('jazz')">🔍 Jazz</button>
      <button class="btn-library-action" onclick="searchAndAddAIMusic('electronic')">🔍 Electronic</button>
    </div>
    <div id="aiMusicStatus" style="color:var(--text-secondary);font-size:12px;margin-top:10px;"></div>
  `;
  
  lastSection.parentNode.insertBefore(section, lastSection.nextSibling);
  renderAIMusicUI();
}

// Auto-initialize: patch into setupNewFeatures
window.setupAIMusicDiscovery = setupAIMusicDiscovery;

const _origSNF = window.setupNewFeatures;
if (_origSNF) {
  window.setupNewFeatures = function() {
    _origSNF();
    setTimeout(setupAIMusicDiscovery, 150);
  };
}
