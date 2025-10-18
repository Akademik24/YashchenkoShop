import { Link, NavLink } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/features/cart/cart.store'
import { useRef } from 'react'
import AdminBackdoor from '@/app/AdminBackdoor'

export default function Header() {
  const count = useCart(s => Object.values(s.items).reduce((n, i) => n + i.qty, 0))
  const logoRef = useRef<HTMLAnchorElement>(null)

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">
        <Link ref={logoRef} to="/" className="font-bold" title="Клікни 5 разів 😉">
          Магазин
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <NavLink to="/">Головна</NavLink>
          <NavLink to="/shop">Каталог</NavLink>
          <NavLink to="/cart" className="relative inline-flex items-center gap-1">
            <ShoppingCart className="h-4 w-4" /> Кошик
            {count > 0 && (
              <span className="ml-1 rounded-full bg-black px-2 py-0.5 text-xs font-bold text-white">
                {count}
              </span>
            )}
          </NavLink>
        </nav>
      </div>

      {/* Таємні двері: 5 кліків по лого або Ctrl/⌘ + Alt + A */}
      <AdminBackdoor triggerRef={logoRef} to="/admin/login" />
    </header>
  )
}
