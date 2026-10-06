/**
 * Interactive Controls Panel & Parameter Inputs
 * Provides topology selection, device type, load configuration, firing angle slider,
 * back-EMF, and 1-click educational preset scenarios.
 */

import React from 'react';
import {
  RectifierConfig,
  SupplyPhase,
  RectifierTopo,
  DeviceType,
  LoadType,
} from '../engine/rectifierSolver';
import { PRESET_SCENARIOS, PresetScenario } from '../engine/circuitModels';
import { Sliders, Sparkles, Zap, Layers, RefreshCw } from 'lucide-react';

interface ControlsPanelProps {
  config: RectifierConfig;
  onChange: (updated: RectifierConfig) => void;
  onReset: () => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  config,
  onChange,
  onReset,
}) => {
  const updateField = <K extends keyof RectifierConfig>(
    key: K,
    val: RectifierConfig[K]
  ) => {
    onChange({ ...config, [key]: val });
  };

  const handlePhaseChange = (phase: SupplyPhase) => {
    let nextTopo = config.topology;
    if (phase === 3 && (nextTopo === 'ct' || nextTopo === 'semiconverter')) {
      nextTopo = 'bridge';
    }
    onChange({
      ...config,
      supplyPhase: phase,
      topology: nextTopo,
    });
  };

  const applyPreset = (preset: PresetScenario) => {
    onChange(preset.config);
  };

  return (
    <div className="flex flex-col gap-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
            Circuit Parameters
          </h2>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition py-1 px-2 rounded-md hover:bg-slate-800"
          title="Reset to standard defaults"
        >
          <RefreshCw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Preset Scenarios Selector */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Preset Lab Scenarios
          </span>
        </div>
        <select
          onChange={(e) => {
            const found = PRESET_SCENARIOS.find((p) => p.id === e.target.value);
            if (found) applyPreset(found);
          }}
          defaultValue=""
          className="bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          <option value="" disabled>
            ⚡ Select a preset experiment...
          </option>
          {PRESET_SCENARIOS.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.category}] {p.title}
            </option>
          ))}
        </select>
      </div>

      {/* Supply Phase Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Supply Phase
        </label>
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => handlePhaseChange(1)}
            className={`py-1.5 px-3 rounded-md text-xs font-medium transition ${
              config.supplyPhase === 1
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1-Phase (Single)
          </button>
          <button
            onClick={() => handlePhaseChange(3)}
            className={`py-1.5 px-3 rounded-md text-xs font-medium transition ${
              config.supplyPhase === 3
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3-Phase (Three)
          </button>
        </div>
      </div>

      {/* Topology Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Rectifier Topology
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {config.supplyPhase === 1 ? (
            <>
              {[
                { id: 'half', label: 'Half-Wave (1-Pulse)' },
                { id: 'ct', label: 'Full-Wave Center-Tap (2-Pulse)' },
                { id: 'bridge', label: 'Full-Wave Bridge (2-Pulse)' },
                { id: 'semiconverter', label: 'Semiconverter (Half-Controlled)' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateField('topology', t.id as RectifierTopo)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium text-left transition border ${
                    config.topology === t.id
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </>
          ) : (
            <>
              {[
                { id: 'half', label: 'Half-Wave (3-Pulse / M3)' },
                { id: 'bridge', label: 'Full-Wave Bridge (6-Pulse / B6)' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateField('topology', t.id as RectifierTopo)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium text-left transition border ${
                    config.topology === t.id
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Device Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Device Technology
        </label>
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => updateField('deviceType', 'diode')}
            className={`py-1.5 px-3 rounded-md text-xs font-medium transition ${
              config.deviceType === 'diode'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Diode (Uncontrolled)
          </button>
          <button
            onClick={() => updateField('deviceType', 'thyristor')}
            className={`py-1.5 px-3 rounded-md text-xs font-medium transition ${
              config.deviceType === 'thyristor'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Thyristor (Controlled)
          </button>
        </div>
      </div>

      {/* Load Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Load Type
        </label>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['R', 'RL', 'RLE'] as LoadType[]).map((ld) => (
            <button
              key={ld}
              onClick={() => updateField('loadType', ld)}
              className={`py-1 px-2 rounded-md text-xs font-mono font-bold transition ${
                config.loadType === ld
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {ld}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Sliders */}
      <div className="flex flex-col gap-4 pt-2 border-t border-slate-800">
        {/* Firing Angle Slider (only for Thyristors) */}
        {config.deviceType === 'thyristor' && (
          <div className="flex flex-col gap-1 bg-blue-950/20 p-2.5 rounded-lg border border-blue-900/40">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-blue-300">
                Firing Delay Angle (α)
              </span>
              <strong className="font-mono text-blue-400 font-bold text-sm">
                {config.alpha}°
              </strong>
            </div>
            <input
              type="range"
              min="0"
              max="175"
              step="1"
              value={config.alpha}
              onChange={(e) => updateField('alpha', Number(e.target.value))}
              className="accent-blue-500 cursor-pointer h-1.5 mt-1"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0° (Diode mode)</span>
              <span>90° (Zero Vdc)</span>
              <span>175° (Inversion)</span>
            </div>
          </div>
        )}

        {/* Load Resistance R */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300">Resistance (R)</span>
            <strong className="font-mono text-amber-400">{config.R} Ω</strong>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={config.R}
            onChange={(e) => updateField('R', Number(e.target.value))}
            className="accent-amber-500 cursor-pointer h-1.5"
          />
        </div>

        {/* Load Inductance L (if RL or RLE) */}
        {config.loadType !== 'R' && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Inductance (L)</span>
              <strong className="font-mono text-cyan-400">{config.L} mH</strong>
            </div>
            <input
              type="range"
              min="1"
              max="500"
              step="1"
              value={config.L}
              onChange={(e) => updateField('L', Number(e.target.value))}
              className="accent-cyan-500 cursor-pointer h-1.5"
            />
          </div>
        )}

        {/* Back-EMF E (if RLE) */}
        {config.loadType === 'RLE' && (
          <div className="flex flex-col gap-1 bg-red-950/20 p-2.5 rounded-lg border border-red-900/40">
            <div className="flex justify-between items-center text-xs">
              <span className="text-red-300 font-semibold">DC Counter-EMF (E)</span>
              <strong className="font-mono text-red-400 text-sm">{config.E} V</strong>
            </div>
            <input
              type="range"
              min="-200"
              max="250"
              step="1"
              value={config.E}
              onChange={(e) => updateField('E', Number(e.target.value))}
              className="accent-red-500 cursor-pointer h-1.5 mt-1"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-200V (Inverter)</span>
              <span>0V</span>
              <span>+250V (Motor / Battery)</span>
            </div>
          </div>
        )}

        {/* Phase RMS Voltage V */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300">Phase Voltage RMS (Vrms)</span>
            <strong className="font-mono text-slate-200">{config.Vrms} V</strong>
          </div>
          <input
            type="range"
            min="50"
            max="415"
            step="5"
            value={config.Vrms}
            onChange={(e) => updateField('Vrms', Number(e.target.value))}
            className="accent-blue-500 cursor-pointer h-1.5"
          />
        </div>

        {/* Freewheeling Diode (FWD) Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <label htmlFor="fwd-check" className="text-xs font-medium text-slate-300 cursor-pointer">
            Freewheeling Diode (DF / FWD)
          </label>
          <input
            id="fwd-check"
            type="checkbox"
            checked={config.hasFWD}
            onChange={(e) => updateField('hasFWD', e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
