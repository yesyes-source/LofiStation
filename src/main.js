// ── AUDIO RADIO STREAMS ──
const STATIONS = {
  chillhop: {
    name: "Chillhop Café",
    genre: "Lofi Beats & Hip Hop",
    url: "https://stream.lofi.re/live",
    theme: "chillhop",
    accent: "#fbcfe8"
  },
  retrowave: {
    name: "Retrowave Sunset",
    genre: "Synthwave & Outrun",
    url: "https://stream.nightride.fm/nightride.mp3",
    theme: "retrowave",
    accent: "#ff007f"
  },
  ambient: {
    name: "Ambient Nebula",
    genre: "Deep Space Soundscapes",
    url: "https://stream.nightride.fm/ambient.mp3",
    theme: "ambient",
    accent: "#38bdf8"
  }
};

let activeStation = 'chillhop';
let isPlaying = false;
let radioVolume = 70;
let rainVolume = 40;
let isRainActive = false;

// HTML5 Audio Element for Radio Stream
const radioAudio = new Audio();
radioAudio.crossOrigin = "anonymous";

// ── PROCEDURAL RAIN SOUNDS (WEB AUDIO API) ──
let audioCtx = null;
let rainSource = null;
let rainGain = null;
let rainFilter = null;
let rainLfo = null;

function initRainAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create noise buffer (2 seconds of white noise)
  const bufferSize = audioCtx.sampleRate * 2.0;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const outputData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    outputData[i] = Math.random() * 2 - 1;
  }
  
  // Set up audio nodes
  rainSource = audioCtx.createBufferSource();
  rainSource.buffer = noiseBuffer;
  rainSource.loop = true;
  
  // Low-pass filter to make white noise sound like rain
  rainFilter = audioCtx.createBiquadFilter();
  rainFilter.type = 'lowpass';
  rainFilter.frequency.setValueAtTime(650, audioCtx.currentTime);
  rainFilter.Q.setValueAtTime(0.6, audioCtx.currentTime);
  
  rainGain = audioCtx.createGain();
  updateRainVolumeNode();
  
  // Connect nodes
  rainSource.connect(rainFilter);
  rainFilter.connect(rainGain);
  rainGain.connect(audioCtx.destination);
  
  rainSource.start(0);

  // Slow LFO to modulate rain filter (creates natural wind gusts / rain intensity shifts)
  let currentFreq = 650;
  rainLfo = setInterval(() => {
    if (audioCtx.state === 'running' && isRainActive) {
      currentFreq = 580 + Math.random() * 160;
      const now = audioCtx.currentTime;
      rainFilter.frequency.exponentialRampToValueAtTime(currentFreq, now + 2.0);
    }
  }, 2200);
}

function updateRainVolumeNode() {
  if (rainGain && audioCtx) {
    // If rain is active, set gain scaled by slider volume, else 0
    const targetVolume = isRainActive ? (rainVolume / 100) * 0.12 : 0;
    rainGain.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + 0.15);
  }
}

function startRain() {
  isRainActive = true;
  document.getElementById('btn-toggle-rain').classList.add('active');
  document.getElementById('slider-volume-rain').disabled = false;
  
  if (!audioCtx) {
    initRainAudio();
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  updateRainVolumeNode();
}

function stopRain() {
  isRainActive = false;
  document.getElementById('btn-toggle-rain').classList.remove('active');
  document.getElementById('slider-volume-rain').disabled = true;
  updateRainVolumeNode();
}

// ── PLAYBACK CONTROLS ──
function playRadio() {
  isPlaying = true;
  
  // Update button UI
  const btn = document.getElementById('btn-play-pause');
  btn.classList.remove('paused');
  btn.classList.add('playing');
  btn.innerHTML = `<svg class="play-svg-icon" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
  
  document.getElementById('now-playing-status').textContent = "Connecting to live broadcast...";
  
  // Load and play live Icecast stream (fresh connection avoids background buffering lag)
  radioAudio.src = STATIONS[activeStation].url;
  radioAudio.volume = radioVolume / 100;
  
  radioAudio.play()
    .then(() => {
      document.getElementById('now-playing-status').textContent = "Live Audio Stream Online";
    })
    .catch(err => {
      console.error("Audio playback error:", err);
      document.getElementById('now-playing-status').textContent = "Stream offline, retrying...";
    });
    
  if (isRainActive && audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function pauseRadio() {
  isPlaying = false;
  
  // Update button UI
  const btn = document.getElementById('btn-play-pause');
  btn.classList.remove('playing');
  btn.classList.add('paused');
  btn.innerHTML = `<svg class="play-svg-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  
  document.getElementById('now-playing-status').textContent = "Stream paused";
  
  // Clear audio source to stop network downloads in the background!
  radioAudio.pause();
  radioAudio.src = "";
  radioAudio.load();
}

function switchStation(stationKey) {
  activeStation = stationKey;
  
  // UI updates
  document.querySelectorAll('.station-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-station') === stationKey);
  });
  
  const station = STATIONS[stationKey];
  document.getElementById('now-playing-title').textContent = station.name;
  
  // Theme styling overrides
  const container = document.getElementById('bg-art-container');
  container.className = 'bg-art-container theme-' + station.theme;
  
  // CSS Custom variable changes for accent glow colors
  document.documentElement.style.setProperty('--accent-current', station.accent);
  document.documentElement.style.setProperty('--glow-current', `0 0 15px ${station.accent}66`);
  
  // Toggle station specific layers
  document.getElementById('neon-sunset').style.display = (stationKey === 'retrowave') ? 'flex' : 'none';
  document.getElementById('cozy-window-glow').style.display = (stationKey === 'chillhop') ? 'block' : 'none';
  document.getElementById('crt-overlay').style.display = (stationKey === 'retrowave') ? 'block' : 'none';
  
  // Persist station choice
  localStorage.setItem('lofi_station_active', stationKey);
  
  // Reset arrays for canvas drawings
  chillhopStars = [];
  ambientNebula = [];
  
  // Relaunch stream if playing
  if (isPlaying) {
    playRadio();
  } else {
    document.getElementById('now-playing-status').textContent = "Ready to tune in";
  }
}

