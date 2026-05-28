(() => {
  const CIRC = 2 * Math.PI * 73.5;
  const storagePrefix = `imenu:${location.pathname}:`;
  const cookTimerKey = `${storagePrefix}cookTimer`;
  const chipTimerPrefix = `${storagePrefix}chipTimer:`;

  let total = 0;
  let remaining = 0;
  let running = false;
  let intervalId = null;
  let deadline = null;
  let doneDeadline = null;
  let currentStep = null;

  const chipTimers = {};

  function el(id) {
    return document.getElementById(id);
  }

  function sessionGet(key) {
    try { return sessionStorage.getItem(key); } catch(e) { return null; }
  }

  function sessionSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch(e) {}
  }

  function sessionRemove(key) {
    try { sessionStorage.removeItem(key); } catch(e) {}
  }

  function beepOnce() {
    if (typeof window.beep === 'function') window.beep();
  }

  function fmtT(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    return String(Math.floor(safeSeconds / 60)).padStart(2, '0') + ':' + String(safeSeconds % 60).padStart(2, '0');
  }

  function fmtClock(ts) {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function updateRing() {
    const ring = el('cm-ring');
    if (!ring) return;
    const progress = total > 0 ? remaining / total : 1;
    ring.style.strokeDashoffset = CIRC * (1 - progress);
    ring.classList.toggle('done', remaining === 0 && total > 0);
  }

  function updateTimerMeta() {
    const meta = el('cm-tmeta');
    if (!meta) return;

    if (running && deadline) {
      meta.textContent = `termina às ${fmtClock(deadline)}`;
    } else if (remaining === 0 && doneDeadline) {
      meta.textContent = `terminou às ${fmtClock(doneDeadline)}`;
    } else if (total > 0) {
      meta.textContent = 'termina às --:--';
    } else {
      meta.textContent = '';
    }
  }

  function setDisplay(seconds) {
    remaining = Math.max(0, Math.ceil(seconds));
    const text = el('cm-ttext');
    if (text) text.textContent = fmtT(remaining);
    updateRing();
    updateTimerMeta();
  }

  function saveCookTimer() {
    if (!total || currentStep === null) return;
    sessionSet(cookTimerKey, JSON.stringify({
      step: currentStep,
      total,
      remaining,
      running,
      deadline,
      doneDeadline
    }));
  }

  function stopStepTimer(options = {}) {
    clearInterval(intervalId);
    intervalId = null;
    running = false;
    deadline = null;
    if (options.clearStorage) sessionRemove(cookTimerKey);
  }

  function clearStepTimer() {
    stopStepTimer({ clearStorage: true });
    total = 0;
    remaining = 0;
    doneDeadline = null;
    currentStep = null;
  }

  function finishCookTimer(shouldBeep = true) {
    const finishedAt = deadline || Date.now();
    stopStepTimer({ clearStorage: true });
    doneDeadline = finishedAt;
    setDisplay(0);

    const btn = el('cm-playbtn');
    const label = el('cm-tlabel');
    if (btn) btn.textContent = '✓ Pronto';
    if (label) label.textContent = 'concluído!';
    if (shouldBeep) beepOnce();
  }

  function tickTimer(shouldBeep = true) {
    if (!running || !deadline) return;

    const secondsLeft = Math.ceil((deadline - Date.now()) / 1000);
    if (secondsLeft <= 0) {
      finishCookTimer(shouldBeep);
      return;
    }

    setDisplay(secondsLeft);
    saveCookTimer();
  }

  function startCookInterval() {
    clearInterval(intervalId);
    intervalId = setInterval(() => tickTimer(true), 1000);
  }

  function restoreCookTimer(stepIndex, timerSeconds) {
    const raw = sessionGet(cookTimerKey);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);
      if (Number(data.step) !== Number(stepIndex) || Number(data.total) !== Number(timerSeconds)) return false;

      currentStep = stepIndex;
      total = Number(timerSeconds);
      doneDeadline = data.doneDeadline || null;

      const btn = el('cm-playbtn');
      const label = el('cm-tlabel');

      if (data.running && data.deadline) {
        deadline = Number(data.deadline);
        running = true;
        if (btn) btn.textContent = '⏸ Pausar';
        if (label) label.textContent = 'restante';

        const secondsLeft = Math.ceil((deadline - Date.now()) / 1000);
        if (secondsLeft <= 0) {
          finishCookTimer(false);
        } else {
          setDisplay(secondsLeft);
          startCookInterval();
        }
        return true;
      }

      running = false;
      deadline = null;
      const savedRemaining = Number(data.remaining);
      remaining = Number.isFinite(savedRemaining) ? Math.max(0, savedRemaining) : timerSeconds;
      setDisplay(remaining);
      if (btn) btn.textContent = remaining === 0 ? '✓ Pronto' : '▶ Continuar';
      if (label) label.textContent = remaining === 0 ? 'concluído!' : 'restante';
      return true;
    } catch(e) {
      sessionRemove(cookTimerKey);
      return false;
    }
  }

  function prepareStepTimer(timerSeconds, stepIndex) {
    stopStepTimer({ clearStorage: false });
    total = Number(timerSeconds);
    remaining = total;
    running = false;
    deadline = null;
    doneDeadline = null;
    currentStep = stepIndex;

    const btn = el('cm-playbtn');
    const label = el('cm-tlabel');
    if (btn) btn.textContent = '▶ Iniciar';
    if (label) label.textContent = 'restante';
    setDisplay(remaining);
    restoreCookTimer(stepIndex, timerSeconds);
  }

  function toggleTimer() {
    if (!total) return;
    if (remaining === 0) {
      resetTimer();
      return;
    }

    const btn = el('cm-playbtn');
    const label = el('cm-tlabel');

    if (running) {
      tickTimer(false);
      stopStepTimer({ clearStorage: false });
      if (btn) btn.textContent = '▶ Continuar';
      if (label) label.textContent = 'restante';
      setDisplay(remaining);
      saveCookTimer();
      return;
    }

    deadline = Date.now() + remaining * 1000;
    doneDeadline = null;
    running = true;
    if (btn) btn.textContent = '⏸ Pausar';
    if (label) label.textContent = 'restante';
    setDisplay(remaining);
    saveCookTimer();
    startCookInterval();
  }

  function resetTimer() {
    stopStepTimer({ clearStorage: true });
    doneDeadline = null;
    remaining = total;
    setDisplay(remaining);

    const btn = el('cm-playbtn');
    const label = el('cm-tlabel');
    if (btn) btn.textContent = '▶ Iniciar';
    if (label) label.textContent = 'restante';
  }

  function getSavedStep() {
    const raw = sessionGet(cookTimerKey);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      return Number.isFinite(Number(data.step)) ? Number(data.step) : null;
    } catch(e) {
      sessionRemove(cookTimerKey);
      return null;
    }
  }

  function chipKey(label) {
    return chipTimerPrefix + encodeURIComponent(label);
  }

  function setChipActiveStyle(btn) {
    btn.style.cssText = 'background:var(--terracotta);color:var(--cream);border-color:var(--terracotta)';
  }

  function setChipDoneStyle(btn) {
    btn.style.cssText = 'background:#4A5C1A;color:var(--cream);border-color:#4A5C1A';
  }

  function clearChipTimer(label, removeStorage = true) {
    const state = chipTimers[label];
    if (state && state.intervalId) clearInterval(state.intervalId);
    delete chipTimers[label];
    if (removeStorage) sessionRemove(chipKey(label));
  }

  function saveChipTimer(label) {
    const state = chipTimers[label];
    if (!state) return;
    sessionSet(chipKey(label), JSON.stringify({
      label,
      sec: state.sec,
      deadline: state.deadline
    }));
  }

  function finishChip(label, shouldBeep = true) {
    const state = chipTimers[label];
    if (!state) return;

    clearChipTimer(label, true);
    state.btn.textContent = `✓ ${label} — Pronto!`;
    setChipDoneStyle(state.btn);
    if (shouldBeep) beepOnce();
  }

  function tickChip(label, shouldBeep = true) {
    const state = chipTimers[label];
    if (!state) return;

    const secondsLeft = Math.ceil((state.deadline - Date.now()) / 1000);
    if (secondsLeft <= 0) {
      finishChip(label, shouldBeep);
      return;
    }

    state.btn.textContent = `⏱ ${label} — ${fmtT(secondsLeft)}`;
    saveChipTimer(label);
  }

  function startChip(btn, sec, label) {
    if (!btn.dataset.timerIdleText) btn.dataset.timerIdleText = btn.textContent;
    clearChipTimer(label, false);

    chipTimers[label] = {
      btn,
      sec: Number(sec),
      label,
      deadline: Date.now() + Number(sec) * 1000,
      intervalId: null
    };

    setChipActiveStyle(btn);
    btn.onclick = () => cancelChip(btn, Number(sec), label);
    tickChip(label, false);
    chipTimers[label].intervalId = setInterval(() => tickChip(label, true), 1000);
  }

  function cancelChip(btn, sec, label) {
    clearChipTimer(label, true);
    btn.textContent = btn.dataset.timerIdleText || `⏱ Timer ${Math.round(Number(sec) / 60)} min`;
    btn.style.cssText = '';
    btn.onclick = () => startChip(btn, Number(sec), label);
  }

  function parseChipLabel(btn) {
    const attr = btn.getAttribute('onclick') || '';
    const match = attr.match(/startChip\(this,\s*[^,]+,\s*'([^']+)'\)/);
    return match ? match[1] : null;
  }

  function restoreChipTimers() {
    document.querySelectorAll('.timer-chip').forEach((btn) => {
      if (!btn.dataset.timerIdleText) btn.dataset.timerIdleText = btn.textContent;

      const label = parseChipLabel(btn);
      if (!label) return;

      const raw = sessionGet(chipKey(label));
      if (!raw) return;

      try {
        const data = JSON.parse(raw);
        const sec = Number(data.sec);
        const savedDeadline = Number(data.deadline);
        if (!sec || !savedDeadline) {
          sessionRemove(chipKey(label));
          return;
        }

        if (Math.ceil((savedDeadline - Date.now()) / 1000) <= 0) {
          sessionRemove(chipKey(label));
          btn.textContent = `✓ ${label} — Pronto!`;
          setChipDoneStyle(btn);
          btn.onclick = () => cancelChip(btn, sec, label);
          return;
        }

        chipTimers[label] = { btn, sec, label, deadline: savedDeadline, intervalId: null };
        setChipActiveStyle(btn);
        btn.onclick = () => cancelChip(btn, sec, label);
        tickChip(label, false);
        chipTimers[label].intervalId = setInterval(() => tickChip(label, true), 1000);
      } catch(e) {
        sessionRemove(chipKey(label));
      }
    });
  }

  function refreshChipTimers() {
    Object.keys(chipTimers).forEach((label) => tickChip(label, true));
  }

  function syncTimers() {
    tickTimer(true);
    refreshChipTimers();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncTimers();
  });
  window.addEventListener('focus', syncTimers);
  window.addEventListener('pageshow', syncTimers);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreChipTimers);
  } else {
    restoreChipTimers();
  }

  window.RecipeTimers = {
    prepareStepTimer,
    stopStepTimer,
    clearStepTimer,
    getSavedStep,
    sync: syncTimers
  };
  window.fmtT = fmtT;
  window.toggleTimer = toggleTimer;
  window.resetTimer = resetTimer;
  window.startChip = startChip;
  window.cancelChip = cancelChip;
})();
