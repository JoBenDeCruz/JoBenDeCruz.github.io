const LEVELS = [
  { name: "Law Clerk", xp: 0 },
  { name: "Junior Associate", xp: 80 },
  { name: "Associate", xp: 180 },
  { name: "Senior Associate", xp: 340 },
  { name: "Partner", xp: 560 },
  { name: "Senior Partner", xp: 850 },
];

const APP_BASE = new URL(".", document.currentScript.src);

const QUIZ_BANK = {
  scenario: [
    {
      prompt: "A lives in Manila, B lives in Cebu. The dispute is over a piece of land in Davao. Where should the action be filed?",
      choices: ["Manila", "Cebu", "Davao", "Any of the three"],
      answer: "Davao",
      explanation: "Real actions are filed where the real property, or a portion of it, is situated.",
    },
    {
      prompt: "The plaintiff wants to dismiss the complaint before the answer is served. What filing generally triggers dismissal?",
      choices: ["Notice of dismissal", "Demurrer to evidence", "Motion for reconsideration", "Pre-trial brief"],
      answer: "Notice of dismissal",
      explanation: "Rule 17 allows dismissal by notice before service of the answer or motion for summary judgment.",
    },
  ],
  fill: [
    {
      prompt: "An Answer must generally be filed within ____ calendar days after service of summons.",
      answer: "30",
      explanation: "The 2019 amendments use a thirty calendar day period for the answer.",
    },
    {
      prompt: "A motion for bill of particulars must generally be filed before responding to a pleading and within ____ calendar days from service.",
      answer: "10",
      explanation: "Rule 12 uses a ten calendar day period.",
    },
  ],
  timeline: [
    {
      prompt: "Arrange these ordinary civil action steps in chronological order.",
      steps: ["Complaint", "Summons", "Answer", "Pre-Trial"],
      explanation: "A civil action starts with the complaint, then summons, responsive pleading, and pre-trial.",
    },
    {
      prompt: "Arrange these appeal-related steps in a simple sequence.",
      steps: ["Judgment", "Notice of Appeal", "Record Elevation", "Appellate Review"],
      explanation: "The ordinary path starts from judgment, then the appeal is taken and reviewed.",
    },
  ],
};

const BADGES = [
  {
    id: "first-provision",
    name: "First Provision",
    lore: "You earned this for completing your first provision.",
  },
  {
    id: "rule-14",
    name: "Summons Scout",
    lore: "You earned this for mastering Rule 14: Summons.",
  },
  {
    id: "quiz-star",
    name: "Three-Star Recit",
    lore: "You earned this for a strong quiz performance.",
  },
  {
    id: "high-score",
    name: "New High Score",
    lore: "You earned this by setting a new quiz record.",
  },
  {
    id: "senior-partner",
    name: "Senior Partner",
    lore: "You earned this by reaching the highest career level.",
  },
  {
    id: "streak-3",
    name: "Three-Day Streak",
    lore: "You earned this by studying on three consecutive days.",
  },
];

const defaultProgress = () => ({
  xp: 0,
  completedSections: {},
  quizWins: {},
  provisionEdits: {},
  achievements: {},
  highScore: 0,
  muted: false,
  streak: {
    days: 0,
    lastPlayed: "",
    missed: false,
    freezesUsed: 0,
  },
});

const state = {
  data: null,
  view: "menu",
  selectedRule: 0,
  quizIndex: 0,
  quizType: "scenario",
  activeQuiz: null,
  selectedChoice: "",
  timelineOrder: [],
  timeLeft: 30,
  timerId: null,
  currentQuizScore: 0,
  editingSectionId: "",
  newBadges: new Set(),
  progress: defaultProgress(),
};

