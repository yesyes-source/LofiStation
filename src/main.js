// ── AUDIO RADIO STREAMS ──
const STATIONS = {
  chillhop: {
    name: "Chillhop Café",
    genre: "Lofi Beats & Hip Hop",
    url: "https://usa9.fastcast4u.com/proxy/jamz?mp=/1",
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
    url: "https://radio.stereoscenic.com/asp-h",
    theme: "ambient",
    accent: "#38bdf8"
  }
};

let activeStation = 'chillhop';
let isPlaying = false;
let radioVolume = 70;
let rainVolume = 40;
let isRainActive = false;
let fireVolume = 40;
let isFireActive = false;

// HTML5 Audio Element for Radio Stream
const radioAudio = new Audio();
radioAudio.crossOrigin = "anonymous";

// ── PROCEDURAL RAIN & FIREPLACE SOUNDS (WEB AUDIO API) ──
let audioCtx = null;
let rainSource = null;
let rainGain = null;
let rainFilter = null;
let rainLfo = null;

let fireSource = null;
let fireGain = null;
let fireFilter = null;
let crackleBuffer = null;
let fireLfo = null;

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

// ── PROCEDURAL FIREPLACE SOUNDS ENGINE ──
function initFireAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  if (fireSource) return;
  
  // 1. Cozy Fire Rumble (Low rumble via pink noise filtering)
  const bufferSize = audioCtx.sampleRate * 2.0;
  const rumbleBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const outputData = rumbleBuffer.getChannelData(0);
  let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Pink noise filter approximation
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    outputData[i] = pink * 0.07; 
  }
  
  fireSource = audioCtx.createBufferSource();
  fireSource.buffer = rumbleBuffer;
  fireSource.loop = true;
  
  fireFilter = audioCtx.createBiquadFilter();
  fireFilter.type = 'lowpass';
  fireFilter.frequency.setValueAtTime(110, audioCtx.currentTime);
  fireFilter.Q.setValueAtTime(1.0, audioCtx.currentTime);
  
  fireGain = audioCtx.createGain();
  updateFireVolumeNode();
  
  fireSource.connect(fireFilter);
  fireFilter.connect(fireGain);
  fireGain.connect(audioCtx.destination);
  
  fireSource.start(0);
  
  // 2. Synthesize Crackle Sound Buffer (a short pop/snap)
  const crackleLength = audioCtx.sampleRate * 0.04;
  crackleBuffer = audioCtx.createBuffer(1, crackleLength, audioCtx.sampleRate);
  const crackleData = crackleBuffer.getChannelData(0);
  for (let i = 0; i < crackleLength; i++) {
    const t = i / crackleLength;
    crackleData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 22);
  }
  
  playCrackle();
  
  // Slow LFO to modulate fire rumble (simulates flickering wood/flames rising and falling)
  fireLfo = setInterval(() => {
    if (audioCtx.state === 'running' && isFireActive) {
      const targetFreq = 95 + Math.random() * 40;
      fireFilter.frequency.exponentialRampToValueAtTime(targetFreq, audioCtx.currentTime + 1.5);
    }
  }, 1800);
}

function playCrackle() {
  if (!isFireActive || !audioCtx || audioCtx.state === 'suspended' || !crackleBuffer) {
    setTimeout(playCrackle, 300);
    return;
  }
  
  const source = audioCtx.createBufferSource();
  source.buffer = crackleBuffer;
  source.playbackRate.value = 0.6 + Math.random() * 0.8;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(1200 + Math.random() * 1800, audioCtx.currentTime);
  
  const gainNode = audioCtx.createGain();
  const baseVol = (fireVolume / 100) * 0.15;
  const snapVol = baseVol * (0.3 + Math.random() * 0.85);
  gainNode.gain.setValueAtTime(snapVol, audioCtx.currentTime);
  
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  source.start(0);
  
  const nextTime = 70 + Math.random() * 550;
  setTimeout(playCrackle, nextTime);
}

function updateFireVolumeNode() {
  if (fireGain && audioCtx) {
    const targetVolume = isFireActive ? (fireVolume / 100) * 0.35 : 0;
    fireGain.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + 0.15);
  }
}

