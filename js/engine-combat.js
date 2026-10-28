/* ==========================================================================
   IRON DIVISION ENGINE — COMBAT ENGINE & ENGAGEMENT RESOLUTION
   File: js/engine-combat.js
   ========================================================================== */

let instanceCounter = 1;

// --------------------------------------------------------------------------
// 1. Unit Factory & Lifecycle Helpers
// --------------------------------------------------------------------------

function createCombatUnitInstance(template, side) {
  const traitObjs = (template.traits || []).map(tid => getTraitById(tid)).filter(Boolean);
  const isMonster = traitObjs.some(t => t.isMonster);
  const isZombie = traitObjs.some(t => t.isZombie);
  const cmd = getSideCommander(side);
  const cmdTraits = (cmd && cmd.traits) ? cmd.traits.map(getCommanderTraitById).filter(Boolean) : [];

  let orgBonusMult = 1.0;
  cmdTraits.forEach(t => {
    if (traitAppliesToUnit(t, template) && t.maxOrgPct) {
      orgBonusMult += (t.maxOrgPct / 100);
    }
  });

  const cmdOrgMult = 1 + ((cmd ? cmd.commandLevel || 0 : 0) * 0.025);
  const cmdSupplyMult = 1 + ((cmd ? cmd.logisticsLevel || 0 : 0) * 0.025);

  const maxOrg = Math.round(template.maxOrg * orgBonusMult * cmdOrgMult);
  const maxSupply = Math.round((template.maxSupply || 40) * cmdSupplyMult);

  // Inherent rules: Armored units gain High-Caliber; Artillery gains Explosives
  const traitSet = new Set(template.traits || []);
  if (template.category === 'armored_vehicle' || template.category === 'tank') {
    traitSet.add('high_caliber');
  }
  if (template.category === 'artillery') {
    traitSet.add('explosive_weapon');
  }

  return {
    instanceId: `unit_${Date.now()}_${instanceCounter++}`,
    templateId: template.id,
    name: template.name,
    side: side,
    category: template.category,
    armorTier: template.armorTier,
    maxPersonnel: Number(template.personnel),
    personnel: Number(template.personnel),
    dead: 0,
    wounded: 0,
    captured: 0,
    escaped: 0,
    maxOrg: maxOrg,
    org: maxOrg,
    originalMaxArmor: Number(template.armorCount || 0),
    maxArmor: Number(template.armorCount || 0),
    armor: Number(template.armorCount || 0),
    recoverableArmor: 0,
    unrecoverableArmor: 0,
    abandonedArmor: 0,
    isDismounted: false,
    maxSupply: Number(template.maxSupply || 40),
    supply: Number(template.maxSupply || 40),
    softAttack: Number(template.softAttack),
    hardAttack: Number(template.hardAttack),
    defense: Number(template.defense),
    piercing: Number(template.piercing),
    hardness: Number(template.hardness),
    experience: template.experience || 'Regular',
    traits: Array.from(traitSet),

    // Dynamic Tracking Flags
    isMonster: isMonster,
    isZombie: isZombie,
    defeated: false,
    defeatReason: '',
    supplyBelow50Triggered: false,
    supplyBelow20Triggered: false,
    cumPersonnelLostTenths: 0,
    cumArmorLostTenths: 0,
    supportCooldowns: {
      mortar: 0,
      heavy_artillery: 0,
      air_support: 0
    },
    meleeDistance: null,
    mobilityClassPenalty: 0,
    entrenchmentLevel: 0,
    isRallying: false,
    rallyRoundsLeft: 0,
    ralliedPersonnel: 0,
    ralliedOnce: false,
    unbreakableRoundsLeft: null,
    roundTemp: {
      defMalus: 0,
      hardMalus: 0,
      attackedThisRound: false,
      engagedByCount: 0,
      inflictedCasualtiesLastRound: 0,
      lostTenPctLastRound: false,
      fortifiedOrgReductionUsed: false,
      inCover: false,
      coverDenied: false
    }
  };
}

function getTraitById(id) {
  return state.traits.find(t => t.id === id);
}

function getSideCommander(side) {
  const sideObj = side === 'A' ? state.battle.sideA : state.battle.sideB;
  return state.commanders.find(c => c.id === sideObj.commanderId) || state.commanders[0];
}

function traitAppliesToUnit(trait, unit) {
  if (!trait || !trait.targetUnitCategory) return true;
  return trait.targetUnitCategory === unit.category;
}

function isUnitActive(u) {
  if (u.defeated) return false;
  if (u.isRallying) return false; // Safe in rear staging area
  if (u.personnel <= 0) return false;
  if (!u.isDismounted && u.maxArmor > 0 && u.armor <= 0) return false;

  const hasUnbreakable = u.traits.some(tid => {
    const t = getTraitById(tid);
    return t && t.isUnbreakable;
  });

  if (!u.isMonster && !u.isZombie && u.org <= 0) {
    if (hasUnbreakable && u.unbreakableRoundsLeft !== 0) return true;
    return false;
  }
  return true;
}

function triggerUnitRally(u, reason) {
  if (u.isRallying || u.defeated) return;

  u.isRallying = true;
  const cmd = getSideCommander(u.side);
  const baseCooldown = 2 + rollDie(2);

  let durationRed = 0;
  if (cmd) {
    const cmdTraitObjs = (cmd.traits || []).map(tid => getCommanderTraitById(tid)).filter(Boolean);
    durationRed = cmdTraitObjs.reduce((s, t) => s + (t.rallyDurationRed || 0), 0);
  }

  u.rallyRoundsLeft = Math.max(1, baseCooldown - durationRed);

  // --- SCATTERED TROOPS JOIN THE "ESCAPED" POOL ---
  // 75% hold together to regroup; 25% scatter and flee the battle zone
  const retainedCount = Math.max(15, Math.round(u.personnel * 0.75));
  const scatteredCount = u.personnel - retainedCount;

  if (scatteredCount > 0) {
    u.escaped = (u.escaped || 0) + scatteredCount;
    u.personnel = retainedCount;
    u.ralliedPersonnel = retainedCount;
    addLog('damage', `🏃 [Rout & Scatter] ${u.name} broke (${reason})! ${scatteredCount} troops scattered and escaped the battlefield; ${retainedCount} disciplined soldiers fall back to regroup (${u.rallyRoundsLeft} rds to rally).`);
  } else {
    u.ralliedPersonnel = u.personnel;
    addLog('damage', `🏳 [Rout & Fallback] ${u.name} broke (${reason})! Surviving ${u.personnel} troops fall back in order to regroup (${u.rallyRoundsLeft} rds to rally).`);
  }

  if (u.originalMaxArmor > 0) {
    if (u.armor <= 0) {
      u.isDismounted = true;
      u.maxArmor = 0;
      addLog('armor', `🚜 [Dismounted Rout] ${u.name} has 0 operational armor remaining; surviving crews fall back on foot.`);
    } else {
      u.isDismounted = false;
      addLog('armor', `🚜 [Armor Tactical Fallback] ${u.name} withdraws to the rear with its ${u.armor} active combat vehicles to reorganize.`);
    }
  }

  u.entrenchmentLevel = 0;
}

function checkAndMarkUnitDefeat(u) {
  if (u.defeated) return true;
  if (u.isRallying) return false;

  if (u.personnel <= 0) {
    u.personnel = 0;
    u.defeated = true;
    u.defeatReason = 'All personnel eliminated';
    addLog('damage', `💀 [${u.side}] ${u.name} has lost all active personnel and is wiped out!`);
    return true;
  }

  if (!u.isDismounted && u.maxArmor > 0 && u.armor <= 0) {
    u.armor = 0;
    if (!u.ralliedOnce && u.personnel > 20) {
      triggerUnitRally(u, 'All combat-ready armor disabled');
      return false;
    } else {
      u.defeated = true;
      u.defeatReason = 'All combat-ready armor destroyed/disabled';
      addLog('armor', `🔥 [${u.side}] ${u.name} has 0 combat-ready armor remaining and is defeated!`);
      return true;
    }
  }

  const hasUnbreakable = u.traits.some(tid => {
    const t = getTraitById(tid);
    return t && t.isUnbreakable;
  });

  if (!u.isMonster && !u.isZombie && u.org <= 0) {
    u.org = 0;
    if (!hasUnbreakable) {
      if (!u.ralliedOnce && u.personnel > 20) {
        triggerUnitRally(u, 'Cohesion broke');
        return false;
      } else {
        u.defeated = true;
        u.defeatReason = 'Organization broke (Permanently routed)';
        addLog('damage', `🏳 [${u.side}] ${u.name} reached 0 Organization! Cohesion broke and the unit is permanently routed!`);
        return true;
      }
    } else {
      if (u.unbreakableRoundsLeft === null || u.unbreakableRoundsLeft === undefined) {
        u.unbreakableRoundsLeft = 2;
        addLog('damage', `🛡 [Unbreakable Stand] ${u.name} reached 0 Organization! Unbreakable triggers: formation can fight on for 2 rounds at -25% stats before collapsing!`);
      }
      return false;
    }
  }
  return false;
}

function getUnitTargetValue(u) {
  const orgVal = (u.isMonster || u.isZombie) ? 50 : u.org;
  return u.personnel + (orgVal * 2);
}

function getCategoryPursuitRetreatBonus(category) {
  if (category === 'armored_vehicle') return 20;
  if (category === 'tank') return 10;
  return 0;
}

function getUnitPursuitBonus(u) {
  const baseCat = getCategoryPursuitRetreatBonus(u.category);
  const expBonus = EXPERIENCE_TIERS[u.experience]?.pursueBonus || 0;
  const traitBonus = (u.traits || []).map(getTraitById).filter(Boolean).reduce((s, t) => s + (t.pursueBonus || 0), 0);
  return baseCat + expBonus + traitBonus;
}

function getUnitRetreatBonus(u) {
  const baseCat = getCategoryPursuitRetreatBonus(u.category);
  const expBonus = EXPERIENCE_TIERS[u.experience]?.retreatBonus || 0;
  const traitBonus = (u.traits || []).map(getTraitById).filter(Boolean).reduce((s, t) => s + (t.retreatBonus || 0), 0);
  return baseCat + expBonus + traitBonus;
}

// --------------------------------------------------------------------------
// 2. Tactics AI & Selection
// --------------------------------------------------------------------------

function getEligibleTactics(role, isUrban) {
  return TACTICS_DB.filter(t => {
    if (t.role !== role) return false;
    if (t.urbanOnly && !isUrban) return false;
    return true;
  });
}

function selectTacticForSide(side, role) {
  const sideState = side === 'A' ? state.battle.sideA : state.battle.sideB;
  const terrainObj = state.terrains[state.environment.terrain] || DEFAULT_TERRAINS.Plains;
  const isUrban = !!terrainObj.isUrban || state.environment.feature === 'Fort';
  const eligible = getEligibleTactics(role, isUrban);

  if (sideState.tacticId && sideState.tacticId !== 'auto') {
    const manual = eligible.find(t => t.id === sideState.tacticId);
    if (manual) {
      if (manual.id === 'urb_atk_barrage' && sideState.barrageCooldown > 0) {
        addLog('rolls', `⚠ [Side ${side}] Street-by-Street Barrage is on cooldown (${sideState.barrageCooldown} rds left); defaulting to Attack.`);
        return eligible[0];
      }
      return manual;
    }
  }

  const cmd = getSideCommander(side);
  const personality = cmd ? cmd.personality : 'Balanced';
  let pool = eligible.filter(t => {
    if (t.id === 'urb_atk_barrage' && sideState.barrageCooldown > 0) return false;
    return true;
  });
  const preferred = pool.filter(t => t.personality === personality);
  const pickPool = preferred.length > 0 && Math.random() < 0.75 ? preferred : pool;
  return pickPool[Math.floor(Math.random() * pickPool.length)] || eligible[0];
}

// --------------------------------------------------------------------------
// 3. Modifier Calculators
// --------------------------------------------------------------------------

function getSideActivePersonnel(side) {
  const units = side === 'A' ? state.battle.sideA.units : state.battle.sideB.units;
  return units.filter(isUnitActive).reduce((sum, u) => sum + u.personnel, 0);
}

function getOutnumberingBonusPct(mySide, enemySide) {
  const myTotal = getSideActivePersonnel(mySide);
  const enemyTotal = getSideActivePersonnel(enemySide);
  if (enemyTotal <= 0 || myTotal <= enemyTotal) return 0;
  const ratioAdvantage = (myTotal - enemyTotal) / enemyTotal;
  const steps = Math.floor((ratioAdvantage + 0.0001) / 0.5);
  return steps * 20;
}

