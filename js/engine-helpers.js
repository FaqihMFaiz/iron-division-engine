/* ==========================================================================
   IRON DIVISION ENGINE — MATHEMATICAL & OPERATIONAL HELPERS
   File: js/engine-helpers.js
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. Core Dice & Storage Utilities
// --------------------------------------------------------------------------

/**
 * Rolls a polyhedral die with the specified number of sides.
 * @param {number} sides - Number of sides (e.g., 6, 8, 10, 12, 16, 20, 50, 70, 100)
 * @returns {number} Random integer between 1 and sides (or 0 if sides <= 0)
 */
function rollDie(sides) {
  if (sides <= 0) return 0;
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Clamps a numerical value between a minimum and maximum bound.
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Appends a classified message to the combat resolution log.
 * @param {'rolls'|'damage'|'armor'|'support'|'error'} category - Log classification
 * @param {string} text - The log entry narrative
 */
function addLog(category, text) {
  // If state is not initialized yet during boot, log to console safely
  if (typeof state === 'undefined' || !state || !state.battle) {
    console.log(`[Combat Log Standby (${category})]`, text);
    return;
  }
  if (!state.battle.logs) state.battle.logs = [];
  state.battle.logs.push({
    id: Date.now() + Math.random(),
    round: state.battle.round || 1,
    category: category,
    text: text
  });
}

/**
 * Displays an ephemeral toast banner in the bottom-right viewport.
 */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  const colors = {
    info: 'bg-slate-800 border-slate-600 text-slate-100',
    success: 'bg-emerald-950 border-emerald-500/60 text-emerald-200',
    warn: 'bg-amber-950 border-amber-500/60 text-amber-200',
    danger: 'bg-rose-950 border-rose-500/60 text-rose-200'
  };
  el.className = `px-3.5 py-2 rounded-lg border shadow-xl text-xs font-medium transition-all ${colors[type] || colors.info}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

/**
 * Safely persists JSON data to localStorage, ignoring sandboxed iframe restrictions.
 */
function safeSaveStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Safely loads JSON data from localStorage with fallback default.
 */
function safeLoadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

// --------------------------------------------------------------------------
// 2. Operational, Cover & Triage Helpers
// --------------------------------------------------------------------------

/**
 * Calculates the total cover rating provided by terrain, fortifications, and traits.
 */
function getTerrainCoverRating(unit) {
  const terr = state.environment.terrain;
  const feat = state.environment.feature;
  let cover = 0;
  if (terr === 'Hills') cover = 2;
  else if (terr === 'Forest') cover = 3;
  else if (terr === 'Jungle' || terr === 'Marsh') cover = 4;
  else if (terr === 'Urban') cover = 5;
  else if (terr === 'Mountain') cover = 6;

  if (feat === 'Fort') cover += 4;
  if (feat === 'SmallRiver' || feat === 'LargeRiver') cover += 2;

  if (unit && unit.traits) {
    if (unit.traits.includes('engineering_support')) cover += 2;
    if (unit.traits.includes('concealment_specialist')) cover += 2;
    if (unit.traits.includes('desperate_defense')) cover += 2;
  }
  return cover;
}

/**
 * Returns the base Mobility Speed Class (0 to 5) for a unit.
 */
function getUnitMobilityClass(u) {
  // 0: Immobile/Towed, 1: Foot, 2: Foot Spec, 3: Heavy Tank, 4: Med Tank/Mech, 5: Light Recon
  if (u.category === 'artillery') return 0;
  if (u.category === 'infantry') {
    const specialized = ['mountaineers', 'marines', 'rangers', 'special_forces'];
    if (u.traits && u.traits.some(t => specialized.includes(t))) return 2;
    return 1;
  }
  if (u.category === 'tank') {
    if (u.armorTier === 'heavy' || u.armorTier === 'super') return 3;
    return 4; // Medium tank
  }
  if (u.category === 'armored_vehicle') {
    if (u.armorTier === 'light') return 5; // Light recon/APC
    return 4; // Mechanized / Tank Destroyer
  }
  return 1;
}

/**
 * Computes the operational speed of a unit adjusted for broken terrain and penalties.
 */
function getUnitEffectiveSpeed(u) {
  const baseMob = getUnitMobilityClass(u) - (u.mobilityClassPenalty || 0);
  const terr = state.environment.terrain;
  const feat = state.environment.feature;
  let terrainMod = 0;

  const isMotorizedOrArmor = u.category === 'tank' || u.category === 'armored_vehicle';

  if (isMotorizedOrArmor) {
    if (terr === 'Plains' || terr === 'Desert' || feat === 'Road') terrainMod = +1;
    else if (terr === 'Forest' || terr === 'Hills') terrainMod = -1;
    else if (terr === 'Mountain' || terr === 'Jungle' || terr === 'Marsh' || terr === 'Urban') terrainMod = -2;
  } else {
    // Foot infantry slips through mountains & forests easier
    if (terr === 'Mountain' || terr === 'Jungle' || terr === 'Forest') terrainMod = +1;
  }
  return Math.max(0, baseMob + terrainMod);
}

/**
 * Formats a tactical doctrine into an explicit, transparent summary of active modifiers.
 */
function formatTacticModifiers(t) {
  if (!t) return '';
  const p = [];
  if (t.atkPct) p.push(`${t.atkPct > 0 ? '+' : ''}${t.atkPct}% Atk`);
  if (t.defPct) p.push(`${t.defPct > 0 ? '+' : ''}${t.defPct}% Def`);
  if (t.returnFireAtkPct) p.push(`+${t.returnFireAtkPct}% RetAtk`);
  if (t.breakthroughPct) p.push(`+${t.breakthroughPct}% Breakthrough`);
  if (t.vigMod) p.push(`${t.vigMod > 0 ? '+' : ''}${t.vigMod} Vig`);
  if (t.flatAtk) p.push(`+${t.flatAtk} FlatAtk`);
  if (t.flatDef) p.push(`+${t.flatDef} FlatDef`);
  if (t.flatPierce) p.push(`+${t.flatPierce} Pierce`);
  if (t.casualtyReductionPct) p.push(`-${t.casualtyReductionPct}% Cas`);
  if (t.retreatBonus) p.push(`${t.retreatBonus > 0 ? '+' : ''}${t.retreatBonus} Ret`);
  if (t.pursueBonus) p.push(`+${t.pursueBonus} Pur`);
  if (t.supplyAdd) p.push(`+${t.supplyAdd} Sup/rd`);
  if (t.deniesEnemyOrgRec) p.push(`Blocks Org Rec`);
  if (t.hitOrgHeal) p.push(`+${t.hitOrgHeal} Org on Hit`);
  if (t.orgDmgPct) p.push(`+${t.orgDmgPct}% OrgDmg`);
  if (t.orgDmgResistPct) p.push(`-${t.orgDmgResistPct}% OrgDmg Taken`);
  if (t.bypassChance) p.push(`${t.bypassChance}% Bypass`);
  if (t.cooldown) p.push(`CD ${t.cooldown} rds`);
  return p.length > 0 ? ` (${p.join(', ')})` : '';
}

/**
 * Evaluates the maximum Entrenchment Level cap allowed by terrain and traits.
 */
function getUnitMaxEntrenchmentCap(unit) {
  const terr = state.environment.terrain;
  const feat = state.environment.feature;
  let cap = 3; // Baseline
  if (terr === 'Plains' || terr === 'Desert') cap = 2;
  else if (terr === 'Forest' || terr === 'Jungle' || terr === 'Marsh') cap = 3;
  else if (terr === 'Hills' || terr === 'Mountain') cap = 4;
  else if (terr === 'Urban') cap = 5;

  if (feat === 'Fort') cap = 5;
  if (unit && unit.traits && unit.traits.includes('fortification_engineer')) cap += 1;
  return cap;
}

/**
 * Evaluates environmental operational extraction and triage modifiers.
 */
function getTerrainOperationalMods(unitCategory) {
  const terr = state.environment.terrain;
  const feat = state.environment.feature;
  const isVehicle = (unitCategory === 'tank' || unitCategory === 'armored_vehicle');

  let retreatMod = 0;
  let vehicleRecMod = 0;
  let triageMod = 0; // Dead vs Wounded modifier

  if (isVehicle) {
    if (terr === 'Plains') { retreatMod += 15; vehicleRecMod += 15; }
    else if (terr === 'Desert') { retreatMod += 10; vehicleRecMod += 10; }
    else if (terr === 'Hills') { retreatMod -= 5; }
    else if (terr === 'Forest') { retreatMod -= 10; vehicleRecMod -= 10; }
    else if (terr === 'Urban') { retreatMod -= 15; vehicleRecMod -= 15; }
    else if (terr === 'Jungle') { retreatMod -= 20; vehicleRecMod -= 20; }
    else if (terr === 'Mountain') { retreatMod -= 25; vehicleRecMod -= 25; }
    else if (terr === 'Marsh') { retreatMod -= 30; vehicleRecMod -= 35; }
  } else {
    // Foot formations
    if (terr === 'Plains') retreatMod -= 10;
    else if (terr === 'Desert') retreatMod -= 15;
    else if (terr === 'Hills' || terr === 'Marsh') retreatMod += 10;
    else if (terr === 'Forest') retreatMod += 15;
    else if (terr === 'Urban') retreatMod += 20;
    else if (terr === 'Mountain' || terr === 'Jungle') retreatMod += 25;
  }

  // Environmental Triage (Medical evacuation ease)
  if (terr === 'Plains') triageMod += 5;
  else if (terr === 'Urban' || terr === 'Jungle' || terr === 'Desert') triageMod -= 10;
  else if (terr === 'Mountain' || terr === 'Marsh') triageMod -= 15;

  if (feat === 'Fort') { retreatMod -= 10; vehicleRecMod += 10; triageMod += 10; }
  if (feat === 'LargeRiver') { retreatMod -= 20; vehicleRecMod -= 20; triageMod -= 5; }

  return { retreatMod, vehicleRecMod, triageMod };
}

// --------------------------------------------------------------------------
// 3. Melee Distance & Gap-Closing Engine
// --------------------------------------------------------------------------

/**
 * Checks if a unit relies strictly on melee weapons / natural close-combat.
 */
function isMeleeUnit(u) {
  if (!u) return false;
  return u.traits.includes('melee_attack') || u.traits.includes('zombie_unit');
}

/**
 * Calculates initial engagement distance based on base terrain and fortifications.
 */
function getInitialEngagementDistance(u) {
  if (!isMeleeUnit(u)) return 0; // Ranged formations engage immediately at distance 0

  const terr = state.environment.terrain;
  const feat = state.environment.feature;

  let baseDist = 2; // Default broken ground
  if (terr === 'Plains' || terr === 'Desert') baseDist = 1;
  else if (terr === 'Mountain') baseDist = 3;

  let featDist = 0;
  if (feat === 'Road') featDist = -1;
  else if (feat === 'SmallRiver') featDist = 1;
  else if (feat === 'LargeRiver' || feat === 'Amphibious' || feat === 'Fort') featDist = 2;

  return Math.max(1, baseDist + featDist);
}

/**
 * Resolves defensive overwatch volley (enfilade fire) against advancing melee chargers.
 */
function resolveDefensiveOverwatchFire(defender, charger, defSide, atkSide, defTactic, atkTactic, vigResult) {
  const defTraits = defender.traits.map(getTraitById).filter(Boolean);

  // Defending unit fires from prepared positions
  const defDieSides = getCombatDieSides(defender, 'attack');
  const defDieRoll = rollDie(defDieSides);

  // Calculate defender firepower against the advancing charger
  const armorSplit = getEffectiveArmorSplit(charger);
  const defSoft = defender.softAttack + defTraits.reduce((s, t) => s + (t.softFlat || 0), 0);
  const defHard = defender.hardAttack + defTraits.reduce((s, t) => s + (t.hardFlat || 0), 0);

  const defAtkBase = (charger.armorTier === 'unarmored' || charger.maxArmor <= 0)
    ? defSoft
    : (defSoft * armorSplit.softRatio + defHard * armorSplit.hardRatio);

  const vigBonus = !vigResult.attackerWonVig ? vigResult.statBoost : 0;
  const defTotals = computeUnitTotalStat(defender, charger, defSide, atkSide, 'attack', defAtkBase, defDieRoll, vigBonus, defTactic, atkTactic, true);

  // Charger is caught in motion sprinting across open ground
  const chgDieSides = getCombatDieSides(charger, 'defense');
  const chgDieRoll = rollDie(chgDieSides);
  const chgBaseDef = Math.max(0, charger.defense - charger.roundTemp.defMalus);
  const chgTotals = computeUnitTotalStat(charger, defender, atkSide, defSide, 'defense', chgBaseDef, chgDieRoll, 0, atkTactic, defTactic, false);

  addLog(
    'rolls',
    `💥 [Defensive Overwatching Fire] Defending ${defender.name} shoots at advancing ${charger.name}! Volley Atk: ${defTotals.finalValue} VS Charger In-Motion Def: ${chgTotals.finalValue}`
  );

  if (defTotals.finalValue > chgTotals.finalValue) {
    const margin = Math.max(1, Math.round(defTotals.finalValue - chgTotals.finalValue));
    inflictCombatDamage(defender, charger, margin, defSide, atkSide, defTactic, atkTactic, 'Overwatch Volley');
  } else {
    // Charger weathers the overwatch volley: Evaluate Grazing vs Complete Immunity
    const chgGrazeResult = calculateGrazingCasualties(defender, charger, defTotals.finalValue, chgTotals.finalValue, false, false);

    if (chgGrazeResult.immune) {
      addLog('rolls', `🛡 [CHARGER IMMUNE] ${charger.name} shrugs off ${defender.name}'s overwatch volley: ${chgGrazeResult.reason} (0 casualties)!`);
    } else {
      addLog('damage', `🛡 [Grazing Shrapnel] ${charger.name} pushes through ${defender.name}'s defensive fire, but takes ${chgGrazeResult.casualties} suppressing casualties (${chgGrazeResult.reason})!`);
      applyPersonnelCasualties(charger, chgGrazeResult.casualties, false, false, 'Overwatch Grazing Fire', defTactic, atkTactic);
    }
  }
}

