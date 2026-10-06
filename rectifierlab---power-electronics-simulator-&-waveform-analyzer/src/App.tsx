/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  RectifierConfig,
  simulateRectifier,
  SimulationResult,
} from './engine/rectifierSolver';
import { ControlsPanel } from './components/ControlsPanel';
import { Oscilloscope } from './components/Oscilloscope';
import { CircuitSchematic } from './components/CircuitSchematic';
import { MeasurementsGrid } from './components/MeasurementsGrid';
import { TheoryGuide } from './components/TheoryGuide';
import { Zap, Download, Copy, Check, FileText } from 'lucide-react';

const DEFAULT_CONFIG: RectifierConfig = {
  supplyPhase: 1,
  topology: 'bridge',
  deviceType: 'diode',
  loadType: 'RL',
  alpha: 30,
  R: 10,
  L: 50,
  E: 50,
  Vrms: 230,
  frequency: 50,
  hasFWD: false,
};

export default function App() {
  const [config, setConfig] = useState<RectifierConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState<boolean>(false);

  // Compute simulation synchronously on parameter change
  const simulation: SimulationResult = useMemo(() => {
    return simulateRectifier(config);
  }, [config]);

  // Export waveform CSV for MATLAB / PLECS / LTspice / Excel
  const handleExportCSV = () => {
    const headers = [
      'Theta_deg',
      'Time_ms',
      'Vs_A_V',
      'Vs_B_V',
      'Vs_C_V',
      'Vo_V',
      'Io_A',
      'Is_A_A',
      'VD1_V',
      'ID1_A',
      'IFWD_A',
      'Conduction_Path',
    ];

    const rows = simulation.samples.map((s) => [
      s.thetaDeg.toFixed(2),
      s.timeMs.toFixed(4),
      s.vsA.toFixed(2),
      s.vsB.toFixed(2),
      s.vsC.toFixed(2),
      s.vo.toFixed(2),
      s.io.toFixed(3),
      s.isA.toFixed(3),
      s.vD1.toFixed(2),
      s.iD1.toFixed(3),
      s.iFWD.toFixed(3),
      `"${s.activePair}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `rectifier_${config.supplyPhase}ph_${config.topology}_${config.deviceType}_${config.loadType}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Key Measurements Summary to Clipboard
  const handleCopyMetrics = () => {
    const m = simulation.metrics;
    const summary = `=== RectifierLab Performance Report ===
Topology: ${config.supplyPhase}-Phase ${config.topology} (${config.deviceType})
Load: ${config.loadType} (R=${config.R}Ω, L=${config.L}mH, E=${config.E}V)
Firing Delay α: ${config.alpha}° | FWD: ${config.hasFWD ? 'Yes' : 'No'}

--- DC Output ---
Average V_dc: ${m.Vdc.toFixed(2)} V (Theoretical: ${m.theoreticalVdc.toFixed(2)} V)
Average I_dc: ${m.Idc.toFixed(2)} A
RMS Voltage Vo: ${m.Vrms.toFixed(2)} V
RMS Current Io: ${m.Irms.toFixed(2)} A
Ripple Factor: ${m.voltageRippleFactor.toFixed(3)} | Form Factor: ${m.formFactor.toFixed(3)}

--- AC Grid & Power ---
Total Active Power: ${m.PacLoad.toFixed(1)} W
Apparent Power: ${m.Sin.toFixed(1)} VA
Power Factor: ${m.pf.toFixed(3)} | DPF: ${m.dpf.toFixed(3)}
Source Current THD: ${m.thdCurrent.toFixed(1)}%

--- Device 1 Stress ---
Peak Inverse Voltage (PIV): ${m.pivDevice1.toFixed(1)} V
Conduction Mode: ${m.conductionMode} (Conduction angle γ=${m.conductionAngleDeg.toFixed(1)}°)`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Application Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                Rectifier<span className="text-blue-400">Lab</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                  Power Electronics
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Rigorous solver for 1φ & 3φ uncontrolled & controlled rectifiers with verified waveforms
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMetrics}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition shadow-sm"
              title="Copy measurements summary report"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
              title="Export numerical waveform samples as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Lab Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Circuit & Controls Parameters */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <ControlsPanel
            config={config}
            onChange={setConfig}
            onReset={() => setConfig(DEFAULT_CONFIG)}
          />
        </aside>

        {/* Right Column: Oscilloscope, Schematic Diagram, Measurements, and Theory Guide */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {/* Multi-Channel Oscilloscope & Harmonic FFT */}
          <Oscilloscope
            simulation={simulation}
            is3Phase={config.supplyPhase === 3}
            isThyristor={config.deviceType === 'thyristor'}
            hasFWD={config.hasFWD || config.topology === 'semiconverter'}
          />

          {/* Circuit Schematic Diagram with Real-time Conduction Highlighting */}
          <CircuitSchematic config={config} simulation={simulation} />

          {/* Comprehensive Performance Measurements */}
          <MeasurementsGrid metrics={simulation.metrics} config={config} />

          {/* Theory and Operating Principles Guide */}
          <TheoryGuide config={config} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500">
        RectifierLab — Precision Power Electronics Simulation & Harmonic Analysis Engine. Verified against IEEE & textbook analytical equations.
      </footer>
    </div>
  );
}
