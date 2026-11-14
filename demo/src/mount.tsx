import { useEffect, useState, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import CheckInDemo from './checkin'
import WatchDemo from './watch'

// The page's own motion switch (site/js/home-v7.js): the pause button, Low Power Mode and
// reduced motion all end up as data-motion="still" on <html>, with a "ga:motion" event on change.
const root = document.documentElement
const isStill = () => root.dataset.motion === 'still'

/** Each demo by the name in its slot's `data-app-demo`. */
const DEMOS: Record<string, ComponentType<{ paused?: boolean }>> = { 'check-in': CheckInDemo, watch: WatchDemo }

function Host({ Demo }: { Demo: ComponentType<{ paused?: boolean }> }) {
  const [paused, setPaused] = useState(isStill)
  useEffect(() => {
    const sync = () => setPaused(isStill())
    document.addEventListener('ga:motion', sync)
    // The page may have gone still between the first render and this subscription
    sync()
    return () => document.removeEventListener('ga:motion', sync)
  }, [])
  return <Demo paused={paused} />
}

for (const el of document.querySelectorAll<HTMLElement>('[data-app-demo]')) {
  const Demo = DEMOS[el.dataset.appDemo ?? '']
  const stage = el.querySelector<HTMLElement>('[data-app-demo-stage]')
  if (!Demo || !stage) continue
  createRoot(stage).render(<Host Demo={Demo} />)
  el.dataset.live = ''
}
