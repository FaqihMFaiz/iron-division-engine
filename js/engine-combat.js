/* ==========================================================================
   IRON DIVISION ENGINE — COMBAT ENGINE & ENGAGEMENT RESOLUTION
   File: js/engine-combat.js
   ========================================================================== */

window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  // Private module closure variable - completely isolated from the window scope
  let instanceCounter = 1;

  // Shortcuts to companion modules with safe fallbacks
  const H = ID.Helpers || {};
  const D = ID.Data || {};

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
      pos: H.getUnitStartingPosition ? H.getUnitStartingPosition(template) : 2,
      meleeDistance: null,
      mobilityClassPenalty: 0,
      entrenchmentLevel: 0,
      isRallying: false,
      rallyRoundsLeft: 0,
      rallyRoundsResting: 0,
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
    if (!ID.state || !ID.state.traits) return null;
    return ID.state.traits.find(t => t.id === id);
  }

  function getCommanderTraitById(id) {
    if (ID.state && ID.state.commanderTraits) {
      const found = ID.state.commanderTraits.find(t => t.id === id);
      if (found) return found;
    }
    return (D.DEFAULT_COMMANDER_TRAITS || []).find(t => t.id === id);
  }

  function getSideCommander(side) {
    if (!ID.state || !ID.state.battle) return null;
    const sideObj = side === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
    return ID.state.commanders.find(c => c.id === sideObj.commanderId) || ID.state.commanders[0];
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
    const baseCooldown = 2 + H.rollDie(2);

    let durationRed = 0;
    if (cmd) {
      const cmdTraitObjs = (cmd.traits || []).map(getCommanderTraitById).filter(Boolean);
      durationRed = cmdTraitObjs.reduce((s, t) => s + (t.rallyDurationRed || 0), 0);
    }

    u.rallyRoundsLeft = Math.max(1, baseCooldown - durationRed);
    u.rallyRoundsResting = 0;

    // Scattered troops join the Escaped pool
    const minRallyPersonnel = Math.min(15, Math.max(5, Math.ceil(u.maxPersonnel * 0.15)));
    const retainedCount = Math.max(minRallyPersonnel, Math.round(u.personnel * 0.75));
    const scatteredCount = u.personnel - retainedCount;

    if (scatteredCount > 0) {
      u.escaped = (u.escaped || 0) + scatteredCount;
      u.personnel = retainedCount;
      u.ralliedPersonnel = retainedCount;
      H.addLog('damage', `🏃 [Rout & Scatter] ${u.name} broke (${reason})! ${scatteredCount} troops scattered and escaped the battlefield; ${retainedCount} disciplined soldiers fall back to regroup (${u.rallyRoundsLeft} rds to rally).`);
    } else {
      u.ralliedPersonnel = u.personnel;
      H.addLog('damage', `🏳 [Rout & Fallback] ${u.name} broke (${reason})! Surviving ${u.personnel} troops fall back in order to regroup (${u.rallyRoundsLeft} rds to rally).`);
    }

    if (u.originalMaxArmor > 0) {
      if (u.armor <= 0) {
        u.isDismounted = true;
        u.maxArmor = 0;
        H.addLog('armor', `🚜 [Dismounted Rout] ${u.name} has 0 operational armor remaining; surviving crews fall back on foot.`);
      } else {
        u.isDismounted = false;
        H.addLog('armor', `🚜 [Armor Tactical Fallback] ${u.name} withdraws to the rear with its ${u.armor} active combat vehicles to reorganize.`);
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
      H.addLog('damage', `💀 [${u.side}] ${u.name} has lost all active personnel and is wiped out!`);
      return true;
    }

    const minRallyPersonnel = Math.min(20, Math.max(5, Math.ceil(u.maxPersonnel * 0.15)));

    if (!u.isDismounted && u.maxArmor > 0 && u.armor <= 0) {
      u.armor = 0;
      if (!u.ralliedOnce && u.personnel >= minRallyPersonnel) {
        triggerUnitRally(u, 'All combat-ready armor disabled');
        return false;
      } else {
        u.defeated = true;
        u.defeatReason = 'All combat-ready armor destroyed/disabled';
        H.addLog('armor', `🔥 [${u.side}] ${u.name} has 0 combat-ready armor remaining and is defeated!`);
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
        if (!u.ralliedOnce && u.personnel >= minRallyPersonnel) {
          triggerUnitRally(u, 'Cohesion broke');
          return false;
        } else {
          u.defeated = true;
          u.defeatReason = 'Organization broke (Permanently routed)';
          H.addLog('damage', `🏳 [${u.side}] ${u.name} reached 0 Organization! Cohesion broke and the unit is permanently routed!`);
          return true;
        }
      } else {
        if (u.unbreakableRoundsLeft === null || u.unbreakableRoundsLeft === undefined) {
          u.unbreakableRoundsLeft = 2;
          H.addLog('damage', `🛡 [Unbreakable Stand] ${u.name} reached 0 Organization! Unbreakable triggers: formation can fight on for 2 rounds at -25% stats before collapsing!`);
        }
        return false;
      }
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // 2. Dynamic Target Value (TV) & Priority Engine
  // --------------------------------------------------------------------------

  function getUnitTargetValue(target, attacker = null, atkTactic = null) {
    if (!target) return 0;

    // 1. Size & Material Footprint
    let sizeScore = target.personnel * 0.6;
    if (target.maxArmor > 0 && target.armor > 0) {
      sizeScore += (target.armor * 8);
    }

    // 2. Total Damage Threat to Opponent
    let threatScore = 0;
    if (attacker) {
      const isAttackerArmored = (attacker.maxArmor > 0 && attacker.armorTier !== 'unarmored');
      if (isAttackerArmored) {
        threatScore = (target.hardAttack * 5) + (target.softAttack * 2);
      } else {
        threatScore = (target.softAttack * 5) + (target.hardAttack * 1);
      }
    } else {
      threatScore = (target.softAttack * 4) + (target.hardAttack * 3);
    }

    // 3. Organization & Kill Priority
    const currentOrg = (target.isMonster || target.isZombie) ? 50 : target.org;
    const maxOrg = (target.isMonster || target.isZombie) ? 50 : Math.max(1, target.maxOrg);
    let orgScore = currentOrg * 3;

    if (!target.isMonster && !target.isZombie) {
      const orgRatio = currentOrg / maxOrg;
      if (orgRatio <= 0.15) orgScore += 250;
      else if (orgRatio <= 0.35) orgScore += 150;
    }

    // 4. Unit Category Priority Multiplier
    let categoryMultiplier = 1.0;
    if (target.category === 'artillery') categoryMultiplier = 1.35;
    else if (target.category === 'tank') categoryMultiplier = 1.25;
    else if (target.category === 'armored_vehicle') categoryMultiplier = 1.15;

    // 5. Entrenchment Level
    const entrenchLvl = target.entrenchmentLevel || 0;
    let entrenchmentMod = 0;
    const isBunkerBustingTactic = atkTactic && (
      atkTactic.id === 'atk_breakthrough' ||
      atkTactic.id === 'atk_assault' ||
      atkTactic.id === 'urb_atk_barrage'
    );

    if (isBunkerBustingTactic) {
      entrenchmentMod = entrenchLvl * 25;
    } else {
      if (entrenchLvl === 0) entrenchmentMod = +60;
      else if (entrenchLvl === 1) entrenchmentMod = +20;
      else if (entrenchLvl === 2) entrenchmentMod = 0;
      else if (entrenchLvl === 3) entrenchmentMod = -30;
      else if (entrenchLvl >= 4) entrenchmentMod = -70;
    }

    // 6. Frontliner Screening Magnet
    const frontlinerBonus = isFrontlinerActive(target) ? 200 : 0;

    const baseTV = (sizeScore + threatScore + orgScore) * categoryMultiplier + entrenchmentMod + frontlinerBonus;

    // 7. Y-Axis Proximity Multiplier
    const effectiveDist = attacker
      ? H.getTotalDistance(attacker, target)
      : Math.max(0, (target.pos !== undefined ? target.pos : H.getUnitStartingPosition(target)));

    const distMultiplier = (attacker && H.canUnitIgnoreDistance(attacker, atkTactic))
      ? 1.50
      : H.getDistanceTargetMultiplier(effectiveDist);

    return Math.max(10, Math.round(baseTV * distMultiplier));
  }

  function getCategoryPursuitRetreatBonus(category) {
    if (category === 'armored_vehicle') return 20;
    if (category === 'tank') return 10;
    return 0;
  }

  function getUnitPursuitBonus(u) {
    const baseCat = getCategoryPursuitRetreatBonus(u.category);
    const expBonus = D.EXPERIENCE_TIERS[u.experience]?.pursueBonus || 0;
    const traitBonus = (u.traits || []).map(getTraitById).filter(Boolean).reduce((s, t) => s + (t.pursueBonus || 0), 0);
    return baseCat + expBonus + traitBonus;
  }

  function getUnitRetreatBonus(u) {
    const baseCat = getCategoryPursuitRetreatBonus(u.category);
    const expBonus = D.EXPERIENCE_TIERS[u.experience]?.retreatBonus || 0;
    const traitBonus = (u.traits || []).map(getTraitById).filter(Boolean).reduce((s, t) => s + (t.retreatBonus || 0), 0);
    return baseCat + expBonus + traitBonus;
  }

  // --------------------------------------------------------------------------
  // 3. Tactics Selection & AI
  // --------------------------------------------------------------------------

  function getEligibleTactics(role, isUrban) {
    return (D.TACTICS_DB || []).filter(t => {
      if (t.role !== role) return false;
      if (t.urbanOnly && !isUrban) return false;
      return true;
    });
  }

  function selectTacticForSide(side, role) {
    const sideState = side === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
    const terrainObj = ID.state.terrains[ID.state.environment.terrain] || D.DEFAULT_TERRAINS.Plains;
    const isUrban = !!terrainObj.isUrban || ID.state.environment.feature === 'Fort';
    const eligible = getEligibleTactics(role, isUrban);

    if (sideState.tacticId && sideState.tacticId !== 'auto') {
      const manual = eligible.find(t => t.id === sideState.tacticId);
      if (manual) {
        if (manual.id === 'urb_atk_barrage' && sideState.barrageCooldown > 0) {
          H.addLog('rolls', `⚠ [Side ${side}] Street-by-Street Barrage is on cooldown (${sideState.barrageCooldown} rds left); defaulting to Attack.`);
          return eligible[0];
        }
        return manual;
      }
    }

    const cmd = getSideCommander(side);
    const personality = cmd ? cmd.personality : 'Balanced';
    const pool = eligible.filter(t => {
      if (t.id === 'urb_atk_barrage' && sideState.barrageCooldown > 0) return false;
      return true;
    });
    const preferred = pool.filter(t => t.personality === personality);
    const pickPool = preferred.length > 0 && Math.random() < 0.75 ? preferred : pool;
    return pickPool[Math.floor(Math.random() * pickPool.length)] || eligible[0];
  }

  // --------------------------------------------------------------------------
  // 4. Modifier Calculators
  // --------------------------------------------------------------------------

  function getSideActivePersonnel(side) {
    const units = side === 'A' ? ID.state.battle.sideA.units : ID.state.battle.sideB.units;
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
    const baseInfo = D.ARMOR_TIERS[u.armorTier] || D.ARMOR_TIERS.unarmored;
    if (u.maxArmor <= 0 || u.armorTier === 'unarmored') {
      return { hardRatio: 0.0, softRatio: 1.0 };
    }
    const vehicleRatio = H.clamp(u.armor / Math.max(1, u.maxArmor), 0, 1);
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
      const vehicleRatio = H.clamp(u.armor / Math.max(1, u.maxArmor), 0.25, 1.0);
      baseHard = Math.round(baseHard * vehicleRatio);
    }
    let effHard = Math.max(0, baseHard - (u.roundTemp?.hardMalus || 0) - extraHardMalus);

    // Close-Assault Terrain Bypass
    const closeTerrains = ['Urban', 'Forest', 'Jungle', 'Mountain'];
    if (attackerUnit && closeTerrains.includes(ID.state.environment.terrain) && attackerUnit.category === 'infantry') {
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
    const terr = ID.state.terrains[ID.state.environment.terrain] || D.DEFAULT_TERRAINS.Plains;
    const feat = D.TERRAIN_FEATURES[ID.state.environment.feature] || D.TERRAIN_FEATURES.Normal;
    const weath = D.WEATHER_TYPES[ID.state.environment.weather] || D.WEATHER_TYPES.Sunny;

    const theatreAtkSide = ID.state.environment.theatreAttackerSide || 'A';
    const isTheatreAttacker = u.side === theatreAtkSide;

    let basePct = 0;
    if (u.category === 'infantry') basePct = role === 'attack' ? terr.infAtk : terr.infDef;
    else if (u.category === 'armored_vehicle') basePct = role === 'attack' ? terr.avAtk : terr.avDef;
    else if (u.category === 'tank') basePct = role === 'attack' ? terr.tankAtk : terr.tankDef;
    else if (u.category === 'artillery') basePct = role === 'attack' ? terr.artAtk : terr.artDef;

    const hasMarines = u.traits.includes('marines');
    let featMult = 1.0;
    if (role === 'attack' && isTheatreAttacker) {
      featMult = feat.atkMult;
      if (hasMarines && (feat.isRiver || feat.isAmphib) && featMult < 1.0) featMult = 1.0;
    } else if (role === 'defense' && !isTheatreAttacker) {
      featMult = feat.defMult;
    } else if (feat.id === 'Road') {
      featMult = role === 'attack' ? feat.atkMult : feat.defMult;
    }

    const combinedMult = (1 + basePct / 100) * featMult;
    const totalTerrainPct = Math.round((combinedMult - 1) * 100);

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
  // 5. Main Combat Execution Loop
  // --------------------------------------------------------------------------

  function runSingleRound() {
    try {
      if (ID.state.battle.isOver) {
        if (ID.UI && ID.UI.openBattleSummaryModal) ID.UI.openBattleSummaryModal();
        return;
      }

      if (ID.state.battle.round === 1) {
        const activeA = ID.state.battle.sideA.units.filter(isUnitActive);
        const activeB = ID.state.battle.sideB.units.filter(isUnitActive);
        if (activeA.length === 0 || activeB.length === 0) {
          H.showToast('Deploy at least one active unit on both Side A and Side B to begin combat!', 'warn');
          return;
        }
      }

      if (ID.state.battle.round === 1 && !ID.state.battle.initialSnapshot) {
        ID.state.battle.initialSnapshot = {
          sideA: structuredClone(ID.state.battle.sideA.units),
          sideB: structuredClone(ID.state.battle.sideB.units)
        };
      }

      const rd = ID.state.battle.round;
      const atkSide = ID.state.battle.attackerSide;
      const defSide = atkSide === 'A' ? 'B' : 'A';
      const atkState = atkSide === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
      const defState = defSide === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;

      H.addLog('rolls', `================================================`);
      H.addLog('rolls', `⚔ ROUND ${rd} BEGINS — Side ${atkSide} Attacks | Side ${defSide} Defends`);

      [...ID.state.battle.sideA.units, ...ID.state.battle.sideB.units].forEach(u => {
        u.roundTemp.defMalus = 0;
        u.roundTemp.hardMalus = 0;
        u.roundTemp.attackedThisRound = false;
        u.roundTemp.engagedByCount = 0;
        u.roundTemp.fortifiedOrgReductionUsed = false;
        u.roundTemp.inCover = false;
        u.roundTemp.coverDenied = false;
      });

      // 1. Tactics Selection
      const atkTactic = selectTacticForSide(atkSide, 'attack');
      const defTactic = selectTacticForSide(defSide, 'defense');

      atkState.repeatTacticCount = (atkState.lastChosenTacticId === atkTactic.id) ? atkState.repeatTacticCount + 1 : 0;
      defState.repeatTacticCount = (defState.lastChosenTacticId === defTactic.id) ? defState.repeatTacticCount + 1 : 0;

      atkState.chosenTacticId = atkTactic.id;
      defState.chosenTacticId = defTactic.id;
      atkState.lastChosenTacticId = atkTactic.id;
      defState.lastChosenTacticId = defTactic.id;

      H.addLog('rolls', `📋 Tactics Selected — Side ${atkSide} (Attacker): [${atkTactic.name}${H.formatTacticModifiers(atkTactic)}] | Side ${defSide} (Defender): [${defTactic.name}${H.formatTacticModifiers(defTactic)}]`);

      if (atkState.barrageCooldown > 0 && atkTactic.id !== 'urb_atk_barrage') atkState.barrageCooldown--;
      if (defState.barrageCooldown > 0) defState.barrageCooldown--;

      // 2. Supply Upkeep, DOW & Rallying
      processSupplyAndStartOfRoundTraits('A', atkSide === 'A' ? atkTactic : defTactic);
      processSupplyAndStartOfRoundTraits('B', atkSide === 'B' ? atkTactic : defTactic);

      const isBattleOver = ID.Pursuit ? ID.Pursuit.checkBattleEndCondition() : false;
      if (isBattleOver) {
        if (ID.UI && ID.UI.renderCombatRound) ID.UI.renderCombatRound();
        return;
      }

      // 3. Recon / Vigilance Roll
      const vigResult = performVigilanceComparison(atkSide, defSide, atkTactic, defTactic);

      // 4. Off-Map Fire Support
      processSideSupportFire(atkSide, defSide);
      processSideSupportFire(defSide, atkSide);

      if (ID.Pursuit && ID.Pursuit.checkBattleEndCondition()) {
        if (ID.UI && ID.UI.renderCombatRound) ID.UI.renderCombatRound();
        return;
      }

      // 5. Main Attack & Y-Axis Movement Phase
      const attackers = atkState.units.filter(isUnitActive);
      const defenders = defState.units.filter(isUnitActive);

      if (attackers.length > 0 && defenders.length === 0) {
        H.addLog('rolls', `⏳ [Empty Frontline] Side ${defSide} has no active frontline troops (all survivors are regrouping in the rear). Side ${atkSide} holds the sector uncontested.`);
      }

      const hasManeuverUnits = attackers.some(u => u.category !== 'artillery');
      let frontlineInRangeThisRound = false;

      for (const atkUnit of attackers) {
        const currentDefenders = defState.units.filter(isUnitActive);
        if (currentDefenders.length === 0) break;

        if (atkUnit.pos === undefined || atkUnit.pos === null) {
          atkUnit.pos = H.getUnitStartingPosition(atkUnit);
        }
        currentDefenders.forEach(d => {
          if (d.pos === undefined || d.pos === null) d.pos = H.getUnitStartingPosition(d);
        });

        const eligibleDefenders = currentDefenders.filter(d => H.canUnitEngageTarget(atkUnit, d, atkTactic));

        if (eligibleDefenders.length === 0) {
          const minDefenderPos = Math.min(...currentDefenders.map(d => d.pos));
          const oldPos = atkUnit.pos;
          const unitRange = H.getUnitEngagementRange(atkUnit);

          const moveRate = (atkUnit.traits.includes('melee_attack') && (oldPos + minDefenderPos) > 2) ? 2 : 1;
          const minAllowedPos = 1 - minDefenderPos;
          atkUnit.pos = Math.max(minAllowedPos, oldPos - moveRate);
          atkUnit.entrenchmentLevel = 0;

          const newClosestDist = H.getTotalDistance(atkUnit, currentDefenders.reduce((a, b) => (a.pos < b.pos ? a : b)));
          H.addLog(
            'rolls',
            `🏃 [Advancing on Y-Axis] ${atkUnit.name} (Max Range ≤${unitRange}) has no enemy in range and moves ${oldPos - atkUnit.pos} distance forward (Dist: ${oldPos} ➔ ${atkUnit.pos} | Closest Enemy Total Dist: ${newClosestDist}).`
          );
          continue;
        }

        if (!hasManeuverUnits || atkUnit.category !== 'artillery') {
          frontlineInRangeThisRound = true;
        }

        const targetUnit = selectTargetUnit(atkUnit, eligibleDefenders, atkTactic, defTactic, vigResult.attackerWonVig);
        if (!targetUnit) continue;

        targetUnit.roundTemp.engagedByCount++;
        atkUnit.roundTemp.attackedThisRound = true;

        resolveUnitEngagement(atkUnit, targetUnit, atkSide, defSide, atkTactic, defTactic, vigResult);

        // Melee Rush: units with melee_attack step 1 closer into Total Distance 1 after firing
        if (isUnitActive(atkUnit) && isUnitActive(targetUnit) && atkUnit.traits.includes('melee_attack')) {
          const curDist = H.getTotalDistance(atkUnit, targetUnit);
          if (curDist > 1) {
            const prevPos = atkUnit.pos;
            atkUnit.pos = Math.max(1 - targetUnit.pos, atkUnit.pos - 1);
            if (atkUnit.pos !== prevPos) {
              H.addLog('rolls', `🗡 [Melee Rush] ${atkUnit.name} presses forward into point-blank trench range (Dist: ${prevPos} ➔ ${atkUnit.pos} | Total Dist: ${H.getTotalDistance(atkUnit, targetUnit)})!`);
            }
          }
        }
      }

      // 6. End-of-Round Tactic Effects
      if (atkTactic.selfEndOrgDmg && defenders.length > 0 && frontlineInRangeThisRound) {
        atkState.units.filter(isUnitActive).forEach(u => {
          if (!u.isMonster && !u.isZombie) {
            u.org = Math.max(0, u.org - atkTactic.selfEndOrgDmg);
            H.addLog('damage', `⚡ [Shock Malus] ${u.name} suffers -${atkTactic.selfEndOrgDmg} Org at end of round.`);
            checkAndMarkUnitDefeat(u);
          }
        });
      }

      atkState.prevRevealedTactic = atkTactic.id;
      defState.prevRevealedTactic = defTactic.id;

      // 7. Check Battle End Condition
      if (ID.Pursuit && ID.Pursuit.checkBattleEndCondition()) {
        if (ID.UI && ID.UI.renderCombatRound) ID.UI.renderCombatRound();
        return;
      }

      // 8. Turn Progression & Phase Lock
      ID.state.battle.round++;
      if (!frontlineInRangeThisRound && defenders.length > 0) {
        H.addLog('rolls', `⏳ [Initiative Locked] Side ${atkSide} has not yet closed into frontline engagement range — Side ${atkSide} remains in the Attacking Phase while Side ${defSide} holds in the Defending Phase!`);
      } else {
        ID.state.battle.attackerSide = ID.state.battle.attackerSide === 'A' ? 'B' : 'A';
      }

      // Granular telemetry refresh
      if (ID.UI && ID.UI.renderCombatRound) {
        ID.UI.renderCombatRound();
      }

    } catch (error) {
      if (ID.Diagnostics) {
        ID.Diagnostics.logSystemError('runSingleRound', error);
      } else {
        console.error('runSingleRound error:', error);
      }
      H.showToast('Battle resolution failed. Check the console for details.', 'danger');
      if (ID.UI && ID.UI.renderCombatRound) {
        ID.UI.renderCombatRound();
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Logistics, Upkeep, DOW & Rally Engine
  // --------------------------------------------------------------------------

  function processSupplyAndStartOfRoundTraits(side, chosenTactic) {
    const sideState = side === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
    const enemyState = side === 'A' ? ID.state.battle.sideB : ID.state.battle.sideA;
    const cmd = getSideCommander(side);
    const terr = ID.state.terrains[ID.state.environment.terrain] || D.DEFAULT_TERRAINS.Plains;
    const feat = D.TERRAIN_FEATURES[ID.state.environment.feature] || D.TERRAIN_FEATURES.Normal;
    const weath = D.WEATHER_TYPES[ID.state.environment.weather] || D.WEATHER_TYPES.Sunny;

    if (sideState.supplyDepot === undefined || sideState.supplyDepot === null) {
      sideState.maxSupplyDepot = calculateSideDepotCapacity(side);
      sideState.supplyDepot = sideState.maxSupplyDepot;
    }

    // 1. Resolve Rallying Queue
    for (const u of sideState.units) {
      if (u.isRallying) {
        if (u.personnel <= 0) {
          u.isRallying = false;
          u.defeated = true;
          u.defeatReason = 'All personnel eliminated';
          continue;
        }

        // Reorganize Org in rear staging
        if (!u.isMonster && !u.isZombie) {
          const baseD3 = H.rollDie(3);
          const unitTraits = (u.traits || []).map(getTraitById).filter(Boolean);
          const expObj = D.EXPERIENCE_TIERS[u.experience] || D.EXPERIENCE_TIERS.Regular;
          let traitBonus = (expObj.orgRegen || 0) + unitTraits.reduce((s, t) => s + (t.orgRegen || 0), 0);

          const manpowerRatio = u.personnel / Math.max(1, u.maxPersonnel);
          if (manpowerRatio >= 0.75) traitBonus += 1;

          let terrainBonus = 0;
          if (ID.state.environment.feature === 'Fort') terrainBonus += 2;
          const protectiveTerrains = ['Forest', 'Mountain', 'Hills', 'Urban', 'Jungle'];
          if (protectiveTerrains.includes(ID.state.environment.terrain)) terrainBonus += 1;

          let cmdBonus = 0;
          if (cmd) {
            if (cmd.traits && cmd.traits.includes('organizer')) cmdBonus += 1;
            if (cmd.traits && cmd.traits.includes('iron_disciplinarian')) cmdBonus += 1;
            const cmdTraits = (cmd.traits || []).map(getCommanderTraitById).filter(Boolean);
            cmdBonus += cmdTraits.filter(t => traitAppliesToUnit(t, u)).reduce((s, t) => s + (t.orgRegen || 0), 0);
            if ((cmd.commandLevel || 0) >= 8) cmdBonus += 2;
            else if ((cmd.commandLevel || 0) >= 4) cmdBonus += 1;
          }

          const totalRallyOrgGain = baseD3 + traitBonus + terrainBonus + cmdBonus;
          u.org = H.clamp((u.org || 0) + totalRallyOrgGain, 0, u.maxOrg);

          // Restock supply from Depot
          if (u.supply < u.maxSupply && sideState.supplyDepot > 0) {
            const rawSup = (sideState.supplyDepot > 30) ? (5 + H.rollDie(6)) : H.rollDie(3);
            const traitSupBonus = unitTraits.reduce((s, t) => s + (t.supplyRegen || 0), 0);
            const cmdSupBonus = (cmd && cmd.traits.includes('logistics_wizard') ? 2 : 0) + Math.floor((cmd?.logisticsLevel || 0) / 3);
            const neededSupply = u.maxSupply - u.supply;
            const requestedSupply = Math.min(neededSupply, rawSup + traitSupBonus + cmdSupBonus);

            const drawnSupply = Math.min(sideState.supplyDepot, requestedSupply);
            sideState.supplyDepot = Math.max(0, sideState.supplyDepot - drawnSupply);
            u.supply = H.clamp(u.supply + drawnSupply, 0, u.maxSupply);

            H.addLog('support', `📦 [Depot Refit] ${u.name} draws +${drawnSupply} supply from Depot (➔ Unit: ${u.supply}/${u.maxSupply} | Depot: ${sideState.supplyDepot}/${sideState.maxSupplyDepot}).`);
          }

          H.addLog('support', `💚 [Rally Staging Area] ${u.name} reorganizes in the rear: +${totalRallyOrgGain} Org (d3[${baseD3}] + Traits[+${traitBonus}] + Terrain[+${terrainBonus}] + Cmd[+${cmdBonus}] ➔ ${u.org}/${u.maxOrg} Org).`);
        }

        u.rallyRoundsLeft--;

        // Rally Check when countdown reaches 0
        if (u.rallyRoundsLeft <= 0) {
          const d20 = H.rollDie(20);

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

          u.rallyRoundsResting = (u.rallyRoundsResting || 0) + 1;
          const determinationBonus = Math.min(6, u.rallyRoundsResting);

          const totalRallyScore = d20 + expBonus + cmdBonus + frontlineMod + persMod + supMod + armorMod + determinationBonus;
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
            u.pos = H.getUnitStartingPosition(u);

            const rawD10 = H.rollDie(10);
            const strengthBonus = manpowerRatio >= 0.75 ? 5 : 0;
            u.org = H.clamp(u.org + rawD10 + strengthBonus + extraOrgBonus, 10, u.maxOrg);

            u.name = u.name.includes('(Rallied)') ? u.name : `${u.name} (Rallied)`;

            if (u.originalMaxArmor > 0 && !u.isDismounted && u.armor > 0) {
              H.addLog('rolls', `🚩 [Rallied to the Line] ${u.name} PASSED Rally Check (${breakdownStr} vs DC ${rallyDC})! Intact column returned with ${u.personnel} personnel, ${u.armor} active vehicles, Org: ${u.org}/${u.maxOrg}.`);
            } else {
              u.category = 'infantry';
              u.armorTier = 'unarmored';
              u.armor = 0;
              u.maxArmor = 0;
              u.isDismounted = true;
              u.hardAttack = 6;
              u.piercing = 5;
              u.hardness = 2;
              H.addLog('rolls', `🚩 [Rallied to the Line] ${u.name} PASSED Rally Check (${breakdownStr} vs DC ${rallyDC})! Reformed as infantry with ${u.personnel} personnel, Org: ${u.org}/${u.maxOrg}.`);
            }
          } else {
            if (manpowerRatio >= 0.60 && !isCriticalFumble) {
              u.rallyRoundsLeft = 1;
              H.addLog('support', `⏳ [Rally Delayed] ${u.name} failed rally check (${breakdownStr} vs DC ${rallyDC}), but retaining ${Math.round(manpowerRatio * 100)}% manpower prevents collapse! NCOs re-form ranks (+1 round delay).`);
            } else {
              u.isRallying = false;
              u.defeated = true;
              u.defeatReason = isCriticalFumble
                ? 'Rally shattered by panic (Critical 1)'
                : `Decimated formation failed to rally (${totalRallyScore} vs DC ${rallyDC})`;

              H.addLog('damage', `💀 [Rally Failed] ${u.name} FAILED Rally Check (${breakdownStr} vs DC ${rallyDC}${isCriticalFumble ? ' [CRIT 1]' : ''})! Depleted force dissolved into panic and deserted.`);
            }
          }
        }
      }
    }

    // 2. Frontline Attrition & Consumption
    const enemyActiveCount = enemyState.units.filter(isUnitActive).length;
    const isUncontestedFrontline = (enemyActiveCount === 0);

    let sideRollD3 = 0;
    if (isUncontestedFrontline) {
      H.addLog('support', `⏳ [Uncontested Frontline] Side ${side} holds the field with no active opposing forces. Supply drain and attrition are paused.`);
    } else {
      sideRollD3 = H.rollDie(3);
      H.addLog('support', `📦 [Side ${side} Supply] Base operational drain d3 = ${sideRollD3} | Depot Stockpile: ${sideState.supplyDepot}/${sideState.maxSupplyDepot}`);
    }

    // 3. Frontline Unit Loop
    for (const u of sideState.units.filter(isUnitActive)) {
      const unitTraits = u.traits.map(getTraitById).filter(Boolean);
      const expObj = D.EXPERIENCE_TIERS[u.experience] || D.EXPERIENCE_TIERS.Regular;

      if (!u.isMonster && !u.isZombie) {
        if (!isUncontestedFrontline) {
          let drain = sideRollD3 + (terr.supplyDrain || 0) + (feat.supplyAdd || 0) + (weath.supplyAdd || 0) + (chosenTactic.supplyAdd || 0);
          if (chosenTactic.id === 'urb_atk_armour_supported' && u.maxArmor > 0) drain += 1;
          if (cmd && cmd.traits.includes('logistics_wizard')) drain = Math.max(1, drain - 1);

          if (cmd) {
            const cmdTraits = (cmd.traits || []).map(getCommanderTraitById).filter(Boolean);
            const supplyCut = cmdTraits.reduce((s, t) => s + (t.supplyDrainReduction || 0), 0);
            drain = Math.max(0, drain - supplyCut);
          }

          const potentialRegen = unitTraits.reduce((acc, t) => acc + (t.supplyRegen || 0), 0);
          let actualRegenDrawn = 0;

          if (potentialRegen > 0) {
            if (sideState.supplyDepot > 0) {
              actualRegenDrawn = Math.min(sideState.supplyDepot, potentialRegen);
              sideState.supplyDepot = Math.max(0, sideState.supplyDepot - actualRegenDrawn);
            } else {
              H.addLog('support', `⚠ [Depot Empty] ${u.name} has logistics traits (+${potentialRegen}), but Side ${side}'s Depot is empty! Regeneration failed.`);
            }
          }

          const netDrain = Math.max(0, drain - actualRegenDrawn);
          u.supply = H.clamp(u.supply - netDrain, 0, u.maxSupply);

          const supRatio = u.supply / Math.max(1, u.maxSupply);
          if (u.supply <= 0) {
            const contOrgDmg = 2 + H.rollDie(4);
            u.org = Math.max(0, u.org - contOrgDmg);
            H.addLog('support', `⚠ [${u.name}] 0% Supply! (-50% stats malus & -${contOrgDmg} continuous Org damage)`);
          } else if (supRatio < 0.20) {
            if (!u.supplyBelow20Triggered) {
              u.supplyBelow20Triggered = true;
              const oneTime = 3 + H.rollDie(10);
              u.org = Math.max(0, u.org - oneTime);
              H.addLog('support', `⚠ [${u.name}] Supply dropped below 20%! One-time -(3+d10)=-${oneTime} Org damage & -20% malus!`);
            }
            const cont = 1 + H.rollDie(3);
            u.org = Math.max(0, u.org - cont);
            H.addLog('support', `⚠ [${u.name}] Critical Supply (<20%): suffers -(1+d3)=-${cont} continuous Org damage.`);
          } else if (supRatio < 0.50) {
            if (!u.supplyBelow50Triggered) {
              u.supplyBelow50Triggered = true;
              const oneTime = 2 + H.rollDie(6);
              u.org = Math.max(0, u.org - oneTime);
              H.addLog('support', `⚠ [${u.name}] Supply dropped below 50%! One-time -(2+d6)=-${oneTime} Org damage & -10% malus!`);
            }
          }
        }

        // Entrenchment Buildup
        const isDefendingSide = (ID.state.battle.attackerSide !== side);
        const maxCap = H.getUnitMaxEntrenchmentCap(u);

        if (isDefendingSide && !u.roundTemp.attackedThisRound) {
          const gain = u.traits.includes('engineering_support') ? 2 : 1;
          const oldLvl = u.entrenchmentLevel || 0;
          u.entrenchmentLevel = H.clamp(oldLvl + gain, 0, maxCap);
          if (u.entrenchmentLevel > oldLvl) {
            H.addLog('support', `⛏ [Entrenching] ${u.name} digs in deeper (Entrenchment Lvl ${u.entrenchmentLevel}/${maxCap}).`);
          }
        }

        // Org Recovery
        let orgDelta = expObj.orgRegen || 0;
        orgDelta += unitTraits.reduce((acc, t) => acc + (t.orgRegen || 0), 0);

        if (cmd) {
          if (cmd.traits.includes('organizer')) orgDelta += 1;
          const cmdTraits = (cmd.traits || []).map(getCommanderTraitById).filter(Boolean);
          orgDelta += cmdTraits.filter(t => traitAppliesToUnit(t, u)).reduce((s, t) => s + (t.orgRegen || 0), 0);
        }

        const manpowerRatio = u.personnel / Math.max(1, u.maxPersonnel);
        if (manpowerRatio >= 0.75) orgDelta += 1;

        let fatigueLoss = 0;
        if (!isUncontestedFrontline) {
          if (ID.state.battle.round > 12) fatigueLoss = 2;
          else if (ID.state.battle.round > 5) fatigueLoss = 1;
        }

        const netOrgChange = isUncontestedFrontline ? Math.max(0, orgDelta) : (orgDelta - fatigueLoss);

        if (netOrgChange !== 0) {
          u.org = H.clamp(u.org + netOrgChange, 0, u.maxOrg);
          if (netOrgChange > 0) {
            H.addLog('support', `💚 [${u.name}] Net Organization +${netOrgChange} (Regen +${orgDelta}${isUncontestedFrontline ? ', Frontline Rest' : `, Fatigue -${fatigueLoss}`} ➔ ${u.org}/${u.maxOrg}).`);
          } else {
            H.addLog('support', `🔻 [${u.name}] Net Organization ${netOrgChange} (Regen +${orgDelta}, Combat Fatigue -${fatigueLoss} ➔ ${u.org}/${u.maxOrg}).`);
          }
        }
      }

      // Support Cooldowns
      for (const k of Object.keys(u.supportCooldowns)) {
        if (u.supportCooldowns[k] > 0) u.supportCooldowns[k]--;
      }

      // Unbreakable Stand
      const hasUnbreakable = unitTraits.some(t => t.isUnbreakable);
      if (hasUnbreakable) {
        if (u.org > 0) {
          u.unbreakableRoundsLeft = null;
        } else if (u.unbreakableRoundsLeft !== null) {
          if (u.unbreakableRoundsLeft > 0) {
            H.addLog('damage', `⏳ [Unbreakable Stand] ${u.name} is at 0 Org! (${u.unbreakableRoundsLeft} round${u.unbreakableRoundsLeft === 1 ? '' : 's'} remaining before collapse).`);
            u.unbreakableRoundsLeft--;
          } else {
            u.unbreakableRoundsLeft = null;
            H.addLog('damage', `💀 [Unbreakable Shattered] ${u.name}'s 2-round last stand has expired! Cohesion collapses completely!`);
            if (!u.ralliedOnce && u.personnel > 20) {
              triggerUnitRally(u, 'Unbreakable last stand expired');
            } else {
              u.defeated = true;
              u.defeatReason = 'Unbreakable stand collapsed';
            }
          }
        }
      }

      // Field Medic Regeneration
      if (unitTraits.some(t => t.isFieldMedic) && u.wounded > 0) {
        const healed = Math.min(u.wounded, H.rollDie(3));
        u.wounded -= healed;
        u.personnel = Math.min(u.maxPersonnel, u.personnel + healed);
        if (healed > 0) {
          H.addLog('support', `➕ [Field Medic] ${u.name} heals ${healed} wounded back to active duty (${u.personnel} active).`);
        }
      }

      // Died of Wounds (DOW)
      if (ID.state.battle.round >= 4 && u.wounded > 0 && !u.isMonster && !u.isZombie) {
        const supRatio = u.supply / Math.max(1, u.maxSupply);
        let dowRate = 0;

        if (supRatio < 0.20) dowRate += 5;
        else if (supRatio < 0.50) dowRate += 2;
        if (u.supply <= 0) dowRate += 5;

        if (ID.state.environment.weather === 'Snowy') dowRate += 2;
        if (ID.state.environment.weather === 'HeatWaves' || ID.state.environment.terrain === 'Marsh') dowRate += 1;

        if (u.traits.includes('first_aid_kit')) dowRate -= 4;
        if (u.traits.includes('field_medic')) dowRate -= 3;

        const finalRate = H.clamp(dowRate, 0, 15);

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
            H.addLog('damage', `🏥 [Died of Wounds] ${u.name}: ${dowCasualties} wounded succumbed to injuries (WIA ➔ KIA, Rate: ${finalRate}%).`);
          }
        }
      }

      // Field Repair Crew
      if (ID.state.battle.round % 3 === 0 && unitTraits.some(t => t.isRepairCrew) && u.recoverableArmor > 0) {
        const hasSupplyToRepair = u.isMonster || u.isZombie || (u.supply >= u.maxSupply * 0.30);
        if (hasSupplyToRepair) {
          const hasSimpleEng = unitTraits.some(t => t.id === 'simple_engineering');
          const repCostReduction = hasSimpleEng ? 1 : 0;
          const extraRepairBonus = hasSimpleEng ? 1 : 0;

          const repDie = expObj.repairDie || 3;
          const fieldCap = Math.max(1, Math.ceil(u.recoverableArmor * 0.5));
          const repaired = Math.min(fieldCap, H.rollDie(repDie) + extraRepairBonus);

          if (repaired > 0) {
            const baseCost = 1 + H.rollDie(2);
            const repSupCost = Math.max(0, baseCost - repCostReduction);
            if (!u.isMonster && !u.isZombie) {
              u.supply = Math.max(0, u.supply - repSupCost);
            }
            u.recoverableArmor -= repaired;
            u.armor = Math.min(u.maxArmor, u.armor + repaired);
            H.addLog('armor', `🔧 [Field Repair Crew] ${u.name} (${u.experience}, d${repDie}${extraRepairBonus ? '+1 SimpleEng' : ''}, Cost ${repSupCost} Sup) restores ${repaired} armor in-field (${u.armor} active, ${u.recoverableArmor} awaiting post-battle recovery).`);
          }
        }
      }

      checkAndMarkUnitDefeat(u);
    }
  }

  function calculateSideDepotCapacity(side) {
    const sideState = side === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
    const cmd = getSideCommander(side);
    const units = sideState.units || [];

    const basePool = 100 + units.reduce((s, u) => s + Math.round((u.maxSupply || 40) * 0.5), 0);
    const logLevel = cmd ? (cmd.logisticsLevel || 0) : 0;
    const logMult = 1 + (logLevel * 0.10);

    let traitMult = 1.0;
    if (cmd && cmd.traits && cmd.traits.includes('logistics_wizard')) {
      traitMult += 0.25;
    }

    return Math.round(basePool * logMult * traitMult);
  }

  // --------------------------------------------------------------------------
  // 7. Recon / Vigilance Comparison
  // --------------------------------------------------------------------------

  function getSideVigilanceModifier(side, tactic, enemyTactic, isAttacker) {
    const sideState = side === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
    const units = sideState.units.filter(isUnitActive);
    const cmd = getSideCommander(side);
    const terr = ID.state.terrains[ID.state.environment.terrain] || D.DEFAULT_TERRAINS.Plains;
    const feat = D.TERRAIN_FEATURES[ID.state.environment.feature] || D.TERRAIN_FEATURES.Normal;
    const weath = D.WEATHER_TYPES[ID.state.environment.weather] || D.WEATHER_TYPES.Sunny;

    let mod = (terr.vigMod || 0) + (feat.vigAdd || 0) + (weath.vigMod || 0) + (tactic.vigMod || 0) + (sideState.nextRoundVigMod || 0);
    sideState.nextRoundVigMod = 0;

    if (cmd && cmd.traits.includes('skilled_staff')) mod += 15;

    if (units.length > 0) {
      const traitVigSum = units.reduce((sum, u) => {
        return sum + u.traits.map(getTraitById).filter(Boolean).reduce((s, t) => s + (t.vigilance || 0), 0);
      }, 0);
      mod += Math.round(traitVigSum / units.length);
    }

    const tName = ID.state.environment.terrain;
    if (tactic.id === 'atk_infiltration' && ['Forest', 'Urban', 'Hills', 'Mountain'].includes(tName)) mod += 10;
    if (tactic.id === 'def_ambush' && ['Forest', 'Jungle', 'Mountain', 'Urban'].includes(tName)) mod += 10;
    if ((tactic.id === 'def_ambush' || tactic.id === 'urb_def_ambush') && units.some(u => u.traits.includes('concealment_specialist'))) mod += 10;
    if (tactic.id === 'atk_encirclement' && units.length === 1) mod -= 10;
    if (tactic.id === 'urb_atk_street_fighting' && feat.fortified) mod -= 10;
    if (tactic.id === 'urb_def_fortified' && (enemyTactic.id === 'atk_infiltration' || enemyTactic.id === 'urb_atk_mouse_holing')) mod -= 10;

    return mod;
  }

  function performVigilanceComparison(atkSide, defSide, atkTactic, defTactic) {
    const atkRoll = H.rollDie(100);
    const defRoll = H.rollDie(100);
    const atkMod = getSideVigilanceModifier(atkSide, atkTactic, defTactic, true);
    const defMod = getSideVigilanceModifier(defSide, defTactic, atkTactic, false);

    const atkTotal = atkRoll + atkMod;
    const defTotal = defRoll + defMod;
    const diff = Math.abs(atkTotal - defTotal);
    const statBoost = Math.floor(diff / 10);
    const attackerWonVig = atkTotal >= defTotal;

    H.addLog(
      'rolls',
      `🔭 [Vigilance/Recon Roll] Side ${atkSide}: d100(${atkRoll}) + ${atkMod} = ${atkTotal} vs Side ${defSide}: d100(${defRoll}) + ${defMod} = ${defTotal} ➔ ` +
      `Side ${attackerWonVig ? atkSide : defSide} wins by ${diff} (+${statBoost} flat Stat Boost!)`
    );

    if (!attackerWonVig && defTactic.id === 'urb_def_ambush' && diff >= 15) {
      const atkState = atkSide === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
      atkState.nextRoundVigMod -= 10;
      H.addLog('rolls', `🎯 [Urban Ambush] Side ${defSide} won Vigilance by >=15! Side ${atkSide} suffers -10 Vigilance next round.`);
    }

    return { atkTotal, defTotal, diff, statBoost, attackerWonVig };
  }

  // --------------------------------------------------------------------------
  // 8. Support Fire & Anti-Air Defense
  // --------------------------------------------------------------------------

  function processSideSupportFire(firingSide, enemySide) {
    const firingState = firingSide === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
    const enemyState = enemySide === 'A' ? ID.state.battle.sideB : ID.state.battle.sideA;

    if (firingState.chosenTacticId === 'urb_atk_barrage' && firingState.barrageCooldown === 0) {
      const leadUnit = firingState.units.find(u => isUnitActive(u) && (u.isMonster || u.isZombie || u.supply >= u.maxSupply * 0.5));
      if (leadUnit) {
        const supCost = 2 + H.rollDie(3);
        if (!leadUnit.isMonster && !leadUnit.isZombie) {
          leadUnit.supply = Math.max(0, leadUnit.supply - supCost);
        }
        firingState.barrageCooldown = 2;
        const defRed = 2 + H.rollDie(6);
        enemyState.units.filter(isUnitActive).forEach(eu => {
          eu.roundTemp.defMalus += defRed;
        });
        H.addLog('support', `💥 [Street-by-Street Barrage] Side ${firingSide} expends ${supCost} supply: Enemy Defense reduced by -(2+d6)=-${defRed}!`);
      }
    }

    for (const u of firingState.units.filter(isUnitActive)) {
      if (!u.isMonster && !u.isZombie && u.supply < u.maxSupply * 0.5) continue;

      const enemyUnits = enemyState.units.filter(isUnitActive);
      if (enemyUnits.length === 0) break;
      const target = enemyUnits[Math.floor(Math.random() * enemyUnits.length)];

      // Mortar Support
      if (u.traits.includes('mortar_support') && u.supportCooldowns.mortar <= 0) {
        const cost = 1 + H.rollDie(2);
        if (!u.isMonster && !u.isZombie) u.supply = Math.max(0, u.supply - cost);
        u.supportCooldowns.mortar = 2;

        const isTargetArmored = (target.maxArmor > 0 && target.armorTier !== 'unarmored');

        if (!isTargetArmored) {
          const defRed = 3 + H.rollDie(6);
          target.roundTemp.defMalus += defRed;
          target.roundTemp.coverDenied = true;
          const cas = 1 + H.rollDie(4);
          applySupportCasualtiesAndArmor(target, cas, 0, 'Mortar Fragmentation');

          let orgShock = 0;
          if (!target.isMonster && !target.isZombie) {
            orgShock = H.rollDie(3);
            target.org = Math.max(0, target.org - orgShock);
          }
          H.addLog('support', `💣 [Mortar Plunging Fire] ${u.name} ➔ ${target.name} (Infantry): Def -${defRed}, Entrenchment DENIED, ${cas} casualties, -${orgShock} Org suppression shock!`);
        } else {
          const defRed = 1 + H.rollDie(3);
          target.roundTemp.defMalus += defRed;

          const d6 = H.rollDie(6);
          if (d6 <= 4) {
            H.addLog('support', `💣 [Mortar Shells on Armor] ${u.name} ➔ ${target.name}: Shrapnel bounces off armor plate. 0 Hardness reduction. Def -${defRed} (Buttoned up).`);
          } else if (d6 === 5) {
            target.roundTemp.defMalus += 5;
            const targetSideState = enemySide === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
            targetSideState.nextRoundVigMod -= 15;
            H.addLog('support', `🎯 [Mortar Optics Hit!] ${u.name} ➔ ${target.name}: Periscopes shattered! Def -${defRed + 5}, -15 Vigilance next round.`);
          } else if (d6 === 6) {
            processArmorLossAndCrewCasualties(target, 1, 'Mortar Track Hit', 'Mortar Mobility Hit');
            target.mobilityClassPenalty = (target.mobilityClassPenalty || 0) + 2;
            H.addLog('armor', `💥 [MORTAR TRACK BLOWN!] ${u.name} lands direct shell on ${target.name}'s suspension! 1 vehicle immobilized, -2 Mobility Class!`);
          }
        }
      }

      // Inherent or Attached Artillery Barrage
      const canFireArtillery = (u.category === 'artillery' || u.traits.includes('heavy_artillery_support'));

      if (canFireArtillery && u.supportCooldowns.heavy_artillery <= 0) {
        const cost = 3 + H.rollDie(3);
        if (!u.isMonster && !u.isZombie) u.supply = Math.max(0, u.supply - cost);
        u.supportCooldowns.heavy_artillery = 1 + H.rollDie(2);

        const d12 = H.rollDie(12);
        const defRed = 4 + d12;
        const hardRed = 2 + H.rollDie(6);
        const baseArmDis = target.maxArmor > 0 ? H.rollDie(2) : 0;
        target.roundTemp.defMalus += defRed;
        target.roundTemp.hardMalus += hardRed;

        let cas = 0;
        let armDis = baseArmDis;
        if (d12 >= 8 && d12 <= 10) {
          cas = H.rollDie(6);
        } else if (d12 >= 11) {
          cas = 2 + H.rollDie(12);
          if (target.maxArmor > 0) armDis += 1 + H.rollDie(3);
        }
        if (cas > 0 || armDis > 0) {
          applySupportCasualtiesAndArmor(target, cas, armDis, 'Heavy Artillery Barrage');
        }

        const fireSourceLabel = u.category === 'artillery' ? 'Inherent Battery Barrage' : 'Off-Map Artillery Support';
        H.addLog('support', `🎆 [${fireSourceLabel}] ${u.name} ➔ ${target.name} (Roll d12=${d12}, Cost ${cost} Sup, CD ${u.supportCooldowns.heavy_artillery}): Def -${defRed}, Hardness -${hardRed}, Cas: ${cas}, Armor Dis: ${armDis}`);
      }

      // Air Support & AA Interception
      if (u.traits.includes('air_support') && u.supportCooldowns.air_support <= 0 && !firingState.airstrikeDisabled) {
        const cost = 5 + H.rollDie(4);
        if (!u.isMonster && !u.isZombie) u.supply = Math.max(0, u.supply - cost);
        u.supportCooldowns.air_support = 2 + H.rollDie(2);

        let aaReduction = 0;
        let shotDownAll = false;
        for (const eu of enemyUnits) {
          if (eu.traits.includes('aa_defense')) {
            const red = 4 + H.rollDie(6);
            aaReduction += red;
            firingState.nextRoundVigMod -= 10;
            H.addLog('support', `🛡 [AA Defense] ${eu.name} reduces airstrike by 4+d6 = ${red} and forces recon planes high (-10 Enemy Vigilance next round)!`);
          }
          if (eu.traits.includes('aa_gun')) {
            const d8 = H.rollDie(8);
            const red = 4 + d8;
            aaReduction += red;
            if (d8 >= 5 && d8 <= 7) {
              const extraCd = H.rollDie(2);
              u.supportCooldowns.air_support += extraCd;
              H.addLog('support', `🎯 [AA Gun] ${eu.name} rolled ${d8} on d8 (-${red} dmg) and adds +${extraCd} cooldown to enemy Air Support!`);
            } else if (d8 === 8) {
              shotDownAll = true;
              firingState.airstrikeDisabled = true;
              H.addLog('support', `💥 [AA Gun CRITICAL 8!] ${eu.name} shot down the majority of Side ${firingSide}'s strike aircraft! Air Support banned for rest of battle!`);
            } else {
              H.addLog('support', `🎯 [AA Gun] ${eu.name} reduces airstrike by 4+d8 = ${red}.`);
            }
          }
        }

        if (!shotDownAll) {
          const d20 = H.rollDie(20);
          const rawDefRed = 6 + d20;
          const rawHardRed = 4 + H.rollDie(10);
          const defRed = Math.max(0, rawDefRed - aaReduction);
          const hardRed = Math.max(0, rawHardRed - Math.floor(aaReduction / 2));
          target.roundTemp.defMalus += defRed;
          target.roundTemp.hardMalus += hardRed;

          let cas = 0;
          let armDis = 0;
          if (d20 >= 10 && d20 <= 14) {
            cas = H.rollDie(6);
            if (target.maxArmor > 0) armDis = H.rollDie(2);
          } else if (d20 >= 15 && d20 <= 18) {
            cas = 2 + H.rollDie(12);
            if (target.maxArmor > 0) armDis = 1 + H.rollDie(3);
          } else if (d20 >= 19) {
            cas = 6 + H.rollDie(20);
            if (target.maxArmor > 0) armDis = 2 + H.rollDie(5);
          }
          cas = Math.max(0, cas - aaReduction);
          if (cas > 0 || armDis > 0) {
            applySupportCasualtiesAndArmor(target, cas, armDis, 'Airstrike');
          }
          H.addLog('support', `✈ [Air Support] ${u.name} ➔ ${target.name} (Roll d20=${d20}, AA Red: -${aaReduction}): Def -${defRed}, Hardness -${hardRed}, Cas: ${cas}, Armor Dis: ${armDis}`);
        }
      }
    }
  }

  function processArmorLossAndCrewCasualties(target, disabledRoll, bracketDesc, sourceLabel) {
    if (disabledRoll <= 0 || target.maxArmor <= 0 || target.armor <= 0) return;
    const actualDisabled = Math.min(target.armor, disabledRoll);
    target.armor -= actualDisabled;

    const opMods = H.getTerrainOperationalMods(target.category);
    const armorRecBonus = getUnitArmorRecoveryBonus(target) + opMods.vehicleRecMod;
    const rawD50 = H.rollDie(50);
    const recRoll = 50 + rawD50;
    const totalRecPct = H.clamp(recRoll + armorRecBonus, 5, 95);
    const recVehicles = Math.round(actualDisabled * (totalRecPct / 100));
    const unrecVehicles = actualDisabled - recVehicles;

    target.recoverableArmor += recVehicles;
    target.unrecoverableArmor += unrecVehicles;

    let crewDowned = 0;
    for (let i = 0; i < unrecVehicles; i++) crewDowned += (1 + H.rollDie(4));
    for (let i = 0; i < recVehicles; i++) crewDowned += H.rollDie(2);

    let vehOrgShock = 0;
    if (!target.isMonster && !target.isZombie) {
      const singleVehRatio = actualDisabled / Math.max(1, target.maxArmor);
      if (singleVehRatio >= 0.20) vehOrgShock += (2 + H.rollDie(8));
      else if (singleVehRatio >= 0.10) vehOrgShock += (1 + H.rollDie(6));
      else vehOrgShock += H.rollDie(3);

      const totalVehLostRatio = (target.maxArmor - target.armor) / Math.max(1, target.maxArmor);
      const newArmorTenths = Math.floor((totalVehLostRatio + 0.0001) * 10);
      while ((target.cumArmorLostTenths || 0) < newArmorTenths) {
        target.cumArmorLostTenths = (target.cumArmorLostTenths || 0) + 1;
        vehOrgShock += (1 + H.rollDie(4));
      }
      target.org = Math.max(0, target.org - vehOrgShock);
    }

    H.addLog(
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
  // 9. Targeting Hierarchy & Frontliner Screening
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
        backline.sort((a, b) => getUnitTargetValue(b, attacker, atkTactic) - getUnitTargetValue(a, attacker, atkTactic));
        const picked = backline[0];
        H.addLog('rolls', `🥷 [Bypass Success] ${attacker.name} bypasses frontline screening to strike high-value ${picked.name} (TV ${getUnitTargetValue(picked, attacker, atkTactic)})!`);
        return picked;
      }
    }

    // Anti-Unit Trait Priority
    const antiTraits = attacker.traits.map(getTraitById).filter(t => t && t.antiCategory);
    if (antiTraits.length > 0) {
      const desiredCat = antiTraits[0].antiCategory;
      const desiredTargets = defenders.filter(d => d.category === desiredCat);
      if (desiredTargets.length > 0) {
        desiredTargets.sort((a, b) => getUnitTargetValue(b, attacker, atkTactic) - getUnitTargetValue(a, attacker, atkTactic));
        const desiredUnit = desiredTargets[0];

        if (activeFrontliners.length > 0 && !activeFrontliners.includes(desiredUnit)) {
          activeFrontliners.sort((a, b) => getUnitTargetValue(b, attacker, atkTactic) - getUnitTargetValue(a, attacker, atkTactic));
          const bestFrontliner = activeFrontliners[0];
          if (getUnitTargetValue(bestFrontliner, attacker, atkTactic) > getUnitTargetValue(desiredUnit, attacker, atkTactic)) {
            H.addLog('rolls', `🛡 [Frontliner Intercept] ${bestFrontliner.name} (TV ${getUnitTargetValue(bestFrontliner, attacker, atkTactic)}) intercepts Anti-Unit attack aimed at ${desiredUnit.name}!`);
            return bestFrontliner;
          } else {
            if (Math.random() < 0.6) {
              H.addLog('rolls', `🎯 [Anti-Unit Priority] ${attacker.name} bypasses screening to strike high-threat ${desiredUnit.name}!`);
              return desiredUnit;
            } else {
              H.addLog('rolls', `🛡 [Frontliner Intercept] ${bestFrontliner.name} blocks ${attacker.name} from reaching ${desiredUnit.name}!`);
              return bestFrontliner;
            }
          }
        }
        return desiredUnit;
      }
    }

    if (!attackerWonVig) {
      if (activeFrontliners.length > 0) {
        activeFrontliners.sort((a, b) => getUnitTargetValue(b, attacker, atkTactic) - getUnitTargetValue(a, attacker, atkTactic));
        return activeFrontliners[0];
      }
      const randTarget = defenders[Math.floor(Math.random() * defenders.length)];
      H.addLog('rolls', `🎲 [Failed Vigilance] ${attacker.name} acquires targets blindly, firing at ${randTarget.name}.`);
      return randTarget;
    }

    if (activeFrontliners.length > 0) {
      activeFrontliners.sort((a, b) => getUnitTargetValue(b, attacker, atkTactic) - getUnitTargetValue(a, attacker, atkTactic));
      return activeFrontliners[0];
    }

    const sorted = [...defenders].sort((a, b) => getUnitTargetValue(b, attacker, atkTactic) - getUnitTargetValue(a, attacker, atkTactic));

    if (atkTactic.id === 'atk_blitz') {
      const lowOrgTargets = [...defenders].sort((a, b) => a.org - b.org);
      return lowOrgTargets[0];
    }

    return sorted[0];
  }

  // --------------------------------------------------------------------------
  // 10. Main Combat Engagement & Resolution
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
      const d20 = H.rollDie(20);
      let coverRating = defender.roundTemp.coverDenied ? 0 : H.getTerrainCoverRating(defender);
      if (defTactic.id === 'urb_def_fortified') coverRating += 5;
      else if (defTactic.id === 'def_defend') coverRating += 3;

      if (!defender.roundTemp.coverDenied) {
        coverRating += (defender.entrenchmentLevel || 0);
      }

      const targetDC = 12 + (vigResult.attackerWonVig ? 2 : 0) + (attacker.traits.includes('recon_support') ? 2 : 0);
      const totalCoverSave = d20 + coverRating;
      const inCover = totalCoverSave >= targetDC;
      defender.roundTemp.inCover = inCover;

      H.addLog(
        'rolls',
        `🕳️ [Cover & Dispersion] ${defender.name} makes Cover Save: d20(${d20}) + Cover(${coverRating}) = ${totalCoverSave} vs DC ${targetDC} ➔ ` +
        (inCover ? `DUG-IN / IN DEFILADE (Half soft damage, explosive negated)` : `CAUGHT IN OPEN (Exposed to full fire & suppression shock!)`)
      );
    } else {
      const atkPierceDie = H.rollDie(6);
      const defHardDie = H.rollDie(6);

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

      H.addLog(
        'armor',
        `🔩 [Piercing Check] ${attacker.name} (d6[${atkPierceDie}]+${effPiercing}=${totalPierceRoll}) vs ${defender.name} Eff.Hardness (d6[${defHardDie}]+${effHardness}=${totalHardnessRoll}) ➔ ` +
        (pierced ? `PIERCED! (Diff: +${totalPierceRoll - totalHardnessRoll})` : `ARMOR HELD (Unpierced — Soft/Close-Assault Chip Active)`)
      );
    }

    // STEP B: Armored Vehicle Knockout Resolution
    if (pierced && defender.maxArmor > 0 && defender.armor > 0) {
      const diff = totalPierceRoll - totalHardnessRoll;
      const h = Math.max(1, effHardness);
      const ratio = diff / h;
      let disabledRoll = 0;
      let bracketDesc = '';

      if (ratio <= 0.25) {
        disabledRoll = H.rollDie(3);
        bracketDesc = '<= 1/4 Hardness (d3)';
      } else if (ratio <= 0.50) {
        disabledRoll = 1 + H.rollDie(6);
        bracketDesc = '1/4 to 2/4 Hardness (1+d6)';
      } else if (ratio <= 0.75) {
        disabledRoll = 3 + H.rollDie(8);
        bracketDesc = '2/4 to 3/4 Hardness (3+d8)';
      } else {
        disabledRoll = 6 + H.rollDie(12);
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
    const atkDieRoll = H.rollDie(atkDieSides);
    const vigBoostAtk = vigResult.attackerWonVig ? vigResult.statBoost : 0;

    const atkTotals = computeUnitTotalStat(
      attacker, defender, atkSide, defSide, 'attack',
      combinedBaseAtk, atkDieRoll, vigBoostAtk, atkTactic, defTactic, false
    );

    // STEP E: Roll Defense Die
    const defDieSides = getCombatDieSides(defender, 'defense');
    const defDieRoll = H.rollDie(defDieSides);
    const vigBoostDef = !vigResult.attackerWonVig ? vigResult.statBoost : 0;
    const baseDef = Math.max(0, defender.defense - defender.roundTemp.defMalus - traitDefMalus);

    const defTotals = computeUnitTotalStat(
      defender, attacker, defSide, atkSide, 'defense',
      baseDef, defDieRoll, vigBoostDef, defTactic, atkTactic, false
    );

    H.addLog(
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
          orgGain += H.rollDie(2);
          H.addLog('damage', `🔥 [Decisive Breakthrough] ${attacker.name} gains +${orgGain} Org for smashing ${defender.name}!`);
        }
        if (orgGain > 0) attacker.org = Math.min(attacker.maxOrg, attacker.org + orgGain);
      }

      const hasRaiders = atkTraits.some(t => t.id === 'supply_raiders');
      const stealTrait = atkTraits.find(t => t.supplySteal > 0);

      if (hasRaiders || stealTrait || atkTactic.id === 'def_guerrilla') {
        const rollAmount = hasRaiders ? (2 + H.rollDie(4)) : (1 + H.rollDie(3));
        const stolen = Math.min(defender.supply, rollAmount);

        if (stolen > 0 && !defender.isMonster && !defender.isZombie) {
          const wasBelow50 = (defender.supply / Math.max(1, defender.maxSupply)) < 0.50;
          defender.supply -= stolen;
          attacker.supply = Math.min(attacker.maxSupply, attacker.supply + stolen);
          H.addLog('support', `🏴 [Supply Stolen] ${attacker.name} steals ${stolen} Supply from ${defender.name}!`);

          if (hasRaiders && wasBelow50) {
            const depotShock = H.rollDie(4);
            defender.org = Math.max(0, defender.org - depotShock);
            H.addLog('damage', `⚡ [Supply Depot Sabotaged] ${defender.name} was below 50% supply! Supply Raiders inflict -${depotShock} Org shock on ammo depots!`);
          }
        }
      }

      const defSideState = defSide === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
      if (atkTactic.enemyNextVigMalus) defSideState.nextRoundVigMod -= atkTactic.enemyNextVigMalus;
      if (atkTactic.id === 'atk_unexpected_thrust' && ID.state.battle.round === 1) defSideState.nextRoundVigMod -= 10;
      if (atkTactic.id === 'urb_atk_barrage') {
        defSideState.nextRoundVigMod -= 10;
        const bRoll = H.rollDie(6);
        if (bRoll >= 5) {
          const extraCas = H.rollDie(6);
          applyPersonnelCasualties(defender, extraCas, false, true, 'Street-by-Street Barrage');
        }
      }
    } else {
      const grazeResult = H.calculateGrazingCasualties(attacker, defender, atkTotals.finalValue, defTotals.finalValue, pierced, false);

      if (grazeResult.immune) {
        H.addLog('rolls', `🛡 [COMPLETELY IMMUNE] ${defender.name} holds the line (${defTotals.finalValue} vs ${atkTotals.finalValue}): ${grazeResult.reason} (0 casualties)!`);
      } else {
        H.addLog('damage', `🛡 [Grazing Fire] ${defender.name} repels breakthrough (${defTotals.finalValue} vs ${atkTotals.finalValue}), but suffers ${grazeResult.casualties} grazing casualties (${grazeResult.reason})!`);
        applyPersonnelCasualties(defender, grazeResult.casualties, false, false, 'Grazing Fire', atkTactic, defTactic);
      }

      if (defTactic.id === 'def_delay') {
        const atkSideState = atkSide === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
        atkSideState.nextRoundAtkMod = -10;
        H.addLog('rolls', `⏳ [Delay Tactic] Successful defense imposes -10% Attack on Side ${atkSide} next round.`);
      }
    }

    if (!isUnitActive(defender) || !isUnitActive(attacker)) return;

    // STEP G: Return Fire Phase
    const engagementTotalDist = H.getTotalDistance(attacker, defender);
    const defMaxRange = H.getUnitEngagementRange(defender);
    const canDefenderReachAttacker = H.canUnitEngageTarget(defender, attacker, defTactic);

    if (!canDefenderReachAttacker) {
      H.addLog('rolls', `🎯 [Out of Return-Fire Range] ${defender.name} (Max Range ≤${defMaxRange}) cannot return fire against ${attacker.name} firing from Total Distance ${engagementTotalDist}!`);
      return;
    }

    let retDefVig = H.rollDie(100) + getSideVigilanceModifier(defSide, defTactic, atkTactic, false);
    const retAtkVig = H.rollDie(100) + getSideVigilanceModifier(atkSide, atkTactic, defTactic, true);

    if (attacker.traits.includes('melee_attack') && engagementTotalDist <= 1) {
      retDefVig -= 20;
      H.addLog('rolls', `🗡 [Point-Blank Melee Disruption] ${attacker.name}'s close-quarters assault at Total Distance ${engagementTotalDist} disrupts ${defender.name} (-20 Return Fire Vigilance & -30% Return Fire Attack)!`);
    }

    const entrenchedReturnFire = (retDefVig + 15 >= retAtkVig) || (D.TERRAIN_FEATURES[ID.state.environment.feature]?.fortified);

    if (retDefVig > retAtkVig || entrenchedReturnFire) {
      const retDieSides = getCombatDieSides(defender, 'attack');
      const retDieRoll = H.rollDie(retDieSides);

      const retPierceDie = H.rollDie(6);
      const retHardDie = H.rollDie(6);

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

      H.addLog(
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
          retDisabledRoll = H.rollDie(3);
          retBracketDesc = '<= 1/4 Hardness (d3)';
        } else if (retRatio <= 0.50) {
          retDisabledRoll = 1 + H.rollDie(6);
          retBracketDesc = '1/4 to 2/4 Hardness (1+d6)';
        } else if (retRatio <= 0.75) {
          retDisabledRoll = 3 + H.rollDie(8);
          retBracketDesc = '2/4 to 3/4 Hardness (3+d8)';
        } else {
          retDisabledRoll = 6 + H.rollDie(12);
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
      const atkBreakDieRoll = H.rollDie(atkBreakDieSides);
      const defTraitDefMalus = defTraits.reduce((s, t) => s + (t.enemyDefMalus || 0), 0);
      const atkBaseBreakthrough = Math.max(0, attacker.defense - attacker.roundTemp.defMalus - defTraitDefMalus);
      const atkBreakTotals = computeUnitTotalStat(
        attacker, defender, atkSide, defSide, 'defense',
        atkBaseBreakthrough, atkBreakDieRoll, 0, atkTactic, defTactic, true
      );

      H.addLog(
        'rolls',
        `↩ [Return Fire Clash] ${defender.name} RetAtk: Base(${retBaseAtk.toFixed(1)}) + d${retDieSides}(${retDieRoll}) + Flat(${defRetAtkTotals.flatBonus}) × Mod(${defRetAtkTotals.netPct >= 0 ? '+' : ''}${defRetAtkTotals.netPct}%) = ${defRetAtkTotals.finalValue} ` +
        `VS ${attacker.name} Breakthrough/Def: ${atkBreakTotals.finalValue}`
      );

      if (defRetAtkTotals.finalValue > atkBreakTotals.finalValue) {
        const retMargin = Math.max(1, Math.round(defRetAtkTotals.finalValue - atkBreakTotals.finalValue));
        H.addLog('rolls', `↩ [Return Fire Hit!] ${defender.name} (RetAtk ${defRetAtkTotals.finalValue} > Breakthrough ${atkBreakTotals.finalValue}) strikes back at ${attacker.name}!`);
        inflictCombatDamage(defender, attacker, retMargin, defSide, atkSide, defTactic, atkTactic, 'Return Fire');

        if (defTactic.id === 'def_counterattack' && !defender.isMonster && !defender.isZombie) {
          defender.org = Math.min(defender.maxOrg, defender.org + 2);
          H.addLog('damage', `⚡ [Counterattack] ${defender.name} gains +2 Organization!`);
        }
        if (defTactic.id === 'urb_def_ambush') {
          const ambRoll = H.rollDie(6);
          if (ambRoll >= 5) {
            applyPersonnelCasualties(attacker, H.rollDie(6), false, false, 'Urban Ambush Bonus');
          }
        }
      } else {
        const retGrazeResult = H.calculateGrazingCasualties(defender, attacker, defRetAtkTotals.finalValue, atkBreakTotals.finalValue, retPierced, true);

        if (retGrazeResult.immune) {
          H.addLog('rolls', `↩ [BREAKTHROUGH IMMUNE] ${attacker.name}'s Breakthrough (${atkBreakTotals.finalValue}) deflects ${defender.name}'s Return Fire (${defRetAtkTotals.finalValue}): ${retGrazeResult.reason} (0 casualties)!`);
        } else {
          H.addLog('damage', `↩ [Grazing Return Fire] ${attacker.name}'s Breakthrough (${atkBreakTotals.finalValue}) holds vs ${defender.name} (${defRetAtkTotals.finalValue}), but takes ${retGrazeResult.casualties} suppressing casualties (${retGrazeResult.reason})!`);
          applyPersonnelCasualties(attacker, retGrazeResult.casualties, false, false, 'Grazing Return Fire', defTactic, atkTactic);
        }
      }
    } else {
      H.addLog('rolls', `↩ [No Return Fire] ${defender.name} failed Return Fire Vigilance (${retDefVig} vs ${retAtkVig}).`);
    }
  }

  // --------------------------------------------------------------------------
  // 11. Aggregate Statistic Calculations
  // --------------------------------------------------------------------------

  function computeUnitTotalStat(unit, opponent, mySide, enemySide, role, baseStat, dieRoll, vigFlatBoost, myTactic, enemyTactic, isReturnFire) {
    const myState = mySide === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
    const traits = unit.traits.map(getTraitById).filter(Boolean);
    const exp = D.EXPERIENCE_TIERS[unit.experience] || D.EXPERIENCE_TIERS.Regular;
    const cmd = getSideCommander(mySide);
    const feat = D.TERRAIN_FEATURES[ID.state.environment.feature] || D.TERRAIN_FEATURES.Normal;
    const clashDist = H.getTotalDistance(unit, opponent);

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

    // Close-quarters melee bonus at distance <= 1
    if (role === 'attack' && !isReturnFire && unit.traits.includes('melee_attack') && clashDist <= 1) {
      addPct(30);
      flatBonus += 4;
    }
    if (isReturnFire && opponent && opponent.traits.includes('melee_attack') && clashDist <= 1) {
      addPct(-30);
    }

    // Entrenchment defense bonus (melee bypasses 50% entrenchment)
    if (role === 'defense' && unit.entrenchmentLevel > 0) {
      const effEntrench = (opponent && opponent.traits.includes('melee_attack') && clashDist <= 1)
        ? Math.floor(unit.entrenchmentLevel * 0.5)
        : unit.entrenchmentLevel;
      addPct(effEntrench * 5);
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
        if (t.terrainTarget === ID.state.environment.terrain ||
           (t.terrainTarget === 'Mountain' && ID.state.environment.terrain === 'Hills') ||
           (t.terrainTarget === 'Forest' && ID.state.environment.terrain === 'Jungle') ||
           (t.terrainTarget === 'Amphibious' && (feat.isRiver || feat.isAmphib || ID.state.environment.terrain === 'Marsh'))) {
          addPct(t.terrainBonus || 0);
        }
      }
      if (role === 'attack' && t.antiCategory && opponent.category === t.antiCategory) {
        addPct(t.antiBonus || 0);
      }
    });

    if (cmd) {
      const cmdTraits = (cmd.traits || []).map(getCommanderTraitById).filter(Boolean);
      cmdTraits.forEach(t => {
        if (traitAppliesToUnit(t, unit)) {
          addPct(role === 'attack' ? (t.atkPct || 0) : (t.defPct || 0));
          if (t.terrainTarget && t.terrainTarget === ID.state.environment.terrain) {
            addPct(t.terrainBonus || 0);
          }
        }
      });

      if (role === 'attack') {
        flatBonus += cmdTraits.filter(t => traitAppliesToUnit(t, unit)).reduce((s, t) => s + (t.atkFlat || 0), 0);
      } else {
        flatBonus += cmdTraits.filter(t => traitAppliesToUnit(t, unit)).reduce((s, t) => s + (t.defFlat || 0), 0);
      }

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
          if (ID.state.battle.round === 1 && ID.state.environment.unexpectedInitiative) tacAtk -= 10;
          const enState = enemySide === 'A' ? ID.state.battle.sideA : ID.state.battle.sideB;
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
  // 12. Casualty Infliction & Triage Resolution
  // --------------------------------------------------------------------------

  function inflictCombatDamage(attacker, defender, attackDefenseDiff, atkSide, defSide, atkTactic, defTactic, phaseLabel) {
    const diffDieSides = Math.max(1, Math.round(attackDefenseDiff));
    const baseCasRoll = H.rollDie(diffDieSides);

    const atkTraits = attacker.traits.map(getTraitById).filter(Boolean);
    const hasHighCal = atkTraits.some(t => t.grantsHighCaliber) || attacker.category === 'armored_vehicle' || attacker.category === 'tank';
    const hasExplosive = atkTraits.some(t => t.grantsExplosive) || attacker.category === 'artillery';

    const highCalRoll = hasHighCal ? (2 + H.rollDie(6)) : 0;
    const explosiveRoll = hasExplosive ? (3 + H.rollDie(8)) : 0;

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
      H.addLog('damage', `🧟 [Zombie Dismemberment] High-Caliber / Explosive fire shreds the horde for +${zombieExtra} extra casualties!`);
    }

    if ((defender.armorTier === 'unarmored' || defender.maxArmor <= 0) && defender.roundTemp && !defender.roundTemp.inCover && !defender.isMonster && !defender.isZombie) {
      const openSuppression = 1 + H.rollDie(4);
      defender.org = Math.max(0, defender.org - openSuppression);
      H.addLog('damage', `⚡ [Caught in Open Shock] ${defender.name} pinned without defilade, taking -${openSuppression} Org shock!`);
    }
    if (defTactic.id === 'atk_mass_charge' && (hasHighCal || hasExplosive)) {
      rawDowned = Math.round(rawDowned * 1.15);
    }
    if (defTactic.id === 'def_tactical_withdrawal') {
      rawDowned = Math.max(1, Math.round(rawDowned * 0.80));
    }

    if (attacker.maxPersonnel < 500 && attacker.category !== 'artillery' && !attacker.isMonster) {
      const maxByAttackerSize = Math.max(4, Math.ceil(attacker.personnel * 0.45) + (attacker.armor * 2));
      const maxByTargetScale = Math.max(6, Math.ceil(defender.maxPersonnel * 0.35));
      rawDowned = Math.min(rawDowned, maxByAttackerSize, maxByTargetScale);
    }

    H.addLog(
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
      H.addLog('damage', `💀 [Monster Permanent Wound] ${defender.name} has no recovery capacity: all ${actualDowned} damage directly reduces vital mass (100% KIA) (${defender.personnel}/${defender.maxPersonnel} active).`);
      checkAndMarkUnitDefeat(defender);
      return;
    }

    const isZombie = defender.isZombie;
    const rawRecRoll = isZombie ? H.rollDie(100) : (50 + H.rollDie(50));
    const baseRec = rawRecRoll;
    const defTraits = defender.traits.map(getTraitById).filter(Boolean);
    const expObj = D.EXPERIENCE_TIERS[defender.experience] || D.EXPERIENCE_TIERS.Regular;

    const opMods = H.getTerrainOperationalMods(defender.category);
    let recMod = (expObj.recBonus || 0) + defTraits.reduce((s, t) => s + (t.recBonus || 0), 0) + opMods.triageMod;
    if (hasHighCal) recMod -= 10;
    if (hasExplosive) recMod -= 15;

    const finalRecScore = H.clamp(baseRec + recMod, 5, 95);
    const deadPct = (100 - finalRecScore) / 100;
    const deadCount = Math.round(actualDowned * deadPct);
    const woundedCount = actualDowned - deadCount;

    defender.dead += deadCount;

    if (defender.isZombie) {
      defender.personnel += woundedCount;
      H.addLog('damage', `🧟 [Zombie Reanimation] Recovery Roll (d100[${rawRecRoll}])+${recMod}=${finalRecScore}: ${deadCount} permanently destroyed, while ${woundedCount} rise back into battle! (${defender.personnel} active)`);
    } else {
      defender.wounded += woundedCount;
      H.addLog('damage', `🏥 [Casualty Recovery] ${defender.name} (50+d50[${rawRecRoll - 50}])=${baseRec}+${recMod}=${finalRecScore}: ${deadCount} KIA (Dead), ${woundedCount} WIA (Wounded) (${defender.personnel}/${defender.maxPersonnel} active).`);
    }

    if (!defender.isMonster && !defender.isZombie) {
      const singleRoundRatio = actualDowned / Math.max(1, defender.maxPersonnel);
      const totalLostRatio = (defender.maxPersonnel - defender.personnel) / Math.max(1, defender.maxPersonnel);
      const newCumTenths = Math.floor((totalLostRatio + 0.0001) * 10);

      let orgDmg = 0;
      let orgReasons = [];

      if (singleRoundRatio >= 0.30) {
        const r = 3 + H.rollDie(12);
        orgDmg += r;
        orgReasons.push(`>=3/10 single-rd (3+d12=${r})`);
        defender.roundTemp.lostTenPctLastRound = true;
      } else if (singleRoundRatio >= 0.20) {
        const r = 2 + H.rollDie(10);
        orgDmg += r;
        orgReasons.push(`>=2/10 single-rd (2+d10=${r})`);
        defender.roundTemp.lostTenPctLastRound = true;
      } else if (singleRoundRatio >= 0.10) {
        const r = 1 + H.rollDie(6);
        orgDmg += r;
        orgReasons.push(`>=1/10 single-rd (1+d6=${r})`);
        defender.roundTemp.lostTenPctLastRound = true;
      }
      while (defender.cumPersonnelLostTenths < newCumTenths) {
        defender.cumPersonnelLostTenths++;
        const t = defender.cumPersonnelLostTenths;
        let r = 0;
        if (t === 1) {
          r = 1 + H.rollDie(3);
          orgReasons.push(`1/10 cum. loss (1+d3=${r})`);
        } else if (t === 2) {
          r = 1 + H.rollDie(6);
          orgReasons.push(`2/10 cum. loss (1+d6=${r})`);
        } else if (t === 3) {
          r = 2 + H.rollDie(10);
          orgReasons.push(`3/10 cum. loss (2+d10=${r})`);
        } else {
          r = 3 + H.rollDie(12);
          orgReasons.push(`${t}/10 cum. loss (3+d12=${r})`);
        }
        orgDmg += r;
      }

      if (orgDmg === 0) {
        orgDmg = 1 + H.rollDie(3);
        orgReasons.push(`combat shock (1+d3=${orgDmg})`);
      }

      // Manpower Cohesion Shield (>= 75% headcount resists chip shock)
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
      H.addLog('damage', `📉 [Org Damage] ${defender.name} loses -${orgDmg} Organization (${orgReasons.join(', ')}) ➔ ${defender.org}/${defender.maxOrg} Org remaining.`);
    }

    checkAndMarkUnitDefeat(defender);
  }

  // --------------------------------------------------------------------------
  // Public Module API
  // --------------------------------------------------------------------------

  ID.Combat = {
    createCombatUnitInstance,
    getTraitById,
    getCommanderTraitById,
    getSideCommander,
    traitAppliesToUnit,
    isUnitActive,
    triggerUnitRally,
    checkAndMarkUnitDefeat,
    getUnitTargetValue,
    getCategoryPursuitRetreatBonus,
    getUnitPursuitBonus,
    getUnitRetreatBonus,
    getEligibleTactics,
    selectTacticForSide,
    getSideActivePersonnel,
    getOutnumberingBonusPct,
    getOrgRemainingMalusPct,
    getPersonnelLossMalusPct,
    getEffectiveArmorSplit,
    getEffectiveUnitHardness,
    getSupplyMalusPct,
    getTerrainUnitModifiers,
    getCombatDieSides,
    runSingleRound,
    processSupplyAndStartOfRoundTraits,
    calculateSideDepotCapacity,
    getSideVigilanceModifier,
    performVigilanceComparison,
    processSideSupportFire,
    processArmorLossAndCrewCasualties,
    applySupportCasualtiesAndArmor,
    getUnitArmorRecoveryBonus,
    isFrontlinerActive,
    selectTargetUnit,
    resolveUnitEngagement,
    computeUnitTotalStat,
    inflictCombatDamage,
    applyPersonnelCasualties
  };

})(window.IronDivision);
