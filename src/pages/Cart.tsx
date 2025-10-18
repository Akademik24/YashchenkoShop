import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '@/features/cart/cart.store'
import { moneyUA } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue
} from '@/components/ui/select'
import { createPublicOrder } from '@/lib/orders'

function isValidUaPhone(p: string) {
  const s = p.replace(/\s+/g, '')
  return /^\+?380\d{9}$/.test(s) || /^0\d{9}$/.test(s)
}
const normPhone = (p: string) => p.replace(/\s+/g, '')

export default function Cart() {
  const navigate = useNavigate()
  const { items, inc, dec, remove, clear, totalCents } = useCart()
  const list = Object.values(items)
  const total = totalCents() / 100

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // форма покупця
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [patronymic, setPatronymic] = useState('')
  const [phone, setPhone] = useState('')
  const [delivery, setDelivery] = useState<'ukrposhta'|'novaposhta'|''>('')
  const [city, setCity] = useState('')
  const [branch, setBranch] = useState('')

  const phoneOk = isValidUaPhone(phone)
  const canSubmit =
    list.length > 0 &&
    !!lastName.trim() &&
    !!firstName.trim() &&
    phoneOk &&
    (delivery === 'ukrposhta' || delivery === 'novaposhta') &&
    !!city.trim() &&
    !!branch.trim()

  async function onCheckout() {
    if (!canSubmit || saving) return
    setErr(null); setSaving(true)
    try {
      const payload = {
        customer_last_name: lastName.trim(),
        customer_first_name: firstName.trim(),
        customer_patronymic: patronymic.trim() || undefined,
        phone: normPhone(phone),
        delivery_method: delivery as 'ukrposhta'|'novaposhta',
        delivery_data: { city: city.trim(), branch: branch.trim() },
        items: list.map(i => ({
          product_id: i.id,
          title: i.title,
          price_cents: i.price_cents,
          qty: i.qty,
        })),
      }

      // має повертатись { code: string }
      const { code } = await createPublicOrder(payload)

      clear()
      navigate(`/order/success?code=${encodeURIComponent(code)}`)
    } catch (e: any) {
      setErr(e?.message || 'Не вдалося відправити замовлення')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Кошик</h1>

      {/* Таблиця кошика */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left sticky top-0 z-10">
              <tr>
                <th className="p-2">Товар</th>
                <th className="p-2">Ціна</th>
                <th className="p-2">К-сть</th>
                <th className="p-2">Сума</th>
                <th className="p-2 text-right">Дії</th>
              </tr>
            </thead>
            <tbody>
              {list.map(i => {
                const atMax = typeof i.max_qty === 'number' && i.qty >= i.max_qty
                return (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="p-2">
                      <div className="font-medium">{i.title}</div>
                      {typeof i.max_qty === 'number' && (
                        <div className="text-xs text-gray-500">На складі: {i.max_qty}</div>
                      )}
                    </td>
                    <td className="p-2">{moneyUA.format(i.price_cents/100)}</td>
                    <td className="p-2">
                      <div className="inline-flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => dec(i.id)}>-</Button>
                        <div className="w-8 text-center">{i.qty}</div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => inc(i.id)}
                          disabled={atMax}
                          title={atMax ? 'Немає більше на складі' : ''}
                        >
                          +
                        </Button>
                      </div>
                    </td>
                    <td className="p-2">{moneyUA.format((i.price_cents*i.qty)/100)}</td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => remove(i.id)}>Видалити</Button>
                    </td>
                  </tr>
                )
              })}
              {list.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">Кошик порожній</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Підсумок + форма */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Прізвище" value={lastName} onChange={e=>setLastName(e.target.value)} />
            <Input placeholder="Імʼя" value={firstName} onChange={e=>setFirstName(e.target.value)} />
            <Input className="col-span-2" placeholder="По-батькові (необовʼязково)" value={patronymic} onChange={e=>setPatronymic(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Input placeholder="Телефон" value={phone} onChange={e=>setPhone(e.target.value)} />
            {!phoneOk && phone.trim() !== '' && (
              <div className="text-xs text-red-600">Введіть номер у форматі +380XXXXXXXXX або 0XXXXXXXXX</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={delivery} onValueChange={(v:any)=>setDelivery(v)}>
              <SelectTrigger><SelectValue placeholder="Форма доставки" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ukrposhta">Укрпошта</SelectItem>
                <SelectItem value="novaposhta">Нова пошта</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Місто" value={city} onChange={e=>setCity(e.target.value)} />
            <Input className="col-span-2" placeholder="Відділення / індекс" value={branch} onChange={e=>setBranch(e.target.value)} />
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}
        </div>

        <div className="h-fit rounded-xl border p-4">
          <div className="mb-3 text-sm text-gray-500">Разом до оплати</div>
          <div className="text-2xl font-semibold">{moneyUA.format(total)}</div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" onClick={clear} disabled={list.length === 0 || saving}>Очистити</Button>
            <Button onClick={onCheckout} disabled={!canSubmit || saving}>
              {saving ? 'Надсилаємо…' : 'Оформити замовлення'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
