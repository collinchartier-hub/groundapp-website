// Every string and number here is the shipped app's: GroundApp 1.4.2 (App Store, 2026-11-12),
// read from the source at `release/1.4.2`. Change the app first, then this file.
//
//   Home's cloud            ViewModels/BodieHomeSession.swift, Views/Home/BodieHomeBubble.swift
//   Bodie's questions       Views/CheckIn/CheckInFlowView.swift, line(for:)
//   Continue, then the wait CheckInFlowView.save() (no "saved" screen unless it is a crisis check-in)
//   The waiting line        Configuration/AuraCopy.swift, planWaitingLine
//   The plan                ViewModels/CheckInViewModel.swift, buildFallbackPrescription (.sympathetic):
//                           8 sighs, 6 rounds of 4-7-8, 8 of Resonance, timed from breathwork_techniques.json
//   The player's line       Views/Session/WheelSessionLayout+Modes.swift, programLineText and dataLine

export type Screen = 'home' | 'core' | 'second' | 'third' | 'rate' | 'wait' | 'plan' | 'play'
export type Phase = 'inhale' | 'exhale'

export type S = {
  screen: Screen
  /** The option under the finger, lit for a moment before the screen moves on. */
  picked: string | null
  strength: number | null
  energy: string | null
  /** Plan parts on screen: 1 is the header and the note, then one per technique. */
  rows: number
  phase: Phase
  count: number
  seconds: number
}

export const START: S = { screen: 'home', picked: null, strength: null, energy: null, rows: 0, phase: 'inhale', count: 2, seconds: 0 }
export const POSTER: S = { ...START, screen: 'play', strength: 6, energy: 'medium', rows: 4 }

export type Ask = 'core' | 'second' | 'third' | 'rate'

/** Bodie's line on each step. */
export const ASKS: Record<Ask, string> = {
  core: 'How are you feeling right now?',
  second: 'Which of these sits closest?',
  third: 'And the closest word?',
  rate: "Last bit. How strong is it, and how is your energy? Then we'll breathe.",
}
export const ASK_ORDER = Object.keys(ASKS) as Ask[]
export const isAsk = (s: Screen): s is Ask => s in ASKS

export const CORE = ['Calm', 'Anxious', 'Sad', 'Angry', 'Energized', 'Numb'] as const
export const SECOND = ['Worried', 'Overwhelmed', 'Restless', 'Panicked'] as const
export const THIRD = ['Nervous', 'Apprehensive', 'Uneasy'] as const
export const TRAIL = ['Anxious', 'Worried', 'Nervous'] as const
export const ENERGY = ['Low', 'Medium', 'High'] as const

export const WAITING = 'Bodie is coming up with your plan'

/** The plan the app builds on the phone for Anxious, Worried, Nervous at 6 with medium energy. */
export const PLAN = {
  title: 'Your session',
  minutes: '4 minutes',
  note: "Your body is in protection mode. It's doing its job. Let's use your breath to send a clear signal that you're safe.",
  steps: [
    { tag: 'Release', name: 'Physiological sigh', time: '48s', why: 'The double inhale and an open-mouth exhale may help you let go of tension.' },
    { tag: 'Regulate', name: '4-7-8 breathing', time: '1m 54s', why: 'The extended exhale activates your vagus nerve, the highway to calm.' },
    { tag: 'Stabilize', name: 'Resonance breathing', time: '1m 28s', why: 'Coherent breathing tunes your heart and lungs to the same frequency.' },
  ],
}

export const WORD: Record<Phase, string> = { inhale: 'Breathe in', exhale: 'Breathe out' }
export const PLAYER_LINE = `${PLAN.steps[0].name} \u00B7 Part 1 of ${PLAN.steps.length}`
export const PLAYER_CYCLE = 'Cycle 1/8'

/** Breath patterns in the shape /js/bodie-v3.js takes. The sigh is 2 in, 1 more in (the sip), 3 out. */
export const RESONANCE = { inhale: 5.5, hold: 0, exhale: 5.5, hold2: 0 }
export const SIGH = { inhale: 3, hold: 0, exhale: 3, hold2: 0, sip: 1 }
