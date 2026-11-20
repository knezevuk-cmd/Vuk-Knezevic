export type Language = 'en' | 'sr';

export interface Translations {
  gameTitle: string;
  heroTagline: string;
  bestScore: string;
  endlessLabel: string;
  guideBtn: string;
  levelsTab: string;
  endlessTab: string;
  chooseSkin: string;
  walletPasses: string;
  equippedLabel: string;
  buyLabel: string;
  needMore: string;
  chooseLevel: string;
  toExit: string;
  endlessDesc: string;
  startGame: string;
  controlsHint: string;
  janitorName: string;
  janitorAiming: string;
  zirName: string;
  zirAiming: string;
  direktorkaName: string;
  direktorkaAiming: string;
  janitorSwitchHint: string;
  janitorChasing: string;
  bellRush: string;
  magnet: string;
  pausedTitle: string;
  thumbPad: string;
  on: string;
  off: string;
  resume: string;
  restart: string;
  threatGuide: string;
  mainMenu: string;
  exitReached: string;
  wingCleared: string;
  score: string;
  hallPasses: string;
  broomsDodged: string;
  trapsCleared: string;
  continueTo: string;
  allWingsEscaped: string;
  schoolEscaped: string;
  finalScore: string;
  tryEndless: string;
  playAgain: string;
  newBestScore: string;
  caughtTitle: string;
  caughtByZirTitle: string;
  caughtByDirTitle: string;
  distance: string;
  personalBest: string;
  schoolWingsHeader: string;
  openThreatGuide: string;
  visible: string;
  hidden: string;
  runStatus: string;
  bellRushMeter: string;
  bellRushDesc: string;
  streak: string;
  controlsTitle: string;
  ctrlMove: string;
  ctrlJump: string;
  ctrlSlide: string;
  ctrlPause: string;
  locked: string;
  guideSubtitle: string;
  backToHallway: string;
  studentTitle: string;
  studentDesc: string;
  gocaDesc: string;
  zirDesc: string;
  direktorkaDesc: string;
  lockerTitle: string;
  lockerDesc: string;
  clearanceDodge: string;
  clearanceJump: string;
  clearanceSlide: string;
  // Canvas & gameplay strings
  cExitSign: string;
  cTakeThis: string;
  cTakeThisDir: string;
  cOuchBack: string;
  cTaunt: string;
  cGotcha: string;
  cGotchaZir: string;
  cGotchaDir: string;
  cHoldStill: string;
  cHoldStillZir: string;
  cHoldStillDir: string;
  cStopThere: string;
  cStopThereDir: string;
  cFakeOutOver: string;
  cZirTakesOver: string;
  cDirTakesOver: string;
  cDirFinal100: string;
  cChaserTired: string;
  cTripped: string;
  cBroomMissed: string;
  cDeflected: string;
  cSmash: string;
  cBellRush: string;
  cMagnet: string;
  reasonTable: string;
  reasonChomper: string;
  reasonWallDoor: string;
  reasonWetFloor: string;
  reasonSpring: string;
  reasonGlue: string;
  reasonBroom: string;
  reasonBroomZir: string;
  reasonRulerDir: string;
  reasonDefault: string;
  gocaBio: string;
  zirBio: string;
  direktorkaBio: string;
  lockersBio: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    gameTitle: 'Goca Escape',
    heroTagline:
      'Outrun Goca, Žir, and the Principal across 50 European school levels. Dodge brooms, rulers, and sentient lockers.',
    bestScore: 'Best',
    endlessLabel: 'Endless',
    guideBtn: 'Guide',
    levelsTab: 'Levels (50)',
    endlessTab: 'Endless Run',
    chooseSkin: 'Character Shop',
    walletPasses: 'Passes',
    equippedLabel: 'Active',
    buyLabel: 'Buy',
    needMore: 'Need',
    chooseLevel: 'Choose Level',
    toExit: 'to Exit',
    endlessDesc:
      'Non-stop escalating corridor with every trap and rotating chasers. Survive as far as you can.',
    startGame: 'Start Escape',
    controlsHint: 'Swipe anywhere or use thumb buttons · Keyboard arrows supported',
    janitorName: 'Janitor Goca',
    janitorAiming: 'Janitor Goca · AIMING!',
    zirName: 'Janitor Žir',
    zirAiming: 'Janitor Žir · AIMING!',
    direktorkaName: 'The Principal',
    direktorkaAiming: 'The Principal · AIMING!',
    janitorSwitchHint: 'Move left or right to dodge!',
    janitorChasing: 'Chasing right behind you',
    bellRush: 'Bell Rush',
    magnet: 'Magnet',
    pausedTitle: 'Game Paused',
    thumbPad: 'On-Screen Thumb Pad',
    on: 'On',
    off: 'Off',
    resume: 'Resume',
    restart: 'Restart',
    threatGuide: 'Threat Guide',
    mainMenu: 'Main Menu',
    exitReached: 'Exit Reached',
    wingCleared: 'Level Cleared',
    score: 'Score',
    hallPasses: 'Hall Passes',
    broomsDodged: 'Dodged Throws',
    trapsCleared: 'Traps Cleared',
    continueTo: 'Next Level:',
    allWingsEscaped: 'All 50 Levels Escaped',
    schoolEscaped: 'School Escaped!',
    finalScore: 'Final Score',
    tryEndless: 'Try Endless Run',
    playAgain: 'Play Again',
    newBestScore: 'New Best Score',
    caughtTitle: 'Caught by Goca',
    caughtByZirTitle: 'Caught by Žir',
    caughtByDirTitle: 'Caught by the Principal',
    distance: 'Distance',
    personalBest: 'Personal Best',
    schoolWingsHeader: 'School Levels',
    openThreatGuide: 'Open Threat Guide',
    visible: 'Visible',
    hidden: 'Hidden',
    runStatus: 'Run Status',
    bellRushMeter: 'Bell Rush Meter',
    bellRushDesc: 'Collect 10 Hall Passes to smash straight through sentient lockers.',
    streak: 'Streak',
    controlsTitle: 'Controls',
    ctrlMove: 'Switch Lanes',
    ctrlJump: 'Jump Over Traps',
    ctrlSlide: 'Slide Under Hazards',
    ctrlPause: 'Pause',
    locked: 'Locked',
    guideSubtitle: 'Sentient Lockers, Goca, Žir & The Principal',
    backToHallway: 'Back to Hallway',
    studentTitle: 'The Student',
    studentDesc: 'Collect 10 Hall Passes for Bell Rush speed.',
    gocaDesc: '74-year-old caretaker chasing you in Levels 1–9 and Level 50.',
    zirDesc: 'Chubby blonde caretaker joining on Level 10 and returning in 26–50!',
    direktorkaDesc: 'Ambushes you after Žir drops out on Levels 26–50 with her wooden ruler!',
    lockerTitle: 'Locker #13B',
    lockerDesc: 'Watch vents for glowing eyes before doors slam.',
    clearanceDodge: 'Dodge Left or Right',
    clearanceJump: 'Jump Over',
    clearanceSlide: 'Slide Under',
    cExitSign: 'EXIT',
    cTakeThis: 'TAKE THIS!',
    cTakeThisDir: 'DETENTION!',
    cOuchBack: 'OUCH! MY BACK!',
    cTaunt: 'BLEEEH! SEE YA!',
    cGotcha: 'GOTCHA! DETENTION!',
    cGotchaZir: 'GOTCHA! NO ESCAPE!',
    cGotchaDir: 'EXPELLED! GOTCHA!',
    cHoldStill: 'Hold still! Watch my broom!',
    cHoldStillZir: 'Hold still! Here comes my broom!',
    cHoldStillDir: 'Freeze! Watch my ruler!',
    cStopThere: 'Where are you going?!',
    cStopThereDir: 'To my office NOW!',
    cFakeOutOver: 'SHE FELL! IS IT OVER?!',
    cZirTakesOver: 'WAIT — ŽIR TAKES OVER!',
    cDirTakesOver: 'WAIT — THE PRINCIPAL!!',
    cDirFinal100: 'PRINCIPAL · FINAL 100m!',
    cChaserTired: 'I CAN’T KEEP UP!',
    cTripped: 'TRIPPED!',
    cBroomMissed: 'MISSED! +120',
    cDeflected: 'DEFLECTED! +150',
    cSmash: 'SMASH +200',
    cBellRush: 'BELL RUSH!',
    cMagnet: 'MAGNET!',
    reasonTable: 'Crashed into an oak school table',
    reasonChomper: 'Tripped by a Chomper Locker',
    reasonWallDoor: 'Slammed by a sentient locker door',
    reasonWetFloor: 'Slipped on a mopped floor trap',
    reasonSpring: 'Caught by a spring floor grate',
    reasonGlue: 'Stuck in a glue spill',
    reasonBroom: "Hit by Janitor Goca's flying broom",
    reasonBroomZir: "Hit by Janitor Žir's flying broom",
    reasonRulerDir: "Hit by the Principal's flying ruler",
    reasonDefault: 'Tripped in the corridor',
    gocaBio: 'Levels 1–9 & 50 · Short, stout caretaker aiming her broom.',
    zirBio: 'Levels 10–50 · Chubby blonde caretaker chasing before the ambush.',
    direktorkaBio: 'Levels 26–50 · Bursts in when Žir drops out with her pointer ruler!',
    lockersBio: 'Watch wall vents for glowing eyes before doors slam.',
  },
  sr: {
    gameTitle: 'Goca Escape',
    heroTagline:
      'Pobegni od Goce, Žir i Direktorke kroz 50 evropskih školskih nivoa. Izbegavaj metle, lenjire, žive ormariće i stolove.',
    bestScore: 'Rekord',
    endlessLabel: 'Beskonačno',
    guideBtn: 'Vodič',
    levelsTab: 'Nivoi (50)',
    endlessTab: 'Beskonačna trka',
    chooseSkin: 'Prodavnica likova',
    walletPasses: 'Propusnice',
    equippedLabel: 'Izabran',
    buyLabel: 'Kupi',
    needMore: 'Fali',
    chooseLevel: 'Izaberi nivo',
    toExit: 'do izlaza',
    endlessDesc:
      'Beskrajni hodnik sa svim zamkama i smenama Goca → Žir → Direktorka. Izdrži što duže možeš.',
    startGame: 'Počni beg',
    controlsHint: 'Prevuci prstom ili koristi dugmiće · Strelice na tastaturi rade',
    janitorName: 'Spremačica Goca',
    janitorAiming: 'Spremačica Goca · NIŠANI!',
    zirName: 'Spremačica Žir',
    zirAiming: 'Spremačica Žir · NIŠANI!',
    direktorkaName: 'Direktorka',
    direktorkaAiming: 'Direktorka · NIŠANI!',
    janitorSwitchHint: 'Pomeri se levo ili desno da izbegneš!',
    janitorChasing: 'Juri tik iza tebe',
    bellRush: 'Školsko zvono',
    magnet: 'Magnet',
    pausedTitle: 'Pauza',
    thumbPad: 'Dugmići na ekranu',
    on: 'Uklj.',
    off: 'Isklj.',
    resume: 'Nastavi',
    restart: 'Igraj ponovo',
    threatGuide: 'Vodič za zamke',
    mainMenu: 'Glavni meni',
    exitReached: 'Izlaz je dostignut',
    wingCleared: 'Nivo pređen',
    score: 'Poeni',
    hallPasses: 'Propusnice',
    broomsDodged: 'Izbegnuti hici',
    trapsCleared: 'Pređene zamke',
    continueTo: 'Sledeći nivo:',
    allWingsEscaped: 'Svih 50 nivoa pređeno',
    schoolEscaped: 'Pobegao si iz škole!',
    finalScore: 'Konačni poeni',
    tryEndless: 'Probaj beskonačnu trku',
    playAgain: 'Igraj ponovo',
    newBestScore: 'Novi rekord',
    caughtTitle: 'Goca te uhvatila',
    caughtByZirTitle: 'Žir te uhvatila',
    caughtByDirTitle: 'Direktorka te uhvatila',
    distance: 'Razdaljina',
    personalBest: 'Lični rekord',
    schoolWingsHeader: 'Školski nivoi',
    openThreatGuide: 'Otvori vodič',
    visible: 'Vidljivo',
    hidden: 'Sakriveno',
    runStatus: 'Status trke',
    bellRushMeter: 'Merač školskog zvona',
    bellRushDesc: 'Sakupi 10 propusnica da razbiješ sve ormariće na putu.',
    streak: 'Serija',
    controlsTitle: 'Kontrole',
    ctrlMove: 'Promena trake',
    ctrlJump: 'Skok preko zamke',
    ctrlSlide: 'Klizanje ispod',
    ctrlPause: 'Pauza',
    locked: 'Zaključano',
    guideSubtitle: 'Živi ormarići, Goca, Žir i Direktorka',
    backToHallway: 'Nazad u hodnik',
    studentTitle: 'Učenik',
    studentDesc: 'Sakupi 10 propusnica za brzinu zvona.',
    gocaDesc: 'Niža, punija spremačica od 74 godine (nivoi 1–9 i finale 50).',
    zirDesc: 'Buckasta plava spremačica sa dužom frizurom na lonac (nivoi 10–50).',
    direktorkaDesc: 'Upada kad Žir posustane (nivoi 26–50) sa drvenim lenjirom!',
    lockerTitle: 'Ormarić #13B',
    lockerDesc: 'Prati svetleće oči pre nego što vrata lupe.',
    clearanceDodge: 'Skloni se levo ili desno',
    clearanceJump: 'Preskoči',
    clearanceSlide: 'Provuci se ispod',
    cExitSign: 'IZLAZ',
    cTakeThis: 'EVO TI!',
    cTakeThisDir: 'UKOR!',
    cOuchBack: 'JAOO! MOJA LEĐA!',
    cTaunt: 'BLJAAA! ĆAO!',
    cGotcha: 'UHVAĆEN SI!',
    cGotchaZir: 'UHVAĆEN SI! NEMA BEGA!',
    cGotchaDir: 'PRAVAC DIREKCIJA!',
    cHoldStill: 'Stani! Pazi na metlu!',
    cHoldStillZir: 'Stoj! Stiže metla od Žir!',
    cHoldStillDir: 'Miruj! Stiže lenjir!',
    cStopThere: 'De ćeš?!',
    cStopThereDir: 'U moju kancelariju!',
    cFakeOutOver: 'PALA JE! GOTOVO?!',
    cZirTakesOver: 'ČEKAJ — STIŽE ŽIR!',
    cDirTakesOver: 'ČEKAJ — STIŽE DIREKTORKA!!',
    cDirFinal100: 'DIREKTORKA · ZADNJIH 100m!',
    cChaserTired: 'NE MOGU VIŠE!',
    cTripped: 'PAO SI!',
    cBroomMissed: 'PROMAŠAJ! +120',
    cDeflected: 'ODBIJENO! +150',
    cSmash: 'TRAS +200',
    cBellRush: 'ZVONO!',
    cMagnet: 'MAGNET!',
    reasonTable: 'Udario si u drveni školski sto',
    reasonChomper: 'Uhvatio te je živi ormarić',
    reasonWallDoor: 'Udarila su te vrata ormarića',
    reasonWetFloor: 'Okliznuo si se na sveže obrisan pod',
    reasonSpring: 'Uhvatila te je podna opruga',
    reasonGlue: 'Zalepio si se za lepak',
    reasonBroom: 'Pogodila te je Gocina leteća metla',
    reasonBroomZir: 'Pogodila te je leteća metla spremačice Žir',
    reasonRulerDir: 'Pogodio te je leteći lenjir Direktorke',
    reasonDefault: 'Sapleo si se u hodniku',
    gocaBio: 'Nivoi 1–9 i 50 · Niža, punija spremačica sa metlom.',
    zirBio: 'Nivoi 10–50 · Buckasta plava spremačica pre dolaska Direktorke.',
    direktorkaBio: 'Nivoi 26–50 · Upada kad pomisliš da je gotovo i juri te lenjirom!',
    lockersBio: 'Pazi na oči u ventilaciji pre nego što ormarić zalupi vrata.',
  },
};