const els = {
  views: {
    menu: document.querySelector("#menuView"),
    learn: document.querySelector("#learnView"),
    quiz: document.querySelector("#quizView"),
    trophies: document.querySelector("#trophiesView"),
  },
  homeButton: document.querySelector("#homeButton"),
  clearProgress: document.querySelector("#clearProgress"),
  muteToggle: document.querySelector("#muteToggle"),
  streakCount: document.querySelector("#streakCount"),
  levelChip: document.querySelector("#levelChip"),
  streakChip: document.querySelector("#streakChip"),
  dashboardLevel: document.querySelector("#dashboardLevel"),
  dashboardStreak: document.querySelector("#dashboardStreak"),
  dashboardScore: document.querySelector("#dashboardScore"),
  levelBar: document.querySelector("#levelBar"),
  freezeButton: document.querySelector("#freezeButton"),
  overallProgress: document.querySelector("#overallProgress"),
  ruleMap: document.querySelector("#ruleMap"),
  learnRuleList: document.querySelector("#learnRuleList"),
  lessonPanel: document.querySelector("#lessonPanel"),
  quizPrompt: document.querySelector("#quizPrompt"),
  quizChoices: document.querySelector("#quizChoices"),
  quizInputArea: document.querySelector("#quizInputArea"),
  quizFeedback: document.querySelector("#quizFeedback"),
  quizTimer: document.querySelector("#quizTimer"),
  quizStars: document.querySelector("#quizStars"),
  quizHighScore: document.querySelector("#quizHighScore"),
  submitQuiz: document.querySelector("#submitQuiz"),
  nextQuiz: document.querySelector("#nextQuiz"),
  trophyGrid: document.querySelector("#trophyGrid"),
  trophyCount: document.querySelector("#trophyCount"),
  badgeModal: document.querySelector("#badgeModal"),
  badgeDetail: document.querySelector("#badgeDetail"),
  closeBadge: document.querySelector("#closeBadge"),
};

function loadProgress() {
  const saved = localStorage.getItem("civpro-quest-progress");
  if (!saved) return;
  const parsed = JSON.parse(saved);
  state.progress = {
    ...defaultProgress(),
    ...parsed,
    streak: { ...defaultProgress().streak, ...(parsed.streak || {}) },
  };
}

function saveProgress() {
  localStorage.setItem("civpro-quest-progress", JSON.stringify(state.progress));
}

function todayStamp() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayDiff(from, to) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.round((end - start) / 86400000);
}

function updateStreakOnBoot() {
  const today = todayStamp();
  const streak = state.progress.streak;
  if (!streak.lastPlayed) {
    streak.lastPlayed = today;
    streak.days = 1;
    saveProgress();
    return;
  }
  const diff = dayDiff(streak.lastPlayed, today);
  if (diff === 1) {
    streak.days += 1;
    streak.lastPlayed = today;
    streak.missed = false;
    saveProgress();
  } else if (diff > 1) {
    streak.missed = true;
    saveProgress();
  }
}

function availableFreezes() {
  return Math.max(0, Math.floor(state.progress.xp / 100) - state.progress.streak.freezesUsed);
}

function useFreeze() {
  if (!state.progress.streak.missed || availableFreezes() < 1) return;
  state.progress.streak.freezesUsed += 1;
  state.progress.streak.missed = false;
  state.progress.streak.lastPlayed = todayStamp();
  saveProgress();
  playSound("button");
  render();
}

function getLevel() {
  return LEVELS.reduce((current, level) => (state.progress.xp >= level.xp ? level : current), LEVELS[0]);
}

function getNextLevel() {
  return LEVELS.find((level) => level.xp > state.progress.xp) || LEVELS[LEVELS.length - 1];
}

function levelPercent() {
  const current = getLevel();
  const next = getNextLevel();
  if (current.name === next.name) return 100;
  return Math.round(((state.progress.xp - current.xp) / (next.xp - current.xp)) * 100);
}

function addXp(amount) {
  state.progress.xp += amount;
  checkAchievements();
}

function clearProgress() {
  state.progress = defaultProgress();
  state.currentQuizScore = 0;
  saveProgress();
  render();
}

