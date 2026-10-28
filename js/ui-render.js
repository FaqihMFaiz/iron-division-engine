/* ==========================================================================
   IRON DIVISION ENGINE — DOM RENDERING & USER INTERFACE
   File: js/ui-render.js
   ========================================================================== */

function switchTab(tabName) {
  // Added 'guide' to the registered tabs array
  const tabs = ['battlefield', 'units', 'traits', 'commanders', 'terrain', 'tactics', 'guide'];
  tabs.forEach(t => {
    const view = document.getElementById(`view-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    if (view) view.classList.toggle('hidden', t !== tabName);
    if (btn) btn.classList.toggle('active', t === tabName);
  });
  renderAll();
}

function onEnvironmentChange() {
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
      showToast('Path/Road feature is only for non-Urban areas; switched to Normal.', 'warn');
    } else {
      state.environment.feature = fSel.value;
    }
  }
  if (wSel && wSel.value) state.environment.weather = wSel.value;
  if (uChk) state.environment.unexpectedInitiative = uChk.checked;
  renderAll();
}

function updateSideConfig(side) {
  const cmdSel = document.getElementById(`side${side}-commander`);
  const tacSel = document.getElementById(`side${side}-tactic`);
  const sideObj = side === 'A' ? state.battle.sideA : state.battle.sideB;
  if (cmdSel) sideObj.commanderId = cmdSel.value;
  if (tacSel) sideObj.tacticId = tacSel.value;
  renderAll();
}

function renderEnvironmentSelectors() {
  const tSel = document.getElementById('bf-terrain');
  const fSel = document.getElementById('bf-feature');
  const wSel = document.getElementById('bf-weather');
  if (!tSel || !fSel || !wSel) return;

  tSel.innerHTML = Object.keys(state.terrains).map(k => {
    const t = state.terrains[k];
    return `<option value="${k}" ${state.environment.terrain === k ? 'selected' : ''}>${t.name}${t.isUrban ? ' (Urban Tactics Enabled)' : ''}</option>`;
  }).join('');

  fSel.innerHTML = Object.keys(TERRAIN_FEATURES).map(k => {
    const f = TERRAIN_FEATURES[k];
    return `<option value="${k}" ${state.environment.feature === k ? 'selected' : ''}>${f.name}</option>`;
  }).join('');

  wSel.innerHTML = Object.keys(WEATHER_TYPES).map(k => {
    const w = WEATHER_TYPES[k];
    return `<option value="${k}" ${state.environment.weather === k ? 'selected' : ''}>${w.name}</option>`;
  }).join('');

  const terr = state.terrains[state.environment.terrain] || DEFAULT_TERRAINS.Plains;
  const feat = TERRAIN_FEATURES[state.environment.feature] || TERRAIN_FEATURES.Normal;
  const weath = WEATHER_TYPES[state.environment.weather] || WEATHER_TYPES.Sunny;

  const summaryBar = document.getElementById('env-summary-bar');
  if (summaryBar) {
    summaryBar.innerHTML = `
      <div class="flex flex-wrap items-center gap-2">
        <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">⛰ ${terr.name}: Inf ${terr.infAtk >= 0 ? '+' : ''}${terr.infAtk}%/${terr.infDef >= 0 ? '+' : ''}${terr.infDef}%, Tank ${terr.tankAtk >= 0 ? '+' : ''}${terr.tankAtk}%/${terr.tankDef >= 0 ? '+' : ''}${terr.tankDef}%, Sup +${terr.supplyDrain}/rd</span>
        <span class="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono">🗺 ${feat.name}: Atk ×${feat.atkMult}, Def ×${feat.defMult}</span>
        <span class="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono">☁ ${weath.name}: ${weath.desc}</span>
      </div>
      <div class="font-mono text-[11px] text-amber-300">🏰 Theatre Lock: Side ${state.environment.theatreAttackerSide || 'A'} Invades / Side ${(state.environment.theatreAttackerSide || 'A') === 'A' ? 'B' : 'A'} Entrenched</div>
    `;
  }
}

function renderSidePanel(side) {
  const sideObj = side === 'A' ? state.battle.sideA : state.battle.sideB;
  const isAttacker = state.battle.attackerSide === side;
  const role = isAttacker ? 'attack' : 'defense';
  const badge = document.getElementById(`side${side}-role-badge`);
  const isTheatreAtk = (state.environment.theatreAttackerSide || 'A') === side;
  const theatreTag = isTheatreAtk ? 'INVADER' : 'ENTRENCHED';

  if (badge) {
    badge.textContent = isAttacker ? `⚔ INITIATIVE [${theatreTag}]` : `🛡 REACTING [${theatreTag}]`;
    badge.className = isAttacker
      ? 'text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
      : 'text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold';
  }

  const cmdSel = document.getElementById(`side${side}-commander`);
  if (cmdSel) {
    cmdSel.innerHTML = state.commanders.map(c =>
      `<option value="${c.id}" ${sideObj.commanderId === c.id ? 'selected' : ''}>${c.name} [${c.personality}]</option>`
    ).join('');
  }

  const tacSel = document.getElementById(`side${side}-tactic`);
  if (tacSel) {
    const terr = state.terrains[state.environment.terrain] || DEFAULT_TERRAINS.Plains;
    const isUrban = !!terr.isUrban || state.environment.feature === 'Fort';
    const eligible = getEligibleTactics(role, isUrban);
    tacSel.innerHTML = `<option value="auto" ${sideObj.tacticId === 'auto' ? 'selected' : ''}>🤖 Commander AI Auto-Select</option>` +
      eligible.map(t => `<option value="${t.id}" ${sideObj.tacticId === t.id ? 'selected' : ''}>${t.name} (${t.personality})</option>`).join('');
  }

  const addSel = document.getElementById(`side${side}-add-select`);
  if (addSel) {
    const currentVal = addSel.value;
    addSel.innerHTML = state.unitTemplates.map(u =>
      `<option value="${u.id}" ${currentVal === u.id ? 'selected' : ''}>${u.name} (${u.category.toUpperCase()} | ${u.personnel} HP)</option>`
    ).join('');
  }

  const activeUnits = sideObj.units.filter(isUnitActive);
  const totalPers = activeUnits.reduce((s, u) => s + u.personnel, 0);
  const totalArmor = activeUnits.reduce((s, u) => s + u.armor, 0);
  const totalDeadWounded = sideObj.units.reduce((s, u) => s + u.dead + u.wounded, 0);

  const summaryEl = document.getElementById(`side${side}-summary`);
  if (summaryEl) {
    const curDepot = sideObj.supplyDepot !== undefined ? sideObj.supplyDepot : (sideObj.maxSupplyDepot || 100);
    const maxDepot = sideObj.maxSupplyDepot || 100;
    const depotPct = clamp(Math.round((curDepot / Math.max(1, maxDepot)) * 100), 0, 100);

    summaryEl.innerHTML = `
      <div>
        <span class="block text-[10px] font-mono uppercase text-slate-400">Active Units</span>
        <span class="font-bold text-sm text-white font-mono">${activeUnits.length} / ${sideObj.units.length}</span>
      </div>
      <div>
        <span class="block text-[10px] font-mono uppercase text-slate-400">Active Personnel / Armor</span>
        <span class="font-bold text-sm text-emerald-400 font-mono">${totalPers.toLocaleString()} <span class="text-amber-400">(${totalArmor} 🚜)</span></span>
      </div>
      <div>
        <span class="block text-[10px] font-mono uppercase text-slate-400">Casualties (KIA+WIA)</span>
        <span class="font-bold text-sm text-rose-400 font-mono">${totalDeadWounded.toLocaleString()}</span>
      </div>
      <div class="col-span-3 pt-2 mt-1 border-t border-slate-800 text-left">
        <div class="flex justify-between text-[11px] font-mono mb-1">
          <span class="text-slate-300 font-bold">📦 Army Supply Depot (${getSideCommander(side)?.name?.split(' ')[0] || 'HQ'})</span>
          <span class="${curDepot <= 0 ? 'text-rose-400 font-extrabold animate-pulse' : (depotPct < 30 ? 'text-amber-400' : 'text-amber-300')}">
            ${curDepot} / ${maxDepot} pts (${depotPct}%)
          </span>
        </div>
        <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div class="h-full bar-fill ${curDepot <= 0 ? 'bg-rose-600' : (depotPct < 30 ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${depotPct}%"></div>
        </div>
      </div>
    `;
  }
  const listEl = document.getElementById(`side${side}-units-list`);
  if (!listEl) return;

  if (sideObj.units.length === 0) {
    listEl.innerHTML = `<div class="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">No units deployed on Side ${side}. Select a template above and click "+ Deploy Unit".</div>`;
    return;
  }

  listEl.innerHTML = sideObj.units.map(u => {
    const persPct = clamp(Math.round((u.personnel / Math.max(1, u.maxPersonnel)) * 100), 0, 100);
    const orgPct = (u.isMonster || u.isZombie) ? 100 : clamp(Math.round((u.org / Math.max(1, u.maxOrg)) * 100), 0, 100);
    const supPct = (u.isMonster || u.isZombie) ? 100 : clamp(Math.round((u.supply / Math.max(1, u.maxSupply)) * 100), 0, 100);
    const armorPct = u.maxArmor > 0 ? clamp(Math.round((u.armor / u.maxArmor) * 100), 0, 100) : 0;

    const orgMalus = getOrgRemainingMalusPct(u);
    const lossMalus = getPersonnelLossMalusPct(u);
    const supMalus = getSupplyMalusPct(u);
    const tv = getUnitTargetValue(u);

    const traitBadges = u.traits.map(tid => {
      const t = getTraitById(tid);
      return t ? `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]" title="${t.desc}">${t.name}</span>` : '';
    }).join('');

    return `
      <div class="bg-slate-950 border ${u.defeated ? 'border-rose-900/70 opacity-60' : 'border-slate-800'} rounded-lg p-3 space-y-2 transition">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-xs sm:text-sm text-white">${u.name}</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">${u.experience}</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">${u.category.toUpperCase()}</span>
            </div>
            <div class="text-[11px] font-mono text-slate-400 mt-0.5">
              Soft: <b class="text-slate-200">${u.softAttack}</b> | Hard: <b class="text-slate-200">${u.hardAttack}</b> | Def: <b class="text-slate-200">${u.defense}</b> | Pierce: <b class="text-sky-300">${u.piercing}</b> | Hardness: <b class="text-amber-300">${u.hardness}</b> | Pur/Ret: <b class="text-purple-300">${getUnitPursuitBonus(u) >= 0 ? '+' : ''}${getUnitPursuitBonus(u)}/${getUnitRetreatBonus(u) >= 0 ? '+' : ''}${getUnitRetreatBonus(u)}</b> | TV: <b class="text-emerald-300">${tv}</b> | ⛏ <b class="text-amber-300">Entrenched: Lvl ${u.entrenchmentLevel || 0}/${getUnitMaxEntrenchmentCap(u)}</b> ${isMeleeUnit(u) ? ` | <b class="${(u.meleeDistance || 0) > 0 ? 'text-amber-400' : 'text-rose-400'} font-mono">${(u.meleeDistance || 0) > 0 ? `🏃 Dist: ${u.meleeDistance}` : '⚔ In Melee'}</b>` : ''}
            </div>
          </div>
          <button type="button" onclick="removeUnitFromSide('${side}', '${u.instanceId}')" class="text-slate-500 hover:text-rose-400 text-xs px-1.5 py-0.5 rounded" title="Remove unit">✕</button>
        </div>

        ${u.defeated ? `<div class="text-[11px] font-mono text-rose-400 bg-rose-950/50 border border-rose-800/50 px-2 py-1 rounded">🏳 DEFEATED: ${u.defeatReason}</div>` : ''}
        ${u.isRallying ? `<div class="text-[11px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2 py-1 rounded">🚩 REGROUPING IN REAR (${u.rallyRoundsLeft} rounds until ready)</div>` : ''}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
          <div>
            <div class="flex justify-between">
              <span class="text-slate-400">Personnel HP</span>
              <span class="text-emerald-300">${u.personnel} / ${u.maxPersonnel} (${persPct}%)</span>
            </div>
            <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden mt-0.5">
              <div class="bg-emerald-500 h-full bar-fill" style="width: ${persPct}%"></div>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">KIA: <span class="text-rose-400">${u.dead}</span> | WIA: <span class="text-amber-300">${u.wounded}</span> ${lossMalus < 0 ? `<span class="text-rose-400">(${lossMalus}% stat)</span>` : ''}</div>
          </div>

          <div>
            <div class="flex justify-between">
              <span class="text-slate-400">Organization HP</span>
              <span class="text-sky-300">${(u.isMonster || u.isZombie) ? 'N/A (Immune)' : `${u.org} / ${u.maxOrg} (${orgPct}%)`}</span>
            </div>
            <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden mt-0.5">
              <div class="bg-sky-500 h-full bar-fill" style="width: ${orgPct}%"></div>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">Armor Tier: <span class="text-slate-300">${u.armorTier.toUpperCase()}</span> ${orgMalus < 0 ? `<span class="text-rose-400">(${orgMalus}% org malus)</span>` : ''}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
          <div>
            <div class="flex justify-between">
              <span class="text-slate-400">Supply</span>
              <span class="text-amber-300">${(u.isMonster || u.isZombie) ? 'N/A' : `${u.supply} / ${u.maxSupply} (${supPct}%)`}</span>
            </div>
            <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-0.5">
              <div class="bg-amber-400 h-full bar-fill" style="width: ${supPct}%"></div>
            </div>
            ${supMalus < 0 ? `<div class="text-[10px] text-rose-400 mt-0.5">Supply Malus: ${supMalus}%</div>` : ''}
          </div>

          ${u.maxArmor > 0 ? `
          <div>
            <div class="flex justify-between">
              <span class="text-slate-400">Combat Armor</span>
              <span class="text-orange-300">${u.armor} / ${u.maxArmor}</span>
            </div>
            <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-0.5">
              <div class="bg-orange-500 h-full bar-fill" style="width: ${armorPct}%"></div>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">Recov: <span class="text-emerald-400">${u.recoverableArmor}</span> | Lost: <span class="text-rose-400">${u.unrecoverableArmor}</span></div>
          </div>
          ` : `<div class="text-[10px] text-slate-500 flex items-center">Unarmored / Foot Formation</div>`}
        </div>

        <div class="flex flex-wrap gap-1 pt-1 border-t border-slate-900">
          ${traitBadges}
        </div>
      </div>
    `;
  }).join('');
}

