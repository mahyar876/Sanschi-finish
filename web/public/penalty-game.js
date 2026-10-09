/* ════════════════════════════════════════
   UTILITIES
════════════════════════════════════════ */
const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const $ = (id) => document.getElementById(id);
const rand = (a, b) => Math.random() * (b - a) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ════════════════════════════════════════
   DIFFICULTY CONFIGS
   منطق واقعی:
   - keeper قبل از شوت نمی‌داند کجا می‌روی
   - بر اساس سختی، احتمال "حدس درست" دارد
   - اگر حدس درست نزد → دایو کاملاً اشتباه
   - حتی اگه درست رفت، بر اساس سختی و zone دفع می‌کنه
════════════════════════════════════════ */
/** کالیبره‌شده: ~۲۰٪ / ~۱۰٪ / ~۵٪ احتمال ۵ گل از ۵ شوت (شبیه‌سازی) */
const DIFF_CFG = {
  easy: {
    label: 'آسان',
    pillClass: 'pill-easy',
    reactionMs: 280,
    guessChance: 0.25,
    saveIfAligned: 1,
    centerBonus: 0,
    luckyBlock: 0.02,
    alwaysSaveWhenAligned: true,
  },
  medium: {
    label: 'متوسط',
    pillClass: 'pill-medium',
    reactionMs: 150,
    guessChance: 0.5,
    saveIfAligned: 0.71,
    centerBonus: 0.08,
    luckyBlock: 0.055,
    alwaysSaveWhenAligned: false,
  },
  hard: {
    label: 'سخت',
    pillClass: 'pill-hard',
    reactionMs: 70,
    guessChance: 0.73,
    saveIfAligned: 0.69,
    centerBonus: 0.1,
    luckyBlock: 0.18,
    topSaveBonus: 0.05,
    antiPattern: true,
    alwaysSaveWhenAligned: false,
  },
};

const PENALTY_CONFIG_KEY = 'sanschi_penalty_config';
const DEFAULT_PENALTY_REWARDS = {
  easy: { discountPercent: 5, discountFixedCap: 700000, minGoals: 5 },
  medium: { discountPercent: 5, discountFixedCap: 1000000, minGoals: 5 },
  hard: { discountPercent: 5, discountFixedCap: 1500000, minGoals: 5 },
};

/*
  ZONE LAYOUT (از دید بازیکن جلوی دروازه):
  [0] بالا-چپ   [1] بالا-وسط   [2] بالا-راست
  [3] پایین-چپ  [4] پایین-وسط  [5] پایین-راست

  مختصات توپ در دروازه (% از عرض و ارتفاع goalEl):
  x: از چپ, y: از بالا
*/
const ZONE_POS = {
  0: { x: 13, y: 18 },
  1: { x: 50, y: 18 },
  2: { x: 87, y: 18 },
  3: { x: 13, y: 74 },
  4: { x: 50, y: 74 },
  5: { x: 87, y: 74 },
};

/*
  برای هر zone، دروازه‌بان باید به کدام سمت بره تا بتونه دفع کنه:
  - 'left'  = keeper به چپ (zone‌های سمت چپ از دید ضربه‌زننده = راست دروازه)
  - 'right' = keeper به راست (zone‌های سمت راست از دید ضربه‌زننده)
  - 'center-up' = keeper بالا می‌پره (وسط بالا)
  - 'center-down' = keeper وسط می‌مونه (وسط پایین)
*/
const ZONE_KEEPER = {
  0: 'left-up',
  1: 'center-up',
  2: 'right-up',
  3: 'left',
  4: 'center',
  5: 'right',
};

/* کلاس CSS دایو keeper برای هر جهت */
const DIVE_CLASS = {
  left: 'dive-left',
  'left-up': 'dive-left-up',
  right: 'dive-right',
  'right-up': 'dive-right-up',
  'center-up': 'dive-up',
  center: 'stand-center',
};

/* جهت‌های رندم که keeper می‌تونه بره وقتی حدس نمی‌زنه */
const ALL_DIRS = [
  'left',
  'left-up',
  'right',
  'right-up',
  'center-up',
  'center',
];