// ── ART ANIMATION CANVAS LOOPS ──
let artCanvas, artCtx;
let rainCanvas, rainCtx;
let visualizerCanvas, visualizerCtx;

// Arrays for graphics
let chillhopStars = [];
let ambientNebula = [];
let rainDrops = [];
let gridOffset = 0;

function initCanvasElements() {
  artCanvas = document.getElementById('art-canvas');
  artCtx = artCanvas.getContext('2d');
  
  rainCanvas = document.getElementById('rain-canvas');
  rainCtx = rainCanvas.getContext('2d');
  
  visualizerCanvas = document.getElementById('visualizer-canvas');
  visualizerCtx = visualizerCanvas.getContext('2d');
  
  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);
  
  // Create rain particle pool
  for (let i = 0; i < 75; i++) {
    rainDrops.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight - window.innerHeight,
      length: Math.random() * 15 + 10,
      speed: Math.random() * 6 + 4,
      opacity: Math.random() * 0.4 + 0.1
    });
  }
  
  requestAnimationFrame(animationLoop);
}

function resizeCanvases() {
  if (artCanvas) {
    artCanvas.width = window.innerWidth;
    artCanvas.height = window.innerHeight;
  }
  if (rainCanvas) {
    rainCanvas.width = window.innerWidth;
    rainCanvas.height = window.innerHeight;
  }
  if (visualizerCanvas) {
    const parent = visualizerCanvas.parentElement;
    visualizerCanvas.width = parent.clientWidth;
    visualizerCanvas.height = parent.clientHeight;
  }
}

function animationLoop() {
  // 1. Draw Active Station Background Artwork
  artCtx.clearRect(0, 0, artCanvas.width, artCanvas.height);
  if (activeStation === 'chillhop') {
    drawChillhopArt(artCtx, artCanvas.width, artCanvas.height);
  } else if (activeStation === 'retrowave') {
    drawRetrowaveArt(artCtx, artCanvas.width, artCanvas.height);
  } else if (activeStation === 'ambient') {
    drawAmbientArt(artCtx, artCanvas.width, artCanvas.height);
  }
  
  // 2. Draw Rain Particle Overlay
  rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
  if (isRainActive) {
    drawRainOverlay(rainCtx, rainCanvas.width, rainCanvas.height);
  }
  
  // 3. Draw Audio Visualizer Waves
  drawVisualizer(visualizerCtx, visualizerCanvas.width, visualizerCanvas.height);
  
  requestAnimationFrame(animationLoop);
}

// ── ART DRAWING FUNCTIONS ──

