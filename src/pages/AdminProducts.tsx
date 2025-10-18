import { useEffect, useMemo, useRef, useState } from 'react'
import RequireAdmin from '@/app/RequireAdmin'
import { useAdminOrder } from '@/features/admin-order/adminOrder.store'
import AdminOrderPanel from '@/features/admin-order/AdminOrderPanel'
import { useNavigate } from 'react-router-dom'

import {
  listProducts,
  upsertProduct,
  deleteProduct,
  uploadProductImage,
  publicImageUrl,
  ensureUniqueSlug,
  type DbProduct,
} from '@/lib/products'
import {
  listCategories,
  ensureCategoryByName,
  type Category,
} from '@/lib/categories'
import { slugify } from '@/lib/slug'
import { moneyUA } from '@/lib/money'
import { listOrders, type DbOrder } from '@/lib/orders'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Form = {
  id?: string
  title: string
  sku?: string
  price_cents: number
  category_id: string | null
  rating?: number
  stock_qty: number
  is_active?: boolean
}

// ——— маленький debounce-хук для пошуку
function useDebounced<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function AdminProducts() {
  // ****** ТОВАРИ
  const [items, setItems] = useState<DbProduct[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [onlyActive, setOnlyActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [sort, setSort] = useState<'created_desc' | 'price_asc' | 'price_desc' | 'rating_desc'>('created_desc')

  // 🧺 кошик адміністратора
  const order = useAdminOrder()

  const [form, setForm] = useState<Form>({
    title: '',
    sku: '',
    price_cents: 0,
    category_id: null,
    rating: 4.5,
    stock_qty: 0,
    is_active: true,
  })

  const filtered = useMemo(() => {
    let data = items
    if (onlyActive !== 'all') {
      data = data.filter(p => (p.is_active ?? true) === (onlyActive === 'active'))
    }
    return data
  }, [items, onlyActive])

  async function loadAll() {
    setErrorMsg(null)
    try {
      const [ps, cs] = await Promise.all([
        listProducts({ q: query, sort, onlyActive: onlyActive === 'active' }),
        listCategories(),
      ])
      setItems(ps)
      setCats(cs)
    } catch (e: any) {
      setErrorMsg(e?.message || 'Load failed')
    }
  }

  useEffect(() => { loadAll() /* eslint-disable-next-line */ }, [])
  useEffect(() => { loadAll() /* eslint-disable-next-line */ }, [query, sort, onlyActive])

  const resetForm = () => {
    setForm({
      title: '',
      sku: '',
      price_cents: 0,
      category_id: null,
      rating: 4.5,
      stock_qty: 0,
      is_active: true,
    })
    setFile(null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    try {
      let generatedSlug = slugify(form.title)
      generatedSlug = await ensureUniqueSlug(generatedSlug, form.id)
      const product = await upsertProduct({ ...form, slug: generatedSlug })
      if (file) await uploadProductImage(file, product.id)
      await loadAll()
      resetForm()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Save failed')
    } finally { setLoading(false) }
  }

  const onEdit = (p: DbProduct) => {
    setForm({
      id: p.id,
      title: p.title,
      sku: p.sku ?? '',
      price_cents: p.price_cents,
      category_id: p.category_id,
      rating: p.rating ?? 0,
      stock_qty: typeof (p as any).stock_qty === 'number' ? (p as any).stock_qty : 0,
      is_active: p.is_active ?? true,
    })
    setFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDelete = async (id: string) => {
    if (!confirm('Видалити товар?')) return
    setErrorMsg(null)
    try { await deleteProduct(id); await loadAll() }
    catch (e: any) { setErrorMsg(e?.message || 'Delete failed') }
  }

  const onCreateCategory = async () => {
    const name = prompt('Назва нової категорії:')
    if (!name) return
    try {
      const cat = await ensureCategoryByName(name)
      setCats(c => [...c, cat].sort((a, b) => a.name.localeCompare(b.name)))
      setForm(f => ({ ...f, category_id: cat.id }))
    } catch (e: any) { alert(e?.message || 'Помилка створення категорії') }
  }

  // ****** МІНІ-ТАБЛИЦЯ ЗАМОВЛЕНЬ
  const navigate = useNavigate()
  const [ordStatus, setOrdStatus] = useState<'all'|'new'|'processing'|'done'|'cancelled'>('all')
  const [ordQ, setOrdQ] = useState('')
  const debOrdQ = useDebounced(ordQ, 400)

  const [orders, setOrders] = useState<DbOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersErr, setOrdersErr] = useState<string|null>(null)

  const lastFetchedRef = useRef<{status:string, list:DbOrder[]}|null>(null)

  async function fetchOrders(status: typeof ordStatus) {
    setOrdersErr(null); setOrdersLoading(true)
    try {
      const list = await listOrders({ status })
      lastFetchedRef.current = { status, list }
      setOrders(list)
    } catch (e:any) {
      setOrdersErr(e?.message || 'Load failed')
    } finally { setOrdersLoading(false) }
  }

  // 1) рефетч при зміні статусу
  useEffect(() => { fetchOrders(ordStatus) /* eslint-disable-next-line */ }, [ordStatus])

  // 2) фільтр за запитом — клієнтськи (без повторного запиту), з debounce
  const visibleOrders = useMemo(() => {
    const q = debOrdQ.trim().toLowerCase()
    const base = lastFetchedRef.current?.list ?? orders
    if (!q) return base
    return base.filter(o =>
      [o.customer_last_name, o.customer_first_name, o.phone]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [debOrdQ, orders])

  return (
    <RequireAdmin>
      {/* додали pb-44, щоб не накладалося на плаваючу панель кошика */}
      <div className="mx-auto max-w-6xl px-4 py-8 pb-44">
        <h1 className="text-2xl font-bold">Адмін · Товари</h1>

        {/* Toolbar */}
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,180px,180px]">
          <Input placeholder="Пошук за назвою/артикулом…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={onlyActive} onValueChange={(v) => setOnlyActive(v as any)}>
            <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі</SelectItem>
              <SelectItem value="active">Активні</SelectItem>
              <SelectItem value="inactive">Неактивні</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger><SelectValue placeholder="Сортування" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Новіші</SelectItem>
              <SelectItem value="price_asc">Ціна ↑</SelectItem>
              <SelectItem value="price_desc">Ціна ↓</SelectItem>
              <SelectItem value="rating_desc">Рейтинг</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Помилка: {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 font-medium">
            Форма {form.id ? 'редагування' : 'створення'}
          </div>

          <Input placeholder="Назва" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          <Input placeholder="Артикул (SKU)" value={form.sku ?? ''} onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))} />

          <div className="flex gap-2">
            <Input type="number" placeholder="Ціна, грн"
                   value={Math.round(form.price_cents / 100)}
                   onChange={(e) => setForm(f => ({ ...f, price_cents: Number(e.target.value) * 100 || 0 }))} />
            <Input type="number" step="0.1" placeholder="Рейтинг"
                   value={form.rating ?? 0}
                   onChange={(e) => setForm(f => ({ ...f, rating: Number(e.target.value) }))} />
            <Input type="number" placeholder="Залишок"
                   value={form.stock_qty ?? 0}
                   onChange={(e) => setForm(f => ({ ...f, stock_qty: Number(e.target.value) || 0 }))} />
          </div>

          <div className="flex gap-2">
            <Select value={form.category_id ?? 'none'}
                    onValueChange={(v) => setForm(f => ({ ...f, category_id: v === 'none' ? null : v }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Категорія" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— без категорії —</SelectItem>
                {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={onCreateCategory}>+ Категорія</Button>
          </div>

          <input className="sm:col-span-2" type="file" accept="image/*"
                 onChange={(e) => setFile(e.target.files?.[0] || null)} />

          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={loading}>{form.id ? 'Оновити' : 'Створити'}</Button>
            {form.id && <Button type="button" variant="outline" onClick={resetForm}>Скасувати</Button>}
          </div>
        </form>

        {/* Таблиця товарів — прокрутка ~10 рядків */}
        <div className="mt-8 border rounded-lg overflow-hidden">
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-left sticky top-0 z-10">
                <tr>
                  <th className="p-2">Фото</th>
                  <th className="p-2">Назва</th>
                  <th className="p-2">Артикул</th>
                  <th className="p-2">Ціна</th>
                  <th className="p-2">Рейтинг</th>
                  <th className="p-2">Залишок</th>
                  <th className="p-2 text-right">Дії</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const img = p.product_images?.[0]?.path ? publicImageUrl(p.product_images[0].path) : ''
                  const stock = typeof (p as any).stock_qty === 'number' ? (p as any).stock_qty : 0
                  const inOrderQty = order.items?.[p.id]?.qty ?? 0
                  const canAdd = stock > inOrderQty
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-2">
                        {img ? <img src={img} className="h-12 w-16 rounded object-cover" /> : <div className="h-12 w-16 rounded bg-gray-200" />}
                      </td>
                      <td className="p-2"><div className="font-medium">{p.title}</div></td>
                      <td className="p-2">{p.sku ?? '-'}</td>
                      <td className="p-2">{moneyUA.format(p.price_cents / 100)}</td>
                      <td className="p-2">{p.rating ?? '-'}</td>
                      <td className="p-2">{stock}</td>
                      <td className="p-2 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            variant="secondary"
                            disabled={!canAdd}
                            title={canAdd ? 'Додати товар у замовлення' : stock === 0 ? 'Немає на складі' : `Вже додано максимум (${stock})`}
                            onClick={() => order.add({ id: p.id, title: p.title, price_cents: p.price_cents }, 1, stock)}
                          >
                            До замовлення
                          </Button>
                          <Button variant="outline" onClick={() => onEdit(p)}>Редагувати</Button>
                          <Button variant="ghost" onClick={() => onDelete(p.id)}>Видалити</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td className="p-6 text-center text-gray-500" colSpan={7}>Нічого не знайдено</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ====== Міні-таблиця замовлень (під товарами) ====== */}
        <div className="mt-10">
          <div className="mb-3 flex flex-wrap items-center gap-2 justify-between">
            <h2 className="text-lg font-semibold">Останні замовлення</h2>
            <div className="flex gap-2">
              <Input className="w-[220px]" placeholder="Пошук (ПІБ/телефон)" value={ordQ} onChange={(e) => setOrdQ(e.target.value)} />
              <Select value={ordStatus} onValueChange={(v:any)=>setOrdStatus(v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Статус" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Усі</SelectItem>
                  <SelectItem value="new">Нові</SelectItem>
                  <SelectItem value="processing">В обробці</SelectItem>
                  <SelectItem value="done">Виконані</SelectItem>
                  <SelectItem value="cancelled">Скасовані</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => fetchOrders(ordStatus)} disabled={ordersLoading}>
                {ordersLoading ? 'Оновлення…' : 'Оновити'}
              </Button>
              <Button onClick={() => navigate('/admin/orders')}>Всі замовлення →</Button>
            </div>
          </div>

          {ordersErr && (
            <div className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              Помилка: {ordersErr}
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left sticky top-0 z-10">
                  <tr>
                    <th className="p-2">Дата</th>
                    <th className="p-2">№</th>
                    <th className="p-2">Статус</th>
                    <th className="p-2">Клієнт</th>
                    <th className="p-2">Телефон</th>
                    <th className="p-2">Сума</th>
                  </tr>
                </thead>
                <tbody>
  {visibleOrders.map(o => (
    <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
      <td className="p-2">{new Date(o.created_at).toLocaleString('uk-UA')}</td>

      {/* № замовлення: спершу показуємо order_code (якщо бекенд повертає),
          інакше – короткий id як fallback */}
      <td className="p-2">{(o as any).order_code ?? o.id.slice(0, 8).toUpperCase()}</td>

      <td className="p-2">{o.status}</td>
      <td className="p-2">{o.customer_last_name} {o.customer_first_name}</td>
      <td className="p-2">{o.phone}</td>
      <td className="p-2">{moneyUA.format(o.total_cents/100)}</td>
    </tr>
  ))}

  {visibleOrders.length === 0 && !ordersLoading && (
    <tr>
      {/* у тебе 6 колонок у thead → colSpan має бути 6 */}
      <td className="p-6 text-center text-gray-500" colSpan={6}>
        Нічого не знайдено
      </td>
    </tr>
  )}
</tbody>

              </table>
            </div>
          </div>
        </div>

        {/* Панель зібраного замовлення адміністратора */}
        <AdminOrderPanel />
      </div>
    </RequireAdmin>
  )
}