/** zone مقصد هر جهت دایو (برای هم‌ترازی انیمیشن با ۶ خانه) */
const DIR_TARGET_ZONE = {
  'left-up': 0,
  'center-up': 1,
  'right-up': 2,
  left: 3,
  center: 4,
  right: 5,
};

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
const MAX = 5;
let diff = 'easy',
  cfg = DIFF_CFG.easy;
let shots = 0,
  goals = 0,
  misses = 0;
let busy = false;
let shotLog = []; // تاریخچه zone‌های زده‌شده

/* ════════════════════════════════════════
   DOM REFS
════════════════════════════════════════ */
const ballEl = $('ball');
const shadowEl = $('shadow');
const keeperEl = $('keeper');
const keeperWrap = $('keeperWrap');
const goalEl = $('goal');
const fieldEl = $('field');
const aimEl = $('aim');
const instrEl = $('instr');
const msgOv = $('msgOv');
const finalOv = $('finalOv');
const diffScr = $('diffScreen');
const sfEl = $('saveFlash');
const pwWrap = $('powerWrap');
const pwFill = $('powerFill');
let pwTimer = null;

/* ════════════════════════════════════════
   DIFFICULTY
════════════════════════════════════════ */
function openDiffScreen() {
  finalOv.classList.remove('show');
  diffScr.classList.remove('hidden');
  resetState(false);
}

function startGame(d) {
  diff = d;
  cfg = DIFF_CFG[d];
  const pill = $('diffPill');
  pill.textContent = cfg.label;
  pill.className = 'diff-pill ' + cfg.pillClass;
  diffScr.classList.add('hidden');
  resetState(true);
}

function loadPenaltyRewards() {
  try {
    const raw = localStorage.getItem(PENALTY_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_PENALTY_REWARDS };
    const parsed = JSON.parse(raw);
    return {
      easy: { ...DEFAULT_PENALTY_REWARDS.easy, ...parsed.easy },
      medium: { ...DEFAULT_PENALTY_REWARDS.medium, ...parsed.medium },
      hard: { ...DEFAULT_PENALTY_REWARDS.hard, ...parsed.hard },
    };
  } catch (e) {
    return { ...DEFAULT_PENALTY_REWARDS };
  }
}

/* ════════════════════════════════════════
   RESET
════════════════════════════════════════ */
function resetState(full) {
  shots = goals = misses = 0;
  shotLog = [];
  busy = false;
  if (full) {
    updateScore();
    for (let i = 0; i < MAX; i++) {
      const d = $('d' + i);
      if (d) d.className = 'sdot';
    }
    resetBall();
    resetKeeper();
    msgOv.classList.remove('show');
    sfEl.classList.remove('show');
    instrEl.style.display = '';
    enableZones();
    /* keeper idle sway */
    keeperEl.className = 'keeper idle';
  }
}

/* ════════════════════════════════════════
   KEEPER AI — قلب بازی
   منطق:
   1. بر اساس cfg.guessChance تصمیم می‌گیره آیا جهت درست رو حدس بزنه
   2. در hard با antiPattern، اگه دو zone یکسان پشت سر هم اومد → اون zone رو "می‌خونه"
   3. اگه جهت اشتباه رفت → فقط cfg.luckyBlock شانس دفع دارد
   4. اگه جهت درست رفت → cfg.saveIfAligned (+ centerBonus برای وسط)
════════════════════════════════════════ */
function pickWrongDir(correctDir) {
  const wrong = ALL_DIRS.filter((d) => d !== correctDir);
  return pick(wrong);
}

function computeAction(z) {
  const correctDir = ZONE_KEEPER[z];
  let chosenDir;
  let guessChance = cfg.guessChance;

  if (cfg.antiPattern && shotLog.length >= 2) {
    const last = shotLog[shotLog.length - 1];
    const prev = shotLog[shotLog.length - 2];
    if (last === z && prev === z) guessChance = Math.min(0.9, guessChance + 0.16);
    else if (last === z) guessChance = Math.min(0.82, guessChance + 0.08);
  }

  chosenDir =
    Math.random() < guessChance ? correctDir : pickWrongDir(correctDir);

  const aligned = chosenDir === correctDir;

  if (aligned && cfg.alwaysSaveWhenAligned) {
    return { dir: chosenDir, saved: true };
  }

  let saveP = 0;
  if (aligned) {
    saveP = cfg.saveIfAligned;
    if (z === 1 || z === 4) saveP += cfg.centerBonus;
    if (diff === 'hard' && (z === 0 || z === 1 || z === 2)) {
      saveP += cfg.topSaveBonus || 0;
    }
    if (diff === 'medium' && (z === 0 || z === 2)) saveP -= 0.03;
  } else {
    saveP = cfg.luckyBlock;
  }

  saveP = Math.max(0, Math.min(0.93, saveP));
  return { dir: chosenDir, saved: Math.random() < saveP };
}

