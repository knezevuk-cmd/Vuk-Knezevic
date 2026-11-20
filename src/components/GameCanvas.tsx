import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Language, TRANSLATIONS } from '../game/i18n';
import {
  GOCA_BASE_Z,
  MAX_Z,
  PLAYER_Z,
  projectPoint,
  renderGameFrame,
} from '../game/renderer';
import { sound } from '../game/sound';
import {
  ActionClearance,
  FloatingCallout,
  GameMode,
  GameState,
  HudSnapshot,
  JanitorId,
  Lane,
  Obstacle,
  ObstacleKind,
  Particle,
  Pickup,
  StudentSkin,
  ThrownBroom,
  WingConfig,
} from '../game/types';
import { SCHOOL_WINGS } from '../game/wings';

export interface GameController {
  moveLeft: () => void;
  moveRight: () => void;
  jump: () => void;
  slide: () => void;
  resetRun: (wingIndex: number, mode: GameMode, preserveScore?: boolean) => void;
}

interface GameCanvasProps {
  gameState: GameState;
  gameMode: GameMode;
  wingIndex: number;
  language: Language;
  skin: StudentSkin;
  onHudUpdate: (hud: HudSnapshot) => void;
  onStartCaughtAnim: (hud: HudSnapshot) => void;
  onStartVictoryAnim: (hud: HudSnapshot) => void;
  onWingClear: (hud: HudSnapshot) => void;
  onGameOver: (hud: HudSnapshot) => void;
  onTogglePause: () => void;
  controllerRef: React.RefObject<GameController | null>;
}

