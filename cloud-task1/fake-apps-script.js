// A small in-memory stand-in for the Apps Script services the tracker uses.
// It exists so the real collector and reviewer code can be executed end to end
// in Node — writeTable and readObjects included, because the sheet round-trip
// is exactly where a review could silently be lost.
const fs = require('fs');
const vm = require('vm');

class FakeRange {
  constructor(sheet, row, col, rows, cols) {
    Object.assign(this, { sheet, row, col, rows, cols });
  }
  setValues(values) {
    values.forEach((line, r) => line.forEach((value, c) => {
      const rowIndex = this.row - 1 + r;
      while (this.sheet.cells.length <= rowIndex) this.sheet.cells.push([]);
      this.sheet.cells[rowIndex][this.col - 1 + c] = value == null ? '' : String(value);
    }));
    return this;
  }
  getDisplayValues() {
    const out = [];
    for (let r = 0; r < this.rows; r += 1) {
      const line = [];
      for (let c = 0; c < this.cols; c += 1) line.push((this.sheet.cells[this.row - 1 + r] || [])[this.col - 1 + c] || '');
      out.push(line);
    }
    return out;
  }
  getRichTextValues() {
    return this.getDisplayValues().map(line => line.map(value => ({ getLinkUrl: () => this.sheet.links[value] || null })));
  }
  setFormula(formula) {
    const match = String(formula).match(/^=HYPERLINK\("([^"]*)","([^"]*)"\)$/);
    if (match) {
      this.sheet.cells[this.row - 1][this.col - 1] = match[2];
      this.sheet.links[match[2]] = match[1];
    }
    return this;
  }
  // Formatting is irrelevant to correctness here; accept and ignore it.
  setFontFamily() { return this; } setFontSize() { return this; } setWrap() { return this; }
  setBorder() { return this; } setFontWeight() { return this; } setBackground() { return this; }
  setFontColor() { return this; }
  createFilter() {
    if (this.sheet.filter) throw new Error('a sheet may only have one filter');
    this.sheet.filter = { range: [this.row, this.col, this.rows, this.cols], remove: () => { this.sheet.filter = null; } };
    return this.sheet.filter;
  }
}

