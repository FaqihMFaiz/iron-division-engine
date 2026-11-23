# ⚔ IRON DIVISION ENGINE (v3.5)

### Operational-to-Tactical TTRPG Combined-Arms Combat Simulator

The **Iron Division Engine** is an operational-to-tactical tabletop role-playing game (TTRPG) combat simulation system built in zero-build vanilla JavaScript. Inspired by division-level grand strategy mechanics (specifically *Hearts of Iron IV*), it translates combined-arms warfare into a polyhedral dice-based framework (`d3`, `d4`, `d6`, `d8`, `d10`, `d12`, `d16`, `d20`, `d50`, `d100`).

By default, the simulator loads the historical **Battle of Arracourt (18 September 1944, Lorraine Hills)** — General Hasso von Manteuffel's 5th Panzer Army assaulting Colonel Bruce C. Clarke's U.S. 4th Armored Division (CCA) in morning fog — with the **Battle of San Marino (17 September 1944)** also available as a one-click preset.

Unlike arcade hit-point trackers, Iron Division simulates **Combined-Arms Formations** through multi-layered telemetry: decoupled Manpower vs. Organization, penetration-gated armor plate, dynamic vehicle knockouts & field repairs, Y-axis spatial engagement ranges, climate-aware dynamic weather, shared depot logistics, morale rallying, bilingual localization (**English & Bahasa Indonesia**), and printable military After-Action Reports (**U.S. Form DA-774** & **TNI AD MINU LAP-OPS**).

## 📑 Table of Contents