/* ════════════════════════════════════════
   SHOOT
════════════════════════════════════════ */
document.getElementById('shotZones').addEventListener('click', function (e) {
  if (busy || shots >= MAX) return;
  const sz = e.target.closest('.sz');
  if (!sz) return;
  instrEl.style.display = 'none';
  aimEl.classList.remove('show');
  disableZones();
  shoot(parseInt(sz.dataset.z));
});

function shoot(z) {
  busy = true;
  shots++;
  shotLog.push(z);
  updateScore();

  /* محاسبه نتیجه (keeper هنوز نمی‌داند) */
  const action = computeAction(z);

  /* بال شروع می‌کنه */
  animBall(z);

  const isTop = z === 0 || z === 1 || z === 2;
  const reactMs = isTop
    ? Math.max(40, cfg.reactionMs - 35)
    : cfg.reactionMs;

  const diveDir = ZONE_KEEPER[z];

  /* keeper بعد از تأخیر — همیشه به سمت zone شوت (۶ جهت واضح) */
  setTimeout(() => {
    animKeeper(diveDir, z);
  }, reactMs);

  /* نتیجه هم‌زمان با رسیدن توپ */
  setTimeout(() => {
    applyResult(z, action.saved, diveDir);
  }, 620);

  /* ریست و ادامه */
  setTimeout(() => {
    msgOv.classList.remove('show');
    sfEl.classList.remove('show');
    resetBall();
    resetKeeper();
    if (shots >= MAX) {
      setTimeout(showFinal, 350);
    } else {
      busy = false;
      enableZones();
    }
  }, 2200);
}

/* ════════════════════════════════════════
   BALL ANIMATION — طبیعی‌ترین حرکت ممکن
   - از نقطه پنالتی (پایین میانه field) به سمت zone
   - کوچک‌تر میشه (perspective)
   - می‌چرخه
════════════════════════════════════════ */
let ballAnimFrame = null;

function animBall(z) {
  const gr = goalEl.getBoundingClientRect();
  const fr = fieldEl.getBoundingClientRect();
  const t = ZONE_POS[z];

  const destX = gr.left - fr.left + (gr.width * t.x) / 100;
  const destY = gr.top - fr.top + (gr.height * t.y) / 100;
  const startX = fr.width / 2;
  const startY = fr.height * 0.74;
  const dx = destX - startX;
  const startBot = fr.height - startY;
  const destBot = fr.height - destY;

  const durMs = 640;
  const spin = (Math.random() < 0.5 ? 1 : -1) * Math.floor(rand(420, 900));
  const isTop = z === 0 || z === 1 || z === 2;
  const arcHeight = isTop ? rand(6, 14) : rand(18, 32);

  fieldEl.classList.add('field-kick');
  setTimeout(() => fieldEl.classList.remove('field-kick'), 480);

  ballEl.classList.add('shoot', 'flight');
  ballEl.style.width = '30px';
  ballEl.style.height = '30px';
  shadowEl.classList.add('moving');

  if (ballAnimFrame) cancelAnimationFrame(ballAnimFrame);
  const t0 = performance.now();

  function frame(now) {
    const p = Math.min(1, (now - t0) / durMs);
    const ease = 1 - Math.pow(1 - p, 2.6);
    const arc = Math.sin(p * Math.PI) * arcHeight;
    const currentDx = dx * ease;
    const currentBot = startBot + (destBot - startBot) * ease + arc;
    const scale = 1 - p * 0.48;
    const rot = spin * ease;

    ballEl.style.left = 'calc(50% + ' + currentDx + 'px)';
    ballEl.style.bottom = currentBot + 'px';
    ballEl.style.transform =
      'translateX(-50%) scale(' + scale + ') rotate(' + rot + 'deg)';

    const shadowScale = Math.max(0.35, 1 - p * 0.65);
    shadowEl.style.left = 'calc(50% + ' + currentDx * 0.92 + 'px)';
    shadowEl.style.bottom = startBot + (destBot - startBot) * ease * 0.85 + 'px';
    shadowEl.style.transform =
      'translateX(-50%) scale(' + shadowScale + ', 0.65)';
    shadowEl.style.opacity = String(Math.max(0.15, 0.55 - p * 0.4));

    if (p < 1) {
      ballAnimFrame = requestAnimationFrame(frame);
    } else {
      ballAnimFrame = null;
    }
  }

  ballAnimFrame = requestAnimationFrame(frame);
}

