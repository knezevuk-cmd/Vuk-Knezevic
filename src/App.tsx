import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  Gamepad2,
  Languages,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Ticket,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { FieldGuideModal } from './components/FieldGuideModal';
import { GameCanvas, GameController } from './components/GameCanvas';
import { MobileControls } from './components/MobileControls';
import { ResilientImage } from './components/ResilientImage';
import { Language, TRANSLATIONS } from './game/i18n';
import { sound } from './game/sound';
import { GameMode, GameState, HudSnapshot, SkinId, StudentSkin } from './game/types';
import { SCHOOL_WINGS, STUDENT_SKINS } from './game/wings';

const STORAGE_KEY = 'locker_dash_save_v3';

const GOCA_PORTRAIT = '/src/assets/images/janitor_portrait_1795196414291.jpg';
const ZIR_PORTRAIT = '/src/assets/images/janitor_zir_portrait_1795198858052.jpg';
const DIREKTORKA_PORTRAIT = '/src/assets/images/principal_direktorka_portrait_1795204688325.jpg';

interface SaveData {
  bestScore: number;
  bestEndlessMeters: number;
  unlockedWing: number;
  passes: number;
  unlockedSkins: SkinId[];
  language: Language;
  selectedSkin: SkinId;
}

const DEFAULT_SAVE: SaveData = {
  bestScore: 0,
  bestEndlessMeters: 0,
  unlockedWing: 0,
  passes: 0,
  unlockedSkins: ['vuk'],
  language: 'en',
  selectedSkin: 'vuk',
};

const VALID_SKINS = new Set<SkinId>(STUDENT_SKINS.map((s) => s.id));

