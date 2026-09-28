import {
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkColor,
  type SkFont,
  type SkPaint,
  type SkPathBuilder,
  type SkPicture,
  type SkPictureRecorder,
  type SkShader,
  type SkHostRect,
} from '@shopify/react-native-skia';

import {
  CHASER_COLORS,
  getEnvironment,
  OBSTACLE_COLORS,
  UI,
  type EnvironmentPalette,
} from '../../constants/palette';
import { characterLook, type CharacterColors } from '../characters/characters';
import { cosmetic, type Loadout } from '../../progression/cosmetics';
import { POWERUPS } from '../powerups/powerups';

// Everything the renderer needs, created once on the JS thread per viewport and then
// captured by the UI-thread frame callback. Paints, paths and rects are mutated in place
// every frame so drawing doesn't allocate.

type Colors<T> = { [K in keyof T]: T[K] extends string ? SkColor : T[K] };

const toColors = <T extends Record<string, unknown>>(src: T): Colors<T> => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(src)) {
    const v = src[key];
    out[key] = typeof v === 'string' ? Skia.Color(v) : v;
  }
  return out as Colors<T>;
};

export const ACCESSORY_CODES: Record<string, number> = {
  none: 0,
  headphones: 1,
  cap: 2,
  crown: 3,
};

const TRAIL_COLORS: Record<string, string[]> = {
  'trail-cyan': ['#5ef2ff'],
  'trail-fire': ['#fff3a0', '#ffb000', '#ff5a1f', '#ff2e4f'],
  'trail-rainbow': ['#ff4f6d', '#ffb000', '#ffe14a', '#6bff7a', '#4fc3ff', '#b36bff'],
};

export type RenderResources = {
  width: number;
  height: number;
  hudTop: number;
  // How far (px) the scene is raised behind the main menu, so the runner stands clear of it.
  menuShift: number;
  fill: SkPaint;
  stroke: SkPaint;
  shaded: SkPaint;
  // Reused builder: shapes are added, then detached into a path per draw call.
  pb: SkPathBuilder;
  rect: SkHostRect;
  recorder: SkPictureRecorder;
  bounds: SkHostRect;
  hudFont: SkFont;
  hudSmallFont: SkFont;
  sky: SkShader;
  groundShade: SkShader;
  sun: SkShader;
  backdrop: SkPicture;
  // Props recorded once and replayed per instance (no paths built per frame). Unit size:
  // 1 = the prop's height in meters, origin at its base, y down. Null where unused.
  props: { pine: SkPicture | null };
  env: {
    // See SCENERY and RIDE below.
    scenery: number;
    ride: number;
    dust: SkColor;
    spark: SkColor;
    leaves: SkColor[];
    road: SkColor;
    roadFar: SkColor;
    roadSeam: SkColor;
    laneDash: SkColor;
    roadEdge: SkColor;
    groundGrid: SkColor;
    ground: SkColor;
    buildings: SkColor[];
    buildingSides: SkColor[];
    windows: SkColor[];
  };
  // The world's own named colours (EnvironmentPalette.theme).
  theme: Record<string, SkColor>;
  obstacle: {
    barrier: Colors<typeof OBSTACLE_COLORS.barrier>;
    gatePost: Colors<typeof OBSTACLE_COLORS.gatePost>;
    gateBeam: Colors<EnvironmentPalette['gateBeam']>;
    tram: Colors<typeof OBSTACLE_COLORS.tram>;
  };
  character: Colors<CharacterColors> & { head: number };
  // Cosmetics: accessory code (see ACCESSORY_CODES), trail colours (empty = no trail),
  // and the hoverboard ridden during a speed boost.
  accessory: number;
  trail: SkColor[];
  board: { deck: SkColor; glow: SkColor };
  coin: { face: SkColor; rim: SkColor; inner: SkColor; shine: SkColor };
  // Power-up colours by PowerUpKind.
  power: SkColor[];
  gap: { pit: SkColor; rim: SkColor; glow: SkColor };
  chaser: Colors<typeof CHASER_COLORS>;
  ui: { text: SkColor; shadow: SkColor; accent: SkColor; gold: SkColor; white: SkColor };
};

// Numeric codes the worklets switch on.
export const SCENERY = { city: 0, beach: 1, snow: 2, jungle: 3 } as const;
export const RIDE = { run: 0, surf: 1, snowboard: 2 } as const;