// Chillhop Cafe Background: Starry Sky Twinkling
function drawChillhopArt(ctx, width, height) {
  if (chillhopStars.length === 0) {
    for (let i = 0; i < 40; i++) {
      chillhopStars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.55,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random(),
        speed: Math.random() * 0.015 + 0.005
      });
    }
  }
  
  chillhopStars.forEach(s => {
    s.opacity += s.speed;
    if (s.opacity > 1 || s.opacity < 0.15) {
      s.speed *= -1;
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251, 207, 232, ${s.opacity * 0.45})`; 
    ctx.fill();
  });
}

// Retrowave sunset scroll grid
function drawRetrowaveArt(ctx, width, height) {
  const horizon = height * 0.65;
  const vanishingX = width / 2;
  const vanishingY = horizon;
  
  // 3D perspective lines
  ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
  ctx.lineWidth = 1.5;
  
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(width, horizon);
  ctx.stroke();
  
  const lineCount = 22;
  for (let i = 0; i <= lineCount; i++) {
    const bottomX = (width / lineCount) * i;
    ctx.beginPath();
    ctx.moveTo(vanishingX, vanishingY);
    ctx.lineTo(bottomX, height);
    ctx.stroke();
  }
  
  // Infinite grid horizontal lines
  gridOffset += isPlaying ? 0.7 : 0.15; // slow down if paused
  if (gridOffset >= 30) {
    gridOffset = 0;
  }
  
  for (let y = 0; y < 14; y++) {
    const progress = (y + gridOffset / 30) / 14;
    const lineY = horizon + Math.pow(progress, 2.2) * (height - horizon);
    
    ctx.strokeStyle = `rgba(255, 0, 127, ${0.12 + progress * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(width, lineY);
    ctx.stroke();
  }
}

// Deep Space Starfield
function drawAmbientArt(ctx, width, height) {
  if (ambientNebula.length === 0) {
    for (let i = 0; i < 70; i++) {
      ambientNebula.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.4,
        speedX: Math.random() * 0.1 - 0.05,
        speedY: Math.random() * 0.08 + 0.02,
        opacity: Math.random() * 0.8 + 0.2
      });
    }
  }
  
  ambientNebula.forEach(s => {
    s.x += s.speedX * (isPlaying ? 1.0 : 0.3);
    s.y += s.speedY * (isPlaying ? 1.0 : 0.3);
    
    if (s.y > height) {
      s.y = -5;
      s.x = Math.random() * width;
    }
    
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(56, 189, 248, ${s.opacity * 0.6})`;
    ctx.fill();
  });
}

// ── RAIN VIDEO OVERLAY ──
function drawRainOverlay(ctx, width, height) {
  ctx.strokeStyle = 'rgba(174, 219, 242, 0.4)';
  ctx.lineWidth = 1.2;
  
  rainDrops.forEach(drop => {
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x + (drop.speed * 0.15), drop.y + drop.length);
    ctx.stroke();
    
    // Update position
    drop.y += drop.speed * (isRainActive ? 1.0 : 0);
    drop.x += (drop.speed * 0.15) * (isRainActive ? 1.0 : 0);
    
    if (drop.y > height) {
      // Draw splash ripple
      ctx.beginPath();
      ctx.ellipse(drop.x, height - 2, 6, 2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(174, 219, 242, ${drop.opacity * 0.4})`;
      ctx.stroke();
      
      // Reset drop to top
      drop.y = Math.random() * -50 - 20;
      drop.x = Math.random() * width;
    }
  });
}

// ── DUAL SINE WAVE VISUALIZER ──
let visPhase = 0;
function drawVisualizer(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  
  if (!isPlaying) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    return;
  }
  
  visPhase += 0.07;
  const currentAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent-current').trim();
  const volumeMultiplier = radioVolume / 100;
  
  // Wave 1: Accent color glow wave
  ctx.strokeStyle = currentAccent;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const angle = (x / width) * Math.PI * 4 + visPhase;
    // Bell curve amplitude scaling so waves stay zeroed on edges
    const envelope = Math.sin((x / width) * Math.PI);
    const y = height / 2 + Math.sin(angle) * (height * 0.35) * envelope * volumeMultiplier;
    
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  
  // Wave 2: Subtle white transparent overlay
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const angle = (x / width) * Math.PI * 6 - visPhase * 0.7;
    const envelope = Math.sin((x / width) * Math.PI);
    const y = height / 2 + Math.cos(angle) * (height * 0.2) * envelope * volumeMultiplier;
    
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// ── SLEEP TIMER TIMER SYSTEM ──
let sleepTimer = null;
let sleepTimeRemaining = 0; // minutes

function setSleepTimer(minutes) {
  clearInterval(sleepTimer);
  sleepTimer = null;
  
  document.querySelectorAll('.timer-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-time')) === minutes);
  });
  
  if (minutes === 0) {
    document.getElementById('timer-status').textContent = "";
    return;
  }
  
  sleepTimeRemaining = minutes * 60; // to seconds
  updateTimerStatusUI();
  
  sleepTimer = setInterval(() => {
    if (sleepTimeRemaining > 0) {
      sleepTimeRemaining--;
      if (sleepTimeRemaining % 60 === 0 || sleepTimeRemaining < 60) {
        updateTimerStatusUI();
      }
    } else {
      handleSleepTimerEnd();
    }
  }, 1000);
}