function setView(view) {
  state.view = view;
  Object.entries(els.views).forEach(([name, element]) => {
    element.classList.toggle("active", name === view);
  });
  if (view !== "quiz") stopTimer();
  playSound("button");
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sectionHtml(section) {
  return state.progress.provisionEdits[section.id] || escapeHtml(section.body);
}

function getSectionProgress(rule) {
  const done = rule.sections.filter((section) => state.progress.completedSections[section.id]).length;
  return {
    done,
    total: rule.sections.length,
    ratio: rule.sections.length ? done / rule.sections.length : 0,
  };
}

function toggleSection(sectionId) {
  if (state.progress.completedSections[sectionId]) {
    delete state.progress.completedSections[sectionId];
  } else {
    state.progress.completedSections[sectionId] = true;
    addXp(5);
    playSound("correct");
  }
  saveProgress();
  render();
}

function saveProvisionEdit(sectionId) {
  const editor = document.querySelector(`[data-editor-id="${sectionId}"]`);
  state.progress.provisionEdits[sectionId] = editor.innerHTML.trim();
  state.editingSectionId = "";
  saveProgress();
  playSound("correct");
  renderLearn();
}

function cancelProvisionEdit() {
  state.editingSectionId = "";
  playSound("button");
  renderLearn();
}

function runEditorCommand(command, value = null) {
  document.execCommand(command, false, value);
}

function renderShell() {
  const level = getLevel();
  const next = getNextLevel();
  const percent = levelPercent();
  const rules = state.data.rules;
  const totalSections = rules.reduce((sum, rule) => sum + rule.sections.length, 0);
  const completed = Object.keys(state.progress.completedSections).length;
  const streakDays = state.progress.streak.days;

  els.streakCount.textContent = state.progress.xp;
  els.levelChip.textContent = level.name;
  els.streakChip.textContent = `${streakDays} day streak`;
  els.dashboardLevel.textContent = level.name === next.name ? level.name : `${level.name} -> ${next.name}`;
  els.dashboardStreak.textContent = state.progress.streak.missed ? `${streakDays} days, freeze ready` : `${streakDays} days`;
  els.dashboardScore.textContent = state.progress.highScore;
  els.levelBar.style.width = `${percent}%`;
  els.overallProgress.textContent = `${completed}/${totalSections} sections`;
  els.muteToggle.textContent = state.progress.muted ? "Muted" : "Sound";
  els.freezeButton.disabled = !state.progress.streak.missed || availableFreezes() < 1;
  els.freezeButton.textContent = `Use Freeze (${availableFreezes()})`;
}

function renderRuleMap() {
  els.ruleMap.innerHTML = "";
  state.data.rules.forEach((rule, index) => {
    const progress = getSectionProgress(rule);
    const percent = Math.round(progress.ratio * 100);
    const button = document.createElement("button");
    button.className = "rule-pill";
    button.classList.toggle("done", progress.total > 0 && progress.done === progress.total);
    button.classList.toggle("current", index === state.selectedRule);
    button.innerHTML = `
      <div class="rule-row-copy">
        <strong>Rule ${rule.number}</strong>
        <span>${rule.title || "Untitled"}</span>
      </div>
      <div class="rule-row-progress">
        <span>${progress.done}/${progress.total}</span>
        <strong>${percent}%</strong>
        <div class="bar"><span style="width: ${percent}%"></span></div>
      </div>
    `;
    button.addEventListener("click", () => {
      state.selectedRule = index;
      setView("learn");
    });
    els.ruleMap.appendChild(button);
  });
}

function renderLearn() {
  els.learnRuleList.innerHTML = "";
  state.data.rules.forEach((rule, index) => {
    const progress = getSectionProgress(rule);
    const button = document.createElement("button");
    button.className = "rule-pill";
    button.classList.toggle("current", index === state.selectedRule);
    button.innerHTML = `<strong>Rule ${rule.number}</strong><span class="rule-tracker">${progress.done}/${progress.total}</span>`;
    button.addEventListener("click", () => {
      state.selectedRule = index;
      state.editingSectionId = "";
      renderLearn();
    });
    els.learnRuleList.appendChild(button);
  });

  const rule = state.data.rules[state.selectedRule];
  els.lessonPanel.innerHTML = `
    <p class="eyebrow">Rule ${rule.number}</p>
    <h2>${rule.title || "Untitled Rule"}</h2>
    <p>${rule.summary}</p>
    <div id="sectionList"></div>
  `;
  const list = els.lessonPanel.querySelector("#sectionList");
  rule.sections.forEach((section) => {
    const done = Boolean(state.progress.completedSections[section.id]);
    const editing = state.editingSectionId === section.id;
    const card = document.createElement("section");
    card.className = "section-card";
    card.classList.toggle("done", done);
    card.classList.toggle("editing", editing);
    card.innerHTML = `
      <h3>Section ${section.number}. ${escapeHtml(section.heading)}</h3>
      ${editing ? renderEditorToolbar(section.id) : ""}
      <div class="provision-body" data-editor-id="${section.id}" contenteditable="${editing}">${sectionHtml(section)}</div>
      <div class="button-row provision-actions">
        <button class="pixel-button edit-provision" data-section-id="${section.id}">${editing ? "Editing" : "Edit"}</button>
        <button class="pixel-button complete-provision" data-section-id="${section.id}">${done ? "Completed" : "Mark Complete"}</button>
      </div>
    `;
    list.appendChild(card);
  });

  wireLearnButtons();
}

function renderEditorToolbar(sectionId) {
  return `
    <div class="editor-toolbar" data-toolbar-id="${sectionId}">
      <button class="pixel-button editor-command" data-command="bold">B</button>
      <button class="pixel-button editor-command" data-command="underline">U</button>
      <input type="color" class="highlight-color" value="#fff176" title="Highlight color" />
      <button class="pixel-button editor-highlight">Highlight</button>
      <button class="pixel-button editor-save" title="Save edit">Check</button>
      <button class="pixel-button editor-cancel" title="Cancel edit">X</button>
    </div>
  `;
}

function wireLearnButtons() {
  document.querySelectorAll(".edit-provision").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingSectionId = button.dataset.sectionId;
      playSound("button");
      renderLearn();
      document.querySelector(`[data-editor-id="${state.editingSectionId}"]`)?.focus();
    });
  });

  document.querySelectorAll(".complete-provision").forEach((button) => {
    button.addEventListener("click", () => toggleSection(button.dataset.sectionId));
  });

  document.querySelectorAll(".editor-command").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => runEditorCommand(button.dataset.command));
  });

  document.querySelectorAll(".editor-highlight").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      const toolbar = button.closest(".editor-toolbar");
      const color = toolbar.querySelector(".highlight-color").value;
      runEditorCommand("backColor", color);
    });
  });

  document.querySelectorAll(".editor-save").forEach((button) => {
    button.addEventListener("click", () => saveProvisionEdit(button.closest(".editor-toolbar").dataset.toolbarId));
  });

  document.querySelectorAll(".editor-cancel").forEach((button) => {
    button.addEventListener("click", cancelProvisionEdit);
  });
}

