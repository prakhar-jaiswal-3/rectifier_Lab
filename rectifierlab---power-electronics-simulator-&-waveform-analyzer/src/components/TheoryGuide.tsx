/**
 * Educational Engineering & Theory Guide for Power Electronics Rectifiers
 * Detailed equations, physical principles, commutation dynamics, and design guidelines.
 */

import React, { useState } from 'react';
import { RectifierConfig } from '../engine/rectifierSolver';
import { BookOpen, ChevronDown, ChevronUp, Lightbulb, Zap, Info } from 'lucide-react';

interface TheoryGuideProps {
  config: RectifierConfig;
}

export const TheoryGuide: React.FC<TheoryGuideProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const { supplyPhase, topology, deviceType, loadType } = config;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-950/80 hover:bg-slate-950 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Power Electronics Theory & Operating Principles
            </h3>
            <p className="text-xs text-slate-400">
              In-depth mathematical equations, commutation physics, and design criteria for{' '}
              <strong className="text-indigo-300">
                {supplyPhase === 1 ? 'Single-Phase' : 'Three-Phase'}{' '}
                {topology === 'half'
                  ? 'Half-Wave'
                  : topology === 'ct'
                  ? 'Center-Tap'
                  : topology === 'semiconverter'
                  ? 'Semiconverter'
                  : 'Full Bridge'}{' '}
                ({deviceType})
              </strong>
            </p>
          </div>
        </div>
        <div className="text-slate-400 p-1">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-slate-800/80 flex flex-col gap-5 text-xs text-slate-300 leading-relaxed">
          {/* Section 1: Natural Commutation & Firing Angle Reference */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2 text-sm">
              <Zap className="w-4 h-4" />
              <span>1. Natural Commutation Reference & Firing Delay (α)</span>
            </div>
            <p className="mb-2">
              In phase-controlled rectifiers, the firing angle <strong className="text-indigo-300">α</strong> is
              measured strictly with respect to the <em>natural commutation instant</em> — the exact angle at
              which an uncontrolled diode would naturally become forward-biased and start conducting:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-slate-400 font-mono">
              <li>
                <strong className="text-slate-200">Single-Phase (1φ):</strong> Natural commutation is at{' '}
                <span className="text-blue-400">ωt = 0°</span> and{' '}
                <span className="text-blue-400">180°</span> (zero crossings of the supply sinusoid).
              </li>
              <li>
                <strong className="text-slate-200">3-Phase Half-Wave (3-pulse):</strong> Natural commutation
                occurs where phase sinusoids cross at{' '}
                <span className="text-blue-400">ωt = 30° (π/6)</span>,{' '}
                <span className="text-blue-400">150°</span>, and{' '}
                <span className="text-blue-400">270°</span>.
              </li>
              <li>
                <strong className="text-slate-200">3-Phase Bridge (6-pulse):</strong> Natural commutation
                occurs every 60° at{' '}
                <span className="text-blue-400">30°, 90°, 150°, 210°, 270°, 330°</span>.
              </li>
            </ul>
          </div>

          {/* Section 2: Physics of Inductive Energy & Freewheeling Diode (FWD) */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2 text-sm">
              <Lightbulb className="w-4 h-4" />
              <span>2. Inductive Freewheeling & Why Output Voltage Goes Negative</span>
            </div>
            <p className="mb-2">
              With an inductive load (<em>RL</em> or <em>RLE</em>), the inductor stores magnetic energy given by{' '}
              <code className="text-emerald-300 font-mono">W_L = (1/2) L i²</code>. When the supply AC voltage
              reverses polarity:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <strong className="text-amber-400 block mb-1">Without Freewheeling Diode (FWD):</strong>
                The collapsing magnetic field induces an opposing self-induced EMF{' '}
                <code className="text-amber-300">v_L = L (di/dt) &lt; 0</code> that forces the thyristors to
                remain forward-biased and conducting into the negative half-cycle. As a result, the output
                voltage <code className="text-amber-300">v_o(t)</code> goes negative, reducing the net average DC
                voltage.
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <strong className="text-emerald-400 block mb-1">With Freewheeling Diode (FWD):</strong>
                As soon as <code className="text-emerald-300">v_o(t)</code> attempts to drop below 0V, the
                freewheeling diode connected across the load becomes forward-biased and turns ON. This clamps the
                terminal voltage to 0V, reverse-biases the main converter thyristors (commutating them off), and
                dissipates the stored inductive energy internally through the load loop.
              </div>
            </div>
          </div>

          {/* Section 3: CCM vs DCM Boundaries */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-blue-400 font-semibold mb-2 text-sm">
              <Info className="w-4 h-4" />
              <span>3. Continuous (CCM) vs Discontinuous Conduction Mode (DCM)</span>
            </div>
            <p className="mb-2">
              The conduction mode is determined by the load time constant{' '}
              <code className="text-blue-300 font-mono">τ = L / R</code>, the firing angle{' '}
              <code className="text-blue-300 font-mono">α</code>, and any counter-EMF{' '}
              <code className="text-blue-300 font-mono">E</code>:
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 text-slate-300">
              <li>
                <strong className="text-slate-100">Discontinuous Conduction (DCM):</strong> The load current
                decays to zero before the next firing pulse arrives at the extinction angle{' '}
                <code className="text-amber-300 font-mono">β</code>. During the interval between extinction and
                the next firing (<code className="text-amber-300 font-mono">β &lt; ωt &lt; α + period</code>), no
                device conducts, load current is 0, and the load voltage settles at the counter-EMF{' '}
                <code className="text-amber-300 font-mono">v_o = E</code> (or 0V if E=0).
              </li>
              <li>
                <strong className="text-slate-100">Continuous Conduction (CCM):</strong> The load inductance is
                sufficiently high (<code className="text-emerald-300 font-mono">ωL &gt;&gt; R</code>) such that the
                current never drops to zero. Current transfers instantaneously from one device pair to the next
                upon firing.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
