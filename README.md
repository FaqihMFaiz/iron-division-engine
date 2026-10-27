# ⚔ IRON DIVISION ENGINE
### Operational-to-Tactical TTRPG Combined-Arms Combat Simulator

[![JavaScript](https://img.shields.io/badge/Language-Vanilla%20JavaScript-F7DF1E?logo=javascript&logoColor=black)](#)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v3-06B6D4?logo=tailwindcss&logoColor=white)](#)
[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Zero--Build-4ade80)](#)
[![Engine](https://img.shields.io/badge/Game%20Engine-HOI4%20TTRPG%20Engine-f59e0b)](#)

The **Iron Division Engine** is an operational-to-tactical tabletop role-playing game (TTRPG) combat simulation system. Inspired by division-level grand strategy mechanics (specifically *Hearts of Iron IV*), it translates combined-arms warfare into a polyhedral dice-based framework (`d3`, `d4`, `d6`, `d8`, `d10`, `d12`, `d16`, `d20`, `d50`, `d70`, `d100`).

Unlike traditional RPG combat engines that track single-entity hit points, the Iron Division Engine simulates **Combined-Arms Formations** through multi-layered telemetry: decoupled Manpower vs. Cohesion, dynamic vehicle wear, penetration-gated armor plate, logistical friction, defensive overwatch, and morale rallying.

---

## 📑 Table of Contents
1. [Core Features](#-core-features)
2. [Project Architecture & File Layout](#-project-architecture--file-layout)
3. [Combat Mechanics & Mathematical Models](#-combat-mechanics--mathematical-models)
   - [Unit Anatomy & Dual-HP System](#unit-anatomy--dual-hp-system)
   - [Armor Tiers & Penetration Mechanics](#armor-tiers--penetration-mechanics)
   - [Infantry Dispersion & Cover Saves](#infantry-dispersion--cover-saves)
   - [Grazing Damage & Armor/Bunker Immunity](#grazing-damage--armorbunker-immunity)
   - [Melee Distance & Gap-Closing Engine](#melee-distance--gap-closing-engine)
   - [The Rallying Engine & Manpower Safety Net](#the-rallying-engine--manpower-safety-net)
   - [Medical Triage & Died of Wounds (DOW)](#medical-triage--died-of-wounds-dow)
   - [Logistical Friction & Combat Fatigue](#logistical-friction--combat-fatigue)
4. [The 7-Phase Combat Round Lifecycle](#-the-7-phase-combat-round-lifecycle)
5. [Commanders & Attribute Scaling](#-commanders--attribute-scaling)
6. [Tactical Doctrines Compendium (25 Tactics)](#-tactical-doctrines-compendium-25-tactics)
7. [Post-Battle Resolution: Pursuit, Overruns & Field Salvage](#-post-battle-resolution-pursuit-overruns--field-salvage)
8. [Installation & Quick Start](#-installation--quick-start)
9. [Diagnostics & Error Boundary](#-diagnostics--error-boundary)

---

## 🌟 Core Features

- **Dual-HP Decoupling**: Tracks physical casualties (**Personnel HP**) separately from unit stamina and tactical cohesion (**Organization HP**).
- **Material Vehicle Pool**: Tracks operational armored fighting vehicles (**Combat-Ready Armor**), enabling mechanical knockouts, field repairs, and post-battle salvaging.
- **Dynamic Armor Scaling**: As combat vehicles are knocked out, unbuttoned crews and exposed infantry take an increasing share of soft damage, while effective hardness degrades proportionally.
- **Skip Piercing vs. Soft Targets**: Anti-tank kinetic penetrators bypass arbitrary piercing checks against unarmored foot infantry; targets instead roll an **Entrenchment & Dispersion Save (`d20 + Cover`)**.
- **Grazing & Armor Immunity**: Low-caliber small arms cannot damage Super-Heavy or Heavy tanks. Non-breakthrough damage is scaled by an attack-to-defense **Pressure Ratio**, with heavy bunkers absorbing chip damage.
- **Melee Distance & Overwatching Enfilade Fire**: Melee formations must close physical distance (`Distance >= 1`) across no-man's-land. Ranged defenders shoot charging melee units during defensive turns with uncontested enfilade volleys.
- **Manpower-Anchored Rallying**: Routed units retreat to the rear and make a `d20` Rally Check vs. DC 10. Formations with $\ge 60\%$ manpower never dissolve—officers delay the rally by 1 round to re-form ranks.
- **Mobility Pursuit & Overruns**: Features 6 standardized Speed Classes (0–5). Faster formations gain pursuit bonuses, with $\Delta\text{Mob} \ge 3$ triggering **Automatic Overruns (90% captured)**.
- **Victor Battlefield Possession**: The victor holds the field, claiming abandoned enemy equipment for field repairs (**Beutepanzers**), supply scrap, or depot refit.
- **Creature "No Quarter" Doctrine**: Victorious Monsters and Zombies take zero prisoners—all captured and wounded human troops are converted directly to **KIA (Slaughtered / Devoured)**.
- **Robust Customizers**: In-app editors for Units, Custom Traits, Commander Traits, Custom Generals, and Environmental Terrains.
- **Crash-Proof Diagnostics**: Integrated diagnostic boundary with global exception catching, ensuring simulation loops never freeze silently.

---

## 📂 Project Architecture & File Layout

The engine is built with clean, zero-build, modular vanilla JavaScript:

```text
iron-division/
│
├── index.html              # Core application layout, UI tabs, and AAR modal
├── css
│   └── styles.css              # Custom scrollbars, animations, and telemetry transitions
└──js
    ├── diagnostics.js          # System error logger, global exception traps, diagnostic registry
    ├── data.js                 # Static databases (Tactics, Traits, Terrains, Weathers, Templates)
    ├── engine-helpers.js       # Dice utils, Cover, Distance, Grazing, and Overwatch formulas
    ├── engine-combat.js        # Main combat loop, Targeting, Piercing, Clashes, DOW, and Rallying
    ├── engine-pursuit.js       # Post-battle Retreat, Overruns, Towing, and Victor's Field Salvage
    ├── ui-render.js            # DOM rendering (Unit cards, Telemetry, Log, Customizers, Modal)
    └── app.js                  # State initialization, battle controls (Auto Run, Reset), Bootstrap
```

---

## 🧮 Combat Mechanics & Mathematical Models

### Unit Anatomy & Dual-HP System
A formation is removed from battle under three conditions:
1. **Total Wipeout**: Personnel reaches `0`.
2. **Cohesion Rout**: Organization reaches `0` while unable to rally (or having already rallied once).
3. **Material Defeat**: Combat-Ready Armor reaches `0` while mounted. (Crews with surviving personnel fall back on foot as dismounted infantry).

```text
+--------------------------------------------------------------------------+
|                            COMBAT CATEGORIES                             |
+-------------------+---------------+---------------+----------------------+
| Category          | Attacking Die | Defending Die | Base Mobility Rating |
+-------------------+---------------+---------------+----------------------+
| Infantry          | d12           | d12           | Class 1 (Foot)       |
| Armored Vehicle   | d16           | d16           | Class 4 or 5 (+20)   |
| Tank              | d20           | d20           | Class 3 or 4 (+10)   |
| Artillery         | d20           | d8            | Class 0 (Towed)      |
+-------------------+---------------+---------------+----------------------+
```

---

### Armor Tiers & Penetration Mechanics

Incoming attack firepower is partitioned based on the target's Armor Tier:
* **Unarmored**: 0% Hard / 100% Soft
* **Light Armor**: 25% Hard / 75% Soft
* **Medium Armor**: 50% Hard / 50% Soft
* **Heavy Armor**: 75% Hard / 25% Soft
* **Super Heavy**: 100% Hard / 0% Soft

#### Effective Hardness & Armor Degradation
$$\text{Vehicle Ratio} = \text{clamp}\left(\frac{\text{Current Armor}}{\text{Max Armor}},\, 0,\, 1\right)$$
$$\text{Effective Hard Ratio} = \text{Base Hard Ratio} \times (0.35 + 0.65 \times \text{Vehicle Ratio})$$
$$\text{Effective Hardness} = \max\left(0,\, (\text{Hardness} + \text{Traits}) \times \text{clamp}(\text{Vehicle Ratio},\, 0.25,\, 1.0) - \text{Maluses}\right)$$

* **Close-Assault Bypass**: In **Urban**, **Forest**, **Jungle**, and **Mountain** terrain, attacking infantry ignore **35% of the target's Hardness**.
* **Non-Piercing Bleed-Through**: Unpierced hits apply full Soft Attack, **20% Hard Attack concussive bleed-through**, and **`+2` chip damage**.

#### Armor Loss & Crew Casualties (If Pierced)
$$\text{Margin Ratio} = \frac{\text{Attacker Penetration Roll} - \text{Defender Hardness Roll}}{\max(1,\, \text{Effective Hardness})}$$
* $\text{Ratio} \le 0.25$: Minor Breach $\rightarrow$ **`d3` vehicles disabled**.
* $0.25 < \text{Ratio} \le 0.50$: Moderate Breach $\rightarrow$ **`1 + d6` vehicles disabled**.
* $0.50 < \text{Ratio} \le 0.75$: Severe Overmatch $\rightarrow$ **`3 + d8` vehicles disabled**.
* $\text{Ratio} > 0.75$: Catastrophic Overmatch $\rightarrow$ **`6 + d12` vehicles disabled**.
* **Crew Losses**: Destroyed vehicles inflict **`1 + d4` crew casualties**; disabled vehicles inflict **`d2` crew casualties**.

---

### Infantry Dispersion & Cover Saves
When targeting unarmored formations, the piercing check is bypassed. The defender makes an **Entrenchment & Dispersion Save**:

$$\text{Cover Save} = \text{d20} + \text{Terrain Cover} + \text{Entrenchment Level} + \text{Traits} \ge \text{DC } (12 + \text{Attacker Spotting})$$

* **In Defilade (Success)**: Soft Attack halved; High-Caliber bonus negated; Explosives halved.
* **Caught in Open (Failure)**: Full damage applied; target suffers **`-(1 + d4)` suppressive Organization shock**.

---

### Grazing Damage & Armor/Bunker Immunity
When an attack fails to achieve a breakthrough ($\text{Attack} \le \text{Defense}$):

$$\text{Pressure Ratio} = \frac{\text{Attack Value}}{\max(1,\, \text{Defense Value})}$$

1. **Armor Immunity**: Super-Heavy and Heavy/Medium tanks are **100% immune** to non-penetrating small arms without High-Caliber or Explosives.
2. **Bunker Immunity**: Level 5 Deep Bunkers provide **100% immunity** to grazing damage.
3. **Threshold Check**:
   * $\text{Pressure} < 40\%$ ($< 60\%$ in Forts): **COMPLETELY IMMUNE (0 Damage)**.
   * $40\% \le \text{Pressure} < 50\%$: **`1` chip casualty**.
   * $50\% \le \text{Pressure} < 75\%$: **`1 + d2` casualties**.
   * $75\% \le \text{Pressure} < 100\%$: **`1 + d3` casualties**.
4. **Fort Mitigation**: Fortifications subtract **`-2`** casualties; Entrenchment Lvl 3+ subtracts **`-1`**.

---

### Melee Distance & Gap-Closing Engine
Formations equipped with melee weapons (`melee_attack`, `zombie_unit`) track engagement distance:

$$\text{Initial Distance} = \max(1,\, \text{Base Terrain Distance} + \text{Feature Distance})$$
*(e.g., Plains = 1, Mountain with Fort = 5)*

* While $\text{Distance} \ge 1$: Melee units **cannot attack** and **cannot return fire**.
* **Defensive Overwatch**: Defending ranged formations shoot charging melee units during defense rounds with uncontested enfilade volleys.
* **Mutual Charge**: If both sides are melee, distance decreases by **`2` per round**.
* When $\text{Distance} = 0$: Direct hand-to-hand trench combat begins. Melee attacks against Monsters/Zombies inflict **`-20 Return Fire Vigilance`** and **`-30% Return Fire Attack`**.

---

### The Rallying Engine & Manpower Safety Net
Routed units retreat to the rear queue for **`2 + d2 Rounds`** (`-1 Round` with *Organizer*).

#### The d20 Rally Check vs. DC 10
$$\text{Rally Roll} = \text{d20} + \text{Exp} + \text{Cmd} + \text{Frontline} + \text{Troops Mod} + \text{Supply Mod} + \text{Armor Mod} \ge \text{DC 10}$$

* **Resource Modifiers**: $> 70\%$ remaining grants **`+3`**; $50\%–70\%$ grants **`+1`**; $30\%–50\%$ is **`0`**; $< 30\%$ inflicts **`-3`**.
* **Intact Formation Safety Net**: If $\text{Personnel} \ge 60\%$, a failed check **does not destroy the unit**. Officers re-form ranks, delaying the rally by **`+1 Round`**.
* **Manpower Cohesion Shield**: Formations with $\ge 75\%$ personnel gain **`+1 passive Org regen`** and absorb **`-2` Org damage** from chip hits.
* **Return Strength**: Formations with $\ge 75\%$ personnel rally with **`d10 + 5` Organization**; armored units with running vehicles retain their tanks.

---

### Medical Triage & Died of Wounds (DOW)
Starting in **Round 4+**, untreated wounded personnel (WIA) risk succumbing to trauma:

$$\text{DOW Rate} = \text{clamp}(\text{Supply Deficit} + \text{Weather Exposure} - \text{Medical Traits},\, 0,\, 15)\%$$

* Supply $\ge 50\%$: **`0%` base mortality**.
* Low Supply ($<20\%$): `+5%` mortality; Starvation ($0\%$): `+10%`.
* Medical Mitigation: *First Aid Kit* (`-4%`), *Field Medic* (`-3%`).
* **No Forced Casualties**: Losses are calculated using fractional probabilities (small squads with minor injuries do not suffer guaranteed deaths).

---

### Logistical Friction & Combat Fatigue

$$\text{Round Supply Drain} = \text{d3} + \text{Terrain} + \text{Weather} + \text{Tactics} - \text{Logistics Traits}$$

* **Supply $< 50\%$**: `-10%` stats, one-time `-(2+d6)` Org shock, locks support weapons.
* **Supply $< 20\%$**: `-20%` stats, one-time `-(3+d10)` Org shock, continuous `-(1+d3)` Org/rd.
* **Supply $= 0\%$**: `-50%` stats, continuous `-(2+d4)` Org/rd.
* **Combat Fatigue**: Rounds 1–5: `0`; Rounds 6–12: `-1` Org/rd; Rounds 13+: `-2` Org/rd. (Resting units in the rally queue are immune).

---

## 🔄 The 7-Phase Combat Round Lifecycle

1. **Doctrinal Tactic Selection & AI**: Both sides pick from 25 doctrines matching their role. Commander personalities (Aggressive, Balanced, Cautious) automate selection.
2. **Logistics, Upkeep, DOW & Rallying**: Supply drains, DOW resolved, entrenchment builds (+1 lvl/rd, max 2–5), rally queue resolves.
3. **Recon / Vigilance Contest (`d100`)**: Margin of victory divided by 10 applied as a flat stat boost to the winner.
4. **Off-Map Fire Support & AA Interception**: Mortars, Heavy Artillery, and Air Support strike targets. Anti-Air Guns intercept flights (critical 8 inflicts +4 rds cooldown).
5. **Main Assault & Clash**: Target selection, piercing vs. dispersion saves, attack vs. defense clash, damage resolution (`50 + d50` recovery roll).
6. **Defensive Return Fire**: Defenders clash against attacker Breakthrough/Defense. Grazing fire evaluated.
7. **Role Swap & Theatre Lock**: Tactical initiative alternates, but the **Theatre Role (Invader vs. Entrenched Garrison)** remains static.

---

## 🎖 Commanders & Attribute Scaling

Commanders provide four core attributes scaling from Level 0 to 10:

$$\text{Attack Bonus} = \text{Atk Level} \times 2.5\% \quad | \quad \text{Defense Bonus} = \text{Def Level} \times 2.5\%$$
$$\text{Max Org Bonus} = \text{Cmd Level} \times 2.5\% \quad | \quad \text{Supply Efficiency} = \text{Log Level} \times 2.5\%$$

### Custom Commander Trait Editor
Supports custom officer traits with parameters for:
* **Formation Scope**: Army-wide, Infantry-only, Tanks-only, or Artillery-only.
* **Combat Modifiers**: Attack %, Defense %, Soft/Hard Attack, Piercing, Hardness.
* **Rally Masteries**: Rally Check bonuses, Cooldown reductions (-1 to -3 rds), Extra starting Org.
* **Triage & Logistics**: Supply drain reduction, recovery bonuses, and terrain synergies.

---

## 📋 Tactical Doctrines Compendium (25 Tactics)

### Standard Attack Tactics (11)
- **Attack (Balanced)**: `+10%` Atk, `+5%` Def in return fire.
- **Assault (Aggressive)**: `+25%` Atk, `+10%` Breakthrough, `-15%` Def, `-10` Vig. Resets entrenchment to 0.
- **Encirclement (Aggressive)**: `+15%` Atk vs. engaged targets, `+20` Pursuit roll, enemies take `-10%` Def.
- **Shock (Aggressive)**: `+20%` Atk, `+2` Flat Atk, `+15%` Org dmg, `-5` enemy Vig. Malus: `-20%` Def, `1` self Org dmg.
- **Breakthrough (Balanced)**: `+25%` Atk vs. positions, `+3` Flat Pierce. Gains `+10%` Atk next round on $\ge 10\%$ casualty hit.
- **Blitz (Aggressive)**: `+20%` Atk, `+15` Vig, blocks enemy Org recovery on hit. Malus: `-20%` Def, `+1` Supply drain.
- **Mass Charge (Aggressive)**: `+30%` Atk if outnumbering $\ge 50\%$ (`+45%` if 2:1). Takes `+15%` casualties from MGs/Artillery.
- **Infiltration Assault (Cautious)**: `+15` Vig, `+10%` Atk vs. Artillery/Support, `15%` bypass chance.
- **Well-Planned Attack (Balanced)**: `+15%` Atk (`+25%` if enemy tactic revealed), `+10` Vig, `+2` Flat Def in return fire.
- **Relentless Assault (Aggressive)**: `+15%` Atk (`+25%` if target $\le 30\%$ Org), `+2` Org heal on hit. Malus: `+1` Supply drain.
- **Unexpected Thrust (Aggressive)**: `+25%` Atk, `+20` Vig on round 1 of use. Malus: `-10%` Atk/Def if repeated.

### Standard Defense Tactics (7)
- **Defend (Balanced)**: `+20%` Def (`+30%` in Fort), `+10%` Return-Fire Atk. Malus: `-10%` Atk.
- **Counterattack (Aggressive)**: `+20%` Return-Fire Atk, `+10%` Def. Grants `+2` Org if counterattack succeeds.
- **Delay (Cautious)**: `+15%` Def, `+15` Retreat roll, successful defense inflicts `-10%` Atk on enemy next round. Halves Blitz bonus.
- **Tactical Withdrawal (Cautious)**: `-20%` Casualties taken, `+25` Retreat roll. Malus: `-20%` Atk, `-10%` Def.
- **Ambush (Cautious)**: `+25` Vig, `+20%` Round 1 Atk (`+30%` if Vig won by $\ge 15$), `+15%` Round 1 Def.
- **Backhand Blow (Balanced)**: `+15%` Def vs. initial hit, `+25%` Atk vs. enemy that attacked last round (`+35%` on heavy loss).
- **Guerrilla Tactic (Cautious)**: `+20` Vig, `+15%` Atk in rough terrain, steals `1+d3` supply on hit, `+15` Retreat roll.

### Urban Tactics (4 Attack, 3 Defense)
- **Street Fighting (Atk)**: `+20%` Inf Atk (`+35%` vs. buildings), `+15%` Def vs. return fire, `+10%` AT Pierce.
- **Street-by-Street Barrage (Atk)**: `+25%` Atk vs. fortified urban targets. Enemy Def `-(2+d6)`. Roll 5–6 on d6: `+d6` casualties. (2-rd CD).
- **Armour-Supported Urban Assault (Atk)**: `+20%` Inf Atk with armor, `+2` Flat Inf Def, `+10%` Armor Def. Malus: `-15%` Tank Atk.
- **Mouse-Holing (Atk)**: `+20` Vig, `+20%` Atk inside buildings, `25%` bypass chance (`+35%` with Infiltration Specialist).
- **Defend City (Def)**: `+20%` Def (`+30%` in buildings), `+10` Vig, `+10%` Return-Fire vs. Infantry.
- **Fortified Defense (Def)**: `+30%` Def (`+40%` with Fort Engineer), `-15%` Org dmg taken, first hit deals `-2` flat Org dmg.
- **Urban Ambush Tactics (Def)**: `+25` Vig, `+25%` Round 1 Atk, `+15%` Def. Roll 5–6 on d6 inflicts `+d6` extra casualties.

---

## 🏆 Post-Battle Resolution: Pursuit, Overruns & Field Salvage

```text
                                  [COMBAT CONCLUDED]
                                           │
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
              [VICTOR IS HUMANS]                  [VICTOR IS CREATURES]
        Contested Pursuit vs. Retreat             (Monsters / Zombie Swarm)
        • ΔMob >= 3: Overrun (90% POW)                       │
        • Towing: Escaping armor saves 25-50%                ▼
        • Salvage: 50+d50 roll yields                [NO QUARTER RULE]
          Beutepanzers & Supply scrap.            • All POWs & WIA converted to KIA!
                                                  • 0 Prisoners taken.
                                                  • Vehicles crushed to scrap iron.
```

### Proportional Field Salvage (Victor Roll `50 + d50`)
* **Score $\ge 80$**: 50% *Beutepanzers* impressed into service; 35% stripped (+5 Supply each); 15% scuttled.
* **Score $60–79$**: 25% *Beutepanzers*; 50% stripped for parts; 25% scuttled.
* **Score $40–59$**: 10% *Beutepanzers*; 50% stripped for parts; 40% scuttled.
* **Score $< 40$**: 0% *Beutepanzers*; 25% stripped for parts; 75% scuttled.

---

## 🚀 Installation & Quick Start

The Iron Division Engine requires **no build step, no npm, and no command-line tools**.

### Option A: Flat Directory (Simplest)
Keep all files in the same folder:
```text
my-simulator/
├── index.html
├── styles.css
├── diagnostics.js
├── data.js
├── engine-helpers.js
├── engine-combat.js
├── engine-pursuit.js
├── ui-render.js
└── app.js
```
Open `index.html` in any web browser.

### Option B: Local Web Server (Recommended for Development)
If using VS Code, install **Live Server**, right-click `index.html`, and select **Open with Live Server**. Alternatively, run via Python:
```bash
python -m http.server 8000
```
Navigate to `http://localhost:8000`.

---

## 🚨 Diagnostics & Error Boundary

The engine contains an integrated error-catching boundary to prevent silent crashes:
* **Try/Catch Round Wrapper**: Traps exceptions during execution, halts the auto-runner cleanly, and preserves battle state.
* **Global Exception Traps**: Intercepts unhandled script errors and reports the file and line number.
* **In-App Error Filter**: Filter the combat log by **`🚨 System Errors`** to view formatted diagnostic traces directly in the UI.

---

## 📜 License
Distributed under the MIT License. Open-source for tabletop RPG gaming, game design research, and campaign simulations.
```