/* ==========================================================================
   IRON DIVISION ENGINE — COMPREHENSIVE SIMULATION FIELD GUIDE
   File: js/guide.js
   ========================================================================== */

function renderSimulationGuide() {
  const container = document.getElementById('view-guide');
  if (!container) return;

  container.innerHTML = `
    <!-- Guide Header Banner -->
    <div class="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-xl p-5 shadow-xl">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span class="text-xs font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
            Field Manual &amp; Mechanics Compendium
          </span>
          <h2 class="text-xl sm:text-2xl font-extrabold text-white mt-1">Operational Combat Simulation Guide</h2>
          <p class="text-xs text-slate-400 mt-0.5 max-w-3xl">
            A complete tactical reference on combined-arms combat, armor penetration brackets, shared supply logistics, inherent battery barrages, and morale rallying.
          </p>
        </div>
        <div class="text-right font-mono text-xs text-slate-400 hidden sm:block">
          <div>Engine Version: <b class="text-amber-400">2.5 Modular</b></div>
          <div>Dice System: <b class="text-sky-400">d3 - d100 Polyhedral</b></div>
        </div>
      </div>

      <!-- Quick-Jump Table of Contents -->
      <div class="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2 text-xs font-mono">
        <a href="#guide-dual-hp" class="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800">1. Dual-HP System</a>
        <a href="#guide-supply-depot" class="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800">2. Shared Supply Depot</a>
        <a href="#guide-artillery" class="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-rose-300 border border-slate-800">3. Inherent Artillery</a>
        <a href="#guide-armor" class="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-orange-300 border border-slate-800">4. Armor &amp; Hardness</a>
        <a href="#guide-grazing" class="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-800">5. Grazing &amp; Immunity</a>
        <a href="#guide-rally" class="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-slate-800">6. Rallying &amp; Stragglers</a>
        <a href="#guide-pursuit" class="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-purple-300 border border-slate-800">7. Pursuit &amp; Salvage</a>
      </div>
    </div>

    <!-- Guide Grid Sections -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

      <!-- SECTION 1: DUAL-HP DECOUPLING -->
      <div id="guide-dual-hp" class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
          <span class="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono text-xs">1</span>
          <h3 class="font-bold text-sm sm:text-base text-white">Dual-HP System (Personnel vs. Organization)</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Unlike RPGs that track a single hit-point bar, divisions decouple physical headcount from operational cohesion:
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          <div class="p-2.5 rounded bg-slate-950 border border-emerald-900/40">
            <b class="text-emerald-400 block mb-0.5">Personnel HP (Meat &amp; Guns)</b>
            <span class="text-slate-400 text-[11px] leading-tight block">
              Physical soldiers. Takes damage from rifle, MG, and fragmentation hits. Downed personnel roll a <b>50 + d50</b> recovery check to determine <b>KIA (Dead)</b> vs <b>WIA (Wounded)</b>.
            </span>
          </div>
          <div class="p-2.5 rounded bg-slate-950 border border-sky-900/40">
            <b class="text-sky-400 block mb-0.5">Organization HP (Morale &amp; Order)</b>
            <span class="text-slate-400 text-[11px] leading-tight block">
              Discipline, command structure, and combat stamina. When Organization reaches <b>0</b>, the unit does not die—it <b>breaks cohesion and routs to the rear</b> to rally.
            </span>
          </div>
        </div>
        <div class="p-2.5 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
          <b class="text-amber-300">Manpower Cohesion Shield:</b> Formations with $\ge 75\%$ personnel remaining absorb <b>-2 Org shock</b> from incoming hits and gain <b>+1 passive Org regeneration</b> every round.
        </div>
      </div>

      <!-- SECTION 2: SHARED SUPPLY DEPOT -->
      <div id="guide-supply-depot" class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
          <span class="w-6 h-6 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center font-mono text-xs">2</span>
          <h3 class="font-bold text-sm sm:text-base text-white">Shared Army Supply Depot</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Logistics are centralized into an operational stockpile for each army. Active and resting units draw supplies directly from this shared depot.
        </p>
        <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5">
          <div class="text-amber-300 font-bold">Depot Sizing Formula:</div>
          <div class="text-slate-400">
            Max Depot = <span class="text-white">(100 + Σ Unit Max Supply × 0.5)</span> × <span class="text-sky-300">(1 + Logistics Level × 10%)</span> × <span class="text-emerald-300">(Logistics Wizard ? 1.25 : 1.0)</span>
          </div>
        </div>
        <ul class="list-disc list-inside text-xs text-slate-300 space-y-1">
          <li><b>Active Units:</b> Regeneration from traits (e.g. <i>Logistic Support</i>) draws points from the depot.</li>
          <li><b>Rallying Units:</b> Draw <b>d3 + Traits + Commander Logistics</b> from the depot every round in the rear.</li>
          <li><b>Depot Empty:</b> When the stockpile reaches 0, units cannot restock supply and risk dropping below 20% (continuous Org damage).</li>
        </ul>
      </div>

      <!-- SECTION 3: INHERENT ARTILLERY BARRAGES -->
      <div id="guide-artillery" class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
          <span class="w-6 h-6 rounded bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center font-mono text-xs">3</span>
          <h3 class="font-bold text-sm sm:text-base text-white">Inherent Artillery Battery Barrages</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Formations categorized as <b>Artillery</b> do not need external traits to conduct fire support missions—the battery barrage is <b>inherent to the unit category</b>.
        </p>
        <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
          <div class="text-rose-400 font-bold">Barrage Execution (Every 1+d2 Rounds, Requires &ge;50% Supply):</div>
          <div class="text-slate-300">• Expends: <b>3 + d3 Supply</b></div>
          <div class="text-slate-300">• Defense Reduction: <b>-(4 + d12)</b></div>
          <div class="text-slate-300">• Hardness Reduction: <b>-(2 + d6)</b></div>
          <div class="text-slate-300">• Direct Impact: Roll 8-10: <b>+d6 casualties</b> | Roll 11-12: <b>+(2+d12) casualties &amp; +(1+d3) disabled armor</b></div>
        </div>
        <p class="text-[11px] text-slate-400">
          <i>Note: Non-artillery units (such as infantry or tank brigades) can still assign the "Heavy Artillery Support" trait to simulate attached off-map divisional artillery.</i>
        </p>
      </div>

      <!-- SECTION 4: ARMOR & PENETRATION BRACKETS -->
      <div id="guide-armor" class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
          <span class="w-6 h-6 rounded bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center font-mono text-xs">4</span>
          <h3 class="font-bold text-sm sm:text-base text-white">Armor Piercing &amp; Hull Degradation</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Armor plates partition damage into Hard Attack and Soft Attack. When kinetic weapons exceed effective hardness, vehicle knockouts scale with overmatch severity:
        </p>
        <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
          <div class="text-orange-400 font-bold">Overmatch Ratio: (Penetration Roll - Hardness Roll) / Hardness</div>
          <div class="text-slate-300">• Ratio &le; 0.25 (Minor Breach): <b>d3 vehicles disabled</b></div>
          <div class="text-slate-300">• 0.25 &lt; Ratio &le; 0.50 (Moderate Breach): <b>1 + d6 vehicles disabled</b></div>
          <div class="text-slate-300">• 0.50 &lt; Ratio &le; 0.75 (Severe Overmatch): <b>3 + d8 vehicles disabled</b></div>
          <div class="text-slate-300">• Ratio &gt; 0.75 (Catastrophic Penetration): <b>6 + d12 vehicles disabled</b></div>
        </div>
        <div class="p-2.5 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
          <b class="text-rose-400">Degradation Death Spiral:</b> As tanks are lost, effective hardness drops proportionally. Heavily damaged armor formations become progressively easier to penetrate.
        </div>
      </div>

      <!-- SECTION 5: GRAZING FIRE & IMMUNITY -->
      <div id="guide-grazing" class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
          <span class="w-6 h-6 rounded bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center font-mono text-xs">5</span>
          <h3 class="font-bold text-sm sm:text-base text-white">Infantry Dispersion &amp; Grazing Immunity</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Attacks against unarmored foot infantry bypass penetration checks entirely. Instead, the defender rolls an <b>Entrenchment &amp; Dispersion Save</b>:
        </p>
        <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
          <div class="text-sky-300 font-bold">Cover Save: d20 + Terrain Cover + Entrenchment Level &ge; DC (12 + Spotting)</div>
          <div class="text-emerald-300">• In Defilade (Success): Soft damage halved, high-caliber extra damage negated.</div>
          <div class="text-rose-300">• Caught in Open (Failure): Full damage + -(1+d4) suppressive Organization shock.</div>
        </div>
        <div class="bg-slate-950 p-2 rounded border border-slate-800 text-xs">
          <b class="text-amber-300 block mb-0.5">Pressure Ratio &amp; Complete Immunity:</b>
          <span class="text-slate-400 text-[11px] block">
            If attack fails to break defense, damage is filtered by <b>Pressure Ratio (Attack / Defense)</b>. Super-Heavy tanks and Level 5 Bunkers are <b>100% immune</b> to low-caliber grazing fire. Pressure below 40% (60% in Forts) inflicts <b>0 damage</b>.
          </span>
        </div>
      </div>

      <!-- SECTION 6: RALLYING & ESCAPED STRAGGLERS -->
      <div id="guide-rally" class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
          <span class="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono text-xs">6</span>
          <h3 class="font-bold text-sm sm:text-base text-white">Rallying, Frontline Rest &amp; Escaped Stragglers</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          When Organization reaches 0, units fall back to the rear staging area for <b>2 + d2 rounds</b> to re-form ranks:
        </p>
        <ul class="list-disc list-inside text-xs text-slate-300 space-y-1.5">
          <li><b>Escaped Stragglers:</b> 25% of surviving soldiers scatter during the rout and are credited directly to <b>Escaped</b> (guaranteeing 100% manpower conservation).</li>
          <li><b>Turn-by-Turn Rest:</b> Units in the rear regain <b>d3 + Traits + Terrain + Commander</b> Org and draw refit supply from the depot every round.</li>
          <li><b>Uncontested Frontline:</b> If all enemies are in the rally queue, holding units stop burning supply and do not suffer fatigue or low-supply Org loss.</li>
          <li><b>The Rally Check (d20 vs DC 10):</b> Units with $\ge 60\%$ manpower never dissolve—officers delay the rally by 1 round to complete reorganization.</li>
        </ul>
      </div>

      <!-- SECTION 7: POST-BATTLE PURSUIT & SALVAGE -->
      <div id="guide-pursuit" class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3 lg:col-span-2">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
          <span class="w-6 h-6 rounded bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center font-mono text-xs">7</span>
          <h3 class="font-bold text-sm sm:text-base text-white">Post-Battle Pursuit, Overruns &amp; Battlefield Salvage</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <b class="text-purple-300 block font-mono">1. Mobility Differential (ΔMob)</b>
            <p class="text-slate-400 text-[11px]">
              Units have Speed Classes (0: Towed, 1: Foot, 3: Heavy Tank, 4: Medium/Mech, 5: Recon). If pursuers are <b>&ge;3 classes faster</b>, an <b>Automatic Overrun (90% captured)</b> is triggered.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <b class="text-amber-300 block font-mono">2. Field Salvage (Beutepanzers)</b>
            <p class="text-slate-400 text-[11px]">
              The victor sweeps the field. A <b>50 + d50</b> salvage roll claims abandoned hulls: up to 50% are restored as <b>Beutepanzers</b>, 35% stripped for depot supplies (+5 each), and remainder scuttled.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <b class="text-rose-400 block font-mono">3. Creature "No Quarter" Rule</b>
            <p class="text-slate-400 text-[11px]">
              Victorious Monsters or Zombie Swarms take zero prisoners. All captured active troops and wounded left on the field are converted directly to <b>KIA (Slaughtered / Devoured)</b>.
            </p>
          </div>
        </div>
      </div>

    </div>
  `;
}