function loadSave(): SaveData {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('locker_dash_save_v2') ||
      localStorage.getItem('locker_dash_save_v1');
    if (!raw) return DEFAULT_SAVE;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const mapLegacySkin = (id: unknown): SkinId | null => {
      const normalized = id === 'ana' ? 'nina' : id;
      return VALID_SKINS.has(normalized as SkinId) ? (normalized as SkinId) : null;
    };
    const rawUnlocked = Array.isArray(parsed.unlockedSkins)
      ? parsed.unlockedSkins
          .map(mapLegacySkin)
          .filter((id): id is SkinId => id !== null)
      : [];
    const unlockedSkins: SkinId[] = Array.from(new Set<SkinId>(['vuk', ...rawUnlocked]));
    const migratedSelected = mapLegacySkin(parsed.selectedSkin);
    const selectedSkin =
      migratedSelected && unlockedSkins.includes(migratedSelected)
        ? migratedSelected
        : 'vuk';

    return {
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      bestEndlessMeters:
        typeof parsed.bestEndlessMeters === 'number' ? parsed.bestEndlessMeters : 0,
      unlockedWing:
        typeof parsed.unlockedWing === 'number'
          ? Math.min(SCHOOL_WINGS.length - 1, Math.max(0, parsed.unlockedWing))
          : 0,
      passes: typeof parsed.passes === 'number' && parsed.passes >= 0 ? parsed.passes : 0,
      unlockedSkins,
      language: parsed.language === 'sr' ? 'sr' : 'en',
      selectedSkin,
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

function writeSave(data: SaveData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  distance: 0,
  targetDistance: SCHOOL_WINGS[0].targetMeters,
  wingIndex: 0,
  wingName: SCHOOL_WINGS[0].name.en,
  combo: 1,
  hallPasses: 0,
  bellRushCharge: 0,
  bellRushActive: false,
  bellRushRemaining: 0,
  magnetRemaining: 0,
  lockersSmashed: 0,
  broomsDodged: 0,
  trapsCleared: 0,
  speedKmh: 27,
  janitor: 'GOCA',
  janitorLine: null,
  janitorAiming: false,
  stageAlert: null,
  caughtReason: null,
};

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [language, setLanguage] = useState<Language>(() => loadSave().language);
  const [selectedSkinId, setSelectedSkinId] = useState<SkinId>(() => loadSave().selectedSkin);
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [gameMode, setGameMode] = useState<GameMode>('CAMPAIGN');
  const [selectedWing, setSelectedWing] = useState<number>(0);
  const [activeWingIndex, setActiveWingIndex] = useState<number>(0);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [muted, setMuted] = useState<boolean>(false);
  const [showThumbPad, setShowThumbPad] = useState<boolean>(true);
  const [guideOpen, setGuideOpen] = useState<boolean>(false);
  const [newBestRun, setNewBestRun] = useState<boolean>(false);
  const [shopNotice, setShopNotice] = useState<string | null>(null);

  const controllerRef = useRef<GameController | null>(null);
  const runBankedPassesRef = useRef<number>(0);

  const t = TRANSLATIONS[language];
  const activeSkin =
    STUDENT_SKINS.find((s) => s.id === selectedSkinId) ?? STUDENT_SKINS[0];

  useEffect(() => {
    sound.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    document.documentElement.lang = language;
    sound.prefetchLines(language);
  }, [language]);

  useEffect(() => {
    if (!shopNotice) return;
    const timer = window.setTimeout(() => setShopNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [shopNotice]);

  const handleLanguageChange = (nextLang: Language) => {
    setLanguage(nextLang);
    setSave((prev) => {
      const next: SaveData = { ...prev, language: nextLang };
      writeSave(next);
      return next;
    });
  };

  const handleSkinAction = (sk: StudentSkin) => {
    sound.unlock();
    const isUnlocked = save.unlockedSkins.includes(sk.id);
    if (isUnlocked) {
      setSelectedSkinId(sk.id);
      setShopNotice(null);
      sound.playSwipe();
      setSave((prev) => {
        const next: SaveData = { ...prev, selectedSkin: sk.id };
        writeSave(next);
        return next;
      });
      return;
    }

    if (save.passes >= sk.price) {
      sound.playPickup(5);
      setSelectedSkinId(sk.id);
      setShopNotice(null);
      setSave((prev) => {
        const next: SaveData = {
          ...prev,
          passes: prev.passes - sk.price,
          unlockedSkins: Array.from(new Set<SkinId>([...prev.unlockedSkins, sk.id])),
          selectedSkin: sk.id,
        };
        writeSave(next);
        return next;
      });
    } else {
      sound.playLockerSlam();
      const missing = sk.price - save.passes;
      setShopNotice(`${t.needMore} ${missing} ${t.walletPasses.toLowerCase()}`);
    }
  };

  const syncCollectedPasses = useCallback((nextHud: HudSnapshot) => {
    if (nextHud.hallPasses > runBankedPassesRef.current) {
      const delta = nextHud.hallPasses - runBankedPassesRef.current;
      runBankedPassesRef.current = nextHud.hallPasses;
      setSave((prev) => {
        const next: SaveData = { ...prev, passes: prev.passes + delta };
        writeSave(next);
        return next;
      });
    }
  }, []);

  const handleHudUpdate = useCallback(
    (nextHud: HudSnapshot) => {
      syncCollectedPasses(nextHud);
      setHud(nextHud);
    },
    [syncCollectedPasses]
  );

  const startRun = (wingIdx: number, mode: GameMode, preserveScore = false) => {
    sound.unlock();
    const targetWing = SCHOOL_WINGS[Math.min(SCHOOL_WINGS.length - 1, Math.max(0, wingIdx))];
    sound.prefetchWingLines(targetWing, language);
    setNewBestRun(false);
    setShopNotice(null);
    if (!preserveScore) {
      runBankedPassesRef.current = 0;
    }
    setGameMode(mode);
    setActiveWingIndex(wingIdx);
    setGameState('PLAYING');
    controllerRef.current?.resetRun(wingIdx, mode, preserveScore);
  };

  const handleTogglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'PLAYING') {
        sound.stopSpeech();
        return 'PAUSED';
      }
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  const persistRecords = useCallback(
    (finalHud: HudSnapshot, unlockedNextWing?: number) => {
      syncCollectedPasses(finalHud);
      setSave((prev) => {
        const beatScore = finalHud.score > prev.bestScore;
        if (beatScore) setNewBestRun(true);
        const next: SaveData = {
          ...prev,
          bestScore: Math.max(prev.bestScore, finalHud.score),
          bestEndlessMeters:
            gameMode === 'ENDLESS'
              ? Math.max(prev.bestEndlessMeters, finalHud.distance)
              : prev.bestEndlessMeters,
          unlockedWing:
            unlockedNextWing !== undefined
              ? Math.max(prev.unlockedWing, unlockedNextWing)
              : prev.unlockedWing,
        };
        writeSave(next);
        return next;
      });
    },
    [gameMode, syncCollectedPasses]
  );

  const handleWingClear = useCallback(
    (finalHud: HudSnapshot) => {
      setHud(finalHud);
      const nextWing = activeWingIndex + 1;
      if (nextWing >= SCHOOL_WINGS.length) {
        persistRecords(finalHud, SCHOOL_WINGS.length - 1);
        setGameState('VICTORY');
      } else {
        persistRecords(finalHud, nextWing);
        setGameState('WING_CLEAR');
      }
    },
    [activeWingIndex, persistRecords]
  );

  const handleStartCaughtAnim = useCallback(
    (finalHud: HudSnapshot) => {
      syncCollectedPasses(finalHud);
      setHud(finalHud);
      setGameState('CAUGHT_ANIM');
    },
    [syncCollectedPasses]
  );

  const handleStartVictoryAnim = useCallback(
    (finalHud: HudSnapshot) => {
      syncCollectedPasses(finalHud);
      setHud(finalHud);
      setGameState('VICTORY_ANIM');
    },
    [syncCollectedPasses]
  );

  const handleGameOver = useCallback(
    (finalHud: HudSnapshot) => {
      setHud(finalHud);
      persistRecords(finalHud);
      setGameState('GAME_OVER');
    },
    [persistRecords]
  );

  const currentWing = SCHOOL_WINGS[activeWingIndex] ?? SCHOOL_WINGS[0];
  const displayWingName =
    gameMode === 'ENDLESS' ? t.endlessTab : currentWing.name[language];
  const progressPct =
    gameMode === 'ENDLESS'
      ? 100
      : Math.min(100, Math.round((hud.distance / Math.max(1, hud.targetDistance)) * 100));

  const isDirActive = hud.janitor === 'DIREKTORKA';
  const isZirActive = hud.janitor === 'ZIR';
  const activeJanitorPortrait = isDirActive
    ? DIREKTORKA_PORTRAIT
    : isZirActive
      ? ZIR_PORTRAIT
      : GOCA_PORTRAIT;
  const activeJanitorName = isDirActive
    ? t.direktorkaName
    : isZirActive
      ? t.zirName
      : t.janitorName;
  const activeJanitorAiming = isDirActive
    ? t.direktorkaAiming
    : isZirActive
      ? t.zirAiming
      : t.janitorAiming;
  const activeCaughtTitle = isDirActive
    ? t.caughtByDirTitle
    : isZirActive
      ? t.caughtByZirTitle
      : t.caughtTitle;

  const formatStageBadge = (w: (typeof SCHOOL_WINGS)[number]) => {
    if (w.id === 49) return `G→Ž→D · ${w.targetMeters}m`;
    if (w.chaseStages.length > 1) return `Žir→Dir · ${w.targetMeters}m`;
    if (w.janitor === 'ZIR') return `Žir · ${w.targetMeters}m`;
    return `${w.targetMeters}m`;
  };

  const formatSelectedChaserLabel = (w: (typeof SCHOOL_WINGS)[number]) => {
    if (w.id === 49) return `Goca → Žir → ${t.direktorkaName} (100m)`;
    if (w.chaseStages.length > 1) return `${t.zirName} → ${t.direktorkaName}`;
    return w.janitor === 'ZIR' ? t.zirName : t.janitorName;
  };

  const selectedWingConfig = SCHOOL_WINGS[selectedWing] ?? SCHOOL_WINGS[0];

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 overflow-hidden">
      <div className="h-full w-full lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-4 lg:grid lg:grid-cols-12 lg:gap-6 items-stretch">
        {/* Desktop Left Panel: 25 School Levels, Language & Threat Intel */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-5 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
                  {t.gameTitle}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {t.bestScore} {save.bestScore.toLocaleString()} · {t.walletPasses}{' '}
                  <span className="text-amber-400 font-mono-nums font-semibold">
                    {save.passes}
                  </span>
                </p>
              </div>
              <div
                className="flex items-center rounded-lg bg-slate-950 border border-white/10 p-0.5 shrink-0"
                role="group"
                aria-label="Language"
              >
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${
                    language === 'en'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('sr')}
                  className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${
                    language === 'sr'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SR
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-semibold text-slate-200">{t.schoolWingsHeader}</h2>
                <span className="text-xs text-slate-400 font-mono-nums">
                  {save.unlockedWing + 1}/{SCHOOL_WINGS.length}
                </span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {SCHOOL_WINGS.map((w, idx) => {
                  const unlocked = idx <= save.unlockedWing;
                  const isCurrent =
                    gameState !== 'TITLE_MENU'
                      ? idx === activeWingIndex && gameMode === 'CAMPAIGN'
                      : idx === selectedWing && gameMode === 'CAMPAIGN';
                  return (
                    <button
                      key={w.id}
                      type="button"
                      disabled={!unlocked || gameState === 'PLAYING'}
                      onClick={() => {
                        setGameMode('CAMPAIGN');
                        setSelectedWing(idx);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
                        isCurrent
                          ? 'bg-amber-500/15 border-amber-400/40 text-white'
                          : unlocked
                            ? 'bg-slate-950/50 border-white/5 text-slate-300 hover:border-white/15'
                            : 'bg-slate-950/30 border-white/5 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">
                          {idx + 1}. {w.name[language]}
                        </span>
                        <span className="text-[11px] font-mono-nums text-slate-400 shrink-0">
                          {unlocked ? formatStageBadge(w) : t.locked}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <ResilientImage
                  src={GOCA_PORTRAIT}
                  alt={t.janitorName}
                  className="h-11 w-11 rounded-xl object-cover shrink-0 border border-white/10"
                  fallbackLabel={t.janitorName}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-100 truncate">
                    {t.janitorName} (1–9, 50)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{t.gocaBio}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ResilientImage
                  src={ZIR_PORTRAIT}
                  alt={t.zirName}
                  className="h-11 w-11 rounded-xl object-cover shrink-0 border border-amber-400/30"
                  fallbackLabel={t.zirName}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-300 truncate">
                    {t.zirName} (10–50)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{t.zirBio}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ResilientImage
                  src={DIREKTORKA_PORTRAIT}
                  alt={t.direktorkaName}
                  className="h-11 w-11 rounded-xl object-cover shrink-0 border border-rose-400/40"
                  fallbackLabel={t.direktorkaName}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-rose-300 truncate">
                    {t.direktorkaName} (26–50)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {t.direktorkaBio}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-slate-950/60 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <BookOpen className="h-4 w-4 text-amber-400" />
                {t.openThreatGuide}
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">{t.thumbPad}</span>
            <button
              type="button"
              onClick={() => setShowThumbPad((v) => !v)}
              className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                showThumbPad
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {showThumbPad ? t.visible : t.hidden}
            </button>
          </div>
        </aside>

        {/* Center Interactive Game Stage (Full-screen on Mobile, Centered Console on Desktop) */}
        <main className="relative h-full w-full lg:col-span-6 lg:rounded-2xl lg:border lg:border-white/10 overflow-hidden bg-slate-950 shadow-2xl">
          {/* Live 60fps 2.5D Hallway Canvas */}
          <GameCanvas
            gameState={gameState}
            gameMode={gameMode}
            wingIndex={activeWingIndex}
            language={language}
            skin={activeSkin}
            onHudUpdate={handleHudUpdate}
            onStartCaughtAnim={handleStartCaughtAnim}
            onStartVictoryAnim={handleStartVictoryAnim}
            onWingClear={handleWingClear}
            onGameOver={handleGameOver}
            onTogglePause={handleTogglePause}
            controllerRef={controllerRef}
          />

          {/* Active Gameplay Top HUD (Strictly <= 12% viewport height on mobile) */}
          {gameState === 'PLAYING' && (
            <header className="pointer-events-none absolute inset-x-0 top-0 z-20">
              <div className="pointer-events-auto flex items-center justify-between gap-2 bg-slate-950/75 backdrop-blur-md border-b border-white/10 px-3 py-1.5 sm:px-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-slate-100 truncate">
                    {gameMode === 'CAMPAIGN' ? `${activeWingIndex + 1}/${SCHOOL_WINGS.length} · ` : ''}
                    {displayWingName}
                  </span>

                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>

                  <div className="shrink-0 text-xs font-mono-nums text-emerald-400 font-semibold">
                    {gameMode === 'ENDLESS'
                      ? `${hud.distance}m`
                      : `${hud.distance}/${hud.targetDistance}m`}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="text-right mr-1">
                    <div className="text-sm font-mono-nums font-bold text-amber-400 leading-tight">
                      {hud.score.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono-nums text-amber-200/80 leading-none">
                      {t.walletPasses}: {save.passes}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/10 active:scale-95 transition-all"
                  >
                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePause}
                    aria-label={t.ctrlPause}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <Pause className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Wing / Bell Rush Thin Progress Strip */}
              <div className="w-full h-1 bg-slate-900/90">
                <div
                  className={`h-full transition-all duration-150 ${
                    hud.bellRushActive ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{
                    width: hud.bellRushActive
                      ? `${Math.max(0, (hud.bellRushRemaining / 5.5) * 100)}%`
                      : `${progressPct}%`,
                  }}
                />
              </div>

              {/* Visible Active Janitor (Goca or Žir) Chase Card + Powerup Indicator */}
              <div className="flex items-start justify-between gap-2 px-3 pt-1.5">
                <div
                  className={`flex items-center gap-2 rounded-xl border backdrop-blur-md p-1 pr-2.5 max-w-[74%] transition-colors ${
                    hud.janitorAiming
                      ? 'border-red-500/60 bg-red-950/80'
                      : isDirActive
                        ? 'border-rose-400/50 bg-rose-950/75'
                        : 'border-white/10 bg-slate-950/80'
                  }`}
                >
                  <ResilientImage
                    src={activeJanitorPortrait}
                    alt={activeJanitorName}
                    className={`h-8 w-8 rounded-lg object-cover shrink-0 border ${
                      isDirActive ? 'border-rose-400/60' : 'border-amber-400/30'
                    }`}
                    fallbackLabel={activeJanitorName}
                  />
                  <div className="min-w-0">
                    <div
                      className={`text-[10px] font-bold leading-tight truncate ${
                        hud.janitorAiming
                          ? 'text-red-300'
                          : isDirActive
                            ? 'text-rose-300'
                            : 'text-amber-300'
                      }`}
                    >
                      {hud.janitorAiming ? activeJanitorAiming : activeJanitorName}
                    </div>
                    <div className="text-[11px] text-slate-200 leading-tight truncate">
                      {hud.janitorAiming
                        ? t.janitorSwitchHint
                        : hud.janitorLine || t.janitorChasing}
                    </div>
                  </div>
                </div>

                {(hud.bellRushActive || hud.magnetRemaining > 0) && (
                  <div className="flex flex-col items-end gap-1 text-xs font-semibold">
                    {hud.bellRushActive && (
                      <span className="flex items-center gap-1 text-amber-300 drop-shadow">
                        <Zap className="h-3.5 w-3.5 fill-amber-400" />
                        {t.bellRush} · {hud.bellRushRemaining.toFixed(1)}s
                      </span>
                    )}
                    {hud.magnetRemaining > 0 && (
                      <span className="text-sky-300 drop-shadow font-mono-nums">
                        {t.magnet} · {hud.magnetRemaining.toFixed(1)}s
                      </span>
                    )}
                  </div>
                )}
              </div>
            </header>
          )}

          {/* Bottom Thumb-Zone Controls during Active Play */}
          {gameState === 'PLAYING' && showThumbPad && (
            <MobileControls
              language={language}
              onLeft={() => controllerRef.current?.moveLeft()}
              onRight={() => controllerRef.current?.moveRight()}
              onJump={() => controllerRef.current?.jump()}
              onSlide={() => controllerRef.current?.slide()}
            />
          )}

          {/* HOME SCREEN / TITLE MENU OVERLAY */}
          {gameState === 'TITLE_MENU' && (
            <div className="absolute inset-0 z-30 flex flex-col justify-between overflow-y-auto bg-slate-950">
              <div className="relative min-h-full flex flex-col justify-between p-4 sm:p-6">
                {/* Key Art Background */}
                <div className="absolute inset-0">
                  <ResilientImage
                    src="/src/assets/images/european_hallway_keyart_1795196414795.jpg"
                    alt="European school hallway"
                    className="h-full w-full object-cover"
                    fallbackLabel={t.gameTitle}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-slate-950/45" />
                </div>

                {/* Top utility row: Best records + EN/SR Language Switcher + Guide + Audio */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200 truncate">
                    <Ticket className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="font-mono-nums font-bold text-amber-300">{save.passes}</span>
                    <span aria-hidden="true" className="text-slate-500">
                      ·
                    </span>
                    <span className="truncate">
                      {t.bestScore} {save.bestScore.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div
                      className="flex h-11 items-center rounded-xl bg-slate-900/80 border border-white/15 p-1 backdrop-blur-md"
                      role="group"
                      aria-label="Language selector"
                    >
                      <Languages className="h-3.5 w-3.5 text-amber-400 mx-1.5 hidden sm:block" />
                      <button
                        type="button"
                        onClick={() => handleLanguageChange('en')}
                        className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-colors ${
                          language === 'en'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        ENG
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLanguageChange('sr')}
                        className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-colors ${
                          language === 'sr'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        SRB
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGuideOpen(true)}
                      aria-label={t.threatGuide}
                      className="flex h-11 px-3 items-center gap-1.5 rounded-xl bg-slate-900/80 border border-white/15 text-xs font-medium text-slate-100 backdrop-blur-md hover:bg-slate-800 transition-colors whitespace-nowrap"
                    >
                      <BookOpen className="h-4 w-4 text-amber-400" />
                      <span className="hidden sm:inline">{t.guideBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMuted((m) => !m)}
                      aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/80 border border-white/15 text-slate-100 backdrop-blur-md hover:bg-slate-800 transition-colors"
                    >
                      {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Bottom Hero Title, Character Shop, 25-Level Picker & Play CTA */}
                <div className="relative z-10 mt-auto pt-4 space-y-3.5">
                  <div>
                    <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
                      {t.gameTitle}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md leading-relaxed">
                      {t.heroTagline}
                    </p>
                  </div>

                  {/* Character Shop (Buy & Equip Skins with Collected Hall Passes) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{t.chooseSkin}</span>
                      <span className="font-mono-nums font-semibold text-amber-300">
                        {shopNotice || `${t.walletPasses}: ${save.passes}`}
                      </span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {STUDENT_SKINS.map((sk) => {
                        const unlocked = save.unlockedSkins.includes(sk.id);
                        const selected = sk.id === selectedSkinId && unlocked;
                        const canAfford = save.passes >= sk.price;

                        return (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => handleSkinAction(sk)}
                            className={`shrink-0 w-[134px] flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all ${
                              selected
                                ? 'bg-slate-900/95 border-amber-400 text-white shadow-md shadow-amber-500/15'
                                : unlocked
                                  ? 'bg-slate-900/80 border-white/15 text-slate-200 hover:border-white/30'
                                  : canAfford
                                    ? 'bg-amber-950/50 border-amber-400/50 text-amber-100 hover:bg-amber-900/60'
                                    : 'bg-slate-950/80 border-white/10 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              {/* Mini character color preview: skin tone + hoodie/jacket + backpack */}
                              <span
                                className="flex items-center gap-1"
                                aria-hidden="true"
                              >
                                <span
                                  className="h-4 w-4 rounded-full border border-white/30"
                                  style={{ backgroundColor: sk.skinTone }}
                                />
                                <span
                                  className="h-4 w-3 rounded-sm border border-white/25"
                                  style={{ backgroundColor: sk.jacketColor }}
                                />
                              </span>

                              {selected ? (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400">
                                  <Check className="h-3 w-3" />
                                  {t.equippedLabel}
                                </span>
                              ) : unlocked ? (
                                <span className="text-[10px] font-semibold text-emerald-400">
                                  {sk.price === 0 ? sk.trait[language] : '✓'}
                                </span>
                              ) : (
                                <span
                                  className={`flex items-center gap-1 text-[10px] font-mono-nums font-bold ${
                                    canAfford ? 'text-amber-300' : 'text-slate-400'
                                  }`}
                                >
                                  <Lock className="h-2.5 w-2.5" />
                                  {sk.price}
                                </span>
                              )}
                            </div>

                            <div className="mt-1.5">
                              <div className="text-xs font-bold text-white truncate">
                                {sk.name[language]}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                {unlocked || canAfford
                                  ? unlocked
                                    ? sk.trait[language]
                                    : `${t.buyLabel} · ${sk.price}`
                                  : sk.trait[language]}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mode Selector: Levels (25) vs Endless Run */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/10 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setGameMode('CAMPAIGN')}
                      className={`h-10 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                        gameMode === 'CAMPAIGN'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {t.levelsTab}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGameMode('ENDLESS')}
                      className={`h-10 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                        gameMode === 'ENDLESS'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {t.endlessTab}
                    </button>
                  </div>

                  {/* 50-Level Grid Selector in Levels Mode */}
                  {gameMode === 'CAMPAIGN' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-300 gap-2">
                        <span className="font-semibold truncate">
                          {selectedWing + 1}. {selectedWingConfig.name[language]}
                        </span>
                        <span className="font-mono-nums text-amber-300 shrink-0 text-[11px]">
                          {formatSelectedChaserLabel(selectedWingConfig)} ·{' '}
                          {selectedWingConfig.targetMeters}m
                        </span>
                      </div>
                      <div className="max-h-32 overflow-y-auto pr-1">
                        <div className="grid grid-cols-5 gap-1.5">
                          {SCHOOL_WINGS.map((w, idx) => {
                            const unlocked = idx <= save.unlockedWing;
                            const active = idx === selectedWing;
                            const isFinale = w.id === 49;
                            const isAmbushLevel = w.chaseStages.length > 1 && !isFinale;
                            const isZirLevel = w.janitor === 'ZIR' && !isAmbushLevel;
                            return (
                              <button
                                key={w.id}
                                type="button"
                                disabled={!unlocked}
                                onClick={() => setSelectedWing(idx)}
                                className={`h-9 rounded-xl text-xs font-mono-nums font-bold border transition-colors ${
                                  active
                                    ? 'bg-white text-slate-950 border-white'
                                    : unlocked
                                      ? isFinale
                                        ? 'bg-amber-950/90 text-amber-200 border-amber-400/60 hover:bg-amber-900'
                                        : isAmbushLevel
                                          ? 'bg-rose-950/75 text-rose-200 border-rose-400/35 hover:bg-rose-900'
                                          : isZirLevel
                                            ? 'bg-teal-950/80 text-amber-300 border-amber-400/35 hover:bg-teal-900'
                                            : 'bg-slate-900/80 text-slate-200 border-white/15 hover:bg-slate-800'
                                      : 'bg-slate-950/60 text-slate-600 border-white/5 cursor-not-allowed'
                                }`}
                              >
                                {unlocked
                                  ? `${language === 'sr' ? 'N' : 'L'}${idx + 1}`
                                  : `${idx + 1}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        {selectedWingConfig.subtitle[language]}
                      </p>
                    </div>
                  )}

                  {gameMode === 'ENDLESS' && (
                    <p className="text-xs text-slate-300 leading-relaxed">{t.endlessDesc}</p>
                  )}

                  {/* Primary Action CTA */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        startRun(gameMode === 'CAMPAIGN' ? selectedWing : 0, gameMode, false)
                      }
                      className="w-full h-12 rounded-xl bg-amber-500 text-slate-950 font-display text-base font-extrabold tracking-tight hover:bg-amber-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 whitespace-nowrap"
                    >
                      <Play className="h-5 w-5 fill-slate-950" />
                      {t.startGame}
                    </button>

                    <p className="text-center text-xs text-slate-400">{t.controlsHint}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAUSED OVERLAY */}
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 space-y-5 shadow-2xl">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">{t.pausedTitle}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {displayWingName} · {hud.distance}m · {hud.score.toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center justify-between py-3 border-y border-white/10">
                  <span className="text-sm text-slate-300">{t.thumbPad}</span>
                  <button
                    type="button"
                    onClick={() => setShowThumbPad((v) => !v)}
                    className={`h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      showThumbPad
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {showThumbPad ? t.on : t.off}
                  </button>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setGameState('PLAYING')}
                    className="w-full h-12 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="h-4 w-4 fill-slate-950" />
                    {t.resume}
                  </button>
                  <button
                    type="button"
                    onClick={() => startRun(activeWingIndex, gameMode, false)}
                    className="w-full h-11 rounded-xl bg-slate-800 text-slate-100 font-medium text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t.restart}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="w-full h-11 rounded-xl bg-slate-800 text-slate-100 font-medium text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    {t.threatGuide}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameState('TITLE_MENU')}
                    className="w-full h-11 rounded-xl border border-white/10 text-slate-300 font-medium text-sm hover:bg-white/5 transition-colors"
                  >
                    {t.mainMenu}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LEVEL CLEAR OVERLAY */}
          {gameState === 'WING_CLEAR' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6">
              <div className="w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 space-y-5 shadow-2xl">
                <div>
                  <p className="text-xs font-semibold text-emerald-400">
                    {t.exitReached} · {activeWingIndex + 1}/{SCHOOL_WINGS.length} ·{' '}
                    {currentWing.name[language]}
                  </p>
                  <h2 className="font-display text-3xl font-extrabold text-white mt-1">
                    {t.wingCleared}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/10">
                  <div>
                    <div className="text-xs text-slate-400">{t.score}</div>
                    <div className="text-xl font-mono-nums font-bold text-amber-400 mt-0.5">
                      {hud.score.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t.hallPasses}</div>
                    <div className="text-xl font-mono-nums font-bold text-white mt-0.5">
                      +{hud.hallPasses} ({save.passes})
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t.broomsDodged}</div>
                    <div className="text-lg font-mono-nums font-semibold text-slate-200 mt-0.5">
                      {hud.broomsDodged}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t.trapsCleared}</div>
                    <div className="text-lg font-mono-nums font-semibold text-slate-200 mt-0.5">
                      {hud.trapsCleared}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => startRun(activeWingIndex + 1, 'CAMPAIGN', true)}
                    className="w-full h-12 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition-colors"
                  >
                    {t.continueTo} {activeWingIndex + 2}.{' '}
                    {SCHOOL_WINGS[activeWingIndex + 1]?.name[language]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameState('TITLE_MENU')}
                    className="w-full h-11 rounded-xl border border-white/10 text-slate-300 font-medium text-sm hover:bg-white/5 transition-colors"
                  >
                    {t.mainMenu}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VICTORY OVERLAY */}
          {gameState === 'VICTORY' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/88 backdrop-blur-md p-6">
              <div className="w-full max-w-sm rounded-2xl border border-amber-500/35 bg-slate-900 p-6 space-y-5 shadow-2xl">
                <div className="flex items-center gap-4">
                  <ResilientImage
                    src="/src/assets/images/student_runner_portrait_1795154776247.jpg"
                    alt={t.studentTitle}
                    className="h-16 w-16 rounded-xl object-cover shrink-0 border border-amber-400/40"
                    fallbackLabel="Freedom"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <Trophy className="h-4 w-4" />
                      {t.allWingsEscaped}
                    </div>
                    <h2 className="font-display text-2xl font-extrabold text-white mt-0.5">
                      {t.schoolEscaped}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/10">
                  <div>
                    <div className="text-xs text-slate-400">{t.finalScore}</div>
                    <div className="text-xl font-mono-nums font-bold text-amber-400 mt-0.5">
                      {hud.score.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t.walletPasses}</div>
                    <div className="text-xl font-mono-nums font-bold text-white mt-0.5">
                      {save.passes}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t.broomsDodged}</div>
                    <div className="text-lg font-mono-nums font-semibold text-slate-200 mt-0.5">
                      {hud.broomsDodged}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t.trapsCleared}</div>
                    <div className="text-lg font-mono-nums font-semibold text-slate-200 mt-0.5">
                      {hud.trapsCleared}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => startRun(0, 'ENDLESS', false)}
                    className="w-full h-12 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm hover:bg-amber-400 transition-colors"
                  >
                    {t.tryEndless}
                  </button>
                  <button
                    type="button"
                    onClick={() => startRun(0, 'CAMPAIGN', false)}
                    className="w-full h-11 rounded-xl bg-slate-800 text-slate-100 font-medium text-sm hover:bg-slate-700 transition-colors"
                  >
                    {t.playAgain}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameState('TITLE_MENU')}
                    className="w-full h-11 rounded-xl border border-white/10 text-slate-300 font-medium text-sm hover:bg-white/5 transition-colors"
                  >
                    {t.mainMenu}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GAME OVER OVERLAY */}
          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/88 backdrop-blur-md p-6">
              <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-slate-900 p-6 space-y-5 shadow-2xl">
                <div className="flex items-center gap-4">
                  <ResilientImage
                    src={activeJanitorPortrait}
                    alt={activeJanitorName}
                    className="h-16 w-16 rounded-xl object-cover shrink-0 border border-red-500/30"
                    fallbackLabel={activeJanitorName}
                  />
                  <div>
                    <p className="text-xs font-semibold text-red-400">
                      {displayWingName}
                      {newBestRun ? ` · ${t.newBestScore}` : ''}
                    </p>
                    <h2 className="font-display text-2xl font-extrabold text-white mt-0.5">
                      {activeCaughtTitle}
                    </h2>
                    {hud.caughtReason && (
                      <p className="text-xs text-slate-400 mt-0.5">{hud.caughtReason}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/10">
                  <div>
                    <div className="text-xs text-slate-400">{t.score}</div>
                    <div className="text-xl font-mono-nums font-bold text-amber-400 mt-0.5">
                      {hud.score.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t.distance}</div>
                    <div className="text-xl font-mono-nums font-bold text-white mt-0.5">
                      {hud.distance}m
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t.hallPasses}</div>
                    <div className="text-lg font-mono-nums font-semibold text-amber-300 mt-0.5">
                      +{hud.hallPasses} ({save.passes})
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t.personalBest}</div>
                    <div className="text-lg font-mono-nums font-semibold text-slate-200 mt-0.5">
                      {save.bestScore.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => startRun(activeWingIndex, gameMode, false)}
                    className="w-full h-12 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t.playAgain}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameState('TITLE_MENU')}
                    className="w-full h-11 rounded-xl border border-white/10 text-slate-300 font-medium text-sm hover:bg-white/5 transition-colors"
                  >
                    {t.mainMenu}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Desktop Right Panel: Live Run Stats & Keyboard Controls */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-5 overflow-y-auto">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <ResilientImage
                src="/src/assets/images/student_runner_portrait_1795154776247.jpg"
                alt={t.studentTitle}
                className="h-14 w-14 rounded-xl object-cover shrink-0 border border-white/10"
                fallbackLabel={t.studentTitle}
              />
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold text-white truncate">
                  {t.runStatus}
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  {displayWingName} · {activeSkin.name[language]}
                </p>
              </div>
            </div>

            {/* Bell Rush Meter */}
            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">{t.bellRushMeter}</span>
                <span className="font-mono-nums text-amber-400">
                  {hud.bellRushActive
                    ? `${hud.bellRushRemaining.toFixed(1)}s`
                    : `${hud.bellRushCharge}/10`}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-lg bg-slate-950 overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-150 ${
                    hud.bellRushActive ? 'bg-amber-400' : 'bg-amber-500/80'
                  }`}
                  style={{
                    width: hud.bellRushActive
                      ? `${Math.max(0, (hud.bellRushRemaining / 5.5) * 100)}%`
                      : `${(hud.bellRushCharge / 10) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-400">{t.bellRushDesc}</p>
            </div>

            {/* Live Counters */}
            <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400">{t.walletPasses}</div>
                <div className="text-xl font-mono-nums font-bold text-amber-300 mt-0.5">
                  {save.passes}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">{t.streak}</div>
                <div className="text-xl font-mono-nums font-bold text-emerald-400 mt-0.5">
                  {hud.combo}x
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">{t.broomsDodged}</div>
                <div className="text-xl font-mono-nums font-bold text-amber-400 mt-0.5">
                  {hud.broomsDodged}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">{t.trapsCleared}</div>
                <div className="text-xl font-mono-nums font-bold text-slate-200 mt-0.5">
                  {hud.trapsCleared}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Legend */}
          <div className="border-t border-white/10 pt-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Gamepad2 className="h-4 w-4 text-amber-400" />
              {t.controlsTitle}
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>{t.ctrlMove}</span>
                <span className="font-mono-nums text-slate-200">A / D · ← / →</span>
              </div>
              <div className="flex justify-between">
                <span>{t.ctrlJump}</span>
                <span className="font-mono-nums text-slate-200">W / ↑ / Space</span>
              </div>
              <div className="flex justify-between">
                <span>{t.ctrlSlide}</span>
                <span className="font-mono-nums text-slate-200">S / ↓</span>
              </div>
              <div className="flex justify-between">
                <span>{t.ctrlPause}</span>
                <span className="font-mono-nums text-slate-200">P / Esc</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Hallway Threat Guide Modal */}
      <FieldGuideModal
        open={guideOpen}
        language={language}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  );
}
