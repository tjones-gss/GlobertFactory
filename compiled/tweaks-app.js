if (!window.React || !window.ReactDOM || !window.useTweaks) {
  console.warn("Tweaks panel unavailable; core factory controls are still active.");
} else {
  let GlobertTweaks2 = function() {
    const PREFS_KEY = "globert_prefs_v1";
    function loadPrefs() {
      try {
        return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
      } catch (e) {
        return {};
      }
    }
    const [t, setTweak] = useTweaks({ ...TWEAK_DEFAULTS, ...loadPrefs() });
    useEffect(() => {
      const g = window.GLOBERT;
      if (!g) return;
      g.setTweak("mode", t.mode);
      g.setTweak("palette", t.palette);
      g.setTweak("beltSpeed", t.beltSpeed);
      g.setTweak("lowPoly", t.lowPoly);
      g.setTweak("ambient", t.ambient);
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({
          mode: t.mode,
          palette: t.palette,
          beltSpeed: t.beltSpeed,
          lowPoly: t.lowPoly,
          ambient: t.ambient,
          gridSize: t.gridSize
        }));
      } catch (e) {
      }
    }, [t.mode, t.palette, t.beltSpeed, t.lowPoly, t.ambient, t.gridSize]);
    const gridMounted = useRef(false);
    useEffect(() => {
      if (!gridMounted.current) {
        gridMounted.current = true;
        return;
      }
      if (window.GLOBERT) window.GLOBERT.setTweak("gridSize", t.gridSize);
    }, [t.gridSize]);
    return /* @__PURE__ */ React.createElement(TweaksPanel, { title: "Tweaks" }, /* @__PURE__ */ React.createElement(TweakSection, { label: "Simulation" }), /* @__PURE__ */ React.createElement(
      TweakRadio,
      {
        label: "Mode",
        value: t.mode,
        options: ["Career", "Sandbox"],
        onChange: (v) => setTweak("mode", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakSlider,
      {
        label: "Belt speed",
        value: t.beltSpeed,
        min: 0.4,
        max: 2.5,
        step: 0.1,
        unit: "\xD7",
        onChange: (v) => setTweak("beltSpeed", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakRadio,
      {
        label: "Factory size",
        value: t.gridSize,
        options: [10, 12, 16],
        onChange: (v) => setTweak("gridSize", Number(v))
      }
    ), /* @__PURE__ */ React.createElement(TweakSection, { label: "Look" }), /* @__PURE__ */ React.createElement(
      TweakSlider,
      {
        label: "Low-poly facets",
        value: t.lowPoly,
        min: 0,
        max: 1,
        step: 0.05,
        onChange: (v) => setTweak("lowPoly", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakRadio,
      {
        label: "Ambient",
        value: t.ambient,
        options: ["day", "dusk", "night"],
        onChange: (v) => setTweak("ambient", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakRadio,
      {
        label: "Palette",
        value: t.palette,
        options: ["Paper", "Cream", "Slate"],
        onChange: (v) => setTweak("palette", v)
      }
    ));
  };
  var GlobertTweaks = GlobertTweaks2;
  const { useEffect, useRef } = React;
  const TWEAK_DEFAULTS = (
    /*EDITMODE-BEGIN*/
    {
      "mode": "Career",
      "palette": "Paper",
      "beltSpeed": 1,
      "lowPoly": 0.65,
      "ambient": "day",
      "gridSize": 12
    }
  );
  ReactDOM.createRoot(document.getElementById("tweaks-root")).render(/* @__PURE__ */ React.createElement(GlobertTweaks2, null));
}
