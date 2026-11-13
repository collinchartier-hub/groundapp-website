import { useEffect, useRef, type RefObject } from 'react'

/** A breath in the shape /js/bodie-v3.js takes, in seconds. `sip` is a second sip in at the end of the inhale. */
export type Pattern = { inhale: number; hold: number; exhale: number; hold2: number; sip?: number }

export type BodieApi = {
  /** Sets his breath and starts it again from the inhale, from wherever his belly is now. */
  setPattern(p: Pattern): void
  setStill(on: boolean, o?: { glow?: boolean }): void
  destroy(): void
}

// The site's own Bodie (three.js), loaded at run time so a demo never bundles a second copy.
// A variable keeps the bundler from trying to resolve the site path.
const BODIE_MODULE = '/js/bodie-v3.js'

/**
 * The site's live Bodie on a canvas. The returned ref holds him once he has loaded; it stays null
 * before that, when the script cannot load and when there is no WebGL, so keep a still image under
 * the canvas (bodie-v3.js adds `.is-live` to the canvas once he has drawn).
 * `onReady` runs once when he arrives; `onPhase` runs every frame with his breath's phase.
 */
export function useLiveBodie(
  canvas: RefObject<HTMLCanvasElement | null>,
  first: Pattern,
  opts: { onReady?: (b: BodieApi) => void; onPhase?: (phase: string) => void } = {},
) {
  const api = useRef<BodieApi | null>(null)
  // He arrives after the first effects have run, so the callbacks are read when they are called.
  const latest = useRef(opts)
  latest.current = opts

  useEffect(() => {
    let gone = false
    import(/* @vite-ignore */ BODIE_MODULE)
      .then(({ mountBodie }) => {
        if (gone || !canvas.current) return
        const b: BodieApi = mountBodie(canvas.current, { pattern: first, onPhase: (phase: string) => latest.current.onPhase?.(phase) })
        if (canvas.current.dataset.webgl === 'off') return void b.destroy()
        api.current = b
        latest.current.onReady?.(b)
      })
      .catch(() => {
        /* no 3D: the still image stays */
      })
    return () => {
      gone = true
      api.current?.destroy()
      api.current = null
    }
    // Mounted once: `first` is only his opening breath.
  }, [])

  return api
}
