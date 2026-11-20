import { Language } from './i18n';

export type GameState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'CAUGHT_ANIM'
  | 'VICTORY_ANIM'
  | 'WING_CLEAR'
  | 'GAME_OVER'
  | 'VICTORY';

export type GameMode = 'CAMPAIGN' | 'ENDLESS';

export type JanitorId = 'GOCA' | 'ZIR' | 'DIREKTORKA';

export interface ChaseStage {
  chaser: JanitorId;
  meters: number;
}

export type Lane = 0 | 1 | 2;

export type ActionClearance = 'DODGE' | 'JUMP' | 'SLIDE';

export type SkinId = 'vuk' | 'jovan' | 'relja' | 'nina' | 'mila' | 'luka' | 'igor';

export interface StudentSkin {
  id: SkinId;
  name: Record<Language, string>;
  trait: Record<Language, string>;
  price: number;
  skinTone: string;
  widthScale: number;
  heightScale: number;
  hasHoodie?: boolean;
  isMuscular?: boolean;
  jacketColor: string;
  sleeveColor: string;
  packColor: string;
  packTrim: string;
  pantsColor: string;
  hairColor: string;
  accentHex: string;
}

export type ObstacleKind =
  | 'CHOMPER_LOCKER'
  | 'WALL_SLAM_DOOR'
  | 'SCHOOL_TABLE'
  | 'WET_FLOOR_CONE'
  | 'MOP_BUCKET'
  | 'SPRING_GRATE'
  | 'GLUE_SPILL'
  | 'HIGH_DOOR_SWING'
  | 'STEAM_PIPE'
  | 'TRIP_WIRE'
  | 'FLYING_TEXTBOOK';

export type PickupKind = 'HALL_PASS' | 'MAGNET';

export interface ThrownBroom {
  id: number;
  lane: Lane;
  z: number;
  rotation: number;
  missed: boolean;
  weapon?: 'BROOM' | 'RULER';
}

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  clearance: ActionClearance;
  lane: Lane;
  targetLane?: Lane;
  hasShifted?: boolean;
  z: number;
  triggered: boolean;
  smashed: boolean;
  seed: number;
}

export interface Pickup {
  id: number;
  kind: PickupKind;
  lane: Lane;
  visualXOffset: number;
  z: number;
  yBobPhase: number;
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  rotation: number;
  vRot: number;
  shape: 'square' | 'shard' | 'ring';
}

export interface FloatingCallout {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface WingConfig {
  id: number;
  name: Record<Language, string>;
  subtitle: Record<Language, string>;
  targetMeters: number;
  baseSpeed: number;
  maxSpeed: number;
  spawnInterval: number;
  broomCooldown: number;
  wallColor: string;
  wainscotColor: string;
  archColor: string;
  floorLight: string;
  floorDark: string;
  lockerColor: string;
  accentColor: string;
  allowedObstacles: ObstacleKind[];
  chomperWeaveChance: number;
  janitor: JanitorId;
  chaseStages: ChaseStage[];
}

export interface HudSnapshot {
  score: number;
  distance: number;
  targetDistance: number;
  wingIndex: number;
  wingName: string;
  combo: number;
  hallPasses: number;
  bellRushCharge: number;
  bellRushActive: boolean;
  bellRushRemaining: number;
  magnetRemaining: number;
  lockersSmashed: number;
  broomsDodged: number;
  trapsCleared: number;
  speedKmh: number;
  janitor: JanitorId;
  janitorLine: string | null;
  janitorAiming: boolean;
  caughtReason: string | null;
  stageAlert: string | null;
}

export interface ThreatInfo {
  kind: ObstacleKind | 'GOCA_BROOM';
  name: Record<Language, string>;
  clearance: ActionClearance;
  description: Record<Language, string>;
  counterplay: Record<Language, string>;
}
