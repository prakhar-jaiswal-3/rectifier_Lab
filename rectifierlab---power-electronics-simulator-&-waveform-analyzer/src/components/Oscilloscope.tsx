/**
 * Synchronized Multi-Channel Oscilloscope & Harmonics Analyzer
 * High-performance canvas renderer with interactive crosshair inspection,
 * calibrated timebase and voltage/current graticules, channel toggles, and FFT display.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  SimulationResult,
  SimulationSample,
  HarmonicComponent,
} from '../engine/rectifierSolver';
import { Eye, EyeOff, Activity, BarChart2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface OscilloscopeProps {
  simulation: SimulationResult;
  is3Phase: boolean;
  isThyristor: boolean;
  hasFWD: boolean;
}

interface ChannelConfig {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  unit: string;
  group: 'voltage' | 'current' | 'logic';
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  simulation,
  is3Phase,
  isThyristor,
  hasFWD,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<'waveforms' | 'harmonics'>('waveforms');
  const [harmonicSignal, setHarmonicSignal] = useState<'current' | 'voltage'>('current');
  const [cyclesView, setCyclesView] = useState<1 | 2>(2);

  // Hover cursor state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Channels state
  const [channels, setChannels] = useState<ChannelConfig[]>([
    { id: 'vs', name: 'Source Voltage (vs)', color: '#3b82f6', enabled: true, unit: 'V', group: 'voltage' },
    { id: 'vo', name: 'Load Voltage (vo)', color: '#10b981', enabled: true, unit: 'V', group: 'voltage' },
    { id: 'io', name: 'Load Current (io)', color: '#f59e0b', enabled: true, unit: 'A', group: 'current' },
    { id: 'is', name: 'Source Current (is)', color: '#8b5cf6', enabled: true, unit: 'A', group: 'current' },
    { id: 'vD1', name: 'Device 1 Voltage (vT1)', color: '#06b6d4', enabled: false, unit: 'V', group: 'voltage' },
    { id: 'iD1', name: 'Device 1 Current (iT1)', color: '#ec4899', enabled: false, unit: 'A', group: 'current' },
    { id: 'iFWD', name: 'FWD Current (iDF)', color: '#84cc16', enabled: false, unit: 'A', group: 'current' },
    { id: 'gate', name: 'Gate Pulse (vG)', color: '#ef4444', enabled: isThyristor, unit: '', group: 'logic' },
  ]);

  // Keep gate channel synchronized with thyristor toggle
  useEffect(() => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === 'gate' ? { ...ch, enabled: isThyristor } : ch))
    );
  }, [isThyristor]);

  const toggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, enabled: !ch.enabled } : ch))
    );
  };

  const samples = useMemo(() => {
    if (cyclesView === 1) {
      return simulation.samples.slice(0, Math.floor(simulation.samples.length / 2));
    }
    return simulation.samples;
  }, [simulation.samples, cyclesView]);

  // Draw Waveforms onto Canvas
  useEffect(() => {
    if (activeTab !== 'waveforms') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Dark sleek oscilloscope theme
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, W, H);

    // Padding
    const padL = 60;
    const padR = 25;
    const padT = 30;
    const padB = 42;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    if (plotW <= 0 || plotH <= 0 || samples.length < 2) return;

    // Filter enabled channels to determine voltage and current dynamic ranges
    const enabledChs = channels.filter((c) => c.enabled);

    // Find min and max for voltages
    let minV = 0;
    let maxV = 100;
    let minI = 0;
    let maxI = 10;

    samples.forEach((s) => {
      // Voltage checks
      if (channels.find((c) => c.id === 'vs')?.enabled) {
        minV = Math.min(minV, s.vsA, s.vsB, s.vsC);
        maxV = Math.max(maxV, s.vsA, s.vsB, s.vsC);
      }
      if (channels.find((c) => c.id === 'vo')?.enabled) {
        minV = Math.min(minV, s.vo);
        maxV = Math.max(maxV, s.vo);
      }
      if (channels.find((c) => c.id === 'vD1')?.enabled) {
        minV = Math.min(minV, s.vD1);
        maxV = Math.max(maxV, s.vD1);
      }

      // Current checks
      if (channels.find((c) => c.id === 'io')?.enabled) {
        minI = Math.min(minI, s.io);
        maxI = Math.max(maxI, s.io);
      }
      if (channels.find((c) => c.id === 'is')?.enabled) {
        minI = Math.min(minI, s.isA);
        maxI = Math.max(maxI, s.isA);
      }
      if (channels.find((c) => c.id === 'iD1')?.enabled) {
        minI = Math.min(minI, s.iD1);
        maxI = Math.max(maxI, s.iD1);
      }
      if (channels.find((c) => c.id === 'iFWD')?.enabled) {
        minI = Math.min(minI, s.iFWD);
        maxI = Math.max(maxI, s.iFWD);
      }
    });

    // Add padding margins to voltage and current scales
    const vSpan = Math.max(50, maxV - minV);
    minV = Math.floor((minV - vSpan * 0.1) / 50) * 50;
    maxV = Math.ceil((maxV + vSpan * 0.1) / 50) * 50;

    const iSpan = Math.max(2, maxI - minI);
    minI = Math.floor((minI - iSpan * 0.1) * 2) / 2;
    maxI = Math.ceil((maxI + iSpan * 0.1) * 2) / 2;

    // Helper coordinate converters
    const getX = (idx: number) => padL + (idx / (samples.length - 1)) * plotW;
    const getY_V = (val: number) => padT + plotH - ((val - minV) / (maxV - minV)) * plotH;
    const getY_I = (val: number) => padT + plotH - ((val - minI) / (maxI - minI)) * plotH;

    // 1. Draw Oscilloscope Graticule Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e293b';

    // Vertical grid lines (Angles: 0, 90, 180, 270, 360, 450, 540, 630, 720)
    const totalAngle = cyclesView * 360;
    const angleStep = 45; // Every 45 degrees
    for (let a = 0; a <= totalAngle; a += angleStep) {
      const x = padL + (a / totalAngle) * plotW;
      const isMajor = a % 90 === 0;
      ctx.strokeStyle = isMajor ? '#334155' : '#1e293b';
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();

      // Tick label on X-axis
      if (isMajor) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "JetBrains Mono", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${a}°`, x, padT + plotH + 15);

        // Millisecond label under degree label (at 50 Hz, 1 cycle = 20ms)
        const msVal = ((a / 360) * 20).toFixed(1);
        ctx.fillStyle = '#64748b';
        ctx.fillText(`${msVal}ms`, x, padT + plotH + 28);
      }
    }

    // Horizontal grid lines (8 divisions)
    const horizDivs = 8;
    for (let d = 0; d <= horizDivs; d++) {
      const y = padT + (d / horizDivs) * plotH;
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
    }

    // Zero-lines for Voltage and Current
    const zeroY_V = getY_V(0);
    if (zeroY_V >= padT && zeroY_V <= padT + plotH) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, zeroY_V);
      ctx.lineTo(padL + plotW, zeroY_V);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const zeroY_I = getY_I(0);
    if (zeroY_I >= padT && zeroY_I <= padT + plotH) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, zeroY_I);
      ctx.lineTo(padL + plotW, zeroY_I);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Y-Axis Voltage labels (Left side)
    ctx.fillStyle = '#60a5fa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    const vSteps = 4;
    for (let s = 0; s <= vSteps; s++) {
      const vVal = minV + (s / vSteps) * (maxV - minV);
      const y = getY_V(vVal);
      ctx.fillText(`${vVal.toFixed(0)}V`, padL - 6, y + 3);
    }

    // Y-Axis Current labels (Right side)
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'left';
    const iSteps = 4;
    for (let s = 0; s <= iSteps; s++) {
      const iVal = minI + (s / iSteps) * (maxI - minI);
      const y = getY_I(iVal);
      ctx.fillText(`${iVal.toFixed(1)}A`, padL + plotW + 5, y + 3);
    }

    // 2. Render Channel Waveforms
    // Plot function helper
    const drawTrace = (
      getValue: (s: SimulationSample) => number,
      getYCoord: (v: number) => number,
      color: string,
      lineWidth: number = 2,
      dash: number[] = []
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash(dash);
      ctx.beginPath();
      samples.forEach((s, idx) => {
        const x = getX(idx);
        const y = Math.max(padT - 5, Math.min(padT + plotH + 5, getYCoord(getValue(s))));
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // CH1: Source Voltage vs
    if (channels.find((c) => c.id === 'vs')?.enabled) {
      if (is3Phase) {
        // Red (Phase A), Gold (Phase B), Blue (Phase C) standard engineering colors
        drawTrace((s) => s.vsA, getY_V, '#ef4444', 1.8);
        drawTrace((s) => s.vsB, getY_V, '#eab308', 1.8);
        drawTrace((s) => s.vsC, getY_V, '#3b82f6', 1.8);
      } else {
        drawTrace((s) => s.vsA, getY_V, '#3b82f6', 2.0);
      }
    }

    // CH2: Load Voltage vo (Green)
    if (channels.find((c) => c.id === 'vo')?.enabled) {
      // Glow effect for load voltage
      ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
      ctx.shadowBlur = 4;
      drawTrace((s) => s.vo, getY_V, '#10b981', 2.2);
      ctx.shadowBlur = 0;

      // Draw Vdc average reference line
      const vdcY = getY_V(simulation.metrics.Vdc);
      if (vdcY >= padT && vdcY <= padT + plotH) {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(padL, vdcY);
        ctx.lineTo(padL + plotW, vdcY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Vdc = ${simulation.metrics.Vdc.toFixed(1)}V`, padL + plotW - 8, vdcY - 4);
      }
    }

    // CH3: Load Current io (Orange/Amber)
    if (channels.find((c) => c.id === 'io')?.enabled) {
      ctx.shadowColor = 'rgba(245, 158, 11, 0.3)';
      ctx.shadowBlur = 3;
      drawTrace((s) => s.io, getY_I, '#f59e0b', 2.2);
      ctx.shadowBlur = 0;

      // Draw Idc average reference line
      const idcY = getY_I(simulation.metrics.Idc);
      if (idcY >= padT && idcY <= padT + plotH) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padL, idcY);
        ctx.lineTo(padL + plotW, idcY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Idc = ${simulation.metrics.Idc.toFixed(2)}A`, padL + 8, idcY - 4);
      }
    }

    // CH4: Source Current is (Purple)
    if (channels.find((c) => c.id === 'is')?.enabled) {
      drawTrace((s) => s.isA, getY_I, '#a855f7', 1.8);
    }

    // CH5: Device 1 Voltage vD1 (Cyan)
    if (channels.find((c) => c.id === 'vD1')?.enabled) {
      drawTrace((s) => s.vD1, getY_V, '#06b6d4', 1.8);
    }

    // CH6: Device 1 Current iD1 (Pink)
    if (channels.find((c) => c.id === 'iD1')?.enabled) {
      drawTrace((s) => s.iD1, getY_I, '#ec4899', 1.8);
    }

    // CH7: Freewheeling Diode Current iFWD (Lime)
    if (channels.find((c) => c.id === 'iFWD')?.enabled) {
      drawTrace((s) => s.iFWD, getY_I, '#84cc16', 1.8);
    }

    // Logic Track: Gate Pulses (Red strip at bottom)
    if (channels.find((c) => c.id === 'gate')?.enabled && isThyristor) {
      const logicH = 12;
      const logicY_base = padT + plotH - 6;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      samples.forEach((s, idx) => {
        const x = getX(idx);
        const y = logicY_base - (s.gatePulse ? logicH : 0);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('GATE PULSE', padL + 4, logicY_base - 14);
    }

    // 3. Interactive Cursor Hairline & Snap Readout
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < samples.length) {
      const snapX = getX(hoverIndex);
      const sample = samples[hoverIndex];

      // Vertical line across plot
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(snapX, padT);
      ctx.lineTo(snapX, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point dots for visible channels
      const drawSnapDot = (yCoord: number, color: string) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(snapX, yCoord, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      };

      if (channels.find((c) => c.id === 'vo')?.enabled) {
        drawSnapDot(getY_V(sample.vo), '#10b981');
      }
      if (channels.find((c) => c.id === 'io')?.enabled) {
        drawSnapDot(getY_I(sample.io), '#f59e0b');
      }
      if (channels.find((c) => c.id === 'vs')?.enabled) {
        drawSnapDot(getY_V(sample.vsA), '#3b82f6');
      }
      if (channels.find((c) => c.id === 'is')?.enabled) {
        drawSnapDot(getY_I(sample.isA), '#a855f7');
      }
      if (channels.find((c) => c.id === 'vD1')?.enabled) {
        drawSnapDot(getY_V(sample.vD1), '#06b6d4');
      }
    }
  }, [samples, channels, cyclesView, is3Phase, isThyristor, hoverIndex, activeTab, simulation]);

  // Handle Mouse movement for Cursor inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padL = 60;
    const padR = 25;
    const plotW = rect.width - padL - padR;

    if (x >= padL && x <= padL + plotW) {
      const relX = (x - padL) / plotW;
      const index = Math.round(relX * (samples.length - 1));
      setHoverIndex(Math.max(0, Math.min(samples.length - 1, index)));
      setCursorPos({ x, y });
    } else {
      setHoverIndex(null);
      setCursorPos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };

  const currentHoverSample = hoverIndex !== null ? samples[hoverIndex] : null;

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl" ref={containerRef}>
      {/* Top Scope Header & Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-200 text-sm tracking-wide">
              OSCILLOSCOPE & HARMONIC ANALYZER
            </span>
          </div>

          {/* Mode Switcher Tab */}
          <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => setActiveTab('waveforms')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition font-medium ${
                activeTab === 'waveforms'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Waveforms
            </button>
            <button
              onClick={() => setActiveTab('harmonics')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition font-medium ${
                activeTab === 'harmonics'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              FFT Harmonics
            </button>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2 text-xs">
          {activeTab === 'waveforms' && (
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
              <button
                onClick={() => setCyclesView(1)}
                className={`px-2.5 py-1 rounded-md transition font-mono ${
                  cyclesView === 1 ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Show 1 complete cycle (360°)"
              >
                1 Cycle
              </button>
              <button
                onClick={() => setCyclesView(2)}
                className={`px-2.5 py-1 rounded-md transition font-mono ${
                  cyclesView === 2 ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Show 2 complete cycles (720°)"
              >
                2 Cycles
              </button>
            </div>
          )}

          {activeTab === 'harmonics' && (
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
              <button
                onClick={() => setHarmonicSignal('current')}
                className={`px-2.5 py-1 rounded-md transition font-medium ${
                  harmonicSignal === 'current'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Source Current (is)
              </button>
              <button
                onClick={() => setHarmonicSignal('voltage')}
                className={`px-2.5 py-1 rounded-md transition font-medium ${
                  harmonicSignal === 'voltage'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Load Voltage (vo)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Display Area */}
      {activeTab === 'waveforms' ? (
        <div className="relative">
          {/* Active Probe HUD Bar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-1.5 bg-slate-950/60 border-b border-slate-800/80 text-[11px] font-mono">
            {currentHoverSample ? (
              <div className="flex flex-wrap items-center gap-4 text-slate-300">
                <span className="text-white font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                  θ = {currentHoverSample.thetaDeg.toFixed(1)}° ({currentHoverSample.timeMs.toFixed(2)} ms)
                </span>
                <span className="text-blue-400">
                  vs = {currentHoverSample.vsA.toFixed(1)} V
                </span>
                <span className="text-emerald-400 font-bold">
                  vo = {currentHoverSample.vo.toFixed(1)} V
                </span>
                <span className="text-amber-400 font-bold">
                  io = {currentHoverSample.io.toFixed(2)} A
                </span>
                <span className="text-purple-400">
                  is = {currentHoverSample.isA.toFixed(2)} A
                </span>
                <span className="text-cyan-400">
                  vT1 = {currentHoverSample.vD1.toFixed(1)} V
                </span>
                <span className="text-slate-400 italic">
                  Path: <strong className="text-slate-200">{currentHoverSample.activePair}</strong>
                </span>
              </div>
            ) : (
              <div className="text-slate-400 italic">
                Hover or drag across the waveforms to inspect instant values (θ, vo, io, is, vT1)
              </div>
            )}
          </div>

          {/* Oscilloscope Canvas */}
          <div className="w-full h-[450px] relative">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="w-full h-full cursor-crosshair block"
            />
          </div>

          {/* Channel Legend & Enable Badges */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950/90 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Channels:
            </span>
            {channels.map((ch) => {
              // Hide 3-phase or logic specific channels if not applicable
              if (ch.id === 'gate' && !isThyristor) return null;
              if (ch.id === 'iFWD' && !hasFWD) return null;

              return (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition border ${
                    ch.enabled
                      ? 'bg-slate-800 text-slate-200 border-slate-700 shadow-sm'
                      : 'bg-slate-900/50 text-slate-500 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{
                      backgroundColor: ch.enabled ? ch.color : '#475569',
                      boxShadow: ch.enabled ? `0 0 8px ${ch.color}` : 'none',
                    }}
                  />
                  <span>{ch.name}</span>
                  {ch.enabled ? (
                    <Eye className="w-3 h-3 text-slate-400 ml-0.5" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-slate-600 ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Harmonics FFT Display */
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">
                {harmonicSignal === 'current'
                  ? 'Source Current AC Harmonic Spectrum (is)'
                  : 'Load Voltage Harmonic Spectrum (vo)'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {harmonicSignal === 'current'
                  ? 'Shows fundamental (50Hz) and harmonic orders (3rd, 5th, 7th...) causing grid distortion'
                  : 'Shows DC component and AC ripple harmonics (100Hz for 2-pulse, 300Hz for 6-pulse)'}
              </p>
            </div>

            {harmonicSignal === 'current' && (
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="bg-purple-950/60 border border-purple-800/50 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">TOTAL HARMONIC DISTORTION</span>
                  <span className="text-purple-300 font-bold text-sm">
                    THDi = {simulation.metrics.thdCurrent.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-blue-950/60 border border-blue-800/50 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">DISPLACEMENT POWER FACTOR</span>
                  <span className="text-blue-300 font-bold text-sm">
                    DPF = {simulation.metrics.dpf.toFixed(3)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Harmonic Bar Chart */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
            <div className="h-[280px] flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-800">
              {(harmonicSignal === 'current'
                ? simulation.harmonicsCurrent
                : simulation.harmonicsVoltage
              )
                .slice(0, 16)
                .map((comp) => {
                  const maxPercent = 100;
                  const barHeight = Math.min(100, Math.max(3, (comp.percentOfFundamental / maxPercent) * 100));
                  const isFund = comp.order === 1;

                  return (
                    <div
                      key={comp.order}
                      className="flex-1 flex flex-col items-center gap-1 h-full justify-end group"
                    >
                      <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition">
                        {comp.percentOfFundamental.toFixed(1)}%
                      </span>
                      <div
                        className={`w-full rounded-t transition-all ${
                          isFund
                            ? 'bg-blue-500 group-hover:bg-blue-400'
                            : comp.percentOfFundamental > 15
                            ? 'bg-amber-500 group-hover:bg-amber-400'
                            : 'bg-indigo-500/80 group-hover:bg-indigo-400'
                        }`}
                        style={{ height: `${barHeight}%` }}
                      />
                      <span className="text-[11px] font-mono font-medium text-slate-300 mt-1">
                        h{comp.order}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        {comp.frequencyHz}Hz
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Harmonics Table */}
            <div className="mt-4 overflow-x-auto max-h-[160px]">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-1.5 px-3">Order</th>
                    <th className="py-1.5 px-3">Frequency</th>
                    <th className="py-1.5 px-3">RMS Value</th>
                    <th className="py-1.5 px-3">% of Fundamental</th>
                    <th className="py-1.5 px-3">Phase Angle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(harmonicSignal === 'current'
                    ? simulation.harmonicsCurrent
                    : simulation.harmonicsVoltage
                  )
                    .slice(0, 12)
                    .map((comp) => (
                      <tr key={comp.order} className="hover:bg-slate-900/40">
                        <td className="py-1.5 px-3 font-semibold text-blue-400">
                          h = {comp.order}
                        </td>
                        <td className="py-1.5 px-3">{comp.frequencyHz} Hz</td>
                        <td className="py-1.5 px-3">
                          {comp.rms.toFixed(2)}{' '}
                          {harmonicSignal === 'current' ? 'A' : 'V'}
                        </td>
                        <td className="py-1.5 px-3 font-medium">
                          {comp.order === 1 ? '100.0% (Ref)' : `${comp.percentOfFundamental.toFixed(2)}%`}
                        </td>
                        <td className="py-1.5 px-3 text-slate-400">
                          {comp.phaseDeg.toFixed(1)}°
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
