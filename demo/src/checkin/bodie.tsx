import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../../kit/reduced-motion'
import { RESONANCE, SIGH, type Screen } from './data'

type BodieApi = {
  setPattern(p: object): void
  setStill(on: boolean, o?: { glow?: boolean }): void
  react(name: string, o?: { dir?: string }): void
  destroy(): void
}

// The site's own Bodie (three.js), loaded at run time so the demo never bundles a second copy.
// A variable keeps the bundler from trying to resolve the site path.
const BODIE_MODULE = '/js/bodie-v3.js'
const PHASE_WORD: Record<string, string> = { inhale: 'Breathe in', exhale: 'Breathe out' }

/** Where he sits on each screen. One figure for the whole flow: he moves, he is never swapped. */
const PLACE: Record<Screen, string> = {
  home: 'home',
  core: 'corner',
  second: 'corner',
  third: 'corner',
  rate: 'corner',
  wait: 'wait',
  plan: 'away',
  play: 'play',
}

/**
 * Bodie inside the phone. The still image is the first paint and stays when WebGL is off;
 * the canvas covers it once the live figure has drawn (`.is-live`, set by bodie-v3.js).
 */
export function Bodie({ screen }: { screen: Screen }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const api = useRef<BodieApi | null>(null)
  const still = useReducedMotion()
  const breathing = screen === 'play'
  // The figure arrives after its first effects have run, so it reads the latest values when it mounts.
  const latest = useRef({ breathing, still })
  latest.current = { breathing, still }

  useEffect(() => {
    let gone = false
    import(/* @vite-ignore */ BODIE_MODULE)
      .then(({ mountBodie }) => {
        if (gone || !canvas.current) return
        // Home's line under him ("Breathe in") comes from his own clock, written only when the word changes.
        const line = canvas.current.closest('.gad-app')?.querySelector('.gad-home__phase')
        const onPhase = (phase: string) => {
          const word = PHASE_WORD[phase] ?? 'Hold'
          if (line && line.textContent !== word) line.textContent = word
        }
        const b: BodieApi = mountBodie(canvas.current, { pattern: RESONANCE, onPhase })
        if (canvas.current.dataset.webgl === 'off') return void b.destroy()
        api.current = b
        b.setPattern(latest.current.breathing ? SIGH : RESONANCE)
        if (latest.current.still) b.setStill(true, { glow: false })
      })
      .catch(() => {
        /* no 3D: the still image stays */
      })
    return () => {
      gone = true
      api.current?.destroy()
      api.current = null
    }
  }, [])

  // His breath follows the screen: the session's first technique in the player, Resonance elsewhere.
  // setPattern restarts the breath, so his inhale begins as the player arrives.
  useEffect(() => {
    api.current?.setPattern(breathing ? SIGH : RESONANCE)
  }, [breathing])

  useEffect(() => {
    api.current?.setStill(still, { glow: false })
  }, [still])

  return (
    <div className="gad-bodie" data-place={PLACE[screen]} aria-hidden>
      <img className="gad-bodie__still" src="/media/v3/bodie/bodie-still-600.webp" alt="" width={600} height={744} />
      <canvas ref={canvas} className="gad-bodie__canvas" />
    </div>
  )
}