function getOrgRemainingMalusPct(u) {
  if (u.isMonster || u.isZombie) return 0;
  const ratio = u.org / Math.max(1, u.maxOrg);
  let malus = 0;
  if (ratio <= 0.10) malus = -40;
  else if (ratio <= 0.30) malus = -20;
  else if (ratio <= 0.50) malus = -10;
  else if (ratio <= 0.70) malus = -5;

  const hasUnbreakable = u.traits.some(tid => {
    const t = getTraitById(tid);
    return t && t.isUnbreakable;
  });
  if (hasUnbreakable) malus = Math.ceil(malus / 2);
  return malus;
}

function getPersonnelLossMalusPct(u) {
  const persLostRatio = (u.maxPersonnel - u.personnel) / Math.max(1, u.maxPersonnel);
  const armorLostRatio = u.maxArmor > 0 ? (u.maxArmor - u.armor) / Math.max(1, u.maxArmor) : 0;
  const lostRatio = Math.max(persLostRatio, armorLostRatio);
  const tenths = Math.floor((lostRatio + 0.0001) * 10);
  if (tenths < 1) return 0;
  const bracket = Math.floor((tenths - 1) / 2);
  return -(5 + bracket * 10);
}

function getEffectiveArmorSplit(u) {
  const baseInfo = ARMOR_TIERS[u.armorTier] || ARMOR_TIERS.unarmored;
  if (u.maxArmor <= 0 || u.armorTier === 'unarmored') {
    return { hardRatio: 0.0, softRatio: 1.0 };
  }
  const vehicleRatio = clamp(u.armor / Math.max(1, u.maxArmor), 0, 1);
  const effHardRatio = Math.round(baseInfo.hardRatio * (0.35 + 0.65 * vehicleRatio) * 100) / 100;
  return {
    hardRatio: effHardRatio,
    softRatio: Math.round((1 - effHardRatio) * 100) / 100
  };
}

function getEffectiveUnitHardness(u, attackerUnit, extraHardMalus = 0) {
  const traits = u.traits.map(getTraitById).filter(Boolean);
  let baseHard = u.hardness + traits.reduce((s, t) => s + (t.hardnessFlat || 0), 0);
  if (u.maxArmor > 0) {
    const vehicleRatio = clamp(u.armor / Math.max(1, u.maxArmor), 0.25, 1.0);
    baseHard = Math.round(baseHard * vehicleRatio);
  }
  let effHard = Math.max(0, baseHard - (u.roundTemp?.hardMalus || 0) - extraHardMalus);

  // Close-Assault Terrain Bypass
  const closeTerrains = ['Urban', 'Forest', 'Jungle', 'Mountain'];
  if (attackerUnit && closeTerrains.includes(state.environment.terrain) && attackerUnit.category === 'infantry') {
    effHard = Math.floor(effHard * 0.65);
  }
  return effHard;
}

function getSupplyMalusPct(u) {
  if (u.isMonster || u.isZombie) return 0;
  const ratio = u.supply / Math.max(1, u.maxSupply);
  if (u.supply <= 0) return -50;
  if (ratio < 0.20) return -20;
  if (ratio < 0.50) return -10;
  return 0;
}

function getTerrainUnitModifiers(u, role) {
  const terr = state.terrains[state.environment.terrain] || DEFAULT_TERRAINS.Plains;
  const feat = TERRAIN_FEATURES[state.environment.feature] || TERRAIN_FEATURES.Normal;
  const weath = WEATHER_TYPES[state.environment.weather] || WEATHER_TYPES.Sunny;

  const theatreAtkSide = state.environment.theatreAttackerSide || 'A';
  const isTheatreAttacker = u.side === theatreAtkSide;
  const positionalRole = isTheatreAttacker ? 'attack' : 'defense';

  let basePct = 0;
  if (u.category === 'infantry') basePct = positionalRole === 'attack' ? terr.infAtk : terr.infDef;
  else if (u.category === 'armored_vehicle') basePct = positionalRole === 'attack' ? terr.avAtk : terr.avDef;
  else if (u.category === 'tank') basePct = positionalRole === 'attack' ? terr.tankAtk : terr.tankDef;
  else if (u.category === 'artillery') basePct = positionalRole === 'attack' ? terr.artAtk : terr.artDef;

  const hasMarines = u.traits.includes('marines');
  let featMult = positionalRole === 'attack' ? feat.atkMult : feat.defMult;
  if (hasMarines && (feat.isRiver || feat.isAmphib) && featMult < 1.0) {
    featMult = 1.0;
  }

  const combinedMult = (1 + basePct / 100) * featMult;
  let totalTerrainPct = Math.round((combinedMult - 1) * 100);

  let weatherPct = role === 'attack' ? weath.atkMod : weath.defMod;
  if (u.category === 'tank' && weath.tankMod) weatherPct += weath.tankMod;
  if (u.category === 'artillery' && weath.artMod) weatherPct += weath.artMod;
  if (u.category === 'infantry' && weath.infMod) weatherPct += weath.infMod;

  return { terrainPct: totalTerrainPct, weatherPct: weatherPct };
}

function getCombatDieSides(u, role) {
  if (u.category === 'infantry') return 12;
  if (u.category === 'armored_vehicle') return 16;
  if (u.category === 'tank') return 20;
  if (u.category === 'artillery') return role === 'attack' ? 20 : 8;
  return 12;
}

// --------------------------------------------------------------------------
// 4. Main Round Loop Execution
// --------------------------------------------------------------------------

function runSingleRound() {
  try {
    if (state.battle.isOver) {
      openBattleSummaryModal();
      return;
    }

    if (state.battle.round === 1) {
      const activeA = state.battle.sideA.units.filter(isUnitActive);
      const activeB = state.battle.sideB.units.filter(isUnitActive);
      if (activeA.length === 0 || activeB.length === 0) {
        showToast('Deploy at least one active unit on both Side A and Side B to begin combat!', 'warn');
        return;
      }
    }

    if (state.battle.round === 1 && !state.battle.initialSnapshot) {
      state.battle.initialSnapshot = {
        sideA: structuredClone(state.battle.sideA.units),
        sideB: structuredClone(state.battle.sideB.units)
      };
    }

    const rd = state.battle.round;
    const atkSide = state.battle.attackerSide;
    const defSide = atkSide === 'A' ? 'B' : 'A';
    const atkState = atkSide === 'A' ? state.battle.sideA : state.battle.sideB;
    const defState = defSide === 'A' ? state.battle.sideA : state.battle.sideB;

    addLog('rolls', `================================================`);
    addLog('rolls', `⚔ ROUND ${rd} BEGINS — Side ${atkSide} Attacks | Side ${defSide} Defends`);

    [...state.battle.sideA.units, ...state.battle.sideB.units].forEach(u => {
      u.roundTemp.defMalus = 0;
      u.roundTemp.hardMalus = 0;
      u.roundTemp.attackedThisRound = false;
      u.roundTemp.engagedByCount = 0;
      u.roundTemp.fortifiedOrgReductionUsed = false;
      u.roundTemp.inCover = false;
      u.roundTemp.coverDenied = false;
    });

    // 1. Choose Tactics
    const atkTactic = selectTacticForSide(atkSide, 'attack');
    const defTactic = selectTacticForSide(defSide, 'defense');

    atkState.repeatTacticCount = (atkState.lastChosenTacticId === atkTactic.id) ? atkState.repeatTacticCount + 1 : 0;
    defState.repeatTacticCount = (defState.lastChosenTacticId === defTactic.id) ? defState.repeatTacticCount + 1 : 0;

    atkState.chosenTacticId = atkTactic.id;
    defState.chosenTacticId = defTactic.id;
    atkState.lastChosenTacticId = atkTactic.id;
    defState.lastChosenTacticId = defTactic.id;

    addLog('rolls', `📋 Tactics Selected — Side ${atkSide} (Attacker): [${atkTactic.name}${formatTacticModifiers(atkTactic)}] | Side ${defSide} (Defender): [${defTactic.name}${formatTacticModifiers(defTactic)}]`);

    if (atkState.barrageCooldown > 0 && atkTactic.id !== 'urb_atk_barrage') atkState.barrageCooldown--;
    if (defState.barrageCooldown > 0) defState.barrageCooldown--;

    // 2. Supply Upkeep, DOW & Rallying
    processSupplyAndStartOfRoundTraits('A', atkSide === 'A' ? atkTactic : defTactic);
    processSupplyAndStartOfRoundTraits('B', atkSide === 'B' ? atkTactic : defTactic);

    if (checkBattleEndCondition()) {
      renderAll();
      return;
    }

    // 3. Recon / Vigilance Roll
    const vigResult = performVigilanceComparison(atkSide, defSide, atkTactic, defTactic);

    // 4. Off-Map Fire Support
    processSideSupportFire(atkSide, defSide);
    processSideSupportFire(defSide, atkSide);

    if (checkBattleEndCondition()) {
      renderAll();
      return;
    }

    // 5. Main Attack Phase
    const attackers = atkState.units.filter(isUnitActive);
    const defenders = defState.units.filter(isUnitActive);

    if (attackers.length > 0 && defenders.length === 0) {
      addLog('rolls', `⏳ [Empty Frontline] Side ${defSide} has no active frontline troops (all survivors are regrouping in the rear). Side ${atkSide} holds the sector uncontested.`);
    }

    const atkAllMeleeCharging = attackers.every(u => isMeleeUnit(u) && (u.meleeDistance || 0) > 0);
    const defAllMeleeCharging = defenders.every(u => isMeleeUnit(u) && (u.meleeDistance || 0) > 0);

    if (atkAllMeleeCharging && defAllMeleeCharging && attackers.length > 0) {
      addLog('rolls', `🏃 [Mutual Melee Charge] Both sides charge toward each other with weapons bared! Neither side possesses ranged weapons; closing gap rapidly.`);
    }

    for (const atkUnit of attackers) {
      const currentDefenders = defState.units.filter(isUnitActive);
      if (currentDefenders.length === 0) break;

      const targetUnit = selectTargetUnit(atkUnit, currentDefenders, atkTactic, defTactic, vigResult.attackerWonVig);
      if (!targetUnit) continue;

      // Melee Overwatch Interception
      if (isMeleeUnit(atkUnit) && (atkUnit.meleeDistance || 0) > 0) {
        if (!isMeleeUnit(targetUnit)) {
          addLog(
            'rolls',
            `🛡 [Defensive Overwatch] ${atkUnit.name} charges across open ground (${atkUnit.meleeDistance} Dist away)! Defending ${targetUnit.name} unleashes a defensive volley on the exposed chargers!`
          );
          resolveDefensiveOverwatchFire(targetUnit, atkUnit, defSide, atkSide, defTactic, atkTactic, vigResult);
        } else {
          addLog(
            'rolls',
            `🏃 [Charging] ${atkUnit.name} is sprinting forward (${atkUnit.meleeDistance} Dist away) toward ${targetUnit.name}; neither side has ranged guns, closing distance.`
          );
        }
        continue;
      }

      targetUnit.roundTemp.engagedByCount++;
      atkUnit.roundTemp.attackedThisRound = true;

      resolveUnitEngagement(
        atkUnit, targetUnit, atkSide, defSide,
        atkTactic, defTactic, vigResult
      );
    }

    // 6. End-of-Round Tactic Effects (Only if combat actually took place)
    if (atkTactic.selfEndOrgDmg && defenders.length > 0) {
      atkState.units.filter(isUnitActive).forEach(u => {
        if (!u.isMonster && !u.isZombie) {
          u.org = Math.max(0, u.org - atkTactic.selfEndOrgDmg);
          addLog('damage', `⚡ [Shock Malus] ${u.name} suffers -${atkTactic.selfEndOrgDmg} Org at end of round.`);
          checkAndMarkUnitDefeat(u);
        }
      });
    }

    atkState.prevRevealedTactic = atkTactic.id;
    defState.prevRevealedTactic = defTactic.id;

    // 7. Check Battle End Condition
    if (checkBattleEndCondition()) {
      renderAll();
      return;
    }

    // 8. Advance Round
    state.battle.round++;
    state.battle.attackerSide = state.battle.attackerSide === 'A' ? 'B' : 'A';
    renderAll();
  } catch (err) {
    stopAutoRun();
    logSystemError(`Round ${state.battle.round} Execution Halted`, err);
    renderAll();
  }
}

