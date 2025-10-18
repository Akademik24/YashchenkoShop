import { create } from 'zustand'

export type CartItem = {
  id: string
  title: string
  price_cents: number
  qty: number
  image?: string
  max_qty?: number   // опційно, якщо колись підтягнемо залишки
}

type CartState = {
  items: Record<string, CartItem>
  add: (i: Omit<CartItem, 'qty'>, qty?: number) => void
  inc: (id: string) => void
  dec: (id: string) => void
  remove: (id: string) => void
  clear: () => void
  totalCents: () => number
}

// простий persist у localStorage
const KEY = 'cart:v1'

function loadInitial(): Record<string, CartItem> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export const useCart = create<CartState>((set, get) => ({
  items: loadInitial(),

  add: (i, qty = 1) =>
    set(s => {
      const cur = s.items[i.id]
      const nextQty = (cur?.qty ?? 0) + qty
      const limited = typeof i.max_qty === 'number' ? Math.min(nextQty, i.max_qty) : nextQty
      const next: CartItem = { ...(cur ?? i), qty: limited }
      const items = { ...s.items, [i.id]: next }
      localStorage.setItem(KEY, JSON.stringify(items))
      return { items }
    }),

  inc: (id) =>
    set(s => {
      const it = s.items[id]; if (!it) return s
      const nextQty = typeof it.max_qty === 'number' ? Math.min(it.qty + 1, it.max_qty) : it.qty + 1
      const items = { ...s.items, [id]: { ...it, qty: nextQty } }
      localStorage.setItem(KEY, JSON.stringify(items))
      return { items }
    }),

  dec: (id) =>
    set(s => {
      const it = s.items[id]; if (!it) return s
      const q = it.qty - 1
      const { [id]: _drop, ...rest } = s.items
      const items = q <= 0 ? rest : { ...s.items, [id]: { ...it, qty: q } }
      localStorage.setItem(KEY, JSON.stringify(items))
      return { items }
    }),

  remove: (id) =>
    set(s => {
      const { [id]: _drop, ...rest } = s.items
      localStorage.setItem(KEY, JSON.stringify(rest))
      return { items: rest }
    }),

  clear: () => {
    localStorage.removeItem(KEY)
    set({ items: {} })
  },

  totalCents: () =>
    Object.values(get().items).reduce((sum, it) => sum + it.price_cents * it.qty, 0),
}))
export const useCartStore = useCart