function startFire() {
  isFireActive = true;
  const btn = document.getElementById('btn-toggle-fire');
  if (btn) btn.classList.add('active');
  const slider = document.getElementById('slider-volume-fire');
  if (slider) slider.disabled = false;
  
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  initFireAudio();
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  updateFireVolumeNode();
}

function stopFire() {
  isFireActive = false;
  const btn = document.getElementById('btn-toggle-fire');
  if (btn) btn.classList.remove('active');
  const slider = document.getElementById('slider-volume-fire');
  if (slider) slider.disabled = true;
  updateFireVolumeNode();
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

// Interactive canvas particles & grid warp speed state
let clickParticles = [];
let targetGridSpeed = 1.0;
let currentGridSpeed = 1.0;
let isMouseDownOnCanvas = false;

// Lofi room and nebula state
let isDayMode = false;
let cloudDrift = 0;
let shootingStars = [];
let planets = [];
let nebulas = [];
let steamParticles = [];
let cityWindows = [];

function initSceneData() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // 1. Twinkling Stars Pool
  chillhopStars = [];
  const numStars = activeStation === 'ambient' ? 120 : 60;
  for (let i = 0; i < numStars; i++) {
    chillhopStars.push({
      x: Math.random() * w,
      y: Math.random() * h * (activeStation === 'retrowave' ? 0.65 : 1.0),
      size: Math.random() * 1.5 + 0.4,
      opacity: Math.random(),
      speed: Math.random() * 0.015 + 0.005
    });
  }

  // 2. Rain Drops Pool
  rainDrops = [];
  const numDrops = activeStation === 'chillhop' ? 40 : 120;
  for (let i = 0; i < numDrops; i++) {
    rainDrops.push({
      x: Math.random() * w,
      y: Math.random() * h - h,
      length: Math.random() * 15 + 10,
      speed: Math.random() * 8 + 6,
      opacity: Math.random() * 0.35 + 0.15,
      angle: activeStation === 'chillhop' ? 0 : 0.12
    });
  }

  // 3. Nebula gradients positions
  nebulas = [
    { x: w * 0.3, y: h * 0.35, targetR: w * 0.28, r: w * 0.1, color: 'rgba(139, 92, 246, ALPHA)', scale: 0.08 },
    { x: w * 0.72, y: h * 0.28, targetR: w * 0.32, r: w * 0.15, color: 'rgba(6, 182, 212, ALPHA)', scale: 0.07 },
    { x: w * 0.5, y: h * 0.68, targetR: w * 0.25, r: w * 0.12, color: 'rgba(236, 72, 153, ALPHA)', scale: 0.06 }
  ];

  // 4. Drifting planets
  planets = [
    {
      x: w * 0.15,
      y: h * 0.25,
      r: 32,
      color: '#ef4444',
      speedX: 0.02,
      speedY: 0.005,
      hasRing: false
    },
    {
      x: w * 0.8,
      y: h * 0.45,
      r: 45,
      color: '#fbbf24',
      speedX: 0.01,
      speedY: 0.002,
      hasRing: true,
      ringColor: 'rgba(251, 191, 36, 0.4)'
    }
  ];

  // 5. City windows state
  cityWindows = [];
  for (let i = 0; i < 60; i++) {
    cityWindows.push(Math.random() > 0.4);
  }
}

function initCanvasElements() {
  artCanvas = document.getElementById('art-canvas');
  artCtx = artCanvas.getContext('2d');
  
  rainCanvas = document.getElementById('rain-canvas');
  rainCtx = rainCanvas.getContext('2d');
  
  visualizerCanvas = document.getElementById('visualizer-canvas');
  visualizerCtx = visualizerCanvas.getContext('2d');
  
  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);
  
  // Initialize graphics arrays
  initSceneData();
  
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

function spawnClickParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    clickParticles.push({
      x: x,
      y: y,
      vx: (Math.random() * 2 - 1) * 1.5,
      vy: -Math.random() * 2 - 0.5,
      size: Math.random() * 3 + 1.5,
      alpha: 1,
      color: color,
      decay: Math.random() * 0.015 + 0.01
    });
  }
}

