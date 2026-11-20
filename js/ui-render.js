/* ==========================================================================
   IRON DIVISION ENGINE — DOM RENDERING & USER INTERFACE
   File: js/ui-render.js
   ========================================================================== */

window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  // Shortcuts to companion modules with safe fallbacks
  const H = ID.Helpers || {};
  const D = ID.Data || {};

  // Internal UI state for dirty-checking and DOM node caching
  const uiState = {
    activeTab: 'battlefield',
    renderedTabs: {
      battlefield: false,
      units: false,
      traits: false,
      commanders: false,
      terrain: false,
      tactics: false,
      guide: false
    },
    dirtyTabs: {
      battlefield: true,
      units: true,
      traits: true,
      commanders: true,
      terrain: true,
      tactics: true,
      guide: true
    },
    selectCache: {
      sideA_role: null,
      sideB_role: null,
      sideA_urban: null,
      sideB_urban: null,
      sideA_cmdHash: '',
      sideB_cmdHash: '',
      sideA_tplHash: '',
      sideB_tplHash: ''
    },
    renderedLogIds: new Set()
  };

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Safe accessor shortcuts for combat and data functions
  function getCombat() { return ID.Combat || {}; }
  function getPursuit() { return ID.Pursuit || {}; }

  /**
   * Mark a specific tab (or all tabs) as dirty so it will refresh when viewed.
   */
  function markTabDirty(tabName = 'all') {
    if (tabName === 'all') {
      Object.keys(uiState.dirtyTabs).forEach(k => { uiState.dirtyTabs[k] = true; });
    } else if (uiState.dirtyTabs[tabName] !== undefined) {
      uiState.dirtyTabs[tabName] = true;
    }
  }

  /**
   * Switches the active UI tab without re-rendering unneeded views.
   */
  function switchTab(tabName) {
    const tabs = ['battlefield', 'units', 'traits', 'commanders', 'terrain', 'tactics', 'guide'];
    uiState.activeTab = tabName;

    tabs.forEach(t => {
      const view = document.getElementById(`view-${t}`);
      const btn = document.getElementById(`tab-${t}`);
      if (view) view.classList.toggle('hidden', t !== tabName);
      if (btn) btn.classList.toggle('active', t === tabName);
    });

    renderActiveTabOnly(tabName);
  }

  /**
   * Renders only the tab currently in view if it has been marked dirty.
   */
  function renderActiveTabOnly(tabName) {
    if (!uiState.dirtyTabs[tabName] && uiState.renderedTabs[tabName]) return;

    switch (tabName) {
      case 'battlefield':
        renderBattlefield(false);
        break;
      case 'units':
        renderUnitDesigner();
        break;
      case 'traits':
        renderTraitsTab();
        break;
      case 'commanders':
        renderCommandersTab();
        break;
      case 'terrain':
        renderTerrainTab();
        break;
      case 'tactics':
        renderTacticsGuide();
        break;
      case 'guide':
        if (ID.Guide && typeof ID.Guide.renderSimulationGuide === 'function') {
          ID.Guide.renderSimulationGuide();
        } else if (typeof renderSimulationGuide === 'function') {
          renderSimulationGuide();
        }
        break;
    }

    uiState.dirtyTabs[tabName] = false;
    uiState.renderedTabs[tabName] = true;
  }

  /**
   * Triggered on environment controls changes.
   */
  function onEnvironmentChange() {
    const state = ID.state;
    if (!state || !state.environment) return;

    const tSel = document.getElementById('bf-terrain');
    const fSel = document.getElementById('bf-feature');
    const wSel = document.getElementById('bf-weather');
    const thSel = document.getElementById('bf-theatre-atk');
    const uChk = document.getElementById('bf-unexpected');

    if (thSel && thSel.value) state.environment.theatreAttackerSide = thSel.value;
    if (tSel && tSel.value) state.environment.terrain = tSel.value;
    if (fSel && fSel.value) {
      if (state.environment.terrain === 'Urban' && fSel.value === 'Road') {
        state.environment.feature = 'Normal';
        fSel.value = 'Normal';
        H.showToast('Path/Road feature is only for non-Urban areas; switched to Normal.', 'warn');
      } else {
        state.environment.feature = fSel.value;
      }
    }
    if (wSel && wSel.value) state.environment.weather = wSel.value;
    if (uChk) state.environment.unexpectedInitiative = uChk.checked;

    if (state.battle.round === 1 && !state.battle.initialSnapshot) {
      [...state.battle.sideA.units, ...state.battle.sideB.units].forEach(u => {
        u.pos = H.getUnitStartingPosition ? H.getUnitStartingPosition(u) : 2;
      });
    }

    renderEnvironmentSelectors();
    renderSideControls('A', true);
    renderSideControls('B', true);
    renderCombatRound();
  }

  /**
   * Updates selected commander or tactic for a side without rebuilding DOM inputs.
   */
  function updateSideConfig(side) {
    const state = ID.state;
    if (!state || !state.battle) return;

    const cmdSel = document.getElementById(`side${side}-commander`);
    const tacSel = document.getElementById(`side${side}-tactic`);
    const sideObj = side === 'A' ? state.battle.sideA : state.battle.sideB;
    if (cmdSel) sideObj.commanderId = cmdSel.value;
    if (tacSel) sideObj.tacticId = tacSel.value;
    renderSideTelemetry(side);
  }

  /**
   * Renders base environment selector options and summary bar.
   */
  function renderEnvironmentSelectors() {
    const state = ID.state;
    if (!state || !state.environment) return;

    const tSel = document.getElementById('bf-terrain');
    const fSel = document.getElementById('bf-feature');
    const wSel = document.getElementById('bf-weather');
    if (!tSel || !fSel || !wSel) return;

    if (tSel.children.length === 0) {
      tSel.innerHTML = Object.keys(state.terrains || {}).map(k => {
        const t = state.terrains[k];
        return `<option value="${k}">${t.name}${t.isUrban ? ' (Urban Tactics Enabled)' : ''}</option>`;
      }).join('');
    }
    tSel.value = state.environment.terrain;

    if (fSel.children.length === 0) {
      fSel.innerHTML = Object.keys(D.TERRAIN_FEATURES || {}).map(k => {
        const f = D.TERRAIN_FEATURES[k];
        return `<option value="${k}">${f.name}</option>`;
      }).join('');
    }
    fSel.value = state.environment.feature;

    if (wSel.children.length === 0) {
      wSel.innerHTML = Object.keys(D.WEATHER_TYPES || {}).map(k => {
        const w = D.WEATHER_TYPES[k];
        return `<option value="${k}">${w.name}</option>`;
      }).join('');
    }
    wSel.value = state.environment.weather;

    const terr = state.terrains[state.environment.terrain] || D.DEFAULT_TERRAINS?.Plains || {};
    const feat = D.TERRAIN_FEATURES?.[state.environment.feature] || D.TERRAIN_FEATURES?.Normal || {};
    const weath = D.WEATHER_TYPES?.[state.environment.weather] || D.WEATHER_TYPES?.Sunny || {};

    const summaryBar = document.getElementById('env-summary-bar');
    if (summaryBar) {
      summaryBar.innerHTML = `
        <div class="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span class="px-2 py-0.5 bg-[#121613] border border-[#2e3730] text-[#c8a24b]">TERR // ${(terr.name || 'Plains').toUpperCase()}: INF ${terr.infAtk >= 0 ? '+' : ''}${terr.infAtk || 0}/${terr.infDef >= 0 ? '+' : ''}${terr.infDef || 0}% | TNK ${terr.tankAtk >= 0 ? '+' : ''}${terr.tankAtk || 0}/${terr.tankDef >= 0 ? '+' : ''}${terr.tankDef || 0}% | SUP +${terr.supplyDrain || 0}</span>
          <span class="px-2 py-0.5 bg-[#121613] border border-[#2e3730] text-[#8ec0e8]">FEAT // ${(feat.name || 'Normal').toUpperCase()}: ATK ×${feat.atkMult || 1} DEF ×${feat.defMult || 1}</span>
          <span class="px-2 py-0.5 bg-[#121613] border border-[#2e3730] text-[#89b884]">METEO // ${(weath.name || 'Sunny').toUpperCase()}</span>
        </div>
        <div class="font-mono text-[10px] uppercase tracking-wider text-[#c8a24b]">THEATRE LOCK: SIDE ${state.environment.theatreAttackerSide || 'A'} ASSAULT / SIDE ${(state.environment.theatreAttackerSide || 'A') === 'A' ? 'B' : 'A'} ENTRENCHED</div>
      `;
    }
  }

  /**
   * Updates `<select>` controls without wiping innerHTML if options haven't changed.
   */
  function renderSideControls(side, forceRebuild = false) {
    const state = ID.state;
    if (!state || !state.battle) return;

    const sideObj = side === 'A' ? state.battle.sideA : state.battle.sideB;
    const isAttacker = state.battle.attackerSide === side;
    const role = isAttacker ? 'attack' : 'defense';

    const terr = state.terrains[state.environment.terrain] || D.DEFAULT_TERRAINS?.Plains || {};
    const isUrban = !!terr.isUrban || state.environment.feature === 'Fort';

    // 1. Commander Select
    const cmdSel = document.getElementById(`side${side}-commander`);
    const cmdHash = (state.commanders || []).map(c => c.id).join('|');
    const cmdHashKey = `side${side}_cmdHash`;
    if (cmdSel) {
      if (forceRebuild || uiState.selectCache[cmdHashKey] !== cmdHash || cmdSel.children.length === 0) {
        cmdSel.innerHTML = (state.commanders || []).map(c =>
          `<option value="${c.id}">${c.name} [${c.personality}]</option>`
        ).join('');
        uiState.selectCache[cmdHashKey] = cmdHash;
      }
      cmdSel.value = sideObj.commanderId;
    }

    // 2. Tactic Select
    const tacSel = document.getElementById(`side${side}-tactic`);
    const roleKey = `side${side}_role`;
    const urbanKey = `side${side}_urban`;
    if (tacSel) {
      const roleChanged = uiState.selectCache[roleKey] !== role;
      const urbanChanged = uiState.selectCache[urbanKey] !== isUrban;

      if (forceRebuild || roleChanged || urbanChanged || tacSel.children.length === 0) {
        const C = getCombat();
        const eligible = C.getEligibleTactics ? C.getEligibleTactics(role, isUrban) : [];
        tacSel.innerHTML = `<option value="auto">🤖 Commander AI Auto-Select</option>` +
          eligible.map(t => `<option value="${t.id}">${t.name} (${t.personality})</option>`).join('');
        uiState.selectCache[roleKey] = role;
        uiState.selectCache[urbanKey] = isUrban;
      }
      tacSel.value = sideObj.tacticId;
    }

    // 3. Add-Unit Select
    const addSel = document.getElementById(`side${side}-add-select`);
    const tplHash = (state.unitTemplates || []).map(u => u.id).join('|');
    const tplHashKey = `side${side}_tplHash`;
    if (addSel) {
      if (forceRebuild || uiState.selectCache[tplHashKey] !== tplHash || addSel.children.length === 0) {
        const cur = addSel.value;
        addSel.innerHTML = (state.unitTemplates || []).map(u =>
          `<option value="${u.id}">${u.name} (${u.category.toUpperCase()} | ${u.personnel} HP)</option>`
        ).join('');
        if (cur) addSel.value = cur;
        uiState.selectCache[tplHashKey] = tplHash;
      }
    }
  }

  /**
   * Updates side telemetry (active numbers, casualties, depot gauge).
   */
  function renderSideTelemetry(side) {
    const state = ID.state;
    if (!state || !state.battle) return;

    const sideObj = side === 'A' ? state.battle.sideA : state.battle.sideB;
    const isAttacker = state.battle.attackerSide === side;
    const isTheatreAtk = (state.environment.theatreAttackerSide || 'A') === side;
    const theatreTag = isTheatreAtk ? 'INVADER' : 'ENTRENCHED';

    const badge = document.getElementById(`side${side}-role-badge`);
    if (badge) {
      badge.textContent = isAttacker ? `ATK // ${theatreTag}` : `DEF // ${theatreTag}`;
      badge.className = isAttacker
        ? 'text-[10px] font-mono px-2 py-0.5 bg-[#292313] text-[#c8a24b] border border-[#7d6731] font-bold uppercase tracking-wider'
        : 'text-[10px] font-mono px-2 py-0.5 bg-[#1a201b] text-[#9ca69a] border border-[#364038] font-bold uppercase tracking-wider';
    }

    const C = getCombat();
    const activeUnits = sideObj.units.filter(C.isUnitActive || (u => !u.defeated));
    const totalPers = activeUnits.reduce((s, u) => s + u.personnel, 0);
    const totalArmor = activeUnits.reduce((s, u) => s + u.armor, 0);
    const totalDeadWounded = sideObj.units.reduce((s, u) => s + (u.dead || 0) + (u.wounded || 0), 0);

    const summaryEl = document.getElementById(`side${side}-summary`);
    if (summaryEl) {
      const curDepot = sideObj.supplyDepot !== undefined ? sideObj.supplyDepot : (sideObj.maxSupplyDepot || 100);
      const maxDepot = sideObj.maxSupplyDepot || 100;
      const depotPct = H.clamp(Math.round((curDepot / Math.max(1, maxDepot)) * 100), 0, 100);
      const cmd = C.getSideCommander ? C.getSideCommander(side) : null;

      summaryEl.innerHTML = `
        <div>
          <span class="block text-[9px] font-mono uppercase tracking-wider text-[#6e7a6d]">FORMATIONS</span>
          <span class="font-bold text-sm text-[#e7ece4] font-mono">${activeUnits.length}/${sideObj.units.length}</span>
        </div>
        <div>
          <span class="block text-[9px] font-mono uppercase tracking-wider text-[#6e7a6d]">EFF. STRENGTH / AFV</span>
          <span class="font-bold text-sm text-[#7cb377] font-mono">${totalPers.toLocaleString()} <span class="text-[#c8a24b]">[${totalArmor}]</span></span>
        </div>
        <div>
          <span class="block text-[9px] font-mono uppercase tracking-wider text-[#6e7a6d]">LOSSES (KIA+WIA)</span>
          <span class="font-bold text-sm text-[#d46a64] font-mono">${totalDeadWounded.toLocaleString()}</span>
        </div>
        <div class="col-span-3 pt-2 mt-1 border-t border-slate-800 text-left">
          <div class="flex justify-between text-[10px] font-mono uppercase mb-1">
            <span class="text-[#a5b0a3] font-bold">SUPPLY DEPOT // ${escapeHtml((cmd?.name?.split(' ')[0] || 'HQ').toUpperCase())}</span>
            <span class="${curDepot <= 0 ? 'text-[#e06c65] font-extrabold' : (depotPct < 30 ? 'text-[#c8a24b]' : 'text-[#89b884]')}">
              ${curDepot}/${maxDepot} PTS (${depotPct}%)
            </span>
          </div>
          <div class="w-full h-2 bar-track">
            <div class="h-full bar-fill ${curDepot <= 0 ? 'bg-[#b84a45]' : (depotPct < 30 ? 'bg-[#c8a24b]' : 'bg-[#5e8f59]')}" style="width: ${depotPct}%"></div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Updates unit cards list for a specific side.
   */
  function renderSideUnitCards(side) {
    const state = ID.state;
    if (!state || !state.battle) return;

    const sideObj = side === 'A' ? state.battle.sideA : state.battle.sideB;
    const listEl = document.getElementById(`side${side}-units-list`);
    if (!listEl) return;

    if (sideObj.units.length === 0) {
      listEl.innerHTML = `<div class="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">No units deployed on Side ${side}. Select a template above and click "+ Deploy Unit".</div>`;
      return;
    }

    const enemySideObj = side === 'A' ? state.battle.sideB : state.battle.sideA;
    const C = getCombat();
    const activeEnemies = enemySideObj.units.filter(C.isUnitActive || (u => !u.defeated));

    listEl.innerHTML = sideObj.units.map(u => {
      const persPct = H.clamp(Math.round((u.personnel / Math.max(1, u.maxPersonnel)) * 100), 0, 100);
      const orgPct = (u.isMonster || u.isZombie) ? 100 : H.clamp(Math.round((u.org / Math.max(1, u.maxOrg)) * 100), 0, 100);
      const supPct = (u.isMonster || u.isZombie) ? 100 : H.clamp(Math.round((u.supply / Math.max(1, u.maxSupply)) * 100), 0, 100);
      const armorPct = u.maxArmor > 0 ? H.clamp(Math.round((u.armor / u.maxArmor) * 100), 0, 100) : 0;

      const orgMalus = C.getOrgRemainingMalusPct ? C.getOrgRemainingMalusPct(u) : 0;
      const lossMalus = C.getPersonnelLossMalusPct ? C.getPersonnelLossMalusPct(u) : 0;
      const supMalus = C.getSupplyMalusPct ? C.getSupplyMalusPct(u) : 0;
      const tv = C.getUnitTargetValue ? C.getUnitTargetValue(u) : 0;

      const unitPos = (u.pos !== undefined && u.pos !== null) ? u.pos : (H.getUnitStartingPosition ? H.getUnitStartingPosition(u) : 2);
      const unitRange = H.getUnitEngagementRange ? H.getUnitEngagementRange(u) : 2;
      const closestEnemyDist = activeEnemies.length > 0
        ? Math.min(...activeEnemies.map(e => H.getTotalDistance ? H.getTotalDistance(u, e) : 2))
        : null;
      const inRangeNow = activeEnemies.some(e => H.canUnitEngageTarget ? H.canUnitEngageTarget(u, e) : true);

      const traitBadges = (u.traits || []).map(tid => {
        const t = C.getTraitById ? C.getTraitById(tid) : null;
        return t ? `<span class="mil-tag" title="${escapeHtml(t.desc)}">${escapeHtml(t.name)}</span>` : '';
      }).join('');

      const purBonus = C.getUnitPursuitBonus ? C.getUnitPursuitBonus(u) : 0;
      const retBonus = C.getUnitRetreatBonus ? C.getUnitRetreatBonus(u) : 0;
      const entrenchCap = H.getUnitMaxEntrenchmentCap ? H.getUnitMaxEntrenchmentCap(u) : 3;

      return `
        <div class="unit-dossier ${u.defeated ? 'unit-dossier-defeated' : (side === 'A' ? 'unit-dossier-a' : 'unit-dossier-b')} p-2.5 space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap min-w-0">
              <span class="font-bold font-mono text-xs text-[#e7ece4] uppercase tracking-wide truncate">${escapeHtml(u.name)}</span>
              <span class="text-[9.5px] font-mono uppercase px-1.5 py-0.5 bg-[#232016] text-[#c8a24b] border border-[#594b27]">${escapeHtml(u.experience)}</span>
              <span class="text-[9.5px] font-mono uppercase px-1.5 py-0.5 bg-[#151a16] text-[#939e91] border border-[#2d362f]">${escapeHtml(u.category.replace('_', ' '))}</span>
            </div>
            <button type="button" onclick="removeUnitFromSide('${side}', '${u.instanceId}')" class="text-[#667065] hover:text-[#d46a64] font-mono text-xs px-1 shrink-0" title="Remove unit">[X]</button>
          </div>

          <div class="unit-stat-grid">
            <div class="unit-stat-cell" title="Soft Attack"><span class="unit-stat-label">Soft</span><span class="unit-stat-val">${u.softAttack}</span></div>
            <div class="unit-stat-cell" title="Hard Attack"><span class="unit-stat-label">Hard</span><span class="unit-stat-val">${u.hardAttack}</span></div>
            <div class="unit-stat-cell" title="Defense"><span class="unit-stat-label">Def</span><span class="unit-stat-val">${u.defense}</span></div>
            <div class="unit-stat-cell" title="Armor Piercing"><span class="unit-stat-label">Pierce</span><span class="unit-stat-val text-[#8ec0e8]">${u.piercing}</span></div>
            <div class="unit-stat-cell" title="Armor Hardness"><span class="unit-stat-label">Hrdn</span><span class="unit-stat-val text-[#c8a24b]">${u.hardness}</span></div>
            <div class="unit-stat-cell" title="Pursuit / Retreat Modifier"><span class="unit-stat-label">Pur/Ret</span><span class="unit-stat-val text-[#b8a2d9]">${purBonus >= 0 ? '+' : ''}${purBonus}/${retBonus >= 0 ? '+' : ''}${retBonus}</span></div>
            <div class="unit-stat-cell" title="Target Value"><span class="unit-stat-label">TV</span><span class="unit-stat-val text-[#7cb377]">${tv}</span></div>
            <div class="unit-stat-cell" title="Entrenchment Level / Max Cap"><span class="unit-stat-label">Dig-In</span><span class="unit-stat-val text-[#c8a24b]">${u.entrenchmentLevel || 0}/${entrenchCap}</span></div>
            <div class="unit-stat-cell" title="Y-Axis Coordinate: ${side === 'A' ? '+' : '-'}${unitPos}"><span class="unit-stat-label">Dist</span><span class="unit-stat-val text-[#8ec0e8]">${unitPos}</span></div>
            <div class="unit-stat-cell" title="Max Engagement Range: ≤${unitRange} Total Distance${closestEnemyDist !== null ? ` (Closest Enemy: ${closestEnemyDist})` : ''}"><span class="unit-stat-label">Range</span><span class="unit-stat-val ${inRangeNow ? 'text-[#7cb377]' : 'text-[#c8a24b]'}">≤${unitRange}${closestEnemyDist !== null ? `/${closestEnemyDist}` : ''}</span></div>
          </div>

          ${u.defeated ? `<div class="text-[10px] font-mono uppercase text-[#e69894] bg-[#2b1514] border border-[#6e3532] px-2 py-1">STATUS: OUT OF ACTION // ${escapeHtml(u.defeatReason)}</div>` : ''}
          ${u.isRallying ? `<div class="text-[10px] font-mono uppercase text-[#d8b45c] bg-[#262011] border border-[#6e5a28] px-2 py-1">STATUS: REGROUPING IN REAR // ${u.rallyRoundsLeft} RD(S) TO RALLY</div>` : ''}

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] font-mono">
            <div>
              <div class="flex justify-between">
                <span class="text-[#7c877b]">PERS</span>
                <span class="text-[#89b884]">${u.personnel}/${u.maxPersonnel} (${persPct}%)</span>
              </div>
              <div class="w-full h-2 bar-track mt-0.5">
                <div class="bg-[#5e8f59] h-full bar-fill" style="width: ${persPct}%"></div>
              </div>
              <div class="text-[9.5px] text-[#7c877b] mt-0.5">KIA <span class="text-[#d46a64]">${u.dead}</span> | WIA <span class="text-[#c8a24b]">${u.wounded}</span>${lossMalus < 0 ? ` <span class="text-[#d46a64]">[${lossMalus}%]</span>` : ''}</div>
            </div>

            <div>
              <div class="flex justify-between">
                <span class="text-[#7c877b]">ORG</span>
                <span class="text-[#8ec0e8]">${(u.isMonster || u.isZombie) ? 'N/A' : `${u.org}/${u.maxOrg} (${orgPct}%)`}</span>
              </div>
              <div class="w-full h-2 bar-track mt-0.5">
                <div class="bg-[#4e8ec4] h-full bar-fill" style="width: ${orgPct}%"></div>
              </div>
              <div class="text-[9.5px] text-[#7c877b] mt-0.5">CLASS <span class="text-[#b8c2b6]">${escapeHtml(u.armorTier.toUpperCase())}</span>${orgMalus < 0 ? ` <span class="text-[#d46a64]">[${orgMalus}%]</span>` : ''}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] font-mono">
            <div>
              <div class="flex justify-between">
                <span class="text-[#7c877b]">SUP</span>
                <span class="text-[#c8a24b]">${(u.isMonster || u.isZombie) ? 'N/A' : `${u.supply}/${u.maxSupply} (${supPct}%)`}</span>
              </div>
              <div class="w-full h-1.5 bar-track mt-0.5">
                <div class="bg-[#c8a24b] h-full bar-fill" style="width: ${supPct}%"></div>
              </div>
              ${supMalus < 0 ? `<div class="text-[9.5px] text-[#d46a64] mt-0.5">SUPPLY DEFICIT [${supMalus}%]</div>` : ''}
            </div>

            ${u.maxArmor > 0 ? `
            <div>
              <div class="flex justify-between">
                <span class="text-[#7c877b]">AFV</span>
                <span class="text-[#d99b52]">${u.armor}/${u.maxArmor}</span>
              </div>
              <div class="w-full h-1.5 bar-track mt-0.5">
                <div class="bg-[#c27a34] h-full bar-fill" style="width: ${armorPct}%"></div>
              </div>
              <div class="text-[9.5px] text-[#7c877b] mt-0.5">RECOV <span class="text-[#89b884]">${u.recoverableArmor}</span> | KO <span class="text-[#d46a64]">${u.unrecoverableArmor}</span></div>
            </div>
            ` : `<div class="text-[9.5px] font-mono uppercase text-[#667065] flex items-center">UNARMORED // FOOT ELEMENT</div>`}
          </div>

          <div class="flex flex-wrap gap-1 pt-1.5 border-t border-[#1e241f]">
            ${traitBadges}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderSidePanel(side, forceRebuild = false) {
    renderSideControls(side, forceRebuild);
    renderSideTelemetry(side);
    renderSideUnitCards(side);
  }

  function renderCenterTelemetry() {
    const state = ID.state;
    if (!state || !state.battle) return;

    const rdEl = document.getElementById('round-counter-display');
    const phEl = document.getElementById('phase-indicator');
    if (rdEl) {
      rdEl.textContent = state.battle.isOver
        ? `BATTLE CONCLUDED (RD ${state.battle.round})`
        : `ROUND ${state.battle.round}`;
    }
    if (phEl) {
      const atk = state.battle.attackerSide;
      const def = atk === 'A' ? 'B' : 'A';
      phEl.textContent = state.battle.isOver
        ? `Winner: Side ${state.battle.winner}`
        : `Side ${atk} Attacks ➔ Side ${def} Defends (& Return Fire)`;
    }

    const C = getCombat();
    const actA = C.getSideActivePersonnel ? C.getSideActivePersonnel('A') : 0;
    const actB = C.getSideActivePersonnel ? C.getSideActivePersonnel('B') : 0;
    const total = Math.max(1, actA + actB);
    const pctA = Math.round((actA / total) * 100);
    const pctB = 100 - pctA;

    const barA = document.getElementById('force-ratio-bar-a');
    const barB = document.getElementById('force-ratio-bar-b');
    if (barA) barA.style.width = `${pctA}%`;
    if (barB) barB.style.width = `${pctB}%`;

    const lblA = document.getElementById('ratio-label-a');
    const lblB = document.getElementById('ratio-label-b');
    if (lblA) lblA.textContent = `Side A: ${actA.toLocaleString()} Active`;
    if (lblB) lblB.textContent = `Side B: ${actB.toLocaleString()} Active`;

    const bonusA = C.getOutnumberingBonusPct ? C.getOutnumberingBonusPct('A', 'B') : 0;
    const bonusB = C.getOutnumberingBonusPct ? C.getOutnumberingBonusPct('B', 'A') : 0;
    const pill = document.getElementById('outnumber-bonus-pill');
    if (pill) {
      if (bonusA > 0) pill.textContent = `Side A Outnumbers (+${bonusA}% Atk/Def)`;
      else if (bonusB > 0) pill.textContent = `Side B Outnumbers (+${bonusB}% Atk/Def)`;
      else pill.textContent = `Balanced Forces (No Outnumber Bonus)`;
    }
  }

  // Combat Log Sitrep Channel Registry
  const colorMap = {
    rolls: 'sitrep-row text-[#d2d9d0] border-l-[#5c6b5d] bg-[#101411]',
    damage: 'sitrep-row text-[#ecc5c3] border-l-[#c2524c] bg-[#1c1212]',
    armor: 'sitrep-row text-[#e8d5a8] border-l-[#c8a24b] bg-[#1a1710]',
    support: 'sitrep-row text-[#bfd8ec] border-l-[#4e8ec4] bg-[#11171c]',
    error: 'sitrep-row text-white border-l-[#ef4444] bg-[#3b1515] font-bold'
  };

  function renderCombatLog() {
    const state = ID.state;
    const container = document.getElementById('combat-log-container');
    if (!container || !state || !state.battle) return;

    const filterEl = document.getElementById('log-filter');
    const filterVal = filterEl ? filterEl.value : 'all';

    if (!state.battle.logs || state.battle.logs.length === 0) {
      uiState.renderedLogIds.clear();
      container.innerHTML = `<div class="text-slate-500 text-center py-12">No combat events recorded yet. Click "▶ Next Round" or "⏩ Auto Battle" to start simulation.</div>`;
      return;
    }

    const logsToRender = state.battle.logs.slice(-150);
    const filtered = logsToRender.filter(item => filterVal === 'all' || item.category === filterVal);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="text-slate-500 text-center py-12">No events match the selected filter.</div>`;
      return;
    }

    container.innerHTML = filtered.slice().reverse().map(item => {
      const isNew = !uiState.renderedLogIds.has(item.id);
      if (isNew) uiState.renderedLogIds.add(item.id);
      return `
      <div class="${isNew ? 'log-entry-new ' : ''}px-2.5 py-1.5 ${colorMap[item.category] || colorMap.rolls}">
        <span class="text-[#6e7a6d] mr-1.5 font-bold">[RD-${String(item.round).padStart(2, '0')}]</span>${escapeHtml(item.text)}
      </div>`;
    }).join('');

    // Keep renderedLogIds bounded when logs grow large
    if (uiState.renderedLogIds.size > 400) {
      const activeIds = new Set(logsToRender.map(l => l.id));
      uiState.renderedLogIds = activeIds;
    }
  }

  /**
   * Fast targeted pipeline for battle round updates
   */
  function renderCombatRound() {
    renderCenterTelemetry();
    renderSideTelemetry('A');
    renderSideTelemetry('B');
    renderSideControls('A', false);
    renderSideControls('B', false);
    renderSideUnitCards('A');
    renderSideUnitCards('B');
    renderCombatLog();
  }

  /**
   * Full battlefield view refresh
   */
  function renderBattlefield(forceRebuildControls = false) {
    renderEnvironmentSelectors();
    renderSidePanel('A', forceRebuildControls);
    renderSidePanel('B', forceRebuildControls);
    renderCenterTelemetry();
    renderCombatLog();
  }

  // --------------------------------------------------------------------------
  // Subsystem Tabs (Rendered via Dirty Checking)
  // --------------------------------------------------------------------------

  function renderUnitDesigner() {
    const state = ID.state;
    if (!state) return;

    const chkContainer = document.getElementById('unit-traits-checkboxes');
    if (chkContainer) {
      const currentChecked = Array.from(chkContainer.querySelectorAll('input:checked')).map(i => i.value);
      chkContainer.innerHTML = (state.traits || []).map(t => `
        <label class="flex items-start gap-1.5 p-1 rounded hover:bg-slate-900 cursor-pointer">
          <input type="checkbox" value="${t.id}" class="unit-trait-chk mt-0.5 accent-amber-500" ${currentChecked.includes(t.id) ? 'checked' : ''}>
          <div>
            <div class="font-semibold text-slate-200">${t.name}</div>
            <div class="text-[10px] text-slate-400 leading-tight">${t.desc}</div>
          </div>
        </label>
      `).join('');
    }

    const grid = document.getElementById('unit-templates-grid');
    if (!grid) return;

    const C = getCombat();

    grid.innerHTML = (state.unitTemplates || []).map(u => {
      const traitNames = (u.traits || []).map(tid => C.getTraitById ? C.getTraitById(tid)?.name : tid).filter(Boolean).join(', ');
      const purBonus = C.getUnitPursuitBonus ? C.getUnitPursuitBonus(u) : 0;
      const retBonus = C.getUnitRetreatBonus ? C.getUnitRetreatBonus(u) : 0;

      return `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
          <div>
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-bold text-sm text-white">${u.name}</h3>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">${u.experience}</span>
            </div>
            <div class="text-[11px] font-mono text-slate-400 mt-1">
              ${u.category.toUpperCase()} | Armor: ${u.armorTier.toUpperCase()} (${u.armorCount} veh)
            </div>
            <div class="grid grid-cols-3 gap-1.5 mt-2 p-2 rounded bg-slate-900/80 text-[11px] font-mono">
              <div>HP: <b class="text-emerald-400">${u.personnel}</b></div>
              <div>Org: <b class="text-sky-400">${u.maxOrg}</b></div>
              <div>Sup: <b class="text-amber-300">${u.maxSupply}</b></div>
              <div>Soft: <b class="text-white">${u.softAttack}</b></div>
              <div>Hard: <b class="text-white">${u.hardAttack}</b></div>
              <div>Def: <b class="text-white">${u.defense}</b></div>
              <div>Pierce: <b class="text-sky-300">${u.piercing}</b></div>
              <div>Hardness: <b class="text-amber-300">${u.hardness}</b></div>
              <div>Pur/Ret: <b class="text-purple-300">${purBonus >= 0 ? '+' : ''}${purBonus}/${retBonus >= 0 ? '+' : ''}${retBonus}</b></div>
            </div>
            <div class="text-[11px] text-slate-400 mt-1.5">
              <b class="text-slate-300">Traits:</b> ${traitNames || 'None'}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800 text-xs">
            <button type="button" onclick="loadUnitIntoForm('${u.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">✎ Edit</button>
            <button type="button" onclick="duplicateUnitTemplate('${u.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700" title="Duplicate this template">⧉ Duplicate</button>
            <button type="button" onclick="deployTemplateById('${u.id}', 'A')" class="px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white">+ Side A</button>
            <button type="button" onclick="deployTemplateById('${u.id}', 'B')" class="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white">+ Side B</button>
            <button type="button" onclick="deleteUnitTemplate('${u.id}')" class="ml-auto px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderTraitsTab() {
    const state = ID.state;
    const container = document.getElementById('traits-list-container');
    if (!container || !state) return;

    container.innerHTML = (state.traits || []).map(t => `
      <div class="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between gap-2">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs sm:text-sm text-amber-300">${t.name}</span>
            <button type="button" onclick="loadTraitIntoForm('${t.id}')" class="text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">✎ Edit</button>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">${t.desc}</p>
          <div class="flex flex-wrap gap-1 mt-2 text-[10px] font-mono text-slate-300">
            ${t.atkPct ? `<span class="px-1.5 py-0.5 rounded bg-slate-900">Atk ${t.atkPct > 0 ? '+' : ''}${t.atkPct}%</span>` : ''}
            ${t.defPct ? `<span class="px-1.5 py-0.5 rounded bg-slate-900">Def ${t.defPct > 0 ? '+' : ''}${t.defPct}%</span>` : ''}
            ${t.pierceFlat ? `<span class="px-1.5 py-0.5 rounded bg-slate-900">Pierce +${t.pierceFlat}</span>` : ''}
            ${t.hardnessFlat ? `<span class="px-1.5 py-0.5 rounded bg-slate-900">Hardness +${t.hardnessFlat}</span>` : ''}
            ${t.vigilance ? `<span class="px-1.5 py-0.5 rounded bg-slate-900">Vig ${t.vigilance > 0 ? '+' : ''}${t.vigilance}</span>` : ''}
            ${t.pursueBonus ? `<span class="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300">Pursuit ${t.pursueBonus > 0 ? '+' : ''}${t.pursueBonus}</span>` : ''}
            ${t.retreatBonus ? `<span class="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300">Retreat ${t.retreatBonus > 0 ? '+' : ''}${t.retreatBonus}</span>` : ''}
            ${t.terrainTarget ? `<span class="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300">${t.terrainTarget} +${t.terrainBonus}%</span>` : ''}
            ${t.antiCategory ? `<span class="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300">Anti-${t.antiCategory} +${t.antiBonus}%</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderCommandersTab() {
    const state = ID.state;
    if (!state) return;

    const chkContainer = document.getElementById('cmd-traits-checkboxes');
    const traitsList = state.commanderTraits || D.DEFAULT_COMMANDER_TRAITS || [];

    if (chkContainer) {
      const checked = Array.from(chkContainer.querySelectorAll('input:checked')).map(i => i.value);
      chkContainer.innerHTML = traitsList.map(ct => `
        <div class="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900">
          <label class="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
            <input type="checkbox" value="${ct.id}" class="cmd-trait-chk mt-0.5 accent-amber-500" ${checked.includes(ct.id) ? 'checked' : ''}>
            <div class="min-w-0">
              <div class="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                ${ct.name}
                ${ct.rallyDurationRed ? `<span class="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-mono text-[9px] border border-amber-800">-${ct.rallyDurationRed} Rally Rd</span>` : ''}
                ${ct.rallyCheckBonus ? `<span class="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono text-[9px] border border-emerald-800">+${ct.rallyCheckBonus} Rally Roll</span>` : ''}
                ${ct.targetUnitCategory ? `<span class="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 font-mono text-[9px] border border-sky-800">${ct.targetUnitCategory.toUpperCase()} ONLY</span>` : ''}
              </div>
              <div class="text-[11px] text-slate-400">${ct.desc}</div>
            </div>
          </label>
          <button type="button" onclick="openCmdTraitModal('${ct.id}')" class="shrink-0 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700" title="Edit or delete ${ct.name}">✎ Edit</button>
        </div>
      `).join('');
    }

    const listContainer = document.getElementById('commanders-list-container');
    if (!listContainer) return;

    const C = getCombat();

    listContainer.innerHTML = (state.commanders || []).map(c => {
      const traitNames = (c.traits || []).map(tid => C.getCommanderTraitById ? C.getCommanderTraitById(tid)?.name : tid).filter(Boolean).join(', ');
      return `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
          <div>
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-sm text-white">★ ${c.name}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">${c.personality}</span>
            </div>

            <div class="grid grid-cols-2 gap-1.5 my-2 p-2 rounded bg-slate-900 text-[10px] font-mono">
              <div>⚔ Atk: <b class="text-amber-400">Lvl ${c.attackLevel || 0} (+${((c.attackLevel || 0) * 2.5).toFixed(1)}%)</b></div>
              <div>🛡 Def: <b class="text-sky-400">Lvl ${c.defenseLevel || 0} (+${((c.defenseLevel || 0) * 2.5).toFixed(1)}%)</b></div>
              <div>🎖 Cmd: <b class="text-emerald-400">Lvl ${c.commandLevel || 0} (+${((c.commandLevel || 0) * 2.5).toFixed(1)}%)</b></div>
              <div>📦 Log: <b class="text-purple-400">Lvl ${c.logisticsLevel || 0} (+${((c.logisticsLevel || 0) * 2.5).toFixed(1)}%)</b></div>
            </div>

            <p class="text-xs text-slate-400 mt-1"><b>Traits:</b> ${traitNames || 'None'}</p>
          </div>
          <div class="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
            <button type="button" onclick="loadCommanderIntoForm('${c.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">✎ Edit</button>
            ${c.id !== 'cmd_none' ? `<button type="button" onclick="deleteCommander('${c.id}')" class="ml-auto px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300">Erase</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderTerrainTab() {
    const state = ID.state;
    if (!state) return;

    const editSel = document.getElementById('terrain-edit-select');
    if (editSel) {
      const cur = editSel.value || 'Plains';
      editSel.innerHTML = Object.keys(state.terrains || {}).map(k =>
        `<option value="${k}" ${cur === k ? 'selected' : ''}>${state.terrains[k].name}</option>`
      ).join('');
      if (!document.getElementById('terr-name')?.value) {
        if (ID.App && ID.App.loadTerrainIntoForm) ID.App.loadTerrainIntoForm();
      }
    }

    const tbody = document.getElementById('terrain-matrix-tbody');
    if (tbody) {
      tbody.innerHTML = Object.keys(state.terrains || {}).map(k => {
        const t = state.terrains[k];
        return `
          <tr class="hover:bg-slate-950/60">
            <td class="py-2 px-2 font-bold text-white">${t.name} ${t.isUrban ? '<span class="text-[10px] text-amber-400">(Urban)</span>' : ''}</td>
            <td class="py-2 px-2 font-mono">${t.infAtk}% / ${t.infDef}%</td>
            <td class="py-2 px-2 font-mono">${t.avAtk}% / ${t.avDef}%</td>
            <td class="py-2 px-2 font-mono">${t.tankAtk}% / ${t.tankDef}%</td>
            <td class="py-2 px-2 font-mono">${t.artAtk}% / ${t.artDef}%</td>
            <td class="py-2 px-2 font-mono">Vig ${t.vigMod >= 0 ? '+' : ''}${t.vigMod} | Sup +${t.supplyDrain}</td>
          </tr>
        `;
      }).join('');
    }

    const featList = document.getElementById('features-matrix-list');
    if (featList) {
      featList.innerHTML = Object.values(D.TERRAIN_FEATURES || {}).map(f => `
        <div class="p-2 rounded bg-slate-950 border border-slate-800">
          <div class="font-semibold text-white">${f.name}</div>
          <div class="text-slate-400 text-[11px]">${f.desc}</div>
        </div>
      `).join('');
    }

    const weathList = document.getElementById('weather-matrix-list');
    if (weathList) {
      weathList.innerHTML = Object.values(D.WEATHER_TYPES || {}).map(w => `
        <div class="p-2 rounded bg-slate-950 border border-slate-800">
          <div class="font-semibold text-white">${w.name}</div>
          <div class="text-slate-400 text-[11px]">${w.desc}</div>
        </div>
      `).join('');
    }
  }

  function renderTacticsGuide() {
    const grid = document.getElementById('tactics-reference-grid');
    if (!grid) return;

    grid.innerHTML = (D.TACTICS_DB || []).map(t => `
      <div class="bg-slate-950 border ${t.urbanOnly ? 'border-amber-500/40' : 'border-slate-800'} rounded-xl p-3.5 space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="font-bold text-sm text-white">${t.name}</span>
          <div class="flex items-center gap-1">
            ${t.urbanOnly ? `<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">URBAN</span>` : ''}
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded ${t.role === 'attack' ? 'bg-rose-500/20 text-rose-300' : 'bg-sky-500/20 text-sky-300'} uppercase">${t.role}</span>
          </div>
        </div>
        <div class="text-[11px] font-mono text-slate-400">Doctrine: <span class="text-slate-200">${t.personality}</span></div>
        <p class="text-xs text-slate-300 leading-relaxed">${t.summary}</p>
        <p class="text-[11px] text-emerald-400"><b>Best Against:</b> ${t.bestAgainst}</p>
      </div>
    `).join('');
  }

  // --------------------------------------------------------------------------
  // After-Action Report (AAR) Modal
  // --------------------------------------------------------------------------

  function openBattleSummaryModal() {
    const state = ID.state;
    const modal = document.getElementById('battle-modal');
    const titleEl = document.getElementById('modal-winner-title');
    const bodyEl = document.getElementById('modal-report-body');
    if (!modal || !bodyEl || !state || !state.battle) return;

    const P = getPursuit();
    if (!state.battle.afterActionReport && P.buildAfterActionReport) {
      P.buildAfterActionReport();
    }
    const rep = state.battle.afterActionReport || {
      winner: state.battle.winner,
      rounds: state.battle.round,
      terrain: state.environment.terrain,
      feature: state.environment.feature,
      weather: state.environment.weather,
      sideA: state.battle.sideA.units,
      sideB: state.battle.sideB.units
    };

    if (state.battle.isOver) {
      titleEl.textContent = rep.winner === 'Draw'
        ? `Mutual Exhaustion — Draw after ${rep.rounds} Rounds`
        : `Victory for Side ${rep.winner} in ${rep.rounds} Rounds!`;
    } else {
      titleEl.textContent = `Live Battle Telemetry — Round ${state.battle.round} (In Progress)`;
    }

    function renderSideReportTable(sideLabel, units = [], colorClass) {
      const totStart = units.reduce((s, u) => s + (u.maxPersonnel || 0), 0);
      const totRem = units.reduce((s, u) => s + (u.personnel || 0), 0);
      const totDead = units.reduce((s, u) => s + (u.dead || 0), 0);
      const totWounded = units.reduce((s, u) => s + (u.wounded || 0), 0);
      const totCaptured = units.reduce((s, u) => s + (u.captured || 0), 0);
      const totEscaped = units.reduce((s, u) => s + (u.escaped || 0), 0);
      const totArmorRem = units.reduce((s, u) => s + (u.armor || 0), 0);
      const totArmorRec = units.reduce((s, u) => s + (u.recoverableArmor || 0), 0);
      const totArmorUnrec = units.reduce((s, u) => s + (u.unrecoverableArmor || 0), 0);

      return `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <h4 class="font-bold text-sm ${colorClass}">${sideLabel}</h4>
            <div class="text-xs font-mono text-slate-300">
              Remaining Active: <b>${totRem.toLocaleString()}</b> / ${totStart.toLocaleString()} |
              Dead (KIA): <b class="text-rose-400">${totDead.toLocaleString()}</b> |
              Wounded (WIA): <b class="text-amber-300">${totWounded.toLocaleString()}</b> |
              Total Captured: <b class="text-purple-300">${totCaptured.toLocaleString()}</b> |
              Escaped: <b class="text-emerald-300">${totEscaped.toLocaleString()}</b>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-mono">
              <thead>
                <tr class="text-slate-400 border-b border-slate-800">
                  <th class="py-1.5 px-2">Unit</th>
                  <th class="py-1.5 px-2">Status</th>
                  <th class="py-1.5 px-2">Active HP</th>
                  <th class="py-1.5 px-2">Org</th>
                  <th class="py-1.5 px-2">KIA / WIA</th>
                  <th class="py-1.5 px-2">Captured / Escaped</th>
                  <th class="py-1.5 px-2">Armor (Act/Rec/Lost)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-900">
                ${units.map(u => `
                  <tr>
                    <td class="py-1.5 px-2 font-sans font-semibold text-white">${u.name}</td>
                    <td class="py-1.5 px-2 ${u.defeated ? 'text-rose-400' : 'text-emerald-400'}">${u.defeated ? 'Defeated' : 'Operational'}</td>
                    <td class="py-1.5 px-2">${u.personnel} / ${u.maxPersonnel}</td>
                    <td class="py-1.5 px-2">${(u.isMonster || u.isZombie) ? 'N/A' : `${u.org}/${u.maxOrg}`}</td>
                    <td class="py-1.5 px-2 text-rose-300">${u.dead} / <span class="text-amber-300">${u.wounded}</span></td>
                    <td class="py-1.5 px-2 text-purple-300">${u.captured || 0} / <span class="text-emerald-300">${u.escaped || 0}</span></td>
                    <td class="py-1.5 px-2">${(u.originalMaxArmor > 0 || u.maxArmor > 0) ? `${u.armor} / ${u.recoverableArmor} / ${u.unrecoverableArmor}` : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${(totArmorRem + totArmorRec + totArmorUnrec) > 0 ? `
            <div class="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
              🚜 Armor Summary — Combat-Ready: <b class="text-orange-300">${totArmorRem}</b> | Recoverable Disabled: <b class="text-emerald-300">${totArmorRec}</b> | Unrecoverable Destroyed: <b class="text-rose-400">${totArmorUnrec}</b>
            </div>
          ` : ''}
        </div>
      `;
    }

    bodyEl.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono text-xs">
        <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span class="text-slate-400 block text-[10px]">OUTCOME</span>
          <span class="font-bold text-amber-400 text-sm">${state.battle.isOver ? `Side ${rep.winner} Won` : 'In Progress'}</span>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span class="text-slate-400 block text-[10px]">ROUNDS PASSED</span>
          <span class="font-bold text-white text-sm">${rep.rounds}</span>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span class="text-slate-400 block text-[10px]">TERRAIN &amp; FEATURE</span>
          <span class="font-bold text-sky-300 text-sm">${rep.terrain} (${rep.feature})</span>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span class="text-slate-400 block text-[10px]">WEATHER</span>
          <span class="font-bold text-emerald-300 text-sm">${rep.weather}</span>
        </div>
      </div>
      ${renderSideReportTable('Side A — Vanguard Force', rep.sideA, 'text-sky-400')}
      ${renderSideReportTable('Side B — Opposing Force', rep.sideB, 'text-rose-400')}
      ${state.battle.salvageReport && state.battle.salvageReport.abandoned > 0 ? `
        <div class="bg-amber-950/40 border border-amber-600/50 rounded-xl p-3 text-xs font-mono text-amber-200">
          <span class="font-bold text-amber-400 uppercase tracking-wider block mb-1">🚜 Battlefield Salvage &amp; Captured Equipment</span>
          <div>Side ${state.battle.winner} swept the field and claimed <b>${state.battle.salvageReport.abandoned}</b> abandoned enemy combat vehicles:</div>
          <ul class="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
            <li>Repaired &amp; Impressed into Service (Beutepanzer): <b class="text-emerald-400">${state.battle.salvageReport.impressed}</b> hulls</li>
            <li>Stripped for Logistics &amp; Spare Parts: <b class="text-sky-400">+${state.battle.salvageReport.supplyScrapped} Supply Points</b></li>
            <li>Scuttled / Burned Hulks: <b class="text-rose-400">${state.battle.salvageReport.scuttled}</b> hulls</li>
          </ul>
        </div>
      ` : ''}
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeBattleSummaryModal() {
    const modal = document.getElementById('battle-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  /**
   * Full global refresh that marks tabs dirty and refreshes the current active view
   */
  function renderAll() {
    markTabDirty('all');
    renderBattlefield(true);
    if (uiState.activeTab !== 'battlefield') {
      renderActiveTabOnly(uiState.activeTab);
    }
  }

  // --------------------------------------------------------------------------
  // Public Module API
  // --------------------------------------------------------------------------

  ID.UI = {
    markTabDirty,
    switchTab,
    renderActiveTabOnly,
    onEnvironmentChange,
    updateSideConfig,
    renderEnvironmentSelectors,
    renderSideControls,
    renderSideTelemetry,
    renderSideUnitCards,
    renderSidePanel,
    renderCenterTelemetry,
    renderCombatLog,
    renderCombatRound,
    renderBattlefield,
    renderUnitDesigner,
    renderTraitsTab,
    renderCommandersTab,
    renderTerrainTab,
    renderTacticsGuide,
    openBattleSummaryModal,
    closeBattleSummaryModal,
    renderAll
  };

  // Backwards-compatible bindings on window
  window.switchTab = switchTab;
  window.onEnvironmentChange = onEnvironmentChange;
  window.updateSideConfig = updateSideConfig;
  window.renderCombatLog = renderCombatLog;
  window.renderCombatRound = renderCombatRound;
  window.renderBattlefield = renderBattlefield;
  window.openBattleSummaryModal = openBattleSummaryModal;
  window.closeBattleSummaryModal = closeBattleSummaryModal;
  window.renderAll = renderAll;

})(window.IronDivision);