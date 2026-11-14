import { useEffect, useRef } from 'react'
import { Pause, X } from 'lucide-react'
import { Stage } from '../../kit/stage'
import { clock } from '../../kit/clock'
import { Roll } from '../../kit/motion/Roll'
import { useReducedMotion } from '../../kit/reduced-motion'
import type { Act } from '../../kit/act'
import { useLiveBodie, type Pattern } from '../live-bodie'
import './watch.css'

// GroundApp on Apple Watch: one Box breathing session, as the watch app runs it (1.4.2).
// What the system does, so there is no cursor: Bodie breathes 4 in, 4 hold, 4 out, 4 hold,
// the word and the count follow, the ring fills, and after cycle 4 of 4 the screen dips and
// a new session begins.
//
// Every string and number is the watch app's, read at `release/1.4.2`:
//   BreathworkWatch/Views/WatchSessionView.swift       the session screen and its ring
//   BreathworkWatch/Models/WatchBreathingTechnique.swift   Box breathing: 4, 4, 4, 4 for 4 cycles
//   BreathworkWatch/Utilities/WatchType.swift           the phase words and type sizes
// Sizes and colours were measured on the app's own screenshot (site/media/v3/watch/02-...-416.webp).
//
// Gold copied: examples/payout-flow for a story with no cursor. The watch case is ours: the kit has
// no watch. The screen is laid out in watch points (208 x 248, the 46 mm screen) and scaled.

const STEPS = ['Breathe in', 'Hold', 'Breathe out', 'Hold'] as const
const STEP_SECONDS = 4
const CYCLE_SECONDS = STEPS.length * STEP_SECONDS
const CYCLES = 4
const SESSION_SECONDS = CYCLES * CYCLE_SECONDS
const BOX: Pattern = { inhale: 4, hold: 4, exhale: 4, hold2: 4 }

type S = {
  /** Whole seconds into the session. */
  t: number
  /** The screen dipped between one session and the next. */
  dim: boolean
}

const START: S = { t: 0, dim: false }

const script = async (a: Act<S>) => {
  // Each second is timed from the start of the session, not from the last one, so the count
  // stays with Bodie's own clock for the whole minute.
  const began = clock.now()
  for (let t = 1; t <= SESSION_SECONDS; t++) {
    await a.wait(Math.max(0, began + t * 1000 - clock.now()))
    if (t < SESSION_SECONDS) a.put({ t })
  }
  a.put({ dim: true })
  await a.wait(420)
  await a.snap({ t: 0 })
  // Nothing after this: the next session's first second starts as the screen comes back
  a.put({ dim: false })
}

/**
 * Bodie on the watch: the site's live figure. His breath runs on his own clock, so it is started
 * again whenever the count starts a cycle (`cycleStart` changes) and whenever he comes back from
 * holding still. That covers each new cycle, a new session, the stage coming back on screen and
 * the page's pause being lifted.
 */
function WatchBodie({ cycleStart }: { cycleStart: number | null }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const still = useReducedMotion()
  const api = useLiveBodie(canvas, BOX, { still })
  useEffect(() => {
    if (!still && cycleStart !== null) api.current?.setPattern(BOX)
  }, [api, cycleStart, still])
  return (
    <div className="gaw-bodie">
      <canvas ref={canvas} className="gaw-bodie__canvas" />
      <img className="gaw-bodie__still" src="/media/v3/bodie/bodie-still-600.webp" alt="" width={600} height={744} />
    </div>
  )
}

export default function WatchDemo({ paused = false }: { paused?: boolean }) {
  return (
    <Stage<S> width={360} height={500} initial={START} poster={START} script={paused ? undefined : script} theme="dark" fidelity="realistic" unframed className="gaw">
      {(s) => {
        const cycle = Math.floor(s.t / CYCLE_SECONDS)
        const step = Math.floor((s.t % CYCLE_SECONDS) / STEP_SECONDS)
        return (
          <div className="gaw-watch" aria-hidden>
            <i className="gaw-band gaw-band--top" />
            <i className="gaw-band gaw-band--bottom" />
            <i className="gaw-crown" />
            <i className="gaw-button" />
            <div className="gaw-case">
              <div className="gaw-glass">
                <div className="gaw-screen">
                  <div className="gaw-time">10:09</div>
                  <div className="gaw-session" data-dim={s.dim || undefined}>
                    <div className="gaw-figure">
                      <svg className="gaw-ring" viewBox="0 0 104 104" width="104" height="104">
                        <circle cx="52" cy="52" r="51" />
                        <circle cx="52" cy="52" r="51" pathLength={1} style={{ strokeDasharray: `${s.t / SESSION_SECONDS} 1` }} />
                      </svg>
                      <WatchBodie cycleStart={!s.dim && s.t % CYCLE_SECONDS === 0 ? cycle : null} />
                    </div>
                    <div className="gaw-phase">
                      <Roll variant="fade">{STEPS[step]}</Roll>
                      <span className="gaw-count"><Roll>{String(STEP_SECONDS - (s.t % STEP_SECONDS))}</Roll></span>
                    </div>
                    <div className="gaw-cycle">Cycle <Roll>{String(cycle + 1)}</Roll> of {CYCLES}</div>
                    <div className="gaw-controls">
                      <span className="gaw-ctl"><Pause size={21} strokeWidth={0} fill="currentColor" /></span>
                      <span className="gaw-ctl gaw-ctl--end"><X size={23} strokeWidth={2.6} /></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }}
    </Stage>
  )
}
