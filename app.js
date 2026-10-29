/**
 * ============================================================================
 * LEXIQUEST 2000 — 6 LIGAS, ESTUDIO TÁCTIL POR NIVELES Y AUDIO POR TIEMPO VERBAL
 * ============================================================================
 */

const STORAGE_KEY = 'lexiquest_2000_state_v3';
const XP_PER_LEVEL = 150;

const VOCABULARY_DB = window.VOCABULARY_DB || [];

const TIER_META = {
  bronze: {
    name: '🥉 Liga Bronce',
    shortName: 'Bronce',
    minGroup: 1,
    maxGroup: 30,
    totalWords: 300,
    badgeBg: 'var(--bronze-soft)',
    badgeColor: 'var(--bronze-dark)'
  },
  silver: {
    name: '🥈 Liga Plata',
    shortName: 'Plata',
    minGroup: 31,
    maxGroup: 60,
    totalWords: 300,
    badgeBg: 'var(--silver-soft)',
    badgeColor: 'var(--silver-dark)'
  },
  gold: {
    name: '🥇 Liga Oro',
    shortName: 'Oro',
    minGroup: 61,
    maxGroup: 95,
    totalWords: 350,
    badgeBg: 'var(--gold-soft)',
    badgeColor: 'var(--gold-dark)'
  },
  emerald: {
    name: '🟢 Liga Esmeralda',
    shortName: 'Esmeralda',
    minGroup: 96,
    maxGroup: 130,
    totalWords: 350,
    badgeBg: 'var(--emerald-soft)',
    badgeColor: 'var(--emerald-dark)'
  },
  sapphire: {
    name: '🔷 Liga Zafiro',
    shortName: 'Zafiro',
    minGroup: 131,
    maxGroup: 165,
    totalWords: 350,
    badgeBg: 'var(--sapphire-soft)',
    badgeColor: 'var(--sapphire-dark)'
  },
  diamond: {
    name: '💎 Liga Diamante',
    shortName: 'Diamante',
    minGroup: 166,
    maxGroup: 200,
    totalWords: 350,
    badgeBg: 'var(--diamond-soft)',
    badgeColor: 'var(--diamond-dark)'
  }
};

/* ============================================================================
   1. SINTETIZADOR DE SONIDOS (WEB AUDIO API) Y PRONUNCIACIÓN POR TIEMPO VERBAL
   ============================================================================ */
const SoundFX = {
  enabled: true,
  ctx: null,

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  },

  playTone(freq, type = 'sine', duration = 0.14, delay = 0, gainVal = 0.15) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (_) {
      /* Ignorar si el navegador bloquea autoplay */
    }
  },

  success() {
    this.playTone(523.25, 'triangle', 0.12, 0);
    this.playTone(659.25, 'triangle', 0.12, 0.09);
    this.playTone(783.99, 'triangle', 0.22, 0.18);
  },

  error() {
    this.playTone(220, 'sawtooth', 0.15, 0, 0.12);
    this.playTone(175, 'sawtooth', 0.22, 0.12, 0.12);
  },

  flip() {
    this.playTone(440, 'sine', 0.08, 0, 0.08);
    this.playTone(587.33, 'sine', 0.09, 0.05, 0.08);
  },

  levelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => this.playTone(n, 'triangle', 0.22, idx * 0.1, 0.2));
  }
};

/**
 * Limpia texto de tiempos verbales (ej. "eat / eats" -> "eat, eats", "read (red)" -> "red")
 * para que el motor Text-to-Speech pronuncie cada tiempo verbal con total naturalidad.
 */
function formatTenseForSpeech(rawTense) {
  if (!rawTense) return '';
  if (rawTense.includes('(red)')) return 'red';
  return rawTense
    .replace(/\(.*?\)/g, '')
    .replace(/\s*\/\s*/g, ', ')
    .trim();
}

function speakEnglish(text, btnElement = null) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const cleanText = formatTenseForSpeech(text);
  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.lang = 'en-US';
  utter.rate = 0.88;
  utter.pitch = 1.04;

  if (btnElement) {
    btnElement.classList.add('speaking');
    utter.onend = () => btnElement.classList.remove('speaking');
    utter.onerror = () => btnElement.classList.remove('speaking');
    setTimeout(() => btnElement.classList.remove('speaking'), 1400);
  }

  window.speechSynthesis.speak(utter);
}

/**
 * Genera la cuadrícula de los 4 botones táctiles para escuchar cada Tiempo Verbal.
 */
function renderTensesAudioButtonsHTML(tenses, customClass = 'study-tenses-grid') {
  const items = [
    { label: 'Presente', value: tenses.present },
    { label: 'Pasado', value: tenses.past },
    { label: 'Participio', value: tenses.participle },
    { label: 'Gerundio', value: tenses.gerund }
  ];

  return `
    <div class="${customClass}">
      ${items
        .map(
          item => `
        <button
          type="button"
          class="tense-audio-btn"
          data-speak-tense="${item.value.replace(/"/g, '&quot;')}"
          title="Escuchar pronunciación en ${item.label}: ${item.value}"
        >
          <div class="tense-btn-meta">
            <span class="tense-btn-kind">${item.label}</span>
            <span class="tense-btn-val">${item.value}</span>
          </div>
          <span class="tense-btn-speaker">🔊</span>
        </button>
      `
        )
        .join('')}
    </div>
  `;
}

function bindTenseAudioButtons(container) {
  if (!container) return;
  container.querySelectorAll('[data-speak-tense]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const val = btn.getAttribute('data-speak-tense');
      speakEnglish(val, btn);
    });
  });
}

/* ============================================================================
   2. FECHAS, RACHAS Y PERSISTENCIA LOCAL (localStorage)
   ============================================================================ */
function getTodayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysDifference(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return null;
  const a = new Date(dateStrA + 'T00:00:00');
  const b = new Date(dateStrB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function createDefaultQuests() {
  return [
    {
      id: 'q_words',
      title: 'Domina o acierta 5 palabras hoy',
      current: 0,
      target: 5,
      rewardXP: 50,
      completed: false
    },
    {
      id: 'q_xp',
      title: 'Consigue 100 XP en tus prácticas',
      current: 0,
      target: 100,
      rewardXP: 40,
      completed: false
    },
    {
      id: 'q_flawless',
      title: 'Logra un Combo x3 sin fallar',
      current: 0,
      target: 3,
      rewardXP: 60,
      completed: false
    }
  ];
}

function getDefaultState() {
  return {
    playerName: 'Explorador',
    avatar: '🦊',
    xp: 0,
    level: 1,
    streakCount: 0,
    lastPracticeDate: null,
    questsDate: getTodayISO(),
    dailyQuests: createDefaultQuests(),
    masteredWords: [],
    reviewedTodayWords: [],
    selectedTier: 'bronze',
    selectedGroup: 1,
    selectedMode: 'mixed',
    studyGridOpen: true
  };
}

let appState = loadState();
let sessionState = {
  combo: 1,
  wordIndexInGroup: 0,
  currentWord: null,
  currentResolvedMode: 'quiz',
  answered: false
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = { ...getDefaultState(), ...JSON.parse(raw) };
    if (!Array.isArray(parsed.reviewedTodayWords)) {
      parsed.reviewedTodayWords = [];
    }

    if (!TIER_META[parsed.selectedTier]) {
      parsed.selectedTier = 'bronze';
    }
    if (!parsed.selectedGroup || parsed.selectedGroup < 1 || parsed.selectedGroup > 200) {
      parsed.selectedGroup = 1;
    }

    const today = getTodayISO();
    if (parsed.questsDate !== today) {
      parsed.questsDate = today;
      parsed.dailyQuests = createDefaultQuests();
      parsed.reviewedTodayWords = [];
    }

    evaluateStreakOnStartup(parsed);
    return parsed;
  } catch (e) {
    return getDefaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }
}

function evaluateStreakOnStartup(stateObj) {
  if (!stateObj.lastPracticeDate) return;
  const today = getTodayISO();
  const diff = getDaysDifference(stateObj.lastPracticeDate, today);
  if (diff !== null && diff > 1) {
    stateObj.streakCount = 0;
  }
}

function registerDailyPractice() {
  const today = getTodayISO();
  const diff = getDaysDifference(appState.lastPracticeDate, today);

  if (appState.lastPracticeDate === null) {
    appState.streakCount = 1;
    appState.lastPracticeDate = today;
  } else if (diff === 0) {
    if (appState.streakCount === 0) appState.streakCount = 1;
  } else if (diff === 1) {
    appState.streakCount += 1;
    appState.lastPracticeDate = today;
  } else if (diff > 1) {
    appState.streakCount = 1;
    appState.lastPracticeDate = today;
  }

  saveState();
}

/* ============================================================================
   3. RECOMPENSAS VISUALES (CONFETI, XP FLOTANTE Y SUBIDA DE NIVEL)
   ============================================================================ */
function launchConfetti(particleCount = 55) {
  if (typeof window.confetti === 'function') {
    window.confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.65 }
    });
  }
}

function spawnFloatingXP(amount) {
  const fxLayer = document.getElementById('fx-layer');
  if (!fxLayer) return;
  const badge = document.createElement('div');
  badge.className = 'floating-xp';
  badge.textContent = `+${amount} XP ⚡`;
  badge.style.left = `${Math.floor(42 + Math.random() * 16)}%`;
  badge.style.top = '48%';
  fxLayer.appendChild(badge);
  setTimeout(() => badge.remove(), 1200);
}

function getLevelTitle(level) {
  const titles = [
    'Aprendiz de Bronce',
    'Explorador de Plata',
    'Guerrero de Oro',
    'Guardián Esmeralda',
    'Maestro Zafiro',
    'Leyenda Diamante'
  ];
  return titles[Math.min(level - 1, titles.length - 1)];
}

function awardXP(amount, updateQuestFlag = true) {
  const previousLevel = appState.level;
  appState.xp += amount;
  spawnFloatingXP(amount);

  const calculatedLevel = Math.floor(appState.xp / XP_PER_LEVEL) + 1;
  if (calculatedLevel > previousLevel) {
    appState.level = calculatedLevel;
    showLevelUpModal(calculatedLevel);
  }

  if (updateQuestFlag) {
    updateQuestProgress('q_xp', amount);
  }

  saveState();
  updateHUD();
}

function showLevelUpModal(newLevel) {
  SoundFX.levelUp();
  launchConfetti(110);
  const modal = document.getElementById('levelup-modal');
  document.getElementById('levelup-title-text').textContent = `¡Subiste al Nivel ${newLevel}!`;
  document.getElementById('levelup-subtitle-text').textContent = `Nuevo título: "${getLevelTitle(newLevel)}". ¡Sigue dominando cada nivel!`;
  modal.classList.remove('hidden');
}

function updateQuestProgress(questId, increment = 1, absoluteValue = null) {
  const quest = appState.dailyQuests.find(q => q.id === questId);
  if (!quest || quest.completed) return;

  if (absoluteValue !== null) {
    quest.current = Math.max(quest.current, absoluteValue);
  } else {
    quest.current += increment;
  }

  if (quest.current >= quest.target) {
    quest.current = quest.target;
    quest.completed = true;
    launchConfetti(80);
    awardXP(quest.rewardXP, false);
  }

  saveState();
  renderDailyQuests();
}

/* ============================================================================
   4. SECCIÓN TÁCTIL DE ESTUDIO POR NIVELES Y LAS 6 LIGAS
   ============================================================================ */
function getWordsByGroup(groupNumber) {
  return VOCABULARY_DB.filter(w => w.group === Number(groupNumber));
}

function getTierForGroup(groupNumber) {
  if (groupNumber <= 30) return 'bronze';
  if (groupNumber <= 60) return 'silver';
  if (groupNumber <= 95) return 'gold';
  if (groupNumber <= 130) return 'emerald';
  if (groupNumber <= 165) return 'sapphire';
  return 'diamond';
}

