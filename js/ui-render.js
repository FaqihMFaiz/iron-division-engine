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
  // After-Action Report (AAR) Modal & Official PDF Export (Form DA-774)
  // --------------------------------------------------------------------------

  function formatMilitaryDTG(isoString) {
    const d = isoString ? new Date(isoString) : new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const mon = months[d.getUTCMonth()];
    const yyyy = d.getUTCFullYear();
    return `${dd}${hh}${mm}Z ${mon} ${yyyy}`;
  }

  function summarizeSideMetrics(units = []) {
    return units.reduce((acc, u) => {
      acc.start += (u.maxPersonnel || 0);
      acc.rem += (u.personnel || 0);
      acc.dead += (u.dead || 0);
      acc.wounded += (u.wounded || 0);
      acc.captured += (u.captured || 0);
      acc.escaped += (u.escaped || 0);
      acc.armorStart += (u.originalMaxArmor || u.maxArmor || 0);
      acc.armorRem += (u.armor || 0);
      acc.armorRec += (u.recoverableArmor || 0);
      acc.armorTowed += (u.towedArmor || 0);
      acc.armorUnrec += (u.unrecoverableArmor || 0);
      if (u.defeated) acc.defeatedCount += 1;
      return acc;
    }, {
      start: 0, rem: 0, dead: 0, wounded: 0, captured: 0, escaped: 0,
      armorStart: 0, armorRem: 0, armorRec: 0, armorTowed: 0, armorUnrec: 0, defeatedCount: 0
    });
  }

  function extractAARChronology(logs = []) {
    if (!logs || logs.length === 0) return [];
    const keywords = [
      'BATTLE OVER', 'AUTOMATIC OVERRUN', 'FIELD SALVAGE', 'BEAST RAMPAGE',
      'NO QUARTER', 'Rallied to the Line', 'Rally Failed', 'Unbreakable Stand',
      'Unbreakable Shattered', 'Rout & Scatter', 'Rout & Fallback', 'wiped out',
      'permanently routed', 'AA Gun CRITICAL', 'MORTAR TRACK BLOWN', 'Decisive Breakthrough'
    ];
    const filtered = logs.filter(l => keywords.some(k => (l.text || '').includes(k)));
    return filtered.slice(-18);
  }

  function buildAARAssessment(rep, sumA, sumB, isOver) {
    const notes = [];
    const lossA = sumA.dead + sumA.wounded + sumA.captured;
    const lossB = sumB.dead + sumB.wounded + sumB.captured;
    const pctA = sumA.start > 0 ? Math.round((lossA / sumA.start) * 100) : 0;
    const pctB = sumB.start > 0 ? Math.round((lossB / sumB.start) * 100) : 0;

    if (!isOver) {
      notes.push(`Engagement remains active at Round ${rep.rounds}; telemetry reflects live frontline status.`);
    } else if (rep.winner === 'Draw') {
      notes.push(`Mutual combat exhaustion reached in Round ${rep.rounds}; neither force retained operational capacity to hold the sector.`);
    } else {
      const winLabel = rep.winner === 'A' ? 'BLUEFOR (Side A)' : 'OPFOR (Side B)';
      const loseLabel = rep.winner === 'A' ? 'OPFOR (Side B)' : 'BLUEFOR (Side A)';
      notes.push(`${winLabel} secured the ${rep.terrain} (${rep.feature}) sector in Round ${rep.rounds} after neutralizing ${loseLabel}'s frontline cohesion.`);
    }

    notes.push(`Personnel attrition stands at ${pctA}% for BLUEFOR (${lossA.toLocaleString()} total losses) versus ${pctB}% for OPFOR (${lossB.toLocaleString()} total losses).`);

    const totalArmorKoA = sumA.armorUnrec + sumA.armorRec;
    const totalArmorKoB = sumB.armorUnrec + sumB.armorRec;
    if (sumA.armorStart > 0 || sumB.armorStart > 0) {
      notes.push(`Armored vehicle losses: BLUEFOR ${totalArmorKoA} knocked out (${sumA.armorUnrec} total write-offs), OPFOR ${totalArmorKoB} knocked out (${sumB.armorUnrec} total write-offs).`);
    }

    if (isOver && rep.salvage && rep.salvage.abandoned > 0) {
      notes.push(`Field recovery teams secured ${rep.salvage.abandoned} abandoned enemy hulls (${rep.salvage.impressed} impressed into service, +${rep.salvage.supplyScrapped} depot supply stripped).`);
    }
    return notes;
  }

  function getActiveAARData() {
    const state = ID.state;
    if (!state || !state.battle) return null;

    const C = getCombat();
    const getCmdName = (side) => C.getSideCommander ? (C.getSideCommander(side)?.name || 'Autonomous Staff') : 'Autonomous Staff';

    if (state.battle.isOver && state.battle.afterActionReport) {
      return state.battle.afterActionReport;
    }

    return {
      docId: `SITREP-RD${String(state.battle.round).padStart(2, '0')}`,
      timestamp: new Date().toISOString(),
      winner: state.battle.winner,
      rounds: state.battle.round,
      terrain: state.environment.terrain,
      feature: state.environment.feature,
      weather: state.environment.weather,
      theatreAttackerSide: state.environment.theatreAttackerSide || 'A',
      commanderA: getCmdName('A'),
      commanderB: getCmdName('B'),
      sideA: state.battle.sideA.units,
      sideB: state.battle.sideB.units,
      salvage: state.battle.isOver ? (state.battle.salvageReport || null) : null
    };
  }

  function openBattleSummaryModal() {
    const state = ID.state;
    const modal = document.getElementById('battle-modal');
    const titleEl = document.getElementById('modal-winner-title');
    const bodyEl = document.getElementById('modal-report-body');
    if (!modal || !bodyEl || !state || !state.battle) return;

    const P = getPursuit();
    if (state.battle.isOver && !state.battle.afterActionReport && P.buildAfterActionReport) {
      P.buildAfterActionReport();
    }

    const rep = getActiveAARData();
    if (!rep) return;

    const isOver = !!state.battle.isOver;
    const dtg = formatMilitaryDTG(rep.timestamp);
    const sumA = summarizeSideMetrics(rep.sideA);
    const sumB = summarizeSideMetrics(rep.sideB);
    const lossA = sumA.dead + sumA.wounded + sumA.captured;
    const lossB = sumB.dead + sumB.wounded + sumB.captured;
    const exchangeRatio = lossA > 0 ? `1 : ${(lossB / lossA).toFixed(2)}` : (lossB > 0 ? `0 : ${lossB}` : '0 : 0');
    const chronology = extractAARChronology(state.battle.logs);
    const assessments = buildAARAssessment(rep, sumA, sumB, isOver);
    const salvage = isOver ? (rep.salvage || state.battle.salvageReport) : null;

    if (isOver) {
      titleEl.textContent = rep.winner === 'Draw'
        ? `MUTUAL EXHAUSTION — DRAW (RD-${String(rep.rounds).padStart(2, '0')})`
        : `VICTORY: ${rep.winner === 'A' ? 'BLUEFOR (SIDE A)' : 'OPFOR (SIDE B)'} — RD-${String(rep.rounds).padStart(2, '0')}`;
    } else {
      titleEl.textContent = `LIVE OPERATIONAL SITREP — RD-${String(rep.rounds).padStart(2, '0')} (IN PROGRESS)`;
    }

    function renderSideReportTable(sideLabel, commanderName, units = [], sum, colorClass) {
      return `
        <div class="bg-slate-950 border border-slate-800 p-3 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <h4 class="font-bold font-mono text-xs uppercase tracking-wider ${colorClass}">${sideLabel}</h4>
              <div class="text-[10px] font-mono text-[#7c877b]">COMMANDER: ${escapeHtml(commanderName)}</div>
            </div>
            <div class="text-[10.5px] font-mono text-[#c8d1c7]">
              EFF: <b>${sum.rem.toLocaleString()}</b>/${sum.start.toLocaleString()} |
              KIA: <b class="text-[#d46a64]">${sum.dead.toLocaleString()}</b> |
              WIA: <b class="text-[#c8a24b]">${sum.wounded.toLocaleString()}</b> |
              POW: <b class="text-[#b8a2d9]">${sum.captured.toLocaleString()}</b> |
              ESC: <b class="text-[#7cb377]">${sum.escaped.toLocaleString()}</b>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[11px] font-mono border-collapse">
              <thead>
                <tr class="text-[#7c877b] border-b border-slate-800 uppercase text-[10px]">
                  <th class="py-1.5 px-2">Formation</th>
                  <th class="py-1.5 px-2">Status</th>
                  <th class="py-1.5 px-2 text-right">Strength</th>
                  <th class="py-1.5 px-2 text-right">Org</th>
                  <th class="py-1.5 px-2 text-right">KIA / WIA</th>
                  <th class="py-1.5 px-2 text-right">POW / ESC</th>
                  <th class="py-1.5 px-2 text-right">AFV (Act/Rec/Tow/KO)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1e241f]">
                ${units.map(u => `
                  <tr>
                    <td class="py-1.5 px-2 font-semibold text-[#e7ece4]">${escapeHtml(u.name)}</td>
                    <td class="py-1.5 px-2 uppercase text-[10px] ${u.defeated ? 'text-[#d46a64]' : (u.isRallying ? 'text-[#c8a24b]' : 'text-[#7cb377]')}">${u.defeated ? 'OUT OF ACTION' : (u.isRallying ? 'REAR RALLY' : 'OPERATIONAL')}</td>
                    <td class="py-1.5 px-2 text-right">${u.personnel}/${u.maxPersonnel}</td>
                    <td class="py-1.5 px-2 text-right">${(u.isMonster || u.isZombie) ? 'N/A' : `${u.org}/${u.maxOrg}`}</td>
                    <td class="py-1.5 px-2 text-right text-[#d46a64]">${u.dead} / <span class="text-[#c8a24b]">${u.wounded}</span></td>
                    <td class="py-1.5 px-2 text-right text-[#b8a2d9]">${u.captured || 0} / <span class="text-[#7cb377]">${u.escaped || 0}</span></td>
                    <td class="py-1.5 px-2 text-right">${(u.originalMaxArmor > 0 || u.maxArmor > 0) ? `${u.armor}/${u.recoverableArmor}/${u.towedArmor || 0}/${u.unrecoverableArmor}` : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="border-t border-[#364038] bg-[#111512] font-bold text-[#e7ece4]">
                  <td class="py-1.5 px-2 uppercase" colspan="2">TOTALS (${units.length - sum.defeatedCount}/${units.length} ACTIVE)</td>
                  <td class="py-1.5 px-2 text-right">${sum.rem}/${sum.start}</td>
                  <td class="py-1.5 px-2 text-right">—</td>
                  <td class="py-1.5 px-2 text-right text-[#d46a64]">${sum.dead} / <span class="text-[#c8a24b]">${sum.wounded}</span></td>
                  <td class="py-1.5 px-2 text-right text-[#b8a2d9]">${sum.captured} / <span class="text-[#7cb377]">${sum.escaped}</span></td>
                  <td class="py-1.5 px-2 text-right">${sum.armorStart > 0 ? `${sum.armorRem}/${sum.armorRec}/${sum.armorTowed}/${sum.armorUnrec}` : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    }

    bodyEl.innerHTML = `
      <!-- Official Military AAR Header Block -->
      <div class="bg-slate-950 border border-[#364038] p-3 font-mono text-[11px] space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#29312b] pb-1.5 text-[10px] text-[#7c877b] uppercase tracking-widest">
          <span>UNCLASSIFIED // SIMULATION OPS</span>
          <span>DOC-REF: ${escapeHtml(rep.docId || 'AAR-ID-001')} | DTG: ${dtg}</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div class="p-2 bg-[#111512] border border-[#242c26]">
            <span class="text-[#6e7a6d] block text-[9px] uppercase">1. OUTCOME</span>
            <span class="font-bold text-[#c8a24b] text-xs uppercase">${isOver ? (rep.winner === 'Draw' ? 'DRAW' : `SIDE ${rep.winner} VICTORY`) : 'IN PROGRESS'}</span>
          </div>
          <div class="p-2 bg-[#111512] border border-[#242c26]">
            <span class="text-[#6e7a6d] block text-[9px] uppercase">2. DURATION / RATIO</span>
            <span class="font-bold text-[#e7ece4] text-xs">RD-${String(rep.rounds).padStart(2, '0')} | EXCH ${exchangeRatio}</span>
          </div>
          <div class="p-2 bg-[#111512] border border-[#242c26]">
            <span class="text-[#6e7a6d] block text-[9px] uppercase">3. SECTOR / FEATURE</span>
            <span class="font-bold text-[#8ec0e8] text-xs uppercase">${escapeHtml(rep.terrain)} (${escapeHtml(rep.feature)})</span>
          </div>
          <div class="p-2 bg-[#111512] border border-[#242c26]">
            <span class="text-[#6e7a6d] block text-[9px] uppercase">4. METEO / POSTURE</span>
            <span class="font-bold text-[#89b884] text-xs uppercase">${escapeHtml(rep.weather)} | SIDE ${rep.theatreAttackerSide || 'A'} ATK</span>
          </div>
        </div>
      </div>

      <!-- Section 2: ORBAT & Casualty Ledgers -->
      ${renderSideReportTable('SECTION 2A // BLUEFOR (SIDE A — VANGUARD)', rep.commanderA || 'Autonomous Staff', rep.sideA, sumA, 'text-[#8ec0e8]')}
      ${renderSideReportTable('SECTION 2B // OPFOR (SIDE B — OPPOSING)', rep.commanderB || 'Autonomous Staff', rep.sideB, sumB, 'text-[#e69894]')}

      <!-- Section 3: Battlefield Salvage & Captured Equipment -->
      ${isOver && salvage && salvage.abandoned > 0 ? `
        <div class="bg-[#1a1710] border border-[#7d6731] p-3 text-xs font-mono space-y-1.5">
          <span class="font-bold text-[#c8a24b] uppercase tracking-wider block">SECTION 3 // BATTLEFIELD SALVAGE &amp; CAPTURED MATERIAL</span>
          <div class="text-[#dde3da]">Side ${rep.winner} field recovery units secured <b>${salvage.abandoned}</b> abandoned enemy combat hulls:</div>
          <div class="grid grid-cols-3 gap-2 pt-1 text-[11px]">
            <div class="p-2 bg-[#111512] border border-[#2e3730]">IMPRESSED (BEUTEPANZER): <b class="text-[#7cb377]">${salvage.impressed}</b></div>
            <div class="p-2 bg-[#111512] border border-[#2e3730]">STRIPPED FOR DEPOT: <b class="text-[#8ec0e8]">+${salvage.supplyScrapped} SUP</b></div>
            <div class="p-2 bg-[#111512] border border-[#2e3730]">SCUTTLED / WRITE-OFF: <b class="text-[#d46a64]">${salvage.scuttled}</b></div>
          </div>
        </div>
      ` : ''}

      <!-- Section 4: Key Engagement Chronology -->
      ${chronology.length > 0 ? `
        <div class="bg-slate-950 border border-slate-800 p-3 space-y-1.5 font-mono">
          <span class="font-bold text-[#c8a24b] uppercase tracking-wider text-xs block">SECTION 4 // SIGNIFICANT ENGAGEMENT CHRONOLOGY</span>
          <div class="max-h-36 overflow-y-auto custom-scroll space-y-1 text-[10.5px] text-[#c8d1c7]">
            ${chronology.map(l => `<div class="border-l-2 border-[#3c473e] pl-2"><span class="text-[#6e7a6d]">[RD-${String(l.round).padStart(2, '0')}]</span> ${escapeHtml(l.text)}</div>`).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Section 5: Staff Assessment -->
      <div class="bg-slate-950 border border-slate-800 p-3 space-y-1.5 font-mono">
        <span class="font-bold text-[#c8a24b] uppercase tracking-wider text-xs block">SECTION 5 // G-3 OPERATIONAL ASSESSMENT</span>
        <ul class="list-disc list-inside space-y-1 text-[11px] text-[#c8d1c7]">
          ${assessments.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
        </ul>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  /**
   * Generates a standalone, print-formatted Military After-Action Report (Form DA-774)
   * and triggers the browser Save-as-PDF / Print dialog.
   */
  function buildPrintableAARHtml(rep) {
    const state = ID.state;
    const isOver = !!(state && state.battle && state.battle.isOver);
    const dtg = formatMilitaryDTG(rep.timestamp);
    const sumA = summarizeSideMetrics(rep.sideA);
    const sumB = summarizeSideMetrics(rep.sideB);
    const lossA = sumA.dead + sumA.wounded + sumA.captured;
    const lossB = sumB.dead + sumB.wounded + sumB.captured;
    const exchangeRatio = lossA > 0 ? `1 : ${(lossB / lossA).toFixed(2)}` : (lossB > 0 ? `0 : ${lossB}` : '0 : 0');
    const chronology = extractAARChronology(state?.battle?.logs || []);
    const assessments = buildAARAssessment(rep, sumA, sumB, isOver);
    const salvage = isOver ? (rep.salvage || state?.battle?.salvageReport) : null;
    const docTitle = `Iron_Division_AAR_${rep.docId || 'REPORT'}_${rep.terrain}`;

    const renderForceTable = (heading, cmdName, units, sum) => `
      <h3>${escapeHtml(heading)}</h3>
      <div class="meta-sub">COMMANDING OFFICER: <strong>${escapeHtml(cmdName)}</strong> &nbsp;|&nbsp; FORMATIONS ACTIVE: <strong>${units.length - sum.defeatedCount}/${units.length}</strong></div>
      <table>
        <thead>
          <tr>
            <th>Unit Designation</th>
            <th>Class / Exp</th>
            <th>Final Status</th>
            <th class="num">Start</th>
            <th class="num">Rem</th>
            <th class="num">KIA</th>
            <th class="num">WIA</th>
            <th class="num">POW</th>
            <th class="num">ESC</th>
            <th class="num">AFV (Act/Rec/Tow/KO)</th>
          </tr>
        </thead>
        <tbody>
          ${units.map(u => `
            <tr>
              <td><strong>${escapeHtml(u.name)}</strong></td>
              <td>${escapeHtml((u.category || '').toUpperCase())} / ${escapeHtml(u.experience || '')}</td>
              <td>${u.defeated ? 'OUT OF ACTION' : (u.isRallying ? 'REAR RALLY' : 'OPERATIONAL')}</td>
              <td class="num">${u.maxPersonnel}</td>
              <td class="num">${u.personnel}</td>
              <td class="num">${u.dead}</td>
              <td class="num">${u.wounded}</td>
              <td class="num">${u.captured || 0}</td>
              <td class="num">${u.escaped || 0}</td>
              <td class="num">${(u.originalMaxArmor > 0 || u.maxArmor > 0) ? `${u.armor}/${u.recoverableArmor}/${u.towedArmor || 0}/${u.unrecoverableArmor}` : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>FORCE TOTALS</strong></td>
            <td class="num"><strong>${sum.start}</strong></td>
            <td class="num"><strong>${sum.rem}</strong></td>
            <td class="num"><strong>${sum.dead}</strong></td>
            <td class="num"><strong>${sum.wounded}</strong></td>
            <td class="num"><strong>${sum.captured}</strong></td>
            <td class="num"><strong>${sum.escaped}</strong></td>
            <td class="num"><strong>${sum.armorStart > 0 ? `${sum.armorRem}/${sum.armorRec}/${sum.armorTowed}/${sum.armorUnrec}` : '—'}</strong></td>
          </tr>
        </tfoot>
      </table>
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(docTitle)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      color: #111111;
      background: #ffffff;
      margin: 0;
      padding: 16px;
      font-size: 10.5pt;
      line-height: 1.38;
    }
    .class-banner {
      text-align: center;
      font-weight: bold;
      font-size: 9pt;
      letter-spacing: 0.14em;
      border-top: 2px solid #111;
      border-bottom: 2px solid #111;
      padding: 4px 0;
      margin-bottom: 12px;
    }
    .doc-header {
      border: 1.5px solid #111;
      padding: 10px 12px;
      margin-bottom: 14px;
    }
    .doc-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid #111;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .doc-title {
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 0.06em;
    }
    .doc-form {
      font-size: 9pt;
      font-weight: bold;
    }
    .memo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 16px;
      font-size: 9.5pt;
    }
    h2 {
      font-size: 10.5pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: #eceee9;
      border: 1px solid #111;
      border-left: 5px solid #111;
      padding: 4px 8px;
      margin: 14px 0 8px 0;
      page-break-after: avoid;
    }
    h3 {
      font-size: 10pt;
      text-transform: uppercase;
      margin: 10px 0 2px 0;
      page-break-after: avoid;
    }
    .meta-sub {
      font-size: 8.8pt;
      margin-bottom: 5px;
      color: #333;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border: 1px solid #111;
      margin-bottom: 10px;
    }
    .kpi-cell {
      padding: 6px 8px;
      border-right: 1px solid #111;
    }
    .kpi-cell:last-child { border-right: none; }
    .kpi-label { font-size: 8pt; color: #444; display: block; text-transform: uppercase; }
    .kpi-val { font-size: 10pt; font-weight: bold; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 8.8pt;
    }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th, td {
      border: 1px solid #333;
      padding: 4px 6px;
      text-align: left;
    }
    th {
      background: #f2f2ef;
      text-transform: uppercase;
      font-size: 8pt;
    }
    tfoot td { background: #eceee9; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .box {
      border: 1px solid #111;
      padding: 8px 10px;
      margin-bottom: 10px;
      font-size: 9.2pt;
      break-inside: avoid;
    }
    .chron-item {
      font-size: 8.5pt;
      margin-bottom: 3px;
      border-left: 2px solid #555;
      padding-left: 6px;
    }
    ul { margin: 4px 0 0 18px; padding: 0; }
    li { margin-bottom: 4px; font-size: 9.2pt; }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 22px;
      break-inside: avoid;
    }
    .sig-block {
      border-top: 1px solid #111;
      padding-top: 4px;
      font-size: 8.5pt;
    }
    .footer-banner {
      margin-top: 18px;
    }
  </style>
</head>
<body>
  <div class="class-banner">UNCLASSIFIED // IRON DIVISION OPERATIONAL SIMULATION</div>

  <div class="doc-header">
    <div class="doc-title-row">
      <div class="doc-title">AFTER-ACTION REPORT (AAR)</div>
      <div class="doc-form">FORM DA-774 // ${escapeHtml(rep.docId || 'AAR-001')}</div>
    </div>
    <div class="memo-grid">
      <div><strong>FROM:</strong> HQ COMBINED-ARMS SIMULATION</div>
      <div><strong>DTG:</strong> ${dtg}</div>
      <div><strong>TO:</strong> THEATRE OPERATIONS (G-3)</div>
      <div><strong>STATUS:</strong> ${isOver ? 'FINAL DEBRIEF' : 'INTERIM SITREP'}</div>
      <div><strong>SUBJECT:</strong> ${escapeHtml(rep.terrain.toUpperCase())} (${escapeHtml(rep.feature.toUpperCase())}) ENGAGEMENT</div>
      <div><strong>METEO:</strong> ${escapeHtml(rep.weather.toUpperCase())}</div>
    </div>
  </div>

  <h2>1. Operational Executive Summary</h2>
  <div class="kpi-grid">
    <div class="kpi-cell">
      <span class="kpi-label">Operation Outcome</span>
      <span class="kpi-val">${isOver ? (rep.winner === 'Draw' ? 'MUTUAL EXHAUSTION' : `SIDE ${rep.winner} VICTORY`) : 'IN PROGRESS'}</span>
    </div>
    <div class="kpi-cell">
      <span class="kpi-label">Rounds Elapsed</span>
      <span class="kpi-val">RD-${String(rep.rounds).padStart(2, '0')}</span>
    </div>
    <div class="kpi-cell">
      <span class="kpi-label">Theatre Posture</span>
      <span class="kpi-val">SIDE ${rep.theatreAttackerSide || 'A'} ASSAULT</span>
    </div>
    <div class="kpi-cell">
      <span class="kpi-label">Loss Ratio (A : B)</span>
      <span class="kpi-val">${exchangeRatio}</span>
    </div>
  </div>

  <h2>2. Order of Battle &amp; Casualty Ledger</h2>
  ${renderForceTable('2A. BLUEFOR — Side A (Vanguard Force)', rep.commanderA || 'Autonomous Staff', rep.sideA, sumA)}
  ${renderForceTable('2B. OPFOR — Side B (Opposing Force)', rep.commanderB || 'Autonomous Staff', rep.sideB, sumB)}

  <h2>3. Material Recovery &amp; Battlefield Salvage</h2>
  <div class="box">
    ${isOver && salvage && salvage.abandoned > 0 ? `
      <div><strong>VICTOR FIELD POSSESSION (SIDE ${rep.winner}):</strong> ${salvage.abandoned} abandoned enemy armored hulls secured on the objective.</div>
      <ul>
        <li><strong>Repaired &amp; Impressed (Beutepanzers):</strong> ${salvage.impressed} vehicle(s)</li>
        <li><strong>Stripped for Depot Logistics:</strong> +${salvage.supplyScrapped} Supply Points</li>
        <li><strong>Scuttled / Destroyed Write-Offs:</strong> ${salvage.scuttled} vehicle(s)</li>
      </ul>
    ` : `<div>No abandoned enemy armored vehicles were claimed during this reporting period.</div>`}
  </div>

  <h2>4. Significant Engagement Chronology</h2>
  <div class="box">
    ${chronology.length > 0
      ? chronology.map(l => `<div class="chron-item"><strong>[RD-${String(l.round).padStart(2, '0')}]</strong> ${escapeHtml(l.text)}</div>`).join('')
      : '<div>No major milestone events recorded in sitrep log.</div>'}
  </div>

  <h2>5. G-3 Operational Assessment &amp; Authentication</h2>
  <div class="box">
    <ul>
      ${assessments.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
    </ul>
    <div class="sig-grid">
      <div class="sig-block">
        <strong>PREPARING OFFICER (G-3 OPS)</strong><br>
        IRON DIVISION COMMAND STAFF — ${dtg}
      </div>
      <div class="sig-block">
        <strong>REVIEWING COMMANDER</strong><br>
        ${escapeHtml(rep.winner === 'B' ? (rep.commanderB || 'OPFOR HQ') : (rep.commanderA || 'BLUEFOR HQ'))}
      </div>
    </div>
  </div>

  <div class="class-banner footer-banner">UNCLASSIFIED // END OF AFTER-ACTION REPORT</div>
</body>
</html>`;
  }

  function exportAARToPDF() {
    const rep = getActiveAARData();
    if (!rep) {
      H.showToast('No active battle telemetry available to export.', 'warn');
      return;
    }

    const htmlDoc = buildPrintableAARHtml(rep);
    const printWin = window.open('', '_blank', 'width=960,height=1100');

    if (!printWin) {
      H.showToast('Pop-up blocked — falling back to direct browser print dialog.', 'warn');
      window.print();
      return;
    }

    printWin.document.open();
    printWin.document.write(htmlDoc);
    printWin.document.close();

    const triggerPrint = () => {
      try {
        printWin.focus();
        printWin.print();
      } catch (e) {
        window.print();
      }
    };

    if (printWin.document.readyState === 'complete') {
      setTimeout(triggerPrint, 180);
    } else {
      printWin.onload = () => setTimeout(triggerPrint, 180);
    }
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
    buildPrintableAARHtml,
    exportAARToPDF,
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
  window.exportAARToPDF = exportAARToPDF;
  window.renderAll = renderAll;

})(window.IronDivision);