// --------------------------------------------------------------------------
// 5. Supply, Upkeep, DOW & Rally Resolution
// --------------------------------------------------------------------------

function processSupplyAndStartOfRoundTraits(side, chosenTactic) {
  const sideState = side === 'A' ? state.battle.sideA : state.battle.sideB;
  const enemyState = side === 'A' ? state.battle.sideB : state.battle.sideA;
  const cmd = getSideCommander(side);
  const terr = state.terrains[state.environment.terrain] || DEFAULT_TERRAINS.Plains;
  const feat = TERRAIN_FEATURES[state.environment.feature] || TERRAIN_FEATURES.Normal;
  const weath = WEATHER_TYPES[state.environment.weather] || WEATHER_TYPES.Sunny;

  // 1. Resolve Rallying Queue with d20 Check
  for (const u of sideState.units) {
    if (u.isRallying) {
      u.rallyRoundsLeft--;
      if (u.rallyRoundsLeft <= 0) {
        if (u.personnel <= 0) {
          u.isRallying = false;
          u.defeated = true;
          u.defeatReason = 'All personnel eliminated';
          continue;
        }

        const d20 = rollDie(20);

        function getThresholdMod(current, max) {
          if (!max || max <= 0) return 0;
          const ratio = current / max;
          if (ratio > 0.70) return 3;
          if (ratio >= 0.50) return 1;
          if (ratio >= 0.30) return 0;
          return -3;
        }

        const persMod = getThresholdMod(u.personnel, u.maxPersonnel);
        const supMod = getThresholdMod(u.supply, u.maxSupply);
        const armorMod = (u.originalMaxArmor > 0) ? getThresholdMod(u.armor, u.originalMaxArmor) : 0;

        const expMods = { Green: -3, Trained: 0, Regular: 1, Seasoned: 2, Veteran: 4, Elite: 6 };
        const expBonus = expMods[u.experience] || 0;

        let cmdBonus = 0;
        let extraOrgBonus = 0;
        if (cmd) {
          const cmdTraits = (cmd.traits || []).map(getCommanderTraitById).filter(Boolean);
          cmdBonus += cmdTraits.reduce((s, t) => s + (t.rallyCheckBonus || 0), 0);
          extraOrgBonus += cmdTraits.reduce((s, t) => s + (t.extraRalliedOrg || 0), 0);

          if (cmd.traits.includes('infantry_leader') && u.category === 'infantry') cmdBonus += 2;
          if (cmd.traits.includes('tank_leader') && (u.category === 'tank' || u.category === 'armored_vehicle')) cmdBonus += 2;
        }

        const hasFrontlineAllies = sideState.units.some(o => o.instanceId !== u.instanceId && isUnitActive(o));
        const frontlineMod = hasFrontlineAllies ? 2 : -3;

        const totalRallyScore = d20 + expBonus + cmdBonus + frontlineMod + persMod + supMod + armorMod;
        const rallyDC = 10;
        const isCriticalFumble = (d20 === 1);
        const passedRally = (totalRallyScore >= rallyDC) && !isCriticalFumble;

        const armorTag = (u.originalMaxArmor > 0) ? `+Arm(${armorMod >= 0 ? '+' : ''}${armorMod})` : '';
        const breakdownStr = `d20[${d20}]+Exp(${expBonus >= 0 ? '+' : ''}${expBonus})+Cmd(${cmdBonus >= 0 ? '+' : ''}${cmdBonus})+Front(${frontlineMod >= 0 ? '+' : ''}${frontlineMod})+Men(${persMod >= 0 ? '+' : ''}${persMod})+Sup(${supMod >= 0 ? '+' : ''}${supMod})${armorTag}=${totalRallyScore}`;

        const manpowerRatio = u.personnel / Math.max(1, u.maxPersonnel);

        if (passedRally) {
          u.isRallying = false;
          u.ralliedOnce = true;
          u.personnel = u.ralliedPersonnel;

          const rawD10 = rollDie(10);
          const strengthBonus = manpowerRatio >= 0.75 ? 5 : 0;
          u.org = Math.max(5, rawD10 + strengthBonus + extraOrgBonus);

          u.name = u.name.includes('(Rallied)') ? u.name : `${u.name} (Rallied)`;

          if (u.originalMaxArmor > 0 && !u.isDismounted && u.armor > 0) {
            addLog('rolls', `🚩 [Rallied to the Line] ${u.name} PASSED Rally Check (${breakdownStr} vs DC ${rallyDC})! Intact column returned with ${u.personnel} personnel, ${u.armor} active vehicles, Org: ${u.org}/${u.maxOrg}.`);
          } else {
            u.category = 'infantry';
            u.armorTier = 'unarmored';
            u.armor = 0;
            u.maxArmor = 0;
            u.isDismounted = true;
            u.hardAttack = 6;
            u.piercing = 5;
            u.hardness = 2;
            addLog('rolls', `🚩 [Rallied to the Line] ${u.name} PASSED Rally Check (${breakdownStr} vs DC ${rallyDC})! Reformed as infantry with ${u.personnel} personnel, Org: ${u.org}/${u.maxOrg}.`);
          }
        } else {
          if (manpowerRatio >= 0.60 && !isCriticalFumble) {
            u.rallyRoundsLeft = 1;
            addLog('support', `⏳ [Rally Delayed] ${u.name} failed rally check (${breakdownStr} vs DC ${rallyDC}), but retaining ${Math.round(manpowerRatio * 100)}% manpower prevents collapse! NCOs re-form ranks (+1 round delay).`);
          } else {
            u.isRallying = false;
            u.defeated = true;
            u.defeatReason = isCriticalFumble
              ? 'Rally shattered by panic (Critical 1)'
              : `Decimated formation failed to rally (${totalRallyScore} vs DC ${rallyDC})`;

            addLog('damage', `💀 [Rally Failed] ${u.name} FAILED Rally Check (${breakdownStr} vs DC ${rallyDC}${isCriticalFumble ? ' [CRIT 1]' : ''})! Depleted force dissolved into panic and deserted.`);
          }
        }
      }
    }
  }

  // 2. CHECK UNCONTESTED FRONTLINE CONDITION
  // If the enemy has 0 active units on the frontline, holding units rest without attrition
  const enemyActiveCount = enemyState.units.filter(isUnitActive).length;
  const isUncontestedFrontline = (enemyActiveCount === 0);

  let sideRollD3 = 0;
  if (isUncontestedFrontline) {
    addLog('support', `⏳ [Uncontested Frontline] Side ${side} holds the field with no active opposing forces. Supply drain, combat fatigue, and attrition losses are paused.`);
  } else {
    sideRollD3 = rollDie(3);
    addLog('support', `📦 [Side ${side} Supply] Base supply roll d3 = ${sideRollD3}`);
  }

  for (const u of sideState.units.filter(isUnitActive)) {
    if (isMeleeUnit(u) && (u.meleeDistance === null || u.meleeDistance === undefined)) {
      u.meleeDistance = getInitialEngagementDistance(u);
      addLog('rolls', `🏃 [Melee Deployment] ${u.name} begins at ${u.meleeDistance} Distance from the enemy line (${state.environment.terrain} + ${state.environment.feature}).`);
    }

    if (isMeleeUnit(u) && u.meleeDistance > 0 && !isUncontestedFrontline) {
      const enemyActiveUnits = enemyState.units.filter(isUnitActive);
      const enemyOnlyMelee = (enemyActiveUnits.length > 0) && enemyActiveUnits.every(isMeleeUnit);

      const closeRate = enemyOnlyMelee ? 2 : 1;
      const prevDist = u.meleeDistance;
      u.meleeDistance = Math.max(0, u.meleeDistance - closeRate);

      if (u.meleeDistance === 0) {
        addLog('rolls', `⚔ [MELEE CONTACT REACHED!] ${u.name} closed the distance (${prevDist} ➔ 0)! Hand-to-hand trench combat authorized!`);
      } else {
        addLog('rolls', `🏃 [Closing Distance] ${u.name} charges across no-man's land (${prevDist} ➔ ${u.meleeDistance} Distance remaining${enemyOnlyMelee ? ' [Mutual Charge x2]' : ''}).`);
      }
    }

    for (const k of Object.keys(u.supportCooldowns)) {
      if (u.supportCooldowns[k] > 0) u.supportCooldowns[k]--;
    }

    const unitTraits = u.traits.map(getTraitById).filter(Boolean);
    const expObj = EXPERIENCE_TIERS[u.experience] || EXPERIENCE_TIERS.Regular;

    // 3. SUPPLY CONSUMPTION & COHESION
    if (!u.isMonster && !u.isZombie) {
      // IF UNCONTESTED: NO SUPPLY DRAIN & NO SUPPLY ATTRITION
      if (!isUncontestedFrontline) {
        let drain = sideRollD3 + (terr.supplyDrain || 0) + (feat.supplyAdd || 0) + (weath.supplyAdd || 0) + (chosenTactic.supplyAdd || 0);
        if (chosenTactic.id === 'urb_atk_armour_supported' && u.maxArmor > 0) drain += 1;
        if (cmd && cmd.traits.includes('logistics_wizard')) drain = Math.max(1, drain - 1);

        if (cmd) {
          const cmdTraits = (cmd.traits || []).map(getCommanderTraitById).filter(Boolean);
          const supplyCut = cmdTraits.reduce((s, t) => s + (t.supplyDrainReduction || 0), 0);
          drain = Math.max(0, drain - supplyCut);
        }

        const supplyRegen = unitTraits.reduce((acc, t) => acc + (t.supplyRegen || 0), 0);
        const netDrain = Math.max(0, drain - supplyRegen);
        u.supply = clamp(u.supply - netDrain, 0, u.maxSupply);

        const supRatio = u.supply / Math.max(1, u.maxSupply);
        if (u.supply <= 0) {
          const contOrgDmg = 2 + rollDie(4);
          u.org = Math.max(0, u.org - contOrgDmg);
          addLog('support', `⚠ [${u.name}] 0% Supply! (-50% stats malus & -${contOrgDmg} continuous Org damage)`);
        } else if (supRatio < 0.20) {
          if (!u.supplyBelow20Triggered) {
            u.supplyBelow20Triggered = true;
            const oneTime = 3 + rollDie(10);
            u.org = Math.max(0, u.org - oneTime);
            addLog('support', `⚠ [${u.name}] Supply dropped below 20%! One-time -(3+d10)=-${oneTime} Org damage & -20% malus!`);
          }
          const cont = 1 + rollDie(3);
          u.org = Math.max(0, u.org - cont);
          addLog('support', `⚠ [${u.name}] Critical Supply (<20%): suffers -(1+d3)=-${cont} continuous Org damage.`);
        } else if (supRatio < 0.50) {
          if (!u.supplyBelow50Triggered) {
            u.supplyBelow50Triggered = true;
            const oneTime = 2 + rollDie(6);
            u.org = Math.max(0, u.org - oneTime);
            addLog('support', `⚠ [${u.name}] Supply dropped below 50%! One-time -(2+d6)=-${oneTime} Org damage & -10% malus!`);
          }
        }
      }

      // Entrenchment can always build up if not actively attacking
      const isDefendingSide = (state.battle.attackerSide !== side);
      const maxCap = getUnitMaxEntrenchmentCap(u);

      if (isDefendingSide && !u.roundTemp.attackedThisRound) {
        const gain = u.traits.includes('engineering_support') ? 2 : 1;
        const oldLvl = u.entrenchmentLevel || 0;
        u.entrenchmentLevel = clamp(oldLvl + gain, 0, maxCap);
        if (u.entrenchmentLevel > oldLvl) {
          addLog('support', `⛏ [Entrenching] ${u.name} digs in deeper (Entrenchment Lvl ${u.entrenchmentLevel}/${maxCap}).`);
        }
      }

      // 4. ORGANIZATION RECOVERY (NO FATIGUE WHEN UNCONTESTED)
      let orgDelta = expObj.orgRegen || 0;
      orgDelta += unitTraits.reduce((acc, t) => acc + (t.orgRegen || 0), 0);
      
      if (cmd) {
        if (cmd.traits.includes('organizer')) orgDelta += 1;
        const cmdTraits = (cmd.traits || []).map(getCommanderTraitById).filter(Boolean);
        orgDelta += cmdTraits.filter(t => traitAppliesToUnit(t, u)).reduce((s, t) => s + (t.orgRegen || 0), 0);
      }

      const manpowerRatio = u.personnel / Math.max(1, u.maxPersonnel);
      if (manpowerRatio >= 0.75) {
        orgDelta += 1;
      }

      // Combat fatigue is 0 if no enemy is on the frontline
      let fatigueLoss = 0;
      if (!isUncontestedFrontline) {
        if (state.battle.round > 12) fatigueLoss = 2;
        else if (state.battle.round > 5) fatigueLoss = 1;
      }

      // If uncontested, unit can only GAIN or HOLD Organization; it never loses Org
      const netOrgChange = isUncontestedFrontline ? Math.max(0, orgDelta) : (orgDelta - fatigueLoss);

      if (netOrgChange !== 0) {
        u.org = clamp(u.org + netOrgChange, 0, u.maxOrg);
        if (netOrgChange > 0) {
          addLog('support', `💚 [${u.name}] Net Organization +${netOrgChange} (Regen +${orgDelta}${isUncontestedFrontline ? ', Frontline Rest' : `, Fatigue -${fatigueLoss}`} ➔ ${u.org}/${u.maxOrg}).`);
        } else {
          addLog('support', `🔻 [${u.name}] Net Organization ${netOrgChange} (Regen +${orgDelta}, Combat Fatigue -${fatigueLoss} ➔ ${u.org}/${u.maxOrg}).`);
        }
      }
    }

    // Unbreakable Stand Countdown
    const hasUnbreakable = unitTraits.some(t => t.isUnbreakable);
    if (hasUnbreakable) {
      if (u.org > 0) {
        u.unbreakableRoundsLeft = null;
      } else if (u.unbreakableRoundsLeft !== null) {
        if (u.unbreakableRoundsLeft > 0) {
          addLog('damage', `⏳ [Unbreakable Stand] ${u.name} is at 0 Org! (${u.unbreakableRoundsLeft} round${u.unbreakableRoundsLeft === 1 ? '' : 's'} remaining before collapse).`);
          u.unbreakableRoundsLeft--;
        } else {
          u.unbreakableRoundsLeft = null;
          addLog('damage', `💀 [Unbreakable Shattered] ${u.name}'s 2-round last stand has expired! Cohesion collapses completely!`);
          if (!u.ralliedOnce && u.personnel > 20) {
            triggerUnitRally(u, 'Unbreakable last stand expired');
          } else {
            u.defeated = true;
            u.defeatReason = 'Unbreakable stand collapsed';
          }
        }
      }
    }

    // Field Medic Healing
    if (unitTraits.some(t => t.isFieldMedic) && u.wounded > 0) {
      const healed = Math.min(u.wounded, rollDie(3));
      u.wounded -= healed;
      u.personnel = Math.min(u.maxPersonnel, u.personnel + healed);
      if (healed > 0) {
        addLog('support', `➕ [Field Medic] ${u.name} heals ${healed} wounded back to active duty (${u.personnel} active).`);
      }
    }

    // Died of Wounds (DOW)
    if (state.battle.round >= 4 && u.wounded > 0 && !u.isMonster && !u.isZombie) {
      const supRatio = u.supply / Math.max(1, u.maxSupply);
      let dowRate = 0;

      if (supRatio < 0.20) dowRate += 5;
      else if (supRatio < 0.50) dowRate += 2;
      if (u.supply <= 0) dowRate += 5;

      if (state.environment.weather === 'Snowy') dowRate += 2;
      if (state.environment.weather === 'HeatWaves' || state.environment.terrain === 'Marsh') dowRate += 1;

      if (u.traits.includes('first_aid_kit')) dowRate -= 4;
      if (u.traits.includes('field_medic')) dowRate -= 3;

      const finalRate = clamp(dowRate, 0, 15);

      if (finalRate > 0) {
        const expected = u.wounded * (finalRate / 100);
        let dowCasualties = Math.floor(expected);
        if (Math.random() < (expected - dowCasualties)) {
          dowCasualties += 1;
        }

        if (dowCasualties > 0) {
          dowCasualties = Math.min(u.wounded, dowCasualties);
          u.wounded -= dowCasualties;
          u.dead += dowCasualties;
          addLog('damage', `🏥 [Died of Wounds] ${u.name}: ${dowCasualties} wounded succumbed to injuries (WIA ➔ KIA, Rate: ${finalRate}%).`);
        }
      }
    }

    // Field Repair Crew
    if (state.battle.round % 3 === 0 && unitTraits.some(t => t.isRepairCrew) && u.recoverableArmor > 0) {
      const hasSupplyToRepair = u.isMonster || u.isZombie || (u.supply >= u.maxSupply * 0.30);
      if (hasSupplyToRepair) {
        const hasSimpleEng = unitTraits.some(t => t.id === 'simple_engineering');
        const repCostReduction = hasSimpleEng ? 1 : 0;
        const extraRepairBonus = hasSimpleEng ? 1 : 0;

        const repDie = expObj.repairDie || 3;
        const fieldCap = Math.max(1, Math.ceil(u.recoverableArmor * 0.5));
        const repaired = Math.min(fieldCap, rollDie(repDie) + extraRepairBonus);

        if (repaired > 0) {
          const baseCost = 1 + rollDie(2);
          const repSupCost = Math.max(0, baseCost - repCostReduction);
          if (!u.isMonster && !u.isZombie) {
            u.supply = Math.max(0, u.supply - repSupCost);
          }
          u.recoverableArmor -= repaired;
          u.armor = Math.min(u.maxArmor, u.armor + repaired);
          addLog('armor', `🔧 [Field Repair Crew] ${u.name} (${u.experience}, d${repDie}${extraRepairBonus ? '+1 SimpleEng' : ''}, Cost ${repSupCost} Sup) restores ${repaired} armor in-field (${u.armor} active, ${u.recoverableArmor} awaiting post-battle recovery).`);
        }
      }
    }

    checkAndMarkUnitDefeat(u);
  }
}