function updateAndDrawClickParticles(ctx) {
  for (let i = clickParticles.length - 1; i >= 0; i--) {
    const p = clickParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) {
      clickParticles.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color.replace('ALPHA', p.alpha);
    ctx.fill();
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
  
  // Update and draw interactive click particles
  updateAndDrawClickParticles(artCtx);
  
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

// Cozy Lofi Room scene: walls, floor, desk, monitor, coffee mug with steam, books, desk lamp and city view windows
function drawChillhopArt(ctx, width, height) {
  // 1. Sky Outside Window (Day vs Night)
  const daySky = ctx.createLinearGradient(0, 0, 0, height);
  daySky.addColorStop(0, '#93c5fd'); 
  daySky.addColorStop(1, '#fed7aa'); 

  const nightSky = ctx.createLinearGradient(0, 0, 0, height);
  nightSky.addColorStop(0, '#060613'); 
  nightSky.addColorStop(1, '#1e1b4b'); 

  ctx.fillStyle = isDayMode ? daySky : nightSky;
  ctx.fillRect(0, 0, width, height);

  // Window coordinates relative to size
  const wWidth = width * 0.32;
  const wHeight = height * 0.44;
  const wY = height * 0.12;
  const leftWindowX = width * 0.12;
  const rightWindowX = width * 0.56;

  // Draw stars and moon (Night) or clouds (Day) outside window
  if (!isDayMode) {
    // Moon
    ctx.fillStyle = 'rgba(254, 240, 138, 0.8)';
    ctx.beginPath();
    ctx.arc(leftWindowX + wWidth * 0.7, wY + wHeight * 0.3, 24, 0, Math.PI * 2);
    ctx.fill();

    // Twinkling stars in window space
    chillhopStars.forEach(s => {
      s.opacity += s.speed;
      if (s.opacity > 1 || s.opacity < 0.1) s.speed *= -1;
      ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
      ctx.fillRect(s.x % wWidth + leftWindowX, s.y % wHeight + wY, 2, 2);
      ctx.fillRect(s.x % wWidth + rightWindowX, s.y % wHeight + wY, 2, 2);
    });
  } else {
    // Drifting Clouds
    cloudDrift += 0.12;
    if (cloudDrift > width) cloudDrift = -200;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    
    const drawCloud = (x, y, r) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.8, y - r * 0.3, r * 1.2, 0, Math.PI * 2);
      ctx.arc(x + r * 1.6, y, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    };
    
    drawCloud(leftWindowX + cloudDrift * 0.6 % wWidth, wY + wHeight * 0.25, 22);
    drawCloud(rightWindowX + (cloudDrift * 0.4 + 100) % wWidth, wY + wHeight * 0.3, 16);
  }

  // Draw City Skyline (silhouette)
  const bColor = isDayMode ? '#1e293b' : '#09070f';
  ctx.fillStyle = bColor;

  const drawSkyline = (windowX, windowW, windowBottomY) => {
    let step = 0;
    const seedOffsets = [45, 90, 135, 180, 225, 270];
    ctx.save();
    ctx.beginPath();
    ctx.rect(windowX, 0, windowW, windowBottomY);
    ctx.clip();

    for (let bx = windowX - 10; bx < windowX + windowW + 40; bx += 40) {
      const hOffset = seedOffsets[step % 6];
      const bHeight = 70 + (hOffset * 0.4) % 90;
      const bY = windowBottomY - bHeight;
      ctx.fillRect(bx, bY, 32, bHeight);

      if (!isDayMode) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
        let wIndex = 0;
        for (let wy = bY + 10; wy < windowBottomY - 10; wy += 14) {
          for (let wx = bx + 5; wx < bx + 28; wx += 12) {
            const lightOn = cityWindows[(wIndex + step * 4) % cityWindows.length];
            if (lightOn) {
              ctx.fillRect(wx, wy, 4, 6);
            }
            wIndex++;
          }
        }
        ctx.fillStyle = '#09070f';
      }
      step++;
    }
    ctx.restore();
  };

  drawSkyline(leftWindowX, wWidth, wY + wHeight);
  drawSkyline(rightWindowX, wWidth, wY + wHeight);

  // Cozy room walls
  const wallColor = isDayMode ? '#ecd5c5' : '#141424';
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, width, wY);
  ctx.fillRect(leftWindowX + wWidth, 0, rightWindowX - (leftWindowX + wWidth), height * 0.6);
  ctx.fillRect(0, 0, leftWindowX, height * 0.6);
  ctx.fillRect(rightWindowX + wWidth, 0, width - (rightWindowX + wWidth), height * 0.6);

  // Floor & Desk
  const deskY = height * 0.56;
  const deskColor = isDayMode ? '#78350f' : '#231828';
  ctx.fillStyle = deskColor;
  ctx.fillRect(0, deskY, width, height - deskY);

  // Desk Border Line
  ctx.strokeStyle = isDayMode ? '#92400e' : '#3c243f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, deskY);
  ctx.lineTo(width, deskY);
  ctx.stroke();

  // Window Frame Outline
  ctx.strokeStyle = isDayMode ? '#451a03' : '#0c0714';
  ctx.lineWidth = 14;
  ctx.strokeRect(leftWindowX, wY, wWidth, wHeight);
  ctx.strokeRect(rightWindowX, wY, wWidth, wHeight);

  // Center divider panes
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(leftWindowX + wWidth / 2, wY);
  ctx.lineTo(leftWindowX + wWidth / 2, wY + wHeight);
  ctx.moveTo(rightWindowX + wWidth / 2, wY);
  ctx.lineTo(rightWindowX + wWidth / 2, wY + wHeight);
  ctx.stroke();

  // Window pane rain streaks
  if (isRainActive) {
    const drawWindowRainStreaks = (winX, winY, winW, winH) => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      const count = 12;
      for (let i = 0; i < count; i++) {
        const offset = (winW / count) * i;
        const streakX = winX + offset;
        const timeFactor = (Date.now() * 0.0008 + i * 4.3) % 1;
        const startY = winY + (winH * 0.1);
        const currentY = startY + (winH * 0.8) * timeFactor;
        
        ctx.beginPath();
        ctx.moveTo(streakX, currentY);
        ctx.lineTo(streakX, currentY + 12);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.arc(streakX, currentY + 13, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawWindowRainStreaks(leftWindowX, wY, wWidth, wHeight);
    drawWindowRainStreaks(rightWindowX, wY, wWidth, wHeight);
  }

  // Draw Desk Lamp (Left side)
  const lampX = width * 0.22;
  const lampY = deskY;
  
  const drawLamp = (x, y) => {
    ctx.fillStyle = isDayMode ? '#475569' : '#0f172a';
    ctx.fillRect(x - 20, y - 6, 40, 6);
    ctx.lineWidth = 4;
    ctx.strokeStyle = isDayMode ? '#475569' : '#0f172a';
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.quadraticCurveTo(x - 30, y - 75, x - 10, y - 110);
    ctx.stroke();
    ctx.fillStyle = isDayMode ? '#dc2626' : '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(x - 10, y - 110, 16, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
  };
  drawLamp(lampX, lampY);

  // Draw Monitor Screen in Center
  const monitorX = width / 2;
  const monitorY = deskY - 10;
  
  const drawMonitor = (x, y) => {
    const bezelW = 160;
    const bezelH = 95;
    const bezelX = x - bezelW / 2;
    const bezelY = y - bezelH - 12;

    ctx.fillStyle = isDayMode ? '#334155' : '#0f172a';
    ctx.fillRect(x - 8, y - 12, 16, 12);
    ctx.fillRect(x - 24, y - 3, 48, 3);
    ctx.fillRect(bezelX, bezelY, bezelW, bezelH);
    ctx.fillStyle = isDayMode ? '#0f172a' : '#020205';
    ctx.fillRect(bezelX + 6, bezelY + 6, bezelW - 12, bezelH - 12);

    ctx.save();
    ctx.beginPath();
    ctx.rect(bezelX + 8, bezelY + 8, bezelW - 16, bezelH - 16);
    ctx.clip();

    const numLines = 6;
    const spacing = 12;
    const now = Date.now();
    const drift = (now * 0.015) % spacing;

    ctx.lineWidth = 3;
    for (let i = 0; i <= numLines; i++) {
      const lineY = (bezelY + 14 + i * spacing) - drift;
      const lineLength = 20 + ((i * 123 + Math.floor(now / 500)) % 60);
      const indent = (i % 3 === 0) ? 14 : 6;
      const colors = ['#22c55e', '#a855f7', '#06b6d4', '#eab308'];
      ctx.strokeStyle = colors[i % colors.length];
      
      ctx.beginPath();
      ctx.moveTo(bezelX + 8 + indent, lineY);
      ctx.lineTo(bezelX + 8 + indent + lineLength, lineY);
      ctx.stroke();
    }
    ctx.restore();
  };
  drawMonitor(monitorX, monitorY);

  // Draw Books stack
  const booksX = width * 0.72;
  const booksY = deskY;
  
  const drawBooksStack = (x, y) => {
    const bookH = 10;
    const colors = ['#dc2626', '#3b82f6', '#10b981', '#f59e0b'];
    ctx.fillStyle = isDayMode ? colors[1] : '#1e3a8a';
    ctx.fillRect(x - 25, y - bookH, 50, bookH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 22, y - bookH + 2, 6, bookH - 4);

    ctx.fillStyle = isDayMode ? colors[3] : '#78350f';
    ctx.fillRect(x - 21, y - bookH * 2, 42, bookH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 18, y - bookH * 2 + 2, 6, bookH - 4);

    ctx.save();
    ctx.translate(x, y - bookH * 2);
    ctx.rotate(-0.15);
    ctx.fillStyle = isDayMode ? colors[2] : '#065f46';
    ctx.fillRect(-18, -bookH, 36, bookH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-15, -bookH + 2, 6, bookH - 4);
    ctx.restore();
  };
  drawBooksStack(booksX, booksY);

  // Draw Coffee Mug & Steam (Right side)
  const mugX = width * 0.62;
  const mugY = deskY - 2;
  
  const drawCoffeeMug = (x, y) => {
    const h = 18;
    const w = 14;
    const mugX = x - w / 2;
    const mugY = y - h;

    ctx.strokeStyle = isDayMode ? '#ea580c' : '#7c2d12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mugX - 2, mugY + h/2, 4, -Math.PI/2, Math.PI/2);
    ctx.stroke();

    ctx.fillStyle = isDayMode ? '#ea580c' : '#7c2d12';
    ctx.fillRect(mugX, mugY, w, h);
    ctx.fillRect(mugX - 1, mugY, w + 2, 2);

    if (Math.random() < 0.05 && steamParticles.length < 8) {
      steamParticles.push({
        x: x + (Math.random() * 4 - 2),
        y: mugY - 4,
        vy: -Math.random() * 0.4 - 0.2,
        opacity: 0.7,
        oscSpeed: Math.random() * 0.05 + 0.02,
        oscPhase: Math.random() * Math.PI
      });
    }

    ctx.lineWidth = 1.2;
    for (let i = steamParticles.length - 1; i >= 0; i--) {
      const p = steamParticles[i];
      p.y += p.vy;
      p.opacity -= 0.007;
      p.oscPhase += p.oscSpeed;

      if (p.opacity <= 0) {
        steamParticles.splice(i, 1);
        continue;
      }

      const waveX = p.x + Math.sin(p.oscPhase) * 3;
      ctx.strokeStyle = `rgba(230, 230, 255, ${p.opacity})`;
      ctx.beginPath();
      ctx.moveTo(waveX, p.y);
      ctx.lineTo(waveX, p.y - 4);
      ctx.stroke();
    }
  };
  drawCoffeeMug(mugX, mugY);

  // Overlay Dark Night Shadow
  if (!isDayMode) {
    ctx.fillStyle = 'rgba(6, 4, 16, 0.58)';
    ctx.fillRect(0, 0, width, height);

    const drawLampGlowCone = (lx, ly) => {
      const lampHeadX = lx - 10;
      const lampHeadY = ly - 110;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(lampHeadX, lampHeadY);
      ctx.lineTo(lampHeadX - 100, ly + 100);
      ctx.lineTo(lampHeadX + 120, ly + 100);
      ctx.closePath();
      
      const lightGrad = ctx.createRadialGradient(
        lampHeadX, lampHeadY, 5, 
        lampHeadX, lampHeadY + 110, 160
      );
      lightGrad.addColorStop(0, 'rgba(253, 224, 71, 0.4)');
      lightGrad.addColorStop(0.3, 'rgba(253, 224, 71, 0.15)');
      lightGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = lightGrad;
      ctx.fill();
      ctx.restore();
    };
    drawLampGlowCone(lampX, lampY);

    const screenGrad = ctx.createRadialGradient(monitorX, monitorY - 80, 20, monitorX, monitorY - 80, 150);
    screenGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
    screenGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = screenGrad;
    ctx.fillRect(monitorX - 160, monitorY - 170, 320, 200);
  }
}

// Retrowave sunset scroll grid with neon scanline sun and starfield in the background
function drawRetrowaveArt(ctx, width, height) {
  // 1. Draw Starfield
  chillhopStars.forEach(s => {
    s.opacity += s.speed;
    if (s.opacity > 1 || s.opacity < 0.15) s.speed *= -1;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * 0.7})`; 
    ctx.fill();
  });

  const horizon = height * 0.65;
  const vanishingX = width / 2;
  const vanishingY = horizon;
  
  // 2. Draw Retro Sun
  const sunRadius = Math.min(width, height) * 0.16;
  const drawRetrowaveSun = (x, y, radius) => {
    ctx.save();
    const glow = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 1.4);
    glow.addColorStop(0, 'rgba(255, 0, 127, 0.35)');
    glow.addColorStop(1, 'rgba(255, 0, 127, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y - 5, radius, 0, Math.PI * 2);
    ctx.clip();

    const sunGrad = ctx.createLinearGradient(x, y - radius, x, y);
    sunGrad.addColorStop(0, '#ff007f'); 
    sunGrad.addColorStop(0.5, '#ff5e00'); 
    sunGrad.addColorStop(1, '#ffbb00'); 
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(x, y - 5, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0d051c'; 
    const baseHeight = 5;
    for (let sy = y - radius; sy < y; sy += 12) {
      const progress = (sy - (y - radius)) / radius;
      if (progress > 0.2) {
        const cutHeight = baseHeight * (progress * 1.8);
        ctx.fillRect(x - radius - 20, sy, radius * 2 + 40, cutHeight);
      }
    }
    ctx.restore();
  };
  drawRetrowaveSun(width / 2, horizon, sunRadius);
  
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
  currentGridSpeed += (targetGridSpeed - currentGridSpeed) * 0.06;
  gridOffset += (isPlaying ? 0.7 : 0.15) * currentGridSpeed;
  if (gridOffset >= 30) {
    gridOffset = gridOffset % 30;
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

// Deep Space Starfield with Drifting Nebulas, Planets and Shooting Stars
function drawAmbientArt(ctx, width, height) {
  // 1. Deep Space Solid Background
  ctx.fillStyle = '#010105';
  ctx.fillRect(0, 0, width, height);

  // 2. Overlapping, drifting Nebulous Dust clouds
  const now = Date.now() * 0.0002;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  
  nebulas.forEach((neb, idx) => {
    const pulseRadius = neb.targetR + Math.sin(now + idx * 2) * 35;
    const driftX = neb.x + Math.sin(now * 0.5 + idx) * 40;
    const driftY = neb.y + Math.cos(now * 0.5 - idx) * 30;

    const radial = ctx.createRadialGradient(
      driftX, driftY, pulseRadius * 0.08,
      driftX, driftY, pulseRadius
    );
    radial.addColorStop(0, neb.color.replace('ALPHA', '0.12'));
    radial.addColorStop(0.5, neb.color.replace('ALPHA', '0.04'));
    radial.addColorStop(1, neb.color.replace('ALPHA', '0'));
    
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(driftX, driftY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 3. Twinkling Stars
  chillhopStars.forEach(s => {
    s.opacity += s.speed;
    if (s.opacity > 1.0 || s.opacity < 0.1) {
      s.speed *= -1;
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * 0.85})`;
    ctx.fill();
  });

  // 4. Planets
  planets.forEach(p => {
    p.x += p.speedX * (isPlaying ? 1.0 : 0.3);
    p.y += p.speedY * (isPlaying ? 1.0 : 0.3);

    if (p.x - p.r > width) {
      p.x = -p.r * 1.5;
    }

    if (p.hasRing) {
      ctx.save();
      ctx.strokeStyle = p.ringColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * 1.8, p.r * 0.35, -0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    const sphereShadow = ctx.createRadialGradient(
      p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.2,
      p.x, p.y, p.r
    );
    sphereShadow.addColorStop(0, 'rgba(255,255,255,0.15)');
    sphereShadow.addColorStop(0.5, 'rgba(0,0,0,0)');
    sphereShadow.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = sphereShadow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    if (p.hasRing) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.x - p.r * 2.2, p.y - 2, p.r * 4.4, p.r * 2);
      ctx.clip();

      ctx.strokeStyle = p.ringColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * 1.8, p.r * 0.35, -0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });

  // 5. Shooting stars
  if (Math.random() < 0.004 && shootingStars.length < 3) {
    shootingStars.push({
      x: Math.random() * width * 0.8,
      y: Math.random() * height * 0.4,
      dx: Math.random() * 8 + 6,
      dy: Math.random() * 4 + 3,
      length: Math.random() * 80 + 50,
      opacity: 1.0,
      width: Math.random() * 2 + 1
    });
  }

  ctx.save();
  shootingStars.forEach((s, idx) => {
    s.x += s.dx * (isPlaying ? 1.0 : 0.3);
    s.y += s.dy * (isPlaying ? 1.0 : 0.3);
    s.opacity -= 0.025;

    if (s.opacity <= 0) {
      shootingStars.splice(idx, 1);
      return;
    }

    const headGrad = ctx.createLinearGradient(s.x, s.y, s.x - s.length, s.y - (s.length * s.dy / s.dx));
    headGrad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
    headGrad.addColorStop(0.3, `rgba(56, 189, 248, ${s.opacity * 0.6})`);
    headGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.strokeStyle = headGrad;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.length, s.y - (s.length * s.dy / s.dx));
    ctx.stroke();
  });
  ctx.restore();
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