1. [Core Features](#-core-features)
2. [Project Architecture & File Layout](#-project-architecture--file-layout)
3. [Battlefield UX, Layout & Keyboard Shortcuts](#-battlefield-ux-layout--keyboard-shortcuts)
4. [Combat Mechanics & Mathematical Models](#-combat-mechanics--mathematical-models)
   * [Unit Anatomy, Dismounting & Withdrawals](#unit-anatomy-dismounting--withdrawals)
   * [Armor Tiers, ARMOR HELD Mitigation & Knockout Gating](#armor-tiers-armor-held-mitigation--knockout-gating)
   * [Armor Recovery (80 + d20% Cap) & Field Repair Crew](#armor-recovery-80--d20-cap--field-repair-crew)
   * [Infantry Dispersion & Cover Saves](#infantry-dispersion--cover-saves)
   * [Grazing Damage & Armor/Bunker Immunity](#grazing-damage--armorbunker-immunity)
   * [Y-Axis Spatial Distance, Ranges & Close-Range Supply Raiding](#y-axis-spatial-distance-ranges--close-range-supply-raiding)
   * [Climate-Aware Dynamic Weather & Arbitrary-Era Calendar](#climate-aware-dynamic-weather--arbitrary-era-calendar)
   * [The Rallying Engine, Org Floor & Shock Sync](#the-rallying-engine-org-floor--shock-sync)
   * [Medical Triage & Died of Wounds (DOW)](#medical-triage--died-of-wounds-dow)
   * [Logistical Friction, Out-of-Range Pauses & Combat Fatigue](#logistical-friction-out-of-range-pauses--combat-fatigue)
5. [The 8-Step Combat Round Lifecycle](#-the-8-step-combat-round-lifecycle)
6. [Commanders, 10-Tier Officer Ranks & Attribute Scaling](#-commanders-10-tier-officer-ranks--attribute-scaling)
7. [Tactical Doctrines Compendium (25 Tactics)](#-tactical-doctrines-compendium-25-tactics)
8. [Post-Battle Resolution, Exact Conservation & AARs](#-post-battle-resolution-exact-conservation--aars)
9. [Bilingual Localization (EN / ID & TNI AD Format)](#-bilingual-localization-en--id--tni-ad-format)
10. [Installation & Quick Start](#-installation--quick-start)
11. [Diagnostics & Error Boundary](#-diagnostics--error-boundary)

## 🌟 Core Features

* **Dual-HP Decoupling**: Tracks physical casualties (**Personnel HP**) separately from unit stamina and tactical cohesion (**Organization HP**, displayed in distinct muted teal so it never collides with Side A blue).
* **Realistic Armor Physics & Penetration**: Unpierced hits (`ARMOR HELD`) against Medium/Heavy/Super armor halve personnel casualties, negate Explosive bonus dice, and cap Heavy/Super Org shock at `-1`. Deflected clashes gate vehicle knockouts (`0` below 70% pressure, max `2` above).
* **Dynamic `80 + d20%` Armor Recovery & Pinned Field Repairs**: Knocked-out vehicles split into Recoverable vs. Destroyed (`KO`) via a dynamic `80 + d20%` recovery cap with probabilistic fractional rounding. Organic **Field Repair Crews** operate every 4 rounds (paused if hit by anti-armor fire the previous round) and restore `1–2` hulls (`up to 3` with *Simple Engineering*).
* **Smart Dismounting vs. Tactical Withdrawals**: Standard armored infantry (`armored_vehicle` without `anti_tank`) dismount on foot at `<= 20%` Org (with `>= 50%` personnel) or `0` vehicles. Pure Tanks, SP Artillery, and Tank Destroyers withdraw to depot at `0` operational vehicles; lone unscreened artillery auto-withdraws when all frontliners fall.
* **Y-Axis Spatial Ranges & 2D Tactical Sector**: Live 2D SVG sector map with two-way map-to-card linking (click any NATO counter to scroll to and flash its battalion card; hover a card to highlight its counter on the map). Tank Destroyers (`anti_tank` armored vehicles) engage at `<= 3` alongside Tanks; Supply Raiding is gated to close-range direct-fire units (`<= 2`, non-artillery).
* **Climate-Aware Dynamic Weather & Any-Era Calendar**: Dynamic weather obeys terrain, calendar season, and time of day. The calendar uses `Date.setUTCFullYear()` to support any historical or fictional year from **`-270000` (BCE) to `+270000`**, including Year `0` and double-digit years.
* **Full Telemetry AAR & Printable A4 PDF Export**: Strictly in-universe **Form DA-774** (English) and **TNI AD MINU LAP-OPS** (Bahasa Indonesia) reports with exact personnel conservation (`START === REM + KIA + WIA + POW + ESC`), self-verifying AFV ledgers (`Start | Act/Rec/Tow/KO`), per-unit `Inflicted (Cas/AFV)` kills, theatre depot logistics, timestamped `METEO` weather trail, phase-balanced chronology, faction-neutral salvage, data-driven G-3/SOPS citations, and running `PAGE X OF Y` footers.
* **Interactive 11-Step UI Tutorial & Dual Manuals**: Built-in spotlight walkthrough (`UI TOUR`) plus Manila-folder **Field Manual (`FM 100-5-BOOT`)** and **Technical Manual (`TM 9-1005-TECH`)** — with a casual subordinate-to-commander Indonesian edition (*Komandan / Kumendan / Ndan*) in `ID` mode.
* **GM Live Controls & Preset JSON I/O**: 15-round Undo stack (`Ctrl+Z`), mid-battle unit/depot overrides, custom ORBAT/Traits/Commanders/Terrain editors, themed Military Command Confirmation modals (replacing browser `window.confirm`), and full Preset JSON export/import.

## 📂 Project Architecture & File Layout

The engine is built with clean, zero-build, modular vanilla JavaScript:

```text
iron-division/
│
├── index.html                  # Application layout, 7 workspaces, modals, and UI tour overlay
├── README.md                   # Engine documentation and mathematical reference
├── css/
│   └── styles.css              # Military UI theme, wide-monitor grid, paper manuals, and animations
└── js/
    ├── diagnostics.js          # System error logger, global exception traps, diagnostic registry
    ├── data.js                 # Static registries (Terrains, Weather, 32 Traits, 10 Cmd Traits, 25 Tactics, Templates)
    ├── engine-helpers.js       # Dice RNG, arbitrary-era UTC clock, climate weather resolver, SVGs, log buffer
    ├── engine-combat.js        # 8-step combat loop, penetration/armor mitigation, repairs, DOW, rally, telemetry
    ├── engine-pursuit.js       # Victory checks, pursuit/POW conservation, towing, salvage, AAR snapshot builder
    ├── ui-render.js            # DOM rendering, 2D Tactical Sector, floating tooltips, UI tour, Form DA-774 PDF
    ├── guide.js                # Manila-folder Field Manual (FM 100-5-BOOT) & Technical Manual (TM 9-1005-TECH)
    ├── app.js                  # State management, localStorage, keyboard shortcuts, GM Live, confirm modal, JSON I/O
    └── i18n-id.js              # Drop-in Bahasa Indonesia localization (EN default, data.js, logs, manuals, TNI AD AAR)
```

## 🖥️ Battlefield UX, Layout & Keyboard Shortcuts

* **Full-Width Responsive Desktop Cockpit**: Uses full viewport width (`max-w-full`, `min-width: 1280px` on desktop) with independent scrollable flank rosters (`Side A` left, `Side B` right) and a pinned sticky center column.
  * On wide monitors (`≥1500px`), the sticky center cockpit displays **Operational Status** across the top and splits cleanly below into **SITREP // COMBAT LOG** (left) beside the **2D Tactical Sector & Y-Axis Rangefinder** (right).
  * On standard desktop (`1200–1499px`), the 2D Sector and Combat Log stack neatly in the center column.
* **Above-the-Fold Theatre Ticker**: `THEATRE COMMAND & ENVIRONMENT` starts collapsed to a single-line `CLOCK // ... | TERR // ... | METEO // ...` summary bar (`▼ EXPAND` to edit).
* **Collapsible Sticky Operational Status**: Click `▲` on the Operational Status card to collapse it into a razor-thin sticky bar showing only `RD-XX`, **Execute Round**, **Auto-Ops**, and the **Force Ratio** bar.
* **Compact Unit Card Mode & Enriched Tooltips**: Toggle `COMPACT / FULL` next to `+ DEPLOY` to hide secondary rows (`TV`/`Dig-In`, `KIA/WIA`, `Class`, `Recov/KO`) — hovering any card in Compact mode automatically reveals all hidden details inside the floating dossier tooltip.
* **Status-Driven Card Accents**: Every unit card has a `3px` left-edge status bar — solid steel-blue/crimson when combat-effective, muted amber when `ORG` or `SUP` drops below `30%`, and a desaturated diagonal hatch overlay when routed or knocked out.
* **Military Nameplates & Modals**: Battlefield commander dropdowns and Command HQ roster names render on riveted brass-trimmed olive-steel nameplates; all pop-ups dismiss on outside click or `Esc`, and destructive actions (**Reset** / **Clear**) use a themed **Command Confirmation Modal** with `Ctrl+Z` undo protection.

### Desktop Keyboard Shortcuts (Battlefield Tab)

| Key | Action |
| :--- | :--- |
| `Space` or `Enter` | **Execute Round** (advances 1 combat round) |
| `A` | Toggle **Auto-Ops** continuous execution |
| `Ctrl+Z` / `Cmd+Z` | **Undo 1 Round** (restores previous snapshot from 15-round history) |
| `←` / `→` / `Enter` | Navigate **Interactive UI Tour** steps when active |
| `Esc` | Close active **Confirmation Modal** or **UI Tour** |

*(Combat shortcuts automatically pause while typing in inputs/selects or while any modal is open.)*

## 🧮 Combat Mechanics & Mathematical Models

### Unit Anatomy, Dismounting & Withdrawals

A formation leaves active frontline combat under four conditions:

1. **Total Wipeout (`WIPED OUT`)**: Personnel reaches `0`.
2. **Cohesion Rout (`ROUTED` / `DISPERSED` / `SHATTERED`)**: Organization reaches `0` while unable to rally (or after already having rallied once).
3. **Material Defeat / Armor Withdrawal (`WITHDRAWN (0 AFV)` vs. `DISMOUNTED (OP)`)**:
   * Standard `armored_vehicle` units *without* `anti_tank` (halftracks, APCs, recon) **dismount as infantry** when `Org <= 20%` (with `>= 50%` personnel) or when `0` vehicles remain.
   * Pure `tank`, SP `artillery`, and `anti_tank` Tank Destroyer units do **not** dismount on foot — at `0` combat-ready vehicles, they withdraw to depot for refit.
4. **Unscreened Artillery Withdrawal (`WITHDRAWN (UNSCREENED)`)**: Lone artillery batteries left with zero active friendly frontline screening units automatically limber up and withdraw from the sector.

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

### Armor Tiers, ARMOR HELD Mitigation & Knockout Gating

Incoming firepower partitions across Soft/Hard Attack based on the target's Armor Tier (**Unarmored** 0/100%, **Light** 25/75%, **Medium** 50/50%, **Heavy** 75/25%, **Super Heavy** 100/0%):

$$\text{Vehicle Ratio} = \text{clamp}\left(\frac{\text{Current Armor}}{\text{Max Armor}},\, 0,\, 1\right), \qquad \text{Effective Hard Ratio} = \text{Base Hard Ratio} \times (0.35 + 0.65 \times \text{Vehicle Ratio})$$

$$\text{Effective Hardness} = \max\left(0,\, (\text{Hardness} + \text{Traits}) \times \text{clamp}(\text{Vehicle Ratio},\, 0.25,\, 1.0) - \text{Maluses}\right)$$

* **Close-Assault Bypass**: In **Urban**, **Forest**, **Jungle**, and **Mountain** terrain, attacking infantry ignore **35%** of the target's Hardness.
* **ARMOR HELD (Unpierced Mitigation)**: When `Piercing < Hardness` against **Medium**, **Heavy**, or **Super Heavy** armor:
  * Personnel casualties are **halved (`×0.5`)** and bonus **Explosive** dice are **negated**.
  * Against **Heavy** or **Super Heavy** armor, unpierced Organization shock is **capped at `-1`**.
  * Sealed unpierced Medium+ hulls remain immune to Zombie swarms.
* **Vehicle Knockout Brackets (If Pierced)** with a **15% Fleet Cap** per hit:
  * $\text{Margin Ratio} \le 0.25$: Minor Breach $\rightarrow$ **`d3`** vehicles disabled.
  * $0.25 < \text{Ratio} \le 0.50$: Moderate Breach $\rightarrow$ **`1 + d4`** vehicles disabled.
  * $0.50 < \text{Ratio} \le 0.75$: Severe Overmatch $\rightarrow$ **`2 + d6`** vehicles disabled.
  * $\text{Ratio} > 0.75$: Catastrophic Overmatch $\rightarrow$ **`3 + d8`** vehicles disabled.
* **Deflected Clash Knockout Gating** (Main Attack & Return Fire): When a clash is deflected ($\text{Attack} \le \text{Defense}$), `Pressure < 0.70` inflicts **0 vehicle knockouts**; `Pressure >= 0.70` is capped at `min(2, max(1, floor(disabled * 0.5)))`.
* **Crew Losses**: Destroyed (`KO`) vehicles inflict **`1 + d4`** crew casualties; recoverable disabled vehicles inflict **`d2`** crew casualties (`-1` with *Tough Chassis*, min `1`).

### Armor Recovery (80 + d20% Cap) & Field Repair Crew

* **Dynamic Armor Recovery Cap**: Every armor hit rolls a dynamic recovery ceiling of **`80 + d20%`** (`81%–100%`):

$$\text{Total Recovery \%} = \text{clamp}\big(\text{Base Recovery} + \text{d50} + \text{ArmorRecBonus},\, 5,\, 80 + \text{d20}\big)$$

  Recoverable vs. Destroyed (`KO`) counts use **probabilistic fractional rounding** (`floor(expected) + Bernoulli(fractional part)`) so small-to-medium hits retain a realistic chance of permanent write-offs.
* **Mid-Battle Field Repair Crew**: Triggers **every 4 rounds** (`round % 4 === 0`) when `!isDismounted && maxArmor > 0 && Supply >= 25%`.
  * **Pinned Under Fire**: Skips the repair cycle if the unit suffered vehicle knockouts on the immediately preceding round (`lastArmorHitRound === round - 1`).
  * **Output**: Restores `min(recoverableArmor, ceil(0.35 * recoverableArmor), maxPerCycle, ceil(dN / 2) + simpleEngBonus)` hulls, where `maxPerCycle` is **`2`** (or **`3`** with *Simple Engineering*), spending `1 + d2` Supply (`-1` with *Simple Engineering*).

### Infantry Dispersion & Cover Saves

Against unarmored targets, piercing is bypassed in favor of an **Entrenchment & Dispersion Save**:

$$\text{Cover Save} = \text{d20} + \text{Terrain Cover} + \text{Entrenchment Level} + \text{Traits} \ge \text{DC } (12 + \text{Attacker Spotting})$$

* **Dug-In / In Defilade (Success)**: Soft damage halved; High-Caliber bonus negated; Explosive dice negated/halved.
* **Caught in Open (Failure)**: Full damage applied plus **`-(1 + d4)`** suppressive Organization shock.

### Grazing Damage & Armor/Bunker Immunity

When an attack fails to break through ($\text{Attack} \le \text{Defense}$), damage scales by $\text{Pressure Ratio} = \text{Attack} / \max(1, \text{Defense})$:

* **Thresholds**: `< 40%` (`< 60%` in Forts) = **COMPLETELY IMMUNE (0 damage)**; `40%–49%` = `1` casualty; `50%–74%` = `1 + d2`; `75%–100%` = `1 + d3` (mitigated by `-2` in Forts and `-1` at Entrenchment Lvl 3+; Level 5 Deep Bunkers grant 100% grazing immunity).

### Y-Axis Spatial Distance, Ranges & Close-Range Supply Raiding

$$\text{Total Engagement Distance} = \text{Attacker Pos} + \text{Defender Pos}$$

* **Max Engagement Ranges**: Zombies / pure melee `<= 1`; Infantry & standard Armored Vehicles `<= 2`; **Tanks & Anti-Tank Armored Vehicles (Tank Destroyers)** `<= 3`; Artillery `<= 6`. Fog and Night apply a **Visibility Cap (`VIS CAP`)** that clamps direct-fire sight range.
* **Close-Range Supply Raiding**: `[Supply Stolen]` is strictly gated to direct-fire close-range units (`category !== 'artillery'` and `Total Distance <= 2`).
* **Advancing, Overwatch & Phase Lock**: Out-of-range units advance `1` step closer per round while defenders already in range open **Defensive Overwatch** fire. Tactical initiative stays locked on the attacking side until frontline units close into engagement range.

### Climate-Aware Dynamic Weather & Arbitrary-Era Calendar

* **Climate-Aware Dynamic Weather (`DYN`)**: Shifts every 3 rounds (`45%` chance), filtered by `getClimateWeatherCandidates(curWeather, terrain, month, todPhase)` so transitions obey terrain, calendar season (`Winter/Spring/Summer/Autumn`), and time of day (e.g., no snow in September Lorraine hills, no new heatwaves at Night, dry Desert rules).
* **Arbitrary-Era Calendar & 24H Lighting**: Uses `Date.setUTCFullYear()` to support any year from **`-270000` (formatted as `BCE`) to `+270000`** (including Year `0` and double-digit years `1–99` without JavaScript's 1900 mapping). Automatically drives **Dawn (`05–06`)**, **Daylight (`07–17`)**, **Dusk (`18–19`)**, and **Night (`20–04`)**, plus the ordinal **1st / 2nd / 3rd Day** counter.
* **Compound Hazards**: Automatically detects **Mud/Rasputitsa**, **Zero Visibility**, **Deep Freeze**, and **Heatstroke/Dust**.

### The Rallying Engine, Org Floor & Shock Sync

* **Shock Sync on Rout/Scatter**: When a unit routs, its cumulative personnel-loss tracker (`cumPersonnelLostTenths`) syncs to its current loss ratio so rallied units only take cumulative Org shock for *new* losses after returning to the line.
* **d20 Rally Check vs. DC 10**: Includes Experience, Commander, Frontline, Manpower, Supply, and Armor modifiers. Formations with $\ge 60\%$ personnel never dissolve on a failed check (delayed by `+1` round).
* **Guaranteed Rally Org Floor**: Rallied units return with at least `min(maxOrg, max(18, ceil(maxOrg * 0.35)))` Organization.

### Medical Triage & Died of Wounds (DOW)

Starting in **Round 4+**, wounded personnel (WIA) roll probabilistic fractional mortality checks (`0%` base when Supply $\ge 50\%$, increasing under Low Supply, Starvation, or Deep Freeze/Marsh/Heat, mitigated by *First Aid Kit* and *Field Medic*).

### Logistical Friction, Out-of-Range Pauses & Combat Fatigue

* **Out-of-Range Approach Pauses**: While a unit has no enemy within engagement range, **base combat ammunition burn**, late-battle **Combat Fatigue** (`round > 5` -> `-1`, `round > 12` -> `-2`), and **`Green` unit `-1` Org drift** are all paused.
* **Supply Thresholds**: `< 50%` imposes `-10%` stats + one-time `-(2+d6)` Org shock; `< 20%` imposes `-20%` stats + shock; `0%` imposes `-50%` stats + continuous Org collapse. Shared **Theatre Supply Depots** resupply frontline units each round until depleted.

## 🔄 The 8-Step Combat Round Lifecycle

1. **Undo Snapshot, Clock & Climate Tick**: Saves a deep clone to `battle.history` (FIFO max 15 rounds), advances the 24H clock, updates lighting, and rolls Climate-Aware Dynamic Weather every 3 rounds.
2. **Logistics, Dig-In, Fatigue, DOW, Rally & Field Repairs**: Processes depot resupply, out-of-range pauses, entrenchment, DOW checks, rear-area rally staging, and 4-round Field Repair Crew cycles.
3. **Doctrinal Tactic Selection**: Selects from 25 tactics (via Commander AI personality or manual override).
4. **Recon / Vigilance Contest (`1d100`)**: Winner gains `floor(|diff| / 10)` flat stat bonus.
5. **Fire Support & AA Interception**: Mortars, Heavy Artillery, and weather/lighting-scaled Air Support fire before contact; AA Guns intercept flights.
6. **Maneuver & Defensive Overwatch**: Out-of-range units advance along the Y-axis while in-range defenders fire Overwatch.
7. **Main Firefight, Close Raids & Return Fire**: Piercing/Cover checks, `ARMOR HELD` mitigation, deflected clash knockout gating, close-range supply raiding, and Return Fire.
8. **Victory, Pursuit, Conservation & AAR Snapshot**: Checks defeat/unscreened-artillery conditions, resolves mobility pursuit & exact personnel conservation, towing, faction-neutral salvage, and builds the AAR telemetry snapshot.

## 🎖 Commanders, 10-Tier Officer Ranks & Attribute Scaling

Commanders scale across four attributes (`Level 0–10`, **`+2.5%`** army-wide per level for `ATK`, `DEF`, `CMD`, and `LOG`) plus 21 generically wired Commander Trait fields. Total stat points automatically assign a **10-Tier Officer Rank Insignia** (stepping every 4 points from **First Lieutenant `[0–3]`** up to **5-Star General of the Army `[36+]`**).

## 📋 Tactical Doctrines Compendium (25 Tactics)

All 25 doctrines (**11 Standard Attack**, **7 Standard Defense**, **4 Urban Attack**, **3 Urban Defense**) are fully documented with historical notes and exact modifiers inside Tab **[06] Doctrines** (`FM 100-5-TAC`).

## 🏆 Post-Battle Resolution, Exact Conservation & AARs

* **Exact Personnel & AFV Conservation**: Post-battle pursuit partitions surviving losing-side troops cleanly into `escaped` and `captured` while keeping `wounded` intact (`u.personnel = 0`), enforcing **`START === REM + KIA + WIA + POW + ESC`** on every unit. The AFV column reconciles **`Start === Act + Rec(+Abn) + Tow + KO`**.
* **Proportional Field Salvage & Towing**: Disciplined retreats (`Escape % >= 60%`) tow `25%–50%` of repairable hulls back to depot before the victor rolls salvage (`50 + d50`) on remaining abandoned vehicles (*Captured & Impressed into Service*, *Stripped for Depot Spares & Munitions*, or *Scuttled*). Victorious Monsters/Zombies apply the **No Quarter** doctrine.
* **Form DA-774 / TNI AD Printable AAR**: Strictly in-universe A4 PDF export (zero dice formulas, round numbers, or engine tags) featuring:
  * **Section 1**: Degrees of Victory (**Heroic**, **Decisive**, **Close**, **Pyrrhic**, **Draw**), timestamped `METEO` weather trail, and side-by-side **Force Comparison & Depot Logistics** table.
  * **Section 2**: ORBAT & Casualty Ledger with outcome-specific dispositions (`OPERATIONAL`, `DISMOUNTED (OP)`, `WITHDRAWN (0 AFV)`, `WITHDRAWN (UNSCREENED)`, `ROUTED`, `DISPERSED`, `WIPED OUT`) and per-unit **`Inflicted (Cas/AFV)`** output.
  * **Section 3**: Faction-neutral Battlefield Salvage breakdown.
  * **Section 4**: Phase-balanced chronology across Opening, Mid-Battle, and Endgame.
  * **Section 5**: Data-driven G-3 / SOPS operational findings (Notable Formations, Anti-Armor Citations, Field Maintenance, Indirect Fire & Air Support share, and Depot Expenditure) + running `@page` page numbers.

## 🇮🇩 Bilingual Localization (`EN` / `ID` & TNI AD Format)

Iron Division ships with a drop-in, reversible Indonesian localization module (`js/i18n-id.js`), defaulting to **English (`EN`)** with a live **`EN / ID`** toggle button in the top-right header (saved in `localStorage`):

* Translates all 7 workspaces, `data.js` registries (Terrains, Features, Weather, Hazards, 32 Traits, 10 Commander Traits, 25 Tactics), the Welcome Briefing modal, the 11-step Interactive UI Tour, and live SITREP combat logs.
* Switches the Field Manual (`FM 100-5-BOOT`) to an authentic, non-stiff Indonesian **Edisi Ajudan** written by a subordinate NCO addressing the player as *Komandan / Kumendan / Ndan*.
* Switches both the immediate AAR modal and the printable A4 PDF to an authentic **Indonesian Army (TNI AD)** format (**`LAPORAN PELAKSANAAN TUGAS (LPT / AAR)` — `MINU TNI AD // LAP-OPS`**, `ASOPS / SOPS TNI AD`, `HALAMAN X DARI Y`).

## 🚀 Installation & Quick Start

Iron Division requires **no build step, no npm, and no bundler**. Keep the folder structure intact:

```text
iron-division/
├── index.html
├── README.md
├── css/
│   └── styles.css
└── js/
    ├── diagnostics.js
    ├── data.js
    ├── engine-helpers.js
    ├── engine-combat.js
    ├── engine-pursuit.js
    ├── ui-render.js
    ├── guide.js
    ├── app.js
    └── i18n-id.js
```

Open `index.html` directly in any modern browser, or serve locally via VS Code **Live Server** or `python -m http.server 8000`.

## 🚨 Diagnostics & Error Boundary

* **Try/Catch Round Wrapper**: Traps exceptions during combat execution, halts Auto-Ops cleanly, and preserves state.
* **Global Exception Traps**: Captures unhandled errors with file and line numbers in `js/diagnostics.js`.
* **System Error Channel**: Filter the SITREP logbook by `SYS ERRORS` to inspect diagnostic traces directly in the UI.

## 📜 License

Distributed under the MIT License. Open-source for tabletop RPG gaming, game design research, and campaign simulations.