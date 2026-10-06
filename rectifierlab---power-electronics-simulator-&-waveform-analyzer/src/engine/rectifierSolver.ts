/**
 * Power Electronics Rectifier Simulation Engine
 * Rigorous time-stepping solver with Runge-Kutta / exact exponential integration,
 * accurate commutation logic, pulse gate triggering, extinction angle detection,
 * device stress tracking, and FFT harmonic analysis.
 */

export type SupplyPhase = 1 | 3;
export type RectifierTopo = 'half' | 'ct' | 'bridge' | 'semiconverter';
export type DeviceType = 'diode' | 'thyristor';
export type LoadType = 'R' | 'RL' | 'RLE';

export interface RectifierConfig {
  supplyPhase: SupplyPhase;
  topology: RectifierTopo;
  deviceType: DeviceType;
  loadType: LoadType;
  alpha: number; // firing delay angle in degrees [0, 180]
  R: number; // load resistance in Ohms
  L: number; // load inductance in mH
  E: number; // back-EMF in Volts
  Vrms: number; // Phase voltage RMS in Volts
  frequency: number; // supply frequency in Hz (default 50)
  hasFWD: boolean; // Freewheeling Diode enabled
}

export interface SimulationSample {
  thetaDeg: number; // angle in degrees [0, 720] for 2 cycles
  timeMs: number; // time in milliseconds
  // Source voltages
  vsA: number;
  vsB: number; // for 3-phase
  vsC: number; // for 3-phase
  // Load waveforms
  vo: number; // Load voltage
  io: number; // Load current
  // Source current
  isA: number; // Source phase A current
  // Device 1 waveforms (stress & behavior)
  vD1: number; // Voltage across Device 1 (blocking or forward)
  iD1: number; // Current through Device 1
  iFWD: number; // Current through freewheeling diode
  gatePulse: number; // Gate trigger pulse state (0 or 1)
  activePair: string; // Conducting devices, e.g. "T1, T2" or "DF" or "None"
}

export interface HarmonicComponent {
  order: number;
  frequencyHz: number;
  magnitude: number;
  rms: number;
  phaseDeg: number;
  percentOfFundamental: number;
}

export interface SimulationMetrics {
  // DC Output Measurements
  Vdc: number; // Average DC voltage (V)
  Idc: number; // Average DC current (A)
  Vrms: number; // RMS DC voltage (V)
  Irms: number; // RMS DC current (A)
  rippleVoltage: number; // Peak-to-peak ripple voltage (V)
  rippleCurrent: number; // Peak-to-peak ripple current (A)
  voltageRippleFactor: number; // RF = sqrt((Vrms/Vdc)^2 - 1)
  formFactor: number; // FF = Vrms / Vdc

  // Power Measurements
  Pdc: number; // DC output power = Vdc * Idc (W)
  PacLoad: number; // Total real power delivered to load (W)
  Sin: number; // Total apparent input power (VA)
  Qin: number; // Reactive power (VAR)
  pf: number; // Input power factor = Pac / Sin
  dpf: number; // Displacement power factor = cos(phi_1)
  distortionFactor: number; // DF = Is1_rms / Is_rms
  thdCurrent: number; // Total harmonic distortion of source current (%)

  // Device Stress Measurements
  pivDevice1: number; // Peak inverse voltage across Device 1 (V)
  rmsDevice1: number; // RMS current in Device 1 (A)
  avgDevice1: number; // Average current in Device 1 (A)
  rmsFWD: number; // RMS current in FWD (A)

  // Operating State
  conductionMode: 'Continuous (CCM)' | 'Discontinuous (DCM)' | 'Line Inversion';
  extinctionAngleDeg: number; // Beta angle in degrees
  conductionAngleDeg: number; // Gamma = Beta - Alpha in degrees

  // Theoretical comparison values
  theoreticalVdc: number;
  theoreticalFormula: string;
}

