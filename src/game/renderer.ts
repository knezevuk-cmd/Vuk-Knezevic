import { Translations } from './i18n';
import {
  FloatingCallout,
  JanitorId,
  Lane,
  Obstacle,
  Particle,
  Pickup,
  StudentSkin,
  ThrownBroom,
  WingConfig,
} from './types';

export const PLAYER_Z = 24;
export const GOCA_BASE_Z = 6.2;
export const MAX_Z = 90;

export interface RenderState {
  width: number;
  height: number;
  wing: WingConfig;
  skin: StudentSkin;
  t: Translations;
  distance: number;
  scrollDistance?: number;
  targetDistance: number;
  isEndless: boolean;
  playerLaneX: number;
  playerJumpY: number;
  playerSlideT: number;
  playerTilt: number;
  bellRushActive: boolean;
  bellRushRemaining: number;
  magnetActive: boolean;
  speed: number;
  time: number;
  shakeAmount: number;
  janitor: JanitorId;
  gocaLaneX: number;
  gocaZ: number;
  gocaAiming: boolean;
  gocaAimProgress: number;
  gocaAimLane: Lane;
  gocaFallen: boolean;
  gocaLine: string | null;
  outgoingFallen?: { chaser: JanitorId; laneX: number; z: number; line?: string } | null;
  stageAlert?: string | null;
  playerFallen: boolean;
  playerTongueOut: boolean;
  playerCustomZ?: number;
  obstacles: Obstacle[];
  brooms: ThrownBroom[];
  pickups: Pickup[];
  particles: Particle[];
  callouts: FloatingCallout[];
}

interface ProjectedPoint {
  x: number;
  y: number;
  scale: number;
  t: number;
}

const P_MAX = 1 / (1 + MAX_Z * 0.032);

export function projectPoint(
  laneOffset: number,
  worldY: number,
  z: number,
  width: number,
  height: number
): ProjectedPoint {
  const clampedZ = Math.max(0.2, Math.min(MAX_Z, z));
  const p = 1 / (1 + clampedZ * 0.032);
  const t = (p - P_MAX) / (1 - P_MAX);

  const horizonY = height * 0.2;
  const floorBottomY = height * 0.87;
  const halfBaseWidth = width * 0.42;
  const laneSpread = halfBaseWidth * 0.66;

  const perspectiveScale = 0.22 + 0.78 * t;
  const screenY =
    horizonY +
    (floorBottomY - horizonY) * t -
    worldY * height * 0.19 * perspectiveScale;
  const screenX = width * 0.5 + laneOffset * laneSpread * perspectiveScale;

  return {
    x: screenX,
    y: screenY,
    scale: perspectiveScale,
    t,
  };
}

function laneToOffset(lane: Lane | number): number {
  return lane - 1;
}