// --------------------------------------------------------------------------
// 6. Recon / Vigilance Comparison
// --------------------------------------------------------------------------

function getSideVigilanceModifier(side, tactic, enemyTactic, isAttacker) {
  const sideState = side === 'A' ? state.battle.sideA : state.battle.sideB;
  const units = sideState.units.filter(isUnitActive);
  const cmd = getSideCommander(side);
  const terr = state.terrains[state.environment.terrain] || DEFAULT_TERRAINS.Plains;
  const feat = TERRAIN_FEATURES[state.environment.feature] || TERRAIN_FEATURES.Normal;
  const weath = WEATHER_TYPES[state.environment.weather] || WEATHER_TYPES.Sunny;

  let mod = (terr.vigMod || 0) + (feat.vigAdd || 0) + (weath.vigMod || 0) + (tactic.vigMod || 0) + (sideState.nextRoundVigMod || 0);
  sideState.nextRoundVigMod = 0;

  if (cmd && cmd.traits.includes('skilled_staff')) mod += 15;

  if (units.length > 0) {
    const traitVigSum = units.reduce((sum, u) => {
      return sum + u.traits.map(getTraitById).filter(Boolean).reduce((s, t) => s + (t.vigilance || 0), 0);
    }, 0);
    mod += Math.round(traitVigSum / units.length);
  }

  const tName = state.environment.terrain;
  if (tactic.id === 'atk_infiltration' && ['Forest', 'Urban', 'Hills', 'Mountain'].includes(tName)) mod += 10;
  if (tactic.id === 'def_ambush' && ['Forest', 'Jungle', 'Mountain', 'Urban'].includes(tName)) mod += 10;
  if ((tactic.id === 'def_ambush' || tactic.id === 'urb_def_ambush') && units.some(u => u.traits.includes('concealment_specialist'))) mod += 10;
  if (tactic.id === 'atk_encirclement' && units.length === 1) mod -= 10;
  if (tactic.id === 'urb_atk_street_fighting' && feat.fortified) mod -= 10;
  if (tactic.id === 'urb_def_fortified' && (enemyTactic.id === 'atk_infiltration' || enemyTactic.id === 'urb_atk_mouse_holing')) mod -= 10;

  return mod;
}

function performVigilanceComparison(atkSide, defSide, atkTactic, defTactic) {
  const atkRoll = rollDie(100);
  const defRoll = rollDie(100);
  const atkMod = getSideVigilanceModifier(atkSide, atkTactic, defTactic, true);
  const defMod = getSideVigilanceModifier(defSide, defTactic, atkTactic, false);

  const atkTotal = atkRoll + atkMod;
  const defTotal = defRoll + defMod;
  const diff = Math.abs(atkTotal - defTotal);
  const statBoost = Math.floor(diff / 10);
  const attackerWonVig = atkTotal >= defTotal;

  addLog(
    'rolls',
    `🔭 [Vigilance/Recon Roll] Side ${atkSide}: d100(${atkRoll}) + ${atkMod} = ${atkTotal} vs Side ${defSide}: d100(${defRoll}) + ${defMod} = ${defTotal} ➔ ` +
    `Side ${attackerWonVig ? atkSide : defSide} wins by ${diff} (+${statBoost} flat Stat Boost!)`
  );

  if (!attackerWonVig && defTactic.id === 'urb_def_ambush' && diff >= 15) {
    const atkState = atkSide === 'A' ? state.battle.sideA : state.battle.sideB;
    atkState.nextRoundVigMod -= 10;
    addLog('rolls', `🎯 [Urban Ambush] Side ${defSide} won Vigilance by >=15! Side ${atkSide} suffers -10 Vigilance next round.`);
  }

  return { atkTotal, defTotal, diff, statBoost, attackerWonVig };
}

// --------------------------------------------------------------------------
// 7. Support Fire & Anti-Air Interception
// --------------------------------------------------------------------------

