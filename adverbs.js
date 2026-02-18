// adverbs.js - Focus mode with level dropdowns + save
import adverbsA1 from './js/adverbs-db-a1.js';
import adverbsA2 from './js/adverbs-db-a2.js';
import adverbsB1 from './js/adverbs-db-b1.js';
import adverbsB2 from './js/adverbs-db-b2.js';
import adverbsC1 from './js/adverbs-db-c1.js';
// Cross-page DB imports so global search works from this page without needing to visit others first
import verbsA1 from './js/verbs-db-a1.js';
import verbsA2 from './js/verbs-db-a2.js';
import verbsB1 from './js/verbs-db-b1.js';
import verbsB2 from './js/verbs-db-b2.js';
import verbsC1 from './js/verbs-db-c1.js';
import nounsA1 from './js/nouns-db-a1.js';
import nounsA2 from './js/nouns-db-a2.js';
import nounsB1 from './js/nouns-db-b1.js';
import nounsB2 from './js/nouns-db-b2.js';
import nounsC1 from './js/nouns-db-c1.js';
import adjectivesA1 from './js/adjectives-db-a1.js';
import adjectivesA2 from './js/adjectives-db-a2.js';
import adjectivesB1 from './js/adjectives-db-b1.js';
import adjectivesB2 from './js/adjectives-db-b2.js';
import adjectivesC1 from './js/adjectives-db-c1.js';
import { initFocusMode } from './focus-mode.js';

const DB = { a1: adverbsA1, a2: adverbsA2, b1: adverbsB1, b2: adverbsB2, c1: adverbsC1 };
const levelBtns = document.querySelectorAll('.level-btn');

let currentLevel = 'a1';
let focusApi = null;

const { getSaved, setSaved, setSaveBtnState, initSearchModal, registerPageItems, registerSearchItems } = window.SharedApp;

function buildPageItems(level) {

  return (DB[level] || []).map((adv, i) => ({
    id: `adverbs:${level}:${adv.word}`,
    label: adv.word || '—',
    translation: (adv.translations || [])[0] || '',
    index: i, level, category: 'Adverbs', url: 'adverbs.html',
  }));
}

function buildAllPageItems(){
  return Object.keys(DB).flatMap(l => buildPageItems(l));
}

function buildAllPageItems(){
  return Object.keys(DB).flatMap(l => buildPageItems(l));
}

function buildCrossPageItems() {
  const verbDB = { a1: verbsA1, a2: verbsA2, b1: verbsB1, b2: verbsB2, c1: verbsC1 };
  const nounDB = { a1: nounsA1, a2: nounsA2, b1: nounsB1, b2: nounsB2, c1: nounsC1 };
  const adjDB  = { a1: adjectivesA1, a2: adjectivesA2, b1: adjectivesB1, b2: adjectivesB2, c1: adjectivesC1 };
  const verbs = Object.keys(verbDB).flatMap(l => (verbDB[l]||[]).map((v,i) => ({
    id: `verbs:${l}:${v.base||v.infinitive||v.word||''}`,
    label: v.base||v.infinitive||v.word||'—',
    translation: ((v.translations||v.meanings||[])[0])||'',
    index: i, level: l, category: 'Verbs', url: 'index.html',
  })));
  const nouns = Object.keys(nounDB).flatMap(l => (nounDB[l]||[]).map((n,i) => ({
    id: `nouns:${l}:${n.word}`, label: n.word||'—', translation: (n.translations||[])[0]||'',
    index: i, level: l, category: 'Nouns', url: 'nouns.html',
  })));
  const adjs = Object.keys(adjDB).flatMap(l => (adjDB[l]||[]).map((a,i) => ({
    id: `adjectives:${l}:${a.word}`, label: a.word||'—', translation: (a.translations||[])[0]||'',
    index: i, level: l, category: 'Adjectives', url: 'adjectives.html',
  })));
  return [...verbs, ...nouns, ...adjs];
}

renderCurrent();
updateCounts();
buildAllDropdowns();
registerPageItems(buildAllPageItems());
registerSearchItems(buildCrossPageItems());

// Handle cross-page search navigation (#jump:level:index)
window.SharedApp.handleJumpHash(
  () => currentLevel,
  (level, index) => {
    const btn = document.querySelector(`.level-btn[data-level="${level}"]`);
    if (btn) { levelBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
    currentLevel = level; renderCurrent();
    setTimeout(() => focusApi?.jumpTo(index), 80);
  },
  () => focusApi
);

initSearchModal((item) => {
  if (item.level !== currentLevel) {
    const btn = document.querySelector(`.level-btn[data-level="${item.level}"]`);
    if (btn) { levelBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
    currentLevel = item.level; renderCurrent();
    setTimeout(() => focusApi?.jumpTo(item.index), 80);
  } else {
    focusApi?.jumpTo(item.index);
  }
});

levelBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const level = btn.dataset.level;

    if (!btn.classList.contains('active')) {
      levelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLevel = level;
      renderCurrent();
    }

    const items = buildPageItems(level);
    window.SharedApp.openLevelSheet(
      btn,
      items,
      (idx) => { if (level !== currentLevel) { currentLevel = level; renderCurrent(); } setTimeout(() => focusApi?.jumpTo(idx), 40); },
      `${level.toUpperCase()} — ${items.length} adverbs`
    );
  });
});


