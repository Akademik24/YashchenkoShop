import { Outlet } from 'react-router-dom'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { useCart } from '@/features/cart/cart.store'
import { Link } from 'react-router-dom'



export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function HeaderCartBadge() {
  const items = useCart(s => s.items)
  const count = Object.values(items).reduce((n, i) => n + i.qty, 0)
  return (
    <Link to="/cart" className="relative">
      <span>🛒</span>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 rounded-full bg-black px-1.5 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  )
}
