import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../../kit/reduced-motion'
import { useLiveBodie } from '../live-bodie'
import { RESONANCE, SIGH, type Screen } from './data'

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
 * the canvas covers it once the live figure has drawn.
 */
export function Bodie({ screen }: { screen: Screen }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const still = useReducedMotion()
  const breathing = screen === 'play'
  const api = useLiveBodie(canvas, RESONANCE, {
    still,
    onReady: (b) => b.setPattern(breathing ? SIGH : RESONANCE),
    // Home's line under him ("Breathe in") comes from his own clock, written only when the word changes.
    onPhase: (phase) => {
      const line = canvas.current?.closest('.gad-app')?.querySelector('.gad-home__phase')
      const word = PHASE_WORD[phase] ?? 'Hold'
      if (line && line.textContent !== word) line.textContent = word
    },
  })

  // His breath follows the screen: the session's first technique in the player, Resonance elsewhere.
  // setPattern starts the breath again, so his inhale begins as the player arrives.
  useEffect(() => {
    api.current?.setPattern(breathing ? SIGH : RESONANCE)
  }, [api, breathing])

  return (
    <div className="gad-bodie" data-place={PLACE[screen]} aria-hidden>
      <canvas ref={canvas} className="gad-bodie__canvas" />
      <img className="gad-bodie__still" src="/media/v3/bodie/bodie-still-600.webp" alt="" width={600} height={744} />
    </div>
  )
}
