const { createCanvas, loadImage } = require('@napi-rs/canvas');
const axios = require('axios');

const COLORS = {
  bg1: '#0d0d1a',
  bg2: '#1a1a2e',
  bg3: '#16213e',
  accent: '#ff6b9d',
  accent2: '#c94b9b',
  purple: '#7b68ee',
  purple2: '#5a4fcf',
  gold: '#ffd700',
  text: '#ffffff',
  subtext: '#a0a0c0',
  xpBar: '#2a2a4a',
  xpFill: '#ff6b9d',
  border: '#ff6b9d',
};

function formatNumber(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function getXpRequired(level) {
  return Math.floor(100 * Math.pow(1.35, level - 1));
}

function xpToNextLevel(currentXp, level) {
  const required = getXpRequired(level);
  return { current: currentXp % required, required };
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateEconomyProfile(ecoData, userObj, rank) {
  const W = 900, H = 320;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, COLORS.bg1);
  bgGrad.addColorStop(0.5, COLORS.bg2);
  bgGrad.addColorStop(1, COLORS.bg3);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const gridSize = 40;
  ctx.strokeStyle = 'rgba(255,107,157,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, W, H);

  const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
  accentGrad.addColorStop(0, COLORS.accent);
  accentGrad.addColorStop(1, COLORS.purple);
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, W, 5);

  const avatarSize = 130;
  const avatarX = 40, avatarY = H / 2 - avatarSize / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  try {
    const avatarURL = userObj.displayAvatarURL({ extension: 'png', size: 256 });
    const avatarBuf = await axios.get(avatarURL, { responseType: 'arraybuffer', timeout: 5000 });
    const avatarImg = await loadImage(Buffer.from(avatarBuf.data));
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    ctx.fillStyle = COLORS.purple;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const infoX = avatarX + avatarSize + 30;

  ctx.font = 'bold 28px Sans';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(userObj.displayName || userObj.username, infoX, 70);

  ctx.font = '16px Sans';
  ctx.fillStyle = COLORS.subtext;
  ctx.fillText(`@${userObj.username}`, infoX, 95);

  const rankX = W - 200;
  ctx.font = 'bold 14px Sans';
  ctx.fillStyle = COLORS.accent;
  ctx.fillText(`RANK`, rankX, 55);
  ctx.font = 'bold 42px Sans';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`#${rank || '?'}`, rankX, 98);

  const level = ecoData.level || 1;
  const prestige = ecoData.prestige || 0;
  const { current: xpCurrent, required: xpRequired } = xpToNextLevel(ecoData.xp || 0, level);

  const levelBadgeX = infoX, levelBadgeY = 108;
  drawRoundedRect(ctx, levelBadgeX, levelBadgeY, 90, 28, 14);
  const lvlGrad = ctx.createLinearGradient(levelBadgeX, 0, levelBadgeX + 90, 0);
  lvlGrad.addColorStop(0, COLORS.accent);
  lvlGrad.addColorStop(1, COLORS.purple);
  ctx.fillStyle = lvlGrad;
  ctx.fill();
  ctx.font = 'bold 14px Sans';
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.fillText(`LVL ${level}`, levelBadgeX + 45, levelBadgeY + 18);
  ctx.textAlign = 'left';

  if (prestige > 0) {
    const prestigeBadgeX = levelBadgeX + 100, prestigeBadgeY = 108;
    drawRoundedRect(ctx, prestigeBadgeX, prestigeBadgeY, 110, 28, 14);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.font = 'bold 13px Sans';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(`✦ P${prestige}`, prestigeBadgeX + 55, prestigeBadgeY + 18);
    ctx.textAlign = 'left';
  }

  const xpBarX = infoX, xpBarY = 150, xpBarW = rankX - infoX - 20, xpBarH = 18;
  drawRoundedRect(ctx, xpBarX, xpBarY, xpBarW, xpBarH, 9);
  ctx.fillStyle = COLORS.xpBar;
  ctx.fill();

  const xpPct = Math.min(xpCurrent / xpRequired, 1);
  if (xpPct > 0) {
    drawRoundedRect(ctx, xpBarX, xpBarY, xpBarW * xpPct, xpBarH, 9);
    const xpGrad = ctx.createLinearGradient(xpBarX, 0, xpBarX + xpBarW, 0);
    xpGrad.addColorStop(0, COLORS.accent);
    xpGrad.addColorStop(1, COLORS.purple);
    ctx.fillStyle = xpGrad;
    ctx.fill();
  }

  ctx.font = '12px Sans';
  ctx.fillStyle = COLORS.subtext;
  ctx.fillText(`${formatNumber(xpCurrent)} / ${formatNumber(xpRequired)} XP`, xpBarX, xpBarY + 32);

  const statY = 205;
  const statW = (rankX - infoX - 20) / 2 - 5;

  drawRoundedRect(ctx, infoX, statY, statW, 75, 10);
  ctx.fillStyle = 'rgba(255,107,157,0.1)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,107,157,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '13px Sans';
  ctx.fillStyle = COLORS.subtext;
  ctx.fillText('🪙 WALLET', infoX + 12, statY + 22);
  ctx.font = 'bold 22px Sans';
  ctx.fillStyle = COLORS.accent;
  ctx.fillText(formatNumber(ecoData.wallet || 0), infoX + 12, statY + 50);

  const stat2X = infoX + statW + 10;
  drawRoundedRect(ctx, stat2X, statY, statW, 75, 10);
  ctx.fillStyle = 'rgba(123,104,238,0.1)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(123,104,238,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '13px Sans';
  ctx.fillStyle = COLORS.subtext;
  ctx.fillText('🏦 BANK', stat2X + 12, statY + 22);
  ctx.font = 'bold 22px Sans';
  ctx.fillStyle = COLORS.purple;
  ctx.fillText(formatNumber(ecoData.bank || 0), stat2X + 12, statY + 50);

  ctx.font = '12px Sans';
  ctx.fillStyle = COLORS.subtext;
  ctx.fillText('✨ Developed by AkiForver', 20, H - 12);
  ctx.textAlign = 'right';
  ctx.fillText('Chill Economy', W - 20, H - 12);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

function getEcoData(client, userId) {
  const row = client.db.economy ? client.db.economy.get(userId) : null;
  if (!row) {
    return {
      userId, wallet: 0, bank: 0, xp: 0, level: 1, prestige: 0,
      lastDaily: null, lastWork: null, lastRob: null, lastCrime: null,
      lastFish: null, lastMine: null, lastHunt: null, lastBeg: null,
      lastWeekly: null, lastMonthly: null, totalEarned: 0, badges: [],
      lastSpinWheel: null, lastBankRob: null, lastBoss: null,
      lastCollect: null, lastDungeon: null, lastExplore: null,
      lastSalary: null, pet: null, questData: null,
      dailyStreak: 0, weeklyStreak: 0, totalLost: 0, upgrades: {}
    };
  }
  return row;
}

function saveEcoData(client, userId, data) {
  if (client.db.economy) client.db.economy.set(userId, data);
}

function addCoins(client, userId, amount, type = 'wallet') {
  const eco = getEcoData(client, userId);
  eco[type] = (eco[type] || 0) + amount;
  if (type === 'wallet') eco.totalEarned = (eco.totalEarned || 0) + amount;
  saveEcoData(client, userId, eco);
  return eco;
}

function removeCoins(client, userId, amount, type = 'wallet') {
  const eco = getEcoData(client, userId);
  eco[type] = Math.max(0, (eco[type] || 0) - amount);
  saveEcoData(client, userId, eco);
  return eco;
}

function addXp(client, userId, amount) {
  const eco = getEcoData(client, userId);
  eco.xp = (eco.xp || 0) + amount;
  const required = getXpRequired(eco.level || 1);
  let leveled = false;
  if (eco.xp >= required) {
    eco.level = (eco.level || 1) + 1;
    leveled = true;
  }
  saveEcoData(client, userId, eco);
  return { eco, leveled };
}

function getCooldown(lastTime, cooldownMs) {
  if (!lastTime) return 0;
  const diff = Date.now() - new Date(lastTime).getTime();
  return Math.max(0, cooldownMs - diff);
}

function formatCooldown(ms) {
  if (ms <= 0) return 'Ready!';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function getLeaderboard(client, type = 'wallet', guildId = null) {
  if (!client.db.economy) return [];
  const all = client.db.economy.getAll();
  return all.sort((a, b) => (b[type] || 0) - (a[type] || 0)).slice(0, 10);
}

const WHEEL_PRIZES = [
  { label: '💎 Diamond',  coins: 5000  },
  { label: '⭐ Star',     coins: 2500  },
  { label: '🔔 Bell',    coins: 1500  },
  { label: '🍇 Grapes',  coins: 1000  },
  { label: '🎁 Gift',    coins: 750   },
  { label: '💰 Bag',     coins: 500   },
  { label: '🍒 Cherry',  coins: 300   },
  { label: '🍋 Lemon',   coins: 150   },
  { label: '💥 Bust',    coins: 0     },
  { label: '💥 Bust',    coins: 0     },
];

module.exports = {
  generateEconomyProfile,
  getEcoData,
  saveEcoData,
  addCoins,
  removeCoins,
  addXp,
  getCooldown,
  formatCooldown,
  getLeaderboard,
  formatNumber,
  getXpRequired,
  WHEEL_PRIZES,
};
