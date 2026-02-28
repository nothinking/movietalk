import React from "react";

export const GlobalStyles = () => (
  <style>{`
    ::selection { background: rgba(99,102,241,0.3); color: #fff; }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes glowPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
      50% { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
    }
    button:focus-visible {
      outline: 2px solid rgba(99,102,241,0.4);
      outline-offset: 2px;
    }
    input:focus-visible {
      outline: none;
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }
    @keyframes hudPulse {
      0%, 100% { box-shadow: 0 0 15px rgba(99,102,241,0.15), inset 0 0 20px rgba(99,102,241,0.03); }
      50% { box-shadow: 0 0 25px rgba(99,102,241,0.3), inset 0 0 20px rgba(99,102,241,0.06); }
    }
    @keyframes engineGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1); }
      50% { box-shadow: 0 0 35px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.15); }
    }
    @keyframes indicatorBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .hud-overlay { position: relative; }
    .hud-overlay::before, .hud-overlay::after {
      content: ''; position: absolute; width: 12px; height: 12px;
      border-color: rgba(99,102,241,0.4); border-style: solid;
    }
    .hud-overlay::before { top: 0; left: 0; border-width: 2px 0 0 2px; }
    .hud-overlay::after { bottom: 0; right: 0; border-width: 0 2px 2px 0; }

    /* Physical cockpit panel frame */
    .cockpit-panel {
      position: relative;
      background: linear-gradient(180deg, #1e1e2c, #161622);
      border-top: 2px solid rgba(90,90,110,0.5);
      border-bottom: 2px solid rgba(50,50,70,0.4);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.4);
    }
    /* Screw decoration corners */
    .cockpit-panel::before, .cockpit-panel::after {
      content: '⊕'; position: absolute; font-size: 8px;
      color: rgba(100,100,120,0.5); z-index: 2;
      text-shadow: 0 1px 1px rgba(0,0,0,0.5);
    }
    .cockpit-panel::before { top: 6px; left: 10px; }
    .cockpit-panel::after { top: 6px; right: 10px; }
    /* Panel seam dividers (vertical) */
    .panel-seam {
      width: 1px;
      background: linear-gradient(180deg, transparent, rgba(80,80,100,0.3), rgba(80,80,100,0.4), rgba(80,80,100,0.3), transparent);
      align-self: stretch;
    }
    /* Physical 3D button base */
    .phys-btn {
      background: linear-gradient(180deg, #3a3a50, #2a2a3e, #222236) !important;
      border: 1px solid rgba(100,100,130,0.35) !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
      transition: all 0.15s ease;
      position: relative;
    }
    .phys-btn:active:not(:disabled) {
      background: linear-gradient(180deg, #1e1e30, #2a2a3e, #323248) !important;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
      transform: translateY(1px);
    }
    .phys-btn:hover:not(:disabled) {
      border-color: rgba(130,130,160,0.5) !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08);
    }
    /* Indicator LED */
    .led {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      box-shadow: 0 0 4px currentColor;
      vertical-align: middle;
      margin-right: 4px;
    }
    .led-green { color: #34d399; background: #34d399; }
    .led-amber { color: #fbbf24; background: #fbbf24; }
    .led-red { color: #ef4444; background: #ef4444; }
    .led-blue { color: #6366f1; background: #6366f1; }
    .led-off { color: #333; background: #333; box-shadow: none; }
    .led-blink { animation: indicatorBlink 1s ease-in-out infinite; }
    /* Engraved label plate */
    .label-plate {
      display: inline-block;
      padding: 2px 8px;
      background: linear-gradient(180deg, #1a1a28, #161622);
      border: 1px solid rgba(70,70,90,0.4);
      border-radius: 3px;
      font-size: 9px;
      font-family: monospace;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.4);
    }
    /* ── FIDS (Flight Information Display System) ── */
    .fids-board {
      position: relative;
      background: #020204;
      border: 2px solid rgba(40,40,55,0.8);
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 0 20px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.5);
    }
    .fids-board::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent, transparent 2px,
        rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px
      );
      pointer-events: none;
      z-index: 2;
    }
    .fids-board::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%);
      pointer-events: none;
      z-index: 3;
    }
    @keyframes fidsScanBeam {
      0% { top: -4px; }
      100% { top: 100%; }
    }
    .fids-scan {
      position: absolute;
      left: 0; right: 0;
      height: 4px;
      background: linear-gradient(180deg, transparent, rgba(99,102,241,0.08), transparent);
      z-index: 4;
      animation: fidsScanBeam 4s linear infinite;
      pointer-events: none;
    }
    .fids-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: linear-gradient(90deg, rgba(20,20,35,0.9), rgba(15,15,25,0.7));
      border-bottom: 1px solid rgba(60,60,80,0.4);
      position: relative;
      z-index: 1;
    }
    .fids-tag {
      display: inline-block;
      padding: 1px 6px;
      background: rgba(0,0,0,0.5);
      border: 1px solid rgba(70,70,90,0.5);
      border-radius: 2px;
      font-size: 9px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .fids-content {
      position: relative;
      z-index: 1;
      padding: 14px 16px;
      font-family: 'Courier New', monospace;
    }
    .fids-status {
      font-size: 9px;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      letter-spacing: 0.08em;
      padding: 4px 12px 6px;
      position: relative;
      z-index: 1;
    }
    /* Gauge bezel */
    .gauge-bezel {
      background: linear-gradient(180deg, #252535, #1a1a28);
      border: 2px solid rgba(80,80,100,0.45);
      border-radius: 8px;
      padding: 8px 16px;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.03);
    }
  `}</style>
);