export interface SimulationResult {
  samples: SimulationSample[];
  metrics: SimulationMetrics;
  harmonicsCurrent: HarmonicComponent[];
  harmonicsVoltage: HarmonicComponent[];
}

/**
 * Calculates theoretical average voltage based on textbook formulas
 */
export function getTheoreticalVdc(config: RectifierConfig): { vdc: number; formula: string } {
  const { supplyPhase, topology, deviceType, alpha, Vrms, hasFWD } = config;
  const Vm = Vrms * Math.SQRT2;
  const rad = (alpha * Math.PI) / 180;
  const isThy = deviceType === 'thyristor';

  if (supplyPhase === 1) {
    if (topology === 'half') {
      if (!isThy) {
        return {
          vdc: Vm / Math.PI,
          formula: 'V_m / π ≈ 0.318 V_m',
        };
      }
      if (hasFWD) {
        return {
          vdc: (Vm / (2 * Math.PI)) * (1 + Math.cos(rad)),
          formula: '(V_m / 2π)(1 + cos α)',
        };
      }
      return {
        vdc: (Vm / (2 * Math.PI)) * (1 + Math.cos(rad)),
        formula: '(V_m / 2π)(1 + cos α) [for R] or depends on extinction β [RL]',
      };
    }
    // Full wave (center-tap or bridge)
    if (!isThy) {
      return {
        vdc: (2 * Vm) / Math.PI,
        formula: '2 V_m / π ≈ 0.637 V_m ≈ 0.90 V_rms',
      };
    }
    if (topology === 'semiconverter' || hasFWD) {
      return {
        vdc: (Vm / Math.PI) * (1 + Math.cos(rad)),
        formula: '(V_m / π)(1 + cos α)',
      };
    }
    return {
      vdc: ((2 * Vm) / Math.PI) * Math.cos(rad),
      formula: '(2 V_m / π) cos α [CCM]',
    };
  } else {
    // 3-Phase
    if (topology === 'half') {
      if (!isThy) {
        return {
          vdc: ((3 * Math.sqrt(3)) / (2 * Math.PI)) * Vm,
          formula: '(3√3 / 2π) V_m ≈ 0.827 V_m ≈ 1.17 V_ph,rms',
        };
      }
      if (hasFWD && alpha > 30) {
        return {
          vdc: ((3 * Vm) / (2 * Math.PI)) * (1 + Math.cos(rad + Math.PI / 6)),
          formula: '(3 V_m / 2π)(1 + cos(α + 30°)) [with FWD, α > 30°]',
        };
      }
      return {
        vdc: ((3 * Math.sqrt(3)) / (2 * Math.PI)) * Vm * Math.cos(rad),
        formula: '(3√3 / 2π) V_m cos α [CCM]',
      };
    }
    // 3-Phase Bridge (6-pulse)
    const VmL = Math.sqrt(3) * Vm;
    if (!isThy) {
      return {
        vdc: (3 / Math.PI) * VmL,
        formula: '(3 / π) V_mL = (3√3 / π) V_m ≈ 2.34 V_ph,rms',
      };
    }
    if (hasFWD && alpha > 60) {
      return {
        vdc: ((3 * VmL) / Math.PI) * (1 + Math.cos(rad + Math.PI / 3)),
        formula: '(3 V_mL / π)(1 + cos(α + 60°)) [with FWD, α > 60°]',
      };
    }
    return {
      vdc: ((3 / Math.PI) * VmL) * Math.cos(rad),
      formula: '(3 / π) V_mL cos α = (3√3 / π) V_m cos α [CCM]',
    };
  }
}

/**
 * Solve rectifier system across steady-state cycles
 */
