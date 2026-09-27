/* ===========================================================
   Ritu — "your body has its seasons"
   Vanilla HTML + CSS + JS only. No frameworks, no build step.
   Behaviours required by the brief:
     - GET something from the internet  -> USDA Nutrition API,
       Sunrise & Sunset API, Google Gemini API (chat + recipes),
       Wikipedia API (phase articles + condition lookup)
     - REMEMBER something                -> localStorage (profile,
       logs, cycle history, chat, settings)
     - REACT to time                     -> live cycle day / phase /
       countdown / déjà-vu pattern recall, all computed from dates
   =========================================================== */

(() => {
  "use strict";

  const PET_NAME = "Mottu";

  const LS_KEYS = {
    profile: "ritu_profile",
    logs: "ritu_logs",
    cycles: "ritu_cycles",
    settings: "ritu_settings",
    chat: "ritu_chat",
  };

  const PHASE_META = {
    menstrual:  { season: "Winter", badge: "🌰", label: "Menstrual · Winter" },
    follicular: { season: "Spring", badge: "🌱", label: "Follicular · Spring" },
    ovulation:  { season: "Summer", badge: "🌸", label: "Ovulation · Summer" },
    luteal:     { season: "Autumn", badge: "🍂", label: "Luteal · Autumn" },
  };

  const NUTRITION = {
    menstrual: {
      blurb: "Your body is losing iron right now — food that replaces it and eases cramps helps most.",
      foods: [
        { emoji: "🥬", name: "Spinach & greens", why: "iron, replaces what you're losing" },
        { emoji: "🍫", name: "Dark chocolate", why: "magnesium, eases cramps" },
        { emoji: "🍲", name: "Warm lentil soup", why: "iron + protein, gentle on the stomach" },
        { emoji: "🍌", name: "Bananas", why: "potassium, settles bloating" },
      ],
    },
    follicular: {
      blurb: "Energy is quietly rebuilding as estrogen rises — good window for protein and fresh food.",
      foods: [
        { emoji: "🥚", name: "Eggs", why: "protein to rebuild energy" },
        { emoji: "🥦", name: "Broccoli", why: "supports rising estrogen" },
        { emoji: "🍓", name: "Berries", why: "antioxidants for new energy" },
        { emoji: "🌰", name: "Nuts & seeds", why: "steady, slow-burning fuel" },
      ],
    },
    ovulation: {
      blurb: "This is your fertile window. If you're avoiding pregnancy, use protection or abstain around now; if you're trying to conceive, this is your best window. Either way — you may feel warmer, so drink a little extra water.",
      foods: [
        { emoji: "🐟", name: "Salmon", why: "omega-3s support hormone balance" },
        { emoji: "🥑", name: "Avocado", why: "healthy fats" },
        { emoji: "🥕", name: "Carrots", why: "fibre, keeps energy steady" },
        { emoji: "💧", name: "Extra water", why: "body temperature runs slightly higher now" },
      ],
    },
    luteal: {
      blurb: "PMS territory — cravings are real. Complex carbs and magnesium help more than willpower does.",
      foods: [
        { emoji: "🍠", name: "Sweet potato", why: "complex carbs for cravings" },
        { emoji: "🌰", name: "Magnesium-rich nuts", why: "eases tension & irritability" },
        { emoji: "🍵", name: "Chamomile tea", why: "calms, helps sleep" },
        { emoji: "🍫", name: "A little dark chocolate", why: "the craving is real — in moderation" },
      ],
    },
  };

  const COMFORT_WORDS = {
    menstrual: ["Rest is productive too.", "Slow days are allowed.", "Be as gentle with yourself as you'd be with a friend.", "It's okay to do less today."],
    follicular: ["Your energy is coming back — enjoy it.", "A good day to start something new.", "Small steps forward count.", "You're rebuilding, quietly and well."],
    ovulation: ["You're glowing — literally, hormonally.", "Confidence suits you right now.", "This is often your sharpest, brightest window.", "Ride this energy while it's here."],
    luteal: ["Cravings aren't a character flaw.", "Irritable days pass.", "You're allowed to say no to plans today.", "Winter's coming — start winding down."],
  };

  const PHASE_WIKI = {
    menstrual: "Menstruation",
    follicular: "Follicular phase",
    ovulation: "Ovulation",
    luteal: "Luteal phase",
  };

  const COMFORT_TIPS = {
    menstrual: ["A hot water bottle on your lower belly", "Gentle stretching or a child's pose", "An extra hour of sleep tonight", "A warm bath before bed"],
    follicular: ["A short walk outside", "Try something new today — energy is on your side", "Light exercise, your body can handle more now"],
    ovulation: ["Drink a little extra water, you're running warmer", "Good day for a workout or social plans", "Wear something that makes you feel good"],
    luteal: ["A weighted blanket and an early night", "Journaling if you're feeling low", "It's okay to say no to plans you don't have energy for", "Herbal tea and a quiet evening"],
  };

  const PET_MOOD = {
    menstrual: { title: "Resting", desc: `${PET_NAME} is curled up and quiet today, just like you might want to be.` },
    follicular: { title: "Sprouting", desc: `${PET_NAME} is stretching out new leaves as your energy returns.` },
    ovulation: { title: "Blooming", desc: `${PET_NAME} is in full bloom right now — your brightest, most social window.` },
    luteal: { title: "Settling in", desc: `${PET_NAME} is winding down and craving comfort before winter returns.` },
  };

  const DEFAULT_COORDS = { lat: 13.0827, lng: 80.2707 }; // Chennai fallback

  /* ---------------- storage helpers ---------------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    },
  };

  let profile = store.get(LS_KEYS.profile, null);
  let logs = store.get(LS_KEYS.logs, {});           // { "YYYY-MM-DD": {flow,mood,symptoms[],notes} }
  let cycles = store.get(LS_KEYS.cycles, []);        // [{start,end,length}]
  let settings = store.get(LS_KEYS.settings, { geminiKey: "", usdaKey: "", demoOffsetDays: 0 });
  let chatHistory = store.get(LS_KEYS.chat, []);

  const saveProfile = () => store.set(LS_KEYS.profile, profile);
  const saveLogs = () => store.set(LS_KEYS.logs, logs);
  const saveCycles = () => store.set(LS_KEYS.cycles, cycles);
  const saveSettings = () => store.set(LS_KEYS.settings, settings);
  const saveChat = () => store.set(LS_KEYS.chat, chatHistory);

  /* ---------------- date helpers ---------------- */
  function atMidnight(d) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
  function dateKey(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
  function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
  function diffDays(a, b) { return Math.round((atMidnight(a) - atMidnight(b)) / 86400000); }
  function virtualToday() { return atMidnight(addDays(new Date(), settings.demoOffsetDays || 0)); }
  function fmtDate(d) { return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); }

  /* ---------------- cycle math ---------------- */
  function cycleDayFor(date) {
    const cl = profile.cycleLength;
    const start = parseKey(profile.lastPeriodStart);
    let diff = diffDays(date, start) % cl;
    if (diff < 0) diff += cl;
    return diff + 1;
  }
  function phaseBounds() {
    const cl = profile.cycleLength, pl = profile.periodLength;
    const ovulationDay = Math.min(cl - 1, Math.max(pl + 3, cl - 14));
    const fertileStart = Math.max(pl + 1, ovulationDay - 5);
    const fertileEnd = Math.min(cl, ovulationDay + 1);
    return { ovulationDay, fertileStart, fertileEnd };
  }
  function phaseForDay(cycleDay) {
    const { fertileStart, fertileEnd } = phaseBounds();
    if (cycleDay <= profile.periodLength) return "menstrual";
    if (cycleDay < fertileStart) return "follicular";
    if (cycleDay <= fertileEnd) return "ovulation";
    return "luteal";
  }
  function cycleInfoFor(date) {
    const cycleDay = cycleDayFor(date);
    const phase = phaseForDay(cycleDay);
    const cl = profile.cycleLength;
    const daysUntilNext = cl - cycleDay + 1;
    return { cycleDay, phase, daysUntilNext };
  }

  function averageCycleLength() {
    if (cycles.length === 0) return profile.cycleLength;
    const sum = cycles.reduce((a, c) => a + c.length, 0);
    return Math.round((sum / cycles.length) * 10) / 10;
  }

  /* ---------------- déjà vu pattern recall ---------------- */
  function findDejaVu(today) {
    const { cycleDay } = cycleInfoFor(today);
    for (let i = cycles.length - 1; i >= 0; i--) {
      const c = cycles[i];
      const start = parseKey(c.start);
      for (const delta of [0, -1, 1]) {
        const targetDay = cycleDay + delta;
        if (targetDay < 1 || targetDay > c.length) continue;
        const key = dateKey(addDays(start, targetDay - 1));
        const entry = logs[key];
        if (entry && ((entry.symptoms && entry.symptoms.length) || (entry.mood && entry.mood !== "calm"))) {
          const thing = (entry.symptoms && entry.symptoms[0]) || entry.mood;
          return `Last cycle, around day ${targetDay}, you logged "${thing}" too. Want to go easy today?`;
        }
      }
    }
    return null;
  }

  /* ---------------- sky state (sunrise/sunset) ---------------- */
  let skyState = null; // {sunrise: Date, sunset: Date, isNight: bool}

  function fetchSky() {
    const useCoords = (lat, lng) => {
      const today = new Date();
      const iso = today.toISOString().slice(0, 10);
      fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0&date=${iso}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status !== "OK") return;
          const sunrise = new Date(data.results.sunrise);
          const sunset = new Date(data.results.sunset);
          const now = new Date();
          skyState = { sunrise, sunset, isNight: now < sunrise || now > sunset };
          renderMottuTab();
          renderHome();
        })
        .catch(() => {});
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => useCoords(pos.coords.latitude, pos.coords.longitude),
        () => useCoords(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng),
        { timeout: 4000 }
      );
    } else {
      useCoords(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng);
    }
  }

  /* ---------------- toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }

  /* ===========================================================
     ONBOARDING
     =========================================================== */
  const tempProfile = {};
  let obStep = 0;

  function initOnboarding() {
    const steps = Array.from(document.querySelectorAll(".ob-step"));
    const fill = document.getElementById("stepFill");

    function show(i) {
      steps.forEach((s) => (s.hidden = Number(s.dataset.step) !== i));
      fill.style.width = `${(i / (steps.length - 1)) * 100}%`;
      obStep = i;
    }

    document.querySelectorAll(".ob-step [data-next]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (obStep < steps.length - 1) show(obStep + 1);
      });
    });
    document.querySelectorAll(".ob-step [data-back]").forEach((btn) => {
      btn.addEventListener("click", () => { if (obStep > 0) show(obStep - 1); });
    });

    // step 1: age group
    const ageGrid = document.querySelector('[data-field="ageGroup"]');
    ageGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      ageGrid.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected"));
      btn.classList.add("selected");
      tempProfile.ageGroup = btn.dataset.value;
      ageGrid.closest(".ob-step").querySelector("[data-next]").disabled = false;
    });

    // step 2: cycle length + irregular + goal
    const cycleRange = document.getElementById("cycleLengthRange");
    const cycleVal = document.getElementById("cycleLengthValue");
    tempProfile.cycleLength = Number(cycleRange.value);
    cycleRange.addEventListener("input", () => {
      cycleVal.textContent = cycleRange.value;
      tempProfile.cycleLength = Number(cycleRange.value);
    });
    const irregularCheck = document.getElementById("irregularCheck");
    const goalWrap = document.getElementById("goalWrap");
    irregularCheck.addEventListener("change", () => {
      tempProfile.irregular = irregularCheck.checked;
      goalWrap.hidden = !irregularCheck.checked;
    });
    document.getElementById("goalText").addEventListener("input", (e) => {
      tempProfile.goal = e.target.value;
    });

    // step 3: period length
    const plRange = document.getElementById("periodLengthRange");
    const plVal = document.getElementById("periodLengthValue");
    tempProfile.periodLength = Number(plRange.value);
    plRange.addEventListener("input", () => {
      plVal.textContent = plRange.value;
      tempProfile.periodLength = Number(plRange.value);
    });

    // step 4: last period date
    const lastPeriodInput = document.getElementById("lastPeriodInput");
    lastPeriodInput.max = dateKey(new Date());
    lastPeriodInput.addEventListener("input", () => {
      tempProfile.lastPeriodStart = lastPeriodInput.value;
      lastPeriodInput.closest(".ob-step").querySelector("[data-next]").disabled = !lastPeriodInput.value;
    });

    // step 5: name + finish
    document.getElementById("nameInput").addEventListener("input", (e) => {
      tempProfile.name = e.target.value.trim();
    });
    document.getElementById("finishOnboarding").addEventListener("click", () => {
      profile = {
        ageGroup: tempProfile.ageGroup || "18-24",
        cycleLength: tempProfile.cycleLength || 28,
        periodLength: tempProfile.periodLength || 5,
        irregular: !!tempProfile.irregular,
        goal: tempProfile.goal || "",
        lastPeriodStart: tempProfile.lastPeriodStart || dateKey(new Date()),
        name: tempProfile.name || "friend",
        onboarded: true,
      };
      saveProfile();
      document.getElementById("onboarding").hidden = true;
      document.getElementById("app").hidden = false;
      bootApp();
    });

    show(0);
  }

  /* ===========================================================
     TABS
     =========================================================== */
  function initTabs() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });
    document.querySelectorAll("[data-tab-jump]").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tabJump));
    });
  }
  function switchTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.dataset.view === name));
  }

  /* ===========================================================
     HOME
     =========================================================== */
  function renderHome() {
    const today = virtualToday();
    const { cycleDay, phase, daysUntilNext } = cycleInfoFor(today);
    const meta = PHASE_META[phase];

    document.body.className = `phase-${phase}`;
    document.getElementById("seasonLabel").textContent = meta.label;
    document.getElementById("cycleDayText").textContent = `Day ${cycleDay} of your cycle`;

    const fertilityNote = phase === "ovulation"
      ? " This is your fertile window — if avoiding pregnancy, take precautions."
      : "";
    const descByPhase = {
      menstrual: `${profile.name}, you're in Winter — day ${cycleDay} of shedding and rest. Be gentle with yourself.`,
      follicular: `Spring is here — day ${cycleDay}. Energy is quietly building back up.`,
      ovulation: `Summer — day ${cycleDay} of your cycle.${fertilityNote}`,
      luteal: `Autumn — day ${cycleDay}. Things may slow down again before winter returns.`,
    };
    document.getElementById("seasonDesc").textContent = descByPhase[phase];
    document.getElementById("nextPeriodCountdown").textContent = `${daysUntilNext}d`;
    document.getElementById("fertileChip").hidden = phase !== "ovulation";

    // pet preview
    const mood = PET_MOOD[phase];
    document.getElementById("petBadgeHome").textContent = meta.badge;
    document.getElementById("petLineHome").textContent = mood.desc;

    // déjà vu
    const dv = findDejaVu(today);
    document.getElementById("dejavuCard").hidden = !dv;
    if (dv) document.getElementById("dejavuText").textContent = dv;

    renderMiniCal(today);
  }

  function renderMiniCal(today) {
    const strip = document.getElementById("miniCalStrip");
    strip.innerHTML = "";
    for (let i = -3; i <= 3; i++) {
      const d = addDays(today, i);
      const { cycleDay, phase } = cycleInfoFor(d);
      const isPeriod = cycleDay <= profile.periodLength;
      const isFertile = phase === "ovulation";
      const div = document.createElement("div");
      div.className = "mini-day" + (i === 0 ? " today" : "");
      div.innerHTML = `
        <div class="dow">${d.toLocaleDateString(undefined, { weekday: "short" })}</div>
        <div class="num">${d.getDate()}</div>
        <div class="flag">${isPeriod ? "🩸" : isFertile ? "🌟" : "&nbsp;"}</div>
      `;
      div.addEventListener("click", () => { switchTab("calendar"); openDay(dateKey(d)); });
      strip.appendChild(div);
    }
  }

  /* ===========================================================
     CALENDAR
     =========================================================== */
  let calViewDate = null; // first-of-month Date
  let selectedDayKey = null;
  const dayDraft = { flow: "none", mood: null, symptoms: [] };

  function initCalendar() {
    document.getElementById("calPrev").addEventListener("click", () => {
      calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1);
      renderCalendar();
    });
    document.getElementById("calNext").addEventListener("click", () => {
      calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1);
      renderCalendar();
    });
    document.querySelectorAll(".pill-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        const pill = e.target.closest(".pill");
        if (!pill) return;
        const field = row.dataset.field;
        const val = pill.dataset.value;
        if (row.dataset.multi) {
          pill.classList.toggle("selected");
          dayDraft.symptoms = Array.from(row.querySelectorAll(".pill.selected")).map((p) => p.dataset.value);
        } else {
          row.querySelectorAll(".pill").forEach((p) => p.classList.remove("selected"));
          pill.classList.add("selected");
          dayDraft[field] = val;
        }
      });
    });
    document.getElementById("saveLogBtn").addEventListener("click", saveCurrentDayLog);
    document.getElementById("markPeriodStartBtn").addEventListener("click", markPeriodStart);
    document.getElementById("logTodayBtn").addEventListener("click", () => {
      switchTab("calendar");
      const key = dateKey(virtualToday());
      calViewDate = new Date(virtualToday().getFullYear(), virtualToday().getMonth(), 1);
      renderCalendar();
      openDay(key);
    });
  }

  function renderCalendar() {
    if (!calViewDate) calViewDate = new Date(virtualToday().getFullYear(), virtualToday().getMonth(), 1);
    const y = calViewDate.getFullYear(), m = calViewDate.getMonth();
    document.getElementById("calMonthLabel").textContent = calViewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    const grid = document.getElementById("calGrid");
    grid.innerHTML = "";
    const firstWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = virtualToday();

    for (let i = 0; i < firstWeekday; i++) {
      const empty = document.createElement("div");
      empty.className = "cal-cell empty";
      grid.appendChild(empty);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, m, day);
      const key = dateKey(d);
      const { cycleDay, phase } = cycleInfoFor(d);
      const entry = logs[key];
      const cell = document.createElement("div");
      const classes = ["cal-cell"];
      if (dateKey(today) === key) classes.push("today");

      const loggedFlow = entry && entry.flow && entry.flow !== "none";
      if (loggedFlow) classes.push("period");
      else if (cycleDay <= profile.periodLength) classes.push("predicted");
      else if (phase === "ovulation") classes.push("fertile");

      cell.className = classes.join(" ");
      cell.innerHTML = `${day}${entry ? '<span class="dot-mark"></span>' : ""}`;
      cell.addEventListener("click", () => openDay(key));
      grid.appendChild(cell);
    }
  }

  function openDay(key) {
    selectedDayKey = key;
    const d = parseKey(key);
    document.getElementById("dayDetail").hidden = false;
    document.getElementById("dayDetailTitle").textContent = fmtDate(d);

    const entry = logs[key] || { flow: "none", mood: null, symptoms: [], notes: "" };
    dayDraft.flow = entry.flow || "none";
    dayDraft.mood = entry.mood || null;
    dayDraft.symptoms = entry.symptoms ? [...entry.symptoms] : [];

    document.querySelectorAll('.pill-row[data-field="flow"] .pill').forEach((p) =>
      p.classList.toggle("selected", p.dataset.value === dayDraft.flow));
    document.querySelectorAll('.pill-row[data-field="mood"] .pill').forEach((p) =>
      p.classList.toggle("selected", p.dataset.value === dayDraft.mood));
    document.querySelectorAll('.pill-row[data-field="symptoms"] .pill').forEach((p) =>
      p.classList.toggle("selected", dayDraft.symptoms.includes(p.dataset.value)));
    document.getElementById("dayNotes").value = entry.notes || "";

    document.getElementById("dayDetail").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function saveCurrentDayLog() {
    if (!selectedDayKey) return;
    logs[selectedDayKey] = {
      flow: dayDraft.flow || "none",
      mood: dayDraft.mood,
      symptoms: dayDraft.symptoms,
      notes: document.getElementById("dayNotes").value.trim(),
      ts: Date.now(),
    };
    saveLogs();
    renderCalendar();
    renderHome();
    renderInsights();
    toast("Saved 🌱");
  }

  function markPeriodStart() {
    if (!selectedDayKey) return;
    const newStart = selectedDayKey;
    const oldStart = profile.lastPeriodStart;
    const length = diffDays(parseKey(newStart), parseKey(oldStart));
    if (length > 10 && length < 90) {
      cycles.push({ start: oldStart, end: newStart, length });
      saveCycles();
    }
    profile.lastPeriodStart = newStart;
    saveProfile();
    if (!logs[newStart]) logs[newStart] = { flow: "medium", mood: null, symptoms: [], notes: "" };
    else logs[newStart].flow = logs[newStart].flow === "none" ? "medium" : logs[newStart].flow;
    saveLogs();
    renderCalendar();
    renderHome();
    renderInsights();
    toast("New cycle marked 🌰");
  }

  /* ===========================================================
     MOTTU — pet detail tab
     =========================================================== */
  function renderMottuTab() {
    const today = virtualToday();
    const { phase } = cycleInfoFor(today);
    const meta = PHASE_META[phase];
    const mood = PET_MOOD[phase];

    document.getElementById("petBadgeBig").textContent = meta.badge;
    document.getElementById("petMoodTitle").textContent = mood.title;
    document.getElementById("petMoodDesc").textContent = mood.desc;

    const foods = NUTRITION[phase].foods;
    const dayIndex = Math.abs(hashStr(dateKey(today))) % foods.length;
    document.getElementById("petHungerFood").textContent = `${foods[dayIndex].emoji} ${foods[dayIndex].name}`;

    if (skyState) {
      document.getElementById("petSkyState").textContent = skyState.isNight ? "🌌 Nightfall — Mottu is getting sleepy" : "☀️ Daytime — Mottu is out and about";
    } else {
      document.getElementById("petSkyState").textContent = "Checking the sky…";
    }

    const words = COMFORT_WORDS[phase];
    const wordIndex = Math.abs(hashStr(dateKey(today) + phase)) % words.length;
    document.getElementById("comfortWordText").textContent = words[wordIndex];

    document.getElementById("chatHint").hidden = !!settings.geminiKey;
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return h;
  }

  /* ===========================================================
     FLOATING PET WIDGET (fab + cloud chat)
     =========================================================== */
  function initPetWidget() {
    const fab = document.getElementById("petFab");
    const cloud = document.getElementById("petCloud");
    const openCloud = () => {
      cloud.hidden = false;
      renderCloudMood();
      const log = document.getElementById("chatLog");
      log.scrollTop = log.scrollHeight;
    };
    fab.addEventListener("click", () => {
      cloud.hidden = !cloud.hidden;
      if (!cloud.hidden) openCloud();
    });
    document.getElementById("closeCloud").addEventListener("click", () => { cloud.hidden = true; });
    document.getElementById("openChatFromTab").addEventListener("click", openCloud);
  }

  /* ---------------- 3D pet tilt (pointer-driven, works for mouse + touch) ---------------- */
  function initPetTilt() {
    document.querySelectorAll(".pet-3d").forEach((el) => {
      const img = el.querySelector(".pet-img");
      const shadow = el.querySelector(".pet-shadow");
      if (!img) return;

      function tiltTo(clientX, clientY) {
        const rect = el.getBoundingClientRect();
        const px = (clientX - rect.left) / rect.width;
        const py = (clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 34;
        const rotateX = (0.5 - py) * 28;
        el.classList.add("tilting");
        img.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg) translateZ(10px) scale(1.06)`;
        if (shadow) shadow.style.transform = `translateX(calc(-50% + ${(px - 0.5) * -14}px)) scale(${1 - Math.abs(px - 0.5) * 0.3})`;
      }
      function release() {
        el.classList.remove("tilting");
        img.style.transform = "";
        if (shadow) shadow.style.transform = "";
      }

      el.addEventListener("pointermove", (e) => tiltTo(e.clientX, e.clientY));
      el.addEventListener("pointerdown", (e) => tiltTo(e.clientX, e.clientY));
      el.addEventListener("pointerleave", release);
      el.addEventListener("pointerup", () => setTimeout(release, 350));
    });
  }

  function renderCloudMood() {
    const today = virtualToday();
    const { phase } = cycleInfoFor(today);
    document.getElementById("cloudMoodLine").textContent = PET_MOOD[phase].title;
  }

  /* ===========================================================
     CHAT + RECIPE GENERATION (Gemini)
     =========================================================== */
  function appendBubble(role, text) {
    const log = document.getElementById("chatLog");
    const div = document.createElement("div");
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function renderChatLog() {
    const log = document.getElementById("chatLog");
    log.innerHTML = "";
    if (chatHistory.length === 0) {
      chatHistory.push({ role: "pet", text: `Hi ${profile.name}, I'm ${PET_NAME} 🌱 — ask me anything about your diet, your symptoms, or how you're feeling today. I can also cook up a recipe idea for today if you tap the button below.` });
      saveChat();
    }
    chatHistory.forEach((m) => appendBubble(m.role, m.text));
  }

  async function sendUserMessage(text) {
    chatHistory.push({ role: "user", text });
    appendBubble("user", text);
    saveChat();

    const thinking = appendBubble("pet", "…");
    const reply = await getMottuReply(text);
    thinking.textContent = reply;
    chatHistory.push({ role: "pet", text: reply });
    if (chatHistory.length > 60) chatHistory = chatHistory.slice(-60);
    saveChat();
  }

  function initChat() {
    document.getElementById("chatForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("chatInput");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      sendUserMessage(text);
    });
    document.getElementById("recipeBtn").addEventListener("click", generateRecipe);
    document.getElementById("comfortBtn").addEventListener("click", generateComfort);
    renderChatLog();
  }

  /* --- Comfort ideas: local curated tips, optionally warmed up by Gemini --- */
  async function generateComfort() {
    const today = virtualToday();
    const { phase } = cycleInfoFor(today);
    const tips = COMFORT_TIPS[phase];
    const firstIndex = Math.abs(hashStr(dateKey(today))) % tips.length;
    const secondIndex = (firstIndex + 1 + (Math.abs(hashStr(dateKey(today) + "b")) % (tips.length - 1))) % tips.length;
    const picks = [tips[firstIndex], tips[secondIndex]];

    appendBubble("user", "🕯️ Comfort ideas for today");
    chatHistory.push({ role: "user", text: "🕯️ Comfort ideas for today" });
    const thinking = appendBubble("pet", "Thinking of something cozy...");

    let reply = `For your ${phase} phase today, try:\n- ${picks[0]}\n- ${picks[1]}`;
    if (settings.geminiKey) {
      const prompt = `You are ${PET_NAME}, a warm comfort companion in a period-tracking app. The user is in the ${phase} phase of their cycle (menstrual=winter, follicular=spring, ovulation=summer, luteal=autumn). In under 50 words, gently suggest 2-3 non-food comfort or self-care ideas suited to this phase, in a warm caring tone, plain text, no markdown.`;
      try {
        const text = await callGemini(prompt);
        if (text) reply = text;
      } catch { /* keep local fallback */ }
    }

    thinking.textContent = reply;
    chatHistory.push({ role: "pet", text: reply });
    if (chatHistory.length > 60) chatHistory = chatHistory.slice(-60);
    saveChat();
  }

  async function getMottuReply(userMessage) {
    const today = virtualToday();
    const { cycleDay, phase } = cycleInfoFor(today);
    const goalLine = profile.irregular && profile.goal ? `They want help with: ${profile.goal}.` : "";

    if (settings.geminiKey) {
      const prompt = `You are ${PET_NAME}, a warm, gentle little comfort companion (a small sprouting-plant character) inside a period-tracking app called Ritu. The user's name is ${profile.name}. They are on day ${cycleDay} of their cycle, in the ${phase} phase (menstrual=winter, follicular=spring, ovulation=summer, luteal=autumn — your own mood grows through these same seasons). Their average cycle length is ${profile.cycleLength} days. ${goalLine} Speak like a caring close friend — brief, warm, never clinical or robotic. You may suggest gentle nutrition or self-care ideas suited to their current phase, but make clear you are not a doctor and encourage seeing one for anything serious or persistent. Keep replies under 80 words.\n\nUser: ${userMessage}`;
      try {
        const text = await callGemini(prompt);
        if (text) return text;
      } catch { /* fall through to canned reply */ }
    }
    return cannedReply(userMessage, phase);
  }

  async function callGemini(prompt) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(settings.geminiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.trim() : null;
  }

  function cannedReply(msg, phase) {
    const m = msg.toLowerCase();
    const foods = NUTRITION[phase].foods.map((f) => f.name).join(", ");
    if (/(eat|food|diet|hungry|nutrition)/.test(m)) return `Right now your body could use ${foods}. Small, real meals beat skipping food — even on a low-energy day.`;
    if (/(cramp|pain|hurt)/.test(m)) return "A warm compress, gentle stretching, and magnesium-rich food (dark chocolate counts) can help. If pain is severe or new, please check with a doctor.";
    if (/(mood|sad|anxious|irritable|angry)/.test(m)) return "That's a very normal part of this phase. Be a little kinder to yourself today — it passes faster than it feels like it will.";
    if (/(sleep|tired|energy)/.test(m)) return "Your energy naturally dips and rises with your cycle — this isn't laziness, it's biology. Rest where you can.";
    return `I'm listening 🌱 — add a Gemini API key in Settings and I can think through things with you properly, but for now: be gentle with yourself, you're doing fine.`;
  }

  /* --- Recipe generator: combines USDA nutrient data + Gemini --- */
  async function generateRecipe() {
    const today = virtualToday();
    const { phase } = cycleInfoFor(today);
    const candidates = NUTRITION[phase].foods.filter((f) => !/water/i.test(f.name));
    const picks = candidates.slice(0, 2).map((f) => f.name);

    appendBubble("user", "🍳 Generate today's recipe");
    chatHistory.push({ role: "user", text: "🍳 Generate today's recipe" });
    const thinking = appendBubble("pet", "Cooking up an idea...");

    const nutrientNote = await lookupNutrientNote(picks[0]);
    const reply = await getRecipe(phase, picks, nutrientNote);

    thinking.textContent = reply;
    chatHistory.push({ role: "pet", text: reply });
    if (chatHistory.length > 60) chatHistory = chatHistory.slice(-60);
    saveChat();
  }

  async function lookupNutrientNote(foodName) {
    try {
      const key = settings.usdaKey || "DEMO_KEY";
      const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${encodeURIComponent(key)}`);
      const data = await res.json();
      const food = data.foods && data.foods[0];
      if (!food) return "";
      const wanted = ["Iron, Fe", "Magnesium, Mg", "Protein"];
      const bits = (food.foodNutrients || [])
        .filter((n) => wanted.includes(n.nutrientName))
        .map((n) => `${n.nutrientName.replace(", Fe", "").replace(", Mg", "")} ${n.value}${n.unitName}`);
      return bits.length ? ` (${foodName} has ${bits.join(", ")} per 100g, per USDA data)` : "";
    } catch {
      return "";
    }
  }

  async function getRecipe(phase, picks, nutrientNote) {
    if (settings.geminiKey) {
      const prompt = `Create ONE simple, complete home-cook recipe suited for someone in the ${phase} phase of their menstrual cycle.${nutrientNote} It should prominently use: ${picks.join(" and ")}. Use easy-to-find, realistic ingredients. Format plainly like this:\nTitle: ...\nWhy today: <one short sentence tying it to this phase>\nIngredients:\n- ...\nSteps:\n1. ...\nKeep the whole reply under 150 words, plain text only, no markdown symbols.`;
      try {
        const text = await callGemini(prompt);
        if (text) return text;
      } catch { /* fall through to local template */ }
    }
    return localRecipeFallback(phase, picks);
  }

  function localRecipeFallback(phase, picks) {
    const a = picks[0] || "spinach";
    const b = picks[1] || "rice";
    return `Title: ${a} & ${b} comfort bowl\nWhy today: this combination supports what your body needs during your ${phase} phase.\nIngredients:\n- 1 cup ${a.toLowerCase()}\n- 1 cup ${b.toLowerCase()}\n- 1 tsp oil or ghee\n- Salt, pepper, a squeeze of lemon\n- Any greens or grains you have on hand\n\nSteps:\n1. Warm the oil in a pan over medium heat.\n2. Add ${a.toLowerCase()} and cook for 4-5 minutes.\n3. Stir in ${b.toLowerCase()} and cook until tender.\n4. Season with salt, pepper, and lemon.\n5. Serve warm.\n\n(Add a Gemini API key in Settings for a freshly written recipe every time.)`;
  }

  /* ===========================================================
     NUTRITION
     =========================================================== */
  function renderNutrition() {
    const today = virtualToday();
    const { phase } = cycleInfoFor(today);
    const meta = PHASE_META[phase];
    document.getElementById("nutritionPhaseName").textContent = `${meta.season.toLowerCase()} (${phase})`;
    document.getElementById("nutritionPhaseBlurb").textContent = NUTRITION[phase].blurb;

    const grid = document.getElementById("foodGrid");
    grid.innerHTML = "";
    NUTRITION[phase].foods.forEach((f) => {
      const card = document.createElement("div");
      card.className = "food-card";
      card.innerHTML = `<div class="food-emoji">${f.emoji}</div><div class="food-name">${f.name}</div><div class="food-why">${f.why}</div>`;
      grid.appendChild(card);
    });

    renderWikiPhase();
  }

  function initFoodSearch() {
    document.getElementById("foodSearchForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = document.getElementById("foodSearchInput").value.trim();
      const resultBox = document.getElementById("foodLookupResult");
      if (!q) return;
      resultBox.textContent = "Searching…";
      try {
        const key = settings.usdaKey || "DEMO_KEY";
        const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=1&api_key=${encodeURIComponent(key)}`);
        const data = await res.json();
        const food = data.foods && data.foods[0];
        if (!food) { resultBox.textContent = "No result found — try a simpler food name."; return; }
        const wanted = ["Protein", "Iron, Fe", "Magnesium, Mg", "Energy"];
        const nutrients = (food.foodNutrients || [])
          .filter((n) => wanted.includes(n.nutrientName))
          .map((n) => `${n.nutrientName.replace(", Fe", "").replace(", Mg", "")}: ${n.value}${n.unitName}`)
          .join(" · ");
        resultBox.innerHTML = `<strong>${food.description}</strong><br>${nutrients || "No detailed nutrients available for this item."}`;
      } catch {
        resultBox.textContent = "Couldn't reach the nutrition database right now — try again in a moment.";
      }
    });
  }

  /* ===========================================================
     WIKIPEDIA — phase articles + free-text lookup
     =========================================================== */
  async function fetchWikiSummary(title) {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === "disambiguation") return null;
    return data;
  }

  function renderWikiCard(container, data, fallbackMsg) {
    if (!data || !data.extract) {
      container.innerHTML = fallbackMsg;
      return;
    }
    const thumb = data.thumbnail ? `<img src="${data.thumbnail.source}" alt="" />` : "";
    const link = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}`;
    container.innerHTML = `${thumb}<div class="wiki-body"><h4>${data.title}</h4><p>${data.extract}</p><a href="${link}" target="_blank" rel="noopener">Read more on Wikipedia →</a></div>`;
  }

  async function renderWikiPhase() {
    const today = virtualToday();
    const { phase } = cycleInfoFor(today);
    document.getElementById("wikiPhaseName").textContent = `the ${phase} phase`;
    const card = document.getElementById("wikiPhaseCard");
    card.textContent = "Loading article…";
    try {
      const data = await fetchWikiSummary(PHASE_WIKI[phase]);
      renderWikiCard(card, data, "Couldn't load this article right now.");
    } catch {
      card.textContent = "Couldn't reach Wikipedia right now — try again in a moment.";
    }
  }

  function initWikiSearch() {
    document.getElementById("wikiSearchForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = document.getElementById("wikiSearchInput").value.trim();
      const box = document.getElementById("wikiSearchResult");
      if (!q) return;
      box.textContent = "Searching…";
      try {
        const data = await fetchWikiSummary(q);
        renderWikiCard(box, data, "No article found — try a different or more specific term.");
      } catch {
        box.textContent = "Couldn't reach Wikipedia right now — try again in a moment.";
      }
    });
  }

  /* ===========================================================
     INSIGHTS
     =========================================================== */
  function renderInsights() {
    const cards = document.getElementById("insightCards");
    cards.innerHTML = "";
    const avg = averageCycleLength();
    const items = [];

    items.push({ icon: "📏", text: `Average cycle length: ${avg} days${cycles.length ? ` (from ${cycles.length} logged cycle${cycles.length > 1 ? "s" : ""})` : " (your estimate — log a period start to refine this)"}.` });

    if (cycles.length >= 2) {
      const lens = cycles.map((c) => c.length);
      const variability = Math.max(...lens) - Math.min(...lens);
      items.push({ icon: "📊", text: variability <= 3 ? "Your cycles are fairly regular — variation of 3 days or less." : `Your cycles vary by up to ${variability} days — that's worth mentioning to a doctor if it concerns you.` });
    }

    const symptomTally = {};
    Object.values(logs).forEach((e) => (e.symptoms || []).forEach((s) => (symptomTally[s] = (symptomTally[s] || 0) + 1)));
    const topSymptom = Object.entries(symptomTally).sort((a, b) => b[1] - a[1])[0];
    if (topSymptom) items.push({ icon: "🔁", text: `Your most logged symptom is "${topSymptom[0]}" (${topSymptom[1]} times).` });

    if (profile.irregular && profile.goal) items.push({ icon: "🎯", text: `Your goal: ${profile.goal}` });

    if (items.length === 0) items.push({ icon: "🌱", text: "Log a few days to start seeing patterns here." });

    items.forEach((it) => {
      const div = document.createElement("div");
      div.className = "insight-card";
      div.innerHTML = `<span>${it.icon}</span><span>${it.text}</span>`;
      cards.appendChild(div);
    });

    renderCycleChart();
  }

  function renderCycleChart() {
    const svg = document.getElementById("cycleChart");
    const caption = document.getElementById("chartCaption");
    svg.innerHTML = "";
    const data = cycles.slice(-6).map((c) => c.length);
    if (data.length === 0) { caption.textContent = "Log a period start to begin tracking your trend here."; return; }
    caption.textContent = `Last ${data.length} cycle${data.length > 1 ? "s" : ""}, in days.`;

    const w = 320, h = 140, pad = 20;
    const max = Math.max(...data, 35), min = Math.min(...data, 20);
    const barW = (w - pad * 2) / data.length - 8;
    data.forEach((len, i) => {
      const x = pad + i * ((w - pad * 2) / data.length);
      const barH = ((len - min + 5) / (max - min + 10)) * (h - pad * 2);
      const y = h - pad - barH;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", Math.max(barW, 10));
      rect.setAttribute("height", barH);
      rect.setAttribute("rx", 4);
      rect.setAttribute("fill", "var(--accent, #c9633f)");
      svg.appendChild(rect);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x + Math.max(barW, 10) / 2);
      text.setAttribute("y", y - 6);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "11");
      text.setAttribute("fill", "#6b5f5a");
      text.textContent = len;
      svg.appendChild(text);
    });
  }

  /* ===========================================================
     SETTINGS DRAWER
     =========================================================== */
  function initSettings() {
    const overlay = document.getElementById("settingsOverlay");
    const drawer = document.getElementById("settingsDrawer");

    function open() {
      document.getElementById("setName").value = profile.name;
      document.getElementById("setCycleLength").value = profile.cycleLength;
      document.getElementById("setCycleLengthVal").textContent = profile.cycleLength;
      document.getElementById("setPeriodLength").value = profile.periodLength;
      document.getElementById("setPeriodLengthVal").textContent = profile.periodLength;
      document.getElementById("setLastPeriod").value = profile.lastPeriodStart;
      document.getElementById("geminiKeyInput").value = settings.geminiKey || "";
      document.getElementById("usdaKeyInput").value = settings.usdaKey || "";
      document.getElementById("demoOffsetLabel").textContent = `${settings.demoOffsetDays >= 0 ? "+" : ""}${settings.demoOffsetDays} days`;
      overlay.hidden = false;
      drawer.hidden = false;
    }
    function close() { overlay.hidden = true; drawer.hidden = true; }

    document.getElementById("settingsBtn").addEventListener("click", open);
    document.getElementById("closeSettings").addEventListener("click", close);
    overlay.addEventListener("click", close);

    document.getElementById("setCycleLength").addEventListener("input", (e) => {
      document.getElementById("setCycleLengthVal").textContent = e.target.value;
    });
    document.getElementById("setPeriodLength").addEventListener("input", (e) => {
      document.getElementById("setPeriodLengthVal").textContent = e.target.value;
    });

    document.getElementById("demoPlus").addEventListener("click", () => {
      settings.demoOffsetDays = (settings.demoOffsetDays || 0) + 1;
      saveSettings();
      document.getElementById("demoOffsetLabel").textContent = `+${settings.demoOffsetDays} days`;
      renderAll();
    });
    document.getElementById("demoMinus").addEventListener("click", () => {
      settings.demoOffsetDays = (settings.demoOffsetDays || 0) - 1;
      saveSettings();
      document.getElementById("demoOffsetLabel").textContent = `${settings.demoOffsetDays} days`;
      renderAll();
    });

    document.getElementById("seedDemoBtn").addEventListener("click", () => {
      seedDemoData();
      renderAll();
      toast("Sample cycle history added 🌱");
    });

    document.getElementById("resetAppBtn").addEventListener("click", () => {
      if (confirm("This clears all Ritu data from this browser. Continue?")) {
        Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
        location.reload();
      }
    });

    document.getElementById("saveSettingsBtn").addEventListener("click", () => {
      profile.name = document.getElementById("setName").value.trim() || profile.name;
      profile.cycleLength = Number(document.getElementById("setCycleLength").value);
      profile.periodLength = Number(document.getElementById("setPeriodLength").value);
      profile.lastPeriodStart = document.getElementById("setLastPeriod").value || profile.lastPeriodStart;
      saveProfile();

      settings.geminiKey = document.getElementById("geminiKeyInput").value.trim();
      settings.usdaKey = document.getElementById("usdaKeyInput").value.trim();
      saveSettings();

      close();
      renderAll();
      toast("Settings saved");
    });
  }

  function seedDemoData() {
    const cl = profile.cycleLength, pl = profile.periodLength;
    let cursor = parseKey(profile.lastPeriodStart);
    const variances = [0, -2, 1];
    for (const v of variances) {
      const start = addDays(cursor, -(cl + v));
      const end = dateKey(cursor);
      const length = diffDays(cursor, start);
      cycles.unshift({ start: dateKey(start), end, length });
      // a couple of characteristic logs in that historical cycle
      logs[dateKey(addDays(start, 1))] = { flow: "medium", mood: "low", symptoms: ["cramps", "fatigue"], notes: "" };
      logs[dateKey(addDays(start, Math.min(length - 3, cl - 4)))] = { flow: "none", mood: "irritable", symptoms: ["cravings", "bloating"], notes: "" };
      cursor = start;
    }
    saveCycles();
    saveLogs();
  }

  /* ===========================================================
     BOOT
     =========================================================== */
  function renderAll() {
    renderHome();
    renderCalendar();
    renderMottuTab();
    renderNutrition();
    renderInsights();
  }

  function bootApp() {
    initTabs();
    initCalendar();
    initChat();
    initFoodSearch();
    initWikiSearch();
    initSettings();
    initPetWidget();
    initThemeToggle();
    calViewDate = new Date(virtualToday().getFullYear(), virtualToday().getMonth(), 1);
    renderAll();
    fetchSky();
  }

  /* ===========================================================
     LANDING PAGE
     =========================================================== */
  function initRotatingWord() {
    const el = document.getElementById("rotWord");
    if (!el) return;
    // Verbs that live in the same sentence: "A quieter way to ___ your cycle."
    const words = ["understand", "predict", "listen to", "honour", "care for"];
    let i = 0;
    setInterval(() => {
      el.classList.add("out");
      setTimeout(() => {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove("out");
      }, 380);
    }, 2600);
  }

  /* ---- Interactive cycle-preview on the landing page ------------------- */
  function initCyclePreview() {
    const ring = document.getElementById("demoRing");
    const slider = document.getElementById("demoDaySlider");
    if (!ring || !slider) return;

    const CYCLE_LEN = 28;
    const PERIOD_LEN = 5;
    const OVULATION_DAY = 14;
    // fertile window ≈ ovulationDay ± few
    const phaseFor = (day) => {
      if (day <= PERIOD_LEN) return "menstrual";
      if (day < OVULATION_DAY - 4) return "follicular";
      if (day <= OVULATION_DAY + 1) return "ovulation";
      return "luteal";
    };
    const PHASE_INFO = {
      menstrual:  { label: "Menstrual · Winter",  color: "#4f6bb0", desc: "Rest is productive too. Iron-rich foods help most while your body sheds and resets." },
      follicular: { label: "Follicular · Spring", color: "#5b8e51", desc: "Energy is quietly rebuilding as estrogen rises — a good window for protein and fresh food." },
      ovulation:  { label: "Ovulation · Summer",  color: "#c99656", desc: "Your brightest, most social window. Fertile — take precautions if you're avoiding pregnancy." },
      luteal:     { label: "Luteal · Autumn",     color: "#a55d3e", desc: "PMS territory. Complex carbs and magnesium (dark chocolate counts) help more than willpower does." },
    };

    // Build 28 tiny dots around the ring
    const R = 120;
    for (let d = 1; d <= CYCLE_LEN; d++) {
      const angle = ((d - 1) / CYCLE_LEN) * Math.PI * 2 - Math.PI / 2;
      const dot = document.createElement("span");
      dot.className = "demo-ring-dot";
      dot.style.background = PHASE_INFO[phaseFor(d)].color;
      dot.style.transform = `translate(${Math.cos(angle) * R}px, ${Math.sin(angle) * R}px)`;
      ring.appendChild(dot);
    }
    // Add the moving marker on top of everything
    const marker = document.createElement("span");
    marker.className = "demo-ring-marker";
    ring.appendChild(marker);

    const label = document.getElementById("demoPhaseLabel");
    const dayLabel = document.getElementById("demoDayLabel");
    const desc = document.getElementById("demoDesc");
    const dayValue = document.getElementById("demoDayValue");

    function render() {
      const day = Number(slider.value);
      const angle = ((day - 1) / CYCLE_LEN) * Math.PI * 2 - Math.PI / 2;
      marker.style.transform = `translate(${Math.cos(angle) * R}px, ${Math.sin(angle) * R}px)`;
      const info = PHASE_INFO[phaseFor(day)];
      label.textContent = info.label;
      label.style.color = info.color;
      dayLabel.textContent = `Day ${day} of ${CYCLE_LEN}`;
      desc.textContent = info.desc;
      dayValue.textContent = day;
    }
    slider.addEventListener("input", render);
    render();
  }

  /* ---- Testimonials carousel ------------------------------------------ */
  const STORIES = [
    { quote: "It's the first tracker that felt like it actually understood — not just logged. The déjà-vu heads-up on cramp days is uncanny.", name: "Meera, 26", detail: "Chennai · using since Sep '26" },
    { quote: "I like that nothing leaves my browser. My cycle data isn't a product being sold back to me — it just sits on my phone.", name: "Anjali, 31", detail: "Bengaluru · reviewer, women's-health app landscape" },
    { quote: "Mottu is silly on purpose and I love it. Suggesting dark chocolate on my worst day? A friend told me that, not an algorithm.", name: "Reena, 22", detail: "Mumbai · student" },
    { quote: "The Wikipedia article on my phase, right where I need it. Small thing, but no tracker had bothered before.", name: "Priya, 29", detail: "Hyderabad · GP resident" },
  ];
  function initStoriesCarousel() {
    const q = document.getElementById("storyQuote");
    const n = document.getElementById("storyName");
    const d = document.getElementById("storyDetail");
    const dotsWrap = document.getElementById("storyDots");
    if (!q) return;
    let i = 0, timer;

    function render() {
      q.style.opacity = 0;
      setTimeout(() => {
        const s = STORIES[i];
        q.textContent = `"${s.quote}"`;
        n.textContent = s.name;
        d.textContent = s.detail;
        q.style.opacity = 1;
        dotsWrap.querySelectorAll(".story-dot").forEach((el, idx) => el.classList.toggle("active", idx === i));
      }, 260);
    }
    function go(step) { i = (i + step + STORIES.length) % STORIES.length; render(); restart(); }
    function restart() { clearInterval(timer); timer = setInterval(() => go(1), 6000); }

    STORIES.forEach((_, idx) => {
      const b = document.createElement("button");
      b.className = "story-dot";
      b.setAttribute("aria-label", `Story ${idx + 1}`);
      b.addEventListener("click", () => { i = idx; render(); restart(); });
      dotsWrap.appendChild(b);
    });
    document.getElementById("storyPrev").addEventListener("click", () => go(-1));
    document.getElementById("storyNext").addEventListener("click", () => go(1));
    render();
    restart();
  }

  /* ---- Scroll reveal (IntersectionObserver) --------------------------- */
  function initScrollReveal() {
    const targets = document.querySelectorAll(".landing-section, .trust-bar, .landing-footer");
    targets.forEach((t) => t.classList.add("reveal"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  }

  /* ---- Light / dark theme ---------------------------------------------- */
  function applyTheme(theme) {
    document.body.classList.toggle("theme-dark", theme === "dark");
    document.querySelectorAll(".theme-opt").forEach((btn) => {
      const active = btn.dataset.theme === theme;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });
    settings.theme = theme;
    saveSettings();
  }
  function initThemeToggle() {
    document.querySelectorAll(".theme-opt").forEach((btn) => {
      btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
    });
    applyTheme(settings.theme || "light");
  }

  function enterApp(isLogIn) {
    const navToggle = document.getElementById("landingNavToggle");
    if (navToggle) navToggle.checked = false;
    document.getElementById("landing").hidden = true;
    if (profile && profile.onboarded) {
      document.getElementById("app").hidden = false;
      bootApp();
    } else {
      if (isLogIn) toast("No account on this browser yet — let's set one up 🌱");
      document.getElementById("onboarding").hidden = false;
      initOnboarding();
    }
  }

  function initLanding() {
    initRotatingWord();
    initCyclePreview();
    initStoriesCarousel();
    initScrollReveal();

    const signupIds = ["landingGetStartedBtn", "heroGetStartedBtn", "landingGetStartedBtnMobile", "ctaGetStartedBtn"];
    signupIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", () => enterApp(false));
    });
    ["landingSignInBtn", "landingSignInBtnMobile"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", () => enterApp(true));
    });
    const navToggle = document.getElementById("landingNavToggle");
    document.querySelectorAll(".nav-links a, .landing-navbar .nav-link").forEach((a) => {
      a.addEventListener("click", () => { if (navToggle) navToggle.checked = false; });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPetTilt();
    initLanding();
    if (profile && profile.onboarded) {
      document.getElementById("landing").hidden = true;
      document.getElementById("onboarding").hidden = true;
      document.getElementById("app").hidden = false;
      bootApp();
    }
  });
})();
