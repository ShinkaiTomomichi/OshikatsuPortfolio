// ---- Constants ----

const CATEGORY_LABEL = {
  live:  'ライブ',
  event: 'イベント',
  shop:  '店舗コラボ',
  popup: 'POPUP',
  food:  'フード',
};

const filterState = {
  category: 'all',
  year:     'all',
  tags:     new Set(), // 空 = すべて表示
};

// ---- Utility ----

/**
 * XSS 対策: HTML 特殊文字をエスケープする
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// ---- Data ----

/**
 * data/logs.json を fetch して配列で返す
 * @returns {Promise<Array>}
 */
async function loadLogs() {
  const res = await fetch('data/logs.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---- Stats ----

/**
 * カテゴリ別カウントを集計カードに書き込む
 * @param {Array} logs
 */
function updateStats(logs) {
  const total  = logs.length;
  const live   = logs.filter(l => l.category === 'live').length;
  const event  = logs.filter(l => l.category === 'event').length;
  const shop   = logs.filter(l => ['shop', 'popup', 'food'].includes(l.category)).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-live').textContent  = live;
  document.getElementById('stat-event').textContent = event;
  document.getElementById('stat-shop').textContent  = shop;
}

// ---- Build Entry HTML ----

/**
 * 1 件のエントリの HTML 文字列を生成する
 * @param {Object} log
 * @returns {string}
 */
function buildEntryHTML(log) {
  const date     = escapeHTML(log.date     || '');
  const category = escapeHTML(log.category || 'shop');
  const title    = escapeHTML(log.title    || '');
  const venue    = escapeHTML(log.venue    || '');
  const url      = escapeHTML(log.url      || '');
  const body     = escapeHTML(log.body     || '');
  const tags     = Array.isArray(log.tags)   ? log.tags   : [];
  const images   = Array.isArray(log.images) ? log.images : [];
  const year     = date.slice(0, 4);

  const labelText = CATEGORY_LABEL[log.category] || escapeHTML(log.category);
  const badgeClass = `log-entry__badge--${category}`;
  const tagsAttr   = escapeHTML(tags.join(','));

  // メタ情報
  let metaHTML = '';
  if (venue) {
    metaHTML += `
      <span class="log-entry__meta-item">
        <span aria-hidden="true">📍</span>${venue}
      </span>`;
  }
  if (url) {
    metaHTML += `
      <span class="log-entry__meta-item">
        <span aria-hidden="true">🔗</span>
        <a class="log-entry__meta-link" href="${url}" target="_blank" rel="noopener noreferrer">公式サイト</a>
      </span>`;
  }

  // 本文
  const bodyHTML = body
    ? `<p class="log-body">${body}</p>`
    : '';

  // タグ
  const tagsHTML = tags.length
    ? `<div class="log-tags">${tags.map(t => `<span class="log-tag">${escapeHTML(t)}</span>`).join('')}</div>`
    : '';

  // 写真（最大 3 枚）
  const photos = images.slice(0, 6);
  const photosHTML = photos.length
    ? `<div class="log-photos">
        ${photos.map(src => `
          <div class="log-photo-wrap js-lightbox-trigger" data-src="${escapeHTML(src)}" role="button" tabindex="0" aria-label="写真を拡大">
            <img src="${escapeHTML(src)}" alt="${title}" loading="lazy">
          </div>`).join('')}
      </div>`
    : '';

  return `
    <article class="log-entry"
             data-category="${category}"
             data-year="${escapeHTML(year)}"
             data-tags="${tagsAttr}">
      <div class="log-entry__header">
        <time class="log-entry__date" datetime="${date}">${date}</time>
        <span class="log-entry__badge ${badgeClass}">${escapeHTML(labelText)}</span>
        <h2 class="log-entry__title">${title}</h2>
      </div>
      ${metaHTML ? `<div class="log-entry__meta">${metaHTML}</div>` : ''}
      ${bodyHTML}
      ${tagsHTML}
      ${photosHTML}
    </article>`;
}

// ---- Render Timeline ----

/**
 * 日付降順ソート -> 年ごとにグループ化して #timeline に描画
 * @param {Array} logs
 */
function renderTimeline(logs) {
  const timeline = document.getElementById('timeline');

  // 日付降順
  const sorted = [...logs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 年ごとにグループ化
  const groups = {};
  sorted.forEach(log => {
    const year = (log.date || '????').slice(0, 4);
    if (!groups[year]) groups[year] = [];
    groups[year].push(log);
  });

  const years = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  timeline.innerHTML = years.map(year => {
    const entries = groups[year];
    return `
      <div class="timeline-group" data-year="${escapeHTML(year)}">
        <div class="timeline-year">
          ${escapeHTML(year)}年
          <span class="timeline-year__badge">${entries.length}</span>
        </div>
        <div class="timeline-entries">
          ${entries.map(buildEntryHTML).join('')}
        </div>
      </div>`;
  }).join('');
}

// ---- Filters ----

/**
 * filterState の 3 条件を AND 評価し、各エントリの表示を切り替える
 */
function applyFilters() {
  const { category, year, tags } = filterState;

  let visibleCount = 0;

  document.querySelectorAll('.timeline-group').forEach(group => {
    let groupVisible = false;

    group.querySelectorAll('.log-entry').forEach(entry => {
      const eCategory = entry.dataset.category || '';
      const eYear     = entry.dataset.year     || '';
      const eTags     = entry.dataset.tags ? entry.dataset.tags.split(',') : [];

      const matchCategory = category === 'all' || eCategory === category;
      const matchYear     = year     === 'all' || eYear     === year;
      // タグは複数選択 OR 判定。未選択（空Set）の場合はすべて表示
      const matchTag      = tags.size === 0 || eTags.some(t => tags.has(t));

      const visible = matchCategory && matchYear && matchTag;
      entry.style.display = visible ? '' : 'none';

      if (visible) {
        groupVisible = true;
        visibleCount++;
      }
    });

    group.style.display = groupVisible ? '' : 'none';
  });

  const emptyState = document.getElementById('empty-state');
  emptyState.hidden = visibleCount > 0;
}

/**
 * 汎用フィルターバー初期化
 * @param {string}   barId    - 対象要素の id
 * @param {string}   attr     - filterState のキー ('category' | 'year' | 'tag')
 * @param {string[]} items    - フィルター値の配列
 * @param {Function} labelFn  - 値 -> 表示ラベル の変換関数
 * @param {string}   allLabel - 全件ボタンのラベル
 */
function setupFilterBar(barId, attr, items, labelFn, allLabel) {
  const bar = document.getElementById(barId);
  if (!bar) return;

  const buttonsHTML = [
    `<button class="filter-btn is-active" data-filter-type="${escapeHTML(attr)}" data-filter="all">${escapeHTML(allLabel)}</button>`,
    ...items.map(item =>
      `<button class="filter-btn" data-filter-type="${escapeHTML(attr)}" data-filter="${escapeHTML(item)}">${escapeHTML(labelFn(item))}</button>`
    ),
  ].join('');

  bar.insertAdjacentHTML('beforeend', buttonsHTML);

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn || btn.dataset.filterType !== attr) return;

    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    filterState[attr] = btn.dataset.filter;
    applyFilters();
  });
}