/* ════════════════════════════════════════
   KEEPER ANIMATION (Web Animations — پرش واقعی)
════════════════════════════════════════ */
const DIVE_DUR = { easy: 420, medium: 320, hard: 240 };
let keeperAnims = [];

function keeperDiveMotion(dir, shotZone) {
  const gh = goalEl.getBoundingClientRect().height || 140;
  const gw = goalEl.getBoundingClientRect().width || 300;
  const keeperH = keeperEl.getBoundingClientRect().height || 56;
  const tz = DIR_TARGET_ZONE[dir] ?? shotZone;
  const pos = ZONE_POS[tz];

  const highDir =
    dir === 'center-up' || dir === 'left-up' || dir === 'right-up';

  /* مرکز zone نسبت به وسط دروازه (keeper از پایین-وسط شروع می‌کند) */
  const x = ((pos.x - 50) / 100) * gw * 0.94;
  const zoneFromBottom = ((100 - pos.y) / 100) * gh;
  /* سر داخل چهارچوب بماند (بالای دروازه clip نشود) */
  const maxRise = Math.max(8, gh - keeperH - 10);
  let rise = zoneFromBottom - keeperH * 0.38;
  rise = Math.max(tz >= 3 ? 2 : 8, Math.min(maxRise, rise));

  let rot = 0;
  if (dir === 'left' || dir === 'left-up') rot = tz <= 2 ? 22 : 28;
  else if (dir === 'right' || dir === 'right-up') rot = tz <= 2 ? -22 : -28;
  else if (dir === 'center') rot = 4;

  const rad = Math.abs(rot) * (Math.PI / 180);
  /* چرخش دور پایین سر را پایین می‌کشد — جبران برای ماندن داخل دروازه */
  const tiltLift = Math.round(keeperH * (1 - Math.cos(rad)));

  return {
    x: Math.round(x),
    rise: Math.round(rise),
    rot,
    tiltLift,
    high: highDir,
  };
}

function animKeeper(dir, zone) {
  stopKeeperAnims();
  keeperEl.classList.remove('idle');
  keeperEl.classList.add('diving');
  keeperEl.classList.remove('leap-high');

  const motion = keeperDiveMotion(dir, zone);
  if (motion.high) keeperEl.classList.add('leap-high');

  const dur = DIVE_DUR[diff];
  const ease = 'cubic-bezier(0.12, 0.9, 0.2, 1)';

  keeperWrap.style.bottom = '4px';
  keeperWrap.style.transform = 'translate(0px, 0px)';
  keeperEl.style.transform = 'translateY(0px) rotate(0deg) scale(1)';

  keeperAnims.push(
    keeperWrap.animate(
      [
        { transform: 'translate(0px, 0px)' },
        {
          transform: `translate(${motion.x}px, ${-motion.rise}px)`,
        },
      ],
      { duration: dur, fill: 'forwards', easing: ease },
    ),
  );

  const scale = motion.high ? 1.06 : 1;
  const lift = motion.tiltLift || 0;
  keeperAnims.push(
    keeperEl.animate(
      [
        { transform: 'translateY(0px) rotate(0deg) scale(1)' },
        {
          transform: `translateY(${-lift}px) rotate(${motion.rot}deg) scale(${scale})`,
        },
      ],
      { duration: dur, fill: 'forwards', easing: ease },
    ),
  );
}