function renderStudyByLevelsSection() {
  const currentGroup = appState.selectedGroup;
  const tier = getTierForGroup(currentGroup);
  appState.selectedTier = tier;

  const meta = TIER_META[tier];
  const levelInLeague = currentGroup - meta.minGroup + 1;
  const totalLevelsInLeague = meta.maxGroup - meta.minGroup + 1;
  const groupWords = getWordsByGroup(currentGroup);
  const masteredSet = new Set(appState.masteredWords);

  // Actualizar insignia de Liga en cabecera de Estudio
  const leagueBadge = document.getElementById('study-league-badge');
  leagueBadge.textContent = meta.name;
  leagueBadge.style.background = meta.badgeBg;
  leagueBadge.style.color = meta.badgeColor;

  // Resaltar Liga activa en el menú de ligas y centrarla si está en modo carrusel móvil
  const leagueListEl = document.getElementById('league-selector');
  leagueListEl.querySelectorAll('.league-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tier') === tier);
  });
  const activeLeagueBtn = leagueListEl.querySelector('.league-btn.active');
  if (activeLeagueBtn && leagueListEl.scrollWidth > leagueListEl.clientWidth) {
    const lLeft = activeLeagueBtn.offsetLeft - leagueListEl.clientWidth / 2 + activeLeagueBtn.clientWidth / 2;
    leagueListEl.scrollTo({ left: Math.max(0, lLeft), behavior: 'smooth' });
  }

  // Progreso de este nivel (de 0 a 10 palabras)
  const masteredInLevel = groupWords.filter(w => masteredSet.has(w.id)).length;
  document.getElementById('current-level-pill').textContent =
    `Nivel ${levelInLeague} de ${totalLevelsInLeague} · ${masteredInLevel}/10`;
  document.getElementById('study-group-progress-label').textContent =
    `${masteredInLevel} / 10 aprendidas en este nivel`;

  // Botones de Nivel Anterior / Siguiente
  document.getElementById('btn-prev-level').disabled = currentGroup <= 1;
  document.getElementById('btn-next-level').disabled = currentGroup >= 200;

  // 1. Renderizar la tira de botones táctiles de Niveles de la Liga activa
  const stripEl = document.getElementById('levels-strip-container');
  const stripHTML = [];
  for (let g = meta.minGroup; g <= meta.maxGroup; g++) {
    const lvlNum = g - meta.minGroup + 1;
    const wordsOfG = getWordsByGroup(g);
    const countDone = wordsOfG.filter(w => masteredSet.has(w.id)).length;
    const isCompleted = countDone === 10;
    const isActive = g === currentGroup;

    stripHTML.push(`
      <button
        type="button"
        class="level-pill-btn ${isActive ? 'active' : ''} ${isCompleted ? 'completed-level' : ''}"
        data-target-group="${g}"
      >
        <span>${isCompleted ? '👑' : '📦'} Nivel ${lvlNum}</span>
        <span class="level-pill-count">${countDone}/10</span>
      </button>
    `);
  }
  stripEl.innerHTML = stripHTML.join('');

  stripEl.querySelectorAll('.level-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetGroup = Number(btn.getAttribute('data-target-group'));
      selectGroup(targetGroup);
    });
  });

  // Hacer scroll interno únicamente dentro de la tira de niveles
  const activePill = stripEl.querySelector('.level-pill-btn.active');
  if (activePill) {
    const targetLeft = activePill.offsetLeft - stripEl.clientWidth / 2 + activePill.clientWidth / 2;
    stripEl.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }

  // 2. Renderizar las 10 Tarjetas Táctiles de Estudio del Nivel Actual (con audio en cada Tiempo Verbal)
  const reviewedSet = new Set(appState.reviewedTodayWords || []);
  const gridEl = document.getElementById('study-cards-grid');
  gridEl.innerHTML = groupWords
    .map((w, idx) => {
      const isMastered = masteredSet.has(w.id);
      const isReviewedToday = reviewedSet.has(w.id);
      const isCurrent = sessionState.currentWord && sessionState.currentWord.id === w.id;
      return `
        <article class="study-word-card ${isCurrent ? 'active-study-card' : ''} ${isMastered ? 'mastered-study-card' : ''}">
          <div class="study-card-top">
            <div class="study-word-icon">${w.emoji}</div>
            <div class="study-word-info">
              <div class="study-word-en">
                <span>${idx + 1}. ${w.word}</span>
                ${isMastered ? '<span title="Palabra aprendida">👑</span>' : ''}
              </div>
              <span class="study-word-es">${w.meaning}</span>
              <span class="study-word-phonetic">${w.pronunciation}</span>
            </div>
            <div class="study-card-actions">
              <button
                type="button"
                class="btn-speak-main"
                data-speak-word="${w.word}"
                title="Escuchar palabra: ${w.word}"
              >
                🔊
              </button>
              <button
                type="button"
                class="btn-practice-word ${isMastered ? 'is-review-mode' : ''}"
                data-practice-idx="${idx}"
                title="${
                  !isMastered
                    ? 'Jugar esta palabra para ganar +20 XP'
                    : isReviewedToday
                      ? 'Ya cobraste el repaso de hoy (0 XP extra)'
                      : 'Repasar esta palabra para ganar +10 XP'
                }"
              >
                ${!isMastered ? '🎯 Jugar' : isReviewedToday ? '✅ Repasada' : '🔁 Repasar'}
              </button>
            </div>
          </div>

          <!-- Los 4 Tiempos Verbales con Botón de Pronunciación Individual -->
          ${renderTensesAudioButtonsHTML(w.tenses, 'study-tenses-grid')}
        </article>
      `;
    })
    .join('');

  // Eventos de audio de la palabra principal en cada tarjeta
  gridEl.querySelectorAll('[data-speak-word]').forEach(btn => {
    btn.addEventListener('click', () => {
      speakEnglish(btn.getAttribute('data-speak-word'), btn);
    });
  });

  // Eventos de audio individual para cada uno de los 4 tiempos verbales
  bindTenseAudioButtons(gridEl);

  // Centrar automáticamente la tarjeta de la palabra activa dentro del carrusel de estudio
  const activeStudyCard = gridEl.querySelector('.study-word-card.active-study-card');
  if (activeStudyCard) {
    const cardLeft = activeStudyCard.offsetLeft - gridEl.clientWidth / 2 + activeStudyCard.clientWidth / 2;
    gridEl.scrollTo({ left: Math.max(0, cardLeft), behavior: 'smooth' });
  }

  // Evento para saltar a practicar esa palabra en la Arena
  gridEl.querySelectorAll('[data-practice-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-practice-idx'));
      sessionState.wordIndexInGroup = idx;
      loadExerciseForCurrentGroupWord();
      document.getElementById('view-practice').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Mostrar/ocultar el grid de tarjetas de estudio
  const studyBody = document.getElementById('study-words-body');
  const toggleBtn = document.getElementById('btn-toggle-study-grid');
  studyBody.classList.toggle('hidden', !appState.studyGridOpen);
  toggleBtn.textContent = appState.studyGridOpen ? '🙈 Ocultar Palabras' : '👀 Ver las 10 Palabras';
}

