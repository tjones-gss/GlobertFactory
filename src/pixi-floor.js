import { Application, Container, Graphics } from 'pixi.js';

const COLORS = {
  ore: 0xb78455,
  plate: 0x94a3b8,
  gear: 0xe1b85a,
  widget: 0x2f8f64,
  belt: 0x1f2f28,
  active: 0x65c18c,
  ship: 0x36b37e,
  hover: 0xf2c94c
};

function alphaPulse(now, speed, base, amp) {
  return base + Math.sin(now * speed) * amp;
}

export async function createFloorLayer(options = {}) {
  const stage = options.stage;
  if (!stage) return null;

  const app = new Application();
  await app.init({
    resizeTo: stage,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: 'webgl'
  });

  app.canvas.className = 'pixi-floor-canvas';
  app.canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(app.canvas);

  const glows = new Container();
  const routes = new Container();
  const overlay = new Container();
  app.stage.addChild(glows, routes, overlay);

  function drawCells(state = {}) {
    const { sim, cam, hover, tool, now = performance.now() } = state;
    if (!sim || !cam) return;
    glows.removeChildren();
    routes.removeChildren();
    overlay.removeChildren();

    const tile = cam.tile;
    const pulse = alphaPulse(now, 0.004, 0.45, 0.18);

    for (let y = 0; y < sim.N; y++) {
      for (let x = 0; x < sim.N; x++) {
        if (sim.nodes[y]?.[x] === 'ore') {
          glows.addChild(
            new Graphics()
              .circle(cam.ox + x * tile + tile / 2, cam.oy + y * tile + tile / 2, tile * 0.26)
              .fill({ color: COLORS.ore, alpha: 0.16 + pulse * 0.08 })
          );
        }

        const cell = sim.cells[y]?.[x];
        if (!cell) continue;
        const cx = cam.ox + x * tile + tile / 2;
        const cy = cam.oy + y * tile + tile / 2;

        if (cell.kind === 'belt' && cell.item) {
          const dx = cell.dir === 1 ? 1 : cell.dir === 3 ? -1 : 0;
          const dy = cell.dir === 2 ? 1 : cell.dir === 0 ? -1 : 0;
          routes.addChild(
            new Graphics()
              .moveTo(cx - dx * tile * 0.24, cy - dy * tile * 0.24)
              .lineTo(cx + dx * tile * 0.26, cy + dy * tile * 0.26)
              .stroke({ color: COLORS[cell.item] || COLORS.belt, width: Math.max(2, tile * 0.08), alpha: 0.34 })
          );
        }

        if (cell.kind === 'assembler' && cell.active) {
          overlay.addChild(
            new Graphics()
              .roundRect(cam.ox + x * tile + tile * 0.12, cam.oy + y * tile + tile * 0.12, tile * 0.76, tile * 0.76, tile * 0.16)
              .stroke({ color: COLORS.active, width: Math.max(2, tile * 0.045), alpha: pulse })
          );
        }

        if (cell.kind === 'shipping' && cell.glow > 0) {
          glows.addChild(
            new Graphics()
              .circle(cx, cy, tile * (0.24 + cell.glow * 0.05))
              .fill({ color: COLORS.ship, alpha: 0.2 + cell.glow * 0.18 })
          );
        }
      }
    }

    if (hover && tool && tool !== 'select') {
      overlay.addChild(
        new Graphics()
          .roundRect(cam.ox + hover.x * tile + tile * 0.1, cam.oy + hover.y * tile + tile * 0.1, tile * 0.8, tile * 0.8, tile * 0.16)
          .stroke({ color: COLORS.hover, width: Math.max(2, tile * 0.04), alpha: 0.5 })
      );
    }
  }

  return {
    app,
    drawCells,
    resize() {
      app.resize();
    },
    destroy() {
      app.destroy(true);
    }
  };
}

if (typeof window !== 'undefined') {
  window.GLOBERT_PIXI = { createFloorLayer };
}

