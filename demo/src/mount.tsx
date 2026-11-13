import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import CheckInDemo from './checkin'

// The page's own motion switch (site/js/home-v7.js): the pause button, Low Power Mode and
// reduced motion all end up as data-motion="still" on <html>, with a "ga:motion" event on change.
const root = document.documentElement
const isStill = () => root.dataset.motion === 'still'

function Host() {
  const [paused, setPaused] = useState(isStill)
  useEffect(() => {
    const sync = () => setPaused(isStill())
    document.addEventListener('ga:motion', sync)
    return () => document.removeEventListener('ga:motion', sync)
  }, [])
  return <CheckInDemo paused={paused} />
}

for (const el of document.querySelectorAll<HTMLElement>('[data-app-demo="check-in"]')) {
  const stage = el.querySelector<HTMLElement>('[data-app-demo-stage]')
  if (!stage) continue
  createRoot(stage).render(<Host />)
  el.dataset.live = ''
}
