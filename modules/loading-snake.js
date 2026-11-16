/* 整合版（25節）— 素材載入視窗裡的貪食蛇（二校二修 V2 #6，使用者 2026-11-13 決定）
 *
 * AFF（network）這種一百多張的工單產圖要跑一陣子，載入視窗（core LoadingOverlay，#assetLoadingOverlay）
 * 顯示「正在載入素材 N / M」而且 M 超過 GAME_MIN_TOTAL 張時，卡片裡多一顆「等待時玩一下（貪食蛇）」按鈕；
 * 按下去在卡片裡開一塊 Canvas 玩貪食蛇（方向鍵／WASD，空白鍵或點畫面重開）。視窗關掉遊戲就停、鍵盤監聽也拆掉。
 * 純前端小遊戲，用 setInterval（分頁在背景時只會變慢不會停），不碰 AppState、不影響產圖。
 */
(function initLoadingSnake() {
  'use strict';

  const GAME_MIN_TOTAL = 30;
  const GRID = 16;
  const CELL = 15;
  const TICK_MS = 130;
  const PROGRESS_RE = /(\d+)\s*\/\s*(\d+)/;

  let overlay = null;
  let button = null;
  let game = null;

  function card() { return overlay?.querySelector('.asset-loading-card') || null; }
  function overlayVisible() { return !!overlay && !overlay.classList.contains('hidden'); }
  function progressTotal() {
    const match = PROGRESS_RE.exec(document.getElementById('assetLoadingText')?.textContent || '');
    return match ? Number(match[2]) : 0;
  }

  // ── 遊戲本體 ──
  function createGame(host) {
    const canvas = document.createElement('canvas');
    canvas.width = GRID * CELL;
    canvas.height = GRID * CELL;
    canvas.className = 'asset-loading-game';
    canvas.setAttribute('aria-label', '貪食蛇：方向鍵或 WASD 控制，空白鍵重新開始');
    canvas.style.cssText = 'display:block;margin:12px auto 0;border-radius:12px;background:#0b1220;border:1px solid rgba(255,255,255,.12);';
    const score = document.createElement('div');
    score.className = 'asset-loading-game-score';
    score.style.cssText = 'margin-top:6px;color:var(--muted,#94a3b8);font-size:12px;text-align:center;';
    host.appendChild(canvas);
    host.appendChild(score);
    const ctx = canvas.getContext('2d');
    const state = { snake: [], dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 }, food: null, points: 0, over: false, timer: 0 };

    function reset() {
      state.snake = [{ x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }];
      state.dir = { x: 1, y: 0 };
      state.nextDir = { x: 1, y: 0 };
      state.points = 0;
      state.over = false;
      placeFood();
      draw();
    }
    function placeFood() {
      const taken = new Set(state.snake.map((cell) => `${cell.x},${cell.y}`));
      let spot;
      do { spot = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; } while (taken.has(`${spot.x},${spot.y}`));
      state.food = spot;
    }
    function step() {
      if (state.over) return;
      state.dir = state.nextDir;
      const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };
      const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
      const hitSelf = state.snake.some((cell) => cell.x === head.x && cell.y === head.y);
      if (hitWall || hitSelf) { state.over = true; draw(); return; }
      state.snake.unshift(head);
      if (head.x === state.food.x && head.y === state.food.y) { state.points += 1; placeFood(); }
      else state.snake.pop();
      draw();
    }
    function draw() {
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff5a1f';
      ctx.fillRect(state.food.x * CELL + 2, state.food.y * CELL + 2, CELL - 4, CELL - 4);
      state.snake.forEach((cell, index) => {
        ctx.fillStyle = index === 0 ? '#60a5fa' : '#3b82f6';
        ctx.fillRect(cell.x * CELL + 1, cell.y * CELL + 1, CELL - 2, CELL - 2);
      });
      if (state.over) {
        ctx.fillStyle = 'rgba(3,7,18,.72)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`結束，${state.points} 分`, canvas.width / 2, canvas.height / 2 - 6);
        ctx.font = '12px sans-serif';
        ctx.fillText('空白鍵或點一下再玩', canvas.width / 2, canvas.height / 2 + 16);
      }
      score.textContent = `分數 ${state.points}　方向鍵／WASD 控制`;
    }
    function turn(x, y) {
      if (x === -state.dir.x && y === -state.dir.y) return; // 不能直接回頭
      state.nextDir = { x, y };
    }
    function onKey(event) {
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
      if (event.key === ' ' || event.key === 'Enter') { if (state.over) reset(); event.preventDefault(); event.stopPropagation(); return; }
      const move = map[event.key];
      if (!move) return;
      // 遊戲中這幾個鍵不交給工具（D 是連動開關、方向鍵會移圖層）
      event.preventDefault();
      event.stopPropagation();
      turn(move[0], move[1]);
    }
    canvas.addEventListener('click', () => { if (state.over) reset(); });
    document.addEventListener('keydown', onKey, true);
    reset();
    state.timer = setInterval(step, TICK_MS);
    return {
      destroy() {
        clearInterval(state.timer);
        document.removeEventListener('keydown', onKey, true);
        canvas.remove();
        score.remove();
      },
    };
  }

  // ── 視窗接線 ──
  function ensureButton() {
    const host = card();
    if (!host) return null;
    if (button && host.contains(button)) return button;
    button = document.createElement('button');
    button.type = 'button';
    button.id = 'assetLoadingGameBtn';
    button.className = 'secondary-btn asset-loading-game-btn';
    button.textContent = BUTTON_LABEL;
    button.style.cssText = 'margin-top:12px;min-height:34px;';
    button.addEventListener('click', () => {
      if (game) { stopGame(); return; }
      game = createGame(host);
      setLabel('收起遊戲');
    });
    host.appendChild(button);
    return button;
  }

  const BUTTON_LABEL = '等待時玩一下（貪食蛇）';
  function setLabel(text) { if (button && button.textContent !== text) button.textContent = text; } // 沒變就不碰 DOM，免得 MutationObserver 一直互相觸發
  function stopGame() {
    if (game) { game.destroy(); game = null; }
    setLabel(BUTTON_LABEL);
  }

  let refreshing = false;
  function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      if (!overlayVisible()) { stopGame(); if (button) button.style.display = 'none'; return; }
      const show = progressTotal() > GAME_MIN_TOTAL;
      const btn = ensureButton();
      if (btn) btn.style.display = show ? '' : 'none';
      if (!show) stopGame();
    } finally { refreshing = false; }
  }

  function attach(node) {
    overlay = node;
    new MutationObserver(refresh).observe(overlay, { attributes: true, attributeFilter: ['class'] });
    const text = document.getElementById('assetLoadingText');
    if (text) new MutationObserver(refresh).observe(text, { childList: true, characterData: true, subtree: true });
    refresh();
  }

  function main() {
    const existing = document.getElementById('assetLoadingOverlay');
    if (existing) { attach(existing); return; }
    const watcher = new MutationObserver(() => {
      const node = document.getElementById('assetLoadingOverlay');
      if (!node) return;
      watcher.disconnect();
      attach(node);
    });
    watcher.observe(document.body, { childList: true });
  }

  window.LoadingSnake = { refresh, get active() { return !!game; }, get button() { return button; }, GAME_MIN_TOTAL };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main, { once: true });
  else main();
})();