function shade(hex: string, factor: number): SkColor {
  const c = Skia.Color(hex);
  return Float32Array.of(c[0] * factor, c[1] * factor, c[2] * factor, c[3]) as SkColor;
}

// A snowy pine at unit height: trunk, two tiers and a snow-capped tip.
function recordPine(env: EnvironmentPalette): SkPicture {
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording(Skia.XYWHRect(-0.5, -1.05, 1, 1.1));
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const w = 0.34;
  const tri = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    const pb = Skia.PathBuilder.Make();
    pb.moveTo(ax, -ay);
    pb.lineTo(bx, -by);
    pb.lineTo(cx, -cy);
    pb.close();
    canvas.drawPath(pb.detach(), paint);
  };
  paint.setColor(Skia.Color(env.theme.trunk));
  canvas.drawRect(Skia.XYWHRect(-0.02, -0.3, 0.04, 0.3), paint);
  paint.setColor(Skia.Color(env.theme.pineDark));
  tri(-w, 0.18, w, 0.18, 0, 0.72);
  paint.setColor(Skia.Color(env.theme.pine));
  tri(-w * 0.72, 0.48, w * 0.72, 0.48, 0, 1);
  paint.setColor(Skia.Color(env.theme.snow));
  paint.setAlphaf(0.9);
  tri(-w * 0.24, 0.83, w * 0.24, 0.83, 0, 1);
  return rec.finishRecordingAsPicture();
}

