/* ==========================================================================
   IRON DIVISION ENGINE — INDONESIAN (BAHASA INDONESIA) LOCALIZATION MODULE
   File: js/i18n-id.js
   Drop-in i18n layer with live EN <-> ID toggle, localStorage persistence,
   exact + pattern translation, and automatic MutationObserver sync.
   ========================================================================== */

window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  const STORAGE_KEY = 'iron_division_lang_v1';
  let currentLang = 'en';
  let observer = null;
  let isApplying = false;

  // Preserve original English text/attributes so switching back to EN is lossless
  const originalTextMap = new WeakMap();
  const originalPlaceholderMap = new WeakMap();
  const originalTitleMap = new WeakMap();

  // --------------------------------------------------------------------------
  // 1. Exact String Dictionary (English -> Bahasa Indonesia)
  // --------------------------------------------------------------------------
  const EXACT_MAP = {
    // Header & Navigation Dock
    'COMBINED-ARMS TACTICAL COMMAND': 'KOMANDO TAKTIS GABUNGAN SENJATA',
    'EXPORT JSON': 'EKSPOR JSON',
    'IMPORT JSON': 'IMPOR JSON',
    'UI TOUR': 'TUR UI',
    'AAR': 'AAR',
    'Battlefield': 'Medan Tempur',
    'ORBAT': 'ORBAT',
    'Traits': 'Sifat & Modul',
    'Command HQ': 'Markas Komando',
    'Terrain': 'Medan & Cuaca',
    'Doctrines': 'Doktrin Taktik',
    'FM Manual': 'Buku Manual',

    // Theatre Command & Environment Bar
    'THEATRE //': 'TEATER //',
    'THEATRE COMMAND & ENVIRONMENT': 'KOMANDO TEATER & LINGKUNGAN',
    '▲ COLLAPSE': '▲ TUTUP',
    '▼ EXPAND': '▼ BUKA',
    'Base Terrain': 'Medan Dasar',
    'Terrain Feature': 'Fitur Medan',
    'Weather': 'Cuaca',
    'DYN': 'DINAMIS',
    'Theatre Role': 'Peran Teater',
    'Side A Invades / B Entrenched': 'Pihak A Menyerang / B Bertahan',
    'Side B Invades / A Entrenched': 'Pihak B Menyerang / A Bertahan',
    'Opening': 'Pembukaan',
    'Surprise Rd1': 'Kejutan Rd1',
    'Day': 'Tgl',
    'Month': 'Bulan',
    'Year': 'Tahun',
    'Clock (24H)': 'Jam (24J)',
    'Round Length': 'Durasi Ronde',
    'Minutes': 'Menit',
    'Hours': 'Jam',
    'Days': 'Hari',
    'DAWN': 'FAJAR',
    'DAYLIGHT': 'SIANG',
    'DUSK': 'SENJA',
    'NIGHT': 'MALAM',
    'GM LIVE MODE //': 'MODE GM LANGSUNG //',
    '◄ UNDO 1 ROUND': '◄ BATAL 1 RONDE',
    '+50 DEPOT A': '+50 DEPOT A',
    '+50 DEPOT B': '+50 DEPOT B',
    'Adjust Supply / Org / Dist directly on unit cards or deploy mid-battle reinforcements.': 'Atur Logistik / Org / Jarak langsung di kartu unit atau kerahkan bala bantuan.',

    // Battlefield Flanks & Commander Boxes
    'INITIATIVE': 'INISIATIF',
    'REACTING': 'BEREAKSI',
    'COMMANDING OFFICER': 'KOMANDAN PASUKAN',
    'Tactic Selection': 'Pilihan Taktik',
    '+ DEPLOY': '+ KERAHKAN',
    'COMPACT': 'RINGKAS',
    'FULL': 'PENUH',
    'ACTIVE FORMATIONS': 'FORMASI AKTIF',
    'EFF. STRENGTH / AFV': 'KEKUATAN EFEKTIF / RANPUR',
    'LOSSES (KIA+WIA)': 'KORBAN (GUGUR+LUKA)',
    'UNARMORED // FOOT ELEMENT': 'NON-LAPSUS // INFANTERI KAKI',
    'EXPERIENCE TIER': 'TINGKAT PENGALAMAN',
    'BASE RECOVERY': 'PEMULIHAN DASAR',
    'TRAITS & SUPPORT': 'SIFAT & DUKUNGAN',
    'NONE': 'TIDAK ADA',

    // Center Command Console & 2D Tactical Sector
    'OPERATIONAL STATUS': 'STATUS OPERASIONAL',
    'INITIATIVE VECTOR': 'ARAH INISIATIF',
    '▶ EXECUTE ROUND': '▶ JALANKAN RONDE',
    'AUTO-OPS': 'OTOMATIS',
    'STOP AUTO': 'HENTIKAN',
    'GM LIVE': 'MODE GM',
    'AAR REPORT': 'LAPORAN AAR',
    'RESET': 'ATUR ULANG',
    'CLEAR': 'KOSONGKAN',
    'PARITY': 'SEIMBANG',
    'SCENARIOS:': 'SKENARIO:',
    '2D TACTICAL SECTOR': 'SEKTOR TAKTIS 2D',
    'Y-AXIS CONTACT (0)': 'GARIS KONTAK (0)',
    'CONTACT LINE (0)': 'GARIS KONTAK (0)',
    'SITREP // COMBAT LOG': 'SITREP // LOG PERTEMPURAN',
    'ALL LOGS': 'SEMUA LOG',
    'DAMAGE': 'KERUSAKAN',
    'ARMOR': 'LAPSUS/RANPUR',
    'SUPPORT': 'DUKUNGAN',
    'ROLLS': 'DADU/TACTIC',
    'EXPAND': 'PERBESAR',
    'COPY': 'SALIN',
    'CLR': 'HAPUS',
    'COPY ALL': 'SALIN SEMUA',
    'CLOSE [X]': 'TUTUP [X]',

    // Tab 2: ORBAT Unit Designer
    'Create / Edit Unit Template': 'Buat / Sunting Templat Unit',
    '+ New Unit': '+ Unit Baru',
    '01 // IDENTITY & CLASSIFICATION': '01 // IDENTITAS & KLASIFIKASI',
    'Unit Name': 'Nama Unit',
    'Unit Category (Combat Die)': 'Kategori Unit (Dadu Tempur)',
    'Armor Class (Hard/Soft Split)': 'Kelas Lapis Baja (Rasio Keras/Lunak)',
    'Experience Tier': 'Tingkat Pengalaman',
    '02 // OFFENSE & PENETRATION': '02 // SERANGAN & PENETRASI',
    'Soft Attack': 'Serangan Lunak (Soft)',
    'Hard Attack': 'Serangan Lapis Baja (Hard)',
    'Piercing': 'Penetrasi (Piercing)',
    '03 // DEFENSE & ARMOR': '03 // PERTAHANAN & LAPIS BAJA',
    'Defense Stat': 'Nilai Pertahanan',
    'Hardness': 'Ketebalan Baja (Hardness)',
    'Combat-Ready Armor Vehicles': 'Jumlah Ranpur Siap Tempur',
    '04 // STRENGTH, LOGISTICS & RECOVERY': '04 // KEKUATAN, LOGISTIK & PEMULIHAN',
    'Total Personnel (HP)': 'Total Personel (HP)',
    'Max Organization (HP)': 'Organisasi Maks (ORG)',
    'Max Supply Stat': 'Logistik Maks (SUP)',
    'Base Recovery (%)': 'Pemulihan Dasar (%)',
    'Assigned Unit Traits & Support Modules': 'Sifat Unit & Modul Dukungan Terpasang',
    'SAVE TEMPLATE': 'SIMPAN TEMPLAT',
    '+ Side A': '+ Pihak A',
    '+ Side B': '+ Pihak B',
    'Unit Templates Library': 'Pustaka Templat Unit',
    'Includes all standard sample templates plus your custom saved units.': 'Mencakup seluruh templat standar dan unit kustom yang Anda simpan.',
    'Restore Sample Templates': 'Pulihkan Templat Bawaan',
    'ALL': 'SEMUA',
    'INFANTRY': 'INFANTERI',
    'ARTILLERY': 'ARTILERI',

    // Tab 3: Traits & Support Modules
    'Create / Edit Custom Trait': 'Buat / Sunting Sifat Kustom',
    '+ New Trait': '+ Sifat Baru',
    '01 // IDENTITY': '01 // IDENTITAS',
    'Trait Name': 'Nama Sifat',
    'Description': 'Deskripsi',
    '02 // OFFENSE MODIFIERS': '02 // PENGUBAH SERANGAN',
    'Attack (%)': 'Serangan (%)',
    'Attack (Flat)': 'Serangan (Tetap)',
    'Soft Attack (Flat)': 'Serangan Lunak (Tetap)',
    'Hard Attack (Flat)': 'Serangan Baja (Tetap)',
    'Piercing (Flat)': 'Penetrasi (Tetap)',
    'Enemy Def Malus': 'Penalti Pertahanan Musuh',
    'Enemy Hardness Malus': 'Penalti Baja Musuh',
    '03 // DEFENSE & ARMOR': '03 // PERTAHANAN & BAJA',
    'Defense (%)': 'Pertahanan (%)',
    'Defense (Flat)': 'Pertahanan (Tetap)',
    'Hardness (Flat)': 'Ketebalan Baja (Tetap)',
    '04 // LOGISTICS, RECON & RECOVERY': '04 // LOGISTIK, INTAI & PEMULIHAN',
    'Vigilance Roll': 'Bonus Pengintaian (Vig)',
    'Org Regen/Turn': 'Regen Org/Ronde',
    'Supply Regen/Turn': 'Regen Logistik/Ronde',
    'Supply Steal': 'Rampasan Logistik',
    'Personnel Rec Bonus': 'Bonus Pemulihan Personel',
    'Armor Rec Bonus': 'Bonus Pemulihan Ranpur',
    'Pursuing Bonus': 'Bonus Pengejaran',
    'Retreat Bonus': 'Bonus Mundur',
    '05 // TERRAIN & TARGETING SYNERGY': '05 // SINERGI MEDAN & TARGET',
    'Terrain Synergy': 'Sinergi Medan',
    'Terrain Atk/Def (%)': 'Bonus Medan Ser/Per (%)',
    'Anti-Unit Priority': 'Prioritas Anti-Unit',
    'Anti-Unit Atk (%)': 'Bonus Anti-Unit (%)',
    'Grants High-Caliber': 'Beri Kaliber Besar',
    'Grants Explosive': 'Beri Daya Ledak (HE)',
    'Frontliner / Defender': 'Garda Depan / Pelindung',
    'Repair Crew': 'Kru Perbaikan Lapangan',
    'SAVE TRAIT': 'SIMPAN SIFAT',
    'Traits & Support Modules Directory': 'Direktori Sifat & Modul Dukungan',
    'Click any trait to edit its numerical values.': 'Klik sifat mana saja untuk menyunting nilainya.',
    'COMBAT': 'TEMPUR',
    'SPECIAL': 'KHUSUS',

    // Tab 4: Command HQ
    'Add / Edit Commander': 'Tambah / Sunting Komandan',
    '+ New General': '+ Jenderal Baru',
    'Name & Rank': 'Nama & Pangkat',
    'Tactical Doctrine Personality': 'Kepribadian Doktrin Taktis',
    'Commander Attributes (+2.5% per Level)': 'Atribut Komandan (+2,5% per Level)',
    'Assigned Commander Traits': 'Sifat Komandan Terpasang',
    '+ Create New Trait': '+ Buat Sifat Baru',
    'SAVE COMMANDER': 'SIMPAN KOMANDAN',
    'Active Commanders Roster': 'Daftar Komandan Aktif',
    'Assign generals to Side A or Side B on the Battlefield tab.': 'Tugaskan jenderal ke Pihak A atau Pihak B di tab Medan Tempur.',
    'Restore Defaults': 'Pulihkan Bawaan',
    'Create / Edit Commander Trait': 'Buat / Sunting Sifat Komandan',
    'Cancel': 'Batal',
    'Save Trait': 'Simpan Sifat',

    // Tab 5: Terrain & Weather
    'Base Terrains Matrix': 'Matriks Medan Dasar',
    'Terrain Features': 'Fitur Medan',
    'Weather Conditions': 'Kondisi Cuaca',
    'Time-of-Day Cycle': 'Siklus Waktu Harian',
    'Compound Hazards (Terrain × Weather)': 'Bahaya Gabungan (Medan × Cuaca)',

    // Welcome Briefing & Modals
    'INITIAL ORIENTATION BRIEFING': 'PENGARAHAN ORIENTASI AWAL',
    'READ FIRST': 'BACA DULU',
    "DRILL SERGEANT'S RECOMMENDATION:": 'REKOMENDASI SERSAN PELATIH:',
    "Don't show this briefing on next visit": 'Jangan tampilkan pengarahan ini lagi',
    'PROCEED TO BATTLEFIELD': 'MASUK MEDAN TEMPUR',
    'START UI TOUR': 'MULAI TUR UI',
    'READ THE FIELD MANUAL': 'BACA BUKU MANUAL',
    'SITREP // EXPANDED COMBAT LOG': 'SITREP // LOG PERTEMPURAN LENGKAP',
    'OPERATION CONCLUDED': 'OPERASI SELESAI',
    'EXPORT PDF (FORM DA-774)': 'EKSPOR PDF (FORM DA-774)',
    'RESET BATTLE': 'ULANG PERTEMPURAN',
    'CLOSE': 'TUTUP',

    // Interactive UI Tutorial Controls & Steps
    'SKIP TOUR': 'LEWATI TUR',
    '◄ BACK': '◄ KEMBALI',
    'NEXT ►': 'LANJUT ►',
    'FINISH ✓': 'SELESAI ✓',
    'Theatre Command & Environment Ticker': 'Pita Komando Teater & Lingkungan',
    'This top ticker displays the live 24-hour operational clock, terrain, and weather at a glance while staying compact above the fold. Click ▼ EXPAND anytime to change Terrain, Features, Climate-Aware Dynamic Weather, Round Length, or set any historical/fictional year from -270000 BCE to +270000.': 'Pita atas ini menampilkan jam operasional 24 jam, medan, dan cuaca secara ringkas tanpa memenuhi layar. Klik ▼ BUKA kapan saja untuk mengubah Medan, Fitur, Cuaca Dinamis berbasis Iklim, Durasi Ronde, atau tahun historis/fiksi apa pun (-270000 SM hingga +270000).',
    'TIP: Morning Fog and Night automatically clamp visibility range and slash Close Air Support efficiency.': 'TIPS: Kabut Pagi dan Malam otomatis membatasi jarak pandang dan memangkas efektivitas Dukungan Udara.',

    'Faction Plates, Brass Commanders & Tactics': 'Pelat Faksi, Pelat Komandan & Taktik',
    'Each flank has a clickable steel faction nameplate (type any custom faction name), an engraved brass Commander nameplate dropdown with 10-tier Officer Rank Insignia, and a Tactic selector. Commanders grant +2.5% army-wide per ATK/DEF/CMD/LOG level plus unique traits.': 'Setiap sisi memiliki pelat nama faksi baja yang bisa diklik untuk diganti namanya, menu dropdown pelat kuningan Komandan lengkap dengan Lencana Pangkat 10 tingkat, dan pemilih Taktik. Komandan memberi +2,5% bonus pasukan per level ATK/DEF/CMD/LOG.',
    'TIP: Leave Tactic on Auto-AI to let the general pick doctrines matching their personality, or override manually each round.': 'TIPS: Biarkan Taktik di Auto-AI agar jenderal memilih doktrin sesuai kepribadiannya, atau pilih manual setiap ronde.',

    'Force Strength & Shared Supply Depot': 'Kekuatan Pasukan & Depot Logistik Bersama',
    'Track active formations, effective personnel, combat-ready AFVs, and total KIA+WIA losses here. Below sits your shared Theatre Supply Depot — frontline units draw refills from it every round, and running dry cripples combat stats.': 'Pantau formasi aktif, personel efektif, ranpur siap tempur, dan total korban gugur+luka di sini. Di bawahnya terdapat Depot Logistik Teater bersama — unit garis depan mengambil pasokan dari depot ini setiap ronde.',
    'TIP: Watch the depot bar! Below 30% it turns amber, and at 0% your divisions cannot resupply.': 'TIPS: Awasi bilah depot! Di bawah 30% warnanya menjadi kuning-oranye, dan di 0% divisi Anda tak bisa mengisi ulang amunisi.',

    'Deploying Units & Compact Card Mode': 'Pengerahan Unit & Mode Kartu Ringkas',
    'Pick any unit template from the dropdown and click + DEPLOY to reinforce a flank. Use the COMPACT / FULL toggle right next to it to shrink unit cards down to Name, DIST, and the 4 core stat bars (PERS, ORG, SUP, AFV) when commanding large divisions.': 'Pilih templat unit dari daftar lalu klik + KERAHKAN untuk menambah pasukan. Gunakan tombol RINGKAS / PENUH di sebelahnya untuk memperkecil kartu unit menjadi Nama, JARAK, dan 4 bilah utama (PERS, ORG, SUP, AFV) saat memimpin banyak batalyon.',
    'TIP: In Compact mode, hovering any unit card automatically surfaces all hidden details (TV, Dig-In, KIA/WIA, Class, AFV Recov/KO) inside the floating tooltip.': 'TIPS: Dalam mode Ringkas, arahkan kursor ke kartu unit mana pun untuk melihat semua detail tersembunyi (TV, Parit, KIA/WIA, Kelas, Ranpur) di jendela melayang.',

    'Unit Dossier Cards & Status Accents': 'Kartu Dossier Unit & Aksen Status',
    'Every battalion card has a 3px left-edge status bar: solid Blue/Red when combat-effective, muted Amber when ORG or SUP drops below 30%, and a diagonal hatch overlay when routed or out of action. Hover a card for deep combat stats and to light up its counter on the map.': 'Setiap kartu batalyon memiliki garis status 3px di tepi kiri: Biru/Merah solid saat siap tempur, Kuning saat ORG atau SUP di bawah 30%, dan arsiran diagonal saat kocar-kacir atau gugur. Arahkan kursor ke kartu untuk menyorot simbolnya di peta.',
    'TIP: Battles are won by breaking enemy Organization (blue bar) and Supply (yellow bar), not killing every last soldier.': 'TIPS: Pertempuran dimenangkan dengan menghancurkan Organisasi (bilah biru) dan Logistik (bilah kuning) musuh, bukan menghabisi setiap prajurit.',

    'Sticky Operational Status & Turn Controls': 'Panel Status Operasional Menempel & Kontrol Ronde',
    'This center console stays pinned as you scroll down through flanks. Hit ▶ EXECUTE ROUND to advance one turn, AUTO-OPS to run continuously, GM LIVE for 1-round Undo and live edits, or click ▲ to collapse it into a razor-thin sticky bar showing only Execute, Auto-Ops, and the Force Ratio gauge.': 'Konsol tengah ini tetap menempel saat Anda menggulir daftar unit. Tekan ▶ JALANKAN RONDE untuk maju satu giliran, OTOMATIS untuk berjalan terus, MODE GM untuk batal 1 ronde, atau klik ▲ untuk melipatnya menjadi bilah tipis.',
    'TIP: Quick-load Arracourt (1944) or San Marino (1944) anytime from the Scenarios buttons inside this panel.': 'TIPS: Muat cepat skenario Arracourt (1944) atau San Marino (1944) kapan saja dari tombol Skenario di panel ini.',

    '2D Tactical Sector & Two-Way Map Linking': 'Sektor Taktis 2D & Tautan Peta Dua Arah',
    'Watch formations advance toward CONTACT LINE (0) in real time. Infantry and standard Armored Vehicles engage at Distance <= 2, Tanks and Tank Destroyers at <= 3, and Artillery up to <= 6. Click any NATO counter on the map to scroll straight to its unit card and flash it in amber.': 'Saksikan formasi maju menuju GARIS KONTAK (0) secara langsung. Infanteri & Ranpur standar menembak di Jarak <= 2, Tank & Penghancur Tank di <= 3, dan Artileri hingga <= 6. Klik simbol NATO di peta untuk langsung melompat ke kartu unitnya.',
    'TIP: Hover the Y-Axis triangles right below the map to inspect stacked units at any distance coordinate.': 'TIPS: Arahkan kursor ke segitiga Sumbu-Y tepat di bawah peta untuk memeriksa tumpukan unit di setiap koordinat jarak.',

    'SITREP Operational Logbook (Form DA-1594)': 'Buku Log Operasional SITREP (Form DA-1594)',
    'Every vigilance roll, fire-support volley, armor penetration check, field repair, and rout is recorded here in real time. Filter by category (Damage, Armor, Support, Rolls), click EXPAND for a full-screen searchable logbook, or COPY to paste into your TTRPG notes.': 'Setiap hasil pengintaian, salvo artileri, penetrasi baja, perbaikan lapangan, dan mundurnya pasukan tercatat langsung di sini. Saring berdasarkan kategori, klik PERBESAR untuk layar penuh, atau SALIN ke catatan TTRPG Anda.',
    'TIP: Click anywhere outside any pop-up modal — or press Esc — to close it instantly.': 'TIPS: Klik di mana saja di luar jendela pop-up — atau tekan Esc — untuk menutupnya seketika.',

    '7-Slot Command Navigation Dock': 'Bilah Navigasi Komando 7-Tab',
    'Switch across all 7 workspaces from this dock: Battlefield, ORBAT (custom unit designer), Traits, Command HQ (custom generals), Terrain (color-coded modifier matrix), Doctrines (25-page tactic manual), and FM Manual (Drill Sergeant & Technical manuals).': 'Berpindah antar 7 ruang kerja dari bilah ini: Medan Tempur, ORBAT (perancang unit), Sifat & Modul, Markas Komando (jenderal kustom), Medan & Cuaca, Doktrin Taktik (manual 25 halaman), dan Buku Manual (Panduan Sersan Pelatih & Teknis).',
    'TIP: Every custom unit, trait, general, and terrain auto-saves in your browser.': 'TIPS: Setiap unit, sifat, jenderal, dan medan kustom otomatis tersimpan di peramban Anda.',

    'Form DA-774 After-Action Report & JSON Backup': 'Laporan Pasca-Operasi Form DA-774 & Cadangan JSON',
    'Click AAR anytime for an interim SITREP or post-battle debrief complete with per-unit kills, depot logistics, weather trail, and printable A4 Form DA-774 PDF export. Use EXPORT / IMPORT JSON next to it to save or share your custom armies, and click UI TOUR anytime to replay this guide.': 'Klik AAR kapan saja untuk laporan sementara atau laporan akhir lengkap dengan korban per unit, logistik depot, riwayat cuaca, dan ekspor PDF A4 Form DA-774. Gunakan EKSPOR / IMPOR JSON di sebelahnya untuk mencadangkan pasukan kustom Anda, dan klik TUR UI kapan saja untuk mengulang panduan ini.',
    'DISMISSED, COMMANDER — hit ▶ EXECUTE ROUND to kick off the Battle of Arracourt!': 'BUBAR, KOMANDAN — tekan ▶ JALANKAN RONDE untuk memulai Pertempuran Arracourt!'
  };

  // --------------------------------------------------------------------------
  // 2. Pattern / Dynamic String Replacements
  // --------------------------------------------------------------------------
  const PATTERN_RULES = [
    [/^ORIENTATION \/\/ STEP (\d+) \/ (\d+)$/, 'ORIENTASI // LANGKAH $1 / $2'],
    [/^ROUND (\d+)$/, 'RONDE $1'],
    [/^BATTLE CONCLUDED \(RD (\d+)\)$/, 'PERTEMPURAN SELESAI (RD $1)'],
    [/^(\d+) UNITS$/, '$1 UNIT'],
    [/^(\d+) TRAITS$/, '$1 SIFAT'],
    [/^(\d+) \/ (\d+) GENERALS$/, '$1 / $2 JENDERAL'],
    [/^SUPPLY DEPOT \/\/ (.+)$/, 'DEPOT LOGISTIK // $1'],
    [/^DIST (\d+)$/, 'JARAK $1'],
    [/^STATUS: OUT OF ACTION \/\/ (.+)$/, 'STATUS: NONAKTIF // $1'],
    [/^STATUS: REGROUPING IN REAR \/\/ (\d+) RD\(S\) TO RALLY$/, 'STATUS: KONSOLIDASI DI BELAKANG // $1 RONDE LAGI'],
    [/^SUPPLY DEFICIT \[(-\d+%)\]$/, 'DEFISIT LOGISTIK [$1]'],
    [/^(.+) Attacks -> (.+) Defends$/, '$1 Menyerang -> $2 Bertahan'],
    [/^Winner: (.+)$/, 'Pemenang: $1'],
    [/^Result: Mutual Exhaustion$/, 'Hasil: Kelelahan Bersama (Seri)']
  ];

  // Placeholder translations
  const PLACEHOLDER_MAP = {
    'Search traits...': 'Cari sifat...',
    'Filter units...': 'Saring unit...',
    'Filter traits...': 'Saring sifat...',
    'Filter generals...': 'Saring jenderal...',
    'Search combat logs...': 'Cari log pertempuran...',
    'e.g. 1st Panzer Grenadiers': 'cth. Batalyon Infanteri 1',
    'e.g. Field Marshal Zhukov': 'cth. Jenderal Sudirman'
  };

  function translateText(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    const trimmed = raw.trim();
    if (!trimmed) return raw;

    // Exact match (preserving leading/trailing whitespace)
    if (Object.prototype.hasOwnProperty.call(EXACT_MAP, trimmed)) {
      return raw.replace(trimmed, EXACT_MAP[trimmed]);
    }

    // Dynamic pattern match
    for (const [regex, replacement] of PATTERN_RULES) {
      if (regex.test(trimmed)) {
        return raw.replace(trimmed, trimmed.replace(regex, replacement));
      }
    }
    return raw;
  }

  function shouldSkipNode(node) {
    if (!node || !node.parentElement) return true;
    const tag = node.parentElement.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'TEXTAREA' || tag === 'INPUT') {
      return true;
    }
    // Never mangle live combat log entries or user-entered unit names
    if (node.parentElement.closest('#combat-log-container, #log-expand-container, .mil-dogtag-text, .mil-cmd-plate-text')) {
      return true;
    }
    return false;
  }

  function applyLanguageToSubtree(root, lang) {
    if (!root) return;
    isApplying = true;
    try {
      // 1. Walk text nodes
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        if (shouldSkipNode(node)) continue;
        if (!originalTextMap.has(node)) {
          originalTextMap.set(node, node.nodeValue);
        }
        const orig = originalTextMap.get(node);
        const targetVal = (lang === 'id') ? translateText(orig) : orig;
        if (node.nodeValue !== targetVal) {
          node.nodeValue = targetVal;
        }
      }

      // 2. Translate input placeholders
      if (root.querySelectorAll) {
        root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
          if (!originalPlaceholderMap.has(el)) {
            originalPlaceholderMap.set(el, el.getAttribute('placeholder') || '');
          }
          const orig = originalPlaceholderMap.get(el);
          const next = (lang === 'id' && PLACEHOLDER_MAP[orig]) ? PLACEHOLDER_MAP[orig] : orig;
          if (el.getAttribute('placeholder') !== next) {
            el.setAttribute('placeholder', next);
          }
        });
      }
    } finally {
      isApplying = false;
    }
  }

  function updateToggleButton() {
    const btn = document.getElementById('btn-lang-toggle');
    if (!btn) return;
    btn.textContent = currentLang === 'id' ? 'ID 🇮🇩' : 'EN';
    btn.title = currentLang === 'id'
      ? 'Bahasa Indonesia aktif — klik untuk kembali ke Bahasa Inggris (EN)'
      : 'English active — click to switch UI to Bahasa Indonesia (ID)';
    btn.classList.toggle('border-[#c8a24b]', currentLang === 'id');
    btn.classList.toggle('text-[#e6c873]', currentLang === 'id');
  }

  function injectLanguageToggleButton() {
    if (document.getElementById('btn-lang-toggle')) return;
    const tourBtn = document.getElementById('btn-header-tour') || document.getElementById('btn-header-aar');
    if (!tourBtn || !tourBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-lang-toggle';
    btn.className = 'mil-btn px-2 py-1 bg-[#181e19] hover:bg-[#242d26] border border-[#3a453c] text-[#c8d1c7] text-[10px] font-mono font-bold';
    btn.onclick = toggleLanguage;
    tourBtn.parentElement.insertBefore(btn, tourBtn);
    updateToggleButton();
  }

  function startObserver() {
    if (observer || typeof MutationObserver === 'undefined' || !document.body) return;
    observer = new MutationObserver((mutations) => {
      if (isApplying || currentLang !== 'id') return;
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(n => {
            if (n.nodeType === 1) applyLanguageToSubtree(n, 'id');
            else if (n.nodeType === 3 && !shouldSkipNode(n)) {
              if (!originalTextMap.has(n)) originalTextMap.set(n, n.nodeValue);
              const t = translateText(originalTextMap.get(n));
              if (n.nodeValue !== t) {
                isApplying = true;
                n.nodeValue = t;
                isApplying = false;
              }
            }
          });
        } else if (m.type === 'characterData' && m.target && !shouldSkipNode(m.target)) {
          const n = m.target;
          const val = n.nodeValue;
          const translated = translateText(val);
          if (translated !== val) {
            originalTextMap.set(n, val);
            isApplying = true;
            n.nodeValue = translated;
            isApplying = false;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function setLanguage(lang) {
    currentLang = (lang === 'id') ? 'id' : 'en';
    try {
      localStorage.setItem(STORAGE_KEY, currentLang);
    } catch (_) {}
    if (document.documentElement) {
      document.documentElement.lang = currentLang;
    }
    updateToggleButton();
    if (document.body) {
      applyLanguageToSubtree(document.body, currentLang);
    }
  }

  function toggleLanguage() {
    setLanguage(currentLang === 'id' ? 'en' : 'id');
  }

  function initI18n() {
    let saved = 'en';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'id') saved = stored;
    } catch (_) {}

    injectLanguageToggleButton();
    startObserver();
    setLanguage(saved);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(initI18n, 40));
  } else {
    setTimeout(initI18n, 40);
  }

  // Public API
  ID.I18n = {
    setLanguage,
    toggleLanguage,
    getLanguage: () => currentLang,
    translateText,
    EXACT_MAP
  };

  window.setIronDivisionLanguage = setLanguage;
  window.toggleIronDivisionLanguage = toggleLanguage;

})(window.IronDivision);