/* tweaks-app.jsx — Globert tweak island (mounts into #tweaks-root) */
if (!window.React || !window.ReactDOM || !window.useTweaks) {
  console.warn('Tweaks panel unavailable; core factory controls are still active.');
} else {
const { useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mode": "Career",
  "palette": "Paper",
  "beltSpeed": 1,
  "lowPoly": 0.65,
  "ambient": "day",
  "gridSize": 12
}/*EDITMODE-END*/;

function GlobertTweaks() {
  // Seed from homepage-set prefs (localStorage) so Settings chosen on the
  // start screen take effect when the floor loads. In-game changes write back.
  const PREFS_KEY = 'globert_prefs_v1';
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; }
  }
  const [t, setTweak] = useTweaks({ ...TWEAK_DEFAULTS, ...loadPrefs() });

  // push visual tweaks into the game engine
  useEffect(() => {
    const g = window.GLOBERT; if (!g) return;
    g.setTweak('mode', t.mode);
    g.setTweak('palette', t.palette);
    g.setTweak('beltSpeed', t.beltSpeed);
    g.setTweak('lowPoly', t.lowPoly);
    g.setTweak('ambient', t.ambient);
    // mirror into shared prefs so the homepage Settings stay in sync
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        mode: t.mode, palette: t.palette, beltSpeed: t.beltSpeed,
        lowPoly: t.lowPoly, ambient: t.ambient, gridSize: t.gridSize,
      }));
    } catch (e) {}
  }, [t.mode, t.palette, t.beltSpeed, t.lowPoly, t.ambient, t.gridSize]);

  // grid size rebuilds the world — skip the initial mount so it can't wipe a loaded save
  const gridMounted = useRef(false);
  useEffect(() => {
    if (!gridMounted.current) { gridMounted.current = true; return; }
    if (window.GLOBERT) window.GLOBERT.setTweak('gridSize', t.gridSize);
  }, [t.gridSize]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Simulation" />
      <TweakRadio label="Mode" value={t.mode} options={['Career', 'Sandbox']}
                  onChange={(v) => setTweak('mode', v)} />
      <TweakSlider label="Belt speed" value={t.beltSpeed} min={0.4} max={2.5} step={0.1} unit="×"
                   onChange={(v) => setTweak('beltSpeed', v)} />
      <TweakRadio label="Factory size" value={t.gridSize} options={[10, 12, 16]}
                  onChange={(v) => setTweak('gridSize', Number(v))} />

      <TweakSection label="Look" />
      <TweakSlider label="Low-poly facets" value={t.lowPoly} min={0} max={1} step={0.05}
                   onChange={(v) => setTweak('lowPoly', v)} />
      <TweakRadio label="Ambient" value={t.ambient} options={['day', 'dusk', 'night']}
                  onChange={(v) => setTweak('ambient', v)} />
      <TweakRadio label="Palette" value={t.palette} options={['Paper', 'Cream', 'Slate']}
                  onChange={(v) => setTweak('palette', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<GlobertTweaks />);
}
