import { Pause, Volume2, X } from 'lucide-react'
import { Roll } from '../../kit/motion/Roll'
import { PLAN, PLAYER_CYCLE, PLAYER_LINE, WAITING, WORD, type S } from './data'

/** The wait: one line over Bodie while he works. He is the canvas above this layer. */
export function Wait({ s }: { s: S }) {
  return (
    <div className="gad-screen gad-wait" data-on={s.screen === 'wait' || undefined}>
      <div className="gad-wait__line">{WAITING}</div>
    </div>
  )
}

/** The plan: title, a note on what the body is doing, then each technique with its reason. */
export function Plan({ s }: { s: S }) {
  const shown = s.screen === 'plan' || s.screen === 'play' ? s.rows : 0
  return (
    <div className="gad-screen gad-plan" data-on={s.screen === 'plan' || undefined}>
      <div className="gad-top">
        <span />
        <span className="gad-grabber" />
        <span className="gad-notnow">Not now</span>
      </div>
      <div className="gad-part gad-plan__head" data-in={shown >= 1 || undefined}>
        <div className="gad-plan__title">{PLAN.title}</div>
        <div className="gad-plan__mins">{PLAN.minutes}</div>
      </div>
      <div className="gad-part gad-card gad-plan__note" data-in={shown >= 1 || undefined}>{PLAN.note}</div>
      <div className="gad-steps">
        {PLAN.steps.map((p, i) => (
          <div key={p.name} className="gad-part gad-card gad-tech" data-in={shown >= i + 2 || undefined}>
            <div className="gad-tech__top">
              <span className="gad-tag">{p.tag}</span>
              <span className="gad-tech__time">{p.time}</span>
            </div>
            <div className="gad-tech__name">{p.name}</div>
            <div className="gad-tech__why">{p.why}</div>
          </div>
        ))}
      </div>
      <div className="gad-btn gad-btn--gold gad-foot" data-ready data-target="begin">Begin session</div>
    </div>
  )
}

/** The player: the phase word, the count beside Bodie, which part of the plan this is. */
export function Player({ s }: { s: S }) {
  return (
    <div className="gad-screen gad-play" data-on={s.screen === 'play' || undefined}>
      <span className="gad-close" data-target="close"><X size={22} strokeWidth={2} /></span>
      <div className="gad-play__phase"><Roll>{WORD[s.phase]}</Roll></div>
      <div className="gad-play__count"><Roll>{String(s.count)}</Roll></div>
      <div className="gad-play__line">{PLAYER_LINE}</div>
      <div className="gad-play__clock">
        <Roll>{`0:${String(s.seconds).padStart(2, '0')}`}</Roll>
        <div className="gad-play__cycle">{PLAYER_CYCLE}</div>
      </div>
      <div className="gad-play__ctl">
        <span className="gad-round"><Pause size={20} strokeWidth={2} fill="currentColor" /></span>
        <span className="gad-round"><Volume2 size={20} strokeWidth={2} /></span>
      </div>
    </div>
  )
}
