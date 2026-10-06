/**
 * Circuit model definitions, topology metadata, preset scenarios, and engineering notes
 */

import { RectifierConfig } from './rectifierSolver';

export interface TopologyMeta {
  id: string;
  name: string;
  pulses: number;
  devicesCount: number;
  description: string;
  theoryNotes: string[];
  keyEquations: { label: string; formula: string }[];
}

export const TOPOLOGIES_1PH: TopologyMeta[] = [
  {
    id: 'half',
    name: '1-Phase Half-Wave (1-Pulse)',
    pulses: 1,
    devicesCount: 1,
    description: 'Simplest rectifier topology utilizing 1 diode or thyristor. Carries DC current in transformer secondary, producing high ripple.',
    theoryNotes: [
      'Discontinuous conduction easily occurs with R or small RL loads.',
      'With an inductive load (RL) without FWD, output voltage goes negative during [π, β] until inductor energy exhausts.',
      'Freewheeling diode (FWD) clamps negative voltage to 0V and extends conduction.',
      'Peak Inverse Voltage (PIV) across device is Vm = √2 * Vrms.',
    ],
    keyEquations: [
      { label: 'Avg V_dc (Diode, R load)', formula: 'V_m / π ≈ 0.318 V_m' },
      { label: 'Avg V_dc (Thyristor, R load)', formula: '(V_m / 2π) · (1 + cos α)' },
      { label: 'Avg V_dc (Thyristor, RL + FWD)', formula: '(V_m / 2π) · (1 + cos α)' },
      { label: 'Peak Inverse Voltage (PIV)', formula: 'V_m = √2 · V_rms' },
      { label: 'Ripple Frequency', formula: 'f_ripple = f_s = 50 Hz' },
    ],
  },
  {
    id: 'ct',
    name: '1-Phase Full-Wave Center-Tap (2-Pulse)',
    pulses: 2,
    devicesCount: 2,
    description: 'Uses center-tapped transformer secondary with two rectifying devices. Common cathode delivers positive rectified DC.',
    theoryNotes: [
      'Each half of secondary conducts alternately for 180° (or delayed by α).',
      'Requires only 2 devices (lower forward diode conduction loss than bridge).',
      'Each device must block twice the peak phase voltage: PIV = 2 * Vm.',
      'Source secondary windings carry unidirectional pulsed currents.',
    ],
    keyEquations: [
      { label: 'Avg V_dc (Diode)', formula: '2 V_m / π ≈ 0.637 V_m ≈ 0.90 V_rms' },
      { label: 'Avg V_dc (Thyristor, CCM)', formula: '(2 V_m / π) · cos α' },
      { label: 'Peak Inverse Voltage (PIV)', formula: '2 V_m = 2√2 · V_rms' },
      { label: 'Ripple Frequency', formula: 'f_ripple = 2 f_s = 100 Hz' },
    ],
  },
  {
    id: 'bridge',
    name: '1-Phase Full-Wave Bridge (2-Pulse)',
    pulses: 2,
    devicesCount: 4,
    description: 'Classic 4-device full bridge (Graetz bridge). Does not require a center-tapped transformer, with PIV = Vm.',
    theoryNotes: [
      'In fully-controlled mode, diagonal pairs (T1,T2 and T3,T4) fire together.',
      'Without FWD, allows two-quadrant operation: rectification (α < 90°) and inversion (α > 90°, with negative back-EMF E).',
      'With FWD, negative output excursions are clamped, improving power factor and eliminating negative voltage spikes.',
      'Transformer primary current is symmetrical AC with no DC bias component.',
    ],
    keyEquations: [
      { label: 'Avg V_dc (Diode)', formula: '2 V_m / π ≈ 0.637 V_m' },
      { label: 'Avg V_dc (Fully Controlled, CCM)', formula: '(2 V_m / π) · cos α' },
      { label: 'Avg V_dc (With FWD)', formula: '(V_m / π) · (1 + cos α)' },
      { label: 'Peak Inverse Voltage (PIV)', formula: 'V_m = √2 · V_rms' },
      { label: 'Input Current RMS (CCM)', formula: 'I_s,rms = I_dc' },
    ],
  },
  {
    id: 'semiconverter',
    name: '1-Phase Half-Controlled (Semiconverter)',
    pulses: 2,
    devicesCount: 4,
    description: 'Hybrid bridge containing 2 thyristors and 2 diodes. Provides inherent freewheeling action without needing a separate FWD.',
    theoryNotes: [
      'When supply voltage reverses, diodes conduct automatically with the active thyristor, clamping output to 0V.',
      'Cannot operate in inverter mode; strictly 1-quadrant rectifier.',
      'Superior input power factor compared to fully-controlled bridge without FWD.',
      'Lower cost because only 2 gate drive circuits are needed.',
    ],
    keyEquations: [
      { label: 'Avg V_dc', formula: '(V_m / π) · (1 + cos α)' },
      { label: 'Output Voltage Limit', formula: 'v_o(t) ≥ 0 V always' },
      { label: 'Displacement Factor (DPF)', formula: 'cos(α / 2)' },
      { label: 'Peak Inverse Voltage (PIV)', formula: 'V_m' },
    ],
  },
];

