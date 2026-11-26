/* ==========================================================================
   IRON DIVISION ENGINE — MANILA FOLDER FIELD & TECHNICAL MANUALS
   File: js/guide.js (Load Order: 7/9)

   Purpose:
   - Renders the 3-tab Manila-folder documentation suite in Tab [07] FM Manual:
     1. `FM 100-5-BOOT` (Drill Sergeant Field Manual)
     2. `TM 9-1005-TECH` (Technical & Mathematical Reference)
     3. `DEV-DOC-ARCH` (Developer Architecture & Module API Map)
   - Wrapped non-destructively at runtime by `js/i18n-id.js` to swap in the
     subordinate-voice Indonesian edition ("Komandan / Kumendan / Ndan") in ID mode.
   ========================================================================== */

window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  let activeGuidePage = 'boot';

  /**
   * Switches between the 3 Manila-folder manual panes (`boot`, `tech`, `code`)
   * and updates ARIA `aria-selected` tab attributes.
   */
  function switchGuidePage(pageKey) {
    activeGuidePage = (pageKey === 'tech' || pageKey === 'code') ? pageKey : 'boot';
    const pages = ['boot', 'tech', 'code'];
    pages.forEach(k => {
      const pane = document.getElementById(`guide-pane-${k}`);
      const tab = document.getElementById(`guide-tab-${k}`);
      const active = activeGuidePage === k;
      if (pane) pane.classList.toggle('hidden', !active);
      if (tab) {
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      }
    });
  }

  /** Renders the full Manila-folder documentation view into `#view-guide`. */
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
          <button type="button" id="guide-tab-code" role="tab" aria-selected="${activeGuidePage === 'code' ? 'true' : 'false'}" onclick="switchGuidePage('code')" class="manila-folder-tab ${activeGuidePage === 'code' ? 'is-active' : ''}">
            <span class="manila-tab-code">TAB C // DEV-DOC-ARCH</span>
            <span class="manila-tab-label">CODEBASE DOCS</span>
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
                Listen up, recruit! Never played a grand-strategy wargame or Hearts of Iron in your life? Good — at least you don't have bad habits yet. This manual explains every single button, number, armor rule, logistics trap, and dirty trick in Iron Division, and more importantly, <strong>what real-world battlefield reality each rule translates from</strong>.
              </p>
            </div>
            <div class="tradoc-mono text-[11px] bg-[#dfd7c2] border border-[#b5ad98] p-3 text-right shrink-0 space-y-1 text-[#1c211d]">
              <div><strong>PUB NO:</strong> FM 100-5-BOOT</div>
              <div><strong>AUTHOR:</strong> SGM IRONCLAD (RET.)</div>
              <div><strong>ENGINE:</strong> IRON DIVISION v3.5</div>
              <button type="button" onclick="openWelcomeModal(true)" class="mt-1 px-2 py-0.5 bg-[#1b221c] text-[#e0be6a] border border-[#4d4224] text-[10px] font-bold uppercase">
                RE-OPEN BRIEFING POP-UP
              </button>
            </div>
          </div>

          <!-- Quick Jump Table of Contents -->
          <div class="mt-4 pt-3 border-t border-[#c9c1ab] flex flex-wrap gap-2 tradoc-mono text-[10.5px]">
            <a href="#fm-ch1" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">01. WHAT IS THIS?</a>
            <a href="#fm-ch2" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">02. THEATRE &amp; CLIMATE</a>
            <a href="#fm-ch3" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">03. STATS &amp; ARMOR MATH</a>
            <a href="#fm-ch4" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">04. HOW A ROUND WORKS</a>
            <a href="#fm-ch5" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">05. RANGE, ROUT &amp; REPAIRS</a>
            <a href="#fm-ch6" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">06. FORM DA-774 AAR</a>
            <a href="#fm-ch7" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">07. CUSTOMIZING YOUR WAR</a>
          </div>
        </header>

        <div class="tradoc-body space-y-6">

          <!-- ==================== CHAPTER 1 ==================== -->
          <section id="fm-ch1" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 01 // WHAT THE HELL IS THIS SIMULATOR?</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">1-1.</span>
              <strong>Drop the arcade mindset right now.</strong> In a video game shooter, a soldier runs around at 1 HP like nothing happened until a final bullet deletes him. Real war does not work like that. Real formations break because their radios go dead, their ammunition trucks burn up, artillery pins them in the mud, or their tanks get knocked out and nobody wants to climb out of a ditch into machine-gun fire anymore.
            </p>
            <p class="tradoc-para">
              <span class="tradoc-para-id">1-2.</span>
              <strong>Iron Division</strong> is a tabletop-RPG (TTRPG) operational combat simulator. By default, it boots straight into the historical <strong>Battle of Arracourt (18 September 1944, Lorraine Hills)</strong> — General Hasso von Manteuffel's 5th Panzer Army assaulting Colonel Bruce C. Clarke's U.S. 4th Armored Division (CCA) in morning fog (with the <strong>Battle of San Marino</strong> also ready in presets). Set the terrain, climate, clock, and commanders, then hit <strong>EXECUTE ROUND</strong>. Under the hood, the engine rolls polyhedral dice, resolves armor penetration, tracks every KIA, WIA, POW, escaped soldier, and disabled hull, writes a live Army Sitrep (Form DA-1594), and compiles a printable <strong>Form DA-774 After-Action Report</strong> when one side collapses.
            </p>
            <div class="tradoc-callout">
              <strong>LISTEN UP, RECRUIT — THIS AIN'T A HEALTH-BAR SHOOTER:</strong> If a battalion has 600 men left, zero bullets, dead radios, and three artillery groups dropping 155mm iron on their helmets, they are NOT doing a heroic backflip into a machine-gun nest — they're sprinting for the next county! Battles are won by shattering the enemy's <strong>Organization (ORG)</strong>, starving their <strong>Supply</strong>, and stripping their screening forces while keeping your own boys intact.
            </div>
          </section>

          <!-- ==================== CHAPTER 2 ==================== -->
          <section id="fm-ch2" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 02 // THEATRE COMMAND, CLIMATE &amp; THE 24-HOUR CLOCK</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">2-1.</span>
              Look at the top box on the Battlefield tab labeled <strong>THEATRE COMMAND &amp; ENVIRONMENT</strong>. That box is Mother Nature and High Command combined. You can collapse it anytime with <strong>COLLAPSE</strong>, but before you fire a single shot, learn what every knob in that bar actually does:
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
                  <td>Sets attack/defense bonuses per unit class, Vigilance, Supply drain, <strong>Max Dig-In</strong>, vehicle recovery mods, and <strong>Max Outnumber Cap</strong>.</td>
                  <td>Tanks love open Plains and hate Mountain passes. A narrow city street or ridge physically stops 10,000 men from all shooting at once — that is why Urban caps outnumbering at +40% and Mountain at +35%.</td>
                </tr>
                <tr>
                  <td><strong>Terrain Feature</strong></td>
                  <td>Applies a multiplicative modifier (Roads, Small/Large Rivers, Amphibious Landings, Fortified Strongpoints).</td>
                  <td>Crossing a wide river under machine-gun fire is suicide unless you bring <strong>Marines</strong> or engineers. Concrete bunkers (Fort) multiply defender strength and raise how deep they can dig in (+2 cap).</td>
                </tr>
                <tr>
                  <td><strong>Climate-Aware Weather &amp; DYN</strong></td>
                  <td>Modifies Attack, Defense, Vigilance, Supply burn, and <strong>Air Support Efficiency</strong>. Check <strong>DYN</strong> to let weather shift every 3 rounds — automatically filtered by <strong>Terrain, Calendar Season, and Time of Day</strong>.</td>
                  <td>September hills in Lorraine get morning fog, overcast, and rain — NOT blizzards or desert heatwaves. Deserts stay dry, nights don't spawn sudden heatwaves, and bad weather slashes airstrike power by 50–60% or grounds aircraft completely.</td>
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
                  <td><strong>Any-Era Date, 24H Clock &amp; Round Length</strong></td>
                  <td>Set <strong>any historical or fictional year from -270000 (BCE) to +270000</strong> (including Year 0, ancient years like 44, WW2 1944, or sci-fi 40999), exact 24H clock, and <strong>Minutes/Hours/Days</strong> per round. Drives <strong>Dawn (05–06), Daylight (07–17), Dusk (18–19), Night (20–04)</strong> and the <strong>1st/2nd/3rd Day</strong> counter.</td>
                  <td>Fighting at 02:00 HRS in pitch darkness blinds tank optics, boosts ambushes (+15), grounds close air support, and clamps sight range. Every weather shift and milestone is stamped to this exact clock in your AAR.</td>
                </tr>
              </tbody>
            </table>

            <p class="tradoc-para mt-3">
              <span class="tradoc-para-id">2-2.</span>
              <strong>Compound Hazards (When Dirt &amp; Sky Team Up to Ruin Your Day):</strong> Certain combinations trigger red <strong>HAZARD</strong> alerts automatically:
            </p>
            <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
              <li><strong>MUD / RASPUTITSA</strong> <em>(Heavy Rain on Plains/Forest/Hills/Marsh/Road)</em>: Tanks bog down in knee-deep mud (-1 to -2 mobility), supply trucks get stuck (+2 Supply drain), and towing/recovering knocked-out armor gets brutally hard (-15 Veh Rec).</li>
              <li><strong>ZERO VISIBILITY</strong> <em>(Foggy anywhere, or Night in Urban/Forest/Jungle)</em>: Caps direct-fire sight range to 3–4 distance bands and hits Vigilance (-15) unless you brought Recon or Concealment specialists.</li>
              <li><strong>DEEP FREEZE</strong> <em>(Snowy on Mountain/Hills/Plains)</em>: Wounded men freeze (+3% Died-of-Wounds mortality), supply burns faster, and low-supply tanks (&lt;30% Supply) risk frozen engine breakdowns (halved by Simple Engineering).</li>
              <li><strong>HEATSTROKE / DUST</strong> <em>(Heat Waves in Desert)</em>: Infantry burn extra water/supply (+2) and lose Org (-2/rd) to heat exhaustion; dust storms blind tank and artillery optics (-15 Vigilance).</li>
            </ul>

            <div class="tradoc-callout mt-3">
              <strong>STOP ORDERING BLIZZARDS IN THE SAHARA AT MIDNIGHT, GENIUS:</strong> Mother Nature does not take orders from your fever dreams — dynamic weather now obeys real terrain, calendar seasons, and time of day, so you won't get a surprise heatstroke in a January snowdrift or a blizzard in September Lorraine. And yes, you can set the year to <strong>-216 (216 BCE)</strong> or <strong>40999</strong> for your crazy fictional war — just don't expect a P-47 Thunderbolt to fly CAS through zero-visibility fog at 02:00 HRS unless you want your pilots parking in a barn!
            </div>
          </section>

          <!-- ==================== CHAPTER 3 ==================== -->
          <section id="fm-ch3" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 03 // UNIT STATS, ARMOR PHYSICS &amp; DOG TAGS</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">3-1.</span>
              Every unit on the Battlefield has its name stamped onto a steel <strong>Soldier's Dog Tag</strong>, with a NATO military symbol on the left and its <strong>Experience Rank Insignia</strong> on the right (blank for Green rookies up to a Star for Elite killers — hover any card to inspect deep stats). Here is what each stat actually means under fire:
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
                  <td><strong>Personnel (PERS)</strong></td>
                  <td>Living, breathing troops still able to pull a trigger. Accounted exactly across <strong>Active, KIA (Dead), WIA (Wounded), POW (Captured), and ESC (Escaped)</strong>.</td>
                  <td>Lose men and your firepower drops. Wounded men can succumb to Died-of-Wounds (DOW) from Round 4+ if your supply runs dry and you skipped Medics or First Aid Kits.</td>
                </tr>
                <tr>
                  <td><strong>Organization (ORG)</strong></td>
                  <td>Morale, cohesion, chain of command, and nerve (Blue bar). Drops from casualties, vehicle knockouts, suppression, and late-battle combat fatigue.</td>
                  <td>When ORG hits <strong>0</strong>, the unit breaks and routs — even if 70% of the men are still alive. Real regiments stop fighting when their officers are down and squads are scattered, not when the last man dies.</td>
                </tr>
                <tr>
                  <td><strong>Supply (SUP) &amp; Depot</strong></td>
                  <td>Ammunition, rations, fuel, and spare parts (Yellow bar). Units pull refills from their side's shared <strong>Theatre Supply Depot</strong>.</td>
                  <td>An army marches on its stomach and shoots with its ammo trucks. Drop below 50% supply (-10% stats), below 20% (-20% stats), or hit 0% (-50% stats + continuous Org collapse).</td>
                </tr>
                <tr>
                  <td><strong>Soft vs. Hard Attack</strong></td>
                  <td><strong>Soft Attack</strong> shreds unarmored infantry (rifles, MGs, HE). <strong>Hard Attack</strong> punches through armored vehicles and tanks (AT cannons, bazookas, AP rounds).</td>
                  <td>A machine gun mows down riflemen in the open, but it cannot scratch a 40-ton steel tank. Bring the right ammo for the right target.</td>
                </tr>
                <tr>
                  <td><strong>Piercing vs. Hardness</strong></td>
                  <td><strong>Hardness</strong> is armor thickness/slope; <strong>Piercing</strong> is your gun's penetration. Determines whether shots pierce cleanly or trigger <strong>ARMOR HELD</strong>.</td>
                  <td>If your Piercing fails to beat Medium/Heavy/Super Hardness, rounds ricochet off the glacis: <strong>personnel casualties are halved, Explosive bonus dice are negated, and Heavy/Super Org shock is capped at -1</strong>.</td>
                </tr>
                <tr>
                  <td><strong>AFV Knockouts &amp; Recovery</strong></td>
                  <td>Knocked-out hulls split into <strong>Recoverable</strong> (thrown tracks, jammed turrets, engine hits) and <strong>Destroyed (KO)</strong> (brewed-up write-offs) using a dynamic <strong>80 + d20% recovery cap</strong>.</td>
                  <td>Even on a clean armor hit, not every tank explodes into confetti — most are disabled and await recovery, while probabilistic fractional rolls ensure even small hits can still cook off permanent write-offs.</td>
                </tr>
                <tr>
                  <td><strong>Defense &amp; Dig-In</strong></td>
                  <td>How well a unit avoids clean hits. Holding ground automatically builds <strong>Entrenchment (Dig-In)</strong> every round up to the terrain cap (+1 with Fortification Engineers).</td>
                  <td>A rifleman in a dug-in foxhole with overhead log cover is five times harder to kill than a rifleman jogging across an open wheat field.</td>
                </tr>
              </tbody>
            </table>

            <div class="tradoc-callout mt-3">
              <strong>STOP SHOOTING A 45-TON PANTHER WITH A .30-CALIBER MACHINE GUN:</strong> All you're doing is scratching the paint and making the German commander spill his coffee! When your Piercing can't beat their Hardness, <strong>ARMOR HELD</strong> cuts your personnel damage in half, cancels your Explosive dice, and caps Heavy/Super Org shock at -1 — and deflected low-pressure clashes knock out ZERO tanks. Bring Tank Destroyers, High-Caliber AP guns, or flank 'em; you can't dent Krupp steel with harsh language!
            </div>
          </section>

          <!-- ==================== CHAPTER 4 ==================== -->
          <section id="fm-ch4" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 04 // HOW A SINGLE ROUND PLAYS OUT (STEP-BY-STEP)</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">4-1.</span>
              Every time you slam that big brass <strong>EXECUTE ROUND</strong> button in the center console (or toggle <strong>AUTO-OPS</strong>), the simulator executes an exact 8-step operational sequence — zero hidden cheating:
            </p>
            <ol class="list-decimal pl-6 space-y-1.5 text-sm text-[#232a24]">
              <li><strong>Snapshot, Clock &amp; Climate Tick:</strong> Saves a 1-round Undo snapshot (up to 15 rounds for GM Live), advances the 24-hour clock by your Round Length, updates Dawn/Daylight/Dusk/Night lighting, and rolls <strong>Climate-Aware Dynamic Weather</strong> every 3 rounds if enabled.</li>
              <li><strong>Logistics, Dig-In, Fatigue &amp; Field Repairs:</strong> Units <em>in engagement range</em> burn combat Supply and take late-battle Combat Fatigue (Round 6+); units <em>out of range</em> on approach marches pause ammo burn, pause Combat Fatigue, and pause Green rookie -1 Org drift! Defenders dig in, wounded roll Died-of-Wounds checks, rallied units recover in the rear, and organic <strong>Field Repair Crews</strong> restore disabled hulls every 4 rounds (unless pinned by anti-armor fire last round).</li>
              <li><strong>Tactic Selection:</strong> Each side executes one of 25 real-world combat doctrines (chosen by the Commander AI or manually by you). Certain tactics directly counter others — e.g., Ambush shreds Reckless Assault.</li>
              <li><strong>Vigilance (Recon) Roll:</strong> Both sides roll <code>1d100 + Modifiers</code> (Terrain, Feature, Weather, Night, Recon Support, Commander). Whoever wins spots the enemy first and earns a combat accuracy edge.</li>
              <li><strong>Fire Support Volleys:</strong> Mortars, Heavy Artillery, and Air Support strike before the main clash. Enemy Anti-Air guns intercept aircraft — and bad weather or Night can slash airstrike efficiency or ground planes outright.</li>
              <li><strong>Maneuver &amp; Closing Distance:</strong> Units out of range march forward along the <strong>Y-Axis (-7 to +7)</strong> toward Contact (0). Defenders already in range hold their trenches and fire <strong>Defensive Overwatch</strong> at advancing columns!</li>
              <li><strong>Main Firefight, Close-Range Raids &amp; Return Fire:</strong> Units in range engage based on Target Value (Frontliners screen fragile artillery!). Piercing checks against Hardness, deflected clashes gate vehicle knockouts (0 below 70% pressure, max 2 above), close-range direct-fire raiders (<code>Distance &lt;= 2</code>, non-artillery) can steal enemy Supply, casualties split into KIA/WIA, and surviving defenders return fire.</li>
              <li><strong>Victory, Pursuit, Towing &amp; Salvage:</strong> If one side has zero active frontline troops left (or only unscreened artillery that auto-withdraws), the battle ends! Winners pursue retreating losers to take POWs, recovery tractors tow repairable hulls back to depot, victors salvage abandoned enemy vehicles (impressed into service, stripped for spares, or scuttled), and the engine compiles the <strong>Form DA-774 AAR</strong>.</li>
            </ol>

            <div class="tradoc-callout mt-3">
              <strong>NO, YOUR ARTILLERY BATTERY CANNOT TELEPORT SIX KILOMETERS TO MUG AN ENEMY SUPPLY TRUCK:</strong> Supply raiding is strictly locked to close-range direct-fire fighters (<code>Distance &lt;= 2</code>, no artillery) — if your howitzer crew wants enemy rations, they can walk! Same goes for your mechanics: <strong>Field Repair Crews</strong> only work every 4 rounds, restore 1–2 hulls (up to 3 with Simple Engineering), and immediately duck for cover if the unit took anti-armor hits the round before. Nobody's welding a Sherman transmission while 88mm shells are bouncing off the turret!
            </div>
          </section>

          <!-- ==================== CHAPTER 5 ==================== -->
          <section id="fm-ch5" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 05 // RANGE, ROUTING, DISMOUNTING &amp; COMMAND</h3>

            <p class="tradoc-para">
              <span class="tradoc-para-id">5-1.</span>
              <strong>3-Lane 2D Distance, Enfilade Flanking &amp; Spatial Targeting:</strong> Look at the horizontal <strong>CONTACT LINE (0)</strong> strip across <strong>North (N)</strong>, <strong>Center (C)</strong>, and <strong>South (S)</strong> lanes in the 2D Sector. Add both depths plus lane offset (<code>posA + posB + |laneA - laneB|</code>) to get <strong>Total Distance</strong>. Clear all enemy maneuver units from your own lane to flank adjacent lanes for <strong>+15% Attack &amp; half entrenchment</strong>!
            </p>
            <div class="tradoc-callout">
              <strong>LISTEN UP, SOLDIER:</strong> You cannot shoot an M4 rifle two kilometers straight and expect to hit anything — if you pull that off, I'll personally pin a medal on your forehead and give you a standing ovation! That is why <strong>Infantry &amp; standard Armored Vehicles must close to Distance &lt;= 2</strong>, <strong>Tanks AND Anti-Tank Tank Destroyers engage at Distance &lt;= 3</strong>, and <strong>Artillery shells clear across the sector up to Distance &lt;= 12</strong> (taking a mild <strong>-4%/step</strong> dispersion malus past Distance 6, capped at -20%, halved when an active Recon Spotter guides the battery). And if Fog or Night triggers a <strong>VIS CAP</strong>, even your tanks and unspotted howitzers lose sight range!
            </div>

            <p class="tradoc-para">
              <span class="tradoc-para-id">5-2.</span>
              <strong>Routing, Rallying &amp; The Rally Org Floor:</strong> When a unit hits 0 Organization, it doesn't vanish in a puff of smoke. It <strong>routs to the rear staging area</strong>, syncing its cumulative casualty-loss tracker so it won't get double-punished by old losses when it returns. If it hasn't rallied before and has enough survivors left, it rests in the rear, draws Depot Refit supply, and rolls a <strong>Rally Check</strong> (boosted by Rally Master / Organizer commanders) to return with a guaranteed <strong>Rally Org Floor</strong> (at least 18 Org or 35% of Max Org). Shatter a second time and it's permanently out of the fight.
            </p>

            <p class="tradoc-para">
              <span class="tradoc-para-id">5-3.</span>
              <strong>Dismounting vs. Armor Withdrawal &amp; Unscreened Artillery:</strong> Not every mechanized formation fights the same way when its vehicles burn:
            </p>
            <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
              <li><strong>Armored Infantry &amp; Recon (<code>armored_vehicle</code> without <code>anti_tank</code>):</strong> When all transports are lost (<strong>0 operational vehicles</strong>), provided Org is <strong>&gt;= 20%</strong> and Personnel is <strong>&gt;= 50%</strong>, the troops <strong>dismount and fight on foot</strong> as infantry (below those thresholds, surviving crews fall back to rally dismounted; Field Repair Crews stop burning supply on dismounted units).</li>
              <li><strong>Tanks, SP Artillery &amp; Tank Destroyers (<code>tank</code>, <code>artillery</code>, or <code>anti_tank</code>):</strong> When they hit <strong>0 combat-ready vehicles</strong>, crews do NOT charge trenches with pistols — the formation <strong>withdraws from the sector to depot for refit</strong> (<code>WITHDRAWN (0 AFV)</code>).</li>
              <li><strong>Unscreened Artillery Auto-Withdrawal:</strong> If every friendly frontline unit is knocked out and only rear-area artillery remains, the gunners limber up and withdraw (<code>WITHDRAWN (UNSCREENED)</code>) rather than fighting a pointless suicide duel.</li>
            </ul>

            <div class="tradoc-callout mt-3">
              <strong>A TANK CREW WITH ZERO TANKS IS NOT AN INFANTRY BATTALION — AND LONE ARTILLERY DOESN'T FIX BAYONETS:</strong> Halftrack infantry will bail out and hold the hedgerow with Garands, but when the 37th Tank Battalion or 704th Tank Destroyers run out of working hulls, they pull back to depot for replacement iron. Keep your frontliners alive to screen your howitzers, or your gun batteries will pack up and leave you in the dust!
            </div>

            <p class="tradoc-para">
              <span class="tradoc-para-id">5-4.</span>
              <strong>Tactics, Commanding Officers &amp; 10-Tier Officer Rank Insignia:</strong> Flip through Tab <strong>[06] Doctrines</strong> (the 25-page paper manual) to study every tactic's real-world history and exact counter-matchups. Each side's <strong>COMMANDING OFFICER</strong> adds +2.5% army-wide per level of <strong>ATK, DEF, CMD, and LOG</strong>, plus Commander Traits, and their total stat points automatically set their <strong>10-Tier Officer Rank Insignia</strong> (stepping every 4 points from <em>First Lieutenant [0–3]</em> up to <em>5-Star General of the Army [36+]</em>).
            </p>

            <p class="tradoc-para">
              <span class="tradoc-para-id">5-5.</span>
              <strong>GM Live Controls &amp; Expandable Logs:</strong> Running a live TTRPG session? Click <strong>GM LIVE</strong> in the center console to unlock <strong>UNDO 1 ROUND</strong>, inject +50 Depot Supply, tweak any unit's Supply/Org/Position mid-battle, or drop reinforcements straight onto the field. Click <strong>EXPAND</strong> on the Sitrep Logbook anytime for the full searchable record with exact <code>[RD-XX | HH:MM]</code> timestamps.
            </p>
          </section>

          <!-- ==================== CHAPTER 6 ==================== -->
          <section id="fm-ch6" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 06 // THE AFTER-ACTION REPORT (FORM DA-774) &amp; TELEMETRY</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">6-1.</span>
              When the smoke clears (or anytime mid-battle for an interim SITREP), open the <strong>After-Action Report</strong> modal or hit <strong>EXPORT PDF (FORM DA-774)</strong>. The printable Form DA-774 is built like a genuine military staff document — complete with running <code>FORM DA-774 // DOC-ID</code> and <code>PAGE X OF Y</code> footers, zero game-engine dice formulas, and full operational telemetry:
            </p>
            <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
              <li><strong>Section 1 — Executive Summary &amp; Force Comparison:</strong> Victory degree (Heroic, Decisive, Close, Pyrrhic, or Draw), operational day, full timestamped <strong>METEO weather trail</strong>, and a side-by-side comparison of Personnel Attrition %, KIA:WIA ratio, AFV losses/write-offs, formations intact, and <strong>Theatre Depot Logistics</strong> expenditure.</li>
              <li><strong>Section 2 — Self-Verifying ORBAT &amp; Combat Output Ledger:</strong> Exact personnel conservation (<code>Start = Rem + KIA + WIA + POW + ESC</code>), outcome-specific <strong>Final Status</strong> dispositions (<code>OPERATIONAL</code>, <code>DISMOUNTED (OP)</code>, <code>WITHDRAWN (0 AFV)</code>, <code>WITHDRAWN (UNSCREENED)</code>, <code>ROUTED</code>, <code>DISPERSED</code>, <code>WIPED OUT</code>), self-verifying AFV column (<code>Start | Act/Rec/Tow/KO</code>), and per-unit <strong>Inflicted (Cas/AFV)</strong> combat output.</li>
              <li><strong>Section 3 — Faction-Neutral Battlefield Salvage:</strong> Abandoned enemy hulls captured by the victor, split cleanly into <em>Captured &amp; Impressed into Service</em>, <em>Stripped for Depot Spares &amp; Munitions</em>, and <em>Scuttled / Written Off</em>.</li>
              <li><strong>Section 4 — Phase-Balanced Chronology:</strong> Captures key milestones across Opening, Mid-Battle, and Endgame (weather shifts, breakthroughs, unit withdrawals, decisive collapse, and salvage) stamped to the 24-hour operational clock.</li>
              <li><strong>Section 5 — Data-Driven G-3 Operational Assessment:</strong> Automatically cites top casualty-inflicting and anti-armor formations, organic field maintenance output, indirect-fire &amp; close-air-support casualty shares, and depot logistics strain.</li>
            </ul>

            <div class="tradoc-callout mt-3">
              <strong>DON'T YOU DARE HAND THE GENERAL A REPORT FULL OF "d20[14] vs DC 12":</strong> If you march into G-3 Headquarters babbling about polyhedral dice rolls, round counters, and "Supply Points," the Colonel is going to have you peeling potatoes until the Year 40999! That's why Form DA-774 scrubs every shred of simulation math, accounts for every single rifleman and tank down to the last bolt, and tells you in plain military English which battalion actually carried the day.
            </div>
          </section>

          <!-- ==================== CHAPTER 7 ==================== -->
          <section id="fm-ch7" class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">CHAPTER 07 // CUSTOMIZING YOUR WAR (ORBAT, COMMAND HQ, TERRAIN &amp; JSON)</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">7-1.</span>
              <strong>Renaming Factions:</strong> Click directly on the steel nameplate on either side of the Battlefield and type any faction name you want. It automatically updates every Combat Log, Y-Axis label, and Form DA-774 AAR. Clear it completely to snap back to default.
            </p>
            <p class="tradoc-para">
              <span class="tradoc-para-id">7-2.</span>
              <strong>[02] ORBAT (Unit Customization):</strong> Build any unit from ancient hoplites and Napoleonic grenadier regiments to WW2 armored battalions, modern brigades, or sci-fi mech companies. Set Personnel, Max Org, Armor Tier/Count, Soft/Hard Attack, Piercing, Hardness, Recovery, and Experience. Use the <strong>Search traits...</strong> bar to attach Traits &amp; Support Modules (Medics, Mortars, Anti-Tank, Repair Crew, Simple Engineering, Marines, Air Support, Engineers), then hit <strong>SAVE TEMPLATE</strong> or deploy straight to Side A/B.
            </p>
            <p class="tradoc-para">
              <span class="tradoc-para-id">7-3.</span>
              <strong>[03] Traits &amp; [04] Command HQ:</strong> Invent custom unit traits with your own percentage/flat modifiers in the Traits tab, or commission custom generals in Command HQ — slide their 4 stats (watching their officer rank insignia climb from 1LT to 5-Star General of the Army!) and create custom Commander Traits.
            </p>
            <p class="tradoc-para">
              <span class="tradoc-para-id">7-4.</span>
              <strong>[05] Terrain Customization &amp; Preset JSON Backup:</strong> Want to tweak how brutal Mountains are, change a terrain's <strong>Max Entrenchment</strong> or <strong>Max Outnumber %</strong>, or invent a custom sci-fi wasteland? Edit and save it in Tab 5. Everything auto-saves to your browser, and you can hit <strong>EXPORT JSON / IMPORT JSON</strong> in the top-right Command Deck to back up or share your entire custom army, generals, traits, and terrains with your TTRPG table!
            </p>

            <div class="tradoc-callout mt-3">
              <strong>YES, YOU CAN PIT ROMAN LEGIONARIES FROM 216 BCE AGAINST SPACE MARINES FROM 40999:</strong> Set any year from <code>-270000</code> to <code>+270000</code>, build your dream army in ORBAT, and unleash chaos — just don't come crying to me when your Centurions forget to pack Anti-Tank guns! And hit <strong>EXPORT JSON</strong> before you accidentally nuke your masterpiece!
            </div>
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
          <span>TRADOC PUB // TM 9-1005-TECH (REV 3.5)</span>
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
                Authoritative technical reference for combat formulas, armor penetration &amp; knockout gating, dynamic recovery &amp; field repair cadence, climate-aware weather, arbitrary-era calendars, telemetry pipelines, and Form DA-774 AAR generation.
              </p>
            </div>
            <div class="tradoc-mono text-[11px] bg-[#dfd7c2] border border-[#b5ad98] p-3 text-right shrink-0 space-y-0.5 text-[#1c211d]">
              <div><strong>PUB NO:</strong> TM 9-1005-TECH</div>
              <div><strong>RUNTIME:</strong> VANILLA ES6 (ZERO-BUILD)</div>
              <div><strong>STORAGE:</strong> LOCALSTORAGE + JSON I/O</div>
            </div>
          </div>
        </header>

        <div class="tradoc-body space-y-5">

          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">1. COMBAT RESOLUTION, ARMOR MITIGATION &amp; KNOCKOUT GATING</h3>
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
                  <td><strong>Soft vs. Hard &amp; ARMOR HELD</strong></td>
                  <td>Unarmored targets take <code>Soft Attack</code>; armored targets (<code>armor &gt; 0</code>) take <code>Hard Attack</code> + penetration check. On unpierced hits (<code>Piercing &lt; Hardness</code>) vs. <code>Medium/Heavy/Super</code> armor: personnel casualties are <strong>halved (&times;0.5)</strong>, bonus <code>Explosive</code> dice are <strong>negated</strong>, and unpierced Org shock vs. <code>Heavy/Super</code> armor is <strong>capped at -1</strong>. Sealed unpierced Medium+ hulls remain immune to Zombie swarms.</td>
                </tr>
                <tr>
                  <td><strong>Vehicle Knockout Brackets &amp; Deflected Clashes</strong></td>
                  <td>Piercing/hardness knockout brackets: <code>d3</code>, <code>1+d4</code>, <code>2+d6</code>, <code>3+d8</code>, subject to a <strong>15% Fleet Cap</strong> per hit. On deflected clashes (Main Attack &amp; Return Fire): <code>pressure &lt; 0.70</code> causes <strong>0 knockouts</strong>; <code>pressure &gt;= 0.70</code> is capped at <code>min(2, max(1, floor(disabled * 0.5)))</code>.</td>
                </tr>
                <tr>
                  <td><strong>Outnumbering Bonus</strong></td>
                  <td>Force Power = <code>Personnel + (Armor * 15)</code>. Grants <code>+20%</code> Atk/Def per <code>+50%</code> advantage, capped by active terrain's <code>outnumberCap</code> (Plains <code>100%</code>, Urban <code>40%</code>, Mountain <code>35%</code>; <code>-15%</code> for Fort/River/Amphib, min <code>25%</code>).</td>
                </tr>
                <tr>
                  <td><strong>Org, Supply &amp; Out-of-Range Pauses</strong></td>
                  <td>Org &lt;=70/50/30/10% imposes <code>-5/-10/-20/-40%</code> stats (halved if Unbreakable). Supply &lt;50/20/0% imposes <code>-10/-20/-50%</code> stats + Org shock. While a unit is <strong>out of engagement range</strong>, base combat ammo burn, late-battle <strong>Combat Fatigue</strong> (<code>rd &gt; 5</code> / <code>rd &gt; 12</code>), and <code>Green</code> <code>-1</code> Org drift are paused.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">2. SPATIAL RANGE, CLIMATE WEATHER &amp; ARBITRARY-ERA CLOCK</h3>
            <table class="tradoc-table">
              <thead>
                <tr>
                  <th>Mechanic</th>
                  <th>Technical Specification</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>3-Lane 2D Distance &amp; Flank Enfilade</strong></td>
                  <td><code>Total Distance = (posA + posB) + |laneA - laneB|</code> across <code>North (0) / Center (1) / South (2)</code>. Base ranges: <code>Infantry / standard AV &lt;= 2</code>, <code>Tank &amp; anti_tank AV (TDs) &lt;= 3</code>, <code>Artillery &lt;= 12</code> (<code>-4%/step</code> dispersion beyond dist <code>6</code>, capped <code>-20%</code>, halved by active <code>recon_support</code>; Inherent Barrage replaces that round's Main Attack; Overwatch capped at <code>&lt;= 5</code>), <code>Mortar Support &lt;= 5</code>, <code>Air Support</code> theatre-wide, <code>Zombie &lt;= 1</code>. Clearing a lane grants <strong>+15% Enfilade Atk</strong> &amp; halves defender entrenchment across lanes; fast vehicles (<code>effSpeed &gt;= 4</code> in dry open terrain) advance <code>2</code> steps/rd (slowed to <code>1</code> by Mud/close terrain); entrenched defenders (<code>Dig-In &gt;= 3</code> / <code>Fort</code> / defensive tactic) hold cover when outranged; Overwatch takes <code>-15%</code> Atk (max <code>2</code> vs armor/fast, <code>1</code> vs Spearhead).</td>
                </tr>
                <tr>
                  <td><strong>Arbitrary-Era Calendar &amp; 24H Clock</strong></td>
                  <td>Uses <code>Date.setUTCFullYear()</code> (bypassing <code>Date.UTC</code> 1900-mapping) to support any year from <code>-270000</code> (formatted as <code>BCE</code>) to <code>+270000</code>, including Year <code>0</code> and double-digit years. Lighting: <code>05–06</code> Dawn (<code>-10 Vig, -15% Air, VisCap 6</code>), <code>07–17</code> Daylight, <code>18–19</code> Dusk, <code>20–04</code> Night (<code>-25 Vig, -40% Air, VisCap 4, +15 Ambush</code>).</td>
                </tr>
                <tr>
                  <td><strong>Climate-Aware Dynamic Weather</strong></td>
                  <td>Every 3 rounds (if <code>DYN</code> active), <code>getClimateWeatherCandidates(curW, terrain, month, todPhase)</code> filters transitions by terrain, calendar season (<code>Winter/Spring/Summer/Autumn</code>), and time of day (e.g., blocking snow in autumn temperate hills or new heatwaves at night).</td>
                </tr>
                <tr>
                  <td><strong>Air Support &amp; Compound Hazards</strong></td>
                  <td><code>airEfficiency = clamp(1 + (weather.airMod + tod.airMod)/100, 0.10, 1.20)</code>; at <code>&lt;= -50%</code>, rolls grounding check (<code>min(75%, |mod|)</code>, 0 supply spent). Hazards: <strong>Mud/Rasputitsa</strong> (<code>-1/-2</code> AFV speed, <code>+2</code> Sup, <code>-15</code> Veh Rec) &middot; <strong>Zero Visibility</strong> (<code>VisCap 3–4</code>, <code>-15</code> Vig w/o Recon) &middot; <strong>Deep Freeze</strong> (<code>+3%</code> DOW, <code>+1</code> Sup, <code>15%</code> cold AFV stall &lt;30% Sup, <code>7%</code> w/ SimpleEng) &middot; <strong>Heatstroke/Dust</strong> (<code>+2</code> Inf Sup, <code>-2</code> Inf Org/rd, <code>-15</code> Armor/Art Vig).</td>
                </tr>
                <tr>
                  <td><strong>Entrenchment Cap</strong></td>
                  <td><code>base = terrain.maxEntrench + (Fort ? 2 : 0)</code> (clamped <code>1–8</code>), plus <code>+1</code> per unit with <code>Fortification Engineer</code>.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">3. RECOVERY, FIELD REPAIR, DISMOUNTING &amp; ROUT/RALLY</h3>
            <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
              <li><strong>Armor Recovery (Dynamic Cap):</strong> Uses <code>clamp(baseRec + d50 + armorRecBonus, 5, 80 + d20)</code> with probabilistic fractional rounding (<code>floor(expected) + bernoulli(frac)</code>) so small-to-medium hits retain a realistic permanent write-off (<code>KO</code>) chance.</li>
              <li><strong>Field Repair Crew Tempo:</strong> Fires every <strong>4 rounds</strong> (<code>round % 4 === 0</code>) when <code>!isDismounted &amp;&amp; maxArmor &gt; 0 &amp;&amp; Supply &gt;= 25%</code>. Paused if <code>lastArmorHitRound === round - 1</code> (mechanics pinned). Restores <code>min(recoverable, ceil(0.35 * recoverable), maxPerCycle, ceil(dN / 2) + simpleEngBonus)</code> where <code>maxPerCycle</code> is <code>2</code> (or <code>3</code> with <code>Simple Engineering</code>).</li>
              <li><strong>Dismounting vs. Withdrawal:</strong> Only <code>armored_vehicle</code> units <em>without</em> <code>anti_tank</code> dismount as infantry (at <code>0</code> operational vehicles when <code>Org &gt;= 20%</code> and <code>Personnel &gt;= 50%</code>; otherwise surviving crews attempt to rally dismounted). <code>tank</code>, SP <code>artillery</code>, and <code>anti_tank</code> TDs retire (<code>defeated = true</code>) at <code>0</code> operational vehicles. Unscreened lone <code>artillery</code> auto-withdraws when all friendly frontliners are defeated.</li>
              <li><strong>Rout, Rally Floor &amp; Shock Sync:</strong> On rout/scatter, <code>cumPersonnelLostTenths</code> syncs to current loss ratio so rallied units only take cumulative Org shock for new losses after returning. Rallied units return with a minimum Org floor of <code>min(maxOrg, max(18, ceil(maxOrg * 0.35)))</code>.</li>
              <li><strong>Commander Scaling &amp; Undo Stack:</strong> Each level (<code>0–10</code>) of <code>ATK/DEF/CMD/LOG</code> grants <code>+2.5%</code> army-wide; 10-tier Officer Rank Insignia steps every <code>4</code> total points (<code>1LT</code> to <code>5-Star General</code>). GM Undo stack stores up to <code>15</code> round snapshots in <code>battle.history</code>.</li>
            </ul>
          </section>

          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">4. TELEMETRY, PURSUIT CONSERVATION &amp; FORM DA-774 AAR</h3>
            <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
              <li><strong>Exact Personnel &amp; AFV Conservation:</strong> Pursuit partitions surviving losing-side personnel cleanly into <code>escaped</code> + <code>captured</code> while keeping <code>wounded</code> intact (zeroing <code>personnel</code>), enforcing <code>START === REM + KIA + WIA + POW + ESC</code> on every unit. AFV ledger reconciles <code>Start === Act + Rec(+Abn) + Tow + KO</code>.</li>
              <li><strong>Per-Unit Combat &amp; Logistics Telemetry:</strong> Each unit tracks <code>stats.{casualtiesInflicted, afvsDisabled, afvsDestroyed, fieldRepairs, indirectCasualtiesInflicted, airCasualtiesInflicted}</code>; <code>buildAfterActionReport()</code> snapshots side-level depot expenditure, critical-supply counts, supply raided, and timestamped <code>weatherTrail</code>.</li>
              <li><strong>Printable Form DA-774 Pipeline:</strong> <code>sanitizeForPrintableAAR()</code> strips engine tags, dice/DC formulas, round numbers, and Org/Mobility jargon; <code>extractAARChronology()</code> balances up to 18 milestones across Opening, Mid-Battle, and Endgame; CSS <code>@page</code> renders running <code>FORM DA-774 // DOC-ID</code> and <code>PAGE X OF Y</code> footers with faction-neutral salvage labels and data-driven G-3 citations.</li>
            </ul>
          </section>

          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">5. MODULE ARCHITECTURE &amp; DATA PERSISTENCE</h3>
            <table class="tradoc-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Responsibility</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>js/data.js</code></td><td>Static registries: Terrains, Features, Weather, Time-of-Day, Compound Hazards, 32 Traits, 10 Commander Traits, Commanders, 25 Tactics, Unit Templates (Arracourt &amp; San Marino).</td></tr>
                <tr><td><code>js/engine-helpers.js</code></td><td>Dice RNG, arbitrary-era UTC calendar &amp; 24H clock, climate-aware dynamic weather resolver, visibility/range calculators, NATO &amp; 10-tier Officer SVGs, combat log buffer.</td></tr>
                <tr><td><code>js/engine-combat.js</code></td><td>Round orchestration, undo snapshots, supply/dig-in/rallying, vigilance, fire support + AA/weather grounding, maneuver, firefight, armor mitigation/recovery/repair, DOW, and per-unit telemetry.</td></tr>
                <tr><td><code>js/engine-pursuit.js</code></td><td>Victory checks, mobility pursuit/POW conservation, recovery towing, faction-neutral field salvage, and Form DA-774 AAR telemetry/logistics/weather-trail snapshot builder.</td></tr>
                <tr><td><code>js/ui-render.js</code></td><td>DOM rendering, searchable dropdowns, floating unit tooltip, expanded logs modal, flippable Tactics Manual, and Form DA-774 modal + printable A4 PDF generator.</td></tr>
                <tr><td><code>js/guide.js</code></td><td>Manila-folder Field Manual (<code>FM 100-5-BOOT</code> Drill Sergeant Edition) and Technical Manual (<code>TM 9-1005-TECH</code>).</td></tr>
                <tr><td><code>js/app.js</code></td><td>Global <code>IronDivision.state</code>, <code>localStorage</code> persistence, scenario loaders (Arracourt default), Preset JSON Export/Import, GM Live overrides, and event controllers.</td></tr>
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
          <div id="guide-pane-code" class="${activeGuidePage === 'code' ? '' : 'hidden'}">
            <article class="tradoc-doc" aria-label="Iron Division Codebase & Architecture Documentation DEV-DOC-ARCH">
        <div class="tradoc-class-strip">
          <span>UNCLASSIFIED // DEVELOPER REFERENCE &amp; CODEBASE ARCHITECTURE</span>
          <span>TRADOC PUB // DEV-DOC-ARCH (v3.5)</span>
        </div>

        <header class="tradoc-header">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="tradoc-mono text-[11px] font-bold uppercase tracking-widest text-[#3a4738]">
                IRON DIVISION ENGINEERING // FULL CODEBASE DOCUMENTATION
              </div>
              <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#141815] mt-1">
                DEV-DOC-ARCH: Codebase, State Schema &amp; API Map
              </h2>
              <p class="text-sm text-[#323a33] max-w-3xl mt-1">
                Complete developer guide to Iron Division's zero-build vanilla ES6 architecture (~16,300 lines across 11 files): module load order, global namespace contracts, live state &amp; unit schemas, round execution pipeline, UI/i18n hooks, and modding cookbook.
              </p>
            </div>
            <div class="tradoc-mono text-[11px] bg-[#dfd7c2] border border-[#b5ad98] p-3 text-right shrink-0 space-y-0.5 text-[#1c211d]">
              <div><strong>PUB NO:</strong> DEV-DOC-ARCH</div>
              <div><strong>MODULES:</strong> 9 JS + HTML + 2 CSS + TESTS</div>
              <div><strong>PATTERN:</strong> IIFE + <code>window.IronDivision</code></div>
            </div>
          </div>
        </header>

        <div class="tradoc-body space-y-5">

          <!-- SECTION 1 -->
          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">1. BOOTSTRAP PATTERN &amp; SCRIPT LOAD ORDER</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">1-1.</span>
              Iron Division intentionally uses <strong>zero bundlers, zero frameworks, and zero npm dependencies</strong> so it can be opened directly from <code>file://</code> or any static HTTP server. Every JavaScript module wraps itself in an IIFE <code>(function (ID) { 'use strict'; ... })(window.IronDivision);</code>, attaches its public API to <code>window.IronDivision.&lt;Module&gt;</code>, and binds interactive handlers to <code>window.*</code> for declarative HTML callbacks.
            </p>
            <div class="tradoc-formula">
              <div class="tradoc-formula-label">MANDATORY SCRIPT LOAD ORDER (BOTTOM OF index.html)</div>
              <code>1. js/diagnostics.js</code> &rarr; <code>2. js/data.js</code> &rarr; <code>3. js/engine-helpers.js</code> &rarr; <code>4. js/engine-combat.js</code> &rarr; <code>5. js/engine-pursuit.js</code> &rarr; <code>6. js/ui-render.js</code> &rarr; <code>7. js/guide.js</code> &rarr; <code>8. js/app.js</code> &rarr; <code>9. js/i18n-id.js</code>
            </div>
            <p class="tradoc-para">
              <span class="tradoc-para-id">1-2.</span>
              <strong>Why Order Matters:</strong> <code>diagnostics.js</code> traps global errors before any engine code parses; <code>data.js</code> supplies immutable registries; <code>engine-helpers.js</code> provides RNG, calendar, and weather math consumed by <code>engine-combat.js</code> and <code>engine-pursuit.js</code>; <code>app.js</code> initializes <code>ID.state</code> and binds <code>DOMContentLoaded</code>; and <code>i18n-id.js</code> loads <em>last</em> so it can non-destructively wrap <code>ID.Guide</code>, <code>ID.UI</code>, and <code>ID.Data</code>.
            </p>
          </section>

          <!-- SECTION 2 -->
          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">2. COMPLETE MODULE MAP &amp; OFFLINE ASSETS</h3>
            <table class="tradoc-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Namespace</th>
                  <th>Core Responsibilities &amp; Key Exports</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>index.html</code></td>
                  <td>DOM Shell</td>
                  <td>100% offline shell (zero CDN links), 7 workspace views, full-width 3-col + split lower-center Battlefield layout, 5 modals (<code>#welcome-modal</code>, <code>#battle-modal</code>, <code>#log-expand-modal</code>, <code>#cmd-trait-modal</code>, <code>#confirm-modal</code>), and <code>#ui-tour-overlay</code>.</td>
                </tr>
                <tr>
                  <td><code>css/tailwind-bundle.css</code></td>
                  <td>Tailwind Utility Bundle</td>
                  <td>Precompiled static Tailwind CSS v3.4.17 utility stylesheet generated directly from <code>index.html</code> and <code>js/**/*.js</code> for 100% offline execution.</td>
                </tr>
                <tr>
                  <td><code>css/styles.css</code></td>
                  <td>Theme &amp; Layout</td>
                  <td>Olive-steel military monitor frames, responsive grid (<code>&gt;=1500px</code> Log beside 2D Sector; <code>&gt;=1280px</code> <code>min-width</code>; <code>1024–1279px</code> <code>overflow-x: auto</code>), WebP background plates, riveted brass nameplates, 3px status accents, parchment manuals, and keycap badges.</td>
                </tr>
                <tr>
                  <td><code>js/diagnostics.js</code></td>
                  <td><code>ID.Diagnostics</code>, <code>ID.VERSION</code></td>
                  <td>Exposes unified <code>ID.VERSION = '3.5'</code>, global <code>window.onerror</code> and <code>unhandledrejection</code> traps, diagnostic error buffer, and crash-safe logging to the <code>SYS ERRORS</code> channel.</td>
                </tr>
                <tr>
                  <td><code>js/data.js</code></td>
                  <td><code>ID.Data</code></td>
                  <td>Static registries: <code>EXPERIENCE_TIERS</code>, <code>ARMOR_TIERS</code>, <code>DEFAULT_TERRAINS</code> (8), <code>TERRAIN_FEATURES</code> (6), <code>WEATHER_TYPES</code> (8), <code>TIME_OF_DAY_TYPES</code> (3), <code>COMPOUND_HAZARDS</code> (4), <code>DEFAULT_TRAITS</code> (32), <code>DEFAULT_COMMANDER_TRAITS</code> (10), <code>DEFAULT_COMMANDERS</code>, <code>TACTICS_DB</code> (25), and <code>DEFAULT_UNIT_TEMPLATES</code> (Arracourt &amp; San Marino).</td>
                </tr>
                <tr>
                  <td><code>js/engine-helpers.js</code></td>
                  <td><code>ID.Helpers</code>, <code>ID.Icons</code></td>
                  <td>Polyhedral RNG (<code>rollDie</code>, <code>clamp</code>), arbitrary-era UTC calendar (<code>makeUtcTimestamp</code> via <code>setUTCFullYear</code>, <code>formatYearLabel</code>, <code>getSimulatedBattleDate</code>, <code>getBattleDayOrdinal</code>), climate weather resolver (<code>getSeasonLabel</code>, <code>isWeatherAllowedInClimate</code>, <code>getClimateWeatherCandidates</code>), range/visibility helpers (<code>getUnitEngagementRange</code>, <code>canUnitEngageTarget</code>), NATO &amp; 10-tier Officer SVG generators, and <code>addLog()</code>.</td>
                </tr>
                <tr>
                  <td><code>js/engine-combat.js</code></td>
                  <td><code>ID.Combat</code></td>
                  <td>Round orchestrator (<code>runSingleRound</code>), 15-round undo stack (<code>pushHistorySnapshot</code>), unit factory (<code>createCombatUnitInstance</code>), supply/depot/dig-in/fatigue/DOW/4-round repair loop (<code>processSupplyAndStartOfRoundTraits</code>), vigilance (<code>performVigilanceComparison</code>), fire support + AA/weather grounding (<code>processSideSupportFire</code>), engagement loop (<code>resolveUnitEngagement</code>), piercing/<code>ARMOR HELD</code>/deflected knockout gating (<code>processArmorLossAndCrewCasualties</code>), crew &amp; personnel triage (<code>applyPersonnelCasualties</code>), dismounting vs. withdrawal (<code>canUnitDismountAsInfantry</code>), unscreened artillery auto-withdrawal, and per-unit combat telemetry (<code>u.stats</code>).</td>
                </tr>
                <tr>
                  <td><code>js/engine-pursuit.js</code></td>
                  <td><code>ID.Pursuit</code></td>
                  <td>Victory detection (<code>checkBattleEndCondition</code>), mobility pursuit &amp; exact personnel conservation (<code>resolveRetreatAndPursuit</code>), recovery tractor towing, proportional field salvage, and AAR snapshot builder (<code>buildAfterActionReport</code> with <code>weatherTrail</code> and <code>logistics</code>).</td>
                </tr>
                <tr>
                  <td><code>js/ui-render.js</code></td>
                  <td><code>ID.UI</code></td>
                  <td>Full DOM renderer (<code>renderAll</code>, <code>renderBattlefield</code>, <code>renderSideUnitCards</code>, <code>renderTacticalSectorCanvas</code>), XSS-escaped templates + delegated listeners (<code>initDelegatedUIHandlers</code> via <code>data-action</code>/<code>data-unit-id</code>), two-way map-to-card linking (<code>focusUnitCard</code>, <code>highlightMapCounter</code>), <code>toggleCompactUnitCards</code>, <code>toggleOpStatusCollapse</code>, 11-step spotlight tutorial (<code>startUITutorial</code>), 25-page Tactics Manual, immediate AAR modal (<code>openBattleSummaryModal</code>, <code>getActiveAARData</code>), and printable A4 Form DA-774 generator (<code>buildPrintableAARHtml</code>, <code>sanitizeForPrintableAAR</code>, <code>extractAARChronology</code>).</td>
                </tr>
                <tr>
                  <td><code>js/guide.js</code></td>
                  <td><code>ID.Guide</code></td>
                  <td>Renders the 3-tab Manila-folder documentation suite inside Tab 7: <code>FM 100-5-BOOT</code> (Drill Sergeant Guide), <code>TM 9-1005-TECH</code> (Technical Manual), and <code>DEV-DOC-ARCH</code> (this Codebase Documentation).</td>
                </tr>
                <tr>
                  <td><code>js/app.js</code></td>
                  <td><code>ID.App</code>, <code>ID.state</code></td>
                  <td>Global mutable state tree, <code>localStorage</code> persistence, scenario loaders (<code>loadArracourtScenario</code>, <code>loadSanMarinoScenario</code>), centralized side reset (<code>resetSideRuntimeState</code>), Auto-Ops timer, global desktop keyboard shortcuts (<code>Space</code>/<code>Enter</code>, <code>A</code>, <code>Ctrl+Z</code>), themed Military Confirmation modal (<code>openConfirmModal</code>), GM Live overrides, and Preset JSON export/import.</td>
                </tr>
                <tr>
                  <td><code>js/i18n-id.js</code></td>
                  <td><code>ID.I18n</code></td>
                  <td>Standalone drop-in Indonesian localization (default <code>'en'</code>): injects header <code>EN/ID</code> toggle, non-mutating display localization via <code>localizeField()</code> (keeping <code>ID.state</code> &amp; JSON exports language-neutral), runs a <code>WeakMap</code>-backed <code>MutationObserver</code> + <code>translateCombatLogText()</code>, swaps Welcome Modal &amp; subordinate-tone Indonesian Manuals, and transforms both immediate and printable AARs into authentic <strong>TNI AD MINU LAP-OPS</strong> format.</td>
                </tr>
                <tr>
                  <td><code>tests/run-tests.js</code></td>
                  <td>Node Test Harness</td>
                  <td>Zero-dependency headless regression &amp; invariant test suite runnable via <code>node tests/run-tests.js</code> (syntax, offline assets, combat math, XSS escaping, i18n decoupling, and Monte Carlo Personnel/AFV conservation).</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- SECTION 3 -->
          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">3. STATE TREE (IronDivision.state) &amp; LIVE UNIT SCHEMA</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">3-1.</span>
              All runtime state lives under a single serializable root object (<code>window.IronDivision.state</code>) so <code>structuredClone()</code> can snapshot any round cleanly for GM Undo or Preset JSON export:
            </p>
            <div class="tradoc-formula">
              <div class="tradoc-formula-label">TOP-LEVEL STATE STRUCTURE</div>
              <code>ID.state = { environment, battle: { round, attackerSide, isOver, winner, logs[], history[], initialSnapshot, salvageReport, afterActionReport, sideA: { name, commanderId, tacticId, supplyDepot, maxSupplyDepot, supplyRaidedTotal, depotCriticalClock, units[] }, sideB: { ... } }, unitTemplates[], traits[], commanders[], commanderTraits[], terrains{}, gmMode }</code>
            </div>
            <table class="tradoc-table">
              <thead>
                <tr>
                  <th>Unit Field Group</th>
                  <th>Properties on Each Deployed Unit Instance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Identity &amp; Base</strong></td>
                  <td><code>instanceId</code>, <code>templateId</code>, <code>name</code>, <code>side</code> (<code>'A'|'B'</code>), <code>category</code> (<code>infantry|armored_vehicle|tank|artillery</code>), <code>armorTier</code>, <code>experience</code>, <code>traits[]</code></td>
                </tr>
                <tr>
                  <td><strong>Personnel Conservation</strong></td>
                  <td><code>maxPersonnel</code>, <code>personnel</code>, <code>dead</code> (KIA), <code>wounded</code> (WIA), <code>captured</code> (POW), <code>escaped</code> (ESC) &mdash; post-battle invariant: <code>maxPersonnel === personnel + dead + wounded + captured + escaped</code></td>
                </tr>
                <tr>
                  <td><strong>Cohesion &amp; Logistics</strong></td>
                  <td><code>maxOrg</code>, <code>org</code>, <code>maxSupply</code>, <code>supply</code>, <code>supplyBelow50Triggered</code>, <code>supplyBelow20Triggered</code>, <code>orgRecoveryBlockedRounds</code>, <code>cumPersonnelLostTenths</code></td>
                </tr>
                <tr>
                  <td><strong>Material Armor Pool</strong></td>
                  <td><code>originalMaxArmor</code>, <code>maxArmor</code>, <code>armor</code>, <code>recoverableArmor</code>, <code>unrecoverableArmor</code> (KO), <code>towedArmor</code>, <code>abandonedArmor</code>, <code>isDismounted</code>, <code>lastArmorHitRound</code></td>
                </tr>
                <tr>
                  <td><strong>Spatial &amp; Status</strong></td>
                  <td><code>pos</code> (Y-axis distance from contact <code>0</code>), <code>entrenchmentLevel</code>, <code>mobilityClassPenalty</code>, <code>isRallying</code>, <code>rallyRoundsLeft</code>, <code>ralliedOnce</code>, <code>defeated</code>, <code>defeatReason</code>, <code>supportCooldowns{}</code>, <code>roundTemp{}</code></td>
                </tr>
                <tr>
                  <td><strong>Combat Telemetry (<code>u.stats</code>)</strong></td>
                  <td><code>casualtiesInflicted</code>, <code>afvsDisabled</code>, <code>afvsDestroyed</code>, <code>fieldRepairs</code>, <code>indirectCasualtiesInflicted</code>, <code>airCasualtiesInflicted</code></td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- SECTION 4 -->
          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">4. ROUND EXECUTION CALL GRAPH &amp; DATAFLOW</h3>
            <p class="tradoc-para">
              <span class="tradoc-para-id">4-1.</span>
              Pressing <strong>Execute Round</strong> (or <code>Space</code>/<code>Enter</code>) invokes <code>ID.Combat.runSingleRound()</code> inside a diagnostic try/catch wrapper. The exact execution pipeline is:
            </p>
            <ol class="list-decimal pl-6 space-y-1 text-sm text-[#232a24]">
              <li><code>pushHistorySnapshot()</code> &rarr; deep-clones <code>battle</code> + <code>environment</code> into <code>battle.history</code> (max 15 entries).</li>
              <li><strong>Climate Weather Tick</strong> &rarr; every 3 rounds when <code>dynamicWeather</code> is true, calls <code>H.getClimateWeatherCandidates()</code> and logs <code>[WTH] [Weather Shift]</code>.</li>
              <li><code>processSupplyAndStartOfRoundTraits(side, ...)</code> &rarr; runs per-unit engagement checks, pauses ammo/fatigue/Green drift when out of range, draws from <code>sideState.supplyDepot</code>, updates entrenchment, rolls DOW, processes rally staging, and fires 4-round <code>Field Repair Crew</code> (skipping if <code>lastArmorHitRound === round - 1</code>).</li>
              <li><code>performVigilanceComparison(atkSide, defSide, atkTactic, defTactic)</code> &rarr; rolls <code>1d100</code> per side to grant flat accuracy boost.</li>
              <li><code>processSideSupportFire(side, enemySide, ...)</code> &rarr; resolves Mortar, Artillery, and Air Support (with AA interception, weather grounding, and active target re-checking), crediting <code>u.stats</code> via <code>applySupportCasualtiesAndArmor(..., sourceUnit, channel)</code>.</li>
              <li><code>resolveUnitEngagement(attacker, defender, ...)</code> &rarr; executes within <code>runSingleRound()</code>'s maneuver/overwatch/combat loops: advances out-of-range units along <code>u.pos</code>, fires Defensive Overwatch, resolves Piercing vs. Hardness (or Cover Saves), calls <code>processArmorLossAndCrewCasualties()</code> &amp; <code>applyPersonnelCasualties()</code>, executes close-range supply raids (<code>totalDist &lt;= 2</code>), and runs Return Fire.</li>
              <li><code>ID.Pursuit.checkBattleEndCondition()</code> &rarr; checks active frontliners &amp; unscreened artillery auto-withdrawal; on battle conclusion runs <code>resolveRetreatAndPursuit()</code> &rarr; <code>buildAfterActionReport()</code>.</li>
              <li><code>ID.UI.renderCombatRound()</code> &rarr; updates flank cards, telemetry, sticky round badges, 2D SVG Tactical Sector, Y-axis strip, and SITREP logbook.</li>
            </ol>
          </section>

          <!-- SECTION 5 -->
          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">5. UI INTERACTION, MODAL &amp; i18n HOOK ARCHITECTURE</h3>
            <ul class="list-disc pl-6 space-y-1.5 text-sm text-[#232a24]">
              <li><strong>Two-Way Map-to-Card Linking &amp; Event Delegation:</strong> Dynamic unit cards, ORBAT/trait/commander editors, and SVG counters use <code>escapeHtml()</code> plus <code>data-action</code> / <code>data-unit-id</code> attributes handled by <code>initDelegatedUIHandlers()</code> — clicking an SVG counter calls <code>focusUnitCard(id)</code> (pulsing <code>.unit-card-flash</code>), and hovering a card highlights its map counter via <code>highlightMapCounter(id, active)</code>.</li>
              <li><strong>Cursor-Following Floating Tooltip:</strong> Every unit card embeds a hidden <code>.unit-tooltip-source</code> block (including a <code>.unit-tooltip-compact-extra</code> section revealed only when <code>body.compact-unit-cards</code> is active). A single delegated <code>mousemove</code> listener clones it into <code>#floating-unit-tooltip</code>.</li>
              <li><strong>Click-Outside Modals &amp; Confirmation Guard:</strong> All 5 modals bind <code>onclick="if(event.target===this) close...()"</code>. Destructive actions route through <code>ID.App.openConfirmModal({ title, message, hint, danger, onConfirm })</code> after pushing an undo snapshot via <code>pushHistorySnapshot()</code>.</li>
              <li><strong>Zero-Invasion Localization (<code>js/i18n-id.js</code>):</strong> Keeps English as default (<code>'en'</code>). On <code>setLanguage('id')</code>, static read-only registries update cleanly while persisted <code>ID.state</code> user data stays language-neutral via non-mutating <code>localizeField()</code> rendering; wraps <code>ID.Guide.renderSimulationGuide</code>, <code>ID.UI.openBattleSummaryModal</code>, and <code>ID.UI.buildPrintableAARHtml</code>, and uses a <code>WeakMap</code>-backed <code>MutationObserver</code> + <code>translateCombatLogText()</code>.</li>
            </ul>
          </section>

          <!-- SECTION 6 -->
          <section class="tradoc-chapter">
            <h3 class="tradoc-chapter-title">6. MODDING &amp; EXTENSION COOKBOOK</h3>
            <ul class="list-disc pl-6 space-y-1.5 text-sm text-[#232a24]">
              <li><strong>Adding a Historical/Fictional Scenario:</strong> Add templates in <code>js/data.js</code> (<code>DEFAULT_UNIT_TEMPLATES</code>), then add a loader function in <code>js/app.js</code> calling <code>loadScenarioByConfig({ terrain, feature, weather, year, month, day, hour, minute, sideAName, sideBName, sideACmd, sideBCmd, pickA, pickB, loadLog })</code>. Any year from <code>-270000</code> to <code>+270000</code> is supported natively.</li>
              <li><strong>Adding a New Unit Trait:</strong> Append an object to <code>DEFAULT_TRAITS</code> in <code>js/data.js</code> with standard numeric modifier fields (<code>atkPct</code>, <code>defPct</code>, <code>pierceFlat</code>, <code>armorRecBonus</code>, etc.) — <code>engine-combat.js</code> aggregates them dynamically.</li>
              <li><strong>Adding Another Language Pack:</strong> Duplicate <code>js/i18n-id.js</code> (e.g. <code>js/i18n-de.js</code>), translate <code>EXACT_MAP</code>, <code>LOG_REPLACEMENTS</code>, and the data maps, and load it after <code>js/app.js</code> in <code>index.html</code>.</li>
              <li><strong>Headless Automated Testing (<code>node tests/run-tests.js</code>):</strong> Run <code>node tests/run-tests.js</code> to execute the full Node <code>vm</code> invariant &amp; regression harness checking offline assets, combat rules, XSS escaping, i18n state decoupling, and full Monte Carlo Personnel/AFV conservation.</li>
            </ul>
          </section>

        </div>

        <footer class="tradoc-footer">
          <span>IRON DIVISION ENGINEERING // FULL CODEBASE ARCHITECTURE</span>
          <span>DEV-DOC-ARCH // END OF DOCUMENT</span>
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