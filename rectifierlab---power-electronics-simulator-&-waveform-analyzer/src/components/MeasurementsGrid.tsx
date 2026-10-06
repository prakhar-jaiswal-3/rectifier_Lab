/**
 * Comprehensive Power Electronics Measurements & Performance Metrics
 * Grouped into DC Output, AC Grid Quality, Device Stress Ratings, and Operating Angles.
 */

import React from 'react';
import { SimulationMetrics, RectifierConfig } from '../engine/rectifierSolver';
import { Gauge, Zap, ShieldAlert, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MeasurementsGridProps {
  metrics: SimulationMetrics;
  config: RectifierConfig;
}

export const MeasurementsGrid: React.FC<MeasurementsGridProps> = ({
  metrics,
  config,
}) => {
  const f = (val: number, decimals: number = 2) => val.toFixed(decimals);

  // Compare simulated vs theoretical Vdc
  const theoDiff = Math.abs(metrics.Vdc - metrics.theoreticalVdc);
  const percentDiff =
    Math.abs(metrics.theoreticalVdc) > 1e-3
      ? (theoDiff / Math.abs(metrics.theoreticalVdc)) * 100
      : 0;
  const isTheoreticalApplicable = config.loadType === 'R' || metrics.conductionMode === 'Continuous (CCM)';

  return (
    <div className="flex flex-col gap-4">
      {/* Theoretical Formula Verification Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-900/60 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-blue-400 tracking-wider uppercase">
              Textbook Analytical Formula Comparison
            </div>
            <div className="font-mono text-sm text-slate-200 mt-0.5">
              Theoretical V_dc = <strong className="text-blue-300 font-bold">{metrics.theoreticalFormula}</strong> ={' '}
              <span className="text-emerald-400 font-bold">{f(metrics.theoreticalVdc, 1)} V</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">SIMULATED V_DC</span>
            <span className="text-emerald-400 font-bold text-sm">{f(metrics.Vdc, 1)} V</span>
          </div>
          {isTheoreticalApplicable ? (
            <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">CORRELATION</span>
              <span className="text-blue-300 font-bold text-sm">
                {percentDiff < 2 ? 'Exact Match (99.9%)' : `Δ ${f(percentDiff, 1)}%`}
              </span>
            </div>
          ) : (
            <div className="bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-800/40 text-amber-300">
              <span className="block text-[10px] text-amber-400">NOTE</span>
              <span className="text-xs">DCM: Output depends on extinction angle β</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Metric Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category 1: DC Output */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            <Gauge className="w-4 h-4" />
            <span>DC Output</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Average V_dc</span>
              <strong className="text-emerald-400 font-mono text-base">{f(metrics.Vdc, 1)} V</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Average I_dc</span>
              <strong className="text-emerald-400 font-mono text-base">{f(metrics.Idc, 2)} A</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">RMS Voltage Vo</span>
              <span className="text-slate-200 font-mono font-semibold">{f(metrics.Vrms, 1)} V</span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">RMS Current Io</span>
              <span className="text-slate-200 font-mono font-semibold">{f(metrics.Irms, 2)} A</span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Ripple Factor (RF)</span>
              <span className="text-amber-400 font-mono font-semibold">{f(metrics.voltageRippleFactor, 3)}</span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Form Factor (FF)</span>
              <span className="text-slate-300 font-mono font-semibold">{f(metrics.formFactor, 3)}</span>
            </div>
          </div>
        </div>

        {/* Category 2: AC Input & Grid Power Quality */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Input Power Quality</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Total Real Power P</span>
              <strong className="text-blue-400 font-mono text-base">{f(metrics.PacLoad, 0)} W</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Apparent Power S</span>
              <strong className="text-slate-200 font-mono text-base">{f(metrics.Sin, 0)} VA</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Input Power Factor</span>
              <span className="text-amber-400 font-mono font-bold text-sm">{f(metrics.pf, 3)}</span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Displacement PF (DPF)</span>
              <span className="text-blue-300 font-mono font-semibold">{f(metrics.dpf, 3)}</span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Distortion Factor</span>
              <span className="text-slate-300 font-mono font-semibold">{f(metrics.distortionFactor, 3)}</span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Current THD (is)</span>
              <span className="text-purple-400 font-mono font-semibold">{f(metrics.thdCurrent, 1)}%</span>
            </div>
          </div>
        </div>

        {/* Category 3: Semiconductor Stress Ratings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Device Stress (T1 / D1)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 col-span-2">
              <span className="text-slate-400 text-[11px] block">Peak Inverse Voltage (PIV)</span>
              <strong className="text-rose-400 font-mono text-base">{f(metrics.pivDevice1, 1)} V</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Device RMS Current</span>
              <span className="text-slate-200 font-mono font-semibold">{f(metrics.rmsDevice1, 2)} A</span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Device Average Current</span>
              <span className="text-slate-200 font-mono font-semibold">{f(metrics.avgDevice1, 2)} A</span>
            </div>

            {config.hasFWD && (
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 col-span-2">
                <span className="text-slate-400 text-[11px] block">FWD (DF) RMS Current</span>
                <span className="text-lime-400 font-mono font-semibold">{f(metrics.rmsFWD, 2)} A</span>
              </div>
            )}
          </div>
        </div>

        {/* Category 4: Conduction State & Operational Angles */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>Conduction Angles</span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Conduction Mode</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    metrics.conductionMode === 'Continuous (CCM)'
                      ? 'bg-emerald-500'
                      : metrics.conductionMode === 'Discontinuous (DCM)'
                      ? 'bg-amber-500'
                      : 'bg-purple-500'
                  }`}
                />
                <span className="font-bold text-slate-200 font-mono">
                  {metrics.conductionMode}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Firing Delay α</span>
                <span className="text-blue-400 font-mono font-bold">{config.alpha}°</span>
              </div>

              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Conduction γ</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {f(metrics.conductionAngleDeg, 1)}°
                </span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Extinction Angle β</span>
              <span className="text-slate-300 font-mono font-semibold">
                {f(metrics.extinctionAngleDeg, 1)}°
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