export const TOPOLOGIES_3PH: TopologyMeta[] = [
  {
    id: 'half',
    name: '3-Phase Half-Wave (3-Pulse / M3)',
    pulses: 3,
    devicesCount: 3,
    description: 'Star-connected 3-phase supply with neutral return. Three devices conduct in 120° segments.',
    theoryNotes: [
      'Natural commutation points occur at intersections of phase voltages: 30°, 150°, 270°.',
      'Firing angle α is measured from these natural commutation instants (30° reference).',
      'For α ≤ 30°, output voltage never touches zero even with pure R load.',
      'Causes DC magnetization in transformer secondary windings because currents are unidirectional pulses.',
    ],
    keyEquations: [
      { label: 'Avg V_dc (Diode)', formula: '(3√3 / 2π) · V_m ≈ 0.827 V_m ≈ 1.17 V_ph,rms' },
      { label: 'Avg V_dc (Thyristor, CCM)', formula: '(3√3 / 2π) · V_m · cos α' },
      { label: 'Peak Inverse Voltage (PIV)', formula: '√3 · V_m = Line Peak' },
      { label: 'Ripple Frequency', formula: 'f_ripple = 3 f_s = 150 Hz' },
    ],
  },
  {
    id: 'bridge',
    name: '3-Phase Full Bridge (6-Pulse / B6)',
    pulses: 6,
    devicesCount: 6,
    description: 'Standard industrial 6-pulse converter. Two devices conduct at any instant: one from top group (T1, T3, T5) and one from bottom group (T4, T6, T2).',
    theoryNotes: [
      'Firing sequence in 60° intervals: T1 → T2 → T3 → T4 → T5 → T6.',
      'Conduction path transfers between line-to-line pairs: v_ab, v_ac, v_bc, v_ba, v_ca, v_cb.',
      'Phase current is symmetrical quasi-square wave with 120° conduction and 60° zero intervals.',
      'Theoretical input current THD is 31.08% for ideal ripple-free DC load current.',
      'Average DC voltage is 2.34 times phase RMS voltage for diode bridge.',
    ],
    keyEquations: [
      { label: 'Avg V_dc (Diode)', formula: '(3 / π) · V_mL = (3√3 / π) · V_m ≈ 2.34 V_ph,rms' },
      { label: 'Avg V_dc (Thyristor, CCM)', formula: '(3√3 / π) · V_m · cos α' },
      { label: 'Avg V_dc (With FWD, α > 60°)', formula: '(3√3 V_m / π) · [1 + cos(α + 60°)]' },
      { label: 'Peak Inverse Voltage (PIV)', formula: 'V_mL = √3 · V_m' },
      { label: 'Ripple Frequency', formula: 'f_ripple = 6 f_s = 300 Hz' },
      { label: 'Fundamental Current RMS', formula: 'I_s1,rms = (√6 / π) · I_dc ≈ 0.78 I_dc' },
    ],
  },
];