function quizItems() {
  return QUIZ_BANK[state.quizType];
}

function setQuizType(type) {
  state.quizType = type;
  state.quizIndex = 0;
  state.currentQuizScore = 0;
  document.querySelectorAll(".quiz-mode").forEach((button) => {
    button.classList.toggle("active", button.dataset.quizType === type);
  });
  playSound("button");
  renderQuiz();
}

function renderQuiz() {
  stopTimer();
  const items = quizItems();
  state.activeQuiz = items[state.quizIndex % items.length];
  state.selectedChoice = "";
  state.timelineOrder = state.activeQuiz.steps ? shuffle([...state.activeQuiz.steps]) : [];
  els.quizPrompt.textContent = state.activeQuiz.prompt;
  els.quizFeedback.textContent = "";
  els.quizChoices.innerHTML = "";
  els.quizInputArea.innerHTML = "";
  els.quizHighScore.textContent = `High: ${state.progress.highScore}`;
  els.quizStars.textContent = `Stars: ${scoreStars(state.currentQuizScore)}`;

  if (state.quizType === "scenario") renderScenarioQuiz();
  if (state.quizType === "fill") renderFillQuiz();
  if (state.quizType === "timeline") renderTimelineQuiz();
  startTimer();
}

function renderScenarioQuiz() {
  state.activeQuiz.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.textContent = choice;
    button.addEventListener("click", () => {
      state.selectedChoice = choice;
      document.querySelectorAll(".choice").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      playSound("button");
    });
    els.quizChoices.appendChild(button);
  });
}