function renderCenterTelemetry() {
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

  const actA = getSideActivePersonnel('A');
  const actB = getSideActivePersonnel('B');
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

  const bonusA = getOutnumberingBonusPct('A', 'B');
  const bonusB = getOutnumberingBonusPct('B', 'A');
  const pill = document.getElementById('outnumber-bonus-pill');
  if (pill) {
    if (bonusA > 0) pill.textContent = `Side A Outnumbers (+${bonusA}% Atk/Def)`;
    else if (bonusB > 0) pill.textContent = `Side B Outnumbers (+${bonusB}% Atk/Def)`;
    else pill.textContent = `Balanced Forces (No Outnumber Bonus)`;
  }
}

/* ==========================================================================
   COMBAT LOG COLOR DEFINITIONS & RENDERER (js/ui-render.js)
   ========================================================================== */

// Defined globally and attached to window to prevent any ReferenceError
const colorMap = {
  rolls: 'text-slate-200 border-slate-800 bg-slate-950/60',
  damage: 'text-rose-200 border-rose-900/40 bg-rose-950/20',
  armor: 'text-amber-200 border-amber-900/40 bg-amber-950/20',
  support: 'text-sky-200 border-sky-900/40 bg-sky-950/20',
  error: 'text-rose-100 border-rose-500 bg-rose-950/90 font-bold shadow-lg'
};
window.colorMap = colorMap;
const LOG_COLOR_MAP = colorMap;

