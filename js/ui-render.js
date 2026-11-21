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
    renderedLogIds: new Set(),
    tacticsPage: 0,
    tacticsDarkMode: false
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
    const todSel = document.getElementById('bf-timeofday');
    const dynChk = document.getElementById('bf-dynamic-weather');
    const cycChk = document.getElementById('bf-cycle-time');
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
    if (todSel && todSel.value) {
      state.environment.timeOfDay = todSel.value;
      const cycle = ['Day', 'DuskDawn', 'Night', 'DuskDawn'];
      const idx = cycle.indexOf(todSel.value);
      if (idx >= 0) state.environment.todStep = idx;
    }
    if (dynChk) state.environment.dynamicWeather = dynChk.checked;
    if (cycChk) state.environment.cycleTimeOfDay = cycChk.checked;
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

    const todSel = document.getElementById('bf-timeofday');
    if (todSel) {
      if (todSel.children.length === 0) {
        todSel.innerHTML = Object.keys(D.TIME_OF_DAY_TYPES || {}).map(k => {
          const td = D.TIME_OF_DAY_TYPES[k];
          return `<option value="${k}">${td.name}</option>`;
        }).join('');
      }
      todSel.value = state.environment.timeOfDay || 'Day';
    }
    const dynChk = document.getElementById('bf-dynamic-weather');
    if (dynChk) dynChk.checked = !!state.environment.dynamicWeather;
    const cycChk = document.getElementById('bf-cycle-time');
    if (cycChk) cycChk.checked = !!state.environment.cycleTimeOfDay;

    const envFx = H.getActiveEnvironmentEffects ? H.getActiveEnvironmentEffects() : null;
    const terr = envFx ? envFx.terr : (state.terrains[state.environment.terrain] || D.DEFAULT_TERRAINS?.Plains || {});
    const feat = envFx ? envFx.feat : (D.TERRAIN_FEATURES?.[state.environment.feature] || D.TERRAIN_FEATURES?.Normal || {});
    const weath = envFx ? envFx.weath : (D.WEATHER_TYPES?.[state.environment.weather] || D.WEATHER_TYPES?.Sunny || {});
    const tod = envFx ? envFx.tod : (D.TIME_OF_DAY_TYPES?.[state.environment.timeOfDay] || D.TIME_OF_DAY_TYPES?.Day || { name: 'Daylight' });
    const airPct = envFx ? Math.round(envFx.airEfficiency * 100) : 100;
    const maxDig = envFx ? envFx.maxEntrenchBase : (terr.maxEntrench || 4);
    const outCap = envFx ? envFx.outnumberCap : (terr.outnumberCap || 100);
    const visBadge = (envFx && envFx.visCap !== null)
      ? `<span class="px-2 py-0.5 bg-[#1b1824] border border-[#5b4d82] text-[#c7b8f5]">VIS CAP // ${envFx.visCap}</span>`
      : '';
    const hazardBadges = (envFx && envFx.hazards && envFx.hazards.length > 0)
      ? envFx.hazards.map(hz => `<span class="px-2 py-0.5 bg-[#331a19] border border-[#8a3c38] text-[#f2a6a2] font-bold" title="${escapeHtml(hz.desc)}">HAZARD // ${hz.shortLabel}</span>`).join('')
      : '';

    const summaryBar = document.getElementById('env-summary-bar');
    if (summaryBar) {
      summaryBar.innerHTML = `
        <div class="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
          <span class="px-2 py-0.5 bg-[#121613] border border-[#2e3730] text-[#c8a24b]">TERR // ${(terr.name || 'Plains').toUpperCase()}: INF ${terr.infAtk >= 0 ? '+' : ''}${terr.infAtk || 0}/${terr.infDef >= 0 ? '+' : ''}${terr.infDef || 0}% | TNK ${terr.tankAtk >= 0 ? '+' : ''}${terr.tankAtk || 0}/${terr.tankDef >= 0 ? '+' : ''}${terr.tankDef || 0}% | DIG ${maxDig} | OUTNUM ${outCap}%</span>
          <span class="px-2 py-0.5 bg-[#121613] border border-[#2e3730] text-[#8ec0e8]">FEAT // ${(feat.name || 'Normal').toUpperCase()}: ATK ×${feat.atkMult || 1} DEF ×${feat.defMult || 1}</span>
          <span class="px-2 py-0.5 bg-[#121613] border border-[#2e3730] text-[#89b884]">METEO // ${(weath.name || 'Sunny').toUpperCase()} · ${(tod.name || 'Daylight').toUpperCase()} · AIR ${airPct}%${state.environment.dynamicWeather ? ' [DYN]' : ''}${state.environment.cycleTimeOfDay ? ' [CYC]' : ''}</span>
          ${visBadge}
          ${hazardBadges}
        </div>
        <div class="font-mono text-[10px] uppercase tracking-wider text-[#c8a24b]">THEATRE LOCK: ${escapeHtml(H.getSideName(state.environment.theatreAttackerSide || 'A').toUpperCase())} ASSAULT / ${escapeHtml(H.getSideName((state.environment.theatreAttackerSide || 'A') === 'A' ? 'B' : 'A').toUpperCase())} ENTRENCHED</div>
      `;
    }

    const collapsedSum = document.getElementById('theatre-collapsed-summary');
    if (collapsedSum) {
      collapsedSum.textContent = `${(terr.name || 'Plains').toUpperCase()} · ${(feat.name || 'Normal').toUpperCase()} · ${(weath.name || 'Sunny').toUpperCase()} · ${(tod.name || 'Daylight').toUpperCase()}`;
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
            <span class="${curDepot <= 0 ? 'text-[#e06c65] font-extrabold' : (depotPct < 30 ? 'text-[#d99b52]' : 'text-[#d4b054]')}">
              ${curDepot}/${maxDepot} PTS (${depotPct}%)
            </span>
          </div>
          <div class="w-full h-2 bar-track">
            <div class="h-full bar-fill ${curDepot <= 0 ? 'bg-[#b84a45]' : (depotPct < 30 ? 'bg-[#c27a34]' : 'bg-[#c8a24b]')}" style="width: ${depotPct}%"></div>
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
      listEl.innerHTML = `<div class="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">No units deployed on ${escapeHtml(H.getSideName(side))}. Select a template above and click "+ Deploy Unit".</div>`;
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
        <div class="unit-dossier ${u.defeated ? 'unit-dossier-defeated' : (side === 'A' ? 'unit-dossier-a' : 'unit-dossier-b')} p-2.5 space-y-2" data-unit-id="${u.instanceId}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap min-w-0">
              <span class="${side === 'A' ? 'text-[#8ec0e8]' : 'text-[#e69894]'} shrink-0" title="${escapeHtml(u.category.toUpperCase())} NATO Symbol">${ID.Icons ? ID.Icons.get(u.category) : ''}</span>
              <span class="font-bold font-mono text-xs text-[#e7ece4] uppercase tracking-wide truncate">${escapeHtml(u.name)}</span>
              <span class="mil-rank-patch inline-flex items-center justify-center w-[22px] h-[22px] bg-[#1c2017] border border-[#594b27] text-[#d4b054] shrink-0" title="${escapeHtml(u.experience)} Rank Insignia">${ID.Icons && ID.Icons.getRank ? ID.Icons.getRank(u.experience) : escapeHtml(u.experience)}</span>
            </div>
            <button type="button" onclick="removeUnitFromSide('${side}', '${u.instanceId}')" class="text-[#667065] hover:text-[#d46a64] font-mono text-xs px-1 shrink-0" title="Remove unit">[X]</button>
          </div>

          <!-- Hidden Tooltip Source for Cursor-Following Floating Dossier -->
          <div class="unit-tooltip-source hidden">
            <div class="space-y-2">
              <div class="flex items-center justify-between border-b border-[#2b342c] pb-1 font-mono text-[9.5px] uppercase">
                <span class="text-[#c8a24b] font-bold truncate">${escapeHtml(u.name)}</span>
                <span class="text-[#939e91] shrink-0 ml-2">${escapeHtml(u.category.replace('_', ' '))}</span>
              </div>
              <div class="flex items-center justify-between font-mono text-[9.5px] uppercase px-1.5 py-0.5 bg-[#1b211c] border border-[#2f3930]">
                <span class="text-[#7c877b]">EXPERIENCE TIER</span>
                <span class="text-[#c8a24b] font-bold">${escapeHtml(u.experience)}</span>
              </div>
              <div class="unit-stat-grid">
                <div class="unit-stat-cell"><span class="unit-stat-label">Soft</span><span class="unit-stat-val">${u.softAttack}</span></div>
                <div class="unit-stat-cell"><span class="unit-stat-label">Hard</span><span class="unit-stat-val">${u.hardAttack}</span></div>
                <div class="unit-stat-cell"><span class="unit-stat-label">Def</span><span class="unit-stat-val">${u.defense}</span></div>
                <div class="unit-stat-cell"><span class="unit-stat-label">Pierce</span><span class="unit-stat-val text-[#8ec0e8]">${u.piercing}</span></div>
                <div class="unit-stat-cell"><span class="unit-stat-label">Hrdn</span><span class="unit-stat-val text-[#c8a24b]">${u.hardness}</span></div>
              </div>
              <div class="grid grid-cols-2 gap-1 font-mono text-[10px]">
                <div class="px-2 py-1 bg-[#181d19] border border-[#29312b] flex justify-between">
                  <span class="text-[#7c877b]">PUR/RET</span>
                  <span class="text-[#b8a2d9] font-bold">${purBonus >= 0 ? '+' : ''}${purBonus}/${retBonus >= 0 ? '+' : ''}${retBonus}</span>
                </div>
                <div class="px-2 py-1 bg-[#181d19] border border-[#29312b] flex justify-between">
                  <span class="text-[#7c877b]">RANGE</span>
                  <span class="${inRangeNow ? 'text-[#7cb377]' : 'text-[#c8a24b]'} font-bold">≤${unitRange}${closestEnemyDist !== null ? `/${closestEnemyDist}` : ''}</span>
                </div>
              </div>
              <div>
                <div class="font-mono text-[9px] uppercase text-[#7c877b] mb-1">TRAITS &amp; SUPPORT</div>
                <div class="flex flex-wrap gap-1">${traitBadges || '<span class="text-[10px] font-mono text-[#667065]">NONE</span>'}</div>
              </div>
            </div>
          </div>

          <!-- Compact On-Card Telemetry (TV, Dig-In, Distance only) -->
          <div class="unit-stat-grid-3">
            <div class="unit-stat-cell" title="Target Value"><span class="unit-stat-label">TV</span><span class="unit-stat-val text-[#7cb377]">${tv}</span></div>
            <div class="unit-stat-cell" title="Entrenchment Level / Max Cap"><span class="unit-stat-label">Dig-In</span><span class="unit-stat-val text-[#c8a24b]">${u.entrenchmentLevel || 0}/${entrenchCap}</span></div>
            <div class="unit-stat-cell" title="Y-Axis Coordinate: ${side === 'A' ? 'A-' : 'B-'}${unitPos}"><span class="unit-stat-label">Dist</span><span class="unit-stat-val text-[#8ec0e8]">${unitPos}</span></div>
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

          ${state.gmMode ? `
            <div class="pt-1.5 mt-1 border-t border-[#3a453c] flex flex-wrap items-center gap-1 font-mono text-[9.5px]">
              <span class="text-[#c8a24b] font-bold mr-1">GM:</span>
              <button type="button" onclick="gmAdjustUnit('${side}', '${u.instanceId}', 'supply', -10)" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#d4b054]">SUP-10</button>
              <button type="button" onclick="gmAdjustUnit('${side}', '${u.instanceId}', 'supply', 10)" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#d4b054]">SUP+10</button>
              <button type="button" onclick="gmAdjustUnit('${side}', '${u.instanceId}', 'org', -10)" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#8ec0e8]">ORG-10</button>
              <button type="button" onclick="gmAdjustUnit('${side}', '${u.instanceId}', 'org', 10)" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#8ec0e8]">ORG+10</button>
              <button type="button" onclick="gmAdjustUnit('${side}', '${u.instanceId}', 'pos', -1)" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#7cb377]" title="Move 1 closer to contact line">DIST-1</button>
              <button type="button" onclick="gmAdjustUnit('${side}', '${u.instanceId}', 'pos', 1)" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#7cb377]" title="Move 1 further back">DIST+1</button>
              ${(u.isRallying || u.defeated) ? `<button type="button" onclick="gmAdjustUnit('${side}', '${u.instanceId}', 'rally_now', 0)" class="ml-auto px-1.5 py-0.5 bg-[#2d472b] hover:bg-[#385936] border border-[#4c7548] text-[#d9ead7] font-bold">RALLY NOW</button>` : ''}
            </div>
          ` : ''}
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
    const nameA = H.getSideName('A');
    const nameB = H.getSideName('B');
    const inpA = document.getElementById('sideA-name-input');
    const inpB = document.getElementById('sideB-name-input');
    if (inpA && document.activeElement !== inpA) inpA.value = nameA;
    if (inpB && document.activeElement !== inpB) inpB.value = nameB;
    const yLblA = document.getElementById('yaxis-label-a');
    const yLblB = document.getElementById('yaxis-label-b');
    if (yLblA) yLblA.textContent = `◄ ${nameA}`;
    if (yLblB) yLblB.textContent = `${nameB} ►`;

    if (phEl) {
      const atk = state.battle.attackerSide;
      const def = atk === 'A' ? 'B' : 'A';
      phEl.textContent = state.battle.isOver
        ? (state.battle.winner === 'Draw' ? 'Result: Mutual Exhaustion' : `Winner: ${H.getSideName(state.battle.winner)}`)
        : `${H.getSideName(atk)} Attacks -> ${H.getSideName(def)} Defends`;
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
    if (lblA) lblA.textContent = `${nameA}: ${actA.toLocaleString()} Active`;
    if (lblB) lblB.textContent = `${nameB}: ${actB.toLocaleString()} Active`;

    const bonusA = C.getOutnumberingBonusPct ? C.getOutnumberingBonusPct('A', 'B') : 0;
    const bonusB = C.getOutnumberingBonusPct ? C.getOutnumberingBonusPct('B', 'A') : 0;
    const pill = document.getElementById('outnumber-bonus-pill');
    if (pill) {
      if (bonusA > 0) pill.textContent = `${nameA} Outnumbers (+${bonusA}% Atk/Def)`;
      else if (bonusB > 0) pill.textContent = `${nameB} Outnumbers (+${bonusB}% Atk/Def)`;
      else pill.textContent = `Balanced Forces (No Outnumber Bonus)`;
    }

    renderYAxisTracker();
  }

  /**
   * Renders the horizontal tactical Y-Axis line (-7 Side A ... 0 ... +7 Side B)
   * with reversed-triangle markers (Blue = A, Red = B, Purple = Both),
   * themed hover tooltips, and an off-line rear-staging strip for routed units.
   */
  function renderYAxisTracker() {
    const state = ID.state;
    const container = document.getElementById('yaxis-line-container');
    if (!container || !state || !state.battle) return;

    const C = getCombat();
    const isAct = C.isUnitActive || (u => !u.defeated && !u.isRallying && u.personnel > 0);

    // Map coordinates [-7 .. +7] -> { A: [], B: [] }
    const coordMap = {};
    const rearA = [];
    const rearB = [];

    (state.battle.sideA.units || []).forEach(u => {
      if (u.defeated) return;
      if (u.isRallying) {
        rearA.push(u);
        return;
      }
      if (!isAct(u)) return;
      const rawPos = (u.pos !== undefined && u.pos !== null) ? u.pos : (H.getUnitStartingPosition ? H.getUnitStartingPosition(u) : 2);
      const axisCoord = H.clamp(-rawPos, -7, 7);
      if (!coordMap[axisCoord]) coordMap[axisCoord] = { A: [], B: [] };
      coordMap[axisCoord].A.push(u);
    });

    (state.battle.sideB.units || []).forEach(u => {
      if (u.defeated) return;
      if (u.isRallying) {
        rearB.push(u);
        return;
      }
      if (!isAct(u)) return;
      const rawPos = (u.pos !== undefined && u.pos !== null) ? u.pos : (H.getUnitStartingPosition ? H.getUnitStartingPosition(u) : 2);
      const axisCoord = H.clamp(rawPos, -7, 7);
      if (!coordMap[axisCoord]) coordMap[axisCoord] = { A: [], B: [] };
      coordMap[axisCoord].B.push(u);
    });

    // Build ticks from -7 to +7
    const ticksHtml = [];
    for (let x = -7; x <= 7; x++) {
      const pct = ((x + 7) / 14) * 100;
      const label = x === 0 ? '0' : String(Math.abs(x));
      ticksHtml.push(`
        <div class="yaxis-tick ${x === 0 ? 'yaxis-tick-zero' : ''}" style="left: ${pct.toFixed(4)}%;">
          <span class="yaxis-tick-label">${label}</span>
        </div>
      `);
    }

    // Build reversed triangle markers with custom military hover tooltips
    const markersHtml = Object.keys(coordMap).map(key => {
      const x = Number(key);
      const bucket = coordMap[x];
      const hasA = bucket.A.length > 0;
      const hasB = bucket.B.length > 0;
      const pct = ((x + 7) / 14) * 100;

      const triClass = (hasA && hasB) ? 'yaxis-tri-both' : (hasA ? 'yaxis-tri-a' : 'yaxis-tri-b');
      const edgeClass = x <= -5 ? 'edge-left' : (x >= 5 ? 'edge-right' : '');
      const totalCount = bucket.A.length + bucket.B.length;
      const coordTitle = x === 0
        ? 'COORD 0 // CONTACT LINE'
        : (x < 0 ? `COORD A-${Math.abs(x)} // SECTOR LEFT` : `COORD B-${x} // SECTOR RIGHT`);

      const rowsA = bucket.A.map(u => `
        <div class="yaxis-tooltip-item">
          <span class="text-[#8ec0e8] font-bold truncate">[A] ${escapeHtml(u.name)}</span>
          <span class="text-[#939e91] shrink-0">${u.personnel}</span>
        </div>
      `).join('');

      const rowsB = bucket.B.map(u => `
        <div class="yaxis-tooltip-item">
          <span class="text-[#e69894] font-bold truncate">[B] ${escapeHtml(u.name)}</span>
          <span class="text-[#939e91] shrink-0">${u.personnel}</span>
        </div>
      `).join('');

      return `
        <div class="yaxis-marker ${edgeClass}" style="left: ${pct.toFixed(4)}%;" tabindex="0">
          ${totalCount > 1 ? `<span class="yaxis-count-dot">${totalCount}</span>` : ''}
          <div class="yaxis-tri ${triClass}"></div>
          <div class="yaxis-tooltip">
            <div class="yaxis-tooltip-head">${coordTitle}${hasA && hasB ? ' [CONTESTED]' : ''}</div>
            ${rowsA}
            ${rowsB}
          </div>
        </div>
      `;
    }).join('');

    const rearHtml = (rearA.length > 0 || rearB.length > 0) ? `
      <div class="yaxis-rear-strip">
        <div class="text-[#8ec0e8]">
          ${rearA.length > 0 ? `OFF-LINE REAR [A]: ${rearA.map(u => `${escapeHtml(u.name)} (${u.rallyRoundsLeft}rd)`).join(', ')}` : ''}
        </div>
        <div class="text-[#e69894] ml-auto text-right">
          ${rearB.length > 0 ? `OFF-LINE REAR [B]: ${rearB.map(u => `${escapeHtml(u.name)} (${u.rallyRoundsLeft}rd)`).join(', ')}` : ''}
        </div>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="yaxis-track-wrap">
        <div class="yaxis-line">
          ${ticksHtml.join('')}
          ${markersHtml}
        </div>
      </div>
      ${rearHtml}
    `;
  }

  // Combat Log Paper Sitrep Channel Registry
  const colorMap = {
    rolls: 'paper-sitrep-row paper-sitrep-rolls',
    damage: 'paper-sitrep-row paper-sitrep-damage',
    armor: 'paper-sitrep-row paper-sitrep-armor',
    support: 'paper-sitrep-row paper-sitrep-support',
    error: 'paper-sitrep-row paper-sitrep-error'
  };

  function renderCombatLog() {
    const state = ID.state;
    const container = document.getElementById('combat-log-container');
    if (!container || !state || !state.battle) return;

    const filterEl = document.getElementById('log-filter');
    const filterVal = filterEl ? filterEl.value : 'all';

    if (!state.battle.logs || state.battle.logs.length === 0) {
      uiState.renderedLogIds.clear();
      container.innerHTML = `<div class="text-[#5c645a] text-center py-12 font-mono text-[11px] uppercase">NO SITREP ENTRIES RECORDED // EXECUTE STEP RD OR AUTO-OPS TO BEGIN</div>`;
      return;
    }

    const logsToRender = state.battle.logs.slice(-150);
    const filtered = logsToRender.filter(item => filterVal === 'all' || item.category === filterVal);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="text-[#5c645a] text-center py-12 font-mono text-[11px] uppercase">NO ENTRIES MATCH SELECTED CHANNEL FILTER</div>`;
      return;
    }

    container.innerHTML = filtered.slice().reverse().map(item => {
      const isNew = !uiState.renderedLogIds.has(item.id);
      if (isNew) uiState.renderedLogIds.add(item.id);
      const iconHtml = ID.Icons ? ID.Icons.getForLog(item.category, item.text) : '';
      return `
      <div class="${isNew ? 'log-entry-new ' : ''}${colorMap[item.category] || colorMap.rolls} flex items-start gap-1.5">
        <span class="mil-log-icon shrink-0 mt-0.5">${iconHtml}</span>
        <div class="min-w-0 flex-1"><span class="text-[#4a5448] mr-1.5 font-bold">[RD-${String(item.round).padStart(2, '0')}]</span>${escapeHtml(stripEmojisForAAR(item.text))}</div>
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
            <td class="py-2 px-2 font-mono text-amber-300">Dig ${t.maxEntrench ?? 4} | Cap ${t.outnumberCap ?? 100}%</td>
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
          <div class="font-semibold text-white">${w.name} <span class="font-mono text-[10px] text-sky-400">(Air ${w.airMod || 0}%)</span></div>
          <div class="text-slate-400 text-[11px]">${w.desc}</div>
        </div>
      `).join('');
    }

    const todList = document.getElementById('timeofday-matrix-list');
    if (todList) {
      todList.innerHTML = Object.values(D.TIME_OF_DAY_TYPES || {}).map(td => `
        <div class="p-2 rounded bg-slate-950 border border-slate-800">
          <div class="font-semibold text-white">${td.name} <span class="font-mono text-[10px] text-emerald-400">(Air ${td.airMod || 0}%${td.visCap ? ' | Vis ' + td.visCap : ''})</span></div>
          <div class="text-slate-400 text-[11px]">${td.desc}</div>
        </div>
      `).join('');
    }

    const hazList = document.getElementById('hazards-matrix-list');
    if (hazList) {
      hazList.innerHTML = Object.values(D.COMPOUND_HAZARDS || {}).map(hz => `
        <div class="p-2 rounded bg-slate-950 border border-slate-800">
          <div class="font-semibold text-rose-300">${hz.name}</div>
          <div class="text-amber-400/90 font-mono text-[10px] mb-0.5">${hz.trigger}</div>
          <div class="text-slate-400 text-[11px]">${hz.desc}</div>
        </div>
      `).join('');
    }
  }

  // Authentic real-world combat doctrine & employment notes for all 25 tactics
  const TACTIC_DOCTRINE_NOTES = {
    atk_attack: {
      realWorld: 'A deliberate, coordinated advance using standard fire-and-maneuver drills. Rifle squads bound forward under covering fire from support weapons without overextending flanks or burning excessive ammunition.',
      recommended: 'Default opening doctrine when enemy strength, armor composition, or defensive posture is unconfirmed. Keeps return-fire exposure low while steadily testing the line.'
    },
    atk_assault: {
      realWorld: 'A concentrated close-quarters push directly into enemy trench lines or strongpoints. Assault elements abandon cover to close distance rapidly, trading personal protection for maximum shock at the point of contact.',
      recommended: 'Deploy when enemy cohesion is wavering or when you must crack a moderate defensive line quickly. Avoid using against fresh Counterattack or Ambush defenders.'
    },
    atk_encirclement: {
      realWorld: 'Double-envelopment maneuver (Kesselschlacht) designed to pin the enemy center while mobile wings sweep around exposed flanks to sever lines of retreat and trap formations in a pocket.',
      recommended: 'Most effective with multiple active formations outnumbering the defender. Pairs well with high-mobility Armor or Mechanized units to maximize post-battle POW captures.'
    },
    atk_shock: {
      realWorld: 'Sudden, high-intensity violence of action combining heavy direct fire, suppressive bursts, and aggressive forward pressure to shatter enemy morale and command cohesion before they can react.',
      recommended: 'Use against low-organization infantry, militia, or recently rallied units to force an immediate rout. Watch your own Org attrition over prolonged fights.'
    },
    atk_breakthrough: {
      realWorld: 'Concentrating armor, anti-tank guns, and assault engineers on a narrow sector (Schwerpunkt) to punch cleanly through fortified belts and create a gap for exploitation.',
      recommended: 'Ideal against Fortified Strongpoints, Heavy Tanks, or entrenched Frontliner screens. The +3 flat Piercing helps medium guns defeat heavy armor plate.'
    },
    atk_blitz: {
      realWorld: 'High-tempo armored maneuver warfare that prioritizes speed and operational disruption over methodical consolidation—striking faster than the defender can reorganize or restore command links.',
      recommended: 'Best employed by well-supplied Tank and Mechanized spearheads on open terrain (Plains/Desert/Roads) against disorganized defenders. Vulnerable to Delay tactics and supply drain.'
    },
    atk_mass_charge: {
      realWorld: 'Overwhelming human-wave or broad-front massed assault relying on sheer numerical superiority to saturate defender firing arcs and overrun positions through weight of numbers.',
      recommended: 'Only employ when holding at least a 1.5:1 (ideally 2:1) active personnel advantage. Never charge into intact Artillery, Machine Guns, or Explosive-heavy defenders.'
    },
    atk_infiltration: {
      realWorld: 'Hutier-style stormtrooper tactics: small, decentralized teams slip through gaps in the enemy frontline under cover of rough terrain to bypass strongpoints and strike vulnerable rear artillery and HQ elements.',
      recommended: 'Pair with Special Forces or Infiltration Specialists in Forest, Hills, Mountain, or Urban terrain to bypass Frontliner screens and neutralize enemy Artillery batteries.'
    },
    atk_well_planned: {
      realWorld: 'Set-piece offensive built on thorough reconnaissance, pre-registered fire plans, and rehearsed timing—maximizing combat power while maintaining disciplined defensive intervals against counter-fire.',
      recommended: 'Strongest from Round 2 onward once enemy doctrine patterns are revealed. Avoid selecting on Round 1 if Surprise / Unexpected Initiative is active.'
    },
    atk_relentless: {
      realWorld: 'Continuous echeloned pressure that refuses to grant a battered enemy any operational pause, rotating fresh fire elements forward to finish off collapsing formations.',
      recommended: 'Deploy as a finisher when enemy units drop to 30% Organization or below and your supply depot can absorb the extra +1 Supply/round burn.'
    },
    atk_unexpected_thrust: {
      realWorld: 'A sudden, unannounced lunge along an unguarded axis achieving tactical surprise and forcing enemy officers onto the back foot before they can orient reserves.',
      recommended: 'Use as a single-round opener or pivot tactic—never repeat it two rounds in a row, as the enemy adapts and turns the bonus into a -10% Atk/Def penalty.'
    },
    def_defend: {
      realWorld: 'Classical positional area defense: troops hold prepared trenches, interlocking fields of fire, and pre-sighted kill zones to bleed attackers while conserving manpower and ammunition.',
      recommended: 'Reliable all-purpose defensive posture, especially inside Fortified Strongpoints (+30% Def) when you want to hold ground and inflict steady return-fire losses.'
    },
    def_counterattack: {
      realWorld: 'Immediate local counter-thrust launched at the moment an enemy assault loses momentum, catching overextended attackers out of cover before they can consolidate captured ground.',
      recommended: 'Select against aggressive doctrines (Assault, Shock, Mass Charge) when your formations still have healthy firepower to punish the attacker during Return Fire.'
    },
    def_delay: {
      realWorld: 'Trading space for time through phased blocking positions, demolitions, and hit-and-run firefights designed to disrupt enemy tempo and blunt armored thrusts.',
      recommended: 'Use when outnumbered or facing Blitz / Relentless Assault—halves enemy Blitz attack bonuses, imposes -10% Atk next round on a hold, and boosts Retreat safety.'
    },
    def_tactical_withdrawal: {
      realWorld: 'Planned, screened retrograde movement to disengage from an untenable fight while minimizing casualties and preserving combat formations for future operations.',
      recommended: 'Use when facing overwhelming odds or critical supply starvation to cut incoming casualties by 20% and maximize surviving personnel during post-battle pursuit.'
    },
    def_ambush: {
      realWorld: 'Concealed fire-sack set along expected enemy approach routes, holding fire until the opposing column enters point-blank kill zones to maximize initial shock and vigilance dominance.',
      recommended: 'Deadly in Forest, Jungle, Mountain, or Urban sectors—especially paired with Recon or Concealment Specialists against Blitz, Infiltration, or Unexpected Thrust.'
    },
    def_backhand_blow: {
      realWorld: 'Mobile operational defense (modeled on Manstein’s 1943 Kharkov counter-stroke): absorb the initial enemy lunge defensively, then strike the exhausted spearhead with a devastating counter-blow.',
      recommended: 'Excellent with armored or heavy combined-arms reserves against high-commitment enemy pushes (Assault, Breakthrough, Shock) that expose their own flanks.'
    },
    def_guerrilla: {
      realWorld: 'Asymmetric irregular warfare leveraging difficult terrain, stealth, and raids against enemy logistics trains to bleed conventional forces without offering a decisive pitched battle.',
      recommended: 'Use in Forest, Jungle, Mountain, or Urban sectors against supply-hungry Tank or Artillery columns; steals enemy supply on hit and punishes forces below 50% supply.'
    },
    urb_atk_street_fighting: {
      realWorld: 'Systematic block-by-block urban infantry combat using grenades, submachine guns, and short-range anti-tank launchers to clear rooms, cellars, and barricaded intersections.',
      recommended: 'Premier Urban offensive doctrine for infantry-heavy divisions and Anti-Tank squads. Keep Tanks out of the lead role due to the -15% armor penalty in tight streets.'
    },
    urb_atk_barrage: {
      realWorld: 'Methodical preparatory bombardment rolling one city block ahead of assaulting troops, collapsing fortified walls and suppressing defenders before infantry storm the rubble.',
      recommended: 'Use every 2 rounds against heavily entrenched urban strongpoints (Fortified Defense / Defend City) when you have >=50% supply to spare for the 2+d3 supply cost.'
    },
    urb_atk_armour_supported: {
      realWorld: 'Combined-arms urban doctrine pairing direct-fire tank cannons with close infantry escorts: tanks blast fortified firing ports while infantry screen rooftops and alleyways against AT teams.',
      recommended: 'Deploy in Urban terrain whenever you field both active Infantry and operational Tanks/AFVs together. Avoid if your armor has been knocked out or supply is tight.'
    },
    urb_atk_mouse_holing: {
      realWorld: 'Pioneered at Ortona and Stalingrad: assault engineers blast interior breach holes through adjoining building walls to move between structures completely hidden from street-level kill zones.',
      recommended: 'Pair with Infiltration Specialists in Urban terrain to achieve a 35% frontline bypass chance, letting infantry flank directly into enemy support and artillery units.'
    },
    urb_def_city: {
      realWorld: 'Elastic urban area defense turning multi-story masonry buildings, rubble piles, and barricaded avenues into mutually supporting strongpoints that funnel attackers into crossfire.',
      recommended: 'Go-to defensive doctrine for Infantry garrisons holding Urban sectors against general assaults. Note the -10% Retreat penalty if the line collapses.'
    },
    urb_def_fortified: {
      realWorld: 'Hold-at-all-costs fortress defense utilizing reinforced concrete bunkers, steel shutters, sandbagged cellars, and underground shelters to absorb heavy bombardment and protect cohesion.',
      recommended: 'Pair with Fortification Engineers against frontal Assault, Breakthrough, or Street Fighting pushes. Reduces incoming Org shock sharply, though retreat is difficult (-15).'
    },
    urb_def_ambush: {
      realWorld: 'Hidden sniper nests, cellar MG bunkers, and booby-trapped kill zones sprung from upper windows and rubble at point-blank range against advancing urban columns.',
      recommended: 'Devastating in Urban sectors with Concealment Specialists against Armour-Supported Urban Assault or Street Fighting—can inflict bonus casualties and blind enemy recon next round.'
    }
  };

  function getTacticModifierChips(t) {
    const chips = [];
    const add = (label, val, unit = '') => {
      if (!val) return;
      const cls = val > 0 ? 'tactics-mod-pos' : 'tactics-mod-neg';
      chips.push(`<span class="tactics-mod-chip ${cls}">${val > 0 ? '+' : ''}${val}${unit} ${label}</span>`);
    };
    add('ATK', t.atkPct, '%');
    add('DEF', t.defPct, '%');
    if (t.returnFireAtkPct) add('RET-FIRE ATK', t.returnFireAtkPct, '%');
    if (t.returnFireDefPct) add('RET-FIRE DEF', t.returnFireDefPct, '%');
    if (t.breakthroughPct) add('BREAKTHROUGH', t.breakthroughPct, '%');
    add('VIG', t.vigMod);
    add('FLAT ATK', t.flatAtk);
    add('FLAT DEF', t.flatDef);
    add('PIERCE', t.flatPierce);
    if (t.pursueBonus) add('PURSUIT', t.pursueBonus);
    if (t.retreatBonus) add('RETREAT', t.retreatBonus);
    if (t.casualtyReductionPct) chips.push(`<span class="tactics-mod-chip tactics-mod-pos">-${t.casualtyReductionPct}% CASUALTIES</span>`);
    if (t.orgDmgPct) chips.push(`<span class="tactics-mod-chip tactics-mod-pos">+${t.orgDmgPct}% ORG DMG</span>`);
    if (t.orgDmgResistPct) chips.push(`<span class="tactics-mod-chip tactics-mod-pos">-${t.orgDmgResistPct}% ORG TAKEN</span>`);
    if (t.hitOrgHeal) chips.push(`<span class="tactics-mod-chip tactics-mod-pos">+${t.hitOrgHeal} ORG ON HIT</span>`);
    if (t.bypassChance) chips.push(`<span class="tactics-mod-chip tactics-mod-pos">${t.bypassChance}% BYPASS</span>`);
    if (t.supplyAdd) chips.push(`<span class="tactics-mod-chip tactics-mod-neg">+${t.supplyAdd} SUP/RD</span>`);
    if (t.selfEndOrgDmg) chips.push(`<span class="tactics-mod-chip tactics-mod-neg">-${t.selfEndOrgDmg} SELF ORG</span>`);
    if (t.cooldown) chips.push(`<span class="tactics-mod-chip">${t.cooldown}-RD COOLDOWN</span>`);
    if (chips.length === 0) chips.push('<span class="tactics-mod-chip">STANDARD DOCTRINE</span>');
    return chips.join('');
  }

  function goToTacticsPage(pageNum) {
    const total = (D.TACTICS_DB || []).length;
    uiState.tacticsPage = H.clamp(Number(pageNum) || 0, 0, total);
    renderTacticsGuide();
  }

  function flipTacticsPage(delta) {
    goToTacticsPage((uiState.tacticsPage || 0) + delta);
  }

  function toggleTacticsTheme() {
    uiState.tacticsDarkMode = !uiState.tacticsDarkMode;
    renderTacticsGuide();
  }

  function printCurrentTacticsPage() {
    const container = document.getElementById('tactics-reference-grid');
    if (!container) return;
    const isDark = !!uiState.tacticsDarkMode;
    const printWin = window.open('', '_blank', 'width=900,height=1050');
    if (!printWin) {
      H.showToast('Pop-up blocked — falling back to browser print dialog.', 'warn');
      window.print();
      return;
    }

    const bg = isDark ? '#141815' : '#ffffff';
    const fg = isDark ? '#e7ece4' : '#141815';
    const boxBg = isDark ? '#1a201b' : '#f8f6ef';
    const bdr = isDark ? '#3c473e' : '#333333';

    printWin.document.open();
    printWin.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FM 100-5-TAC // Tactics Manual Page ${String(uiState.tacticsPage || 0).padStart(2, '0')}</title>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans+Condensed:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 14mm; }
    body { margin: 0; padding: 14px; background: ${bg}; color: ${fg}; font-family: 'IBM Plex Sans Condensed', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .tactics-book { border: 2px solid ${bdr}; padding: 0; background: ${bg}; color: ${fg}; }
    .tactics-book-bar { background: #252e24; color: #f4f1e6; padding: 8px 16px; font-family: 'IBM Plex Mono', monospace; font-size: 10pt; display: flex; justify-content: space-between; }
    .tactics-book-body { padding: 18px 20px; }
    .tactics-sec-block { border: 1px solid ${bdr}; background: ${boxBg}; padding: 10px 12px; margin-bottom: 10px; }
    .tactics-sec-head { font-family: 'Chakra Petch', sans-serif; text-transform: uppercase; border-bottom: 1.5px solid ${bdr}; padding-bottom: 3px; margin: 0 0 6px 0; font-size: 11pt; }
    .tactics-mod-strip { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border: 1px solid ${bdr}; background: ${boxBg}; font-family: 'IBM Plex Mono', monospace; font-size: 9pt; margin-bottom: 10px; }
    .tactics-mod-chip { padding: 2px 6px; border: 1px solid ${bdr}; font-weight: bold; }
    .tactics-book-footer, button { display: none !important; }
    .tactics-toc-row { display: flex; justify-content: space-between; border-bottom: 1px dotted ${bdr}; padding: 4px 0; font-family: 'IBM Plex Mono', monospace; font-size: 9.5pt; }
    .tactics-toc-group-title { font-family: 'Chakra Petch', sans-serif; font-weight: bold; background: #252e24; color: #f4f1e6; padding: 4px 8px; margin-top: 10px; }
  </style>
</head>
<body>${container.innerHTML}</body>
</html>`);
    printWin.document.close();
    setTimeout(() => { printWin.focus(); printWin.print(); }, 200);
  }

  function renderTacticsGuide() {
    const container = document.getElementById('tactics-reference-grid');
    if (!container) return;

    const list = D.TACTICS_DB || [];
    const totalPages = list.length;
    const page = H.clamp(uiState.tacticsPage || 0, 0, totalPages);
    uiState.tacticsPage = page;
    const darkCls = uiState.tacticsDarkMode ? 'tactics-book-dark' : '';
    const themeToggleHtml = `
      <div class="flex items-center gap-1.5">
        <button type="button" onclick="toggleTacticsTheme()" class="tactics-bar-btn">${uiState.tacticsDarkMode ? 'MODE: DARK' : 'MODE: PAPER'}</button>
        <button type="button" onclick="printCurrentTacticsPage()" class="tactics-bar-btn">PRINT PAGE</button>
      </div>
    `;

    // PAGE 0: CLICKABLE TABLE OF CONTENTS
    if (page === 0) {
      const stdAtk = list.map((t, idx) => ({ t, pg: idx + 1 })).filter(x => x.t.role === 'attack' && !x.t.urbanOnly);
      const stdDef = list.map((t, idx) => ({ t, pg: idx + 1 })).filter(x => x.t.role === 'defense' && !x.t.urbanOnly);
      const urban = list.map((t, idx) => ({ t, pg: idx + 1 })).filter(x => x.t.urbanOnly);

      const renderGroup = (title, items) => `
        <div class="space-y-1">
          <div class="tactics-toc-group-title">
            <span>${title}</span>
            <span>${items.length} DOCTRINES</span>
          </div>
          <div class="space-y-1">
            ${items.map(({ t, pg }) => `
              <button type="button" onclick="goToTacticsPage(${pg})" class="tactics-toc-row">
                <span class="font-bold">${escapeHtml(t.name)}</span>
                <span class="tactics-toc-dots"></span>
                <span class="tactics-toc-meta">${escapeHtml(t.personality)} // PG ${String(pg).padStart(2, '0')}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

      container.innerHTML = `
        <article class="tactics-book ${darkCls}" aria-label="Tactical Doctrine Field Manual — Table of Contents">
          <div class="tactics-book-bar items-center">
            <span>FM 100-5-TAC // TACTICAL DOCTRINE COMPENDIUM</span>
            <div class="flex items-center gap-3">
              <span>INDEX // PAGE 00 OF ${String(totalPages).padStart(2, '0')}</span>
              ${themeToggleHtml}
            </div>
          </div>

          <div class="tactics-book-body space-y-5">
            <div class="border-b-2 border-[#2f3b2e] pb-3">
              <div class="font-mono text-[10.5px] font-bold uppercase tracking-widest text-[#4a5448]">
                HEADQUARTERS, COMBINED-ARMS SIMULATION COMMAND — DOCTRINE MANUAL
              </div>
              <h2 class="text-2xl font-black uppercase text-[#141815] mt-1">
                Table of Contents (${totalPages} Combat Tactics)
              </h2>
              <p class="text-xs sm:text-sm text-[#323a33] mt-1">
                Select any tactical doctrine below to flip directly to its operational page, or use the page-turn controls at the bottom (Left/Right arrow keys supported).
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="space-y-4">
                ${renderGroup('PART I // OFFENSIVE DOCTRINES', stdAtk)}
              </div>
              <div class="space-y-4">
                ${renderGroup('PART II // DEFENSIVE DOCTRINES', stdDef)}
                ${renderGroup('PART III // URBAN OPERATIONS (URBAN / FORT)', urban)}
              </div>
            </div>
          </div>

          <div class="tactics-book-footer">
            <button type="button" disabled class="tactics-nav-btn">◄ PREV PAGE</button>
            <div class="text-xs font-bold uppercase text-[#262f25]">TABLE OF CONTENTS (PG 00 / ${String(totalPages).padStart(2, '0')})</div>
            <button type="button" onclick="flipTacticsPage(1)" class="tactics-nav-btn">FIRST TACTIC ►</button>
          </div>
        </article>
      `;
      return;
    }

    // PAGES 1..25: SINGLE TACTIC DOCTRINE SHEET
    const t = list[page - 1];
    const notes = TACTIC_DOCTRINE_NOTES[t.id] || {
      realWorld: 'Standard combined-arms tactical maneuver executed by frontline formations to gain local combat advantage.',
      recommended: t.bestAgainst || 'General tactical engagements.'
    };
    const roleLabel = t.role === 'attack' ? 'OFFENSIVE DOCTRINE' : 'DEFENSIVE DOCTRINE';
    const scopeLabel = t.urbanOnly ? 'URBAN / FORTIFICATIONS ONLY' : 'ALL THEATRE TERRAINS';

    container.innerHTML = `
      <article class="tactics-book ${darkCls}" aria-label="Tactical Doctrine Page ${page}: ${escapeHtml(t.name)}">
        <div class="tactics-book-bar items-center">
          <span>FM 100-5-TAC // ${roleLabel}</span>
          <div class="flex items-center gap-3">
            <span>PAGE ${String(page).padStart(2, '0')} OF ${String(totalPages).padStart(2, '0')}</span>
            ${themeToggleHtml}
          </div>
        </div>

        <div class="tactics-book-body space-y-4">
          <!-- Tactic Sheet Title Block -->
          <div class="border-b-2 border-[#2f3b2e] pb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="font-mono text-[10px] font-bold uppercase tracking-widest text-[#4a5448]">
                DOCTRINE SHEET #${String(page).padStart(2, '0')} // ${scopeLabel}
              </div>
              <h2 class="text-2xl sm:text-3xl font-black uppercase text-[#141815] mt-0.5">
                ${escapeHtml(t.name)}
              </h2>
            </div>
            <div class="font-mono text-[11px] bg-[#faf8f2] border border-[#b5ad98] px-3 py-2 space-y-0.5 text-right">
              <div><strong>ROLE:</strong> <span class="${t.role === 'attack' ? 'text-[#8b2e2a]' : 'text-[#1d486e]'} font-bold uppercase">${escapeHtml(t.role)}</span></div>
              <div><strong>PERSONALITY:</strong> <span class="font-bold uppercase">${escapeHtml(t.personality)}</span></div>
              <div><strong>TERRAIN:</strong> <span class="font-bold">${t.urbanOnly ? 'URBAN / FORT' : 'ALL'}</span></div>
            </div>
          </div>

          <!-- Key Simulation Modifier Chips -->
          <div>
            <div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4a5448] mb-1.5">
              COMBAT TELEMETRY MODIFIERS
            </div>
            <div class="tactics-mod-strip">
              ${getTacticModifierChips(t)}
            </div>
          </div>

          <!-- Section 1: Real-World Combat Explanation -->
          <div class="tactics-sec-block">
            <h3 class="tactics-sec-head">1. General Combat Explanation (Real-World Doctrine)</h3>
            <p class="text-sm text-[#1f2620] leading-relaxed">${escapeHtml(notes.realWorld)}</p>
          </div>

          <!-- Section 2: Battlefield Simulation Effects -->
          <div class="tactics-sec-block">
            <h3 class="tactics-sec-head">2. Battlefield Simulation Effects (Engine Rules)</h3>
            <p class="text-sm font-mono text-[#181c19] leading-relaxed">${escapeHtml(t.summary)}</p>
          </div>

          <!-- Section 3: Recommended Tactical Employment -->
          <div class="tactics-sec-block" style="border-left: 4px solid #2f3b2e;">
            <h3 class="tactics-sec-head">3. Recommended Use &amp; Optimal Targets</h3>
            <p class="text-sm text-[#1f2620] leading-relaxed mb-2">${escapeHtml(notes.recommended)}</p>
            <div class="font-mono text-xs bg-[#ebe5d5] border border-[#bfb7a2] px-3 py-2 text-[#1f2b1e]">
              <strong>BEST EMPLOYED AGAINST:</strong> ${escapeHtml(t.bestAgainst)}
            </div>
          </div>
        </div>

        <!-- Book Page-Flip Navigation Footer -->
        <div class="tactics-book-footer">
          <button type="button" onclick="flipTacticsPage(-1)" class="tactics-nav-btn">
            ◄ ${page === 1 ? 'INDEX' : `PREV (PG ${String(page - 1).padStart(2, '0')})`}
          </button>

          <div class="flex items-center gap-2">
            <button type="button" onclick="goToTacticsPage(0)" class="tactics-nav-btn tactics-nav-btn-secondary">
              TABLE OF CONTENTS
            </button>
            <span class="text-xs font-bold text-[#262f25]">PG ${String(page).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}</span>
          </div>

          <button type="button" onclick="flipTacticsPage(1)" ${page >= totalPages ? 'disabled' : ''} class="tactics-nav-btn">
            ${page >= totalPages ? 'END OF MANUAL' : `NEXT (PG ${String(page + 1).padStart(2, '0')}) ►`}
          </button>
        </div>
      </article>
    `;
  }

  // Keyboard Left/Right page flipping when Doctrines tab is active
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('keydown', (e) => {
      if (uiState.activeTab !== 'tactics') return;
      const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') flipTacticsPage(1);
      else if (e.key === 'ArrowLeft') flipTacticsPage(-1);
    });
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

  function stripEmojisForAAR(str) {
    return String(str ?? '')
      .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '')
      .replace(/➔/g, '->')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function summarizeSideMetrics(units = []) {
    return units.reduce((acc, u) => {
      acc.unitCount += 1;
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
      if (!u.isMonster && !u.isZombie) {
        acc.supplyMax += (u.maxSupply || 0);
        acc.supplyRem += Math.max(0, u.supply || 0);
      }
      if (u.defeated) acc.defeatedCount += 1;
      return acc;
    }, {
      unitCount: 0, start: 0, rem: 0, dead: 0, wounded: 0, captured: 0, escaped: 0,
      armorStart: 0, armorRem: 0, armorRec: 0, armorTowed: 0, armorUnrec: 0,
      supplyMax: 0, supplyRem: 0, defeatedCount: 0
    });
  }

  function classifyVictoryDegree(rep, sumA, sumB, isOver) {
    if (!isOver) {
      return {
        label: 'ENGAGEMENT IN PROGRESS',
        shortLabel: 'IN PROGRESS',
        badgeClass: 'text-[#8ec0e8] border-[#355a7a] bg-[#162533]',
        oddsRatio: null,
        costPct: null,
        summary: 'Operation is currently active; victory classification will be assigned upon conclusion.'
      };
    }

    if (!rep.winner || rep.winner === 'Draw') {
      return {
        label: 'MUTUAL EXHAUSTION (DRAW)',
        shortLabel: 'DRAW',
        badgeClass: 'text-[#c8a24b] border-[#7d6731] bg-[#262011]',
        oddsRatio: 1.0,
        costPct: 100,
        summary: 'Neither side retained operational formations to secure the objective.'
      };
    }

    const win = rep.winner === 'A' ? sumA : sumB;
    const lose = rep.winner === 'A' ? sumB : sumA;

    // Combined initial combat power (15 manpower-equivalents per armored vehicle)
    const winPower = win.start + (win.armorStart * 15);
    const losePower = lose.start + (lose.armorStart * 15);
    const oddsRatio = winPower / Math.max(1, losePower);

    const persLossRatio = (win.dead + win.wounded + win.captured) / Math.max(1, win.start);
    const armorLossRatio = win.armorStart > 0
      ? (win.armorUnrec + win.armorRec) / Math.max(1, win.armorStart)
      : persLossRatio;
    const supplyExpRatio = win.supplyMax > 0
      ? (win.supplyMax - win.supplyRem) / Math.max(1, win.supplyMax)
      : 0;
    const unitLossRatio = win.unitCount > 0 ? (win.defeatedCount / win.unitCount) : 0;

    // Composite Cost % = 60% Manpower Loss + 25% Armor Loss + 15% Supply Expenditure
    const costPct = Math.round(((0.60 * persLossRatio) + (0.25 * armorLossRatio) + (0.15 * supplyExpRatio)) * 100);
    const oddsText = `${oddsRatio.toFixed(2)}:1`;

    // 1. Heroic Victory: Unfavorable odds with relatively light losses
    if ((oddsRatio <= 0.80 && costPct <= 35) || (oddsRatio <= 0.65 && costPct <= 45)) {
      return {
        label: 'HEROIC VICTORY',
        shortLabel: 'HEROIC VICTORY',
        badgeClass: 'text-[#e6c46d] border-[#c8a24b] bg-[#2b2310]',
        oddsRatio,
        costPct,
        summary: `Overcame unfavorable initial odds (${oddsText}) while containing composite force attrition to ${costPct}%.`
      };
    }

    // 2. Pyrrhic Victory: Very high casualties, heavy resource drain, or >=50% formations lost
    if (costPct >= 55 || persLossRatio >= 0.60 || unitLossRatio >= 0.50) {
      return {
        label: 'PYRRHIC VICTORY',
        shortLabel: 'PYRRHIC VICTORY',
        badgeClass: 'text-[#e69894] border-[#c2524c] bg-[#2e1615]',
        oddsRatio,
        costPct,
        summary: `Objective secured at severe operational cost (${costPct}% composite attrition; ${win.defeatedCount}/${win.unitCount} formations knocked out).`
      };
    }

    // 3. Decisive Victory: Clean win with low casualties and zero formations lost
    if (costPct <= 25 && persLossRatio <= 0.25 && win.defeatedCount === 0) {
      return {
        label: 'DECISIVE VICTORY',
        shortLabel: 'DECISIVE VICTORY',
        badgeClass: 'text-[#89b884] border-[#5e8f59] bg-[#162615]',
        oddsRatio,
        costPct,
        summary: `Clean tactical victory achieved at low cost (${costPct}% composite attrition, 0 formations lost; odds ${oddsText}).`
      };
    }

    // 4. Close Victory: Contested engagement with noticeable losses or resource expenditure
    return {
      label: 'CLOSE VICTORY',
      shortLabel: 'CLOSE VICTORY',
      badgeClass: 'text-[#c8a24b] border-[#7d6731] bg-[#262011]',
      oddsRatio,
      costPct,
      summary: `Hard-fought contested victory with noticeable force expenditure (${costPct}% composite attrition; odds ${oddsText}).`
    };
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

  function buildAARAssessment(rep, sumA, sumB, isOver, victoryInfo) {
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
      const sideAName = rep.sideAName || H.getSideName('A');
      const sideBName = rep.sideBName || H.getSideName('B');
      const winLabel = rep.winner === 'A' ? sideAName : sideBName;
      const loseLabel = rep.winner === 'A' ? sideBName : sideAName;
      const deg = victoryInfo ? victoryInfo.label : 'VICTORY';
      notes.push(`Classification: ${deg} — ${winLabel} secured the ${rep.terrain} (${rep.feature}) sector in Round ${rep.rounds} after neutralizing ${loseLabel}'s frontline cohesion.`);
      if (victoryInfo && victoryInfo.summary) {
        notes.push(victoryInfo.summary);
      }
    }

    const labelA = rep.sideAName || H.getSideName('A');
    const labelB = rep.sideBName || H.getSideName('B');
    notes.push(`Personnel attrition stands at ${pctA}% for ${labelA} (${lossA.toLocaleString()} total losses) versus ${pctB}% for ${labelB} (${lossB.toLocaleString()} total losses).`);

    const totalArmorKoA = sumA.armorUnrec + sumA.armorRec;
    const totalArmorKoB = sumB.armorUnrec + sumB.armorRec;
    if (sumA.armorStart > 0 || sumB.armorStart > 0) {
      notes.push(`Armored vehicle losses: ${labelA} ${totalArmorKoA} knocked out (${sumA.armorUnrec} total write-offs), ${labelB} ${totalArmorKoB} knocked out (${sumB.armorUnrec} total write-offs).`);
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
      sideAName: H.getSideName('A'),
      sideBName: H.getSideName('B'),
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
    const victoryInfo = classifyVictoryDegree(rep, sumA, sumB, isOver);
    const chronology = extractAARChronology(state.battle.logs);
    const assessments = buildAARAssessment(rep, sumA, sumB, isOver, victoryInfo);
    const salvage = isOver ? (rep.salvage || state.battle.salvageReport) : null;

    if (isOver) {
      titleEl.textContent = rep.winner === 'Draw'
        ? `MUTUAL EXHAUSTION — DRAW (RD-${String(rep.rounds).padStart(2, '0')})`
        : `${victoryInfo.label} — ${(rep.winner === 'A' ? (rep.sideAName || H.getSideName('A')) : (rep.sideBName || H.getSideName('B'))).toUpperCase()} (RD-${String(rep.rounds).padStart(2, '0')})`;
    } else {
      titleEl.textContent = `LIVE OPERATIONAL SITREP — RD-${String(rep.rounds).padStart(2, '0')} (IN PROGRESS)`;
    }

    function renderSideReportTable(sideLabel, commanderName, units = [], sum, accentColor) {
      return `
        <div class="tradoc-aar-section space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#b5ad98] pb-1.5">
            <div>
              <h4 class="font-extrabold font-mono text-xs uppercase tracking-wider" style="color: ${accentColor};">${sideLabel}</h4>
              <div class="text-[10px] font-mono text-[#4a5448]">COMMANDING OFFICER: ${escapeHtml(stripEmojisForAAR(commanderName))}</div>
            </div>
            <div class="text-[10.5px] font-mono text-[#1c211d]">
              EFF: <b>${sum.rem.toLocaleString()}</b>/${sum.start.toLocaleString()} |
              KIA: <b class="text-[#8b2e2a]">${sum.dead.toLocaleString()}</b> |
              WIA: <b class="text-[#7c5b1e]">${sum.wounded.toLocaleString()}</b> |
              POW: <b class="text-[#563d7c]">${sum.captured.toLocaleString()}</b> |
              ESC: <b class="text-[#2f5e2c]">${sum.escaped.toLocaleString()}</b>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="tradoc-aar-table">
              <thead>
                <tr>
                  <th>Formation</th>
                  <th>Status</th>
                  <th class="text-right">Strength</th>
                  <th class="text-right">Org</th>
                  <th class="text-right">KIA / WIA</th>
                  <th class="text-right">POW / ESC</th>
                  <th class="text-right">AFV (Act/Rec/Tow/KO)</th>
                </tr>
              </thead>
              <tbody>
                ${units.map(u => `
                  <tr>
                    <td class="font-bold">${escapeHtml(stripEmojisForAAR(u.name))}</td>
                    <td class="uppercase text-[10px] font-bold ${u.defeated ? 'text-[#8b2e2a]' : (u.isRallying ? 'text-[#7c5b1e]' : 'text-[#2f5e2c]')}">${u.defeated ? 'OUT OF ACTION' : (u.isRallying ? 'REAR RALLY' : 'OPERATIONAL')}</td>
                    <td class="text-right">${u.personnel}/${u.maxPersonnel}</td>
                    <td class="text-right">${(u.isMonster || u.isZombie) ? 'N/A' : `${u.org}/${u.maxOrg}`}</td>
                    <td class="text-right"><span class="text-[#8b2e2a] font-bold">${u.dead}</span> / <span class="text-[#7c5b1e]">${u.wounded}</span></td>
                    <td class="text-right"><span class="text-[#563d7c]">${u.captured || 0}</span> / <span class="text-[#2f5e2c]">${u.escaped || 0}</span></td>
                    <td class="text-right">${(u.originalMaxArmor > 0 || u.maxArmor > 0) ? `${u.armor}/${u.recoverableArmor}/${u.towedArmor || 0}/${u.unrecoverableArmor}` : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td class="uppercase" colspan="2">TOTALS (${units.length - sum.defeatedCount}/${units.length} ACTIVE)</td>
                  <td class="text-right">${sum.rem}/${sum.start}</td>
                  <td class="text-right">—</td>
                  <td class="text-right">${sum.dead} / ${sum.wounded}</td>
                  <td class="text-right">${sum.captured} / ${sum.escaped}</td>
                  <td class="text-right">${sum.armorStart > 0 ? `${sum.armorRem}/${sum.armorRec}/${sum.armorTowed}/${sum.armorUnrec}` : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    }

    bodyEl.innerHTML = `
      <!-- Official Military Paper AAR Header Block -->
      <div class="tradoc-aar-section font-mono text-[11px] space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#b5ad98] pb-1.5 text-[10px] text-[#3a4439] uppercase tracking-widest font-bold">
          <span>UNCLASSIFIED // SIMULATION OPS</span>
          <span>DOC-REF: ${escapeHtml(rep.docId || 'AAR-ID-001')} | DTG: ${dtg}</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div class="tradoc-aar-kpi">
            <span class="text-[#4a5448] block text-[9px] font-bold uppercase">1. OUTCOME / DEGREE</span>
            <span class="font-extrabold text-xs uppercase text-[#141815]">${isOver ? (rep.winner === 'Draw' ? 'DRAW' : `SIDE ${rep.winner} — ${victoryInfo.shortLabel}`) : 'IN PROGRESS'}</span>
          </div>
          <div class="tradoc-aar-kpi">
            <span class="text-[#4a5448] block text-[9px] font-bold uppercase">2. DURATION / RATIO</span>
            <span class="font-extrabold text-[#141815] text-xs">RD-${String(rep.rounds).padStart(2, '0')} | EXCH ${exchangeRatio}</span>
          </div>
          <div class="tradoc-aar-kpi">
            <span class="text-[#4a5448] block text-[9px] font-bold uppercase">3. SECTOR / FEATURE</span>
            <span class="font-extrabold text-[#1d3f5c] text-xs uppercase">${escapeHtml(rep.terrain)} (${escapeHtml(rep.feature)})</span>
          </div>
          <div class="tradoc-aar-kpi">
            <span class="text-[#4a5448] block text-[9px] font-bold uppercase">4. METEO / POSTURE</span>
            <span class="font-extrabold text-[#2f5e2c] text-xs uppercase">${escapeHtml(rep.weather)} | SIDE ${rep.theatreAttackerSide || 'A'} ATK</span>
          </div>
        </div>
      </div>

      <!-- Section 2: ORBAT & Casualty Ledgers -->
      ${renderSideReportTable(`SECTION 2A // ${escapeHtml((rep.sideAName || H.getSideName('A')).toUpperCase())}`, rep.commanderA || 'Autonomous Staff', rep.sideA, sumA, '#1d486e')}
      ${renderSideReportTable(`SECTION 2B // ${escapeHtml((rep.sideBName || H.getSideName('B')).toUpperCase())}`, rep.commanderB || 'Autonomous Staff', rep.sideB, sumB, '#8b2e2a')}

      <!-- Section 3: Battlefield Salvage & Captured Equipment -->
      ${isOver && salvage && salvage.abandoned > 0 ? `
        <div class="tradoc-aar-salvage text-xs font-mono space-y-1.5">
          <span class="font-extrabold text-[#5e4411] uppercase tracking-wider block">SECTION 3 // BATTLEFIELD SALVAGE &amp; CAPTURED MATERIAL</span>
          <div>${escapeHtml(rep.winner === 'B' ? (rep.sideBName || H.getSideName('B')) : (rep.sideAName || H.getSideName('A')))} field recovery units secured <b>${salvage.abandoned}</b> abandoned enemy combat hulls:</div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
            <div class="p-2 bg-[#faf8f2] border border-[#bfb7a2]">IMPRESSED (BEUTEPANZER): <b class="text-[#2f5e2c]">${salvage.impressed}</b></div>
            <div class="p-2 bg-[#faf8f2] border border-[#bfb7a2]">STRIPPED FOR DEPOT: <b class="text-[#1d486e]">+${salvage.supplyScrapped} SUP</b></div>
            <div class="p-2 bg-[#faf8f2] border border-[#bfb7a2]">SCUTTLED / WRITE-OFF: <b class="text-[#8b2e2a]">${salvage.scuttled}</b></div>
          </div>
        </div>
      ` : ''}

      <!-- Section 4: Key Engagement Chronology -->
      ${chronology.length > 0 ? `
        <div class="tradoc-aar-section font-mono">
          <span class="tradoc-aar-sec-title">SECTION 4 // SIGNIFICANT ENGAGEMENT CHRONOLOGY</span>
          <div class="max-h-36 overflow-y-auto custom-scroll space-y-1 text-[10.5px] text-[#232924]">
            ${chronology.map(l => `<div class="border-l-2 border-[#2f3b2e] pl-2"><span class="text-[#4a5448] font-bold">[RD-${String(l.round).padStart(2, '0')}]</span> ${escapeHtml(stripEmojisForAAR(l.text))}</div>`).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Section 5: Staff Assessment -->
      <div class="tradoc-aar-section font-mono">
        <span class="tradoc-aar-sec-title">SECTION 5 // G-3 OPERATIONAL ASSESSMENT</span>
        <ul class="list-disc list-inside space-y-1 text-[11px] text-[#232924]">
          ${assessments.map(n => `<li>${escapeHtml(stripEmojisForAAR(n))}</li>`).join('')}
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
    const victoryInfo = classifyVictoryDegree(rep, sumA, sumB, isOver);
    const chronology = extractAARChronology(state?.battle?.logs || []);
    const assessments = buildAARAssessment(rep, sumA, sumB, isOver, victoryInfo);
    const salvage = isOver ? (rep.salvage || state?.battle?.salvageReport) : null;
    const docTitle = `Iron_Division_AAR_${rep.docId || 'REPORT'}_${rep.terrain}`;

    const renderForceTable = (heading, cmdName, units, sum) => `
      <h3>${escapeHtml(heading)}</h3>
      <div class="meta-sub">COMMANDING OFFICER: <strong>${escapeHtml(stripEmojisForAAR(cmdName))}</strong> &nbsp;|&nbsp; FORMATIONS ACTIVE: <strong>${units.length - sum.defeatedCount}/${units.length}</strong></div>
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
              <td><strong>${escapeHtml(stripEmojisForAAR(u.name))}</strong></td>
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
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'IBM Plex Mono', 'Courier New', Courier, monospace;
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
      font-family: 'Chakra Petch', 'IBM Plex Mono', sans-serif;
      font-size: 15pt;
      font-weight: 700;
      letter-spacing: 0.08em;
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
      <span class="kpi-val">${isOver ? (rep.winner === 'Draw' ? 'MUTUAL EXHAUSTION' : `SIDE ${rep.winner} — ${victoryInfo.shortLabel}`) : 'IN PROGRESS'}</span>
    </div>
    <div class="kpi-cell">
      <span class="kpi-label">Rounds / Odds</span>
      <span class="kpi-val">RD-${String(rep.rounds).padStart(2, '0')}${victoryInfo.oddsRatio !== null ? ` (${victoryInfo.oddsRatio.toFixed(2)}:1)` : ''}</span>
    </div>
    <div class="kpi-cell">
      <span class="kpi-label">Winner Cost / Posture</span>
      <span class="kpi-val">${victoryInfo.costPct !== null ? `${victoryInfo.costPct}% COST` : 'ACTIVE'} | SIDE ${rep.theatreAttackerSide || 'A'} ATK</span>
    </div>
    <div class="kpi-cell">
      <span class="kpi-label">Loss Ratio (A : B)</span>
      <span class="kpi-val">${exchangeRatio}</span>
    </div>
  </div>

  <h2>2. Order of Battle &amp; Casualty Ledger</h2>
  ${renderForceTable(`2A. ${(rep.sideAName || H.getSideName('A')).toUpperCase()}`, rep.commanderA || 'Autonomous Staff', rep.sideA, sumA)}
  ${renderForceTable(`2B. ${(rep.sideBName || H.getSideName('B')).toUpperCase()}`, rep.commanderB || 'Autonomous Staff', rep.sideB, sumB)}

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
      ? chronology.map(l => `<div class="chron-item"><strong>[RD-${String(l.round).padStart(2, '0')}]</strong> ${escapeHtml(stripEmojisForAAR(l.text))}</div>`).join('')
      : '<div>No major milestone events recorded in sitrep log.</div>'}
  </div>

  <h2>5. G-3 Operational Assessment &amp; Authentication</h2>
  <div class="box">
    <ul>
      ${assessments.map(n => `<li>${escapeHtml(stripEmojisForAAR(n))}</li>`).join('')}
    </ul>
    <div class="sig-grid">
      <div class="sig-block">
        <strong>PREPARING OFFICER (G-3 OPS)</strong><br>
        IRON DIVISION COMMAND STAFF — ${dtg}
      </div>
      <div class="sig-block">
        <strong>REVIEWING COMMANDER</strong><br>
        ${escapeHtml(stripEmojisForAAR(rep.winner === 'B' ? (rep.commanderB || 'OPFOR HQ') : (rep.commanderA || 'BLUEFOR HQ')))}
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
  // Cursor-Following Floating Unit Dossier Tooltip Controller
  // --------------------------------------------------------------------------

  let floatingTooltipEl = null;
  let activeTooltipCard = null;
  let floatingTooltipBound = false;

  function ensureFloatingTooltip() {
    if (typeof document === 'undefined' || !document.body) return null;
    if (!floatingTooltipEl) {
      floatingTooltipEl = document.getElementById('unit-floating-tooltip');
      if (!floatingTooltipEl) {
        floatingTooltipEl = document.createElement('div');
        floatingTooltipEl.id = 'unit-floating-tooltip';
        document.body.appendChild(floatingTooltipEl);
      }
    }
    return floatingTooltipEl;
  }

  function positionFloatingTooltip(clientX, clientY) {
    if (!floatingTooltipEl) return;
    const offset = 16;
    const rect = floatingTooltipEl.getBoundingClientRect();
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;

    let left = clientX + offset;
    let top = clientY + offset;

    if (left + rect.width > vw - 12) {
      left = Math.max(12, clientX - rect.width - offset);
    }
    if (top + rect.height > vh - 12) {
      top = Math.max(12, clientY - rect.height - offset);
    }

    floatingTooltipEl.style.left = `${Math.round(left)}px`;
    floatingTooltipEl.style.top = `${Math.round(top)}px`;
  }

  function hideFloatingTooltip() {
    activeTooltipCard = null;
    if (floatingTooltipEl) {
      floatingTooltipEl.classList.remove('visible');
    }
  }

  function initUnitCursorTooltip() {
    if (floatingTooltipBound || typeof document === 'undefined' || !document.addEventListener) return;
    floatingTooltipBound = true;

    document.addEventListener('mousemove', (e) => {
      const card = e.target && e.target.closest ? e.target.closest('.unit-dossier') : null;
      if (!card) {
        if (activeTooltipCard) hideFloatingTooltip();
        return;
      }

      const tip = ensureFloatingTooltip();
      if (!tip) return;

      if (activeTooltipCard !== card) {
        const src = card.querySelector('.unit-tooltip-source');
        if (!src) {
          hideFloatingTooltip();
          return;
        }
        activeTooltipCard = card;
        tip.innerHTML = src.innerHTML;
        tip.classList.add('visible');
      }

      positionFloatingTooltip(e.clientX, e.clientY);
    });

    document.addEventListener('mouseleave', hideFloatingTooltip);
    document.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('button')) {
        hideFloatingTooltip();
      }
    });
  }

  initUnitCursorTooltip();

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
    renderYAxisTracker,
    renderCombatLog,
    renderCombatRound,
    renderBattlefield,
    renderUnitDesigner,
    renderTraitsTab,
    renderCommandersTab,
    renderTerrainTab,
    goToTacticsPage,
    flipTacticsPage,
    toggleTacticsTheme,
    printCurrentTacticsPage,
    renderTacticsGuide,
    stripEmojisForAAR,
    classifyVictoryDegree,
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
  window.goToTacticsPage = goToTacticsPage;
  window.flipTacticsPage = flipTacticsPage;
  window.toggleTacticsTheme = toggleTacticsTheme;
  window.printCurrentTacticsPage = printCurrentTacticsPage;
  window.renderAll = renderAll;

})(window.IronDivision);