function renderCurrent() {
  const root = document.getElementById('study-root');
  if (!root) return;
  root.classList.add('study-root');

  const list = DB[currentLevel] || [];
  const countEl = document.getElementById('adverb-count');
  if (countEl) countEl.textContent = `${list.length} ${list.length === 1 ? 'adverb' : 'adverbs'}`;

  if (!list.length) {
    root.innerHTML = `<div class="no-results"><p>No adverbs in this level yet.</p></div>`;
    return;
  }

  focusApi = initFocusMode({
    rootId: 'study-root',
    items: list,
    level: currentLevel,
    storageKey: 'adverbs',
    getId: (a) => `adverbs:${currentLevel}:${a.word}`,
    getLabel: (a) => a.word || '—',
    renderCard: (a) => createCard(a),
  });

  wireDrawerReview(focusApi);
  if (focusApi) focusApi.onChange = () => wireDrawerReview(focusApi);
}

function buildAllDropdowns() {
  Object.entries(DB).forEach(([level, items]) => {
    const dd = document.getElementById(`dropdown-${level}`);
    if (!dd || !items?.length) return;
    const frag = document.createDocumentFragment();
    items.forEach((adv, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-dropdown-item';
      const label = adv.word || '—';
      const trans = (adv.translations || [])[0] || '';
      btn.innerHTML = `${esc(label)}<span class="ddi-translation">${esc(trans)}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (level !== currentLevel) {
          const levelBtn = document.querySelector(`.level-btn[data-level="${level}"]`);
          if (levelBtn) { levelBtns.forEach(b => b.classList.remove('active')); levelBtn.classList.add('active'); currentLevel = level; renderCurrent(); }
        }
        setTimeout(() => focusApi?.jumpTo(i), 30);
      });
      frag.appendChild(btn);
    });
    dd.appendChild(frag);
  });
}

function createCard(adv) {
  const card = document.createElement('div');
  card.className = 'verb-card';
  const saveId = `adverbs:${currentLevel}:${adv.word}`;
  const label = adv.word || '—';
  const trans = (adv.translations || []).join(', ') || '—';
  const category = adv.category || adv.type || '';

  card.innerHTML = `
    <div class="verb-header">
      <div>
        <div class="verb-base">${esc(label)}</div>
        ${category ? `<div class="reflexive-marker">Category: ${esc(category)}</div>` : ''}
      </div>
      <button class="save-btn" type="button"
        data-save-id="${esc(saveId)}"
        data-save-label="${esc(label)}"
        data-save-trans="${esc((adv.translations||[])[0]||'')}"
        data-save-url="adverbs.html"
        aria-label="Save">♡</button>
    </div>

    <div class="verb-info">
      <span class="label">Translation:</span>
      <span class="value">${esc(trans)}</span>
    </div>

    ${(adv.examples||[]).length ? `
      <div class="examples-section"><h4>Examples</h4>
        <ul class="examples-list">${(adv.examples||[]).slice(0,4).map(ex=>`<li>${esc(ex)}</li>`).join('')}</ul>
      </div>` : ''}
  `;

  const btn = card.querySelector('.save-btn');
  if (btn) {
    setSaveBtnState(btn, getSaved().has(saveId));
    btn.addEventListener('click', () => {
      const s = getSaved();
      const m = window.SharedApp.getMeta();
      if (s.has(saveId)) { s.delete(saveId); delete m[saveId]; }
      else { s.add(saveId); m[saveId] = { label, translation: (adv.translations||[])[0]||'', url: 'adverbs.html' }; }
      setSaved(s); window.SharedApp.setMeta(m);
      setSaveBtnState(btn, s.has(saveId));
    });
  }
  return card;
}

function wireDrawerReview(api) {
  if (!api) return;
  const st = api.getState?.();
  if (!st) return;
  const lh = document.getElementById('drawerLearnedList');
  const uh = document.getElementById('drawerUnlearnedList');
  if (lh) lh.innerHTML = st.learned?.length ? st.learned.map(x=>`<button class="drawer-item" data-jump="${x.i}">${esc(x.label)}</button>`).join('') : `<div class="drawer-empty">No learned words yet.</div>`;
  if (uh) uh.innerHTML = st.unlearned?.length ? st.unlearned.map(x=>`<button class="drawer-item" data-jump="${x.i}">${esc(x.label)}</button>`).join('') : `<div class="drawer-empty">All learned 🎉</div>`;
  document.querySelectorAll('[data-jump]').forEach(b => { b.onclick = () => api.jumpTo(parseInt(b.dataset.jump,10)); });
  const ml = document.getElementById('btnMarkLearned');
  const mu = document.getElementById('btnMarkUnlearned');
  if (ml) ml.onclick = () => { api.setLearned?.(true); wireDrawerReview(api); };
  if (mu) mu.onclick = () => { api.setLearned?.(false); wireDrawerReview(api); };
}

function updateCounts() {
  Object.keys(DB).forEach(level => {
    const badge = document.getElementById(`count-${level}`);
    if (badge) badge.textContent = (DB[level]||[]).length;
  });
}

function esc(s) {
  return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
