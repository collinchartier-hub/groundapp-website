import { useLayoutEffect, useRef, useState } from 'react'
import { BatteryFull, BatteryLow, BatteryMedium, ChartColumn, ChevronLeft, CloudRain, Flame, House, Leaf, LibraryBig, Snowflake, UserRound, Wind, Zap, type LucideIcon } from 'lucide-react'
import { ASKS, ASK_ORDER, CORE, ENERGY, SECOND, THIRD, TRAIL, isAsk, type Ask, type S } from './data'

// Only the six first feelings have an icon; the narrower words are text alone.
const FEELING_ICON: Partial<Record<string, LucideIcon>> = { Calm: Leaf, Anxious: Wind, Sad: CloudRain, Angry: Flame, Energized: Zap, Numb: Snowflake }
const ENERGY_ICON: Record<string, LucideIcon> = { Low: BatteryLow, Medium: BatteryMedium, High: BatteryFull }
const TABS: [string, LucideIcon][] = [['Home', House], ['Library', LibraryBig], ['Progress', ChartColumn], ['Profile', UserRound]]

/** Home: Bodie in the middle with his cloud, the technique wheel and Start under him. */
export function Home({ s }: { s: S }) {
  return (
    <div className="gad-screen gad-home" data-on={s.screen === 'home' || undefined}>
      <div className="gad-cloud">
        <span className="gad-grabber" />
        <div className="gad-cloud__hi">Good evening</div>
        <div className="gad-cloud__ask">How are you feeling this evening?</div>
        <div className="gad-btn gad-btn--gold" data-target="checkin">Check in</div>
        <i className="gad-puff gad-puff--1" />
        <i className="gad-puff gad-puff--2" />
      </div>
      <div className="gad-home__phase" />
      <div className="gad-wheel">
        <div className="gad-wheel__row gad-wheel__row--on">Resonance</div>
        <div className="gad-wheel__row gad-wheel__row--next">Box</div>
      </div>
      <div className="gad-home__actions">
        <div className="gad-btn gad-btn--gold">Start</div>
        <div className="gad-btn gad-btn--card">About</div>
      </div>
      <div className="gad-tabs">
        {TABS.map(([name, Icon], i) => (
          <span key={name} className="gad-tab" data-on={i === 0 || undefined}>
            <Icon size={22} strokeWidth={2} />
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

function Option({ name, s }: { name: string; s: S }) {
  const Icon = FEELING_ICON[name]
  const id = name.toLowerCase()
  return (
    <div className="gad-opt" data-icon={Icon ? '' : undefined} data-picked={s.picked === name || undefined} data-feel={id} data-target={`f-${id}`}>
      {Icon && <Icon size={18} strokeWidth={2} />}
      <span>{name}</span>
    </div>
  )
}

function Trail({ upTo }: { upTo: number }) {
  return (
    <div className="gad-chips">
      {TRAIL.slice(0, upTo).map((n, i) => (
        <span key={n} className="gad-chips__item">
          {i > 0 && <b>{'\u203A'}</b>}
          <span className="gad-chip">{n}</span>
        </span>
      ))}
    </div>
  )
}

/** The check-in: one sheet, Bodie asking from the corner, the answers changing under him. */
export function CheckIn({ s }: { s: S }) {
  // Off the check-in the cloud already holds the line it will next be seen with: the first on Home, the last after.
  const ask = isAsk(s.screen) ? s.screen : s.screen === 'home' ? 'core' : 'rate'
  // The cloud is as tall as the line it holds. Measured, so a late font or a different wrap never clips it.
  const lines = useRef<Partial<Record<Ask, HTMLSpanElement | null>>>({})
  const [height, setHeight] = useState<number>()
  useLayoutEffect(() => {
    const measure = () => setHeight((lines.current[ask]?.offsetHeight ?? 44) + 26)
    measure()
    let live = true
    document.fonts?.ready.then(() => live && measure())
    return () => { live = false }
  }, [ask])
  return (
    <div className="gad-screen gad-checkin" data-on={isAsk(s.screen) || undefined}>
      <div className="gad-top">
        <span className="gad-back" data-on={(isAsk(s.screen) && s.screen !== 'core') || undefined}>
          <ChevronLeft size={14} viewBox="7 5 10 14" width={10} strokeWidth={2.4} />
          Back
        </span>
        <span className="gad-grabber" />
        <span className="gad-notnow">Not now</span>
      </div>
      <div className="gad-progress">
        <i style={{ width: `${(ASK_ORDER.indexOf(ask) + 1) * 25}%` }} />
      </div>
      <div className="gad-says">
        <i className="gad-puff gad-puff--1" />
        <i className="gad-puff gad-puff--2" />
        {/* One cloud: its height follows the line, and the lines trade places inside it */}
        <div className="gad-bubble" style={{ height }}>
          {ASK_ORDER.map((k) => (
            <span key={k} ref={(el) => { lines.current[k] = el }} className="gad-says__line" data-on={k === ask || undefined}>{ASKS[k]}</span>
          ))}
        </div>
      </div>

      <div className="gad-step" data-on={s.screen === 'core' || undefined}>
        <div className="gad-grid">{CORE.map((n) => <Option key={n} name={n} s={s} />)}</div>
      </div>
      <div className="gad-step" data-on={s.screen === 'second' || undefined}>
        <Trail upTo={1} />
        <div className="gad-grid">{SECOND.map((n) => <Option key={n} name={n} s={s} />)}</div>
      </div>
      <div className="gad-step" data-on={s.screen === 'third' || undefined}>
        <Trail upTo={2} />
        <div className="gad-grid gad-grid--one">{THIRD.map((n) => <Option key={n} name={n} s={s} />)}</div>
      </div>

      <div className="gad-step" data-on={s.screen === 'rate' || undefined}>
        <div className="gad-path"><Wind size={15} strokeWidth={2} />{TRAIL.join(' \u203A ')}</div>
        <div className="gad-q">How strong is it?</div>
        <div className="gad-nums">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <span key={n} className="gad-num" data-picked={s.strength === n || undefined} data-target={`n-${n}`}>{n}</span>
          ))}
        </div>
        <div className="gad-scale"><span>Barely there</span><span>Overwhelming</span></div>
        <div className="gad-q">And your energy?</div>
        <div className="gad-energy">
          {ENERGY.map((n) => {
            const Icon = ENERGY_ICON[n]
            return (
              <span key={n} className="gad-en" data-picked={s.energy === n.toLowerCase() || undefined} data-target={`e-${n.toLowerCase()}`}>
                <Icon size={21} strokeWidth={1.8} />
                {n}
              </span>
            )
          })}
        </div>
        <div className="gad-btn gad-btn--gold gad-foot" data-ready={(s.strength !== null && s.energy !== null) || undefined} data-target="continue">Continue</div>
      </div>
    </div>
  )
}