function stopKeeperAnims() {
  keeperAnims.forEach((a) => {
    try {
      a.cancel();
    } catch (e) {}
  });
  keeperAnims = [];
}

function resetKeeper() {
  stopKeeperAnims();
  keeperWrap.style.bottom = '4px';
  keeperWrap.style.transform = 'translate(0px, 0px)';
  keeperEl.style.transform = '';
  keeperEl.classList.remove('diving', 'leap-high');
  for (const c of Object.values(DIVE_CLASS)) keeperEl.classList.remove(c);
  void keeperEl.offsetWidth;
  keeperEl.classList.add('idle');
}

/* ════════════════════════════════════════
   RESULT
════════════════════════════════════════ */
function applyResult(z, saved, keeperDir) {
  const isTop = z === 0 || z === 1 || z === 2;
  const keeperHigh =
    keeperDir === 'center-up' || keeperDir === 'left-up' || keeperDir === 'right-up';

  if (saved) {
    misses++;
    sfEl.classList.add('show');
    let title = 'دفع شد';
    let sub = 'دروازه‌بان به توپ رسید.';
    if (isTop && keeperHigh) {
      sub = 'پرید بالا و توپ را گرفت.';
    } else if (isTop && !keeperHigh) {
      sub = 'توپ بالا بود؛ با reflex دفع شد.';
    } else if (!isTop && keeperHigh) {
      sub = 'مسیر را اشتباه خواند ولی توپ را نگه داشت.';
    }
    showMsg('save', '', title, sub);
    markDot(shots - 1, 'sd');
    goalEl.classList.remove('flash');
  } else {
    goals++;
    goalEl.classList.add('flash');
    fieldEl.classList.add('field-goal-shake');
    setTimeout(() => fieldEl.classList.remove('field-goal-shake'), 380);
    setTimeout(() => goalEl.classList.remove('flash'), 500);

    const titles = {
      0: 'گل — گوشه بالا چپ',
      1: 'گل — بالای دروازه',
      2: 'گل — گوشه بالا راست',
      3: 'گل — پایین چپ',
      4: 'گل — وسط پایین',
      5: 'گل — پایین راست',
    };
    let sub = 'توپ داخل دروازه است.';
    if (isTop && !keeperHigh) {
      sub = 'شوت به ارتفاع بالا رفت؛ دروازه‌بان به موقع نرسید.';
    } else if (isTop && keeperHigh) {
      sub = 'دروازه‌بان جهت را درست رفت ولی دیر بود.';
    } else if (!isTop && keeperHigh) {
      sub = 'کیپر به سمت بالا رفت؛ توپ زمین خورد.';
    }
    showMsg('goal', '', titles[z] || 'گل', sub);
    markDot(shots - 1, 'gd');
  }
  updateScore();
}

/* ════════════════════════════════════════
   DISCOUNT CODE SYSTEM
════════════════════════════════════════ */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function generateCode(discountPct) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rnd = '';
  for (let i = 0; i < 6; i++)
    rnd += chars[Math.floor(Math.random() * chars.length)];
  return 'SNS' + discountPct + '-' + rnd;
}

function saveDiscount(code, pct, maxAmount) {
  const key = 'sanschi_discounts';
  let store = {};
  try {
    store = JSON.parse(localStorage.getItem(key) || '{}');
  } catch (e) {}
  store[code] = { pct, maxAmount, used: false, exp: Date.now() + WEEK_MS };
  localStorage.setItem(key, JSON.stringify(store));
}

async function issuePenaltyDiscountFromServer(rule) {
  try {
    const res = await fetch('/api/discounts/penalty-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ difficulty: diff, goalsScored: goals }),
    });
    const data = await res.json();
    if (data.success && data.code) {
      return {
        code: data.code,
        pct: data.percent != null ? data.percent : rule.discountPercent,
        maxAmount:
          data.maxDiscountAmount != null
            ? data.maxDiscountAmount
            : rule.discountFixedCap,
      };
    }
  } catch (e) {}
  return null;
}

