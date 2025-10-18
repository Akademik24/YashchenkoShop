import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

type Props = {
  /** Елемент, по якому рахуємо кліки (наприклад, лого) */
  triggerRef?: React.RefObject<HTMLElement | HTMLAnchorElement>
  /** Куди вести (сторінка логіну адміна) */
  to?: string
  /** Скільки кліків поспіль потрібно */
  clicks?: number
  /** Вікно часу для кліків, мс */
  windowMs?: number
}

/**
 * Невидимий бекдор: 1) N кліків по вказаному елементу за T мс → navigate(to)
 *                   2) Гаряча клавіша: Ctrl/⌘ + Alt + A → navigate(to)
 */
export default function AdminBackdoor({
  triggerRef,
  to = '/admin/login',
  clicks = 5,
  windowMs = 2000,
}: Props) {
  const navigate = useNavigate()
  const countRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  // Гаряча клавіша: Ctrl/⌘ + Alt + A
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase()
      if ((e.ctrlKey || e.metaKey) && e.altKey && key === 'a') {
        e.preventDefault()
        navigate(to)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, to])

  // Лічильник кліків по triggerRef
  useEffect(() => {
    const el = triggerRef?.current
    if (!el) return

    const reset = () => {
      countRef.current = 0
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const onClick = () => {
      // перший клік — запускаємо таймер вікна
      if (countRef.current === 0) {
        timerRef.current = window.setTimeout(reset, windowMs)
      }

      countRef.current += 1

      if (countRef.current >= clicks) {
        reset()
        navigate(to)
      }
    }

    el.addEventListener('click', onClick)
    return () => {
      el.removeEventListener('click', onClick)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [triggerRef, clicks, windowMs, navigate, to])

  return null
}
