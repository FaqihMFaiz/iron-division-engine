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
    orbatCategoryFilter: 'all',
    traitsCategoryFilter: 'all',
    commandersFilter: 'all',
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
      sideB_tplHash: '',
      terrainHash: '',
      featureHash: '',
      weatherHash: ''
    },
    renderedLogIds: new Set(),
    tacticsPage: 0,
    tacticsDarkMode: false
  };

  // Self-contained 10-tier Officer Rank Insignia resolver (works even if engine-helpers.js is cached)
  const FALLBACK_OFFICER_RANKS = [
    { tier: 0, title: 'First Lieutenant', abbr: '1LT', svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9.5" y="2" width="5" height="14" fill="#d8dee4" stroke="#6f7882" stroke-width="1"/></svg>' },
    { tier: 1, title: 'Captain', abbr: 'CPT', svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4.5" y="2" width="4.5" height="14" fill="#d8dee4" stroke="#6f7882" stroke-width="0.9"/><rect x="15" y="2" width="4.5" height="14" fill="#d8dee4" stroke="#6f7882" stroke-width="0.9"/><line x1="9" y1="6" x2="15" y2="6" stroke="#c5ccd4" stroke-width="1.3"/><line x1="9" y1="12" x2="15" y2="12" stroke="#c5ccd4" stroke-width="1.3"/></svg>' },
    { tier: 2, title: 'Major', abbr: 'MAJ', svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14 5.5L18 4.5L16 8.5L19 11L15 12L14.5 14.5L12 13.5L9.5 14.5L9 12L5 11L8 8.5L6 4.5L10 5.5L12 2Z" fill="#d4af37" stroke="#7d6418" stroke-width="0.9"/><line x1="12" y1="13.5" x2="12" y2="16.5" stroke="#d4af37" stroke-width="1.5"/></svg>' },
    { tier: 3, title: 'Lieutenant Colonel', abbr: 'LTC', svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14 5.5L18 4.5L16 8.5L19 11L15 12L14.5 14.5L12 13.5L9.5 14.5L9 12L5 11L8 8.5L6 4.5L10 5.5L12 2Z" fill="#d8dee4" stroke="#6f7882" stroke-width="0.9"/><line x1="12" y1="13.5" x2="12" y2="16.5" stroke="#d8dee4" stroke-width="1.5"/></svg>' },
    { tier: 4, title: 'Colonel', abbr: 'COL', svg: '<svg width="26" height="18" viewBox="0 0 26 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3L14.5 5.5L23 4.5L20 9.5L16 9.5L15.5 14.5L13 13L10.5 14.5L10 9.5L6 9.5L3 4.5L11.5 5.5L13 3Z" fill="#d8dee4" stroke="#6f7882" stroke-width="0.9"/></svg>' },
    { tier: 5, title: 'Brigadier General', abbr: 'BG', svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="12,2 13.7,6.8 18.8,6.8 14.7,9.8 16.2,14.6 12,11.7 7.8,14.6 9.3,9.8 5.2,6.8 10.3,6.8" fill="#e4e9ee" stroke="#76808a" stroke-width="0.8"/></svg>' },
    { tier: 6, title: 'Major General', abbr: 'MG', svg: '<svg width="28" height="18" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="8,3 9.3,6.8 13.2,6.8 10,9.1 11.2,13 8,10.7 4.8,13 6,9.1 2.8,6.8 6.7,6.8" fill="#e4e9ee" stroke="#76808a" stroke-width="0.7"/><polygon points="20,3 21.3,6.8 25.2,6.8 22,9.1 23.2,13 20,10.7 16.8,13 18,9.1 14.8,6.8 18.7,6.8" fill="#e4e9ee" stroke="#76808a" stroke-width="0.7"/></svg>' },
    { tier: 7, title: 'Lieutenant General', abbr: 'LTG', svg: '<svg width="34" height="18" viewBox="0 0 34 18" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="6.5,4 7.6,7.1 10.8,7.1 8.2,9 9.2,12.2 6.5,10.3 3.8,12.2 4.8,9 2.2,7.1 5.4,7.1" fill="#e4e9ee" stroke="#76808a" stroke-width="0.6"/><polygon points="17,4 18.1,7.1 21.3,7.1 18.7,9 19.7,12.2 17,10.3 14.3,12.2 15.3,9 12.7,7.1 15.9,7.1" fill="#e4e9ee" stroke="#76808a" stroke-width="0.6"/><polygon points="27.5,4 28.6,7.1 31.8,7.1 29.2,9 30.2,12.2 27.5,10.3 24.8,12.2 25.8,9 23.2,7.1 26.4,7.1" fill="#e4e9ee" stroke="#76808a" stroke-width="0.6"/></svg>' },
    { tier: 8, title: 'General', abbr: 'GEN', svg: '<svg width="38" height="18" viewBox="0 0 38 18" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="5.5,4.5 6.4,7.2 9.2,7.2 7,8.8 7.8,11.5 5.5,9.9 3.2,11.5 4,8.8 1.8,7.2 4.6,7.2" fill="#e4e9ee" stroke="#76808a" stroke-width="0.55"/><polygon points="14.5,4.5 15.4,7.2 18.2,7.2 16,8.8 16.8,11.5 14.5,9.9 12.2,11.5 13,8.8 10.8,7.2 13.6,7.2" fill="#e4e9ee" stroke="#76808a" stroke-width="0.55"/><polygon points="23.5,4.5 24.4,7.2 27.2,7.2 25,8.8 25.8,11.5 23.5,9.9 21.2,11.5 22,8.8 19.8,7.2 22.6,7.2" fill="#e4e9ee" stroke="#76808a" stroke-width="0.55"/><polygon points="32.5,4.5 33.4,7.2 36.2,7.2 34,8.8 34.8,11.5 32.5,9.9 30.2,11.5 31,8.8 28.8,7.2 31.6,7.2" fill="#e4e9ee" stroke="#76808a" stroke-width="0.55"/></svg>' },
    { tier: 9, title: 'General of the Army', abbr: 'GA', svg: '<svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="13,1.5 13.8,3.9 16.3,3.9 14.3,5.4 15,7.8 13,6.3 11,7.8 11.7,5.4 9.7,3.9 12.2,3.9" fill="#f0d27a" stroke="#8a6d20" stroke-width="0.5"/><polygon points="20.5,6.8 21.3,9.2 23.8,9.2 21.8,10.7 22.5,13.1 20.5,11.6 18.5,13.1 19.2,10.7 17.2,9.2 19.7,9.2" fill="#f0d27a" stroke="#8a6d20" stroke-width="0.5"/><polygon points="17.8,14.5 18.6,16.9 21.1,16.9 19.1,18.4 19.8,20.8 17.8,19.3 15.8,20.8 16.5,18.4 14.5,16.9 17,16.9" fill="#f0d27a" stroke="#8a6d20" stroke-width="0.5"/><polygon points="8.2,14.5 9,16.9 11.5,16.9 9.5,18.4 10.2,20.8 8.2,19.3 6.2,20.8 6.9,18.4 4.9,16.9 7.4,16.9" fill="#f0d27a" stroke="#8a6d20" stroke-width="0.5"/><polygon points="5.5,6.8 6.3,9.2 8.8,9.2 6.8,10.7 7.5,13.1 5.5,11.6 3.5,13.1 4.2,10.7 2.2,9.2 4.7,9.2" fill="#f0d27a" stroke="#8a6d20" stroke-width="0.5"/></svg>' }
  ];

  function resolveOfficerRank(cmd) {
    if (ID.Icons && typeof ID.Icons.getOfficerRankInfo === 'function') {
      return ID.Icons.getOfficerRankInfo(cmd);
    }
    if (!cmd || cmd.id === 'cmd_none') {
      return { tier: -1, total: 0, title: 'Autonomous Staff', abbr: 'HQ', svg: '' };
    }
    const total = (Number(cmd.attackLevel) || 0) + (Number(cmd.defenseLevel) || 0) + (Number(cmd.commandLevel) || 0) + (Number(cmd.logisticsLevel) || 0);
    const tier = Math.max(0, Math.min(FALLBACK_OFFICER_RANKS.length - 1, Math.floor(total / 4)));
    return { ...FALLBACK_OFFICER_RANKS[tier], total };
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loc(kind, id, field, val) {
    if (ID.I18n && typeof ID.I18n.localizeField === 'function') {
      return ID.I18n.localizeField(kind, id, field, val);
    }
    return val;
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
    const dynChk = document.getElementById('bf-dynamic-weather');
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
    if (dynChk) state.environment.dynamicWeather = dynChk.checked;
    if (uChk) state.environment.unexpectedInitiative = uChk.checked;

    const dyEl = document.getElementById('bf-date-day');
    const moEl = document.getElementById('bf-date-month');
    const yrEl = document.getElementById('bf-date-year');
    const hrEl = document.getElementById('bf-clock-hour');
    const mnEl = document.getElementById('bf-clock-min');
    const durValEl = document.getElementById('bf-round-dur-val');
    const durUnitEl = document.getElementById('bf-round-dur-unit');

    if (dyEl) state.environment.battleDay = H.clamp(parseInt(dyEl.value, 10) || 1, 1, 31);
    if (moEl) state.environment.battleMonth = H.clamp(parseInt(moEl.value, 10) || 1, 1, 12);
    if (yrEl && yrEl.value !== '') {
      const parsedYr = parseInt(yrEl.value, 10);
      if (!Number.isNaN(parsedYr)) {
        state.environment.battleYear = H.clamp(parsedYr, -270000, 270000);
      }
    }
    if (hrEl && hrEl.value !== '') state.environment.battleHour = H.clamp(parseInt(hrEl.value, 10) || 0, 0, 23);
    if (mnEl && mnEl.value !== '') state.environment.battleMinute = H.clamp(parseInt(mnEl.value, 10) || 0, 0, 59);
    if (durValEl) state.environment.roundDurationValue = Math.max(1, parseInt(durValEl.value, 10) || 1);
    if (durUnitEl && durUnitEl.value) state.environment.roundDurationUnit = durUnitEl.value;
    if (H.getClockTimeOfDay && H.getSimulatedBattleDate) {
      state.environment.timeOfDay = H.getClockTimeOfDay(H.getSimulatedBattleDate(state.battle?.round || 1)).key;
    }

    if (state.battle.round === 1 && !state.battle.initialSnapshot) {
      state.battle.attackerSide = (state.environment.theatreAttackerSide === 'B') ? 'B' : 'A';
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

    const langKey = (ID.I18n && typeof ID.I18n.getLanguage === 'function') ? ID.I18n.getLanguage() : 'en';
    const terrainHash = `${langKey}|` + Object.keys(state.terrains || {}).map(k => {
      const t = state.terrains[k];
      return `${k}:${t?.name || ''}:${t?.isUrban ? 1 : 0}`;
    }).join('|');
    if (uiState.selectCache.terrainHash !== terrainHash || tSel.children.length === 0) {
      tSel.innerHTML = Object.keys(state.terrains || {}).map(k => {
        const t = state.terrains[k];
        const dispName = loc('terrain', k, 'name', t.name);
        return `<option value="${escapeHtml(k)}">${escapeHtml(dispName)}${t.isUrban ? ' (Urban Tactics Enabled)' : ''}</option>`;
      }).join('');
      uiState.selectCache.terrainHash = terrainHash;
    }
    tSel.value = state.environment.terrain;

    const featureHash = `${langKey}|` + Object.keys(D.TERRAIN_FEATURES || {}).map(k => `${k}:${D.TERRAIN_FEATURES[k]?.name || ''}`).join('|');
    if (uiState.selectCache.featureHash !== featureHash || fSel.children.length === 0) {
      fSel.innerHTML = Object.keys(D.TERRAIN_FEATURES || {}).map(k => {
        const f = D.TERRAIN_FEATURES[k];
        return `<option value="${escapeHtml(k)}">${escapeHtml(f.name)}</option>`;
      }).join('');
      uiState.selectCache.featureHash = featureHash;
    }
    fSel.value = state.environment.feature;

    const weatherHash = `${langKey}|` + Object.keys(D.WEATHER_TYPES || {}).map(k => `${k}:${D.WEATHER_TYPES[k]?.name || ''}`).join('|');
    if (uiState.selectCache.weatherHash !== weatherHash || wSel.children.length === 0) {
      wSel.innerHTML = Object.keys(D.WEATHER_TYPES || {}).map(k => {
        const w = D.WEATHER_TYPES[k];
        return `<option value="${escapeHtml(k)}">${escapeHtml(w.name)}</option>`;
      }).join('');
      uiState.selectCache.weatherHash = weatherHash;
    }
    wSel.value = state.environment.weather;

    const dynChk = document.getElementById('bf-dynamic-weather');
    if (dynChk) dynChk.checked = !!state.environment.dynamicWeather;

    const thSel = document.getElementById('bf-theatre-atk');
    if (thSel) thSel.value = state.environment.theatreAttackerSide || 'A';

    const uChk = document.getElementById('bf-unexpected');
    if (uChk) uChk.checked = !!state.environment.unexpectedInitiative;

    const dyEl = document.getElementById('bf-date-day');
    const moEl = document.getElementById('bf-date-month');
    const yrEl = document.getElementById('bf-date-year');
    const hrEl = document.getElementById('bf-clock-hour');
    const mnEl = document.getElementById('bf-clock-min');
    const durValEl = document.getElementById('bf-round-dur-val');
    const durUnitEl = document.getElementById('bf-round-dur-unit');
    if (dyEl && document.activeElement !== dyEl) dyEl.value = state.environment.battleDay ?? 6;
    if (moEl && document.activeElement !== moEl) moEl.value = state.environment.battleMonth ?? 6;
    if (yrEl && document.activeElement !== yrEl) yrEl.value = state.environment.battleYear ?? 1944;
    if (hrEl && document.activeElement !== hrEl) hrEl.value = String(state.environment.battleHour ?? 6).padStart(2, '0');
    if (mnEl && document.activeElement !== mnEl) mnEl.value = String(state.environment.battleMinute ?? 0).padStart(2, '0');
    if (durValEl && document.activeElement !== durValEl) durValEl.value = state.environment.roundDurationValue ?? 30;
    if (durUnitEl) durUnitEl.value = state.environment.roundDurationUnit || 'minutes';

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
      ? envFx.hazards.map(hz => `<span class="px-2 py-0.5 bg-[#331a19] border border-[#8a3c38] text-[#f2a6a2] font-bold" title="${escapeHtml(hz.desc)}">HAZARD // ${escapeHtml(hz.shortLabel)}</span>`).join('')
      : '';

    const simClockDate = H.getSimulatedBattleDate ? H.getSimulatedBattleDate(state.battle?.round || 1) : new Date();
    const simClockStr = H.formatSimulatedClock ? H.formatSimulatedClock(simClockDate) : '';
    const dayOrdinal = H.getBattleDayOrdinal ? H.getBattleDayOrdinal(state.battle?.round || 1) : '1ST DAY';
    const durLabel = H.getRoundDurationLabel ? H.getRoundDurationLabel() : '30 MIN/RD';
    const todPhaseLabel = envFx?.todLabel || (H.getClockTimeOfDay ? H.getClockTimeOfDay(simClockDate).label : 'DAYLIGHT');

    const dayBadge = document.getElementById('bf-clock-day-badge');
    if (dayBadge) dayBadge.textContent = dayOrdinal;
    const hdrClock = document.getElementById('hdr-live-clock');
    if (hdrClock) hdrClock.textContent = `${simClockStr} HRS · ${dayOrdinal} · ${todPhaseLabel}`;
    const opClock = document.getElementById('op-clock-display');
    if (opClock) opClock.textContent = `${simClockStr} HRS · ${dayOrdinal} (${todPhaseLabel})`;

    const todBadge = document.getElementById('bf-clock-tod-badge');
    if (todBadge) {
      todBadge.textContent = todPhaseLabel;
      todBadge.className = 'px-2 py-1 font-mono text-[10.5px] font-bold uppercase border ' + (
        todPhaseLabel === 'NIGHT'
          ? 'bg-[#171624] border-[#5b4d82] text-[#c7b8f5]'
          : (todPhaseLabel === 'DAWN' || todPhaseLabel === 'DUSK'
              ? 'bg-[#2a1f14] border-[#8c6230] text-[#ebb467]'
              : 'bg-[#172118] border-[#3c593e] text-[#9ad195]')
      );
    }

    const terrDisplayName = loc('terrain', state.environment.terrain, 'name', terr.name || 'Plains');
    const summaryBar = document.getElementById('env-summary-bar');
    if (summaryBar) {
      summaryBar.innerHTML = `
        <div class="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
          <span class="px-2 py-0.5 bg-[#121613] border border-[#4d4224] text-[#e0be6a] font-bold">CLOCK // ${escapeHtml(simClockStr)} HRS · ${escapeHtml(dayOrdinal)} (${escapeHtml(durLabel)})</span>
          <span class="px-2 py-0.5 bg-[#121613] border border-[#2e3730] text-[#c8a24b]">TERR // ${escapeHtml(terrDisplayName.toUpperCase())}: INF ${terr.infAtk >= 0 ? '+' : ''}${terr.infAtk || 0}/${terr.infDef >= 0 ? '+' : ''}${terr.infDef || 0}% | TNK ${terr.tankAtk >= 0 ? '+' : ''}${terr.tankAtk || 0}/${terr.tankDef >= 0 ? '+' : ''}${terr.tankDef || 0}% | DIG ${maxDig} | OUTNUM ${outCap}%</span>
          <span class="px-2 py-0.5 bg-[#121613] border border-[#2e3730] text-[#8ec0e8]">FEAT // ${escapeHtml((feat.name || 'Normal').toUpperCase())}: ATK ×${feat.atkMult || 1} DEF ×${feat.defMult || 1}</span>
          <span class="px-2 py-0.5 bg-[#121613] border border-[#2e3730] text-[#89b884]">METEO // ${escapeHtml((weath.name || 'Sunny').toUpperCase())} · ${escapeHtml(todPhaseLabel)} · AIR ${airPct}%${state.environment.dynamicWeather ? ' [DYN]' : ''}</span>
          ${visBadge}
          ${hazardBadges}
        </div>
        <div class="font-mono text-[10px] uppercase tracking-wider text-[#c8a24b]">THEATRE LOCK: ${escapeHtml(H.getSideName(state.environment.theatreAttackerSide || 'A').toUpperCase())} ASSAULT / ${escapeHtml(H.getSideName((state.environment.theatreAttackerSide || 'A') === 'A' ? 'B' : 'A').toUpperCase())} ENTRENCHED</div>
      `;
    }

    const collapsedSum = document.getElementById('theatre-collapsed-summary');
    if (collapsedSum) {
      collapsedSum.textContent = `CLOCK // ${simClockStr} HRS · ${dayOrdinal} (${todPhaseLabel})  |  TERR // ${terrDisplayName.toUpperCase()} (${(feat.name || 'Normal').toUpperCase()})  |  METEO // ${(weath.name || 'Sunny').toUpperCase()}${state.environment.dynamicWeather ? ' [DYN]' : ''}`;
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
          `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} [${escapeHtml(c.personality)}]</option>`
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
        tacSel.innerHTML = `<option value="auto">[AI] Commander Auto-Select</option>` +
          eligible.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} (${escapeHtml(t.personality)})</option>`).join('');
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
          `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name)} (${escapeHtml((u.category || '').toUpperCase())} | ${u.personnel} HP)</option>`
        ).join('');
        if (cur) addSel.value = cur;
        uiState.selectCache[tplHashKey] = tplHash;
      }
    }

    syncSearchableDropdown(`side${side}-commander`, 'Search general...');
    syncSearchableDropdown(`side${side}-add-select`, 'Search unit template...');
  }

  // Reusable Black-Diamond Searchable Dropdown synchronized with underlying <select>
  function closeAllSearchableDropdowns(exceptId = null) {
    document.querySelectorAll('.mil-search-dd-menu').forEach(menu => {
      if (!exceptId || menu.dataset.forSelect !== exceptId) {
        menu.classList.add('hidden');
      }
    });
  }

  function syncSearchableDropdown(selectId, placeholderText = 'Search...') {
    const sel = document.getElementById(selectId);
    if (!sel || !sel.parentNode) return;

    let wrap = document.getElementById(`${selectId}-dd-wrap`);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = `${selectId}-dd-wrap`;
      wrap.className = 'mil-search-dd relative flex-1 min-w-0 w-full';
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);
      sel.classList.add('hidden');

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.id = `${selectId}-dd-trigger`;
      trigger.className = 'mil-search-dd-trigger w-full flex items-center justify-between gap-1.5 px-2 py-1.5 text-xs text-white text-left';
      trigger.innerHTML = `<span class="mil-search-dd-label truncate"></span><span class="text-[#c8a24b] text-[10px] shrink-0">▼</span>`;

      const menu = document.createElement('div');
      menu.id = `${selectId}-dd-menu`;
      menu.dataset.forSelect = selectId;
      menu.className = 'mil-search-dd-menu hidden';

      const searchWrap = document.createElement('div');
      searchWrap.className = 'p-1.5 border-b border-[#2e3730]';
      const searchInp = document.createElement('input');
      searchInp.type = 'text';
      searchInp.id = `${selectId}-dd-search`;
      searchInp.placeholder = placeholderText;
      searchInp.className = 'mil-search-dd-input w-full px-2 py-1 text-[11px] font-mono text-[#e7ece4]';
      searchWrap.appendChild(searchInp);

      const listEl = document.createElement('div');
      listEl.id = `${selectId}-dd-list`;
      listEl.className = 'max-h-52 overflow-y-auto custom-scroll py-0.5';

      menu.appendChild(searchWrap);
      menu.appendChild(listEl);
      wrap.appendChild(trigger);
      wrap.appendChild(menu);

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = menu.classList.contains('hidden');
        closeAllSearchableDropdowns(selectId);
        if (willOpen) {
          menu.classList.remove('hidden');
          searchInp.value = '';
          renderSearchableOptions(selectId, '');
          setTimeout(() => searchInp.focus(), 10);
        } else {
          menu.classList.add('hidden');
        }
      });

      searchInp.addEventListener('input', () => {
        renderSearchableOptions(selectId, searchInp.value);
      });

      searchInp.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          menu.classList.add('hidden');
        }
      });

      menu.addEventListener('click', (e) => e.stopPropagation());
    }

    if (!window.__milSearchDdDocBound) {
      window.__milSearchDdDocBound = true;
      document.addEventListener('click', () => closeAllSearchableDropdowns(null));
    }

    const triggerLabel = wrap.querySelector('.mil-search-dd-label');
    const opts = Array.from(sel.options || []);
    const selectedOpt = opts.find(o => o.value === sel.value) || opts[0];
    if (triggerLabel) {
      triggerLabel.textContent = selectedOpt ? selectedOpt.textContent : 'Select...';
    }
    const searchInp = document.getElementById(`${selectId}-dd-search`);
    renderSearchableOptions(selectId, searchInp ? searchInp.value : '');
  }

  function renderSearchableOptions(selectId, query = '') {
    const sel = document.getElementById(selectId);
    const listEl = document.getElementById(`${selectId}-dd-list`);
    const menu = document.getElementById(`${selectId}-dd-menu`);
    const wrap = document.getElementById(`${selectId}-dd-wrap`);
    if (!sel || !listEl) return;

    const q = (query || '').trim().toLowerCase();
    const opts = Array.from(sel.options || []);
    const filtered = q ? opts.filter(o => (o.textContent || '').toLowerCase().includes(q)) : opts;

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="px-2.5 py-2 text-[11px] font-mono text-[#7c877b]">No matches found.</div>`;
      return;
    }

    listEl.innerHTML = '';
    filtered.forEach(o => {
      const item = document.createElement('div');
      const isSelected = o.value === sel.value;
      item.className = `mil-search-dd-item px-2.5 py-1.5 text-[11.5px] font-mono cursor-pointer truncate ${isSelected ? 'is-selected' : ''}`;
      item.textContent = o.textContent;
      item.title = o.textContent;
      item.addEventListener('click', () => {
        sel.value = o.value;
        const triggerLabel = wrap?.querySelector('.mil-search-dd-label');
        if (triggerLabel) triggerLabel.textContent = o.textContent;
        if (menu) menu.classList.add('hidden');
        if (typeof sel.onchange === 'function') {
          sel.onchange({ target: sel });
        } else {
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        renderSearchableOptions(selectId, '');
      });
      listEl.appendChild(item);
    });
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

    // Populate Dedicated Commanding Officer Dossier Box (Insignia + Rank + Stats + Traits)
    const rankBadgeEl = document.getElementById(`side${side}-cmd-rank-badge`);
    const dossierEl = document.getElementById(`side${side}-cmd-dossier`);
    if (rankBadgeEl || dossierEl) {
      const rankInfo = resolveOfficerRank(cmd);
      if (rankBadgeEl) {
        rankBadgeEl.innerHTML = rankInfo.svg
          ? `<span class="inline-flex items-center justify-center px-1 py-0.5 bg-[#191f1a] border border-[#4a4128]" title="${escapeHtml(rankInfo.title)} (Total Stats: ${rankInfo.total})">${rankInfo.svg}</span><span class="text-[#e0be6a] font-bold uppercase tracking-wider">${escapeHtml(rankInfo.title)}</span>`
          : `<span class="text-[#7c877b] uppercase">${escapeHtml(rankInfo.title)}</span>`;
      }
      if (dossierEl) {
        if (!cmd || cmd.id === 'cmd_none') {
          dossierEl.innerHTML = `<div class="text-[#7c877b]">Autonomous HQ staff — no commander stat or trait bonuses active.</div>`;
        } else {
          const traitTags = (cmd.traits || []).map(tid => {
            const ct = C.getCommanderTraitById ? C.getCommanderTraitById(tid) : null;
            return ct ? `<span class="mil-tag" title="${escapeHtml(loc('cmdTrait', tid, 'desc', ct.desc))}">${escapeHtml(loc('cmdTrait', tid, 'name', ct.name))}</span>` : '';
          }).join('');
          dossierEl.innerHTML = `
            <div class="grid grid-cols-4 gap-1 text-center">
              <div class="bg-[#121613] border border-[#29312b] py-1"><span class="block text-[8.5px] text-[#7c877b]">ATK</span><span class="font-bold text-[#c8a24b]">${cmd.attackLevel || 0}</span></div>
              <div class="bg-[#121613] border border-[#29312b] py-1"><span class="block text-[8.5px] text-[#7c877b]">DEF</span><span class="font-bold text-[#8ec0e8]">${cmd.defenseLevel || 0}</span></div>
              <div class="bg-[#121613] border border-[#29312b] py-1"><span class="block text-[8.5px] text-[#7c877b]">CMD</span><span class="font-bold text-[#89b884]">${cmd.commandLevel || 0}</span></div>
              <div class="bg-[#121613] border border-[#29312b] py-1"><span class="block text-[8.5px] text-[#7c877b]">LOG</span><span class="font-bold text-[#c0a8d8]">${cmd.logisticsLevel || 0}</span></div>
            </div>
            <div class="flex items-center justify-between gap-1.5 flex-wrap pt-0.5">
              <span class="text-[9.5px] text-[#9ca69a]">DOCTRINE: <b class="text-[#e7ece4]">${escapeHtml((cmd.personality || 'Balanced').toUpperCase())}</b> · TOTAL: <b class="text-[#e0be6a]">${rankInfo.total}</b></span>
              ${traitTags ? `<div class="flex flex-wrap gap-1">${traitTags}</div>` : ''}
            </div>
          `;
        }
      }
    }

      summaryEl.innerHTML = `
        <div>
          <span class="block text-[10.5px] font-mono text-[#a6b2a4]">Formations</span>
          <span class="font-bold text-base sm:text-lg text-[#f0f4ee] leading-tight" style="font-family:'Chakra Petch',sans-serif;">${activeUnits.length}/${sideObj.units.length}</span>
        </div>
        <div>
          <span class="block text-[10.5px] font-mono text-[#a6b2a4]">Eff. strength / AFV</span>
          <span class="font-bold text-base sm:text-lg text-[#89c983] leading-tight" style="font-family:'Chakra Petch',sans-serif;">${totalPers.toLocaleString()} <span class="text-[#c8a24b]">[${totalArmor}]</span></span>
        </div>
        <div>
          <span class="block text-[10.5px] font-mono text-[#a6b2a4]">Losses (KIA+WIA)</span>
          <span class="font-bold text-base sm:text-lg ${totalDeadWounded > 0 ? 'text-[#e07973]' : 'text-[#a6b2a4]'} leading-tight" style="font-family:'Chakra Petch',sans-serif;">${totalDeadWounded.toLocaleString()}</span>
        </div>
        <div class="col-span-3 pt-2 mt-1 border-t border-slate-800 text-left">
          <div class="flex justify-between text-[10px] font-mono uppercase mb-1">
            <span class="text-[#a5b0a3] font-bold">SUPPLY DEPOT // ${escapeHtml((() => { const raw = (cmd?.name || '').replace(/\s*\([^)]*\)\s*/g, '').trim(); if (!raw || /^no assigned/i.test(raw)) return 'HQ'; const parts = raw.split(/\s+/); return parts[parts.length - 1].toUpperCase(); })())}</span>
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
        return t ? `<span class="mil-tag" title="${escapeHtml(loc('trait', tid, 'desc', t.desc))}">${escapeHtml(loc('trait', tid, 'name', t.name))}</span>` : '';
      }).join('');

      const purBonus = C.getUnitPursuitBonus ? C.getUnitPursuitBonus(u) : 0;
      const retBonus = C.getUnitRetreatBonus ? C.getUnitRetreatBonus(u) : 0;
      const entrenchCap = H.getUnitMaxEntrenchmentCap ? H.getUnitMaxEntrenchmentCap(u) : 3;

      const isInactiveStatus = !!(u.defeated || u.isRallying);
      const isStrainedStatus = !isInactiveStatus && !u.isMonster && !u.isZombie && (orgPct < 30 || supPct < 30);
      const statusAccentCls = isInactiveStatus
        ? 'unit-status-inactive'
        : (isStrainedStatus ? 'unit-status-strained' : (side === 'A' ? 'unit-status-ok-a' : 'unit-status-ok-b'));
      const safeInstId = escapeHtml(u.instanceId);

      return `
        <div class="unit-dossier ${u.defeated ? 'unit-dossier-defeated' : (side === 'A' ? 'unit-dossier-a' : 'unit-dossier-b')} ${statusAccentCls} p-2.5 space-y-2" data-unit-id="${safeInstId}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap min-w-0">
              <span class="${side === 'A' ? 'text-[#8ec0e8]' : 'text-[#e69894]'} shrink-0" title="${escapeHtml(u.category.toUpperCase())} NATO Symbol">${ID.Icons ? ID.Icons.get(u.category) : ''}</span>
              <span class="mil-dogtag" title="${escapeHtml(u.name)}"><span class="mil-dogtag-text">${escapeHtml(u.name)}</span></span>
              <span class="mil-rank-patch inline-flex items-center justify-center w-[22px] h-[22px] bg-[#1c2017] border border-[#594b27] text-[#d4b054] shrink-0" title="${escapeHtml(u.experience)} Rank Insignia">${ID.Icons && ID.Icons.getRank ? ID.Icons.getRank(u.experience) : escapeHtml(u.experience)}</span>
              <span class="unit-compact-dist-pill hidden items-center px-1.5 py-0.5 bg-[#121613] border border-[#2c3a47] font-mono text-[9.5px] font-bold text-[#8ec0e8]" title="Y-Axis Distance">DIST ${unitPos}</span>
            </div>
            <button type="button" data-action="unit-remove" data-side="${side}" data-id="${safeInstId}" class="text-[#667065] hover:text-[#d46a64] font-mono text-xs px-1 shrink-0" title="Remove unit">[X]</button>
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
              <div class="unit-tooltip-compact-extra space-y-1.5 pt-0.5 border-t border-[#29312b]">
                <div class="grid grid-cols-3 gap-1 font-mono text-[9.5px] text-center">
                  <div class="px-1.5 py-0.5 bg-[#181d19] border border-[#29312b]"><span class="text-[#7c877b] block text-[8.5px]">TV</span><span class="text-[#7cb377] font-bold">${tv}</span></div>
                  <div class="px-1.5 py-0.5 bg-[#181d19] border border-[#29312b]"><span class="text-[#7c877b] block text-[8.5px]">DIG-IN</span><span class="text-[#c8a24b] font-bold">${u.entrenchmentLevel || 0}/${entrenchCap}</span></div>
                  <div class="px-1.5 py-0.5 bg-[#181d19] border border-[#29312b]"><span class="text-[#7c877b] block text-[8.5px]">DIST</span><span class="text-[#8ec0e8] font-bold">${side === 'A' ? 'A-' : 'B-'}${unitPos}</span></div>
                </div>
                <div class="grid grid-cols-2 gap-1 font-mono text-[9.5px]">
                  <div class="px-1.5 py-0.5 bg-[#181d19] border border-[#29312b] flex justify-between">
                    <span class="text-[#7c877b]">KIA/WIA</span>
                    <span><b class="text-[#d46a64]">${u.dead}</b>/<b class="text-[#c8a24b]">${u.wounded}</b>${lossMalus < 0 ? ` <span class="text-[#d46a64]">[${lossMalus}%]</span>` : ''}</span>
                  </div>
                  <div class="px-1.5 py-0.5 bg-[#181d19] border border-[#29312b] flex justify-between">
                    <span class="text-[#7c877b]">CLASS</span>
                    <span class="text-[#dde3da] font-bold">${escapeHtml(u.armorTier.toUpperCase())}${orgMalus < 0 ? ` <span class="text-[#d46a64]">[${orgMalus}%]</span>` : ''}</span>
                  </div>
                  ${u.maxArmor > 0 ? `
                  <div class="col-span-2 px-1.5 py-0.5 bg-[#181d19] border border-[#29312b] flex justify-between">
                    <span class="text-[#7c877b]">AFV RECOV / KO</span>
                    <span><b class="text-[#89b884]">${u.recoverableArmor}</b> RECOV | <b class="text-[#d46a64]">${u.unrecoverableArmor}</b> KO</span>
                  </div>` : ''}
                  ${supMalus < 0 ? `
                  <div class="col-span-2 px-1.5 py-0.5 bg-[#291716] border border-[#6e3532] text-[#e69894] font-bold text-center">
                    SUPPLY DEFICIT [${supMalus}%]
                  </div>` : ''}
                </div>
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
                <div class="col-span-2 px-2 py-1 bg-[#181d19] border border-[#29312b] flex justify-between">
                  <span class="text-[#7c877b]">BASE RECOVERY</span>
                  <span class="text-[#89b884] font-bold">${u.recovery !== undefined && u.recovery !== null ? u.recovery : 50}%</span>
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
                <span class="text-[#a6b2a4]">Pers</span>
                <span class="text-[#89b884]">${u.personnel}/${u.maxPersonnel} (${persPct}%)</span>
              </div>
              <div class="w-full h-2 bar-track mt-0.5">
                <div class="bg-[#5e8f59] h-full bar-fill" style="width: ${persPct}%"></div>
              </div>
              <div class="unit-card-secondary text-[9.5px] text-[#7c877b] mt-0.5">KIA <span class="${u.dead > 0 ? 'text-[#d46a64] font-semibold' : 'text-[#a6b2a4]'}">${u.dead}</span> | WIA <span class="${u.wounded > 0 ? 'text-[#c8a24b] font-semibold' : 'text-[#a6b2a4]'}">${u.wounded}</span>${lossMalus < 0 ? ` <span class="text-[#d46a64]">[${lossMalus}%]</span>` : ''}</div>
            </div>

            <div>
              <div class="flex justify-between">
                <span class="text-[#a6b2a4]">Org</span>
                <span class="text-[#7cd1cc]">${(u.isMonster || u.isZombie) ? 'N/A' : `${u.org}/${u.maxOrg} (${orgPct}%)`}</span>
              </div>
              <div class="w-full h-2 bar-track mt-0.5">
                <div class="bg-[#3ea6a0] h-full bar-fill" style="width: ${orgPct}%"></div>
              </div>
              <div class="unit-card-secondary text-[9.5px] text-[#7c877b] mt-0.5">CLASS <span class="text-[#b8c2b6]">${escapeHtml(u.armorTier.toUpperCase())}</span>${orgMalus < 0 ? ` <span class="text-[#d46a64]">[${orgMalus}%]</span>` : ''}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] font-mono">
            <div>
              <div class="flex justify-between">
                <span class="text-[#a6b2a4]">Sup</span>
                <span class="text-[#c8a24b]">${(u.isMonster || u.isZombie) ? 'N/A' : `${u.supply}/${u.maxSupply} (${supPct}%)`}</span>
              </div>
              <div class="w-full h-1.5 bar-track mt-0.5">
                <div class="bg-[#c8a24b] h-full bar-fill" style="width: ${supPct}%"></div>
              </div>
              ${supMalus < 0 ? `<div class="unit-card-secondary text-[9.5px] text-[#d46a64] mt-0.5">SUPPLY DEFICIT [${supMalus}%]</div>` : ''}
            </div>

            ${u.maxArmor > 0 ? `
            <div>
              <div class="flex justify-between">
                <span class="text-[#a6b2a4]">AFV</span>
                <span class="text-[#d99b52]">${u.armor}/${u.maxArmor}</span>
              </div>
              <div class="w-full h-1.5 bar-track mt-0.5">
                <div class="bg-[#c27a34] h-full bar-fill" style="width: ${armorPct}%"></div>
              </div>
              <div class="unit-card-secondary text-[9.5px] text-[#7c877b] mt-0.5">RECOV <span class="text-[#89b884]">${u.recoverableArmor}</span> | KO <span class="text-[#d46a64]">${u.unrecoverableArmor}</span></div>
            </div>
            ` : `<div class="text-[9.5px] font-mono uppercase text-[#667065] flex items-center">UNARMORED // FOOT ELEMENT</div>`}
          </div>

          ${state.gmMode ? `
            <div class="pt-1.5 mt-1 border-t border-[#3a453c] flex flex-wrap items-center gap-1 font-mono text-[9.5px]">
              <span class="text-[#c8a24b] font-bold mr-1">GM:</span>
              <button type="button" data-action="gm-adjust" data-side="${side}" data-id="${safeInstId}" data-field="supply" data-delta="-10" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#d4b054]">SUP-10</button>
              <button type="button" data-action="gm-adjust" data-side="${side}" data-id="${safeInstId}" data-field="supply" data-delta="10" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#d4b054]">SUP+10</button>
              <button type="button" data-action="gm-adjust" data-side="${side}" data-id="${safeInstId}" data-field="org" data-delta="-10" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#8ec0e8]">ORG-10</button>
              <button type="button" data-action="gm-adjust" data-side="${side}" data-id="${safeInstId}" data-field="org" data-delta="10" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#8ec0e8]">ORG+10</button>
              <button type="button" data-action="gm-adjust" data-side="${side}" data-id="${safeInstId}" data-field="pos" data-delta="-1" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#7cb377]" title="Move 1 closer to contact line">DIST-1</button>
              <button type="button" data-action="gm-adjust" data-side="${side}" data-id="${safeInstId}" data-field="pos" data-delta="1" class="px-1.5 py-0.5 bg-[#1b201c] hover:bg-[#2a332c] border border-[#3a453c] text-[#7cb377]" title="Move 1 further back">DIST+1</button>
              ${(u.isRallying || u.defeated) ? `<button type="button" data-action="gm-adjust" data-side="${side}" data-id="${safeInstId}" data-field="rally_now" data-delta="0" class="ml-auto px-1.5 py-0.5 bg-[#2d472b] hover:bg-[#385936] border border-[#4c7548] text-[#d9ead7] font-bold">RALLY NOW</button>` : ''}
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

    renderEnvironmentSelectors();
    const rdEl = document.getElementById('round-counter-display');
    const phEl = document.getElementById('phase-indicator');
    if (rdEl) {
      rdEl.textContent = state.battle.isOver
        ? `BATTLE CONCLUDED (RD ${state.battle.round})`
        : `ROUND ${state.battle.round}`;
    }
    const miniRdEl = document.getElementById('op-status-mini-rd');
    if (miniRdEl) {
      miniRdEl.textContent = state.battle.isOver
        ? `END · R${state.battle.round}`
        : `RD-${String(state.battle.round).padStart(2, '0')}`;
    }
    const nameA = H.getSideName('A');
    const nameB = H.getSideName('B');
    const inpA = document.getElementById('sideA-name-input');
    const inpB = document.getElementById('sideB-name-input');
    if (inpA && document.activeElement !== inpA) inpA.value = nameA;
    if (inpB && document.activeElement !== inpB) inpB.value = nameB;
    const yLblA = document.getElementById('yaxis-label-a');
    const yLblB = document.getElementById('yaxis-label-b');
    if (yLblA) {
      yLblA.textContent = `◄ ${formatTacticalSectorSideLabel(nameA, 18)}`;
      yLblA.title = nameA;
    }
    if (yLblB) {
      yLblB.textContent = `${formatTacticalSectorSideLabel(nameB, 18)} ►`;
      yLblB.title = nameB;
    }

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
  function formatTacticalSectorSideLabel(rawName, maxLen = 19) {
    const clean = String(rawName || '').trim().toUpperCase();
    if (!clean) return 'SIDE';
    if (clean.length <= maxLen) return clean;

    const parenMatch = clean.match(/\(([^)]+)\)/);
    const baseNoParen = clean.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (parenMatch) {
      const abbr = parenMatch[1].trim();
      if (abbr.length > 0 && abbr.length <= 6) {
        const strippedBase = baseNoParen
          .replace(/^(U\.S\.(?:A\.?)?|US|UK|GER|USSR|IMP\.?)\s+/i, '')
          .replace(/\s+(DIV|DIVISION|CORPS|ARMY|REGIMENT|BRIGADE|BATTALION)$/i, '')
          .trim();
        if (strippedBase && /^\d+(ST|ND|RD|TH)?\b/.test(strippedBase)) {
          const candidate = `${strippedBase} (${abbr})`;
          if (candidate.length <= maxLen) return candidate;
        }
        return abbr;
      }
    }

    const words = (baseNoParen || clean).split(/\s+/);
    let out = '';
    for (const w of words) {
      const next = out ? `${out} ${w}` : w;
      if (next.length <= maxLen) out = next;
      else break;
    }
    return out || (baseNoParen || clean).slice(0, maxLen).trim();
  }

  function renderTacticalSectorCanvas() {
    const state = ID.state;
    const wrap = document.getElementById('tactical-sector-canvas');
    if (!wrap || !state || !state.battle) return;

    const env = state.environment || {};
    const envFx = H.getActiveEnvironmentEffects ? H.getActiveEnvironmentEffects() : {};
    const terr = env.terrain || 'Plains';
    const feat = env.feature || 'Normal';
    const tagEl = document.getElementById('sector-terrain-tag');
    if (tagEl) {
      tagEl.textContent = `${terr.toUpperCase()} // ${feat.toUpperCase()}${envFx.visCap ? ` · VIS ${envFx.visCap}` : ''}`;
    }

    const W = 420;
    const H_SVG = 166;
    const midX = W / 2;
    const padX = 24;
    const usableHalf = (W / 2) - padX;

    const coordToX = (signedCoord) => {
      const clamped = Math.max(-7, Math.min(7, signedCoord));
      return midX + (clamped / 7) * usableHalf;
    };

    const C = getCombat();
    const isAct = C.isUnitActive || (u => !u.defeated && !u.isRallying && u.personnel > 0);
    const activeA = (state.battle.sideA.units || []).filter(isAct);
    const activeB = (state.battle.sideB.units || []).filter(isAct);

    let terrainSvg = '';
    if (terr === 'Hills' || terr === 'Mountain') {
      const peaks = terr === 'Mountain'
        ? [[60,34],[118,26],[175,38],[248,30],[310,25],[362,36],[90,148],[295,146]]
        : [[75,36],[160,32],[265,34],[345,38],[120,148],[310,146]];
      terrainSvg += peaks.map(([px, py]) =>
        `<path d="M${px-12} ${py+10} L${px} ${py-6} L${px+12} ${py+10}" stroke="#3e4b3d" stroke-width="1.3" fill="none" opacity="0.65"/>`
      ).join('');
    } else if (terr === 'Urban') {
      const blocks = [[45,24,22,12],[82,20,18,14],[140,26,24,10],[256,22,22,12],[312,24,26,12],[60,136,24,12],[298,134,26,12]];
      terrainSvg += blocks.map(([bx, by, bw, bh]) =>
        `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="#424d43" stroke-width="1" opacity="0.55"/>`
      ).join('');
    } else if (terr === 'Forest' || terr === 'Jungle') {
      const trees = [[54,30],[96,24],[148,34],[272,28],[330,24],[368,36],[78,144],[335,142]];
      terrainSvg += trees.map(([tx, ty]) =>
        `<circle cx="${tx}" cy="${ty}" r="5.5" fill="none" stroke="#355238" stroke-width="1.2" opacity="0.65"/><circle cx="${tx+4}" cy="${ty+2}" r="4" fill="none" stroke="#355238" stroke-width="1" opacity="0.5"/>`
      ).join('');
    }
    if (feat === 'SmallRiver' || feat === 'LargeRiver' || feat === 'Amphibious') {
      const rw = feat === 'SmallRiver' ? 5 : 9;
      terrainSvg += `<path d="M${midX-2} 0 Q${midX+7} 42 ${midX-4} 84 T${midX+3} ${H_SVG}" stroke="#2c5d85" stroke-width="${rw}" fill="none" opacity="0.45"/>`;
    }
    if (feat === 'Fort') {
      const fortX = (env.theatreAttackerSide || 'A') === 'A' ? midX + 12 : midX - 12;
      terrainSvg += `<line x1="${fortX}" y1="14" x2="${fortX}" y2="${H_SVG-14}" stroke="#8c7538" stroke-width="2" stroke-dasharray="6 4" opacity="0.7"/>`;
    }
    if (envFx.visCap !== null && envFx.visCap !== undefined) {
      const rx = (envFx.visCap / 7) * usableHalf;
      terrainSvg += `<ellipse cx="${midX}" cy="${H_SVG/2}" rx="${rx.toFixed(1)}" ry="62" fill="none" stroke="#7c6ab0" stroke-width="1" stroke-dasharray="4 3" opacity="0.45"/>`;
    }

    const drawCounter = (u, side, cx, cy, isRear = false) => {
      const strokeCol = side === 'A' ? '#6db4eb' : '#e67670';
      const fillCol = side === 'A' ? '#122230' : '#2e1413';
      const w = 24;
      const h = 15;
      const x0 = cx - w / 2;
      const y0 = cy - h / 2;
      let sym = '';
      if (u.category === 'tank') {
        sym = `<rect x="${x0+5}" y="${y0+4}" width="${w-10}" height="${h-8}" rx="3.5" fill="none" stroke="${strokeCol}" stroke-width="1.2"/>`;
      } else if (u.category === 'armored_vehicle') {
        sym = `<line x1="${x0}" y1="${y0}" x2="${x0+w}" y2="${y0+h}" stroke="${strokeCol}" stroke-width="1"/><line x1="${x0+w}" y1="${y0}" x2="${x0}" y2="${y0+h}" stroke="${strokeCol}" stroke-width="1"/><rect x="${x0+6}" y="${y0+4.5}" width="${w-12}" height="${h-9}" rx="3" fill="none" stroke="${strokeCol}" stroke-width="1"/>`;
      } else if (u.category === 'artillery') {
        sym = `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${strokeCol}"/>`;
      } else {
        sym = `<line x1="${x0}" y1="${y0}" x2="${x0+w}" y2="${y0+h}" stroke="${strokeCol}" stroke-width="1.15"/><line x1="${x0+w}" y1="${y0}" x2="${x0}" y2="${y0+h}" stroke="${strokeCol}" stroke-width="1.15"/>`;
      }
      const persRatio = Math.max(0, Math.min(1, (u.personnel || 0) / Math.max(1, u.maxPersonnel || 1)));
      const barW = Math.round(w * persRatio);
      const opacity = isRear ? '0.45' : '0.96';
      const dash = isRear ? ' stroke-dasharray="2 2"' : '';
      const tip = `${escapeHtml(u.name)} (${escapeHtml((u.category || '').toUpperCase())}) | PERS ${u.personnel}/${u.maxPersonnel} | ORG ${u.org}/${u.maxOrg} | POS ${u.pos ?? 2}`;
      return `
        <g class="sector-counter" data-unit-id="${escapeHtml(u.instanceId)}" opacity="${opacity}">
          <title>${tip} — Click to locate card</title>
          <rect class="sector-counter-halo" x="${(x0 - 2.5).toFixed(1)}" y="${(y0 - 2.5).toFixed(1)}" width="${w + 5}" height="${h + 5}" rx="2" fill="none" stroke="#e6c46d" stroke-width="2" opacity="0"/>
          <rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w}" height="${h}" fill="${fillCol}" stroke="${strokeCol}" stroke-width="1.3"${dash}/>
          ${sym}
          <rect x="${x0.toFixed(1)}" y="${(y0+h+1.5).toFixed(1)}" width="${w}" height="2" fill="#1b221c"/>
          <rect x="${x0.toFixed(1)}" y="${(y0+h+1.5).toFixed(1)}" width="${barW}" height="2" fill="${side === 'A' ? '#6db4eb' : '#e67670'}"/>
        </g>`;
    };

    const placeSideUnits = (units, side) => {
      const buckets = {};
      units.forEach(u => {
        const p = (u.pos !== undefined && u.pos !== null) ? u.pos : 2;
        const signed = side === 'A' ? -p : p;
        const key = String(signed);
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(u);
      });
      const placed = [];
      Object.entries(buckets).forEach(([k, list]) => {
        const baseX = coordToX(Number(k));
        const count = list.length;
        list.forEach((u, idx) => {
          const cols = count > 4 ? 2 : 1;
          const colIdx = idx % cols;
          const rowIdx = Math.floor(idx / cols);
          const rows = Math.ceil(count / cols);
          const xOffset = cols === 2 ? (colIdx === 0 ? -14 : 14) : 0;
          const spanY = Math.min(112, Math.max(24, rows * 25));
          const startY = (H_SVG / 2) - (spanY / 2) + (spanY / (rows * 2));
          const cy = rows === 1 ? H_SVG / 2 : startY + rowIdx * (spanY / rows);
          const cx = Math.max(16, Math.min(W - 16, baseX + xOffset));
          placed.push({ u, side, cx, cy });
        });
      });
      return placed;
    };

    const placedA = placeSideUnits(activeA, 'A');
    const placedB = placeSideUnits(activeB, 'B');

    let fireLinesSvg = '';
    if (placedA.length > 0 && placedB.length > 0) {
      const leadA = placedA.slice(0, 3);
      const leadB = placedB.slice(0, 3);
      leadA.forEach(a => {
        leadB.forEach(b => {
          if (H.canUnitEngageTarget && H.canUnitEngageTarget(a.u, b.u)) {
            fireLinesSvg += `<line x1="${a.cx.toFixed(1)}" y1="${a.cy.toFixed(1)}" x2="${b.cx.toFixed(1)}" y2="${b.cy.toFixed(1)}" stroke="#c8a24b" stroke-width="0.7" stroke-dasharray="2 3" opacity="0.32"/>`;
          }
        });
      });
    }

    const countersSvg = [
      ...placedA.map(p => drawCounter(p.u, 'A', p.cx, p.cy, false)),
      ...placedB.map(p => drawCounter(p.u, 'B', p.cx, p.cy, false))
    ].join('');

    const nameA = H.getSideName ? H.getSideName('A') : 'SIDE A';
    const nameB = H.getSideName ? H.getSideName('B') : 'SIDE B';

    wrap.innerHTML = `
      <svg viewBox="0 0 ${W} ${H_SVG}" width="100%" height="${H_SVG}" class="block select-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="sec-hatch-b" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#8a2c28" stroke-width="1.4" opacity="0.38"/>
          </pattern>
          <pattern id="sec-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#18211a" stroke-width="0.8"/>
          </pattern>
        </defs>
        <rect x="0" y="0" width="${W}" height="${H_SVG}" fill="#080c09"/>
        <rect x="0" y="0" width="${W}" height="${H_SVG}" fill="url(#sec-grid)"/>
        <rect x="2" y="2" width="${midX - 4}" height="${H_SVG - 4}" fill="rgba(45, 92, 134, 0.09)" stroke="#243c52" stroke-width="1"/>
        <rect x="${midX + 2}" y="2" width="${midX - 4}" height="${H_SVG - 4}" fill="url(#sec-hatch-b)" stroke="#5c2320" stroke-width="1"/>
        <line x1="${midX}" y1="0" x2="${midX}" y2="${H_SVG}" stroke="#c8a24b" stroke-width="1.6" stroke-dasharray="5 3" opacity="0.85"/>
        ${terrainSvg}
        ${fireLinesSvg}
        ${countersSvg}
        <text x="8" y="13" fill="#7db3df" font-family="IBM Plex Mono, monospace" font-size="8" font-weight="700" letter-spacing="0.02em" opacity="0.9"><title>${escapeHtml(nameA)}</title>${escapeHtml(formatTacticalSectorSideLabel(nameA, 19))}</text>
        <text x="${W - 8}" y="13" text-anchor="end" fill="#e69894" font-family="IBM Plex Mono, monospace" font-size="8" font-weight="700" letter-spacing="0.02em" opacity="0.9"><title>${escapeHtml(nameB)}</title>${escapeHtml(formatTacticalSectorSideLabel(nameB, 19))}</text>
        <text x="${midX}" y="${H_SVG - 6}" text-anchor="middle" fill="#c8a24b" font-family="IBM Plex Mono, monospace" font-size="8" font-weight="700" opacity="0.9">CONTACT LINE (0)</text>
      </svg>
    `;
  }

  function renderYAxisTracker() {
    renderTacticalSectorCanvas();
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
        <div class="min-w-0 flex-1"><span class="text-[#4a5448] mr-1.5 font-bold">[RD-${String(item.round).padStart(2, '0')}${item.clock ? ` | ${escapeHtml(item.clock)}` : ''}]</span>${escapeHtml(stripEmojisForAAR(item.text))}</div>
      </div>`;
    }).join('');

    // Keep renderedLogIds bounded when logs grow large
    if (uiState.renderedLogIds.size > 400) {
      const activeIds = new Set(logsToRender.map(l => l.id));
      uiState.renderedLogIds = activeIds;
    }

    const expModal = document.getElementById('log-expand-modal');
    if (expModal && !expModal.classList.contains('hidden')) {
      renderExpandedCombatLog();
    }
  }

  function openExpandedLogModal() {
    const modal = document.getElementById('log-expand-modal');
    if (!modal) return;
    const mainFilter = document.getElementById('log-filter');
    const expFilter = document.getElementById('log-expand-filter');
    if (mainFilter && expFilter) expFilter.value = mainFilter.value;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderExpandedCombatLog();
  }

  function closeExpandedLogModal() {
    const modal = document.getElementById('log-expand-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function renderExpandedCombatLog() {
    const state = ID.state;
    const container = document.getElementById('log-expand-container');
    const countEl = document.getElementById('log-expand-count');
    if (!container || !state || !state.battle) return;

    const filterEl = document.getElementById('log-expand-filter');
    const searchEl = document.getElementById('log-expand-search');
    const filterVal = filterEl ? filterEl.value : 'all';
    const query = (searchEl ? searchEl.value : '').trim().toLowerCase();

    const allLogs = state.battle.logs || [];
    const filtered = allLogs.filter(item => {
      if (filterVal !== 'all' && item.category !== filterVal) return false;
      if (query) {
        const hay = `[RD-${String(item.round).padStart(2, '0')} ${item.clock || ''} ${item.dayLabel || ''}] ${item.text || ''}`.toLowerCase();
        return hay.includes(query);
      }
      return true;
    });

    if (countEl) {
      countEl.textContent = `${filtered.length} / ${allLogs.length} ENTRIES`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="text-[#5c645a] text-center py-12 font-mono text-xs uppercase">NO LOG ENTRIES MATCH CURRENT FILTER</div>`;
      return;
    }

    container.innerHTML = filtered.slice().reverse().map(item => {
      const iconHtml = ID.Icons ? ID.Icons.getForLog(item.category, item.text) : '';
      const stamp = `[RD-${String(item.round).padStart(2, '0')}${item.clock ? ` | ${escapeHtml(item.clock)}` : ''}${item.dayLabel ? ` · ${escapeHtml(item.dayLabel)}` : ''}]`;
      return `
      <div class="${colorMap[item.category] || colorMap.rolls} flex items-start gap-2 py-1">
        <span class="mil-log-icon shrink-0 mt-0.5">${iconHtml}</span>
        <div class="min-w-0 flex-1 leading-relaxed"><span class="text-[#4a5448] mr-1.5 font-bold">${stamp}</span>${escapeHtml(stripEmojisForAAR(item.text))}</div>
      </div>`;
    }).join('');
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

  function setOrbatCategoryFilter(cat) {
    uiState.orbatCategoryFilter = cat || 'all';
    const pills = document.querySelectorAll('#orbat-cat-pills .orbat-filter-pill');
    pills.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.cat === uiState.orbatCategoryFilter);
    });
    renderUnitDesigner();
  }

  function renderUnitDesigner() {
    const state = ID.state;
    if (!state) return;

    const chkContainer = document.getElementById('unit-traits-checkboxes');
    if (chkContainer) {
      const currentChecked = Array.from(chkContainer.querySelectorAll('input:checked')).map(i => i.value);
      chkContainer.innerHTML = (state.traits || []).map(t => `
        <label class="flex items-start gap-1.5 p-1 rounded hover:bg-slate-900 cursor-pointer">
          <input type="checkbox" value="${escapeHtml(t.id)}" class="unit-trait-chk mt-0.5 accent-amber-500" ${currentChecked.includes(t.id) ? 'checked' : ''}>
          <div>
            <div class="font-semibold text-slate-200">${escapeHtml(loc('trait', t.id, 'name', t.name))}</div>
            <div class="text-[10px] text-slate-400 leading-tight">${escapeHtml(loc('trait', t.id, 'desc', t.desc))}</div>
          </div>
        </label>
      `).join('');
    }

    const grid = document.getElementById('unit-templates-grid');
    if (!grid) return;

    const C = getCombat();

    const activeCat = uiState.orbatCategoryFilter || 'all';
    const searchQ = (document.getElementById('orbat-lib-search')?.value || '').trim().toLowerCase();
    const filteredTemplates = (state.unitTemplates || []).filter(u => {
      if (activeCat === 'infantry' && u.category !== 'infantry') return false;
      if (activeCat === 'armor' && u.category !== 'tank' && u.category !== 'armored_vehicle') return false;
      if (activeCat === 'artillery' && u.category !== 'artillery') return false;
      if (searchQ && !(u.name || '').toLowerCase().includes(searchQ) && !(u.category || '').toLowerCase().includes(searchQ)) return false;
      return true;
    });
    const countEl = document.getElementById('orbat-lib-count');
    if (countEl) countEl.textContent = `${filteredTemplates.length} / ${(state.unitTemplates || []).length} UNITS`;

    if (filteredTemplates.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center py-8 font-mono text-xs text-slate-400 border border-dashed border-slate-800">No unit templates match the current filter.</div>`;
      return;
    }

    grid.innerHTML = filteredTemplates.map(u => {
      const traitNames = (u.traits || []).map(tid => {
        const tr = C.getTraitById ? C.getTraitById(tid) : null;
        return tr ? loc('trait', tid, 'name', tr.name) : tid;
      }).filter(Boolean).join(', ');
      const purBonus = C.getUnitPursuitBonus ? C.getUnitPursuitBonus(u) : 0;
      const retBonus = C.getUnitRetreatBonus ? C.getUnitRetreatBonus(u) : 0;
      const safeUid = escapeHtml(u.id);

      return `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
          <div>
            <div class="flex items-center justify-between gap-2">
              <h3 class="mil-dogtag mil-dogtag-lg" title="${escapeHtml(u.name)}"><span class="mil-dogtag-text">${escapeHtml(u.name)}</span></h3>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">${escapeHtml(u.experience)}</span>
            </div>
            <div class="text-[11px] font-mono text-slate-400 mt-1">
              ${escapeHtml((u.category || '').toUpperCase())} | Armor: ${escapeHtml((u.armorTier || 'unarmored').toUpperCase())} (${u.armorCount} veh)
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
              <div>Recovery: <b class="text-emerald-300">${u.recovery !== undefined && u.recovery !== null ? u.recovery : 50}%</b></div>
              <div class="col-span-3">Pur/Ret: <b class="text-purple-300">${purBonus >= 0 ? '+' : ''}${purBonus}/${retBonus >= 0 ? '+' : ''}${retBonus}</b></div>
            </div>
            <div class="text-[11px] text-slate-400 mt-1.5">
              <b class="text-slate-300">Traits:</b> ${escapeHtml(traitNames || 'None')}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800 text-xs">
            <button type="button" data-action="unit-edit" data-id="${safeUid}" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">✎ Edit</button>
            <button type="button" data-action="unit-dup" data-id="${safeUid}" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700" title="Duplicate this template">⧉ Duplicate</button>
            <button type="button" data-action="unit-deploy" data-id="${safeUid}" data-side="A" class="px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white">+ Side A</button>
            <button type="button" data-action="unit-deploy" data-id="${safeUid}" data-side="B" class="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white">+ Side B</button>
            <button type="button" data-action="unit-delete" data-id="${safeUid}" class="ml-auto px-2 py-1 rounded bg-[#1c1a1a] hover:bg-[#2b2020] border border-[#6e5252] text-[#d6a9a7]">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function setTraitsCategoryFilter(cat) {
    uiState.traitsCategoryFilter = cat || 'all';
    document.querySelectorAll('#traits-cat-pills .orbat-filter-pill').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.cat === uiState.traitsCategoryFilter);
    });
    renderTraitsTab();
  }

  function classifyTraitCategory(t) {
    if (!t) return 'combat';
    if (t.isMonster || t.isZombie || t.isSpecialForces || t.isUnbreakable || t.isInfiltrationSpec || t.isFortEngineer || t.isConcealSpec) return 'special';
    if (t.supportType || t.aaType || t.isFieldMedic || t.isFirstAidKit || t.isRepairCrew || t.isSimpleEngineering || (t.supplyRegen || 0) > 0 || (t.supplySteal || 0) > 0 || t.id === 'recon_support' || t.id === 'engineering_support') return 'support';
    return 'combat';
  }

  function renderTraitsTab() {
    const state = ID.state;
    const container = document.getElementById('traits-list-container');
    if (!container || !state) return;

    const activeCat = uiState.traitsCategoryFilter || 'all';
    const searchQ = (document.getElementById('traits-dir-search')?.value || '').trim().toLowerCase();
    const allTraits = state.traits || [];
    const filteredTraits = allTraits.filter(t => {
      if (activeCat !== 'all' && classifyTraitCategory(t) !== activeCat) return false;
      const dispName = loc('trait', t.id, 'name', t.name) || '';
      const dispDesc = loc('trait', t.id, 'desc', t.desc) || '';
      if (searchQ && !dispName.toLowerCase().includes(searchQ) && !dispDesc.toLowerCase().includes(searchQ) && !(t.name || '').toLowerCase().includes(searchQ)) return false;
      return true;
    });
    const tCountEl = document.getElementById('traits-dir-count');
    if (tCountEl) tCountEl.textContent = `${filteredTraits.length} / ${allTraits.length} TRAITS`;

    if (filteredTraits.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-8 font-mono text-xs text-slate-400 border border-dashed border-slate-800">No traits match the current filter.</div>`;
      return;
    }

    container.innerHTML = filteredTraits.map(t => `
      <div class="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between gap-2">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs sm:text-sm text-amber-300">${escapeHtml(loc('trait', t.id, 'name', t.name))}</span>
            <button type="button" data-action="trait-edit" data-id="${escapeHtml(t.id)}" class="text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">✎ Edit</button>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">${escapeHtml(loc('trait', t.id, 'desc', t.desc))}</p>
          <div class="flex flex-wrap gap-1 mt-2 text-[10px] font-mono text-slate-300">
            ${t.atkPct ? `<span class="px-1.5 py-0.5 rounded bg-slate-900">Atk ${t.atkPct > 0 ? '+' : ''}${t.atkPct}%</span>` : ''}
            ${t.defPct ? `<span class="px-1.5 py-0.5 rounded bg-slate-900">Def ${t.defPct > 0 ? '+' : ''}${t.defPct}%</span>` : ''}
            ${t.pierceFlat ? `<span class="px-1.5 py-0.5 rounded bg-slate-900">Pierce +${t.pierceFlat}</span>` : ''}
            ${t.hardnessFlat ? `<span class="px-1.5 py-0.5 rounded bg-slate-900">Hardness +${t.hardnessFlat}</span>` : ''}
            ${t.vigilance ? `<span class="px-1.5 py-0.5 rounded bg-slate-900">Vig ${t.vigilance > 0 ? '+' : ''}${t.vigilance}</span>` : ''}
            ${t.pursueBonus ? `<span class="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300">Pursuit ${t.pursueBonus > 0 ? '+' : ''}${t.pursueBonus}</span>` : ''}
            ${t.retreatBonus ? `<span class="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300">Retreat ${t.retreatBonus > 0 ? '+' : ''}${t.retreatBonus}</span>` : ''}
            ${t.terrainTarget ? `<span class="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300">${escapeHtml(t.terrainTarget)} +${t.terrainBonus}%</span>` : ''}
            ${t.antiCategory ? `<span class="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300">Anti-${escapeHtml(t.antiCategory)} +${t.antiBonus}%</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  function setCommandersFilter(cat) {
    uiState.commandersFilter = cat || 'all';
    document.querySelectorAll('#cmd-cat-pills .orbat-filter-pill').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.cat === uiState.commandersFilter);
    });
    renderCommandersTab();
  }

  function renderCommandersTab() {
    const state = ID.state;
    if (!state) return;

    const chkContainer = document.getElementById('cmd-traits-checkboxes');
    const traitsList = state.commanderTraits || D.DEFAULT_COMMANDER_TRAITS || [];

    if (chkContainer) {
      const checked = Array.from(chkContainer.querySelectorAll('input:checked')).map(i => i.value);
      chkContainer.innerHTML = traitsList.map(ct => {
        const ctName = loc('cmdTrait', ct.id, 'name', ct.name);
        const ctDesc = loc('cmdTrait', ct.id, 'desc', ct.desc);
        return `
        <div class="flex items-start justify-between gap-2 p-1 rounded hover:bg-slate-900">
          <label class="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
            <input type="checkbox" value="${escapeHtml(ct.id)}" class="cmd-trait-chk mt-0.5 accent-amber-500" ${checked.includes(ct.id) ? 'checked' : ''}>
            <div class="min-w-0">
              <div class="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                ${escapeHtml(ctName)}
                ${ct.rallyDurationRed ? `<span class="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-mono text-[9px] border border-amber-800">-${ct.rallyDurationRed} Rally Rd</span>` : ''}
                ${ct.rallyCheckBonus ? `<span class="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono text-[9px] border border-emerald-800">+${ct.rallyCheckBonus} Rally Roll</span>` : ''}
                ${ct.targetUnitCategory ? `<span class="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 font-mono text-[9px] border border-sky-800">${escapeHtml(ct.targetUnitCategory.toUpperCase())} ONLY</span>` : ''}
              </div>
              <div class="text-[11px] text-slate-400">${escapeHtml(ctDesc)}</div>
            </div>
          </label>
          <button type="button" data-action="cmd-trait-edit" data-id="${escapeHtml(ct.id)}" class="shrink-0 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700" title="Edit or delete ${escapeHtml(ctName)}">✎ Edit</button>
        </div>
      `;
      }).join('');
    }

    const listContainer = document.getElementById('commanders-list-container');
    if (!listContainer) return;

    const C = getCombat();

    const activeDoc = uiState.commandersFilter || 'all';
    const cmdQ = (document.getElementById('cmd-roster-search')?.value || '').trim().toLowerCase();
    const allCmds = state.commanders || [];
    const filteredCmds = allCmds.filter(c => {
      if (activeDoc !== 'all' && (c.personality || 'Balanced') !== activeDoc) return false;
      if (cmdQ) {
        const rankTitle = (resolveOfficerRank(c)?.title || '').toLowerCase();
        const hay = `${c.name || ''} ${c.personality || ''} ${rankTitle}`.toLowerCase();
        if (!hay.includes(cmdQ)) return false;
      }
      return true;
    });
    const cCountEl = document.getElementById('cmd-roster-count');
    if (cCountEl) cCountEl.textContent = `${filteredCmds.length} / ${allCmds.length} GENERALS`;

    if (filteredCmds.length === 0) {
      listContainer.innerHTML = `<div class="col-span-full text-center py-8 font-mono text-xs text-slate-400 border border-dashed border-slate-800">No commanders match the current filter.</div>`;
      return;
    }

    listContainer.innerHTML = filteredCmds.map(c => {
      const traitNames = (c.traits || []).map(tid => {
        const ct = C.getCommanderTraitById ? C.getCommanderTraitById(tid) : null;
        return ct ? loc('cmdTrait', tid, 'name', ct.name) : tid;
      }).filter(Boolean).join(', ');
      const officerRank = resolveOfficerRank(c);
      const safeCid = escapeHtml(c.id);
      return `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
          <div>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                ${officerRank.svg ? `<span class="inline-flex items-center justify-center px-1.5 py-0.5 bg-[#191f1a] border border-[#4a4128] shrink-0" title="${escapeHtml(officerRank.title)} (Total Stats: ${officerRank.total})">${officerRank.svg}</span>` : ''}
                <div class="min-w-0 space-y-1">
                  <span class="mil-cmd-plate" title="${escapeHtml(c.name)}"><span class="mil-cmd-plate-text">${escapeHtml(c.name)}</span></span>
                  <span class="text-[10px] font-mono text-[#c8a24b] uppercase tracking-wider block">${escapeHtml(officerRank.title)} · TOTAL ${officerRank.total}</span>
                </div>
              </div>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">${escapeHtml(c.personality)}</span>
            </div>

            <div class="grid grid-cols-2 gap-1.5 my-2 p-2 rounded bg-slate-900 text-[10px] font-mono">
              <div>ATK: <b class="text-[#c8a24b]">Lvl ${c.attackLevel || 0} (+${((c.attackLevel || 0) * 2.5).toFixed(1)}%)</b></div>
              <div>DEF: <b class="text-[#8ec0e8]">Lvl ${c.defenseLevel || 0} (+${((c.defenseLevel || 0) * 2.5).toFixed(1)}%)</b></div>
              <div>CMD: <b class="text-[#89b884]">Lvl ${c.commandLevel || 0} (+${((c.commandLevel || 0) * 2.5).toFixed(1)}%)</b></div>
              <div>LOG: <b class="text-[#c0a8d8]">Lvl ${c.logisticsLevel || 0} (+${((c.logisticsLevel || 0) * 2.5).toFixed(1)}%)</b></div>
            </div>

            <p class="text-xs text-slate-400 mt-1"><b>Traits:</b> ${escapeHtml(traitNames || 'None')}</p>
          </div>
          <div class="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
            <button type="button" data-action="cmd-edit" data-id="${safeCid}" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">✎ Edit</button>
            ${c.id !== 'cmd_none' ? `<button type="button" data-action="cmd-delete" data-id="${safeCid}" class="ml-auto px-2.5 py-1 rounded bg-[#1c1a1a] hover:bg-[#2b2020] border border-[#6e5252] text-[#d6a9a7]">Erase</button>` : ''}
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
        `<option value="${escapeHtml(k)}" ${cur === k ? 'selected' : ''}>${escapeHtml(loc('terrain', k, 'name', state.terrains[k].name))}</option>`
      ).join('');
      if (!document.getElementById('terr-name')?.value) {
        if (ID.App && ID.App.loadTerrainIntoForm) ID.App.loadTerrainIntoForm();
      }
    }

    const tbody = document.getElementById('terrain-matrix-tbody');
    if (tbody) {
      const fmtMod = (val, suffix = '%') => {
        const n = Number(val || 0);
        if (n > 0) return `<span class="text-[#8fb888] font-semibold">+${n}${suffix}</span>`;
        if (n < 0) return `<span class="text-[#d47a75] font-semibold">${n}${suffix}</span>`;
        return `<span class="text-[#9ca69a]">0${suffix}</span>`;
      };
      const fmtSup = (val) => {
        const n = Number(val || 0);
        if (n > 0) return `<span class="text-[#d47a75] font-semibold">+${n}</span>`;
        return `<span class="text-[#9ca69a]">+0</span>`;
      };
      tbody.innerHTML = Object.keys(state.terrains || {}).map(k => {
        const t = state.terrains[k];
        return `
          <tr class="hover:bg-slate-950/60">
            <td class="py-2 px-2 font-bold text-white">${escapeHtml(loc('terrain', k, 'name', t.name))} ${t.isUrban ? '<span class="text-[10px] text-amber-400">(Urban)</span>' : ''}</td>
            <td class="py-2 px-2 font-mono">${fmtMod(t.infAtk)} <span class="text-[#6c756b]">/</span> ${fmtMod(t.infDef)}</td>
            <td class="py-2 px-2 font-mono">${fmtMod(t.avAtk)} <span class="text-[#6c756b]">/</span> ${fmtMod(t.avDef)}</td>
            <td class="py-2 px-2 font-mono">${fmtMod(t.tankAtk)} <span class="text-[#6c756b]">/</span> ${fmtMod(t.tankDef)}</td>
            <td class="py-2 px-2 font-mono">${fmtMod(t.artAtk)} <span class="text-[#6c756b]">/</span> ${fmtMod(t.artDef)}</td>
            <td class="py-2 px-2 font-mono">Vig ${fmtMod(t.vigMod, '')} <span class="text-[#6c756b]">|</span> Sup ${fmtSup(t.supplyDrain)}</td>
            <td class="py-2 px-2 font-mono text-amber-300">Dig ${t.maxEntrench ?? 4} | Cap ${t.outnumberCap ?? 100}%</td>
          </tr>
        `;
      }).join('');
    }

    const featList = document.getElementById('features-matrix-list');
    if (featList) {
      featList.innerHTML = Object.values(D.TERRAIN_FEATURES || {}).map(f => `
        <div class="p-2 rounded bg-slate-950 border border-slate-800">
          <div class="font-semibold text-white">${escapeHtml(f.name)}</div>
          <div class="text-slate-400 text-[11px]">${escapeHtml(f.desc)}</div>
        </div>
      `).join('');
    }

    const weathList = document.getElementById('weather-matrix-list');
    if (weathList) {
      weathList.innerHTML = Object.values(D.WEATHER_TYPES || {}).map(w => `
        <div class="p-2 rounded bg-slate-950 border border-slate-800">
          <div class="font-semibold text-white">${escapeHtml(w.name)} <span class="font-mono text-[10px] text-sky-400">(Air ${w.airMod || 0}%)</span></div>
          <div class="text-slate-400 text-[11px]">${escapeHtml(w.desc)}</div>
        </div>
      `).join('');
    }

    const todList = document.getElementById('timeofday-matrix-list');
    if (todList) {
      todList.innerHTML = Object.values(D.TIME_OF_DAY_TYPES || {}).map(td => `
        <div class="p-2 rounded bg-slate-950 border border-slate-800">
          <div class="font-semibold text-white">${escapeHtml(td.name)} <span class="font-mono text-[10px] text-emerald-400">(Air ${td.airMod || 0}%${td.visCap ? ' | Vis ' + td.visCap : ''})</span></div>
          <div class="text-slate-400 text-[11px]">${escapeHtml(td.desc)}</div>
        </div>
      `).join('');
    }

    const hazList = document.getElementById('hazards-matrix-list');
    if (hazList) {
      hazList.innerHTML = Object.values(D.COMPOUND_HAZARDS || {}).map(hz => `
        <div class="p-2 rounded bg-slate-950 border border-slate-800">
          <div class="font-semibold text-rose-300">${escapeHtml(hz.name)}</div>
          <div class="text-amber-400/90 font-mono text-[10px] mb-0.5">${escapeHtml(hz.trigger)}</div>
          <div class="text-slate-400 text-[11px]">${escapeHtml(hz.desc)}</div>
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
  <style>
    @page { size: A4; margin: 14mm; }
    body { margin: 0; padding: 14px; background: ${bg}; color: ${fg}; font-family: 'IBM Plex Sans Condensed', 'Segoe UI', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .tactics-book { border: 2px solid ${bdr}; padding: 0; background: ${bg}; color: ${fg}; }
    .tactics-book-bar { background: #252e24; color: #f4f1e6; padding: 8px 16px; font-family: 'IBM Plex Mono', Consolas, 'Courier New', monospace; font-size: 10pt; display: flex; justify-content: space-between; }
    .tactics-book-body { padding: 18px 20px; }
    .tactics-sec-block { border: 1px solid ${bdr}; background: ${boxBg}; padding: 10px 12px; margin-bottom: 10px; }
    .tactics-sec-head { font-family: 'Chakra Petch', 'Segoe UI', sans-serif; text-transform: uppercase; border-bottom: 1.5px solid ${bdr}; padding-bottom: 3px; margin: 0 0 6px 0; font-size: 11pt; }
    .tactics-mod-strip { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border: 1px solid ${bdr}; background: ${boxBg}; font-family: 'IBM Plex Mono', Consolas, 'Courier New', monospace; font-size: 9pt; margin-bottom: 10px; }
    .tactics-mod-chip { padding: 2px 6px; border: 1px solid ${bdr}; font-weight: bold; }
    .tactics-book-footer, button { display: none !important; }
    .tactics-toc-row { display: flex; justify-content: space-between; border-bottom: 1px dotted ${bdr}; padding: 4px 0; font-family: 'IBM Plex Mono', Consolas, 'Courier New', monospace; font-size: 9.5pt; }
    .tactics-toc-group-title { font-family: 'Chakra Petch', 'Segoe UI', sans-serif; font-weight: bold; background: #252e24; color: #f4f1e6; padding: 4px 8px; margin-top: 10px; }
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
    const yyyy = H.formatYearLabel ? H.formatYearLabel(d.getUTCFullYear()) : String(d.getUTCFullYear());
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
      acc.armorRec += (u.recoverableArmor || 0) + (u.abandonedArmor || 0);
      acc.armorTowed += (u.towedArmor || 0);
      acc.armorUnrec += (u.unrecoverableArmor || 0);
      if (!u.isMonster && !u.isZombie) {
        acc.supplyMax += (u.maxSupply || 0);
        acc.supplyRem += Math.max(0, u.supply || 0);
      }
      const st = u.stats || {};
      acc.inflictedCas += (st.casualtiesInflicted || 0);
      acc.inflictedAfv += (st.afvsDisabled || 0);
      acc.inflictedAfvKo += (st.afvsDestroyed || 0);
      acc.indirectCas += (st.indirectCasualtiesInflicted || 0);
      acc.airCas += (st.airCasualtiesInflicted || 0);
      acc.fieldRepairs += (st.fieldRepairs || 0);
      if (u.defeated) acc.defeatedCount += 1;
      return acc;
    }, {
      unitCount: 0, start: 0, rem: 0, dead: 0, wounded: 0, captured: 0, escaped: 0,
      armorStart: 0, armorRem: 0, armorRec: 0, armorTowed: 0, armorUnrec: 0,
      supplyMax: 0, supplyRem: 0, defeatedCount: 0,
      inflictedCas: 0, inflictedAfv: 0, inflictedAfvKo: 0, indirectCas: 0, airCas: 0, fieldRepairs: 0
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

  function formatUnitDisposition(u) {
    if (!u) return 'OPERATIONAL';
    if (!u.defeated) {
      if (u.isRallying) return 'REAR RALLY';
      if (u.isDismounted) return 'DISMOUNTED (OP)';
      return 'OPERATIONAL';
    }
    const r = String(u.defeatReason || '').toLowerCase();
    if (r.includes('unscreened artillery')) return 'WITHDRAWN (UNSCREENED)';
    if (r.includes('combat-ready armor') || r.includes('0 combat-ready')) return 'WITHDRAWN (0 AFV)';
    if (r.includes('all personnel eliminated')) return 'WIPED OUT';
    if (r.includes('unbreakable')) return 'SHATTERED';
    if (r.includes('permanently routed') || r.includes('organization broke')) return 'ROUTED';
    if (r.includes('rally') || r.includes('dispersed') || r.includes('fumble') || r.includes('deserted')) return 'DISPERSED';
    return 'OUT OF ACTION';
  }

  function buildWeatherTrail(logs = [], fallbackWeather = 'Clear', startClock = '') {
    const shifts = [];
    for (const l of (logs || [])) {
      const txt = typeof l === 'string' ? l : (l.text || '');
      if (!txt.includes('[Weather Shift]')) continue;
      const m = txt.match(/shifts from ([^-]+?)\s*->\s*([^(!]+?)(?:\s*\([^)]*\))?!/i);
      if (m) {
        shifts.push({ from: m[1].trim(), to: m[2].trim(), clock: l.clock || '' });
      }
    }
    if (shifts.length === 0) return fallbackWeather || 'Clear';
    const trail = [`${shifts[0].from}${startClock ? ` (${startClock})` : ''}`];
    for (const s of shifts) {
      trail.push(`${s.to}${s.clock ? ` (${s.clock})` : ''}`);
    }
    return trail.join(' → ');
  }

  function extractAARChronology(logs = []) {
    if (!logs || logs.length === 0) return [];
    const endgameKeys = ['BATTLE OVER', 'AUTOMATIC OVERRUN', 'FIELD SALVAGE', 'BEAST RAMPAGE', 'NO QUARTER'];
    const majorKeys = [
      '[Weather Shift]', 'Decisive Breakthrough', 'Unscreened Artillery Withdrawal',
      'withdraws from the sector', 'withdraws to depot', 'wiped out',
      'Unbreakable Stand', 'Unbreakable Shattered', 'AA Gun CRITICAL', 'MORTAR TRACK BLOWN'
    ];
    const secondaryKeys = [
      'Rout & Scatter', 'Rout & Fallback', 'Rallied to the Line', 'Rally Failed', 'permanently routed'
    ];
    const allKeys = [...endgameKeys, ...majorKeys, ...secondaryKeys];

    const matched = [];
    logs.forEach((l, idx) => {
      const txt = (l && l.text) ? l.text : '';
      if (!allKeys.some(k => txt.includes(k))) return;
      const tier = endgameKeys.some(k => txt.includes(k)) ? 3
        : (majorKeys.some(k => txt.includes(k)) ? 2 : 1);
      matched.push({ log: l, idx, round: Number(l.round || 1), tier });
    });

    const MAX_ITEMS = 18;
    if (matched.length <= MAX_ITEMS) return matched.map(m => m.log);

    const selectedIdx = new Set();
    // 1. Always preserve endgame milestones
    const endgameItems = matched.filter(m => m.tier === 3);
    for (const m of endgameItems) selectedIdx.add(m.idx);

    // 2. Always preserve the opening milestone
    if (matched.length > 0) selectedIdx.add(matched[0].idx);

    // 3. Distribute remaining budget evenly across Opening / Mid-Battle / Late phases
    const remaining = matched.filter(m => !selectedIdx.has(m.idx));
    const minRd = matched[0].round;
    const maxRd = matched[matched.length - 1].round;
    const span = Math.max(1, maxRd - minRd);
    const t1 = minRd + span / 3;
    const t2 = minRd + (2 * span) / 3;

    const buckets = [
      remaining.filter(m => m.round <= t1),
      remaining.filter(m => m.round > t1 && m.round <= t2),
      remaining.filter(m => m.round > t2)
    ];

    const budget = Math.max(0, MAX_ITEMS - selectedIdx.size);
    const baseQuota = Math.floor(budget / 3);
    let extra = budget - baseQuota * 3;

    const pickFromBucket = (bucket, count) => {
      if (count <= 0 || bucket.length === 0) return [];
      // Prioritize tier 2 (major events / weather / withdrawals) over tier 1 (routs/rallies)
      const majors = bucket.filter(m => m.tier === 2);
      const minors = bucket.filter(m => m.tier === 1);
      const chosen = [];
      const addEvenly = (arr, limit) => {
        if (arr.length <= limit) {
          chosen.push(...arr);
        } else if (limit > 0) {
          const step = arr.length / limit;
          for (let i = 0; i < limit; i++) {
            chosen.push(arr[Math.min(arr.length - 1, Math.floor(i * step))]);
          }
        }
      };
      addEvenly(majors, count);
      if (chosen.length < count) {
        addEvenly(minors, count - chosen.length);
      }
      return chosen;
    };

    const leftovers = [];
    for (let b = 0; b < 3; b++) {
      const q = baseQuota + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
      const picked = pickFromBucket(buckets[b], q);
      for (const p of picked) selectedIdx.add(p.idx);
      if (picked.length < q) {
        extra += (q - picked.length);
      }
      for (const m of buckets[b]) {
        if (!selectedIdx.has(m.idx)) leftovers.push(m);
      }
    }

    // Fill any remaining slots if a bucket was sparse
    if (selectedIdx.size < MAX_ITEMS && leftovers.length > 0) {
      const need = MAX_ITEMS - selectedIdx.size;
      const step = leftovers.length / need;
      for (let i = 0; i < need && i < leftovers.length; i++) {
        selectedIdx.add(leftovers[Math.min(leftovers.length - 1, Math.floor(i * step))].idx);
      }
    }

    return matched.filter(m => selectedIdx.has(m.idx)).map(m => m.log);
  }

  function getSideLogisticsSnapshot(rep, sideKey) {
    if (rep && rep.logistics && rep.logistics[sideKey]) return rep.logistics[sideKey];
    const sideState = ID.state && ID.state.battle ? (sideKey === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB) : null;
    const units = sideKey === 'A' ? (rep.sideA || []) : (rep.sideB || []);
    const living = units.filter(u => !u.isMonster && !u.isZombie);
    const depotStart = Number(sideState?.maxSupplyDepot || 0);
    const depotRem = Math.max(0, Number(sideState?.supplyDepot || 0));
    const depotExpended = Math.max(0, depotStart - depotRem);
    return {
      depotStart,
      depotRem,
      depotExpended,
      depotExpPct: depotStart > 0 ? Math.round((depotExpended / depotStart) * 100) : 0,
      supplyRaided: Number(sideState?.supplyRaidedTotal || 0),
      criticalSupplyCount: living.filter(u => u.supplyBelow20Triggered || (u.maxSupply > 0 && (u.supply / u.maxSupply) < 0.25)).length,
      exhaustedCount: living.filter(u => u.maxSupply > 0 && u.supply <= 0).length,
      depotCriticalClock: sideState?.depotCriticalClock || ""
    };
  }

  function buildG3TelemetryFindings(rep, sumA, sumB, logA, logB, isPrintable) {
    const findings = [];
    const labelA = rep.sideAName || H.getSideName('A');
    const labelB = rep.sideBName || H.getSideName('B');

    // 1. Notable Formations (Top Casualty & Top Anti-Armor)
    const findTop = (units, getter) => {
      let best = null;
      let bestVal = 0;
      for (const u of (units || [])) {
        const val = getter(u);
        if (val > bestVal) { bestVal = val; best = u; }
      }
      return best ? { unit: best, val: bestVal } : null;
    };

    const winSide = rep.winner === 'B' ? 'B' : 'A';
    const winUnits = winSide === 'B' ? (rep.sideB || []) : (rep.sideA || []);
    const winName = winSide === 'B' ? labelB : labelA;
    const topCasWin = findTop(winUnits, u => (u.stats?.casualtiesInflicted || 0));
    const topAfvWin = findTop(winUnits, u => (u.stats?.afvsDisabled || 0));
    const topRepWin = findTop(winUnits, u => (u.stats?.fieldRepairs || 0));

    if (topCasWin && topCasWin.val >= 20) {
      const sameUnit = topAfvWin && topAfvWin.unit === topCasWin.unit && topAfvWin.val >= 3;
      if (sameUnit) {
        findings.push(`Notable Formation (${winName}): ${stripEmojisForAAR(topCasWin.unit.name)} led combat output, inflicting ${topCasWin.val.toLocaleString()} enemy casualties and disabling ${topAfvWin.val} enemy armored vehicles (${topAfvWin.unit.stats?.afvsDestroyed || 0} destroyed).`);
      } else {
        findings.push(`Notable Formation (${winName}): ${stripEmojisForAAR(topCasWin.unit.name)} inflicted the highest enemy personnel losses (${topCasWin.val.toLocaleString()} casualties).`);
        if (topAfvWin && topAfvWin.val >= 3) {
          findings.push(`Anti-Armor Citation (${winName}): ${stripEmojisForAAR(topAfvWin.unit.name)} led anti-armor engagements with ${topAfvWin.val} enemy vehicles knocked out (${topAfvWin.unit.stats?.afvsDestroyed || 0} destroyed).`);
        }
      }
    } else if (topAfvWin && topAfvWin.val >= 3) {
      findings.push(`Anti-Armor Citation (${winName}): ${stripEmojisForAAR(topAfvWin.unit.name)} led anti-armor engagements with ${topAfvWin.val} enemy vehicles knocked out (${topAfvWin.unit.stats?.afvsDestroyed || 0} destroyed).`);
    }

    if (topRepWin && topRepWin.val >= 3) {
      findings.push(`Field Maintenance: ${stripEmojisForAAR(topRepWin.unit.name)} organic recovery crews restored ${topRepWin.val} disabled armored vehicles back to operational status during the engagement.`);
    }

    // 2. Indirect Fire & Air Support Attribution
    const enemyCasFromA = Math.max(1, sumA.inflictedCas || (sumB.dead + sumB.wounded));
    const enemyCasFromB = Math.max(1, sumB.inflictedCas || (sumA.dead + sumA.wounded));
    const indPctA = sumA.indirectCas > 0 ? Math.round((sumA.indirectCas / enemyCasFromA) * 100) : 0;
    const indPctB = sumB.indirectCas > 0 ? Math.round((sumB.indirectCas / enemyCasFromB) * 100) : 0;
    const airPctA = sumA.airCas > 0 ? Math.round((sumA.airCas / enemyCasFromA) * 100) : 0;
    const airPctB = sumB.airCas > 0 ? Math.round((sumB.airCas / enemyCasFromB) * 100) : 0;

    if (indPctA >= 12 || indPctB >= 12) {
      const parts = [];
      if (indPctA >= 12) parts.push(`${labelA} indirect fire accounted for ${indPctA}% of opposing combat casualties (${sumA.indirectCas.toLocaleString()})`);
      if (indPctB >= 12) parts.push(`${labelB} indirect fire accounted for ${indPctB}% (${sumB.indirectCas.toLocaleString()})`);
      findings.push(`Fire Support Impact: ${parts.join('; ')}.`);
    }
    if (airPctA >= 5 || airPctB >= 5) {
      const parts = [];
      if (airPctA >= 5) parts.push(`${labelA} close air support inflicted ${sumA.airCas.toLocaleString()} casualties (${airPctA}%)`);
      if (airPctB >= 5) parts.push(`${labelB} close air support inflicted ${sumB.airCas.toLocaleString()} casualties (${airPctB}%)`);
      findings.push(`Air Interdiction: ${parts.join('; ')}.`);
    }

    // 3. Logistics & Supply Strain
    const logParts = [];
    if (logA.depotStart > 0) {
      logParts.push(`${labelA} expended ${logA.depotExpPct}% of theatre depot stocks (${logA.depotRem}/${logA.depotStart} remaining${logA.criticalSupplyCount > 0 ? `, ${logA.criticalSupplyCount} formation(s) hit critical supply` : ''}${logA.depotCriticalClock ? `, depot critical at ${logA.depotCriticalClock} HRS` : ''})`);
    }
    if (logB.depotStart > 0) {
      logParts.push(`${labelB} expended ${logB.depotExpPct}% (${logB.depotRem}/${logB.depotStart} remaining${logB.criticalSupplyCount > 0 ? `, ${logB.criticalSupplyCount} formation(s) hit critical supply` : ''}${logB.depotCriticalClock ? `, depot critical at ${logB.depotCriticalClock} HRS` : ''})`);
    }
    if (logParts.length > 0) {
      findings.push(`Logistics Expenditure: ${logParts.join('; ')}.`);
    }

    return findings;
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

    const logA = getSideLogisticsSnapshot(rep, 'A');
    const logB = getSideLogisticsSnapshot(rep, 'B');
    notes.push(...buildG3TelemetryFindings(rep, sumA, sumB, logA, logB, false));
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
      timestamp: H.getSimulatedBattleDate ? H.getSimulatedBattleDate(state.battle.round).toISOString() : new Date().toISOString(),
      simStartClock: H.formatSimulatedClock ? H.formatSimulatedClock(H.getSimulatedBattleDate(1)) : '',
      simEndClock: H.formatSimulatedClock ? H.formatSimulatedClock(H.getSimulatedBattleDate(state.battle.round)) : '',
      roundDurationLabel: H.getRoundDurationLabel ? H.getRoundDurationLabel() : '30 MIN/RD',
      winner: state.battle.winner,
      rounds: state.battle.round,
      terrain: state.environment.terrain,
      feature: state.environment.feature,
      weather: state.environment.weather,
      weatherTrail: buildWeatherTrail(state.battle.logs, state.environment.weather, H.formatSimulatedClock ? H.formatSimulatedClock(H.getSimulatedBattleDate(1)) : ''),
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
                  <th class="text-right">AFV (Start | Act/Rec/Tow/KO)</th>
                  <th class="text-right">Inflicted (Cas/AFV)</th>
                </tr>
              </thead>
              <tbody>
                ${units.map(u => `
                  <tr>
                    <td class="font-bold">${escapeHtml(stripEmojisForAAR(u.name))}</td>
                    <td class="uppercase text-[10px] font-bold ${u.defeated ? 'text-[#8b2e2a]' : (u.isRallying ? 'text-[#7c5b1e]' : 'text-[#2f5e2c]')}">${formatUnitDisposition(u)}</td>
                    <td class="text-right">${u.personnel}/${u.maxPersonnel}</td>
                    <td class="text-right">${(u.isMonster || u.isZombie) ? 'N/A' : `${u.org}/${u.maxOrg}`}</td>
                    <td class="text-right"><span class="text-[#8b2e2a] font-bold">${u.dead}</span> / <span class="text-[#7c5b1e]">${u.wounded}</span></td>
                    <td class="text-right"><span class="text-[#563d7c]">${u.captured || 0}</span> / <span class="text-[#2f5e2c]">${u.escaped || 0}</span></td>
                    <td class="text-right">${(u.originalMaxArmor > 0 || u.maxArmor > 0) ? `${u.originalMaxArmor || u.maxArmor} | ${u.armor}/${(u.recoverableArmor || 0) + (u.abandonedArmor || 0)}/${u.towedArmor || 0}/${u.unrecoverableArmor}` : '—'}</td>
                    <td class="text-right">${(u.stats?.casualtiesInflicted || 0)} / ${(u.stats?.afvsDisabled || 0)}</td>
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
                  <td class="text-right">${sum.armorStart > 0 ? `${sum.armorStart} | ${sum.armorRem}/${sum.armorRec}/${sum.armorTowed}/${sum.armorUnrec}` : '—'}</td>
                  <td class="text-right">${sum.inflictedCas} / ${sum.inflictedAfv}</td>
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
          <span>DOC-REF: ${escapeHtml(rep.docId || 'AAR-ID-001')} | DTG: ${dtg}${rep.simStartClock ? ` | OP WINDOW: ${escapeHtml(rep.simStartClock)} - ${escapeHtml(rep.simEndClock || '')} HRS (${escapeHtml(rep.roundDurationLabel || '30 MIN/RD')})` : ''}</span>
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
            <div class="p-2 bg-[#faf8f2] border border-[#bfb7a2]">CAPTURED &amp; IMPRESSED: <b class="text-[#2f5e2c]">${salvage.impressed}</b></div>
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
  function sanitizeForPrintableAAR(text) {
    return stripEmojisForAAR(text)
      // Remove leading engine category tags like [RLY], [ROUT], [MOV], [BRCH], [VIC], [AFV], [KIA], [POW], [BRK], [CRIT], [SHK], [SYS], [CAS], [NO-QTR]
      .replace(/^\s*(?:\[(?:RLY|ROUT|MOV|BRCH|VIC|AFV|KIA|POW|BRK|CRIT|SHK|SYS|CAS|NO-QTR|OP|LOG|TAC|HOLD|WARN|MED|ENTR|WTH|ENV)\]\s*)+/gi, '')
      // Remove dice formulas, roll results, and DC comparisons
      .replace(/\(d\d+\[[^\]]*\][\s\S]*?vs DC \d+(?:\s*\[[^\]]*\])?\)/gi, '')
      .replace(/\(d\d+\[[^\]]*\][^)]*\)/gi, '')
      .replace(/\(Roll[^)]*\)/gi, '')
      .replace(/\(Avg Speed:[^)]*\)/gi, '')
      .replace(/\(50\+d50\[[^\]]*\]\)=[^:]*:/gi, ':')
      .replace(/\(d100\[[^\]]*\]\)[^:]*:/gi, ':')
      // Remove round timers and round indices
      .replace(/\s*\(\+?\d+\s*(?:rds?|rounds?)\s*(?:to rally|delay)?\)/gi, '')
      .replace(/\s+in Round \d+/gi, '')
      .replace(/\[RD-\d+\]/gi, '')
      // Translate game-engine stats into in-universe military phrasing
      .replace(/reached 0 Organization!\s*Cohesion broke and the unit is permanently routed!/gi, 'lost combat cohesion and routed from the sector.')
      .replace(/PASSED Rally Check\s*!/gi, 'rallied and returned to the line:')
      .replace(/FAILED Rally Check\s*!/gi, 'failed to reform and dispersed:')
      .replace(/,\s*Org:\s*\d+\/\d+\.?/gi, '.')
      .replace(/,\s*-?\d+\s*Mobility Class!?/gi, ' (mobility degraded).')
      .replace(/\s*\(\+\d+\s*Supply\)/gi, ' for depot spares')
      .replace(/Beutepanzers restored/gi, 'captured vehicles impressed')
      .replace(/\[Weather Shift\]\s*Theatre weather shifts from ([^-]+?)\s*->\s*/gi, 'Weather shifted from $1 to ')
      .replace(/gains\s+\+?\d+\s+Org\s+for\s+smashing/gi, 'bolstered unit cohesion after breaking')
      .replace(/\[AA Gun CRITICAL\s+\d+!\]/gi, '[Anti-Aircraft Barrage]')
      .replace(/Ret \d+ vs Pur \d+\s*->\s*/gi, '')
      .replace(/Pur \d+ > Ret \d+\s*->\s*/gi, '')
      .replace(/\(\s*\)/g, '')
      .replace(/\.\s*\./g, '.')
      .replace(/!\s*\./g, '!')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function buildPrintableAARHtml(rep) {
    const state = ID.state;
    const isOver = !!(state && state.battle && state.battle.isOver);
    const dtg = formatMilitaryDTG(rep.timestamp);
    const sumA = summarizeSideMetrics(rep.sideA);
    const sumB = summarizeSideMetrics(rep.sideB);
    const lossA = sumA.dead + sumA.wounded + sumA.captured;
    const lossB = sumB.dead + sumB.wounded + sumB.captured;
    const victoryInfo = classifyVictoryDegree(rep, sumA, sumB, isOver);
    const sideAName = rep.sideAName || H.getSideName('A');
    const sideBName = rep.sideBName || H.getSideName('B');
    const winName = rep.winner === 'B' ? sideBName : sideAName;
    const loseName = rep.winner === 'B' ? sideAName : sideBName;
    const atkName = (rep.theatreAttackerSide || 'A') === 'B' ? sideBName : sideAName;
    const dayOrdinal = H.getBattleDayOrdinal ? H.getBattleDayOrdinal(rep.rounds || state?.battle?.round || 1) : '1ST DAY';
    const chronology = extractAARChronology(state?.battle?.logs || []);
    const salvage = isOver ? (rep.salvage || state?.battle?.salvageReport) : null;

    const printAssessments = [];
    if (!isOver) {
      printAssessments.push(`Engagement in the ${rep.terrain} (${rep.feature}) sector remains ongoing as of ${dtg}.`);
    } else if (rep.winner === 'Draw') {
      printAssessments.push(`Mutual combat exhaustion reached in the ${rep.terrain} (${rep.feature}) sector; neither force retained operational capacity to hold the objective.`);
    } else {
      printAssessments.push(`${victoryInfo.label}: ${winName} secured the ${rep.terrain} (${rep.feature}) sector after neutralizing ${loseName}'s frontline cohesion.`);
    }
    printAssessments.push(`Total recorded personnel casualties: ${sideAName} sustained ${lossA.toLocaleString()} casualties (${sumA.dead.toLocaleString()} KIA, ${sumA.wounded.toLocaleString()} WIA, ${sumA.captured.toLocaleString()} POW); ${sideBName} sustained ${lossB.toLocaleString()} casualties (${sumB.dead.toLocaleString()} KIA, ${sumB.wounded.toLocaleString()} WIA, ${sumB.captured.toLocaleString()} POW).`);
    const totalArmorKoA = sumA.armorUnrec + sumA.armorRec;
    const totalArmorKoB = sumB.armorUnrec + sumB.armorRec;
    if (sumA.armorStart > 0 || sumB.armorStart > 0) {
      printAssessments.push(`Armored vehicle losses: ${sideAName} lost ${totalArmorKoA} vehicles (${sumA.armorUnrec} destroyed, ${sumA.armorRec} disabled); ${sideBName} lost ${totalArmorKoB} vehicles (${sumB.armorUnrec} destroyed, ${sumB.armorRec} disabled).`);
    }
    const logA = getSideLogisticsSnapshot(rep, 'A');
    const logB = getSideLogisticsSnapshot(rep, 'B');
    printAssessments.push(...buildG3TelemetryFindings(rep, sumA, sumB, logA, logB, true));
    const salvageStrippedCount = (isOver && salvage)
      ? (salvage.scrapped !== undefined ? salvage.scrapped : Math.max(0, (salvage.abandoned || 0) - (salvage.impressed || 0) - (salvage.scuttled || 0)))
      : 0;
    if (isOver && salvage && salvage.abandoned > 0) {
      printAssessments.push(`Field recovery units under ${winName} secured ${salvage.abandoned} abandoned enemy armored vehicles (${salvage.impressed} restored to service, ${salvageStrippedCount} stripped for spares, ${salvage.scuttled} written off).`);
    }
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
            <th class="num">AFV (Start | Act/Rec/Tow/KO)</th>
            <th class="num">Inflicted (Cas/AFV)</th>
          </tr>
        </thead>
        <tbody>
          ${units.map(u => `
            <tr>
              <td><strong>${escapeHtml(stripEmojisForAAR(u.name))}</strong></td>
              <td>${escapeHtml((u.category || '').replace(/_/g, ' ').toUpperCase())} / ${escapeHtml(u.experience || '')}</td>
              <td>${formatUnitDisposition(u)}</td>
              <td class="num">${u.maxPersonnel}</td>
              <td class="num">${u.personnel}</td>
              <td class="num">${u.dead}</td>
              <td class="num">${u.wounded}</td>
              <td class="num">${u.captured || 0}</td>
              <td class="num">${u.escaped || 0}</td>
              <td class="num">${(u.originalMaxArmor > 0 || u.maxArmor > 0) ? `${u.originalMaxArmor || u.maxArmor} | ${u.armor}/${(u.recoverableArmor || 0) + (u.abandonedArmor || 0)}/${u.towedArmor || 0}/${u.unrecoverableArmor}` : '—'}</td>
              <td class="num">${(u.stats?.casualtiesInflicted || 0)} / ${(u.stats?.afvsDisabled || 0)}</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td colspan="3"><strong>FORCE TOTALS</strong></td>
            <td class="num"><strong>${sum.start}</strong></td>
            <td class="num"><strong>${sum.rem}</strong></td>
            <td class="num"><strong>${sum.dead}</strong></td>
            <td class="num"><strong>${sum.wounded}</strong></td>
            <td class="num"><strong>${sum.captured}</strong></td>
            <td class="num"><strong>${sum.escaped}</strong></td>
            <td class="num"><strong>${sum.armorStart > 0 ? `${sum.armorStart} | ${sum.armorRem}/${sum.armorRec}/${sum.armorTowed}/${sum.armorUnrec}` : '—'}</strong></td>
            <td class="num"><strong>${sum.inflictedCas} / ${sum.inflictedAfv}</strong></td>
          </tr>
        </tbody>
      </table>
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(docTitle)}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 14mm 18mm 14mm;
      @bottom-left {
        content: "FORM DA-774 // ${escapeHtml(rep.docId || 'AAR-001')}";
        font-family: 'IBM Plex Mono', Consolas, 'Courier New', Courier, monospace;
        font-size: 7.5pt;
        color: #555555;
      }
      @bottom-right {
        content: "PAGE " counter(page) " OF " counter(pages);
        font-family: 'IBM Plex Mono', Consolas, 'Courier New', Courier, monospace;
        font-size: 7.5pt;
        font-weight: bold;
        color: #222222;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'IBM Plex Mono', Consolas, 'Courier New', Courier, monospace;
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
      break-after: avoid;
    }
    h3 {
      font-size: 10pt;
      text-transform: uppercase;
      margin: 10px 0 2px 0;
      page-break-after: avoid;
      break-after: avoid;
    }
    .meta-sub {
      font-size: 8.8pt;
      margin-bottom: 5px;
      color: #333;
      page-break-after: avoid;
      break-after: avoid;
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
    tfoot { display: table-row-group; }
    tfoot td, tr.totals-row td { background: #eceee9; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .box {
      border: 1px solid #111;
      padding: 8px 10px;
      margin-bottom: 10px;
      font-size: 9.2pt;
      break-inside: avoid;
    }
    .box.chron-box { break-inside: auto; }
    .chron-item {
      font-size: 8.5pt;
      margin-bottom: 3px;
      border-left: 2px solid #555;
      padding-left: 6px;
      break-inside: avoid;
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
  <div class="class-banner">UNCLASSIFIED // IRON DIVISION AFTER-ACTION REPORT</div>

  <div class="doc-header">
    <div class="doc-title-row">
      <div class="doc-title">AFTER-ACTION REPORT (AAR)</div>
      <div class="doc-form">FORM DA-774 // ${escapeHtml(rep.docId || 'AAR-001')}</div>
    </div>
    <div class="memo-grid">
      <div><strong>FROM:</strong> HQ COMBINED-ARMS COMMAND</div>
      <div><strong>DTG:</strong> ${dtg}</div>
      ${rep.simStartClock ? `<div><strong>OP WINDOW:</strong> ${escapeHtml(rep.simStartClock)} - ${escapeHtml(rep.simEndClock || '')} HRS</div>` : ''}
      <div><strong>TO:</strong> THEATRE OPERATIONS (G-3)</div>
      <div><strong>STATUS:</strong> ${isOver ? 'FINAL DEBRIEF' : 'INTERIM SITREP'}</div>
      <div><strong>SUBJECT:</strong> ${escapeHtml(rep.terrain.toUpperCase())} (${escapeHtml(rep.feature.toUpperCase())}) ENGAGEMENT</div>
      <div style="grid-column: 1 / -1;"><strong>METEO:</strong> ${escapeHtml((rep.weatherTrail || buildWeatherTrail(state?.battle?.logs || [], rep.weather, rep.simStartClock || '')).toUpperCase())}</div>
    </div>
  </div>

  <h2>1. Operational Executive Summary</h2>
  <div class="kpi-grid">
    <div class="kpi-cell">
      <span class="kpi-label">Operation Outcome</span>
      <span class="kpi-val">${isOver ? (rep.winner === 'Draw' ? 'MUTUAL EXHAUSTION' : `${escapeHtml(winName.toUpperCase())} — ${victoryInfo.shortLabel}`) : 'IN PROGRESS'}</span>
    </div>
    <div class="kpi-cell">
      <span class="kpi-label">Operational Day</span>
      <span class="kpi-val">${dayOrdinal}</span>
    </div>
    <div class="kpi-cell">
      <span class="kpi-label">Theatre Posture</span>
      <span class="kpi-val">${escapeHtml(atkName.toUpperCase())} ASSAULT</span>
    </div>
    <div class="kpi-cell">
      <span class="kpi-label">Sector Conditions</span>
      <span class="kpi-val">${escapeHtml(rep.terrain.toUpperCase())} · ${escapeHtml(rep.weather.toUpperCase())}</span>
    </div>
  </div>

  <table style="margin-top: 6px;">
    <thead>
      <tr>
        <th>Force Comparison Metric</th>
        <th class="num">${escapeHtml(sideAName.toUpperCase())}</th>
        <th class="num">${escapeHtml(sideBName.toUpperCase())}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Personnel Attrition (KIA + WIA + POW)</strong></td>
        <td class="num">${lossA.toLocaleString()} / ${sumA.start.toLocaleString()} (${sumA.start > 0 ? Math.round((lossA / sumA.start) * 100) : 0}%)</td>
        <td class="num">${lossB.toLocaleString()} / ${sumB.start.toLocaleString()} (${sumB.start > 0 ? Math.round((lossB / sumB.start) * 100) : 0}%)</td>
      </tr>
      <tr>
        <td><strong>KIA : WIA Ratio</strong></td>
        <td class="num">${sumA.dead > 0 ? `1 : ${(sumA.wounded / sumA.dead).toFixed(1)}` : (sumA.wounded > 0 ? `0 : ${sumA.wounded}` : '—')}</td>
        <td class="num">${sumB.dead > 0 ? `1 : ${(sumB.wounded / sumB.dead).toFixed(1)}` : (sumB.wounded > 0 ? `0 : ${sumB.wounded}` : '—')}</td>
      </tr>
      <tr>
        <td><strong>AFV Losses (Disabled / Destroyed KO)</strong></td>
        <td class="num">${sumA.armorStart > 0 ? `${totalArmorKoA} / ${sumA.armorStart} (${Math.round((totalArmorKoA / sumA.armorStart) * 100)}% — ${sumA.armorUnrec} KO)` : '—'}</td>
        <td class="num">${sumB.armorStart > 0 ? `${totalArmorKoB} / ${sumB.armorStart} (${Math.round((totalArmorKoB / sumB.armorStart) * 100)}% — ${sumB.armorUnrec} KO)` : '—'}</td>
      </tr>
      <tr>
        <td><strong>Formations Intact / Deployed</strong></td>
        <td class="num">${rep.sideA.length - sumA.defeatedCount} / ${rep.sideA.length}</td>
        <td class="num">${rep.sideB.length - sumB.defeatedCount} / ${rep.sideB.length}</td>
      </tr>
      <tr>
        <td><strong>Theatre Depot Logistics (Rem / Start)</strong></td>
        <td class="num">${logA.depotStart > 0 ? `${logA.depotRem} / ${logA.depotStart} (${logA.depotExpPct}% expended)` : '—'}</td>
        <td class="num">${logB.depotStart > 0 ? `${logB.depotRem} / ${logB.depotStart} (${logB.depotExpPct}% expended)` : '—'}</td>
      </tr>
      <tr>
        <td><strong>Formations Reaching Critical Supply</strong></td>
        <td class="num">${logA.criticalSupplyCount} / ${rep.sideA.length}</td>
        <td class="num">${logB.criticalSupplyCount} / ${rep.sideB.length}</td>
      </tr>
    </tbody>
  </table>

  <h2>2. Order of Battle &amp; Casualty Ledger</h2>
  ${renderForceTable(`2A. ${(rep.sideAName || H.getSideName('A')).toUpperCase()}`, rep.commanderA || 'Autonomous Staff', rep.sideA, sumA)}
  ${renderForceTable(`2B. ${(rep.sideBName || H.getSideName('B')).toUpperCase()}`, rep.commanderB || 'Autonomous Staff', rep.sideB, sumB)}

  <h2>3. Material Recovery &amp; Battlefield Salvage</h2>
  <div class="box">
    ${isOver && salvage && salvage.abandoned > 0 ? `
      <div><strong>VICTOR FIELD POSSESSION (${escapeHtml(winName.toUpperCase())}):</strong> ${salvage.abandoned} abandoned enemy armored hulls secured on the objective.</div>
      <ul>
        <li><strong>Captured &amp; Impressed into Service:</strong> ${salvage.impressed} vehicle(s)</li>
        <li><strong>Stripped for Depot Spares &amp; Munitions:</strong> ${salvageStrippedCount} vehicle(s)</li>
        <li><strong>Scuttled / Destroyed Write-Offs:</strong> ${salvage.scuttled} vehicle(s)</li>
      </ul>
    ` : `<div>No abandoned enemy armored vehicles were claimed during this reporting period.</div>`}
  </div>

  <h2>4. Significant Engagement Chronology</h2>
  <div class="box chron-box">
    ${chronology.length > 0
      ? chronology.map(l => `<div class="chron-item"><strong>[${escapeHtml(l.clock || '00:00')} HRS${l.dayLabel ? ` · ${escapeHtml(l.dayLabel)}` : ''}]</strong> ${escapeHtml(sanitizeForPrintableAAR(l.text))}</div>`).join('')
      : '<div>No major milestone events recorded in sitrep log.</div>'}
  </div>

  <h2>5. G-3 Operational Assessment &amp; Authentication</h2>
  <div class="box">
    <ul>
      ${printAssessments.map(n => `<li>${escapeHtml(stripEmojisForAAR(n))}</li>`).join('')}
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

  // Delegated Click & Hover Controller for Dynamic Cards, Editors & SVG Counters
  let delegatedHandlersBound = false;
  let hoveredDossierUnitId = null;

  function initDelegatedUIHandlers() {
    if (delegatedHandlersBound || typeof document === 'undefined' || !document.addEventListener) return;
    delegatedHandlersBound = true;

    document.addEventListener('click', (e) => {
      if (!e.target || typeof e.target.closest !== 'function') return;

      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        const id = actionBtn.dataset.id || '';
        const side = actionBtn.dataset.side || 'A';
        const app = ID.App || {};
        switch (action) {
          case 'unit-edit':
            if (app.loadUnitIntoForm) app.loadUnitIntoForm(id);
            break;
          case 'unit-dup':
            if (app.duplicateUnitTemplate) app.duplicateUnitTemplate(id);
            break;
          case 'unit-deploy':
            if (app.deployTemplateById) app.deployTemplateById(id, side);
            break;
          case 'unit-delete':
            if (app.deleteUnitTemplate) app.deleteUnitTemplate(id);
            break;
          case 'trait-edit':
            if (app.loadTraitIntoForm) app.loadTraitIntoForm(id);
            break;
          case 'cmd-trait-edit':
            if (app.openCmdTraitModal) app.openCmdTraitModal(id);
            break;
          case 'cmd-edit':
            if (app.loadCommanderIntoForm) app.loadCommanderIntoForm(id);
            break;
          case 'cmd-delete':
            if (app.deleteCommander) app.deleteCommander(id);
            break;
          case 'unit-remove':
            if (app.removeUnitFromSide) app.removeUnitFromSide(side, id);
            break;
          case 'gm-adjust':
            if (app.gmAdjustUnit) app.gmAdjustUnit(side, id, actionBtn.dataset.field || '', Number(actionBtn.dataset.delta || 0));
            break;
        }
        return;
      }

      const counterEl = e.target.closest('#tactical-sector-canvas .sector-counter[data-unit-id]');
      if (counterEl && counterEl.dataset.unitId) {
        focusUnitCard(counterEl.dataset.unitId);
      }
    });

    document.addEventListener('mouseover', (e) => {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const card = e.target.closest('.unit-dossier[data-unit-id]');
      const uid = card ? card.dataset.unitId : null;
      if (uid !== hoveredDossierUnitId) {
        if (hoveredDossierUnitId) highlightMapCounter(hoveredDossierUnitId, false);
        hoveredDossierUnitId = uid;
        if (hoveredDossierUnitId) highlightMapCounter(hoveredDossierUnitId, true);
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (!hoveredDossierUnitId) return;
      const toEl = e.relatedTarget;
      const stillInCard = toEl && typeof toEl.closest === 'function' ? toEl.closest('.unit-dossier[data-unit-id]') : null;
      if (!stillInCard || stillInCard.dataset.unitId !== hoveredDossierUnitId) {
        highlightMapCounter(hoveredDossierUnitId, false);
        hoveredDossierUnitId = null;
      }
    });
  }

  initDelegatedUIHandlers();

  // --------------------------------------------------------------------------
  // Public Module API
  // --------------------------------------------------------------------------

  function focusUnitCard(instanceId) {
    if (!instanceId) return;
    const card = document.querySelector(`.unit-dossier[data-unit-id="${instanceId}"]`);
    if (!card) return;
    if (typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    card.classList.remove('unit-card-flash');
    void card.offsetWidth;
    card.classList.add('unit-card-flash');
    setTimeout(() => card.classList.remove('unit-card-flash'), 1300);
  }

  function highlightMapCounter(instanceId, active) {
    if (!instanceId) return;
    const counter = document.querySelector(`#tactical-sector-canvas .sector-counter[data-unit-id="${instanceId}"]`);
    if (!counter) return;
    counter.classList.toggle('is-highlighted', !!active);
  }

  function toggleCompactUnitCards() {
    const bf = document.getElementById('view-battlefield');
    if (!bf) return;
    const isCompact = bf.classList.toggle('compact-unit-cards');
    if (document.body && document.body.classList) {
      document.body.classList.toggle('compact-unit-cards', isCompact);
    }
    ['btn-compact-cards-a', 'btn-compact-cards-b'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.textContent = isCompact ? 'FULL' : 'COMPACT';
        btn.classList.toggle('text-[#e0be6a]', isCompact);
        btn.classList.toggle('border-[#594b27]', isCompact);
      }
    });
  }

  function toggleOpStatusCollapse() {
    const box = document.getElementById('center-command-sticky');
    if (!box) return;
    const collapsed = box.classList.toggle('op-status-collapsed');
    const btn = document.getElementById('btn-toggle-op-status');
    if (btn) {
      btn.textContent = collapsed ? '▼' : '▲';
    }
  }

  // ==========================================================================
  // INTERACTIVE GUIDED UI TUTORIAL (10-STEP SPOTLIGHT WALKTHROUGH)
  // ==========================================================================
  const UI_TOUR_STEPS = [
    {
      tab: 'battlefield',
      selector: '#theatre-bar-header',
      title: 'Theatre Command & Environment Ticker',
      body: 'This top ticker displays the live 24-hour operational clock, terrain, and weather at a glance while staying compact above the fold. Click ▼ EXPAND anytime to change Terrain, Features, Climate-Aware Dynamic Weather, Round Length, or set any historical/fictional year from -270000 BCE to +270000.',
      tip: 'TIP: Morning Fog and Night automatically clamp visibility range and slash Close Air Support efficiency.'
    },
    {
      tab: 'battlefield',
      selector: '#sideA-commander-box',
      title: 'Faction Plates, Brass Commanders & Tactics',
      body: 'Each flank has a clickable steel faction nameplate (type any custom faction name), an engraved brass Commander nameplate dropdown with 10-tier Officer Rank Insignia, and a Tactic selector. Commanders grant +2.5% army-wide per ATK/DEF/CMD/LOG level plus unique traits.',
      tip: 'TIP: Leave Tactic on Auto-AI to let the general pick doctrines matching their personality, or override manually each round.'
    },
    {
      tab: 'battlefield',
      selector: '#sideA-summary',
      title: 'Force Strength & Shared Supply Depot',
      body: 'Track active formations, effective personnel, combat-ready AFVs, and total KIA+WIA losses here. Below sits your shared Theatre Supply Depot — frontline units draw refills from it every round, and running dry cripples combat stats.',
      tip: 'TIP: Watch the depot bar! Below 30% it turns amber, and at 0% your divisions cannot resupply.'
    },
    {
      tab: 'battlefield',
      selector: '#btn-compact-cards-a',
      title: 'Deploying Units & Compact Card Mode',
      body: 'Pick any unit template from the dropdown and click + DEPLOY to reinforce a flank. Use the COMPACT / FULL toggle right next to it to shrink unit cards down to Name, DIST, and the 4 core stat bars (PERS, ORG, SUP, AFV) when commanding large divisions.',
      tip: 'TIP: In Compact mode, hovering any unit card automatically surfaces all hidden details (TV, Dig-In, KIA/WIA, Class, AFV Recov/KO) inside the floating tooltip.'
    },
    {
      tab: 'battlefield',
      selector: '#sideA-units-list',
      title: 'Unit Dossier Cards & Status Accents',
      body: 'Every battalion card has a 3px left-edge status bar: solid Blue/Red when combat-effective, muted Amber when ORG or SUP drops below 30%, and a diagonal hatch overlay when routed or out of action. Hover a card for deep combat stats and to light up its counter on the map.',
      tip: 'TIP: Battles are won by breaking enemy Organization (blue bar) and Supply (yellow bar), not killing every last soldier.'
    },
    {
      tab: 'battlefield',
      selector: '#center-command-sticky',
      title: 'Sticky Operational Status & Turn Controls',
      body: 'This center console stays pinned as you scroll down through flanks. Hit ▶ EXECUTE ROUND to advance one turn, AUTO-OPS to run continuously, GM LIVE for 1-round Undo and live edits, or click ▲ to collapse it into a razor-thin sticky bar showing only Execute, Auto-Ops, and the Force Ratio gauge.',
      tip: 'TIP: Quick-load Arracourt (1944) or San Marino (1944) anytime from the Scenarios buttons inside this panel.'
    },
    {
      tab: 'battlefield',
      selector: '#tactical-sector-panel',
      title: '2D Tactical Sector & Two-Way Map Linking',
      body: 'Watch formations advance toward CONTACT LINE (0) in real time. Infantry and standard Armored Vehicles engage at Distance <= 2, Tanks and Tank Destroyers at <= 3, and Artillery up to <= 12 (with mild dispersion past 6, halved by Recon spotters). Click any NATO counter on the map to scroll straight to its unit card and flash it in amber.',
      tip: 'TIP: Hover the Y-Axis triangles right below the map to inspect stacked units at any distance coordinate.'
    },
    {
      tab: 'battlefield',
      selector: '#combat-log-container',
      title: 'SITREP Operational Logbook (Form DA-1594)',
      body: 'Every vigilance roll, fire-support volley, armor penetration check, field repair, and rout is recorded here in real time. Filter by category (Damage, Armor, Support, Rolls), click EXPAND for a full-screen searchable logbook, or COPY to paste into your TTRPG notes.',
      tip: 'TIP: Click anywhere outside any pop-up modal — or press Esc — to close it instantly.'
    },
    {
      tab: 'battlefield',
      selector: 'nav.mil-nav-dock',
      title: '7-Slot Command Navigation Dock',
      body: 'Switch across all 7 workspaces from this dock: Battlefield, ORBAT (custom unit designer), Traits, Command HQ (custom generals), Terrain (color-coded modifier matrix), Doctrines (25-page tactic manual), and FM Manual (Drill Sergeant & Technical manuals).',
      tip: 'TIP: Every custom unit, trait, general, and terrain auto-saves in your browser.'
    },
    {
      tab: 'battlefield',
      selector: '#btn-lang-toggle',
      title: 'Switch Language (EN / ID)',
      body: 'Click the EN / ID button in the top-right header anytime to switch the entire interface, combat logs, unit traits, Field Manuals, and printable After-Action Report between English (Form DA-774) and Bahasa Indonesia (TNI AD format).',
      tip: 'TIP: Your language choice is automatically saved in your browser for future sessions.'
    },
    {
      tab: 'battlefield',
      selector: '#btn-header-aar',
      title: 'Form DA-774 After-Action Report & JSON Backup',
      body: 'Click AAR anytime for an interim SITREP or post-battle debrief complete with per-unit kills, depot logistics, weather trail, and printable A4 Form DA-774 PDF export. Use EXPORT / IMPORT JSON next to it to save or share your custom armies, and click UI TOUR anytime to replay this guide.',
      tip: 'DISMISSED, COMMANDER — hit ▶ EXECUTE ROUND to kick off the Battle of Arracourt!'
    }
  ];

  let uiTourIndex = -1;
  let uiTourKeyHandler = null;
  let uiTourRepositionHandler = null;

  function positionUITutorialStep() {
    if (uiTourIndex < 0 || uiTourIndex >= UI_TOUR_STEPS.length) return;
    const step = UI_TOUR_STEPS[uiTourIndex];
    const spot = document.getElementById('ui-tour-spotlight');
    const card = document.getElementById('ui-tour-card');
    if (!spot || !card) return;

    const target = document.querySelector(step.selector);
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;

    if (!target || typeof target.getBoundingClientRect !== 'function') {
      spot.style.top = '50%';
      spot.style.left = '50%';
      spot.style.width = '0px';
      spot.style.height = '0px';
      card.style.top = `${Math.max(16, Math.round((vh - 260) / 2))}px`;
      card.style.left = `${Math.max(12, Math.round((vw - Math.min(390, vw - 24)) / 2))}px`;
      return;
    }

    const rect = target.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(4, rect.top - pad);
    const left = Math.max(4, rect.left - pad);
    const width = Math.min(vw - 8, Math.max(24, rect.width + pad * 2));
    const height = Math.min(vh - 8, Math.max(24, rect.height + pad * 2));

    spot.style.top = `${top}px`;
    spot.style.left = `${left}px`;
    spot.style.width = `${width}px`;
    spot.style.height = `${height}px`;

    const cardRect = card.getBoundingClientRect();
    const cardW = cardRect.width || Math.min(390, vw - 24);
    const cardH = cardRect.height || 240;
    const gap = 14;

    let cardTop = top + height + gap;
    if (cardTop + cardH > vh - 12) {
      cardTop = top - cardH - gap;
    }
    if (cardTop < 12) {
      cardTop = Math.max(12, Math.min(vh - cardH - 12, top + 12));
    }

    let cardLeft = left + (width / 2) - (cardW / 2);
    cardLeft = Math.max(12, Math.min(vw - cardW - 12, cardLeft));

    card.style.top = `${Math.round(cardTop)}px`;
    card.style.left = `${Math.round(cardLeft)}px`;
  }

  function renderUITutorialStep() {
    const overlay = document.getElementById('ui-tour-overlay');
    if (!overlay || uiTourIndex < 0 || uiTourIndex >= UI_TOUR_STEPS.length) return;

    const step = UI_TOUR_STEPS[uiTourIndex];
    if (step.tab && typeof switchTab === 'function') {
      switchTab(step.tab);
    }

    const badgeEl = document.getElementById('ui-tour-step-badge');
    const titleEl = document.getElementById('ui-tour-title');
    const bodyEl = document.getElementById('ui-tour-body');
    const tipEl = document.getElementById('ui-tour-tip');
    const progEl = document.getElementById('ui-tour-progress');
    const prevBtn = document.getElementById('ui-tour-prev');
    const nextBtn = document.getElementById('ui-tour-next');

    const total = UI_TOUR_STEPS.length;
    if (badgeEl) badgeEl.textContent = `ORIENTATION // STEP ${String(uiTourIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    if (titleEl) titleEl.textContent = step.title;
    if (bodyEl) bodyEl.textContent = step.body;
    if (tipEl) tipEl.textContent = step.tip;
    if (progEl) progEl.style.width = `${Math.round(((uiTourIndex + 1) / total) * 100)}%`;
    if (prevBtn) {
      prevBtn.disabled = uiTourIndex === 0;
      prevBtn.style.opacity = uiTourIndex === 0 ? '0.45' : '1';
    }
    if (nextBtn) {
      nextBtn.textContent = uiTourIndex === total - 1 ? 'FINISH ✓' : 'NEXT ►';
    }

    const target = document.querySelector(step.selector);
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    positionUITutorialStep();
    setTimeout(positionUITutorialStep, 260);
  }

  function startUITutorial(startIdx = 0) {
    const overlay = document.getElementById('ui-tour-overlay');
    if (!overlay) return;
    uiTourIndex = Math.max(0, Math.min(UI_TOUR_STEPS.length - 1, Number(startIdx) || 0));
    overlay.classList.remove('hidden');

    if (!uiTourKeyHandler) {
      uiTourKeyHandler = (e) => {
        if (uiTourIndex < 0) return;
        if (e.key === 'Escape') { endUITutorial(); }
        else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); nextUITutorialStep(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); prevUITutorialStep(); }
      };
      window.addEventListener('keydown', uiTourKeyHandler);
    }
    if (!uiTourRepositionHandler) {
      uiTourRepositionHandler = () => positionUITutorialStep();
      window.addEventListener('resize', uiTourRepositionHandler);
      window.addEventListener('scroll', uiTourRepositionHandler, true);
    }

    renderUITutorialStep();
  }

  function nextUITutorialStep() {
    if (uiTourIndex < 0) return;
    if (uiTourIndex >= UI_TOUR_STEPS.length - 1) {
      endUITutorial();
      return;
    }
    uiTourIndex += 1;
    renderUITutorialStep();
  }

  function prevUITutorialStep() {
    if (uiTourIndex <= 0) return;
    uiTourIndex -= 1;
    renderUITutorialStep();
  }

  function endUITutorial() {
    uiTourIndex = -1;
    const overlay = document.getElementById('ui-tour-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (uiTourKeyHandler) {
      window.removeEventListener('keydown', uiTourKeyHandler);
      uiTourKeyHandler = null;
    }
    if (uiTourRepositionHandler) {
      window.removeEventListener('resize', uiTourRepositionHandler);
      window.removeEventListener('scroll', uiTourRepositionHandler, true);
      uiTourRepositionHandler = null;
    }
  }

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
    setOrbatCategoryFilter,
    setTraitsCategoryFilter,
    setCommandersFilter,
    renderTacticalSectorCanvas,
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
    openExpandedLogModal,
    closeExpandedLogModal,
    renderExpandedCombatLog,
    openBattleSummaryModal,
    closeBattleSummaryModal,
    getActiveAARData,
    focusUnitCard,
    highlightMapCounter,
    toggleCompactUnitCards,
    toggleOpStatusCollapse,
    startUITutorial,
    nextUITutorialStep,
    prevUITutorialStep,
    endUITutorial,
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
  window.openExpandedLogModal = openExpandedLogModal;
  window.closeExpandedLogModal = closeExpandedLogModal;
  window.renderExpandedCombatLog = renderExpandedCombatLog;
  window.openBattleSummaryModal = openBattleSummaryModal;
  window.closeBattleSummaryModal = closeBattleSummaryModal;
  window.focusUnitCard = focusUnitCard;
  window.highlightMapCounter = highlightMapCounter;
  window.toggleCompactUnitCards = toggleCompactUnitCards;
  window.toggleOpStatusCollapse = toggleOpStatusCollapse;
  window.startUITutorial = startUITutorial;
  window.nextUITutorialStep = nextUITutorialStep;
  window.prevUITutorialStep = prevUITutorialStep;
  window.endUITutorial = endUITutorial;
  window.exportAARToPDF = exportAARToPDF;
  window.goToTacticsPage = goToTacticsPage;
  window.flipTacticsPage = flipTacticsPage;
  window.toggleTacticsTheme = toggleTacticsTheme;
  window.printCurrentTacticsPage = printCurrentTacticsPage;
  window.setOrbatCategoryFilter = setOrbatCategoryFilter;
  window.setTraitsCategoryFilter = setTraitsCategoryFilter;
  window.setCommandersFilter = setCommandersFilter;
  window.renderUnitDesigner = renderUnitDesigner;
  window.renderTraitsTab = renderTraitsTab;
  window.renderCommandersTab = renderCommandersTab;
  window.renderAll = renderAll;

})(window.IronDivision);