function processSideSupportFire(firingSide, enemySide) {
  const firingState = firingSide === 'A' ? state.battle.sideA : state.battle.sideB;
  const enemyState = enemySide === 'A' ? state.battle.sideA : state.battle.sideB;

  if (firingState.chosenTacticId === 'urb_atk_barrage' && firingState.barrageCooldown === 0) {
    const leadUnit = firingState.units.find(u => isUnitActive(u) && (u.isMonster || u.isZombie || u.supply >= u.maxSupply * 0.5));
    if (leadUnit) {
      const supCost = 2 + rollDie(3);
      if (!leadUnit.isMonster && !leadUnit.isZombie) {
        leadUnit.supply = Math.max(0, leadUnit.supply - supCost);
      }
      firingState.barrageCooldown = 2;
      const defRed = 2 + rollDie(6);
      enemyState.units.filter(isUnitActive).forEach(eu => {
        eu.roundTemp.defMalus += defRed;
      });
      addLog('support', `💥 [Street-by-Street Barrage] Side ${firingSide} expends ${supCost} supply: Enemy Defense reduced by -(2+d6)=-${defRed}!`);
    }
  }

  for (const u of firingState.units.filter(isUnitActive)) {
    if (!u.isMonster && !u.isZombie && u.supply < u.maxSupply * 0.5) continue;

    const enemyUnits = enemyState.units.filter(isUnitActive);
    if (enemyUnits.length === 0) break;
    const target = enemyUnits[Math.floor(Math.random() * enemyUnits.length)];

    // Mortar Support
    if (u.traits.includes('mortar_support') && u.supportCooldowns.mortar <= 0) {
      const cost = 1 + rollDie(2);
      if (!u.isMonster && !u.isZombie) u.supply = Math.max(0, u.supply - cost);
      u.supportCooldowns.mortar = 2;

      const isTargetArmored = (target.maxArmor > 0 && target.armorTier !== 'unarmored');

      if (!isTargetArmored) {
        const defRed = 3 + rollDie(6);
        target.roundTemp.defMalus += defRed;
        target.roundTemp.coverDenied = true;
        const cas = 1 + rollDie(4);
        applySupportCasualtiesAndArmor(target, cas, 0, 'Mortar Fragmentation');

        let orgShock = 0;
        if (!target.isMonster && !target.isZombie) {
          orgShock = rollDie(3);
          target.org = Math.max(0, target.org - orgShock);
        }
        addLog('support', `💣 [Mortar Plunging Fire] ${u.name} ➔ ${target.name} (Infantry): Def -${defRed}, Entrenchment DENIED, ${cas} casualties, -${orgShock} Org suppression shock!`);
      } else {
        const defRed = 1 + rollDie(3);
        target.roundTemp.defMalus += defRed;

        const d6 = rollDie(6);
        if (d6 <= 4) {
          addLog('support', `💣 [Mortar Shells on Armor] ${u.name} ➔ ${target.name}: Shrapnel bounces off armor plate. 0 Hardness reduction. Def -${defRed} (Buttoned up).`);
        } else if (d6 === 5) {
          target.roundTemp.defMalus += 5;
          const targetSideState = enemySide === 'A' ? state.battle.sideA : state.battle.sideB;
          targetSideState.nextRoundVigMod -= 15;
          addLog('support', `🎯 [Mortar Optics Hit!] ${u.name} ➔ ${target.name}: Periscopes shattered! Def -${defRed + 5}, -15 Vigilance next round.`);
        } else if (d6 === 6) {
          processArmorLossAndCrewCasualties(target, 1, 'Mortar Track Hit', 'Mortar Mobility Hit');
          target.mobilityClassPenalty = (target.mobilityClassPenalty || 0) + 2;
          addLog('armor', `💥 [MORTAR TRACK BLOWN!] ${u.name} lands direct shell on ${target.name}'s suspension! 1 vehicle immobilized, -2 Mobility Class!`);
        }
      }
    }

    // Heavy Artillery Support
    if (u.traits.includes('heavy_artillery_support') && u.supportCooldowns.heavy_artillery <= 0) {
      const cost = 3 + rollDie(3);
      if (!u.isMonster && !u.isZombie) u.supply = Math.max(0, u.supply - cost);
      u.supportCooldowns.heavy_artillery = 1 + rollDie(2);

      const d12 = rollDie(12);
      const defRed = 4 + d12;
      const hardRed = 2 + rollDie(6);
      const baseArmDis = target.maxArmor > 0 ? rollDie(2) : 0;
      target.roundTemp.defMalus += defRed;
      target.roundTemp.hardMalus += hardRed;

      let cas = 0;
      let armDis = baseArmDis;
      if (d12 >= 8 && d12 <= 10) {
        cas = rollDie(6);
      } else if (d12 >= 11) {
        cas = 2 + rollDie(12);
        if (target.maxArmor > 0) armDis += 1 + rollDie(3);
      }
      if (cas > 0 || armDis > 0) {
        applySupportCasualtiesAndArmor(target, cas, armDis, 'Heavy Artillery Barrage');
      }
      addLog('support', `🎆 [Heavy Artillery Support] ${u.name} ➔ ${target.name} (Roll d12=${d12}, Cost ${cost} Sup, CD ${u.supportCooldowns.heavy_artillery}): Def -${defRed}, Hardness -${hardRed}, Cas: ${cas}, Armor Dis: ${armDis}`);
    }

    // Air Support
    if (u.traits.includes('air_support') && u.supportCooldowns.air_support <= 0 && !firingState.airstrikeDisabled) {
      const cost = 5 + rollDie(4);
      if (!u.isMonster && !u.isZombie) u.supply = Math.max(0, u.supply - cost);
      u.supportCooldowns.air_support = 2 + rollDie(2);

      let aaReduction = 0;
      let shotDownAll = false;
      for (const eu of enemyUnits) {
        if (eu.traits.includes('aa_defense')) {
          const red = 4 + rollDie(6);
          aaReduction += red;
          firingState.nextRoundVigMod -= 10;
          addLog('support', `🛡 [AA Defense] ${eu.name} reduces airstrike by 4+d6 = ${red} and forces recon planes high (-10 Enemy Vigilance next round)!`);
        }
        if (eu.traits.includes('aa_gun')) {
          const d8 = rollDie(8);
          const red = 4 + d8;
          aaReduction += red;
          if (d8 >= 5 && d8 <= 7) {
            const extraCd = rollDie(2);
            u.supportCooldowns.air_support += extraCd;
            addLog('support', `🎯 [AA Gun] ${eu.name} rolled ${d8} on d8 (-${red} dmg) and adds +${extraCd} cooldown to enemy Air Support!`);
          } else if (d8 === 8) {
            shotDownAll = true;
            firingState.airstrikeDisabled = true;
            addLog('support', `💥 [AA Gun CRITICAL 8!] ${eu.name} shot down the majority of Side ${firingSide}'s strike aircraft! Air Support banned for rest of battle!`);
          } else {
            addLog('support', `🎯 [AA Gun] ${eu.name} reduces airstrike by 4+d8 = ${red}.`);
          }
        }
      }

      if (!shotDownAll) {
        const d20 = rollDie(20);
        const rawDefRed = 6 + d20;
        const rawHardRed = 4 + rollDie(10);
        const defRed = Math.max(0, rawDefRed - aaReduction);
        const hardRed = Math.max(0, rawHardRed - Math.floor(aaReduction / 2));
        target.roundTemp.defMalus += defRed;
        target.roundTemp.hardMalus += hardRed;

        let cas = 0;
        let armDis = 0;
        if (d20 >= 10 && d20 <= 14) {
          cas = rollDie(6);
          if (target.maxArmor > 0) armDis = rollDie(2);
        } else if (d20 >= 15 && d20 <= 18) {
          cas = 2 + rollDie(12);
          if (target.maxArmor > 0) armDis = 1 + rollDie(3);
        } else if (d20 >= 19) {
          cas = 6 + rollDie(20);
          if (target.maxArmor > 0) armDis = 2 + rollDie(5);
        }
        cas = Math.max(0, cas - aaReduction);
        if (cas > 0 || armDis > 0) {
          applySupportCasualtiesAndArmor(target, cas, armDis, 'Airstrike');
        }
        addLog('support', `✈ [Air Support] ${u.name} ➔ ${target.name} (Roll d20=${d20}, AA Red: -${aaReduction}): Def -${defRed}, Hardness -${hardRed}, Cas: ${cas}, Armor Dis: ${armDis}`);
      }
    }
  }
}

function processArmorLossAndCrewCasualties(target, disabledRoll, bracketDesc, sourceLabel) {
  if (disabledRoll <= 0 || target.maxArmor <= 0 || target.armor <= 0) return;
  const actualDisabled = Math.min(target.armor, disabledRoll);
  target.armor -= actualDisabled;

  const opMods = getTerrainOperationalMods(target.category);
  const armorRecBonus = getUnitArmorRecoveryBonus(target) + opMods.vehicleRecMod;
  const rawD50 = rollDie(50);
  const recRoll = 50 + rawD50;
  const totalRecPct = clamp(recRoll + armorRecBonus, 5, 95);
  const recVehicles = Math.round(actualDisabled * (totalRecPct / 100));
  const unrecVehicles = actualDisabled - recVehicles;

  target.recoverableArmor += recVehicles;
  target.unrecoverableArmor += unrecVehicles;

  let crewDowned = 0;
  for (let i = 0; i < unrecVehicles; i++) crewDowned += (1 + rollDie(4));
  for (let i = 0; i < recVehicles; i++) crewDowned += rollDie(2);

  let vehOrgShock = 0;
  if (!target.isMonster && !target.isZombie) {
    const singleVehRatio = actualDisabled / Math.max(1, target.maxArmor);
    if (singleVehRatio >= 0.20) vehOrgShock += (2 + rollDie(8));
    else if (singleVehRatio >= 0.10) vehOrgShock += (1 + rollDie(6));
    else vehOrgShock += rollDie(3);

    const totalVehLostRatio = (target.maxArmor - target.armor) / Math.max(1, target.maxArmor);
    const newArmorTenths = Math.floor((totalVehLostRatio + 0.0001) * 10);
    while ((target.cumArmorLostTenths || 0) < newArmorTenths) {
      target.cumArmorLostTenths = (target.cumArmorLostTenths || 0) + 1;
      vehOrgShock += (1 + rollDie(4));
    }
    target.org = Math.max(0, target.org - vehOrgShock);
  }

  addLog(
    'armor',
    `🚜 [${sourceLabel} Armor Hit] ${target.name} (${bracketDesc}): ${actualDisabled} vehicles knocked out! Recovery (50+d50[${rawD50}])=${recRoll}+${armorRecBonus}=${totalRecPct}% ➔ ` +
    `${recVehicles} Recoverable, ${unrecVehicles} Destroyed (${target.armor}/${target.maxArmor} active) | Crew Casualties: ${crewDowned} downed, -${vehOrgShock} Org shock!`
  );

  if (crewDowned > 0) {
    applyPersonnelCasualties(target, crewDowned, true, false, `${sourceLabel} Crew Loss`);
  }
  checkAndMarkUnitDefeat(target);
}

function applySupportCasualtiesAndArmor(target, casualties, armorDisabled, sourceLabel) {
  if (casualties > 0) {
    applyPersonnelCasualties(target, casualties, true, true, sourceLabel);
  }
  if (armorDisabled > 0 && target.maxArmor > 0 && target.armor > 0) {
    processArmorLossAndCrewCasualties(target, armorDisabled, 'Support Strike', sourceLabel);
  }
}

function getUnitArmorRecoveryBonus(u) {
  return u.traits.map(getTraitById).filter(Boolean).reduce((s, t) => s + (t.armorRecBonus || 0), 0);
}

// --------------------------------------------------------------------------
// 8. Targeting Hierarchy & Frontliner Screening
// --------------------------------------------------------------------------

function isFrontlinerActive(u) {
  const hasFrontliner = u.traits.some(tid => {
    const t = getTraitById(tid);
    return t && t.isFrontliner;
  });
  if (!hasFrontliner) return false;
  if (u.isMonster || u.isZombie) return true;
  const threshold = (u.traits.includes('unbreakable') || u.experience === 'Veteran' || u.experience === 'Elite') ? 0.30 : 0.50;
  return (u.org / Math.max(1, u.maxOrg)) >= threshold;
}

function selectTargetUnit(attacker, defenders, atkTactic, defTactic, attackerWonVig) {
  if (defenders.length === 0) return null;
  if (defenders.length === 1) return defenders[0];

  const activeFrontliners = defenders.filter(isFrontlinerActive);

  // Infiltration Bypass
  let bypassChance = atkTactic.bypassChance || 0;
  if (bypassChance > 0 && attacker.traits.includes('infiltration_specialist')) {
    bypassChance = Math.min(75, bypassChance + 10);
  }
  if (bypassChance > 0 && Math.random() * 100 < bypassChance) {
    const backline = defenders.filter(d => !isFrontlinerActive(d) || d.category === 'artillery');
    if (backline.length > 0) {
      const picked = backline[Math.floor(Math.random() * backline.length)];
      addLog('rolls', `🥷 [Bypass Success] ${attacker.name} bypasses frontline screening to target ${picked.name}!`);
      return picked;
    }
  }

  // Anti-Unit Priority
  const antiTraits = attacker.traits.map(getTraitById).filter(t => t && t.antiCategory);
  if (antiTraits.length > 0) {
    const desiredCat = antiTraits[0].antiCategory;
    const desiredTargets = defenders.filter(d => d.category === desiredCat);
    if (desiredTargets.length > 0) {
      desiredTargets.sort((a, b) => getUnitTargetValue(b) - getUnitTargetValue(a));
      const desiredUnit = desiredTargets[0];

      if (activeFrontliners.length > 0 && !activeFrontliners.includes(desiredUnit)) {
        activeFrontliners.sort((a, b) => getUnitTargetValue(b) - getUnitTargetValue(a));
        const bestFrontliner = activeFrontliners[0];
        if (getUnitTargetValue(bestFrontliner) > getUnitTargetValue(desiredUnit)) {
          addLog('rolls', `🛡 [Frontliner Intercept] ${bestFrontliner.name} (TV ${getUnitTargetValue(bestFrontliner)}) intercepts ${attacker.name}'s Anti-Unit attack aimed at ${desiredUnit.name}!`);
          return bestFrontliner;
        } else {
          if (Math.random() < 0.5) {
            addLog('rolls', `🎯 [Anti-Unit Bypass] ${attacker.name} bypasses ${bestFrontliner.name} to strike ${desiredUnit.name}!`);
            return desiredUnit;
          } else {
            addLog('rolls', `🛡 [Frontliner Intercept] ${bestFrontliner.name} blocks ${attacker.name} from reaching ${desiredUnit.name}!`);
            return bestFrontliner;
          }
        }
      }
      return desiredUnit;
    }
  }

  if (!attackerWonVig) {
    if (activeFrontliners.length > 0) {
      activeFrontliners.sort((a, b) => getUnitTargetValue(b) - getUnitTargetValue(a));
      return activeFrontliners[0];
    }
    const randTarget = defenders[Math.floor(Math.random() * defenders.length)];
    addLog('rolls', `🎲 [Failed Vigilance] ${attacker.name} randomly targets ${randTarget.name}.`);
    return randTarget;
  }

  if (activeFrontliners.length > 0) {
    activeFrontliners.sort((a, b) => getUnitTargetValue(b) - getUnitTargetValue(a));
    return activeFrontliners[0];
  }

  const sorted = [...defenders].sort((a, b) => getUnitTargetValue(b) - getUnitTargetValue(a));
  if (atkTactic.id === 'atk_blitz') {
    return sorted[sorted.length - 1];
  }
  return sorted[0];
}

