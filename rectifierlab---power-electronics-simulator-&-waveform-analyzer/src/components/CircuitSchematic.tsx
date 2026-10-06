/**
 * High-Fidelity Interactive Schematic Circuit Diagram
 * Renders SVG circuit topologies with real-time conduction states,
 * gate firing pulses, animated current flow, and load element rendering.
 */

import React, { useState, useEffect } from 'react';
import { RectifierConfig, SimulationResult } from '../engine/rectifierSolver';
import { Play, Pause, Zap } from 'lucide-react';

interface CircuitSchematicProps {
  config: RectifierConfig;
  simulation: SimulationResult;
}

export const CircuitSchematic: React.FC<CircuitSchematicProps> = ({
  config,
  simulation,
}) => {
  const { supplyPhase, topology, deviceType, loadType, R, L, E, hasFWD, alpha } = config;
  const isThy = deviceType === 'thyristor';
  const prefix = isThy ? 'T' : 'D';

  // Animation angle for live current flow & conduction state demonstration
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animAngle, setAnimAngle] = useState<number>(0);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAnimAngle((prev) => (prev + 4) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Find nearest simulation sample for the current animation angle
  const currentSample = React.useMemo(() => {
    const samples = simulation.samples;
    if (!samples.length) return null;
    const target = animAngle;
    // Look up sample closest to target angle in first cycle
    let best = samples[0];
    let minDiff = 9999;
    for (let i = 0; i < Math.min(samples.length, 1800); i++) {
      const diff = Math.abs((samples[i].thetaDeg % 360) - target);
      if (diff < minDiff) {
        minDiff = diff;
        best = samples[i];
      }
    }
    return best;
  }, [animAngle, simulation.samples]);

  const activePathDesc = currentSample?.activePair || 'None';
  const isFwdConducting = (currentSample?.iFWD || 0) > 0.05;

  // Render semiconductor diode / thyristor SVG symbol
  const renderDevice = (
    x: number,
    y: number,
    label: string,
    isConducting: boolean,
    direction: 'up' | 'right' | 'down' | 'left' = 'up',
    forceDiode: boolean = false
  ) => {
    const isThyristorDevice = isThy && !forceDiode;
    let rotation = 0;
    if (direction === 'right') rotation = 90;
    if (direction === 'down') rotation = 180;
    if (direction === 'left') rotation = 270;

    return (
      <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
        {/* Glow when conducting */}
        {isConducting && (
          <circle
            cx="0"
            cy="0"
            r="20"
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeOpacity="0.8"
            className="animate-pulse"
          />
        )}

        {/* Device Triangle and Cathode Bar */}
        <g>
          {/* Anode to Cathode Triangle */}
          <polygon
            points="-12,12 12,12 0,-10"
            fill={isConducting ? '#10b981' : '#1e293b'}
            stroke={isConducting ? '#34d399' : '#64748b'}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Cathode Bar */}
          <line
            x1="-13"
            y1="-10"
            x2="13"
            y2="-10"
            stroke={isConducting ? '#34d399' : '#94a3b8'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Terminal leads */}
          <line x1="0" y1="12" x2="0" y2="24" stroke="#64748b" strokeWidth="2" />
          <line x1="0" y1="-10" x2="0" y2="-24" stroke="#64748b" strokeWidth="2" />

          {/* Thyristor Gate Lead */}
          {isThyristorDevice && (
            <g>
              <line x1="-8" y1="-5" x2="-22" y2="2" stroke="#ef4444" strokeWidth="1.8" />
              <line x1="-22" y1="2" x2="-28" y2="2" stroke="#ef4444" strokeWidth="1.8" />
              <circle cx="-28" cy="2" r="2" fill="#ef4444" />
            </g>
          )}
        </g>

        {/* Device Label */}
        <text
          x={direction === 'right' || direction === 'left' ? 0 : 22}
          y={direction === 'right' || direction === 'left' ? -18 : 4}
          fill={isConducting ? '#34d399' : '#cbd5e1'}
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
          transform={rotation !== 0 ? `rotate(${-rotation})` : undefined}
        >
          {label}
        </text>
      </g>
    );
  };

  // Render AC Voltage Source
  const renderACSource = (x: number, y: number, label: string) => (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="20" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
      {/* Sine wave icon */}
      <path
        d="M-10,0 C-5,-10 0,-10 0,0 C0,10 5,10 10,0"
        fill="none"
        stroke="#60a5fa"
        strokeWidth="2"
      />
      <text
        x="0"
        y="32"
        fill="#93c5fd"
        fontSize="11"
        fontWeight="600"
        fontFamily="monospace"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );

  // Render Load Box (R, L, E elements)
  const renderLoadBranch = (x: number, yTop: number, yBot: number) => {
    const totalH = yBot - yTop;
    const midY = (yTop + yBot) / 2;

    return (
      <g>
        {/* Load Boundary Box */}
        <rect
          x={x - 38}
          y={midY - 58}
          width="76"
          height="116"
          rx="8"
          fill="#0f172a"
          stroke="#475569"
          strokeWidth="1.8"
          strokeDasharray="4,4"
        />
        <text
          x={x}
          y={midY - 65}
          fill="#94a3b8"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
        >
          LOAD ({loadType})
        </text>

        {/* Resistor Element */}
        <g transform={`translate(${x}, ${midY - 32})`}>
          <rect
            x="-16"
            y="-8"
            width="32"
            height="16"
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth="1.8"
            rx="2"
          />
          <text
            x="0"
            y="3"
            fill="#fbbf24"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
          >
            R={R}Ω
          </text>
        </g>

        {/* Inductor Element (if RL or RLE) */}
        {loadType !== 'R' && (
          <g transform={`translate(${x}, ${midY})`}>
            {/* 4 Inductor bumps */}
            <path
              d="M-16,0 A4,5 0 0,1 -8,0 A4,5 0 0,1 0,0 A4,5 0 0,1 8,0 A4,5 0 0,1 16,0"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.2"
            />
            <text
              x="0"
              y="14"
              fill="#7dd3fc"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              L={L}mH
            </text>
          </g>
        )}

        {/* DC Source / Back-EMF Element (if RLE) */}
        {loadType === 'RLE' && (
          <g transform={`translate(${x}, ${midY + 36})`}>
            {/* Battery Plates */}
            <line x1="-12" y1="-5" x2="12" y2="-5" stroke="#ef4444" strokeWidth="2.5" />
            <line x1="-6" y1="3" x2="6" y2="3" stroke="#94a3b8" strokeWidth="2" />
            <text
              x="16"
              y="-3"
              fill="#ef4444"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              +
            </text>
            <text
              x="16"
              y="5"
              fill="#94a3b8"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              -
            </text>
            <text
              x="-22"
              y="3"
              fill="#f87171"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="end"
            >
              E={E}V
            </text>
          </g>
        )}

        {/* Connecting wire through load */}
        <line x1={x} y1={yTop} x2={x} y2={midY - 40} stroke="#64748b" strokeWidth="2" />
        <line x1={x} y1={midY - 24} x2={x} y2={loadType === 'R' ? yBot : midY - 6} stroke="#64748b" strokeWidth="2" />
        {loadType !== 'R' && (
          <line
            x1={x}
            y1={midY + 4}
            x2={x}
            y2={loadType === 'RLE' ? midY + 30 : yBot}
            stroke="#64748b"
            strokeWidth="2"
          />
        )}
        {loadType === 'RLE' && (
          <line x1={x} y1={midY + 40} x2={x} y2={yBot} stroke="#64748b" strokeWidth="2" />
        )}

        {/* Terminal polarities */}
        <text
          x={x + 16}
          y={yTop + 14}
          fill="#10b981"
          fontSize="14"
          fontWeight="bold"
          fontFamily="monospace"
        >
          +
        </text>
        <text
          x={x + 16}
          y={yBot - 6}
          fill="#ef4444"
          fontSize="14"
          fontWeight="bold"
          fontFamily="monospace"
        >
          -
        </text>
        <text
          x={x + 22}
          y={(yTop + yBot) / 2}
          fill="#10b981"
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
        >
          vo
        </text>
      </g>
    );
  };

  // Determine which devices are conducting based on activePathDesc
  const isConducting = (name: string) => {
    if (!currentSample || currentSample.io <= 0.05) return false;
    if (activePathDesc.includes(name)) return true;
    return false;
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Schematic Header & Interactive Playback Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200 tracking-wide">
            CIRCUIT SCHEMATIC & CONDUCTION STATUS
          </h3>
        </div>

        {/* Live Animation Angle Scrubber */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              isPlaying
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play Live'}
          </button>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
            <span>θ =</span>
            <input
              type="range"
              min="0"
              max="359"
              value={animAngle}
              onChange={(e) => {
                setIsPlaying(false);
                setAnimAngle(Number(e.target.value));
              }}
              className="w-24 accent-amber-500 cursor-pointer h-1.5"
            />
            <span className="w-10 text-right font-bold text-amber-400">{animAngle}°</span>
          </div>
        </div>
      </div>

      {/* Real-time Status Badge Banner */}
      <div className="flex flex-wrap items-center justify-between px-4 py-1.5 bg-slate-950/60 border-b border-slate-800/80 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-slate-400">
            Active Conduction Loop:
          </span>
          <span className="font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300">
            {activePathDesc}
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>
            vo: <strong className="text-emerald-400">{currentSample?.vo.toFixed(1) || '0.0'} V</strong>
          </span>
          <span>
            io: <strong className="text-amber-400">{currentSample?.io.toFixed(2) || '0.00'} A</strong>
          </span>
        </div>
      </div>

      {/* SVG Circuit Canvas */}
      <div className="p-2 flex justify-center items-center bg-slate-950/90 overflow-x-auto min-h-[300px]">
        <svg
          viewBox="0 0 640 320"
          className="w-full max-w-[640px] h-auto select-none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <defs>
            {/* Glow Filter */}
            <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. SINGLE-PHASE HALF-WAVE */}
          {supplyPhase === 1 && topology === 'half' && (
            <g>
              {/* AC Source */}
              {renderACSource(80, 160, 'vs')}

              {/* Rails */}
              <path
                d="M 80,140 L 80,70 L 460,70"
                fill="none"
                stroke="#64748b"
                strokeWidth="2.5"
              />
              <path
                d="M 80,180 L 80,250 L 460,250"
                fill="none"
                stroke="#64748b"
                strokeWidth="2.5"
              />

              {/* Device 1 */}
              {renderDevice(220, 70, `${prefix}1`, isConducting(`${prefix}1`) || isConducting('D1'), 'right')}

              {/* Freewheeling Diode branch if enabled */}
              {hasFWD && (
                <g>
                  <line x1="360" y1="70" x2="360" y2="250" stroke="#64748b" strokeWidth="2" />
                  <circle cx="360" cy="70" r="3.5" fill="#94a3b8" />
                  <circle cx="360" cy="250" r="3.5" fill="#94a3b8" />
                  {renderDevice(360, 160, 'DF', isFwdConducting, 'up', true)}
                </g>
              )}

              {/* Load */}
              <circle cx="460" cy="70" r="3.5" fill="#94a3b8" />
              <circle cx="460" cy="250" r="3.5" fill="#94a3b8" />
              {renderLoadBranch(460, 70, 250)}
            </g>
          )}

          {/* 2. SINGLE-PHASE FULL-WAVE CENTER-TAP */}
          {supplyPhase === 1 && topology === 'ct' && (
            <g>
              {/* Transformer Secondary representation */}
              {/* Top Secondary Coil */}
              {renderACSource(80, 100, 'vs / 2')}
              {/* Bottom Secondary Coil */}
              {renderACSource(80, 220, 'vs / 2')}

              {/* Center Tap Neutral Line to Load Negative */}
              <line x1="80" y1="160" x2="480" y2="160" stroke="#94a3b8" strokeWidth="2.5" />
              <circle cx="80" cy="160" r="4" fill="#3b82f6" />
              <text x="50" y="164" fill="#94a3b8" fontSize="10" fontWeight="bold">
                CT (0V)
              </text>

              {/* Top and Bottom Wires */}
              <path d="M 80,80 L 80,50 L 400,50" fill="none" stroke="#64748b" strokeWidth="2.5" />
              <path d="M 80,240 L 80,270 L 400,270" fill="none" stroke="#64748b" strokeWidth="2.5" />

              {/* Devices */}
              {renderDevice(220, 50, `${prefix}1`, isConducting('T1') || isConducting('D1'), 'right')}
              {renderDevice(220, 270, `${prefix}2`, isConducting('T2') || isConducting('D2'), 'right')}

              {/* Join to Load positive */}
              <path d="M 400,50 L 400,270" fill="none" stroke="#64748b" strokeWidth="2.5" />
              <line x1="400" y1="100" x2="480" y2="100" stroke="#64748b" strokeWidth="2.5" />
              <circle cx="400" cy="100" r="3.5" fill="#94a3b8" />

              {/* FWD if enabled */}
              {hasFWD && (
                <g>
                  <line x1="430" y1="100" x2="430" y2="160" stroke="#64748b" strokeWidth="2" />
                  <circle cx="430" cy="100" r="3.5" fill="#94a3b8" />
                  <circle cx="430" cy="160" r="3.5" fill="#94a3b8" />
                  {renderDevice(430, 130, 'DF', isFwdConducting, 'up', true)}
                </g>
              )}

              {/* Load */}
              {renderLoadBranch(480, 100, 160)}
            </g>
          )}

          {/* 3. SINGLE-PHASE FULL-WAVE BRIDGE & SEMICONVERTER */}
          {supplyPhase === 1 && (topology === 'bridge' || topology === 'semiconverter') && (
            <g>
              {/* AC Source */}
              {renderACSource(60, 160, 'vs')}

              {/* AC input rails into Bridge legs */}
              {/* Phase wire into Leg 1 midpoint */}
              <path d="M 60,140 L 60,125 L 170,125" fill="none" stroke="#3b82f6" strokeWidth="2.2" />
              <circle cx="170" cy="125" r="4" fill="#3b82f6" />

              {/* Neutral wire into Leg 2 midpoint */}
              <path d="M 60,180 L 60,195 L 300,195" fill="none" stroke="#94a3b8" strokeWidth="2.2" />
              <circle cx="300" cy="195" r="4" fill="#94a3b8" />

              {/* Leg 1 Wires (Vertical) */}
              <line x1="170" y1="60" x2="170" y2="260" stroke="#64748b" strokeWidth="2.5" />
              {/* Leg 2 Wires (Vertical) */}
              <line x1="300" y1="60" x2="300" y2="260" stroke="#64748b" strokeWidth="2.5" />

              {/* DC+ Bus Top rail */}
              <line x1="170" y1="60" x2="480" y2="60" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="170" cy="60" r="4" fill="#10b981" />
              <circle cx="300" cy="60" r="4" fill="#10b981" />

              {/* DC- Bus Bottom rail */}
              <line x1="170" y1="260" x2="480" y2="260" stroke="#ef4444" strokeWidth="2.5" />
              <circle cx="170" cy="260" r="4" fill="#ef4444" />
              <circle cx="300" cy="260" r="4" fill="#ef4444" />

              {/* Bridge Devices */}
              {/* Leg 1 Top: T1 */}
              {renderDevice(
                170,
                92,
                `${prefix}1`,
                isConducting('T1-T2') || isConducting('D1') || isConducting('T1'),
                'up',
                false
              )}
              {/* Leg 1 Bottom: T4 (or D4 in semiconverter) */}
              {renderDevice(
                170,
                228,
                topology === 'semiconverter' ? 'D4' : `${prefix}4`,
                isConducting('T3-T4') || isConducting('D4') || isConducting('T4'),
                'up',
                topology === 'semiconverter'
              )}

              {/* Leg 2 Top: T3 (or D3 in semiconverter) */}
              {renderDevice(
                300,
                92,
                `${prefix}3`,
                isConducting('T3-T4') || isConducting('D3') || isConducting('T3'),
                'up',
                false
              )}
              {/* Leg 2 Bottom: T2 (or D2 in semiconverter) */}
              {renderDevice(
                300,
                228,
                topology === 'semiconverter' ? 'D2' : `${prefix}2`,
                isConducting('T1-T2') || isConducting('D2') || isConducting('T2'),
                'up',
                topology === 'semiconverter'
              )}

              {/* Optional Freewheeling Diode */}
              {hasFWD && (
                <g>
                  <line x1="390" y1="60" x2="390" y2="260" stroke="#64748b" strokeWidth="2" />
                  <circle cx="390" cy="60" r="3.5" fill="#10b981" />
                  <circle cx="390" cy="260" r="3.5" fill="#ef4444" />
                  {renderDevice(390, 160, 'DF', isFwdConducting, 'up', true)}
                </g>
              )}

              {/* Load */}
              <circle cx="480" cy="60" r="3.5" fill="#10b981" />
              <circle cx="480" cy="260" r="3.5" fill="#ef4444" />
              {renderLoadBranch(480, 60, 260)}
            </g>
          )}

          {/* 4. THREE-PHASE HALF-WAVE (3-PULSE) */}
          {supplyPhase === 3 && topology === 'half' && (
            <g>
              {/* 3 AC Phase Sources */}
              {renderACSource(60, 80, 'va')}
              {renderACSource(60, 160, 'vb')}
              {renderACSource(60, 240, 'vc')}

              {/* Neutral Return Bus */}
              <path
                d="M 25,80 L 25,280 L 480,280"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2.5"
              />
              <line x1="25" y1="160" x2="40" y2="160" stroke="#94a3b8" strokeWidth="2.5" />
              <line x1="25" y1="240" x2="40" y2="240" stroke="#94a3b8" strokeWidth="2.5" />
              <text x="35" y="295" fill="#94a3b8" fontSize="10" fontWeight="bold">
                NEUTRAL (N)
              </text>

              {/* Phase Lines to Devices */}
              <line x1="80" y1="80" x2="190" y2="80" stroke="#ef4444" strokeWidth="2.2" />
              <line x1="80" y1="160" x2="190" y2="160" stroke="#eab308" strokeWidth="2.2" />
              <line x1="80" y1="240" x2="190" y2="240" stroke="#3b82f6" strokeWidth="2.2" />

              {/* 3 Devices */}
              {renderDevice(230, 80, `${prefix}1`, isConducting('Ph A') || isConducting('T1'), 'right')}
              {renderDevice(230, 160, `${prefix}2`, isConducting('Ph B') || isConducting('T2'), 'right')}
              {renderDevice(230, 240, `${prefix}3`, isConducting('Ph C') || isConducting('T3'), 'right')}

              {/* Common Cathode Bus (Top Rail) */}
              <path
                d="M 280,80 L 350,80 L 350,240"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
              />
              <line x1="280" y1="160" x2="350" y2="160" stroke="#10b981" strokeWidth="2.5" />
              <line x1="280" y1="240" x2="350" y2="240" stroke="#10b981" strokeWidth="2.5" />
              <line x1="350" y1="80" x2="480" y2="80" stroke="#10b981" strokeWidth="2.5" />

              {/* FWD if enabled */}
              {hasFWD && (
                <g>
                  <line x1="410" y1="80" x2="410" y2="280" stroke="#64748b" strokeWidth="2" />
                  <circle cx="410" cy="80" r="3.5" fill="#10b981" />
                  <circle cx="410" cy="280" r="3.5" fill="#94a3b8" />
                  {renderDevice(410, 180, 'DF', isFwdConducting, 'up', true)}
                </g>
              )}

              {/* Load */}
              <circle cx="480" cy="80" r="3.5" fill="#10b981" />
              <circle cx="480" cy="280" r="3.5" fill="#94a3b8" />
              {renderLoadBranch(480, 80, 280)}
            </g>
          )}

          {/* 5. THREE-PHASE FULL-WAVE BRIDGE (6-PULSE) */}
          {supplyPhase === 3 && topology === 'bridge' && (
            <g>
              {/* 3-Phase AC Source Icon */}
              {renderACSource(50, 160, '3φ AC')}

              {/* 3 Phase Lines into 3 Legs */}
              {/* Phase A to Leg 1 */}
              <path d="M 70,140 L 140,140" fill="none" stroke="#ef4444" strokeWidth="2" />
              <circle cx="140" cy="140" r="3.5" fill="#ef4444" />
              <text x="120" y="132" fill="#ef4444" fontSize="10" fontWeight="bold">
                A
              </text>

              {/* Phase B to Leg 2 */}
              <path d="M 70,160 L 220,160" fill="none" stroke="#eab308" strokeWidth="2" />
              <circle cx="220" cy="160" r="3.5" fill="#eab308" />
              <text x="200" y="152" fill="#eab308" fontSize="10" fontWeight="bold">
                B
              </text>

              {/* Phase C to Leg 3 */}
              <path d="M 70,180 L 300,180" fill="none" stroke="#3b82f6" strokeWidth="2" />
              <circle cx="300" cy="180" r="3.5" fill="#3b82f6" />
              <text x="280" y="172" fill="#3b82f6" fontSize="10" fontWeight="bold">
                C
              </text>

              {/* 3 Vertical Legs */}
              <line x1="140" y1="50" x2="140" y2="270" stroke="#64748b" strokeWidth="2.5" />
              <line x1="220" y1="50" x2="220" y2="270" stroke="#64748b" strokeWidth="2.5" />
              <line x1="300" y1="50" x2="300" y2="270" stroke="#64748b" strokeWidth="2.5" />

              {/* DC+ Bus (Top) */}
              <line x1="140" y1="50" x2="500" y2="50" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="140" cy="50" r="4" fill="#10b981" />
              <circle cx="220" cy="50" r="4" fill="#10b981" />
              <circle cx="300" cy="50" r="4" fill="#10b981" />

              {/* DC- Bus (Bottom) */}
              <line x1="140" y1="270" x2="500" y2="270" stroke="#ef4444" strokeWidth="2.5" />
              <circle cx="140" cy="270" r="4" fill="#ef4444" />
              <circle cx="220" cy="270" r="4" fill="#ef4444" />
              <circle cx="300" cy="270" r="4" fill="#ef4444" />

              {/* 6 Devices (IEC Standard Numbering: T1, T3, T5 on top; T4, T6, T2 on bottom) */}
              {/* Leg 1: T1 & T4 */}
              {renderDevice(
                140,
                95,
                `${prefix}1`,
                isConducting('T1-T6') || isConducting('T1-T2'),
                'up'
              )}
              {renderDevice(
                140,
                225,
                `${prefix}4`,
                isConducting('T3-T4') || isConducting('T5-T4'),
                'up'
              )}

              {/* Leg 2: T3 & T6 */}
              {renderDevice(
                220,
                95,
                `${prefix}3`,
                isConducting('T3-T2') || isConducting('T3-T4'),
                'up'
              )}
              {renderDevice(
                220,
                225,
                `${prefix}6`,
                isConducting('T1-T6') || isConducting('T5-T6'),
                'up'
              )}

              {/* Leg 3: T5 & T2 */}
              {renderDevice(
                300,
                95,
                `${prefix}5`,
                isConducting('T5-T4') || isConducting('T5-T6'),
                'up'
              )}
              {renderDevice(
                300,
                225,
                `${prefix}2`,
                isConducting('T1-T2') || isConducting('T3-T2'),
                'up'
              )}

              {/* FWD if enabled */}
              {hasFWD && (
                <g>
                  <line x1="400" y1="50" x2="400" y2="270" stroke="#64748b" strokeWidth="2" />
                  <circle cx="400" cy="50" r="3.5" fill="#10b981" />
                  <circle cx="400" cy="270" r="3.5" fill="#ef4444" />
                  {renderDevice(400, 160, 'DF', isFwdConducting, 'up', true)}
                </g>
              )}

              {/* Load */}
              <circle cx="500" cy="50" r="3.5" fill="#10b981" />
              <circle cx="500" cy="270" r="3.5" fill="#ef4444" />
              {renderLoadBranch(500, 50, 270)}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
