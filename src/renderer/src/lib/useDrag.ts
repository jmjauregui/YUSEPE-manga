import { useEffect, useRef, useState } from 'react'

interface DragStart {
  x: number
  y: number
}

/**
 * Gestor de arrastre con puntero: `begin(e)` inicia el gesto y los listeners
 * viven en window hasta soltar, así el puntero puede salirse del elemento
 * sin perder el arrastre. Los deltas se reportan desde el punto de inicio.
 */
export function useWindowDrag(
  onMove: (dx: number, dy: number, e: PointerEvent) => void,
  onEnd?: () => void,
) {
  const [active, setActive] = useState(false)
  const startRef = useRef<DragStart | null>(null)

  const begin = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY }
    setActive(true)
  }

  useEffect(() => {
    if (!active) return
    const move = (e: PointerEvent) => {
      const s = startRef.current
      if (s) onMove(e.clientX - s.x, e.clientY - s.y, e)
    }
    const up = () => {
      setActive(false)
      startRef.current = null
      onEnd?.()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [active, onMove, onEnd])

  return { begin, active }
}
