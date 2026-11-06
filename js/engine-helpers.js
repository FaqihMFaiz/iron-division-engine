/* ==========================================================================
   IRON DIVISION ENGINE — MATHEMATICAL & OPERATIONAL HELPERS
   File: js/engine-helpers.js
   ========================================================================== */
window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Core Utilities & Storage
  // --------------------------------------------------------------------------

  function rollDie(sides) {
    if (sides <= 0) return 0;
    return Math.floor(Math.random() * sides) + 1;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function getTraitById(id) {
    if (ID.state && ID.state.traits) {
      const found = ID.state.traits.find(t => t.id === id);
      if (found) return found;
    }
    if (ID.Data && ID.Data.DEFAULT_TRAITS) {
      return ID.Data.DEFAULT_TRAITS.find(t => t.id === id) || null;
    }
    return null;
  }

  function addLog(category, text) {
    if (!ID.state || !ID.state.battle) {
      console.log(`[Combat Log Standby (${category})]`, text);
      return;
    }
    if (!ID.state.battle.logs) ID.state.battle.logs = [];
    ID.state.battle.logs.push({
      id: Date.now() + Math.random(),
      round: ID.state.battle.round || 1,
      category: category,
      text: text
    });
  }

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

  function safeSaveStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      // Ignore sandboxed iframe restriction exceptions
    }
  }

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

  function getTerrainCoverRating(unit) {
    const env = ID.state?.environment || {};
    const terr = env.terrain;
    const feat = env.feature;
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

  function getUnitMobilityClass(u) {
    if (u.category === 'artillery') return 0;
    if (u.category === 'infantry') {
      const specialized = ['mountaineers', 'marines', 'rangers', 'special_forces'];
      if (u.traits && u.traits.some(t => specialized.includes(t))) return 2;
      return 1;
    }
    if (u.category === 'tank') {
      if (u.armorTier === 'heavy' || u.armorTier === 'super') return 3;
      return 4;
    }
    if (u.category === 'armored_vehicle') {
      if (u.armorTier === 'light') return 5;
      return 4;
    }
    return 1;
  }

  function getUnitEffectiveSpeed(u) {
    const baseMob = getUnitMobilityClass(u) - (u.mobilityClassPenalty || 0);
    const env = ID.state?.environment || {};
    const terr = env.terrain;
    const feat = env.feature;
    let terrainMod = 0;

    const isMotorizedOrArmor = u.category === 'tank' || u.category === 'armored_vehicle';

    if (isMotorizedOrArmor) {
      if (terr === 'Plains' || terr === 'Desert' || feat === 'Road') terrainMod = +1;
      else if (terr === 'Forest' || terr === 'Hills') terrainMod = -1;
      else if (terr === 'Mountain' || terr === 'Jungle' || terr === 'Marsh' || terr === 'Urban') terrainMod = -2;
    } else {
      if (terr === 'Mountain' || terr === 'Jungle' || terr === 'Forest') terrainMod = +1;
    }
    return Math.max(0, baseMob + terrainMod);
  }

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

  function getUnitMaxEntrenchmentCap(unit) {
    const env = ID.state?.environment || {};
    const terr = env.terrain;
    const feat = env.feature;
    let cap = 3;

    if (terr === 'Plains' || terr === 'Desert') cap = 2;
    else if (terr === 'Forest' || terr === 'Jungle' || terr === 'Marsh') cap = 3;
    else if (terr === 'Hills' || terr === 'Mountain') cap = 4;
    else if (terr === 'Urban') cap = 5;

    if (feat === 'Fort') cap = 5;
    if (unit && unit.traits && unit.traits.includes('fortification_engineer')) cap += 1;
    return cap;
  }

  function getTerrainOperationalMods(unitCategory) {
    const env = ID.state?.environment || {};
    const terr = env.terrain;
    const feat = env.feature;
    const isVehicle = (unitCategory === 'tank' || unitCategory === 'armored_vehicle');

    let retreatMod = 0;
    let vehicleRecMod = 0;
    let triageMod = 0;

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
      if (terr === 'Plains') retreatMod -= 10;
      else if (terr === 'Desert') retreatMod -= 15;
      else if (terr === 'Hills' || terr === 'Marsh') retreatMod += 10;
      else if (terr === 'Forest') retreatMod += 15;
      else if (terr === 'Urban') retreatMod += 20;
      else if (terr === 'Mountain' || terr === 'Jungle') retreatMod += 25;
    }

    if (terr === 'Plains') triageMod += 5;
    else if (terr === 'Urban' || terr === 'Jungle' || terr === 'Desert') triageMod -= 10;
    else if (terr === 'Mountain' || terr === 'Marsh') triageMod -= 15;

    if (feat === 'Fort') { retreatMod -= 10; vehicleRecMod += 10; triageMod += 10; }
    if (feat === 'LargeRiver') { retreatMod -= 20; vehicleRecMod -= 20; triageMod -= 5; }

    return { retreatMod, vehicleRecMod, triageMod };
  }

  // --------------------------------------------------------------------------
  // 3. Y-Axis Spatial Distance & Engagement Range Engine
  // --------------------------------------------------------------------------

  function getBaseTerrainDistance() {
    const env = ID.state?.environment || {};
    const terr = env.terrain;
    const feat = env.feature;

    let baseDist = 2;
    if (terr === 'Plains' || terr === 'Desert' || terr === 'Urban') {
      baseDist = 2;
    } else if (terr === 'Forest' || terr === 'Hills' || terr === 'Marsh' || terr === 'Jungle') {
      baseDist = 3;
    } else if (terr === 'Mountain') {
      baseDist = 4;
    }

    if (feat === 'Road') baseDist = Math.max(1, baseDist - 1);
    else if (feat === 'LargeRiver' || feat === 'Amphibious') baseDist += 1;

    return baseDist;
  }

  function getUnitStartingPosition(u) {
    const baseDist = getBaseTerrainDistance();
    if (u && u.category === 'artillery') {
      return baseDist + 2;
    }
    return baseDist;
  }

  function isMeleeUnit(u) {
    if (!u) return false;
    return (u.traits && u.traits.includes('melee_attack')) || u.isZombie || (u.traits && u.traits.includes('zombie_unit'));
  }

  function getUnitEngagementRange(u) {
    if (!u) return 2;
    if (u.isZombie || (u.traits && u.traits.includes('zombie_unit'))) return 1;
    if (u.category === 'artillery') return 6;
    if (u.category === 'tank') return 3;
    if (u.category === 'infantry' || u.category === 'armored_vehicle') return 2;
    return 2;
  }

  function getTotalDistance(unitA, unitB) {
    const posA = (unitA && unitA.pos !== undefined && unitA.pos !== null) ? unitA.pos : getUnitStartingPosition(unitA);
    const posB = (unitB && unitB.pos !== undefined && unitB.pos !== null) ? unitB.pos : getUnitStartingPosition(unitB);
    return Math.max(0, posA + posB);
  }

  function canUnitIgnoreDistance(u, sideTactic = null) {
    if (!u) return false;
    const traits = u.traits || [];
    if (traits.includes('special_forces') || traits.includes('infiltration_specialist')) {
      return true;
    }
    if (sideTactic && (sideTactic.id === 'atk_infiltration' || sideTactic.id === 'urb_atk_mouse_holing')) {
      return true;
    }
    return false;
  }

  function canUnitEngageTarget(attacker, defender, atkTactic = null) {
    if (!attacker || !defender) return false;
    if (canUnitIgnoreDistance(attacker, atkTactic)) return true;
    const totalDist = getTotalDistance(attacker, defender);
    const maxRange = getUnitEngagementRange(attacker);
    return totalDist <= maxRange;
  }

  function getDistanceTargetMultiplier(totalDist) {
    if (totalDist <= 0) return 3.00;
    if (totalDist === 1) return 2.50;
    if (totalDist === 2) return 1.85;
    if (totalDist === 3) return 1.25;
    if (totalDist === 4) return 0.60;
    if (totalDist === 5) return 0.30;
    return 0.15;
  }

  // --------------------------------------------------------------------------
  // 4. Grazing Damage, Armor Immunity & Fortification Engine
  // --------------------------------------------------------------------------

  function calculateGrazingCasualties(attacker, defender, atkVal, defVal, isPierced, isReturnFire) {
    const atkTraits = (attacker.traits || []).map(getTraitById).filter(Boolean);
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

    // 3. Pressure Ratio Threshold Check
    const ratio = atkVal / Math.max(1, defVal);
    const isFortified = ID.state?.environment?.feature === 'Fort';
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
      rawGraze = 1 + rollDie(3);
    } else if (ratio >= 0.50) {
      rawGraze = 1 + rollDie(2);
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

  // --------------------------------------------------------------------------
  // Expose on IronDivision.Helpers
  // --------------------------------------------------------------------------

  ID.Helpers = {
    rollDie,
    clamp,
    getTraitById,
    addLog,
    showToast,
    safeSaveStorage,
    safeLoadStorage,
    getTerrainCoverRating,
    getUnitMobilityClass,
    getUnitEffectiveSpeed,
    formatTacticModifiers,
    getUnitMaxEntrenchmentCap,
    getTerrainOperationalMods,
    getBaseTerrainDistance,
    getUnitStartingPosition,
    isMeleeUnit,
    getUnitEngagementRange,
    getTotalDistance,
    canUnitIgnoreDistance,
    canUnitEngageTarget,
    getDistanceTargetMultiplier,
    calculateGrazingCasualties
  };

  // Backwards-compatible bindings on window
  window.rollDie = rollDie;
  window.clamp = clamp;
  window.getTraitById = getTraitById;
  window.addLog = addLog;
  window.showToast = showToast;
  window.safeSaveStorage = safeSaveStorage;
  window.safeLoadStorage = safeLoadStorage;

})(window.IronDivision);