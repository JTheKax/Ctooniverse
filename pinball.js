(() => {
  'use strict';

  const canvas = document.getElementById('pinball-canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  const $ = id => document.getElementById(id);
  const scoreEl = $('pinball-score');
  const bestEl = $('pinball-best');
  const ballsEl = $('pinball-balls');
  const messageEl = $('pinball-message');
  const leftButton = $('pinball-left');
  const rightButton = $('pinball-right');
  const launchButton = $('pinball-launch');
  const pauseButton = $('pinball-pause');
  const restartButton = $('pinball-restart');

  const W = canvas.width;
  const H = canvas.height;
  const STEP = 1000 / 60;
  const STORAGE_KEY = 'ctooniverse-pinball-best-v2';
  const ball = { x: 379, y: 606, vx: 0, vy: 0, r: 9 };
  const bumpers = [
    { x: 126, y: 211, r: 31, color: '#ffcb43', points: 100, lastHit: -1000, flash: 0 },
    { x: 271, y: 205, r: 31, color: '#ff66b6', points: 100, lastHit: -1000, flash: 0 },
    { x: 199, y: 318, r: 36, color: '#42e6ff', points: 150, lastHit: -1000, flash: 0 },
    { x: 106, y: 407, r: 24, color: '#9cf75a', points: 50, lastHit: -1000, flash: 0 },
    { x: 299, y: 410, r: 24, color: '#ff9143', points: 50, lastHit: -1000, flash: 0 }
  ];
  const pointerControls = new Map();
  const trail = [];

  let score = 0;
  let best = 0;
  let balls = 3;
  let playing = false;
  let gameOver = false;
  let paused = false;
  let left = false;
  let right = false;
  let leftKey = false;
  let rightKey = false;
  let tick = 0;
  let previousTime = null;
  let accumulated = 0;
  let lastSound = 0;
  let audioContext = null;

  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    best = Number.isFinite(stored) && stored >= 0 ? Math.floor(stored) : 0;
  } catch (_) { /* Local storage can be unavailable in privacy mode. */ }

  function updateHud() {
    scoreEl.textContent = score.toLocaleString();
    bestEl.textContent = best.toLocaleString();
    ballsEl.textContent = String(balls);
    launchButton.disabled = playing;
    launchButton.textContent = gameOver ? 'PLAY AGAIN' : balls === 3 && score === 0 ? 'LAUNCH BALL' : 'NEXT BALL';
    pauseButton.disabled = !playing;
    pauseButton.textContent = paused ? 'RESUME' : 'PAUSE';
    pauseButton.setAttribute('aria-pressed', String(paused));
  }

  function say(text) { messageEl.textContent = text; }

  function parkBall() {
    ball.x = 379;
    ball.y = 607;
    ball.vx = 0;
    ball.vy = 0;
    trail.length = 0;
  }

  function newGame() {
    score = 0;
    balls = 3;
    gameOver = false;
    playing = false;
    paused = false;
    tick = 0;
    for (const bumper of bumpers) { bumper.lastHit = -1000; bumper.flash = 0; }
    parkBall();
    updateHud();
    say('Ready! Press LAUNCH BALL or Space to start.');
  }

  function launch() {
    if (playing) return;
    if (gameOver) newGame();
    playing = true;
    paused = false;
    parkBall();
    ball.vx = -2.5;
    ball.vy = -16;
    updateHud();
    say('Ball in play! Use both flippers to keep it alive.');
    sound(420, 0.09);
  }

  function togglePause() {
    if (!playing) return;
    paused = !paused;
    accumulated = 0;
    previousTime = null;
    updateHud();
    say(paused ? 'Paused. Press RESUME or P to continue.' : 'Back in play!');
  }

  function sound(frequency, duration) {
    // Start audio only after a user gesture. Never prevent gameplay if audio is blocked.
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audioContext) audioContext = new Audio();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      if (audioContext.state !== 'running') return;
      const now = audioContext.currentTime;
      if (now - lastSound < 0.045) return;
      lastSound = now;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(120, frequency * 0.72), now + duration);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.01);
    } catch (_) { /* Sound is optional. */ }
  }

  function addScore(points) {
    score += points;
    if (score > best) {
      best = score;
      try { localStorage.setItem(STORAGE_KEY, String(best)); } catch (_) {}
    }
    updateHud();
  }

  function loseBall() {
    playing = false;
    paused = false;
    balls = Math.max(0, balls - 1);
    parkBall();
    sound(170, 0.16);
    if (balls === 0) {
      gameOver = true;
      say('Game over! Final score: ' + score.toLocaleString() + '. Press PLAY AGAIN for a fresh game.');
    } else {
      say('Ball drained! ' + balls + ' ball' + (balls === 1 ? '' : 's') + ' remaining. Launch the next one!');
    }
    updateHud();
  }

  function bounceBumper(bumper) {
    const dx = ball.x - bumper.x;
    const dy = ball.y - bumper.y;
    const distance = Math.hypot(dx, dy);
    const limit = ball.r + bumper.r;
    if (distance >= limit) return;
    const nx = distance > 0.001 ? dx / distance : 0;
    const ny = distance > 0.001 ? dy / distance : -1;
    ball.x = bumper.x + nx * (limit + 0.5);
    ball.y = bumper.y + ny * (limit + 0.5);
    const closing = ball.vx * nx + ball.vy * ny;
    if (closing >= -0.15) return;
    ball.vx -= 2 * closing * nx;
    ball.vy -= 2 * closing * ny;
    ball.vx += nx * 2.25;
    ball.vy += ny * 2.25;
    if (tick - bumper.lastHit > 12) {
      bumper.lastHit = tick;
      bumper.flash = 10;
      addScore(bumper.points);
      sound(540 + bumper.points * 2, 0.07);
    }
  }

  function nearestPoint(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((ball.x - x1) * dx + (ball.y - y1) * dy) / (dx * dx + dy * dy)));
    return { x: x1 + dx * t, y: y1 + dy * t, t };
  }

  function bumperRail(x1, y1, x2, y2) {
    const p = nearestPoint(x1, y1, x2, y2);
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
    const distance = Math.hypot(dx, dy);
    const radius = ball.r + 7;
    if (distance >= radius) return;
    const nx = distance > 0.001 ? dx / distance : 0;
    const ny = distance > 0.001 ? dy / distance : -1;
    ball.x = p.x + nx * (radius + 0.3);
    ball.y = p.y + ny * (radius + 0.3);
    const closing = ball.vx * nx + ball.vy * ny;
    if (closing < 0) {
      ball.vx -= 1.7 * closing * nx;
      ball.vy -= 1.7 * closing * ny;
    }
  }

  function flipper(isLeft, raised) {
    const x1 = isLeft ? 107 : 313;
    const x2 = isLeft ? 191 : 229;
    const y1 = 580;
    const y2 = raised ? 550 : 591;
    const p = nearestPoint(x1, y1, x2, y2);
    const distance = Math.hypot(ball.x - p.x, ball.y - p.y);
    const radius = ball.r + 10;
    // Only strike the playing side of a flipper. Never teleport a drained ball
    // upward when it passes underneath, which caused unwanted saves/loops.
    if (distance >= radius || ball.y > p.y + 5 || ball.vy < -1) return;
    ball.y = p.y - Math.sqrt(Math.max(0, radius * radius - (ball.x - p.x) ** 2)) - 0.5;
    if (raised) {
      ball.vy = -Math.max(11, Math.min(16, 10 + Math.abs(ball.vy) * 0.5 + p.t * 2));
      ball.vx += (isLeft ? 1 : -1) * (2.2 + p.t * 2);
      sound(310, 0.065);
    } else {
      ball.vy = -Math.max(2.8, Math.abs(ball.vy) * 0.44);
      ball.vx += (isLeft ? 0.7 : -0.7);
    }
  }

  function physicsTick() {
    if (!playing || paused) return;
    tick++;
    for (const bumper of bumpers) bumper.flash = Math.max(0, bumper.flash - 1);
    // Substeps prevent the fast ball from passing through thin flippers.
    for (let part = 0; part < 3; part++) {
      ball.vy += 0.27 / 3;
      ball.x += ball.vx / 3;
      ball.y += ball.vy / 3;
      ball.vx *= 0.9996;
      ball.vy *= 0.9997;

      if (ball.x < 30 + ball.r) { ball.x = 30 + ball.r; ball.vx = Math.abs(ball.vx) * 0.88; }
      if (ball.x > 390 - ball.r) { ball.x = 390 - ball.r; ball.vx = -Math.abs(ball.vx) * 0.88; }
      if (ball.y < 29 + ball.r) { ball.y = 29 + ball.r; ball.vy = Math.abs(ball.vy) * 0.86; }

      for (const bumper of bumpers) bounceBumper(bumper);
      bumperRail(31, 498, 94, 557);
      bumperRail(389, 498, 326, 557);
      flipper(true, left);
      flipper(false, right);

      ball.vx = Math.max(-12, Math.min(12, ball.vx));
      ball.vy = Math.max(-17, Math.min(17, ball.vy));
      if (ball.y > H + ball.r) {
        loseBall();
        return;
      }
    }
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 7) trail.shift();
  }

  function line(x1, y1, x2, y2, color, width) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function draw() {
    const background = ctx.createLinearGradient(0, 0, 0, H);
    background.addColorStop(0, '#312179');
    background.addColorStop(0.55, '#1b175c');
    background.addColorStop(1, '#0a0c2e');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#6250c040';
    ctx.lineWidth = 1;
    for (let y = 30; y < H; y += 36) line(0, y, W, y, '#7466c035', 1);
    for (let x = 20; x < W; x += 36) line(x, 0, x, H, '#7466c025', 1);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(30, 498);
    ctx.lineTo(30, 108);
    ctx.quadraticCurveTo(30, 30, 107, 30);
    ctx.lineTo(313, 30);
    ctx.quadraticCurveTo(390, 30, 390, 108);
    ctx.lineTo(390, 498);
    ctx.strokeStyle = '#ffcf58';
    ctx.lineWidth = 10;
    ctx.shadowColor = '#ffa52b';
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.font = '900 25px system-ui, sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#10103e';
    ctx.strokeText('★ CTOON PINBALL ★', 210, 92);
    ctx.fillStyle = '#ffe465';
    ctx.fillText('★ CTOON PINBALL ★', 210, 92);

    for (const bumper of bumpers) {
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.r + (bumper.flash ? 3 : 0), 0, 2 * Math.PI);
      ctx.shadowColor = bumper.color;
      ctx.shadowBlur = bumper.flash ? 35 : 15;
      ctx.fillStyle = bumper.color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#1b144b';
      ctx.stroke();
      ctx.fillStyle = '#241245';
      ctx.font = '900 23px system-ui, sans-serif';
      ctx.fillText('★', bumper.x, bumper.y + 8);
    }

    line(31, 498, 94, 557, '#101137', 22);
    line(389, 498, 326, 557, '#101137', 22);
    line(31, 498, 94, 557, '#ff9451', 13);
    line(389, 498, 326, 557, '#ff9451', 13);

    const flippers = [
      { startX: 107, endX: 191, pressed: left, color: '#59f1ff' },
      { startX: 313, endX: 229, pressed: right, color: '#ff83dd' }
    ];
    for (const f of flippers) {
      const tipY = f.pressed ? 550 : 591;
      line(f.startX, 580, f.endX, tipY, '#0d1031', 24);
      line(f.startX, 580, f.endX, tipY, f.color, 14);
      ctx.beginPath();
      ctx.arc(f.startX, 580, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe25d';
      ctx.fill();
    }

    ctx.fillStyle = '#b2aeff';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText('HIT THE BUMPERS!', 210, 469);
    ctx.fillStyle = '#fff1b1';
    ctx.fillText('LEFT                      RIGHT', 210, 640);

    // Plunger lane and parked ball remain visible before every launch.
    line(374, 540, 374, 649, '#7e6bca', 3);
    for (let i = 0; i < trail.length; i++) {
      ctx.globalAlpha = (i + 1) / (trail.length * 5);
      ctx.fillStyle = '#93faff';
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, ball.r * (0.5 + i / 15), 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#fff6cd';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (paused || gameOver) {
      ctx.fillStyle = '#0a0926bd';
      ctx.fillRect(32, 275, 356, 112);
      ctx.textAlign = 'center';
      ctx.font = '900 32px system-ui, sans-serif';
      ctx.fillStyle = '#ffe16e';
      ctx.fillText(paused ? 'PAUSED' : 'GAME OVER', 210, 340);
    }
  }

  function frame(now) {
    if (previousTime === null) previousTime = now;
    const delta = Math.min(50, Math.max(0, now - previousTime));
    previousTime = now;
    if (playing && !paused) {
      accumulated += delta;
      let steps = 0;
      while (accumulated >= STEP && steps < 3) {
        physicsTick();
        accumulated -= STEP;
        steps++;
      }
    } else {
      accumulated = 0;
    }
    draw();
    requestAnimationFrame(frame);
  }

  function refreshFlippers() {
    left = leftKey || [...pointerControls.values()].includes('left');
    right = rightKey || [...pointerControls.values()].includes('right');
    leftButton.classList.toggle('is-pressed', left);
    rightButton.classList.toggle('is-pressed', right);
  }

  function bindFlipper(button, side) {
    button.addEventListener('pointerdown', event => {
      if (!event.isPrimary && event.pointerType === 'mouse') return;
      event.preventDefault();
      pointerControls.set('button-' + side + '-' + event.pointerId, side);
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
      refreshFlippers();
    });
    const release = event => {
      pointerControls.delete('button-' + side + '-' + event.pointerId);
      refreshFlippers();
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, release);
  }

  bindFlipper(leftButton, 'left');
  bindFlipper(rightButton, 'right');
  // The playfield itself is a large two-zone touch controller, so mobile users
  // can keep both thumbs on the game rather than reaching below the canvas.
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (!playing) { launch(); return; }
    const bounds = canvas.getBoundingClientRect();
    const side = event.clientX - bounds.left < bounds.width / 2 ? 'left' : 'right';
    pointerControls.set('canvas-' + event.pointerId, side);
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
    refreshFlippers();
  });
  const releaseCanvas = event => {
    pointerControls.delete('canvas-' + event.pointerId);
    refreshFlippers();
  };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, releaseCanvas);

  launchButton.addEventListener('click', launch);
  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', newGame);

  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = document.activeElement?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement?.isContentEditable) return;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyP', 'KeyR'].includes(event.code)) event.preventDefault();
    if (event.code === 'Space' && !event.repeat) launch();
    if (event.code === 'KeyP' && !event.repeat) togglePause();
    if (event.code === 'KeyR' && !event.repeat) newGame();
    if (['ArrowLeft', 'KeyA'].includes(event.code)) leftKey = true;
    if (['ArrowRight', 'KeyD'].includes(event.code)) rightKey = true;
    refreshFlippers();
  });
  window.addEventListener('keyup', event => {
    if (['ArrowLeft', 'KeyA'].includes(event.code)) leftKey = false;
    if (['ArrowRight', 'KeyD'].includes(event.code)) rightKey = false;
    refreshFlippers();
  });

  function releaseInputs() {
    leftKey = false;
    rightKey = false;
    pointerControls.clear();
    refreshFlippers();
  }
  window.addEventListener('blur', releaseInputs);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing && !paused) togglePause();
    if (document.hidden) releaseInputs();
    previousTime = null;
  });

  newGame();
  requestAnimationFrame(frame);
})();