// --------------------------------------------------------------------------
// 4. Grazing Damage, Armor Immunity & Fortification Engine
// --------------------------------------------------------------------------

/**
 * Calculates grazing casualties and evaluates complete armor or fortification immunity.
 */
function calculateGrazingCasualties(attacker, defender, atkVal, defVal, isPierced, isReturnFire) {
  const atkTraits = attacker.traits.map(getTraitById).filter(Boolean);
  const hasHighCal = atkTraits.some(t => t.grantsHighCaliber) || attacker.category === 'armored_vehicle' || attacker.category === 'tank';
  const hasExplosive = atkTraits.some(t => t.grantsExplosive) || attacker.category === 'artillery';

  // 1. Super-Heavy and Heavy Armor Immunity vs Inadequate Weapons
  if (defender.armorTier === 'super' && !isPierced && !hasExplosive) {
    return { immune: true, casualties: 0, reason: 'Super-Heavy armor plating deflects small-arms fire and kinetic shrapnel' };
  }
  if (defender.maxArmor > 0 && (defender.armorTier === 'heavy' || defender.armorTier === 'medium') && !isPierced && !hasHighCal && !hasExplosive) {
    return { immune: true, casualties: 0, reason: 'Small-arms fire harmlessly ricochets off armored hull' };
  }

  // 2. Level 5 Deep Fortification Bunker Overhead Shelter Immunity
  if ((defender.entrenchmentLevel || 0) >= 5) {
    return { immune: true, casualties: 0, reason: 'Level 5 Deep Bunkers provide complete overhead protection' };
  }

  // 3. Pressure Ratio Threshold Check (Attack Value vs Defense Value)
  const ratio = atkVal / Math.max(1, defVal);
  const isFortified = state.environment.feature === 'Fort';
  const immunityThreshold = isFortified ? 0.60 : 0.40;

  if (ratio < immunityThreshold) {
    return {
      immune: true,
      casualties: 0,
      reason: `Attack (${atkVal}) was absorbed by defense (${defVal}) [Pressure ${Math.round(ratio * 100)}% < ${Math.round(immunityThreshold * 100)}% threshold]`
    };
  }

  // 4. Base Grazing Casualties by Pressure Ratio
  let rawGraze = 1;
  if (ratio >= 0.75) {
    rawGraze = 1 + rollDie(3); // Intense pressure
  } else if (ratio >= 0.50) {
    rawGraze = 1 + rollDie(2); // Moderate pressure
  }

  // 5. Fortification & Entrenchment Casualty Reduction
  let mitigation = 0;
  if (isFortified) mitigation += 2;
  if ((defender.entrenchmentLevel || 0) >= 3) mitigation += 1;

  const finalGraze = Math.max(0, rawGraze - mitigation);
  if (finalGraze === 0) {
    return { immune: true, casualties: 0, reason: `Fortifications and entrenchment absorbed all ${rawGraze} grazing fragments` };
  }

  return {
    immune: false,
    casualties: finalGraze,
    reason: `Pressure ${Math.round(ratio * 100)}% (${rawGraze} base - ${mitigation} fortified mitigation)`
  };
}