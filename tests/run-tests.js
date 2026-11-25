#!/usr/bin/env node
/**
 * Iron Division — Headless Regression & Invariant Test Suite
 * Zero external dependencies. Run via:
 *   node tests/run-tests.js
 *   STRESS_RUNS=25 node tests/run-tests.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STRESS_RUNS = Math.max(1, parseInt(process.env.STRESS_RUNS || '15', 10) || 15);

const jsFiles = [
  'js/diagnostics.js',
  'js/data.js',
  'js/engine-helpers.js',
  'js/engine-combat.js',
  'js/engine-pursuit.js',
  'js/ui-render.js',
  'js/guide.js',
  'js/app.js',
  'js/i18n-id.js'
];

const jsSources = {};
for (const f of jsFiles) {
  jsSources[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');
}
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');

function createSandbox(opts = {}) {
  const storage = new Map(Object.entries(opts.initialStorage || {}));
  const elements = new Map();
  const docListeners = {};
  const toasts = [];
  let popupOutput = null;
  let lastBlobContent = null;

  const makeEl = (id = '') => {
    let _innerHTML = '';
    const el = {
      id,
      value: '',
      checked: false,
      textContent: '',
      style: {},
      dataset: {},
      options: [],
      children: [],
      className: '',
      innerHTMLSetCount: 0,
      _attrs: {},
      get innerHTML() { return _innerHTML; },
      set innerHTML(v) {
        _innerHTML = String(v);
        el.innerHTMLSetCount++;
        const matches = [..._innerHTML.matchAll(/<option\s+value="([^"]*)"[^>]*>([^<]*)<\/option>/g)];
        el.children = matches.map(m => ({ value: m[1], textContent: m[2] }));
        el.options = el.children;
      },
      classList: {
        _set: new Set(),
        add(...c) { c.forEach(x => this._set.add(x)); },
        remove(...c) { c.forEach(x => this._set.delete(x)); },
        toggle(c, f) {
          if (f === undefined) {
            if (this._set.has(c)) { this._set.delete(c); return false; }
            this._set.add(c); return true;
          }
          if (f) this._set.add(c); else this._set.delete(c);
          return f;
        },
        contains(c) { return this._set.has(c); }
      },
      setAttribute(k, v) { this._attrs[k] = String(v); },
      getAttribute(k) { return this._attrs[k] || ''; },
      appendChild() {},
      removeChild() {},
      remove() {},
      click() {},
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      closest() { return null; },
      getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 100 }; },
      parentNode: null
    };
    return el;
  };

  const trackedIds = [
    'bf-terrain', 'bf-feature', 'bf-weather', 'toast-container',
    'sideA-commander', 'sideB-commander', 'sideA-add-unit', 'sideB-add-unit',
    'sideA-units-list', 'sideB-units-list', 'sideA-telemetry', 'sideB-telemetry',
    'tactical-sector-canvas', 'units-orbat-grid', 'unit-traits-picker',
    'traits-library-grid', 'cmd-traits-picker', 'cmd-roster-grid',
    'terrain-table-body', 'terrain-weather-grid',
    'btn-lang-en', 'btn-lang-id'
  ];
  for (const id of trackedIds) elements.set(id, makeEl(id));

  const sandbox = {
    console: { log() {}, warn() {}, error(...a) { sandbox.__errors.push(a.join(' ')); } },
    __errors: [],
    __toasts: toasts,
    __getPopupOutput: () => popupOutput,
    __getLastBlob: () => lastBlobContent,
    __storage: storage,
    __elements: elements,
    __docListeners: docListeners,
    Math, Date, Number, String, Boolean, Array, Object, Set, Map, WeakMap, RegExp, JSON, Error, TypeError,
    parseInt, parseFloat, isNaN, isFinite,
    structuredClone: global.structuredClone,
    setTimeout: () => 1,
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    Blob: function(parts) { lastBlobContent = parts.join(''); this.parts = parts; },
    URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
    open: () => {
      if (opts.blockPopup) return null;
      popupOutput = '';
      return {
        document: {
          readyState: 'complete',
          open() {},
          write(h) { popupOutput += h; },
          close() {}
        },
        focus() {},
        print() {}
      };
    },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k)
    },
    document: {
      readyState: 'complete',
      documentElement: { lang: 'en' },
      body: makeEl('body'),
      getElementById: (id) => elements.get(id) || null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag) => makeEl(tag),
      createTreeWalker: () => ({ nextNode: () => null }),
      addEventListener: (ev, fn) => {
        if (!docListeners[ev]) docListeners[ev] = [];
        docListeners[ev].push(fn);
      }
    },
    navigator: {},
    Event: function(t) { this.type = t; },
    NodeFilter: { SHOW_TEXT: 4 },
    MutationObserver: undefined,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  for (const f of jsFiles) {
    vm.runInContext(jsSources[f], sandbox, { filename: f });
  }
  if (sandbox.IronDivision.UI && typeof sandbox.IronDivision.UI.initDelegatedUIHandlers === 'function') {
    sandbox.IronDivision.UI.initDelegatedUIHandlers();
  }
  const origToast = sandbox.IronDivision.Helpers.showToast;
  sandbox.IronDivision.Helpers.showToast = (msg, type) => {
    toasts.push({ msg, type });
    return origToast(msg, type);
  };
  return sandbox;
}

function withFixedRandom(sandbox, vals, fn) {
  const orig = sandbox.Math.random;
  let i = 0;
  sandbox.Math.random = () => vals[i++ % vals.length];
  try { return fn(); } finally { sandbox.Math.random = orig; }
}

function getTpl(ID, kind) {
  const list = ID.Data.DEFAULT_UNIT_TEMPLATES;
  if (kind === 'inf') return list.find(t => t.category === 'infantry' && t.armorTier === 'unarmored');
  if (kind === 'tank') return list.find(t => t.category === 'tank' && t.armorCount > 0);
  if (kind === 'arty') return list.find(t => t.category === 'artillery');
  if (kind === 'recon') return list.find(t => (t.traits || []).includes('recon_support')) || list.find(t => t.category === 'infantry');
  return list[0];
}

// =========================================================================
// 1. JS Syntax Verification
// =========================================================================
for (const f of jsFiles) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' });
}
console.log('PASS [1]: All 9 js/*.js files pass `node --check`.');

// =========================================================================
// 2. Offline Assets & Image Budget Invariants
// =========================================================================
{
  const bundlePath = path.join(ROOT, 'css/tailwind-bundle.css');
  assert(fs.existsSync(bundlePath), 'css/tailwind-bundle.css must exist for offline execution');
  const bundleCss = fs.readFileSync(bundlePath, 'utf8');
  assert(bundleCss.length > 5000, 'css/tailwind-bundle.css must be populated');
  for (const snippet of ['border-slate-800\\/80', 'text-\\[9\\.5px\\]', 'bg-\\[\\#181e19\\]', 'md\\:grid-cols-3', 'sm\\:grid-cols-7']) {
    assert(bundleCss.includes(snippet), `Tailwind bundle missing expected utility: ${snippet}`);
  }
  assert(indexHtml.includes('css/tailwind-bundle.css'), 'index.html must load local css/tailwind-bundle.css');

  for (const [label, content] of [['index.html', indexHtml], ['css/styles.css', stylesCss], ...jsFiles.map(f => [f, jsSources[f]])]) {
    assert(!content.includes('cdn.tailwindcss.com'), `External Tailwind CDN link found in ${label}`);
    assert(!content.includes('fonts.googleapis.com'), `External Google Fonts link found in ${label}`);
  }

  assert(!fs.existsSync(path.join(ROOT, 'img/lightning-strike-in-rain-1777653699XaO.jpg')), 'Unused legacy rain image must be removed');
  const imgFiles = fs.readdirSync(path.join(ROOT, 'img'));
  const imgTotal = imgFiles.reduce((acc, f) => acc + fs.statSync(path.join(ROOT, 'img', f)).size, 0);
  assert(imgTotal < 1048576, `Total img/ directory size (${imgTotal} bytes) must be < 1 MB (1,048,576 bytes)`);

  const bgUrls = [...stylesCss.matchAll(/url\(['"]\.\.\/(img\/[^'"]+)['"]\)/g)].map(m => m[1]);
  assert(bgUrls.length >= 7, 'Expected 7 tab background image URLs in css/styles.css');
  for (const rel of bgUrls) {
    assert(fs.existsSync(path.join(ROOT, rel)), `Referenced background image missing: ${rel}`);
  }

  // 1024px-1279px CSS clipping guard
  assert(!/@media\s*\(min-width:\s*1024px\)\s*\{\s*#view-battlefield\s*\{\s*min-width:\s*1280px/m.test(stylesCss), 'Old 1024px min-width:1280px rule must not exist');
  assert(/@media\s*\(min-width:\s*1280px\)\s*\{\s*#view-battlefield\s*\{\s*min-width:\s*1280px/m.test(stylesCss), 'min-width:1280px must be gated to min-width:1280px');
  assert(/@media\s*\(min-width:\s*1024px\)\s*and\s*\(max-width:\s*1279px\)\s*\{\s*#view-battlefield\s*\{\s*overflow-x:\s*auto/m.test(stylesCss), '1024px-1279px must allow overflow-x:auto');
  console.log(`PASS [2]: 100% offline assets verified (Tailwind=${(bundleCss.length / 1024).toFixed(1)} KB, img/=${(imgTotal / 1024).toFixed(1)} KB across ${imgFiles.length} WebP files).`);
}

// =========================================================================
// 3. Version Unification & Documentation Consistency
// =========================================================================
{
  const s = createSandbox();
  const ID = s.IronDivision;
  assert.strictEqual(ID.VERSION, '3.5', 'ID.VERSION must be 3.5');
  assert(indexHtml.includes('>v3.5<'), 'index.html header badge must show v3.5');
  assert(!indexHtml.includes('>v3.0<'), 'Stale v3.0 badge must be removed from index.html');
  assert.strictEqual(ID.App.buildPresetsExportObject().version, '3.5', 'JSON export version must be 3.5');

  // Dismount wording check (must NOT describe inverted Org <= 20% trigger)
  assert(!/dismount on foot at `<=\s*20%`/i.test(readmeMd) && !/when `Org <=\s*20%`/i.test(readmeMd), 'README dismount wording must not be inverted');
  assert(!jsSources['js/guide.js'].includes('When Org drops to <strong>&lt;= 20%</strong>'), 'guide.js FM dismount wording must not be inverted');
  assert(!jsSources['js/guide.js'].includes('<code>Org &lt;= 20%</code>'), 'guide.js TM dismount wording must not be inverted');
  assert(!jsSources['js/i18n-id.js'].includes('Saat Org turun ke <strong>&lt;= 20%</strong>'), 'i18n-id.js FM dismount wording must not be inverted');
  assert(!jsSources['js/i18n-id.js'].includes('<code>Org &lt;= 20%</code>'), 'i18n-id.js TM dismount wording must not be inverted');

  // DEV-DOC-ARCH function name accuracy
  for (const [name, src] of [['js/guide.js', jsSources['js/guide.js']], ['js/i18n-id.js', jsSources['js/i18n-id.js']]]) {
    for (const stale of ['resolveVigilanceContest', 'processFireSupport', 'resolveCombatPhase']) {
      assert(!src.includes(stale), `Stale DEV-DOC-ARCH symbol ${stale} found in ${name}`);
    }
    for (const current of ['performVigilanceComparison', 'processSideSupportFire', 'resolveUnitEngagement']) {
      assert(src.includes(current), `Expected DEV-DOC-ARCH symbol ${current} missing in ${name}`);
    }
  }
  console.log('PASS [3]: Version constants unified (v3.5), dismount wording aligned, DEV-DOC-ARCH function names accurate.');
}

// =========================================================================
// 4. Core State, Undo, Dropdown Cache, Armor Tier, & AAR Export
// =========================================================================
{
  const staleTemplates = [
    { id: 'tpl_cached_legacy', name: 'Legacy Inf', category: 'infantry', armorTier: 'none', personnel: 500, maxOrg: 50, armorCount: 0, maxSupply: 40, softAttack: 20, hardAttack: 5, defense: 20, piercing: 5, hardness: 0, experience: 'Regular', traits: [] }
  ];
  const s = createSandbox({ initialStorage: { ttrpg_units_v1: JSON.stringify(staleTemplates) } });
  const ID = s.IronDivision;

  // Valid armorTier + self-heal
  const validTiers = new Set(Object.keys(ID.Data.ARMOR_TIERS));
  assert.strictEqual(ID.Data.DEFAULT_UNIT_TEMPLATES.filter(u => !validTiers.has(u.armorTier)).length, 0);
  ID.App.loadSanMarinoScenario();
  assert.strictEqual(ID.state.unitTemplates.find(u => u.id === 'tpl_cached_legacy').armorTier, 'unarmored');

  // Ctrl+Z undo after Reset & Clear + resetSideRuntimeState
  ID.App.loadArracourtScenario();
  ID.Combat.runSingleRound();
  assert.strictEqual(ID.state.battle.round, 2);
  const prePersonnel = ID.state.battle.sideA.units.map(u => u.personnel);

  ID.state.battle.sideA.airstrikeDisabled = true;
  ID.state.battle.sideA.wonVigMarginThisRound = 12;
  ID.App.resetCurrentBattle(true);
  assert.strictEqual(ID.state.battle.sideA.airstrikeDisabled, false);
  assert.strictEqual(ID.state.battle.sideA.wonVigMarginThisRound, 0);
  ID.App.undoLastRound();
  assert.strictEqual(ID.state.battle.round, 2);
  assert.strictEqual(JSON.stringify(ID.state.battle.sideA.units.map(u => u.personnel)), JSON.stringify(prePersonnel));

  ID.App.emptyBattlefield(true);
  assert.strictEqual(ID.state.battle.sideA.units.length, 0);
  ID.App.undoLastRound();
  assert.strictEqual(ID.state.battle.sideA.units.length, 12);

  // Terrain dropdown cache
  const tSel = s.__elements.get('bf-terrain');
  ID.UI.renderEnvironmentSelectors();
  const c1 = tSel.innerHTMLSetCount;
  ID.UI.renderEnvironmentSelectors();
  assert.strictEqual(tSel.innerHTMLSetCount, c1);
  ID.state.terrains.TestZone = { name: 'Test Zone', infAtk: 0, infDef: 0, avAtk: 0, avDef: 0, tankAtk: 0, tankDef: 0, artAtk: 0, artDef: 0, vigMod: 0, supplyDrain: 1, maxEntrench: 3, outnumberCap: 80, isUrban: false };
  ID.UI.renderEnvironmentSelectors();
  assert.strictEqual(tSel.innerHTMLSetCount, c1 + 1);

  // getActiveAARData + danger toast
  assert.strictEqual(typeof ID.UI.getActiveAARData, 'function');
  const sb = createSandbox({ blockPopup: true });
  sb.IronDivision.App.loadArracourtScenario();
  sb.IronDivision.I18n.setLanguage('id');
  sb.IronDivision.UI.exportAARToPDF();
  assert(sb.__toasts.some(t => t.type === 'danger'));
  console.log('PASS [4]: State self-heal, Reset/Clear undo, side reset, #bf-terrain cache, and AAR export verified.');
}

// =========================================================================
// 5. Combat Edge Cases & Reconciled Tactics
// =========================================================================
{
  const s = createSandbox();
  const ID = s.IronDivision;

  // 5a. Return Fire Cover Save (unarmored)
  ID.App.emptyBattlefield(true);
  const atk = ID.Combat.createCombatUnitInstance(getTpl(ID, 'inf'), 'A');
  const def = ID.Combat.createCombatUnitInstance(getTpl(ID, 'inf'), 'B');
  atk.pos = 1; def.pos = 1; atk.softAttack = 5; def.softAttack = 60; def.defense = 60;
  ID.state.battle.sideA.units = [atk];
  ID.state.battle.sideB.units = [def];
  ID.state.battle.logs = [];
  withFixedRandom(s, [0.05, 0.99, 0.99, 0.05, 0.99, 0.99, 0.99, 0.99], () => {
    ID.Combat.resolveUnitEngagement(atk, def, 'A', 'B', ID.Data.TACTICS_DB[0], ID.Data.TACTICS_DB[11], { attackerWonVig: false, statBoost: 0 });
  });
  assert(ID.state.battle.logs.some(l => l.text.includes('[Return Fire Cover & Dispersion]')));
  assert.strictEqual(ID.state.battle.logs.filter(l => l.text.includes('[Return Fire Piercing Check]')).length, 0);

  // 5b. Breakthrough & supply raid fire even when defender is defeated in Main Attack
  ID.App.emptyBattlefield(true);
  const mTank = ID.Combat.createCombatUnitInstance(getTpl(ID, 'tank'), 'A');
  const weakInf = ID.Combat.createCombatUnitInstance(getTpl(ID, 'inf'), 'B');
  mTank.pos = 1; weakInf.pos = 1; mTank.org = 40; mTank.traits = ['supply_raiders']; mTank.softAttack = 250;
  weakInf.personnel = 50; weakInf.org = 5; weakInf.supply = 30;
  ID.state.battle.sideA.units = [mTank];
  ID.state.battle.sideB.units = [weakInf];
  ID.state.battle.logs = [];
  const tacBreak = ID.Data.TACTICS_DB.find(t => t.id === 'atk_breakthrough');
  const tacDef = ID.Data.TACTICS_DB.find(t => t.id === 'def_defend');
  withFixedRandom(s, [0.95, 0.01, 0.01, 0.9, 0.9, 0.9, 0.9], () => {
    ID.Combat.resolveUnitEngagement(mTank, weakInf, 'A', 'B', tacBreak, tacDef, { attackerWonVig: true, statBoost: 0 });
  });
  assert(weakInf.defeated || weakInf.isRallying);
  assert(ID.state.battle.logs.some(l => l.text.includes('[Decisive Breakthrough]')));
  assert(ID.state.battle.logs.some(l => l.text.includes('[Supply Stolen]')));
  assert.strictEqual(ID.state.battle.sideA.nextRoundAtkMod, 10);

  // 5c. Fog recon active check & multi-support target re-pick
  ID.App.emptyBattlefield(true);
  ID.state.environment.terrain = 'Forest';
  ID.state.environment.weather = 'Foggy';
  const arty = ID.Combat.createCombatUnitInstance(getTpl(ID, 'arty'), 'A');
  const recon = ID.Combat.createCombatUnitInstance(getTpl(ID, 'recon'), 'A');
  recon.traits = ['recon_support'];
  ID.state.battle.sideA.units = [arty, recon];
  assert.strictEqual(ID.Helpers.getUnitEngagementRange(arty), 6);
  recon.defeated = true;
  assert.strictEqual(ID.Helpers.getUnitEngagementRange(arty), 4);
  console.log('PASS [5]: Combat edge cases, Return Fire Cover Save, breakthrough bonuses, and recon spotter checks verified.');
}

// =========================================================================
// 6. XSS Escaping, Delegated Handlers & i18n State Decoupling
// =========================================================================
{
  const s = createSandbox();
  const ID = s.IronDivision;
  const xssName = `<img src=x onerror="alert('xss')"> 'quoted'`;
  const xssId = `id_' onclick="alert(1)" data-x="`;
  ID.state.unitTemplates.push({
    id: xssId, name: xssName, category: 'infantry', armorTier: 'unarmored',
    personnel: 500, maxOrg: 50, armorCount: 0, maxSupply: 40,
    softAttack: 20, hardAttack: 5, defense: 20, piercing: 5, hardness: 0,
    experience: 'Regular', traits: []
  });
  ID.App.emptyBattlefield(true);
  const inst = ID.Combat.createCombatUnitInstance(ID.state.unitTemplates[ID.state.unitTemplates.length - 1], 'A');
  inst.uid = xssId;
  ID.state.battle.sideA.units = [inst];
  ID.UI.renderSideUnitCards('A');
  ID.UI.renderTacticalSectorCanvas();
  ID.UI.renderUnitDesigner();

  for (const elId of ['sideA-units-list', 'tactical-sector-canvas', 'units-orbat-grid']) {
    const html = s.__elements.get(elId).innerHTML;
    assert(!html.includes('<img src=x'));
    assert(!html.includes('onclick="alert(1)"'));
  }

  let editedId = null;
  const origFn = ID.App.loadUnitIntoForm;
  ID.App.loadUnitIntoForm = (id) => { editedId = id; };
  const btn = { dataset: { action: 'unit-edit', id: xssId }, closest: sel => (sel === '[data-action]' ? btn : null) };
  s.__docListeners.click.forEach(fn => fn({ target: btn }));
  assert.strictEqual(editedId, xssId);
  ID.App.loadUnitIntoForm = origFn;

  // i18n state decoupling & weather shift suffix
  ID.I18n.setLanguage('en');
  const origPlains = ID.state.terrains.Plains.name;
  ID.state.terrains.Forest.name = 'Custom Ardennes Woods';
  ID.I18n.setLanguage('id');
  assert.strictEqual(ID.state.terrains.Plains.name, origPlains);
  assert.strictEqual(ID.state.terrains.Forest.name, 'Custom Ardennes Woods');
  assert.notStrictEqual(ID.I18n.localizeField('terrain', 'Plains', 'name', origPlains), origPlains);
  assert.strictEqual(ID.I18n.localizeField('terrain', 'Forest', 'name', 'Custom Ardennes Woods'), 'Custom Ardennes Woods');
  const wShift = ID.I18n.translateCombatLogText('[WTH] [Weather Shift] Theatre weather shifts from Clear -> Heavy Fog (Hills · Autumn)!');
  assert(wShift.includes('[Perubahan Cuaca]') && wShift.includes('(Hills · Autumn)!'));
  ID.App.exportPresetsJSON();
  const exported = JSON.parse(s.__getLastBlob());
  assert.strictEqual(exported.terrains.Plains.name, origPlains);
  assert.strictEqual(exported.terrains.Forest.name, 'Custom Ardennes Woods');
  console.log('PASS [6]: XSS escaping, delegated handlers, and non-mutating i18n/export verified.');
}

// =========================================================================
// 7. Monte Carlo Conservation Invariants (Arracourt & San Marino)
// =========================================================================
{
  const s = createSandbox();
  const ID = s.IronDivision;
  let persViol = 0, afvViol = 0, totalRounds = 0;

  const audit = () => {
    for (const side of ['sideA', 'sideB']) {
      for (const u of ID.state.battle[side].units) {
        if ((u.personnel + u.dead + u.wounded + (u.escaped || 0) + (u.captured || 0)) !== u.maxPersonnel) persViol++;
        const origA = u.originalMaxArmor || u.maxArmor || 0;
        if (origA > 0 && (u.armor + u.recoverableArmor + (u.abandonedArmor || 0) + (u.towedArmor || 0) + u.unrecoverableArmor) !== origA) afvViol++;
      }
    }
  };

  for (const loader of [ID.App.loadArracourtScenario, ID.App.loadSanMarinoScenario]) {
    for (let i = 0; i < STRESS_RUNS; i++) {
      loader();
      for (let r = 0; r < 150 && !ID.state.battle.isOver; r++) {
        ID.Combat.runSingleRound();
        totalRounds++;
        audit();
      }
    }
  }
  assert.strictEqual(s.__errors.length, 0, `Runtime errors: ${s.__errors.join('; ')}`);
  assert.strictEqual(persViol, 0, `Personnel conservation violations: ${persViol}`);
  assert.strictEqual(afvViol, 0, `AFV conservation violations: ${afvViol}`);
  console.log(`PASS [7]: ${STRESS_RUNS * 2} stress battles (${totalRounds} rounds): 0 errors, 0 Personnel drift, 0 AFV drift.`);
}

console.log('\nALL IRON DIVISION TESTS PASSED.');
