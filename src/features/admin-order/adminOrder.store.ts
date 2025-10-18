import { create } from 'zustand'

export type OrderItem = {
  id: string
  title: string
  price_cents: number
  qty: number
  max_qty?: number          // ⬅️ додали
}

type AdminOrderState = {
  items: Record<string, OrderItem>
  add: (i: Omit<OrderItem, 'qty' | 'max_qty'>, qty?: number, max?: number) => void // ⬅️ приймаємо max
  inc: (id: string) => void
  dec: (id: string) => void
  remove: (id: string) => void
  clear: () => void
  totalCents: () => number
}

export const useAdminOrder = create<AdminOrderState>((set, get) => ({
  items: {},
  add: (i, qty = 1, max) =>
    set(s => {
      const cur = s.items[i.id]
      const limit = max ?? cur?.max_qty
      const currentQty = cur?.qty ?? 0
      const nextQty = Math.min(currentQty + qty, limit ?? Infinity)
      const next: OrderItem = {
        ...(cur ?? i),
        qty: nextQty,
        max_qty: limit ?? cur?.max_qty,   // фіксуємо ліміт усередині айтема
      }
      return { items: { ...s.items, [i.id]: next } }
    }),
  inc: id =>
    set(s => {
      const it = s.items[id]
      if (!it) return s
      if (typeof it.max_qty === 'number' && it.qty >= it.max_qty) return s // стоп
      return { items: { ...s.items, [id]: { ...it, qty: it.qty + 1 } } }
    }),
  dec: id =>
    set(s => {
      const it = s.items[id]
      if (!it) return s
      const q = it.qty - 1
      const { [id]: _, ...rest } = s.items
      return { items: q <= 0 ? rest : { ...s.items, [id]: { ...it, qty: q } } }
    }),
  remove: id => set(s => { const { [id]: _, ...rest } = s.items; return { items: rest } }),
  clear: () => set({ items: {} }),
  totalCents: () =>
    Object.values(get().items).reduce((sum, it) => sum + it.price_cents * it.qty, 0),
}))
