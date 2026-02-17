// shared.js — Cross-page save + search + modal helpers
(function () {
  const SAVED_KEY  = 'savedWordsV1';
  const SAVED_META = 'savedWordsMetaV1';
  const SEARCH_IDX = 'searchIndexV1';

  function getSaved() { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')); }
  function setSaved(s) { localStorage.setItem(SAVED_KEY, JSON.stringify([...s])); }
  function getMeta()   { return JSON.parse(localStorage.getItem(SAVED_META) || '{}'); }
  function setMeta(m)  { localStorage.setItem(SAVED_META, JSON.stringify(m)); }
  function getIdx()    { try { return JSON.parse(localStorage.getItem(SEARCH_IDX) || '{}'); } catch { return {}; } }
  function setIdx(i)   { localStorage.setItem(SEARCH_IDX, JSON.stringify(i)); }

  let _pageItems = [];

  function registerPageItems(items) {
    _pageItems = items;
    const idx = getIdx();
    items.forEach(it => { idx[it.id] = it; });
    setIdx(idx);
  }

  function _syncModalState(){
    const anyOpen = !!document.querySelector('.modal:not([hidden])');
    document.body.classList.toggle('modal-open', anyOpen);
  }

  function openModal(id)  { const el = document.getElementById(id); if (el) { el.hidden = false; _syncModalState(); } }
  function closeModal(id) { const el = document.getElementById(id); if (el) { el.hidden = true; _syncModalState(); } }
  document.addEventListener('click', e => { const c = e.target?.dataset?.close; if (c) closeModal(c); });

  function setSaveBtnState(btn, isSaved) {
    btn.textContent = isSaved ? '♥' : '♡';
    btn.classList.toggle('saved', isSaved);
  }

  function wireSaveButtons() {
    document.querySelectorAll('.save-btn').forEach(btn => {
      const id = btn.dataset.saveId;
      if (!id) return;
      const fresh = btn.cloneNode(true);
      btn.replaceWith(fresh);
      setSaveBtnState(fresh, getSaved().has(id));
      fresh.addEventListener('click', () => {
        const s = getSaved(); const m = getMeta();
        if (s.has(id)) { s.delete(id); delete m[id]; }
        else { s.add(id); m[id] = { label: fresh.dataset.saveLabel||id, translation: fresh.dataset.saveTrans||'', url: fresh.dataset.saveUrl||window.location.pathname, category: fresh.dataset.saveCat||'' }; }
        setSaved(s); setMeta(m);
        setSaveBtnState(fresh, s.has(id));
      });
    });
  }

  function renderSavedModal() {
    const cont = document.getElementById('savedResults');
    if (!cont) return;
    const s = getSaved(); const m = getMeta();
    if (!s.size) { cont.innerHTML = `<div class="result"><div style="color:#888;font-style:italic;">No saved words yet. Tap ♡ on any word to save it.</div></div>`; return; }
    cont.innerHTML = '';
    [...s].forEach(id => {
      const meta = m[id] || {};
      const row = document.createElement('div');
      row.className = 'result';
      row.innerHTML = `
        <div>
          <a href="${meta.url||'#'}" style="font-weight:600;color:#111;text-decoration:none;">${esc(meta.label||id)}</a>
          ${meta.translation?`<br><small style="color:#888;">${esc(meta.translation)}</small>`:''}
          ${meta.category?`<br><small style="color:#aaa;font-size:11px;text-transform:uppercase;letter-spacing:.06em;">${esc(meta.category)}</small>`:''}
        </div>
        <button class="save-btn saved" data-save-id="${esc(id)}" data-save-label="${esc(meta.label||id)}" data-save-trans="${esc(meta.translation||'')}" data-save-url="${esc(meta.url||'')}" data-save-cat="${esc(meta.category||'')}" aria-label="Remove">♥</button>
      `;
      cont.appendChild(row);
    });
    wireSaveButtons();
  }

  function initSavedModal() {
    document.getElementById('btnSaved')?.addEventListener('click', () => { openModal('savedModal'); renderSavedModal(); });
  }

  function initSearchModal(onJump) {
    document.getElementById('btnGlobalSearch')?.addEventListener('click', () => {
      openModal('globalSearchModal');
      const input = document.getElementById('globalSearchInput');
      const results = document.getElementById('globalSearchResults');
      if (!input || !results) return;
      input.value = '';
      results.innerHTML = `<div class="result"><div style="color:#aaa;font-style:italic;font-size:13px;padding:8px 0;">Start typing to search all words…</div></div>`;
      setTimeout(() => input.focus(), 60);
      input.oninput = () => {
        const q = input.value.trim().toLowerCase();
        if (!q) {
          results.innerHTML = `<div class="result"><div style="color:#aaa;font-style:italic;font-size:13px;padding:8px 0;">Start typing to search all words…</div></div>`;
          return;
        }
        _renderSearch(results, q, onJump);
      };
    });
  }

  function _renderSearch(cont, q, onJump) {
    const idx = getIdx();
    const all = Object.values(idx);
    const filtered = q ? all.filter(it => (it.label||'').toLowerCase().includes(q) || (it.translation||'').toLowerCase().includes(q)) : [];

    cont.innerHTML = '';
    if (!filtered.length) {
      cont.innerHTML = `<div class="result"><div style="color:#888;font-style:italic;font-size:13px;">No matches found for "${esc(q)}".</div></div>`;
      return;
    }

    const groups = {};
    filtered.slice(0, 200).forEach(it => {
      const cat = it.category || 'Other';
      (groups[cat] = groups[cat] || []).push(it);
    });

    const currentIds = new Set(_pageItems.map(i => i.id));
    const CAT_ORDER = ['Verbs','Nouns','Adjectives','Adverbs','Grammar','Other'];
    const cats = Object.keys(groups).sort((a,b) => {
      const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b);
      return (ai<0?99:ai) - (bi<0?99:bi);
    });

    cats.forEach(cat => {
      const hdr = document.createElement('div');
      hdr.style.cssText = 'font-size:10px;letter-spacing:.10em;text-transform:uppercase;color:#999;padding:10px 0 4px;font-weight:700;border-top:1px solid #f0f0f0;margin-top:4px;';
      hdr.textContent = cat;
      cont.appendChild(hdr);

      groups[cat].forEach(it => {
        const isHere = currentIds.has(it.id);
        const saved = getSaved().has(it.id);
        const row = document.createElement('div');
        row.className = 'result';
        row.style.cssText = 'cursor:pointer;';
        row.innerHTML = `
          <div style="flex:1;min-width:0;">
            <span class="sr-word" style="font-weight:600;">${esc(it.label)}</span>
            ${it.level?`<span style="font-size:10px;color:#bbb;margin-left:5px;">${esc(it.level.toUpperCase())}</span>`:''}
            ${it.translation?`<br><small style="color:#888;">${esc(it.translation)}</small>`:''}
          </div>
          ${isHere
            ?`<button class="save-btn ${saved?'saved':''}" data-save-id="${esc(it.id)}" data-save-label="${esc(it.label)}" data-save-trans="${esc(it.translation||'')}" data-save-url="${esc(it.url||'')}" data-save-cat="${esc(it.category||'')}" aria-label="Save">${saved?'♥':'♡'}</button>`
            :`<span style="font-size:11px;color:#aaa;white-space:nowrap;padding:3px 8px;border:1px solid #eee;border-radius:6px;">${esc((it.url||'#').replace('.html',''))}</span>`
          }
        `;

        // Whole row is clickable: jump if on this page, navigate otherwise
        row.addEventListener('click', (e) => {
          // Don't trigger navigation when clicking the save button
          if (e.target.closest('.save-btn')) return;
          if (isHere && onJump) {
            onJump(it);
            closeModal('globalSearchModal');
          } else if (it.url) {
            window.location.href = it.url;
          }
        });

        cont.appendChild(row);
      });
    });
    wireSaveButtons();
  }

  function esc(s) { return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }

  function openLevelSheet(items, onSelect, title) {
    // Remove any existing sheet
    document.getElementById('_lsheet')?.remove();

    const sheet = document.createElement('div');
    sheet.id = '_lsheet';

    const listHtml = items.map(it => `
      <button class="lsheet-item" data-idx="${it.index ?? 0}" type="button">
        <span class="lsheet-word">${esc(it.label)}</span>
        ${it.translation ? `<span class="lsheet-trans">${esc(it.translation)}</span>` : ''}
      </button>`).join('');

    sheet.innerHTML = `
      <div class="lsheet-backdrop"></div>
      <div class="lsheet-panel">
        <div class="lsheet-header">
          <span class="lsheet-title">${esc(title)}</span>
          <button class="lsheet-close icon-btn" type="button" aria-label="Close">✕</button>
        </div>
        <div class="lsheet-body">${listHtml}</div>
      </div>`;

    document.body.appendChild(sheet);

    const close = () => sheet.remove();
    sheet.querySelector('.lsheet-backdrop').addEventListener('click', close);
    sheet.querySelector('.lsheet-close').addEventListener('click', close);
    sheet.querySelectorAll('.lsheet-item').forEach(btn => {
      btn.addEventListener('click', () => {
        onSelect(parseInt(btn.dataset.idx, 10));
        close();
      });
    });
  }

  window.SharedApp = { openModal, closeModal, getSaved, setSaved, getMeta, setMeta, setSaveBtnState, wireSaveButtons, initSavedModal, initSearchModal, registerPageItems, openLevelSheet };
  window.wireSaveButtons = wireSaveButtons;

  // Ensure drawer is always treated as top-most overlay
  document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.querySelector('.menu-btn');
    const closeBtn = document.querySelector('.drawer-close');
    const backdrop = document.querySelector('.drawer-backdrop');
    const drawer = document.querySelector('.drawer');

    const setOpen = (isOpen) => {
      document.body.classList.toggle('drawer-open', !!isOpen);
    };

    menuBtn?.addEventListener('click', () => setOpen(true));
    closeBtn?.addEventListener('click', () => setOpen(false));
    backdrop?.addEventListener('click', () => setOpen(false));

    // Safety: if drawer is hidden by other code, keep class in sync
    const obs = drawer ? new MutationObserver(() => setOpen(!drawer.hidden)) : null;
    obs?.observe(drawer, { attributes:true, attributeFilter:['hidden'] });
  });
})();
