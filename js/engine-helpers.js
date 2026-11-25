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

  const DEFAULT_SIDE_NAMES = {
    A: 'BLUEFOR // SIDE A',
    B: 'OPFOR // SIDE B'
  };

  function getSideName(side) {
    const key = side === 'B' ? 'B' : 'A';
    const raw = key === 'A' ? ID.state?.battle?.sideA?.name : ID.state?.battle?.sideB?.name;
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    return trimmed || DEFAULT_SIDE_NAMES[key];
  }

  function makeUtcTimestamp(yr, monthIdx, day, hr = 0, mn = 0, sec = 0) {
    // Use setUTCFullYear so years 0..99 stay literal instead of being mapped to 1900..1999 by Date.UTC
    const d = new Date(0);
    d.setUTCFullYear(yr, monthIdx, day);
    d.setUTCHours(hr, mn, sec, 0);
    return d.getTime();
  }

  function formatYearLabel(y) {
    const n = Number(y);
    if (!Number.isFinite(n)) return '1944';
    if (n < 0) return `${Math.abs(n)} BCE`;
    return String(n);
  }

  function getSimulatedBattleDate(roundNumber = null) {
    const env = ID.state?.environment || {};
    const rawYr = (env.battleYear !== undefined && env.battleYear !== null && env.battleYear !== '') ? Number(env.battleYear) : 1944;
    const yr = Number.isFinite(rawYr) ? clamp(Math.trunc(rawYr), -270000, 270000) : 1944;
    const mo = clamp(Number(env.battleMonth) || 6, 1, 12);
    const dy = clamp(Number(env.battleDay) || 6, 1, 31);
    const hr = clamp(Number.isFinite(Number(env.battleHour)) ? Number(env.battleHour) : 6, 0, 23);
    const mn = clamp(Number.isFinite(Number(env.battleMinute)) ? Number(env.battleMinute) : 0, 0, 59);

    const durVal = Math.max(1, Number(env.roundDurationValue) || 30);
    const durUnit = env.roundDurationUnit || 'minutes';
    const multMs = durUnit === 'days' ? 86400000 : (durUnit === 'hours' ? 3600000 : 60000);

    const rd = (roundNumber !== null && roundNumber !== undefined)
      ? Math.max(1, Number(roundNumber) || 1)
      : Math.max(1, Number(ID.state?.battle?.round) || 1);

    const baseMs = makeUtcTimestamp(yr, mo - 1, dy, hr, mn, 0);
    return new Date(baseMs + (rd - 1) * durVal * multMs);
  }

  function formatClockHHMM(dateObj = null) {
    const d = dateObj instanceof Date ? dateObj : getSimulatedBattleDate();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function getOrdinalSuffix(n) {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}TH`;
    const mod10 = n % 10;
    if (mod10 === 1) return `${n}ST`;
    if (mod10 === 2) return `${n}ND`;
    if (mod10 === 3) return `${n}RD`;
    return `${n}TH`;
  }

  function getBattleDayOrdinal(roundNumber = null) {
    const startD = getSimulatedBattleDate(1);
    const curD = getSimulatedBattleDate(roundNumber);
    const startMidnight = makeUtcTimestamp(startD.getUTCFullYear(), startD.getUTCMonth(), startD.getUTCDate());
    const curMidnight = makeUtcTimestamp(curD.getUTCFullYear(), curD.getUTCMonth(), curD.getUTCDate());
    const dayNum = Math.max(1, Math.floor((curMidnight - startMidnight) / 86400000) + 1);
    return `${getOrdinalSuffix(dayNum)} DAY`;
  }

  function formatSimulatedClock(dateObj) {
    const d = dateObj instanceof Date ? dateObj : getSimulatedBattleDate();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mon = months[d.getUTCMonth()];
    const yyyy = formatYearLabel(d.getUTCFullYear());
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${dd} ${mon} ${yyyy} · ${hh}:${mm}`;
  }

  function getClockTimeOfDay(dateObj = null) {
    const d = dateObj instanceof Date ? dateObj : getSimulatedBattleDate();
    const hr = d.getUTCHours();
    if (hr >= 5 && hr <= 6) return { key: 'DuskDawn', phase: 'Dawn', label: 'DAWN' };
    if (hr >= 7 && hr <= 17) return { key: 'Day', phase: 'Daylight', label: 'DAYLIGHT' };
    if (hr >= 18 && hr <= 19) return { key: 'DuskDawn', phase: 'Dusk', label: 'DUSK' };
    return { key: 'Night', phase: 'Night', label: 'NIGHT' };
  }

  function getSeasonLabel(month) {
    const m = Number(month) || 9;
    if (m === 12 || m <= 2) return 'Winter';
    if (m >= 3 && m <= 5) return 'Spring';
    if (m >= 6 && m <= 8) return 'Summer';
    return 'Autumn';
  }

  function isWeatherAllowedInClimate(weatherKey, terrainKey, month, todPhase = 'Daylight') {
    const m = Number(month) || 9;
    const isSummer = (m >= 6 && m <= 8);
    const isColdSeason = (m === 11 || m === 12 || m <= 3);
    const isAlpineSnowSeason = (m >= 10 || m <= 4);
    const isDesertWarmSeason = (m >= 4 && m <= 10);
    const isNight = (todPhase === 'Night');

    if (terrainKey === 'Desert') {
      if (['Snowy', 'HeavyRain', 'Foggy'].includes(weatherKey)) return false;
      if (weatherKey === 'LightRain' && isSummer) return false;
      if (weatherKey === 'HeatWaves' && (!isDesertWarmSeason || isNight)) return false;
      return true;
    }
    if (terrainKey === 'Jungle') {
      if (weatherKey === 'Snowy') return false;
      if (weatherKey === 'HeatWaves' && isNight) return false;
      return true;
    }
    if (terrainKey === 'Mountain') {
      if (weatherKey === 'HeatWaves') return false;
      if (weatherKey === 'Snowy' && !isAlpineSnowSeason) return false;
      return true;
    }
    // Temperate terrains (Plains, Forest, Hills, Marsh, Urban, etc.)
    if (weatherKey === 'HeatWaves' && (!isSummer || isNight)) return false;
    if (weatherKey === 'Snowy' && !isColdSeason) return false;
    return true;
  }

  function getClimateWeatherCandidates(currentWeather, terrainKey, month, todPhase = 'Daylight') {
    const D = ID.Data || {};
    const curW = currentWeather || 'Sunny';
    const raw = (D.WEATHER_TRANSITIONS && D.WEATHER_TRANSITIONS[curW]) ? D.WEATHER_TRANSITIONS[curW] : ['Sunny', 'Overcast'];
    let candidates = raw.filter(w => w !== curW && isWeatherAllowedInClimate(w, terrainKey, month, todPhase));
    if (candidates.length === 0) {
      const allWeathers = Object.keys(D.WEATHER_TYPES || { Sunny: 1, Overcast: 1, Windy: 1 });
      candidates = allWeathers.filter(w => w !== curW && isWeatherAllowedInClimate(w, terrainKey, month, todPhase));
    }
    if (candidates.length === 0) {
      candidates = ['Sunny', 'Overcast', 'Windy'].filter(w => w !== curW);
    }
    return candidates;
  }

  function getRoundDurationLabel() {
    const env = ID.state?.environment || {};
    const durVal = Math.max(1, Number(env.roundDurationValue) || 30);
    const durUnit = env.roundDurationUnit || 'minutes';
    const unitTag = durUnit === 'days' ? (durVal === 1 ? 'DAY' : 'DAYS') : (durUnit === 'hours' ? (durVal === 1 ? 'HR' : 'HRS') : 'MIN');
    return `${durVal} ${unitTag}/RD`;
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
    const curDate = getSimulatedBattleDate(ID.state.battle.round || 1);
    ID.state.battle.logs.push({
      id: Date.now() + Math.random(),
      round: ID.state.battle.round || 1,
      clock: formatClockHHMM(curDate),
      dayLabel: getBattleDayOrdinal(ID.state.battle.round || 1),
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

    const envFx = getActiveEnvironmentEffects();
    if (isMotorizedOrArmor) {
      if (terr === 'Plains' || terr === 'Desert' || feat === 'Road') terrainMod = +1;
      else if (terr === 'Forest' || terr === 'Hills') terrainMod = -1;
      else if (terr === 'Mountain' || terr === 'Jungle' || terr === 'Marsh' || terr === 'Urban') terrainMod = -2;
      if (envFx.hasMud) {
        terrainMod -= (terr === 'Marsh' || terr === 'Plains') ? 2 : 1;
      }
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

  function getActiveEnvironmentEffects() {
    const D = ID.Data || {};
    const env = ID.state?.environment || {};
    const terrKey = env.terrain || 'Plains';
    const featKey = env.feature || 'Normal';
    const weathKey = env.weather || 'Sunny';
    const clockTod = getClockTimeOfDay(getSimulatedBattleDate());
    const todKey = clockTod.key;

    const terr = (ID.state?.terrains && ID.state.terrains[terrKey]) || D.DEFAULT_TERRAINS?.[terrKey] || D.DEFAULT_TERRAINS?.Plains || {};
    const feat = D.TERRAIN_FEATURES?.[featKey] || D.TERRAIN_FEATURES?.Normal || {};
    const weath = D.WEATHER_TYPES?.[weathKey] || D.WEATHER_TYPES?.Sunny || {};
    const tod = D.TIME_OF_DAY_TYPES?.[todKey] || D.TIME_OF_DAY_TYPES?.Day || { id: 'Day', name: 'Daylight', atkMod: 0, defMod: 0, vigMod: 0, airMod: 0, visCap: null, ambushBonus: 0 };

    const hazards = [];
    const closeTerrain = ['Urban', 'Forest', 'Jungle'].includes(terrKey) || !!terr.isUrban;

    const hasMud = (weathKey === 'HeavyRain' && (['Plains', 'Forest', 'Hills', 'Marsh'].includes(terrKey) || featKey === 'Road')) ||
                   (weathKey === 'LightRain' && terrKey === 'Marsh');
    if (hasMud && D.COMPOUND_HAZARDS?.mud_rasputitsa) {
      hazards.push(D.COMPOUND_HAZARDS.mud_rasputitsa);
    }

    const hasZeroVis = (weathKey === 'Foggy') || (todKey === 'Night' && closeTerrain);
    if (hasZeroVis && D.COMPOUND_HAZARDS?.zero_visibility) {
      hazards.push(D.COMPOUND_HAZARDS.zero_visibility);
    }

    const hasDeepFreeze = (weathKey === 'Snowy' && ['Mountain', 'Hills', 'Plains'].includes(terrKey));
    if (hasDeepFreeze && D.COMPOUND_HAZARDS?.deep_freeze) {
      hazards.push(D.COMPOUND_HAZARDS.deep_freeze);
    }

    const hasHeatstroke = (weathKey === 'HeatWaves' && terrKey === 'Desert');
    if (hasHeatstroke && D.COMPOUND_HAZARDS?.heatstroke_dust) {
      hazards.push(D.COMPOUND_HAZARDS.heatstroke_dust);
    }

    const effectiveAirMod = clamp((weath.airMod || 0) + (tod.airMod || 0), -90, 20);
    const airEfficiency = Math.max(0.10, 1 + effectiveAirMod / 100);

    let visCap = (tod.visCap !== undefined && tod.visCap !== null) ? tod.visCap : null;
    if (hasZeroVis) {
      const hazardCap = closeTerrain ? 3 : 4;
      visCap = visCap === null ? hazardCap : Math.min(visCap, hazardCap);
    }

    const baseEntrench = (terr.maxEntrench !== undefined && terr.maxEntrench !== null)
      ? Number(terr.maxEntrench)
      : (terrKey === 'Urban' || terrKey === 'Mountain' ? 6 : (terrKey === 'Marsh' || terrKey === 'Desert' ? 3 : 4));
    const maxEntrenchBase = clamp(baseEntrench + (feat.fortified ? 2 : 0), 1, 8);

    const baseOutnum = (terr.outnumberCap !== undefined && terr.outnumberCap !== null)
      ? Number(terr.outnumberCap)
      : 100;
    const outnumberCap = Math.max(25, baseOutnum - (feat.fortified ? 15 : 0) - ((feat.isRiver || feat.isAmphib) ? 15 : 0));

    const extraSupplyDrain = (hasMud ? 2 : 0) + (hasDeepFreeze ? 1 : 0);
    const extraDowRate = hasDeepFreeze ? 3 : 0;

    return {
      terrKey,
      featKey,
      weathKey,
      todKey,
      todPhase: clockTod.phase,
      todLabel: clockTod.label,
      terr,
      feat,
      weath,
      tod,
      hazards,
      hasMud,
      hasZeroVis,
      hasDeepFreeze,
      hasHeatstroke,
      effectiveAirMod,
      airEfficiency,
      visCap,
      maxEntrenchBase,
      outnumberCap,
      extraSupplyDrain,
      extraDowRate
    };
  }

  function getUnitMaxEntrenchmentCap(unit) {
    const envFx = getActiveEnvironmentEffects();
    let cap = envFx.maxEntrenchBase;
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

    const envFx = getActiveEnvironmentEffects();
    if (envFx.hasMud && isVehicle) {
      retreatMod -= 15;
      vehicleRecMod -= 15;
    }

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
    let baseRange = 2;
    if (u.category === 'artillery') baseRange = 12;
    else if (u.category === 'tank' || (u.category === 'armored_vehicle' && (u.traits || []).includes('anti_tank'))) baseRange = 3;
    else if (u.category === 'infantry' || u.category === 'armored_vehicle') baseRange = 2;

    const envFx = getActiveEnvironmentEffects();
    if (envFx.visCap !== null) {
      if (u.category === 'artillery') {
        const sideUnits = u.side === 'A' ? (ID.state?.battle?.sideA?.units || []) : (ID.state?.battle?.sideB?.units || []);
        const isAct = (ID.Combat && typeof ID.Combat.isUnitActive === 'function')
          ? ID.Combat.isUnitActive
          : (su => !su.defeated && !su.isRallying && su.personnel > 0);
        const hasSpotter = sideUnits.some(su => isAct(su) && su.traits && su.traits.includes('recon_support'));
        return hasSpotter ? baseRange : Math.min(baseRange, envFx.visCap + 1);
      }
      return Math.min(baseRange, envFx.visCap);
    }
    return baseRange;
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

  function getArtilleryRangeDispersionPct(attacker, totalDist) {
    if (!attacker || attacker.category !== 'artillery') return 0;
    const dist = Number(totalDist) || 0;
    if (dist <= 6) return 0;
    const rawPenalty = -Math.min(20, (dist - 6) * 4);
    const sideUnits = attacker.side === 'A'
      ? (ID.state?.battle?.sideA?.units || [])
      : (ID.state?.battle?.sideB?.units || []);
    const isAct = (ID.Combat && typeof ID.Combat.isUnitActive === 'function')
      ? ID.Combat.isUnitActive
      : (su => !su.defeated && !su.isRallying && su.personnel > 0);
    const hasSpotter = sideUnits.some(su => isAct(su) && su.traits && su.traits.includes('recon_support'));
    return hasSpotter ? Math.round(rawPenalty * 0.5) : rawPenalty;
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
  // 5. Custom Inline Military & NATO APP-6 SVG Icon Registry
  // --------------------------------------------------------------------------

  const MIL_SVGS = {
    infantry: '<svg class="mil-svg-icon" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1" y="1" width="14" height="10"/><path d="M1 1l14 10M15 1L1 11"/></svg>',
    tank: '<svg class="mil-svg-icon" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1" y="1" width="14" height="10"/><rect x="3.5" y="3.5" width="9" height="5" rx="2.5"/></svg>',
    armored_vehicle: '<svg class="mil-svg-icon" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1" y="1" width="14" height="10"/><path d="M1 1l14 10M15 1L1 11"/><rect x="4" y="3.5" width="8" height="5" rx="2.5"/></svg>',
    artillery: '<svg class="mil-svg-icon" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1" y="1" width="14" height="10"/><circle cx="8" cy="6" r="2.2" fill="currentColor"/></svg>',
    clash: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 12L12 2M12 12L2 2M9 2h3v3M5 2H2v3"/></svg>',
    armor: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M7 1.5L12 3.5v4c0 2.6-2.1 4.4-5 5-2.9-.6-5-2.4-5-5v-4L7 1.5z"/><path d="M4.5 7h5"/></svg>',
    recon: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M7 1v2.2M7 10.8V13M1 7h2.2M10.8 7H13"/></svg>',
    damage: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M7 1.5L12.5 7 7 12.5 1.5 7 7 1.5z"/><path d="M5 5l4 4M9 5L5 9"/></svg>',
    medic: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="1.5" y="1.5" width="11" height="11"/><path d="M7 4v6M4 7h6"/></svg>',
    org: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 10.5h10M3 7.5h8M4.5 4.5h5"/></svg>',
    rally: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 12.5v-11h8l-2 3 2 3H3"/></svg>',
    supply: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1.5" y="3" width="11" height="8.5"/><path d="M1.5 6h11M5.5 3v8.5"/></svg>',
    fire_support: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="7" cy="7" r="2.2"/><path d="M7 1.5v2M7 10.5v2M1.5 7h2M10.5 7h2M3 3l1.5 1.5M9.5 9.5L11 11M11 3L9.5 4.5M4.5 9.5L3 11"/></svg>',
    air: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M7 1.5v11M2 8l5-2.5L12 8M4.5 11.5L7 10.5l2.5 1"/></svg>',
    salvage: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M10.8 3.2a2.8 2.8 0 0 0-3.7 3.7L2.6 11.4l1.4 1.4 4.5-4.5a2.8 2.8 0 0 0 3.7-3.7l-1.5 1.5-1.4-1.4 1.5-1.5z"/></svg>',
    victory: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><polygon points="7,1.5 8.7,5 12.5,5.5 9.7,8.1 10.4,12 7,10.1 3.6,12 4.3,8.1 1.5,5.5 5.3,5"/></svg>',
    alert: '<svg class="mil-svg-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polygon points="7,1.5 13,12 1,12"/><path d="M7 5.5v3M7 10.3v.4"/></svg>'
  };

  function getIcon(name) {
    return MIL_SVGS[name] || MIL_SVGS.clash;
  }

  function getIconForLog(category, text) {
    const t = String(text || '');
    if (category === 'error' || t.includes('[SYS]')) return MIL_SVGS.alert;
    if (t.includes('[VIC]') || t.includes('[END]') || t.includes('BATTLE OVER')) return MIL_SVGS.victory;
    if (t.includes('[FS-AIR]') || t.includes('[AA]') || t.includes('[Air Support]')) return MIL_SVGS.air;
    if (t.includes('[FS-ART]') || t.includes('[FS-MORT]') || t.includes('Barrage') || t.includes('Mortar')) return MIL_SVGS.fire_support;
    if (t.includes('[MED]') || t.includes('Casualty Recovery') || t.includes('Died of Wounds') || t.includes('Field Medic')) return MIL_SVGS.medic;
    if (t.includes('[SLV]') || t.includes('[REP]') || t.includes('Salvage') || t.includes('Recovery Tractors')) return MIL_SVGS.salvage;
    if (t.includes('[RLY]') || t.includes('[ROUT]') || t.includes('Rally') || t.includes('Rout')) return MIL_SVGS.rally;
    if (t.includes('[REC]') || t.includes('[TGT]') || t.includes('Vigilance')) return MIL_SVGS.recon;
    if (t.includes('[LOG]') || t.includes('[DEPOT]') || t.includes('Supply') || t.includes('Depot')) return MIL_SVGS.supply;
    if (t.includes('[ORG]') || t.includes('[ORG+]') || t.includes('[ORG-]')) return MIL_SVGS.org;
    if (category === 'armor' || t.includes('[AP]') || t.includes('[AFV]')) return MIL_SVGS.armor;
    if (category === 'damage' || t.includes('[CAS]') || t.includes('[KIA]')) return MIL_SVGS.damage;
    if (category === 'support') return MIL_SVGS.supply;
    return MIL_SVGS.clash;
  }


  // Military Rank Insignia SVGs (Experience Tiers)
  const RANK_SVGS = {
    // Green: Blank rank patch (no chevrons)
    Green: '<svg class="mil-rank-svg" width="16" height="18" viewBox="0 0 18 20" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="2" y="2" width="14" height="16" rx="1" stroke-opacity="0.45" stroke-dasharray="2 1.5"/></svg>',
    // Trained: Private (1 upward chevron)
    Trained: '<svg class="mil-rank-svg" width="16" height="18" viewBox="0 0 18 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 12.5L9 7.5L14 12.5"/></svg>',
    // Regular: Corporal (2 upward chevrons)
    Regular: '<svg class="mil-rank-svg" width="16" height="18" viewBox="0 0 18 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 10.5L9 5.5L14 10.5"/><path d="M4 14.5L9 9.5L14 14.5"/></svg>',
    // Seasoned: Sergeant (3 upward chevrons)
    Seasoned: '<svg class="mil-rank-svg" width="16" height="18" viewBox="0 0 18 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 8.5L9 3.8L14 8.5"/><path d="M4 12.2L9 7.5L14 12.2"/><path d="M4 15.9L9 11.2L14 15.9"/></svg>',
    // Veteran: Staff Sergeant (3 upward chevrons + 1 bottom rocker arc)
    Veteran: '<svg class="mil-rank-svg" width="16" height="18" viewBox="0 0 18 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 7.5L9 3L14 7.5"/><path d="M4 10.7L9 6.2L14 10.7"/><path d="M4 13.9L9 9.4L14 13.9"/><path d="M4 16.2Q9 18.8 14 16.2"/></svg>',
    // Elite: One Star (5-point command star)
    Elite: '<svg class="mil-rank-svg" width="16" height="18" viewBox="0 0 18 20" fill="currentColor" stroke="currentColor" stroke-width="0.6" aria-hidden="true"><polygon points="9,3.5 10.8,7.9 15.5,8.2 11.9,11.3 13,15.9 9,13.4 5,15.9 6.1,11.3 2.5,8.2 7.2,7.9"/></svg>'
  };

  function getRankIcon(exp) {
    return RANK_SVGS[exp] || RANK_SVGS.Regular;
  }

  // 10-Tier Officer Rank Insignia (steps every 4 total commander stat points: 0..36+)
  const OFFICER_RANKS = [
    {
      tier: 0, title: 'First Lieutenant', abbr: '1LT',
      svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9.5" y="2" width="5" height="14" fill="#d8dee4" stroke="#6f7882" stroke-width="1"/></svg>'
    },
    {
      tier: 1, title: 'Captain', abbr: 'CPT',
      svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4.5" y="2" width="4.5" height="14" fill="#d8dee4" stroke="#6f7882" stroke-width="0.9"/><rect x="15" y="2" width="4.5" height="14" fill="#d8dee4" stroke="#6f7882" stroke-width="0.9"/><line x1="9" y1="6" x2="15" y2="6" stroke="#c5ccd4" stroke-width="1.3"/><line x1="9" y1="12" x2="15" y2="12" stroke="#c5ccd4" stroke-width="1.3"/></svg>'
    },
    {
      tier: 2, title: 'Major', abbr: 'MAJ',
      svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14 5.5L18 4.5L16 8.5L19 11L15 12L14.5 14.5L12 13.5L9.5 14.5L9 12L5 11L8 8.5L6 4.5L10 5.5L12 2Z" fill="#d4af37" stroke="#7d6418" stroke-width="0.9"/><line x1="12" y1="13.5" x2="12" y2="16.5" stroke="#d4af37" stroke-width="1.5"/></svg>'
    },
    {
      tier: 3, title: 'Lieutenant Colonel', abbr: 'LTC',
      svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14 5.5L18 4.5L16 8.5L19 11L15 12L14.5 14.5L12 13.5L9.5 14.5L9 12L5 11L8 8.5L6 4.5L10 5.5L12 2Z" fill="#d8dee4" stroke="#6f7882" stroke-width="0.9"/><line x1="12" y1="13.5" x2="12" y2="16.5" stroke="#d8dee4" stroke-width="1.5"/></svg>'
    },
    {
      tier: 4, title: 'Colonel', abbr: 'COL',
      svg: '<svg width="26" height="18" viewBox="0 0 26 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3L14.5 5.5L23 4.5L20 9.5L16 9.5L15.5 14.5L13 13L10.5 14.5L10 9.5L6 9.5L3 4.5L11.5 5.5L13 3Z" fill="#d8dee4" stroke="#6f7882" stroke-width="0.9"/></svg>'
    },
    {
      tier: 5, title: 'Brigadier General', abbr: 'BG',
      svg: '<svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="12,2 13.7,6.8 18.8,6.8 14.7,9.8 16.2,14.6 12,11.7 7.8,14.6 9.3,9.8 5.2,6.8 10.3,6.8" fill="#e4e9ee" stroke="#76808a" stroke-width="0.8"/></svg>'
    },
    {
      tier: 6, title: 'Major General', abbr: 'MG',
      svg: '<svg width="28" height="18" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="8,3 9.3,6.8 13.2,6.8 10,9.1 11.2,13 8,10.7 4.8,13 6,9.1 2.8,6.8 6.7,6.8" fill="#e4e9ee" stroke="#76808a" stroke-width="0.7"/><polygon points="20,3 21.3,6.8 25.2,6.8 22,9.1 23.2,13 20,10.7 16.8,13 18,9.1 14.8,6.8 18.7,6.8" fill="#e4e9ee" stroke="#76808a" stroke-width="0.7"/></svg>'
    },
    {
      tier: 7, title: 'Lieutenant General', abbr: 'LTG',
      svg: '<svg width="34" height="18" viewBox="0 0 34 18" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="6.5,4 7.6,7.1 10.8,7.1 8.2,9 9.2,12.2 6.5,10.3 3.8,12.2 4.8,9 2.2,7.1 5.4,7.1" fill="#e4e9ee" stroke="#76808a" stroke-width="0.6"/><polygon points="17,4 18.1,7.1 21.3,7.1 18.7,9 19.7,12.2 17,10.3 14.3,12.2 15.3,9 12.7,7.1 15.9,7.1" fill="#e4e9ee" stroke="#76808a" stroke-width="0.6"/><polygon points="27.5,4 28.6,7.1 31.8,7.1 29.2,9 30.2,12.2 27.5,10.3 24.8,12.2 25.8,9 23.2,7.1 26.4,7.1" fill="#e4e9ee" stroke="#76808a" stroke-width="0.6"/></svg>'
    },
    {
      tier: 8, title: 'General', abbr: 'GEN',
      svg: '<svg width="38" height="18" viewBox="0 0 38 18" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="5.5,4.5 6.4,7.2 9.2,7.2 7,8.8 7.8,11.5 5.5,9.9 3.2,11.5 4,8.8 1.8,7.2 4.6,7.2" fill="#e4e9ee" stroke="#76808a" stroke-width="0.55"/><polygon points="14.5,4.5 15.4,7.2 18.2,7.2 16,8.8 16.8,11.5 14.5,9.9 12.2,11.5 13,8.8 10.8,7.2 13.6,7.2" fill="#e4e9ee" stroke="#76808a" stroke-width="0.55"/><polygon points="23.5,4.5 24.4,7.2 27.2,7.2 25,8.8 25.8,11.5 23.5,9.9 21.2,11.5 22,8.8 19.8,7.2 22.6,7.2" fill="#e4e9ee" stroke="#76808a" stroke-width="0.55"/><polygon points="32.5,4.5 33.4,7.2 36.2,7.2 34,8.8 34.8,11.5 32.5,9.9 30.2,11.5 31,8.8 28.8,7.2 31.6,7.2" fill="#e4e9ee" stroke="#76808a" stroke-width="0.55"/></svg>'
    },
    {
      tier: 9, title: 'General of the Army', abbr: 'GA',
      svg: '<svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="13,1.5 13.8,3.9 16.3,3.9 14.3,5.4 15,7.8 13,6.3 11,7.8 11.7,5.4 9.7,3.9 12.2,3.9" fill="#f0d27a" stroke="#8a6d20" stroke-width="0.5"/><polygon points="20.5,6.8 21.3,9.2 23.8,9.2 21.8,10.7 22.5,13.1 20.5,11.6 18.5,13.1 19.2,10.7 17.2,9.2 19.7,9.2" fill="#f0d27a" stroke="#8a6d20" stroke-width="0.5"/><polygon points="17.8,14.5 18.6,16.9 21.1,16.9 19.1,18.4 19.8,20.8 17.8,19.3 15.8,20.8 16.5,18.4 14.5,16.9 17,16.9" fill="#f0d27a" stroke="#8a6d20" stroke-width="0.5"/><polygon points="8.2,14.5 9,16.9 11.5,16.9 9.5,18.4 10.2,20.8 8.2,19.3 6.2,20.8 6.9,18.4 4.9,16.9 7.4,16.9" fill="#f0d27a" stroke="#8a6d20" stroke-width="0.5"/><polygon points="5.5,6.8 6.3,9.2 8.8,9.2 6.8,10.7 7.5,13.1 5.5,11.6 3.5,13.1 4.2,10.7 2.2,9.2 4.7,9.2" fill="#f0d27a" stroke="#8a6d20" stroke-width="0.5"/></svg>'
    }
  ];

  function getOfficerRankInfo(cmd) {
    if (!cmd || cmd.id === 'cmd_none') {
      return { tier: -1, total: 0, title: 'Autonomous Staff', abbr: 'HQ', svg: '' };
    }
    const total = (Number(cmd.attackLevel) || 0) + (Number(cmd.defenseLevel) || 0) + (Number(cmd.commandLevel) || 0) + (Number(cmd.logisticsLevel) || 0);
    const tier = clamp(Math.floor(total / 4), 0, OFFICER_RANKS.length - 1);
    return { ...OFFICER_RANKS[tier], total };
  }

  function getOfficerRankIcon(cmd) {
    return getOfficerRankInfo(cmd).svg;
  }

  ID.Icons = {
    SVGS: MIL_SVGS,
    RANKS: RANK_SVGS,
    OFFICER_RANKS,
    get: getIcon,
    getRank: getRankIcon,
    getOfficerRankInfo,
    getOfficerRank: getOfficerRankIcon,
    getForLog: getIconForLog
  };

  // --------------------------------------------------------------------------
  // Expose on IronDivision.Helpers
  // --------------------------------------------------------------------------

  ID.Helpers = {
    rollDie,
    clamp,
    DEFAULT_SIDE_NAMES,
    getSideName,
    getSimulatedBattleDate,
    formatClockHHMM,
    getBattleDayOrdinal,
    formatYearLabel,
    formatSimulatedClock,
    getClockTimeOfDay,
    getRoundDurationLabel,
    getSeasonLabel,
    isWeatherAllowedInClimate,
    getClimateWeatherCandidates,
    getTraitById,
    addLog,
    showToast,
    safeSaveStorage,
    safeLoadStorage,
    getTerrainCoverRating,
    getUnitMobilityClass,
    getUnitEffectiveSpeed,
    formatTacticModifiers,
    getActiveEnvironmentEffects,
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
    getArtilleryRangeDispersionPct,
    calculateGrazingCasualties
  };

  // Backwards-compatible bindings on window
  window.rollDie = rollDie;
  window.clamp = clamp;
  window.getSideName = getSideName;
  window.getTraitById = getTraitById;
  window.addLog = addLog;
  window.showToast = showToast;
  window.safeSaveStorage = safeSaveStorage;
  window.safeLoadStorage = safeLoadStorage;

})(window.IronDivision);