function renderFillQuiz() {
  els.quizInputArea.innerHTML = `
    <input class="quiz-input" id="blankAnswer" type="text" inputmode="numeric" placeholder="Type answer" />
  `;
}

function renderTimelineQuiz() {
  const list = document.createElement("div");
  list.className = "timeline-list";
  state.timelineOrder.forEach((step, index) => {
    const row = document.createElement("div");
    row.className = "timeline-step";
    row.draggable = true;
    row.dataset.index = index;
    row.innerHTML = `
      <span>${escapeHtml(step)}</span>
      <div class="button-row">
        <button class="pixel-button move-step" data-direction="-1" data-index="${index}">Up</button>
        <button class="pixel-button move-step" data-direction="1" data-index="${index}">Down</button>
      </div>
    `;
    row.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", String(index)));
    row.addEventListener("dragover", (event) => event.preventDefault());
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      moveTimeline(Number(event.dataTransfer.getData("text/plain")), index);
    });
    list.appendChild(row);
  });
  els.quizInputArea.appendChild(list);
  document.querySelectorAll(".move-step").forEach((button) => {
    button.addEventListener("click", () => moveTimeline(Number(button.dataset.index), Number(button.dataset.index) + Number(button.dataset.direction)));
  });
}

function moveTimeline(from, to) {
  if (to < 0 || to >= state.timelineOrder.length || from === to) return;
  const [item] = state.timelineOrder.splice(from, 1);
  state.timelineOrder.splice(to, 0, item);
  playSound("button");
  els.quizInputArea.innerHTML = "";
  renderTimelineQuiz();
}

function submitQuiz() {
  if (!state.activeQuiz) return;
  let correct = false;
  if (state.quizType === "scenario") {
    correct = state.selectedChoice === state.activeQuiz.answer;
  }
  if (state.quizType === "fill") {
    const answer = document.querySelector("#blankAnswer")?.value.trim().toLowerCase();
    correct = answer === String(state.activeQuiz.answer).toLowerCase();
  }
  if (state.quizType === "timeline") {
    correct = state.timelineOrder.join("|") === state.activeQuiz.steps.join("|");
  }
  finishQuiz(correct, false);
}

function finishQuiz(correct, timedOut) {
  stopTimer();
  if (correct) {
    state.currentQuizScore += 10 + state.timeLeft;
    addXp(15);
    els.quizFeedback.textContent = `Correct. ${state.activeQuiz.explanation}`;
    playSound("correct");
  } else {
    els.quizFeedback.textContent = timedOut ? `Time is up. ${state.activeQuiz.explanation}` : `Not quite. ${state.activeQuiz.explanation}`;
    playSound(timedOut ? "timeout" : "wrong");
  }

  if (state.currentQuizScore > state.progress.highScore) {
    state.progress.highScore = state.currentQuizScore;
    els.quizFeedback.classList.add("celebrate");
    unlockBadge("high-score");
    setTimeout(() => els.quizFeedback.classList.remove("celebrate"), 900);
  }
  if (scoreStars(state.currentQuizScore) >= 3) unlockBadge("quiz-star");
  checkAchievements();
  saveProgress();
  renderShell();
  els.quizHighScore.textContent = `High: ${state.progress.highScore}`;
  els.quizStars.textContent = `Stars: ${scoreStars(state.currentQuizScore)}`;
}

function nextQuiz() {
  state.quizIndex += 1;
  renderQuiz();
}

function startTimer() {
  state.timeLeft = 30;
  els.quizTimer.textContent = state.timeLeft;
  els.quizTimer.classList.remove("warning");
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    els.quizTimer.textContent = state.timeLeft;
    els.quizTimer.classList.toggle("warning", state.timeLeft <= 8);
    if (state.timeLeft <= 0) finishQuiz(false, true);
  }, 1000);
}

function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