// ── ZEN MODE (AUTO-HIDE INTERACTIVE UI) ──
let isZenMode = false;
let zenTimeout = null;

function setZenMode(active) {
  isZenMode = active;
  const btn = document.getElementById('btn-toggle-zen');
  if (btn) {
    btn.classList.toggle('active', active);
  }
  
  if (active) {
    triggerZenCountdown();
  } else {
    clearTimeout(zenTimeout);
    document.body.classList.remove('zen-active');
  }
  localStorage.setItem('lofi_zen_mode', active);
}

function triggerZenCountdown() {
  clearTimeout(zenTimeout);
  if (!isZenMode) return;
  
  document.body.classList.remove('zen-active');
  zenTimeout = setTimeout(() => {
    if (isZenMode) {
      document.body.classList.add('zen-active');
    }
  }, 3500);
}

// ── KEYBOARD SHORTCUTS ──
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'range') return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      const btn = document.getElementById('btn-play-pause');
      if (btn) btn.click();
    } else {
      const key = e.key.toLowerCase();
      if (key === 'z') {
        setZenMode(!isZenMode);
      } else if (key === 'r') {
        const btn = document.getElementById('btn-toggle-rain');
        if (btn) btn.click();
      } else if (key === 'f') {
        const btn = document.getElementById('btn-toggle-fire');
        if (btn) btn.click();
      } else if (key === 'd') {
        const btn = document.getElementById('btn-toggle-daynight');
        if (btn && activeStation === 'chillhop') btn.click();
      } else if (key === '1') {
        switchStation('chillhop');
      } else if (key === '2') {
        switchStation('retrowave');
      } else if (key === '3') {
        switchStation('ambient');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        adjustRadioVolume(5);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        adjustRadioVolume(-5);
      }
    }
  });
}

