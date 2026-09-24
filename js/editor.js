/* ============================================================
   Spin & Learn — word list editor drawer.
   Pack buttons, textarea editing ("Use This List" / "Add to List"
   / "Clear"), file import (.json/.csv), JSON/CSV export, help text.
   Boot: starts game + editor once the DOM is ready.
   ============================================================ */
(function () {
  'use strict';

  var NS = (window.SpinLearn = window.SpinLearn || {});

  function $(id) {
    return document.getElementById(id);
  }

  function status(msg) {
    $('editor-status').textContent = msg;
  }

  function serialize(list) {
    return list
      .map(function (it) {
        var line = it.q;
        if (it.a || it.hint) {
          line += ' | ' + it.a;
        }
        if (it.hint) {
          line += ' | ' + it.hint;
        }
        return line;
      })
      .join('\n');
  }

  /* Load a starter pack into the textarea for review (does not switch
     the active list until "Use This List" is pressed). */
  function loadPackPreview(id, name) {
    status('Loading ' + name + '…');
    NS.content
      .loadPack(id, false)
      .then(function (list) {
        $('custom-textarea').value = serialize(list);
        status('Loaded “' + name + '” (' + list.length + ' items). Press “Use This List” to activate it.');
      })
      .catch(function () {
        status('Could not load ' + name + '.');
      });
  }

  function useList() {
    var list = NS.content.parseTextarea($('custom-textarea').value);
    if (!list.length) {
      status('Nothing to use — the text area is empty.');
      return;
    }
    NS.content.setCustomList(list);
    status('✓ List ready: ' + list.length + ' items');
  }

  function addList() {
    var list = NS.content.parseTextarea($('custom-textarea').value);
    if (!list.length) {
      status('Nothing to add — the text area is empty.');
      return;
    }
    var total = NS.content.addToCustom(list);
    status('✓ Added ' + list.length + ' items (' + total + ' total)');
  }

  function clearList() {
    if (!window.confirm('Clear your custom word list?')) {
      return;
    }
    NS.content.clearCustom();
    $('custom-textarea').value = '';
    status('List cleared.');
  }

  function importFile() {
    $('file-import').click();
  }

  // Demo gate: file import/export is a paid-version feature. Pasting
  // lists (the core classroom flow) always works and is never gated.
  function paidOnly(fn) {
    return function () {
      if (NS.config.demoMode) {
        status('File import/export comes with the full version ' +
               '($9 Personal). Pasting a list here works fully — ' +
               'and your list is saved automatically.');
        return;
      }
      fn();
    };
  }

  function onFileChosen(evt) {
    var file = evt.target.files && evt.target.files[0];
    evt.target.value = '';
    if (!file) {
      return;
    }
    var name = file.name || '';
    var ext = name.split('.').pop().toLowerCase();
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var count;
        if (ext === 'json') {
          count = NS.content.importJSON(String(reader.result));
        } else if (ext === 'csv') {
          count = NS.content.importCSV(String(reader.result));
        } else {
          status('Please choose a .json or .csv file.');
          return;
        }
        $('custom-textarea').value = serialize(NS.content.getItems());
        status('✓ Imported ' + count + ' items from ' + name);
      } catch (err) {
        status('Import failed: ' + (err && err.message ? err.message : 'bad file'));
      }
    };
    reader.readAsText(file);
  }

  function open() {
    var custom = NS.content.getCustomList();
    if (custom && custom.length && !$('custom-textarea').value) {
      $('custom-textarea').value = serialize(custom);
    }
    $('editor-panel').classList.add('open');
  }

  function close() {
    $('editor-panel').classList.remove('open');
  }

  function toggle() {
    if ($('editor-panel').classList.contains('open')) {
      close();
    } else {
      open();
    }
  }

  function init() {
    var list = $('pack-list');
    list.innerHTML = '';
    NS.content.PACKS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-ghost pack-btn';
      b.textContent = p.name;
      b.addEventListener('click', function () {
        loadPackPreview(p.id, p.name);
      });
      list.appendChild(b);
    });

    $('btn-use-list').addEventListener('click', useList);
    $('btn-add-list').addEventListener('click', addList);
    $('btn-clear-list').addEventListener('click', clearList);
    $('btn-import').addEventListener('click', paidOnly(importFile));
    $('file-import').addEventListener('change', onFileChosen);
    $('btn-export-json').addEventListener('click', paidOnly(function () {
      NS.content.exportJSON();
      status('JSON exported.');
    }));
    $('btn-export-csv').addEventListener('click', paidOnly(function () {
      NS.content.exportCSV();
      status('CSV exported.');
    }));
    $('editor-close').addEventListener('click', close);
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        close();
      }
    });

    $('editor-help').innerHTML =
      '<h3>Format</h3>' +
      '<p>One item per line:</p>' +
      '<p class="format-line"><code>question | answer | hint</code></p>' +
      '<p>Only the question is required. Example:</p>' +
      '<p class="format-line"><code>7 x 8 | 56 | Think 7 x 7 = 49, plus 7</code></p>' +
      '<p>Import accepts JSON arrays (or <code>{items: [...]}</code>) and ' +
      'CSV files with <code>q,a,hint</code> columns (a header row is optional).</p>';
  }

  NS.editor = {
    init: init,
    open: open,
    close: close,
    toggle: toggle
  };

  function boot() {
    NS.game.init();
    NS.editor.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