// --------------------------------------------------------------------------
// 9. Main Combat Engagement & Resolution
// --------------------------------------------------------------------------

function resolveUnitEngagement(attacker, defender, atkSide, defSide, atkTactic, defTactic, vigResult) {
  const atkTraits = attacker.traits.map(getTraitById).filter(Boolean);
  const defTraits = defender.traits.map(getTraitById).filter(Boolean);

  const traitDefMalus = atkTraits.reduce((s, t) => s + (t.enemyDefMalus || 0), 0);
  const traitHardMalus = atkTraits.reduce((s, t) => s + (t.enemyHardMalus || 0), 0);

  // STEP A: Piercing or Dispersion/Cover Check
  let pierced = false;
  let totalPierceRoll = 0;
  let totalHardnessRoll = 0;
  let effHardness = 0;
  const isTargetUnarmored = (defender.armorTier === 'unarmored' || defender.maxArmor <= 0);

  if (isTargetUnarmored) {
    const d20 = rollDie(20);
    let coverRating = defender.roundTemp.coverDenied ? 0 : getTerrainCoverRating(defender);
    if (defTactic.id === 'urb_def_fortified') coverRating += 5;
    else if (defTactic.id === 'def_defend') coverRating += 3;

    if (!defender.roundTemp.coverDenied) {
      coverRating += (defender.entrenchmentLevel || 0);
    }

    const targetDC = 12 + (vigResult.attackerWonVig ? 2 : 0) + (attacker.traits.includes('recon_support') ? 2 : 0);
    const totalCoverSave = d20 + coverRating;
    const inCover = totalCoverSave >= targetDC;
    defender.roundTemp.inCover = inCover;

    addLog(
      'rolls',
      `🕳️ [Cover & Dispersion] ${defender.name} makes Cover Save: d20(${d20}) + Cover(${coverRating}) = ${totalCoverSave} vs DC ${targetDC} ➔ ` +
      (inCover ? `DUG-IN / IN DEFILADE (Half soft damage, explosive negated)` : `CAUGHT IN OPEN (Exposed to full fire & suppression shock!)`)
    );
  } else {
    const atkPierceDie = rollDie(6);
    const defHardDie = rollDie(6);

    let effPiercing = attacker.piercing + atkTraits.reduce((s, t) => s + (t.pierceFlat || 0), 0) + (atkTactic.flatPierce || 0);
    const atkCmd = getSideCommander(atkSide);
    if (atkCmd && atkCmd.traits.includes('tank_leader') && (attacker.category === 'tank' || attacker.category === 'armored_vehicle')) {
      effPiercing += 2;
    }
    if (atkTactic.id === 'urb_atk_street_fighting' && attacker.traits.includes('anti_tank')) {
      effPiercing = Math.round(effPiercing * 1.10);
    }

    effHardness = getEffectiveUnitHardness(defender, attacker, traitHardMalus);
    totalPierceRoll = atkPierceDie + effPiercing;
    totalHardnessRoll = defHardDie + effHardness;
    pierced = totalPierceRoll > totalHardnessRoll;

    addLog(
      'armor',
      `🔩 [Piercing Check] ${attacker.name} (d6[${atkPierceDie}]+${effPiercing}=${totalPierceRoll}) vs ${defender.name} Eff.Hardness (d6[${defHardDie}]+${effHardness}=${totalHardnessRoll}) ➔ ` +
      (pierced ? `PIERCED! (Diff: +${totalPierceRoll - totalHardnessRoll})` : `ARMOR HELD (Unpierced — Soft/Close-Assault Chip Active)`)
    );
  }

  // STEP B: Armored Vehicle Disabling
  if (pierced && defender.maxArmor > 0 && defender.armor > 0) {
    const diff = totalPierceRoll - totalHardnessRoll;
    const h = Math.max(1, effHardness);
    const ratio = diff / h;
    let disabledRoll = 0;
    let bracketDesc = '';

    if (ratio <= 0.25) {
      disabledRoll = rollDie(3);
      bracketDesc = '<= 1/4 Hardness (d3)';
    } else if (ratio <= 0.50) {
      disabledRoll = 1 + rollDie(6);
      bracketDesc = '1/4 to 2/4 Hardness (1+d6)';
    } else if (ratio <= 0.75) {
      disabledRoll = 3 + rollDie(8);
      bracketDesc = '2/4 to 3/4 Hardness (3+d8)';
    } else {
      disabledRoll = 6 + rollDie(12);
      bracketDesc = '> 3/4 Hardness (6+d12)';
    }

    processArmorLossAndCrewCasualties(defender, disabledRoll, bracketDesc, 'Main Attack');
    if (defender.defeated || defender.isRallying) return;
  }

  // STEP C: Dynamic Armor Split
  const armorSplit = getEffectiveArmorSplit(defender);
  const effSoftAtk = attacker.softAttack + atkTraits.reduce((s, t) => s + (t.softFlat || 0), 0);
  const effHardAtk = attacker.hardAttack + atkTraits.reduce((s, t) => s + (t.hardFlat || 0), 0);

  let combinedBaseAtk = 0;
  if (defender.armorTier === 'unarmored') {
    combinedBaseAtk = effSoftAtk;
  } else if (pierced) {
    combinedBaseAtk = (effHardAtk * armorSplit.hardRatio) + (effSoftAtk * armorSplit.softRatio);
  } else {
    combinedBaseAtk = (effSoftAtk * armorSplit.softRatio) + (effHardAtk * 0.20) + 2;
  }

  // STEP D: Roll Attack Die
  const atkDieSides = getCombatDieSides(attacker, 'attack');
  const atkDieRoll = rollDie(atkDieSides);
  const vigBoostAtk = vigResult.attackerWonVig ? vigResult.statBoost : 0;

  const atkTotals = computeUnitTotalStat(
    attacker, defender, atkSide, defSide, 'attack',
    combinedBaseAtk, atkDieRoll, vigBoostAtk, atkTactic, defTactic, false
  );

  // STEP E: Roll Defense Die
  const defDieSides = getCombatDieSides(defender, 'defense');
  const defDieRoll = rollDie(defDieSides);
  const vigBoostDef = !vigResult.attackerWonVig ? vigResult.statBoost : 0;
  const baseDef = Math.max(0, defender.defense - defender.roundTemp.defMalus - traitDefMalus);

  const defTotals = computeUnitTotalStat(
    defender, attacker, defSide, atkSide, 'defense',
    baseDef, defDieRoll, vigBoostDef, defTactic, atkTactic, false
  );

  addLog(
    'rolls',
    `⚔ [Clash] ${attacker.name} Atk: Base(${combinedBaseAtk.toFixed(1)}) + d${atkDieSides}(${atkDieRoll}) + Flat(${atkTotals.flatBonus}) × Mod(${atkTotals.netPct >= 0 ? '+' : ''}${atkTotals.netPct}%) = ${atkTotals.finalValue} ` +
    `VS ${defender.name} Def: Base(${baseDef}) + d${defDieSides}(${defDieRoll}) + Flat(${defTotals.flatBonus}) × Mod(${defTotals.netPct >= 0 ? '+' : ''}${defTotals.netPct}%) = ${defTotals.finalValue}`
  );

  if (attacker.entrenchmentLevel > 0) {
    if (atkTactic.id === 'atk_assault' || atkTactic.id === 'atk_mass_charge') {
      attacker.entrenchmentLevel = 0;
    } else {
      attacker.entrenchmentLevel = Math.max(0, attacker.entrenchmentLevel - 2);
    }
  }

  // STEP F: Resolve Damage or Grazing
  const prevDefPersonnel = defender.personnel;
  if (atkTotals.finalValue > defTotals.finalValue) {
    const margin = Math.max(1, Math.round(atkTotals.finalValue - defTotals.finalValue));
    inflictCombatDamage(attacker, defender, margin, atkSide, defSide, atkTactic, defTactic, 'Main Attack');
    if (defender.defeated || defender.isRallying || attacker.defeated || attacker.isRallying) return;

    const inflictedRatio = (prevDefPersonnel - defender.personnel) / Math.max(1, defender.maxPersonnel);
    if (!attacker.isMonster && !attacker.isZombie) {
      let orgGain = atkTactic.hitOrgHeal || 0;
      if (defender.defeated || inflictedRatio >= 0.10) {
        orgGain += rollDie(2);
        addLog('damage', `🔥 [Decisive Breakthrough] ${attacker.name} gains +${orgGain} Org for smashing ${defender.name}!`);
      }
      if (orgGain > 0) attacker.org = Math.min(attacker.maxOrg, attacker.org + orgGain);
    }

    const hasRaiders = atkTraits.some(t => t.id === 'supply_raiders');
    const stealTrait = atkTraits.find(t => t.supplySteal > 0);

    if (hasRaiders || stealTrait || atkTactic.id === 'def_guerrilla') {
      const rollAmount = hasRaiders ? (2 + rollDie(4)) : (1 + rollDie(3));
      const stolen = Math.min(defender.supply, rollAmount);

      if (stolen > 0 && !defender.isMonster && !defender.isZombie) {
        const wasBelow50 = (defender.supply / Math.max(1, defender.maxSupply)) < 0.50;
        defender.supply -= stolen;
        attacker.supply = Math.min(attacker.maxSupply, attacker.supply + stolen);
        addLog('support', `🏴 [Supply Stolen] ${attacker.name} steals ${stolen} Supply from ${defender.name}!`);

        if (hasRaiders && wasBelow50) {
          const depotShock = rollDie(4);
          defender.org = Math.max(0, defender.org - depotShock);
          addLog('damage', `⚡ [Supply Depot Sabotaged] ${defender.name} was below 50% supply! Supply Raiders inflict -${depotShock} Org shock on ammo depots!`);
        }
      }
    }

    const defSideState = defSide === 'A' ? state.battle.sideA : state.battle.sideB;
    if (atkTactic.enemyNextVigMalus) defSideState.nextRoundVigMod -= atkTactic.enemyNextVigMalus;
    if (atkTactic.id === 'atk_unexpected_thrust' && state.battle.round === 1) defSideState.nextRoundVigMod -= 10;
    if (atkTactic.id === 'urb_atk_barrage') {
      defSideState.nextRoundVigMod -= 10;
      const bRoll = rollDie(6);
      if (bRoll >= 5) {
        const extraCas = rollDie(6);
        applyPersonnelCasualties(defender, extraCas, false, true, 'Street-by-Street Barrage');
      }
    }
  } else {
    const grazeResult = calculateGrazingCasualties(attacker, defender, atkTotals.finalValue, defTotals.finalValue, pierced, false);

    if (grazeResult.immune) {
      addLog('rolls', `🛡 [COMPLETELY IMMUNE] ${defender.name} holds the line (${defTotals.finalValue} vs ${atkTotals.finalValue}): ${grazeResult.reason} (0 casualties)!`);
    } else {
      addLog('damage', `🛡 [Grazing Fire] ${defender.name} repels breakthrough (${defTotals.finalValue} vs ${atkTotals.finalValue}), but suffers ${grazeResult.casualties} grazing casualties (${grazeResult.reason})!`);
      applyPersonnelCasualties(defender, grazeResult.casualties, false, false, 'Grazing Fire', atkTactic, defTactic);
    }

    if (defTactic.id === 'def_delay') {
      const atkSideState = atkSide === 'A' ? state.battle.sideA : state.battle.sideB;
      atkSideState.nextRoundAtkMod = -10;
      addLog('rolls', `⏳ [Delay Tactic] Successful defense imposes -10% Attack on Side ${atkSide} next round.`);
    }
  }

  if (!isUnitActive(defender) || !isUnitActive(attacker)) return;

  // STEP G: Return Fire Phase
  let retDefVig = rollDie(100) + getSideVigilanceModifier(defSide, defTactic, atkTactic, false);
  const retAtkVig = rollDie(100) + getSideVigilanceModifier(atkSide, atkTactic, defTactic, true);

  if (attacker.traits.includes('melee_attack') && (defender.isZombie || defender.isMonster)) {
    retDefVig -= 20;
    addLog('rolls', `🗡 [Melee Disruption] ${attacker.name}'s bayonet/melee charge disrupts ${defender.name}'s natural reach (-20 Return Fire Vigilance)!`);
  }

  const entrenchedReturnFire = (retDefVig + 15 >= retAtkVig) || (TERRAIN_FEATURES[state.environment.feature]?.fortified);

  if (isMeleeUnit(defender) && (defender.meleeDistance || 0) > 0) {
    addLog('rolls', `🎯 [Uncontested Fire] ${defender.name} is still closing distance (${defender.meleeDistance} away) and cannot return fire against ${attacker.name}'s ranged volley!`);
    return;
  }

  if (retDefVig > retAtkVig || entrenchedReturnFire) {
    const retDieSides = getCombatDieSides(defender, 'attack');
    const retDieRoll = rollDie(retDieSides);

    const retPierceDie = rollDie(6);
    const retHardDie = rollDie(6);

    let retEffPiercing = defender.piercing + defTraits.reduce((s, t) => s + (t.pierceFlat || 0), 0) + (defTactic.flatPierce || 0);
    const defCmd = getSideCommander(defSide);
    if (defCmd && defCmd.traits.includes('tank_leader') && (defender.category === 'tank' || defender.category === 'armored_vehicle')) {
      retEffPiercing += 2;
    }
    if (defTactic.id === 'urb_atk_street_fighting' && defender.traits.includes('anti_tank')) {
      retEffPiercing = Math.round(retEffPiercing * 1.10);
    }

    const defTraitHardMalus = defTraits.reduce((s, t) => s + (t.enemyHardMalus || 0), 0);
    const retEffHardness = getEffectiveUnitHardness(attacker, defender, defTraitHardMalus);

    const retPierceRoll = retPierceDie + retEffPiercing;
    const retHardRoll = retHardDie + retEffHardness;
    const retPierced = retPierceRoll > retHardRoll;

    addLog(
      'armor',
      `🔩 [Return Fire Piercing Check] ${defender.name} (d6[${retPierceDie}]+${retEffPiercing}=${retPierceRoll}) vs ${attacker.name} Eff.Hardness (d6[${retHardDie}]+${retEffHardness}=${retHardRoll}) ➔ ` +
      (retPierced ? `PIERCED! (Diff: +${retPierceRoll - retHardRoll})` : `ARMOR HELD (Unpierced — Soft/Close-Assault Chip Active)`)
    );

    if (retPierced && attacker.maxArmor > 0 && attacker.armor > 0) {
      const retDiff = retPierceRoll - retHardRoll;
      const retH = Math.max(1, retEffHardness);
      const retRatio = retDiff / retH;
      let retDisabledRoll = 0;
      let retBracketDesc = '';

      if (retRatio <= 0.25) {
        retDisabledRoll = rollDie(3);
        retBracketDesc = '<= 1/4 Hardness (d3)';
      } else if (retRatio <= 0.50) {
        retDisabledRoll = 1 + rollDie(6);
        retBracketDesc = '1/4 to 2/4 Hardness (1+d6)';
      } else if (retRatio <= 0.75) {
        retDisabledRoll = 3 + rollDie(8);
        retBracketDesc = '2/4 to 3/4 Hardness (3+d8)';
      } else {
        retDisabledRoll = 6 + rollDie(12);
        retBracketDesc = '> 3/4 Hardness (6+d12)';
      }

      processArmorLossAndCrewCasualties(attacker, retDisabledRoll, retBracketDesc, 'Return Fire');
      if (attacker.defeated || attacker.isRallying) return;
    }

    const atkArmorSplit = getEffectiveArmorSplit(attacker);
    const defSoft = defender.softAttack + defTraits.reduce((s, t) => s + (t.softFlat || 0), 0);
    const defHard = defender.hardAttack + defTraits.reduce((s, t) => s + (t.hardFlat || 0), 0);
    const retBaseAtk = attacker.armorTier === 'unarmored'
      ? defSoft
      : (retPierced
          ? (defHard * atkArmorSplit.hardRatio + defSoft * atkArmorSplit.softRatio)
          : (defSoft * atkArmorSplit.softRatio + defHard * 0.20 + 2));

    const vigAdv = Math.max(0, Math.floor((retDefVig - retAtkVig) / 10));
    const defRetAtkTotals = computeUnitTotalStat(
      defender, attacker, defSide, atkSide, 'attack',
      retBaseAtk, retDieRoll, vigAdv, defTactic, atkTactic, true
    );

    const atkBreakDieSides = getCombatDieSides(attacker, 'defense');
    const atkBreakDieRoll = rollDie(atkBreakDieSides);
    const defTraitDefMalus = defTraits.reduce((s, t) => s + (t.enemyDefMalus || 0), 0);
    const atkBaseBreakthrough = Math.max(0, attacker.defense - attacker.roundTemp.defMalus - defTraitDefMalus);
    const atkBreakTotals = computeUnitTotalStat(
      attacker, defender, atkSide, defSide, 'defense',
      atkBaseBreakthrough, atkBreakDieRoll, 0, atkTactic, defTactic, true
    );

    addLog(
      'rolls',
      `↩ [Return Fire Clash] ${defender.name} RetAtk: Base(${retBaseAtk.toFixed(1)}) + d${retDieSides}(${retDieRoll}) + Flat(${defRetAtkTotals.flatBonus}) × Mod(${defRetAtkTotals.netPct >= 0 ? '+' : ''}${defRetAtkTotals.netPct}%) = ${defRetAtkTotals.finalValue} ` +
      `VS ${attacker.name} Breakthrough/Def: ${atkBreakTotals.finalValue}`
    );

    if (defRetAtkTotals.finalValue > atkBreakTotals.finalValue) {
      const retMargin = Math.max(1, Math.round(defRetAtkTotals.finalValue - atkBreakTotals.finalValue));
      addLog('rolls', `↩ [Return Fire Hit!] ${defender.name} (RetAtk ${defRetAtkTotals.finalValue} > Breakthrough ${atkBreakTotals.finalValue}) strikes back at ${attacker.name}!`);
      inflictCombatDamage(defender, attacker, retMargin, defSide, atkSide, defTactic, atkTactic, 'Return Fire');

      if (defTactic.id === 'def_counterattack' && !defender.isMonster && !defender.isZombie) {
        defender.org = Math.min(defender.maxOrg, defender.org + 2);
        addLog('damage', `⚡ [Counterattack] ${defender.name} gains +2 Organization!`);
      }
      if (defTactic.id === 'urb_def_ambush') {
        const ambRoll = rollDie(6);
        if (ambRoll >= 5) {
          applyPersonnelCasualties(attacker, rollDie(6), false, false, 'Urban Ambush Bonus');
        }
      }
    } else {
      const retGrazeResult = calculateGrazingCasualties(defender, attacker, defRetAtkTotals.finalValue, atkBreakTotals.finalValue, retPierced, true);

      if (retGrazeResult.immune) {
        addLog('rolls', `↩ [BREAKTHROUGH IMMUNE] ${attacker.name}'s Breakthrough (${atkBreakTotals.finalValue}) deflects ${defender.name}'s Return Fire (${defRetAtkTotals.finalValue}): ${retGrazeResult.reason} (0 casualties)!`);
      } else {
        addLog('damage', `↩ [Grazing Return Fire] ${attacker.name}'s Breakthrough (${atkBreakTotals.finalValue}) holds vs ${defender.name} (${defRetAtkTotals.finalValue}), but takes ${retGrazeResult.casualties} suppressing casualties (${retGrazeResult.reason})!`);
        applyPersonnelCasualties(attacker, retGrazeResult.casualties, false, false, 'Grazing Return Fire', defTactic, atkTactic);
      }
    }
  } else {
    addLog('rolls', `↩ [No Return Fire] ${defender.name} failed Return Fire Vigilance (${retDefVig} vs ${retAtkVig}).`);
  }
}

