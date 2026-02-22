// --- Configuration ---
export const CONFIG = {
  width: 1200,
  height: 1800,
  padding: 64,

  fonts: {
    header: '36px "LabelMono", monospace',
    stats: '42px "LabelMono", monospace',
  },

  layout: {
    headerY: 120,

    // ANCHOR 1: Logo Bottom
    logoBottomY: 520,

    // ANCHOR 2: Body Start
    bodyGap: 24,

    // ANCHOR 3: Stats Start
    statsY: 1350,

    // NEW: The "DMZ"
    // The text body is forced to stop this many pixels BEFORE statsY.
    // Increased from implicit 40px to explicit 100px.
    minGapBetweenBodyAndStats: 100,

    footerLineHeight: 65
  }
};
