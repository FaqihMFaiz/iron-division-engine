/* ==========================================================================
   IRON DIVISION ENGINE — COMPREHENSIVE SIMULATION FIELD GUIDE
   File: js/guide.js
   ========================================================================== */

function renderSimulationGuide() {
  const container = document.getElementById('view-guide');
  if (!container) return;

  container.innerHTML = `
    <!-- Guide Master Header Banner -->
    <div class="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              Iron Division Field Manual
            </span>
            <span class="text-xs font-mono text-slate-400">DOC-ID-904-REV4</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
            Combined-Arms Operational Doctrine
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 max-w-4xl leading-relaxed mt-1">
            Complete mathematical specification of division-scale combat mechanics: polyhedral dice resolution, kinetic armor penetration, shared logistics networks, defensive overwatch volleys, and battlefield salvage.
          </p>
        </div>
        <div class="bg-slate-950/80 border border-slate-800 p-3 rounded-xl font-mono text-xs text-slate-300 space-y-1 text-right">
          <div>Engine Core: <b class="text-amber-400">v3.0 Combined Arms</b></div>
          <div>Dice Spectrum: <b class="text-sky-400">d3, d4, d6, d8, d10, d12, d16, d20, d50, d100</b></div>
          <div>Decoupled Pools: <b class="text-emerald-400">Meat (HP) vs Morale (Org)</b></div>
        </div>
      </div>

      <!-- Quick Navigation Matrix -->
      <div class="pt-3 border-t border-slate-800 flex flex-wrap gap-2 text-xs font-mono">
        <a href="#guide-lifecycle" class="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition">🔄 7-Phase Lifecycle</a>
        <a href="#guide-categories" class="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-800 transition">🎲 Combat Dice</a>
        <a href="#guide-armor" class="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-orange-300 border border-slate-800 transition">🛡 Armor &amp; Hardness</a>
        <a href="#guide-dispersion" class="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-slate-800 transition">🕳️ Cover &amp; Grazing</a>
        <a href="#guide-melee" class="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-rose-300 border border-slate-800 transition">⚔ Melee &amp; Overwatch</a>
        <a href="#guide-logistics" class="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 transition">📦 Shared Supply Depot</a>
        <a href="#guide-artillery" class="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-red-300 border border-slate-800 transition">🎆 Inherent Artillery</a>
        <a href="#guide-medical" class="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-teal-300 border border-slate-800 transition">🏥 Medical Triage</a>
        <a href="#guide-rally" class="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 transition">🚩 Rallying &amp; Stragglers</a>
        <a href="#guide-pursuit" class="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-purple-300 border border-slate-800 transition">🚜 Pursuit &amp; Salvage</a>
      </div>
    </div>

    <!-- MAIN GUIDE GRID -->
    <div class="space-y-4">

      <!-- ==================== PART 1: 7-PHASE ROUND LIFECYCLE ==================== -->
      <div id="guide-lifecycle" class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center font-mono text-sm">1</span>
          <h3 class="font-bold text-base text-white">The 7-Phase Combat Round Lifecycle</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Each battle round executes an asynchronous, strict 7-phase sequence. Both sides act simultaneously or counter-attack within a single round before initiative flips:
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-amber-400 font-bold block">PHASE 1: Tactic Selection</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Both sides choose 1 of 25 tactical doctrines matching their role (Attacker chooses Attack tactics; Defender chooses Defense tactics). Commander personality guides AI picks.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-sky-400 font-bold block">PHASE 2: Logistics &amp; Rally</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Base operational supply drains. Routed units in the rear staging area recover Organization, restock supplies from the depot, and make d20 Rally Checks vs DC 10.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-emerald-400 font-bold block">PHASE 3: Recon / Vigilance</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Contested <b>d100 + Vigilance Modifiers</b> roll. The winner divides the victory margin by 10 to gain a flat combat stat boost (+1 to +10) and targeting authority.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-rose-400 font-bold block">PHASE 4: Fire Support</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Pre-assault strikes: Mortars, Air Support wings, and Inherent Artillery Battery barrages pound defenders, stripping defense and hardness before the clash.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-orange-400 font-bold block">PHASE 5: Main Assault Clash</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Attackers pick targets. Armor rolls Penetration vs Hardness; Foot troops roll Cover Saves. Attack Value clashes against Defense Value. Casualties resolved with <b>50 + d50</b> recovery.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-teal-400 font-bold block">PHASE 6: Return Fire</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Defenders contest Return Fire Vigilance. If successful, they fire back at the attacker's Breakthrough value. Grazing fire is resolved if no breakthrough occurs.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-purple-400 font-bold block">PHASE 7: Tactical Flip</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Temporary maluses clear. Tactical initiative alternates (Side A attacks in odd rounds; Side B attacks in even rounds), while the theatre invasion role remains locked.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-yellow-400 font-bold block">POST-BATTLE: Pursuit</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Once an army breaks, mobility differentials determine overruns (90% captured). Escaping armor tows damaged hulls; the victor salvages battlefield wrecks.
            </p>
          </div>
          <!-- NEW DYNAMIC TARGETING FORMULA CARD -->
        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
          <span class="text-amber-400 font-bold block">Dynamic Target Value (TV) System</span>
          <div class="p-2.5 rounded bg-slate-900 border border-slate-800 text-center text-slate-200 text-xs sm:text-sm">
            TV = (<span class="text-emerald-400">Size &amp; Armor</span> + <span class="text-rose-400">Damage Threat</span> + <span class="text-sky-400">Org &amp; Kill Priority</span>) &times; <span class="text-purple-300">Category Multiplier</span> + <span class="text-amber-300">Entrenchment Mod</span> + <span class="text-yellow-300">Screening</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 font-sans pt-1">
            <div>• <b>Threat to Opponent:</b> Hard Attack weighted vs armored targets; Soft Attack weighted vs foot troops.</div>
            <div>• <b>Blood in the Water:</b> Units with &le; 30% Org gain <b>+150 to +250 TV</b> (prime targets to collapse the line).</div>
            <div>• <b>Unit Category:</b> Artillery (&times;1.35) &gt; Tanks (&times;1.25) &gt; Armored Vehicles (&times;1.15) &gt; Infantry (&times;1.00).</div>
            <div>• <b>Entrenchment:</b> Open ground grants <b>+60 TV</b>; Level 3–5 bunkers grant <b>-30 to -70 TV</b> (unless using Breakthrough).</div>
          </div>
        </div>
        </div>
      </div>

      <!-- ==================== PART 2: CATEGORIES & MOBILITY MATRIX ==================== -->
      <div id="guide-categories" class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span class="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center font-mono text-sm">2</span>
          <h3 class="font-bold text-base text-white">Combat Categories, Polyhedral Dice &amp; Mobility Classes</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Every formation belongs to one of four military categories. Each category rolls distinct polyhedral dice for assault and defensive clashes, and possesses an inherent operational mobility rating:
        </p>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th class="py-2 px-3">Category</th>
                <th class="py-2 px-3">Assault Die</th>
                <th class="py-2 px-3">Defense Die</th>
                <th class="py-2 px-3">Speed Class</th>
                <th class="py-2 px-3">Pursuit / Retreat Mod</th>
                <th class="py-2 px-3">Inherent Rule</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-slate-200">
              <tr>
                <td class="py-2 px-3 font-bold text-emerald-400">Infantry</td>
                <td class="py-2 px-3 text-amber-300 font-bold">d12</td>
                <td class="py-2 px-3 text-sky-300 font-bold">d12</td>
                <td class="py-2 px-3">Class 1 (Foot)</td>
                <td class="py-2 px-3">+0 / +0</td>
                <td class="py-2 px-3 font-sans text-slate-400">Rolls Cover Saves; ignores 35% tank hardness in close terrain (Urban, Forest, Mountain).</td>
              </tr>
              <tr>
                <td class="py-2 px-3 font-bold text-sky-400">Armored Vehicle</td>
                <td class="py-2 px-3 text-amber-300 font-bold">d16</td>
                <td class="py-2 px-3 text-sky-300 font-bold">d16</td>
                <td class="py-2 px-3">Class 4–5 (Mechanized / Recon)</td>
                <td class="py-2 px-3 text-purple-300 font-bold">+20 / +20</td>
                <td class="py-2 px-3 font-sans text-slate-400">Inherently gains High-Caliber guns; high pursuit catch rating.</td>
              </tr>
              <tr>
                <td class="py-2 px-3 font-bold text-amber-400">Tank</td>
                <td class="py-2 px-3 text-amber-300 font-bold">d20</td>
                <td class="py-2 px-3 text-sky-300 font-bold">d20</td>
                <td class="py-2 px-3">Class 3–4 (Medium / Heavy)</td>
                <td class="py-2 px-3 text-purple-300 font-bold">+10 / +10</td>
                <td class="py-2 px-3 font-sans text-slate-400">Inherently gains High-Caliber weapons; Super-Heavies immune to non-explosive small arms.</td>
              </tr>
              <tr>
                <td class="py-2 px-3 font-bold text-rose-400">Artillery</td>
                <td class="py-2 px-3 text-amber-300 font-bold">d20</td>
                <td class="py-2 px-3 text-rose-400 font-bold">d8 (Fragile)</td>
                <td class="py-2 px-3">Class 0 (Towed Battery)</td>
                <td class="py-2 px-3 text-rose-400 font-bold">+0 / -10</td>
                <td class="py-2 px-3 font-sans text-slate-400">Inherent Battery Barrage; inherently gains Explosive Ordnance. Defenseless against overruns.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ==================== PART 3: ARMOR & HARDNESS DEGRADATION ==================== -->
      <div id="guide-armor" class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span class="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center font-mono text-sm">3</span>
          <h3 class="font-bold text-base text-white">Armor Classes, Dynamic Hardness &amp; Overmatch Brackets</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Armor partitions incoming firepower based on the formation's armor class. When vehicles are disabled, surviving infantry and crews are exposed, lowering overall hardness:
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
            <span class="text-orange-400 font-bold block">Armor Tier Partitions</span>
            <div class="text-[11px] text-slate-300 space-y-0.5 font-sans">
              <div>• <b>Unarmored:</b> 0% Hard / 100% Soft (Foot Infantry, Towed Artillery)</div>
              <div>• <b>Light Armor:</b> 25% Hard / 75% Soft (Armored Cars, Light APCs)</div>
              <div>• <b>Medium Armor:</b> 50% Hard / 50% Soft (Medium Tanks, Heavy Mech)</div>
              <div>• <b>Heavy Armor:</b> 75% Hard / 25% Soft (Heavy Tanks, Tank Destroyers)</div>
              <div>• <b>Super Heavy:</b> 100% Hard / 0% Soft (Behemoths, Super Tanks)</div>
            </div>
          </div>

          <!-- Dynamic Hardness Formula Card -->
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <span class="text-amber-400 font-bold block">Dynamic Hardness Formula</span>
            <div class="p-2.5 rounded bg-slate-900 border border-slate-800 text-center font-mono text-xs sm:text-sm text-slate-200">
              Effective Hardness = <span class="text-sky-300">max</span>(0, (<span class="text-amber-300">Base Hardness</span> + <span class="text-emerald-300">Traits</span>) &times; <span class="text-purple-300">Vehicle Ratio</span> - <span class="text-rose-400">Maluses</span>)
            </div>
            <div class="text-[11px] text-slate-400 font-sans">
              Where <code class="text-purple-300 font-mono">Vehicle Ratio = clamp(Current Armor / Max Armor, 0.25, 1.0)</code>
            </div>
            <div class="text-[11px] text-amber-300/90 font-sans italic border-t border-slate-800/80 pt-1">
              Close-Assault Rule: Attacking infantry in Urban, Forest, Jungle, or Mountain terrain bypass 35% of target hardness automatically.
            </div>
          </div>
        </div>

        <!-- Overmatch Brackets -->
        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-1 border-b border-slate-800 pb-1.5">
            <span class="text-orange-300 font-mono font-bold text-xs">
              Penetration Loss Brackets
            </span>
            <span class="font-mono text-[11px] text-slate-400">
              Overmatch Margin = (Penetration Roll - Hardness Roll) / Effective Hardness
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
            <div class="p-2 rounded bg-slate-900 border border-slate-800">
              <span class="text-yellow-400 font-bold block">Margin &le; 0.25 (Minor)</span>
              <span class="text-slate-300 text-[11px]">Knocks out <b>d3</b> vehicles.</span>
            </div>
            <div class="p-2 rounded bg-slate-900 border border-slate-800">
              <span class="text-amber-400 font-bold block">0.25 &lt; Margin &le; 0.50</span>
              <span class="text-slate-300 text-[11px]">Knocks out <b>1 + d6</b> vehicles.</span>
            </div>
            <div class="p-2 rounded bg-slate-900 border border-slate-800">
              <span class="text-orange-400 font-bold block">0.50 &lt; Margin &le; 0.75</span>
              <span class="text-slate-300 text-[11px]">Knocks out <b>3 + d8</b> vehicles.</span>
            </div>
            <div class="p-2 rounded bg-slate-900 border border-slate-800">
              <span class="text-rose-400 font-bold block">Margin &gt; 0.75 (Catastrophic)</span>
              <span class="text-slate-300 text-[11px]">Knocks out <b>6 + d12</b> vehicles.</span>
            </div>
          </div>
          <div class="text-[11px] text-slate-400 font-sans pt-1">
            <b>Crew Casualties:</b> Destroyed vehicles inflict <b>1 + d4</b> crew casualties; recoverable hulls inflict <b>d2</b> crew casualties. If &ge; 20% of vehicles are disabled in 1 round, unit suffers <b>-(2 + d8) Org shock</b>.
          </div>
        </div>
      </div>

      <!-- ==================== PART 4: DISPERSION, COVER & GRAZING ==================== -->
      <div id="guide-dispersion" class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono text-sm">4</span>
          <h3 class="font-bold text-base text-white">Infantry Dispersion, Cover Saves &amp; Grazing Immunity</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Unarmored infantry does not roll against kinetic penetration. Instead, foot soldiers use trench defilade and natural cover to disperse under incoming fire:
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <!-- Cover Save Formula Card -->
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <span class="text-emerald-400 font-bold block">Entrenchment &amp; Dispersion Save</span>
            <div class="p-2.5 rounded bg-slate-900 border border-slate-800 text-center font-mono text-xs sm:text-sm text-slate-200">
              Save = <span class="text-amber-300">d20</span> + <span class="text-emerald-300">Terrain Cover</span> + <span class="text-sky-300">Entrenchment Lvl</span> &ge; <span class="text-rose-400">DC (12 + Spotting)</span>
            </div>
            <ul class="list-disc list-inside text-slate-300 text-[11px] space-y-0.5 font-sans pt-1">
              <li><b>Dug-In (Success):</b> Soft damage halved; High-Caliber bonus negated; Explosives halved.</li>
              <li><b>Caught in Open (Failure):</b> Full damage taken + <b>-(1 + d4) Org suppression shock</b>.</li>
            </ul>
          </div>

          <!-- Pressure Ratio Formula Card -->
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <span class="text-sky-400 font-bold block">Pressure Ratio &amp; Grazing Casualties</span>
            <div class="p-2.5 rounded bg-slate-900 border border-slate-800 text-center font-mono text-xs sm:text-sm text-slate-200">
              Pressure Ratio = <span class="text-amber-300">Attack Value</span> / <span class="text-sky-300">Defense Value</span>
            </div>
            <ul class="list-disc list-inside text-slate-300 text-[11px] space-y-0.5 font-sans pt-1">
              <li><b>Pressure &lt; 40% (60% in Forts):</b> Completely absorbed (0 damage).</li>
              <li><b>Pressure 40%–50%:</b> 1 chip casualty.</li>
              <li><b>Pressure 50%–75%:</b> 1 + d2 casualties.</li>
              <li><b>Pressure &ge; 75%:</b> 1 + d3 casualties.</li>
            </ul>
          </div>
        </div>

        <div class="p-2.5 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
          <b class="text-amber-300">Bunker &amp; Armor Immunity:</b> Level 5 Deep Bunkers provide <b>100% immunity</b> to all grazing damage. Heavy and Super-Heavy tanks are completely immune to non-explosive small arms fire that fails to pierce.
        </div>
      </div>

      <!-- ==================== PART 5: Y-AXIS DISTANCE & ENGAGEMENT RANGES ==================== -->
      <div id="guide-melee" class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span class="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center font-mono text-sm">5</span>
          <h3 class="font-bold text-base text-white">Y-Axis Distance, Engagement Ranges &amp; Proximity Targeting</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Opposing armies deploy on a spatial Y-axis (+Y for Side A, -Y for Side B, displayed as positive distance from the centerline 0). Total distance between two opposing units is the sum of their positions:
        </p>

        <div class="p-2.5 rounded bg-slate-950 border border-slate-800 text-center font-mono text-xs sm:text-sm text-slate-200">
          Total Engagement Distance = <span class="text-sky-300">Attacker Dist</span> + <span class="text-rose-400">Defender Dist</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-amber-400 font-bold block">1. Terrain Starting Distance</span>
            <p class="text-[11px] text-slate-400 font-sans">
              • <b>Plains / Desert / Urban:</b> 2 per side (Total 4)<br>
              • <b>Forest / Hills / Marsh / Jungle:</b> 3 per side (Total 6)<br>
              • <b>Mountain:</b> 4 per side (Total 8)<br>
              • <b>Artillery:</b> Starts at <b>Terrain Dist + 2</b>
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-sky-400 font-bold block">2. Max Engagement Ranges</span>
            <p class="text-[11px] text-slate-400 font-sans">
              • <b>Zombies / Pure Melee:</b> Total Dist &le; 1<br>
              • <b>Infantry &amp; Armored Veh:</b> Total Dist &le; 2<br>
              • <b>Tanks:</b> Total Dist &le; 3<br>
              • <b>Artillery:</b> Total Dist &le; 6<br>
              • <b>Special Forces / Infiltration:</b> Unlimited
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-emerald-400 font-bold block">3. Movement &amp; Phase Lock</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Out-of-range attackers spend their turn advancing 1 distance closer. Defenders never move. If the attacker has no frontline units in range, the <b>Attacking Phase stays locked</b> until they close into range.
            </p>
          </div>
        </div>

        <div class="p-2.5 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 font-sans">
          <b class="text-rose-400 font-mono">Revamped Melee / Close Combat Trait:</b> Charges <b>2 distance/round</b> when out of range and steps into <b>Total Distance 1</b> after firing. At Total Distance &le; 1, grants <b>+30% Attack, +4 Flat Attack, +4 Piercing</b>, ignores 50% of enemy Entrenchment, and inflicts <b>-20 Return Fire Vigilance &amp; -30% Return Fire Attack</b>.
        </div>
      </div>

      <!-- ==================== PART 6: LOGISTICS & SUPPLY DEPOT ==================== -->
      <div id="guide-logistics" class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center font-mono text-sm">6</span>
          <h3 class="font-bold text-base text-white">Shared Supply Depot, Starvation &amp; Uncontested Lines</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Logistics are centralized into an operational army stockpile. Units draw replacements directly from this shared depot:
        </p>

        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
          <div class="text-amber-300 font-bold">Depot Capacity Formula:</div>
          <div class="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-200 text-xs sm:text-sm">
            Max Depot = <span class="text-white">(100 + Σ Unit Max Supply &times; 0.5)</span> &times; <span class="text-sky-300">(1 + Logistics Lvl &times; 10%)</span> &times; <span class="text-emerald-300">(Logistics Wizard ? 1.25 : 1.0)</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-sky-400 font-bold block">Active Unit Supply Draw</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Units with supply regeneration traits (<i>Logistic Support</i>) draw replenishment points directly from the depot. If depot is 0, supply cannot be regenerated.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-amber-400 font-bold block">Rally Staging Refit</span>
            <p class="text-[11px] text-slate-400 font-sans">
              While resting in the rear, rallying units draw <b>d3 + Traits + Commander Logistics</b> supply points every turn from the depot to restock before returning to the line.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-emerald-400 font-bold block">Uncontested Frontline Rule</span>
            <p class="text-[11px] text-slate-400 font-sans">
              If all enemies are routed or rallying in the rear, holding units stop burning supply, and all combat fatigue and low-supply Org attrition are paused.
            </p>
          </div>
        </div>

        <!-- Deficit Penalties -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
          <div class="p-2 rounded bg-slate-950 border border-yellow-900/40">
            <span class="text-yellow-400 font-bold block">Supply &lt; 50%</span>
            <span class="text-[11px] text-slate-400 font-sans">-10% stats, one-time -(2+d6) Org shock, locks support weapons.</span>
          </div>
          <div class="p-2 rounded bg-slate-950 border border-orange-900/40">
            <span class="text-orange-400 font-bold block">Supply &lt; 20% (Critical)</span>
            <span class="text-[11px] text-slate-400 font-sans">-20% stats, one-time -(3+d10) Org shock, -(1+d3) Org/round continuously.</span>
          </div>
          <div class="p-2 rounded bg-slate-950 border border-rose-900/40">
            <span class="text-rose-400 font-bold block">Supply = 0% (Starvation)</span>
            <span class="text-[11px] text-slate-400 font-sans">-50% stats, -(2+d4) Org/round continuously until destroyed.</span>
          </div>
        </div>
      </div>

      <!-- ==================== PART 7: INHERENT ARTILLERY ==================== -->
      <div id="guide-artillery" class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span class="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 font-bold flex items-center justify-center font-mono text-sm">7</span>
          <h3 class="font-bold text-base text-white">Inherent Artillery Battery Barrages</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Formations categorized as <b>Artillery</b> do not need external traits to conduct fire support missions—the battery barrage is <b>inherent to the unit category</b>:
        </p>
        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
          <div class="text-rose-400 font-bold">Barrage Execution (Every 1+d2 Rounds, Requires &ge; 50% Supply):</div>
          <div class="text-slate-300">• Expends: <b>3 + d3 Supply</b></div>
          <div class="text-slate-300">• Defense Reduction: <b>-(4 + d12)</b></div>
          <div class="text-slate-300">• Hardness Reduction: <b>-(2 + d6)</b></div>
          <div class="text-slate-300">• Direct Impact: Roll 8–10: <b>+d6 casualties</b> | Roll 11–12: <b>+(2+d12) casualties &amp; +(1+d3) disabled armor</b></div>
        </div>
        <p class="text-[11px] text-slate-400 font-sans">
          <i>Note: Non-artillery formations (such as infantry regiments or tank brigades) can still equip the "Heavy Artillery Support" trait to simulate attached off-map corps artillery.</i>
        </p>
      </div>

      <!-- ==================== PART 8: MEDICAL TRIAGE & DOW ==================== -->
      <div id="guide-medical" class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span class="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center font-mono text-sm">8</span>
          <h3 class="font-bold text-base text-white">Medical Triage, Evacuation &amp; Died of Wounds (DOW)</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Starting in <b>Round 4+</b>, untreated wounded personnel (WIA) risk succumbing to trauma, blood loss, and environmental exposure:
        </p>

        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
          <span class="text-teal-300 font-bold block">DOW Mortality Formula</span>
          <div class="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-200 text-xs sm:text-sm">
            DOW Rate = <span class="text-sky-300">clamp</span>(<span class="text-amber-300">Supply Deficit</span> + <span class="text-rose-400">Weather Exposure</span> - <span class="text-emerald-300">Medical Traits</span>, 0, 15)%
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-amber-400 font-bold block">Casualty Recovery (50 + d50)</span>
            <p class="text-[11px] text-slate-400 font-sans">
              When troops are downed in combat, they roll <b>50 + d50 + Modifiers</b>. A score of 75 means 25% KIA (Dead) and 75% WIA (Wounded). High-Caliber imposes -10; Explosives impose -15.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-teal-400 font-bold block">Field Medic Regeneration</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Formations equipped with <i>Field Medic</i> units automatically heal <b>d3 wounded soldiers back to active combat duty</b> every single round.
            </p>
          </div>
        </div>
      </div>

      <!-- ==================== PART 9: RALLYING & ESCAPED STRAGGLERS ==================== -->
      <div id="guide-rally" class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span class="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center font-mono text-sm">9</span>
          <h3 class="font-bold text-base text-white">The Rallying Engine, Rear Staging &amp; Escaped Stragglers</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          When Organization reaches 0, the unit conducts a fighting withdrawal to the rear staging area. Manpower is strictly conserved:
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-cyan-400 font-bold block">1. 25% Scatter &rarr; Escaped</span>
            <p class="text-[11px] text-slate-400 font-sans">
              75% of soldiers fall back in good order; 25% scatter and flee the combat zone entirely. Scattered troops are immediately added to <b>Escaped</b>, ensuring zero ghost casualties.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-emerald-400 font-bold block">2. Turn-by-Turn Reorganization</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Each round in the rear, units regain <b>d3 + Traits + Terrain + Commander Org</b> and draw refit supplies from the depot. Rallied units rejoin the front with full accumulated stamina.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-amber-400 font-bold block">3. 60% Manpower Safety Net</span>
            <p class="text-[11px] text-slate-400 font-sans">
              On the d20 Rally Check vs DC 10: any formation with &ge; 60% personnel remaining <b>never dissolves</b>. Officers delay the rally by 1 round to continue dressing lines.
            </p>
          </div>
        </div>
      </div>

      <!-- ==================== PART 10: POST-BATTLE PURSUIT & SALVAGE ==================== -->
      <div id="guide-pursuit" class="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span class="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center font-mono text-sm">10</span>
          <h3 class="font-bold text-base text-white">Post-Battle Pursuit, Overruns, Towing &amp; Field Salvage</h3>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Once an army is defeated or routed, the victor initiates an operational pursuit phase governed by mobility differentials:
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-purple-400 font-bold block">Automatic Overrun</span>
            <p class="text-[11px] text-slate-400 font-sans">
              If &Delta;Mobility &ge; 3 on open terrain, retreating formations are caught by mechanized vanguards: <b>90% are captured as POWs</b> (unless critical 100 scatter roll).
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-sky-400 font-bold block">Recovery Towing</span>
            <p class="text-[11px] text-slate-400 font-sans">
              On disciplined retreats (Retreat score &ge; 60%), recovery tractors tow <b>25% to 50%</b> of recoverable disabled hulls back to army depots for refitting.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-amber-400 font-bold block">Beutepanzer Salvage</span>
            <p class="text-[11px] text-slate-400 font-sans">
              The victor sweeps the field (Roll 50 + d50). Up to <b>50%</b> of abandoned enemy vehicles are impressed as <i>Beutepanzers</i>; remainder stripped for +5 Supply each.
            </p>
          </div>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span class="text-rose-400 font-bold block">No Quarter Doctrine</span>
            <p class="text-[11px] text-slate-400 font-sans">
              Victorious Monsters or Zombie Swarms take zero prisoners. All captured troops and wounded left on the field are converted directly to <b>KIA (Devoured)</b>.
            </p>
          </div>
        </div>
      </div>

    </div>
  `;
}