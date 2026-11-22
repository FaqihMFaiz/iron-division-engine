/* ==========================================================================
   IRON DIVISION ENGINE — MANILA FOLDER FIELD & TECHNICAL MANUALS
   File: js/guide.js
   ========================================================================== */

window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  let activeGuidePage = 'boot';

  function switchGuidePage(pageKey) {
    activeGuidePage = pageKey === 'tech' ? 'tech' : 'boot';
    const bootPane = document.getElementById('guide-pane-boot');
    const techPane = document.getElementById('guide-pane-tech');
    const bootTab = document.getElementById('guide-tab-boot');
    const techTab = document.getElementById('guide-tab-tech');

    if (bootPane) bootPane.classList.toggle('hidden', activeGuidePage !== 'boot');
    if (techPane) techPane.classList.toggle('hidden', activeGuidePage !== 'tech');
    if (bootTab) {
      bootTab.classList.toggle('is-active', activeGuidePage === 'boot');
      bootTab.setAttribute('aria-selected', activeGuidePage === 'boot' ? 'true' : 'false');
    }
    if (techTab) {
      techTab.classList.toggle('is-active', activeGuidePage === 'tech');
      techTab.setAttribute('aria-selected', activeGuidePage === 'tech' ? 'true' : 'false');
    }
  }

  function renderSimulationGuide() {
    const container = document.getElementById('view-guide');
    if (!container) return;

    container.innerHTML = `
      <div class="manila-folder-shell max-w-[1060px] mx-auto">
        <!-- Protruding Manila File Folder Tabs -->
        <div class="manila-tabs-bar" role="tablist" aria-label="Manual Dossier Folder Tabs">
          <button type="button" id="guide-tab-boot" role="tab" aria-selected="${activeGuidePage === 'boot' ? 'true' : 'false'}" onclick="switchGuidePage('boot')" class="manila-folder-tab ${activeGuidePage === 'boot' ? 'is-active' : ''}">
            <span class="manila-tab-code">TAB A // FM 100-5-BOOT</span>
            <span class="manila-tab-label">DRILL SERGEANT GUIDE</span>
          </button>
          <button type="button" id="guide-tab-tech" role="tab" aria-selected="${activeGuidePage === 'tech' ? 'true' : 'false'}" onclick="switchGuidePage('tech')" class="manila-folder-tab ${activeGuidePage === 'tech' ? 'is-active' : ''}">
            <span class="manila-tab-code">TAB B // TM 9-1005-TECH</span>
            <span class="manila-tab-label">TECHNICAL MANUAL</span>
          </button>
        </div>

        <!-- Folder Body -->
        <div class="manila-folder-body">
          <div id="guide-pane-boot" class="${activeGuidePage === 'boot' ? '' : 'hidden'}">
            <article class="tradoc-doc" aria-label="Iron Division Drill Sergeant Field Manual FM 100-5-BOOT">
        <!-- Top Classification & Distribution Banner -->
        <div class="tradoc-class-strip">
          <span>UNCLASSIFIED // MANDATORY READING FOR NEW RECRUITS &amp; GAME MASTERS</span>
          <span>TRADOC PUB // FM 100-5-BOOT (DRILL SGT EDITION)</span>
        </div>

        <!-- Official TRADOC Publication Header -->
        <header class="tradoc-header">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="tradoc-mono text-[11px] font-bold uppercase tracking-widest text-[#3a4738]">
                HEADQUARTERS, IRON DIVISION TRAINING &amp; DOCTRINE COMMAND
              </div>
              <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#141815] mt-1">
                FM 100-5-BOOT: STOP GUESSING AND READ THE MANUAL
              </h2>
              <p class="text-sm text-[#323a33] max-w-3xl mt-1">
                Listen up, recruit! Never played a grand-strategy wargame or Hearts of Iron in your life? Good — at least you don't have bad habits yet. This manual explains every single button, number, and dirty trick in Iron Division, and more importantly, <strong>what real-world battlefield reality each rule translates from</strong>.
              </p>
            </div>
            <div class="tradoc-mono text-[11px] bg-[#faf8f2] border border-[#b5ad98] p-3 text-right shrink-0 space-y-1 text-[#1c211d]">
              <div><strong>PUB NO:</strong> FM 100-5-BOOT</div>
              <div><strong>AUTHOR:</strong> SGM IRONCLAD (RET.)</div>
              <div><strong>ENGINE:</strong> IRON DIVISION v3.0</div>
              <button type="button" onclick="openWelcomeModal(true)" class="mt-1 px-2 py-0.5 bg-[#1b221c] text-[#e0be6a] border border-[#4d4224] text-[10px] font-bold uppercase">
                RE-OPEN BRIEFING POP-UP
              </button>
            </div>
          </div>

          <!-- Quick Jump Table of Contents -->
          <div class="mt-4 pt-3 border-t border-[#c9c1ab] flex flex-wrap gap-2 tradoc-mono text-[10.5px]">
            <a href="#fm-ch1" class="px-2 py-1 bg-[#f0ead9] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#e5dcc5] font-bold">01. WHAT IS THIS?</a>
            <a href="#fm-ch2" class="px-2 py-1 bg-[#f0ead9] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#e5dcc5] font-bold">02. THEATRE BAR &amp; CLOCK</a>
            <a href="#fm-ch3" class="px-2 py-1 bg-[#f0ead9] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#e5dcc5] font-bold">03. UNIT STATS &amp; DOG TAGS</a>
            <a href="#fm-ch4" class="px-2 py-1 bg-[#f0ead9] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#e5dcc5] font-bold">04. HOW A ROUND WORKS</a>
            <a href="#fm-ch5" class="px-2 py-1 bg-[#f0ead9] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#e5dcc5] font-bold">05. RANGE, ROUTING &amp; COMMAND</a>
            <a href="#fm-ch6" class="px-2 py-1 bg-[#f0ead9] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#e5dcc5] font-bold">06. CUSTOMIZING YOUR WAR</a>
          </div>
        </header>

        <div class="tradoc-body space-y-6">

          <!-- ==================== CHAPTER 1 ==================== -->
          <section id="fm-ch1" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 01 // WHAT THE HELL IS THIS SIMULATOR?</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">1-1.</span>
              <strong>Drop the arcade mindset right now.</strong> In a video game shooter, a soldier runs around at 1 HP like nothing happened until a final bullet deletes him. Real war does not work like that. Real formations break because their radios go dead, their ammunition runs dry, artillery pins them in the mud, or half their buddies just got hit and nobody wants to stand up anymore.
            </p>
            <p class="tradoc-para">
              <span class="tradoc-para-id">1-2.</span>
              <strong>Iron Division</strong> is a tabletop-RPG (TTRPG) operational combat simulator. You put two opposing armies on the screen (by default, the historical <strong>Battle of San Marino</strong> on 17 September 1944 — the British Indian Army assaulting the Wehrmacht), set the dirt, weather, and clock, assign generals, and press <strong>EXECUTE ROUND</strong>. The engine rolls polyhedral dice under the hood, tracks every dead, wounded, captured, and knocked-out tank, logs every event like a real Army Sitrep (Form DA-1594), and spits out a printable After-Action Report (Form DA-774) when the smoke clears.
            </p>
            <div class="tradoc-callout">
              <strong>DRILL SERGEANT'S GOLDEN RULE:</strong> Battles are NOT won by killing 100% of the enemy. Battles are won by shattering the enemy's <strong>Organization (ORG)</strong>, starving their <strong>Supply</strong>, and forcing them off the field while keeping your own boys intact.
            </div>
          </section>

          <!-- ==================== CHAPTER 2 ==================== -->
          <section id="fm-ch2" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 02 // WHAT IS THE THEATRE SETTINGS BAR?</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">2-1.</span>
              Look at the top box on the Battlefield tab labeled <strong>THEATRE COMMAND &amp; ENVIRONMENT</strong>. That box is Mother Nature and High Command combined. You can collapse it anytime with <strong>COLLAPSE</strong>, but before you fire a single shot, here is what every knob in that bar actually does:
            </p>

            <table class="tradoc-table">
              <thead>
                <tr>
                  <th>Control</th>
                  <th>What It Does in the Sim</th>
                  <th>Real-Life Battlefield Reality</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Base Terrain</strong></td>
                  <td>Sets attack/defense bonuses per unit type, Vigilance, Supply drain, <strong>Max Dig-In</strong>, and <strong>Max Outnumber Cap</strong>.</td>
                  <td>Tanks love open Plains and hate Mountain passes. A narrow city street or mountain ridge physically stops 10,000 men from all shooting at once — that is why Urban caps outnumbering at +40% and Mountain at +35%.</td>
                </tr>
                <tr>
                  <td><strong>Terrain Feature</strong></td>
                  <td>Applies a multiplicative modifier (Roads, Small/Large Rivers, Amphibious Landings, Fortified Strongpoints).</td>
                  <td>Crossing a wide river under machine-gun fire is suicide unless you bring <strong>Marines</strong> or engineers. Concrete bunkers (Fort) multiply defender strength and raise how deep they can dig in.</td>
                </tr>
                <tr>
                  <td><strong>Weather &amp; DYN</strong></td>
                  <td>Modifies Attack, Defense, Vigilance, Supply burn, and <strong>Air Support Efficiency</strong>. Check <strong>DYN</strong> to let weather shift every 3 rounds.</td>
                  <td>Airplanes do not fly bombing runs cleanly through pea-soup fog or torrential storms — in Foggy or Heavy Rain, airstrikes lose 50-60% power and can be completely <strong>grounded</strong>.</td>
                </tr>
                <tr>
                  <td><strong>Theatre Role</strong></td>
                  <td>Locks which side is assaulting into fortifications/rivers and which side is entrenched.</td>
                  <td>Even if the defender launches a local counter-punch for one round, they are still the ones holding the bunkers and riverbanks.</td>
                </tr>
                <tr>
                  <td><strong>Surprise Rd 1</strong></td>
                  <td>Gives the opening attacker a shock advantage on Round 1.</td>
                  <td>Catching the enemy with their boots off before the sentries can sound the alarm.</td>
                </tr>
                <tr>
                  <td><strong>Date, 24H Clock &amp; Round Length</strong></td>
                  <td>Sets the exact Date, 24-hour time, and how many <strong>Minutes, Hours, or Days</strong> each round advances. Automatically drives <strong>Dawn (05-06), Daylight (07-17), Dusk (18-19), and Night (20-04)</strong> plus the <strong>1st/2nd/3rd Day</strong> counter (flips after 24:00).</td>
                  <td>Fighting at 22:00 at night is NOT the same as fighting at noon. Darkness blinds optics, boosts ambushes, grounds close air support, and shrinks how far units can spot targets. Your printable AAR records this exact operational clock.</td>
                </tr>
              </tbody>
            </table>

            <p class="tradoc-para mt-3">
              <span class="tradoc-para-id">2-2.</span>
              <strong>Compound Hazards (When Terrain &amp; Weather Team Up to Ruin Your Day):</strong> Certain combinations trigger red <strong>HAZARD</strong> alerts automatically:
            </p>
            <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
              <li><strong>MUD / RASPUTITSA</strong> <em>(Heavy Rain on Plains/Forest/Hills/Marsh/Road)</em>: Tanks bog down in knee-deep mud (-1 to -2 mobility), supply trucks get stuck (+2 Supply drain), and recovering knocked-out tanks gets brutally hard.</li>
              <li><strong>ZERO VISIBILITY</strong> <em>(Foggy anywhere, or Night in Urban/Forest/Jungle)</em>: Caps direct-fire sight range to 3-4 distance bands and hits Vigilance (-15) unless you brought Recon or Concealment specialists.</li>
              <li><strong>DEEP FREEZE</strong> <em>(Snowy on Mountain/Hills/Plains)</em>: Wounded men freeze (+3% Died-of-Wounds mortality), supply burns faster, and low-supply tanks risk frozen engine breakdowns.</li>
              <li><strong>HEATSTROKE / DUST</strong> <em>(Heat Waves in Desert)</em>: Infantry burn extra water/supply and lose Org to heat exhaustion; dust storms blind tank and artillery optics (-15 Vigilance).</li>
            </ul>
          </section>

          <!-- ==================== CHAPTER 3 ==================== -->
          <section id="fm-ch3" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 03 // UNIT STATS &amp; DOG TAGS (WHAT ALL THOSE NUMBERS MEAN)</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">3-1.</span>
              Every unit on the Battlefield has its name stamped onto a steel <strong>Soldier's Dog Tag</strong>, with a NATO military symbol on the left and its <strong>Experience Rank Insignia</strong> on the right (blank for Green rookies up to a Star for Elite killers — hover the card to see every deep stat). Here is what each number actually means in real combat:
            </p>

            <table class="tradoc-table">
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>Plain-English Translation</th>
                  <th>Why It Exists in Real Life</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Personnel (PERS / HP)</strong></td>
                  <td>Living, breathing troops still able to pull a trigger. Split into Active, WIA (Wounded), KIA (Dead), and POW (Captured).</td>
                  <td>Lose men and your firepower drops. Wounded men can die later (DOW) if your supply runs out and you have no Medics or First Aid Kits.</td>
                </tr>
                <tr>
                  <td><strong>Organization (ORG)</strong></td>
                  <td>Morale, cohesion, chain of command, and nerve. Blue bar on every unit card.</td>
                  <td>When ORG hits <strong>0</strong>, the unit breaks and routs — even if 70% of the men are still alive. Real regiments stop fighting when their officers are down and squads are scattered, not when the last man dies.</td>
                </tr>
                <tr>
                  <td><strong>Supply (SUP) &amp; Depot</strong></td>
                  <td>Ammunition, rations, fuel, and medical kits (Yellow bar). Logistics traits pull fresh supply from your side's shared <strong>Supply Depot</strong>.</td>
                  <td>An army marches on its stomach and shoots with its ammo trucks. Drop below 50% supply and your combat power craters; hit 0% and your men starve and collapse (-50% stats + continuous Org loss).</td>
                </tr>
                <tr>
                  <td><strong>Soft Attack</strong></td>
                  <td>Firepower against <strong>unarmored targets</strong> (rifles, machine guns, high-explosive shells, grenades).</td>
                  <td>A machine gun shreds infantry in the open, but it cannot scratch a 40-ton steel tank. That's Soft Attack.</td>
                </tr>
                <tr>
                  <td><strong>Hard Attack</strong></td>
                  <td>Firepower against <strong>armored vehicles &amp; tanks</strong> (anti-tank cannons, bazookas, armor-piercing shells).</td>
                  <td>High-velocity tungsten and shaped-charge rounds built to punch through steel hulls and cook off ammunition racks.</td>
                </tr>
                <tr>
                  <td><strong>Piercing vs. Hardness</strong></td>
                  <td><strong>Hardness</strong> is how thick your armor is. <strong>Piercing</strong> is how much steel the shooter's gun can punch through.</td>
                  <td>If your Piercing beats the enemy's Hardness, you penetrate cleanly. If you FAIL to pierce a heavy tank, your rounds ricochet off the glacis plate for drastically reduced damage.</td>
                </tr>
                <tr>
                  <td><strong>Defense &amp; Dig-In</strong></td>
                  <td>How well a unit avoids taking clean hits. Defending units automatically dig deeper trenches (<strong>Dig-In</strong>) every round they hold still.</td>
                  <td>A rifleman lying in a dug-in foxhole with overhead log cover is five times harder to kill than a rifleman jogging across a wheat field.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- ==================== CHAPTER 4 ==================== -->
          <section id="fm-ch4" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 04 // HOW A SINGLE ROUND PLAYS OUT (STEP-BY-STEP)</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">4-1.</span>
              Every time you slam that big brass <strong>EXECUTE ROUND</strong> button in the center console (or toggle <strong>AUTO-OPS</strong>), the simulator executes an exact 8-step operational sequence — no magic, no hidden cheating:
            </p>
            <ol class="list-decimal pl-6 space-y-1.5 text-sm text-[#232a24]">
              <li><strong>Snapshot &amp; Clock Tick:</strong> The engine saves a 1-round Undo snapshot (for GM Live mode), advances the 24-hour clock by your Round Length, checks if Dawn/Dusk/Night arrived, and rolls Dynamic Weather if enabled.</li>
              <li><strong>Logistics, Dig-In &amp; Rallying:</strong> Units in active contact burn Supply (approach marches before contact pause ammo burn!), pull logistics refills from their Depot, build Entrenchment if defending, heal/suffer Died-of-Wounds checks, and routed units resting in the rear roll to <strong>Rally</strong> back into the fight.</li>
              <li><strong>Tactic Selection:</strong> Each side picks one of 25 real-world combat tactics (either automatically via the Commander's personality AI, or manually by you).</li>
              <li><strong>Vigilance (Recon) Roll:</strong> Both sides roll <code>1d100 + Modifiers</code> (Terrain, Weather, Night, Recon Support, Commander Staff). Whoever wins spots the enemy first and gains a combat accuracy advantage.</li>
              <li><strong>Fire Support Volleys:</strong> Mortars, Heavy Artillery, and Air Support fire before the main clash. Enemy Anti-Air guns intercept airstrikes — and bad weather can ground aircraft entirely.</li>
              <li><strong>Maneuver &amp; Closing Distance:</strong> Units out of weapon range march forward along the <strong>Y-Axis (-7 to +7)</strong> toward the contact line (0). Defenders already in range hold their ground and fire <strong>Defensive Overwatch</strong> at advancing attackers!</li>
              <li><strong>Main Firefight &amp; Return Fire:</strong> Units in range engage targets based on Target Value (Frontliners draw fire away from fragile artillery!). Piercing is checked against Hardness, casualties split into KIA/WIA, tanks are disabled or knocked out, Org drops, and surviving defenders fire back.</li>
              <li><strong>Victory, Pursuit &amp; Salvage:</strong> If one side has zero active frontline troops left, the battle ends! Winners pursue retreating losers to capture POWs, recovery tractors tow damaged tanks home, victors salvage abandoned enemy hulls (<em>Beutepanzers</em>), and the <strong>Form DA-774 After-Action Report</strong> is generated.</li>
            </ol>
          </section>

          <!-- ==================== CHAPTER 5 ==================== -->
          <section id="fm-ch5" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 05 // BATTLEFIELD MECHANICS (WHY REAL PHYSICS MATTERS)</h3>

            <p class="tradoc-para">
              <span class="tradoc-para-id">5-1.</span>
              <strong>Y-Axis Distance &amp; Engagement Range (NO, YOU CANNOT SNIPE WITH AN M4 AT 2 KILOMETERS!):</strong> Look at the horizontal <strong>Y-AXIS CONTACT (0)</strong> strip in the center column. Side A starts on the negative side and Side B on the positive side. Add both positions together to get <strong>Total Distance</strong>.
            </p>
            <div class="tradoc-callout">
              <strong>LISTEN UP, SOLDIER:</strong> You cannot shoot an M4 rifle two kilometers straight and expect to hit anything — if you pull that off, I'll personally pin a medal on your forehead and give you a standing ovation! That is why <strong>Infantry &amp; Armored Vehicles must close to Distance &lt;= 2</strong>, <strong>Tanks engage at Distance &lt;= 3</strong>, and <strong>Artillery shells from the rear up to Distance &lt;= 6</strong>. And if Fog or Night triggers a <strong>VIS CAP</strong>, even your tanks have to creep closer before they can see what they're shooting at!
            </div>

            <p class="tradoc-para">
              <span class="tradoc-para-id">5-2.</span>
              <strong>Routing &amp; Rallying (Fall Back, Don't Vanish):</strong> When a unit hits 0 Organization, it doesn't disappear in a puff of smoke. It <strong>routs to the rear staging area</strong>. If it hasn't rallied before and has enough survivors left, it spends a few rounds catching its breath, rebuilding Org, and rolling a <strong>Rally Check</strong> (boosted by Rally Master / Organizer commanders) to march back onto the line. If it shatters a second time, it's permanently out of the fight.
            </p>

            <p class="tradoc-para">
              <span class="tradoc-para-id">5-3.</span>
              <strong>Tactics &amp; The Doctrine Manual:</strong> Every round, attackers and defenders execute a doctrine (Blitz, Breakthrough, Ambush, Elastic Defense, Mouse-Holing in cities, etc.). Some tactics directly counter others — an Ambush tears apart a reckless Assault. Flip through Tab <strong>[06] Doctrines</strong> (the 25-page paper manual) to study every tactic's real-world history and exact simulator math.
            </p>

            <p class="tradoc-para">
              <span class="tradoc-para-id">5-4.</span>
              <strong>Commanding Officers &amp; 10-Tier Officer Rank Insignia:</strong> Each side has its own dedicated <strong>COMMANDING OFFICER</strong> box. Every level of <strong>ATK, DEF, CMD (Org), and LOG (Supply)</strong> adds +2.5% to your whole army, plus specialized Commander Traits. A general's <strong>total stat points</strong> automatically determine their Officer Rank Insignia (stepping every 4 points): <em>First Lieutenant (0-3), Captain (4-7), Major (8-11), Lieutenant Colonel (12-15), Colonel (16-19), Brigadier General (20-23), Major General (24-27), Lieutenant General (28-31), General (32-35), and 5-Star General of the Army (36+)</em>.
            </p>

            <p class="tradoc-para">
              <span class="tradoc-para-id">5-5.</span>
              <strong>GM Live Controls &amp; Expandable Logs:</strong> Running a live TTRPG session for players? Click <strong>GM LIVE</strong> in the center console to unlock <strong>UNDO 1 ROUND</strong>, inject +50 Depot Supply, tweak any unit's Supply/Org/Position mid-battle, or drop reinforcements straight onto the field. Click <strong>EXPAND</strong> on the Sitrep Logbook anytime to open the full searchable combat record with exact <code>[RD-XX | HH:MM]</code> timestamps.
            </p>
          </section>

          <!-- ==================== CHAPTER 6 ==================== -->
          <section id="fm-ch6" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 06 // CUSTOMIZING YOUR WAR (ORBAT, COMMAND HQ, TERRAIN &amp; JSON)</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">6-1.</span>
              <strong>Renaming Factions:</strong> Click directly on the gray steel nameplate (<strong>BRITISH INDIAN ARMY</strong> or <strong>WEHRMACHT</strong>) on the Battlefield and type any faction name you want. It automatically updates every Combat Log, Y-Axis label, and printable AAR. Clear it completely and it snaps right back to default.
            </p>
            <p class="tradoc-para">
              <span class="tradoc-para-id">6-2.</span>
              <strong>[02] ORBAT (Unit Customization):</strong> Build any unit from Napoleonic infantry to modern armored brigades or sci-fi squads. Set Personnel, Max Org, Armor Tier/Count, Soft/Hard Attack, Piercing, Hardness, and Experience. Use the <strong>Search traits...</strong> bar to quickly attach Traits &amp; Support Modules (Medics, Mortars, Anti-Tank, Marines, Air Support, Engineers), then hit <strong>SAVE TEMPLATE</strong> or deploy straight to Side A/B.
            </p>
            <p class="tradoc-para">
              <span class="tradoc-para-id">6-3.</span>
              <strong>[03] Traits &amp; [04] Command HQ:</strong> Invent custom unit traits with your own percentage/flat modifiers in the Traits tab, or commission custom generals in Command HQ — slide their 4 stats (watching their officer rank insignia climb from 1LT to 5-Star General of the Army!) and even create custom Commander Traits.
            </p>
            <p class="tradoc-para">
              <span class="tradoc-para-id">6-4.</span>
              <strong>[05] Terrain Customization &amp; Preset JSON Backup:</strong> Want to tweak how brutal Mountains are, change a terrain's <strong>Max Entrenchment</strong> or <strong>Max Outnumber %</strong>, or invent a custom sci-fi terrain? Edit and save it in Tab 5. Everything saves automatically to your browser, and you can use <strong>EXPORT JSON / IMPORT JSON</strong> in the top-right Command Deck to back up or share your entire custom army, generals, traits, and terrains with your TTRPG group!
            </p>
          </section>

        </div>

        <!-- Official Publication Footer -->
        <footer class="tradoc-footer">
          <span>NOW QUIT STARING AT THE PAPER AND GO WIN A BATTLE, SOLDIER!</span>
          <span>FM 100-5-BOOT // IRON DIVISION TRAINING COMMAND</span>
        </footer>
      </article>
          </div>
          <div id="guide-pane-tech" class="${activeGuidePage === 'tech' ? '' : 'hidden'}">
            <article class="tradoc-doc" aria-label="Iron Division Technical Manual TM 9-1005-TECH">
        <div class="tradoc-class-strip">
          <span>UNCLASSIFIED // ENGINE REFERENCE &amp; MATHEMATICAL SPECIFICATION</span>
          <span>TRADOC PUB // TM 9-1005-TECH (REV 3.0)</span>
        </div>

        <header class="tradoc-header">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="tradoc-mono text-[11px] font-bold uppercase tracking-widest text-[#3a4738]">
                IRON DIVISION SYSTEMS ENGINEERING // TECHNICAL MANUAL
              </div>
              <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#141815] mt-1">
                TM 9-1005-TECH: Simulation Rules &amp; Architecture
              </h2>
              <p class="text-sm text-[#323a33] max-w-3xl mt-1">
                Concise technical reference for combat formulas, penetration checks, spatial range caps, compound environment rules, officer rank scaling, and client-side data persistence.
              </p>
            </div>
            <div class="tradoc-mono text-[11px] bg-[#faf8f2] border border-[#b5ad98] p-3 text-right shrink-0 space-y-0.5 text-[#1c211d]">
              <div><strong>PUB NO:</strong> TM 9-1005-TECH</div>
              <div><strong>RUNTIME:</strong> VANILLA ES6 (ZERO-BUILD)</div>
              <div><strong>STORAGE:</strong> LOCALSTORAGE + JSON I/O</div>
            </div>
          </div>
        </header>

        <div class="tradoc-body space-y-5">

          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">1. COMBAT RESOLUTION &amp; PENETRATION MATH</h3>
            <table class="tradoc-table">
              <thead>
                <tr>
                  <th>Subsystem</th>
                  <th>Exact Formula / Rule</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Combat Dice</strong></td>
                  <td><code>Infantry: d12</code> &middot; <code>Armored Vehicle: d16</code> &middot; <code>Tank: d20</code> &middot; <code>Artillery: d20 (Atk) / d8 (Def)</code>.</td>
                </tr>
                <tr>
                  <td><strong>Vigilance (Recon)</strong></td>
                  <td><code>1d100 + Terrain + Feature + Weather + Time-of-Day + Tactic + Avg Unit Traits + Commander</code>. Winner gains <code>floor(|diff| / 10)</code> stat bonus.</td>
                </tr>
                <tr>
                  <td><strong>Soft vs. Hard Mix</strong></td>
                  <td>Unarmored targets receive <code>Soft Attack</code>; armored targets (<code>armor &gt; 0</code>) use <code>Hard Attack</code> + kinetic penetration check.</td>
                </tr>
                <tr>
                  <td><strong>Piercing vs. Hardness</strong></td>
                  <td>If <code>Piercing &gt;= Hardness</code>: full armor penetration. If <code>Piercing &lt; Hardness</code>: mitigated damage (unpierced sealed Medium/Heavy/Super-Heavy hulls are immune to Zombie swarms).</td>
                </tr>
                <tr>
                  <td><strong>Outnumbering Bonus</strong></td>
                  <td>Force Power = <code>Personnel + (Armor * 15)</code>. Grants <code>+20%</code> Atk/Def per <code>+50%</code> advantage, capped by active terrain's <code>outnumberCap</code> (Plains <code>100%</code>, Urban <code>40%</code>, Mountain <code>35%</code>; <code>-15%</code> for Fort/River/Amphib, min <code>25%</code>).</td>
                </tr>
                <tr>
                  <td><strong>Org &amp; Supply Maluses</strong></td>
                  <td>Org &lt;=70/50/30/10% imposes <code>-5/-10/-20/-40%</code> stats (halved if Unbreakable). Supply &lt;50/20/0% imposes <code>-10/-20/-50%</code> stats plus Org shock.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">2. SPATIAL RANGE, ENVIRONMENT &amp; COMPOUND HAZARDS</h3>
            <table class="tradoc-table">
              <thead>
                <tr>
                  <th>Mechanic</th>
                  <th>Technical Specification</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Y-Axis Range</strong></td>
                  <td><code>Total Distance = posA + posB</code>. Base ranges: <code>Infantry/AV &lt;= 2</code>, <code>Tank &lt;= 3</code>, <code>Artillery &lt;= 6</code>, <code>Zombie &lt;= 1</code>. Pre-contact approach pauses base ammo drain.</td>
                </tr>
                <tr>
                  <td><strong>24-Hour Clock &amp; Lighting</strong></td>
                  <td><code>05:00-06:59</code> Dawn (<code>-10 Vig, -15% Air, VisCap 6</code>) &middot; <code>07:00-17:59</code> Daylight &middot; <code>18:00-19:59</code> Dusk &middot; <code>20:00-04:59</code> Night (<code>-25 Vig, -40% Air, VisCap 4, +15 Ambush</code>). Ordinal Day increments after <code>24:00</code>.</td>
                </tr>
                <tr>
                  <td><strong>Air Support Weather</strong></td>
                  <td>Damage/suppression scales by <code>airEfficiency = clamp(1 + (weather.airMod + tod.airMod)/100, 0.10, 1.20)</code>. At <code>&lt;= -50%</code>, strike rolls abort/grounding check (<code>min(75%, |mod|)</code>) with 0 supply spent.</td>
                </tr>
                <tr>
                  <td><strong>Compound Hazards</strong></td>
                  <td><strong>Mud/Rasputitsa</strong> (<code>-1/-2</code> AFV speed, <code>+2</code> Sup, <code>-15</code> Veh Rec) &middot; <strong>Zero Visibility</strong> (<code>VisCap 3-4</code>, <code>-15</code> Vig w/o Recon) &middot; <strong>Deep Freeze</strong> (<code>+3%</code> DOW, <code>+1</code> Sup, <code>15%</code> cold AFV stall &lt;30% Sup) &middot; <strong>Heatstroke/Dust</strong> (<code>+2</code> Inf Sup, <code>-2</code> Inf Org/rd, <code>-15</code> Armor/Art Vig).</td>
                </tr>
                <tr>
                  <td><strong>Entrenchment Cap</strong></td>
                  <td><code>base = terrain.maxEntrench + (Fort ? 2 : 0)</code> (clamped <code>1-8</code>), plus <code>+1</code> per unit with <code>Fortification Engineer</code>.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">3. COMMANDERS, RECOVERY &amp; POST-BATTLE PIPELINE</h3>
            <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
              <li><strong>Commander Stat Scaling:</strong> Each level (<code>0-10</code>) of <code>ATK</code>, <code>DEF</code>, <code>CMD</code>, and <code>LOG</code> grants <code>+2.5%</code> army-wide bonus. Officer Rank Insignia steps every <code>4</code> total points (<code>0-3</code> 1LT up to <code>36+</code> 5-Star General of the Army).</li>
              <li><strong>Casualty &amp; Armor Recovery:</strong> Personnel recovery uses <code>50 + d50 + Modifiers</code> (split into KIA/WIA); Died of Wounds (DOW) triggers from Round 4+ when supply is low or in freezing/marsh/heat conditions. Armor recovery uses <code>50 + d50 + ArmorRecBonus</code> (recoverable vs. write-off).</li>
              <li><strong>Pursuit &amp; Salvage:</strong> On victory, average effective mobility determines POW capture vs. escape, recovery tractors tow repairable hulls (deducted from field salvage), and victors roll salvage on abandoned enemy hulls (<code>Beutepanzers</code> restored, stripped for <code>+5</code> Supply/hull, or scuttled).</li>
              <li><strong>GM Undo Stack:</strong> Every round pushes a deep clone of battle + environment state into <code>battle.history</code> (FIFO max <code>15</code> rounds).</li>
            </ul>
          </section>

          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">4. MODULE ARCHITECTURE &amp; DATA PERSISTENCE</h3>
            <table class="tradoc-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Responsibility</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>js/data.js</code></td><td>Static registries: Terrains, Features, Weather, Time-of-Day, Compound Hazards, 32 Traits, 10 Commander Traits, Commanders, 25 Tactics, Unit Templates.</td></tr>
                <tr><td><code>js/engine-helpers.js</code></td><td>Dice RNG, simulated 24H clock/ordinal day, environment &amp; visibility resolver, NATO &amp; 10-tier Officer SVG icons, combat log buffer.</td></tr>
                <tr><td><code>js/engine-combat.js</code></td><td>Round orchestration, undo snapshots, supply/dig-in/rallying, vigilance, fire support + AA/weather grounding, maneuver, firefight, armor &amp; DOW.</td></tr>
                <tr><td><code>js/engine-pursuit.js</code></td><td>Victory checks, mobility pursuit/POWs, recovery towing, field salvage, and Form DA-774 AAR snapshot builder.</td></tr>
                <tr><td><code>js/ui-render.js</code></td><td>DOM rendering, searchable black-diamond dropdowns, floating unit tooltip, expanded logs modal, flippable Tactics Manual, and printable A4 AAR.</td></tr>
                <tr><td><code>js/app.js</code></td><td>Global <code>IronDivision.state</code>, <code>localStorage</code> persistence, Preset JSON Export/Import, GM Live overrides, and event controllers.</td></tr>
              </tbody>
            </table>
          </section>

        </div>

        <footer class="tradoc-footer">
          <span>IRON DIVISION SYSTEMS ENGINEERING // TECHNICAL SPECIFICATION</span>
          <span>TM 9-1005-TECH // END OF DOCUMENT</span>
        </footer>
      </article>
          </div>
        </div>
      </div>
    `;
  }

  // Attach to IronDivision namespace
  ID.Guide = {
    renderSimulationGuide,
    switchGuidePage
  };

  // Backwards-compatible bindings on window
  window.renderSimulationGuide = renderSimulationGuide;
  window.switchGuidePage = switchGuidePage;

})(window.IronDivision);