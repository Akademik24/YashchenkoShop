import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom' // ⬅️ додали useNavigate для редіректу
import { listProductsPublic, type PublicProduct } from '@/lib/products'
import { listCategories, type Category } from '@/lib/categories'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { moneyUA } from '@/lib/money'
import { useCart } from '@/features/cart/cart.store'

export default function Shop() {
  const [items, setItems] = useState<PublicProduct[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // UI стани
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'all' | string>('all')
  const [sort, setSort] = useState<'newest'|'price_asc'|'price_desc'|'rating_desc'>('newest')

  // Кошик
  const addToCart = useCart(s => s.add)

  // Для навігації (редіректів)
  const navigate = useNavigate()

  // 🔐 “Бекдор” для адміна через пошук:
  // Якщо в поле пошуку ввести спец-комбінацію (наприклад, "::admin"),
  // то виконається миттєвий редірект на сторінку адмінки.
  // ⚠️ Можеш змінити SECRET_COMBO або маршрут нижче на що завгодно.
  useEffect(() => {
    const SECRET_COMBO = '::admin'       // тут задається “секретна” комбінація
    const trimmed = q.trim().toLowerCase()

    if (trimmed === SECRET_COMBO) {
      setQ('')                           // очищаємо поле, щоб не підсвічувалось
      navigate('/admin/login')           // сюди перекидає (можна замінити на /admin/products)
    }
  }, [q, navigate])

  async function load() {
    setErr(null); setLoading(true)
    try {
      const [ps, cs] = await Promise.all([
        listProductsPublic({ q, category_id: cat, sort }),
        listCategories(),
      ])
      setItems(ps)
      setCats(cs)
    } catch (e:any) {
      setErr(e?.message || 'Load failed')
    } finally { setLoading(false) }
  }

  // Підвантаження при зміні фільтрів/пошуку/сортування
  useEffect(() => { load() /* eslint-disable-next-line */ }, [q, cat, sort])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Каталог</h1>

      {/* Фільтри */}
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr,200px,200px]">
        <Input
          placeholder="Пошук товарів (назва/артикул)…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />

        <Select value={cat} onValueChange={(v)=>setCat(v as any)}>
          <SelectTrigger><SelectValue placeholder="Категорія" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі категорії</SelectItem>
            {cats.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v)=>setSort(v as any)}>
          <SelectTrigger><SelectValue placeholder="Сортування" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Спершу нові</SelectItem>
            <SelectItem value="price_asc">Ціна ↑</SelectItem>
            <SelectItem value="price_desc">Ціна ↓</SelectItem>
            <SelectItem value="rating_desc">Рейтинг</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {err && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Помилка: {err}
        </div>
      )}

      {/* Список товарів */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(p => {
          // Визначаємо наявність: якщо stock_qty === 0, показуємо бейдж і блокуємо кнопку
          const stockRaw = (p as any).stock_qty
          const outOfStock = typeof stockRaw === 'number' ? stockRaw <= 0 : false

          return (
            <Card key={p.id} className="overflow-hidden relative">
              {/* Бейдж “Немає в наявності” */}
              {outOfStock && (
                <div className="absolute left-2 top-2 z-10 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                  Немає в наявності
                </div>
              )}

              {/* Робимо лінком тільки зображення */}
              <Link to={`/product/${p.id}`} className="block">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.title}
                    className={`h-44 w-full object-cover ${outOfStock ? 'opacity-60' : ''}`}
                  />
                ) : (
                  <div className={`h-44 w-full bg-gray-200 ${outOfStock ? 'opacity-60' : ''}`} />
                )}
              </Link>

              <div className="space-y-2 p-4">
                {/* Заголовок — теж лінк */}
                <Link to={`/product/${p.id}`} className="line-clamp-2 font-medium block">
                  {p.title}
                </Link>

                <div className="text-sm text-gray-500">
                  {typeof p.rating === 'number' ? `★ ${p.rating.toFixed(1)}` : '—'}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{moneyUA.format(p.price)}</div>

                  {/* Кнопка додавання у кошик — окремо від Link, щоб не переходило на деталі */}
                  <Button
                    type="button"
                    variant={outOfStock ? 'ghost' : 'outline'}
                    disabled={outOfStock}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (outOfStock) return
                      addToCart({ id: p.id, title: p.title, price_cents: p.price * 100 }, 1)
                    }}
                  >
                    {outOfStock ? 'Немає' : 'У кошик'}
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {!loading && items.length === 0 && (
        <div className="py-16 text-center text-gray-500">Нічого не знайдено</div>
      )}
    </div>
  )
}
