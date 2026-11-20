/* ==========================================================================
   IRON DIVISION ENGINE — TRADOC-STYLE SIMULATION FIELD MANUAL
   File: js/guide.js
   ========================================================================== */

window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  function renderSimulationGuide() {
    const container = document.getElementById('view-guide');
    if (!container) return;

    container.innerHTML = `
      <article class="tradoc-doc" aria-label="Iron Division TRADOC Field Manual FM 100-5-ID">
        <!-- Top Classification & Distribution Banner -->
        <div class="tradoc-class-strip">
          <span>UNCLASSIFIED // APPROVED FOR SIMULATION DISTRIBUTION</span>
          <span>TRADOC PUB // FM 100-5-ID (REV 5)</span>
        </div>

        <!-- Official TRADOC Publication Header -->
        <header class="tradoc-header">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="tradoc-mono text-[11px] font-bold uppercase tracking-widest text-[#3a4738]">
                HEADQUARTERS, COMBINED-ARMS SIMULATION COMMAND
              </div>
              <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#141815] mt-1">
                FM 100-5-ID: Combined-Arms Operations
              </h2>
              <p class="text-sm text-[#323a33] max-w-3xl mt-1">
                Technical Field Manual governing division-level polyhedral combat resolution, kinetic armor penetration, Y-axis engagement ranges, shared depot logistics, officer doctrine scaling, and Form DA-774 After-Action Reporting.
              </p>
            </div>
            <div class="tradoc-mono text-[11px] bg-[#faf8f2] border border-[#b5ad98] p-3 text-right shrink-0 space-y-0.5 text-[#1c211d]">
              <div><strong>PUB NO:</strong> FM 100-5-ID</div>
              <div><strong>DOC REF:</strong> DOC-ID-904-REV5</div>
              <div><strong>ENGINE:</strong> v3.1 COMBINED ARMS</div>
              <div><strong>DICE:</strong> d3–d20, d50, d100</div>
            </div>
          </div>

          <div class="tradoc-pub-meta">
            <div><strong>SCOPE:</strong> Battalion to Division TTRPG Resolution</div>
            <div><strong>POOLS:</strong> Decoupled Personnel (HP) vs. Organization (Org)</div>
            <div><strong>STATUS:</strong> Supersedes Rev 4 Overwatch Doctrine</div>
          </div>
        </header>

        <!-- Chapter Index / Table of Contents -->
        <nav class="tradoc-toc" aria-label="Field Manual Chapters">
          <div class="tradoc-mono text-[11px] font-bold uppercase tracking-widest text-[#2f3b2e]">
            TABLE OF CONTENTS // DOCTRINE CHAPTERS
          </div>
          <div class="tradoc-toc-grid">
            <a href="#guide-lifecycle" class="tradoc-toc-link"><span>CH 01</span><span>7-Phase Combat Cycle</span></a>
            <a href="#guide-categories" class="tradoc-toc-link"><span>CH 02</span><span>Categories &amp; Dice</span></a>
            <a href="#guide-armor" class="tradoc-toc-link"><span>CH 03</span><span>Armor &amp; Penetration</span></a>
            <a href="#guide-dispersion" class="tradoc-toc-link"><span>CH 04</span><span>Cover &amp; Grazing</span></a>
            <a href="#guide-melee" class="tradoc-toc-link"><span>CH 05</span><span>Y-Axis Range &amp; Melee</span></a>
            <a href="#guide-logistics" class="tradoc-toc-link"><span>CH 06</span><span>Shared Supply Depot</span></a>
            <a href="#guide-artillery" class="tradoc-toc-link"><span>CH 07</span><span>Inherent Artillery</span></a>
            <a href="#guide-medical" class="tradoc-toc-link"><span>CH 08</span><span>Medical Triage &amp; DOW</span></a>
            <a href="#guide-rally" class="tradoc-toc-link"><span>CH 09</span><span>Rally &amp; Unbreakable</span></a>
            <a href="#guide-commanders" class="tradoc-toc-link"><span>CH 10</span><span>Command HQ &amp; Traits</span></a>
            <a href="#guide-pursuit" class="tradoc-toc-link"><span>CH 11</span><span>Pursuit, Victory &amp; AAR</span></a>
          </div>
        </nav>

        <!-- Manual Body -->
        <div class="tradoc-body">

          <!-- CHAPTER 1 -->
          <section id="guide-lifecycle" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 1</span>
              <h3 class="tradoc-chapter-title">The 7-Phase Combat Round Lifecycle</h3>
            </div>
            <p>
              <span class="tradoc-para-id">1-1.</span>
              Every combat round resolves in seven strict sequential phases. Queued next-round modifiers (such as <em>Delay</em> attack penalties or <em>AA Defense</em> / <em>Shock</em> vigilance penalties) are promoted at round start so they apply consistently across the entire round before resetting cleanly.
            </p>

            <div class="tradoc-grid-4">
              <div class="tradoc-card">
                <span class="tradoc-card-title">Phase 1 // Tactics</span>
                <p>Each side selects 1 of 25 tactical doctrines matching its role. Commander personality (Aggressive, Balanced, Cautious) automates AI selection.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Phase 2 // Upkeep &amp; Rally</span>
                <p>Supply drains, DOW triage resolves, entrenchment builds (+1 lvl/rd), Unbreakable timers tick, and rear units attempt d20 Rally Checks (DC 10).</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Phase 3 // Recon Contest</span>
                <p>Contested <strong>d100 + Vigilance</strong> roll. Victory margin divided by 10 awards a flat stat boost and targeting priority.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Phase 4 // Fire Support</span>
                <p>Mortars, inherent Artillery batteries, and Air Support strike enemy formations. Enemy AA Defense and AA Guns intercept flights.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Phase 5 // Main Assault</span>
                <p>Units outside range advance along the Y-axis. Units in range acquire targets by Target Value, check AP vs. Hardness or Cover, and resolve clash casualties.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Phase 6 // Return Fire</span>
                <p>In-range defenders contest Return Fire Vigilance and counter-engage the attacker's Breakthrough/Defense, or inflict grazing fire.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Phase 7 // Initiative Swap</span>
                <p>Tactical initiative flips unless locked by out-of-range advancing units. Theatre Role (Invader vs. Entrenched Garrison) remains static.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Post-Op // Pursuit &amp; AAR</span>
                <p>Mobility pursuit resolves overruns, towing, and Beutepanzer salvage, then compiles the Form DA-774 After-Action Report.</p>
              </div>
            </div>

            <div class="tradoc-formula">
              <span class="tradoc-formula-label">Equation 1-1 // Dynamic Target Value (TV)</span>
              TV = [ (Size &amp; Armor + Threat Score + Org &amp; Kill Priority) &times; Category Mult + Entrenchment Mod + Frontliner (+200) ] &times; Distance Mult
            </div>
            <p>
              <span class="tradoc-para-id">1-2.</span>
              <strong>Kill Priority &amp; Screening:</strong> Formations below 35% Org gain +150 TV (+250 below 15%). Artillery (&times;1.35) and Tanks (&times;1.25) draw heavier fire than Infantry (&times;1.00), while active <em>Frontliner / Defender</em> units act as a +200 TV screening magnet.
            </p>
          </section>

          <!-- CHAPTER 2 -->
          <section id="guide-categories" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 2</span>
              <h3 class="tradoc-chapter-title">Unit Categories, Polyhedral Dice &amp; Mobility Classes</h3>
            </div>
            <p>
              <span class="tradoc-para-id">2-1.</span>
              Formations are classified into four tactical branches. Each branch determines assault/defense polyhedral dice, baseline speed class (0–5), and inherent weapon properties.
            </p>

            <div class="overflow-x-auto">
              <table class="tradoc-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Attack Die</th>
                    <th>Defense Die</th>
                    <th>Speed Class</th>
                    <th>Pur / Ret</th>
                    <th>Inherent Doctrinal Rule</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="tradoc-mono font-bold">INFANTRY</td>
                    <td class="tradoc-mono font-bold">d12</td>
                    <td class="tradoc-mono font-bold">d12</td>
                    <td class="tradoc-mono">Class 1 (Spec: 2)</td>
                    <td class="tradoc-mono">+0 / +0</td>
                    <td>Rolls Dispersion/Cover Saves instead of AP checks; ignores 35% tank Hardness in close terrain.</td>
                  </tr>
                  <tr>
                    <td class="tradoc-mono font-bold">ARMORED VEHICLE</td>
                    <td class="tradoc-mono font-bold">d16</td>
                    <td class="tradoc-mono font-bold">d16</td>
                    <td class="tradoc-mono">Class 4–5</td>
                    <td class="tradoc-mono">+20 / +20</td>
                    <td>Inherently equipped with High-Caliber armament; excels at mobile pursuit and withdrawal.</td>
                  </tr>
                  <tr>
                    <td class="tradoc-mono font-bold">TANK</td>
                    <td class="tradoc-mono font-bold">d20</td>
                    <td class="tradoc-mono font-bold">d20</td>
                    <td class="tradoc-mono">Class 3–4</td>
                    <td class="tradoc-mono">+10 / +10</td>
                    <td>Inherently equipped with High-Caliber armament; Heavy/Super-Heavy hulls resist non-AT small arms.</td>
                  </tr>
                  <tr>
                    <td class="tradoc-mono font-bold">ARTILLERY</td>
                    <td class="tradoc-mono font-bold">d20</td>
                    <td class="tradoc-mono font-bold">d8</td>
                    <td class="tradoc-mono">Class 0 (Towed)</td>
                    <td class="tradoc-mono">+0 / +0</td>
                    <td>Inherent Battery Barrage &amp; Explosive Ordnance; fragile in direct fire and vulnerable to overruns.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- CHAPTER 3 -->
          <section id="guide-armor" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 3</span>
              <h3 class="tradoc-chapter-title">Armor Classes, Dynamic Hardness &amp; Penetration</h3>
            </div>
            <p>
              <span class="tradoc-para-id">3-1.</span>
              Armored formations partition incoming firepower into Hard and Soft shares: <strong>Unarmored</strong> (0/100), <strong>Light</strong> (25/75), <strong>Medium</strong> (50/50), <strong>Heavy</strong> (75/25), and <strong>Super Heavy</strong> (100/0). As vehicles are knocked out, effective hardness and hard-target ratio degrade proportionally.
            </p>

            <div class="tradoc-formula">
              <span class="tradoc-formula-label">Equation 3-1 // Dynamic Hardness &amp; Penetration Overmatch</span>
              Effective Hardness = max(0, (Base Hardness + Unit Traits + Cmd Traits) &times; clamp(Cur Armor / Max Armor, 0.25, 1.0) - Maluses)<br>
              Overmatch Margin = (d6 + Effective Piercing - (d6 + Effective Hardness)) / max(1, Effective Hardness)
            </div>

            <div class="tradoc-grid-4">
              <div class="tradoc-card">
                <span class="tradoc-card-title">Margin &le; 0.25</span>
                <p>Minor breach: <strong>d3</strong> vehicles disabled.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">0.25 &lt; Margin &le; 0.50</span>
                <p>Moderate breach: <strong>1 + d6</strong> vehicles disabled.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">0.50 &lt; Margin &le; 0.75</span>
                <p>Severe overmatch: <strong>3 + d8</strong> vehicles disabled.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Margin &gt; 0.75</span>
                <p>Catastrophic hit: <strong>6 + d12</strong> vehicles disabled.</p>
              </div>
            </div>

            <div class="tradoc-note">
              <strong>NOTE // CLOSE-ASSAULT BYPASS:</strong> Attacking infantry in Urban, Forest, Jungle, or Mountain sectors bypass <strong>35%</strong> of enemy vehicle Hardness. Unpierced hits still apply Soft share + 20% Hard concussive bleed-through + 2 chip damage. Destroyed hulls inflict <strong>1 + d4</strong> crew losses; recoverable hulls inflict <strong>d2</strong>.
            </div>
          </section>

          <!-- CHAPTER 4 -->
          <section id="guide-dispersion" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 4</span>
              <h3 class="tradoc-chapter-title">Infantry Dispersion, Cover Saves &amp; Grazing Immunity</h3>
            </div>
            <p>
              <span class="tradoc-para-id">4-1.</span>
              Unarmored infantry bypasses kinetic armor checks and instead rolls an <strong>Entrenchment &amp; Dispersion Save</strong> to seek defilade against incoming fire.
            </p>

            <div class="tradoc-grid-2">
              <div class="tradoc-formula">
                <span class="tradoc-formula-label">Equation 4-1 // Cover &amp; Dispersion Save</span>
                d20 + Terrain Cover + Entrenchment Lvl &ge; DC (12 + Attacker Spotting)<br>
                <span class="text-[11px] text-[#3a4439]">Pass: Half soft dmg, High-Caliber negated, Explosives halved. Fail: Full dmg + -(1+d4) Org shock.</span>
              </div>
              <div class="tradoc-formula">
                <span class="tradoc-formula-label">Equation 4-2 // Non-Breakthrough Pressure Ratio</span>
                Pressure = Attack Value / max(1, Defense Value)<br>
                <span class="text-[11px] text-[#3a4439]">&lt;40% (60% Fort): 0 dmg | 40–50%: 1 | 50–75%: 1+d2 | &ge;75%: 1+d3 (minus Fort/Entrench mitigation).</span>
              </div>
            </div>

            <div class="tradoc-note">
              <strong>NOTE // COMPLETE IMMUNITY:</strong> Level 5 Deep Bunkers grant 100% immunity to grazing casualties. Medium, Heavy, and Super-Heavy tanks are completely immune to non-penetrating small arms lacking High-Caliber or Explosive ordnance.
            </div>
          </section>

          <!-- CHAPTER 5 -->
          <section id="guide-melee" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 5</span>
              <h3 class="tradoc-chapter-title">Y-Axis Spatial Distance, Engagement Ranges &amp; Melee Rush</h3>
            </div>
            <p>
              <span class="tradoc-para-id">5-1.</span>
              Opposing forces deploy along a shared spatial Y-axis (+Y for BLUEFOR, -Y for OPFOR). Engagement eligibility is determined by summing both units' distances from the line of contact.
            </p>

            <div class="tradoc-formula">
              <span class="tradoc-formula-label">Equation 5-1 // Total Engagement Distance</span>
              Total Engagement Distance = Attacker Position (Dist) + Defender Position (Dist)
            </div>

            <div class="tradoc-grid-3">
              <div class="tradoc-card">
                <span class="tradoc-card-title">5-2. Starting Positions</span>
                <p><strong>Plains / Desert / Urban:</strong> 2 per side<br>
                <strong>Forest / Hills / Marsh / Jungle:</strong> 3 per side<br>
                <strong>Mountain:</strong> 4 per side (Road -1; River/Amphib +1)<br>
                <strong>Artillery:</strong> Terrain Base + 2</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">5-3. Max Firing Ranges</span>
                <p><strong>Zombies / Pure Melee:</strong> Total Dist &le; 1<br>
                <strong>Infantry &amp; Armored Veh:</strong> Total Dist &le; 2<br>
                <strong>Tanks:</strong> Total Dist &le; 3<br>
                <strong>Artillery:</strong> Total Dist &le; 6<br>
                <strong>Spec Ops / Infiltration:</strong> Unlimited</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">5-4. Advance &amp; Melee Rush</span>
                <p>Out-of-range attackers advance 1 distance/rd (2/rd for <em>Melee</em> when dist &gt; 2) and reset entrenchment. Initiative stays locked until frontline units enter range. At Dist &le; 1, <em>Melee</em> gains +30% Atk, +4 Flat Atk, 50% Entrenchment bypass, and disrupts Return Fire (-20 Vig / -30% Atk).</p>
              </div>
            </div>
          </section>

          <!-- CHAPTER 6 -->
          <section id="guide-logistics" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 6</span>
              <h3 class="tradoc-chapter-title">Shared Army Supply Depot &amp; Combat Fatigue</h3>
            </div>
            <p>
              <span class="tradoc-para-id">6-1.</span>
              Each side maintains a centralized Army Supply Depot feeding both active logistics traits and rear-area rally refits. When an opposing frontline is completely empty (all enemies routed or rallying), supply burn and fatigue pause automatically.
            </p>

            <div class="tradoc-formula">
              <span class="tradoc-formula-label">Equation 6-1 // Army Depot Capacity &amp; Unit Max Supply</span>
              Max Depot = (100 + &Sigma; Unit Max Supply &times; 0.5) &times; (1 + Cmd Logistics Lvl &times; 10%) &times; (Logistics Wizard ? 1.25 : 1.0)<br>
              Unit Max Supply = round(Template Supply &times; (1 + Cmd Logistics Lvl &times; 2.5%) &times; (Logistics Wizard ? 1.10 : 1.0))
            </div>

            <div class="tradoc-grid-3">
              <div class="tradoc-card">
                <span class="tradoc-card-title">Low Supply (&lt; 50%)</span>
                <p>-10% combat stats, one-time -(2+d6) Org shock, locks support weapons.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Critical (&lt; 20% / 0%)</span>
                <p>&lt;20%: -20% stats, -(3+d10) shock, -(1+d3) Org/rd. At 0%: -50% stats, -(2+d4) Org/rd.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Combat Fatigue</span>
                <p>Rounds 1–5: 0 Org/rd. Rounds 6–12: -1 Org/rd. Rounds 13+: -2 Org/rd (rallying units exempt).</p>
              </div>
            </div>
          </section>

          <!-- CHAPTER 7 -->
          <section id="guide-artillery" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 7</span>
              <h3 class="tradoc-chapter-title">Inherent Artillery Barrages &amp; Off-Map Fire Support</h3>
            </div>
            <p>
              <span class="tradoc-para-id">7-1.</span>
              Units in the <strong>Artillery</strong> category execute inherent battery barrages without requiring external support traits (Cooldown: 1+d2 rounds, Cost: 3+d3 Supply, requires &ge; 50% Supply):
            </p>
            <div class="tradoc-grid-2">
              <div class="tradoc-card">
                <span class="tradoc-card-title">Artillery &amp; Mortar Fire</span>
                <p><strong>Artillery:</strong> Enemy Def -(4+d12), Hardness -(2+d6), d2 armor disabled; d12 roll 8–10 adds +d6 cas, 11–12 adds +(2+d12) cas &amp; +(1+d3) armor.<br>
                <strong>Mortars:</strong> Infantry Def -(3+d6), cover denied, 1+d4 cas, -d3 Org. Armor takes 0 Hardness loss, Def -(1+d3), d6=5 optics (-15 Vig), d6=6 track blown (-2 Mobility).</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Air Support &amp; AA Interception</span>
                <p><strong>Airstrike (5+d4 Sup, CD 2+d2):</strong> Enemy Def -(6+d20), Hardness -(4+d10), scaled casualties/armor on d20 &ge; 10.<br>
                <strong>AA Defense / AA Gun:</strong> Reduces strike damage by 4+d6 / 4+d8. AA Gun roll 8 disables enemy air support for the remainder of the battle.</p>
              </div>
            </div>
          </section>

          <!-- CHAPTER 8 -->
          <section id="guide-medical" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 8</span>
              <h3 class="tradoc-chapter-title">Medical Triage &amp; Died of Wounds (DOW)</h3>
            </div>
            <p>
              <span class="tradoc-para-id">8-1.</span>
              Personnel casualties roll <strong>50 + d50 + Modifiers</strong> (clamped 5%–95%) to separate KIA from WIA. Starting in <strong>Round 4</strong>, untreated WIA risk succumbing to Died of Wounds (DOW) via fractional probability (preventing forced casualties on small squads).
            </p>
            <div class="tradoc-formula">
              <span class="tradoc-formula-label">Equation 8-1 // Round 4+ DOW Mortality Rate</span>
              DOW Rate = clamp(Supply Deficit (0–10%) + Weather Exposure (0–3%) - First Aid Kit (4%) - Field Medic (3%), 0%, 15%)
            </div>
          </section>

          <!-- CHAPTER 9 -->
          <section id="guide-rally" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 9</span>
              <h3 class="tradoc-chapter-title">Rallying Engine, Manpower Safety Net &amp; Unbreakable</h3>
            </div>
            <p>
              <span class="tradoc-para-id">9-1.</span>
              When Organization reaches 0, eligible formations withdraw to the rear staging queue for <strong>2 + d2 Rounds</strong> (minus Commander cooldown reductions). 25% of remaining troops scatter cleanly into the <strong>Escaped</strong> pool (zero ghost casualties); 75% regroup and draw depot supplies each turn.
            </p>
            <div class="tradoc-grid-3">
              <div class="tradoc-card">
                <span class="tradoc-card-title">d20 Rally Check (DC 10)</span>
                <p>Rolls d20 + Exp + Cmd + Frontline (+2/-3) + Manpower/Supply/Armor thresholds + Determination. Crit 1 always shatters.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">60% Safety Net &amp; Shield</span>
                <p>Formations with &ge;60% manpower never dissolve on a normal failed rally (+1 rd delay). Units &ge;75% manpower gain +1 passive Org regen and -2 chip Org dmg.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Unbreakable Last Stand</span>
                <p>Units with <em>Unbreakable</em> fight on for <strong>2 full rounds</strong> at 0 Org (-25% stats) before triggering rally or collapsing cleanly.</p>
              </div>
            </div>
          </section>

          <!-- CHAPTER 10 -->
          <section id="guide-commanders" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 10</span>
              <h3 class="tradoc-chapter-title">Command HQ Attributes &amp; Generic Commander Traits</h3>
            </div>
            <p>
              <span class="tradoc-para-id">10-1.</span>
              Commanders scale four core division attributes at <strong>+2.5% per level</strong> (Levels 0–10: Attack, Defense, Max Org, and Max Supply). All 21 numeric fields on built-in and custom Commander Traits are wired generically across eligible formations (respecting Formation Scope) and can be edited or deleted directly from the <strong>Command HQ</strong> tab.
            </p>
            <div class="tradoc-grid-3">
              <div class="tradoc-card">
                <span class="tradoc-card-title">Firepower &amp; Armor</span>
                <p>Attack %, Defense %, Flat Atk/Def, Soft/Hard Attack, Piercing, and Hardness apply automatically in both Main Assault and Return Fire.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Recon, Tactics &amp; Chase</span>
                <p>Vigilance, Pursuit, and Retreat bonuses integrate directly into recon and pursuit math. <strong>Tactic Boost %</strong> scales positive tactical doctrine bonuses.</p>
              </div>
              <div class="tradoc-card">
                <span class="tradoc-card-title">Logistics, Triage &amp; Rally</span>
                <p>Supply Drain Cut, +10% Max Supply (<em>Logistics Wizard</em>), Personnel/Armor Recovery, Rally Roll, Cooldown Cut, and Extra Rallied Org apply cleanly with zero double-counting.</p>
              </div>
            </div>
          </section>

          <!-- CHAPTER 11 -->
          <section id="guide-pursuit" class="tradoc-chapter">
            <div class="tradoc-chapter-head">
              <span class="tradoc-chapter-num">CHAPTER 11</span>
              <h3 class="tradoc-chapter-title">Post-Battle Pursuit, Degrees of Victory &amp; Form DA-774 AAR</h3>
            </div>
            <p>
              <span class="tradoc-para-id">11-1.</span>
              Once one side loses all active and rallying capacity, the victor executes a mobility pursuit phase. Disciplined withdrawals (Escape &ge; 60%) tow <strong>25%–50%</strong> of recoverable disabled hulls back to depot, deducting them from the battlefield before the victor rolls proportional salvage (<strong>50 + d50</strong>, +15 with Engineers/Repair Crew) on the remaining abandoned hulls.
            </p>

            <div class="tradoc-caution">
              <strong>CAUTION // NO QUARTER DOCTRINE:</strong> Victorious Monsters or Zombie Swarms take zero prisoners—all captured and wounded human personnel are converted directly to KIA, and abandoned vehicles are crushed into scrap.
            </div>

            <div class="tradoc-formula">
              <span class="tradoc-formula-label">Equation 11-1 // Victory Degree Odds Ratio &amp; Composite Cost %</span>
              Force Power = Start Personnel + (Start Armor &times; 15) &nbsp;|&nbsp; Odds Ratio = Winner Power / max(1, Loser Power)<br>
              Composite Cost % = round((0.60 &times; Personnel Loss % + 0.25 &times; Armor Loss % + 0.15 &times; Supply Expended %) &times; 100)
            </div>

            <div class="overflow-x-auto">
              <table class="tradoc-table">
                <thead>
                  <tr>
                    <th>Degree of Victory</th>
                    <th>Classification Criteria</th>
                    <th>Operational Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="tradoc-mono font-bold">HEROIC VICTORY</td>
                    <td class="tradoc-mono">Odds &le; 0.80 &amp; Cost &le; 35% (or Odds &le; 0.65 &amp; Cost &le; 45%)</td>
                    <td>Won against unfavorable odds while keeping overall force attrition relatively light.</td>
                  </tr>
                  <tr>
                    <td class="tradoc-mono font-bold">DECISIVE VICTORY</td>
                    <td class="tradoc-mono">Cost &le; 25%, Pers Loss &le; 25%, and 0 formations lost</td>
                    <td>Clean victory with low casualties and every friendly formation intact.</td>
                  </tr>
                  <tr>
                    <td class="tradoc-mono font-bold">CLOSE VICTORY</td>
                    <td class="tradoc-mono">All remaining contested wins</td>
                    <td>Hard-fought engagement with noticeable casualties, supply burn, or formation losses.</td>
                  </tr>
                  <tr>
                    <td class="tradoc-mono font-bold">PYRRHIC VICTORY</td>
                    <td class="tradoc-mono">Cost &ge; 55%, Pers Loss &ge; 60%, or &ge; 50% formations lost</td>
                    <td>Objective secured at severe cost, leaving the winning army heavily damaged.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              <span class="tradoc-para-id">11-2.</span>
              <strong>Official AAR Export (Form DA-774):</strong> Open <strong>AAR // REPORT</strong> at any time to review the emoji-free 5-section After-Action Report (Executive Summary, ORBAT Casualty Ledgers, Salvage, Significant Chronology, and G-3 Assessment) and click <strong>DOWNLOAD OFFICIAL AAR (PDF)</strong> to print or save a formatted A4 military dossier.
            </p>
          </section>

        </div>

        <!-- Official Publication Footer -->
        <footer class="tradoc-footer">
          <span>BY ORDER OF COMBINED-ARMS SIMULATION COMMAND</span>
          <span>FM 100-5-ID // END OF FIELD MANUAL</span>
        </footer>
      </article>
    `;
  }

  // Attach to IronDivision namespace
  ID.Guide = {
    renderSimulationGuide
  };

  // Backwards-compatible binding on window
  window.renderSimulationGuide = renderSimulationGuide;

})(window.IronDivision);