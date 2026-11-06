/* ==========================================================================
   IRON DIVISION ENGINE — PURSUIT, OVERRUNS & BATTLEFIELD SALVAGE
   File: js/engine-pursuit.js
   ========================================================================== */

window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  // Shortcuts to companion modules with safe fallbacks
  const H = ID.Helpers || {};
  const D = ID.Data || {};

  /**
   * Safe helper to check if a unit is currently operational on the frontline
   */
  function isUnitActive(u) {
    if (ID.Combat && typeof ID.Combat.isUnitActive === 'function') {
      return ID.Combat.isUnitActive(u);
    }
    return !u.defeated && !u.isRallying && u.personnel > 0;
  }

  /**
   * Safe helper to halt battle execution loops
   */
  function stopBattleLoop() {
    if (ID.App && typeof ID.App.stopAutoRun === 'function') {
      ID.App.stopAutoRun();
    } else if (typeof stopAutoRun === 'function') {
      stopAutoRun();
    }
  }

  /**
   * Safe helper to retrieve unit retreat bonuses
   */
  function getRetreatBonus(u) {
    if (ID.Combat && typeof ID.Combat.getUnitRetreatBonus === 'function') {
      return ID.Combat.getUnitRetreatBonus(u);
    }
    return 0;
  }

  /**
   * Checks whether either side has been eliminated or if combat must continue.
   * Combat continues as long as a side has active units OR units in the rally queue.
   */
  function checkBattleEndCondition() {
    const state = ID.state;
    if (!state || !state.battle) return false;

    const sideAHasCapacity = state.battle.sideA.units.some(u => !u.defeated && (isUnitActive(u) || u.isRallying));
    const sideBHasCapacity = state.battle.sideB.units.some(u => !u.defeated && (isUnitActive(u) || u.isRallying));

    // As long as both sides have active or rallying forces, battle continues!
    if (sideAHasCapacity && sideBHasCapacity) return false;

    stopBattleLoop();
    state.battle.isOver = true;

    const activeA = state.battle.sideA.units.filter(u => !u.defeated && (isUnitActive(u) || u.isRallying));
    const activeB = state.battle.sideB.units.filter(u => !u.defeated && (isUnitActive(u) || u.isRallying));

    const winnerSide = activeA.length > 0 ? 'A' : (activeB.length > 0 ? 'B' : 'Draw');
    state.battle.winner = winnerSide;

    H.addLog('rolls', `================================================`);
    if (winnerSide === 'Draw') {
      H.addLog('rolls', `🏁 BATTLE OVER — Mutual Exhaustion after ${state.battle.round} rounds!`);
    } else {
      const loserSide = winnerSide === 'A' ? 'B' : 'A';
      H.addLog('rolls', `🏆 BATTLE OVER — Side ${winnerSide} achieves victory over Side ${loserSide} in Round ${state.battle.round}!`);
      resolveRetreatAndPursuit(winnerSide, loserSide);
    }

    buildAfterActionReport();

    if (ID.UI && typeof ID.UI.openBattleSummaryModal === 'function') {
      ID.UI.openBattleSummaryModal();
    } else if (typeof openBattleSummaryModal === 'function') {
      openBattleSummaryModal();
    }

    return true;
  }

  /**
   * Resolves post-battle pursuit, overruns, retreat rolls, towing, and equipment salvage.
   */
  function resolveRetreatAndPursuit(winnerSide, loserSide) {
    const state = ID.state;
    const winState = winnerSide === 'A' ? state.battle.sideA : state.battle.sideB;
    const loseState = loserSide === 'A' ? state.battle.sideA : state.battle.sideB;

    const tacticsList = D.TACTICS_DB || [];
    const defaultTactic = tacticsList[0] || {};
    const winTactic = tacticsList.find(t => t.id === winState.chosenTacticId) || defaultTactic;
    const loseTactic = tacticsList.find(t => t.id === loseState.chosenTacticId) || defaultTactic;

    const winUnits = winState.units.filter(isUnitActive);
    const avgWinSpeed = winUnits.length > 0
      ? Math.round(winUnits.reduce((s, u) => s + (H.getUnitEffectiveSpeed ? H.getUnitEffectiveSpeed(u) : 1), 0) / winUnits.length)
      : 1;

    // Check if victor includes Monsters or Zombies (triggers No Quarter doctrine)
    const victorIsMonstersOrZombies = winUnits.some(u => u.isMonster || u.isZombie);

    H.addLog('rolls', `🏃 [Post-Battle Mobility Pursuit] Side ${winnerSide} (Avg Speed: Class ${avgWinSpeed}) pursues retreating Side ${loserSide}!`);
    if (victorIsMonstersOrZombies) {
      H.addLog('damage', `🩸 [NO QUARTER] The victorious Monster/Zombie horde takes NO prisoners! All captured troops and wounded left on the field are slaughtered or devoured!`);
    }

    // The victor sweeps the field and claims all recoverable hulls left behind
    let totalAbandonedHulls = loseState.units.reduce((sum, u) => sum + (u.recoverableArmor || 0) + (u.abandonedArmor || 0), 0);

    for (const u of loseState.units) {
      if (u.personnel <= 0) {
        u.captured = (u.captured || 0) + (u.wounded || 0);
        // Do not overwrite u.escaped — preserve troops that scattered earlier!
        continue;
      }

      const retSpeed = H.getUnitEffectiveSpeed ? H.getUnitEffectiveSpeed(u) : 1;
      const deltaMob = avgWinSpeed - retSpeed;

      let capturedActive = 0;
      let escapedActive = 0;
      let escapePct = 50;

      // RULE 1: Automatic Overrun when Pursuer is >= 3 Speed Classes faster on open ground
      if (deltaMob >= 3) {
        const desperateScatterRoll = H.rollDie(100);
        if (desperateScatterRoll === 100) {
          escapedActive = Math.round(u.personnel * 0.25);
          capturedActive = u.personnel - escapedActive;
          escapePct = 25;
          H.addLog('rolls', `⚡ [Desperate Scatter] ${u.name} rolled Critical 100! 25% scatter into brush, 75% captured.`);
        } else {
          capturedActive = Math.round(u.personnel * 0.90);
          escapedActive = u.personnel - capturedActive;
          escapePct = 10;
          H.addLog('rolls', `🚨 [AUTOMATIC OVERRUN] ${u.name} overrun across open ground! 90% (${capturedActive}) captured, 10% scattered.`);
        }
      } else {
        // RULE 2: Contested Pursuit
        const opMods = H.getTerrainOperationalMods ? H.getTerrainOperationalMods(u.category) : { retreatMod: 0 };
        const pursueMod = (winTactic.pursueBonus || 0) + (deltaMob > 0 ? deltaMob * 25 : 0);
        const retreatMod = getRetreatBonus(u) + (loseTactic.retreatBonus || 0) + (deltaMob < 0 ? Math.abs(deltaMob) * 25 : 0) + (opMods.retreatMod || 0);

        const rawRetRoll = H.rollDie(100);
        const rawPurRoll = H.rollDie(100);

        const totalRet = rawRetRoll + retreatMod;
        const totalPur = rawPurRoll + pursueMod;

        if (rawRetRoll === 100) {
          escapedActive = u.personnel;
          capturedActive = 0;
          escapePct = 100;
          H.addLog('rolls', `✨ [CRITICAL RETREAT 100!] ${u.name} slips away cleanly! 100% active personnel escape!`);
        } else if (rawPurRoll === 100) {
          capturedActive = u.personnel;
          escapedActive = 0;
          escapePct = 0;
          H.addLog('rolls', `⛓ [CRITICAL PURSUIT 100!] ${u.name} encircled completely! 100% active personnel captured!`);
        } else if (totalRet >= totalPur) {
          escapePct = H.clamp(50 + (totalRet - totalPur), 10, 100);
          escapedActive = Math.round(u.personnel * (escapePct / 100));
          capturedActive = u.personnel - escapedActive;
          H.addLog('rolls', `🏃 [Retreat Success] ${u.name}: Ret ${totalRet} vs Pur ${totalPur} ➔ ${escapePct}% (${escapedActive}) escaped, ${capturedActive} captured.`);
        } else {
          const capturePct = H.clamp(50 + (totalPur - totalRet), 10, 100);
          escapePct = 100 - capturePct;
          capturedActive = Math.round(u.personnel * (capturePct / 100));
          escapedActive = u.personnel - capturedActive;
          H.addLog('rolls', `⛓ [Pursuit Catch] ${u.name}: Pur ${totalPur} > Ret ${totalRet} ➔ ${capturePct}% (${capturedActive}) captured, ${escapedActive} escaped.`);
        }
      }

      // ACCUMULATE: Add newly escaping troops to troops that scattered during the rout
      u.escaped = (u.escaped || 0) + escapedActive;

      // RULE 3: No Prisoners Rule for Monsters and Zombies
      if (victorIsMonstersOrZombies) {
        const slaughtered = capturedActive + (u.wounded || 0);
        u.dead += slaughtered;
        u.captured = 0;
        u.wounded = 0;
        if (slaughtered > 0) {
          H.addLog('damage', `💀 [Devoured / Slaughtered] ${u.name}: ${slaughtered} captured & wounded troops are devoured by the horde (Converted to KIA)!`);
        }
      } else {
        u.captured = (u.captured || 0) + capturedActive + (u.wounded || 0);
      }

      // RULE 4: Vehicle Towing
      if (u.recoverableArmor > 0 && escapePct >= 60) {
        const towedPct = escapePct >= 80 ? 0.50 : 0.25;
        const towedArmor = Math.floor(u.recoverableArmor * towedPct);
        if (towedArmor > 0) {
          H.addLog('armor', `🚜 [Recovery Tractors] ${u.name} (${escapePct}% retreat) towed ${towedArmor} repairable hulls back to depot.`);
        }
      }
    }

    // RULE 5: Proportional Battlefield Salvage for the Victor
    let impressedTanks = 0;
    let supplyScrapped = 0;
    let scuttledHulls = 0;

    if (totalAbandonedHulls > 0) {
      if (victorIsMonstersOrZombies) {
        // Creatures crush vehicles into scrap
        scuttledHulls = totalAbandonedHulls;
        impressedTanks = 0;
        supplyScrapped = 0;
        H.addLog('armor', `🦖 [BEAST RAMPAGE] The victorious horde smashed and crushed all ${totalAbandonedHulls} abandoned vehicles into useless scrap iron.`);
      } else {
        const victorHasEngineers = winUnits.some(u => (u.traits || []).includes('engineering_support') || (u.traits || []).includes('repair_crew'));
        const salvageRoll = 50 + H.rollDie(50) + (victorHasEngineers ? 15 : 0);
        const salvageScore = H.clamp(salvageRoll, 10, 110);

        let impressedPct = 0;
        let scrapPct = 0;

        if (salvageScore >= 80) {
          impressedPct = 0.50;
          scrapPct = 0.35;
        } else if (salvageScore >= 60) {
          impressedPct = 0.25;
          scrapPct = 0.50;
        } else if (salvageScore >= 40) {
          impressedPct = 0.10;
          scrapPct = 0.50;
        } else {
          impressedPct = 0.00;
          scrapPct = 0.25;
        }

        impressedTanks = Math.floor(totalAbandonedHulls * impressedPct);
        const scrappedCount = Math.floor(totalAbandonedHulls * scrapPct);
        scuttledHulls = totalAbandonedHulls - impressedTanks - scrappedCount;
        supplyScrapped = scrappedCount * 5;

        H.addLog('armor', `🚜 [FIELD SALVAGE] Side ${winnerSide} (Roll ${salvageScore}) secured ${totalAbandonedHulls} abandoned hulls: ` +
          `${impressedTanks} Beutepanzers restored, ${scrappedCount} stripped (+${supplyScrapped} Supply), ${scuttledHulls} scuttled/burned.`);
      }
    }

    state.battle.salvageReport = {
      abandoned: totalAbandonedHulls,
      impressed: impressedTanks,
      supplyScrapped: supplyScrapped,
      scuttled: scuttledHulls
    };
  }

  /**
   * Builds the persistent telemetry snapshot used by the After-Action Report (AAR) modal.
   */
  function buildAfterActionReport() {
    const state = ID.state;
    if (!state || !state.battle) return;

    state.battle.afterActionReport = {
      winner: state.battle.winner,
      rounds: state.battle.round,
      terrain: state.environment.terrain,
      feature: state.environment.feature,
      weather: state.environment.weather,
      sideA: structuredClone(state.battle.sideA.units),
      sideB: structuredClone(state.battle.sideB.units)
    };
  }

  // --------------------------------------------------------------------------
  // Public Module API
  // --------------------------------------------------------------------------

  ID.Pursuit = {
    checkBattleEndCondition,
    resolveRetreatAndPursuit,
    buildAfterActionReport
  };

  // Backwards-compatible bindings on window
  window.checkBattleEndCondition = checkBattleEndCondition;
  window.resolveRetreatAndPursuit = resolveRetreatAndPursuit;
  window.buildAfterActionReport = buildAfterActionReport;

})(window.IronDivision);