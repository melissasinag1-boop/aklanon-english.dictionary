'use strict';

/* ---------- Settings ---------- */

// When true, typing an English word (for example "fan") also finds entries
// whose meaning contains it. Set to false for strict Aklanon-to-English lookup.
const SEARCH_ENGLISH_MEANINGS = true;
const MIN_MEANING_QUERY = 3;

/* ---------- Text helpers ---------- */

// Lowercase, drop "(h)", accents, apostrophes and hyphens so that
// "aba", "abá", "abá(h)" and "ab-ab" / "abab" all match as expected.
function fold(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\(h\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019`\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstLetter(folded) {
  return folded.startsWith('ng') ? 'ng' : folded.charAt(0);
}

const POS_LABELS = {
  n: 'noun',
  adj: 'adjective',
  intj: 'interjection',
  letter: 'letter',
  RV: 'verb',
  CV: 'causative verb'
};

function posLabel(code) {
  const m = /^RV(\d)$/.exec(code);
  if (m) return 'verb, class ' + m[1];
  return POS_LABELS[code] || code;
}

function posKind(code) {
  if (/^(RV\d?|CV|DV|ST\d)$/.test(code)) return 'verb';
  if (code === 'n') return 'noun';
  return 'other';
}

const ORIGINS = {
  Sp: 'Spanish',
  Eng: 'English',
  Tag: 'Tagalog',
  Ch: 'Chinese',
  Hil: 'Hiligaynon',
  Jp: 'Japanese'
};

/* ---------- Data and search ---------- */

function prepare(entries) {
  return entries.map(function (e, i) {
    const derived = (e.derived || []).map(function (d) {
      return { d: d, key: fold(d.form) };
    });
    const meaningText = [e.meaning]
      .concat((e.derived || []).map(function (d) { return d.meaning; }))
      .join(' ; ');
    return Object.assign({}, e, {
      _i: i,
      _word: fold(e.word),
      _derived: derived,
      _meaning: fold(meaningText)
    });
  });
}

function byWord(a, b) {
  return a._word.localeCompare(b._word) || a._i - b._i;
}

// Returns [{ entry, score, via }] ordered best match first.
// score 0 exact, 1 starts with, 2 derived exact, 3 derived starts with,
// 4 contains, 5 found in English meaning.
function search(entries, query, letter) {
  const q = fold(query);
  const pool = letter
    ? entries.filter(function (e) { return firstLetter(e._word) === letter; })
    : entries;

  if (!q) {
    return pool.slice().sort(byWord).map(function (e) {
      return { entry: e, score: 0, via: null };
    });
  }

  const out = [];
  pool.forEach(function (e) {
    let score = null;
    let via = null;

    if (e._word === q) {
      score = 0;
    } else if (e._word.startsWith(q)) {
      score = 1;
    } else {
      const exact = e._derived.find(function (x) { return x.key === q; });
      const starts = e._derived.find(function (x) { return x.key.startsWith(q); });
      if (exact) {
        score = 2;
        via = { type: 'derived', form: exact.d.form };
      } else if (starts) {
        score = 3;
        via = { type: 'derived', form: starts.d.form };
      } else if (e._word.includes(q)) {
        score = 4;
      } else if (SEARCH_ENGLISH_MEANINGS && q.length >= MIN_MEANING_QUERY && e._meaning.includes(q)) {
        score = 5;
        via = { type: 'meaning' };
      }
    }

    if (score !== null) out.push({ entry: e, score: score, via: via });
  });

  out.sort(function (a, b) {
    return a.score - b.score || byWord(a.entry, b.entry);
  });
  return out;
}

/* ---------- Rendering ---------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function headword(word) {
  const span = el('span', 'word');
  word.split(/(\(h\))/).forEach(function (part) {
    if (!part) return;
    if (part === '(h)') span.appendChild(el('span', 'h', part));
    else span.appendChild(document.createTextNode(part));
  });
  return span;
}

function exampleBlock(ex) {
  const p = el('p', 'ex');
  p.appendChild(el('span', 'akl', ex.akl));
  p.appendChild(el('span', 'eng', ex.eng));
  return p;
}

function renderEntry(result) {
  const e = result.entry;
  const li = el('li');
  const details = el('details', 'entry ' + posKind(e.pos));

  const summary = el('summary');
  const head = el('div', 'head');
  head.appendChild(headword(e.word));
  const pos = el('span', 'pos', posLabel(e.pos));
  pos.title = e.pos;
  head.appendChild(pos);
  summary.appendChild(head);
  summary.appendChild(el('p', 'meaning', e.meaning));

  if (result.via && result.via.type === 'derived') {
    summary.appendChild(el('p', 'via', 'Root of ' + result.via.form));
  } else if (result.via && result.via.type === 'meaning') {
    summary.appendChild(el('p', 'via', 'Found in the English meaning'));
  }
  details.appendChild(summary);

  const more = el('div', 'more');

  if (e.examples && e.examples.length) {
    more.appendChild(el('h3', null, 'Examples'));
    e.examples.forEach(function (ex) { more.appendChild(exampleBlock(ex)); });
  }

  if (e.derived && e.derived.length) {
    more.appendChild(el('h3', null, 'Derived forms'));
    const dl = el('dl', 'derived');
    e.derived.forEach(function (d) {
      const wrap = el('div');
      const dt = el('dt', null, d.form);
      if (d.pos) {
        const p = el('span', 'pos', posLabel(d.pos));
        dt.appendChild(p);
      }
      wrap.appendChild(dt);
      wrap.appendChild(el('dd', null, d.meaning));
      if (d.example) {
        const dd = el('dd');
        dd.appendChild(exampleBlock(d.example));
        wrap.appendChild(dd);
      }
      dl.appendChild(wrap);
    });
    more.appendChild(dl);
  }

  function related(label, words) {
    if (!words || !words.length) return;
    const p = el('p', 'rel', label + ': ');
    words.forEach(function (w, idx) {
      if (idx) p.appendChild(document.createTextNode(', '));
      p.appendChild(el('i', null, w));
    });
    more.appendChild(p);
  }
  related('Similar meaning', e.syn);
  related('Opposite', e.opp);

  if (e.origin) {
    more.appendChild(el('p', 'rel', 'Borrowed from ' + (ORIGINS[e.origin] || e.origin)));
  }

  if (e.page) {
    more.appendChild(el('p', 'src', 'Salas Reyes et al. (1969), p. ' + e.page));
  }

  details.appendChild(more);
  li.appendChild(details);
  return li;
}

/* ---------- App ---------- */

async function init() {
  const $ = function (id) { return document.getElementById(id); };
  const input = $('q');
  const lettersNav = $('letters');
  const list = $('results');
  const count = $('count');
  const empty = $('empty');
  const about = $('about');

  let entries = [];
  let activeLetter = '';

  try {
    const res = await fetch('entries.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    entries = prepare(await res.json());
  } catch (err) {
    empty.hidden = false;
    empty.textContent = 'The word list could not be loaded. Check your connection and reload the page. If it keeps failing, the data file may contain an error.';
    return;
  }

  $('about-count').textContent = 'It currently has ' + entries.length + ' entries.';

  // Letter chips built from the letters actually present in the data.
  const letters = Array.from(new Set(entries.map(function (e) { return firstLetter(e._word); })))
    .sort(function (a, b) { return a.localeCompare(b); });

  function makeChip(label, value) {
    const b = el('button', 'chip', label);
    b.type = 'button';
    b.dataset.letter = value;
    b.setAttribute('aria-pressed', value === activeLetter ? 'true' : 'false');
    b.addEventListener('click', function () {
      activeLetter = value === activeLetter ? '' : value;
      Array.from(lettersNav.children).forEach(function (c) {
        c.setAttribute('aria-pressed', c.dataset.letter === activeLetter ? 'true' : 'false');
      });
      render();
    });
    return b;
  }

  lettersNav.appendChild(makeChip('All', ''));
  letters.forEach(function (l) {
    lettersNav.appendChild(makeChip(l.charAt(0).toUpperCase() + l.slice(1), l));
  });
  // "All" is pressed when no letter is active.
  lettersNav.firstChild.setAttribute('aria-pressed', 'true');
  lettersNav.firstChild.addEventListener('click', function () {
    activeLetter = '';
    Array.from(lettersNav.children).forEach(function (c) {
      c.setAttribute('aria-pressed', c.dataset.letter === '' ? 'true' : 'false');
    });
    render();
  });

  function render() {
    const results = search(entries, input.value, activeLetter);
    list.textContent = '';
    results.forEach(function (r) { list.appendChild(renderEntry(r)); });

    if (results.length === 0) {
      empty.hidden = false;
      empty.textContent = 'No entries match "' + input.value.trim() + '". Check the spelling, or try the root word. Prefixes such as pa-, pang-, ma-, and ka- are listed under the root.';
      count.textContent = '';
    } else {
      empty.hidden = true;
      count.textContent = results.length === entries.length
        ? entries.length + ' entries'
        : results.length + ' of ' + entries.length + ' entries';
    }
  }

  input.addEventListener('input', render);

  $('about-btn').addEventListener('click', function () {
    if (typeof about.showModal === 'function') about.showModal();
    else about.setAttribute('open', '');
  });
  $('about-close').addEventListener('click', function () {
    if (typeof about.close === 'function') about.close();
    else about.removeAttribute('open');
  });

  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is optional */ });
  }
}

if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined') module.exports = { fold, prepare, search, firstLetter, posLabel, posKind };