export function renderGameFrame(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { width: W, height: H, wing, time, t } = state;

  ctx.save();

  if (state.shakeAmount > 0.2) {
    const sx = (Math.random() - 0.5) * state.shakeAmount;
    const sy = (Math.random() - 0.5) * state.shakeAmount;
    ctx.translate(sx, sy);
  }

  // 1. Dusk Plaster Ceiling & Vault Backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
  bgGrad.addColorStop(0, '#0b0e17');
  bgGrad.addColorStop(1, wing.wallColor);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.2;
  const floorBottomY = H * 0.87;

  const topLeft = projectPoint(-1.55, 0, MAX_Z, W, H);
  const topRight = projectPoint(1.55, 0, MAX_Z, W, H);
  const botLeft = projectPoint(-1.55, 0, 0.2, W, H);
  const botRight = projectPoint(1.55, 0, 0.2, W, H);

  const ceilTopLeft = projectPoint(-1.55, 2.55, MAX_Z, W, H);
  const ceilTopRight = projectPoint(1.55, 2.55, MAX_Z, W, H);
  const ceilBotLeft = projectPoint(-1.55, 2.55, 0.2, W, H);
  const ceilBotRight = projectPoint(1.55, 2.55, 0.2, W, H);

  // 2. European Plaster Upper Walls & Timber Wainscoting Lower Walls
  ctx.fillStyle = wing.wallColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(ceilTopLeft.x, ceilTopLeft.y);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.lineTo(botLeft.x, botLeft.y);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  const wTopLeft = projectPoint(-1.55, 1.05, MAX_Z, W, H);
  const wBotLeft = projectPoint(-1.55, 1.05, 0.2, W, H);
  ctx.fillStyle = wing.wainscotColor;
  ctx.beginPath();
  ctx.moveTo(wTopLeft.x, wTopLeft.y);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.lineTo(botLeft.x, botLeft.y);
  ctx.lineTo(wBotLeft.x, wBotLeft.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = wing.wallColor;
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(ceilTopRight.x, ceilTopRight.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(botRight.x, botRight.y);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  const wTopRight = projectPoint(1.55, 1.05, MAX_Z, W, H);
  const wBotRight = projectPoint(1.55, 1.05, 0.2, W, H);
  ctx.fillStyle = wing.wainscotColor;
  ctx.beginPath();
  ctx.moveTo(wTopRight.x, wTopRight.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(botRight.x, botRight.y);
  ctx.lineTo(wBotRight.x, wBotRight.y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(217, 179, 114, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wTopLeft.x, wTopLeft.y);
  ctx.lineTo(wBotLeft.x, wBotLeft.y);
  ctx.moveTo(wTopRight.x, wTopRight.y);
  ctx.lineTo(wBotRight.x, wBotRight.y);
  ctx.stroke();

  ctx.fillStyle = '#151822';
  ctx.beginPath();
  ctx.moveTo(ceilBotLeft.x, ceilBotLeft.y);
  ctx.lineTo(ceilTopLeft.x, ceilTopLeft.y);
  ctx.lineTo(ceilTopRight.x, ceilTopRight.y);
  ctx.lineTo(ceilBotRight.x, ceilBotRight.y);
  ctx.closePath();
  ctx.fill();

  // 3. European Terrazzo & Diamond Stone Corridor Floor (scrolling DOWNWARD as player runs UP!)
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(botRight.x, botRight.y);
  ctx.lineTo(botLeft.x, botLeft.y);
  ctx.closePath();
  ctx.save();
  ctx.clip();

  ctx.fillStyle = wing.floorDark;
  ctx.fillRect(0, horizonY, W, floorBottomY - horizonY + 120);

  const scrollDist = state.scrollDistance ?? state.distance;
  const bayDepth = 9.0;
  const scrollOffset = scrollDist % bayDepth;

  for (let z = MAX_Z; z >= 0.2; z -= bayDepth) {
    const zNear = Math.max(0.2, z - scrollOffset);
    const zFar = Math.min(MAX_Z, zNear + bayDepth);
    if (zFar <= zNear) continue;

    const fL = projectPoint(-1.32, 0, zFar, W, H);
    const fR = projectPoint(1.32, 0, zFar, W, H);
    const nR = projectPoint(1.32, 0, zNear, W, H);
    const nL = projectPoint(-1.32, 0, zNear, W, H);

    ctx.fillStyle = wing.floorLight;
    ctx.globalAlpha = 0.22 + 0.14 * nL.t;
    ctx.beginPath();
    ctx.moveTo(fL.x, fL.y);
    ctx.lineTo(fR.x, fR.y);
    ctx.lineTo(nR.x, nR.y);
    ctx.lineTo(nL.x, nL.y);
    ctx.closePath();
    ctx.fill();

    const zMid = (zNear + zFar) * 0.5;
    const dTop = projectPoint(0, 0, zFar - 1.1, W, H);
    const dBot = projectPoint(0, 0, zNear + 1.1, W, H);
    const dLeft = projectPoint(-0.95, 0, zMid, W, H);
    const dRight = projectPoint(0.95, 0, zMid, W, H);

    ctx.strokeStyle = 'rgba(245, 224, 180, 0.24)';
    ctx.lineWidth = Math.max(1, 2.2 * dBot.scale);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(dTop.x, dTop.y);
    ctx.lineTo(dRight.x, dRight.y);
    ctx.lineTo(dBot.x, dBot.y);
    ctx.lineTo(dLeft.x, dLeft.y);
    ctx.closePath();
    ctx.stroke();

    const moonGrad = ctx.createLinearGradient(nL.x, nL.y, nR.x, nR.y);
    moonGrad.addColorStop(0, 'rgba(147, 197, 253, 0.16)');
    moonGrad.addColorStop(0.55, 'rgba(147, 197, 253, 0.05)');
    moonGrad.addColorStop(1, 'rgba(147, 197, 253, 0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.moveTo(fL.x, fL.y);
    ctx.lineTo(fR.x, fR.y);
    ctx.lineTo(nR.x, nR.y);
    ctx.lineTo(nL.x, nL.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const laneEdge of [-0.5, 0.5]) {
    const fPt = projectPoint(laneEdge, 0, MAX_Z, W, H);
    const nPt = projectPoint(laneEdge, 0, 0.2, W, H);
    ctx.strokeStyle = state.bellRushActive
      ? 'rgba(251, 191, 36, 0.5)'
      : 'rgba(217, 185, 130, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fPt.x, fPt.y);
    ctx.lineTo(nPt.x, nPt.y);
    ctx.stroke();
  }

  const floorFog = ctx.createLinearGradient(
    0,
    horizonY,
    0,
    horizonY + (floorBottomY - horizonY) * 0.28
  );
  floorFog.addColorStop(0, '#0b0e17');
  floorFog.addColorStop(1, 'rgba(11, 14, 23, 0)');
  ctx.fillStyle = floorFog;
  ctx.fillRect(0, horizonY, W, (floorBottomY - horizonY) * 0.3);

  ctx.restore();

  // 4. Campaign Exit Gate at far TOP horizon when approaching end of level
  const distRemaining = Math.max(0, state.targetDistance - state.distance);
  if (!state.isEndless && distRemaining <= 105) {
    const exitZ = Math.max(PLAYER_Z + 12, Math.min(MAX_Z - 2, distRemaining + 22));
    drawExitDoors(ctx, exitZ, t.cExitSign, W, H, time);
  } else {
    ctx.fillStyle = '#090c14';
    ctx.fillRect(
      topLeft.x,
      ceilTopLeft.y,
      topRight.x - topLeft.x,
      topLeft.y - ceilTopLeft.y
    );
  }

  // 5. European Arched Mullioned Windows & Vaulted Arches (scrolling DOWNWARD)
  const archSpacing = 18;
  const archScroll = scrollDist % archSpacing;
  for (let z = MAX_Z - 3; z >= 2; z -= archSpacing) {
    const az = z - archScroll;
    if (az < 2 || az > MAX_Z) continue;

    const wzNear = Math.max(1.5, az - archSpacing * 0.72);
    const wzFar = Math.min(MAX_Z - 1, az - archSpacing * 0.16);
    if (wzFar > wzNear) {
      drawArchedWindow(ctx, wzNear, wzFar, W, H);
    }
    drawVaultArch(ctx, az, wing, state.bellRushActive, time, W, H);
  }

  // 6. Vintage European Sentient Wall Lockers (scrolling DOWNWARD)
  const lockerSpacing = 9.5;
  const lockerOffset = scrollDist % lockerSpacing;
  const ambushMap = new Map<number, Obstacle>();
  for (const obs of state.obstacles) {
    if (obs.kind === 'WALL_SLAM_DOOR' && !obs.smashed) {
      const bucket = Math.round((scrollDist + obs.z) / lockerSpacing);
      ambushMap.set(bucket * 10 + obs.lane, obs);
    }
  }

  for (let z = MAX_Z - 2; z >= 1.5; z -= lockerSpacing) {
    const wz = z - lockerOffset;
    if (wz < 1.5 || wz > MAX_Z) continue;
    const worldIdx = Math.round((scrollDist + wz) / lockerSpacing);

    drawWallLocker(
      ctx,
      -1,
      wz,
      wz + lockerSpacing * 0.72,
      worldIdx,
      wing,
      time,
      W,
      H,
      ambushMap.has(worldIdx * 10 + 0)
    );
    drawWallLocker(
      ctx,
      1,
      wz,
      wz + lockerSpacing * 0.72,
      worldIdx + 7,
      wing,
      time,
      W,
      H,
      ambushMap.has(worldIdx * 10 + 2)
    );
  }

  // 7. Goca's Aim Trajectory Line (from Goca behind up toward student's targeted lane!)
  if (state.gocaAiming && !state.gocaFallen) {
    const aimOff = laneToOffset(state.gocaAimLane);
    const pStart = projectPoint(state.gocaLaneX, 0.05, state.gocaZ, W, H);
    const pEnd = projectPoint(aimOff, 0.05, PLAYER_Z, W, H);
    const pulse = 0.45 + 0.55 * Math.sin(time * 22);

    ctx.save();
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.42 + 0.35 * pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(pStart.x, pStart.y);
    ctx.lineTo(pEnd.x, pEnd.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = `rgba(239, 68, 68, ${0.55 + 0.4 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(pEnd.x, pEnd.y, 38 * pEnd.scale, 13 * pEnd.scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 8. Depth-Sorted Entities: Far obstacles -> Student -> Flying Brooms -> Goca behind
  const activePlayerZ = state.playerCustomZ ?? PLAYER_Z;

  type DrawItem =
    | { kind: 'GOCA'; z: number }
    | { kind: 'OUTGOING'; z: number }
    | { kind: 'OBSTACLE'; z: number; data: Obstacle }
    | { kind: 'BROOM'; z: number; data: ThrownBroom }
    | { kind: 'PICKUP'; z: number; data: Pickup }
    | { kind: 'PLAYER'; z: number };

  const items: DrawItem[] = [
    { kind: 'GOCA', z: state.gocaZ },
    { kind: 'PLAYER', z: activePlayerZ },
  ];

  if (state.outgoingFallen && state.outgoingFallen.z >= 0.2) {
    items.push({ kind: 'OUTGOING', z: state.outgoingFallen.z });
  }

  for (const o of state.obstacles) {
    if (!o.smashed && o.z >= 0.2 && o.z <= MAX_Z) {
      items.push({ kind: 'OBSTACLE', z: o.z, data: o });
    }
  }
  for (const b of state.brooms) {
    if (b.z >= 0.2 && b.z <= MAX_Z) {
      items.push({ kind: 'BROOM', z: b.z, data: b });
    }
  }
  for (const p of state.pickups) {
    if (!p.collected && p.z >= 0.2 && p.z <= MAX_Z) {
      items.push({ kind: 'PICKUP', z: p.z, data: p });
    }
  }

  items.sort((a, b) => b.z - a.z);

  for (const item of items) {
    if (item.kind === 'GOCA') {
      drawChasingGoca(ctx, state, W, H);
    } else if (item.kind === 'OUTGOING' && state.outgoingFallen) {
      drawChaserFigure(
        ctx,
        state.outgoingFallen.chaser,
        state.outgoingFallen.laneX,
        state.outgoingFallen.z,
        true,
        false,
        0,
        state.outgoingFallen.line ?? null,
        state,
        W,
        H
      );
    } else if (item.kind === 'BROOM') {
      drawThrownBroom(ctx, item.data, W, H);
    } else if (item.kind === 'PICKUP') {
      drawPickup(ctx, item.data, W, H, time);
    } else if (item.kind === 'OBSTACLE') {
      drawObstacle(ctx, item.data, wing, W, H, time);
    } else {
      drawStudentPlayer(ctx, state, activePlayerZ, W, H);
    }
  }

  // 9. Particles
  for (const pt of state.particles) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.rotation);
    if (pt.shape === 'ring') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, pt.size * (1.8 - alpha), 0, Math.PI * 2);
      ctx.stroke();
    } else if (pt.shape === 'shard') {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.moveTo(-pt.size, -pt.size * 0.5);
      ctx.lineTo(pt.size, 0);
      ctx.lineTo(-pt.size * 0.4, pt.size);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = pt.color;
      ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
    }
    ctx.restore();
  }

  // 10. Bell Rush Speed Streaks
  if (state.bellRushActive) {
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.38)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + time * 2;
      const sx = W * 0.5 + Math.cos(ang) * W * 0.36;
      const sy = H * 0.4 + Math.sin(ang) * H * 0.24;
      const ex = W * 0.5 + Math.cos(ang) * W * 0.55;
      const ey = H * 0.4 + Math.sin(ang) * H * 0.48;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 11. Floating Callouts
  for (const c of state.callouts) {
    const alpha = Math.min(1, (c.life / c.maxLife) * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '800 16px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#090d16';
    ctx.strokeText(c.text, c.x, c.y);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, c.x, c.y);
    ctx.restore();
  }

  // 12. Dramatic Stage Handoff / Ambush Banner
  if (state.stageAlert) {
    const pulse = 1 + 0.04 * Math.sin(time * 20);
    ctx.save();
    ctx.translate(W * 0.5, H * 0.27);
    ctx.scale(pulse, pulse);
    ctx.font = `800 ${Math.max(15, Math.min(22, Math.round(W * 0.048)))}px "Bricolage Grotesque", sans-serif`;
    const tw = ctx.measureText(state.stageAlert).width + 32;
    ctx.fillStyle = 'rgba(127, 29, 29, 0.92)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -22, tw, 44, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.stageAlert, 0, 1);
    ctx.restore();
  }

  ctx.restore();
}

function drawExitDoors(
  ctx: CanvasRenderingContext2D,
  z: number,
  exitLabel: string,
  W: number,
  H: number,
  time: number
) {
  const bL = projectPoint(-1.45, 0, z, W, H);
  const bR = projectPoint(1.45, 0, z, W, H);
  const tL = projectPoint(-1.45, 2.25, z, W, H);
  const tR = projectPoint(1.45, 2.25, z, W, H);

  const doorW = bR.x - bL.x;
  const doorH = bL.y - tL.y;

  ctx.save();
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(tL.x, tL.y, doorW, doorH);
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = Math.max(2, 4 * bL.scale);
  ctx.strokeRect(tL.x, tL.y, doorW, doorH);

  const glow = 0.65 + 0.35 * Math.sin(time * 6);
  ctx.fillStyle = `rgba(16, 185, 129, ${0.34 * glow})`;
  ctx.fillRect(
    tL.x + doorW * 0.06,
    tL.y + doorH * 0.12,
    doorW * 0.42,
    doorH * 0.86
  );
  ctx.fillRect(
    tL.x + doorW * 0.52,
    tL.y + doorH * 0.12,
    doorW * 0.42,
    doorH * 0.86
  );

  const signW = doorW * 0.42;
  const signH = Math.max(10, doorH * 0.16);
  const signX = (tL.x + tR.x) / 2 - signW / 2;
  const signY = tL.y - signH * 0.5;
  ctx.fillStyle = '#059669';
  ctx.fillRect(signX, signY, signW, signH);
  ctx.strokeStyle = '#a7f3d0';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(signX, signY, signW, signH);

  if (signW > 24) {
    ctx.fillStyle = '#ecfdf5';
    ctx.font = `800 ${Math.max(8, Math.round(signH * 0.66))}px "Bricolage Grotesque", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(exitLabel, (tL.x + tR.x) / 2, signY + signH / 2 + 1);
  }
  ctx.restore();
}

function drawArchedWindow(
  ctx: CanvasRenderingContext2D,
  zNear: number,
  zFar: number,
  W: number,
  H: number
) {
  const bN = projectPoint(-1.54, 1.18, zNear, W, H);
  const bF = projectPoint(-1.54, 1.18, zFar, W, H);
  const tN = projectPoint(-1.54, 2.32, zNear, W, H);
  const tF = projectPoint(-1.54, 2.32, zFar, W, H);
  const midPeak = projectPoint(-1.54, 2.5, (zNear + zFar) * 0.5, W, H);

  ctx.save();
  const winGrad = ctx.createLinearGradient(tN.x, tN.y, bN.x, bN.y);
  winGrad.addColorStop(0, '#1e3a5f');
  winGrad.addColorStop(0.55, '#3b6696');
  winGrad.addColorStop(1, '#7ea8d6');

  ctx.fillStyle = winGrad;
  ctx.beginPath();
  ctx.moveTo(bN.x, bN.y);
  ctx.lineTo(bF.x, bF.y);
  ctx.lineTo(tF.x, tF.y);
  ctx.quadraticCurveTo(midPeak.x, midPeak.y, tN.x, tN.y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#181412';
  ctx.lineWidth = Math.max(1.5, 3 * bN.scale);
  ctx.stroke();

  const midBot = projectPoint(-1.54, 1.18, (zNear + zFar) * 0.5, W, H);
  const midHigh = projectPoint(-1.54, 2.38, (zNear + zFar) * 0.5, W, H);
  const crossN = projectPoint(-1.54, 1.75, zNear, W, H);
  const crossF = projectPoint(-1.54, 1.75, zFar, W, H);

  ctx.lineWidth = Math.max(1, 2 * bN.scale);
  ctx.beginPath();
  ctx.moveTo(midBot.x, midBot.y);
  ctx.lineTo(midHigh.x, midHigh.y);
  ctx.moveTo(crossN.x, crossN.y);
  ctx.lineTo(crossF.x, crossF.y);
  ctx.stroke();
  ctx.restore();
}

function drawVaultArch(
  ctx: CanvasRenderingContext2D,
  z: number,
  wing: WingConfig,
  bellRushActive: boolean,
  time: number,
  W: number,
  H: number
) {
  const bL = projectPoint(-1.55, 0, z, W, H);
  const bR = projectPoint(1.55, 0, z, W, H);
  const sL = projectPoint(-1.55, 2.05, z, W, H);
  const sR = projectPoint(1.55, 2.05, z, W, H);
  const apex = projectPoint(0, 2.68, z, W, H);

  ctx.save();
  ctx.globalAlpha = Math.min(1, bL.t * 1.4);

  const colW = Math.max(4, 16 * bL.scale);
  ctx.fillStyle = wing.archColor;
  ctx.fillRect(bL.x, sL.y, colW, bL.y - sL.y);
  ctx.fillRect(bR.x - colW, sR.y, colW, bR.y - sR.y);

  ctx.strokeStyle = wing.archColor;
  ctx.lineWidth = Math.max(3, 14 * bL.scale);
  ctx.beginPath();
  ctx.moveTo(sL.x + colW * 0.5, sL.y);
  ctx.quadraticCurveTo(apex.x, apex.y, sR.x - colW * 0.5, sR.y);
  ctx.stroke();

  const lampTop = projectPoint(0, 2.48, z, W, H);
  const lampBulb = projectPoint(0, 2.24, z, W, H);
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = Math.max(1, 2.2 * bL.scale);
  ctx.beginPath();
  ctx.moveTo(lampTop.x, lampTop.y);
  ctx.lineTo(lampBulb.x, lampBulb.y);
  ctx.stroke();

  const flicker = 0.85 + 0.15 * Math.sin(time * 9 + z);
  const lampR = Math.max(2.5, 9 * bL.scale);
  ctx.fillStyle = bellRushActive ? '#fde047' : '#fbbf24';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 18 * bL.scale * flicker;
  ctx.beginPath();
  ctx.arc(lampBulb.x, lampBulb.y, lampR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawWallLocker(
  ctx: CanvasRenderingContext2D,
  side: -1 | 1,
  zNear: number,
  zFar: number,
  seed: number,
  wing: WingConfig,
  time: number,
  W: number,
  H: number,
  isAmbushing: boolean
) {
  const wallX = side * 1.54;
  const innerX = side * 1.38;
  const topHeight = side === -1 ? 1.18 : 1.85;

  const fn = projectPoint(wallX, 0, zNear, W, H);
  const ff = projectPoint(wallX, 0, zFar, W, H);
  const tn = projectPoint(wallX, topHeight, zNear, W, H);
  const tf = projectPoint(wallX, topHeight, zFar, W, H);

  const inB = projectPoint(innerX, 0, zNear, W, H);
  const inT = projectPoint(innerX, topHeight, zNear, W, H);

  ctx.save();
  ctx.fillStyle = isAmbushing ? '#7f1d1d' : wing.lockerColor;
  ctx.beginPath();
  ctx.moveTo(fn.x, fn.y);
  ctx.lineTo(ff.x, ff.y);
  ctx.lineTo(tf.x, tf.y);
  ctx.lineTo(tn.x, tn.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#141210';
  ctx.lineWidth = Math.max(1, 2 * fn.scale);
  ctx.stroke();

  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.moveTo(fn.x, fn.y);
  ctx.lineTo(inB.x, inB.y);
  ctx.lineTo(inT.x, inT.y);
  ctx.lineTo(tn.x, tn.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const hasEyes = isAmbushing || Math.abs(seed) % 3 === 0;
  if (hasEyes && fn.scale > 0.25) {
    const midZ = (zNear + zFar) * 0.5;
    const eyePt = projectPoint(side * 1.52, topHeight * 0.78, midZ, W, H);
    const blink = !isAmbushing && Math.sin(time * 2.3 + seed) > 0.94;
    if (!blink) {
      const eyeR = Math.max(1.5, 4.2 * eyePt.scale);
      ctx.fillStyle = isAmbushing ? '#ef4444' : '#fbbf24';
      ctx.shadowColor = isAmbushing ? '#ef4444' : '#f59e0b';
      ctx.shadowBlur = 10 * eyePt.scale;
      ctx.beginPath();
      ctx.ellipse(
        eyePt.x - eyeR * 0.9,
        eyePt.y,
        eyeR * 0.85,
        eyeR * 0.55,
        0,
        0,
        Math.PI * 2
      );
      ctx.ellipse(
        eyePt.x + eyeR * 0.9,
        eyePt.y,
        eyeR * 0.85,
        eyeR * 0.55,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCapsuleLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rTop: number,
  rBot: number,
  fill: string,
  stroke = '#0f172a',
  lineW = 2
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ang = Math.atan2(dy, dx);

  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * rTop, y1 + ny * rTop);
  ctx.lineTo(x2 + nx * rBot, y2 + ny * rBot);
  ctx.arc(x2, y2, rBot, ang + Math.PI * 0.5, ang - Math.PI * 0.5, true);
  ctx.lineTo(x1 - nx * rTop, y1 - ny * rTop);
  ctx.arc(x1, y1, rTop, ang - Math.PI * 0.5, ang + Math.PI * 0.5, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRealisticShoe(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  upperColor: string,
  soleColor: string,
  lineW: number
) {
  ctx.save();
  ctx.fillStyle = upperColor;
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.25, w * 0.52, h * 0.55, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + w * 0.52, cy + h * 0.28);
  ctx.quadraticCurveTo(cx, cy + h * 0.48, cx - w * 0.52, cy + h * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sole rim
  ctx.fillStyle = soleColor;
  ctx.beginPath();
  ctx.roundRect(cx - w * 0.54, cy + h * 0.14, w * 1.08, h * 0.28, h * 0.14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBroomBristleHead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  s: number
) {
  ctx.save();
  // Wooden head mount
  ctx.fillStyle = '#78350f';
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = Math.max(1.2, 2 * s);
  ctx.beginPath();
  ctx.roundRect(cx - w * 0.45, cy - h * 0.52, w * 0.9, h * 0.42, 4 * s);
  ctx.fill();
  ctx.stroke();

  // Splayed straw bristles
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.42, cy - h * 0.12);
  ctx.lineTo(cx + w * 0.42, cy - h * 0.12);
  ctx.lineTo(cx + w * 0.54, cy + h * 0.55);
  ctx.quadraticCurveTo(cx, cy + h * 0.68, cx - w * 0.54, cy + h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bristle texture strokes
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = Math.max(1, 1.3 * s);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * w * 0.14, cy - h * 0.05);
    ctx.lineTo(cx + i * w * 0.18, cy + h * 0.52);
    ctx.stroke();
  }
  ctx.restore();
}

function drawChasingGoca(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  W: number,
  H: number
) {
  drawChaserFigure(
    ctx,
    state.janitor,
    state.gocaLaneX,
    state.gocaZ,
    state.gocaFallen,
    state.gocaAiming,
    state.gocaAimProgress,
    state.gocaLine,
    state,
    W,
    H
  );
}

function drawPointerRuler(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  s: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(ang);
  ctx.fillStyle = '#b45309';
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = Math.max(1.3, 1.8 * s);
  ctx.beginPath();
  ctx.roundRect(0, -4.5 * s, len, 9 * s, 2.5 * s);
  ctx.fill();
  ctx.stroke();

  // Brass tip & tick marks
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(len - 9 * s, -4.5 * s, 9 * s, 9 * s);
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = Math.max(1, 1.2 * s);
  for (let i = 10; i < len - 12; i += Math.max(6, 10 * s)) {
    ctx.beginPath();
    ctx.moveTo(i, -4.5 * s);
    ctx.lineTo(i, -1 * s);
    ctx.stroke();
  }
  ctx.restore();
}

function drawChaserFigure(
  ctx: CanvasRenderingContext2D,
  chaser: JanitorId,
  laneX: number,
  z: number,
  isFallen: boolean,
  isAiming: boolean,
  aimProgress: number,
  speechLine: string | null,
  state: RenderState,
  W: number,
  H: number
) {
  const base = projectPoint(laneX, 0, z, W, H);
  const vpFactor = Math.max(0.84, Math.min(1.16, H / 760));
  const isZir = chaser === 'ZIR';
  const isDir = chaser === 'DIREKTORKA';
  const s = base.scale * (isDir ? 0.94 : isZir ? 0.92 : 0.7) * vpFactor;
  const bubbleS = base.scale * 0.88 * vpFactor;
  const time = state.time;

  const shoulderHalf = (isDir ? 16.5 : isZir ? 20 : 21) * s;
  const hipHalf = (isDir ? 18 : isZir ? 24 : 26.5) * s;
  const armRTop = (isDir ? 5.2 : isZir ? 6.8 : 7.0) * s;
  const armRBot = (isDir ? 4.0 : isZir ? 5.2 : 5.4) * s;
  const legRTop = (isDir ? 5.6 : isZir ? 7 : 7.2) * s;
  const legRBot = (isDir ? 4.2 : isZir ? 5.2 : 5.4) * s;
  const apronColor = isDir ? '#7f1d1d' : isZir ? '#2a6f7b' : '#5b7a94';
  const apronShade = isDir ? '#450a0a' : isZir ? '#1f535c' : '#465f75';
  const sweaterColor = isDir ? '#7f1d1d' : isZir ? '#881337' : '#9a3412';
  const pocketColor = isDir ? '#fbbf24' : isZir ? '#7f1d3a' : '#334155';
  const pantsColor = isDir ? '#1e293b' : '#374151';
  const skinColor = '#fed7aa';
  const outlineW = Math.max(1.4, 2.0 * s);

  ctx.save();

  // Floor shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(base.x, base.y, (isDir ? 30 : isZir ? 38 : 39) * s, 10.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const drawBlondeLongBowlHair = (hx: number, hy: number, r: number) => {
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = outlineW;
    ctx.beginPath();
    ctx.moveTo(hx - r * 1.18, hy + r * 0.96);
    ctx.bezierCurveTo(
      hx - r * 1.32,
      hy - r * 0.05,
      hx - r * 1.05,
      hy - r * 1.18,
      hx,
      hy - r * 1.24
    );
    ctx.bezierCurveTo(
      hx + r * 1.05,
      hy - r * 1.18,
      hx + r * 1.32,
      hy - r * 0.05,
      hx + r * 1.18,
      hy + r * 0.96
    );
    ctx.quadraticCurveTo(hx + r * 0.55, hy + r * 1.18, hx, hy + r * 1.08);
    ctx.quadraticCurveTo(hx - r * 0.55, hy + r * 1.18, hx - r * 1.18, hy + r * 0.96);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = Math.max(1.1, 1.6 * s);
    ctx.beginPath();
    ctx.moveTo(hx - r * 1.08, hy + r * 0.78);
    ctx.quadraticCurveTo(hx, hy + r * 1.02, hx + r * 1.08, hy + r * 0.78);
    ctx.stroke();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = Math.max(1.1, 2.0 * s);
    ctx.beginPath();
    ctx.arc(hx, hy - r * 0.14, r * 0.82, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
    ctx.restore();
  };

  const drawDirektorkaHair = (hx: number, hy: number, r: number) => {
    ctx.save();
    ctx.fillStyle = '#3b1d14';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = outlineW;
    // Sleek updo base
    ctx.beginPath();
    ctx.arc(hx, hy - r * 0.12, r * 1.06, Math.PI * 0.78, Math.PI * 2.22);
    ctx.quadraticCurveTo(hx, hy + r * 0.65, hx - r * 0.84, hy + r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tall chignon bun
    ctx.beginPath();
    ctx.ellipse(hx, hy - r * 1.28, r * 0.62, r * 0.54, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Silver streak
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = Math.max(1.5, 2.5 * s);
    ctx.beginPath();
    ctx.arc(hx + r * 0.15, hy - r * 0.25, r * 0.78, Math.PI * 1.35, Math.PI * 1.82);
    ctx.stroke();
    ctx.restore();
  };

  const drawOrganicJanitorBody = (cx: number, topY: number, botY: number) => {
    ctx.save();
    ctx.fillStyle = apronColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = outlineW;

    ctx.beginPath();
    ctx.moveTo(cx - shoulderHalf, topY + 6 * s);
    ctx.quadraticCurveTo(cx, topY - 4 * s, cx + shoulderHalf, topY + 6 * s);
    if (isDir) {
      // Sharp tailored blazer waist -> structured skirt
      ctx.bezierCurveTo(
        cx + shoulderHalf * 0.82,
        topY + (botY - topY) * 0.42,
        cx + hipHalf * 1.02,
        botY - 12 * s,
        cx + hipHalf,
        botY
      );
      ctx.quadraticCurveTo(cx, botY + 5 * s, cx - hipHalf, botY);
      ctx.bezierCurveTo(
        cx - hipHalf * 1.02,
        botY - 12 * s,
        cx - shoulderHalf * 0.82,
        topY + (botY - topY) * 0.42,
        cx - shoulderHalf,
        topY + 6 * s
      );
    } else if (isZir) {
      ctx.bezierCurveTo(
        cx + hipHalf * 1.08,
        topY + (botY - topY) * 0.36,
        cx + hipHalf * 1.1,
        botY - 14 * s,
        cx + hipHalf * 0.8,
        botY
      );
      ctx.quadraticCurveTo(cx, botY + 8 * s, cx - hipHalf * 0.8, botY);
      ctx.bezierCurveTo(
        cx - hipHalf * 1.1,
        botY - 14 * s,
        cx - hipHalf * 1.08,
        topY + (botY - topY) * 0.36,
        cx - shoulderHalf,
        topY + 6 * s
      );
    } else {
      ctx.bezierCurveTo(
        cx + hipHalf * 1.12,
        topY + (botY - topY) * 0.35,
        cx + hipHalf * 1.14,
        botY - 12 * s,
        cx + hipHalf * 0.84,
        botY
      );
      ctx.quadraticCurveTo(cx, botY + 9 * s, cx - hipHalf * 0.84, botY);
      ctx.bezierCurveTo(
        cx - hipHalf * 1.14,
        botY - 12 * s,
        cx - hipHalf * 1.12,
        topY + (botY - topY) * 0.35,
        cx - shoulderHalf,
        topY + 6 * s
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = apronShade;
    ctx.beginPath();
    ctx.ellipse(
      cx - shoulderHalf * 0.42,
      (topY + botY) * 0.52,
      shoulderHalf * 0.3,
      (botY - topY) * 0.36,
      0.06,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Belt / waist sash
    const waistY = topY + (botY - topY) * 0.44;
    ctx.strokeStyle = isDir ? '#1c1917' : pocketColor;
    ctx.lineWidth = Math.max(2.5, 4.5 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - hipHalf * 0.72, waistY);
    ctx.quadraticCurveTo(cx, waistY + 5 * s, cx + hipHalf * 0.72, waistY);
    ctx.stroke();

    if (isDir) {
      // Gold blazer clasp / brooch on back belt
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx, waistY + 2 * s, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (isZir) {
      ctx.fillStyle = pocketColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(1.2, 1.8 * s);
      ctx.beginPath();
      ctx.roundRect(cx - hipHalf * 0.38, waistY + 7 * s, hipHalf * 0.76, 15 * s, 6 * s);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  if (isFallen) {
    ctx.save();
    ctx.translate(base.x, base.y - 16 * s);
    ctx.rotate(-Math.PI * 0.46);

    drawCapsuleLimb(ctx, -9 * s, -8 * s, -10 * s, 32 * s, legRTop, legRBot, pantsColor, '#0f172a', outlineW);
    drawCapsuleLimb(ctx, 9 * s, -8 * s, 10 * s, 32 * s, legRTop, legRBot, pantsColor, '#0f172a', outlineW);

    drawCapsuleLimb(ctx, -shoulderHalf, -64 * s, -shoulderHalf - 16 * s, -32 * s, armRTop, armRBot, sweaterColor, '#0f172a', outlineW);
    drawCapsuleLimb(ctx, shoulderHalf, -64 * s, shoulderHalf + 16 * s, -32 * s, armRTop, armRBot, sweaterColor, '#0f172a', outlineW);

    drawOrganicJanitorBody(0, -72 * s, -4 * s);

    const headR = (isZir ? 14.5 : 13.5) * s;
    ctx.fillStyle = skinColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = outlineW;
    ctx.beginPath();
    ctx.arc(0, -86 * s, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (isDir) {
      drawDirektorkaHair(0, -86 * s, headR);
    } else if (isZir) {
      drawBlondeLongBowlHair(0, -88 * s, headR);
    } else {
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, -90 * s, 14.2 * s, Math.PI * 0.82, Math.PI * 2.18);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -104 * s, 8.8 * s, 7.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < 3; i++) {
      const ang = time * 6 + (i * Math.PI * 2) / 3;
      const sx = base.x - 24 * s + Math.cos(ang) * 24 * s;
      const sy = base.y - 48 * s + Math.sin(ang) * 8 * s;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(sx, sy, 5 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isDir) {
      drawPointerRuler(ctx, base.x + 26 * s, base.y - 6 * s, base.x + 86 * s, base.y - 14 * s, s);
    } else {
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = Math.max(2, 4.5 * s);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(base.x + 28 * s, base.y - 6 * s);
      ctx.lineTo(base.x + 82 * s, base.y - 16 * s);
      ctx.stroke();
      drawBroomBristleHead(ctx, base.x + 84 * s, base.y - 16 * s, 18 * s, 20 * s, s);
    }

    if (speechLine) {
      drawSpeechBubble(ctx, base.x, base.y - 68 * s, speechLine, bubbleS);
    } else {
      drawSpeechBubble(ctx, base.x, base.y - 68 * s, state.t.cOuchBack, bubbleS);
    }
    ctx.restore();
    return;
  }

  // Active Sprinting / Aiming Chaser running UPWARD behind the student!
  const stride = Math.sin(time * (isDir ? 15 : 13));
  const bob = Math.abs(stride) * 5.5 * s;

  const leftFootY = base.y - 6 * s + stride * 12 * s;
  const rightFootY = base.y - 6 * s - stride * 12 * s;
  const hipY = base.y - 52 * s - bob * 0.4;

  drawCapsuleLimb(ctx, base.x - (isZir || isDir ? 8.5 : 10) * s, hipY, base.x - (isZir || isDir ? 9.5 : 11) * s, leftFootY - 3 * s, legRTop, legRBot, pantsColor, '#0f172a', outlineW);
  drawCapsuleLimb(ctx, base.x + (isZir || isDir ? 8.5 : 10) * s, hipY, base.x + (isZir || isDir ? 9.5 : 11) * s, rightFootY - 3 * s, legRTop, legRBot, pantsColor, '#0f172a', outlineW);

  drawRealisticShoe(ctx, base.x - (isZir || isDir ? 9.5 : 11) * s, leftFootY, (isDir ? 13 : 14.5) * s, 8.5 * s, '#1c1917', '#44403c', outlineW);
  drawRealisticShoe(ctx, base.x + (isZir || isDir ? 9.5 : 11) * s, rightFootY, (isDir ? 13 : 14.5) * s, 8.5 * s, '#1c1917', '#44403c', outlineW);

  const shoulderY = base.y - 102 * s - bob;
  const leftHandX = base.x - shoulderHalf - 8 * s;
  const leftHandY = shoulderY + 34 * s + stride * 10 * s;
  const rightHandX = base.x + shoulderHalf + 10 * s;
  const rightHandY = isAiming
    ? shoulderY - 30 * s
    : shoulderY + 30 * s - stride * 10 * s;

  drawCapsuleLimb(ctx, base.x - shoulderHalf + 2 * s, shoulderY, leftHandX, leftHandY, armRTop, armRBot, sweaterColor, '#0f172a', outlineW);
  drawCapsuleLimb(ctx, base.x + shoulderHalf - 2 * s, shoulderY, rightHandX, rightHandY, armRTop, armRBot, sweaterColor, '#0f172a', outlineW);

  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = Math.max(1.2, 1.8 * s);
  ctx.beginPath();
  ctx.arc(leftHandX, leftHandY, armRBot * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rightHandX, rightHandY, armRBot * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawOrganicJanitorBody(base.x, base.y - 110 * s - bob, base.y - 42 * s - bob);

  const headR = (isZir ? 14.5 : 13.5) * s;
  const headY = base.y - 126 * s - bob;

  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = outlineW;
  ctx.beginPath();
  ctx.roundRect(base.x - 5.2 * s, headY + headR * 0.5, 10.4 * s, 11 * s, 4 * s);
  ctx.fill();
  ctx.stroke();

  if (!isZir) {
    ctx.beginPath();
    ctx.ellipse(base.x - headR * 0.95, headY + 1.5 * s, 3.4 * s, 4.6 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(base.x + headR * 0.95, headY + 1.5 * s, 3.4 * s, 4.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (isDir) {
      // Pearl earrings
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(base.x - headR * 0.95, headY + 4.5 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.arc(base.x + headR * 0.95, headY + 4.5 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skinColor;
    }
  }

  ctx.beginPath();
  ctx.arc(base.x, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isDir) {
    drawDirektorkaHair(base.x, headY, headR);
  } else if (isZir) {
    drawBlondeLongBowlHair(base.x, headY - 2 * s, headR);
  } else {
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(base.x, headY - 2 * s, 14.4 * s, Math.PI * 0.78, Math.PI * 2.22);
    ctx.quadraticCurveTo(base.x, headY + 9 * s, base.x - 11 * s, headY + 5 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(base.x, headY - 17 * s, 8.8 * s, 7.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Weapon held ready: wooden pointer ruler for Direktorka, wooden broom for Goca & Žir
  if (state.brooms.length === 0) {
    if (isDir) {
      if (isAiming) {
        const windup = Math.sin(aimProgress * Math.PI) * 14 * s;
        drawPointerRuler(
          ctx,
          rightHandX,
          rightHandY + 8 * s - windup,
          rightHandX - 4 * s,
          rightHandY - 58 * s - windup,
          s
        );
      } else {
        const shake = Math.sin(time * 18) * 6 * s;
        drawPointerRuler(
          ctx,
          rightHandX,
          rightHandY + 4 * s,
          rightHandX + 10 * s + shake,
          rightHandY - 62 * s,
          s
        );
      }
    } else {
      ctx.strokeStyle = '#92400e';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, 4.5 * s);
      if (isAiming) {
        const windup = Math.sin(aimProgress * Math.PI) * 14 * s;
        ctx.beginPath();
        ctx.moveTo(rightHandX, rightHandY + 12 * s - windup);
        ctx.lineTo(rightHandX, rightHandY - 52 * s - windup);
        ctx.stroke();
        drawBroomBristleHead(ctx, rightHandX, rightHandY - 58 * s - windup, 34 * s, 18 * s, s);
      } else {
        const shake = Math.sin(time * 16) * 7 * s;
        ctx.beginPath();
        ctx.moveTo(rightHandX, rightHandY + 4 * s);
        ctx.lineTo(rightHandX + 5 * s + shake, rightHandY - 64 * s);
        ctx.stroke();
        drawBroomBristleHead(ctx, rightHandX + 5 * s + shake, rightHandY - 70 * s, 32 * s, 17 * s, s);
      }
    }
  }

  if (isAiming && aimProgress >= 0.68) {
    drawSpeechBubble(
      ctx,
      base.x,
      base.y - 166 * s - bob,
      isDir ? state.t.cTakeThisDir : state.t.cTakeThis,
      bubbleS,
      '#fecaca',
      '#991b1b'
    );
  } else if (speechLine) {
    drawSpeechBubble(
      ctx,
      base.x,
      base.y - 166 * s - bob,
      speechLine,
      bubbleS,
      isAiming ? '#fecaca' : '#fef3c7',
      isAiming ? '#991b1b' : '#0f172a'
    );
  }

  ctx.restore();
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  s: number,
  bgColor = '#fef3c7',
  borderColor = '#0f172a'
) {
  ctx.save();
  ctx.font = `800 ${Math.max(10, Math.round(15 * s))}px "Bricolage Grotesque", sans-serif`;
  const textW = ctx.measureText(text).width + 18 * s;
  const boxH = 26 * s;
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = Math.max(1.4, 2.2 * s);
  ctx.beginPath();
  ctx.roundRect(x - textW / 2, y - boxH / 2, textW, boxH, 10 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

function drawThrownBroom(
  ctx: CanvasRenderingContext2D,
  broom: ThrownBroom,
  W: number,
  H: number
) {
  const laneOff = laneToOffset(broom.lane);
  const floorPt = projectPoint(laneOff, 0, broom.z, W, H);
  const pt = projectPoint(laneOff, 0.55, broom.z, W, H);
  const s = pt.scale;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(floorPt.x, floorPt.y, 26 * s, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(pt.x, pt.y);
  ctx.rotate(broom.rotation);

  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 14 * s;

  if (broom.weapon === 'RULER') {
    drawPointerRuler(ctx, 0, -44 * s, 0, 44 * s, s * 1.15);
  } else {
    ctx.strokeStyle = '#92400e';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.5, 6 * s);
    ctx.beginPath();
    ctx.moveTo(0, -44 * s);
    ctx.lineTo(0, 26 * s);
    ctx.stroke();

    drawBroomBristleHead(ctx, 0, 30 * s, 46 * s, 22 * s, s);
  }

  ctx.restore();
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  wing: WingConfig,
  W: number,
  H: number,
  time: number
) {
  const laneOff = laneToOffset(obs.lane);
  const base = projectPoint(laneOff, 0, obs.z, W, H);
  const s = base.scale;
  const w = Math.max(18, 96 * s);

  ctx.save();

  switch (obs.kind) {
    case 'SCHOOL_TABLE': {
      const th = 54 * s;
      const tw = w * 1.02;

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, tw * 0.55, 13 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = Math.max(1.2, 2.2 * s);
      ctx.fillRect(base.x - tw * 0.42, base.y - th, 7 * s, th);
      ctx.fillRect(base.x + tw * 0.42 - 7 * s, base.y - th, 7 * s, th);

      ctx.fillStyle = '#78350f';
      ctx.fillRect(base.x - tw * 0.44, base.y - th * 0.85, tw * 0.88, th * 0.42);
      ctx.strokeRect(base.x - tw * 0.44, base.y - th * 0.85, tw * 0.88, th * 0.42);

      ctx.fillStyle = '#b45309';
      ctx.fillRect(base.x - tw * 0.52, base.y - th - 10 * s, tw * 1.04, 14 * s);
      ctx.strokeRect(base.x - tw * 0.52, base.y - th - 10 * s, tw * 1.04, 14 * s);

      ctx.fillStyle = '#d97706';
      ctx.fillRect(base.x - tw * 0.5, base.y - th - 14 * s, tw, 6 * s);

      ctx.fillStyle = '#166534';
      ctx.fillRect(base.x - tw * 0.28, base.y - th - 24 * s, tw * 0.34, 10 * s);
      ctx.strokeRect(base.x - tw * 0.28, base.y - th - 24 * s, tw * 0.34, 10 * s);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(base.x - tw * 0.22, base.y - th - 33 * s, tw * 0.28, 9 * s);
      ctx.strokeRect(base.x - tw * 0.22, base.y - th - 33 * s, tw * 0.28, 9 * s);
      break;
    }

    case 'CHOMPER_LOCKER': {
      const h = 140 * s;
      const stomp = Math.abs(Math.sin(time * 11 + obs.seed)) * 8 * s;
      const jawOpen = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 9 + obs.seed));

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, w * 0.58, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#292524';
      ctx.fillRect(base.x - w * 0.34, base.y - 16 * s - stomp * 0.4, w * 0.16, 18 * s);
      ctx.fillRect(base.x + w * 0.18, base.y - 16 * s + stomp * 0.4, w * 0.16, 18 * s);

      const bx = base.x - w * 0.46;
      const by = base.y - h - 10 * s - stomp;
      const bw = w * 0.92;
      const bh = h;

      ctx.fillStyle = wing.lockerColor;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = Math.max(1.5, 3 * s);
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(bx + 3 * s, by + 3 * s, bw - 6 * s, bh * 0.08);

      ctx.fillStyle = '#090d16';
      ctx.fillRect(bx + bw * 0.14, by + bh * 0.14, bw * 0.72, bh * 0.16);
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12 * s;
      ctx.beginPath();
      ctx.arc(base.x - bw * 0.18, by + bh * 0.22, 5.5 * s, 0, Math.PI * 2);
      ctx.arc(base.x + bw * 0.18, by + bh * 0.22, 5.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      const mouthY = by + bh * 0.36;
      const mouthH = bh * (0.28 + 0.18 * jawOpen);
      ctx.fillStyle = '#18090d';
      ctx.fillRect(bx + bw * 0.1, mouthY, bw * 0.8, mouthH);

      ctx.fillStyle = '#f1f5f9';
      const toothCount = 4;
      const tw = (bw * 0.8) / toothCount;
      for (let i = 0; i < toothCount; i++) {
        const tx = bx + bw * 0.1 + i * tw;
        ctx.beginPath();
        ctx.moveTo(tx, mouthY);
        ctx.lineTo(tx + tw * 0.5, mouthY + 13 * s);
        ctx.lineTo(tx + tw, mouthY);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(tx, mouthY + mouthH);
        ctx.lineTo(tx + tw * 0.5, mouthY + mouthH - 13 * s);
        ctx.lineTo(tx + tw, mouthY + mouthH);
        ctx.closePath();
        ctx.fill();
      }

      if (
        obs.targetLane !== undefined &&
        obs.targetLane !== obs.lane &&
        !obs.hasShifted &&
        obs.z < 56
      ) {
        const dir = obs.targetLane > obs.lane ? '→' : '←';
        ctx.fillStyle = '#fbbf24';
        ctx.font = `800 ${Math.max(12, Math.round(24 * s))}px "Bricolage Grotesque", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(dir, base.x, by - 10 * s);
      }
      break;
    }

    case 'WALL_SLAM_DOOR': {
      const h = 136 * s;
      const slamProgress = obs.z < 54 ? Math.min(1, (54 - obs.z) / 8) : 0.18;
      const hingeSide = obs.lane === 0 ? -1 : 1;
      const hingeAnchor = projectPoint(hingeSide * 1.48, 0, obs.z, W, H);
      const doorLen = Math.abs(base.x - hingeAnchor.x) + w * 0.44;
      const activeLen = doorLen * slamProgress;

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(
        hingeSide === -1 ? hingeAnchor.x : hingeAnchor.x - activeLen,
        base.y - 8 * s,
        activeLen,
        14 * s
      );

      const dx = hingeSide === -1 ? hingeAnchor.x : hingeAnchor.x - activeLen;
      const dy = base.y - h;
      ctx.fillStyle = '#881337';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = Math.max(1.5, 3 * s);
      ctx.fillRect(dx, dy, activeLen, h);
      ctx.strokeRect(dx, dy, activeLen, h);

      ctx.fillStyle = '#facc15';
      ctx.fillRect(dx + activeLen * 0.25, dy + h * 0.18, activeLen * 0.5, 8 * s);
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(dx + activeLen * 0.15, dy + h * 0.48, activeLen * 0.7, 6 * s);
      break;
    }

    case 'WET_FLOOR_CONE': {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, w * 0.55, 16 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      const sh = 46 * s;
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      ctx.beginPath();
      ctx.moveTo(base.x - w * 0.26, base.y);
      ctx.lineTo(base.x - w * 0.14, base.y - sh);
      ctx.lineTo(base.x + w * 0.14, base.y - sh);
      ctx.lineTo(base.x + w * 0.26, base.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#090d16';
      ctx.fillRect(base.x - 2.5 * s, base.y - sh * 0.75, 5 * s, sh * 0.36);
      ctx.fillRect(base.x - 2.5 * s, base.y - sh * 0.28, 5 * s, sh * 0.12);
      break;
    }

    case 'MOP_BUCKET': {
      ctx.fillStyle = 'rgba(125, 211, 252, 0.42)';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, w * 0.52, 14 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      const bh = 42 * s;
      const bw = w * 0.56;
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      ctx.beginPath();
      ctx.moveTo(base.x - bw * 0.42, base.y);
      ctx.lineTo(base.x - bw * 0.52, base.y - bh);
      ctx.lineTo(base.x + bw * 0.52, base.y - bh);
      ctx.lineTo(base.x + bw * 0.42, base.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = Math.max(2, 5 * s);
      ctx.beginPath();
      ctx.moveTo(base.x, base.y - bh * 0.7);
      ctx.lineTo(base.x + w * 0.24, base.y - bh * 1.45);
      ctx.stroke();
      break;
    }

    case 'SPRING_GRATE': {
      const active = obs.z < 46;
      const springH = active ? 38 * s : 6 * s;

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      ctx.fillRect(base.x - w * 0.48, base.y - 12 * s, w * 0.96, 18 * s);
      ctx.strokeRect(base.x - w * 0.48, base.y - 12 * s, w * 0.96, 18 * s);

      if (active) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(2, 3.5 * s);
        ctx.beginPath();
        ctx.moveTo(base.x - w * 0.25, base.y);
        ctx.lineTo(base.x + w * 0.25, base.y - springH * 0.4);
        ctx.lineTo(base.x - w * 0.25, base.y - springH * 0.8);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(base.x - w * 0.44, base.y - springH - 8 * s, w * 0.88, 12 * s);
      }
      break;
    }

    case 'GLUE_SPILL': {
      const pulse = 1 + 0.08 * Math.sin(time * 7 + obs.seed);
      ctx.fillStyle = '#84cc16';
      ctx.strokeStyle = '#365314';
      ctx.lineWidth = Math.max(1.5, 2 * s);
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, w * 0.56 * pulse, 18 * s * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ecfccb';
      ctx.beginPath();
      ctx.arc(base.x - w * 0.18, base.y - 6 * s, 5 * s, 0, Math.PI * 2);
      ctx.arc(base.x + w * 0.15, base.y - 4 * s, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'HIGH_DOOR_SWING': {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, w * 0.52, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      ctx.beginPath();
      ctx.moveTo(base.x - w * 0.2, base.y - 6 * s);
      ctx.lineTo(base.x, base.y + 4 * s);
      ctx.lineTo(base.x + w * 0.2, base.y - 6 * s);
      ctx.stroke();

      const gapH = 56 * s;
      const barH = 74 * s;
      const topY = base.y - gapH - barH;
      ctx.fillStyle = wing.lockerColor;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = Math.max(1.5, 3 * s);
      ctx.fillRect(base.x - w * 0.55, topY, w * 1.1, barH);
      ctx.strokeRect(base.x - w * 0.55, topY, w * 1.1, barH);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(base.x - w * 0.55, topY + barH - 12 * s, w * 1.1, 12 * s);
      break;
    }

    case 'STEAM_PIPE': {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, w * 0.52, 10 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      const gapH = 54 * s;
      const pipeY = base.y - gapH - 26 * s;

      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      ctx.fillRect(base.x - w * 0.6, pipeY, w * 1.2, 22 * s);
      ctx.strokeRect(base.x - w * 0.6, pipeY, w * 1.2, 22 * s);

      ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
      for (let i = -2; i <= 2; i++) {
        const puffR = (13 + 3 * Math.sin(time * 12 + i)) * s;
        ctx.beginPath();
        ctx.arc(base.x + i * w * 0.22, pipeY + 26 * s, puffR, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'TRIP_WIRE': {
      const gapH = 52 * s;
      const beamY = base.y - gapH - 12 * s;

      ctx.fillStyle = '#334155';
      ctx.fillRect(base.x - w * 0.54, base.y - gapH - 36 * s, 10 * s, gapH + 36 * s);
      ctx.fillRect(base.x + w * 0.54 - 10 * s, base.y - gapH - 36 * s, 10 * s, gapH + 36 * s);

      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12 * s;
      ctx.lineWidth = Math.max(2.5, 5 * s);
      ctx.beginPath();
      ctx.moveTo(base.x - w * 0.5, beamY);
      ctx.lineTo(base.x + w * 0.5, beamY);
      ctx.stroke();

      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(base.x - w * 0.5, beamY - 14 * s);
      ctx.lineTo(base.x + w * 0.5, beamY - 14 * s);
      ctx.stroke();
      break;
    }

    case 'FLYING_TEXTBOOK': {
      const hoverY = 26 * s + Math.sin(time * 10 + obs.seed) * 8 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, w * 0.34, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(base.x, base.y - hoverY);
      ctx.rotate(Math.sin(time * 14 + obs.seed) * 0.35);

      const bw = 48 * s;
      const bh = 36 * s;
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-bw * 0.36, -bh * 0.3, bw * 0.72, bh * 0.6);
      break;
    }
  }

  ctx.restore();
}

function drawPickup(
  ctx: CanvasRenderingContext2D,
  pickup: Pickup,
  W: number,
  H: number,
  time: number
) {
  const laneOff = laneToOffset(pickup.lane) + pickup.visualXOffset;
  const bob = 0.25 + 0.08 * Math.sin(time * 6 + pickup.yBobPhase);
  const floorPt = projectPoint(laneOff, 0, pickup.z, W, H);
  const pt = projectPoint(laneOff, bob, pickup.z, W, H);
  const s = pt.scale;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(floorPt.x, floorPt.y, 18 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(pt.x, pt.y);

  if (pickup.kind === 'HALL_PASS') {
    const pw = 34 * s;
    const ph = 22 * s;
    ctx.rotate(Math.sin(time * 4 + pickup.yBobPhase) * 0.14);
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12 * s;
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(1.2, 2.5 * s);
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(-pw * 0.32, -ph * 0.18, pw * 0.64, ph * 0.36);
  } else if (pickup.kind === 'MAGNET') {
    const r = 16 * s;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12 * s;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(3, 7 * s);
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, 0, false);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-r - 3 * s, 0, 7 * s, 9 * s);
    ctx.fillRect(r - 4 * s, 0, 7 * s, 9 * s);
  }

  ctx.restore();
}

function drawStudentPlayer(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  playerZ: number,
  W: number,
  H: number
) {
  const { skin } = state;
  const floorPt = projectPoint(state.playerLaneX, 0, playerZ, W, H);
  const bodyPt = projectPoint(state.playerLaneX, state.playerJumpY, playerZ, W, H);
  const vpFactor = Math.max(0.84, Math.min(1.18, H / 760));
  const s = floorPt.scale * 1.04 * vpFactor;
  const outlineW = Math.max(1.3, 2.0 * s);

  const drawOrganicStudentTorso = (topY: number, botY: number) => {
    const shHalf = (skin.isMuscular ? 18.2 : 15.5) * s;
    const waistHalf = (skin.isMuscular ? 11.5 : 12.5) * s;
    const midHalf = (skin.isMuscular ? 16.5 : 17) * s;
    ctx.save();
    ctx.fillStyle = skin.jacketColor;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = outlineW;
    ctx.beginPath();
    ctx.moveTo(-shHalf, topY + 6 * s);
    ctx.quadraticCurveTo(0, topY - 4 * s, shHalf, topY + 6 * s);
    ctx.bezierCurveTo(midHalf, (topY + botY) * 0.45, waistHalf + 1.5 * s, botY - 5 * s, waistHalf, botY);
    ctx.quadraticCurveTo(0, botY + 5 * s, -waistHalf, botY);
    ctx.bezierCurveTo(-waistHalf - 1.5 * s, botY - 5 * s, -midHalf, (topY + botY) * 0.45, -shHalf, topY + 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle fabric fold / shading on side
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(-8 * s, (topY + botY) * 0.54, 4.8 * s, (botY - topY) * 0.36, 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Draped hoodie hood at collar when skin wears a hoodie
    if (skin.hasHoodie) {
      ctx.fillStyle = skin.jacketColor;
      ctx.beginPath();
      ctx.moveTo(-12.5 * s, topY + 3 * s);
      ctx.quadraticCurveTo(0, topY - 7 * s, 12.5 * s, topY + 3 * s);
      ctx.quadraticCurveTo(7 * s, topY + 12 * s, 0, topY + 10 * s);
      ctx.quadraticCurveTo(-7 * s, topY + 12 * s, -12.5 * s, topY + 3 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawContouredBackpack = (topY: number) => {
    ctx.save();
    ctx.strokeStyle = skin.packTrim;
    ctx.lineWidth = Math.max(1.8, 3.8 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11.5 * s, topY + 2 * s);
    ctx.quadraticCurveTo(-15 * s, topY + 14 * s, -11.5 * s, topY + 26 * s);
    ctx.moveTo(11.5 * s, topY + 2 * s);
    ctx.quadraticCurveTo(15 * s, topY + 14 * s, 11.5 * s, topY + 26 * s);
    ctx.stroke();

    ctx.fillStyle = skin.packColor;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = outlineW;
    ctx.beginPath();
    ctx.roundRect(-11.5 * s, topY + 3 * s, 23 * s, 29 * s, [9 * s, 9 * s, 7 * s, 7 * s]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.packTrim;
    ctx.beginPath();
    ctx.roundRect(-11.5 * s, topY + 3 * s, 23 * s, 10.5 * s, [9 * s, 9 * s, 5 * s, 5 * s]);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(-8.5 * s, topY + 18 * s, 17 * s, 9.5 * s, 4 * s);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawNaturalHeadBack = (hy: number) => {
    ctx.save();
    ctx.lineWidth = outlineW;
    ctx.strokeStyle = '#090d16';

    ctx.fillStyle = skin.skinTone;
    ctx.beginPath();
    ctx.roundRect(-4.8 * s, hy + 6 * s, 9.6 * s, 10.5 * s, 4 * s);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(-12.4 * s, hy + 1 * s, 3 * s, 4.2 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(12.4 * s, hy + 1 * s, 3 * s, 4.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, hy, 12.4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.hairColor;
    ctx.beginPath();
    ctx.arc(0, hy - 2 * s, 13 * s, Math.PI * 0.78, Math.PI * 2.22);
    ctx.quadraticCurveTo(7 * s, hy + 10 * s, 0, hy + 8 * s);
    ctx.quadraticCurveTo(-7 * s, hy + 10 * s, -10.4 * s, hy + 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  ctx.save();

  const shadowScale = Math.max(0.42, 1 - state.playerJumpY * 0.42);
  ctx.fillStyle = state.bellRushActive ? 'rgba(245, 158, 11, 0.45)' : 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(
    floorPt.x,
    floorPt.y,
    30 * s * skin.widthScale * shadowScale,
    10 * s * shadowScale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.translate(bodyPt.x, bodyPt.y);

  // CAUGHT ANIMATION: Student sprawled flat on the floor!
  if (state.playerFallen) {
    ctx.save();
    ctx.translate(0, -14 * s);
    ctx.rotate(Math.PI * 0.48);
    ctx.scale(skin.widthScale, skin.heightScale);

    drawCapsuleLimb(ctx, -8 * s, -16 * s, -10 * s, 26 * s, 5.8 * s, 4.4 * s, skin.pantsColor, '#090d16', outlineW);
    drawCapsuleLimb(ctx, 8 * s, -16 * s, 10 * s, 26 * s, 5.8 * s, 4.4 * s, skin.pantsColor, '#090d16', outlineW);

    drawOrganicStudentTorso(-64 * s, -14 * s);
    drawContouredBackpack(-64 * s);
    drawNaturalHeadBack(-80 * s);
    ctx.restore();

    for (let i = 0; i < 3; i++) {
      const ang = state.time * 7 + (i * Math.PI * 2) / 3;
      const sx = -24 * s + Math.cos(ang) * 20 * s;
      const sy = -36 * s + Math.sin(ang) * 7 * s;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  // VICTORY ANIMATION: Student turns toward fallen janitor and sticks tongue out!
  if (state.playerTongueOut) {
    ctx.save();
    ctx.scale(skin.widthScale, skin.heightScale);

    drawCapsuleLimb(ctx, -8 * s, -62 * s, -8.5 * s, -9 * s, 5.8 * s, 4.4 * s, skin.pantsColor, '#090d16', outlineW);
    drawCapsuleLimb(ctx, 8 * s, -62 * s, 8.5 * s, -9 * s, 5.8 * s, 4.4 * s, skin.pantsColor, '#090d16', outlineW);
    drawRealisticShoe(ctx, -8.5 * s, -6 * s, 13.5 * s, 8 * s, '#18181b', '#e2e8f0', outlineW);
    drawRealisticShoe(ctx, 8.5 * s, -6 * s, 13.5 * s, 8 * s, '#18181b', '#e2e8f0', outlineW);

    drawCapsuleLimb(ctx, -14.5 * s, -104 * s, -23 * s, -130 * s, 5 * s, 4 * s, skin.sleeveColor, '#090d16', outlineW);
    drawCapsuleLimb(ctx, 14.5 * s, -104 * s, 23 * s, -130 * s, 5 * s, 4 * s, skin.sleeveColor, '#090d16', outlineW);

    // Hands waving
    ctx.fillStyle = skin.skinTone;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = outlineW;
    ctx.beginPath();
    ctx.arc(-23 * s, -132 * s, 4.4 * s, 0, Math.PI * 2);
    ctx.arc(23 * s, -132 * s, 4.4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    drawOrganicStudentTorso(-110 * s, -58 * s);

    // Front face & ears
    ctx.fillStyle = skin.skinTone;
    ctx.beginPath();
    ctx.ellipse(-15 * s, -126 * s, 3.2 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(15 * s, -126 * s, 3.2 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -127 * s, 15 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.hairColor;
    ctx.beginPath();
    ctx.arc(0, -132 * s, 15.6 * s, Math.PI * 0.92, Math.PI * 2.08);
    ctx.quadraticCurveTo(5 * s, -134 * s, 0, -131 * s);
    ctx.quadraticCurveTo(-5 * s, -134 * s, -15 * s, -129 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = Math.max(1.5, 2.2 * s);
    ctx.beginPath();
    ctx.moveTo(-9 * s, -130 * s);
    ctx.lineTo(-3.5 * s, -127.5 * s);
    ctx.lineTo(-9 * s, -125 * s);
    ctx.moveTo(9 * s, -130 * s);
    ctx.lineTo(3.5 * s, -127.5 * s);
    ctx.lineTo(9 * s, -125 * s);
    ctx.stroke();

    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.ellipse(0, -120 * s, 7 * s, 4.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const wiggle = Math.sin(state.time * 18) * 1.6 * s;
    ctx.fillStyle = '#fb7185';
    ctx.strokeStyle = '#881337';
    ctx.lineWidth = Math.max(1.2, 2 * s);
    ctx.beginPath();
    ctx.ellipse(wiggle, -113 * s, 5.8 * s, 8.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(wiggle, -118 * s);
    ctx.lineTo(wiggle, -109 * s);
    ctx.stroke();
    ctx.restore();

    drawSpeechBubble(
      ctx,
      0,
      -162 * s * skin.heightScale,
      state.t.cTaunt,
      s,
      '#bbf7d0',
      '#065f46'
    );
    ctx.restore();
    return;
  }

  ctx.rotate(state.playerTilt * 0.22);

  if (state.bellRushActive) {
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.ellipse(
      0,
      -70 * s * skin.heightScale,
      40 * s * skin.widthScale,
      78 * s * skin.heightScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  const stride = Math.sin(state.time * (state.speed * 0.46));
  const isSliding = state.playerSlideT > 0.05;
  const bob = isSliding ? 0 : state.playerJumpY > 0.05 ? 0 : Math.abs(stride) * 5.5 * s;

  ctx.save();
  ctx.scale(skin.widthScale, skin.heightScale);

  if (isSliding) {
    // Dynamic low crouch/slide pose WITHOUT vertical canvas squishing (keeps head & torso proportional!)
    drawCapsuleLimb(ctx, -10 * s, -22 * s, -20 * s, -8 * s, 6 * s, 4.4 * s, skin.pantsColor, '#090d16', outlineW);
    drawCapsuleLimb(ctx, 10 * s, -22 * s, 18 * s, -10 * s, 6 * s, 4.4 * s, skin.pantsColor, '#090d16', outlineW);
    drawRealisticShoe(ctx, -20 * s, -6 * s, 13 * s, 8 * s, '#18181b', '#e2e8f0', outlineW);
    drawRealisticShoe(ctx, 18 * s, -8 * s, 13 * s, 8 * s, '#18181b', '#e2e8f0', outlineW);

    drawCapsuleLimb(ctx, -14 * s, -54 * s, -23 * s, -32 * s, 5 * s, 3.8 * s, skin.sleeveColor, '#090d16', outlineW);
    drawCapsuleLimb(ctx, 14 * s, -54 * s, 23 * s, -32 * s, 5 * s, 3.8 * s, skin.sleeveColor, '#090d16', outlineW);

    drawOrganicStudentTorso(-62 * s, -20 * s);
    drawContouredBackpack(-62 * s);
    drawNaturalHeadBack(-76 * s);
  } else {
    const hipY = -62 * s - bob * 0.35;
    const leftFootY = -6 * s + stride * 13 * s;
    const rightFootY = -6 * s - stride * 13 * s;

    // Long athletic legs + rounded sneakers
    drawCapsuleLimb(ctx, -8.5 * s, hipY, -9.5 * s, leftFootY - 3 * s, 5.8 * s, 4.2 * s, skin.pantsColor, '#090d16', outlineW);
    drawCapsuleLimb(ctx, 8.5 * s, hipY, 9.5 * s, rightFootY - 3 * s, 5.8 * s, 4.2 * s, skin.pantsColor, '#090d16', outlineW);
    drawRealisticShoe(ctx, -9.5 * s, leftFootY, 13.5 * s, 8.2 * s, '#18181b', '#e2e8f0', outlineW);
    drawRealisticShoe(ctx, 9.5 * s, rightFootY, 13.5 * s, 8.2 * s, '#18181b', '#e2e8f0', outlineW);

    // Swinging arms + hands
    const shoulderY = -102 * s - bob;
    const armOffsetX = (skin.isMuscular ? 16.5 : 14) * s;
    const armRTop = (skin.isMuscular ? 6.2 : 5.0) * s;
    const armRBot = (skin.isMuscular ? 4.3 : 3.8) * s;
    const leftHandX = (skin.isMuscular ? -23.5 : -20.5) * s;
    const leftHandY = shoulderY + 34 * s + stride * 11 * s;
    const rightHandX = (skin.isMuscular ? 23.5 : 20.5) * s;
    const rightHandY = shoulderY + 34 * s - stride * 11 * s;

    drawCapsuleLimb(ctx, -armOffsetX, shoulderY, leftHandX, leftHandY, armRTop, armRBot, skin.sleeveColor, '#090d16', outlineW);
    drawCapsuleLimb(ctx, armOffsetX, shoulderY, rightHandX, rightHandY, armRTop, armRBot, skin.sleeveColor, '#090d16', outlineW);

    ctx.fillStyle = skin.skinTone;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = Math.max(1.2, 1.8 * s);
    ctx.beginPath();
    ctx.arc(leftHandX, leftHandY, 3.9 * s, 0, Math.PI * 2);
    ctx.arc(rightHandX, rightHandY, 3.9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    drawOrganicStudentTorso(-110 * s - bob, -58 * s - bob);
    drawContouredBackpack(-108 * s - bob);
    drawNaturalHeadBack(-126 * s - bob);
  }
  ctx.restore();

  // RED TARGET CIRCLE ON STUDENT'S BACK when janitor aims at his lane!
  if (state.gocaAiming && !state.gocaFallen) {
    const playerLaneOffset = state.playerLaneX;
    const aimLaneOffset = laneToOffset(state.gocaAimLane);
    const inTargetLane = Math.abs(playerLaneOffset - aimLaneOffset) < 0.45;

    if (inTargetLane) {
      const targetY = ((isSliding ? -44 : -86) * s - bob) * skin.heightScale;
      const pulse = 1 + 0.16 * Math.sin(state.time * 24);
      const rOuter = 19 * s * pulse;
      const rInner = 8.5 * s * pulse;

      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.26)';
      ctx.lineWidth = Math.max(2.5, 4 * s);
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12 * s;

      ctx.beginPath();
      ctx.arc(0, targetY, rOuter, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, targetY, rInner, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-rOuter - 6 * s, targetY);
      ctx.lineTo(-rOuter + 5 * s, targetY);
      ctx.moveTo(rOuter - 5 * s, targetY);
      ctx.lineTo(rOuter + 6 * s, targetY);
      ctx.moveTo(0, targetY - rOuter - 6 * s);
      ctx.lineTo(0, targetY - rOuter + 5 * s);
      ctx.moveTo(0, targetY + rOuter - 5 * s);
      ctx.lineTo(0, targetY + rOuter + 6 * s);
      ctx.stroke();

      ctx.restore();
    }
  }

  ctx.restore();
}
