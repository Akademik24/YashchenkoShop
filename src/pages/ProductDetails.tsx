import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProductPublic, type PublicProductDetails } from '@/lib/products'
import { moneyUA } from '@/lib/money'
import { Button } from '@/components/ui/button'
// якщо є ваш публічний кошик: 
// import { useCart } from '@/features/cart/cart.store'

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<PublicProductDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  // const cart = useCart()

  useEffect(() => {
    (async () => {
      if (!id) return
      try {
        setErr(null); setLoading(true)
        const p = await getProductPublic(id)
        setItem(p)
      } catch (e: any) {
        setErr(e?.message || 'Load failed')
      } finally { setLoading(false) }
    })()
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-6 w-40 rounded bg-gray-200" />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="h-[360px] rounded bg-gray-100" />
          <div className="space-y-3">
            <div className="h-6 w-60 rounded bg-gray-200" />
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="h-24 w-full rounded bg-gray-100" />
          </div>
        </div>
      </div>
    )
  }

  if (err || !item) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4">
          <Link to="/" className="text-blue-600 hover:underline">← На головну</Link>
        </div>
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {err ?? 'Товар не знайдено'}
        </div>
      </div>
    )
  }

  const mainImg = item.images[0] || 'https://placehold.co/600x400?text=No+Image'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4">
        <Link to="/" className="text-blue-600 hover:underline">← На головну</Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Головне фото + маленькі превʼю */}
        <div>
          <img src={mainImg} alt={item.title} className="w-full rounded-2xl object-cover" />
          {item.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {item.images.slice(0, 6).map((src, i) => (
                <img key={i} src={src} className="h-16 w-20 rounded object-cover" />
              ))}
            </div>
          )}
        </div>

        {/* Інфо */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          <div className="text-3xl font-bold">{moneyUA.format(item.price)}</div>
          <div className="text-sm text-gray-600">
            {item.rating ? `Рейтинг: ${item.rating} ★` : 'Без рейтингу'}
            {item.sku && <> · SKU: {item.sku}</>}
            {typeof item.stock_qty === 'number' && <> · Залишок: {item.stock_qty}</>}
          </div>

          {item.description && (
            <div className="prose max-w-none">
              <p>{item.description}</p>
            </div>
          )}

          <div className="pt-2">
            <Button
              size="lg"
              disabled={typeof item.stock_qty === 'number' && item.stock_qty <= 0}
              onClick={() => {
                // якщо є ваш публічний кошик — використай його тут
                // cart.add({ id: item.id, title: item.title, price_cents: item.price*100 })
                alert('TODO: додати до кошика')
              }}
            >
              {typeof item.stock_qty === 'number' && item.stock_qty <= 0
                ? 'Немає в наявності'
                : 'Додати в кошик'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