async function renderPenaltyDiscountBox(rule, discountBox) {
  discountBox.innerHTML =
    '<div style="font-size:12px;color:var(--muted)">در حال صدور کد تخفیف…</div>';
  discountBox.style.display = 'block';

  let code;
  let pct = rule.discountPercent;
  let maxAmount = rule.discountFixedCap;
  const fromServer = await issuePenaltyDiscountFromServer(rule);
  if (fromServer) {
    code = fromServer.code;
    pct = fromServer.pct;
    maxAmount = fromServer.maxAmount;
  } else {
    code = generateCode(pct);
  }
  saveDiscount(code, pct, maxAmount);

  const expDate = new Date(Date.now() + WEEK_MS);
  const expStr = expDate.toLocaleDateString('fa-IR');
  const maxStr = fa(maxAmount.toLocaleString('en-US'));

  discountBox.innerHTML =
    '<div style="font-size:13px;color:var(--body);margin-bottom:8px">کد تخفیف رزرو</div>' +
    '<div class="discount-code-val" id="discCodeVal">' +
    code +
    '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:6px;line-height:1.6">در پرداخت وارد کنید · تا ' +
    expStr +
    ' — ' +
    fa(pct) +
    '٪ تخفیف · سقف ' +
    maxStr +
    ' تومان</div>' +
    '<button onclick="copyDiscCode()" style="margin-top:10px;padding:7px 18px;background:var(--green);color:#04100a;border:none;border-radius:8px;font-family:\'Vazirmatn\',sans-serif;font-size:12px;font-weight:700;cursor:pointer">کپی کد</button>';
}

/* ════════════════════════════════════════
   FINAL SCREEN
════════════════════════════════════════ */
function showFinal() {
  const pct = goals / MAX;
  let emoji, title, sub;
  if (pct === 1.0) {
    emoji = '🏆';
    title = 'پنج از پنج — افسانه!';
    sub = `${fa(goals)} گل کامل! حرفه‌ای واقعی هستی.`;
  } else if (pct >= 0.8) {
    emoji = '🌟';
    title = 'عالی بودی!';
    sub = `${fa(goals)} از ${fa(MAX)} گل — تقریباً بی‌نقص!`;
  } else if (pct >= 0.6) {
    emoji = '👏';
    title = 'خوب بود!';
    sub = `${fa(goals)} از ${fa(MAX)} گل — ادامه بده!`;
  } else if (pct >= 0.4) {
    emoji = '😅';
    title = 'تمرین لازمه!';
    sub = `${fa(goals)} از ${fa(MAX)} گل — میشه بهتر کرد`;
  } else if (pct > 0) {
    emoji = '😬';
    title = 'دروازه‌بان برنده شد!';
    sub = `فقط ${fa(goals)} گل از ${fa(MAX)} شوت...`;
  } else {
    emoji = '🤦';
    title = 'صفر گل؟!';
    sub = 'دروازه‌بان کامل بُرد!';
  }

  $('fEmoji').textContent = emoji;
  $('fTitle').textContent = title;
  $('fScore').textContent = fa(goals) + ' از ' + fa(MAX);
  $('fSub').textContent = sub;

  const rewards = loadPenaltyRewards();
  const rule = rewards[diff] || DEFAULT_PENALTY_REWARDS[diff];
  const discountBox = $('fDiscountBox');
  if (goals >= rule.minGoals) {
    void renderPenaltyDiscountBox(rule, discountBox);
  } else {
    const need = rule.minGoals - goals;
    discountBox.innerHTML =
      '<div style="font-size:12px;color:var(--muted);line-height:1.6">' +
      fa(need) +
      ' گل دیگر تا کد ' +
      fa(rule.discountPercent) +
      '٪ (سقف ' +
      fa(rule.discountFixedCap.toLocaleString('en-US')) +
      ' تومان)</div>';
    discountBox.style.display = 'block';
  }

  /* پیشنهاد سختی */
  const suggest = $('fSuggest');
  if (pct === 1.0 && diff !== 'hard') {
    suggest.style.display = 'block';
    suggest.textContent = '🔥 حالا سختی بالاتر رو امتحان کن!';
    suggest._next = diff === 'easy' ? 'medium' : 'hard';
  } else if (pct < 0.4 && diff !== 'easy') {
    suggest.style.display = 'block';
    suggest.textContent = '💡 سختی پایین‌تر رو امتحان کن!';
    suggest._next = diff === 'hard' ? 'medium' : 'easy';
  } else {
    suggest.style.display = 'none';
  }

  finalOv.classList.add('show');
}