/* ============================================================================
   5. ACTUALIZACIÓN DEL HUD Y LAS 6 LIGAS
   ============================================================================ */
function updateHUD() {
  const xpIntoLevel = appState.xp % XP_PER_LEVEL;
  const xpPercent = Math.min(100, Math.round((xpIntoLevel / XP_PER_LEVEL) * 100));

  document.getElementById('hud-level-badge').textContent = `Nv. ${appState.level}`;
  document.getElementById('hud-xp-text').textContent = `${xpIntoLevel} / ${XP_PER_LEVEL} XP`;
  document.getElementById('hud-level-title').textContent = getLevelTitle(appState.level);
  document.getElementById('hud-xp-bar').style.width = `${xpPercent}%`;

  const today = getTodayISO();
  const diff = getDaysDifference(appState.lastPracticeDate, today);
  const isStreakAlive = appState.streakCount > 0 && (diff === 0 || diff === 1);
  const practicedToday = diff === 0 && appState.streakCount > 0;

  const streakPill = document.getElementById('streak-pill');
  const streakCountEl = document.getElementById('hud-streak-count');
  const streakStatusEl = document.getElementById('hud-streak-status');
  const bannerBox = document.getElementById('streak-banner-box');
  const bannerTitle = document.getElementById('streak-banner-title');
  const bannerDesc = document.getElementById('streak-banner-desc');

  streakCountEl.textContent = appState.streakCount;

  if (isStreakAlive) {
    streakPill.classList.add('active-streak');
    streakPill.classList.remove('extinguished-streak');
    streakStatusEl.textContent = appState.streakCount === 1 ? 'Día' : 'Días';
    bannerBox.classList.remove('cold');

    if (practicedToday) {
      bannerTitle.textContent = `¡Racha de ${appState.streakCount} días activa!`;
      bannerDesc.textContent = '¡Fuego encendido! Practica mañana para sumar otro día.';
    } else {
      bannerTitle.textContent = `¡Mantén tus ${appState.streakCount} días!`;
      bannerDesc.textContent = 'Completa 1 ejercicio hoy para no perder tu fuego.';
    }
  } else {
    streakPill.classList.remove('active-streak');
    streakPill.classList.add('extinguished-streak');
    streakStatusEl.textContent = 'Apagado';
    bannerBox.classList.add('cold');
    bannerTitle.textContent = '¡Tu fuego está apagado!';
    bannerDesc.textContent = 'Completa un ejercicio hoy para encender tu racha diaria.';
  }

  document.getElementById('hud-mastered-count').textContent = appState.masteredWords.length;
  document.getElementById('hud-user-avatar').textContent = appState.avatar;
  document.getElementById('hud-user-name').textContent = appState.playerName;

  // Actualizar cuántas palabras lleva aprendidas en cada una de las 6 Ligas
  const masteredSet = new Set(appState.masteredWords);
  Object.keys(TIER_META).forEach(tier => {
    const total = TIER_META[tier].totalWords;
    const learnedCount = VOCABULARY_DB.filter(w => w.tier === tier && masteredSet.has(w.id)).length;
    const el = document.getElementById(`prog-${tier}`);
    if (el) el.textContent = `${learnedCount} / ${total}`;
  });

  document.getElementById('combo-count').textContent = `x${sessionState.combo}`;
}

