export type AppLanguage = 'EN' | 'HI' | 'AS' | 'MN' | 'MZ' | 'BN';

export interface Translations {
  [key: string]: {
    EN: string;
    HI: string;
    AS: string;
    MN: string;
    MZ: string;
    BN: string;
  };
}

export const TRANSLATIONS: Translations = {
  // App Title & Header
  app_title: {
    EN: 'RAKSHAK',
    HI: 'RAKSHAK',
    AS: 'RAKSHAK',
    MN: 'RAKSHAK',
    MZ: 'RAKSHAK',
    BN: 'RAKSHAK'
  },
  sih_badge: {
    EN: 'SIH 26001',
    HI: 'एस.आई.एच 26001',
    AS: 'এছ.আই.এইচ ২৬০০১',
    MN: 'SIH ২৬০০১',
    MZ: 'SIH 26001',
    BN: 'এসআইএইচ ২৬০০১'
  },
  ministry_sub: {
    EN: 'Ministry of Development of North Eastern Region (MDoNER) • 8 NER States',
    HI: 'उत्तर पूर्वी क्षेत्र विकास मंत्रालय (MDoNER) • 8 पूर्वोत्तर राज्य',
    AS: 'উত্তৰ-পূৰ্বাঞ্চল উন্নয়ন মন্ত্ৰালয় (MDoNER) • ৮খন উত্তৰ-পূৰ্ব ৰাজ্য',
    MN: 'অৱাং নোংপোক চাউখৎ-থৌরাংগী মন্ত্রালয় (MDoNER) • রাজ্য ৮',
    MZ: 'Hmar Chhak Bial Hmasawnna Ministry (MDoNER) • State 8',
    BN: 'উত্তর-পূর্বাঞ্চল উন্নয়ন মন্ত্রক (MDoNER) • ৮টি উত্তর-পূর্ব রাজ্য'
  },
  live_telemetry: {
    EN: 'OBSERVED LIVE TELEMETRY',
    HI: 'सक्रिय लाइव टेलीमेट्री',
    AS: 'প্ৰত্যক্ষ লাইভ টেলিমিত্ৰি',
    MN: 'লাইভ তেলেমেট্রি উরিবা',
    MZ: 'LIVE TELEMETRY ENIKAWL MEK',
    BN: 'সরাসরি লাইভ টেলিমেট্রি'
  },
  simulation_active: {
    EN: 'SIMULATION MODE ACTIVE',
    HI: 'सिमुलेशन मोड सक्रिय',
    AS: 'চিমুলেচন ম’ড সক্ৰিয়',
    MN: 'সিমুলেশন মোড চৎনরিবা',
    MZ: 'LEILON ENCHHINNA HMANG MEK',
    BN: 'সিমুলেশন মোড সক্রিয়'
  },
  sys_health: {
    EN: 'SYS HEALTH: 98.6%',
    HI: 'सिस्टम स्वास्थ्य: 98.6%',
    AS: 'প্ৰণালীৰ স্বাস্থ্য: ৯৮.৬%',
    MN: 'সিষ্টেম হকশেল: ৯৮.৬%',
    MZ: 'KHAWL HMAWR: 98.6%',
    BN: 'সিস্টেম স্বাস্থ্য: ৯৮.৬%'
  },
  offline_cache: {
    EN: 'OFFLINE (PWA CACHE)',
    HI: 'ऑफ़लाइन (कैश मोड)',
    AS: 'অফলাইন (কেশ্ব ম’ড)',
    MN: 'ওফলাইন (কেস মেমোরি)',
    MZ: 'OFFLINE (CACHE HMANG)',
    BN: 'অফলাইন (ক্যাশ মোড)'
  },
  active_sos_badge: {
    EN: 'ACTIVE SOS',
    HI: 'सक्रिय आपातकालीन संकेत',
    AS: 'সক্ৰিয় জৰুৰী সংকেত',
    MN: 'মথৌ তৌরিবা এস.ও.এস',
    MZ: 'CHHANCHHUAH NGENNA',
    BN: 'সক্রিয় জরুরি এসওএস'
  },
  nav_analytics: {
    EN: 'Analytics',
    HI: 'विश्लेषण',
    AS: 'বিশ্লেষণ',
    MN: 'এনালিটিক্স',
    MZ: 'Chhutna',
    BN: 'বিশ্লেষণ'
  },
  nav_benchmark: {
    EN: 'AI Benchmark',
    HI: 'एआई बेंचमार्क',
    AS: 'এআই বেঞ্চমাৰ্ক',
    MN: 'AI বেঞ্চমার্ক',
    MZ: 'AI Benchmark',
    BN: 'এআই বেঞ্চমার্ক'
  },
  nav_data_health: {
    EN: 'Data Health',
    HI: 'डेटा स्वास्थ्य',
    AS: 'তথ্য স্থিতি',
    MN: 'দতা হকশেল',
    MZ: 'Data Dinhmun',
    BN: 'ডেটা স্বাস্থ্য'
  },
  nav_sar_swipe: {
    EN: 'SAR Swipe',
    HI: 'एसएआर स्वाइप',
    AS: 'এছ.এ.আৰ স্বাইপ',
    MN: 'SAR স্বাইপ',
    MZ: 'SAR Swipe',
    BN: 'এসএআর সোয়াইপ'
  },
  nav_what_if: {
    EN: 'What-If Sim',
    HI: 'व्हाट-इफ़ सिमुलेशन',
    AS: 'হোৱাট-ইফ অনুকাৰক',
    MN: 'What-If সিমুলেশন',
    MZ: 'Enchhinna (What-If)',
    BN: 'হোয়াট-ইফ সিমুলেশন'
  },
  nav_cascading: {
    EN: 'Cascading Risks',
    HI: 'श्रृंखलाबद्ध जोखिम',
    AS: 'ক্ৰমবৰ্ধমান বিপদ',
    MN: 'কেসকেদিং রিস্ক',
    MZ: 'Inzawm Hlauhawm',
    BN: 'ধারাবাহিক ঝুঁকি'
  },
  nav_transparency: {
    EN: 'Model XAI',
    HI: 'मॉडल पारदर्शिता (XAI)',
    AS: 'মডেল স্বচ্ছতা (XAI)',
    MN: 'মোদেল XAI',
    MZ: 'Model Transparency',
    BN: 'মডেল স্বচ্ছতা (XAI)'
  },
  btn_command_center: {
    EN: 'Command Center',
    HI: 'कमांड सेंटर',
    AS: 'কমাণ্ড চেণ্টাৰ',
    MN: 'কমান্ড সেন্টার',
    MZ: 'Thuneitu Pual',
    BN: 'কমান্ড সেন্টার'
  },
  btn_citizen_sos: {
    EN: 'Citizen / SOS',
    HI: 'नागरिक / आपातकाल',
    AS: 'নাগৰিক / জৰুৰীকালীন',
    MN: 'প্রজা / এস.ও.এস',
    MZ: 'Mipuite / SOS',
    BN: 'নাগরিক / এসওএস'
  },

  // KPI Bar
  kpi_critical_zones: {
    EN: 'Critical Zones',
    HI: 'अति संवेदनशील क्षेत्र',
    AS: 'অতি সংকটজনক অঞ্চল',
    MN: 'খ্বায়দগী য়াম্না খুদোংথিবা মফম',
    MZ: 'Hmun Hlauhawm Zual',
    BN: 'সংকটপূর্ণ অঞ্চল'
  },
  kpi_warning_zones: {
    EN: 'Warning Zones',
    HI: 'चेतावनी क्षेत्र',
    AS: 'সতৰ্কতামূলক অঞ্চল',
    MN: 'চেকশিনৱা মফমশিং',
    MZ: 'Vaukhanna Hmun',
    BN: 'সতর্ক অঞ্চল'
  },
  kpi_open_sos: {
    EN: 'Open SOS Beacons',
    HI: 'सक्रिय एसओएस संकेत',
    AS: 'সক্ৰিয় এছ.অ’.এছ সংকেত',
    MN: 'এস.ও.এস সংকেত',
    MZ: 'SOS Ngenna Awm Mek',
    BN: 'সক্রিয় এসওএস বার্তা'
  },
  kpi_roads_at_risk: {
    EN: 'Roads at Risk',
    HI: 'जोखिम वाले मार्ग',
    AS: 'বিপদজনক পথসমূহ',
    MN: 'খুদোংথিবা লম্বীশিং',
    MZ: 'Kawng Hlauhawm',
    BN: 'ঝুঁকিপূর্ণ সড়ক'
  },
  kpi_exposed_pop: {
    EN: 'Exposed Population',
    HI: 'प्रभावित आबादी',
    AS: 'প্ৰভাৱিত জনসংখ্যা',
    MN: 'অশোই-অঙাম থোকপা য়াবা মীশিং',
    MZ: 'Mihring Tuartur zat',
    BN: 'ঝুঁকিতে থাকা জনসংখ্যা'
  },
  kpi_citizen_reports: {
    EN: 'Citizen Reports',
    HI: 'नागरिक रिपोर्ट',
    AS: 'নাগৰিক প্ৰতিবেদন',
    MN: 'প্রজানা পীরকপা পাও',
    MZ: 'Mipuite Report',
    BN: 'নাগরিক রিপোর্ট'
  },
  districts_unit: {
    EN: 'Districts',
    HI: 'जिले',
    AS: 'জিলা',
    MN: 'জিলাশিং',
    MZ: 'District-te',
    BN: 'জেলা'
  },
  corridors_unit: {
    EN: 'Corridors',
    HI: 'कॉरिडोर',
    AS: 'কৰিডৰ',
    MN: 'করিডোর',
    MZ: 'Kawngpui',
    BN: 'করিডোর'
  },
  submitted_unit: {
    EN: 'Submitted',
    HI: 'दर्ज',
    AS: 'দাখিল কৰা হ’ল',
    MN: 'পীরকখ্রে',
    MZ: 'Thehluh zat',
    BN: 'দাখিলকৃত'
  },

  // Sub-tabs
  tab_gis_command: {
    EN: 'GIS Spatial Command',
    HI: 'जीआईएस स्थानिक कमान',
    AS: 'জি.আই.এছ স্থানিক কমাণ্ড',
    MN: 'GIS স্পেসিয়াল কমান্ড',
    MZ: 'GIS Map Enna',
    BN: 'জিআইএস স্থানিক কমান্ড'
  },
  tab_sos_queue: {
    EN: 'Priority SOS Queue',
    HI: 'प्राथमिकता एसओएस कतार',
    AS: 'প্ৰাথমিক এছ.অ’.এছ শাৰী',
    MN: 'এস.ও.এস প্রায়োরিটি',
    MZ: 'SOS Enkawlna Hmun',
    BN: 'অগ্রাধিকার এসওএস সারি'
  },
  tab_citizen_triage: {
    EN: 'Citizen Reports AI Triage',
    HI: 'नागरिक रिपोर्ट एआई वर्गीकरण',
    AS: 'নাগৰিক প্ৰতিবেদন এআই পৰীক্ষা',
    MN: 'প্রজাগী পাও AI ত্রায়াজ',
    MZ: 'Mipuite Report AI Triage',
    BN: 'নাগরিক রিপোর্ট এআই ট্রায়াজ'
  },
  tab_isolation_studio: {
    EN: 'Lifelines & Village Isolation',
    HI: 'राजमार्ग एवं ग्राम पृथक्करण विश्लेषण',
    AS: 'ঘাইপথ আৰু গাঁও বিচ্ছিন্নতা বিশ্লেষণ',
    MN: 'লম্বী অমসুং খুঙ্গং তোঙান তৌবা',
    MZ: 'Kawngpui leh Khaw Inlaichinna',
    BN: 'সড়ক ও গ্রাম বিচ্ছিন্নতা বিশ্লেষণ'
  },

  // Priority SOS Queue
  sos_queue_title: {
    EN: 'Emergency Priority SOS Dispatch Queue',
    HI: 'आपातकालीन प्राथमिकता एसओएस प्रेषण कतार',
    AS: 'জৰুৰীকালীন প্ৰাথমিক এছ.অ’.এছ প্ৰেৰণ শাৰী',
    MN: 'ইমার্জেন্সি প্রায়োরিটি এস.ও.এস দিস্পেচ ক্যূ',
    MZ: 'Chhanchhuah Hnathawh Hmanhmawh Thlan Chhuahna',
    BN: 'জরুরি অগ্রাধিকার এসওএস প্রেরণ সারি'
  },
  realtime_stream: {
    EN: 'Real-Time WebSocket Stream',
    HI: 'रीयल-टाइम वेबसॉकेट स्ट्रीम',
    AS: 'প্ৰত্যক্ষ ৱেবচকেট ষ্ট্ৰীম',
    MN: 'রিয়েল-টাইম ৱেবসকেট স্ত্রিম',
    MZ: 'Real-Time WebSocket Stream',
    BN: 'রিয়েল-টাইম ওয়েবসকেট স্ট্রিম'
  },
  no_sos_msg: {
    EN: 'No active emergency SOS distress signals at this moment.',
    HI: 'इस समय कोई सक्रिय आपातकालीन एसओएस संकेत नहीं है।',
    AS: 'এই মুহূৰ্তত কোনো সক্ৰিয় জৰুৰীকালীন সংকেত নাই।',
    MN: 'হৌজিক্কী ওইনা করিগুম্বা ইমার্জেন্সি এস.ও.এস সংকেত লৈতে।',
    MZ: 'Tun dinhmunah chhanhim ngenna a awm rih lo.',
    BN: 'এই মুহূর্তে কোনো সক্রিয় জরুরি এসওএস বার্তা নেই।'
  },
  dispatch_sdrf_btn: {
    EN: 'Dispatch SDRF Unit Now',
    HI: 'एसडीआरएफ इकाई तुरंत रवाना करें',
    AS: 'এছ.ডি.আৰ.এফ দল তৎক্ষণাত প্ৰেৰণ কৰক',
    MN: 'SDRF য়ুনিট অথুবা মতমদা থাখ্রো',
    MZ: 'SDRF Unit Tir nghal rawh',
    BN: 'এখনই এসডিআরএফ ইউনিট পাঠান'
  },
  mark_resolved_btn: {
    EN: 'Mark Evacuated & Resolved',
    HI: 'सुरक्षित निकाला गया एवं पूर्ण',
    AS: 'সুৰক্ষিতভাৱে উদ্ধাৰ আৰু সমাপ্ত',
    MN: 'কনখ্রে অমসুং লোইশিনখ্রে',
    MZ: 'Chhanhim fel tawh tiin chhinchhiah rawh',
    BN: 'উদ্ধার সম্পন্ন ও সমাধান হিসেবে চিহ্নিত করুন'
  },
  locate_on_map: {
    EN: 'Locate on GIS Map →',
    HI: 'जीआईएस मानचित्र पर देखें →',
    AS: 'জি.আই.এছ মানচিত্ৰত চাওক →',
    MN: 'GIS মেপ্তা য়েংবা →',
    MZ: 'Map-ah Zawng rawh →',
    BN: 'জিআইএস মানচিত্রে দেখুন →'
  },
  assigned_unit: {
    EN: 'Assigned Unit',
    HI: 'तैनात इकाई',
    AS: 'নিয়োগ কৰা দল',
    MN: 'থারিবা য়ুনিট',
    MZ: 'Tirh tawh Unit',
    BN: 'নিযুক্ত ইউনিট'
  },
  people_affected: {
    EN: 'person(s) affected',
    HI: 'व्यक्ति प्रभावित',
    AS: 'জন লোক প্ৰভাৱিত',
    MN: 'মীওই অশোই-অঙাম থোকখ্রে',
    MZ: 'mihring tuartu',
    BN: 'জন ক্ষতিগ্রস্ত'
  },

  // Citizen Reports AI Triage
  triage_title: {
    EN: 'Citizen Field Reports & AI Computer Vision Triage',
    HI: 'नागरिक फ़ील्ड रिपोर्ट एवं एआई कंप्यूटर विज़न वर्गीकरण',
    AS: 'নাগৰিক ক্ষেত্ৰ প্ৰতিবেদন আৰু এআই কম্পিউটাৰ ভিজন পৰীক্ষা',
    MN: 'প্রজাগী ফিল্ড রিপোর্ট অমসুং AI কম্প্যুতর ভিজন ত্রায়াজ',
    MZ: 'Mipuite Hmunhma Report leh AI Computer Vision Enfiahna',
    BN: 'নাগরিক ফিল্ড রিপোর্ট এবং এআই কম্পিউটার ভিশন ট্রায়াজ'
  },
  verification_pipeline: {
    EN: 'Verification Pipeline',
    HI: 'सत्यापन पाइपलाइन',
    AS: 'সত্যতা নিৰূপণ প্ৰক্ৰিয়া',
    MN: 'ভেরিফিকেশন পাইপলাইন',
    MZ: 'Enfiahna Kalphung',
    BN: 'যাচাইকরণ পাইপলাইন'
  },
  no_reports_msg: {
    EN: 'No citizen incident reports logged yet.',
    HI: 'अभी तक कोई नागरिक घटना रिपोर्ट दर्ज नहीं की गई है।',
    AS: 'এতিয়ালৈকে কোনো নাগৰিক ঘটনা প্ৰতিবেদন পোৱা হোৱা নাই।',
    MN: 'হৌজিক ফাওবদা প্রজাগী পাও অমত্তা লৈতে।',
    MZ: 'Mipuite hnen atangin report a la lut lo.',
    BN: 'এখনও কোনো নাগরিক রিপোর্ট নথিভুক্ত হয়নি।'
  },
  confidence_label: {
    EN: 'Confidence',
    HI: 'सटीकता',
    AS: 'বিশ্বাসযোগ্যতা',
    MN: 'থাজবা',
    MZ: 'Rinna zat',
    BN: 'আত্মবিশ্বাস / নির্ভরযোগ্যতা'
  },
  ai_vision_triage: {
    EN: 'AI Vision Triage',
    HI: 'एआई विज़न विश्लेषण',
    AS: 'এআই ভিজন নিৰীক্ষণ',
    MN: 'AI ভিজন ত্রায়াজ',
    MZ: 'AI Vision Triage',
    BN: 'এআই ভিশন ট্রায়াজ'
  },

  // GIS Map
  gis_layer_mgr: {
    EN: 'GIS Layer Manager',
    HI: 'जीआईएस परत प्रबंधक',
    AS: 'জি.আই.এছ স্তৰ প্ৰবন্ধক',
    MN: 'GIS লেয়ার মেনেজর',
    MZ: 'GIS Layer Enkawlna',
    BN: 'জিআইএস লেয়ার ম্যানেজার'
  },
  active_geo_layers: {
    EN: 'Active Geospatial Layers',
    HI: 'सक्रिय भू-स्थानिक परतें',
    AS: 'সক্ৰিয় ভৌগোলিক স্তৰসমূহ',
    MN: 'চৎনরিবা জিওস্পেসিয়াল লেয়ারশিং',
    MZ: 'Geospatial Layer Hman Mekte',
    BN: 'সক্রিয় ভৌগোলিক স্তরসমূহ'
  },
  layer_risk_poly: {
    EN: 'Risk Polygons & Heatmap',
    HI: 'जोखिम बहुभुज एवं हीटमैप',
    AS: 'বিপদৰ সীমা আৰু হিটমেপ',
    MN: 'রিস্ক পলিগন অমসুং হিতমেপ',
    MZ: 'Hlauhawm Bial leh Heatmap',
    BN: 'ঝুঁকি পলিগন ও হিটম্যাপ'
  },
  layer_highways: {
    EN: 'Strategic Highways (NH)',
    HI: 'रणनीतिक राष्ट्रीय राजमार्ग',
    AS: 'ৰণনৈতিক ৰাষ্ট্ৰীয় ঘাইপথ (NH)',
    MN: 'মরুওইবা হায়ৱেশিং (NH)',
    MZ: 'National Highway Pawimawhte',
    BN: 'কৌশলগত জাতীয় সড়ক (NH)'
  },
  layer_infra: {
    EN: 'Critical Hospitals & Shelters',
    HI: 'प्रमुख अस्पताल एवं राहत शिविर',
    AS: 'গুৰুত্বপূৰ্ণ চিকিৎসালয় আৰু আশ্ৰয় শিবিৰ',
    MN: 'অনাবাকোন্না অমসুং চেন্দোল মফমশিং',
    MZ: 'Damdawi In leh Chhanchhuah Hmun',
    BN: 'জরুরি হাসপাতাল ও আশ্রয়কেন্দ্র'
  },
  layer_citizen_rep: {
    EN: 'Citizen Reports',
    HI: 'नागरिक रिपोर्ट',
    AS: 'নাগৰিক প্ৰতিবেদনসমূহ',
    MN: 'প্রজাগী পাওশিং',
    MZ: 'Mipuite Report',
    BN: 'নাগরিক রিপোর্ট'
  },
  layer_sos_beacons: {
    EN: 'Active SOS Beacons',
    HI: 'सक्रिय एसओएस बीकन',
    AS: 'সক্ৰিয় এছ.অ’.এছ সংকেতসমূহ',
    MN: 'এস.ও.এস বিকনশিং',
    MZ: 'SOS Beacon Hman Mekte',
    BN: 'সক্রিয় এসওএস বীকন'
  },
  forecast_horizon: {
    EN: 'FORECAST HORIZON:',
    HI: 'पूर्वानुमान समय सीमा:',
    AS: 'পূৰ্বাভাস সময়সীমা:',
    MN: 'ফোরকাষ্ট মতম:',
    MZ: 'KHAWCHIN VENLAWK HUN:',
    BN: 'পূর্বাভাস সময়সীমা:'
  },
  risk_scale: {
    EN: 'RISK SCALE',
    HI: 'जोखिम पैमाना',
    AS: 'বিপদৰ মাত্ৰা',
    MN: 'রিস্ক স্কেল',
    MZ: 'HLAUHAWM ZAT',
    BN: 'ঝুঁকির মাত্রা'
  },
  risk_low: {
    EN: 'LOW (0-24%)',
    HI: 'निम्न (0-24%)',
    AS: 'নিম্ন (০-২৪%)',
    MN: 'নেম্বা (০-২৪%)',
    MZ: 'TLEM (0-24%)',
    BN: 'কম (০-২৪%)'
  },
  risk_watch: {
    EN: 'WATCH (25-49%)',
    HI: 'निगरानी (25-49%)',
    AS: 'নজৰত ৰাখক (২৫-৪৯%)',
    MN: 'য়েংশিনগদবা (২৫-৪৯%)',
    MZ: 'NGHICHHIK (25-49%)',
    BN: 'নজরদারি (২৫-৪৯%)'
  },
  risk_warning: {
    EN: 'WARNING (40-57%)',
    HI: 'चेतावनी (40-57%)',
    AS: 'সতৰ্কবাণী (৪০-৫৭%)',
    MN: 'চেকশিনৱা (৪০-৫৭%)',
    MZ: 'VAUKHANNA (40-57%)',
    BN: 'সতর্কতা (৪০-৫৭%)'
  },
  risk_high: {
    EN: 'HIGH (58-77%)',
    HI: 'उच्च जोखिम (58-77%)',
    AS: 'উচ্চ সংকট (৫৮-৭৭%)',
    MN: 'ৱাংবা (৫৮-৭৭%)',
    MZ: 'SANG (58-77%)',
    BN: 'উচ্চ ঝুঁকি (৫৮-৭৭%)'
  },
  risk_critical: {
    EN: 'CRITICAL (78-100%)',
    HI: 'अति गंभीर (78-100%)',
    AS: 'চৰম সংকটজনক (৭৮-১০০%)',
    MN: 'য়াম্না খুদোংথিবা (৭৮-১০০%)',
    MZ: 'HLAUHAWM ZUAL (78-100%)',
    BN: 'সংকটজনক (৭৮-১০০%)'
  },

  // Location Drawer
  drawer_factors_title: {
    EN: 'Primary Geological & Hydrological Risk Drivers',
    HI: 'प्रमुख भूवैज्ञानिक एवं जलवैज्ञानिक जोखिम कारक',
    AS: 'প্ৰধান ভূতাত্ত্বিক আৰু জলবিজ্ঞানজনিত বিপদ কাৰক',
    MN: 'মরুওইবা চীং-লৈবাক অমসুং ঈশিংগী খুদোংথিবা মরমশিং',
    MZ: 'Leimin Thlentu Bulpui Pawimawhte',
    BN: 'প্রধান ভূতাত্ত্বিক ও জলতাত্ত্বিক ঝুঁকির কারণ'
  },
  drawer_actions_title: {
    EN: 'Recommended Authority Mitigation Actions',
    HI: 'प्रशासन हेतु अनुशंसित आपदा न्यूनीकरण कार्य',
    AS: 'প্ৰশাসনৰ বাবে পৰামৰ্শমূলক প্ৰশমন পদক্ষেপ',
    MN: 'প্রশাসননা লৌখৎকদবা চেকশিন খোঙথাংশিং',
    MZ: 'Thuneitute Hmalakna Tur Rawtnate',
    BN: 'কর্তৃপক্ষের জন্য সুপারিশকৃত প্রশমন পদক্ষেপ'
  },
  drawer_timeline_title: {
    EN: 'Multi-Horizon Forecast Evolution & Rain Accumulation',
    HI: 'बहु-समय सीमा पूर्वानुमान एवं वर्षा संचय',
    AS: 'বহু-সময়সীমাৰ পূৰ্বাভাস আৰু বৰষুণৰ পৰিমাণ',
    MN: 'মতম কয়াগী ফোরকাষ্ট অমসুং নোংচুবা চাং',
    MZ: 'Khawchin leh Ruah Sur Dan Thlirna',
    BN: 'বহু-সময়সীমার পূর্বাভাস ও বৃষ্টিপাত সঞ্চয়'
  },
  btn_download_briefing: {
    EN: 'Download PDF Situational Briefing',
    HI: 'पीडीएफ स्थिति रिपोर्ट डाउनलोड करें',
    AS: 'পিডিএফ স্থিতি প্ৰতিবেদন ডাউনল’ড কৰক',
    MN: 'PDF সিচুয়েশন রিপোর্ট ডাউনলোড তৌবা',
    MZ: 'PDF Briefing Download rawh',
    BN: 'পিডিএফ পরিস্থিতি বিবরণী ডাউনলোড করুন'
  },
  btn_generate_ai_advisory: {
    EN: 'Generate Live AI Advisory',
    HI: 'लाइव एआई परामर्श उत्पन्न करें',
    AS: 'প্ৰত্যক্ষ এআই পৰামৰ্শ প্ৰস্তুত কৰক',
    MN: 'Live AI পাওতাক শেম্বা',
    MZ: 'Live AI Thutlukna Siam rawh',
    BN: 'লাইভ এআই পরামর্শ তৈরি করুন'
  },

  // Citizen View
  citizen_portal_title: {
    EN: 'Citizen Offline-First Emergency & Early Warning Portal',
    HI: 'नागरिक ऑफ़लाइन-प्राथमिक आपातकालीन एवं चेतावनी पोर्टल',
    AS: 'নাগৰিক অফলাইন-প্ৰাথমিক জৰুৰীকালীন আৰু সতৰ্কবাণী প’ৰ্টেল',
    MN: 'প্রজাগী ওফলাইন ইমার্জেন্সি অমসুং চেকশিনৱা পোর্টেল',
    MZ: 'Mipuite Chhanchhuah leh Inralrinna Portal',
    BN: 'নাগরিক অফলাইন-ফার্স্ট জরুরি ও আগাম সতর্কবার্তা পোর্টাল'
  },
  sos_panic_btn: {
    EN: 'ONE-TOUCH EMERGENCY SOS PANIC BUTTON',
    HI: 'एक-स्पर्श आपातकालीन एसओएस बटन',
    AS: 'এক-স্পৰ্শত জৰুৰীকালীন এছ.অ’.এছ বুটাম',
    MN: 'অনতপকী ইমার্জেন্সি এস.ও.এস পেনিক বটন',
    MZ: 'HMEH MAWH EMERGENCY SOS PANIC BUTTON',
    BN: 'এক-স্পর্শে জরুরি এসওএস প্যানিক বাটন'
  },
  sos_confirm_prompt: {
    EN: 'CONFIRM IMMEDIATE SOS DISTRESS DISPATCH',
    HI: 'तत्काल आपातकालीन सहायता प्रेषण की पुष्टि करें',
    AS: 'তৎক্ষণাত জৰুৰীকালীন সাহায্য প্ৰেৰণ নিশ্চিত কৰক',
    MN: 'ইমার্জেন্সি মতেং থারকপদা য়ারিব্রা কনফার্ম তৌবা',
    MZ: 'CHHANCHHUAH NGENNA THAWN NGHAL RAWH',
    BN: 'অবিলম্বে জরুরি সাহায্য প্রেরণের নিশ্চিতকরণ'
  },
  sos_triggered_success: {
    EN: 'SOS DISTRESS BEACON ACTIVE & DISPATCHED',
    HI: 'एसओएस आपातकालीन संकेत सक्रिय एवं प्रेषित कर दिया गया है',
    AS: 'এছ.অ’.এছ জৰুৰী সংকেত সক্ৰিয় আৰু উদ্ধাৰকাৰী দলক জনোৱা হ’ল',
    MN: 'এস.ও.এস সংকেত চৎনখ্রে অমসুং মতেং থাখ্রে',
    MZ: 'CHHANCHHUAH NGENNA THAWN FEL TAWH A NI',
    BN: 'জরুরি এসওএস সংকেত সক্রিয় ও প্রেরণ করা হয়েছে'
  },
  btn_submit_field_report: {
    EN: 'Submit Citizen Field Hazard Report',
    HI: 'नागरिक आपदा रिपोर्ट दर्ज करें',
    AS: 'নাগৰিক দুৰ্যোগ প্ৰতিবেদন দাখিল কৰক',
    MN: 'প্রজাগী খুদোংথিবা পাও পীরকপা',
    MZ: 'Hmunhma Hlauhawm Report Thehlut rawh',
    BN: 'নাগরিক দুর্যোগ রিপোর্ট দাখিল করুন'
  },
  call_helpline_btn: {
    EN: 'Call 112 National Emergency Helpline',
    HI: '112 राष्ट्रीय आपातकालीन हेल्पलाइन पर कॉल करें',
    AS: '১১২ ৰাষ্ট্ৰীয় জৰুৰীকালীন নম্বৰত ফোন কৰক',
    MN: '১১২ নেসনেল ইমার্জেন্সিদা কোল তৌবা',
    MZ: '112 Emergency Helpline-ah Phone rawh',
    BN: '১১২ জাতীয় জরুরি হেল্পলাইনে কল করুন'
  },
  call_sdrf_btn: {
    EN: 'Call 1070 State Disaster Management Cell',
    HI: '1070 राज्य आपदा प्रबंधन नियंत्रण कक्ष पर कॉल करें',
    AS: '১০৭০ ৰাজ্যিক দুৰ্যোগ ব্যৱস্থাপনা কোঠাত ফোন কৰক',
    MN: '১০৭০ স্তেত দিজাস্তর সেলদা কোল তৌবা',
    MZ: '1070 Disaster Management-ah Phone rawh',
    BN: '১০৭০ রাজ্য দুর্যোগ ব্যবস্থাপনা সেলে কল করুন'
  },

  // Scenario Simulator
  sim_scenario_engine: {
    EN: 'SIH SCENARIO ENGINE:',
    HI: 'एस.आई.एच परिदृश्य सिम्युलेटर:',
    AS: 'এছ.আই.এইচ পৰিস্থিতি অনুকাৰক:',
    MN: 'SIH সিনারিও ইঞ্জিন:',
    MZ: 'SIH SCENARIO ENGINE:',
    BN: 'এসআইএইচ পরিস্থিতি সিমুলেটর:'
  },
  btn_reset_live: {
    EN: 'Reset to Live',
    HI: 'लाइव टेलीमेट्री पर लौटें',
    AS: 'লাইভ টেলিমিত্ৰিলৈ ঘূৰি যাওক',
    MN: 'লাইভতা অমুক হন্না চৎপা',
    MZ: 'Live-ah kir leh rawh',
    BN: 'লাইভ টেলিমিত্রি ফিরে যান'
  },
  btn_start_demo: {
    EN: 'Start SIH Demo Scenario',
    HI: 'डेमो परिदृश्य शुरू करें',
    AS: 'ডেম’ দৃশ্যপট আৰম্ভ কৰক',
    MN: 'SIH দেমো সিনারিও হৌবা',
    MZ: 'SIH Demo Scenario Tan rawh',
    BN: 'ডেমো দৃশ্যপট শুরু করুন'
  }
};

export function getTranslation(key: string, lang: AppLanguage): string {
  const item = TRANSLATIONS[key];
  if (!item) return key;
  return item[lang] || item['EN'] || key;
}