function copyDiscCode() {
  const el = $('discCodeVal');
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    el.style.background = 'rgba(34,197,94,.25)';
    setTimeout(() => (el.style.background = ''), 800);
  });
}

function suggestDiff() {
  const next = $('fSuggest')._next;
  if (next) startGame(next);
}

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function showMsg(type, emoji, title, sub) {
  const em = $('msgEmoji');
  em.textContent = emoji || '';
  em.style.display = emoji ? 'block' : 'none';
  $('msgTitle').textContent = title;
  $('msgTitle').className = 'msg-title ' + type;
  $('msgSub').textContent = sub || '';
  msgOv.classList.add('show');
}

function resetBall() {
  if (ballAnimFrame) {
    cancelAnimationFrame(ballAnimFrame);
    ballAnimFrame = null;
  }
  ballEl.classList.remove('shoot', 'flight');
  ballEl.style.left = '50%';
  ballEl.style.bottom = '22%';
  ballEl.style.transform = 'translateX(-50%)';
  ballEl.style.width = '30px';
  ballEl.style.height = '30px';
  shadowEl.classList.remove('moving');
  shadowEl.style.left = '50%';
  shadowEl.style.bottom = '21.5%';
  shadowEl.style.transform = 'translateX(-50%)';
  shadowEl.style.opacity = '';
  void ballEl.offsetWidth;
}

function updateScore() {
  $('sShot').textContent = fa(shots);
  $('sGoal').textContent = fa(goals);
  $('sMiss').textContent = fa(misses);
}

function markDot(i, cls) {
  const d = $('d' + i);
  if (d) d.className = 'sdot ' + cls;
}

function disableZones() {
  document.querySelectorAll('.sz').forEach((z) => z.classList.add('disabled'));
  $('zoneHint').classList.add('hide');
}
function enableZones() {
  document
    .querySelectorAll('.sz')
    .forEach((z) => z.classList.remove('disabled'));
  $('zoneHint').classList.remove('hide');
}

/* ── AIM ── */
document
  .getElementById('shotZones')
  .addEventListener('mousemove', function (e) {
    if (busy) return;
    const fr = fieldEl.getBoundingClientRect();
    aimEl.style.left = e.clientX - fr.left + 'px';
    aimEl.style.top = e.clientY - fr.top + 'px';
    aimEl.classList.add('show');
  });
document
  .getElementById('shotZones')
  .addEventListener('mouseleave', function () {
    aimEl.classList.remove('show');
  });

/* touch support */
document.getElementById('shotZones').addEventListener(
  'touchstart',
  function (e) {
    e.preventDefault();
    if (busy || shots >= MAX) return;
    instrEl.style.display = 'none';
    const touch = e.touches[0];
    const goalR = goalEl.getBoundingClientRect();
    const rx = (touch.clientX - goalR.left) / goalR.width;
    const ry = (touch.clientY - goalR.top) / goalR.height;
    const col = rx < 0.333 ? 0 : rx < 0.667 ? 1 : 2;
    const row = ry < 0.5 ? 0 : 1;
    const z = row * 3 + col;
    disableZones();
    shoot(z);
  },
  { passive: false },
);

/* share */
function shareScore() {
  const t = `توی سانس‌چی پنالتی (${cfg.label}) — ${fa(goals)} گل از ${fa(MAX)} شوت! ⚽🏆`;
  if (navigator.share)
    navigator.share({
      title: 'سانس‌چی پنالتی',
      text: t,
      url: location.href,
    });
  else if (navigator.clipboard)
    navigator.clipboard.writeText(t).then(() => alert('کپی شد!'));
}

window.openDiffScreen = openDiffScreen;
window.startGame = startGame;
window.shareScore = shareScore;
window.suggestDiff = suggestDiff;
window.copyDiscCode = copyDiscCode;

/* INIT */
diffScr.classList.remove('hidden');