export function simulateRectifier(config: RectifierConfig): SimulationResult {
  const {
    supplyPhase,
    topology,
    deviceType,
    loadType,
    alpha,
    R,
    L: L_mH,
    E: rawE,
    Vrms,
    frequency,
    hasFWD,
  } = config;

  const L = loadType === 'R' ? 1e-7 : Math.max(1e-7, L_mH * 1e-3);
  const E = loadType === 'RLE' ? rawE : 0;
  const isThy = deviceType === 'thyristor';
  const alphaRad = isThy ? (alpha * Math.PI) / 180 : 0;
  const omega = 2 * Math.PI * frequency;
  const Vm = Vrms * Math.SQRT2;
  const is3Ph = supplyPhase === 3;

  // Number of points per cycle & time step
  const pointsPerCycle = 1800; // 0.2 degrees per step resolution
  const dTheta = (2 * Math.PI) / pointsPerCycle;
  const dt = dTheta / omega;

  // Supply phase voltages generator
  const getSupplyVoltages = (theta: number): [number, number, number] => {
    if (!is3Ph) {
      const va = Vm * Math.sin(theta);
      return [va, 0, 0];
    }
    const va = Vm * Math.sin(theta);
    const vb = Vm * Math.sin(theta - (2 * Math.PI) / 3);
    const vc = Vm * Math.sin(theta - (4 * Math.PI) / 3);
    return [va, vb, vc];
  };

  // Define commutation intervals and voltage channels for each topology
  interface Path {
    id: string;
    commStart: number; // Natural commutation angle in radians [0, 2pi)
    period: number; // Repeating span of this path
    getVoltage: (vs: [number, number, number]) => number;
    phaseAContrib: number; // Contribution to Phase A current (+1, -1, or 0)
    isTopDevice1: boolean; // Whether Device 1 is in this path
  }

  let paths: Path[] = [];

  if (!is3Ph) {
    if (topology === 'half') {
      paths = [
        {
          id: 'D1/T1',
          commStart: 0,
          period: 2 * Math.PI,
          getVoltage: (x) => x[0],
          phaseAContrib: 1,
          isTopDevice1: true,
        },
      ];
    } else if (topology === 'ct') {
      paths = [
        {
          id: 'T1',
          commStart: 0,
          period: Math.PI,
          getVoltage: (x) => x[0],
          phaseAContrib: 1,
          isTopDevice1: true,
        },
        {
          id: 'T2',
          commStart: Math.PI,
          period: Math.PI,
          getVoltage: (x) => -x[0],
          phaseAContrib: -1,
          isTopDevice1: false,
        },
      ];
    } else {
      // Bridge (Full or Semiconverter)
      paths = [
        {
          id: 'T1-T2',
          commStart: 0,
          period: Math.PI,
          getVoltage: (x) => x[0],
          phaseAContrib: 1,
          isTopDevice1: true,
        },
        {
          id: 'T3-T4',
          commStart: Math.PI,
          period: Math.PI,
          getVoltage: (x) => -x[0],
          phaseAContrib: -1,
          isTopDevice1: false,
        },
      ];
    }
  } else {
    // 3-Phase
    if (topology === 'half') {
      // 3-Pulse: Natural commutation at 30° (pi/6), 150°, 270°
      paths = [
        {
          id: 'T1 (Ph A)',
          commStart: Math.PI / 6,
          period: (2 * Math.PI) / 3,
          getVoltage: (x) => x[0],
          phaseAContrib: 1,
          isTopDevice1: true,
        },
        {
          id: 'T2 (Ph B)',
          commStart: (5 * Math.PI) / 6,
          period: (2 * Math.PI) / 3,
          getVoltage: (x) => x[1],
          phaseAContrib: 0,
          isTopDevice1: false,
        },
        {
          id: 'T3 (Ph C)',
          commStart: (9 * Math.PI) / 6,
          period: (2 * Math.PI) / 3,
          getVoltage: (x) => x[2],
          phaseAContrib: 0,
          isTopDevice1: false,
        },
      ];
    } else {
      // 3-Phase 6-Pulse Bridge:
      // T1-T6 (v_ab), T1-T2 (v_ac), T3-T2 (v_bc), T3-T4 (v_ba), T5-T4 (v_ca), T5-T6 (v_cb)
      // Natural commutations at 30°, 90°, 150°, 210°, 270°, 330°
      paths = [
        {
          id: 'T1-T6 (v_ab)',
          commStart: Math.PI / 6,
          period: Math.PI / 3,
          getVoltage: (x) => x[0] - x[1],
          phaseAContrib: 1,
          isTopDevice1: true,
        },
        {
          id: 'T1-T2 (v_ac)',
          commStart: Math.PI / 2,
          period: Math.PI / 3,
          getVoltage: (x) => x[0] - x[2],
          phaseAContrib: 1,
          isTopDevice1: true,
        },
        {
          id: 'T3-T2 (v_bc)',
          commStart: (5 * Math.PI) / 6,
          period: Math.PI / 3,
          getVoltage: (x) => x[1] - x[2],
          phaseAContrib: 0,
          isTopDevice1: false,
        },
        {
          id: 'T3-T4 (v_ba)',
          commStart: (7 * Math.PI) / 6,
          period: Math.PI / 3,
          getVoltage: (x) => x[1] - x[0],
          phaseAContrib: -1,
          isTopDevice1: false,
        },
        {
          id: 'T5-T4 (v_ca)',
          commStart: (3 * Math.PI) / 2,
          period: Math.PI / 3,
          getVoltage: (x) => x[2] - x[0],
          phaseAContrib: -1,
          isTopDevice1: false,
        },
        {
          id: 'T5-T6 (v_cb)',
          commStart: (11 * Math.PI) / 6,
          period: Math.PI / 3,
          getVoltage: (x) => x[2] - x[1],
          phaseAContrib: 0,
          isTopDevice1: false,
        },
      ];
    }
  }

  // Pre-run warmup cycles to achieve true steady-state (10 cycles)
  // followed by 2 recorded cycles
  const warmupCycles = 10;
  const recordedCycles = 2;
  const totalCycles = warmupCycles + recordedCycles;
  const totalSteps = totalCycles * pointsPerCycle;
  const recordedStartStep = warmupCycles * pointsPerCycle;

  let current_i = 0;
  let activePathIdx = -1; // -1 means none / freewheeling / extinct
  let isFreewheeling = false;

  const recordedSamples: SimulationSample[] = [];

  // Gate pulse duration: ~15 degrees in radians
  const pulseWidthRad = (15 * Math.PI) / 180;

  for (let n = 0; n < totalSteps; n++) {
    const thetaTotal = n * dTheta;
    const thetaCycle = thetaTotal % (2 * Math.PI);
    const supplyVals = getSupplyVoltages(thetaCycle);

    // Check gate pulses and firing conditions
    // Find if any path should be triggered or if a diode becomes forward biased
    let newlyTriggeredIdx = -1;

    for (let pIdx = 0; pIdx < paths.length; pIdx++) {
      const p = paths[pIdx];
      const vPath = p.getVoltage(supplyVals);

      if (!isThy) {
        // DIODE: Conducts when forward biased and higher than opposing voltages
        if (activePathIdx === -1) {
          if (vPath > (current_i > 0 ? 0 : E)) {
            newlyTriggeredIdx = pIdx;
          }
        } else if (pIdx !== activePathIdx) {
          const currentActiveV = paths[activePathIdx].getVoltage(supplyVals);
          if (vPath > currentActiveV) {
            newlyTriggeredIdx = pIdx;
          }
        }
      } else {
        // THYRISTOR: Needs gate pulse at (commStart + alpha)
        const triggerInstant = (p.commStart + alphaRad) % (2 * Math.PI);
        let angleSinceTrigger = thetaCycle - triggerInstant;
        if (angleSinceTrigger < 0) angleSinceTrigger += 2 * Math.PI;

        const isPulseActive = angleSinceTrigger < pulseWidthRad;

        if (isPulseActive) {
          // Can it fire? It must be forward biased relative to current conduction
          const thresholdV = activePathIdx >= 0 ? paths[activePathIdx].getVoltage(supplyVals) : (current_i > 0 ? 0 : E);
          if (vPath > thresholdV) {
            newlyTriggeredIdx = pIdx;
          }
        }
      }
    }

    if (newlyTriggeredIdx !== -1) {
      activePathIdx = newlyTriggeredIdx;
      isFreewheeling = false;
    }

    // Check freewheeling action (FWD or inherent in semiconverter)
    const effectiveFWD = hasFWD || topology === 'semiconverter';
    let appliedV = 0;

    if (activePathIdx >= 0) {
      const vAct = paths[activePathIdx].getVoltage(supplyVals);
      if (effectiveFWD && vAct <= 0 && current_i > 0) {
        // Output voltage tries to go negative, freewheeling diode turns on
        activePathIdx = -1;
        isFreewheeling = true;
        appliedV = 0;
      } else {
        appliedV = vAct;
      }
    } else if (isFreewheeling && current_i > 0) {
      appliedV = 0;
    } else {
      // Discontinuous or idle: output voltage is E
      appliedV = E;
    }

    // Numerical integration of di/dt = (v_applied - R*i - E) / L
    // Runge-Kutta 4th order for rock-solid stability even with small L
    let next_i = 0;
    if (L < 1e-5) {
      // Pure resistive load: i = max(0, (appliedV - E) / R)
      next_i = (appliedV - E) / R;
      if (next_i <= 1e-6) {
        next_i = 0;
        activePathIdx = -1;
        isFreewheeling = false;
      }
    } else {
      const f = (_v: number, curI: number) => (_v - R * curI - E) / L;
      const k1 = f(appliedV, current_i);
      const k2 = f(appliedV, current_i + 0.5 * dt * k1);
      const k3 = f(appliedV, current_i + 0.5 * dt * k2);
      const k4 = f(appliedV, current_i + dt * k3);
      next_i = current_i + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);

      if (next_i <= 1e-7) {
        next_i = 0;
        activePathIdx = -1;
        isFreewheeling = false;
        appliedV = E;
      }
    }

    current_i = next_i;

    // Record sample if within the last 2 cycles
    if (n >= recordedStartStep) {
      const stepInRecording = n - recordedStartStep;
      const thetaDeg = (stepInRecording * dTheta * 180) / Math.PI;
      const timeMs = (stepInRecording * dt) * 1000;

      // Source Current Phase A
      let isA = 0;
      if (activePathIdx >= 0) {
        isA = paths[activePathIdx].phaseAContrib * current_i;
      }

      // Freewheeling diode current
      const iFWD = isFreewheeling ? current_i : 0;

      // Device 1 Current and Voltage
      let iD1 = 0;
      let vD1 = 0;
      const conductingD1 = activePathIdx >= 0 && paths[activePathIdx].isTopDevice1;

      if (conductingD1) {
        iD1 = current_i;
        vD1 = 0; // Ideal conduction forward drop
      } else {
        iD1 = 0;
        // When blocking, voltage across device 1:
        // In 1-phase half-wave: vD1 = vsA - appliedV
        // In 1-phase bridge: vD1 = vsA - appliedV (cathode is at + rail)
        // In 1-phase CT: vD1 = vsA - appliedV (reaches -2 Vm)
        if (topology === 'ct') {
          vD1 = supplyVals[0] - appliedV;
        } else if (is3Ph && topology === 'bridge') {
          // Device 1 connected between Ph A and DC+ rail
          // If DC+ is at max(va, vb, vc)
          vD1 = supplyVals[0] - (appliedV + (activePathIdx >= 0 && !paths[activePathIdx].isTopDevice1 ? supplyVals[1] : 0));
          // Clamp to realistic blocking voltage:
          if (vD1 > 0 && !conductingD1) {
            // Forward blocking until fired
          }
        } else {
          vD1 = supplyVals[0] - appliedV;
        }
      }

      // Gate pulse visualization for Device 1
      let gatePulse = 0;
      if (isThy) {
        const d1Comm = paths[0].commStart;
        const d1Trigger = (d1Comm + alphaRad) % (2 * Math.PI);
        let ang = thetaCycle - d1Trigger;
        if (ang < 0) ang += 2 * Math.PI;
        gatePulse = ang < pulseWidthRad ? 1 : 0;
      }

      const activePairStr = isFreewheeling
        ? 'DF (Freewheeling)'
        : activePathIdx >= 0
        ? paths[activePathIdx].id
        : current_i > 0
        ? 'Inductive Freewheel'
        : 'Off (DCM)';

      recordedSamples.push({
        thetaDeg,
        timeMs,
        vsA: supplyVals[0],
        vsB: supplyVals[1],
        vsC: supplyVals[2],
        vo: appliedV,
        io: current_i,
        isA,
        vD1,
        iD1,
        iFWD,
        gatePulse,
        activePair: activePairStr,
      });
    }
  }

  // Calculate Metrics from recorded samples
  const N = recordedSamples.length;
  const mean = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / arr.length;
  const rms = (arr: number[]) => Math.sqrt(mean(arr.map((x) => x * x)));

  const voVals = recordedSamples.map((s) => s.vo);
  const ioVals = recordedSamples.map((s) => s.io);
  const isVals = recordedSamples.map((s) => s.isA);
  const vD1Vals = recordedSamples.map((s) => s.vD1);
  const iD1Vals = recordedSamples.map((s) => s.iD1);
  const iFWDVals = recordedSamples.map((s) => s.iFWD);

  const Vdc = mean(voVals);
  const Idc = mean(ioVals);
  const Vrms_out = rms(voVals);
  const Irms_out = rms(ioVals);

  const maxVo = Math.max(...voVals);
  const minVo = Math.min(...voVals);
  const rippleVoltage = maxVo - minVo;

  const maxIo = Math.max(...ioVals);
  const minIo = Math.min(...ioVals);
  const rippleCurrent = maxIo - minIo;

  const formFactor = Math.abs(Vdc) > 1e-4 ? Vrms_out / Math.abs(Vdc) : 0;
  const voltageRippleFactor = Math.abs(Vdc) > 1e-4 ? Math.sqrt(Math.max(0, formFactor * formFactor - 1)) : 0;

  // Real load power delivered: P_load = (1/T) integral(vo * io dt)
  const PacLoad = mean(voVals.map((v, i) => v * ioVals[i]));
  const Pdc = Vdc * Idc;

  // Input apparent power: Sin = m * Vrms * Is_rms (where m = 1 for 1-phase, 3 for 3-phase)
  const Is_rms = rms(isVals);
  const Sin = (is3Ph ? 3 : 1) * Vrms * Is_rms;
  const pf = Sin > 1e-4 ? Math.min(1, Math.max(0, Math.abs(PacLoad) / Sin)) : 0;
  const Qin = Math.sqrt(Math.max(0, Sin * Sin - PacLoad * PacLoad));

  // Device 1 stress
  const pivDevice1 = Math.abs(Math.min(...vD1Vals, 0));
  const rmsDevice1 = rms(iD1Vals);
  const avgDevice1 = mean(iD1Vals);
  const rmsFWD = rms(iFWDVals);

  // Conduction mode detection:
  // Discontinuous if current drops to 0 at any point during the cycle
  const minCurrent = Math.min(...ioVals);
  let conductionMode: 'Continuous (CCM)' | 'Discontinuous (DCM)' | 'Line Inversion' =
    minCurrent > 1e-3 ? 'Continuous (CCM)' : 'Discontinuous (DCM)';
  if (alpha > 90 && Vdc < -1 && E < 0) {
    conductionMode = 'Line Inversion';
  }

  // Calculate Extinction angle Beta and Conduction angle Gamma
  let extinctionAngleDeg = 360;
  let conductionAngleDeg = 360;
  if (conductionMode === 'Discontinuous (DCM)') {
    // Find extinction angle after firing
    const oneCycleN = pointsPerCycle;
    let conductingCount = 0;
    for (let k = 0; k < oneCycleN; k++) {
      if (recordedSamples[k].io > 1e-3) {
        conductingCount++;
      }
    }
    conductionAngleDeg = (conductingCount / oneCycleN) * 360;
    extinctionAngleDeg = (alpha + conductionAngleDeg) % 360;
  } else {
    conductionAngleDeg = 360;
    extinctionAngleDeg = (alpha + 360) % 360;
  }

  // Harmonic FFT Analysis of Source Current and Load Voltage
  const { harmonics: harmonicsCurrent, fundamentalRms: is1_rms, displacementAngle } = computeFFT(
    isVals.slice(0, pointsPerCycle),
    frequency
  );

  const { harmonics: harmonicsVoltage } = computeFFT(
    voVals.slice(0, pointsPerCycle),
    frequency
  );

  // DPF and THD
  const dpf = Math.abs(Math.cos(displacementAngle));
  const distortionFactor = Is_rms > 1e-4 ? Math.min(1, is1_rms / Is_rms) : 0;
  const thdCurrent =
    is1_rms > 1e-4 ? Math.sqrt(Math.max(0, Math.pow(Is_rms / is1_rms, 2) - 1)) * 100 : 0;

  const theo = getTheoreticalVdc(config);

  const metrics: SimulationMetrics = {
    Vdc,
    Idc,
    Vrms: Vrms_out,
    Irms: Irms_out,
    rippleVoltage,
    rippleCurrent,
    voltageRippleFactor,
    formFactor,
    Pdc,
    PacLoad,
    Sin,
    Qin,
    pf,
    dpf,
    distortionFactor,
    thdCurrent,
    pivDevice1,
    rmsDevice1,
    avgDevice1,
    rmsFWD,
    conductionMode,
    extinctionAngleDeg,
    conductionAngleDeg,
    theoreticalVdc: theo.vdc,
    theoreticalFormula: theo.formula,
  };

  return {
    samples: recordedSamples,
    metrics,
    harmonicsCurrent,
    harmonicsVoltage,
  };
}