/**
 * カテゴリフィルター（静的 HTML ボタン）のイベント設定
 */
function setupFilter() {
  const bar = document.getElementById('category-filter-bar');
  if (!bar) return;

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn[data-filter-type="category"]');
    if (!btn) return;

    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    filterState.category = btn.dataset.filter;
    applyFilters();
  });
}

/**
 * 年フィルターバーを初期化する
 * @param {Array} logs
 */
function setupYearFilter(logs) {
  const years = [...new Set(
    logs.map(l => (l.date || '').slice(0, 4)).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  setupFilterBar('year-filter-bar', 'year', years, y => `${y}年`, 'すべて');
}

/**
 * タグフィルターバーを初期化する（折りたたみ＋複数選択）
 * @param {Array} logs
 */
function setupTagFilter(logs) {
  const allTags = [...new Set(
    logs.flatMap(l => (Array.isArray(l.tags) ? l.tags : []))
  )].sort((a, b) => a.localeCompare(b, 'ja'));

  const bar = document.getElementById('tag-filter-bar');
  if (!bar) return;

  bar.classList.add('filter-bar--collapsible');
  bar.innerHTML = `
    <button class="filter-bar__toggle" id="tag-filter-toggle"
            aria-expanded="false" aria-controls="tag-filter-body">
      <span class="filter-bar__label">タグ:</span>
      <span class="filter-bar__toggle-icon" aria-hidden="true">▼</span>
      <span class="filter-bar__selected-count" id="tag-selected-count" hidden></span>
    </button>
    <div class="filter-bar__body" id="tag-filter-body" role="group" aria-label="タグ絞り込み">
      ${allTags.map(t =>
        `<button class="filter-btn" data-filter-type="tag" data-filter="${escapeHTML(t)}">${escapeHTML(t)}</button>`
      ).join('')}
    </div>`;

  const toggle     = document.getElementById('tag-filter-toggle');
  const body       = document.getElementById('tag-filter-body');
  const countBadge = document.getElementById('tag-selected-count');

  // 開閉トグル
  toggle.addEventListener('click', () => {
    const isOpen = bar.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // タグボタンの複数選択トグル
  body.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn[data-filter-type="tag"]');
    if (!btn) return;

    const tag = btn.dataset.filter;
    if (filterState.tags.has(tag)) {
      filterState.tags.delete(tag);
      btn.classList.remove('is-active');
    } else {
      filterState.tags.add(tag);
      btn.classList.add('is-active');
    }

    // 選択件数バッジを更新
    const count = filterState.tags.size;
    if (count > 0) {
      countBadge.textContent = `${count}件選択中`;
      countBadge.hidden = false;
      toggle.classList.add('has-selection');
    } else {
      countBadge.hidden = true;
      toggle.classList.remove('has-selection');
    }

    applyFilters();
  });
}

// ---- Lightbox ----

/**
 * フルスクリーンライトボックスを動的生成・初期化する
 */
function setupLightbox() {
  // DOM 生成
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', '画像ライトボックス');

  const img = document.createElement('img');
  img.className = 'lightbox__img';
  img.alt = '拡大画像';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'lightbox__close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', '閉じる');

  lightbox.appendChild(img);
  lightbox.appendChild(closeBtn);
  document.body.appendChild(lightbox);

  // 開く
  function openLightbox(src) {
    img.src = src;
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  // 閉じる
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    // src をリセットして次回読み込みを自然にする
    setTimeout(() => { img.src = ''; }, 250);
  }

  // 閉じるボタン
  closeBtn.addEventListener('click', closeLightbox);

  // 背景クリックで閉じる（画像自体のクリックは除く）
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  // Escape キーで閉じる
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
      closeLightbox();
    }
  });

  // キーボード操作（Enter / Space）で開く
  document.getElementById('timeline').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const trigger = e.target.closest('.js-lightbox-trigger');
    if (!trigger) return;
    e.preventDefault();
    openLightbox(trigger.dataset.src);
  });

  // #timeline への クリックデリゲート
  document.getElementById('timeline').addEventListener('click', e => {
    const trigger = e.target.closest('.js-lightbox-trigger');
    if (!trigger) return;
    openLightbox(trigger.dataset.src);
  });
}

// ---- Init ----

/**
 * エントリポイント
 */
async function init() {
  const timeline = document.getElementById('timeline');

  try {
    const logs = await loadLogs();

    updateStats(logs);
    renderTimeline(logs);
    setupFilter();
    setupYearFilter(logs);
    setupTagFilter(logs);
    setupLightbox();

  } catch (err) {
    console.error('ログの読み込みに失敗しました:', err);
    timeline.innerHTML = `
      <p style="color: var(--text-muted); padding: 40px 0; text-align: center;">
        ログの読み込みに失敗しました。<br>
        ローカルで確認する場合は Web サーバ経由で開いてください。<br>
        <small style="font-size:0.8em;">(${escapeHTML(err.message)})</small>
      </p>`;
  }
}

init();
