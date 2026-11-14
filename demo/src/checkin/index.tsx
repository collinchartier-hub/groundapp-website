import { Stage } from '../../kit/stage'
import { Phone } from '../../kit/phone'
import type { Act } from '../../kit/act'
import { Bodie } from './bodie'
import { CheckIn, Home } from './checkin-screens'
import { Plan, Player, Wait } from './session-screens'
import { POSTER, START, type S } from './data'
import './checkin.css'

// GroundApp's check-in, on the phone it runs on. A flow told as one object: Bodie.
// He sits in the middle of Home, moves to the corner to ask, comes back to the middle
// while he works out the plan, leaves the plan to its words, then breathes the first
// technique with you. The loop closes the way the app does: the player's own X.
//
// Gold copied: examples/phone-touch (stage, phone, touch, a loop put back by its own control).
// Whole phone on purpose (`unframed`): the site's figure language is the whole screen in a
// bezel, and this story needs the top (Bodie's line) and the bottom (Continue, Begin) together.

const REST = { x: 188, y: 520 }

/** A tap: the option lights under the finger, then the screen answers. */
async function pick(a: Act<S>, target: string, name: string, next: Partial<S>, hold = 430) {
  await a.click({ at: target, x: 0.72, y: 0.62 })
  a.put({ picked: name })
  await a.wait(150)
  a.put({ ...next, picked: null })
  await a.wait(hold)
}

const script = async (a: Act<S>) => {
  await a.wait(700)
  a.mark('check-in')
  await a.click({ at: 'checkin', x: 0.78, y: 0.6 })
  a.put({ screen: 'core' })
  await a.wait(750)

  a.mark('name')
  await pick(a, 'f-anxious', 'Anxious', { screen: 'second' })
  await pick(a, 'f-worried', 'Worried', { screen: 'third' })
  await pick(a, 'f-nervous', 'Nervous', { screen: 'rate' }, 650)

  a.mark('rate')
  await a.click({ at: 'n-6', x: 0.5, y: 0.82 })
  a.put({ strength: 6 })
  await a.wait(250)
  await a.click({ at: 'e-medium', x: 0.5, y: 0.86 })
  a.put({ energy: 'medium' })
  await a.wait(400)

  // Continue saves the check-in and goes straight to the wait, as the app does
  a.mark('plan')
  await a.click({ at: 'continue', x: 0.8, y: 0.6 })
  a.put({ screen: 'wait' })
  await a.wait(2000)
  a.put({ screen: 'plan' })
  await a.wait(260)
  for (let rows = 1; rows <= 4; rows++) {
    a.put({ rows })
    await a.wait(rows === 1 ? 320 : 130)
  }
  await a.wait(1700)

  a.mark('breathe')
  await a.click({ at: 'begin', x: 0.8, y: 0.6 })
  a.put({ screen: 'play', phase: 'inhale', count: 2, seconds: 0 })
  // His clock is /js/bodie-v3.js; these counts keep the same seconds: 2 in, 1 more in (the sip), 3 out.
  for (const [phase, count] of [['inhale', 1], ['inhale', 1], ['exhale', 3], ['exhale', 2], ['exhale', 1]] as const) {
    await a.wait(1000)
    a.put((s) => ({ phase, count, seconds: s.seconds + 1 }))
  }
  await a.wait(800)

  a.mark('close')
  await a.click('close')
  a.put({ screen: 'home' })
  await a.wait(700)
  // Under Home now: put the check-in back unseen
  await a.snap({ strength: null, energy: null, rows: 0, phase: 'inhale', count: 2, seconds: 0 })
  await a.move(REST)
  await a.wait(300)
}

export default function CheckInDemo({ paused = false }: { paused?: boolean }) {
  return (
    <Stage<S>
      width={392}
      height={791}
      compact={{ below: 372, width: 358, height: 719 }}
      initial={START}
      poster={POSTER}
      script={paused ? undefined : script}
      cursor={{ at: REST, style: 'touch' }}
      theme="dark"
      fidelity="realistic"
      unframed
      className="gad"
    >
      {(s, _rect, layout) => (
        <Phone width={layout === 'compact' ? 326 : 360} frame="bezel" dark className="gad-phone">
          <div className="gad-app">
            <Home s={s} />
            <CheckIn s={s} />
            <Wait s={s} />
            <Plan s={s} />
            <Player s={s} />
            <Bodie screen={s.screen} />
          </div>
        </Phone>
      )}
    </Stage>
  )
}