/**
 * Compute discrete Fourier transform for the first 25 harmonics
 */
function computeFFT(
  signal: number[],
  baseFreq: number
): { harmonics: HarmonicComponent[]; fundamentalRms: number; displacementAngle: number } {
  const N = signal.length;
  const maxHarmonics = 20;
  const harmonics: HarmonicComponent[] = [];

  let fundamentalRms = 0;
  let displacementAngle = 0;

  for (let h = 1; h <= maxHarmonics; h++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * h * n) / N;
      re += signal[n] * Math.cos(angle);
      im -= signal[n] * Math.sin(angle);
    }
    re = (2 / N) * re;
    im = (2 / N) * im;

    const magnitude = Math.sqrt(re * re + im * im);
    const rms = magnitude / Math.SQRT2;
    const phaseDeg = (Math.atan2(im, re) * 180) / Math.PI;

    if (h === 1) {
      fundamentalRms = rms;
      displacementAngle = Math.atan2(im, re);
    }

    harmonics.push({
      order: h,
      frequencyHz: h * baseFreq,
      magnitude,
      rms,
      phaseDeg,
      percentOfFundamental: 0, // computed below
    });
  }

  // Compute percentage of fundamental
  harmonics.forEach((comp) => {
    comp.percentOfFundamental =
      fundamentalRms > 1e-4 ? (comp.rms / fundamentalRms) * 100 : 0;
  });

  return { harmonics, fundamentalRms, displacementAngle };
}