// Sky, sun, stars and the far skyline never change during a run, so they're recorded
// once into a picture that is wider than the screen and panned for parallax.
function recordBackdrop(
  width: number,
  horizonY: number,
  env: EnvironmentPalette,
  sky: SkShader,
  sun: SkShader,
): SkPicture {
  const pad = width * 0.3;
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording(Skia.XYWHRect(-pad, 0, width + pad * 2, horizonY + 2));
  const paint = Skia.Paint();
  paint.setAntiAlias(true);

  paint.setShader(sky);
  canvas.drawRect(Skia.XYWHRect(-pad, 0, width + pad * 2, horizonY + 2), paint);
  paint.setShader(null);

  // Stars, deterministic so the sky is identical every run.
  paint.setColor(Skia.Color(env.stars));
  let seed = 12345;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 70; i++) {
    const x = -pad + rand() * (width + pad * 2);
    const y = rand() * horizonY * 0.72;
    paint.setAlphaf(0.25 + rand() * 0.6);
    canvas.drawCircle(x, y, 0.6 + rand() * 1.3, paint);
  }
  paint.setAlphaf(1);

  // Synth sun sitting on the horizon, sliced by horizontal bands.
  const sunR = width * 0.26;
  const sunY = horizonY - sunR * 0.35;
  paint.setShader(sun);
  canvas.drawCircle(width / 2, sunY, sunR, paint);
  paint.setShader(null);
  paint.setColor(Skia.Color(env.skyHorizon));
  for (let i = 0; i < 6; i++) {
    const bandY = sunY + sunR * (0.05 + i * 0.16);
    const h = 2 + i * 1.6;
    canvas.drawRect(Skia.XYWHRect(width / 2 - sunR, bandY, sunR * 2, h), paint);
  }

  // Aurora over the mountains: soft wavy ribbons across the upper sky.
  if (env.scenery === 'snow') {
    const aurora = env.theme.aurora;
    const ribbon = Skia.Paint();
    ribbon.setAntiAlias(true);
    ribbon.setStyle(PaintStyle.Stroke);
    ribbon.setStrokeCap(StrokeCap.Round);
    const colors = [aurora, env.horizonGlow, env.theme.neonHot];
    for (let band = 0; band < 3; band++) {
      const baseY = horizonY * (0.2 + band * 0.12);
      for (let pass = 0; pass < 2; pass++) {
        ribbon.setColor(Skia.Color(colors[band]));
        ribbon.setAlphaf(pass === 0 ? 0.08 : 0.2);
        ribbon.setStrokeWidth(pass === 0 ? horizonY * 0.09 : horizonY * 0.025);
        const path = Skia.PathBuilder.Make();
        for (let i = 0; i <= 24; i++) {
          const x = -pad + ((width + pad * 2) * i) / 24;
          const y = baseY + Math.sin(i * 0.7 + band * 2) * horizonY * 0.04;
          if (i === 0) path.moveTo(x, y);
          else path.lineTo(x, y);
        }
        canvas.drawPath(path.detach(), ribbon);
      }
    }
  }

  // Two skyline layers: far (pale) and near (dark). The beach gets low rolling islands
  // and the mountain jagged peaks with snowcaps.
  const beach = env.scenery === 'beach';
  if (env.scenery === 'snow') {
    const peaks = [
      { color: '#3b3f9e', minH: 0.12, maxH: 0.3, step: [60, 120] },
      { color: env.skyline, minH: 0.07, maxH: 0.18, step: [40, 90] },
    ];
    for (const layer of peaks) {
      let x = -pad;
      while (x < width + pad) {
        const w = layer.step[0] + rand() * (layer.step[1] - layer.step[0]);
        const h = horizonY * (layer.minH + rand() * (layer.maxH - layer.minH));
        const peakX = x + w * (0.35 + rand() * 0.3);
        const path = Skia.PathBuilder.Make();
        path.moveTo(x - w * 0.3, horizonY + 2);
        path.lineTo(peakX, horizonY - h);
        path.lineTo(x + w * 1.3, horizonY + 2);
        path.close();
        paint.setColor(Skia.Color(layer.color));
        canvas.drawPath(path.detach(), paint);
        // Snowcap: the top quarter of the peak.
        const cap = Skia.PathBuilder.Make();
        const k = 0.25;
        cap.moveTo(peakX - (peakX - (x - w * 0.3)) * k, horizonY - h + h * k);
        cap.lineTo(peakX, horizonY - h);
        cap.lineTo(peakX + (x + w * 1.3 - peakX) * k, horizonY - h + h * k);
        cap.close();
        paint.setColor(Skia.Color(env.theme.snowShade));
        canvas.drawPath(cap.detach(), paint);
        x += w;
      }
    }
  }
  const rounded = beach || env.scenery === 'jungle';
  const layers =
    env.scenery === 'snow'
      ? []
      : env.scenery === 'jungle'
        ? [
            // Treetops: two layers of rolling canopy.
            { color: '#123a3a', minH: 0.08, maxH: 0.16, step: [30, 60] },
            { color: env.skyline, minH: 0.04, maxH: 0.1, step: [24, 46] },
          ]
        : beach
          ? [{ color: env.skyline, minH: 0.015, maxH: 0.06, step: [40, 90] }]
          : [
              { color: '#6a2a9e', minH: 0.08, maxH: 0.2, step: [14, 30] },
              { color: env.skyline, minH: 0.05, maxH: 0.16, step: [18, 40] },
            ];
  for (const layer of layers) {
    paint.setColor(Skia.Color(layer.color));
    const path = Skia.PathBuilder.Make();
    let x = -pad;
    path.moveTo(x, horizonY + 2);
    while (x < width + pad) {
      const w = layer.step[0] + rand() * (layer.step[1] - layer.step[0]);
      const h = horizonY * (layer.minH + rand() * (layer.maxH - layer.minH));
      if (rounded) {
        // Rounded hill instead of a flat roof.
        for (let i = 1; i <= 6; i++) {
          const a = (i / 6) * Math.PI;
          path.lineTo(x + (w * i) / 6, horizonY - Math.sin(a) * h);
        }
        x += w;
        continue;
      }
      path.lineTo(x, horizonY - h);
      if (rand() < 0.3) {
        // Antenna or spire.
        path.lineTo(x + w * 0.45, horizonY - h);
        path.lineTo(x + w * 0.5, horizonY - h - 10 - rand() * 14);
        path.lineTo(x + w * 0.55, horizonY - h);
      }
      path.lineTo(x + w, horizonY - h);
      x += w;
    }
    path.lineTo(x, horizonY + 2);
    path.close();
    canvas.drawPath(path.detach(), paint);
  }

  // Horizon glow line.
  paint.setColor(Skia.Color(env.horizonGlow));
  paint.setAlphaf(0.9);
  canvas.drawRect(Skia.XYWHRect(-pad, horizonY - 1, width + pad * 2, 2), paint);
  return rec.finishRecordingAsPicture();
}