function renderCombatLog() {
  const container = document.getElementById('combat-log-container');
  if (!container) return;

  const filterEl = document.getElementById('log-filter');
  const filterVal = filterEl ? filterEl.value : 'all';

  if (!state.battle.logs || state.battle.logs.length === 0) {
    container.innerHTML = `<div class="text-slate-500 text-center py-12">No combat events recorded yet. Click "▶ Next Round" or "⏩ Auto Battle" to start simulation.</div>`;
    return;
  }

  // Cap at the latest 150 log entries to keep the DOM fast and responsive
  const logsToRender = state.battle.logs.slice(-150);
  const filtered = logsToRender.filter(item => filterVal === 'all' || item.category === filterVal);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-slate-500 text-center py-12">No events match the selected filter.</div>`;
    return;
  }

  container.innerHTML = filtered.slice().reverse().map(item => `
    <div class="px-2.5 py-1.5 rounded border text-[11px] leading-relaxed ${colorMap[item.category] || colorMap.rolls}">
      <span class="text-slate-500 mr-1">[R${item.round}]</span> ${item.text}
    </div>
  `).join('');
}

function renderUnitDesigner() {
  const chkContainer = document.getElementById('unit-traits-checkboxes');
  if (chkContainer) {
    const currentChecked = Array.from(chkContainer.querySelectorAll('input:checked')).map(i => i.value);
    chkContainer.innerHTML = state.traits.map(t => `
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

  grid.innerHTML = state.unitTemplates.map(u => {
    const traitNames = (u.traits || []).map(tid => getTraitById(tid)?.name).filter(Boolean).join(', ');
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
            <div>Pur/Ret: <b class="text-purple-300">${getUnitPursuitBonus(u) >= 0 ? '+' : ''}${getUnitPursuitBonus(u)}/${getUnitRetreatBonus(u) >= 0 ? '+' : ''}${getUnitRetreatBonus(u)}</b></div>
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
  const container = document.getElementById('traits-list-container');
  if (!container) return;

  container.innerHTML = state.traits.map(t => `
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
  const chkContainer = document.getElementById('cmd-traits-checkboxes');
  const traitsList = (typeof state !== 'undefined' && state.commanderTraits) ? state.commanderTraits : DEFAULT_COMMANDER_TRAITS;

  if (chkContainer) {
    const checked = Array.from(chkContainer.querySelectorAll('input:checked')).map(i => i.value);
    chkContainer.innerHTML = traitsList.map(ct => `
      <label class="flex items-start gap-2 cursor-pointer p-1 rounded hover:bg-slate-900">
        <input type="checkbox" value="${ct.id}" class="cmd-trait-chk mt-0.5 accent-amber-500" ${checked.includes(ct.id) ? 'checked' : ''}>
        <div>
          <div class="font-semibold text-white flex items-center gap-1.5 flex-wrap">
            ${ct.name}
            ${ct.rallyDurationRed ? `<span class="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-mono text-[9px] border border-amber-800">-${ct.rallyDurationRed} Rally Rd</span>` : ''}
            ${ct.rallyCheckBonus ? `<span class="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono text-[9px] border border-emerald-800">+${ct.rallyCheckBonus} Rally Roll</span>` : ''}
            ${ct.targetUnitCategory ? `<span class="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 font-mono text-[9px] border border-sky-800">${ct.targetUnitCategory.toUpperCase()} ONLY</span>` : ''}
          </div>
          <div class="text-[11px] text-slate-400">${ct.desc}</div>
        </div>
      </label>
    `).join('');
  }

  const listContainer = document.getElementById('commanders-list-container');
  if (!listContainer || typeof state === 'undefined') return;

  listContainer.innerHTML = state.commanders.map(c => {
    const traitNames = (c.traits || []).map(tid => getCommanderTraitById(tid)?.name || tid).join(', ');
    return `
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-sm text-white">★ ${c.name}</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">${c.personality}</span>
          </div>

          <!-- 4 ATTRIBUTES BADGE ROW -->
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
  const editSel = document.getElementById('terrain-edit-select');
  if (editSel) {
    const cur = editSel.value || 'Plains';
    editSel.innerHTML = Object.keys(state.terrains).map(k =>
      `<option value="${k}" ${cur === k ? 'selected' : ''}>${state.terrains[k].name}</option>`
    ).join('');
    if (!document.getElementById('terr-name').value) {
      loadTerrainIntoForm();
    }
  }

  const tbody = document.getElementById('terrain-matrix-tbody');
  if (tbody) {
    tbody.innerHTML = Object.keys(state.terrains).map(k => {
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
    featList.innerHTML = Object.values(TERRAIN_FEATURES).map(f => `
      <div class="p-2 rounded bg-slate-950 border border-slate-800">
        <div class="font-semibold text-white">${f.name}</div>
        <div class="text-slate-400 text-[11px]">${f.desc}</div>
      </div>
    `).join('');
  }

  const weathList = document.getElementById('weather-matrix-list');
  if (weathList) {
    weathList.innerHTML = Object.values(WEATHER_TYPES).map(w => `
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
  grid.innerHTML = TACTICS_DB.map(t => `
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

function openBattleSummaryModal() {
  const modal = document.getElementById('battle-modal');
  const titleEl = document.getElementById('modal-winner-title');
  const bodyEl = document.getElementById('modal-report-body');
  if (!modal || !bodyEl) return;

  if (!state.battle.afterActionReport) {
    buildAfterActionReport();
  }
  const rep = state.battle.afterActionReport;

  if (state.battle.isOver) {
    titleEl.textContent = rep.winner === 'Draw'
      ? `Mutual Exhaustion — Draw after ${rep.rounds} Rounds`
      : `Victory for Side ${rep.winner} in ${rep.rounds} Rounds!`;
  } else {
    titleEl.textContent = `Live Battle Telemetry — Round ${state.battle.round} (In Progress)`;
  }

  function renderSideReportTable(sideLabel, units, colorClass) {
    const totStart = units.reduce((s, u) => s + u.maxPersonnel, 0);
    const totRem = units.reduce((s, u) => s + u.personnel, 0);
    const totDead = units.reduce((s, u) => s + u.dead, 0);
    const totWounded = units.reduce((s, u) => s + u.wounded, 0);
    const totCaptured = units.reduce((s, u) => s + (u.captured || 0), 0);
    const totEscaped = units.reduce((s, u) => s + (u.escaped || 0), 0);
    const totArmorRem = units.reduce((s, u) => s + u.armor, 0);
    const totArmorRec = units.reduce((s, u) => s + u.recoverableArmor, 0);
    const totArmorUnrec = units.reduce((s, u) => s + u.unrecoverableArmor, 0);

    return `
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <h4 class="font-bold text-sm ${colorClass}">${sideLabel}</h4>
          <div class="text-xs font-mono text-slate-300">
            Remaining Active: <b>${totRem.toLocaleString()}</b> / ${totStart.toLocaleString()} |
            Dead (KIA): <b class="text-rose-400">${totDead.toLocaleString()}</b> |
            Wounded (WIA): <b class="text-amber-300">${totWounded.toLocaleString()}</b> |
            Total Captured (Active+Wounded): <b class="text-purple-300">${totCaptured.toLocaleString()}</b> |
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

function renderAll() {
  renderEnvironmentSelectors();
  renderSidePanel('A');
  renderSidePanel('B');
  renderCenterTelemetry();
  renderCombatLog();
  renderUnitDesigner();
  renderTraitsTab();
  renderCommandersTab();
  renderTerrainTab();
  renderTacticsGuide();
  if (typeof renderSimulationGuide === 'function') {
    renderSimulationGuide();
  }
}