const CLEARANCE_MAP: Record<ObstacleKind, ActionClearance> = {
  CHOMPER_LOCKER: 'DODGE',
  WALL_SLAM_DOOR: 'DODGE',
  SCHOOL_TABLE: 'DODGE',
  WET_FLOOR_CONE: 'JUMP',
  MOP_BUCKET: 'JUMP',
  SPRING_GRATE: 'JUMP',
  GLUE_SPILL: 'JUMP',
  FLYING_TEXTBOOK: 'JUMP',
  HIGH_DOOR_SWING: 'SLIDE',
  STEAM_PIPE: 'SLIDE',
  TRIP_WIRE: 'SLIDE',
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  gameMode,
  wingIndex,
  language,
  skin,
  onHudUpdate,
  onStartCaughtAnim,
  onStartVictoryAnim,
  onWingClear,
  onGameOver,
  onTogglePause,
  controllerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const gameModeRef = useRef<GameMode>(gameMode);
  const wingIndexRef = useRef<number>(wingIndex);
  const languageRef = useRef<Language>(language);
  const skinRef = useRef<StudentSkin>(skin);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  useEffect(() => {
    wingIndexRef.current = wingIndex;
  }, [wingIndex]);

  useEffect(() => {
    languageRef.current = language;
    const wing = getCurrentActiveWing();
    const cycle = gameModeRef.current === 'ENDLESS' ? Math.floor(simRef.current.distance / 500) : 0;
    const chaser = getActiveChaser(wing, cycle);
    simRef.current.janitorLine =
      chaser === 'DIREKTORKA' ? TRANSLATIONS[language].cStopThereDir : TRANSLATIONS[language].cStopThere;
    simRef.current.janitorLineTimer = 2.6;
  }, [language]);

  useEffect(() => {
    skinRef.current = skin;
  }, [skin]);

  const simRef = useRef({
    time: 0,
    score: 0,
    distance: 0,
    visualDistance: 0,
    combo: 1,
    hallPasses: 0,
    bellRushCharge: 0,
    bellRushActive: false,
    bellRushRemaining: 0,
    magnetRemaining: 0,
    lockersSmashed: 0,
    broomsDodged: 0,
    trapsCleared: 0,

    targetLane: 1 as Lane,
    playerLaneX: 0,
    playerTilt: 0,
    playerJumpY: 0,
    playerJumpVel: 0,
    jumpQueued: false,
    slideTimer: 0,
    shakeAmount: 0,

    // Chaser follows from behind (bottom GOCA_BASE_Z = 6.2) running UPWARD behind the student (PLAYER_Z = 24)
    chaseStageIndex: 0,
    handoffTimer: 0,
    handoffBellPlayed: false,
    outgoingFallen: null as { chaser: JanitorId; laneX: number; z: number; line?: string } | null,
    stageAlert: null as string | null,
    stageAlertTimer: 0,
    gocaLaneX: 0,
    gocaZ: GOCA_BASE_Z,
    broomCooldownTimer: 1.8,
    gocaAiming: false,
    gocaAimTimer: 0,
    gocaAimLane: 1 as Lane,
    gocaFallen: false,
    takeThisSpoken: false,
    janitorLine: TRANSLATIONS[language].cStopThere as string | null,
    janitorLineTimer: 2.8,
    janitorShoutCooldown: 6.5,

    // Cutscene states
    cutsceneTimer: 0,
    tauntPlayed: false,
    playerFallen: false,
    playerTongueOut: false,
    playerCustomZ: undefined as number | undefined,
    caughtReason: null as string | null,

    spawnTimer: 0.55,
    nextEntityId: 1,
    obstacles: [] as Obstacle[],
    brooms: [] as ThrownBroom[],
    pickups: [] as Pickup[],
    particles: [] as Particle[],
    callouts: [] as FloatingCallout[],
    hudEmitAccum: 0,
  });

  const getActiveWing = (): WingConfig => {
    const idx = Math.min(SCHOOL_WINGS.length - 1, Math.max(0, wingIndexRef.current));
    return SCHOOL_WINGS[idx];
  };

  const getCurrentActiveWing = (): WingConfig => {
    const s = simRef.current;
    if (gameModeRef.current === 'ENDLESS') {
      const cycle = Math.floor(s.distance / 500);
      return SCHOOL_WINGS[Math.min(SCHOOL_WINGS.length - 1, cycle)];
    }
    return getActiveWing();
  };

  const getActiveChaser = (wing: WingConfig, endlessCycle: number): JanitorId => {
    if (gameModeRef.current === 'ENDLESS') {
      const order: JanitorId[] = ['GOCA', 'ZIR', 'DIREKTORKA'];
      return order[endlessCycle % order.length];
    }
    const stages = wing.chaseStages;
    if (!stages || stages.length === 0) return wing.janitor;
    const idx = Math.min(stages.length - 1, Math.max(0, simRef.current.chaseStageIndex));
    return stages[idx].chaser;
  };

  const getStageBoundary = (wing: WingConfig, stageIndex: number): number => {
    let sum = 0;
    for (let i = 0; i <= stageIndex && i < wing.chaseStages.length; i++) {
      sum += wing.chaseStages[i].meters;
    }
    return sum;
  };

  const buildHud = (): HudSnapshot => {
    const s = simRef.current;
    const wing = getCurrentActiveWing();
    const endlessCycle = gameModeRef.current === 'ENDLESS' ? Math.floor(s.distance / 500) : 0;
    const chaser = getActiveChaser(wing, endlessCycle);
    const lang = languageRef.current;
    const t = TRANSLATIONS[lang];
    const progress =
      gameModeRef.current === 'ENDLESS'
        ? Math.min(1, s.distance / 1500)
        : Math.min(1, s.distance / wing.targetMeters);
    const curSpeed = wing.baseSpeed + (wing.maxSpeed - wing.baseSpeed) * progress;

    return {
      score: Math.floor(s.score),
      distance: Math.floor(s.distance),
      targetDistance: wing.targetMeters,
      wingIndex: wingIndexRef.current,
      wingName: gameModeRef.current === 'ENDLESS' ? t.endlessTab : wing.name[lang],
      combo: s.combo,
      hallPasses: s.hallPasses,
      bellRushCharge: s.bellRushCharge,
      bellRushActive: s.bellRushActive,
      bellRushRemaining: s.bellRushRemaining,
      magnetRemaining: s.magnetRemaining,
      lockersSmashed: s.lockersSmashed,
      broomsDodged: s.broomsDodged,
      trapsCleared: s.trapsCleared,
      speedKmh: Math.round(curSpeed * 0.95 + (s.bellRushActive ? 14 : 0)),
      janitor: chaser,
      janitorLine: s.janitorLineTimer > 0 ? s.janitorLine : null,
      janitorAiming: s.gocaAiming,
      stageAlert: s.stageAlertTimer > 0 ? s.stageAlert : null,
      caughtReason: s.caughtReason,
    };
  };

  const spawnBurst = (
    laneOffset: number,
    worldY: number,
    z: number,
    color: string,
    count: number,
    shape: Particle['shape'] = 'square'
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth || 400;
    const H = canvas.clientHeight || 700;
    const pt = projectPoint(laneOffset, worldY, z, W, H);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 210;
      simRef.current.particles.push({
        x: pt.x,
        y: pt.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 60,
        size: 4 + Math.random() * 7,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        color,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 10,
        shape,
      });
    }
  };

  const addCallout = (text: string, laneOffset: number, worldY: number, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth || 400;
    const H = canvas.clientHeight || 700;
    const pt = projectPoint(laneOffset, worldY, PLAYER_Z, W, H);
    simRef.current.callouts.push({
      id: simRef.current.nextEntityId++,
      text,
      x: pt.x,
      y: pt.y - 34,
      life: 0.85,
      maxLife: 0.85,
      color,
    });
  };

  const moveLeft = () => {
    if (gameStateRef.current !== 'PLAYING') return;
    sound.unlock();
    const s = simRef.current;
    if (s.targetLane > 0) {
      s.targetLane = (s.targetLane - 1) as Lane;
      s.playerTilt = -1;
      sound.playSwipe();
    }
  };

  const moveRight = () => {
    if (gameStateRef.current !== 'PLAYING') return;
    sound.unlock();
    const s = simRef.current;
    if (s.targetLane < 2) {
      s.targetLane = (s.targetLane + 1) as Lane;
      s.playerTilt = 1;
      sound.playSwipe();
    }
  };

  const jump = () => {
    if (gameStateRef.current !== 'PLAYING') return;
    sound.unlock();
    const s = simRef.current;
    if (s.playerJumpY <= 0.08) {
      s.playerJumpVel = 6.2;
      s.slideTimer = 0;
      s.jumpQueued = false;
      sound.playJump();
      spawnBurst(s.playerLaneX, 0.05, PLAYER_Z, '#e2e8f0', 6);
    } else {
      s.jumpQueued = true;
    }
  };

  const slide = () => {
    if (gameStateRef.current !== 'PLAYING') return;
    sound.unlock();
    const s = simRef.current;
    if (s.playerJumpY > 0.1) {
      s.playerJumpVel = -11.5;
    }
    s.slideTimer = 0.62;
    s.jumpQueued = false;
    sound.playSlide();
  };

  const resetRun = (nextWingIdx: number, mode: GameMode, preserveScore = false) => {
    const prevScore = preserveScore ? simRef.current.score : 0;
    const prevPasses = preserveScore ? simRef.current.hallPasses : 0;
    const prevSmashed = preserveScore ? simRef.current.lockersSmashed : 0;
    const prevBrooms = preserveScore ? simRef.current.broomsDodged : 0;
    const prevTraps = preserveScore ? simRef.current.trapsCleared : 0;

    wingIndexRef.current = nextWingIdx;
    gameModeRef.current = mode;

    const t = TRANSLATIONS[languageRef.current];

    simRef.current = {
      time: 0,
      score: prevScore,
      distance: 0,
      visualDistance: 0,
      combo: 1,
      hallPasses: prevPasses,
      bellRushCharge: 0,
      bellRushActive: false,
      bellRushRemaining: 0,
      magnetRemaining: 0,
      lockersSmashed: prevSmashed,
      broomsDodged: prevBrooms,
      trapsCleared: prevTraps,

      targetLane: 1,
      playerLaneX: 0,
      playerTilt: 0,
      playerJumpY: 0,
      playerJumpVel: 0,
      jumpQueued: false,
      slideTimer: 0,
      shakeAmount: 0,

      chaseStageIndex: 0,
      handoffTimer: 0,
      handoffBellPlayed: false,
      outgoingFallen: null,
      stageAlert: null,
      stageAlertTimer: 0,
      gocaLaneX: 0,
      gocaZ: GOCA_BASE_Z,
      broomCooldownTimer: 1.7,
      gocaAiming: false,
      gocaAimTimer: 0,
      gocaAimLane: 1,
      gocaFallen: false,
      takeThisSpoken: false,
      janitorLine: t.cStopThere,
      janitorLineTimer: 2.8,
      janitorShoutCooldown: 6.5,

      cutsceneTimer: 0,
      tauntPlayed: false,
      playerFallen: false,
      playerTongueOut: false,
      playerCustomZ: undefined,
      caughtReason: null,

      spawnTimer: 0.55,
      nextEntityId: 1,
      obstacles: [],
      brooms: [],
      pickups: [],
      particles: [],
      callouts: [],
      hudEmitAccum: 0,
    };

    const wing = SCHOOL_WINGS[Math.min(SCHOOL_WINGS.length - 1, Math.max(0, nextWingIdx))];
    const initialChaser = wing.chaseStages?.[0]?.chaser ?? wing.janitor;
    sound.speakBubble(t.cStopThere, languageRef.current, initialChaser, true);

    onHudUpdate(buildHud());
  };

  useImperativeHandle(controllerRef, () => ({
    moveLeft,
    moveRight,
    jump,
    slide,
    resetRun,
  }));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'PAUSED') {
          e.preventDefault();
          onTogglePause();
        }
        return;
      }
      if (gameStateRef.current !== 'PLAYING') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          e.preventDefault();
          jump();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          slide();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onTogglePause]);

  const touchTrackRef = useRef<{
    active: boolean;
    consumed: boolean;
    startX: number;
    startY: number;
  }>({ active: false, consumed: false, startX: 0, startY: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current !== 'PLAYING') return;
    sound.unlock();
    touchTrackRef.current = {
      active: true,
      consumed: false,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const t = touchTrackRef.current;
    if (!t.active || t.consumed || gameStateRef.current !== 'PLAYING') return;
    const dx = e.clientX - t.startX;
    const dy = e.clientY - t.startY;
    const threshold = 22;

    if (Math.hypot(dx, dy) >= threshold) {
      t.consumed = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) moveLeft();
        else moveRight();
      } else {
        if (dy < 0) jump();
        else slide();
      }
    }
  };

  const handlePointerUp = () => {
    touchTrackRef.current.active = false;
  };

  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const spawnWave = (wing: WingConfig, endlessBoost: number) => {
      const s = simRef.current;
      const distRemaining = wing.targetMeters - s.distance;
      if (gameModeRef.current === 'CAMPAIGN' && distRemaining < 45) {
        return;
      }

      const pool = wing.allowedObstacles;
      const pickKind = (): ObstacleKind => pool[Math.floor(Math.random() * pool.length)];

      const roll = Math.random();
      const lanes: Lane[] = [0, 1, 2];
      for (let i = lanes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
      }

      const makeObstacle = (kind: ObstacleKind, lane: Lane, zPos: number): Obstacle => {
        let actualKind = kind;
        if (actualKind === 'WALL_SLAM_DOOR' && lane === 1) {
          actualKind = Math.random() < 0.5 ? 'SCHOOL_TABLE' : 'CHOMPER_LOCKER';
        }
        let targetLane: Lane | undefined;
        if (
          actualKind === 'CHOMPER_LOCKER' &&
          Math.random() < wing.chomperWeaveChance + endlessBoost * 0.08
        ) {
          if (lane === 0) targetLane = 1;
          else if (lane === 2) targetLane = 1;
          else targetLane = Math.random() < 0.5 ? 0 : 2;
        }
        return {
          id: s.nextEntityId++,
          kind: actualKind,
          clearance: CLEARANCE_MAP[actualKind],
          lane,
          targetLane,
          hasShifted: false,
          z: zPos,
          triggered: false,
          smashed: false,
          seed: Math.random() * 100,
        };
      };

      let safeLane: Lane = lanes[2];
      const spawnFarZ = MAX_Z - 2; // 88 — far horizon at TOP of hallway!

      if (roll < 0.36) {
        s.obstacles.push(makeObstacle(pickKind(), lanes[0], spawnFarZ));
        safeLane = lanes[1];
      } else if (roll < 0.78) {
        const k1 = pickKind();
        const k2 = pickKind();
        s.obstacles.push(makeObstacle(k1, lanes[0], spawnFarZ));
        s.obstacles.push(
          makeObstacle(k2, lanes[1], Math.random() < 0.35 ? spawnFarZ - 2.4 : spawnFarZ)
        );
        safeLane = lanes[2];
      } else {
        const isJumpWave = Math.random() < 0.55;
        const wavePool = pool.filter((k) => CLEARANCE_MAP[k] === (isJumpWave ? 'JUMP' : 'SLIDE'));
        const chosen =
          wavePool.length > 0
            ? wavePool[Math.floor(Math.random() * wavePool.length)]
            : isJumpWave
              ? 'WET_FLOOR_CONE'
              : 'HIGH_DOOR_SWING';

        for (const ln of [0, 1, 2] as Lane[]) {
          s.obstacles.push(makeObstacle(chosen, ln, spawnFarZ));
        }
        safeLane = lanes[0];
      }

      const pRoll = Math.random();
      if (pRoll < 0.82) {
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          s.pickups.push({
            id: s.nextEntityId++,
            kind: 'HALL_PASS',
            lane: safeLane,
            visualXOffset: 0,
            z: spawnFarZ - i * 3.0,
            yBobPhase: i * 0.8,
            collected: false,
          });
        }
      } else {
        s.pickups.push({
          id: s.nextEntityId++,
          kind: 'MAGNET',
          lane: safeLane,
          visualXOffset: 0,
          z: spawnFarZ,
          yBobPhase: 0,
          collected: false,
        });
      }
    };

    const triggerInstantFall = (reason: string, fromObstacle: boolean = false) => {
      const s = simRef.current;
      const t = TRANSLATIONS[languageRef.current];
      const wing = getCurrentActiveWing();
      const cycle = gameModeRef.current === 'ENDLESS' ? Math.floor(s.distance / 500) : 0;
      const chaser = getActiveChaser(wing, cycle);
      s.playerFallen = true;
      s.gocaAiming = false;
      s.brooms = [];
      s.outgoingFallen = null;
      s.stageAlertTimer = 0;
      s.handoffTimer = 0;
      s.cutsceneTimer = 0;
      s.caughtReason = reason;
      s.janitorLine =
        chaser === 'DIREKTORKA'
          ? t.cGotchaDir
          : chaser === 'ZIR'
            ? t.cGotchaZir
            : t.cGotcha;
      s.janitorLineTimer = 3.0;
      s.shakeAmount = 16;
      if (fromObstacle) {
        sound.playObstacleAgh();
      } else {
        sound.playHit();
      }
      sound.speakBubble(s.janitorLine, languageRef.current, chaser, true);
      spawnBurst(s.playerLaneX, 0.5, PLAYER_Z, '#ef4444', 18, 'shard');
      addCallout(t.cTripped, s.playerLaneX, 1.35, '#ef4444');
      gameStateRef.current = 'CAUGHT_ANIM';
      onStartCaughtAnim(buildHud());
    };

    const getReasonLabel = (kind: ObstacleKind): string => {
      const t = TRANSLATIONS[languageRef.current];
      switch (kind) {
        case 'SCHOOL_TABLE':
          return t.reasonTable;
        case 'CHOMPER_LOCKER':
          return t.reasonChomper;
        case 'WALL_SLAM_DOOR':
          return t.reasonWallDoor;
        case 'WET_FLOOR_CONE':
        case 'MOP_BUCKET':
          return t.reasonWetFloor;
        case 'SPRING_GRATE':
          return t.reasonSpring;
        case 'GLUE_SPILL':
          return t.reasonGlue;
        default:
          return t.reasonDefault;
      }
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTs) / 1000;
      lastTs = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        if (cw > 0 && ch > 0) {
          const targetW = Math.round(cw * dpr);
          const targetH = Math.round(ch * dpr);
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const s = simRef.current;
            const curState = gameStateRef.current;
            const wing = getActiveWing();
            const t = TRANSLATIONS[languageRef.current];

            const endlessWingCycle =
              gameModeRef.current === 'ENDLESS' ? Math.floor(s.distance / 500) : 0;
            const activeWing =
              gameModeRef.current === 'ENDLESS'
                ? SCHOOL_WINGS[Math.min(SCHOOL_WINGS.length - 1, endlessWingCycle)]
                : wing;

            if (curState === 'PLAYING') {
              s.time += dt;

              const progress =
                gameModeRef.current === 'ENDLESS'
                  ? Math.min(1, s.distance / 2500)
                  : Math.min(1, s.distance / activeWing.targetMeters);

              const baseSpeed =
                activeWing.baseSpeed +
                (activeWing.maxSpeed - activeWing.baseSpeed) * progress +
                endlessWingCycle * 2.5;
              const speed = baseSpeed * (s.bellRushActive ? 1.38 : 1);
              // Obstacles spawn at far TOP (88) and scroll DOWNWARD toward student (PLAYER_Z = 24)
              const worldZSpeed = speed * 1.18;

              s.visualDistance += speed * dt;
              s.score += speed * dt * (1 + (s.combo - 1) * 0.15);

              if (s.handoffTimer <= 0) {
                s.distance += speed * dt;

                // Multi-stage fake-out handoff check (Campaign levels 26–50)
                if (
                  gameModeRef.current === 'CAMPAIGN' &&
                  s.chaseStageIndex < activeWing.chaseStages.length - 1
                ) {
                  const stageBoundary = getStageBoundary(activeWing, s.chaseStageIndex);
                  if (s.distance >= stageBoundary) {
                    const prevChaser = activeWing.chaseStages[s.chaseStageIndex].chaser;
                    s.distance = stageBoundary;
                    s.chaseStageIndex += 1;
                    s.handoffTimer = 1.45;
                    s.handoffBellPlayed = false;
                    s.gocaAiming = false;
                    s.brooms = [];
                    s.outgoingFallen = {
                      chaser: prevChaser,
                      laneX: s.gocaLaneX,
                      z: Math.max(3.5, s.gocaZ),
                      line: t.cChaserTired,
                    };
                    s.gocaZ = -10;
                    s.stageAlert = t.cFakeOutOver;
                    s.stageAlertTimer = 1.5;
                    s.janitorLineTimer = 0;
                    s.shakeAmount = 6;
                    sound.playLockerSlam();
                    sound.speakBubble(t.cChaserTired, languageRef.current, prevChaser, true);
                    spawnBurst(s.outgoingFallen.laneX, 0.25, s.outgoingFallen.z, '#e2e8f0', 10);
                  }
                }
              }

              const currentChaser = getActiveChaser(activeWing, endlessWingCycle);

              if (s.shakeAmount > 0) s.shakeAmount = Math.max(0, s.shakeAmount - dt * 28);
              if (s.magnetRemaining > 0) s.magnetRemaining = Math.max(0, s.magnetRemaining - dt);
              if (s.janitorLineTimer > 0) s.janitorLineTimer = Math.max(0, s.janitorLineTimer - dt);
              if (s.stageAlertTimer > 0) s.stageAlertTimer = Math.max(0, s.stageAlertTimer - dt);

              if (s.handoffTimer > 0) {
                s.handoffTimer = Math.max(0, s.handoffTimer - dt);
                if (s.handoffTimer > 0.75) {
                  if (s.outgoingFallen) {
                    s.outgoingFallen.z = Math.max(0.2, s.outgoingFallen.z - dt * 5.2);
                  }
                  s.gocaZ = -10;
                } else {
                  s.outgoingFallen = null;
                  if (!s.handoffBellPlayed) {
                    s.handoffBellPlayed = true;
                    sound.playSchoolBell();
                    s.shakeAmount = 9;
                    if (activeWing.id === 49 && s.chaseStageIndex === 2) {
                      s.stageAlert = t.cDirFinal100;
                    } else if (currentChaser === 'DIREKTORKA') {
                      s.stageAlert = t.cDirTakesOver;
                    } else {
                      s.stageAlert = t.cZirTakesOver;
                    }
                    s.stageAlertTimer = 2.6;
                    s.janitorLine =
                      currentChaser === 'DIREKTORKA' ? t.cStopThereDir : t.cStopThere;
                    s.janitorLineTimer = 2.5;
                    sound.speakBubble(s.janitorLine, languageRef.current, currentChaser, true);
                    s.broomCooldownTimer =
                      currentChaser === 'DIREKTORKA' && activeWing.id === 49 ? 0.3 : 0.85;
                  }
                  const enterProg = Math.min(1, (0.75 - s.handoffTimer) / 0.75);
                  s.gocaZ = 0.4 + (GOCA_BASE_Z - 0.4) * enterProg;
                  s.gocaLaneX += (s.playerLaneX * 0.72 - s.gocaLaneX) * Math.min(1, dt * 8);
                }
              } else if (!s.gocaAiming && s.janitorLineTimer <= 0) {
                s.janitorShoutCooldown -= dt;
                if (s.janitorShoutCooldown <= 0) {
                  s.janitorLine =
                    currentChaser === 'DIREKTORKA' ? t.cStopThereDir : t.cStopThere;
                  s.janitorLineTimer = 2.4;
                  s.janitorShoutCooldown = 6.5;
                  sound.speakBubble(s.janitorLine, languageRef.current, currentChaser);
                }
              }

              if (s.bellRushActive) {
                s.bellRushRemaining -= dt;
                if (s.bellRushRemaining <= 0) {
                  s.bellRushActive = false;
                  s.bellRushRemaining = 0;
                  s.bellRushCharge = 0;
                }
              }

              // Player lane movement & lean
              const desiredX = s.targetLane - 1;
              const diff = desiredX - s.playerLaneX;
              s.playerLaneX += diff * Math.min(1, dt * 18);
              s.playerTilt += (diff * 2.2 - s.playerTilt) * Math.min(1, dt * 14);

              // Jump physics
              if (s.playerJumpY > 0 || s.playerJumpVel > 0) {
                s.playerJumpY += s.playerJumpVel * dt;
                s.playerJumpVel -= 18.5 * dt;
                if (s.playerJumpY <= 0) {
                  s.playerJumpY = 0;
                  s.playerJumpVel = 0;
                  if (s.jumpQueued) {
                    s.jumpQueued = false;
                    s.playerJumpVel = 6.2;
                    sound.playJump();
                  }
                }
              }

              if (s.slideTimer > 0) {
                s.slideTimer = Math.max(0, s.slideTimer - dt);
              }

              // Chaser tracking behind player & throw aiming cycle (skipped during handoff fake-out)
              const aimDuration = currentChaser === 'DIREKTORKA' ? 0.85 : 1.2;
              if (s.handoffTimer <= 0) {
                const targetGocaX = s.gocaAiming
                  ? (s.gocaAimLane - 1) * 0.85
                  : s.playerLaneX * 0.72;
                s.gocaLaneX += (targetGocaX - s.gocaLaneX) * Math.min(1, dt * 4.5);
                s.gocaZ = GOCA_BASE_Z + Math.sin(s.time * 3.5) * 0.85;

                if (!s.gocaAiming && s.brooms.length === 0) {
                  s.broomCooldownTimer -= dt;
                  if (s.broomCooldownTimer <= 0) {
                    s.gocaAiming = true;
                    s.gocaAimTimer = 0;
                    s.takeThisSpoken = false;
                    s.gocaAimLane = s.targetLane;
                    s.janitorLine =
                      currentChaser === 'DIREKTORKA'
                        ? t.cHoldStillDir
                        : currentChaser === 'ZIR'
                          ? t.cHoldStillZir
                          : t.cHoldStill;
                    s.janitorLineTimer = 2.0;
                    sound.playAimLock();
                    sound.speakBubble(s.janitorLine, languageRef.current, currentChaser, true);
                  }
                } else if (s.gocaAiming) {
                  s.gocaAimTimer += dt;
                  if (!s.takeThisSpoken && s.gocaAimTimer >= aimDuration * 0.68) {
                    s.takeThisSpoken = true;
                    const throwLine =
                      currentChaser === 'DIREKTORKA' ? t.cTakeThisDir : t.cTakeThis;
                    s.janitorLine = throwLine;
                    s.janitorLineTimer = 0.9;
                    sound.speakBubble(throwLine, languageRef.current, currentChaser, true);
                  }
                  if (s.gocaAimTimer >= aimDuration) {
                    s.gocaAiming = false;
                    s.brooms.push({
                      id: s.nextEntityId++,
                      lane: s.gocaAimLane,
                      z: s.gocaZ + 2,
                      rotation: 0,
                      missed: false,
                      weapon: currentChaser === 'DIREKTORKA' ? 'RULER' : 'BROOM',
                    });
                    sound.playBroomThrow();
                    s.broomCooldownTimer =
                      currentChaser === 'DIREKTORKA'
                        ? Math.max(1.25, activeWing.broomCooldown * 0.72)
                        : activeWing.broomCooldown;
                  }
                }
              }

              // Update thrown brooms & rulers (flying UPWARD from chaser toward player's back!)
              for (const b of s.brooms) {
                b.z += (b.weapon === 'RULER' ? 48 : 44) * dt;
                b.rotation += dt * 16;

                if (!b.missed && b.z >= PLAYER_Z - 1.15 && b.z <= PLAYER_Z + 1.15) {
                  const laneOverlap = Math.abs(s.playerLaneX - (b.lane - 1)) < 0.43;
                  if (laneOverlap) {
                    if (s.bellRushActive) {
                      b.missed = true;
                      s.score += 150;
                      sound.playPickup(4);
                      addCallout(t.cDeflected, b.lane - 1, 1.3, '#fbbf24');
                    } else {
                      const hitReason =
                        b.weapon === 'RULER'
                          ? t.reasonRulerDir
                          : currentChaser === 'ZIR'
                            ? t.reasonBroomZir
                            : t.reasonBroom;
                      triggerInstantFall(hitReason);
                      break;
                    }
                  }
                }

                if (!b.missed && b.z > PLAYER_Z + 1.4) {
                  b.missed = true;
                  s.broomsDodged += 1;
                  s.score += 120 * s.combo;
                  addCallout(t.cBroomMissed, s.playerLaneX, 1.3, '#4ade80');
                }
              }
              s.brooms = s.brooms.filter((b) => b.z < MAX_Z);

              // Wave spawner (if still playing and not in dramatic fake-out handoff)
              if (gameStateRef.current === 'PLAYING') {
                if (s.handoffTimer <= 0) {
                  s.spawnTimer -= dt;
                  if (s.spawnTimer <= 0) {
                    spawnWave(activeWing, endlessWingCycle);
                    const minInterval = Math.max(0.5, activeWing.spawnInterval - progress * 0.16);
                    s.spawnTimer = minInterval * (s.bellRushActive ? 0.78 : 1);
                  }
                }

                // Update obstacles (scrolling DOWNWARD from z=88 toward PLAYER_Z=24)
                for (const obs of s.obstacles) {
                  const prevZ = obs.z;
                  obs.z -= worldZSpeed * dt;

                  if (obs.kind === 'WALL_SLAM_DOOR' && prevZ >= 54 && obs.z < 54) {
                    sound.playLockerSlam();
                  }

                  if (
                    obs.kind === 'CHOMPER_LOCKER' &&
                    obs.targetLane !== undefined &&
                    !obs.hasShifted &&
                    obs.z < 46
                  ) {
                    obs.lane = obs.targetLane;
                    obs.hasShifted = true;
                  }

                  if (
                    !obs.smashed &&
                    !obs.triggered &&
                    obs.z <= PLAYER_Z + 1.15 &&
                    obs.z >= PLAYER_Z - 1.1
                  ) {
                    const obsX = obs.lane - 1;
                    const laneOverlap = Math.abs(s.playerLaneX - obsX) < 0.43;

                    if (laneOverlap) {
                      if (s.bellRushActive) {
                        obs.smashed = true;
                        s.lockersSmashed += 1;
                        s.score += 200;
                        s.shakeAmount = 8;
                        sound.playSmash();
                        spawnBurst(obsX, 0.7, PLAYER_Z, '#fbbf24', 14, 'shard');
                        addCallout(t.cSmash, obsX, 1.3, '#fbbf24');
                      } else {
                        let hit = true;
                        if (obs.clearance === 'JUMP' && s.playerJumpY >= 0.38) {
                          hit = false;
                        } else if (obs.clearance === 'SLIDE' && s.slideTimer > 0.04) {
                          hit = false;
                        }

                        if (hit) {
                          obs.triggered = true;
                          triggerInstantFall(getReasonLabel(obs.kind), true);
                          break;
                        }
                      }
                    }
                  }

                  if (!obs.smashed && !obs.triggered && obs.z < PLAYER_Z - 1.3) {
                    obs.triggered = true;
                    if (obs.clearance === 'JUMP' || obs.clearance === 'SLIDE') {
                      s.trapsCleared += 1;
                      s.score += 45 * s.combo;
                    }
                  }
                }

                // Update pickups (scrolling DOWNWARD from far horizon toward player)
                for (const pk of s.pickups) {
                  pk.z -= worldZSpeed * dt;

                  if (
                    s.magnetRemaining > 0 &&
                    pk.kind === 'HALL_PASS' &&
                    pk.z < 48 &&
                    pk.z > PLAYER_Z - 1.5
                  ) {
                    const targetOff = s.playerLaneX - (pk.lane - 1);
                    pk.visualXOffset += (targetOff - pk.visualXOffset) * Math.min(1, dt * 10);
                  }

                  if (!pk.collected && pk.z <= PLAYER_Z + 1.25 && pk.z >= PLAYER_Z - 1.25) {
                    const pkX = pk.lane - 1 + pk.visualXOffset;
                    if (Math.abs(s.playerLaneX - pkX) < 0.56) {
                      pk.collected = true;
                      if (pk.kind === 'HALL_PASS') {
                        s.hallPasses += 1;
                        s.combo = Math.min(10, s.combo + 1);
                        s.score += 50 * s.combo;
                        sound.playPickup(s.combo);
                        spawnBurst(pkX, 0.35, PLAYER_Z, '#fbbf24', 7);

                        if (!s.bellRushActive) {
                          s.bellRushCharge += 1;
                          if (s.bellRushCharge >= 10) {
                            s.bellRushActive = true;
                            s.bellRushRemaining = 5.5;
                            s.bellRushCharge = 10;
                            sound.playSchoolBell();
                            s.shakeAmount = 7;
                            addCallout(t.cBellRush, s.playerLaneX, 1.5, '#fbbf24');
                          }
                        }
                      } else if (pk.kind === 'MAGNET') {
                        sound.playApple();
                        s.magnetRemaining = 6.5;
                        addCallout(t.cMagnet, pkX, 1.3, '#38bdf8');
                        spawnBurst(pkX, 0.35, PLAYER_Z, '#38bdf8', 10);
                      }
                    }
                  }
                }

                s.obstacles = s.obstacles.filter((o) => o.z > 0.2 && !o.smashed);
                s.pickups = s.pickups.filter((p) => p.z > 0.2 && !p.collected);

                // Check Level Victory -> launch Victory Cutscene!
                if (
                  gameModeRef.current === 'CAMPAIGN' &&
                  s.distance >= activeWing.targetMeters &&
                  gameStateRef.current === 'PLAYING'
                ) {
                  s.obstacles = [];
                  s.brooms = [];
                  s.outgoingFallen = null;
                  s.stageAlertTimer = 0;
                  s.handoffTimer = 0;
                  s.gocaAiming = false;
                  s.cutsceneTimer = 0;
                  s.tauntPlayed = false;
                  s.playerJumpY = 0;
                  s.slideTimer = 0;
                  s.playerCustomZ = PLAYER_Z;
                  sound.playWingClear();
                  gameStateRef.current = 'VICTORY_ANIM';
                  onStartVictoryAnim(buildHud());
                }
              }
            } else if (curState === 'CAUGHT_ANIM') {
              // Student fell down at PLAYER_Z=24; Goca sprints UPWARD from behind (6.2) to catch him!
              s.time += dt;
              s.cutsceneTimer += dt;
              if (s.shakeAmount > 0) s.shakeAmount = Math.max(0, s.shakeAmount - dt * 28);

              const prog = Math.min(1, s.cutsceneTimer / 1.15);
              s.gocaZ = GOCA_BASE_Z + (PLAYER_Z - 3.5 - GOCA_BASE_Z) * prog;
              s.gocaLaneX += (s.playerLaneX - s.gocaLaneX) * Math.min(1, dt * 6);

              if (s.cutsceneTimer >= 1.55) {
                gameStateRef.current = 'GAME_OVER';
                sound.playGameOver();
                onHudUpdate(buildHud());
                onGameOver(buildHud());
              }
            } else if (curState === 'VICTORY_ANIM') {
              // Level Beat Cutscene: Goca falls down, student sticks tongue out, then runs away safely!
              s.time += dt;
              s.cutsceneTimer += dt;
              if (s.shakeAmount > 0) s.shakeAmount = Math.max(0, s.shakeAmount - dt * 28);

              const ct = s.cutsceneTimer;
              if (ct < 0.75) {
                // Goca charges upward from behind and slips!
                const p = ct / 0.75;
                s.gocaZ = GOCA_BASE_Z + (16 - GOCA_BASE_Z) * p;
                s.gocaLaneX += (s.playerLaneX - s.gocaLaneX) * Math.min(1, dt * 5);
                s.playerCustomZ = PLAYER_Z + 2 * p;
              } else if (ct < 2.2) {
                // Chaser falls flat on the floor! Student turns toward her and sticks tongue out!
                if (!s.gocaFallen) {
                  s.gocaFallen = true;
                  s.shakeAmount = 8;
                  sound.playLockerSlam();
                  const fallChaser = getActiveChaser(activeWing, endlessWingCycle);
                  sound.speakBubble(t.cOuchBack, languageRef.current, fallChaser, true);
                  spawnBurst(s.gocaLaneX, 0.2, s.gocaZ, '#e2e8f0', 10);
                }
                s.playerTongueOut = true;
                s.playerCustomZ = 26;
                if (!s.tauntPlayed) {
                  s.tauntPlayed = true;
                  sound.playTaunt();
                }
              } else if (ct < 3.25) {
                // Student turns back and sprints safely UPWARD out the Exit Doors!
                s.playerTongueOut = false;
                const runOut = (ct - 2.2) / 1.05;
                s.playerCustomZ = Math.min(84, 26 + 58 * runOut);
              } else {
                gameStateRef.current = 'WING_CLEAR';
                onHudUpdate(buildHud());
                onWingClear(buildHud());
              }
            } else {
              // Idle subtle motion on menu/paused
              s.time += dt * 0.4;
            }

            // Update particles & floating callouts
            for (const pt of s.particles) {
              pt.x += pt.vx * dt;
              pt.y += pt.vy * dt;
              pt.vy += 380 * dt;
              pt.rotation += pt.vRot * dt;
              pt.life -= dt;
            }
            s.particles = s.particles.filter((pt) => pt.life > 0);

            for (const c of s.callouts) {
              c.y -= 48 * dt;
              c.life -= dt;
            }
            s.callouts = s.callouts.filter((c) => c.life > 0);

            if (curState === 'PLAYING') {
              s.hudEmitAccum += dt;
              if (s.hudEmitAccum >= 0.065) {
                s.hudEmitAccum = 0;
                onHudUpdate(buildHud());
              }
            }

            const renderChaser = getActiveChaser(activeWing, endlessWingCycle);
            const renderAimDuration = renderChaser === 'DIREKTORKA' ? 0.85 : 1.2;

            renderGameFrame(ctx, {
              width: cw,
              height: ch,
              wing: activeWing,
              skin: skinRef.current,
              t,
              distance: s.distance,
              scrollDistance: s.visualDistance,
              targetDistance: activeWing.targetMeters,
              isEndless: gameModeRef.current === 'ENDLESS',
              playerLaneX: s.playerLaneX,
              playerJumpY: s.playerJumpY,
              playerSlideT: s.slideTimer,
              playerTilt: s.playerTilt,
              bellRushActive: s.bellRushActive,
              bellRushRemaining: s.bellRushRemaining,
              magnetActive: s.magnetRemaining > 0,
              speed: activeWing.baseSpeed,
              time: s.time,
              shakeAmount: s.shakeAmount,
              janitor: renderChaser,
              gocaLaneX: s.gocaLaneX,
              gocaZ: s.gocaZ,
              gocaAiming: s.gocaAiming,
              gocaAimProgress: Math.min(1, s.gocaAimTimer / renderAimDuration),
              gocaAimLane: s.gocaAimLane,
              gocaFallen: s.gocaFallen,
              gocaLine: s.janitorLineTimer > 0 ? s.janitorLine : null,
              outgoingFallen: s.outgoingFallen,
              stageAlert: s.stageAlertTimer > 0 ? s.stageAlert : null,
              playerFallen: s.playerFallen,
              playerTongueOut: s.playerTongueOut,
              playerCustomZ: s.playerCustomZ,
              obstacles: s.obstacles,
              brooms: s.brooms,
              pickups: s.pickups,
              particles: s.particles,
              callouts: s.callouts,
            });
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onGameOver, onHudUpdate, onStartCaughtAnim, onStartVictoryAnim, onWingClear]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="w-full h-full block touch-game-surface cursor-pointer"
      aria-label="Locker Dash hallway chase game canvas"
    />
  );
};
