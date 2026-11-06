/* ==========================================================================
   IRON DIVISION ENGINE — APPLICATION STATE & CONTROLLER BOOTSTRAP
   File: js/app.js
   ========================================================================== */

window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  // Shortcuts to companion modules with safe fallbacks
  const H = ID.Helpers || {};
  const D = ID.Data || {};

  // --------------------------------------------------------------------------
  // 1. Central Reactive State Initialization
  // --------------------------------------------------------------------------

  ID.state = {
    terrains: H.safeLoadStorage ? H.safeLoadStorage('ttrpg_terrains_v1', structuredClone(D.DEFAULT_TERRAINS || {})) : structuredClone(D.DEFAULT_TERRAINS || {}),
    traits: H.safeLoadStorage ? H.safeLoadStorage('ttrpg_traits_v1', structuredClone(D.DEFAULT_TRAITS || [])) : structuredClone(D.DEFAULT_TRAITS || []),
    commanders: H.safeLoadStorage ? H.safeLoadStorage('ttrpg_commanders_v1', structuredClone(D.DEFAULT_COMMANDERS || [])) : structuredClone(D.DEFAULT_COMMANDERS || []),
    commanderTraits: H.safeLoadStorage ? H.safeLoadStorage('ttrpg_cmd_traits_v1', structuredClone(D.DEFAULT_COMMANDER_TRAITS || [])) : structuredClone(D.DEFAULT_COMMANDER_TRAITS || []),
    unitTemplates: H.safeLoadStorage ? H.safeLoadStorage('ttrpg_units_v1', structuredClone(D.DEFAULT_UNIT_TEMPLATES || [])) : structuredClone(D.DEFAULT_UNIT_TEMPLATES || []),

    environment: {
      terrain: 'Urban',
      feature: 'Normal',
      weather: 'Sunny',
      theatreAttackerSide: 'A',
      unexpectedInitiative: false
    },

    battle: {
      round: 1,
      attackerSide: 'A',
      isOver: false,
      winner: null,
      autoInterval: null,
      sideA: {
        commanderId: 'cmd_patton',
        tacticId: 'auto',
        chosenTacticId: 'atk_attack',
        lastChosenTacticId: null,
        prevRevealedTactic: null,
        repeatTacticCount: 0,
        nextRoundVigMod: 0,
        nextRoundAtkMod: 0,
        airstrikeDisabled: false,
        barrageCooldown: 0,
        supplyDepot: 150,
        maxSupplyDepot: 150,
        units: []
      },
      sideB: {
        commanderId: 'cmd_chuikov',
        tacticId: 'auto',
        chosenTacticId: 'def_defend',
        lastChosenTacticId: null,
        prevRevealedTactic: null,
        repeatTacticCount: 0,
        nextRoundVigMod: 0,
        nextRoundAtkMod: 0,
        airstrikeDisabled: false,
        barrageCooldown: 0,
        supplyDepot: 150,
        maxSupplyDepot: 150,
        units: []
      },
      initialSnapshot: null,
      afterActionReport: null,
      logs: []
    }
  };

  // Provide window.state as an accessor for backward compatibility
  window.state = ID.state;

  // --------------------------------------------------------------------------
  // 2. Commander & Commander Trait Controllers
  // --------------------------------------------------------------------------

  function getCommanderTraitById(id) {
    if (ID.state.commanderTraits) {
      const found = ID.state.commanderTraits.find(t => t.id === id);
      if (found) return found;
    }
    return (D.DEFAULT_COMMANDER_TRAITS || []).find(t => t.id === id);
  }

  function updateCmdStatDisplay() {
    const atk = document.getElementById('cmd-atk-lvl')?.value || 0;
    const def = document.getElementById('cmd-def-lvl')?.value || 0;
    const cmd = document.getElementById('cmd-cmd-lvl')?.value || 0;
    const log = document.getElementById('cmd-log-lvl')?.value || 0;

    const atkVal = document.getElementById('cmd-atk-lvl-val');
    const defVal = document.getElementById('cmd-def-lvl-val');
    const cmdVal = document.getElementById('cmd-cmd-lvl-val');
    const logVal = document.getElementById('cmd-log-lvl-val');

    if (atkVal) atkVal.textContent = `Lvl ${atk} (+${(atk * 2.5).toFixed(1)}%)`;
    if (defVal) defVal.textContent = `Lvl ${def} (+${(def * 2.5).toFixed(1)}%)`;
    if (cmdVal) cmdVal.textContent = `Lvl ${cmd} (+${(cmd * 2.5).toFixed(1)}%)`;
    if (logVal) logVal.textContent = `Lvl ${log} (+${(log * 2.5).toFixed(1)}%)`;
  }

  function loadCommanderIntoForm(id) {
    const c = ID.state.commanders.find(x => x.id === id);
    if (!c) return;

    document.getElementById('cmd-edit-id').value = c.id;
    document.getElementById('cmd-name').value = c.name;
    document.getElementById('cmd-personality').value = c.personality;
    document.getElementById('cmd-atk-lvl').value = c.attackLevel || 0;
    document.getElementById('cmd-def-lvl').value = c.defenseLevel || 0;
    document.getElementById('cmd-cmd-lvl').value = c.commandLevel || 0;
    document.getElementById('cmd-log-lvl').value = c.logisticsLevel || 0;
    updateCmdStatDisplay();

    document.querySelectorAll('.cmd-trait-chk').forEach(chk => {
      chk.checked = (c.traits || []).includes(chk.value);
    });

    const titleEl = document.getElementById('cmd-form-title');
    if (titleEl) titleEl.textContent = `Editing: ${c.name}`;
  }

  function resetCommanderForm() {
    document.getElementById('cmd-edit-id').value = '';
    document.getElementById('cmd-name').value = '';
    document.getElementById('cmd-personality').value = 'Balanced';
    document.getElementById('cmd-atk-lvl').value = 3;
    document.getElementById('cmd-def-lvl').value = 3;
    document.getElementById('cmd-cmd-lvl').value = 3;
    document.getElementById('cmd-log-lvl').value = 3;
    updateCmdStatDisplay();

    document.querySelectorAll('.cmd-trait-chk').forEach(chk => { chk.checked = false; });
    const titleEl = document.getElementById('cmd-form-title');
    if (titleEl) titleEl.textContent = 'Add / Edit Commander';
  }

  function saveCommander() {
    const editId = document.getElementById('cmd-edit-id').value;
    const name = document.getElementById('cmd-name').value.trim() || 'Custom General';
    const personality = document.getElementById('cmd-personality').value;
    const traits = Array.from(document.querySelectorAll('.cmd-trait-chk:checked')).map(c => c.value);

    const obj = {
      id: editId || `cmd_${Date.now()}`,
      name,
      personality,
      attackLevel: Number(document.getElementById('cmd-atk-lvl').value) || 0,
      defenseLevel: Number(document.getElementById('cmd-def-lvl').value) || 0,
      commandLevel: Number(document.getElementById('cmd-cmd-lvl').value) || 0,
      logisticsLevel: Number(document.getElementById('cmd-log-lvl').value) || 0,
      traits
    };

    const idx = ID.state.commanders.findIndex(c => c.id === obj.id);
    if (idx >= 0) ID.state.commanders[idx] = obj;
    else ID.state.commanders.push(obj);

    H.safeSaveStorage('ttrpg_commanders_v1', ID.state.commanders);
    H.showToast(`Saved Commander "${name}"!`, 'success');

    // Granular UI updates
    if (ID.UI) {
      ID.UI.markTabDirty('commanders');
      ID.UI.renderSideControls('A', true);
      ID.UI.renderSideControls('B', true);
      ID.UI.renderActiveTabOnly('commanders');
    }
  }

  function deleteCommander(id) {
    if (id === 'cmd_none') {
      H.showToast('Cannot delete default commander profile.', 'warn');
      return;
    }

    ID.state.commanders = ID.state.commanders.filter(c => c.id !== id);
    H.safeSaveStorage('ttrpg_commanders_v1', ID.state.commanders);
    H.showToast('Commander removed.', 'info');

    if (ID.UI) {
      ID.UI.markTabDirty('commanders');
      ID.UI.renderSideControls('A', true);
      ID.UI.renderSideControls('B', true);
      ID.UI.renderActiveTabOnly('commanders');
    }
  }

  function restoreDefaultCommanders() {
    ID.state.commanders = structuredClone(D.DEFAULT_COMMANDERS || []);
    H.safeSaveStorage('ttrpg_commanders_v1', ID.state.commanders);
    H.showToast('Restored sample commanders.', 'success');

    if (ID.UI) {
      ID.UI.markTabDirty('commanders');
      ID.UI.renderSideControls('A', true);
      ID.UI.renderSideControls('B', true);
      ID.UI.renderActiveTabOnly('commanders');
    }
  }

  // --------------------------------------------------------------------------
  // 3. Commander Trait Customizer Modal
  // --------------------------------------------------------------------------

  function openCmdTraitModal(editId = '') {
    resetCmdTraitForm();
    const modal = document.getElementById('cmd-trait-modal');
    const title = document.getElementById('cmd-trait-modal-title');
    const delBtn = document.getElementById('btn-delete-cmd-trait');
    if (!modal) return;

    if (editId) {
      const t = getCommanderTraitById(editId);
      if (t) {
        document.getElementById('cmd-trait-edit-id').value = t.id;
        document.getElementById('cmd-trait-name').value = t.name;
        document.getElementById('cmd-trait-target-cat').value = t.targetUnitCategory || '';
        document.getElementById('cmd-trait-desc').value = t.desc || '';
        document.getElementById('cmd-trait-atk-pct').value = t.atkPct || 0;
        document.getElementById('cmd-trait-atk-flat').value = t.atkFlat || 0;
        document.getElementById('cmd-trait-def-pct').value = t.defPct || 0;
        document.getElementById('cmd-trait-def-flat').value = t.defFlat || 0;
        document.getElementById('cmd-trait-soft-flat').value = t.softFlat || 0;
        document.getElementById('cmd-trait-hard-flat').value = t.hardFlat || 0;
        document.getElementById('cmd-trait-pierce-flat').value = t.pierceFlat || 0;
        document.getElementById('cmd-trait-hardness-flat').value = t.hardnessFlat || 0;
        document.getElementById('cmd-trait-vigilance').value = t.vigilance || 0;
        document.getElementById('cmd-trait-pursue-bonus').value = t.pursueBonus || 0;
        document.getElementById('cmd-trait-retreat-bonus').value = t.retreatBonus || 0;
        document.getElementById('cmd-trait-tactic-boost').value = t.tacticBoost || 0;
        document.getElementById('cmd-trait-max-org-pct').value = t.maxOrgPct || 0;
        document.getElementById('cmd-trait-org-regen').value = t.orgRegen || 0;
        document.getElementById('cmd-trait-supply-cut').value = t.supplyDrainReduction || 0;
        document.getElementById('cmd-trait-rec-bonus').value = t.recBonus || 0;
        document.getElementById('cmd-trait-armor-rec').value = t.armorRecBonus || 0;
        document.getElementById('cmd-trait-rally-bonus').value = t.rallyCheckBonus || 0;
        document.getElementById('cmd-trait-duration-red').value = t.rallyDurationRed || 0;
        document.getElementById('cmd-trait-extra-org').value = t.extraRalliedOrg || 0;
        document.getElementById('cmd-trait-terrain-target').value = t.terrainTarget || '';
        document.getElementById('cmd-trait-terrain-bonus').value = t.terrainBonus || 0;

        if (title) title.textContent = `Editing Commander Trait: ${t.name}`;
        if (delBtn) delBtn.classList.remove('hidden');
      }
    } else {
      if (title) title.textContent = 'Create Custom Commander Trait';
      if (delBtn) delBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeCmdTraitModal() {
    const modal = document.getElementById('cmd-trait-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function resetCmdTraitForm() {
    document.getElementById('cmd-trait-edit-id').value = '';
    document.getElementById('cmd-trait-name').value = '';
    document.getElementById('cmd-trait-target-cat').value = '';
    document.getElementById('cmd-trait-desc').value = '';

    const numIds = [
      'cmd-trait-atk-pct', 'cmd-trait-atk-flat', 'cmd-trait-def-pct', 'cmd-trait-def-flat',
      'cmd-trait-soft-flat', 'cmd-trait-hard-flat', 'cmd-trait-pierce-flat', 'cmd-trait-hardness-flat',
      'cmd-trait-vigilance', 'cmd-trait-pursue-bonus', 'cmd-trait-retreat-bonus', 'cmd-trait-tactic-boost',
      'cmd-trait-max-org-pct', 'cmd-trait-org-regen', 'cmd-trait-supply-cut', 'cmd-trait-rec-bonus',
      'cmd-trait-armor-rec', 'cmd-trait-rally-bonus', 'cmd-trait-duration-red', 'cmd-trait-extra-org',
      'cmd-trait-terrain-bonus'
    ];
    numIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 0;
    });
    const terr = document.getElementById('cmd-trait-terrain-target');
    if (terr) terr.value = '';
  }

  function saveCustomCommanderTrait() {
    const editId = document.getElementById('cmd-trait-edit-id').value;
    const name = document.getElementById('cmd-trait-name').value.trim() || 'Custom Commander Trait';

    const newTrait = {
      id: editId || `ctrait_${Date.now()}`,
      name,
      targetUnitCategory: document.getElementById('cmd-trait-target-cat').value,
      desc: document.getElementById('cmd-trait-desc').value.trim() || 'Custom officer command trait.',
      atkPct: Number(document.getElementById('cmd-trait-atk-pct').value) || 0,
      atkFlat: Number(document.getElementById('cmd-trait-atk-flat').value) || 0,
      defPct: Number(document.getElementById('cmd-trait-def-pct').value) || 0,
      defFlat: Number(document.getElementById('cmd-trait-def-flat').value) || 0,
      softFlat: Number(document.getElementById('cmd-trait-soft-flat').value) || 0,
      hardFlat: Number(document.getElementById('cmd-trait-hard-flat').value) || 0,
      pierceFlat: Number(document.getElementById('cmd-trait-pierce-flat').value) || 0,
      hardnessFlat: Number(document.getElementById('cmd-trait-hardness-flat').value) || 0,
      vigilance: Number(document.getElementById('cmd-trait-vigilance').value) || 0,
      pursueBonus: Number(document.getElementById('cmd-trait-pursue-bonus').value) || 0,
      retreatBonus: Number(document.getElementById('cmd-trait-retreat-bonus').value) || 0,
      tacticBoost: Number(document.getElementById('cmd-trait-tactic-boost').value) || 0,
      maxOrgPct: Number(document.getElementById('cmd-trait-max-org-pct').value) || 0,
      orgRegen: Number(document.getElementById('cmd-trait-org-regen').value) || 0,
      supplyDrainReduction: Number(document.getElementById('cmd-trait-supply-cut').value) || 0,
      recBonus: Number(document.getElementById('cmd-trait-rec-bonus').value) || 0,
      armorRecBonus: Number(document.getElementById('cmd-trait-armor-rec').value) || 0,
      rallyCheckBonus: Number(document.getElementById('cmd-trait-rally-bonus').value) || 0,
      rallyDurationRed: Number(document.getElementById('cmd-trait-duration-red').value) || 0,
      extraRalliedOrg: Number(document.getElementById('cmd-trait-extra-org').value) || 0,
      terrainTarget: document.getElementById('cmd-trait-terrain-target').value,
      terrainBonus: Number(document.getElementById('cmd-trait-terrain-bonus').value) || 0
    };

    const idx = ID.state.commanderTraits.findIndex(t => t.id === newTrait.id);
    if (idx >= 0) ID.state.commanderTraits[idx] = newTrait;
    else ID.state.commanderTraits.push(newTrait);

    H.safeSaveStorage('ttrpg_cmd_traits_v1', ID.state.commanderTraits);
    H.showToast(`Saved Commander Trait "${name}"!`, 'success');
    closeCmdTraitModal();

    if (ID.UI) {
      ID.UI.markTabDirty('commanders');
      ID.UI.renderActiveTabOnly('commanders');
    }
  }

  function deleteCurrentCommanderTrait() {
    const id = document.getElementById('cmd-trait-edit-id').value;
    if (!id) return;

    ID.state.commanderTraits = ID.state.commanderTraits.filter(t => t.id !== id);
    ID.state.commanders.forEach(c => {
      c.traits = (c.traits || []).filter(tid => tid !== id);
    });

    H.safeSaveStorage('ttrpg_cmd_traits_v1', ID.state.commanderTraits);
    H.safeSaveStorage('ttrpg_commanders_v1', ID.state.commanders);
    H.showToast('Commander trait removed.', 'info');
    closeCmdTraitModal();

    if (ID.UI) {
      ID.UI.markTabDirty('commanders');
      ID.UI.renderActiveTabOnly('commanders');
    }
  }

  // --------------------------------------------------------------------------
  // 4. Battlefield Execution & Simulation Controls
  // --------------------------------------------------------------------------

  function toggleAutoRun() {
    if (ID.state.battle.autoInterval) {
      stopAutoRun();
    } else {
      if (ID.state.battle.isOver) {
        if (ID.UI && ID.UI.openBattleSummaryModal) ID.UI.openBattleSummaryModal();
        return;
      }

      const btn = document.getElementById('btn-auto-run');
      if (btn) {
        btn.textContent = '⏸ Pause Auto';
        btn.className = 'px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm transition';
      }

      ID.state.battle.autoInterval = setInterval(() => {
        if (ID.state.battle.isOver) {
          stopAutoRun();
          return;
        }
        if (ID.Combat && typeof ID.Combat.runSingleRound === 'function') {
          ID.Combat.runSingleRound();
        }
      }, 650);
    }
  }

  function stopAutoRun() {
    if (ID.state.battle.autoInterval) {
      clearInterval(ID.state.battle.autoInterval);
      ID.state.battle.autoInterval = null;
    }
    const btn = document.getElementById('btn-auto-run');
    if (btn) {
      btn.textContent = '⏩ Auto Battle';
      btn.className = 'px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm transition';
    }
  }

  function resetCurrentBattle() {
    stopAutoRun();

    if (ID.state.battle.initialSnapshot) {
      ID.state.battle.sideA.units = structuredClone(ID.state.battle.initialSnapshot.sideA);
      ID.state.battle.sideB.units = structuredClone(ID.state.battle.initialSnapshot.sideB);
    } else {
      const createUnit = (ID.Combat && ID.Combat.createCombatUnitInstance) ? ID.Combat.createCombatUnitInstance : (tpl, s) => ({ ...tpl, side: s });

      ID.state.battle.sideA.units = ID.state.battle.sideA.units.map(u => {
        const tpl = ID.state.unitTemplates.find(t => t.id === u.templateId) || u;
        return createUnit(tpl, 'A');
      });
      ID.state.battle.sideB.units = ID.state.battle.sideB.units.map(u => {
        const tpl = ID.state.unitTemplates.find(t => t.id === u.templateId) || u;
        return createUnit(tpl, 'B');
      });
    }

    ID.state.battle.round = 1;
    ID.state.battle.attackerSide = 'A';
    ID.state.battle.isOver = false;
    ID.state.battle.winner = null;
    ID.state.battle.initialSnapshot = null;
    ID.state.battle.afterActionReport = null;
    ID.state.battle.logs = [];

    // Reset Supply Depots
    ['sideA', 'sideB'].forEach(k => {
      const sideKey = k === 'sideA' ? 'A' : 'B';
      ID.state.battle[k].maxSupplyDepot = ID.Combat ? ID.Combat.calculateSideDepotCapacity(sideKey) : 150;
      ID.state.battle[k].supplyDepot = ID.state.battle[k].maxSupplyDepot;
      ID.state.battle[k].lastChosenTacticId = null;
      ID.state.battle[k].prevRevealedTactic = null;
      ID.state.battle[k].repeatTacticCount = 0;
      ID.state.battle[k].nextRoundVigMod = 0;
      ID.state.battle[k].nextRoundAtkMod = 0;
      ID.state.battle[k].airstrikeDisabled = false;
      ID.state.battle[k].barrageCooldown = 0;
    });

    H.addLog('rolls', `↺ Current battle fully reset to Round 1. All deployed formations restored to 100% strength.`);
    H.showToast('Battle reset to Round 1.', 'success');

    if (ID.UI) {
      ID.UI.renderBattlefield(true);
    }
  }

  function emptyBattlefield() {
    stopAutoRun();
    ID.state.battle.sideA.units = [];
    ID.state.battle.sideB.units = [];
    ID.state.battle.round = 1;
    ID.state.battle.attackerSide = 'A';
    ID.state.battle.isOver = false;
    ID.state.battle.winner = null;
    ID.state.battle.initialSnapshot = null;
    ID.state.battle.afterActionReport = null;
    ID.state.battle.logs = [];

    H.addLog('rolls', `🧹 Battlefield emptied. Select units from dropdowns to deploy new formations.`);
    H.showToast('Battlefield cleared of all units.', 'info');

    if (ID.UI) {
      ID.UI.renderBattlefield(true);
    }
  }

  function loadDefaultSkirmish() {
    stopAutoRun();
    ID.state.battle.sideA.units = [];
    ID.state.battle.sideB.units = [];
    ID.state.battle.initialSnapshot = null;
    ID.state.battle.round = 1;
    ID.state.battle.attackerSide = 'A';
    ID.state.battle.isOver = false;
    ID.state.battle.winner = null;
    ID.state.battle.logs = [];

    const pickA = ['tpl_medium_tank', 'tpl_mechanized', 'tpl_artillery'];
    const pickB = ['tpl_heavy_inf', 'tpl_anti_tank', 'tpl_heavy_tank'];

    const createUnit = (ID.Combat && ID.Combat.createCombatUnitInstance) ? ID.Combat.createCombatUnitInstance : (tpl, s) => ({ ...tpl, side: s });

    pickA.forEach(id => {
      const tpl = ID.state.unitTemplates.find(t => t.id === id);
      if (tpl) ID.state.battle.sideA.units.push(createUnit(tpl, 'A'));
    });
    pickB.forEach(id => {
      const tpl = ID.state.unitTemplates.find(t => t.id === id);
      if (tpl) ID.state.battle.sideB.units.push(createUnit(tpl, 'B'));
    });

    if (ID.Combat) {
      ID.state.battle.sideA.maxSupplyDepot = ID.Combat.calculateSideDepotCapacity('A');
      ID.state.battle.sideA.supplyDepot = ID.state.battle.sideA.maxSupplyDepot;
      ID.state.battle.sideB.maxSupplyDepot = ID.Combat.calculateSideDepotCapacity('B');
      ID.state.battle.sideB.supplyDepot = ID.state.battle.sideB.maxSupplyDepot;
    }

    H.addLog('rolls', `⚔ Loaded Sample Combined-Arms Battle: Side A (Medium Tank, Mechanized, Artillery) vs Side B (Heavy Infantry, Anti-Tank, Heavy Tank).`);

    if (ID.UI) {
      ID.UI.renderBattlefield(true);
    }
  }

  function deployUnitToSide(side) {
    const sel = document.getElementById(side === 'A' ? 'sideA-add-select' : 'sideB-add-select');
    if (!sel || !sel.value) return;

    const tpl = ID.state.unitTemplates.find(t => t.id === sel.value);
    if (!tpl) return;

    const sideObj = side === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
    const createUnit = (ID.Combat && ID.Combat.createCombatUnitInstance) ? ID.Combat.createCombatUnitInstance : (t, s) => ({ ...t, side: s });

    sideObj.units.push(createUnit(tpl, side));
    H.showToast(`Deployed ${tpl.name} to Side ${side}`, 'success');

    if (ID.UI) {
      ID.UI.renderCombatRound();
    }
  }

  function removeUnitFromSide(side, instanceId) {
    const sideObj = side === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
    sideObj.units = sideObj.units.filter(u => u.instanceId !== instanceId);

    if (ID.UI) {
      ID.UI.renderCombatRound();
    }
  }

  function clearCombatLog() {
    ID.state.battle.logs = [];
    if (ID.UI && ID.UI.renderCombatLog) {
      ID.UI.renderCombatLog();
    }
  }

  function copyCombatLog() {
    if (!ID.state.battle.logs || ID.state.battle.logs.length === 0) {
      H.showToast('Combat log is currently empty.', 'warn');
      return;
    }

    const filterEl = document.getElementById('log-filter');
    const filterVal = filterEl ? filterEl.value : 'all';
    const filtered = ID.state.battle.logs.filter(item => filterVal === 'all' || item.category === filterVal);
    const text = filtered.map(item => `[R${item.round}] ${item.text}`).join('\n');

    const fallbackCopy = (str) => {
      const ta = document.createElement('textarea');
      ta.value = str;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        H.showToast(`Copied ${filtered.length} log entries to clipboard!`, 'success');
      } catch (err) {
        H.showToast('Failed to copy log.', 'danger');
      }
      document.body.removeChild(ta);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        H.showToast(`Copied ${filtered.length} log entries to clipboard!`, 'success');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  // --------------------------------------------------------------------------
  // 5. Unit Designer Controllers
  // --------------------------------------------------------------------------

  function onUnitCategoryChange() {
    const cat = document.getElementById('unit-category').value;
    const tierSel = document.getElementById('unit-armor-tier');
    const armorInput = document.getElementById('unit-armor-count');

    if (cat === 'infantry' || cat === 'artillery') {
      tierSel.value = 'unarmored';
      armorInput.value = 0;
    } else if (cat === 'armored_vehicle') {
      tierSel.value = 'light';
      if (Number(armorInput.value) === 0) armorInput.value = 50;
    } else if (cat === 'tank') {
      tierSel.value = 'medium';
      if (Number(armorInput.value) === 0) armorInput.value = 45;
    }
  }

  function loadUnitIntoForm(id) {
    const u = ID.state.unitTemplates.find(t => t.id === id);
    if (!u) return;

    document.getElementById('unit-edit-id').value = u.id;
    document.getElementById('unit-name').value = u.name;
    document.getElementById('unit-category').value = u.category;
    document.getElementById('unit-armor-tier').value = u.armorTier;
    document.getElementById('unit-personnel').value = u.personnel;
    document.getElementById('unit-org').value = u.maxOrg;
    document.getElementById('unit-armor-count').value = u.armorCount;
    document.getElementById('unit-supply').value = u.maxSupply;
    document.getElementById('unit-soft-atk').value = u.softAttack;
    document.getElementById('unit-hard-atk').value = u.hardAttack;
    document.getElementById('unit-defense').value = u.defense;
    document.getElementById('unit-piercing').value = u.piercing;
    document.getElementById('unit-hardness').value = u.hardness;
    document.getElementById('unit-exp').value = u.experience;

    document.querySelectorAll('.unit-trait-chk').forEach(chk => {
      chk.checked = (u.traits || []).includes(chk.value);
    });

    const titleEl = document.getElementById('unit-form-title');
    if (titleEl) titleEl.textContent = `Editing: ${u.name}`;
    H.showToast(`Loaded ${u.name} into editor.`, 'info');
  }

  function resetUnitForm() {
    document.getElementById('unit-edit-id').value = '';
    document.getElementById('unit-name').value = '';
    document.getElementById('unit-category').value = 'infantry';
    document.getElementById('unit-armor-tier').value = 'unarmored';
    document.getElementById('unit-personnel').value = 1000;
    document.getElementById('unit-org').value = 60;
    document.getElementById('unit-armor-count').value = 0;
    document.getElementById('unit-supply').value = 40;
    document.getElementById('unit-soft-atk').value = 18;
    document.getElementById('unit-hard-atk').value = 6;
    document.getElementById('unit-defense').value = 20;
    document.getElementById('unit-piercing').value = 8;
    document.getElementById('unit-hardness').value = 4;
    document.getElementById('unit-exp').value = 'Regular';

    document.querySelectorAll('.unit-trait-chk').forEach(chk => { chk.checked = false; });
    const titleEl = document.getElementById('unit-form-title');
    if (titleEl) titleEl.textContent = 'Create / Edit Unit Template';
  }

  function getUnitFormObject() {
    const editId = document.getElementById('unit-edit-id').value;
    const name = document.getElementById('unit-name').value.trim() || 'Custom Division';
    const selectedTraits = Array.from(document.querySelectorAll('.unit-trait-chk:checked')).map(c => c.value);

    return {
      id: editId || `tpl_custom_${Date.now()}`,
      name,
      category: document.getElementById('unit-category').value,
      armorTier: document.getElementById('unit-armor-tier').value,
      personnel: Math.max(1, Number(document.getElementById('unit-personnel').value) || 1000),
      maxOrg: Math.max(1, Number(document.getElementById('unit-org').value) || 60),
      armorCount: Math.max(0, Number(document.getElementById('unit-armor-count').value) || 0),
      maxSupply: Math.max(5, Number(document.getElementById('unit-supply').value) || 40),
      softAttack: Math.max(0, Number(document.getElementById('unit-soft-atk').value) || 0),
      hardAttack: Math.max(0, Number(document.getElementById('unit-hard-atk').value) || 0),
      defense: Math.max(0, Number(document.getElementById('unit-defense').value) || 0),
      piercing: Math.max(0, Number(document.getElementById('unit-piercing').value) || 0),
      hardness: Math.max(0, Number(document.getElementById('unit-hardness').value) || 0),
      experience: document.getElementById('unit-exp').value,
      traits: selectedTraits
    };
  }

  function saveUnitTemplate() {
    const obj = getUnitFormObject();
    const idx = ID.state.unitTemplates.findIndex(u => u.id === obj.id);
    if (idx >= 0) ID.state.unitTemplates[idx] = obj;
    else ID.state.unitTemplates.unshift(obj);

    H.safeSaveStorage('ttrpg_units_v1', ID.state.unitTemplates);
    H.showToast(`Saved unit template "${obj.name}"!`, 'success');

    if (ID.UI) {
      ID.UI.markTabDirty('units');
      ID.UI.renderSideControls('A', true);
      ID.UI.renderSideControls('B', true);
      ID.UI.renderActiveTabOnly('units');
    }
  }

  function deploySavedUnitQuick(side) {
    const obj = getUnitFormObject();
    const idx = ID.state.unitTemplates.findIndex(u => u.id === obj.id);
    if (idx >= 0) ID.state.unitTemplates[idx] = obj;
    else ID.state.unitTemplates.unshift(obj);

    H.safeSaveStorage('ttrpg_units_v1', ID.state.unitTemplates);
    deployTemplateById(obj.id, side);
  }

  function deployTemplateById(tplId, side) {
    const tpl = ID.state.unitTemplates.find(t => t.id === tplId);
    if (!tpl) return;

    const sideObj = side === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
    const createUnit = (ID.Combat && ID.Combat.createCombatUnitInstance) ? ID.Combat.createCombatUnitInstance : (t, s) => ({ ...t, side: s });

    sideObj.units.push(createUnit(tpl, side));
    H.showToast(`Deployed ${tpl.name} to Side ${side}!`, 'success');

    if (ID.UI) {
      ID.UI.renderCombatRound();
    }
  }

  function duplicateUnitTemplate(id) {
    const orig = ID.state.unitTemplates.find(u => u.id === id);
    if (!orig) return;

    const copy = structuredClone(orig);
    copy.id = `tpl_copy_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    copy.name = `${orig.name} (Copy)`;

    const idx = ID.state.unitTemplates.findIndex(u => u.id === id);
    ID.state.unitTemplates.splice(idx + 1, 0, copy);

    H.safeSaveStorage('ttrpg_units_v1', ID.state.unitTemplates);
    H.showToast(`Duplicated "${orig.name}" as "${copy.name}"!`, 'success');

    if (ID.UI) {
      ID.UI.markTabDirty('units');
      ID.UI.renderSideControls('A', true);
      ID.UI.renderSideControls('B', true);
      ID.UI.renderActiveTabOnly('units');
    }
  }

  function deleteUnitTemplate(id) {
    ID.state.unitTemplates = ID.state.unitTemplates.filter(u => u.id !== id);
    H.safeSaveStorage('ttrpg_units_v1', ID.state.unitTemplates);
    H.showToast('Unit template removed.', 'info');

    if (ID.UI) {
      ID.UI.markTabDirty('units');
      ID.UI.renderSideControls('A', true);
      ID.UI.renderSideControls('B', true);
      ID.UI.renderActiveTabOnly('units');
    }
  }

  function restoreDefaultUnits() {
    ID.state.unitTemplates = structuredClone(D.DEFAULT_UNIT_TEMPLATES || []);
    H.safeSaveStorage('ttrpg_units_v1', ID.state.unitTemplates);
    H.showToast('Restored all default sample units.', 'success');

    if (ID.UI) {
      ID.UI.markTabDirty('units');
      ID.UI.renderSideControls('A', true);
      ID.UI.renderSideControls('B', true);
      ID.UI.renderActiveTabOnly('units');
    }
  }

  // --------------------------------------------------------------------------
  // 6. Custom Trait Controllers
  // --------------------------------------------------------------------------

  function loadTraitIntoForm(id) {
    const t = ID.Combat && ID.Combat.getTraitById ? ID.Combat.getTraitById(id) : ID.state.traits.find(x => x.id === id);
    if (!t) return;

    document.getElementById('trait-edit-id').value = t.id;
    document.getElementById('trait-name').value = t.name;
    document.getElementById('trait-desc').value = t.desc || '';
    document.getElementById('trait-atk-pct').value = t.atkPct || 0;
    document.getElementById('trait-atk-flat').value = t.atkFlat || 0;
    document.getElementById('trait-def-pct').value = t.defPct || 0;
    document.getElementById('trait-def-flat').value = t.defFlat || 0;
    document.getElementById('trait-soft-flat').value = t.softFlat || 0;
    document.getElementById('trait-hard-flat').value = t.hardFlat || 0;
    document.getElementById('trait-pierce-flat').value = t.pierceFlat || 0;
    document.getElementById('trait-hardness-flat').value = t.hardnessFlat || 0;
    document.getElementById('trait-vigilance').value = t.vigilance || 0;
    document.getElementById('trait-org-regen').value = t.orgRegen || 0;
    document.getElementById('trait-supply-regen').value = t.supplyRegen || 0;
    document.getElementById('trait-supply-steal').value = t.supplySteal || 0;
    document.getElementById('trait-rec-bonus').value = t.recBonus || 0;
    document.getElementById('trait-armor-rec').value = t.armorRecBonus || 0;
    document.getElementById('trait-pursue-bonus').value = t.pursueBonus || 0;
    document.getElementById('trait-retreat-bonus').value = t.retreatBonus || 0;
    document.getElementById('trait-enemy-def-malus').value = t.enemyDefMalus || 0;
    document.getElementById('trait-enemy-hard-malus').value = t.enemyHardMalus || 0;
    document.getElementById('trait-terrain-target').value = t.terrainTarget || '';
    document.getElementById('trait-terrain-bonus').value = t.terrainBonus || 0;
    document.getElementById('trait-anti-category').value = t.antiCategory || '';
    document.getElementById('trait-anti-bonus').value = t.antiBonus || 0;
    document.getElementById('trait-flag-highcal').checked = !!t.grantsHighCaliber;
    document.getElementById('trait-flag-explosive').checked = !!t.grantsExplosive;
    document.getElementById('trait-flag-frontliner').checked = !!t.isFrontliner;
    document.getElementById('trait-flag-repair').checked = !!t.isRepairCrew;

    const titleEl = document.getElementById('trait-form-title');
    if (titleEl) titleEl.textContent = `Editing Trait: ${t.name}`;
    H.showToast(`Loaded trait "${t.name}" for editing.`, 'info');
  }

  function resetTraitForm() {
    document.getElementById('trait-edit-id').value = '';
    document.getElementById('trait-name').value = '';
    document.getElementById('trait-desc').value = '';

    ['trait-atk-pct', 'trait-atk-flat', 'trait-def-pct', 'trait-def-flat', 'trait-soft-flat', 'trait-hard-flat',
      'trait-pierce-flat', 'trait-hardness-flat', 'trait-vigilance', 'trait-org-regen', 'trait-supply-regen',
      'trait-supply-steal', 'trait-rec-bonus', 'trait-armor-rec', 'trait-pursue-bonus', 'trait-retreat-bonus',
      'trait-enemy-def-malus', 'trait-enemy-hard-malus', 'trait-terrain-bonus', 'trait-anti-bonus'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 0;
    });

    const terr = document.getElementById('trait-terrain-target');
    if (terr) terr.value = '';
    const anti = document.getElementById('trait-anti-category');
    if (anti) anti.value = '';

    ['trait-flag-highcal', 'trait-flag-explosive', 'trait-flag-frontliner', 'trait-flag-repair'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });

    const titleEl = document.getElementById('trait-form-title');
    if (titleEl) titleEl.textContent = 'Create / Edit Custom Trait';
  }

  function saveTrait() {
    const editId = document.getElementById('trait-edit-id').value;
    const name = document.getElementById('trait-name').value.trim() || 'Custom Trait';
    const existing = editId ? ID.state.traits.find(t => t.id === editId) : {};

    const newTrait = {
      ...(existing || {}),
      id: editId || `trait_custom_${Date.now()}`,
      name,
      desc: document.getElementById('trait-desc').value.trim() || 'Custom unit trait modifier.',
      atkPct: Number(document.getElementById('trait-atk-pct').value) || 0,
      atkFlat: Number(document.getElementById('trait-atk-flat').value) || 0,
      defPct: Number(document.getElementById('trait-def-pct').value) || 0,
      defFlat: Number(document.getElementById('trait-def-flat').value) || 0,
      softFlat: Number(document.getElementById('trait-soft-flat').value) || 0,
      hardFlat: Number(document.getElementById('trait-hard-flat').value) || 0,
      pierceFlat: Number(document.getElementById('trait-pierce-flat').value) || 0,
      hardnessFlat: Number(document.getElementById('trait-hardness-flat').value) || 0,
      vigilance: Number(document.getElementById('trait-vigilance').value) || 0,
      orgRegen: Number(document.getElementById('trait-org-regen').value) || 0,
      supplyRegen: Number(document.getElementById('trait-supply-regen').value) || 0,
      supplySteal: Number(document.getElementById('trait-supply-steal').value) || 0,
      recBonus: Number(document.getElementById('trait-rec-bonus').value) || 0,
      armorRecBonus: Number(document.getElementById('trait-armor-rec').value) || 0,
      pursueBonus: Number(document.getElementById('trait-pursue-bonus').value) || 0,
      retreatBonus: Number(document.getElementById('trait-retreat-bonus').value) || 0,
      enemyDefMalus: Number(document.getElementById('trait-enemy-def-malus').value) || 0,
      enemyHardMalus: Number(document.getElementById('trait-enemy-hard-malus').value) || 0,
      terrainTarget: document.getElementById('trait-terrain-target').value,
      terrainBonus: Number(document.getElementById('trait-terrain-bonus').value) || 0,
      antiCategory: document.getElementById('trait-anti-category').value,
      antiBonus: Number(document.getElementById('trait-anti-bonus').value) || 0,
      grantsHighCaliber: document.getElementById('trait-flag-highcal').checked,
      grantsExplosive: document.getElementById('trait-flag-explosive').checked,
      isFrontliner: document.getElementById('trait-flag-frontliner').checked,
      isRepairCrew: document.getElementById('trait-flag-repair').checked
    };

    const idx = ID.state.traits.findIndex(t => t.id === newTrait.id);
    if (idx >= 0) ID.state.traits[idx] = newTrait;
    else ID.state.traits.unshift(newTrait);

    H.safeSaveStorage('ttrpg_traits_v1', ID.state.traits);
    H.showToast(`Saved trait "${newTrait.name}"!`, 'success');

    if (ID.UI) {
      ID.UI.markTabDirty('traits');
      ID.UI.markTabDirty('units');
      ID.UI.renderActiveTabOnly('traits');
    }
  }

  // --------------------------------------------------------------------------
  // 7. Terrain Configuration Controllers
  // --------------------------------------------------------------------------

  function loadTerrainIntoForm() {
    const sel = document.getElementById('terrain-edit-select');
    if (!sel || !sel.value) return;

    const t = ID.state.terrains[sel.value];
    if (!t) return;

    document.getElementById('terr-name').value = t.name;
    document.getElementById('terr-inf-atk').value = t.infAtk;
    document.getElementById('terr-inf-def').value = t.infDef;
    document.getElementById('terr-tank-atk').value = t.tankAtk;
    document.getElementById('terr-tank-def').value = t.tankDef;
    document.getElementById('terr-av-atk').value = t.avAtk;
    document.getElementById('terr-av-def').value = t.avDef;
    document.getElementById('terr-art-atk').value = t.artAtk;
    document.getElementById('terr-art-def').value = t.artDef;
    document.getElementById('terr-vig').value = t.vigMod;
    document.getElementById('terr-supply').value = t.supplyDrain;
    document.getElementById('terr-urban-flag').checked = !!t.isUrban;
  }

  function saveTerrainConfig() {
    const name = document.getElementById('terr-name').value.trim() || 'CustomTerrain';
    const key = name.replace(/\s+/g, '');

    ID.state.terrains[key] = {
      name,
      infAtk: Number(document.getElementById('terr-inf-atk').value) || 0,
      infDef: Number(document.getElementById('terr-inf-def').value) || 0,
      tankAtk: Number(document.getElementById('terr-tank-atk').value) || 0,
      tankDef: Number(document.getElementById('terr-tank-def').value) || 0,
      avAtk: Number(document.getElementById('terr-av-atk').value) || 0,
      avDef: Number(document.getElementById('terr-av-def').value) || 0,
      artAtk: Number(document.getElementById('terr-art-atk').value) || 0,
      artDef: Number(document.getElementById('terr-art-def').value) || 0,
      vigMod: Number(document.getElementById('terr-vig').value) || 0,
      supplyDrain: Number(document.getElementById('terr-supply').value) || 0,
      isUrban: document.getElementById('terr-urban-flag').checked,
      openTerrain: !document.getElementById('terr-urban-flag').checked
    };

    H.safeSaveStorage('ttrpg_terrains_v1', ID.state.terrains);
    H.showToast(`Saved terrain "${name}"!`, 'success');

    if (ID.UI) {
      ID.UI.markTabDirty('terrain');
      ID.UI.renderEnvironmentSelectors();
      ID.UI.renderActiveTabOnly('terrain');
    }
  }

  // --------------------------------------------------------------------------
  // 8. Public Controller API
  // --------------------------------------------------------------------------

  ID.App = {
    getCommanderTraitById,
    updateCmdStatDisplay,
    loadCommanderIntoForm,
    resetCommanderForm,
    saveCommander,
    deleteCommander,
    restoreDefaultCommanders,
    openCmdTraitModal,
    closeCmdTraitModal,
    resetCmdTraitForm,
    saveCustomCommanderTrait,
    deleteCurrentCommanderTrait,
    toggleAutoRun,
    stopAutoRun,
    resetCurrentBattle,
    emptyBattlefield,
    loadDefaultSkirmish,
    deployUnitToSide,
    removeUnitFromSide,
    clearCombatLog,
    copyCombatLog,
    onUnitCategoryChange,
    loadUnitIntoForm,
    resetUnitForm,
    getUnitFormObject,
    saveUnitTemplate,
    deploySavedUnitQuick,
    deployTemplateById,
    duplicateUnitTemplate,
    deleteUnitTemplate,
    restoreDefaultUnits,
    loadTraitIntoForm,
    resetTraitForm,
    saveTrait,
    loadTerrainIntoForm,
    saveTerrainConfig
  };

  // --------------------------------------------------------------------------
  // 9. Backward-Compatible Global Facade
  // Maps all inline HTML attributes (onclick, onchange) to IronDivision methods
  // --------------------------------------------------------------------------

  const globalFacade = {
    // Tab Navigation & UI
    switchTab: (tab) => ID.UI && ID.UI.switchTab(tab),
    onEnvironmentChange: () => ID.UI && ID.UI.onEnvironmentChange(),
    updateSideConfig: (side) => ID.UI && ID.UI.updateSideConfig(side),
    renderCombatLog: () => ID.UI && ID.UI.renderCombatLog(),
    copyCombatLog,
    clearCombatLog,
    openBattleSummaryModal: () => ID.UI && ID.UI.openBattleSummaryModal(),
    closeBattleSummaryModal: () => ID.UI && ID.UI.closeBattleSummaryModal(),

    // Simulation Controls
    runSingleRound: () => ID.Combat && ID.Combat.runSingleRound(),
    toggleAutoRun,
    stopAutoRun,
    resetCurrentBattle,
    emptyBattlefield,
    loadDefaultSkirmish,
    deployUnitToSide,
    removeUnitFromSide,

    // Unit Designer
    onUnitCategoryChange,
    loadUnitIntoForm,
    resetUnitForm,
    saveUnitTemplate,
    deploySavedUnitQuick,
    deployTemplateById,
    duplicateUnitTemplate,
    deleteUnitTemplate,
    restoreDefaultUnits,

    // Traits
    loadTraitIntoForm,
    resetTraitForm,
    saveTrait,

    // Commanders
    updateCmdStatDisplay,
    loadCommanderIntoForm,
    resetCommanderForm,
    saveCommander,
    deleteCommander,
    restoreDefaultCommanders,
    openCmdTraitModal,
    closeCmdTraitModal,
    saveCustomCommanderTrait,
    deleteCurrentCommanderTrait,

    // Terrain
    loadTerrainIntoForm,
    saveTerrainConfig
  };

  Object.assign(window, globalFacade);

  // --------------------------------------------------------------------------
  // 10. Bootstrap Lifecycle
  // --------------------------------------------------------------------------

  window.addEventListener('DOMContentLoaded', () => {
    loadDefaultSkirmish();
    loadTerrainIntoForm();
    if (ID.UI && typeof ID.UI.renderAll === 'function') {
      ID.UI.renderAll();
    }
  });

})(window.IronDivision);