const iconMap = globalThis.GSP_ICONS || {};

function loadCollapsedPanels() {
  const defaults = {
    puzzleDeck: false,
    catalog: false,
    narration: false,
    alternatives: false,
    stepLog: false
  };

  try {
    const raw = window.localStorage.getItem('gsp-visualizer-panels');
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch (_) {
    return defaults;
  }
}

const state = {
  puzzles: [],
  filteredPuzzles: [],
  selectedSource: 'all',
  searchQuery: '',
  selectedPuzzleId: null,
  trace: null,
  currentStep: 0,
  playing: false,
  playTimer: null,
  speed: 1,
  collapsedPanels: loadCollapsedPanels()
};

const dom = {
  searchInput: document.querySelector('#searchInput'),
  sourceFilters: document.querySelector('#sourceFilters'),
  puzzleList: document.querySelector('#puzzleList'),
  catalogCount: document.querySelector('#catalogCount'),
  heroTitle: document.querySelector('#heroTitle'),
  heroStats: document.querySelector('#heroStats'),
  timelineRange: document.querySelector('#timelineRange'),
  timelineLabel: document.querySelector('#timelineLabel'),
  timelineSummary: document.querySelector('#timelineSummary'),
  playButton: document.querySelector('#playButton'),
  prevButton: document.querySelector('#prevButton'),
  nextButton: document.querySelector('#nextButton'),
  restartButton: document.querySelector('#restartButton'),
  speedSelect: document.querySelector('#speedSelect'),
  stageRoot: document.querySelector('#stageRoot'),
  narrationPanel: document.querySelector('#narrationPanel'),
  candidateList: document.querySelector('#candidateList'),
  stepLog: document.querySelector('#stepLog'),
  stepBadge: document.querySelector('#stepBadge'),
  logCount: document.querySelector('#logCount'),
  statusStrip: document.querySelector('#statusStrip'),
  panelToggles: [...document.querySelectorAll('[data-toggle-panel]')],
  controlsDock: document.querySelector('#controlsDock'),
  inspectorDock: document.querySelector('#inspectorDock')
};

function persistCollapsedPanels() {
  try {
    window.localStorage.setItem('gsp-visualizer-panels', JSON.stringify(state.collapsedPanels));
  } catch (_) {
    // Ignore storage failures and keep the interface responsive.
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function summarizeCategories(categories) {
  return categories.slice(0, 3).join(' / ');
}

function resolveIconFile(gene) {
  if (iconMap[gene]) return `/images/${iconMap[gene]}`;
  if (gene === 'Trw' && iconMap.Trp) return `/images/${iconMap.Trp}`;
  return '/images/pure-white.png';
}

function getStepData() {
  if (!state.trace || state.currentStep === 0) return null;
  return state.trace.steps[state.currentStep - 1] || null;
}

function stopPlayback() {
  state.playing = false;
  dom.playButton.textContent = 'Play';
  if (state.playTimer) {
    clearInterval(state.playTimer);
    state.playTimer = null;
  }
}

function triggerStepAnimation() {
  document.querySelectorAll('.track-panel, .spotlight-panel').forEach(panel => {
    panel.classList.remove('step-transition');
    void panel.offsetWidth;
    panel.classList.add('step-transition');
  });
}

function centerGenomeTracks() {
  document.querySelectorAll('.genome-scroll').forEach(scroll => {
    const anchor = scroll.querySelector('.terminus-core');
    if (!anchor) return;
    const target = anchor.offsetLeft - ((scroll.clientWidth - anchor.clientWidth) / 2);
    scroll.scrollLeft = Math.max(0, target);
  });
}

function renderStatusStrip() {
  const total = state.puzzles.length;
  const filtered = state.filteredPuzzles.length;
  dom.statusStrip.innerHTML = `
    <span class="status-pill">${filtered} visible / ${total} total</span>
    <span class="status-pill status-pill-accent">${state.trace ? `${state.trace.puzzle.id} loaded` : 'Animation ready'}</span>
  `;
}

function renderCollapsedDock(dock, panelIds) {
  const collapsedIds = panelIds.filter(panelId => state.collapsedPanels[panelId]);

  if (!dock) return;

  if (collapsedIds.length === 0) {
    dock.innerHTML = '';
    return;
  }

  dock.innerHTML = collapsedIds.map(panelId => {
    const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
    const label = panel?.dataset.panelLabel || panelId;
    return `
      <button class="dock-button" type="button" data-show-panel="${escapeHtml(panelId)}" aria-label="Show ${escapeHtml(label)}">
        <span class="dock-button-kicker">Show</span>
        <strong>${escapeHtml(label)}</strong>
      </button>
    `;
  }).join('');

  dock.querySelectorAll('[data-show-panel]').forEach(button => {
    button.addEventListener('click', () => {
      const panelId = button.dataset.showPanel;
      if (!panelId) return;
      state.collapsedPanels[panelId] = false;
      persistCollapsedPanels();
      syncCollapsiblePanels();
    });
  });
}

function syncCollapsiblePanels() {
  for (const [panelId, collapsed] of Object.entries(state.collapsedPanels)) {
    const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
    const toggle = document.querySelector(`[data-toggle-panel="${panelId}"]`);

    if (panel) {
      panel.classList.toggle('is-hidden-panel', collapsed);
    }

    if (toggle) {
      toggle.textContent = 'Hide';
      toggle.setAttribute('aria-expanded', String(true));
    }
  }

  renderCollapsedDock(dom.controlsDock, ['puzzleDeck', 'catalog']);
  renderCollapsedDock(dom.inspectorDock, ['narration', 'alternatives', 'stepLog']);

  const controlsAllHidden = state.collapsedPanels.puzzleDeck && state.collapsedPanels.catalog;
  const inspectorAllHidden =
    state.collapsedPanels.narration &&
    state.collapsedPanels.alternatives &&
    state.collapsedPanels.stepLog;

  document.body.classList.toggle('controls-all-hidden', controlsAllHidden);
  document.body.classList.toggle('inspector-all-hidden', inspectorAllHidden);
}

function renderSourceFilters() {
  const sources = ['all', ...new Set(state.puzzles.map(puzzle => puzzle.source).sort())];
  dom.sourceFilters.innerHTML = sources.map(source => `
    <button
      class="chip ${source === state.selectedSource ? 'is-active' : ''}"
      type="button"
      data-source="${escapeHtml(source)}"
    >${escapeHtml(source === 'all' ? 'all sources' : source)}</button>
  `).join('');

  dom.sourceFilters.querySelectorAll('[data-source]').forEach(button => {
    button.addEventListener('click', () => {
      state.selectedSource = button.dataset.source;
      applyPuzzleFilters();
    });
  });
}

function applyPuzzleFilters() {
  const query = state.searchQuery.trim().toLowerCase();
  state.filteredPuzzles = state.puzzles.filter(puzzle => {
    const sourceMatch = state.selectedSource === 'all' || puzzle.source === state.selectedSource;
    if (!sourceMatch) return false;

    if (!query) return true;

    const haystack = [
      puzzle.id,
      puzzle.source,
      puzzle.sourceLabel,
      ...(puzzle.category || [])
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });

  renderStatusStrip();
  renderSourceFilters();
  renderPuzzleList();
}

function renderPuzzleList() {
  dom.catalogCount.textContent = `${state.filteredPuzzles.length} puzzles`;

  if (state.filteredPuzzles.length === 0) {
    dom.puzzleList.innerHTML = '<p class="placeholder-copy">No puzzles match that filter.</p>';
    return;
  }

  dom.puzzleList.innerHTML = state.filteredPuzzles.map(puzzle => `
    <article class="puzzle-card ${puzzle.id === state.selectedPuzzleId ? 'is-active' : ''}" data-puzzle-id="${escapeHtml(puzzle.id)}">
      <div class="puzzle-title">
        <strong>${escapeHtml(puzzle.id)}</strong>
        <span class="count-badge">${escapeHtml(puzzle.source)}</span>
      </div>
      <p class="puzzle-meta">${escapeHtml(puzzle.sourceLabel)}${puzzle.category.length ? ` - ${escapeHtml(summarizeCategories(puzzle.category))}` : ''}</p>
      <div class="tag-row">
        <span class="stat-chip">${puzzle.mutableGeneCount} mutable</span>
        <span class="stat-chip">${puzzle.targetGeneCount} target</span>
        ${puzzle.referenceScore ? `<span class="stat-chip">ref ${puzzle.referenceScore}</span>` : ''}
      </div>
    </article>
  `).join('');

  dom.puzzleList.querySelectorAll('[data-puzzle-id]').forEach(card => {
    card.addEventListener('click', () => {
      const { puzzleId } = card.dataset;
      if (!puzzleId || puzzleId === state.selectedPuzzleId) return;
      loadTrace(puzzleId);
    });
  });
}

function markerForIndex(index, ranges) {
  return ranges.find(range => index >= range.start && index < range.start + range.length) || null;
}

function renderGeneToken(gene, fullIndex, ranges, themeClass = '') {
  const marker = markerForIndex(fullIndex, ranges);
  const markerClass = marker ? `is-marked marker-${marker.kind}` : '';
  const markerBadge = marker ? `
    <span class="marker-badge">
      <img src="/images/${marker.marker}" alt="">
    </span>
  ` : '';

  return `
    <div class="gene-token ${markerClass} ${themeClass}">
      ${markerBadge}
      <img class="gene-icon" src="${resolveIconFile(gene)}" alt="${escapeHtml(gene)} icon">
      <span>${escapeHtml(gene)}</span>
    </div>
  `;
}

function renderGeneRun(genomeSnapshot, side, ranges) {
  const genes = side === 'left' ? genomeSnapshot.left : genomeSnapshot.right;
  const offset = side === 'left' ? 0 : genomeSnapshot.terminusIndex + 1;
  const indices = genes.map((_, index) => offset + index);
  const ordered = side === 'left'
    ? indices.map((value, index) => ({ gene: genes[index], fullIndex: value })).reverse()
    : indices.map((value, index) => ({ gene: genes[index], fullIndex: value }));

  return ordered.map(item => renderGeneToken(item.gene, item.fullIndex, ranges)).join('');
}

function renderGenomeTrack(snapshot, options = {}) {
  const {
    title,
    tone = '',
    meta = '',
    ranges = []
  } = options;

  return `
    <section class="track-panel ${tone}">
      <div class="panel-heading">
        <div>
          <p class="panel-kicker">${escapeHtml(title)}</p>
          <p class="track-meta">${escapeHtml(meta)}</p>
        </div>
        <span class="count-badge">${snapshot.left.length + snapshot.right.length + 1} genes</span>
      </div>
      <div class="genome-scroll">
        <div class="genome-track">
          <div class="gene-run gene-run-left">${renderGeneRun(snapshot, 'left', ranges)}</div>
          <div class="terminus-core">
            <div class="terminus-dot" title="[t]"></div>
          </div>
          <div class="gene-run gene-run-right">${renderGeneRun(snapshot, 'right', ranges)}</div>
        </div>
      </div>
    </section>
  `;
}

function renderStage() {
  if (!state.trace) {
    dom.stageRoot.innerHTML = `
      <div class="empty-state">
        <p class="empty-eyebrow">Waiting on trace</p>
        <h2>Select a puzzle from the left</h2>
        <p>The solver trace, animated genome tracks, and narrated move log will appear here.</p>
      </div>
    `;
    return;
  }

  const step = getStepData();
  const beforeSnapshot = step ? step.before : state.trace.initial;
  const afterSnapshot = step ? step.after : state.trace.initial;
  const beforeMarkers = step ? step.markers.before : [];
  const afterMarkers = step ? step.markers.after : [];
  const spotlightTitle = step ? step.title : 'Initial mutable genome';
  const spotlightSummary = step
    ? step.summary
    : 'This is the starting genome. Press play to let the solver begin its terminus-centered transformation.';
  const spotlightScore = step
    ? `Score ${step.baseScoreText} -> ${step.nextScoreText}`
    : `Reference ${state.trace.puzzle.referenceScore ?? 'n/a'} - move budget ${state.trace.maxMoves}`;

  dom.stageRoot.innerHTML = `
    <div class="visual-stack">
      <section class="spotlight-panel spotlight-panel-wide">
        <div>
          <p class="spotlight-step">${step ? `Step ${step.index} of ${state.trace.steps.length}` : 'Step 0'}</p>
          <h3>${escapeHtml(spotlightTitle)}</h3>
          <p class="spotlight-summary">${escapeHtml(spotlightSummary)}</p>
        </div>
        <div class="score-line">${escapeHtml(spotlightScore)}</div>
      </section>
      ${renderGenomeTrack(state.trace.target, {
        title: 'Target genome',
        tone: 'track-panel-target',
        meta: 'The fixed destination. The solver tries to grow an exact block outward from [t].'
      })}
      <div class="state-stack">
        ${renderGenomeTrack(beforeSnapshot, {
          title: step ? 'Before move' : 'Mutable genome',
          meta: step ? `State entering move ${step.index}` : 'Initial state before any solver move.',
          ranges: beforeMarkers
        })}
        ${renderGenomeTrack(afterSnapshot, {
          title: step ? 'After move' : 'Mutable genome',
          meta: step ? 'The updated sequence after the selected operation.' : 'The same initial state is shown until playback begins.',
          ranges: afterMarkers
        })}
      </div>
    </div>
  `;

  centerGenomeTracks();
  requestAnimationFrame(triggerStepAnimation);
}

function renderNarration() {
  if (!state.trace) {
    dom.stepBadge.textContent = 'Step 0';
    dom.narrationPanel.innerHTML = `
      <h2>Solver briefing</h2>
      <p>Pick a puzzle and the visualizer will explain what the solver is doing at each move.</p>
    `;
    return;
  }

  const step = getStepData();
  dom.stepBadge.textContent = `Step ${state.currentStep}`;

  if (!step) {
    dom.narrationPanel.innerHTML = `
      <h2>${escapeHtml(state.trace.puzzle.id)}</h2>
      <p>The mutable genome is loaded. Playback will show how the solver builds a matching core around the terminus and then cleans up the frontier one move at a time.</p>
      <ul class="move-facts">
        <li>source: ${escapeHtml(state.trace.puzzle.source)}</li>
        <li>reference score: ${escapeHtml(state.trace.puzzle.referenceScore ?? 'n/a')}</li>
        <li>planned moves in this trace: ${state.trace.moveCount}</li>
      </ul>
    `;
    return;
  }

  dom.narrationPanel.innerHTML = `
    <h2>${escapeHtml(step.title)}</h2>
    <p>${escapeHtml(step.summary)}</p>
    <ul class="move-facts">
      ${step.details.map(detail => `<li>${escapeHtml(detail)}</li>`).join('')}
      <li>${escapeHtml(`candidates considered: ${step.totalCandidates} total, ${step.improvingCandidates} improving`)}</li>
    </ul>
  `;
}

function renderCandidateList() {
  if (!state.trace) {
    dom.candidateList.innerHTML = '<p class="placeholder-copy">No candidates yet.</p>';
    return;
  }

  const step = getStepData();
  if (!step) {
    dom.candidateList.innerHTML = '<p class="placeholder-copy">Top improving alternatives will appear once the first move is selected.</p>';
    return;
  }

  dom.candidateList.innerHTML = step.topCandidates.map((candidate, index) => `
    <article class="candidate-item">
      <div class="candidate-head">
        <strong>${index === 0 ? 'Chosen move' : `Alternative ${index}`}</strong>
        <span class="count-badge">${escapeHtml(candidate.type)}</span>
      </div>
      <div class="candidate-subtext">${escapeHtml(candidate.label)}</div>
      <div class="candidate-score">${escapeHtml(candidate.scoreText)}</div>
    </article>
  `).join('');
}

function renderStepLog() {
  if (!state.trace) {
    dom.stepLog.innerHTML = '<p class="placeholder-copy">The move log will appear after a puzzle is loaded.</p>';
    dom.logCount.textContent = '0 moves';
    return;
  }

  dom.logCount.textContent = `${state.trace.steps.length} moves`;
  dom.stepLog.innerHTML = state.trace.steps.map(step => `
    <article class="step-item ${step.index === state.currentStep ? 'is-active is-current' : ''}" data-step-index="${step.index}">
      <div class="step-head">
        <strong>${escapeHtml(`Step ${step.index}`)}</strong>
        <span class="count-badge">${escapeHtml(step.moveTypeLabel)}</span>
      </div>
      <div>${escapeHtml(step.title)}</div>
      <div class="step-score">${escapeHtml(step.baseScoreText)} -> ${escapeHtml(step.nextScoreText)}</div>
    </article>
  `).join('');

  dom.stepLog.querySelectorAll('[data-step-index]').forEach(button => {
    button.addEventListener('click', () => {
      stopPlayback();
      state.currentStep = Number(button.dataset.stepIndex);
      renderTraceView();
    });
  });
}

function renderHero() {
  if (!state.trace) {
    dom.heroTitle.textContent = 'Loading catalog...';
    dom.heroStats.innerHTML = '';
    return;
  }

  dom.heroTitle.textContent = `${state.trace.puzzle.id} - ${state.trace.puzzle.source}`;
  const stats = [
    `moves ${state.trace.moveCount}`,
    state.trace.puzzle.referenceScore ? `ratio ${state.trace.ratio.toFixed(3)}` : null,
    `${state.trace.initial.genes.length} -> ${state.trace.target.genes.length} genes`,
    ...(state.trace.puzzle.category || []).slice(0, 2)
  ].filter(Boolean);

  dom.heroStats.innerHTML = stats.map(text => `<span class="stat-chip">${escapeHtml(text)}</span>`).join('');
}

function renderTimeline() {
  if (!state.trace) {
    dom.timelineRange.max = 0;
    dom.timelineRange.value = 0;
    dom.timelineLabel.textContent = 'Step 0 / 0';
    dom.timelineSummary.textContent = 'Choose a puzzle to begin.';
    return;
  }

  const step = getStepData();
  dom.timelineRange.max = String(state.trace.steps.length);
  dom.timelineRange.value = String(state.currentStep);
  dom.timelineLabel.textContent = `Step ${state.currentStep} / ${state.trace.steps.length}`;
  dom.timelineSummary.textContent = step ? step.moveLabel : 'Initial mutable state';
}

function renderTransport() {
  const stepCount = state.trace ? state.trace.steps.length : 0;
  dom.playButton.textContent = state.playing ? 'Pause' : 'Play';
  dom.prevButton.disabled = !state.trace || state.currentStep <= 0;
  dom.restartButton.disabled = !state.trace || state.currentStep === 0;
  dom.nextButton.disabled = !state.trace || state.currentStep >= stepCount;
}

function renderTraceView() {
  renderStatusStrip();
  renderPuzzleList();
  renderHero();
  renderTimeline();
  renderTransport();
  renderStage();
  renderNarration();
  renderCandidateList();
  renderStepLog();
  syncCollapsiblePanels();
}

async function loadTrace(puzzleId) {
  stopPlayback();
  state.selectedPuzzleId = puzzleId;
  state.trace = null;
  state.currentStep = 0;
  renderTraceView();
  dom.stageRoot.innerHTML = `
    <div class="loading-state">
      <p class="empty-eyebrow">Tracing puzzle</p>
      <h2>${escapeHtml(puzzleId)}</h2>
      <p>The server is running the solver and building the step-by-step trace.</p>
    </div>
  `;

  const response = await fetch(`/api/trace?id=${encodeURIComponent(puzzleId)}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    dom.stageRoot.innerHTML = `
      <div class="empty-state">
        <p class="empty-eyebrow">Trace failed</p>
        <h2>Could not load ${escapeHtml(puzzleId)}</h2>
        <p>${escapeHtml(error.error || 'Unknown error')}</p>
      </div>
    `;
    return;
  }

  state.trace = await response.json();
  state.currentStep = 0;
  renderTraceView();
}

function stepForward() {
  if (!state.trace) return;
  if (state.currentStep >= state.trace.steps.length) {
    stopPlayback();
    return;
  }
  state.currentStep += 1;
  renderTraceView();
}

function startPlayback() {
  if (!state.trace) return;

  if (state.currentStep >= state.trace.steps.length) {
    state.currentStep = 0;
  }

  state.playing = true;
  dom.playButton.textContent = 'Pause';

  const delay = Math.max(300, Math.round(1350 / state.speed));
  state.playTimer = setInterval(() => {
    if (!state.trace || state.currentStep >= state.trace.steps.length) {
      stopPlayback();
      return;
    }
    stepForward();
  }, delay);
}

function bindEvents() {
  dom.panelToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const panelId = toggle.dataset.togglePanel;
      if (!panelId) return;
      state.collapsedPanels[panelId] = !state.collapsedPanels[panelId];
      persistCollapsedPanels();
      syncCollapsiblePanels();
    });
  });

  dom.searchInput.addEventListener('input', event => {
    state.searchQuery = event.target.value;
    applyPuzzleFilters();
  });

  dom.playButton.addEventListener('click', () => {
    if (!state.trace) return;
    if (state.playing) {
      stopPlayback();
      return;
    }
    startPlayback();
  });

  dom.prevButton.addEventListener('click', () => {
    if (!state.trace) return;
    stopPlayback();
    state.currentStep = Math.max(0, state.currentStep - 1);
    renderTraceView();
  });

  dom.nextButton.addEventListener('click', () => {
    if (!state.trace) return;
    stopPlayback();
    state.currentStep = Math.min(state.trace.steps.length, state.currentStep + 1);
    renderTraceView();
  });

  dom.restartButton.addEventListener('click', () => {
    stopPlayback();
    state.currentStep = 0;
    renderTraceView();
  });

  dom.timelineRange.addEventListener('input', event => {
    if (!state.trace) return;
    stopPlayback();
    state.currentStep = Number(event.target.value);
    renderTraceView();
  });

  dom.speedSelect.addEventListener('change', event => {
    state.speed = Number(event.target.value) || 1;
    if (state.playing) {
      stopPlayback();
      startPlayback();
    }
  });
}

async function init() {
  bindEvents();
  renderStatusStrip();
  syncCollapsiblePanels();

  const response = await fetch('/api/puzzles');
  const payload = await response.json();
  state.puzzles = payload.puzzles || [];
  state.filteredPuzzles = [...state.puzzles];

  applyPuzzleFilters();

  if (state.filteredPuzzles.length > 0) {
    const preferred = state.filteredPuzzles.find(puzzle => puzzle.id === 'level20') || state.filteredPuzzles[0];
    await loadTrace(preferred.id);
  } else {
    renderTraceView();
  }
}

init().catch(error => {
  dom.stageRoot.innerHTML = `
    <div class="empty-state">
      <p class="empty-eyebrow">Boot failure</p>
      <h2>The visualizer could not start</h2>
      <p>${escapeHtml(error.message)}</p>
    </div>
  `;
});