// --------------------------------------------------------------------------
// 10. Aggregate Combat Statistic Calculations
// --------------------------------------------------------------------------

function computeUnitTotalStat(unit, opponent, mySide, enemySide, role, baseStat, dieRoll, vigFlatBoost, myTactic, enemyTactic, isReturnFire) {
  const myState = mySide === 'A' ? state.battle.sideA : state.battle.sideB;
  const traits = unit.traits.map(getTraitById).filter(Boolean);
  const exp = EXPERIENCE_TIERS[unit.experience] || EXPERIENCE_TIERS.Regular;
  const cmd = getSideCommander(mySide);
  const feat = TERRAIN_FEATURES[state.environment.feature] || TERRAIN_FEATURES.Normal;

  let flatBonus = vigFlatBoost;
  if (role === 'attack') {
    flatBonus += traits.reduce((s, t) => s + (t.atkFlat || 0), 0) + (myTactic.flatAtk || 0);
  } else {
    flatBonus += traits.reduce((s, t) => s + (t.defFlat || 0), 0) + (myTactic.flatDef || 0);
    if (enemyTactic.id === 'urb_atk_armour_supported' && unit.category === 'infantry') {
      flatBonus += 2;
    }
    if (unit.entrenchmentLevel >= 2) {
      flatBonus += (unit.entrenchmentLevel - 1);
    }
  }

  let posPct = 0;
  let negPct = 0;
  function addPct(val) {
    if (val >= 0) posPct += val;
    else negPct += val;
  }

  if (role === 'defense' && unit.entrenchmentLevel > 0) {
    addPct(unit.entrenchmentLevel * 5);
  }

  if (unit.org <= 0 && traits.some(t => t.isUnbreakable)) {
    addPct(-25);
  }

  addPct(role === 'attack' ? exp.atkPct : exp.defPct);

  if (role === 'attack' && myState.nextRoundAtkMod) {
    addPct(myState.nextRoundAtkMod);
  }

  if (isReturnFire && (unit.isZombie || unit.isMonster) && opponent.traits.includes('melee_attack')) {
    addPct(-30);
  }

  traits.forEach(t => {
    addPct(role === 'attack' ? (t.atkPct || 0) : (t.defPct || 0));
    if (t.terrainTarget) {
      if (t.terrainTarget === state.environment.terrain ||
         (t.terrainTarget === 'Mountain' && state.environment.terrain === 'Hills') ||
         (t.terrainTarget === 'Forest' && state.environment.terrain === 'Jungle') ||
         (t.terrainTarget === 'Amphibious' && (feat.isRiver || feat.isAmphib || state.environment.terrain === 'Marsh'))) {
        addPct(t.terrainBonus || 0);
      }
    }
    if (role === 'attack' && t.antiCategory && opponent.category === t.antiCategory) {
      addPct(t.antiBonus || 0);
    }
  });

  // Dynamic Commander Trait Modifiers
  if (cmd) {
    const cmdTraits = (cmd.traits || []).map(getCommanderTraitById).filter(Boolean);
    cmdTraits.forEach(t => {
      if (traitAppliesToUnit(t, unit)) {
        addPct(role === 'attack' ? (t.atkPct || 0) : (t.defPct || 0));

        // Terrain synergies
        if (t.terrainTarget && t.terrainTarget === state.environment.terrain) {
          addPct(t.terrainBonus || 0);
        }
      }
    });

    // Flat modifiers from Commander traits
    if (role === 'attack') {
      flatBonus += cmdTraits.filter(t => traitAppliesToUnit(t, unit)).reduce((s, t) => s + (t.atkFlat || 0), 0);
    } else {
      flatBonus += cmdTraits.filter(t => traitAppliesToUnit(t, unit)).reduce((s, t) => s + (t.defFlat || 0), 0);
    }
  }

  // Commander Attributes (+2.5% Attack per Atk Level, +2.5% Defense per Def Level)
  if (cmd) {
    if (role === 'attack') {
      addPct((cmd.attackLevel || 0) * 2.5);
    } else {
      addPct((cmd.defenseLevel || 0) * 2.5);
    }
  }

  const envMods = getTerrainUnitModifiers(unit, role);
  addPct(envMods.terrainPct);
  addPct(envMods.weatherPct);

  addPct(getOutnumberingBonusPct(mySide, enemySide));
  addPct(getSupplyMalusPct(unit));
  addPct(getOrgRemainingMalusPct(unit));
  addPct(getPersonnelLossMalusPct(unit));

  if (role === 'attack') {
    if (isReturnFire && myTactic.returnFireAtkPct) {
      addPct(myTactic.returnFireAtkPct);
    } else {
      let tacAtk = myTactic.atkPct || 0;
      if (enemyTactic.id === 'def_delay' && (myTactic.id === 'atk_blitz' || myTactic.id === 'atk_relentless')) {
        tacAtk = Math.floor(tacAtk / 2);
      }
      if (myTactic.id === 'atk_relentless' && (opponent.org / Math.max(1, opponent.maxOrg)) <= 0.30) {
        tacAtk = 25;
      }
      if (myTactic.id === 'atk_mass_charge') {
        const myActive = getSideActivePersonnel(mySide);
        const enActive = Math.max(1, getSideActivePersonnel(enemySide));
        if (myActive >= enActive * 2) tacAtk = 45;
        else if (myActive >= enActive * 1.5) tacAtk = 30;
        else tacAtk = 5;
      }
      if (myTactic.id === 'atk_unexpected_thrust') {
        if (myState.repeatTacticCount > 0) tacAtk = -10;
        else if (enemyTactic.id === 'def_ambush') tacAtk = 10;
      }
      if (myTactic.id === 'atk_well_planned') {
        if (state.battle.round === 1 && state.environment.unexpectedInitiative) tacAtk -= 10;
        const enState = enemySide === 'A' ? state.battle.sideA : state.battle.sideB;
        if (enState.prevRevealedTactic) tacAtk += 10;
      }
      if (myTactic.id === 'urb_atk_street_fighting') {
        if (unit.category === 'tank' || unit.category === 'armored_vehicle') tacAtk = -15;
        else if (unit.category === 'infantry') tacAtk = 35;
      }
      if (myTactic.id === 'urb_atk_armour_supported') {
        const hasArmorAlly = myState.units.some(u => isUnitActive(u) && u.maxArmor > 0 && u.armor > 0);
        if (unit.category === 'tank') tacAtk = -15;
        else if (unit.category === 'infantry' && hasArmorAlly) tacAtk = 20;
        else tacAtk = 0;
      }
      if (myTactic.id === 'def_backhand_blow' && opponent.roundTemp.lostTenPctLastRound) {
        tacAtk += 10;
      }
      if (myTactic.id === 'def_guerrilla' && (opponent.supply / Math.max(1, opponent.maxSupply)) < 0.50) {
        tacAtk += 10;
      }
      addPct(tacAtk);
    }
  } else {
    let tacDef = isReturnFire ? (myTactic.returnFireDefPct || myTactic.breakthroughPct || myTactic.defPct || 0) : (myTactic.defPct || 0);
    if (myTactic.id === 'def_defend' && feat.fortified) tacDef += 10;
    if (myTactic.id === 'urb_def_city' && unit.category === 'infantry') tacDef += 10;
    if (myTactic.id === 'urb_def_fortified' && unit.traits.includes('fortification_engineer')) tacDef += 10;
    if (enemyTactic.id === 'atk_assault') tacDef -= 10;
    if (enemyTactic.id === 'atk_encirclement' && opponent.roundTemp.engagedByCount > 1) tacDef -= 10;
    addPct(tacDef);
  }

  const cappedNegPct = Math.max(-95, negPct);
  const netPct = Math.max(-95, posPct + cappedNegPct);

  const preMult = Math.max(0, baseStat + dieRoll + flatBonus);
  const finalValue = Math.round(preMult * (1 + netPct / 100) * 10) / 10;

  return { flatBonus, posPct, negPct: cappedNegPct, netPct, finalValue };
}

