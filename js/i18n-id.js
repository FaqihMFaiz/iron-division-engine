/* ==========================================================================
   IRON DIVISION ENGINE — INDONESIAN (BAHASA INDONESIA) LOCALIZATION MODULE
   File: js/i18n-id.js
   Drop-in i18n layer (default EN) with live EN <-> ID toggle, localStorage
   persistence, reversible data.js localization, natural non-stiff Indonesian
   Manuals written by a subordinate soldier ("Komandan / Kumendan / Ndan"),
   and automatic MutationObserver sync.
   ========================================================================== */

window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  const STORAGE_KEY = 'iron_division_lang_v1';
  let currentLang = 'en';
  let observer = null;
  let isApplying = false;
  let origRenderGuide = null;
  let origBuildPrintableAAR = null;
  let origExportAARToPDF = null;
  let origOpenBattleModal = null;
  let origWelcomeHtml = null;

  // Lossless English backups for DOM nodes & data.js objects
  const originalTextMap = new WeakMap();
  const originalPlaceholderMap = new WeakMap();
  const dataBackups = {
    saved: false,
    terrains: {},
    features: {},
    weather: {},
    tod: {},
    hazards: {},
    traits: {},
    cmdTraits: {},
    tactics: {}
  };

  // --------------------------------------------------------------------------
  // 1. data.js Indonesian Translations (Natural, Non-Stiff Military Indonesian)
  // --------------------------------------------------------------------------
  const ID_TERRAINS = {
    Plains:   { name: 'Dataran Terbuka' },
    Forest:   { name: 'Hutan Lebat' },
    Hills:    { name: 'Perbukitan' },
    Mountain: { name: 'Pegunungan' },
    Jungle:   { name: 'Hutan Rimba' },
    Marsh:    { name: 'Rawa-Rawa' },
    Desert:   { name: 'Gurun Pasir' },
    Urban:    { name: 'Perkotaan' }
  };

  const ID_FEATURES = {
    Normal:     { name: 'Normal', desc: 'Medan standar tanpa rintangan tambahan.' },
    Road:       { name: 'Jalan Raya', desc: 'Bantuan mobilitas dan logistik; kolom pasukan bergerak cepat tapi lebih mudah disergap.' },
    SmallRiver: { name: 'Sungai Kecil', desc: 'Penyerang kena penalti saat menyeberang di bawah tembakan; Marinir & Zeni mengurangi dampaknya.' },
    LargeRiver: { name: 'Sungai Besar', desc: 'Rintangan air berat bagi penyerang tanpa dukungan jembatan atau unit amfibi.' },
    Amphibious: { name: 'Pendaratan Amfibi', desc: 'Serbuan pantai berisiko tinggi; sangat menguntungkan pihak bertahan kecuali penyerang membawa Marinir.' },
    Fort:       { name: 'Bunker / Kubu Pertahanan', desc: 'Benteng beton & parit diperkuat: melipatgandakan pertahanan dan menambah batas galian (+2).' }
  };

  const ID_WEATHER = {
    Sunny:     { name: 'Cerah', desc: 'Jarak pandang jernih, operasi udara dan tembakan langsung berjalan normal.' },
    Overcast:  { name: 'Mendung', desc: 'Langit tertutup awan tebal, sedikit mengurangi efektivitas serangan udara.' },
    Windy:     { name: 'Berangin Kencang', desc: 'Angin kuat sedikit mengganggu akurasi salvo artileri dan penerbangan.' },
    LightRain: { name: 'Hujan Ringan', desc: 'Tanah mulai licin, jarak pandang dan dukungan udara sedikit menurun.' },
    HeavyRain: { name: 'Hujan Deras', desc: 'Banjir lumpur, dukungan udara anjlok parah dan rawan batal terbang.' },
    Foggy:     { name: 'Berkabut Tebal', desc: 'Jarak pandang dibatasi ketat; tank harus merayap dekat dan pesawat bisa gagal terbang.' },
    Snowy:     { name: 'Salju / Beku', desc: 'Suhu beku mempercepat habisnya logistik, memperburuk luka, dan rawan mesin tank mogok.' },
    HeatWaves: { name: 'Gelombang Panas', desc: 'Panas ekstrem menguras air/logistik infanteri dan memicu badai debu di gurun.' }
  };

  const ID_TOD = {
    Day:      { name: 'Siang Hari', desc: 'Visibilitas penuh; pengintaian dan dukungan udara berjalan tanpa hambatan.' },
    DuskDawn: { name: 'Fajar / Senja', desc: 'Cahaya remang mengurangi pengintaian (-10 Vig) dan dukungan udara (-15%).' },
    Night:    { name: 'Malam Hari', desc: 'Gelap gulita membatasi jarak pandang (VisCap 4), memperkuat penyergapan (+15), dan membatasi udara (-40%).' }
  };

  const ID_HAZARDS = {
    mud_rasputitsa:  { name: 'Lumpur / Rasputitsa', trigger: 'Hujan Deras di Dataran/Hutan/Bukit/Rawa/Jalan', desc: 'Tank terjebak lumpur (-1 s.d. -2 mobilitas), truk logistik macet (+2 konsumsi), dan evakuasi ranpur rusak jauh lebih sulit (-15).' },
    zero_visibility: { name: 'Jarak Pandang Nihil', trigger: 'Kabut di mana saja, atau Malam di Kota/Hutan/Rimba', desc: 'Jarak tembak langsung dibatasi (VisCap 3–4) dan pengintaian turun (-15 Vig) tanpa unit Intai atau Kamuflase.' },
    deep_freeze:     { name: 'Beku Ekstrem', trigger: 'Salju di Pegunungan/Bukit/Dataran', desc: 'Prajurit luka rawan gugur kedinginan (+3% DOW), logistik boros (+1), dan tank kurang logistik (<30%) rawan mogok mesin.' },
    heatstroke_dust: { name: 'Sengatan Panas / Debu', trigger: 'Gelombang Panas di Gurun', desc: 'Infanteri boros air (+2 logistik) dan kehilangan Org (-2/ronde); badai debu membutakan optik tank & artileri (-15 Vig).' }
  };

  const ID_TRAITS = {
    high_caliber:            { name: 'Senjata Kaliber Besar', desc: 'Meriam/senjata berat: menambah dadu korban tambahan dan memperparah tingkat fatalitas luka musuh (-10 pemulihan).' },
    explosive_weapon:        { name: 'Amunisi Daya Ledak (HE)', desc: 'Peluru ledak/pecahan: memberi dadu korban ekstra melawan infanteri (dibatalkan jika gagal menembus baja Medium+).' },
    anti_tank:               { name: 'Senjata Anti-Tank', desc: 'Spesialis pemburu lapis baja: bonus serangan besar ke Tank & Ranpur, dan memberi jarak tembak <= 3 untuk Tank Destroyer.' },
    grenade_assault:         { name: 'Granat / Serbuan Jarak Dekat', desc: 'Efektif membersihkan parit dan ruangan sempit; bonus serangan jarak dekat dan melemahkan pertahanan musuh.' },
    mountaineers:            { name: 'Pasukan Gunung', desc: 'Terlatih di medan terjal: bonus tempur signifikan saat bertempur di Pegunungan dan Perbukitan.' },
    marines:                 { name: 'Marinir / Amfibi', desc: 'Ahli pendaratan pantai dan penyeberangan sungai; mengurangi penalti berat serangan amfibi dan sungai.' },
    rangers:                 { name: 'Pasukan Hutan / Ranger', desc: 'Lincah di pepohonan lebat: bonus tempur dan pengintaian di Hutan dan Hutan Rimba.' },
    melee_attack:            { name: 'Pertempuran Jarak Dekat', desc: 'Mengutamakan baku hantam dan serbuan jarak rapat untuk meruntuhkan moral musuh.' },
    engineering_support:     { name: 'Dukungan Zeni Tempur', desc: 'Membantu menerobos rintangan, menggerus pertahanan musuh, dan meningkatkan hasil salvase ranpur pasca-pertempuran.' },
    recon_support:           { name: 'Unit Pengintaian (Intai)', desc: 'Meningkatkan lemparan Pengintaian (Vigilance) secara drastis dan membantu menembus penalti jarak pandang.' },
    desperate_defense:       { name: 'Pertahanan Mati-Matian', desc: 'Saat kekuatan menipis, pasukan tetap gigih bertahan dan menahan keruntuhan Organisasi.' },
    unbreakable:             { name: 'Pantang Mundur', desc: 'Memangkas separuh penalti Org rendah dan dapat bertahan gigih beberapa ronde meski Org sudah menipis.' },
    special_forces:          { name: 'Pasukan Khusus', desc: 'Elit serba bisa: bonus serangan, pertahanan, pengintaian, dan ketahanan mental di segala medan.' },
    field_medic:             { name: 'Medis Lapangan', desc: 'Menekan angka gugur (KIA) dengan meningkatkan pemulihan korban dan mencegah prajurit luka gugur (DOW).' },
    first_aid_kit:           { name: 'P3K Lapangan', desc: 'Pertolongan pertama cepat: menambah peluang prajurit selamat dari luka tembak dan pecahan kaliber besar.' },
    logistic_support:        { name: 'Dukungan Logistik', desc: 'Truk amunisi organik: menarik pasokan ekstra dari Depot Teater agar unit tidak cepat kehabisan peluru.' },
    supply_raiders:          { name: 'Perampas Logistik', desc: 'Pada jarak dekat (<= 2, non-artileri), bisa merampas pasokan langsung dari unit musuh yang berhasil dipukul.' },
    frontliner_defender:     { name: 'Garda Depan / Pelindung', desc: 'Menarik tembakan musuh ke dirinya sendiri untuk melindungi artileri dan unit rapuh di garis belakang.' },
    repair_crew:             { name: 'Kru Perbaikan Lapangan', desc: 'Montir & traktor ARV: +12% Pemulihan Baja; tiap 4 ronde (jika Logistik >= 25% & tidak kena tembak anti-baja ronde lalu) memperbaiki 1–2 ranpur (maks 3 dengan Desain Sederhana).' },
    redundancy:              { name: 'Sistem Cadangan', desc: 'Suku cadang dan jalur komando ganda yang membantu menjaga kestabilan dan pemulihan kendaraan tempur.' },
    tough_chassis:           { name: 'Rangka Baja Tangguh', desc: 'Desain lambung kokoh: +15% Pemulihan Baja dan mengurangi korban awak saat kendaraan dilumpuhkan.' },
    simple_engineering:      { name: 'Desain Mekanis Sederhana', desc: 'Mesin modular gampang diperbaiki: +20% Pemulihan Baja, hemat biaya perbaikan, +1 ekstra perbaikan per siklus, dan memangkas risiko mogok beku.' },
    mortar_support:          { name: 'Dukungan Mortir', desc: 'Tembakan lengkung jarak dekat: merusak parit infanteri, mengguncang Org, atau merusak rantai roda ranpur.' },
    heavy_artillery_support: { name: 'Dukungan Artileri Berat', desc: 'Salvo meriam berat dari garis belakang yang menghancurkan pertahanan, ketebalan baja, dan formasi musuh.' },
    air_support:             { name: 'Dukungan Udara (CAS)', desc: 'Pesawat serang darat menghantam musuh sebelum kontak — efektivitas bergantung pada cuaca, malam, dan Hanud musuh.' },
    aa_defense:              { name: 'Pertahanan Udara Ringan', desc: 'Senapan mesin anti-pesawat yang mengurangi kerusakan serangan udara musuh ke pasukan kita.' },
    aa_gun:                  { name: 'Baterai Meriam Hanud', desc: 'Meriam anti-pesawat berat yang mampu merontokkan pesawat serang musuh dan menghentikan dukungan udara lawan.' },
    infiltration_specialist: { name: 'Spesialis Infiltrasi', desc: 'Mahir menyusup ke celah pertahanan musuh, mengabaikan sebagian parit dan bonus kubu lawan.' },
    fortification_engineer:  { name: 'Zeni Benteng', desc: 'Meningkatkan kecepatan menggali parit dan menambah batas galian (Dig-In) maksimum unit sebesar +1.' },
    concealment_specialist:  { name: 'Spesialis Kamuflase', desc: 'Jago bersembunyi di hutan, kabut, atau malam hari — menaikkan pengintaian dan mengurangi deteksi lawan.' },
    monster_unit:            { name: 'Entitas Monster', desc: 'Makhluk raksasa kebal penalti Org/Logistik normal, tapi setiap luka langsung mengurangi massa hidup permanen.' },
    zombie_unit:             { name: 'Gerombolan Zombi', desc: 'Hanya menyerang di jarak <= 1, kebal moral, dan sebagian korban bisa bangkit lagi kecuali dihancurkan senjata berat.' }
  };

  const ID_CMD_TRAITS = {
    tank_leader:          { name: 'Panglima Lapis Baja', desc: 'Memberi bonus serangan dan ketangguhan ekstra untuk seluruh formasi Tank dan Ranpur.' },
    infantry_leader:      { name: 'Komandan Infanteri', desc: 'Meningkatkan daya gempur dan pertahanan seluruh batalyon Infanteri.' },
    artillery_leader:     { name: 'Ahli Artileri', desc: 'Mempertajam daya hancur salvo dan tembakan seluruh baterai Artileri.' },
    organizer:            { name: 'Ahli Organisasi', desc: 'Mempercepat pemulihan Organisasi dan membantu unit yang mundur agar lebih cepat berkonsolidasi.' },
    skilled_staff:        { name: 'Staf Komando Cakap', desc: 'Meningkatkan skor Pengintaian (Vigilance) dan koordinasi tempur lintas satuan.' },
    logistics_wizard:     { name: 'Ahli Logistik', desc: 'Memperbesar kapasitas Depot Teater dan menghemat konsumsi pasokan pasukan.' },
    urban_assault_ldr:    { name: 'Pakar Perang Kota', desc: 'Bonus serangan dan pertahanan khusus saat bertempur di sektor Perkotaan.' },
    rally_master:         { name: 'Pengobar Semangat', desc: 'Menaikkan peluang keberhasilan Rally Check agar pasukan yang pecah segera kembali ke garis depan.' },
    iron_disciplinarian:  { name: 'Disiplin Baja', desc: 'Menahan jatuhnya moral pasukan di bawah gempuran berat dan memperkecil kerugian saat mundur.' },
    rearguard_specialist: { name: 'Spesialis Pengawal Belakang', desc: 'Melindungi penarikan mundur agar lebih banyak personel dan ranpur selamat dari pengejaran musuh.' }
  };

  const ID_TACTICS = {
    atk_attack:                { name: 'Serangan Standar', desc: 'Gerak maju terkoordinasi dengan tembakan pelindung yang seimbang.' },
    atk_assault:               { name: 'Serbuan Frontal', desc: 'Dorongan agresif jarak dekat langsung ke garis parit musuh.' },
    atk_encirclement:          { name: 'Pengepungan', desc: 'Mengunci bagian tengah sambil menyapu sayap untuk memotong jalur mundur lawan.' },
    atk_shock:                 { name: 'Serangan Kejut', desc: 'Tembakan beruntun berintensitas tinggi untuk meruntuhkan moral dan Org musuh.' },
    atk_breakthrough:          { name: 'Terobosan Baja', desc: 'Memusatkan tank dan penetrasi tinggi (+3 Piercing) di satu titik lemah musuh.' },
    atk_blitz:                 { name: 'Serangan Kilat (Blitz)', desc: 'Tempo super cepat yang memutus jaringan komando dan memblokir pemulihan Org lawan.' },
    atk_mass_charge:           { name: 'Serbuan Massal', desc: 'Gelombang pasukan besar-besaran dengan risiko korban tinggi tapi tekanan moral masif.' },
    atk_infiltration:          { name: 'Serbuan Infiltrasi', desc: 'Tim kecil menyusup lewat celah pertahanan untuk menghantam titik belakang lawan.' },
    atk_well_planned:          { name: 'Serangan Terencana', desc: 'Serangan penuh persiapan dengan pengintaian matang dan efisiensi serangan tinggi.' },
    atk_relentless:            { name: 'Gempuran Tanpa Henti', desc: 'Tekanan terus-menerus yang memacu semangat pasukan saat berhasil mencetak pukulan.' },
    atk_unexpected_thrust:     { name: 'Tusukan Mendadak', desc: 'Manuver tak terduga dengan bonus Pengintaian tinggi untuk mengecoh pertahanan lawan.' },
    def_defend:                { name: 'Bertahan Standar', desc: 'Memegang parit secara disiplin sambil membalas tembakan penyerang.' },
    def_counterattack:         { name: 'Serangan Balik', desc: 'Menghantam balik penyerang tepat saat formasi mereka mulai terbuka.' },
    def_delay:                 { name: 'Taktik Mengulur Waktu', desc: 'Menahan laju musuh sambil menghemat korban dan menjaga garis mundur.' },
    def_tactical_withdrawal:   { name: 'Mundur Taktis', desc: 'Penarikan mundur teratur untuk menyelamatkan pasukan dan merapikan barisan.' },
    def_ambush:                { name: 'Penyergapan', desc: 'Menunggu di tempat tersembunyi lalu menghajar penyerang yang lengah dari jarak dekat.' },
    def_backhand_blow:         { name: 'Pukulan Balik Cepat', desc: 'Membiarkan musuh maju lalu memukul telak sayapnya dengan serangan balik tajam.' },
    def_guerrilla:             { name: 'Taktik Gerilya', desc: 'Pukul-lari yang bikin musuh frustrasi, memperlambat tempo, dan menguras logistik lawan.' },
    urb_atk_street_fighting:   { name: 'Perang Jalanan (Kota)', desc: 'Pertempuran blok demi blok di jalanan kota.' },
    urb_atk_barrage:           { name: 'Rentetan Blok Kota (Kota)', desc: 'Menghujani gedung musuh dengan peluru ledak sebelum infanteri masuk.' },
    urb_atk_armour_supported:  { name: 'Serbuan Kota Berlapis Baja (Kota)', desc: 'Kerja sama erat infanteri dan tank untuk meruntuhkan kubu gedung.' },
    urb_atk_mouse_holing:      { name: 'Terobos Dinding / Mouse-Holing (Kota)', desc: 'Meledakkan tembok antar-bangunan agar infanteri maju tanpa lewat jalanan terbuka.' },
    urb_def_city:              { name: 'Pertahanan Kota (Kota)', desc: 'Memanfaatkan puing dan bangunan bertingkat sebagai benteng alami.' },
    urb_def_fortified:         { name: 'Pertahanan Kubu Kuat (Kota)', desc: 'Barikade berlapis dan posisi tembak silang yang sangat sulit ditembus.' },
    urb_def_ambush:            { name: 'Penyergapan Kota (Kota)', desc: 'Menjebak kolom musuh di gang sempit dan menghantam dari jendela atas.' }
  };

  // --------------------------------------------------------------------------
  // 2. Exact UI Dictionary (Casual, Natural Military Indonesian)
  // --------------------------------------------------------------------------
  const EXACT_MAP = {
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
    'FM Manual': 'Buku Saku',

    // Theatre Command & Environment Bar
    'THEATRE //': 'TEATER //',
    '▲ COLLAPSE': '▲ LIPAT',
    '▼ EXPAND': '▼ BUKA',
    'Base terrain': 'Medan Dasar',
    'Base Terrain': 'Medan Dasar',
    'Terrain feature': 'Fitur Medan',
    'Terrain Feature': 'Fitur Medan',
    'Weather': 'Cuaca',
    'DYN': 'DINAMIS',
    'Theatre role': 'Peran Teater',
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
    'Adjust Supply / Org / Dist directly on unit cards or deploy mid-battle reinforcements.': 'Atur Logistik / Org / Jarak langsung di kartu unit atau turunkan bala bantuan, Ndan.',

    // Battlefield Flanks & Commander Boxes
    'INITIATIVE': 'INISIATIF',
    'REACTING': 'BEREAKSI',
    'COMMANDING OFFICER': 'KOMANDAN PASUKAN',
    'Tactic selection': 'Pilihan Taktik',
    'Tactic Selection': 'Pilihan Taktik',
    '+ DEPLOY': '+ KERAHKAN',
    'COMPACT': 'RINGKAS',
    'FULL': 'PENUH',
    'Formations': 'Formasi',
    'Eff. strength / AFV': 'Kekuatan / Ranpur',
    'Losses (KIA+WIA)': 'Korban (Gugur+Luka)',
    'UNARMORED // FOOT ELEMENT': 'NON-BAJA // INFANTERI KAKI',
    'EXPERIENCE TIER': 'PENGALAMAN',
    'BASE RECOVERY': 'PEMULIHAN DASAR',
    'TRAITS & SUPPORT': 'SIFAT & DUKUNGAN',
    'NONE': 'TIDAK ADA',

    // Center Command Console & 2D Tactical Sector
    'OPERATIONAL STATUS': 'STATUS OPERASIONAL',
    'INITIATIVE VECTOR': 'ARAH INISIATIF',
    '▶ EXECUTE ROUND': '▶ JALANKAN RONDE',
    'AUTO-OPS': 'OTOMATIS',
    'PAUSE OPS': 'JEDA OPS',
    'GM LIVE': 'MODE GM',
    'GM LIVE: ON': 'MODE GM: AKTIF',
    'AAR REPORT': 'LAPORAN AAR',
    'RESET': 'ULANG',
    'CLEAR': 'KOSONGKAN',
    'PARITY': 'SEIMBANG',
    'SCENARIOS:': 'SKENARIO:',
    '2D TACTICAL SECTOR': 'SEKTOR TAKTIS 2D',
    'Y-AXIS CONTACT (0)': 'GARIS KONTAK (0)',
    'CONTACT LINE (0)': 'GARIS KONTAK (0)',
    'SITREP // COMBAT LOG': 'SITREP // LOG PERTEMPURAN',
    'ALL CHANNELS': 'SEMUA KANAL',
    'RECON & CLASH': 'INTAI & BENTROK',
    'INITIATIVE / TACTICS': 'INISIATIF / TAKTIK',
    'CASUALTIES / ORG': 'KORBAN / ORG',
    'ARMOR / AP': 'BAJA / AP',
    'LOGISTICS / FS': 'LOGISTIK / DUKTEM',
    'SYS ERRORS': 'GALAT SISTEM',
    'ARMOR': 'RANPUR/BAJA',
    'SUPPORT': 'DUKUNGAN',
    'EXPAND': 'PERBESAR',
    'COPY': 'SALIN',
    'CLR': 'HAPUS',
    'COPY ALL': 'SALIN SEMUA',
    'CLOSE [X]': 'TUTUP [X]',

    // Tab 2: ORBAT
    'Create / Edit Unit Template': 'Buat / Sunting Templat Unit',
    '+ New Blank': '+ Kosong Baru',
    '01 // IDENTITY & CLASSIFICATION': '01 // IDENTITAS & KLASIFIKASI',
    'Unit Name': 'Nama Unit',
    'Unit Category (Combat Die)': 'Kategori Unit (Dadu Tempur)',
    'Armor Class (Hard/Soft Split)': 'Kelas Lapis Baja (Keras/Lunak)',
    'Experience Tier': 'Tingkat Pengalaman',
    '02 // OFFENSE & PENETRATION': '02 // SERANGAN & PENETRASI',
    'Soft Attack': 'Serangan Lunak (Soft)',
    'Hard Attack': 'Serangan Baja (Hard)',
    'Piercing': 'Penetrasi (Piercing)',
    '03 // DEFENSE & ARMOR': '03 // PERTAHANAN & LAPIS BAJA',
    'Defense Stat': 'Pertahanan',
    'Hardness': 'Ketebalan Baja (Hardness)',
    'Combat-Ready Armor Vehicles': 'Jumlah Ranpur Siap Tempur',
    '04 // STRENGTH, LOGISTICS & RECOVERY': '04 // KEKUATAN, LOGISTIK & PEMULIHAN',
    'Total Personnel (HP)': 'Total Personel (HP)',
    'Max Organization (HP)': 'Organisasi Maks (ORG)',
    'Max Supply Stat': 'Logistik Maks (SUP)',
    'Base Recovery (%)': 'Pemulihan Dasar (%)',
    'Assigned Unit Traits & Support Modules': 'Sifat Unit & Modul Dukungan',
    'SAVE TEMPLATE': 'SIMPAN TEMPLAT',
    '+ Side A': '+ Pihak A',
    '+ Side B': '+ Pihak B',
    'Unit Templates Library': 'Pustaka Templat Unit',
    'Includes all standard sample templates plus your custom saved units.': 'Berisi semua templat bawaan plus unit rakitan Komandan sendiri.',
    'Restore Sample Templates': 'Pulihkan Templat Bawaan',
    'ALL': 'SEMUA',
    'INFANTRY': 'INFANTERI',
    'ARTILLERY': 'ARTILERI',

    // Tab 3: Traits
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
    'Traits & Support Modules Directory': 'Daftar Sifat & Modul Dukungan',
    'Click any trait to edit its numerical values.': 'Klik sifat mana saja untuk mengubah angkanya.',
    'COMBAT': 'TEMPUR',
    'SPECIAL': 'KHUSUS',

    // Tab 4: Command HQ
    'Add / Edit Commander': 'Tambah / Sunting Komandan',
    '+ New General': '+ Jenderal Baru',
    'Name & Rank': 'Nama & Pangkat',
    'Tactical Doctrine Personality': 'Gaya Doktrin Taktis',
    'Commander Attributes (+2.5% per Level)': 'Atribut Komandan (+2,5% per Level)',
    'Assigned Commander Traits': 'Sifat Komandan Terpasang',
    '+ Create New Trait': '+ Buat Sifat Baru',
    'SAVE COMMANDER': 'SIMPAN KOMANDAN',
    'Active Commanders Roster': 'Daftar Komandan Aktif',
    'Assign generals to Side A or Side B on the Battlefield tab.': 'Pasang jenderal ke Pihak A atau Pihak B di tab Medan Tempur.',
    'Restore Defaults': 'Pulihkan Bawaan',
    'Create / Edit Commander Trait': 'Buat / Sunting Sifat Komandan',
    'Cancel': 'Batal',
    'SAVE COMMANDER TRAIT': 'SIMPAN SIFAT KOMANDAN',

    // Tab 5: Terrain
    'Customize Base Terrain': 'Sunting Medan Dasar',
    'Select Terrain to Edit': 'Pilih Medan untuk Disunting',
    'SAVE TERRAIN': 'SIMPAN MEDAN',
    'Base Terrains Matrix': 'Matriks Medan Dasar',
    'Features Matrix': 'Matriks Fitur Medan',
    'Weather Matrix': 'Matriks Cuaca',
    'Time-of-Day Cycle': 'Siklus Waktu Harian',
    'Compound Hazards (Terrain × Weather)': 'Bahaya Gabungan (Medan × Cuaca)',

    // AAR Statuses & Modals
    'OPERATIONAL': 'SIAP TEMPUR',
    'DISMOUNTED (OP)': 'TURUN KENDARAAN (AKTIF)',
    'REAR RALLY': 'KONSOLIDASI BELAKANG',
    'WITHDRAWN (0 AFV)': 'MUNDUR (0 RANPUR)',
    'WITHDRAWN (UNSCREENED)': 'MUNDUR (TANPA PENGAWAL)',
    'ROUTED': 'KOCAR-KACIR',
    'DISPERSED': 'TERCERAI-BERAI',
    'SHATTERED': 'HANCUR MORAL',
    'WIPED OUT': 'GUGUR SEMUA',
    'OUT OF ACTION': 'NONAKTIF',
    'HEROIC VICTORY': 'KEMENANGAN HEROIK',
    'DECISIVE VICTORY': 'KEMENANGAN TELAK',
    'CLOSE VICTORY': 'KEMENANGAN TIPIS',
    'PYRRHIC VICTORY': 'KEMENANGAN MAHAL',
    'MUTUAL EXHAUSTION (DRAW)': 'KELELAHAN BERSAMA (SERI)',
    'CAPTURED & IMPRESSED:': 'DIRAMPAS & DIPAKAI LAGI:',
    'STRIPPED FOR DEPOT:': 'DILUCUTI UNTUK DEPOT:',
    'SCUTTLED / WRITE-OFF:': 'DIHANCURKAN / RUSAK TOTAL:',

    // Welcome Briefing & Modals
    'INITIAL ORIENTATION BRIEFING': 'LAPORAN ORIENTASI AWAL',
    'READ FIRST': 'BACA DULU, NDAN',
    "DRILL SERGEANT'S RECOMMENDATION:": 'SARAN DARI AJUDAN LAPANGAN:',
    "Don't show this briefing on next visit": 'Jangan tampilkan lagi pas masuk berikutnya',
    'PROCEED TO BATTLEFIELD': 'LANGSUNG KE MEDAN TEMPUR',
    'START UI TOUR': 'MULAI TUR UI',
    'READ THE FIELD MANUAL': 'BACA BUKU SAKU',
    'SITREP // EXPANDED COMBAT LOG': 'SITREP // LOG PERTEMPURAN LENGKAP',
    'OPERATION CONCLUDED': 'OPERASI SELESAI',
    'DOWNLOAD OFFICIAL AAR (PDF)': 'UNDUH AAR RESMI (PDF)',
    'RESET OPERATION': 'ULANG OPERASI',
    'CLOSE': 'TUTUP',

    // Interactive UI Tutorial Controls & Steps (Casual Subordinate Tone)
    'SKIP TOUR': 'LEWATI TUR',
    '◄ BACK': '◄ BALIK',
    'NEXT ►': 'LANJUT ►',
    'FINISH ✓': 'SIAP, SELESAI ✓',
    'Theatre Command & Environment Ticker': 'Pita Teater & Cuaca, Ndan!',
    'This top ticker displays the live 24-hour operational clock, terrain, and weather at a glance while staying compact above the fold. Click ▼ EXPAND anytime to change Terrain, Features, Climate-Aware Dynamic Weather, Round Length, or set any historical/fictional year from -270000 BCE to +270000.': 'Lapor Komandan! Pita atas ini langsung nunjukkin jam 24 jam, medan, sama cuaca biar layar nggak kepenuhan. Klik ▼ BUKA kapan saja kalau Ndan mau ganti Medan, Cuaca Dinamis, Durasi Ronde, atau atur tahun fiksi dari -270000 SM sampai +270000.',
    'TIP: Morning Fog and Night automatically clamp visibility range and slash Close Air Support efficiency.': 'CATATAN, NDAN: Kabut Pagi sama Malam otomatis ngebatasin jarak pandang dan bikin pesawat CAS susah terbang.',

    'Faction Plates, Brass Commanders & Tactics': 'Pelat Faksi, Komandan & Taktik',
    'Each flank has a clickable steel faction nameplate (type any custom faction name), an engraved brass Commander nameplate dropdown with 10-tier Officer Rank Insignia, and a Tactic selector. Commanders grant +2.5% army-wide per ATK/DEF/CMD/LOG level plus unique traits.': 'Di kiri-kanan ini ada pelat nama faksi yang bisa diklik buat diganti namanya, Kumendan. Di bawahnya ada pelat kuningan Komandan lengkap sama lencana pangkat 10 tingkat plus pilihan Taktik. Tiap level ATK/DEF/CMD/LOG ngasih +2,5% bonus ke seluruh pasukan!',
    'TIP: Leave Tactic on Auto-AI to let the general pick doctrines matching their personality, or override manually each round.': 'CATATAN, NDAN: Biarin aja di Auto-AI kalau mau jenderal milih doktrin sendiri, atau Ndan bisa atur manual tiap ronde.',

    'Force Strength & Shared Supply Depot': 'Kekuatan Pasukan & Depot Logistik',
    'Track active formations, effective personnel, combat-ready AFVs, and total KIA+WIA losses here. Below sits your shared Theatre Supply Depot — frontline units draw refills from it every round, and running dry cripples combat stats.': 'Di kotak ini kelihatan jumlah unit aktif, personel siap tembak, ranpur, sama total korban gugur+luka, Ndan. Di bawahnya ada Depot Logistik barengan — kalau sampai kering, anak buah di depan bakal kehabisan peluru!',
    'TIP: Watch the depot bar! Below 30% it turns amber, and at 0% your divisions cannot resupply.': 'CATATAN, NDAN: Pantau terus bilah depotnya! Kalau udah di bawah 30% warnanya kuning, dan pas 0% kita nggak bisa isi peluru lagi.',

    'Deploying Units & Compact Card Mode': 'Kerahin Unit & Mode Kartu Ringkas',
    'Pick any unit template from the dropdown and click + DEPLOY to reinforce a flank. Use the COMPACT / FULL toggle right next to it to shrink unit cards down to Name, DIST, and the 4 core stat bars (PERS, ORG, SUP, AFV) when commanding large divisions.': 'Pilih templat unit lalu klik + KERAHKAN buat nurunin pasukan baru, Komandan. Kalau pasukannya banyak banget, klik tombol RINGKAS / PENUH di sebelahnya biar kartunya ramping — cuma nampilin Nama, JARAK, sama 4 bilah utama.',
    'TIP: In Compact mode, hovering any unit card automatically surfaces all hidden details (TV, Dig-In, KIA/WIA, Class, AFV Recov/KO) inside the floating tooltip.': 'CATATAN, NDAN: Pas mode Ringkas aktif, arahkan aja kursor ke kartu unit — semua info yang disembunyiin (TV, Parit, KIA/WIA, Ranpur) langsung muncul di tooltip melayang!',

    'Unit Dossier Cards & Status Accents': 'Kartu Batalyon & Garis Status',
    'Every battalion card has a 3px left-edge status bar: solid Blue/Red when combat-effective, muted Amber when ORG or SUP drops below 30%, and a diagonal hatch overlay when routed or out of action. Hover a card for deep combat stats and to light up its counter on the map.': 'Lihat garis tipis 3px di kiri tiap kartu, Ndan: Biru/Merah solid artinya anak buah siap tempur, Kuning artinya ORG atau logistik udah kritis (<30%), dan arsiran diagonal artinya lagi mundur atau nonaktif. Arahkan kursor ke kartu biar simbolnya di peta ikut nyala!',
    'TIP: Battles are won by breaking enemy Organization (blue bar) and Supply (yellow bar), not killing every last soldier.': 'CATATAN, NDAN: Menang perang itu kuncinya bikin Organisasi (bilah biru) dan Logistik (bilah kuning) musuh ambruk, nggak perlu habisin 100% orangnya.',

    'Sticky Operational Status & Turn Controls': 'Konsol Komando Menempel & Tombol Ronde',
    'This center console stays pinned as you scroll down through flanks. Hit ▶ EXECUTE ROUND to advance one turn, AUTO-OPS to run continuously, GM LIVE for 1-round Undo and live edits, or click ▲ to collapse it into a razor-thin sticky bar showing only Execute, Auto-Ops, and the Force Ratio gauge.': 'Konsol tengah ini bakal terus ngikutin pas Komandan gulir ke bawah! Pencet ▶ JALANKAN RONDE buat maju satu giliran, OTOMATIS biar jalan terus, MODE GM buat batalin 1 ronde, atau klik ▲ buat ngelipet jadi pita tipis biar makin lega.',
    'TIP: Quick-load Arracourt (1944) or San Marino (1944) anytime from the Scenarios buttons inside this panel.': 'CATATAN, NDAN: Mau coba skenario Arracourt (1944) atau San Marino (1944)? Tinggal klik tombol Skenario di sini.',

    '2D Tactical Sector & Two-Way Map Linking': 'Peta Taktis 2D & Klik Langsung ke Kartu',
    'Watch formations advance toward CONTACT LINE (0) in real time. Infantry and standard Armored Vehicles engage at Distance <= 2, Tanks and Tank Destroyers at <= 3, and Artillery up to <= 6. Click any NATO counter on the map to scroll straight to its unit card and flash it in amber.': 'Di peta ini kelihatan posisi semua batalyon menuju GARIS KONTAK (0), Kumendan. Infanteri/Ranpur nembak di Jarak <= 2, Tank & Penghancur Tank di <= 3, Artileri sampai <= 6. Klik simbol NATO mana aja di peta buat langsung lompat ke kartu unitnya!',
    'TIP: Hover the Y-Axis triangles right below the map to inspect stacked units at any distance coordinate.': 'CATATAN, NDAN: Arahkan kursor ke segitiga Sumbu-Y di bawah peta buat ngintip unit yang numpuk di satu koordinat.',

    'SITREP Operational Logbook (Form DA-1594)': 'Buku Log SITREP (Form DA-1594)',
    'Every vigilance roll, fire-support volley, armor penetration check, field repair, and rout is recorded here in real time. Filter by category (Damage, Armor, Support, Rolls), click EXPAND for a full-screen searchable logbook, or COPY to paste into your TTRPG notes.': 'Semua kejadian di lapangan — intai, tembakan artileri, peluru mantul, montir benerin tank, sampai pasukan mundur — dicatat di sini, Ndan. Bisa disaring, diperbesar lewat PERBESAR, atau di-SALIN buat catatan TTRPG.',
    'TIP: Click anywhere outside any pop-up modal — or press Esc — to close it instantly.': 'CATATAN, NDAN: Kalau mau nutup pop-up apa aja, tinggal klik di luar kotaknya atau pencet Esc.',

    '7-Slot Command Navigation Dock': 'Bilah Navigasi 7 Ruang Kerja',
    'Switch across all 7 workspaces from this dock: Battlefield, ORBAT (custom unit designer), Traits, Command HQ (custom generals), Terrain (color-coded modifier matrix), Doctrines (25-page tactic manual), and FM Manual (Drill Sergeant & Technical manuals).': 'Dari atas sini Komandan bisa pindah-pindah ke 7 tab: Medan Tempur, ORBAT (bikin unit), Sifat & Modul, Markas Komando (bikin jenderal), Medan & Cuaca, Doktrin Taktik, sama Buku Saku.',
    'TIP: Every custom unit, trait, general, and terrain auto-saves in your browser.': 'CATATAN, NDAN: Semua unit, sifat, jenderal, dan medan bikinan Ndan otomatis kesimpen di browser.',

    'Switch Language (EN / ID)': 'Ganti Bahasa (EN / ID), Ndan!',
    'Click the EN / ID button in the top-right header anytime to switch the entire interface, combat logs, unit traits, Field Manuals, and printable After-Action Report between English (Form DA-774) and Bahasa Indonesia (TNI AD format).': 'Klik tombol EN / ID di pojok kanan atas kapan saja, Komandan, buat ganti seluruh tampilan, log tempur, sifat unit, Buku Saku Ajudan, sampai Laporan Akhir versi TNI AD (LPT) antara Bahasa Inggris dan Bahasa Indonesia!',
    'TIP: Your language choice is automatically saved in your browser for future sessions.': 'CATATAN, NDAN: Pilihan bahasa Komandan otomatis kesimpen di browser buat sesi berikutnya.',

    'Form DA-774 After-Action Report & JSON Backup': 'Laporan AAR Form DA-774 & Cadangan JSON',
    'Click AAR anytime for an interim SITREP or post-battle debrief complete with per-unit kills, depot logistics, weather trail, and printable A4 Form DA-774 PDF export. Use EXPORT / IMPORT JSON next to it to save or share your custom armies, and click UI TOUR anytime to replay this guide.': 'Klik AAR kapan aja buat lihat laporan lengkap — termasuk korban per unit, sisa depot, riwayat cuaca, sampai ekspor PDF A4 Form DA-774! Di sebelahnya ada EKSPOR / IMPOR JSON buat simpan pasukan, dan TUR UI kalau mau ulang panduan ini.',
    'DISMISSED, COMMANDER — hit ▶ EXECUTE ROUND to kick off the Battle of Arracourt!': 'SIAP, KOMANDAN! Tinggal pencet ▶ JALANKAN RONDE buat mulai Pertempuran Arracourt!'
  };

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

  const PLACEHOLDER_MAP = {
    'Search traits...': 'Cari sifat...',
    'Filter units...': 'Saring unit...',
    'Filter traits...': 'Saring sifat...',
    'Filter generals...': 'Saring jenderal...',
    'Search log entries...': 'Cari catatan log...',
    'Search general...': 'Cari jenderal...',
    'Search unit template...': 'Cari templat unit...',
    'e.g. 1st Panzer Grenadiers': 'cth. Batalyon Infanteri 1',
    'e.g. Field Marshal Zhukov': 'cth. Jenderal Sudirman',
    'e.g. Master of Armored Maneuver': 'cth. Ahli Manuver Lapis Baja'
  };

  // --------------------------------------------------------------------------
  // 3. Natural Indonesian Manuals (Subordinate Soldier -> "Komandan / Kumendan / Ndan")
  // --------------------------------------------------------------------------
  function renderIndonesianManuals() {
    const container = document.getElementById('view-guide');
    if (!container) return;
    const isTech = document.getElementById('guide-tab-tech')?.classList.contains('is-active');
    const isCode = document.getElementById('guide-tab-code')?.classList.contains('is-active');
    const isBoot = !isTech && !isCode;

    container.innerHTML = `
      <div class="manila-folder-shell max-w-[1060px] mx-auto">
        <div class="manila-tabs-bar" role="tablist" aria-label="Tab Buku Manual">
          <button type="button" id="guide-tab-boot" role="tab" aria-selected="${isBoot ? 'true' : 'false'}" onclick="switchGuidePage('boot')" class="manila-folder-tab ${isBoot ? 'is-active' : ''}">
            <span class="manila-tab-code">TAB A // FM 100-5-BOOT</span>
            <span class="manila-tab-label">BUKU SAKU AJUDAN</span>
          </button>
          <button type="button" id="guide-tab-tech" role="tab" aria-selected="${isTech ? 'true' : 'false'}" onclick="switchGuidePage('tech')" class="manila-folder-tab ${isTech ? 'is-active' : ''}">
            <span class="manila-tab-code">TAB B // TM 9-1005-TECH</span>
            <span class="manila-tab-label">MANUAL TEKNIS</span>
          </button>
          <button type="button" id="guide-tab-code" role="tab" aria-selected="${isCode ? 'true' : 'false'}" onclick="switchGuidePage('code')" class="manila-folder-tab ${isCode ? 'is-active' : ''}">
            <span class="manila-tab-code">TAB C // DEV-DOC-ARCH</span>
            <span class="manila-tab-label">DOKUMENTASI KODE</span>
          </button>
        </div>

        <div class="manila-folder-body">
          <!-- ==================== TAB A: BUKU SAKU AJUDAN (BAWAHAN -> KOMANDAN) ==================== -->
          <div id="guide-pane-boot" class="${isBoot ? '' : 'hidden'}">
            <article class="tradoc-doc" aria-label="Buku Saku Lapangan Iron Division Versi Ajudan">
              <div class="tradoc-class-strip">
                <span>TERBUKA // CATATAN LAPANGAN UNTUK KOMANDAN &amp; GAME MASTER</span>
                <span>DOKUMEN // FM 100-5-BOOT (EDISI AJUDAN)</span>
              </div>

              <header class="tradoc-header">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div class="tradoc-mono text-[11px] font-bold uppercase tracking-widest text-[#3a4738]">
                      STAF LAPANGAN DIVISI BESI // CATATAN PRIBADI UNTUK KOMANDAN
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#141815] mt-1">
                      SIAP, NDAN! INI BUKU SAKU BIAR NGGAK SALAH PENCET
                    </h2>
                    <p class="text-sm text-[#323a33] max-w-3xl mt-1">
                      Mohon izin lapor, <strong>Komandan</strong>! Belum pernah main game strategi macam <em>Hearts of Iron</em> sebelumnya? Santai aja, Ndan — malah bagus, jadi belum ketularan kebiasaan ngawur dari game sebelah. Saya sudah rangkumin semua tombol, angka, aturan lapis baja, dan logistik di Iron Division pakai bahasa gampang, plus <strong>kenapa aturan itu ada di medan perang beneran</strong>.
                    </p>
                  </div>
                  <div class="tradoc-mono text-[11px] bg-[#dfd7c2] border border-[#b5ad98] p-3 text-right shrink-0 space-y-1 text-[#1c211d]">
                    <div><strong>NO. BUKU:</strong> FM 100-5-BOOT</div>
                    <div><strong>PENULIS:</strong> KOPKA "BESI" (AJUDAN)</div>
                    <div><strong>MESIN:</strong> IRON DIVISION v3.5</div>
                    <button type="button" onclick="openWelcomeModal(true)" class="mt-1 px-2 py-0.5 bg-[#1b221c] text-[#e0be6a] border border-[#4d4224] text-[10px] font-bold uppercase">
                      BUKA LAGI PENGARAHAN
                    </button>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-[#c9c1ab] flex flex-wrap gap-2 tradoc-mono text-[10.5px]">
                  <a href="#fm-ch1" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">01. SIMULATOR APA INI?</a>
                  <a href="#fm-ch2" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">02. TEATER &amp; CUACA</a>
                  <a href="#fm-ch3" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">03. STAT &amp; LAPIS BAJA</a>
                  <a href="#fm-ch4" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">04. ALUR 1 RONDE</a>
                  <a href="#fm-ch5" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">05. JARAK, RALLY &amp; MONTIR</a>
                  <a href="#fm-ch6" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">06. LAPORAN FORM DA-774</a>
                  <a href="#fm-ch7" class="px-2 py-1 bg-[#c8bfa8] border border-[#bfb7a1] text-[#1c211d] hover:bg-[#bdb39a] font-bold">07. RAKIT PERANG SENDIRI</a>
                </div>
              </header>

              <div class="tradoc-body space-y-6">

                <!-- BAB 1 -->
                <section id="fm-ch1" class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">BAB 01 // SEBENARNYA INI SIMULATOR APA SIH, NDAN?</h3>
                  <p class="tradoc-para">
                    <span class="tradoc-para-id">1-1.</span>
                    <strong>Mohon izin, Kumendan — ini bukan game tembak-tembakan biasa yang pakai bar darah doang.</strong> Di game arcade, prajurit sisa 1 HP masih bisa lari-larian santai. Di perang beneran, satu batalyon bubar bukan karena semua orangnya gugur, tapi karena radionya mati, pelurunya habis, dihujani artileri di lumpur, atau setengah temannya udah kena tembak dan nggak ada yang berani berdiri lagi.
                  </p>
                  <p class="tradoc-para">
                    <span class="tradoc-para-id">1-2.</span>
                    <strong>Iron Division</strong> adalah simulator tempur operasional gaya TTRPG. Bawaannya langsung siap tempur di <strong>Pertempuran Arracourt (18 September 1944, Perbukitan Lorraine)</strong> — Tentara Panzer ke-5 Jerman menyerang Divisi Lapis Baja ke-4 AS (CCA) di tengah kabut pagi (skenario <strong>San Marino</strong> juga sudah siap di tombol Skenario). Komandan tinggal atur medan, cuaca, jam, dan jenderal, lalu pencet <strong>JALANKAN RONDE</strong>. Mesin akan melempar dadu di belakang layar, menghitung penetrasi baja, mencatat setiap prajurit gugur/luka/tawanan, menulis log SITREP, dan mencetak laporan resmi <strong>Form DA-774</strong> pas pertempuran kelar.
                  </p>
                  <div class="tradoc-callout">
                    <strong>MOHON IZIN LAPOR, KOMANDAN — INI BUKAN GAME BAR DARAH:</strong> Kalau satu batalyon masih punya 600 orang, tapi pelurunya nol, radionya jebol, dan tiga baterai 155mm lagi ngirim besi panas ke helm mereka, anak buah nggak bakal salto heroik nerjang senapan mesin, Ndan — mereka bakal ngacir ke kabupaten sebelah! Fokus bikin <strong>Organisasi (ORG)</strong> dan <strong>Logistik (SUP)</strong> musuh ambruk, beres urusan!
                  </div>
                </section>

                <!-- BAB 2 -->
                <section id="fm-ch2" class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">BAB 02 // PITA TEATER, IKLIM &amp; JAM 24 JAM</h3>
                  <p class="tradoc-para">
                    <span class="tradoc-para-id">2-1.</span>
                    Coba tengok pita paling atas di tab Medan Tempur (<strong>TEATER //</strong>). Biar layar Komandan nggak penuh, pita ini otomatis dilipat jadi satu baris ringkas. Kalau mau ubah kondisi alam, tinggal klik <strong>▼ BUKA</strong>:
                  </p>

                  <table class="tradoc-table">
                    <thead>
                      <tr>
                        <th>Pengaturan</th>
                        <th>Fungsinya di Simulator</th>
                        <th>Realitanya di Lapangan, Ndan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Medan Dasar</strong></td>
                        <td>Mengatur bonus/penalti tiap jenis unit, Pengintaian, borosnya Logistik, <strong>Batas Galian Parit</strong>, dan <strong>Batas Unggul Jumlah</strong>.</td>
                        <td>Tank senang di Dataran Terbuka tapi sengsara di Pegunungan. Gang sempit kota bikin 10.000 prajurit nggak bisa nembak barengan — makanya Perkotaan membatasi bonus jumlah di +40% dan Pegunungan di +35%.</td>
                      </tr>
                      <tr>
                        <td><strong>Fitur Medan</strong></td>
                        <td>Pengali tambahan (Jalan Raya, Sungai Kecil/Besar, Pendaratan Amfibi, Bunker/Kubu).</td>
                        <td>Nyebrang sungai lebar di bawah tembakan senapan mesin itu cari mati, Ndan — kecuali bawa <strong>Marinir</strong> atau Zeni. Bunker beton melipatgandakan pertahanan dan nambah batas parit (+2).</td>
                      </tr>
                      <tr>
                        <td><strong>Cuaca Dinamis (Berbasis Iklim)</strong></td>
                        <td>Mengubah akurasi, logistik, dan <strong>Efektivitas Udara</strong>. Centang <strong>DINAMIS</strong> biar cuaca bergeser tiap 3 ronde sesuai <strong>Medan, Musim, dan Waktu</strong>.</td>
                        <td>Bukit Lorraine bulan September dapatnya kabut pagi, mendung, atau hujan — bukan badai salju atau panas gurun. Cuaca buruk memangkas serangan udara 50–60% atau bikin pesawat batal terbang.</td>
                      </tr>
                      <tr>
                        <td><strong>Tanggal Bebas Era &amp; Jam 24J</strong></td>
                        <td>Komandan bisa isi tahun apa saja dari <strong>-270000 (SM) sampai +270000</strong> (termasuk Tahun 0, tahun 44, 1944, atau 40999!), jam 24J, dan durasi ronde (Menit/Jam/Hari). Otomatis atur <strong>Fajar, Siang, Senja, Malam</strong>.</td>
                        <td>Tempur jam 02:00 malam beda jauh sama jam 12 siang, Kumendan. Gelap membutakan optik tank, memperbesar peluang penyergapan (+15), dan bikin pilot CAS susah lihat target.</td>
                      </tr>
                    </tbody>
                  </table>

                  <p class="tradoc-para mt-3">
                    <span class="tradoc-para-id">2-2.</span>
                    <strong>Bahaya Gabungan (Pas Tanah &amp; Langit Kompak Bikin Repot):</strong>
                  </p>
                  <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
                    <li><strong>LUMPUR / RASPUTITSA</strong> <em>(Hujan Deras di Dataran/Hutan/Bukit/Rawa/Jalan)</em>: Tank amblas (-1 s.d. -2 mobilitas), truk logistik nyangkut (+2 logistik), dan narik tank rusak makin susah (-15).</li>
                    <li><strong>JARAK PANDANG NIHIL</strong> <em>(Kabut di mana saja, atau Malam di Kota/Hutan/Rimba)</em>: Jarak tembak dibatasi 3–4 kotak dan pengintaian turun (-15 Vig) kalau nggak bawa Intai atau Kamuflase.</li>
                    <li><strong>BEKU EKSTREM</strong> <em>(Salju di Pegunungan/Bukit/Dataran)</em>: Prajurit luka rawan gugur kedinginan (+3% DOW), logistik boros, dan tank kurang pasokan (&lt;30%) rawan mesin beku.</li>
                    <li><strong>SENGATAN PANAS / DEBU</strong> <em>(Gelombang Panas di Gurun)</em>: Infanteri cepat haus (+2 logistik, -2 Org/ronde); debu bikin optik tank &amp; artileri kelilipan (-15 Vig).</li>
                  </ul>

                  <div class="tradoc-callout mt-3">
                    <strong>AMPUN, KUMENDAN — JANGAN PESAN BADAI SALJU DI GURUN SAHARA JAM DUA PAGI:</strong> Cuaca dinamis sekarang udah nurut sama iklim, musim, dan jam beneran, Ndan — jadi nggak bakal ada salju turun di Lorraine bulan September atau gelombang panas nongol tengah malam. Mau setel tahun ke <strong>-216 (216 SM)</strong> atau <strong>40999</strong> buat perang fiksi? Siap, gas terus Ndan — asal jangan kaget kalau pesawat tempur nggak mau terbang di kabut tebal jam 02:00 dini hari!
                  </div>
                </section>

                <!-- BAB 3 -->
                <section id="fm-ch3" class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">BAB 03 // ANGKA UNIT, LAPIS BAJA &amp; PELAT NAMA</h3>
                  <p class="tradoc-para">
                    <span class="tradoc-para-id">3-1.</span>
                    Tiap batalyon di layar punya <strong>Dog Tag</strong> baja, simbol NATO di kiri, lencana pengalaman di kanan, dan <strong>garis status 3px</strong> di tepi kiri (Biru/Merah solid = siap tempur, Kuning = ORG/SUP kritis &lt;30%, Arsiran diagonal = mundur/nonaktif). Arahkan kursor ke kartu untuk lihat statistik lengkap — bahkan di mode <strong>RINGKAS</strong>, semua detail tersembunyi langsung muncul di tooltip!
                  </p>

                  <table class="tradoc-table">
                    <thead>
                      <tr>
                        <th>Statistik</th>
                        <th>Artinya Buat Kita, Ndan</th>
                        <th>Kenapa Penting di Lapangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Personel (PERS)</strong></td>
                        <td>Prajurit yang masih berdiri pegang senjata. Dihitung presisi ke <strong>Aktif, KIA, WIA, POW, dan ESC</strong>.</td>
                        <td>Makin berkurang, daya tembak ikut turun. Yang luka (WIA) bisa gugur belakangan (DOW) mulai Ronde 4 kalau logistik habis dan nggak ada Medis.</td>
                      </tr>
                      <tr>
                        <td><strong>Organisasi (ORG)</strong></td>
                        <td>Mental, kekompakan, dan rantai komando (bilah Biru).</td>
                        <td>Begitu ORG menyentuh <strong>0</strong>, batalyon langsung pecah dan mundur — biarpun 70% prajuritnya masih sehat walafiat.</td>
                      </tr>
                      <tr>
                        <td><strong>Logistik (SUP) &amp; Depot</strong></td>
                        <td>Peluru, ransum, solar, dan suku cadang (bilah Kuning). Diisi ulang dari <strong>Depot Teater</strong> barengan.</td>
                        <td>Di bawah 50% stat turun -10%, di bawah 20% turun -20%, dan pas 0% anjlok -50% plus moral rontok tiap ronde.</td>
                      </tr>
                      <tr>
                        <td><strong>Serangan Lunak vs. Baja</strong></td>
                        <td><strong>Soft Attack</strong> buat hajar infanteri; <strong>Hard Attack</strong> buat hajar tank dan ranpur.</td>
                        <td>Senapan mesin bikin infanteri tiarap, tapi nggak bakal mempan buat baja 40 ton.</td>
                      </tr>
                      <tr>
                        <td><strong>Piercing vs. Hardness</strong></td>
                        <td><strong>Hardness</strong> = tebal baja target. <strong>Piercing</strong> = daya tembus meriam kita.</td>
                        <td>Kalau gagal menembus baja Medium/Heavy/Super (<strong>ARMOR HELD</strong>): korban personel dipotong separuh, dadu Explosive batal, dan guncangan Org baja Berat/Super dibatasi cuma <strong>-1</strong>!</td>
                      </tr>
                      <tr>
                        <td><strong>Ranpur Lumpuh &amp; Pemulihan</strong></td>
                        <td>Kendaraan kena pukul dibagi ke <strong>Bisa Diperbaiki (Rec)</strong> dan <strong>Hancur Total (KO)</strong> dengan batas pemulihan dinamis <strong>80 + d20%</strong>.</td>
                        <td>Nggak semua tank yang kena tembak langsung meledak — tapi dengan pembulatan probabilistik, pukulan kecil pun tetap punya peluang membakar tank secara permanen.</td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="tradoc-callout mt-3">
                    <strong>IZIN, NDAN — JANGAN NEMBAK TANK PANTHER 45 TON PAKAI SENAPAN MESIN KALIBER .30:</strong> Paling banter cuma bikin catnya lecet sama bikin komandan Jerman di dalam ketumpahan kopi, Komandan! Kalau Piercing kalah sama Hardness, aturan <strong>ARMOR HELD</strong> langsung motong korban separuh, membatalkan dadu ledak, dan bentrokan yang memantul di tekanan rendah melumpuhkan NOL tank. Panggil Penghancur Tank atau meriam kaliber besar, Ndan!
                  </div>
                </section>

                <!-- BAB 4 -->
                <section id="fm-ch4" class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">BAB 04 // APA YANG TERJADI DI DALAM SATU RONDE?</h3>
                  <p class="tradoc-para">
                    <span class="tradoc-para-id">4-1.</span>
                    Begitu Komandan pencet tombol emas <strong>▶ JALANKAN RONDE</strong> (atau <strong>OTOMATIS</strong>), mesin menjalankan 8 tahap berurutan:
                  </p>
                  <ol class="list-decimal pl-6 space-y-1.5 text-sm text-[#232a24]">
                    <li><strong>Simpan Undo, Jam &amp; Cuaca:</strong> Simpan cadangan 1 ronde (maks 15 ronde untuk Mode GM), majukan jam 24J, cek Fajar/Siang/Senja/Malam, dan putar Cuaca Dinamis tiap 3 ronde.</li>
                    <li><strong>Logistik, Gali Parit, Kelelahan &amp; Perbaikan:</strong> Unit yang <em>sudah masuk jarak tembak</em> membakar amunisi dan kena Kelelahan Tempur (Ronde 6+); unit yang <em>masih jalan mendekat</em> berhenti membakar amunisi, bebas kelelahan, dan prajurit baru (Green) nggak bocor Org-nya. Kru Perbaikan bekerja tiap 4 ronde — kecuali ronde sebelumnya unit baru kena tembak anti-baja!</li>
                    <li><strong>Pemilihan Taktik:</strong> Tiap pihak memilih salah satu dari 25 doktrin tempur (otomatis oleh AI Komandan atau dipilih manual oleh Komandan).</li>
                    <li><strong>Pengintaian (Vigilance):</strong> Kedua pihak melempar <code>1d100 + Pengubah</code>. Pemenangnya dapat bonus akurasi karena melihat lawan lebih dulu.</li>
                    <li><strong>Salvo Dukungan Tembakan:</strong> Mortir, Artileri Berat, dan Serangan Udara menghajar duluan. Meriam Hanud menghadang pesawat lawan.</li>
                    <li><strong>Manuver &amp; Jarak Kontak:</strong> Unit yang belum sampai jarak tembak maju di <strong>Sumbu-Y (-7 s.d. +7)</strong>. Pihak bertahan yang sudah dalam jarak menembakkan <strong>Tembakan Penghadang (Overwatch)</strong>!</li>
                    <li><strong>Baku Tembak Utama &amp; Balasan:</strong> Garda Depan melindungi artileri, penetrasi baja dicek, perampas logistik hanya bekerja di jarak dekat (<code>&lt;= 2</code>, non-artileri), korban dibagi KIA/WIA, dan musuh yang selamat membalas tembakan.</li>
                    <li><strong>Kemenangan, Pengejaran &amp; Salvase:</strong> Begitu garis depan satu pihak habis (atau cuma tersisa artileri tanpa pengawal yang otomatis mundur), pemenang mengejar untuk menawan POW, traktor menarik tank rusak pulang, dan pemenang menyortir ranpur musuh yang ditinggal lalu mencetak <strong>Form DA-774</strong>.</li>
                  </ol>

                  <div class="tradoc-callout mt-3">
                    <strong>SIAP, NDAN — BATERAI ARTILERI NGGAK BISA TELEPORTASI 6 KILOMETER BUAT NYOLONG RANSUM MUSUH:</strong> Merampas logistik sekarang cuma bisa dilakukan pasukan tembak langsung di jarak dekat (<code>Jarak &lt;= 2</code>, bukan artileri)! Begitu juga montir kita, Kumendan: <strong>Kru Perbaikan Lapangan</strong> kerjanya tiap 4 ronde (1–2 ranpur, maks 3 dengan Desain Sederhana) dan langsung tiarap kalau ronde kemarin tank baru kena tembak. Mana ada montir nekat ngelas transmisi Sherman pas peluru 88mm lagi lewat di atas kuping!
                  </div>
                </section>

                <!-- BAB 5 -->
                <section id="fm-ch5" class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">BAB 05 // JARAK TEMBAK, RALLY, TURUN KENDARAAN &amp; KOMANDO</h3>
                  <p class="tradoc-para">
                    <span class="tradoc-para-id">5-1.</span>
                    <strong>Jarak Sumbu-Y &amp; Peta Taktis 2D:</strong> Lihat peta <strong>SEKTOR TAKTIS 2D</strong> di tengah. Pihak A di kiri, Pihak B di kanan, dan <strong>GARIS KONTAK (0)</strong> di tengah. Klik simbol NATO mana pun di peta untuk langsung melompat ke kartu unitnya!
                  </p>
                  <div class="tradoc-callout">
                    <strong>MOHON IZIN LAPOR, NDAN:</strong> Anak buah nggak bisa nembak pakai senapan M4 lurus dua kilometer terus berharap kena sasaran — kalau sampai ada prajurit yang berhasil, biar saya hormat sambil salto di depan markas, Kumendan! Makanya <strong>Infanteri &amp; Ranpur biasa harus maju sampai Jarak &lt;= 2</strong>, <strong>Tank &amp; Penghancur Tank (TD) menembak di Jarak &lt;= 3</strong>, dan <strong>Artileri menghajar dari belakang sampai Jarak &lt;= 6</strong>. Kalau Kabut atau Malam mengaktifkan <strong>VIS CAP</strong>, tank juga wajib merayap lebih dekat!
                  </div>

                  <p class="tradoc-para">
                    <span class="tradoc-para-id">5-2.</span>
                    <strong>Mundur, Konsolidasi &amp; Lantai Org Rally:</strong> Unit yang Org-nya 0 bakal mundur ke belakang, menyelaraskan catatan korban lamanya biar nggak kena syok ganda, isi ulang dari Depot, lalu melempar <strong>Rally Check</strong> untuk balik ke garis depan dengan minimal <strong>18 Org atau 35% Org Maks</strong>. Kalau pecah kedua kalinya, baru benar-benar keluar dari pertempuran.
                  </p>

                  <p class="tradoc-para">
                    <span class="tradoc-para-id">5-3.</span>
                    <strong>Turun Kendaraan (Dismount) vs. Mundur ke Depot:</strong>
                  </p>
                  <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
                    <li><strong>Infanteri Mekanis &amp; Intai (<code>armored_vehicle</code> non-<code>anti_tank</code>):</strong> Saat semua kendaraan hancur (<strong>0 ranpur aktif</strong>) selama Org <strong>&gt;= 20%</strong> dan personel <strong>&gt;= 50%</strong>, prajurit <strong>turun ke tanah dan terus bertempur sebagai infanteri</strong> (jika di bawah batas itu, kru yang selamat mundur untuk rally tanpa kendaraan).</li>
                    <li><strong>Tank, Artileri Swagerak &amp; Penghancur Tank:</strong> Kalau kendaraan siap tempur habis (0), kru <strong>mundur ke depot</strong> untuk perbaikan/penggantian (<code>MUNDUR (0 RANPUR)</code>).</li>
                    <li><strong>Artileri Tanpa Pengawal:</strong> Kalau semua pasukan garis depan gugur/mundur dan tinggal artileri sendirian, baterai meriam otomatis berkemas dan mundur (<code>MUNDUR (TANPA PENGAWAL)</code>).</li>
                  </ul>

                  <div class="tradoc-callout mt-3">
                    <strong>KRU TANK TANPA TANK ITU BUKAN BATALYON INFANTERI, KUMENDAN:</strong> Infanteri halftrack memang bisa lompat turun terus bertahan di parit pakai senapan, tapi kalau Batalyon Tank 37 atau Penghancur Tank 704 kehabisan kendaraan, mereka tarik mundur ke belakang cari tank pengganti — nggak disuruh maju pasang sangkur! Jaga terus garda depan kita ya, Ndan, biar artileri di belakang nggak ikut kabur!
                  </div>
                </section>

                <!-- BAB 6 -->
                <section id="fm-ch6" class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">BAB 06 // LAPORAN PASCA-OPERASI (FORM DA-774) &amp; TELEMETRI</h3>
                  <p class="tradoc-para">
                    <span class="tradoc-para-id">6-1.</span>
                    Kapan saja Komandan klik <strong>AAR</strong> atau <strong>EKSPOR PDF (FORM DA-774)</strong>, staf menyusun laporan militer A4 resmi lengkap dengan nomor halaman <code>PAGE X OF Y</code>, nol istilah dadu/mesin, dan data tempur lengkap:
                  </p>
                  <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
                    <li><strong>Bagian 1 — Ringkasan Eksekutif &amp; Perbandingan Kekuatan:</strong> Tingkat kemenangan, riwayat perubahan cuaca (<strong>METEO</strong>), perbandingan persentase korban, rasio KIA:WIA, kerugian ranpur, dan pengeluaran <strong>Depot Logistik</strong>.</li>
                    <li><strong>Bagian 2 — Tabel ORBAT &amp; Output Tempur:</strong> Perhitungan personel pas 100% (<code>Start = Rem + KIA + WIA + POW + ESC</code>), status akhir spesifik tiap batalyon, kolom ranpur lengkap (<code>Start | Act/Rec/Tow/KO</code>), dan kolom <strong>Inflicted (Cas/AFV)</strong> untuk melihat batalyon mana yang paling ganas.</li>
                    <li><strong>Bagian 3–5 — Salvase Netral, Kronologi Seimbang &amp; Analisis G-3:</strong> Catatan salvase netral faksi, kronologi seimbang dari awal–tengah–akhir pertempuran, plus temuan G-3 otomatis (formasi terbaik, pemburu tank terbaik, porsi korban artileri/udara, dan tekanan logistik).</li>
                  </ul>

                  <div class="tradoc-callout mt-3">
                    <strong>JANGAN KASIH LAPORAN PENUH "d20[14] vs DC 12" KE MEJA JENDERAL, NDAN:</strong> Bisa-bisa satu kompi disuruh kupas kentang sampai tahun 40999 kalau laporan resminya isinya rumus dadu sama "Supply Points"! Makanya Form DA-774 otomatis membersihkan semua rumus mesin, merapikan hitungan personel sampai orang terakhir, dan langsung ngasih tahu batalyon mana yang jadi bintang lapangan.
                  </div>
                </section>

                <!-- BAB 7 -->
                <section id="fm-ch7" class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">BAB 07 // RAKIT PERANG SENDIRI (ORBAT, MARKAS, MEDAN &amp; JSON)</h3>
                  <p class="tradoc-para">
                    <span class="tradoc-para-id">7-1.</span>
                    Semua bisa Komandan utak-atik sesuka hati: klik pelat nama faksi di Medan Tempur untuk ganti nama, rakit unit baru di <strong>ORBAT</strong>, bikin sifat kustom di <strong>Sifat &amp; Modul</strong>, angkat jenderal baru di <strong>Markas Komando</strong> (lencana pangkat otomatis naik tiap 4 poin stat dari Letnan Satu sampai Jenderal Bintang 5!), atau ubah bobot medan di <strong>Medan &amp; Cuaca</strong>.
                  </p>
                  <p class="tradoc-para">
                    <span class="tradoc-para-id">7-2.</span>
                    Semua perubahan otomatis tersimpan di browser, dan Komandan bisa klik <strong>EKSPOR JSON / IMPOR JSON</strong> di pojok kanan atas buat cadangan atau dibagi ke teman-teman meja TTRPG!
                  </p>
                  <div class="tradoc-callout mt-3">
                    <strong>BOLEH BANGET, NDAN, NGADU LEGIUN ROMAWI 216 SM LAWAN MARINIR LUAR ANGKASA TAHUN 40999:</strong> Tahunnya udah bebas dari <code>-270000</code> sampai <code>+270000</code>, jadi bebas mau bikin perang era apa aja, Kumendan — asal jangan kaget kalau pasukan tombaknya lupa bawa meriam Anti-Tank! Dan jangan lupa pencet <strong>EKSPOR JSON</strong> biar pasukan racikan Ndan aman sentosa!
                  </div>
                </section>

              </div>

              <footer class="tradoc-footer">
                <span>SIAP MELAKSANAKAN PERINTAH, KOMANDAN — LANGSUNG KE MEDAN TEMPUR!</span>
                <span>FM 100-5-BOOT // STAF AJUDAN DIVISI BESI</span>
              </footer>
            </article>
          </div>

          <!-- ==================== TAB B: MANUAL TEKNIS (INDONESIA) ==================== -->
          <div id="guide-pane-tech" class="${isTech ? '' : 'hidden'}">
            <article class="tradoc-doc" aria-label="Manual Teknis Iron Division TM 9-1005-TECH">
              <div class="tradoc-class-strip">
                <span>TERBUKA // REFERENSI MESIN &amp; SPESIFIKASI MATEMATIKA</span>
                <span>DOKUMEN // TM 9-1005-TECH (REV 3.5)</span>
              </div>

              <header class="tradoc-header">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div class="tradoc-mono text-[11px] font-bold uppercase tracking-widest text-[#3a4738]">
                      REKAYASA SISTEM IRON DIVISION // MANUAL TEKNIS
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#141815] mt-1">
                      TM 9-1005-TECH: Rumus Simulasi &amp; Arsitektur
                    </h2>
                    <p class="text-sm text-[#323a33] max-w-3xl mt-1">
                      Referensi teknis rumus tempur, mitigasi penetrasi baja, gerbang bentrokan memantul, pemulihan dinamis 80+d20%, cuaca berbasis iklim, kalender bebas era, dan alur telemetri Form DA-774.
                    </p>
                  </div>
                  <div class="tradoc-mono text-[11px] bg-[#dfd7c2] border border-[#b5ad98] p-3 text-right shrink-0 space-y-0.5 text-[#1c211d]">
                    <div><strong>NO. DOK:</strong> TM 9-1005-TECH</div>
                    <div><strong>RUNTIME:</strong> VANILLA ES6 (ZERO-BUILD)</div>
                    <div><strong>SIMPAN:</strong> LOCALSTORAGE + JSON</div>
                  </div>
                </div>
              </header>

              <div class="tradoc-body space-y-5">
                <section class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">1. RESOLUSI TEMPUR, MITIGASI BAJA &amp; KNOCKOUT RANPUR</h3>
                  <table class="tradoc-table">
                    <thead><tr><th>Subsistem</th><th>Rumus / Aturan Pasti</th></tr></thead>
                    <tbody>
                      <tr><td><strong>Dadu Tempur</strong></td><td><code>Infanteri: d12</code> &middot; <code>Ranpur: d16</code> &middot; <code>Tank: d20</code> &middot; <code>Artileri: d20 (Ser) / d8 (Per)</code>.</td></tr>
                      <tr><td><strong>Pengintaian (Vigilance)</strong></td><td><code>1d100 + Medan + Fitur + Cuaca + Waktu + Taktik + Rata-Rata Sifat + Komandan</code>. Pemenang meraih bonus <code>floor(|selisih| / 10)</code>.</td></tr>
                      <tr><td><strong>ARMOR HELD (Gagal Tembus)</strong></td><td>Jika <code>Piercing &lt; Hardness</code> terhadap baja <code>Medium/Heavy/Super</code>: korban personel <strong>dibagi dua (&times;0,5)</strong>, dadu bonus <code>Explosive</code> <strong>dibatalkan</strong>, dan syok Org baja <code>Heavy/Super</code> <strong>dibatasi -1</strong>.</td></tr>
                      <tr><td><strong>Bentrokan Memantul &amp; Braket</strong></td><td>Braket knockout ranpur: <code>d3</code>, <code>1+d4</code>, <code>2+d6</code>, <code>3+d8</code> dengan <strong>Batas Armada 15%</strong> per hantaman. Pada bentrokan memantul: tekanan <code>&lt; 0,70</code> = <strong>0 knockout</strong>; <code>&gt;= 0,70</code> dibatasi maks <strong>2 ranpur</strong>.</td></tr>
                      <tr><td><strong>Jeda Luar Jarak Tembak</strong></td><td>Saat unit berada di luar jarak tembak, pembakaran amunisi dasar, <strong>Kelelahan Tempur</strong> (<code>rd &gt; 5</code> / <code>rd &gt; 12</code>), dan penurunan Org <code>-1</code> unit <code>Green</code> otomatis dijeda.</td></tr>
                    </tbody>
                  </table>
                </section>

                <section class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">2. JARAK SUMBU-Y, CUACA IKLIM &amp; KALENDER BEBAS ERA</h3>
                  <table class="tradoc-table">
                    <thead><tr><th>Mekanik</th><th>Spesifikasi Teknis</th></tr></thead>
                    <tbody>
                      <tr><td><strong>Jarak &amp; Rampas Logistik</strong></td><td><code>Jarak Total = posA + posB</code>. Jarak dasar: <code>Infanteri / Ranpur biasa &lt;= 2</code>, <code>Tank &amp; TD (anti_tank) &lt;= 3</code>, <code>Artileri &lt;= 6</code>, <code>Zombi &lt;= 1</code>. Rampas Logistik dibatasi <code>category !== 'artillery' &amp;&amp; totalDist &lt;= 2</code>.</td></tr>
                      <tr><td><strong>Kalender Bebas Era</strong></td><td>Menggunakan <code>Date.setUTCFullYear()</code> untuk mendukung tahun <code>-270000</code> (tampil sebagai <code>BCE</code>) hingga <code>+270000</code> termasuk Tahun <code>0</code> dan tahun 2-digit tanpa terpetakan ke 1900.</td></tr>
                      <tr><td><strong>Cuaca Berbasis Iklim</strong></td><td>Tiap 3 ronde (jika <code>DINAMIS</code> aktif), <code>getClimateWeatherCandidates()</code> menyaring transisi cuaca berdasarkan medan, musim kalender, dan waktu (Fajar/Siang/Senja/Malam).</td></tr>
                    </tbody>
                  </table>
                </section>

                <section class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">3. PEMULIHAN BAJA, PERBAIKAN LAPANGAN, DISMOUNT &amp; RALLY</h3>
                  <ul class="list-disc pl-6 space-y-1 text-sm text-[#232a24]">
                    <li><strong>Batas Pemulihan Baja Dinamis:</strong> <code>clamp(baseRec + d50 + bonus, 5, 80 + d20)</code> dengan pembulatan probabilistik agar hantaman kecil tetap berpeluang menghasilkan kerusakan permanen (<code>KO</code>).</li>
                    <li><strong>Tempo Kru Perbaikan:</strong> Berjalan tiap <strong>4 ronde</strong> (<code>round % 4 === 0</code>) jika <code>!isDismounted &amp;&amp; maxArmor &gt; 0 &amp;&amp; Supply &gt;= 25%</code>. Dijeda jika terkena tembakan anti-baja pada ronde sebelumnya. Memulihkan <code>ceil(dN / 2)</code> (maks 2 ranpur, atau 3 dengan Desain Sederhana, maks 35% pool).</li>
                    <li><strong>Dismount vs. Mundur:</strong> Hanya <code>armored_vehicle</code> non-<code>anti_tank</code> yang turun menjadi infanteri (saat <code>0</code> ranpur aktif dengan <code>Org &gt;= 20%</code> &amp; <code>&gt;= 50%</code> personel; jika di bawah batas itu, kru mundur untuk rally tanpa kendaraan). Tank, Artileri SP, dan TD mundur saat 0 ranpur; Artileri tanpa pengawal otomatis mundur.</li>
                    <li><strong>Rally &amp; Konservasi AAR:</strong> Unit yang Rally kembali dengan lantai <code>max(18, 35% maxOrg)</code> dan menyelaraskan <code>cumPersonnelLostTenths</code>. Pengejaran pasca-perang menjamin <code>START === REM + KIA + WIA + POW + ESC</code> dan <code>Start === Act + Rec(+Abn) + Tow + KO</code>.</li>
                  </ul>
                </section>
              </div>

              <footer class="tradoc-footer">
                <span>REKAYASA SISTEM IRON DIVISION // SPESIFIKASI TEKNIS</span>
                <span>TM 9-1005-TECH // AKHIR DOKUMEN</span>
              </footer>
            </article>
          </div>

          <!-- ==================== TAB C: DOKUMENTASI KODE & ARSITEKTUR ==================== -->
          <div id="guide-pane-code" class="${isCode ? '' : 'hidden'}">
            <article class="tradoc-doc" aria-label="Dokumentasi Kode & Arsitektur Iron Division DEV-DOC-ARCH">
              <div class="tradoc-class-strip">
                <span>TERBUKA // REFERENSI PENGEMBANG &amp; ARSITEKTUR KODE</span>
                <span>DOKUMEN // DEV-DOC-ARCH (v3.5)</span>
              </div>

              <header class="tradoc-header">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div class="tradoc-mono text-[11px] font-bold uppercase tracking-widest text-[#3a4738]">
                      REKAYASA IRON DIVISION // DOKUMENTASI KODE LENGKAP
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#141815] mt-1">
                      DEV-DOC-ARCH: Peta Kode, Skema State &amp; API
                    </h2>
                    <p class="text-sm text-[#323a33] max-w-3xl mt-1">
                      Panduan teknis seluruh codebase Iron Division (~16.300 baris vanilla ES6 tanpa bundler): urutan muat skrip, peta 11 file modul, struktur <code>IronDivision.state</code>, alur eksekusi ronde, arsitektur UI/i18n, dan cara bikin mod/skenario baru.
                    </p>
                  </div>
                  <div class="tradoc-mono text-[11px] bg-[#dfd7c2] border border-[#b5ad98] p-3 text-right shrink-0 space-y-0.5 text-[#1c211d]">
                    <div><strong>NO. DOK:</strong> DEV-DOC-ARCH</div>
                    <div><strong>MODUL:</strong> 9 JS + HTML + 2 CSS + TES</div>
                    <div><strong>POLA:</strong> IIFE + <code>window.IronDivision</code></div>
                  </div>
                </div>
              </header>

              <div class="tradoc-body space-y-5">
                <section class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">1. POLA BOOTSTRAP &amp; URUTAN MUAT SKRIP</h3>
                  <div class="tradoc-formula">
                    <div class="tradoc-formula-label">URUTAN WAJIB DI BAGIAN BAWAH index.html</div>
                    <code>1. diagnostics.js</code> &rarr; <code>2. data.js</code> &rarr; <code>3. engine-helpers.js</code> &rarr; <code>4. engine-combat.js</code> &rarr; <code>5. engine-pursuit.js</code> &rarr; <code>6. ui-render.js</code> &rarr; <code>7. guide.js</code> &rarr; <code>8. app.js</code> &rarr; <code>9. i18n-id.js</code>
                  </div>
                  <p class="tradoc-para">
                    Setiap modul dibungkus IIFE yang mendaftarkan API publiknya ke <code>window.IronDivision</code> (versi terpadu <code>ID.VERSION = '3.5'</code>). File <code>i18n-id.js</code> dimuat paling akhir agar bisa membungkus <code>ID.Data</code>, <code>ID.Guide</code>, dan <code>ID.UI</code> secara aman tanpa memutasi state simpanan pengguna.
                  </p>
                </section>

                <section class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">2. PETA LENGKAP MODUL &amp; ASET OFFLINE</h3>
                  <table class="tradoc-table">
                    <thead><tr><th>File</th><th>Namespace</th><th>Tugas Utama</th></tr></thead>
                    <tbody>
                      <tr><td><code>index.html</code></td><td>Kerangka DOM</td><td>100% offline (tanpa CDN eksternal), 7 tab ruang kerja, tata letak layar lebar 3-kolom + split tengah bawah (Log di sebelah Peta 2D), 5 modal pop-up, dan overlay Tur UI 11 langkah.</td></tr>
                      <tr><td><code>css/tailwind-bundle.css</code></td><td>Bundel Tailwind</td><td>Stylesheet utilitas Tailwind CSS v3.4.17 statis hasil prakompilasi untuk jalan 100% offline.</td></tr>
                      <tr><td><code>css/styles.css</code></td><td>Tema &amp; Tata Letak</td><td>Bingkai monitor militer, grid responsif (<code>&gt;=1500px</code>, <code>min-width: 1280px</code>, <code>1024–1279px</code> <code>overflow-x: auto</code>), latar WebP, pelat kuningan komandan, garis status 3px, kertas perkamen, lencana tombol pintas.</td></tr>
                      <tr><td><code>js/diagnostics.js</code></td><td><code>ID.Diagnostics</code>, <code>ID.VERSION</code></td><td>Menyimpan <code>ID.VERSION = '3.5'</code> serta penangkap galat global (<code>onerror</code> &amp; <code>unhandledrejection</code>) untuk kanal <code>SYS ERRORS</code>.</td></tr>
                      <tr><td><code>js/data.js</code></td><td><code>ID.Data</code></td><td>Database statis: 8 Medan, 6 Fitur, 8 Cuaca, 4 Bahaya Gabungan, 32 Sifat Unit, 10 Sifat Komandan, 25 Taktik, dan templat Arracourt &amp; San Marino.</td></tr>
                      <tr><td><code>js/engine-helpers.js</code></td><td><code>ID.Helpers</code>, <code>ID.Icons</code></td><td>Dadu RNG, kalender UTC bebas era (<code>setUTCFullYear</code>), cuaca berbasis iklim, jarak tembak &amp; visibilitas, ikon SVG NATO &amp; pangkat 10 tingkat, buffer log.</td></tr>
                      <tr><td><code>js/engine-combat.js</code></td><td><code>ID.Combat</code></td><td>Loop tempur 8 tahap (<code>runSingleRound</code>), undo 15 ronde (<code>pushHistorySnapshot</code>), logistik/kelelahan, pengintaian (<code>performVigilanceComparison</code>), tembakan bantuan (<code>processSideSupportFire</code>), resolusi duel (<code>resolveUnitEngagement</code>), perbaikan 4 ronde, penetrasi/<code>ARMOR HELD</code>, pemulihan <code>80+d20%</code>, dismount/mundur, dan telemetri <code>u.stats</code>.</td></tr>
                      <tr><td><code>js/engine-pursuit.js</code></td><td><code>ID.Pursuit</code></td><td>Cek kemenangan (<code>checkBattleEndCondition</code>), pengejaran &amp; konservasi personel 100% (<code>resolveRetreatAndPursuit</code>), penarikan ranpur, salvase medan, dan pembuat snapshot AAR (<code>buildAfterActionReport</code>).</td></tr>
                      <tr><td><code>js/ui-render.js</code></td><td><code>ID.UI</code></td><td>Render seluruh UI dengan <code>escapeHtml()</code> + delegasi <code>initDelegatedUIHandlers()</code>, Peta Taktis 2D &amp; tautan dua arah (<code>focusUnitCard</code> / <code>highlightMapCounter</code>), mode kartu ringkas, Tur UI 11 langkah, <code>getActiveAARData()</code>, dan ekspor PDF Form DA-774.</td></tr>
                      <tr><td><code>js/guide.js</code></td><td><code>ID.Guide</code></td><td>Merender 3 tab map manila: <code>FM 100-5-BOOT</code>, <code>TM 9-1005-TECH</code>, dan <code>DEV-DOC-ARCH</code>.</td></tr>
                      <tr><td><code>js/app.js</code></td><td><code>ID.App</code>, <code>ID.state</code></td><td>State global, <code>localStorage</code>, pemuat skenario &amp; <code>resetSideRuntimeState()</code>, pintasan papan ketik (<code>Space</code>/<code>Enter</code>, <code>A</code>, <code>Ctrl+Z</code>), modal konfirmasi militer, Mode GM, dan Ekspor/Impor JSON.</td></tr>
                      <tr><td><code>js/i18n-id.js</code></td><td><code>ID.I18n</code></td><td>Lokalisasi Bahasa Indonesia (bawaan <code>'en'</code>): tombol <code>EN/ID</code>, lokalisasi tampilan via <code>localizeField()</code> (tanpa memutasi <code>ID.state</code>/JSON), <code>MutationObserver</code> + <code>translateCombatLogText()</code>, Buku Saku Ajudan, dan AAR format <strong>TNI AD MINU LAP-OPS</strong>.</td></tr>
                      <tr><td><code>tests/run-tests.js</code></td><td>Suite Tes Node</td><td>Suite regresi &amp; invarian headless via <code>node tests/run-tests.js</code> untuk cek sintaks, aset offline, logika tempur, sanitasi XSS, dan konservasi Personel/Ranpur.</td></tr>
                    </tbody>
                  </table>
                </section>

                <section class="tradoc-chapter">
                  <h3 class="tradoc-chapter-title">3. SKEMA STATE, ALUR RONDE &amp; PANDUAN MODDING</h3>
                  <ul class="list-disc pl-6 space-y-1.5 text-sm text-[#232a24]">
                    <li><strong>State Utama (<code>ID.state</code>):</strong> Seluruh data tersimpan dalam objek murni yang bisa di-<code>structuredClone()</code> — mencakup <code>environment</code>, <code>battle</code> (<code>round</code>, <code>logs</code>, <code>history</code>, <code>sideA/B</code>, <code>afterActionReport</code>), <code>unitTemplates</code>, <code>traits</code>, <code>commanders</code>, dan <code>terrains</code>.</li>
                    <li><strong>Alur 1 Ronde:</strong> <code>runSingleRound()</code> &rarr; <code>pushHistorySnapshot()</code> &rarr; <code>processSupplyAndStartOfRoundTraits()</code> &rarr; <code>performVigilanceComparison()</code> &rarr; <code>processSideSupportFire()</code> &rarr; <code>resolveUnitEngagement()</code> (manuver, Overwatch, tempur utama, tembak balas) &rarr; <code>checkBattleEndCondition()</code> &rarr; <code>resolveRetreatAndPursuit()</code> &rarr; <code>renderCombatRound()</code>.</li>
                    <li><strong>Menambah Skenario / Mod Baru:</strong> Tambahkan templat unit di <code>js/data.js</code> lalu buat pemuat di <code>js/app.js</code> memakai <code>loadScenarioByConfig(...)</code>. Untuk menambah bahasa lain, cukup salin pola <code>js/i18n-id.js</code> dan muat setelah <code>app.js</code>.</li>
                  </ul>
                </section>
              </div>

              <footer class="tradoc-footer">
                <span>REKAYASA IRON DIVISION // DOKUMENTASI ARSITEKTUR KODE</span>
                <span>DEV-DOC-ARCH // AKHIR DOKUMEN</span>
              </footer>
            </article>
          </div>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 4. Reversible data.js Localization
  // --------------------------------------------------------------------------
  function backupEnglishDataOnce() {
    if (dataBackups.saved || !ID.Data) return;
    const D = ID.Data;
    const saveObjMap = (src, dst) => {
      if (!src) return;
      Object.keys(src).forEach(k => {
        dst[k] = { name: src[k].name, desc: src[k].desc, trigger: src[k].trigger };
      });
    };
    const saveArrMap = (arr, dst) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(item => {
        if (item && item.id) dst[item.id] = { name: item.name, desc: item.desc };
      });
    };

    saveObjMap(D.DEFAULT_TERRAINS, dataBackups.terrains);
    saveObjMap(D.TERRAIN_FEATURES, dataBackups.features);
    saveObjMap(D.WEATHER_TYPES, dataBackups.weather);
    saveObjMap(D.TIME_OF_DAY_TYPES, dataBackups.tod);
    saveObjMap(D.COMPOUND_HAZARDS, dataBackups.hazards);
    saveArrMap(D.DEFAULT_TRAITS, dataBackups.traits);
    saveArrMap(D.DEFAULT_COMMANDER_TRAITS, dataBackups.cmdTraits);
    saveArrMap(D.TACTICS_DB, dataBackups.tactics);
    dataBackups.saved = true;
  }

  function localizeField(kind, id, field, currentValue) {
    if (currentLang !== 'id' || !id) return currentValue;
    backupEnglishDataOnce();
    const idMap = kind === 'terrain'
      ? ID_TERRAINS
      : (kind === 'trait' ? ID_TRAITS : (kind === 'cmdTrait' ? ID_CMD_TRAITS : null));
    const enMap = kind === 'terrain'
      ? dataBackups.terrains
      : (kind === 'trait' ? dataBackups.traits : (kind === 'cmdTrait' ? dataBackups.cmdTraits : null));
    if (!idMap || !enMap) return currentValue;
    const translated = idMap[id] && idMap[id][field];
    if (translated === undefined) return currentValue;
    const defaultEn = enMap[id] && enMap[id][field];
    // Preserve custom user edits: only return localized label if value still matches built-in English default
    if (defaultEn !== undefined && currentValue !== undefined && currentValue !== defaultEn) {
      return currentValue;
    }
    return translated;
  }

  function applyDataLocalization(lang) {
    if (!ID.Data) return;
    backupEnglishDataOnce();
    const D = ID.Data;
    const useId = (lang === 'id');

    const patchObjMap = (target, idMap, enMap) => {
      if (!target) return;
      Object.keys(target).forEach(k => {
        const src = useId ? idMap[k] : enMap[k];
        if (!src) return;
        if (src.name !== undefined) target[k].name = src.name;
        if (src.desc !== undefined) target[k].desc = src.desc;
        if (src.trigger !== undefined) target[k].trigger = src.trigger;
      });
    };

    const patchArr = (arr, idMap, enMap) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(item => {
        if (!item || !item.id) return;
        const src = useId ? idMap[item.id] : enMap[item.id];
        if (!src) return;
        if (src.name !== undefined) item.name = src.name;
        if (src.desc !== undefined) item.desc = src.desc;
      });
    };

    // Only localize non-persisted read-only reference registries.
    // ID.state.{terrains, traits, commanderTraits} and D.DEFAULT_* remain untouched
    // so localStorage, JSON exports, and custom user edits stay language-neutral.
    patchObjMap(D.TERRAIN_FEATURES, ID_FEATURES, dataBackups.features);
    patchObjMap(D.WEATHER_TYPES, ID_WEATHER, dataBackups.weather);
    patchObjMap(D.TIME_OF_DAY_TYPES, ID_TOD, dataBackups.tod);
    patchObjMap(D.COMPOUND_HAZARDS, ID_HAZARDS, dataBackups.hazards);
    patchArr(D.TACTICS_DB, ID_TACTICS, dataBackups.tactics);
  }

  // --------------------------------------------------------------------------
  // 5. DOM Translation Engine & Guide Hook
  // --------------------------------------------------------------------------
  function translateText(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    const trimmed = raw.trim();
    if (!trimmed) return raw;

    if (Object.prototype.hasOwnProperty.call(EXACT_MAP, trimmed)) {
      return raw.replace(trimmed, EXACT_MAP[trimmed]);
    }
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
    if (node.parentElement.closest('.mil-dogtag-text, .mil-cmd-plate-text, #view-guide, #welcome-modal')) {
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // 4B. Combat Log Translator (Natural Indonesian Sitrep)
  // --------------------------------------------------------------------------
  const LOG_REPLACEMENTS = [
    [/Current battle fully reset to Round 1\. All deployed formations restored to 100% strength\./g, 'Pertempuran diulang penuh ke Ronde 1. Seluruh satuan kembali 100% siap tempur.'],
    [/Loaded Battle of Arracourt \(18 SEP 1944, Lorraine\):/g, 'Memuat Pertempuran Arracourt (18 SEP 1944, Lorraine):'],
    [/Loaded Battle of San Marino \(17 SEP 1944\):/g, 'Memuat Pertempuran San Marino (17 SEP 1944):'],
    [/ROUND (\d+) BEGINS — (.+?) Attacks \| (.+?) Defends/g, 'RONDE $1 DIMULAI — $2 Menyerang | $3 Bertahan'],
    [/Tactics Selected —/g, 'Taktik Dipilih —'],
    [/\(Attacker\):/g, '(Penyerang):'],
    [/\(Defender\):/g, '(Bertahan):'],
    [/Blocks Org Rec/g, 'Blokir Regen Org'],
    [/Approach March\] No units in engagement range yet — combat ammunition burn paused \(0 base drain\) \| Depot:/g, 'Gerak Mendekat] Belum ada unit dalam jarak tembak — pemakaian amunisi dijeda (0 dasar) | Depot:'],
    [/Supply\] Base operational drain/g, 'Logistik] Konsumsi operasional dasar'],
    [/Base operational drain/g, 'Konsumsi operasional dasar'],
    [/Depot Stockpile:/g, 'Stok Depot:'],
    [/\[Entrenching\] (.+?) digs in deeper \(Entrenchment Lvl (\d+\/\d+)\)\./g, '[Gali Parit] $1 memperdalam parit (Parit Lvl $2).'],
    [/Net Organization ([+-]?\d+) \(Regen ([+-]?\d+), (?:Combat )?Fatigue (-?\d+) -> (\d+\/\d+)\)/g, 'Organisasi Bersih $1 (Regen $2, Lelah $3 -> $4)'],
    [/Net Organization ([+-]?\d+) \(Regen ([+-]?\d+), Fatigue Paused \(Out of Range\) -> (\d+\/\d+)\)/g, 'Organisasi Bersih $1 (Regen $2, Lelah Dijeda [Luar Jarak] -> $3)'],
    [/Fatigue Paused \(Out of Range\)/g, 'Lelah Dijeda (Luar Jarak)'],
    [/Combat Fatigue/g, 'Kelelahan Tempur'],
    [/\[Brigade Resupply\] (.+?) Depot distributes \+(\d+) supply across (\d+) frontline units?/g, '[Pasok Brigade] Depot $1 menyalurkan +$2 logistik ke $3 unit garis depan'],
    [/\[Depot Refit\] (.+?) draws \+(\d+) supply from Depot/g, '[Isi Ulang Depot] $1 menarik +$2 logistik dari Depot'],
    [/\[Depot Exhausted\] (.+?)'s Supply Depot is empty — frontline units cannot draw brigade resupply!/g, '[Depot Kosong] Depot Logistik $1 habis — unit garis depan tidak bisa menarik pasokan brigade!'],
    [/Supply dropped below 50%! One-time ([^ ]+) Org damage & -10% malus!/g, 'Logistik turun di bawah 50%! Penalti sekali jalan $1 Org & malus -10%!'],
    [/Supply dropped below 20%! One-time ([^ ]+) Org damage & -20% malus!/g, 'Logistik turun di bawah 20%! Penalti sekali jalan $1 Org & malus -20%!'],
    [/\[Weather Shift\] Theatre weather shifts from (.+?) -> ([^(!]+?)(?:\s*\(([^)]+)\))?!/g, (_, fromW, toW, ctx) => `[Perubahan Cuaca] Cuaca teater bergeser dari ${fromW.trim()} ke ${toW.trim()}${ctx ? ` (${ctx})` : ''}!`],
    [/\[Vigilance\/Recon Roll\] Side ([AB]): (.+?) vs Side ([AB]): (.+?) -> Side ([AB]) wins by (\d+) \(\+(\d+) flat Stat Boost!\)/g, '[Pengintaian] Pihak $1: $2 vs Pihak $3: $4 -> Pihak $5 unggul $6 (+$7 Bonus Stat!)'],
    [/\[Vigilance\/Recon Roll\]/g, '[Pengintaian]'],
    [/\[Initiative Locked\] Side ([AB]) has not yet closed into frontline engagement range — Side ([AB]) remains in the Attacking Phase while Side ([AB]) holds in the Defending Phase!/g, '[Inisiatif Terkunci] Pihak $1 belum masuk jarak tembak — Pihak $2 tetap menyerang sementara Pihak $3 bertahan!'],
    [/\[Advancing on Y-Axis\] (.+?) \(Max Range (≤\d+)\) has no enemy in range and moves (\d+) distance forward \(Dist: (\d+ -> \d+) \| Closest Enemy Total Dist: (\d+)\)\./g, '[Maju Sumbu-Y] $1 (Jarak Maks $2) belum ada musuh dalam jangkauan dan maju $3 langkah (Jarak: $4 | Musuh Terdekat: $5).'],
    [/\[Mortar Plunging Fire\] (.+?) -> (.+?) \(Infantry\): Def (-\d+), Entrenchment DENIED, (\d+) casualties, (-\d+) Org suppression shock!/g, '[Tembakan Mortir] $1 -> $2 (Infanteri): Per $3, Parit GAGAL, $4 korban, $5 syok supresi Org!'],
    [/\[Mortar Shells on Armor\] (.+?) -> (.+?): Shrapnel bounces off armor plate\. 0 Hardness reduction\. Def (-\d+) \(Buttoned up\)\./g, '[Mortir ke Baja] $1 -> $2: Pecahan memantul dari pelat baja. 0 pengurangan Baja. Per $3 (Palka ditutup).'],
    [/\[Mortar Optics Hit!\] (.+?) -> (.+?): Periscopes shattered! Def (-\d+), -15 Vigilance next round\./g, '[Optik Terkena Mortir!] $1 -> $2: Periskop pecah! Per $3, -15 Pengintaian ronde depan.'],
    [/\[MORTAR TRACK BLOWN!\] (.+?) lands direct shell on (.+?)'s suspension! 1 vehicle immobilized, -2 Mobility Class!/g, '[RANTAI RANPUR PUTUS!] $1 menghantam suspensi $2! 1 ranpur lumpuh, -2 Kelas Mobilitas!'],
    [/\[Inherent Battery Barrage\]/g, '[Salvo Baterai Artileri]'],
    [/\[Off-Map Artillery Support\]/g, '[Bantuan Artileri Jarak Jauh]'],
    [/\[Air Support Grounded\] (.+?)'s strike wing aborted due to severe weather\/visibility \(([^)]+)\)\./g, '[Udara Batal Terbang] Sayap serang $1 dibatalkan akibat cuaca/jarak pandang buruk ($2).'],
    [/\[Air Support\]/g, '[Dukungan Udara]'],
    [/\[AA Gun\] (.+?) reduces airstrike by ([^.]+)\./g, '[Meriam Hanud] $1 mengurangi serangan udara sebesar $2.'],
    [/\[AA Gun CRITICAL (\d+)!\]/g, '[Meriam Hanud KRITIS $1!]'],
    [/\[Field Repair Crew\] (.+?) mechanics pinned by recent anti-armor fire — mid-battle field repair delayed \((\d+) awaiting recovery\)\./g, '[Kru Perbaikan] Montir $1 tiarap akibat tembakan anti-baja ronde lalu — perbaikan ditunda ($2 menunggu evakuasi).'],
    [/\[Field Repair Crew\] (.+?) \(([^)]+)\) restores (\d+) armor in-field \((\d+) active, (\d+) awaiting post-battle recovery\)\./g, '[Kru Perbaikan] $1 ($2) memperbaiki $3 ranpur di lapangan ($4 aktif, $5 menunggu evakuasi).'],
    [/\[Defensive Overwatch\] (.+?) \(Range (≤\d+)\) opens uncontested overwatch fire on advancing (.+?) at Total Dist (\d+)!/g, '[Tembakan Penghadang] $1 (Jarak $2) melepaskan tembakan penghadang ke $3 yang maju di Jarak Total $4!'],
    [/\[Overwatch Volley Damage\]/g, '[Kerusakan Tembakan Penghadang]'],
    [/\[Overwatch Armor Hit\]/g, '[Hantaman Baja Penghadang]'],
    [/\[Main Attack Armor Hit\]/g, '[Hantaman Baja Serangan Utama]'],
    [/\[Return Fire Armor Hit\]/g, '[Hantaman Baja Tembakan Balasan]'],
    [/\[Heavy Artillery Barrage Armor Hit\]/g, '[Hantaman Baja Artileri Berat]'],
    [/\[Airstrike Armor Hit\]/g, '[Hantaman Baja Serangan Udara]'],
    [/\[Mortar Mobility Hit Armor Hit\]/g, '[Hantaman Mobilitas Mortir]'],
    [/\[Main Attack Damage\]/g, '[Kerusakan Serangan Utama]'],
    [/\[Return Fire Damage\]/g, '[Kerusakan Tembakan Balasan]'],
    [/\[Return Fire Piercing Check\]/g, '[Uji Penetrasi Tembakan Balasan]'],
    [/\[Piercing Check\]/g, '[Uji Penetrasi Baja]'],
    [/-> PIERCED! \(Diff: ([+-]?\d+)\)/g, '-> TEMBUS! (Selisih: $1)'],
    [/-> ARMOR HELD \(Unpierced — Soft\/Close-Assault Chip Active\)/g, '-> BAJA MENAHAN (Tidak Tembus — Kerusakan Ringan Aktif)'],
    [/\[ARMOR HELD ×0\.5, Explosive Negated\]/g, '[BAJA MENAHAN ×0,5, Ledak Batal]'],
    [/Heavy Armor Deflected \(Cap -1\)/g, 'Baja Berat Memantul (Maks -1 Org)'],
    [/Clash Deflected \(Max 2\)/g, 'Bentrokan Memantul (Maks 2)'],
    [/Fleet Cap (\d+)/g, 'Batas Armada $1'],
    [/Support Strike/g, 'Serangan Bantuan'],
    [/Mortar Track Hit/g, 'Hantaman Rantai Mortir'],
    [/(\d+) vehicles knocked out! Recovery/g, '$1 ranpur dilumpuhkan! Pemulihan'],
    [/(\d+) Recoverable, (\d+) Destroyed \((\d+\/\d+) active\) \| Crew Casualties: (\d+) downed, -(\d+) Org shock!/g, '$1 Bisa Dievakuasi, $2 Hancur ($3 aktif) | Korban Awak: $4 jatuh, -$5 syok Org!'],
    [/\[Return Fire Clash\] (.+?) RetAtk: (.+?) VS (.+?) Breakthrough\/Def: ([\d.]+)/g, '[Bentrokan Balasan] $1 SerBalik: $2 VS $3 Terobosan/Per: $4'],
    [/\[Return Fire Hit!\] (.+?) \(RetAtk ([\d.]+) > Breakthrough ([\d.]+)\) strikes back at (.+?)!/g, '[Tembakan Balasan Kena!] $1 (SerBalik $2 > Terobosan $3) membalas telak ke $4!'],
    [/\[No Return Fire\] (.+?) failed Return Fire Vigilance \(([^)]+)\)\./g, '[Tanpa Tembakan Balasan] $1 gagal Pengintaian Balasan ($2).'],
    [/\[Out of Return-Fire Range\] (.+?) \(Max Range (≤\d+)\) cannot return fire against (.+?) firing from Total Distance (\d+)!/g, '[Di Luar Jarak Balas] $1 (Jarak Maks $2) tidak bisa membalas $3 yang menembak dari Jarak Total $4!'],
    [/\[Grazing Return Fire\] (.+?)'s Breakthrough \(([\d.]+)\) holds vs (.+?) \(([\d.]+)\), but takes (\d+) suppressing casualties \(Pressure (\d+%) \((\d+) base - (\d+) fortified mitigation\)\)!/g, '[Tembakan Balasan Menyerempet] Terobosan $1 ($2) bertahan lawan $3 ($4), tapi menderita $5 korban supresi (Tekanan $6, dasar $7 - $8 mitigasi parit)!'],
    [/\[Grazing Fire\] (.+?) repels breakthrough \(([\d.]+) vs ([\d.]+)\), but suffers (\d+) grazing casualties \(Pressure (\d+%) \((\d+) base - (\d+) fortified mitigation\)\)!/g, '[Tembakan Menyerempet] $1 menahan terobosan ($2 vs $3), tapi menderita $4 korban serempetan (Tekanan $5, dasar $6 - $7 mitigasi parit)!'],
    [/\[COMPLETELY IMMUNE\] (.+?) holds the line \(([\d.]+) vs ([\d.]+)\): Attack \(([\d.]+)\) was absorbed by defense \(([\d.]+)\) \[Pressure (\d+%) < 40% threshold\] \(0 casualties\)!/g, '[TERTAHAN SEPENUHNYA] $1 menahan garis ($2 vs $3): Serangan ($4) diredam pertahanan ($5) [Tekanan $6 < ambang 40%] (0 korban)!'],
    [/\[BREAKTHROUGH IMMUNE\] (.+?)'s Breakthrough \(([\d.]+)\) deflects (.+?)'s Return Fire \(([\d.]+)\): Attack \(([\d.]+)\) was absorbed by defense \(([\d.]+)\) \[Pressure (\d+%) < 40% threshold\] \(0 casualties\)!/g, '[TEROBOSAN KEBAL] Terobosan $1 ($2) memantulkan tembakan balasan $3 ($4) [Tekanan $7 < ambang 40%] (0 korban)!'],
    [/\[Cover & Dispersion\] (.+?) makes Cover Save: (.+?) -> DUG-IN \/ IN DEFILADE \(Half soft damage, explosive negated\)/g, '[Perlindungan Medan] $1 lolos Uji Berlindung: $2 -> BERLINDUNG DI PARIT (Kerusakan lunak separuh, ledak batal)'],
    [/\[Cover & Dispersion\] (.+?) makes Cover Save: (.+?) -> CAUGHT IN OPEN \(Exposed to full fire & suppression shock!\)/g, '[Perlindungan Medan] $1 gagal Uji Berlindung: $2 -> TERBUKA DI MEDAN (Kena tembakan penuh & syok supresi!)'],
    [/\[Caught in Open Shock\] (.+?) pinned without defilade, taking (-\d+) Org shock!/g, '[Syok Medan Terbuka] $1 terjepit tanpa perlindungan, terkena $2 syok Org!'],
    [/\[Org Damage\] (.+?) loses (-\d+) Organization \(([^)]+(?:\([^)]*\)[^)]*)*)\) -> (\d+\/\d+) Org remaining\./g, '[Kerusakan Org] $1 kehilangan $2 Organisasi ($3) -> sisa $4 Org.'],
    [/combat shock/g, 'syok tempur'],
    [/Intact Ranks Shield/g, 'Perisai Barisan Utuh'],
    [/cum\. loss/g, 'korban kumulatif'],
    [/\[Shock Malus\] (.+?) suffers (-\d+) Org at end of round\./g, '[Malus Syok] $1 kehilangan $2 Org di akhir ronde.'],
    [/\[Decisive Breakthrough\] (.+?) gains \+(\d+) Org for smashing (.+?)!/g, '[Terobosan Menentukan] $1 meraih +$2 Org karena menghantam $3!'],
    [/\[Breakthrough Exploitation\] (.+?) inflicted >=10% losses on (.+?) — (.+?) gains \+10% Attack next round!/g, '[Eksploitasi Terobosan] $1 memberi >=10% korban ke $2 — $3 mendapat +10% Serangan ronde depan!'],
    [/\[Delay Tactic\] Successful defense imposes -10% Attack on (.+?) next round\./g, '[Taktik Ulur Waktu] Pertahanan berhasil memberi -10% Serangan ke $1 ronde depan.'],
    [/\[Casualty Recovery\]/g, '[Evakuasi Korban]'],
    [/(\d+) KIA \(Dead\), (\d+) WIA \(Wounded\) \((\d+\/\d+) active\)/g, '$1 Gugur (KIA), $2 Luka (WIA) ($3 aktif)'],
    [/\[Died of Wounds\] (.+?): (\d+) wounded succumbed to injuries \(WIA -> KIA, Rate: ([^)]+)\)/g, '[Gugur Karena Luka] $1: $2 prajurit luka gugur (WIA -> KIA, Laju: $3)'],
    [/\[Supply Stolen\] (.+?) steals (\d+) Supply from (.+?)!/g, '[Rampas Logistik] $1 merampas $2 Logistik dari $3!'],
    [/\[Rout & Scatter\] (.+?) broke \(([^)]+)\)! (\d+) troops scattered and escaped the battlefield; (\d+) disciplined soldiers fall back to regroup \((\d+) rds to rally\)\./g, '[Mundur & Kocar-Kacir] $1 pecah ($2)! $3 prajurit tercerai-berai lolos dari medan; $4 prajurit mundur teratur untuk konsolidasi ($5 ronde).'],
    [/All combat-ready transports disabled/g, 'Seluruh kendaraan angkut lumpuh'],
    [/reached 0 Organization! Cohesion broke and the unit is permanently routed!/g, 'mencapai 0 Organisasi! Kohesi hancur dan satuan kocar-kacir permanen!'],
    [/Cohesion broke/g, 'Kohesi satuan pecah'],
    [/\[Armor Tactical Fallback\] (.+?) withdraws to the rear with its (\d+) active combat vehicles to reorganize\./g, '[Mundur Taktis Lapis Baja] $1 mundur ke belakang bersama $2 ranpur aktif untuk konsolidasi.'],
    [/\[Rally Staging Area\] (.+?) reorganizes in the rear: (\+\d+) Org \(([^)]+)\)\./g, '[Area Konsolidasi] $1 menata ulang barisan di belakang: $2 Org ($3).'],
    [/\[Rallied to the Line\]/g, '[Kembali ke Garis Depan]'],
    [/PASSED Rally Check/g, 'LOLOS Konsolidasi'],
    [/FAILED Rally Check/g, 'GAGAL Konsolidasi'],
    [/Reformed as infantry with (\d+) personnel, Org: (\d+\/\d+)\./g, 'Terbentuk ulang sebagai infanteri dengan $1 personel, Org: $2.'],
    [/Intact column returned with (\d+) personnel, (\d+) active vehicles, Org: (\d+\/\d+)\./g, 'Kolom utuh kembali dengan $1 personel, $2 ranpur aktif, Org: $3.'],
    [/Returned to the line with (\d+) personnel, Org: (\d+\/\d+)\./g, 'Kembali ke garis depan dengan $1 personel, Org: $2.'],
    [/\[Unscreened Artillery Withdrawal\] (.+?) limbers up and withdraws from the sector after losing all frontline screening forces!/g, '[Penarikan Artileri Tanpa Pengawal] $1 berkemas dan mundur dari sektor setelah semua pengawal garis depan gugur!'],
    [/has 0 combat-ready vehicles remaining and withdraws from the sector!/g, 'kehabisan ranpur siap tempur (0) dan mundur dari sektor!'],
    [/BATTLE OVER — (.+?) achieves victory over (.+?) in Round (\d+)!/g, 'PERTEMPURAN SELESAI — $1 meraih kemenangan atas $2 pada Ronde $3!'],
    [/BATTLE OVER — (.+?) achieves victory over (.+?)!/g, 'PERTEMPURAN SELESAI — $1 meraih kemenangan atas $2!'],
    [/\[Retreat Success\] (.+?): Ret (\d+) vs Pur (\d+) -> (\d+%) \((\d+)\) escaped, (\d+) captured\./g, '[Mundur Berhasil] $1: Mundur $2 vs Kejar $3 -> $4 ($5) lolos, $6 tertawan.'],
    [/\[Pursuit Catch\] (.+?): Pur (\d+) > Ret (\d+) -> (\d+%) \((\d+)\) captured, (\d+) escaped\./g, '[Tertangkap Pengejaran] $1: Kejar $2 > Mundur $3 -> $4 ($5) tertawan, $6 lolos.'],
    [/\[Recovery Tractors\] (.+?) \((\d+%) retreat\) towed (\d+) repairable hulls back to depot \((\d+) left on field\)\./g, '[Traktor Evakuasi] $1 ($2 mundur) menarik $3 ranpur rusak ke depot ($4 tertinggal di medan).'],
    [/\[FIELD SALVAGE\] (.+?) \(Roll (\d+)\) secured (\d+) abandoned hulls: (\d+) captured hulls impressed, (\d+) stripped \(\+(\d+) Supply\), (\d+) scuttled\/burned\./g, '[SALVASE MEDAN] $1 (Lemparan $2) mengamankan $3 ranpur musuh: $4 dioperasikan kembali, $5 dilucuti (+$6 Logistik), $7 dihancurkan/dibakar.'],
    [/personnel downed!/g, 'personel jatuh!']
  ];

  function translateCombatLogText(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    let out = raw;
    for (const [re, rep] of LOG_REPLACEMENTS) {
      out = out.replace(re, rep);
    }
    return out;
  }

  // --------------------------------------------------------------------------
  // 4C. Full Welcome Briefing Pop-up Localization (Subordinate -> Komandan)
  // --------------------------------------------------------------------------
  function applyWelcomeModalLanguage(lang) {
    const modal = document.getElementById('welcome-modal');
    if (!modal) return;
    const panel = modal.querySelector('.paper-sitrep-panel');
    if (!panel) return;
    if (origWelcomeHtml === null) {
      origWelcomeHtml = panel.innerHTML;
    }
    if (lang !== 'id') {
      panel.innerHTML = origWelcomeHtml;
      return;
    }
    panel.innerHTML = `
      <div class="paper-sitrep-header pb-3 border-b-2 border-[#1a1e1a] flex items-start justify-between gap-3">
        <div>
          <span class="paper-sitrep-kicker">MARKAS DIVISI BESI // FORMULIR ORIENTASI AWAL</span>
          <h2 class="paper-sitrep-title text-lg sm:text-xl mt-0.5">LAPORAN ORIENTASI KOMANDAN</h2>
        </div>
        <span class="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border border-[#8a3c38] text-[#8a3c38] bg-[#f8eceb] shrink-0">BACA DULU, NDAN</span>
      </div>

      <div class="space-y-3 text-xs sm:text-[13px] leading-relaxed text-[#222822] font-sans">
        <p>
          <strong>Selamat datang, Komandan!</strong> <strong>Iron Division</strong> adalah simulator pertempuran operasional gabungan senjata untuk TTRPG dan wargaming historis. Beda dari game arcade yang cuma adu bar darah, di sini kita menghitung <strong>kekompakan satuan (Organisasi)</strong>, <strong>penetrasi vs. ketebalan baja</strong>, <strong>jarak tembak realistis</strong>, <strong>Depot Logistik bersama</strong>, <strong>cuaca dinamis &amp; jam 24 jam</strong>, sampai cetak PDF <strong>Laporan Pelaksanaan Tugas versi TNI AD</strong>.
        </p>

        <div class="p-3 bg-[#dfd7c2] border-l-4 border-[#9c7a26] font-mono text-[11.5px] space-y-1.5 text-[#1c211d]">
          <div class="font-bold uppercase tracking-wider text-[#6e5210]">SARAN DARI AJUDAN LAPANGAN (KOPKA "BESI"):</div>
          <p class="leading-snug">
            Baru pertama kali pegang komando di sini, Ndan? Klik <strong>MULAI TUR UI</strong> buat keliling cepat seluruh tombol layar, atau buka <strong>Buku Saku</strong> biar langsung paham semua aturan tempur tanpa bahasa kaku!
          </p>
        </div>

        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px] text-[#2c332c]">
          <li class="px-2 py-1 bg-[#e4dcc8] border border-[#b3a990]"><strong>OPERASI UTAMA:</strong> Pertempuran Arracourt (18 SEP 1944)</li>
          <li class="px-2 py-1 bg-[#e4dcc8] border border-[#b3a990]"><strong>RAKIT SENDIRI:</strong> ORBAT, Sifat, Jenderal &amp; Medan</li>
          <li class="px-2 py-1 bg-[#e4dcc8] border border-[#b3a990]"><strong>MODE GM:</strong> Ubah Langsung &amp; Batal 1 Ronde</li>
          <li class="px-2 py-1 bg-[#e4dcc8] border border-[#b3a990]"><strong>EKSPOR:</strong> Cadangan JSON &amp; PDF Laporan TNI AD</li>
        </ul>
      </div>

      <div class="pt-3 border-t border-[#b3a990] flex flex-wrap items-center justify-between gap-3">
        <label class="flex items-center gap-2 font-mono text-[11px] text-[#3a423a] cursor-pointer">
          <input type="checkbox" id="welcome-dont-show" checked class="accent-[#c8a24b]">
          <span>Jangan tampilkan lagi pas masuk berikutnya, Ndan</span>
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" onclick="closeWelcomeModal(false)" class="paper-sitrep-btn paper-sitrep-btn-muted px-3 py-1.5">
            LANGSUNG KE MEDAN TEMPUR
          </button>
          <button type="button" onclick="closeWelcomeModal(false); startUITutorial();" class="mil-btn px-3.5 py-1.5 bg-[#2d472b] hover:bg-[#385936] border border-[#4c7548] text-[#d9ead7] font-bold text-xs tracking-wider">
            MULAI TUR UI
          </button>
          <button type="button" onclick="closeWelcomeModal(true)" class="mil-btn px-4 py-1.5 bg-[#c8a24b] hover:bg-[#d8b45c] border border-[#8a6d20] text-[#0d100d] font-bold text-xs tracking-wider">
            BACA BUKU SAKU
          </button>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 4D. Indonesian Army (TNI AD) Printable A4 AAR (MINU TNI AD // LPT)
  // --------------------------------------------------------------------------
  function buildTniAdPrintableAARHtml(rep) {
    if (!origBuildPrintableAAR) return '';
    let html = origBuildPrintableAAR(rep);
    const idRepl = [
      [/UNCLASSIFIED \/\/ IRON DIVISION AFTER-ACTION REPORT/g, 'TERBATAS // TENTARA NASIONAL INDONESIA ANGKATAN DARAT'],
      [/UNCLASSIFIED \/\/ END OF AFTER-ACTION REPORT/g, 'TERBATAS // AKHIR LAPORAN PELAKSANAAN TUGAS (TNI AD)'],
      [/AFTER-ACTION REPORT \(AAR\)/g, 'LAPORAN PELAKSANAAN TUGAS (LPT / AAR)'],
      [/FORM DA-774 \/\//g, 'MINU TNI AD // LAP-OPS //'],
      [/PAGE " counter\(page\) " OF " counter\(pages\)/g, 'HALAMAN " counter(page) " DARI " counter(pages)'],
      [/<strong>FROM:<\/strong> HQ COMBINED-ARMS COMMAND/g, '<strong>DARI:</strong> KOMANDO GABUNGAN SENJATA (KOGAB)'],
      [/<strong>TO:<\/strong> THEATRE OPERATIONS \(G-3\)/g, '<strong>KEPADA:</strong> ASISTEN OPERASI (ASOPS / SOPS TNI AD)'],
      [/<strong>DTG:<\/strong>/g, '<strong>WAKTU (TW):</strong>'],
      [/<strong>OP WINDOW:<\/strong>/g, '<strong>PERIODE OPS:</strong>'],
      [/<strong>STATUS:<\/strong> FINAL DEBRIEF/g, '<strong>STATUS:</strong> LAPORAN AKHIR OPERASI'],
      [/<strong>STATUS:<\/strong> INTERIM SITREP/g, '<strong>STATUS:</strong> LAPORAN SITUASI SEMENTARA (LAPSIT)'],
      [/<strong>SUBJECT:<\/strong>/g, '<strong>PERIHAL:</strong>'],
      [/ENGAGEMENT<\/div>/g, 'OPERASI SEKTOR</div>'],
      [/<strong>METEO:<\/strong>/g, '<strong>CUACA (METEO):</strong>'],
      [/<h2>1\. Operational Executive Summary<\/h2>/g, '<h2>1. Ringkasan Eksekutif Operasi</h2>'],
      [/<span class="kpi-label">Operation Outcome<\/span>/g, '<span class="kpi-label">Hasil Operasi</span>'],
      [/<span class="kpi-label">Operational Day<\/span>/g, '<span class="kpi-label">Hari Operasi</span>'],
      [/<span class="kpi-label">Theatre Posture<\/span>/g, '<span class="kpi-label">Postur Teater</span>'],
      [/<span class="kpi-label">Sector Conditions<\/span>/g, '<span class="kpi-label">Kondisi Sektor</span>'],
      [/(\d+)(?:ST|ND|RD|TH) DAY/g, 'HARI KE-$1'],
      [/ASSAULT<\/span>/g, 'MENYERANG</span>'],
      [/<th>Force Comparison Metric<\/th>/g, '<th>Indikator Perbandingan Kekuatan</th>'],
      [/<strong>Personnel Attrition \(KIA \+ WIA \+ POW\)<\/strong>/g, '<strong>Kerugian Personel (Gugur + Luka + Tawanan)</strong>'],
      [/<strong>KIA : WIA Ratio<\/strong>/g, '<strong>Rasio Gugur (KIA) : Luka (WIA)</strong>'],
      [/<strong>AFV Losses \(Disabled \/ Destroyed KO\)<\/strong>/g, '<strong>Kerugian Ranpur (Lumpuh / Hancur Total)</strong>'],
      [/<strong>Formations Intact \/ Deployed<\/strong>/g, '<strong>Satuan Siap Tempur / Dikerahkan</strong>'],
      [/<strong>Theatre Depot Logistics \(Rem \/ Start\)<\/strong>/g, '<strong>Logistik Depot Teater (Sisa / Awal)</strong>'],
      [/<strong>Formations Reaching Critical Supply<\/strong>/g, '<strong>Satuan Mencapai Logistik Kritis</strong>'],
      [/expended\)/g, 'terpakai)'],
      [/<h2>2\. Order of Battle &amp; Casualty Ledger<\/h2>/g, '<h2>2. Susunan Tempur (ORBAT) &amp; Daftar Korban</h2>'],
      [/COMMANDING OFFICER:/g, 'KOMANDAN SATUAN:'],
      [/FORMATIONS ACTIVE:/g, 'SATUAN AKTIF:'],
      [/<th>Unit Designation<\/th>/g, '<th>Nama Satuan</th>'],
      [/<th>Class \/ Exp<\/th>/g, '<th>Klasifikasi / Exp</th>'],
      [/<th>Final Status<\/th>/g, '<th>Status Akhir</th>'],
      [/<th class="num">Start<\/th>/g, '<th class="num">Awal</th>'],
      [/<th class="num">Rem<\/th>/g, '<th class="num">Sisa</th>'],
      [/<th class="num">KIA<\/th>/g, '<th class="num">Gugur</th>'],
      [/<th class="num">WIA<\/th>/g, '<th class="num">Luka</th>'],
      [/<th class="num">POW<\/th>/g, '<th class="num">Twn</th>'],
      [/<th class="num">ESC<\/th>/g, '<th class="num">Lolos</th>'],
      [/<th class="num">AFV \(Start \| Act\/Rec\/Tow\/KO\)<\/th>/g, '<th class="num">Ranpur (Awal | Akt/Rsk/Trk/Hnc)</th>'],
      [/<th class="num">Inflicted \(Cas\/AFV\)<\/th>/g, '<th class="num">Hasil (Pers/Ranpur)</th>'],
      [/<strong>FORCE TOTALS<\/strong>/g, '<strong>JUMLAH TOTAL SATUAN</strong>'],
      [/<td>OPERATIONAL<\/td>/g, '<td>SIAP TEMPUR</td>'],
      [/<td>DISMOUNTED \(OP\)<\/td>/g, '<td>TURUN KENDARAAN (AKTIF)</td>'],
      [/<td>REAR RALLY<\/td>/g, '<td>KONSOLIDASI BELAKANG</td>'],
      [/<td>WITHDRAWN \(0 AFV\)<\/td>/g, '<td>MUNDUR (0 RANPUR)</td>'],
      [/<td>WITHDRAWN \(UNSCREENED\)<\/td>/g, '<td>MUNDUR (TANPA PENGAWAL)</td>'],
      [/<td>ROUTED<\/td>/g, '<td>KOCAR-KACIR</td>'],
      [/<td>DISPERSED<\/td>/g, '<td>TERCERAI-BERAI</td>'],
      [/<td>SHATTERED<\/td>/g, '<td>HANCUR MORAL</td>'],
      [/<td>WIPED OUT<\/td>/g, '<td>GUGUR SEMUA</td>'],
      [/<td>OUT OF ACTION<\/td>/g, '<td>NONAKTIF</td>'],
      [/HEROIC VICTORY/g, 'KEMENANGAN HEROIK'],
      [/DECISIVE VICTORY/g, 'KEMENANGAN TELAK'],
      [/CLOSE VICTORY/g, 'KEMENANGAN TIPIS'],
      [/PYRRHIC VICTORY/g, 'KEMENANGAN MAHAL'],
      [/MUTUAL EXHAUSTION/g, 'KELELAHAN BERSAMA (SERI)'],
      [/<h2>3\. Material Recovery &amp; Battlefield Salvage<\/h2>/g, '<h2>3. Pemulihan Materiil &amp; Rampasan Medan</h2>'],
      [/VICTOR FIELD POSSESSION/g, 'PENGUASAAN MEDAN OLEH PEMENANG'],
      [/abandoned enemy armored hulls secured on the objective\./g, 'unit ranpur musuh yang ditinggalkan berhasil diamankan di sasaran.'],
      [/Captured &amp; Impressed into Service:/g, 'Dirampas &amp; Dioperasikan Kembali:'],
      [/Stripped for Depot Spares &amp; Munitions:/g, 'Dilucuti untuk Suku Cadang &amp; Munisi Depot:'],
      [/Scuttled \/ Destroyed Write-Offs:/g, 'Dihancurkan / Rusak Total:'],
      [/vehicle\(s\)/g, 'unit ranpur'],
      [/No abandoned enemy armored vehicles were claimed during this reporting period\./g, 'Tidak ada ranpur musuh yang ditinggalkan untuk disalvase pada periode laporan ini.'],
      [/<h2>4\. Significant Engagement Chronology<\/h2>/g, '<h2>4. Kronologi Penting Pertempuran</h2>'],
      [/No major milestone events recorded in sitrep log\./g, 'Belum ada peristiwa penting yang tercatat pada log operasi.'],
      [/<h2>5\. G-3 Operational Assessment &amp; Authentication<\/h2>/g, '<h2>5. Evaluasi Staf Operasi (SOPS) &amp; Pengesahan</h2>'],
      [/Total recorded personnel casualties:/g, 'Total kerugian personel tercatat:'],
      [/sustained ([\d,]+) casualties \(([\d,]+) KIA, ([\d,]+) WIA, ([\d,]+) POW\)/g, 'menderita $1 korban ($2 Gugur, $3 Luka, $4 Tawanan)'],
      [/Armored vehicle losses:/g, 'Kerugian kendaraan tempur:'],
      [/lost (\d+) vehicles \((\d+) destroyed, (\d+) disabled\)/g, 'kehilangan $1 ranpur ($2 hancur total, $3 lumpuh)'],
      [/Notable Formation \(([^)]+)\):/g, 'Satuan Menonjol ($1):'],
      [/Anti-Armor Citation \(([^)]+)\):/g, 'Penghargaan Anti-Ranpur ($1):'],
      [/Field Maintenance:/g, 'Pemeliharaan Lapangan (Peralatan):'],
      [/Fire Support Impact:/g, 'Kontribusi Bantuan Tembakan:'],
      [/Air Interdiction:/g, 'Dukungan Udara:'],
      [/Logistics Expenditure:/g, 'Pengeluaran Logistik Depot:'],
      [/inflicted the highest enemy personnel losses \(([\d,]+) casualties\)\./g, 'menimbulkan korban personel musuh tertinggi ($1 korban).'],
      [/led anti-armor engagements with (\d+) enemy vehicles knocked out \((\d+) destroyed\)\./g, 'memimpin pertempuran anti-baja dengan melumpuhkan $1 ranpur musuh ($2 hancur total).'],
      [/organic recovery crews restored (\d+) disabled armored vehicles back to operational status during the engagement\./g, 'kru perbaikan organiknya memulihkan $1 ranpur lumpuh kembali siap tempur di tengah operasi.'],
      [/indirect fire accounted for (\d+)% of opposing combat casualties \(([\d,]+)\)/g, 'tembakan tidak langsung (artileri/mortir) menyumbang $1% korban tempur musuh ($2 korban)'],
      [/indirect fire accounted for (\d+)% \(([\d,]+)\)/g, 'tembakan tidak langsung menyumbang $1% ($2 korban)'],
      [/expended (\d+)% of theatre depot stocks/g, 'menghabiskan $1% stok depot teater'],
      [/expended (\d+)%/g, 'menghabiskan $1%'],
      [/remaining/g, 'tersisa'],
      [/formation\(s\) hit critical supply/g, 'satuan menyentuh logistik kritis'],
      [/depot critical at/g, 'depot kritis pukul'],
      [/<strong>PREPARING OFFICER \(G-3 OPS\)<\/strong><br>\s*IRON DIVISION COMMAND STAFF/g, '<strong>PERWIRA PENYUSUN (PABAN OPS / SOPS TNI AD)</strong><br>STAF OPERASI KOMANDO DIVISI BESI'],
      [/<strong>REVIEWING COMMANDER<\/strong>/g, '<strong>PANGLIMA / KOMANDAN PENINJAU</strong>']
    ];
    for (const [re, rep] of idRepl) {
      html = html.replace(re, rep);
    }
    html = html.replace(/<div class="chron-item">([\s\S]*?)<\/div>/g, function(m, inner) {
      return '<div class="chron-item">' + translateCombatLogText(inner) + '</div>';
    });
    return html;
  }

  function translateImmediateAARModal() {
    const titleEl = document.getElementById('modal-winner-title');
    const bodyEl = document.getElementById('modal-report-body');
    if (titleEl && titleEl.textContent) {
      titleEl.textContent = titleEl.textContent
        .replace(/LIVE OPERATIONAL SITREP/g, 'LAPORAN SITUASI SEMENTARA (LAPSIT)')
        .replace(/\(IN PROGRESS\)/g, '(BERLANGSUNG)')
        .replace(/MUTUAL EXHAUSTION — DRAW/g, 'KELELAHAN BERSAMA — SERI')
        .replace(/HEROIC VICTORY/g, 'KEMENANGAN HEROIK')
        .replace(/DECISIVE VICTORY/g, 'KEMENANGAN TELAK')
        .replace(/CLOSE VICTORY/g, 'KEMENANGAN TIPIS')
        .replace(/PYRRHIC VICTORY/g, 'KEMENANGAN MAHAL');
    }
    if (!bodyEl) return;
    let h = bodyEl.innerHTML;
    const modalRepl = [
      [/UNCLASSIFIED \/\/ SIMULATION OPS/g, 'TERBATAS // STAF OPERASI TNI AD (SOPS)'],
      [/DOC-REF:/g, 'NO. LAP:'],
      [/DTG:/g, 'TW:'],
      [/OP WINDOW:/g, 'PERIODE OPS:'],
      [/1\. OUTCOME \/ DEGREE/g, '1. HASIL / TINGKAT'],
      [/2\. DURATION \/ RATIO/g, '2. DURASI / RASIO'],
      [/3\. SECTOR \/ FEATURE/g, '3. SEKTOR / FITUR'],
      [/4\. METEO \/ POSTURE/g, '4. CUACA / POSTUR'],
      [/IN PROGRESS/g, 'BERLANGSUNG'],
      [/HEROIC VICTORY/g, 'KEMENANGAN HEROIK'],
      [/DECISIVE VICTORY/g, 'KEMENANGAN TELAK'],
      [/CLOSE VICTORY/g, 'KEMENANGAN TIPIS'],
      [/PYRRHIC VICTORY/g, 'KEMENANGAN MAHAL'],
      [/SIDE A —/g, 'PIHAK A —'],
      [/SIDE B —/g, 'PIHAK B —'],
      [/SIDE A ATK/g, 'PIHAK A MENYERANG'],
      [/SIDE B ATK/g, 'PIHAK B MENYERANG'],
      [/EXCH /g, 'RASIO '],
      [/SECTION 2A \/\//g, 'BAGIAN 2A //'],
      [/SECTION 2B \/\//g, 'BAGIAN 2B //'],
      [/COMMANDING OFFICER:/g, 'KOMANDAN SATUAN:'],
      [/<th>Formation<\/th>/g, '<th>Satuan</th>'],
      [/<th>Status<\/th>/g, '<th>Status</th>'],
      [/<th class="text-right">Strength<\/th>/g, '<th class="text-right">Kekuatan</th>'],
      [/<th class="text-right">KIA \/ WIA<\/th>/g, '<th class="text-right">Gugur / Luka</th>'],
      [/<th class="text-right">POW \/ ESC<\/th>/g, '<th class="text-right">Twn / Lolos</th>'],
      [/<th class="text-right">AFV \(Start \| Act\/Rec\/Tow\/KO\)<\/th>/g, '<th class="text-right">Ranpur (Awal | Akt/Rsk/Trk/Hnc)</th>'],
      [/<th class="text-right">Inflicted \(Cas\/AFV\)<\/th>/g, '<th class="text-right">Hasil (Pers/Ranpur)</th>'],
      [/TOTALS \((\d+\/\d+) ACTIVE\)/g, 'TOTAL ($1 AKTIF)'],
      [/SECTION 5 \/\/ G-3 OPERATIONAL ASSESSMENT/g, 'BAGIAN 5 // EVALUASI STAF OPERASI (SOPS TNI AD)'],
      [/>OPERATIONAL</g, '>SIAP TEMPUR<'],
      [/DISMOUNTED \(OP\)/g, 'TURUN KENDARAAN (AKTIF)'],
      [/REAR RALLY/g, 'KONSOLIDASI BELAKANG'],
      [/WITHDRAWN \(0 AFV\)/g, 'MUNDUR (0 RANPUR)'],
      [/WITHDRAWN \(UNSCREENED\)/g, 'MUNDUR (TANPA PENGAWAL)'],
      [/ROUTED/g, 'KOCAR-KACIR'],
      [/DISPERSED/g, 'TERCERAI-BERAI'],
      [/SHATTERED/g, 'HANCUR MORAL'],
      [/WIPED OUT/g, 'GUGUR SEMUA'],
      [/OUT OF ACTION/g, 'NONAKTIF'],
      [/SECTION 3 \/\/ BATTLEFIELD SALVAGE &amp; CAPTURED MATERIAL/g, 'BAGIAN 3 // SALVASE MEDAN &amp; RAMPASAN MATERIIL'],
      [/field recovery units secured <b>(\d+)<\/b> abandoned enemy combat hulls:/g, 'tim evakuasi lapangan mengamankan <b>$1</b> ranpur musuh yang ditinggalkan:'],
      [/CAPTURED &amp; IMPRESSED:/g, 'DIRAMPAS &amp; DIPAKAI LAGI:'],
      [/STRIPPED FOR DEPOT:/g, 'DILUCUTI UNTUK DEPOT:'],
      [/SCUTTLED \/ WRITE-OFF:/g, 'DIHANCURKAN / RUSAK TOTAL:'],
      [/SECTION 4 \/\/ SIGNIFICANT ENGAGEMENT CHRONOLOGY/g, 'BAGIAN 4 // KRONOLOGI PENTING PERTEMPURAN'],
      [/Engagement remains active at Round (\d+); telemetry reflects live frontline status\./g, 'Pertempuran masih berlangsung pada Ronde $1; data menampilkan kondisi garis depan terkini.'],
      [/Classification:/g, 'Klasifikasi:'],
      [/secured the ([^ ]+) \(([^)]+)\) sector in Round (\d+) after neutralizing ([^'<]+?)(?:'s|&#39;s) frontline cohesion\./g, 'menguasai sektor $1 ($2) pada Ronde $3 setelah melumpuhkan kohesi garis depan $4.'],
      [/Personnel attrition stands at (\d+%) for (.+?) \(([\d,]+) total losses\) versus (\d+%) for (.+?) \(([\d,]+) total losses\)\./g, 'Kerugian personel mencapai $1 untuk $2 ($3 total korban) berbanding $4 untuk $5 ($6 total korban).'],
      [/Armored vehicle losses:/g, 'Kerugian ranpur:'],
      [/knocked out \((\d+) total write-offs\)/g, 'lumpuh ($1 hancur total)'],
      [/Notable Formation \(([^)]+)\):/g, 'Satuan Menonjol ($1):'],
      [/Anti-Armor Citation \(([^)]+)\):/g, 'Penghargaan Anti-Ranpur ($1):'],
      [/Field Maintenance:/g, 'Pemeliharaan Lapangan:'],
      [/Fire Support Impact:/g, 'Kontribusi Bantuan Tembakan:'],
      [/Air Interdiction:/g, 'Dukungan Udara:'],
      [/Logistics Expenditure:/g, 'Pengeluaran Logistik Depot:'],
      [/inflicted the highest enemy personnel losses \(([\d,]+) casualties\)\./g, 'menimbulkan korban personel musuh tertinggi ($1 korban).'],
      [/led anti-armor engagements with (\d+) enemy vehicles knocked out \((\d+) destroyed\)\./g, 'memimpin pertempuran anti-baja dengan melumpuhkan $1 ranpur musuh ($2 hancur total).'],
      [/organic recovery crews restored (\d+) disabled armored vehicles back to operational status during the engagement\./g, 'kru perbaikan organiknya memulihkan $1 ranpur lumpuh kembali siap tempur.'],
      [/indirect fire accounted for (\d+%) of opposing combat casualties \(([\d,]+)\)/g, 'tembakan tidak langsung menyumbang $1 korban musuh ($2 korban)'],
      [/indirect fire accounted for (\d+%) \(([\d,]+)\)/g, 'tembakan tidak langsung menyumbang $1 ($2 korban)'],
      [/expended (\d+%) of theatre depot stocks/g, 'menghabiskan $1 stok depot teater'],
      [/expended (\d+%)/g, 'menghabiskan $1'],
      [/remaining/g, 'tersisa'],
      [/formation\(s\) hit critical supply/g, 'satuan menyentuh logistik kritis'],
      [/depot critical at/g, 'depot kritis pukul'],
      [/Field recovery teams secured (\d+) abandoned enemy hulls \((\d+) impressed into service, \+(\d+) depot supply stripped\)\./g, 'Tim evakuasi mengamankan $1 ranpur musuh ($2 dioperasikan kembali, +$3 logistik depot hasil lucutan).']
    ];
    for (const [re, rep] of modalRepl) {
      h = h.replace(re, rep);
    }
    h = h.replace(/<div class="border-l-2 border-\[#2f3b2e\] pl-2">([\s\S]*?)<\/div>/g, function(m, inner) {
      return '<div class="border-l-2 border-[#2f3b2e] pl-2">' + translateCombatLogText(inner) + '</div>';
    });
    bodyEl.innerHTML = h;
  }

  function hookPrintableAAR() {
    if (origBuildPrintableAAR || !ID.UI || typeof ID.UI.buildPrintableAARHtml !== 'function') return;
    origBuildPrintableAAR = ID.UI.buildPrintableAARHtml;
    const wrappedBuild = (rep) => (currentLang === 'id') ? buildTniAdPrintableAARHtml(rep) : origBuildPrintableAAR(rep);
    ID.UI.buildPrintableAARHtml = wrappedBuild;
    window.buildPrintableAARHtml = wrappedBuild;

    if (typeof ID.UI.openBattleSummaryModal === 'function' && !origOpenBattleModal) {
      origOpenBattleModal = ID.UI.openBattleSummaryModal;
      const wrappedOpenModal = () => {
        origOpenBattleModal();
        if (currentLang === 'id') {
          translateImmediateAARModal();
        }
      };
      ID.UI.openBattleSummaryModal = wrappedOpenModal;
      window.openBattleSummaryModal = wrappedOpenModal;
    }

    if (typeof ID.UI.exportAARToPDF === 'function' && !origExportAARToPDF) {
      origExportAARToPDF = ID.UI.exportAARToPDF;
      const wrappedExport = () => {
        if (currentLang !== 'id') return origExportAARToPDF();
        const rep = ID.UI.getActiveAARData ? ID.UI.getActiveAARData() : (ID.state?.battle?.afterActionReport || null);
        if (!rep) {
          if (ID.Helpers && ID.Helpers.showToast) ID.Helpers.showToast('Belum ada data pertempuran aktif untuk diekspor.', 'warn');
          return;
        }
        const htmlDoc = buildTniAdPrintableAARHtml(rep);
        const win = window.open('', '_blank', 'width=980,height=820');
        if (!win) {
          if (ID.Helpers && ID.Helpers.showToast) ID.Helpers.showToast('Izinkan pop-up browser untuk mencetak Laporan TNI AD (PDF).', 'danger');
          return;
        }
        win.document.open();
        win.document.write(htmlDoc);
        win.document.close();
        win.focus();
        setTimeout(() => { try { win.print(); } catch (_) {} }, 350);
      };
      ID.UI.exportAARToPDF = wrappedExport;
      window.exportAARToPDF = wrappedExport;
    }
  }

  function applyLanguageToSubtree(root, lang) {
    if (!root) return;
    isApplying = true;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        if (shouldSkipNode(node)) continue;
        if (!originalTextMap.has(node)) {
          originalTextMap.set(node, node.nodeValue);
        }
        const orig = originalTextMap.get(node);
        const inCombatLog = !!(node.parentElement && node.parentElement.closest('#combat-log-container, #log-expand-container'));
        const targetVal = (lang === 'id') ? (inCombatLog ? translateCombatLogText(orig) : translateText(orig)) : orig;
        if (node.nodeValue !== targetVal) {
          node.nodeValue = targetVal;
        }
      }

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

  function hookManualRenderer() {
    if (origRenderGuide || !ID.Guide || typeof ID.Guide.renderSimulationGuide !== 'function') return;
    origRenderGuide = ID.Guide.renderSimulationGuide;
    const wrapped = () => {
      if (currentLang === 'id') {
        renderIndonesianManuals();
      } else {
        origRenderGuide();
      }
    };
    ID.Guide.renderSimulationGuide = wrapped;
    window.renderSimulationGuide = wrapped;
  }

  function updateToggleButton() {
    const btn = document.getElementById('btn-lang-toggle');
    if (!btn) return;
    btn.textContent = currentLang === 'id' ? 'ID' : 'EN';
    btn.title = currentLang === 'id'
      ? 'Bahasa Indonesia aktif — klik untuk ganti ke Bahasa Inggris (EN)'
      : 'English active — click to switch UI & Manuals to Bahasa Indonesia (ID)';
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

    hookManualRenderer();
    hookPrintableAAR();
    applyDataLocalization(currentLang);
    applyWelcomeModalLanguage(currentLang);
    updateToggleButton();

    // Re-render dynamic views so updated data.js names/descriptions & manuals appear immediately
    isApplying = true;
    try {
      if (ID.UI && typeof ID.UI.renderAll === 'function') {
        ID.UI.renderAll();
      }
      if (ID.Guide && typeof ID.Guide.renderSimulationGuide === 'function') {
        ID.Guide.renderSimulationGuide();
      }
    } finally {
      isApplying = false;
    }

    if (document.body) {
      applyLanguageToSubtree(document.body, currentLang);
    }
  }

  function toggleLanguage() {
    setLanguage(currentLang === 'id' ? 'en' : 'id');
  }

  function initI18n() {
    let saved = 'en'; // Default language is English
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'id') saved = stored;
    } catch (_) {}

    hookManualRenderer();
    hookPrintableAAR();
    injectLanguageToggleButton();
    startObserver();
    setLanguage(saved);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(initI18n, 40));
  } else {
    setTimeout(initI18n, 40);
  }

  ID.I18n = {
    setLanguage,
    toggleLanguage,
    getLanguage: () => currentLang,
    localizeField,
    translateText,
    translateCombatLogText,
    buildTniAdPrintableAARHtml,
    renderIndonesianManuals,
    EXACT_MAP
  };

  window.setIronDivisionLanguage = setLanguage;
  window.toggleIronDivisionLanguage = toggleLanguage;

})(window.IronDivision);