export function createRenderResources(
  width: number,
  height: number,
  hudTop: number,
  horizonY: number,
  hudFont: SkFont,
  hudSmallFont: SkFont,
  loadout: Loadout,
  worldId: string,
  menuShift: number,
): RenderResources {
  const env = getEnvironment(worldId).palette;

  const fill = Skia.Paint();
  fill.setAntiAlias(true);
  fill.setStyle(PaintStyle.Fill);

  const stroke = Skia.Paint();
  stroke.setAntiAlias(true);
  stroke.setStyle(PaintStyle.Stroke);
  stroke.setStrokeCap(StrokeCap.Round);
  stroke.setStrokeJoin(StrokeJoin.Round);

  const shaded = Skia.Paint();
  shaded.setAntiAlias(true);

  const sky = Skia.Shader.MakeLinearGradient(
    { x: 0, y: 0 },
    { x: 0, y: horizonY },
    [
      Skia.Color(env.skyTop),
      Skia.Color(env.skyMid),
      Skia.Color(env.skyHorizon),
      Skia.Color(env.horizonGlow),
    ],
    [0, 0.55, 0.92, 1],
    TileMode.Clamp,
  );
  const groundShade = Skia.Shader.MakeLinearGradient(
    { x: 0, y: horizonY },
    { x: 0, y: height },
    [Skia.Color(env.groundHorizon), Skia.Color(env.ground), Skia.Color(env.groundBottom)],
    [0, env.scenery === 'beach' ? 0.2 : env.scenery === 'city' ? 0.35 : 0.3, 1],
    TileMode.Clamp,
  );
  const sunR = width * 0.26;
  const sunY = horizonY - sunR * 0.35;
  const sun = Skia.Shader.MakeLinearGradient(
    { x: 0, y: sunY - sunR },
    { x: 0, y: sunY + sunR * 0.4 },
    [Skia.Color(env.sunTop), Skia.Color(env.sunBottom)],
    null,
    TileMode.Clamp,
  );

  const look = characterLook(loadout.character, loadout.outfit);
  const boardColor = cosmetic(loadout.board)?.color ?? '#ff4fd8';

  return {
    width,
    height,
    hudTop,
    menuShift,
    fill,
    stroke,
    shaded,
    pb: Skia.PathBuilder.Make(),
    rect: Skia.XYWHRect(0, 0, 1, 1),
    recorder: Skia.PictureRecorder(),
    bounds: Skia.XYWHRect(0, 0, width, height),
    hudFont,
    hudSmallFont,
    sky,
    groundShade,
    sun,
    backdrop: recordBackdrop(width, horizonY, env, sky, sun),
    props: { pine: env.scenery === 'snow' ? recordPine(env) : null },
    env: {
      scenery: SCENERY[env.scenery],
      ride: RIDE[env.ride],
      dust: Skia.Color(env.dust),
      spark: Skia.Color(env.spark),
      leaves: [Skia.Color('#3ddc84'), Skia.Color('#1fae6a')],
      road: Skia.Color(env.road),
      roadFar: Skia.Color(env.roadFar),
      roadSeam: Skia.Color(env.roadSeam),
      laneDash: Skia.Color(env.laneDash),
      roadEdge: Skia.Color(env.roadEdge),
      groundGrid: Skia.Color(env.groundGrid),
      ground: Skia.Color(env.ground),
      buildings: env.buildings.map((c) => Skia.Color(c)),
      buildingSides: env.buildings.map((c) => shade(c, 0.8)),
      windows: env.windows.map((c) => Skia.Color(c)),
    },
    theme: Object.fromEntries(Object.entries(env.theme).map(([k, v]) => [k, Skia.Color(v)])),
    obstacle: {
      barrier: toColors(OBSTACLE_COLORS.barrier),
      gatePost: toColors(OBSTACLE_COLORS.gatePost),
      gateBeam: toColors(env.gateBeam),
      tram: toColors(OBSTACLE_COLORS.tram),
    },
    character: { ...toColors(look.colors), head: look.head },
    accessory: ACCESSORY_CODES[loadout.accessory] ?? 0,
    trail: (TRAIL_COLORS[loadout.trail] ?? []).map((c) => Skia.Color(c)),
    board: { deck: Skia.Color(boardColor), glow: Skia.Color(boardColor) },
    coin: {
      face: Skia.Color('#ffc928'),
      rim: Skia.Color('#d98a0b'),
      inner: Skia.Color('#ffe680'),
      shine: Skia.Color('#fffbe6'),
    },
    power: POWERUPS.map((p) => Skia.Color(p.color)),
    gap: { pit: Skia.Color('#05010f'), rim: Skia.Color('#ff4f6d'), glow: Skia.Color('#7a1bff') },
    chaser: toColors(CHASER_COLORS),
    ui: {
      text: Skia.Color(UI.text),
      shadow: Skia.Color(UI.shadow),
      accent: Skia.Color(UI.accent),
      gold: Skia.Color(UI.gold),
      white: Skia.Color('#ffffff'),
    },
  };
}
