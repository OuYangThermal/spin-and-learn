/* ============================================================
   Spin & Learn — word list content.
   Starter packs load from packs/<id>.json (shape: {items:[{q,a,hint}]}),
   falling back to window.SpinLearnEmbeddedPacks[id] when the fetch
   fails (e.g. opened from the file system). Teachers can paste,
   import (.json/.csv), and export their own lists; the custom list
   persists in localStorage.
   ============================================================ */
(function () {
  'use strict';

  var NS = (window.SpinLearn = window.SpinLearn || {});
  var KEY = 'spinlearn.custom.v1';

  var PACKS = [
    { id: 'esl-basic', name: 'ESL Basic Words' },
    { id: 'math', name: 'Math Facts' },
    { id: 'blank', name: 'Blank / Custom' }
  ];

  /* Built-in fallback content (original material) used only when the
     packs/*.json files cannot be fetched. */
  window.SpinLearnEmbeddedPacks = {
    'esl-basic': {
      items: [
        { q: 'apple', a: 'A round red fruit', hint: 'It grows on trees' },
        { q: 'banana', a: 'A long yellow fruit', hint: 'Monkeys love it' },
        { q: 'cat', a: 'A small pet', hint: 'It says meow' },
        { q: 'dog', a: 'A loyal pet', hint: 'It says woof' },
        { q: 'bird', a: 'A flying animal', hint: 'It has wings' },
        { q: 'fish', a: 'A swimming animal', hint: 'It lives in water' },
        { q: 'sun', a: 'The bright star in our sky', hint: 'It shines in the day' },
        { q: 'moon', a: 'It glows at night', hint: 'It is not the sun' },
        { q: 'book', a: 'You read it', hint: 'It has pages' },
        { q: 'tree', a: 'A tall plant', hint: 'It has leaves' },
        { q: 'water', a: 'You drink it', hint: 'It flows in rivers' },
        { q: 'happy', a: 'A good feeling', hint: 'The opposite of sad' }
      ]
    },
    'math': {
      items: [
        { q: '7 + 5', a: '12', hint: 'Count up from 7' },
        { q: '9 + 6', a: '15', hint: '9 plus 6' },
        { q: '4 + 8', a: '12', hint: 'Start at 8 and add 4' },
        { q: '10 + 9', a: '19', hint: 'Almost 20' },
        { q: '3 x 4', a: '12', hint: 'Double 2 x 6' },
        { q: '5 x 5', a: '25', hint: 'A square number' },
        { q: '2 x 9', a: '18', hint: 'Double 9' },
        { q: '12 - 5', a: '7', hint: 'Count back from 12' },
        { q: '15 - 8', a: '7', hint: '15 minus 10, plus 2' },
        { q: '20 - 6', a: '14', hint: '20 minus 10, plus 4' },
        { q: '6 + 7', a: '13', hint: '6 plus 6, plus 1' },
        { q: '4 x 5', a: '20', hint: 'Four nickels' }
      ]
    },
    'blank': { items: [] }
  };

  var items = [];
  var listeners = [];

  function str(v) {
    return v == null ? '' : String(v);
  }

  function normalize(raw) {
    var out = [];
    (raw || []).forEach(function (entry) {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      var q = str(entry.q || entry.question).trim();
      if (!q) {
        return;
      }
      out.push({
        q: q,
        a: str(entry.a || entry.answer).trim(),
        hint: str(entry.hint).trim()
      });
    });
    return out;
  }

  /* Accept either a bare array or the pack shape {items:[...]}. */
  function listFromData(data) {
    if (Array.isArray(data)) {
      return normalize(data);
    }
    if (data && Array.isArray(data.items)) {
      return normalize(data.items);
    }
    return [];
  }

  function notify() {
    var snapshot = getItems();
    listeners.forEach(function (cb) {
      try {
        cb(snapshot);
      } catch (e) { /* listener errors must not break content */ }
    });
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch (e) { /* ignore */ }
  }

  /* Load a starter pack. activate=false previews without switching lists. */
  function loadPack(id, activate) {
    var doActivate = activate !== false;
    return fetch('packs/' + id + '.json')
      .then(function (res) {
        if (!res.ok) {
          throw new Error('pack not found');
        }
        return res.json();
      })
      .catch(function () {
        var emb = window.SpinLearnEmbeddedPacks || {};
        return emb[id] || { items: [] };
      })
      .then(function (data) {
        var list = listFromData(data);
        if (doActivate) {
          items = list;
          notify();
        }
        return list;
      });
  }

  function getItems() {
    return items.slice();
  }

  function getCustomList() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) {
        return null;
      }
      var list = listFromData(JSON.parse(raw));
      return list.length ? list : null;
    } catch (e) {
      return null;
    }
  }

  function setCustomList(list) {
    items = normalize(list);
    persist();
    notify();
    return items.length;
  }

  function addToCustom(list) {
    items = items.concat(normalize(list));
    persist();
    notify();
    return items.length;
  }

  function clearCustom() {
    items = [];
    try {
      localStorage.removeItem(KEY);
    } catch (e) { /* ignore */ }
    notify();
  }

  /* One item per line: question | answer | hint (only question required). */
  function parseTextarea(text) {
    var out = [];
    String(text || '')
      .split(/\r?\n/)
      .forEach(function (line) {
        if (!line.trim()) {
          return;
        }
        var parts = line.split('|');
        var q = (parts[0] || '').trim();
        if (!q) {
          return;
        }
        out.push({
          q: q,
          a: (parts[1] || '').trim(),
          hint: (parts[2] || '').trim()
        });
      });
    return out;
  }

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var src = String(text || '');
    for (var i = 0; i < src.length; i++) {
      var ch = src[i];
      if (inQuotes) {
        if (ch === '"') {
          if (src[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\r') {
        /* skip */
      } else {
        field += ch;
      }
    }
    row.push(field);
    rows.push(row);
    return rows.filter(function (r) {
      return r.some(function (c) {
        return String(c).trim() !== '';
      });
    });
  }

  function isHeaderRow(row) {
    return (
      String(row[0] || '').trim().toLowerCase() === 'q' &&
      (row.length < 2 || String(row[1] || '').trim().toLowerCase() === 'a') &&
      (row.length < 3 || String(row[2] || '').trim().toLowerCase() === 'hint')
    );
  }

  function importJSON(text) {
    var data = JSON.parse(text);
    return setCustomList(listFromData(data));
  }

  function importCSV(text) {
    var rows = parseCSV(text);
    if (rows.length && isHeaderRow(rows[0])) {
      rows.shift();
    }
    var list = rows.map(function (r) {
      return {
        q: String(r[0] || '').trim(),
        a: String(r[1] || '').trim(),
        hint: String(r[2] || '').trim()
      };
    });
    return setCustomList(list);
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
  }

  function csvCell(v) {
    v = str(v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function exportJSON() {
    download('spinlearn-list.json', JSON.stringify(getItems(), null, 2), 'application/json');
  }

  function exportCSV() {
    var lines = ['q,a,hint'];
    getItems().forEach(function (it) {
      lines.push([csvCell(it.q), csvCell(it.a), csvCell(it.hint)].join(','));
    });
    download('spinlearn-list.csv', lines.join('\n'), 'text/csv');
  }

  function onChange(cb) {
    if (typeof cb === 'function') {
      listeners.push(cb);
    }
  }

  NS.content = {
    PACKS: PACKS,
    loadPack: loadPack,
    getItems: getItems,
    setCustomList: setCustomList,
    getCustomList: getCustomList,
    addToCustom: addToCustom,
    clearCustom: clearCustom,
    parseTextarea: parseTextarea,
    importJSON: importJSON,
    importCSV: importCSV,
    exportJSON: exportJSON,
    exportCSV: exportCSV,
    onChange: onChange
  };
})();