function renderDailyQuests() {
  const container = document.getElementById('daily-quests-container');
  if (!container) return;

  container.innerHTML = appState.dailyQuests
    .map(q => {
      const pct = Math.min(100, Math.round((q.current / q.target) * 100));
      return `
        <div class="quest-item ${q.completed ? 'completed' : ''}">
          <div class="quest-top">
            <span class="quest-title">${q.completed ? '✅ ' : '🎯 '}${q.title}</span>
            <span class="quest-reward">+${q.rewardXP} XP</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill quest-fill" style="width: ${pct}%"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.73rem; font-weight:800; color:var(--text-muted); margin-top:4px;">
            <span>${q.completed ? '¡Completada!' : 'En progreso'}</span>
            <span>${q.current} / ${q.target}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

/* ============================================================================
   6. PLACEHOLDER CUADRADO ESTILO CARICATURA/ANIMÉ (NANO BANANA API)
   ============================================================================ */
function renderAnimeArtPlaceholder(wordObj) {
  return `
    <div class="anime-art-box" style="background: ${wordObj.bgGradient};" title="Prompt Nano Banana: ${wordObj.nanoPrompt}">
      <div class="nano-banana-tag">
        <span>🍌 Nano Banana AI</span>
      </div>
      <svg class="anime-art-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="50" fill="rgba(255,255,255,0.55)" stroke="#ffffff" stroke-width="4" />
        <circle cx="42" cy="40" r="6" fill="#ffffff" opacity="0.8" />
        <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-size="52">${wordObj.emoji}</text>
      </svg>
      <div class="nano-prompt-caption">
        🎨 ${wordObj.nanoPrompt}
      </div>
    </div>
  `;
}

/* ============================================================================
   7. MOTOR DE EJERCICIOS DEL NIVEL ACTUAL (CON AUDIO EN CADA TIEMPO VERBAL)
   ============================================================================ */
function loadExerciseForCurrentGroupWord() {
  sessionState.answered = false;
  hideFeedbackBanner();

  const groupWords = getWordsByGroup(appState.selectedGroup);
  if (groupWords.length === 0) return;

  if (sessionState.wordIndexInGroup >= groupWords.length) {
    sessionState.wordIndexInGroup = 0;
  }

  sessionState.currentWord = groupWords[sessionState.wordIndexInGroup];

  const meta = TIER_META[appState.selectedTier];
  const levelInLeague = appState.selectedGroup - meta.minGroup + 1;
  const pos = sessionState.wordIndexInGroup + 1;
  const stepPct = Math.round((pos / groupWords.length) * 100);

  document.getElementById('session-progress-fill').style.width = `${stepPct}%`;
  document.getElementById('session-step-label').textContent =
    `Palabra ${pos} / ${groupWords.length} · Nivel ${levelInLeague} (${meta.shortName})`;

  renderStudyByLevelsSection();

  if (appState.selectedMode === 'mixed') {
    const modes = ['quiz', 'spelling', 'flashcard'];
    sessionState.currentResolvedMode = modes[sessionState.wordIndexInGroup % modes.length];
  } else {
    sessionState.currentResolvedMode = appState.selectedMode;
  }

  if (sessionState.currentResolvedMode === 'quiz') {
    renderQuizExercise(sessionState.currentWord, groupWords, levelInLeague);
  } else if (sessionState.currentResolvedMode === 'spelling') {
    renderSpellingExercise(sessionState.currentWord, levelInLeague);
  } else {
    renderFlashcardExercise(sessionState.currentWord, levelInLeague);
  }
}

/* ---------------- MINIJUEGO 1: SELECCIÓN MÚLTIPLE ---------------- */
function renderQuizExercise(wordObj, groupWords, levelInLeague) {
  const stage = document.getElementById('exercise-stage');
  const quizTypes = ['meaning', 'past', 'participle', 'gerund'];
  const chosenType = quizTypes[Math.floor(Math.random() * quizTypes.length)];

  let promptQuestion = '';
  let correctAnswer = '';
  let distractors = [];

  if (chosenType === 'meaning') {
    promptQuestion = `¿Cuál es el significado en español de "${wordObj.word}"?`;
    correctAnswer = wordObj.meaning;
    distractors = groupWords
      .filter(w => w.id !== wordObj.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.meaning);
  } else {
    const labels = {
      past: 'PASADO SIMPLE (Past)',
      participle: 'PARTICIPIO (Past Participle)',
      gerund: 'GERUNDIO (-ing)'
    };
    promptQuestion = `Elige la forma en ${labels[chosenType]} de "${wordObj.word}":`;
    correctAnswer = wordObj.tenses[chosenType];

    const pool = new Set([
      wordObj.tenses.present,
      wordObj.tenses.past,
      wordObj.tenses.participle,
      wordObj.tenses.gerund,
      ...groupWords.filter(w => w.id !== wordObj.id).map(w => w.tenses[chosenType])
    ]);
    pool.delete(correctAnswer);
    distractors = Array.from(pool).sort(() => Math.random() - 0.5).slice(0, 3);
  }

  const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
  const isAlreadyMastered = appState.masteredWords.includes(wordObj.id);
  const isReviewedToday = (appState.reviewedTodayWords || []).includes(wordObj.id);
  const headerBadgeText = !isAlreadyMastered
    ? TIER_META[wordObj.tier].name
    : isReviewedToday
      ? '👑 Ya repasada hoy (0 XP)'
      : '👑 Modo Repaso (+10 XP)';

  stage.innerHTML = `
    <div class="exercise-header">
      <span class="exercise-badge">⚡ Selección Múltiple · Nivel ${levelInLeague}</span>
      <span class="word-rank-badge">${headerBadgeText}</span>
    </div>

    <div class="exercise-body">
      ${renderAnimeArtPlaceholder(wordObj)}

      <div class="question-zone">
        <h3 class="prompt-instruction">${promptQuestion}</h3>

        <div class="word-showcase">
          <div class="word-showcase-top">
            <button class="btn-audio-tts" id="btn-tts-current" title="Escuchar palabra principal">🔊</button>
            <div>
              <div class="showcase-main-word">${wordObj.word}</div>
              <span class="showcase-phonetic">${wordObj.pronunciation}</span>
            </div>
            <p class="showcase-example">"${wordObj.exampleEn}"</p>
          </div>
        </div>

        <div class="options-grid">
          ${options
            .map(
              (opt, idx) => `
            <button class="option-btn" data-answer="${opt.replace(/"/g, '&quot;')}">
              <span class="option-key">${idx + 1}</span>
              <span>${opt}</span>
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-tts-current').addEventListener('click', () => speakEnglish(wordObj.word));
  bindTenseAudioButtons(stage);

  const optionBtns = stage.querySelectorAll('.option-btn');
  optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (sessionState.answered) return;
      sessionState.answered = true;

      const selected = btn.getAttribute('data-answer');
      const isCorrect = selected === correctAnswer;

      optionBtns.forEach(b => {
        b.disabled = true;
        if (b.getAttribute('data-answer') === correctAnswer) b.classList.add('correct');
      });

      if (isCorrect) {
        btn.classList.add('correct');
        speakEnglish(chosenType === 'meaning' ? wordObj.word : correctAnswer);
        handleCorrectAnswer(
          wordObj,
          `¡Correcto! Presente: ${wordObj.tenses.present} · Pasado: ${wordObj.tenses.past} · Participio: ${wordObj.tenses.participle}`
        );
      } else {
        btn.classList.add('wrong');
        handleWrongAnswer(
          wordObj,
          `La respuesta correcta era "${correctAnswer}". (${wordObj.word} = ${wordObj.meaning})`
        );
      }
    });
  });
}

/* ---------------- MINIJUEGO 2: ESCRITURA (SPELLING) ---------------- */
function renderSpellingExercise(wordObj, levelInLeague) {
  const stage = document.getElementById('exercise-stage');
  const targetWord = wordObj.word.trim();

  const slotsHTML = targetWord
    .split('')
    .map((ch, idx) => `<span class="letter-slot">${idx === 0 ? ch.toUpperCase() : '_'}</span>`)
    .join('');
  const isAlreadyMastered = appState.masteredWords.includes(wordObj.id);
  const isReviewedToday = (appState.reviewedTodayWords || []).includes(wordObj.id);
  const headerBadgeText = !isAlreadyMastered
    ? TIER_META[wordObj.tier].name
    : isReviewedToday
      ? '👑 Ya repasada hoy (0 XP)'
      : '👑 Modo Repaso (+10 XP)';

  stage.innerHTML = `
    <div class="exercise-header">
      <span class="exercise-badge">⌨️ Escritura (Spelling) · Nivel ${levelInLeague}</span>
      <span class="word-rank-badge">${headerBadgeText}</span>
    </div>

    <div class="exercise-body">
      ${renderAnimeArtPlaceholder(wordObj)}

      <div class="question-zone">
        <h3 class="prompt-instruction">Escribe en inglés la palabra para: <span style="color:var(--sapphire-dark)">"${wordObj.meaning}"</span></h3>

        <div class="word-showcase">
          <div class="word-showcase-top">
            <button class="btn-audio-tts" id="btn-tts-spelling" title="Escuchar palabra">🔊</button>
            <div>
              <span class="showcase-phonetic">Pronunciación: ${wordObj.pronunciation}</span>
              <p class="showcase-example" style="margin-top:4px;">Empieza con "${targetWord[0].toUpperCase()}" (${targetWord.length} letras)</p>
            </div>
          </div>
        </div>

        <div class="spelling-box">
          <div class="letter-hints" id="spelling-slots">${slotsHTML}</div>
          <div class="spelling-input-row">
            <input
              type="text"
              id="spelling-input"
              class="spelling-input"
              placeholder="Escribe la palabra en inglés..."
              autocomplete="off"
              spellcheck="false"
            />
            <button class="btn-3d btn-secondary" id="btn-check-spelling">Comprobar ✔</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const inputEl = document.getElementById('spelling-input');
  const checkBtn = document.getElementById('btn-check-spelling');
  document.getElementById('btn-tts-spelling').addEventListener('click', () => speakEnglish(wordObj.word));
  bindTenseAudioButtons(stage);

  inputEl.focus();

  const verifySpelling = () => {
    if (sessionState.answered) return;
    const typed = inputEl.value.trim().toLowerCase();
    if (!typed) return;

    sessionState.answered = true;
    inputEl.disabled = true;
    checkBtn.disabled = true;

    document.getElementById('spelling-slots').innerHTML = targetWord
      .split('')
      .map(ch => `<span class="letter-slot">${ch.toUpperCase()}</span>`)
      .join('');

    if (typed === targetWord.toLowerCase()) {
      inputEl.classList.add('input-correct');
      speakEnglish(wordObj.word);
      handleCorrectAnswer(
        wordObj,
        `¡Excelente escritura! Tiempos: ${wordObj.tenses.present} | ${wordObj.tenses.past} | ${wordObj.tenses.participle}`
      );
    } else {
      inputEl.classList.add('input-wrong');
      handleWrongAnswer(
        wordObj,
        `Se escribe "${wordObj.word}". Pasado: ${wordObj.tenses.past} · Participio: ${wordObj.tenses.participle}`
      );
    }
  };

  checkBtn.addEventListener('click', verifySpelling);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') verifySpelling();
  });
}

/* ---------------- MINIJUEGO 3: TARJETAS DE MEMORIA 3D (FLASHCARDS) ---------------- */
function renderFlashcardExercise(wordObj, levelInLeague) {
  const stage = document.getElementById('exercise-stage');
  const isAlreadyMastered = appState.masteredWords.includes(wordObj.id);
  const isReviewedToday = (appState.reviewedTodayWords || []).includes(wordObj.id);
  const headerBadgeText = !isAlreadyMastered
    ? TIER_META[wordObj.tier].name
    : isReviewedToday
      ? '👑 Ya repasada hoy (0 XP)'
      : '👑 Modo Repaso (+10 XP)';

  stage.innerHTML = `
    <div class="exercise-header">
      <span class="exercise-badge">🃏 Flashcard 3D · Nivel ${levelInLeague}</span>
      <span class="word-rank-badge">${headerBadgeText}</span>
    </div>

    <div class="flashcard-scene" id="flashcard-scene">
      <div class="flashcard-3d" id="flashcard-3d">
        <div class="flashcard-face flashcard-front">
          ${renderAnimeArtPlaceholder(wordObj)}
          <div style="flex:1; display:flex; flex-direction:column; gap:0.65rem;">
            <span class="flip-hint-pill">🔄 Haz clic en la tarjeta para girarla en 3D y escuchar sus Tiempos Verbales</span>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <button class="btn-audio-tts" id="btn-tts-flash" title="Escuchar pronunciación">🔊</button>
              <div>
                <h3 class="showcase-main-word" style="font-size:2rem;">${wordObj.word}</h3>
                <span class="showcase-phonetic">${wordObj.pronunciation}</span>
              </div>
            </div>
            <p style="font-size:1.12rem; font-weight:800; color:var(--text-main);">Significado: ${wordObj.meaning}</p>
            <p class="showcase-example">"${wordObj.exampleEn}"</p>
          </div>
        </div>

        <div class="flashcard-face flashcard-back">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <h4 style="font-family:var(--font-display); font-size:1.15rem; color:var(--diamond-dark);">
              🔊 Toca cada Tiempo Verbal para escuchar su pronunciación:
            </h4>
            <span class="flip-hint-pill">🔄 Volver</span>
          </div>

          <div class="tenses-grid">
            <button type="button" class="tense-box" data-speak-tense="${wordObj.tenses.present.replace(/"/g, '&quot;')}">
              <span class="tense-label">🔊 Presente</span>
              <span class="tense-value">${wordObj.tenses.present}</span>
            </button>
            <button type="button" class="tense-box" data-speak-tense="${wordObj.tenses.past.replace(/"/g, '&quot;')}">
              <span class="tense-label">🔊 Pasado</span>
              <span class="tense-value">${wordObj.tenses.past}</span>
            </button>
            <button type="button" class="tense-box" data-speak-tense="${wordObj.tenses.participle.replace(/"/g, '&quot;')}">
              <span class="tense-label">🔊 Participio</span>
              <span class="tense-value">${wordObj.tenses.participle}</span>
            </button>
            <button type="button" class="tense-box" data-speak-tense="${wordObj.tenses.gerund.replace(/"/g, '&quot;')}">
              <span class="tense-label">🔊 Gerundio (-ing)</span>
              <span class="tense-value">${wordObj.tenses.gerund}</span>
            </button>
          </div>

          <p style="margin-top:0.85rem; font-weight:800; color:var(--text-muted); text-align:center;">
            💡 "${wordObj.exampleEn}"
          </p>
        </div>
      </div>
    </div>

    <div class="flashcard-actions">
      <button class="btn-3d btn-outline" id="btn-flash-review">
        🔁 Repasar (${isReviewedToday ? '0 XP' : '+10 XP'})
      </button>
      <button class="btn-3d btn-primary" id="btn-flash-master">
        ${
          !isAlreadyMastered
            ? '👑 ¡Ya me la sé! (+20 XP)'
            : isReviewedToday
              ? '✅ Ya repasada hoy (0 XP)'
              : '🔁 Completar repaso (+10 XP)'
        }
      </button>
    </div>
  `;

  const scene = document.getElementById('flashcard-scene');
  const card3d = document.getElementById('flashcard-3d');
  const ttsBtn = document.getElementById('btn-tts-flash');

  ttsBtn.addEventListener('click', e => {
    e.stopPropagation();
    speakEnglish(wordObj.word);
  });

  bindTenseAudioButtons(stage);

  scene.addEventListener('click', () => {
    SoundFX.flip();
    card3d.classList.toggle('is-flipped');
  });

  document.getElementById('btn-flash-review').addEventListener('click', () => {
    if (sessionState.answered) return;
    sessionState.answered = true;
    registerDailyPractice();
    SoundFX.flip();
    card3d.classList.add('is-flipped');
    document.getElementById('btn-advance-next-group').classList.add('hidden');

    if (!appState.reviewedTodayWords.includes(wordObj.id)) {
      appState.reviewedTodayWords.push(wordObj.id);
      awardXP(10);
      renderStudyByLevelsSection();
      showFeedbackBanner(
        true,
        '🔁 ¡Buen repaso! (+10 XP)',
        'Ganaste +10 XP por repasar esta palabra hoy.'
      );
    } else {
      showFeedbackBanner(
        true,
        '🔁 ¡Repaso completado! (Ya recibiste los +10 XP de hoy)',
        'Revisa sus 4 tiempos verbales y pasa a otra palabra para seguir sumando XP.'
      );
    }
  });

  document.getElementById('btn-flash-master').addEventListener('click', () => {
    if (sessionState.answered) return;
    sessionState.answered = true;
    handleCorrectAnswer(
      wordObj,
      `¡Palabra aprendida! (${wordObj.tenses.present} → ${wordObj.tenses.past} → ${wordObj.tenses.participle})`
    );
  });
}

/* ============================================================================
   8. RESOLUCIÓN DE RESPUESTAS Y AVANCE DE NIVEL
   ============================================================================ */
function handleCorrectAnswer(wordObj, detailMsg) {
  SoundFX.success();
  registerDailyPractice();

  if (!Array.isArray(appState.reviewedTodayWords)) {
    appState.reviewedTodayWords = [];
  }

  const isFirstTimeMastered = !appState.masteredWords.includes(wordObj.id);
  const canEarnReviewXP = !isFirstTimeMastered && !appState.reviewedTodayWords.includes(wordObj.id);
  let totalEarned = 0;

  if (isFirstTimeMastered) {
    appState.masteredWords.push(wordObj.id);
    launchConfetti(45);

    const baseXP = 20;
    const bonusXP = Math.min(15, (sessionState.combo - 1) * 5);
    totalEarned = baseXP + bonusXP;

    sessionState.combo += 1;

    updateQuestProgress('q_words', 1);
    updateQuestProgress('q_flawless', 0, sessionState.combo);
    awardXP(totalEarned);
  } else if (canEarnReviewXP) {
    // Repasar una palabra aprendida otorga +10 XP (1 vez al día por palabra para evitar XP infinita)
    appState.reviewedTodayWords.push(wordObj.id);
    totalEarned = 10;
    awardXP(totalEarned);
  } else {
    // Ya cobró el repaso de esta palabra hoy: 0 XP
    saveState();
    updateHUD();
  }

  renderStudyByLevelsSection();

  const groupWords = getWordsByGroup(appState.selectedGroup);
  const masteredCount = groupWords.filter(w => appState.masteredWords.includes(w.id)).length;
  const advanceBtn = document.getElementById('btn-advance-next-group');

  if (masteredCount >= 10 && appState.selectedGroup < 200) {
    if (isFirstTimeMastered) launchConfetti(100);
    advanceBtn.classList.remove('hidden');
    showFeedbackBanner(
      true,
      isFirstTimeMastered
        ? `🏆 ¡Completaste las 10 palabras de este Nivel! (+${totalEarned} XP)`
        : canEarnReviewXP
          ? `🔁 ¡Buen repaso! (+10 XP)`
          : '🔁 ¡Repaso completado! (Ya recibiste los +10 XP de hoy en esta palabra)',
      '¡Excelente! Ya puedes avanzar al siguiente nivel o repasar otra palabra.'
    );
  } else {
    advanceBtn.classList.add('hidden');
    if (isFirstTimeMastered) {
      showFeedbackBanner(
        true,
        `¡Muy bien! +${totalEarned} XP (Combo x${sessionState.combo - 1})`,
        detailMsg
      );
    } else if (canEarnReviewXP) {
      showFeedbackBanner(
        true,
        `🔁 ¡Buen repaso! +10 XP`,
        `${detailMsg} (1 repaso con XP al día por palabra)`
      );
    } else {
      showFeedbackBanner(
        true,
        '🔁 ¡Repaso completado! (0 XP · Ya repasaste esta palabra hoy)',
        `${detailMsg} — Elige otra palabra para seguir ganando experiencia.`
      );
    }
  }
}

function handleWrongAnswer(wordObj, detailMsg) {
  SoundFX.error();
  sessionState.combo = 1;
  updateHUD();
  document.getElementById('btn-advance-next-group').classList.add('hidden');

  showFeedbackBanner(
    false,
    '¡Casi! Escucha los tiempos verbales y vuelve a intentarlo 💡',
    detailMsg
  );
}

function showFeedbackBanner(isSuccess, title, detail) {
  const banner = document.getElementById('feedback-banner');
  banner.classList.remove('hidden', 'is-success', 'is-error');
  banner.classList.add(isSuccess ? 'is-success' : 'is-error');

  document.getElementById('feedback-icon').textContent = isSuccess ? '🎉' : '💪';
  document.getElementById('feedback-title').textContent = title;
  document.getElementById('feedback-detail').textContent = detail;
}

function hideFeedbackBanner() {
  const banner = document.getElementById('feedback-banner');
  if (banner) banner.classList.add('hidden');
}

function selectGroup(groupNumber, wordIdx = null) {
  const clamped = Math.max(1, Math.min(200, Number(groupNumber)));
  appState.selectedGroup = clamped;
  appState.selectedTier = getTierForGroup(clamped);

  if (wordIdx === null) {
    const groupWords = getWordsByGroup(clamped);
    const firstPendingIdx = groupWords.findIndex(w => !appState.masteredWords.includes(w.id));
    sessionState.wordIndexInGroup = firstPendingIdx !== -1 ? firstPendingIdx : 0;
  } else {
    sessionState.wordIndexInGroup = wordIdx;
  }

  saveState();
  loadExerciseForCurrentGroupWord();
}

/* ============================================================================
   9. EVENTOS DE INTERFAZ Y NAVEGACIÓN
   ============================================================================ */
function initEvents() {
  // Logo Home lleva al Nivel 1 de Bronce
  document.getElementById('btn-home-logo').addEventListener('click', () => {
    selectGroup(1);
  });

  // Selector de las 6 Ligas en el Sidebar
  document.querySelectorAll('#league-selector .league-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tier = btn.getAttribute('data-tier');
      const meta = TIER_META[tier];
      if (!meta) return;
      appState.selectedTier = tier;
      selectGroup(meta.minGroup);
    });
  });

  // Botones Nivel Anterior / Siguiente en la Sección de Estudio
  document.getElementById('btn-prev-level').addEventListener('click', () => {
    selectGroup(appState.selectedGroup - 1);
  });

  document.getElementById('btn-next-level').addEventListener('click', () => {
    selectGroup(appState.selectedGroup + 1);
  });

  // Mostrar / Ocultar las 10 tarjetas de estudio del nivel
  document.getElementById('btn-toggle-study-grid').addEventListener('click', () => {
    appState.studyGridOpen = !appState.studyGridOpen;
    saveState();
    renderStudyByLevelsSection();
  });

  // Selector de Modo de Juego
  document.querySelectorAll('#game-mode-selector .mode-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#game-mode-selector .mode-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      appState.selectedMode = pill.getAttribute('data-mode');
      saveState();
      loadExerciseForCurrentGroupWord();
    });
  });

  // Botón "Siguiente Palabra" (prioriza la siguiente palabra aún no aprendida del nivel)
  document.getElementById('btn-next-question').addEventListener('click', () => {
    const groupWords = getWordsByGroup(appState.selectedGroup);
    const total = groupWords.length || 10;
    let nextIdx = (sessionState.wordIndexInGroup + 1) % total;

    for (let offset = 1; offset <= total; offset++) {
      const candidateIdx = (sessionState.wordIndexInGroup + offset) % total;
      const candidateWord = groupWords[candidateIdx];
      if (candidateWord && !appState.masteredWords.includes(candidateWord.id)) {
        nextIdx = candidateIdx;
        break;
      }
    }

    sessionState.wordIndexInGroup = nextIdx;
    loadExerciseForCurrentGroupWord();
  });

  // Botón "¡Pasar al Siguiente Nivel!"
  document.getElementById('btn-advance-next-group').addEventListener('click', () => {
    selectGroup(appState.selectedGroup + 1);
  });

  // Sonido On/Off
  const soundBtn = document.getElementById('btn-toggle-sound');
  soundBtn.addEventListener('click', () => {
    SoundFX.enabled = !SoundFX.enabled;
    soundBtn.textContent = SoundFX.enabled ? '🔊' : '🔇';
  });

  // Modal de Nivel
  document.getElementById('btn-close-levelup').addEventListener('click', () => {
    document.getElementById('levelup-modal').classList.add('hidden');
  });

  // Modal de Perfil y Simulador
  const profileModal = document.getElementById('profile-modal');
  document.getElementById('btn-open-profile').addEventListener('click', () => {
    document.getElementById('input-player-name').value = appState.playerName;
    document.querySelectorAll('#avatar-selector .avatar-option').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-avatar') === appState.avatar);
    });
    profileModal.classList.remove('hidden');
  });

  document.getElementById('btn-close-profile').addEventListener('click', () => {
    profileModal.classList.add('hidden');
  });

  document.querySelectorAll('#avatar-selector .avatar-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('#avatar-selector .avatar-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });

  document.getElementById('btn-save-profile').addEventListener('click', () => {
    const newName = document.getElementById('input-player-name').value.trim();
    const activeAvatar = document.querySelector('#avatar-selector .avatar-option.active');
    if (newName) appState.playerName = newName;
    if (activeAvatar) appState.avatar = activeAvatar.getAttribute('data-avatar');
    saveState();
    updateHUD();
    profileModal.classList.add('hidden');
  });

  document.getElementById('btn-sim-next-day').addEventListener('click', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    appState.lastPracticeDate = yesterday.toISOString().slice(0, 10);
    appState.reviewedTodayWords = [];
    if (appState.streakCount === 0) appState.streakCount = 1;
    registerDailyPractice();
    launchConfetti(60);
    updateHUD();
    loadExerciseForCurrentGroupWord();
    profileModal.classList.add('hidden');
  });

  document.getElementById('btn-sim-missed-day').addEventListener('click', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    appState.lastPracticeDate = threeDaysAgo.toISOString().slice(0, 10);
    evaluateStreakOnStartup(appState);
    saveState();
    updateHUD();
    profileModal.classList.add('hidden');
  });

  document.getElementById('btn-reset-data').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    appState = getDefaultState();
    saveState();
    updateHUD();
    renderDailyQuests();
    loadExerciseForCurrentGroupWord();
    profileModal.classList.add('hidden');
  });
}

/* ============================================================================
   10. INICIALIZACIÓN DE LA APLICACIÓN SPA
   ============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  updateHUD();
  renderDailyQuests();
  initEvents();
  selectGroup(appState.selectedGroup);
});