export interface PresetScenario {
  id: string;
  title: string;
  category: 'Fundamental' | 'Controlled' | 'Inductive & DCM' | 'Advanced';
  description: string;
  config: RectifierConfig;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: '1ph-diode-bridge-r',
    title: '1-Phase Diode Bridge (R Load)',
    category: 'Fundamental',
    description: 'Classic uncontrolled full-wave rectification. Pure resistive load produces pulsating DC half-sinusoids with 100 Hz ripple.',
    config: {
      supplyPhase: 1,
      topology: 'bridge',
      deviceType: 'diode',
      loadType: 'R',
      alpha: 0,
      R: 15,
      L: 0,
      E: 0,
      Vrms: 230,
      frequency: 50,
      hasFWD: false,
    },
  },
  {
    id: '1ph-thyristor-rl-ccm',
    title: '1-Phase Controlled Bridge (RL Continuous CCM)',
    category: 'Controlled',
    description: 'Highly inductive load maintains continuous current. Negative voltage spikes appear on v_o during [π, π+α] as L discharges.',
    config: {
      supplyPhase: 1,
      topology: 'bridge',
      deviceType: 'thyristor',
      loadType: 'RL',
      alpha: 45,
      R: 10,
      L: 120,
      E: 0,
      Vrms: 230,
      frequency: 50,
      hasFWD: false,
    },
  },
  {
    id: '1ph-fwd-clamping',
    title: 'Freewheeling Diode (FWD) Clamping Action',
    category: 'Inductive & DCM',
    description: 'Compare with the previous case: FWD clamps load voltage at 0V, eliminating negative output spikes and increasing average Vdc.',
    config: {
      supplyPhase: 1,
      topology: 'bridge',
      deviceType: 'thyristor',
      loadType: 'RL',
      alpha: 45,
      R: 10,
      L: 120,
      E: 0,
      Vrms: 230,
      frequency: 50,
      hasFWD: true,
    },
  },
  {
    id: '1ph-semiconverter',
    title: '1-Phase Semiconverter (Half-Controlled)',
    category: 'Controlled',
    description: 'Inherent freewheeling via diode leg; output voltage never goes negative, yielding higher power factor.',
    config: {
      supplyPhase: 1,
      topology: 'semiconverter',
      deviceType: 'thyristor',
      loadType: 'RL',
      alpha: 60,
      R: 10,
      L: 80,
      E: 0,
      Vrms: 230,
      frequency: 50,
      hasFWD: false,
    },
  },
  {
    id: '1ph-rle-dcm',
    title: 'Battery Charger / Motor Load (RLE in DCM)',
    category: 'Inductive & DCM',
    description: 'Discontinuous conduction mode with DC back-EMF E = 120V. Load voltage clamps to E when current extinguishes at β.',
    config: {
      supplyPhase: 1,
      topology: 'bridge',
      deviceType: 'thyristor',
      loadType: 'RLE',
      alpha: 50,
      R: 8,
      L: 20,
      E: 120,
      Vrms: 230,
      frequency: 50,
      hasFWD: false,
    },
  },
  {
    id: '3ph-diode-bridge-6pulse',
    title: '3-Phase 6-Pulse Diode Bridge (B6)',
    category: 'Fundamental',
    description: 'Industrial 3-phase rectifier producing low ripple (300 Hz) and high average DC voltage (538V for 230V phase).',
    config: {
      supplyPhase: 3,
      topology: 'bridge',
      deviceType: 'diode',
      loadType: 'RL',
      alpha: 0,
      R: 20,
      L: 50,
      E: 0,
      Vrms: 230,
      frequency: 50,
      hasFWD: false,
    },
  },
  {
    id: '3ph-thyristor-converter',
    title: '3-Phase 6-Pulse Thyristor Converter (α = 60°)',
    category: 'Advanced',
    description: 'Controlled industrial drive rectifier with α = 60°. At 60°, output voltage touches zero; quasi-square source current.',
    config: {
      supplyPhase: 3,
      topology: 'bridge',
      deviceType: 'thyristor',
      loadType: 'RL',
      alpha: 60,
      R: 15,
      L: 100,
      E: 0,
      Vrms: 230,
      frequency: 50,
      hasFWD: false,
    },
  },
  {
    id: 'inverter-mode-regenerative',
    title: 'Line-Commutated Inverter Mode (α = 120°, E < 0)',
    category: 'Advanced',
    description: 'When α > 90° and negative back-EMF is connected, power flows from DC back into AC grid (regenerative braking).',
    config: {
      supplyPhase: 1,
      topology: 'bridge',
      deviceType: 'thyristor',
      loadType: 'RLE',
      alpha: 120,
      R: 5,
      L: 150,
      E: -180,
      Vrms: 230,
      frequency: 50,
      hasFWD: false,
    },
  },
];
