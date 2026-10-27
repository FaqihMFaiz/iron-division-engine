/* ==========================================================================
   IRON DIVISION ENGINE — CORE GAME DATABASES & REGISTRIES
   File: js/data.js
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. Experience Tiers
// --------------------------------------------------------------------------
const EXPERIENCE_TIERS = {
  Green:    { name: 'Green',    atkPct: -10, defPct: -10, orgRegen: -1, recBonus: 0,  retreatBonus: -10, pursueBonus: 0,  repairDie: 2 },
  Trained:  { name: 'Trained',  atkPct: 10,  defPct: 10,  orgRegen: 0,  recBonus: 0,  retreatBonus: 0,   pursueBonus: 0,  repairDie: 2 },
  Regular:  { name: 'Regular',  atkPct: 20,  defPct: 20,  orgRegen: 0,  recBonus: 0,  retreatBonus: 0,   pursueBonus: 0,  repairDie: 3 },
  Seasoned: { name: 'Seasoned', atkPct: 30,  defPct: 30,  orgRegen: 1,  recBonus: 0,  retreatBonus: 0,   pursueBonus: 0,  repairDie: 3 },
  Veteran:  { name: 'Veteran',  atkPct: 40,  defPct: 40,  orgRegen: 2,  recBonus: 10, retreatBonus: 10,  pursueBonus: 10, repairDie: 4 },
  Elite:    { name: 'Elite',    atkPct: 50,  defPct: 50,  orgRegen: 3,  recBonus: 20, retreatBonus: 20,  pursueBonus: 20, repairDie: 5 }
};

// --------------------------------------------------------------------------
// 2. Armor Class Hard/Soft Splits
// --------------------------------------------------------------------------
const ARMOR_TIERS = {
  unarmored: { label: 'Unarmored', hardRatio: 0.0,  softRatio: 1.0 },
  light:     { label: 'Light Armor (25%H/75%S)', hardRatio: 0.25, softRatio: 0.75 },
  medium:    { label: 'Medium Armor (50%H/50%S)', hardRatio: 0.50, softRatio: 0.50 },
  heavy:     { label: 'Heavy Armor (75%H/25%S)', hardRatio: 0.75, softRatio: 0.25 },
  super:     { label: 'Super Heavy (100%H/0%S)', hardRatio: 1.00, softRatio: 0.00 }
};

// --------------------------------------------------------------------------
// 3. Base Terrains
// --------------------------------------------------------------------------
const DEFAULT_TERRAINS = {
  Plains:   { name: 'Plains',   infAtk: 0,   infDef: 0,  avAtk: 10,  avDef: 0,   tankAtk: 15,  tankDef: 5,   artAtk: 5,   artDef: 0,  vigMod: 5,   supplyDrain: 0, isUrban: false, openTerrain: true },
  Forest:   { name: 'Forest',   infAtk: -5,  infDef: 15, avAtk: -15, avDef: -5,  tankAtk: -25, tankDef: -10, artAtk: -10, artDef: 5,  vigMod: -10, supplyDrain: 1, isUrban: false, openTerrain: false },
  Hills:    { name: 'Hills',    infAtk: -10, infDef: 20, avAtk: -15, avDef: 5,   tankAtk: -20, tankDef: -5,  artAtk: 10,  artDef: 15, vigMod: 10,  supplyDrain: 1, isUrban: false, openTerrain: false },
  Mountain: { name: 'Mountain', infAtk: -20, infDef: 35, avAtk: -35, avDef: -15, tankAtk: -50, tankDef: -25, artAtk: 15,  artDef: 20, vigMod: 15,  supplyDrain: 2, isUrban: false, openTerrain: false },
  Jungle:   { name: 'Jungle',   infAtk: -15, infDef: 25, avAtk: -30, avDef: -15, tankAtk: -45, tankDef: -25, artAtk: -20, artDef: 0,  vigMod: -20, supplyDrain: 2, isUrban: false, openTerrain: false },
  Marsh:    { name: 'Marsh',    infAtk: -20, infDef: 15, avAtk: -35, avDef: -20, tankAtk: -50, tankDef: -30, artAtk: -15, artDef: -10,vigMod: -5,  supplyDrain: 2, isUrban: false, openTerrain: false },
  Desert:   { name: 'Desert',   infAtk: -10, infDef: -10,avAtk: 10,  avDef: 5,   tankAtk: 15,  tankDef: 5,   artAtk: 5,   artDef: -5, vigMod: 10,  supplyDrain: 2, isUrban: false, openTerrain: true },
  Urban:    { name: 'Urban',    infAtk: -5,  infDef: 30, avAtk: -20, avDef: -10, tankAtk: -35, tankDef: -20, artAtk: -5,  artDef: 15, vigMod: -15, supplyDrain: 1, isUrban: true,  openTerrain: false }
};

// --------------------------------------------------------------------------
// 4. Terrain Features (Multiplicative Stacking)
// --------------------------------------------------------------------------
const TERRAIN_FEATURES = {
  Normal:     { id: 'Normal',     name: 'Normal Sector',            atkMult: 1.0,  defMult: 1.0,  vigAdd: 0,   supplyAdd: 0,  fortified: false, desc: 'Standard terrain conditions (x1.00 Atk, x1.00 Def).' },
  Road:       { id: 'Road',       name: 'Path or Road (Non-Urban)', atkMult: 1.10, defMult: 0.95, vigAdd: 5,   supplyAdd: -1, fortified: false, desc: 'Multiplicative x1.10 Attack, x0.95 Defense, -1 Supply drain.' },
  SmallRiver: { id: 'SmallRiver', name: 'Small River Crossing',     atkMult: 0.85, defMult: 1.15, vigAdd: -5,  supplyAdd: 1,  fortified: false, isRiver: true, desc: 'Attacker x0.85 Attack, Defender x1.15 Defense, +1 Supply drain.' },
  LargeRiver: { id: 'LargeRiver', name: 'Large River Crossing',     atkMult: 0.70, defMult: 1.30, vigAdd: -10, supplyAdd: 2,  fortified: false, isRiver: true, desc: 'Attacker x0.70 Attack, Defender x1.30 Defense, +2 Supply drain.' },
  Amphibious: { id: 'Amphibious', name: 'Amphibious Landing',       atkMult: 0.65, defMult: 1.35, vigAdd: -15, supplyAdd: 2,  fortified: false, isAmphib: true, desc: 'Attacker x0.65 Attack, Defender x1.35 Defense (Marines negate penalty).' },
  Fort:       { id: 'Fort',       name: 'Fortified Strongpoint',    atkMult: 0.75, defMult: 1.45, vigAdd: 10,  supplyAdd: 0,  fortified: true,  desc: 'Attacker x0.75 Attack, Defender x1.45 Defense; Fortified position.' }
};

// --------------------------------------------------------------------------
// 5. Weather Conditions
// --------------------------------------------------------------------------
const WEATHER_TYPES = {
  Sunny:     { id: 'Sunny',     name: 'Sunny / Clear', atkMod: 0,   defMod: 0,  vigMod: 5,   airMod: 0,   supplyAdd: 0, tankMod: 5,   desc: '+5 Vigilance, +5% Tank effectiveness.' },
  Overcast:  { id: 'Overcast',  name: 'Overcast',      atkMod: 0,   defMod: 0,  vigMod: -5,  airMod: -10, supplyAdd: 0, tankMod: 0,   desc: '-5 Vigilance, -10% Air Support effectiveness.' },
  Windy:     { id: 'Windy',     name: 'Windy',         atkMod: -5,  defMod: 0,  vigMod: -5,  airMod: -15, supplyAdd: 0, artMod: -10,  desc: '-5% Attack, -10% Artillery accuracy, -15% Air Support.' },
  LightRain: { id: 'LightRain', name: 'Light Rain',    atkMod: -5,  defMod: 5,  vigMod: -10, airMod: -20, supplyAdd: 1, tankMod: -5,  desc: '-5% Attack, +5% Defense, -10 Vigilance, +1 Supply drain.' },
  HeavyRain: { id: 'HeavyRain', name: 'Heavy Rain',    atkMod: -15, defMod: 10, vigMod: -20, airMod: -50, supplyAdd: 2, tankMod: -20, desc: '-15% Attack, -20% Tank mobility, -20 Vigilance, +2 Supply drain.' },
  Foggy:     { id: 'Foggy',     name: 'Foggy',         atkMod: -10, defMod: 10, vigMod: -30, airMod: -60, supplyAdd: 0, artMod: -20,  desc: '-30 Vigilance, -20% Artillery, -60% Air Support.' },
  Snowy:     { id: 'Snowy',     name: 'Snowy / Frost', atkMod: -15, defMod: 15, vigMod: -15, airMod: -30, supplyAdd: 2, tankMod: -15, desc: '-15% Attack, +15% Defense, +2 Supply drain, -15% Tank attack.' },
  HeatWaves: { id: 'HeatWaves', name: 'Heat Waves',    atkMod: -10, defMod: -5, vigMod: -10, airMod: -10, supplyAdd: 2, infMod: -10,  desc: '-10% Attack, -5% Defense, +2 Supply drain, -10% Infantry stamina.' }
};

// --------------------------------------------------------------------------
// 6. Built-In Traits & Support Modules (Rebalanced Roster)
// --------------------------------------------------------------------------
const DEFAULT_TRAITS = [
  // Weapon Damage Classification Traits
  {
    id: 'high_caliber', name: 'High-Caliber Weapons',
    desc: 'Adds +3 Piercing, +4 Hard Attack. Inflicts +2+d6 casualties on hit and imposes -10 on enemy personnel recovery rolls.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 4, pierceFlat: 3, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: true, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'explosive_weapon', name: 'Explosive Ordnance',
    desc: 'Adds +4 Piercing, +6 Hard Attack, +4 Soft Attack. Inflicts +3+d8 casualties on hit and imposes -15 on enemy personnel recovery rolls.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 4, hardFlat: 6, pierceFlat: 4, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: true, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'anti_tank', name: 'Anti-Tank Weapons',
    desc: 'Grants High-Caliber (+2+d6 casualties), +8 Piercing, +8 Hard Attack, and prioritizes enemy Tanks (+20% vs Tanks).',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 8, pierceFlat: 8, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: 'tank', antiBonus: 20,
    grantsHighCaliber: true, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'grenade_assault', name: 'Grenade / Assault Pack',
    desc: 'Grants Explosive weapon effect (3+d8 casualties), +3 Piercing, +4 Soft Attack, +3 Hard Attack.',
    atkPct: 5, atkFlat: 2, defPct: 0, defFlat: 0, softFlat: 4, hardFlat: 3, pierceFlat: 3, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: 'Urban', terrainBonus: 10, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: true, isFrontliner: false, isRepairCrew: false
  },
  // Terrain Specialists
  {
    id: 'mountaineers', name: 'Mountaineers',
    desc: '+25% Attack & Defense in Mountain and Hills terrain, +10 Vigilance.',
    atkPct: 5, atkFlat: 0, defPct: 5, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 10, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 5, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: 'Mountain', terrainBonus: 25, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'marines', name: 'Marines',
    desc: '+30% Attack & Defense in Amphibious landings, Rivers, and Marsh. Negates river/amphibious attack penalties.',
    atkPct: 5, atkFlat: 0, defPct: 5, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 10, orgRegen: 1, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: 'Amphibious', terrainBonus: 30, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'rangers', name: 'Rangers',
    desc: '+25% Attack & Defense in Forest and Jungle terrain, +15 Vigilance.',
    atkPct: 5, atkFlat: 0, defPct: 5, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 15, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: 'Forest', terrainBonus: 25, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  // Melee & Close-Quarters Combat Trait
  {
    id: 'melee_attack', name: 'Melee / Close Combat',
    desc: 'Trench knives, bayonets, and close-quarters weapons (+5% Soft Atk, +2 Flat Atk). Uses Distance mechanic to close the gap. When engaging Zombies or Monsters, disrupts their reach: -20 Return Fire Vigilance and -30% Return Fire Attack.',
    atkPct: 5, atkFlat: 2, defPct: 0, defFlat: 0, softFlat: 3, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 5, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    pursueBonus: 5, retreatBonus: 0, enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: 'Urban', terrainBonus: 10,
    antiCategory: '', antiBonus: 0, grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false,
    isRepairCrew: false, isMeleeAttack: true
  },
  // Support & General Traits
  {
    id: 'engineering_support', name: 'Engineering Support',
    desc: '+15% Defense, +10% Attack vs Fortifications/Rivers, +4 Flat Defense, +2 Entrenchment buildup/rd.',
    atkPct: 5, atkFlat: 0, defPct: 15, defFlat: 4, softFlat: 0, hardFlat: 0, pierceFlat: 2, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 2, enemyHardMalus: 0, terrainTarget: 'Urban', terrainBonus: 10, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'recon_support', name: 'Recon Support',
    desc: '+20 Vigilance/Recon roll, +5% Attack & Defense.',
    atkPct: 5, atkFlat: 0, defPct: 5, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 20, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'desperate_defense', name: 'Desperate Defense',
    desc: '+25% Defense, +4 Flat Defense, -5% Attack, +2 Cover bonus.',
    atkPct: -5, atkFlat: 0, defPct: 25, defFlat: 4, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 1, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'unbreakable', name: 'Unbreakable',
    desc: 'When hitting 0 Org, fights on for 2 rounds at -25% Atk/Def before shattering. Halves Org loss maluses and regenerates +3 Org/turn.',
    atkPct: 0, atkFlat: 0, defPct: 10, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 3, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, isUnbreakable: true
  },
  {
    id: 'special_forces', name: 'Special Forces',
    desc: 'No malus from being outnumbered; +25% opponent casualties inflicted on hit; +15% Attack & Defense, +15 Vigilance, +10 Recovery.',
    atkPct: 15, atkFlat: 0, defPct: 15, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 15, orgRegen: 1, supplyRegen: 0, supplySteal: 0, recBonus: 10, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, isSpecialForces: true
  },
  {
    id: 'field_medic', name: 'Field Medic',
    desc: '+10 Personnel Recovery roll, reduces DOW mortality by -3%, and heals d3 wounded back to active personnel every round.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 10, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, isFieldMedic: true
  },
  {
    id: 'first_aid_kit', name: 'First Aid Kit',
    desc: 'Squad-level sterile dressings, tourniquets, and coagulants. Reduces Died of Wounds (DOW) mortality by -4% and grants +10 to Personnel Recovery rolls.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 10, armorRecBonus: 0,
    pursueBonus: 0, retreatBonus: 0, enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0,
    antiCategory: '', antiBonus: 0, grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false,
    isRepairCrew: false, isFirstAidKit: true
  },
  {
    id: 'logistic_support', name: 'Logistic Support',
    desc: 'Regenerates +2 Supply every round and reduces supply starvation maluses.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 2, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'supply_raiders', name: 'Supply Raiders',
    desc: 'Steals 2 + d4 Supply on a hit. If the raided unit is already below 50% supply, inflicts an immediate -1d4 Organization shock.',
    atkPct: 5, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 10, orgRegen: 0, supplyRegen: 0, supplySteal: 4, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  // Frontliner / Defender
  {
    id: 'frontliner_defender', name: 'Frontliner / Defender',
    desc: 'Draws enemy attacks even if Target Value is lower, as long as remaining Organization is above 50% (or 30%). Intercepts Anti-Unit target priority.',
    atkPct: 0, atkFlat: 0, defPct: 10, defFlat: 3, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 2,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: true, isRepairCrew: false
  },
  // Armor Engineering & Repair Traits
  {
    id: 'repair_crew', name: 'Repair Crew',
    desc: 'Every 3 turns (if Supply >= 30%), expends 1+d2 Supply to field-repair up to d2–d5 recoverable armor in-combat; remaining recoverable armor is repaired post-battle.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 10,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: true
  },
  {
    id: 'redundancy', name: 'Redundancy',
    desc: '+15 to Armor Recovery roll when vehicles are disabled; +2 Hardness.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 2,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 15,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'tough_chassis', name: 'Tough Chassis',
    desc: '+15 to Armor Recovery roll, +4 Hardness, and +5% Defense.',
    atkPct: 0, atkFlat: 0, defPct: 5, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 4,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 15,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false
  },
  {
    id: 'simple_engineering', name: 'Simple Engineering',
    desc: '+20 Armor Recovery roll. Reduces in-combat field repair supply cost by 1, and Repair Crews restore +1 extra vehicle per cycle.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 20,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, isSimpleEngineering: true
  },
  // Fire Support / Enemy Malus Modifiers
  {
    id: 'mortar_support', name: 'Mortar Support',
    desc: 'Support (Cost 1+d2 Supply, CD 2 rds, requires >=50% Supply): Infantry Def -(3+d6), cover denied, 1+d4 cas, -1d3 Org. Armor: Strictly 0 Hardness reduction, Def -(1+d3), d6 roll 5 optics hit (-15 Vig), roll 6 track blown (-2 mobility).',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, supportType: 'mortar'
  },
  {
    id: 'heavy_artillery_support', name: 'Heavy Artillery Support',
    desc: 'Support (Cost 3+d3 Supply, CD 1+d2 rds, >=50% Supply): Enemy Def -(4+d12), Hardness -(2+d6), d2 armor disabled. Roll 8-10: +d6 cas; Roll 11-12: +(2+d12) cas & +(1+d3) armor disabled.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, supportType: 'heavy_artillery'
  },
  {
    id: 'air_support', name: 'Air Support (Airstrike)',
    desc: 'Support (Cost 5+d4 Supply, CD 2+d2 rds, >=50% Supply): Enemy Def -(6+d20), Hardness -(4+d10). Roll 10-14: +d6 cas/d2 arm; 15-18: +(2+d12) cas/+(1+d3) arm; 19-20: +(6+d20) cas/+(2+d5) arm.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, supportType: 'air_support'
  },
  // Anti-Air Traits
  {
    id: 'aa_defense', name: 'Anti-Air Defense',
    desc: 'Reduces enemy Airstrikes by 4 + d6 and forces enemy reconnaissance to high altitude (-10 Enemy Vigilance next round).',
    atkPct: 0, atkFlat: 0, defPct: 5, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, aaType: 'aa_defense'
  },
  {
    id: 'aa_gun', name: 'Anti-Air Gun Battery',
    desc: 'Reduces enemy Airstrike by 4 + d8. On d8 roll 5-7: adds +d2 cooldown to enemy Airstrike; on roll 8: shoots down strike wing (+4 rounds cooldown).',
    atkPct: 0, atkFlat: 0, defPct: 5, defFlat: 0, softFlat: 2, hardFlat: 4, pierceFlat: 4, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: true, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, aaType: 'aa_gun'
  },
  // Tactical Synergy Traits
  {
    id: 'infiltration_specialist', name: 'Infiltration Specialist',
    desc: '+10% Bypass chance when using Mouse-Holing or Infiltration Assault (up to 75% cap), +10 Vigilance.',
    atkPct: 5, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 10, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: 'Urban', terrainBonus: 10, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, isInfiltrationSpec: true
  },
  {
    id: 'fortification_engineer', name: 'Fortification Engineer',
    desc: '+10% additional Defense during Fortified Defense tactic and in Fortifications. Raises Max Entrenchment Cap by +1.',
    atkPct: 0, atkFlat: 0, defPct: 10, defFlat: 2, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, isFortEngineer: true
  },
  {
    id: 'concealment_specialist', name: 'Concealment Specialist',
    desc: '+10 Vigilance during Ambush / Urban Ambush tactics, +2 Cover Save bonus, makes ambush harder to detect.',
    atkPct: 0, atkFlat: 0, defPct: 5, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 10, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, isConcealSpec: true
  },
  // Special Entity Traits
  {
    id: 'monster_unit', name: 'Monster Entity',
    desc: 'N/A Organization, N/A Supplies, and NO RECOVERY (all damage taken is permanent 100% KIA). Takes no prisoners post-battle (slaughters all captured/wounded).',
    atkPct: 15, atkFlat: 4, defPct: 10, defFlat: 4, softFlat: 0, hardFlat: 0, pierceFlat: 4, hardnessFlat: 4,
    vigilance: 10, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, isMonster: true
  },
  {
    id: 'zombie_unit', name: 'Zombie Swarm',
    desc: 'N/A Organization & Supplies. Uses d100 Recovery Roll (surviving wounded stand back up). Takes +50% casualties from High-Caliber and Explosives.',
    atkPct: 10, atkFlat: 2, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: -10, orgRegen: 0, supplyRegen: 0, supplySteal: 0, recBonus: 0, armorRecBonus: 0,
    enemyDefMalus: 0, enemyHardMalus: 0, terrainTarget: '', terrainBonus: 0, antiCategory: '', antiBonus: 0,
    grantsHighCaliber: false, grantsExplosive: false, isFrontliner: false, isRepairCrew: false, isZombie: true
  }
];

// --------------------------------------------------------------------------
// 7. Commander Traits Directory & Preset Commanders (Full Schema)
// --------------------------------------------------------------------------
const DEFAULT_COMMANDER_TRAITS = [
  {
    id: 'tank_leader', name: 'Tank Leader', targetUnitCategory: 'tank',
    desc: '+15% Attack & Defense, +2 Piercing for Tank formations.',
    atkPct: 15, atkFlat: 0, defPct: 15, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 2, hardnessFlat: 0,
    vigilance: 0, pursueBonus: 10, retreatBonus: 0, tacticBoost: 0, maxOrgPct: 0, orgRegen: 0, supplyDrainReduction: 0,
    recBonus: 0, armorRecBonus: 10, rallyCheckBonus: 0, rallyDurationRed: 0, extraRalliedOrg: 0, terrainTarget: '', terrainBonus: 0
  },
  {
    id: 'infantry_leader', name: 'Infantry Leader', targetUnitCategory: 'infantry',
    desc: '+15% Attack & Defense for Foot Infantry formations.',
    atkPct: 15, atkFlat: 0, defPct: 15, defFlat: 0, softFlat: 2, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, pursueBonus: 0, retreatBonus: 10, tacticBoost: 0, maxOrgPct: 0, orgRegen: 0, supplyDrainReduction: 0,
    recBonus: 5, armorRecBonus: 0, rallyCheckBonus: 2, rallyDurationRed: 0, extraRalliedOrg: 0, terrainTarget: '', terrainBonus: 0
  },
  {
    id: 'artillery_leader', name: 'Artillery Leader', targetUnitCategory: 'artillery',
    desc: '+15% Attack and +4 Soft Attack for Artillery batteries.',
    atkPct: 15, atkFlat: 0, defPct: 5, defFlat: 0, softFlat: 4, hardFlat: 2, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 5, pursueBonus: 0, retreatBonus: 0, tacticBoost: 0, maxOrgPct: 0, orgRegen: 0, supplyDrainReduction: 0,
    recBonus: 0, armorRecBonus: 0, rallyCheckBonus: 0, rallyDurationRed: 0, extraRalliedOrg: 0, terrainTarget: '', terrainBonus: 0
  },
  {
    id: 'organizer', name: 'Organizer', targetUnitCategory: '',
    desc: '+15% Max Organization, +1 Org regen/round, and -1 Round to Rally cooldown for all units.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, pursueBonus: 0, retreatBonus: 5, tacticBoost: 0, maxOrgPct: 15, orgRegen: 1, supplyDrainReduction: 0,
    recBonus: 0, armorRecBonus: 0, rallyCheckBonus: 3, rallyDurationRed: 1, extraRalliedOrg: 0, terrainTarget: '', terrainBonus: 0
  },
  {
    id: 'skilled_staff', name: 'Skilled Staff', targetUnitCategory: '',
    desc: '+15 Vigilance/Recon roll and +10% Tactic effectiveness.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 15, pursueBonus: 5, retreatBonus: 5, tacticBoost: 10, maxOrgPct: 0, orgRegen: 0, supplyDrainReduction: 0,
    recBonus: 0, armorRecBonus: 0, rallyCheckBonus: 0, rallyDurationRed: 0, extraRalliedOrg: 0, terrainTarget: '', terrainBonus: 0
  },
  {
    id: 'logistics_wizard', name: 'Logistics Wizard', targetUnitCategory: '',
    desc: '-1 Supply consumption per round (min 1) and +10% Max Supply for all units.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, pursueBonus: 0, retreatBonus: 0, tacticBoost: 0, maxOrgPct: 0, orgRegen: 0, supplyDrainReduction: 1,
    recBonus: 0, armorRecBonus: 0, rallyCheckBonus: 0, rallyDurationRed: 0, extraRalliedOrg: 0, terrainTarget: '', terrainBonus: 0
  },
  {
    id: 'urban_assault_ldr', name: 'Urban Warfare Expert', targetUnitCategory: '',
    desc: '+15% Attack & Defense in Urban terrain sectors.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 5, pursueBonus: 0, retreatBonus: 0, tacticBoost: 0, maxOrgPct: 0, orgRegen: 0, supplyDrainReduction: 0,
    recBonus: 0, armorRecBonus: 0, rallyCheckBonus: 0, rallyDurationRed: 0, extraRalliedOrg: 0, terrainTarget: 'Urban', terrainBonus: 15
  },
  {
    id: 'rally_master', name: 'Rally Master', targetUnitCategory: '',
    desc: 'Rapid rally assembly: -1 Round to Rally cooldown and +4 to all Rally Checks.',
    atkPct: 0, atkFlat: 0, defPct: 0, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, pursueBonus: 0, retreatBonus: 10, tacticBoost: 0, maxOrgPct: 0, orgRegen: 0, supplyDrainReduction: 0,
    recBonus: 0, armorRecBonus: 0, rallyCheckBonus: 4, rallyDurationRed: 1, extraRalliedOrg: 0, terrainTarget: '', terrainBonus: 0
  },
  {
    id: 'iron_disciplinarian', name: 'Iron Disciplinarian', targetUnitCategory: '',
    desc: 'Unyielding field discipline: +3 to Rally Checks; rallied units return with +5 extra Organization.',
    atkPct: 5, atkFlat: 0, defPct: 5, defFlat: 0, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 0, pursueBonus: 0, retreatBonus: 0, tacticBoost: 0, maxOrgPct: 0, orgRegen: 0, supplyDrainReduction: 0,
    recBonus: 0, armorRecBonus: 0, rallyCheckBonus: 3, rallyDurationRed: 0, extraRalliedOrg: 5, terrainTarget: '', terrainBonus: 0
  },
  {
    id: 'rearguard_specialist', name: 'Rearguard Specialist', targetUnitCategory: '',
    desc: 'Master of fighting withdrawals: -1 Round to Rally cooldown and +15 to post-battle Retreat rolls.',
    atkPct: 0, atkFlat: 0, defPct: 10, defFlat: 2, softFlat: 0, hardFlat: 0, pierceFlat: 0, hardnessFlat: 0,
    vigilance: 5, pursueBonus: 0, retreatBonus: 15, tacticBoost: 0, maxOrgPct: 0, orgRegen: 0, supplyDrainReduction: 0,
    recBonus: 5, armorRecBonus: 0, rallyCheckBonus: 2, rallyDurationRed: 1, extraRalliedOrg: 0, terrainTarget: '', terrainBonus: 0
  }
];

// --------------------------------------------------------------------------
// 7B. Preset Commanders & Trait Dictionary
// --------------------------------------------------------------------------
const DEFAULT_COMMANDERS = [
  { id: 'cmd_none',    name: 'No Assigned Commander (Autonomous Staff)', personality: 'Balanced',   attackLevel: 0, defenseLevel: 0, commandLevel: 0, logisticsLevel: 0, traits: [] },
  { id: 'cmd_patton',  name: 'Gen. George Vanguard (Armor Thrust)',       personality: 'Aggressive', attackLevel: 5, defenseLevel: 2, commandLevel: 4, logisticsLevel: 2, traits: ['tank_leader', 'skilled_staff'] },
  { id: 'cmd_monty',   name: 'Field Marshal Bernard (Methodical Line)',   personality: 'Cautious',   attackLevel: 2, defenseLevel: 5, commandLevel: 4, logisticsLevel: 5, traits: ['infantry_leader', 'organizer', 'logistics_wizard'] },
  { id: 'cmd_zhukov',  name: 'Marshal Georgy (Deep Battle)',              personality: 'Balanced',   attackLevel: 4, defenseLevel: 3, commandLevel: 5, logisticsLevel: 3, traits: ['artillery_leader', 'rally_master', 'skilled_staff'] },
  { id: 'cmd_chuikov', name: 'Gen. Vasily (City Bastion)',                personality: 'Cautious',   attackLevel: 3, defenseLevel: 5, commandLevel: 5, logisticsLevel: 3, traits: ['infantry_leader', 'iron_disciplinarian', 'urban_assault_ldr'] }
];

// Dictionary export for backwards compatibility
const COMMANDER_TRAITS = Object.fromEntries(DEFAULT_COMMANDER_TRAITS.map(t => [t.id, t]));

function getCommanderTraitById(id) {
  if (typeof state !== 'undefined' && state.commanderTraits) {
    return state.commanderTraits.find(t => t.id === id) || COMMANDER_TRAITS[id];
  }
  return COMMANDER_TRAITS[id];
}

// --------------------------------------------------------------------------
// 8. The 25 Tactical Doctrines
// --------------------------------------------------------------------------
const TACTICS_DB = [
  // --- ATTACK TACTICS (11) ---
  {
    id: 'atk_attack', name: 'Attack', role: 'attack', urbanOnly: false, personality: 'Balanced',
    atkPct: 10, defPct: 0, returnFireDefPct: 5, vigMod: 0, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Unknown enemy compositions and mixed forces.',
    summary: '+10% Attack, +5% Defense during return fire. No malus. Standard targeting.'
  },
  {
    id: 'atk_assault', name: 'Assault', role: 'attack', urbanOnly: false, personality: 'Aggressive',
    atkPct: 25, defPct: -15, breakthroughPct: 10, vigMod: -10, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Weak defensive lines and units suffering organization penalties.',
    summary: '+25% Attack, +10% Breakthrough vs enemy defense. Malus: -15% Defense, -10 Vigilance.'
  },
  {
    id: 'atk_encirclement', name: 'Encirclement', role: 'attack', urbanOnly: false, personality: 'Aggressive',
    atkPct: 15, defPct: -10, vigMod: 0, pursueBonus: 20, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Multiple enemy units, isolated formations, poor retreat capabilities.',
    summary: '+15% Attack vs engaged target, +20 Pursuit roll, enemy suffers -10% Def if outnumbered/surrounded. Malus: -10% Def & -10 Vig if fighting alone.'
  },
  {
    id: 'atk_shock', name: 'Shock', role: 'attack', urbanOnly: false, personality: 'Aggressive',
    atkPct: 20, defPct: -20, vigMod: 0, flatAtk: 2, orgDmgPct: 15, selfEndOrgDmg: 1, enemyNextVigMalus: 5, supplyAdd: 0,
    bestAgainst: 'Low-organization infantry and forces vulnerable to sudden violence.',
    summary: '+20% Attack, +2 flat Attack, +15% Org damage inflicted, enemy -5 Vig next round on hit. Malus: -20% Def & 1 self Org damage at end of round.'
  },
  {
    id: 'atk_breakthrough', name: 'Breakthrough', role: 'attack', urbanOnly: false, personality: 'Balanced',
    atkPct: 25, defPct: -15, vigMod: 0, flatAtk: 0, flatDef: 0, flatPierce: 3, supplyAdd: 0,
    bestAgainst: 'Fortified positions, heavy defenders, concentrated enemy formations.',
    summary: '+25% Attack vs defensive positions & +3 flat Piercing. If target loses >=10% personnel in 1 round, +10% Attack next round. Malus: -15% Def.'
  },
  {
    id: 'atk_blitz', name: 'Blitz', role: 'attack', urbanOnly: false, personality: 'Aggressive',
    atkPct: 20, defPct: -20, vigMod: 15, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 1, deniesEnemyOrgRec: true,
    bestAgainst: 'Light forces, disorganized defenders, speed over endurance.',
    summary: '+20% Attack, +15 Vigilance, blocks target d2 Org recovery on hit. Malus: -20% Def, +1 Supply consumption.'
  },
  {
    id: 'atk_mass_charge', name: 'Mass Charge', role: 'attack', urbanOnly: false, personality: 'Aggressive',
    atkPct: 30, defPct: -25, vigMod: -15, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Small formations, exhausted enemies, exposed positions.',
    summary: '+30% Attack when outnumbering by >=50% (+45% if 2x enemy; +5% otherwise). Malus: -25% Def, -15 Vig; enemy MG/Artillery/Explosives inflict +15% casualties.'
  },
  {
    id: 'atk_infiltration', name: 'Infiltration Assault', role: 'attack', urbanOnly: false, personality: 'Cautious',
    atkPct: 0, defPct: -10, vigMod: 15, bypassChance: 15, antiSupportAtkPct: 10, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Artillery, supply units, command units, support-heavy formations.',
    summary: '+15 Vig (+25 in Forest/Urban/Hills/Mountain), +10% Atk vs Artillery/Support, 15% chance to bypass Frontliner. Malus: -10% Atk vs Fort, -10% Def.'
  },
  {
    id: 'atk_well_planned', name: 'Well-Planned Attack', role: 'attack', urbanOnly: false, personality: 'Balanced',
    atkPct: 15, defPct: 0, vigMod: 10, flatAtk: 0, flatDef: 2, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Prepared defenses and enemies with predictable tactics.',
    summary: '+15% Attack (+25% if enemy tactic revealed in prior round), +10 Vig, +2 flat Def in return fire. Malus: -10% Atk in Rd 1 if battle initiated unexpectedly.'
  },
  {
    id: 'atk_relentless', name: 'Relentless Assault', role: 'attack', urbanOnly: false, personality: 'Aggressive',
    atkPct: 15, defPct: -10, vigMod: 0, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 1, hitOrgHeal: 2,
    bestAgainst: 'Enemies close to breaking (<=30% Org grants +25% Atk), provided supply is sufficient.',
    summary: '+15% Attack (+25% if target <=30% Org), +2 Org recovery after inflicting casualties. Malus: -10% Def, +1 Supply consumption.'
  },
  {
    id: 'atk_unexpected_thrust', name: 'Unexpected Thrust', role: 'attack', urbanOnly: false, personality: 'Aggressive',
    atkPct: 25, defPct: 0, vigMod: 20, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Entrenched, predictable, or unprepared enemies.',
    summary: '+25% Attack & +20 Vig on first use (inflicts -10 Vig next round on hit). Malus: -10% Atk & -10% Def if repeated consecutively; reduced to +10% vs winning Ambush.'
  },

  // --- DEFENSE TACTICS (7) ---
  {
    id: 'def_defend', name: 'Defend', role: 'defense', urbanOnly: false, personality: 'Balanced',
    atkPct: -10, defPct: 20, returnFireAtkPct: 10, vigMod: 0, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Unknown attacks and holding ground (+10% extra Def in Fortifications).',
    summary: '+20% Defense (+30% in Fort), +10% Return-Fire Attack. Malus: -10% Attack during normal attack phase.'
  },
  {
    id: 'def_counterattack', name: 'Counterattack', role: 'defense', urbanOnly: false, personality: 'Aggressive',
    atkPct: 0, defPct: 10, returnFireAtkPct: 20, vigMod: 0, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Assaults, Shock attacks, and overextended enemies.',
    summary: '+20% Return-Fire Attack, +10% Defense. Grants +2 Org if counterattack beats attacker value.'
  },
  {
    id: 'def_delay', name: 'Delay', role: 'defense', urbanOnly: false, personality: 'Cautious',
    atkPct: -15, defPct: 15, retreatBonus: 15, vigMod: 0, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Superior enemy forces, buying time, and halves enemy Blitz/Relentless bonus.',
    summary: '+15% Defense, +15 Retreat roll. Successful defense imposes -10% Attack on enemy next round. Malus: -15% Attack.'
  },
  {
    id: 'def_tactical_withdrawal', name: 'Tactical Withdrawal', role: 'defense', urbanOnly: false, personality: 'Cautious',
    atkPct: -20, defPct: -10, retreatBonus: 25, casualtyReductionPct: 20, vigMod: 0, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Overwhelming enemies and preserving personnel to fight another day.',
    summary: '-20% Casualties suffered from enemy attacks and +25 Retreat roll. Malus: -20% Attack, -10% Defense.'
  },
  {
    id: 'def_ambush', name: 'Ambush', role: 'defense', urbanOnly: false, personality: 'Cautious',
    atkPct: 20, defPct: 15, vigMod: 25, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Infiltration, Blitz, Unexpected Thrust, and concealed terrain.',
    summary: '+25 Vig (+35 in Forest/Jungle/Mountain/Urban), +20% Rd1 Atk (+30% if Vig won by >=15), +15% Rd1 Def. Malus: -10% Atk after first round.'
  },
  {
    id: 'def_backhand_blow', name: 'Backhand Blow', role: 'defense', urbanOnly: false, personality: 'Balanced',
    atkPct: 25, defPct: 15, vigMod: 0, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Assault, Mass Charge, Shock, and Breakthrough.',
    summary: '+15% Defense vs initial attack, +25% Return-Fire/Next-Rd Attack (+35% if enemy lost >=10% personnel). Malus: -10% Atk if enemy has not attacked yet.'
  },
  {
    id: 'def_guerrilla', name: 'Guerrilla Tactic', role: 'defense', urbanOnly: false, personality: 'Cautious',
    atkPct: 15, defPct: 0, retreatBonus: 15, vigMod: 20, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Supply-dependent forces and armored columns in difficult terrain.',
    summary: '+20 Vig, +15% Atk in Forest/Jungle/Mountain/Urban (-15% in open), steals 1+d3 enemy supply on hit, +10% Atk if enemy <50% supply, +15 Retreat.'
  },

  // --- URBAN ATTACK TACTICS (4) ---
  {
    id: 'urb_atk_street_fighting', name: 'Street Fighting (Urban)', role: 'attack', urbanOnly: true, personality: 'Aggressive',
    atkPct: 20, defPct: 15, vigMod: 10, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Infantry defenders, urban garrisons, and units holding buildings.',
    summary: 'Urban Only: +20% Infantry Attack (+35% vs urban defenders), +15% Def vs return fire, +10% AT Piercing. Malus: -15% Tank/Armored Veh Attack.'
  },
  {
    id: 'urb_atk_barrage', name: 'Street-by-Street Barrage (Urban)', role: 'attack', urbanOnly: true, personality: 'Balanced',
    atkPct: 25, defPct: 0, vigMod: 0, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0, cooldown: 2,
    bestAgainst: 'Fortified buildings, concentrated defenders, prepared strongpoints.',
    summary: 'Urban Only (Cost 2+d3 Supply, 2-rd CD): +25% Atk vs fortified urban defenders, Enemy Def -(2+d6), d6 roll 5-6 inflicts +d6 casualties, -10 enemy Vig next round.'
  },
  {
    id: 'urb_atk_armour_supported', name: 'Armour-Supported Urban Assault (Urban)', role: 'attack', urbanOnly: true, personality: 'Balanced',
    atkPct: 20, defPct: 0, vigMod: -10, flatAtk: 0, flatDef: 2, flatPierce: 0, supplyAdd: 1,
    bestAgainst: 'Mixed infantry and fortified defenders when attacker has both infantry and armor.',
    summary: 'Urban Only: +20% Inf Atk when friendly armor active, +2 flat Inf Def, +10% Armor Def with Inf support. Malus: -15% Tank Atk, -10 Vig, +1 Supply per armor.'
  },
  {
    id: 'urb_atk_mouse_holing', name: 'Mouse-Holing (Urban)', role: 'attack', urbanOnly: true, personality: 'Cautious',
    atkPct: 20, defPct: -10, vigMod: 20, bypassChance: 25, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Artillery, command units, support units behind an urban frontline.',
    summary: 'Urban Only: +20 Vig, +20% Atk inside buildings, 25% chance to bypass frontline (+35% with Infiltration Specialist). Malus: -10% Def vs counterattack.'
  },

  // --- URBAN DEFENSE TACTICS (3) ---
  {
    id: 'urb_def_city', name: 'Defend City (Urban)', role: 'defense', urbanOnly: true, personality: 'Balanced',
    atkPct: -10, defPct: 20, returnFireAtkPct: 10, retreatBonus: -10, vigMod: 10, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'General urban assaults and preserving personnel in built-up sectors.',
    summary: 'Urban Only: +20% Defense (+30% for Infantry in buildings), +10 Vig, +10% Return-Fire vs Infantry. Malus: -10% Retreat roll.'
  },
  {
    id: 'urb_def_fortified', name: 'Fortified Defense (Urban)', role: 'defense', urbanOnly: true, personality: 'Cautious',
    atkPct: -20, defPct: 30, retreatBonus: -15, vigMod: 10, orgDmgResistPct: 15, flatOrgReduction: 2, supplyAdd: 0,
    bestAgainst: 'Assault, Breakthrough, Street Fighting, and frontal attacks.',
    summary: 'Urban Only: +30% Def (+40% w/ Fort Engineer), -15% Org damage taken & -2 flat Org damage on first hit each round. Malus: -20% Atk, -15 Retreat.'
  },
  {
    id: 'urb_def_ambush', name: 'Urban Ambush Tactics (Urban)', role: 'defense', urbanOnly: true, personality: 'Aggressive',
    atkPct: 25, defPct: 15, vigMod: 25, flatAtk: 0, flatDef: 0, flatPierce: 0, supplyAdd: 0,
    bestAgainst: 'Armour-Supported Urban Assault, Street Fighting, Unexpected Thrust.',
    summary: 'Urban Only: +25 Vig (+35 w/ Concealment Spec), +25% 1st-round Atk, +15% Def, d6 roll 5-6 inflicts +d6 bonus casualties. If Vig won by >=15, enemy -10 Vig next round.'
  }
];

// --------------------------------------------------------------------------
// 9. Built-in Sample Unit Templates
// --------------------------------------------------------------------------
const DEFAULT_UNIT_TEMPLATES = [
  {
    id: 'tpl_light_inf', name: 'Light Infantry Unit', category: 'infantry', armorTier: 'unarmored',
    personnel: 1000, maxOrg: 65, armorCount: 0, maxSupply: 40,
    softAttack: 16, hardAttack: 4, defense: 22, piercing: 5, hardness: 2,
    experience: 'Regular', traits: ['recon_support', 'field_medic', 'first_aid_kit']
  },
  {
    id: 'tpl_heavy_inf', name: 'Heavy Infantry Unit', category: 'infantry', armorTier: 'unarmored',
    personnel: 1200, maxOrg: 75, armorCount: 0, maxSupply: 45,
    softAttack: 24, hardAttack: 10, defense: 30, piercing: 9, hardness: 4,
    experience: 'Regular', traits: ['high_caliber', 'frontliner_defender', 'mortar_support', 'engineering_support', 'first_aid_kit']
  },
  {
    id: 'tpl_mechanized', name: 'Mechanized Unit', category: 'armored_vehicle', armorTier: 'light',
    personnel: 900, maxOrg: 70, armorCount: 60, maxSupply: 50,
    softAttack: 26, hardAttack: 14, defense: 28, piercing: 14, hardness: 14,
    experience: 'Seasoned', traits: ['high_caliber', 'repair_crew', 'simple_engineering', 'logistic_support', 'first_aid_kit']
  },
  {
    id: 'tpl_medium_tank', name: 'Medium Tank Unit', category: 'tank', armorTier: 'medium',
    personnel: 600, maxOrg: 65, armorCount: 50, maxSupply: 55,
    softAttack: 30, hardAttack: 28, defense: 26, piercing: 24, hardness: 24,
    experience: 'Seasoned', traits: ['high_caliber', 'explosive_weapon', 'repair_crew', 'redundancy']
  },
  {
    id: 'tpl_heavy_tank', name: 'Heavy Tank Unit', category: 'tank', armorTier: 'heavy',
    personnel: 500, maxOrg: 60, armorCount: 40, maxSupply: 60,
    softAttack: 34, hardAttack: 38, defense: 32, piercing: 34, hardness: 36,
    experience: 'Veteran', traits: ['high_caliber', 'explosive_weapon', 'tough_chassis', 'repair_crew', 'frontliner_defender']
  },
  {
    id: 'tpl_artillery', name: 'Artillery Unit', category: 'artillery', armorTier: 'unarmored',
    personnel: 500, maxOrg: 45, armorCount: 0, maxSupply: 55,
    softAttack: 42, hardAttack: 18, defense: 12, piercing: 14, hardness: 2,
    experience: 'Regular', traits: ['explosive_weapon', 'heavy_artillery_support', 'logistic_support']
  },
  {
    id: 'tpl_special_forces', name: 'Special Forces Unit', category: 'infantry', armorTier: 'unarmored',
    personnel: 600, maxOrg: 90, armorCount: 0, maxSupply: 50,
    softAttack: 28, hardAttack: 14, defense: 28, piercing: 12, hardness: 4,
    experience: 'Elite', traits: ['special_forces', 'unbreakable', 'infiltration_specialist', 'grenade_assault', 'first_aid_kit']
  },
  {
    id: 'tpl_terrain_mtn', name: 'Terrain Unit: Mountaineers', category: 'infantry', armorTier: 'unarmored',
    personnel: 900, maxOrg: 75, armorCount: 0, maxSupply: 45,
    softAttack: 20, hardAttack: 8, defense: 26, piercing: 8, hardness: 3,
    experience: 'Veteran', traits: ['mountaineers', 'recon_support', 'mortar_support', 'field_medic']
  },
  {
    id: 'tpl_terrain_marine', name: 'Terrain Unit: Marines', category: 'infantry', armorTier: 'unarmored',
    personnel: 950, maxOrg: 75, armorCount: 0, maxSupply: 48,
    softAttack: 22, hardAttack: 10, defense: 24, piercing: 10, hardness: 3,
    experience: 'Veteran', traits: ['marines', 'engineering_support', 'grenade_assault', 'air_support']
  },
  {
    id: 'tpl_terrain_ranger', name: 'Terrain Unit: Rangers', category: 'infantry', armorTier: 'unarmored',
    personnel: 800, maxOrg: 75, armorCount: 0, maxSupply: 45,
    softAttack: 21, hardAttack: 9, defense: 25, piercing: 9, hardness: 3,
    experience: 'Veteran', traits: ['rangers', 'concealment_specialist', 'supply_raiders']
  },
  {
    id: 'tpl_anti_tank', name: 'Anti-Tank Unit', category: 'infantry', armorTier: 'unarmored',
    personnel: 700, maxOrg: 55, armorCount: 0, maxSupply: 42,
    softAttack: 12, hardAttack: 32, defense: 20, piercing: 30, hardness: 3,
    experience: 'Regular', traits: ['anti_tank', 'high_caliber', 'aa_gun']
  },
  {
    id: 'tpl_tank_destroyer', name: 'Tank Destroyer Unit', category: 'armored_vehicle', armorTier: 'medium',
    personnel: 550, maxOrg: 60, armorCount: 45, maxSupply: 50,
    softAttack: 16, hardAttack: 40, defense: 24, piercing: 36, hardness: 26,
    experience: 'Seasoned', traits: ['anti_tank', 'high_caliber', 'tough_chassis', 'repair_crew']
  },
  {
    id: 'tpl_militia', name: 'Militia Unit', category: 'infantry', armorTier: 'unarmored',
    personnel: 1400, maxOrg: 45, armorCount: 0, maxSupply: 30,
    softAttack: 11, hardAttack: 2, defense: 15, piercing: 3, hardness: 1,
    experience: 'Green', traits: ['desperate_defense', 'frontliner_defender']
  },
  {
    id: 'tpl_zombie_horde', name: 'Undead Zombie Horde (Special)', category: 'infantry', armorTier: 'unarmored',
    personnel: 1600, maxOrg: 100, armorCount: 0, maxSupply: 100,
    softAttack: 18, hardAttack: 4, defense: 14, piercing: 4, hardness: 2,
    experience: 'Regular', traits: ['zombie_unit']
  },
  {
    id: 'tpl_kaiju_monster', name: 'Behemoth Monster (Special)', category: 'tank', armorTier: 'super',
    personnel: 350, maxOrg: 100, armorCount: 1, maxSupply: 100,
    softAttack: 45, hardAttack: 45, defense: 35, piercing: 38, hardness: 40,
    experience: 'Elite', traits: ['monster_unit', 'high_caliber', 'explosive_weapon']
  }
];