function updateTimerStatusUI() {
  const min = Math.ceil(sleepTimeRemaining / 60);
  document.getElementById('timer-status').textContent = `App closes in ${min} min`;
}

function handleSleepTimerEnd() {
  clearInterval(sleepTimer);
  sleepTimer = null;
  document.getElementById('timer-status').textContent = "Timer finished";
  
  // Fade out music volume smoothly
  let fadeInterval = setInterval(() => {
    if (radioVolume > 5) {
      radioVolume -= 5;
      document.getElementById('slider-volume-radio').value = radioVolume;
      radioAudio.volume = radioVolume / 100;
    } else {
      clearInterval(fadeInterval);
      pauseRadio();
      stopRain();
      
      // Attempt to close Tauri window
      try {
        const tauri = window.__TAURI__;
        if (tauri && tauri.window) {
          tauri.window.getCurrentWindow().close();
        }
      } catch(e){}
    }
  }, 150);
}

// ── LOAD STATE PERSISTENCE ──
function initSettings() {
  const savedStation = localStorage.getItem('lofi_station_active');
  const savedRadioVol = localStorage.getItem('lofi_volume_radio');
  const savedRainVol = localStorage.getItem('lofi_volume_rain');
  const savedRainState = localStorage.getItem('lofi_rain_active');
  
  if (savedRadioVol !== null) {
    radioVolume = parseInt(savedRadioVol);
    document.getElementById('slider-volume-radio').value = radioVolume;
    radioAudio.volume = radioVolume / 100;
  }
  
  if (savedRainVol !== null) {
    rainVolume = parseInt(savedRainVol);
    document.getElementById('slider-volume-rain').value = rainVolume;
  }
  
  if (savedRainState === 'true') {
    startRain();
  }
  
  if (savedStation) {
    switchStation(savedStation);
  } else {
    switchStation('chillhop');
  }
}

// ── DOM EVENT HANDLERS ──
window.addEventListener("DOMContentLoaded", () => {
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnMuteRadio = document.getElementById('btn-mute-radio');
  const btnToggleRain = document.getElementById('btn-toggle-rain');
  const sliderRadio = document.getElementById('slider-volume-radio');
  const sliderRain = document.getElementById('slider-volume-rain');

  // Load Saved Preferences
  initSettings();
  
  // Start particle canvases
  initCanvasElements();
  
  // Main Playback toggle
  btnPlayPause.addEventListener('click', () => {
    if (isPlaying) {
      pauseRadio();
    } else {
      playRadio();
    }
  });
  
  // Mute Radio toggle button
  let prevRadioVolume = radioVolume;
  btnMuteRadio.addEventListener('click', () => {
    if (radioVolume > 0) {
      prevRadioVolume = radioVolume;
      radioVolume = 0;
      btnMuteRadio.classList.add('active');
    } else {
      radioVolume = prevRadioVolume > 0 ? prevRadioVolume : 70;
      btnMuteRadio.classList.remove('active');
    }
    sliderRadio.value = radioVolume;
    radioAudio.volume = radioVolume / 100;
    localStorage.setItem('lofi_volume_radio', radioVolume);
  });
  
  // Toggle Rain Audio Layer button
  btnToggleRain.addEventListener('click', () => {
    if (isRainActive) {
      stopRain();
      localStorage.setItem('lofi_rain_active', 'false');
    } else {
      startRain();
      localStorage.setItem('lofi_rain_active', 'true');
    }
  });

  // Radio volume slider change
  sliderRadio.addEventListener('input', (e) => {
    radioVolume = parseInt(e.target.value);
    radioAudio.volume = radioVolume / 100;
    btnMuteRadio.classList.toggle('active', radioVolume === 0);
    localStorage.setItem('lofi_volume_radio', radioVolume);
  });

  // Rain volume slider change
  sliderRain.addEventListener('input', (e) => {
    rainVolume = parseInt(e.target.value);
    updateRainVolumeNode();
    localStorage.setItem('lofi_volume_rain', rainVolume);
  });

  // Station card clicks
  document.querySelectorAll('.station-card').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-station');
      if (target !== activeStation) {
        switchStation(target);
      }
    });
  });

  // Sleep Timer click handlers
  document.querySelectorAll('.timer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.getAttribute('data-time'));
      setSleepTimer(mins);
    });
  });
});