// --------------------------------------------------------------------------
// 11. Casualty Infliction & Recovery Roll Resolution
// --------------------------------------------------------------------------

function inflictCombatDamage(attacker, defender, attackDefenseDiff, atkSide, defSide, atkTactic, defTactic, phaseLabel) {
  const diffDieSides = Math.max(1, Math.round(attackDefenseDiff));
  const baseCasRoll = rollDie(diffDieSides);

  const atkTraits = attacker.traits.map(getTraitById).filter(Boolean);
  const hasHighCal = atkTraits.some(t => t.grantsHighCaliber) || attacker.category === 'armored_vehicle' || attacker.category === 'tank';
  const hasExplosive = atkTraits.some(t => t.grantsExplosive) || attacker.category === 'artillery';

  const highCalRoll = hasHighCal ? (2 + rollDie(6)) : 0;
  const explosiveRoll = hasExplosive ? (3 + rollDie(8)) : 0;

  let finalBaseCas = baseCasRoll;
  let finalHighCal = highCalRoll;
  let finalExplosive = explosiveRoll;

  if (defender.roundTemp && defender.roundTemp.inCover) {
    finalBaseCas = Math.max(1, Math.ceil(baseCasRoll * 0.5));
    finalHighCal = 0;
    finalExplosive = Math.ceil(explosiveRoll * 0.5);
  }

  let rawDowned = finalBaseCas + finalHighCal + finalExplosive;

  if (atkTraits.some(t => t.isSpecialForces)) {
    rawDowned = Math.round(rawDowned * 1.25);
  }

  if (defender.isZombie && (hasHighCal || hasExplosive)) {
    const zombieExtra = Math.round(rawDowned * 0.50);
    rawDowned += zombieExtra;
    addLog('damage', `🧟 [Zombie Dismemberment] High-Caliber / Explosive fire shreds the horde for +${zombieExtra} extra casualties!`);
  }

  if ((defender.armorTier === 'unarmored' || defender.maxArmor <= 0) && defender.roundTemp && !defender.roundTemp.inCover && !defender.isMonster && !defender.isZombie) {
    const openSuppression = 1 + rollDie(4);
    defender.org = Math.max(0, defender.org - openSuppression);
    addLog('damage', `⚡ [Caught in Open Shock] ${defender.name} pinned without defilade, taking -${openSuppression} Org shock!`);
  }
  if (defTactic.id === 'atk_mass_charge' && (hasHighCal || hasExplosive)) {
    rawDowned = Math.round(rawDowned * 1.15);
  }
  if (defTactic.id === 'def_tactical_withdrawal') {
    rawDowned = Math.max(1, Math.round(rawDowned * 0.80));
  }

  addLog(
    'damage',
    `🩸 [${phaseLabel} Damage] ${attacker.name} ➔ ${defender.name}: Roll d${diffDieSides}(${baseCasRoll})` +
    (hasHighCal ? ` + HighCal(${highCalRoll})` : '') +
    (hasExplosive ? ` + Explosive(${explosiveRoll})` : '') +
    ` = ${rawDowned} personnel downed!`
  );

  applyPersonnelCasualties(defender, rawDowned, hasHighCal, hasExplosive, phaseLabel, atkTactic, defTactic);
}

function applyPersonnelCasualties(defender, rawDowned, hasHighCal, hasExplosive, phaseLabel, atkTactic = {}, defTactic = {}) {
  const actualDowned = Math.min(defender.personnel, Math.max(0, rawDowned));
  if (actualDowned <= 0) return;

  defender.personnel -= actualDowned;

  if (defender.isMonster) {
    defender.dead += actualDowned;
    addLog('damage', `💀 [Monster Permanent Wound] ${defender.name} has no recovery capacity: all ${actualDowned} damage directly reduces vital mass (100% KIA) (${defender.personnel}/${defender.maxPersonnel} active).`);
    checkAndMarkUnitDefeat(defender);
    return;
  }

  const isZombie = defender.isZombie;
  const rawRecRoll = isZombie ? rollDie(100) : (50 + rollDie(50));
  const baseRec = rawRecRoll;
  const defTraits = defender.traits.map(getTraitById).filter(Boolean);
  const expObj = EXPERIENCE_TIERS[defender.experience] || EXPERIENCE_TIERS.Regular;

  const opMods = getTerrainOperationalMods(defender.category);
  let recMod = (expObj.recBonus || 0) + defTraits.reduce((s, t) => s + (t.recBonus || 0), 0) + opMods.triageMod;
  if (hasHighCal) recMod -= 10;
  if (hasExplosive) recMod -= 15;

  const finalRecScore = clamp(baseRec + recMod, 5, 95);
  const deadPct = (100 - finalRecScore) / 100;
  const deadCount = Math.round(actualDowned * deadPct);
  const woundedCount = actualDowned - deadCount;

  defender.dead += deadCount;

  if (defender.isZombie) {
    defender.personnel += woundedCount;
    addLog('damage', `🧟 [Zombie Reanimation] Recovery Roll (d100[${rawRecRoll}])+${recMod}=${finalRecScore}: ${deadCount} permanently destroyed, while ${woundedCount} rise back into battle! (${defender.personnel} active)`);
  } else {
    defender.wounded += woundedCount;
    addLog('damage', `🏥 [Casualty Recovery] ${defender.name} (50+d50[${rawRecRoll - 50}])=${baseRec}+${recMod}=${finalRecScore}: ${deadCount} KIA (Dead), ${woundedCount} WIA (Wounded) (${defender.personnel}/${defender.maxPersonnel} active).`);
  }

  if (!defender.isMonster && !defender.isZombie) {
    const singleRoundRatio = actualDowned / Math.max(1, defender.maxPersonnel);
    const totalLostRatio = (defender.maxPersonnel - defender.personnel) / Math.max(1, defender.maxPersonnel);
    const newCumTenths = Math.floor((totalLostRatio + 0.0001) * 10);

    let orgDmg = 0;
    let orgReasons = [];

    if (singleRoundRatio >= 0.30) {
      const r = 3 + rollDie(12);
      orgDmg += r;
      orgReasons.push(`>=3/10 single-rd (3+d12=${r})`);
      defender.roundTemp.lostTenPctLastRound = true;
    } else if (singleRoundRatio >= 0.20) {
      const r = 2 + rollDie(10);
      orgDmg += r;
      orgReasons.push(`>=2/10 single-rd (2+d10=${r})`);
      defender.roundTemp.lostTenPctLastRound = true;
    } else if (singleRoundRatio >= 0.10) {
      const r = 1 + rollDie(6);
      orgDmg += r;
      orgReasons.push(`>=1/10 single-rd (1+d6=${r})`);
      defender.roundTemp.lostTenPctLastRound = true;
    }

    while (defender.cumPersonnelLostTenths < newCumTenths) {
      defender.cumPersonnelLostTenths++;
      const t = defender.cumPersonnelLostTenths;
      let r = 0;
      if (t === 1) {
        r = 1 + rollDie(3);
        orgReasons.push(`1/10 cum. loss (1+d3=${r})`);
      } else if (t === 2) {
        r = 1 + rollDie(6);
        orgReasons.push(`2/10 cum. loss (1+d6=${r})`);
      } else if (t === 3) {
        r = 2 + rollDie(10);
        orgReasons.push(`3/10 cum. loss (2+d10=${r})`);
      } else {
        r = 3 + rollDie(12);
        orgReasons.push(`${t}/10 cum. loss (3+d12=${r})`);
      }
      orgDmg += r;
    }

    // Base combat cohesion shock
    if (orgDmg === 0) {
         orgDmg = 1 + rollDie(3);
        orgReasons.push(`combat shock (1+d3=${orgDmg})`);
    }

    // MANPOWER COHESION SHIELD: Formations with >=75% headcount resist chip shock
    const persRatio = defender.personnel / Math.max(1, defender.maxPersonnel);
    if (persRatio >= 0.75 && orgDmg > 0) {
        const absorbed = Math.min(2, orgDmg - 1);
        if (absorbed > 0) {
        orgDmg -= absorbed;
        orgReasons.push(`Intact Ranks Shield (-${absorbed})`);
        }
    }

    if (atkTactic && atkTactic.orgDmgPct) {
      orgDmg = Math.round(orgDmg * (1 + atkTactic.orgDmgPct / 100));
    }

    if (defTactic && defTactic.orgDmgResistPct) {
      orgDmg = Math.round(orgDmg * (1 - defTactic.orgDmgResistPct / 100));
    }
    if (defTactic && defTactic.flatOrgReduction && !defender.roundTemp.fortifiedOrgReductionUsed) {
      defender.roundTemp.fortifiedOrgReductionUsed = true;
      orgDmg = Math.max(0, orgDmg - defTactic.flatOrgReduction);
    }

    defender.org = Math.max(0, defender.org - orgDmg);
    addLog('damage', `📉 [Org Damage] ${defender.name} loses -${orgDmg} Organization (${orgReasons.join(', ')}) ➔ ${defender.org}/${defender.maxOrg} Org remaining.`);
  }

  checkAndMarkUnitDefeat(defender);
}