function scoreStars(score) {
  if (score >= 90) return 3;
  if (score >= 45) return 2;
  if (score >= 15) return 1;
  return 0;
}

function shuffle(items) {
  return items.sort(() => Math.random() - 0.5);
}

function unlockBadge(id) {
  if (state.progress.achievements[id]) return;
  state.progress.achievements[id] = new Date().toLocaleString();
  state.newBadges.add(id);
}

function checkAchievements() {
  const completed = Object.keys(state.progress.completedSections);
  if (completed.length > 0) unlockBadge("first-provision");
  const rule14 = state.data?.rules.find((rule) => rule.number === 14);
  if (rule14 && getSectionProgress(rule14).ratio === 1) unlockBadge("rule-14");
  if (getLevel().name === "Senior Partner") unlockBadge("senior-partner");
  if (state.progress.streak.days >= 3) unlockBadge("streak-3");
}

function renderTrophies() {
  const unlocked = BADGES.filter((badge) => state.progress.achievements[badge.id]).length;
  els.trophyCount.textContent = `${unlocked}/${BADGES.length} unlocked`;
  els.trophyGrid.innerHTML = "";
  BADGES.forEach((badge) => {
    const achieved = state.progress.achievements[badge.id];
    const button = document.createElement("button");
    button.className = "trophy-card";
    button.classList.toggle("locked", !achieved);
    button.classList.toggle("new", state.newBadges.has(badge.id));
    button.innerHTML = `
      <span class="trophy-icon">${achieved ? "WIN" : "LOCK"}</span>
      <strong>${badge.name}</strong>
      <span>${achieved ? "Unlocked" : "Locked"}</span>
    `;
    button.addEventListener("click", () => showBadgeDetail(badge));
    els.trophyGrid.appendChild(button);
  });
  state.newBadges.clear();
}

function showBadgeDetail(badge) {
  const achieved = state.progress.achievements[badge.id];
  els.badgeDetail.innerHTML = `
    <p class="eyebrow">${achieved ? "Unlocked" : "Locked"}</p>
    <h2>${badge.name}</h2>
    <p>${badge.lore}</p>
    <p>${achieved ? `Date achieved: ${achieved}` : "Date achieved: Not yet"}</p>
  `;
  els.badgeModal.showModal();
  playSound("button");
}

let audioContext;
function playSound(type) {
  if (state.progress.muted) return;
  audioContext ||= new AudioContext();
  const settings = {
    correct: [660, 0.08],
    wrong: [190, 0.12],
    timeout: [130, 0.2],
    button: [420, 0.04],
  }[type];
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = settings[0];
  oscillator.type = "sine";
  gain.gain.value = 0.025;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + settings[1]);
}

function render() {
  if (!state.data) return;
  checkAchievements();
  renderShell();
  renderRuleMap();
  if (state.view === "learn") renderLearn();
  if (state.view === "quiz") renderQuiz();
  if (state.view === "trophies") renderTrophies();
  saveProgress();
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.mode));
});

document.querySelectorAll(".quiz-mode").forEach((button) => {
  button.addEventListener("click", () => setQuizType(button.dataset.quizType));
});

els.homeButton.addEventListener("click", () => setView("menu"));
els.clearProgress.addEventListener("click", () => {
  if (confirm("Clear all CivPro Quest progress?")) clearProgress();
});
els.muteToggle.addEventListener("click", () => {
  state.progress.muted = !state.progress.muted;
  saveProgress();
  renderShell();
});
els.freezeButton.addEventListener("click", useFreeze);
els.submitQuiz.addEventListener("click", submitQuiz);
els.nextQuiz.addEventListener("click", nextQuiz);
els.closeBadge.addEventListener("click", () => els.badgeModal.close());

async function boot() {
  loadProgress();
  const response = await fetch(new URL("data/civpro-rules.json", APP_BASE));
  if (!response.ok) {
    els.overallProgress.textContent = "Failed to load rules";
    return;
  }
  state.data = await response.json();
  updateStreakOnBoot();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(new URL("sw.js", APP_BASE)).catch(() => {});
  }
  render();
}

boot();