class FakeSheet {
  constructor(name) { this.name = name; this.cells = []; this.links = {}; this.hidden = []; }
  getName() { return this.name; }
  clear() { this.cells = []; return this; }
  getLastRow() { return this.cells.length; }
  getLastColumn() { return Math.max(0, ...this.cells.map(r => r.length)); }
  getRange(row, col, rows, cols) { return new FakeRange(this, row, col, rows || 1, cols || 1); }
  getDataRange() { return new FakeRange(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  setFrozenRows() { return this; }
  autoResizeColumns() { return this; }
  setColumnWidth() { return this; }
  hideColumns(col) { this.hidden.push(col); return this; }
  getFilter() { return this.filter || null; }
}

class FakeSpreadsheet {
  constructor(id) { this.id = id; this.sheets = []; }
  getId() { return this.id; }
  getUrl() { return `https://docs.google.com/spreadsheets/d/${this.id}/edit`; }
  getSheets() { return this.sheets.slice(); }
  getSheetByName(name) { return this.sheets.find(s => s.name === name) || null; }
  insertSheet(name) { const sheet = new FakeSheet(name); this.sheets.push(sheet); return sheet; }
  deleteSheet(sheet) { this.sheets = this.sheets.filter(s => s !== sheet); }
}

function createEnvironment(options) {
  const opts = options || {};
  const properties = Object.assign({}, opts.properties);
  const spreadsheets = {};
  const files = {};
  const fetchHandler = opts.fetch || (() => ({ code: 404, body: '' }));
  const mails = [];

  let fileClock = 0;
  const allFolders = {};
  const makeFile = (id, name, spreadsheet, mimeType) => {
    const created = new Date(Date.parse('2026-08-31T00:00:00Z') + (fileClock += 1000));
    const file = {
      getId: () => id, getName: () => name, getUrl: () => `https://drive.google.com/file/d/${id}`,
      getMimeType: () => mimeType || (spreadsheet ? 'sheets' : 'text/csv'),
      isTrashed: () => false, getDateCreated: () => created,
      getBlob: () => ({ getDataAsString: () => (opts.textFiles || {})[name] || '' }),
      setContent: () => file,
      setName: newName => { name = newName; return file; },
      moveTo: destination => {
        Object.keys(allFolders).forEach(key => {
          allFolders[key]._files = allFolders[key]._files.filter(f => f !== file);
        });
        destination._files.push(file);
        return file;
      },
      makeCopy: (newName, folder) => {
        const copyId = `${id}-copy-${Object.keys(files).length}`;
        const copy = new FakeSpreadsheet(copyId);
        if (spreadsheet) copy.sheets = spreadsheet.getSheets().map(sheet => {
          const clone = new FakeSheet(sheet.name);
          clone.cells = sheet.cells.map(line => line.slice());
          clone.links = Object.assign({}, sheet.links);
          return clone;
        });
        spreadsheets[copyId] = copy;
        const copyFile = makeFile(copyId, newName, copy);
        (folder ? folder._files : []).push(copyFile);
        return copyFile;
      },
    };
    files[id] = file;
    return file;
  };

  const makeFolder = (id, name) => {
    const folder = allFolders[id] = {
      _files: [], _folders: [], getId: () => id, getName: () => name,
      getFilesByName(wanted) { return iterator(this._files.filter(f => f.getName() === wanted)); },
      getFilesByType() { return iterator(this._files); },
      getFiles() { return iterator(this._files); },
      getFoldersByName(wanted) { return iterator(this._folders.filter(f => f.getName() === wanted)); },
      createFolder(childName) { const child = makeFolder(`${id}-${childName}`, childName); this._folders.push(child); return child; },
      createFile(fileName, content) {
        const file = makeFile(`${id}-${fileName}`, fileName, null, 'text/csv');
        file.getBlob = () => ({ getDataAsString: () => content });
        this._files.push(file);
        return file;
      },
      // A data file stored as a Google Sheet rather than a CSV.
      createSheetFile(fileName, grid) {
        const sheetId = `${id}-${fileName}-sheet`;
        const spreadsheet = new FakeSpreadsheet(sheetId);
        const sheet = spreadsheet.insertSheet('Sheet1');
        sheet.getRange(1, 1, grid.length, grid[0].length).setValues(grid);
        spreadsheets[sheetId] = spreadsheet;
        const file = makeFile(sheetId, fileName, spreadsheet, 'sheets');
        // getBlob on a real Google Sheet yields a PDF, not the data.
        file.getBlob = () => ({ getDataAsString: () => '%PDF-1.4 binary garbage' });
        this._files.push(file);
        return file;
      },
    };
    return folder;
  };
  const iterator = list => { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; };

  const trackerFolder = makeFolder('tracker-folder', 'GeBiz Daily');
  const archiveFolder = makeFolder('archive-folder', 'Archived');
  trackerFolder._folders.push(archiveFolder);

  const context = {
    console, Date, JSON, Math, Number, String, Object, Array, isNaN, RegExp, Error,
    __state: { spreadsheets, files, trackerFolder, archiveFolder, properties, mails },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: name => (name in properties ? properties[name] : null),
        setProperty: (name, value) => { properties[name] = String(value); },
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    MailApp: { sendEmail: (to, subject, body) => mails.push({ to, subject, body }) },
    MimeType: { GOOGLE_SHEETS: 'sheets', PLAIN_TEXT: 'text/plain' },
    SpreadsheetApp: {
      openById: id => spreadsheets[id] || (spreadsheets[id] = new FakeSpreadsheet(id)),
      flush() {},
    },
    DriveApp: {
      getFolderById: id => (id === 'tracker-folder' ? trackerFolder : archiveFolder),
      getFileById: id => files[id] || makeFile(id, id, spreadsheets[id]),
    },
    UrlFetchApp: {
      fetch: (url, params) => {
        const result = fetchHandler(url, params);
        return {
          getResponseCode: () => result.code,
          getContentText: () => result.body,
          getHeaders: () => result.headers || {},
        };
      },
      fetchAll: requests => requests.map(request => {
        const result = fetchHandler(request.url, request);
        return { getResponseCode: () => result.code, getContentText: () => result.body, getHeaders: () => ({}) };
      }),
    },
    Utilities: {
      formatDate: (date, tz, format) => {
        const d = new Date(date);
        const pad = n => String(n).padStart(2, '0');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        if (format === 'yyyy-MM-dd') return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
        if (format === 'yyyy-MM-dd_HHmm') return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
        if (format === 'yyyy-MM-dd HH:mm') return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
        if (format === 'dd MMM yyyy') return `${pad(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
        if (format === 'u') return String(d.getUTCDay() === 0 ? 7 : d.getUTCDay());
        if (format === 'dd/MM/yy, h:mm a') {
          let hour = d.getUTCHours();
          const meridiem = hour >= 12 ? 'PM' : 'AM';
          hour = hour % 12 || 12;
          return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)}, ${hour}:${pad(d.getUTCMinutes())} ${meridiem}`;
        }
        return d.toISOString();
      },
      parseCsv: text => text.trim().split(/\r?\n/).map(line => {
        const cells = []; let cell = ''; let quoted = false;
        for (let i = 0; i < line.length; i += 1) {
          const ch = line[i];
          if (quoted) {
            if (ch === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
            else if (ch === '"') quoted = false;
            else cell += ch;
          } else if (ch === '"') quoted = true;
          else if (ch === ',') { cells.push(cell); cell = ''; }
          else cell += ch;
        }
        cells.push(cell);
        return cells;
      }),
      newBlob: (content, type, name) => ({ content, type, name }),
    },
    XmlService: { parse: () => { throw new Error('XmlService not stubbed'); } },
    ScriptApp: {
      WeekDay: { WEDNESDAY: 'WEDNESDAY', FRIDAY: 'FRIDAY' },
      getProjectTriggers: () => [],
      newTrigger: () => {
        const builder = new Proxy({}, { get: (t, prop) => prop === 'create' ? () => ({}) : () => builder });
        return builder;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(`${__dirname}/dist/Code.gs`, 'utf8'), context);
  return context;
}

module.exports = { createEnvironment, FakeSpreadsheet, FakeSheet };