function adjustRadioVolume(amount) {
  const slider = document.getElementById('slider-volume-radio');
  if (slider) {
    let vol = parseInt(slider.value) + amount;
    vol = Math.max(0, Math.min(100, vol));
    slider.value = vol;
    radioVolume = vol;
    radioAudio.volume = vol / 100;
    const btnMute = document.getElementById('btn-mute-radio');
    if (btnMute) btnMute.classList.toggle('active', radioVolume === 0);
    localStorage.setItem('lofi_volume_radio', radioVolume);
  }
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
      stopFire();
      
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
  const savedFireVol = localStorage.getItem('lofi_volume_fire');
  const savedFireState = localStorage.getItem('lofi_fire_active');
  const savedZenState = localStorage.getItem('lofi_zen_mode');
  const savedDayMode = localStorage.getItem('lofi_day_mode');
  
  if (savedDayMode === 'true') {
    isDayMode = true;
    const btn = document.getElementById('btn-toggle-daynight');
    if (btn) {
      btn.classList.add('active');
      const title = document.getElementById('text-daynight-title');
      const desc = document.getElementById('text-daynight-desc');
      const icon = document.getElementById('icon-daynight');
      if (title) title.textContent = "Day Mode";
      if (desc) desc.textContent = "Switch to night mode";
      if (icon) icon.textContent = "☀️";
    }
  } else {
    isDayMode = false;
    const btn = document.getElementById('btn-toggle-daynight');
    if (btn) {
      btn.classList.remove('active');
      const title = document.getElementById('text-daynight-title');
      const desc = document.getElementById('text-daynight-desc');
      const icon = document.getElementById('icon-daynight');
      if (title) title.textContent = "Night Mode";
      if (desc) desc.textContent = "Switch to day mode";
      if (icon) icon.textContent = "🌙";
    }
  }
  
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

  if (savedFireVol !== null) {
    fireVolume = parseInt(savedFireVol);
    const slider = document.getElementById('slider-volume-fire');
    if (slider) slider.value = fireVolume;
  }
  
  if (savedFireState === 'true') {
    startFire();
  }
  
  if (savedZenState === 'true') {
    setZenMode(true);
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

  // ── FIREPLACE EVENT HANDLERS ──
  const btnToggleFire = document.getElementById('btn-toggle-fire');
  const sliderFire = document.getElementById('slider-volume-fire');
  
  if (btnToggleFire) {
    btnToggleFire.addEventListener('click', () => {
      if (isFireActive) {
        stopFire();
        localStorage.setItem('lofi_fire_active', 'false');
      } else {
        startFire();
        localStorage.setItem('lofi_fire_active', 'true');
      }
    });
  }
  
  if (sliderFire) {
    sliderFire.addEventListener('input', (e) => {
      fireVolume = parseInt(e.target.value);
      updateFireVolumeNode();
      localStorage.setItem('lofi_volume_fire', fireVolume);
    });
  }
  
  // ── ZEN MODE EVENT HANDLERS ──
  const btnToggleZen = document.getElementById('btn-toggle-zen');
  if (btnToggleZen) {
    btnToggleZen.addEventListener('click', () => {
      setZenMode(!isZenMode);
    });
  }

  // ── DAY/NIGHT EVENT HANDLERS ──
  const btnToggleDaynight = document.getElementById('btn-toggle-daynight');
  if (btnToggleDaynight) {
    btnToggleDaynight.addEventListener('click', () => {
      isDayMode = !isDayMode;
      btnToggleDaynight.classList.toggle('active', isDayMode);
      
      const title = document.getElementById('text-daynight-title');
      const desc = document.getElementById('text-daynight-desc');
      const icon = document.getElementById('icon-daynight');
      
      if (title) title.textContent = isDayMode ? "Day Mode" : "Night Mode";
      if (desc) desc.textContent = isDayMode ? "Switch to night mode" : "Switch to day mode";
      if (icon) icon.textContent = isDayMode ? "☀️" : "🌙";
      
      localStorage.setItem('lofi_day_mode', isDayMode);
    });
  }
  
  // Double-click on background art container to toggle Zen Mode
  const bgArt = document.getElementById('bg-art-container');
  if (bgArt) {
    bgArt.addEventListener('dblclick', (e) => {
      if (e.target.closest('button') || e.target.closest('input')) return;
      setZenMode(!isZenMode);
    });
  }
  
  // Reset Zen Mode countdown on mouse move
  window.addEventListener('mousemove', () => {
    if (isZenMode) {
      triggerZenCountdown();
    }
  });
  
  // ── KEYBOARD SHORTCUTS ──
  initKeyboardShortcuts();
  
  // ── INTERACTIVE CANVAS PARTICLES & GRID ACCELERATION ──
  window.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.sidebar') || e.target.closest('.player-panel')) return;
    
    isMouseDownOnCanvas = true;
    
    const colorHex = STATIONS[activeStation].accent;
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);
    const rgbaColor = `rgba(${r}, ${g}, ${b}, ALPHA)`;
    spawnClickParticles(e.clientX, e.clientY, rgbaColor);
    
    if (activeStation === 'retrowave') {
      targetGridSpeed = 4.5;
    }
  });
  
  window.addEventListener('mouseup', () => {
    isMouseDownOnCanvas = false;
    targetGridSpeed = 1.0;
  });
  
  window.addEventListener('mousemove', (e) => {
    if (isMouseDownOnCanvas && activeStation === 'retrowave') {
      targetGridSpeed = 6.0;
    }
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
