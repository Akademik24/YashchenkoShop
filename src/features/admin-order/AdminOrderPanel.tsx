// src/features/admin-order/AdminOrderPanel.tsx
import { useState } from 'react'
import { moneyUA } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useAdminOrder } from '@/features/admin-order/adminOrder.store'
import { createAdminOrder } from '@/lib/orders'

function isValidUaPhone(p: string) {
  return (/^\+?380\d{9}$/).test(p) || (/^0\d{9}$/).test(p)
}

export default function AdminOrderPanel() {
  const { items, inc, dec, remove, clear, totalCents } = useAdminOrder()
  const list = Object.values(items)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // форма
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [patronymic, setPatronymic] = useState('')
  const [phone, setPhone] = useState('')
  const [delivery, setDelivery] = useState<'ukrposhta'|'novaposhta'|''>('')
  const [city, setCity] = useState('')
  const [branch, setBranch] = useState('')

  // ⬇️ для швидкої діагностики
  // console.log('[AdminOrderPanel] items', list)

  if (list.length === 0) return null

  const total = totalCents() / 100
  const disabledSubmit =
    list.length === 0 ||
    !lastName.trim() ||
    !firstName.trim() ||
    !isValidUaPhone(phone.trim()) ||
    (delivery !== 'ukrposhta' && delivery !== 'novaposhta') ||
    !city.trim() ||
    !branch.trim()

  async function onCreate() {
    setErr(null)
    setSaving(true)
    try {
      const payload = {
        customer_last_name: lastName.trim(),
        customer_first_name: firstName.trim(),
        customer_patronymic: patronymic.trim() || undefined,
        phone: phone.trim(),
        delivery_method: delivery as 'ukrposhta'|'novaposhta',
        delivery_data: { city: city.trim(), branch: branch.trim() },
        items: list.map(i => ({
          product_id: i.id,
          title: i.title,
          price_cents: i.price_cents,
          qty: i.qty,
        })),
      }
      await createAdminOrder(payload)
      clear()
      alert('Замовлення створено')
    } catch (e: any) {
      setErr(e?.message || 'Не вдалося створити замовлення')
    } finally {
      setSaving(false)
    }
  }

  return (
     <div className="fixed bottom-4 right-4 z-50 w-[380px] rounded-2xl border bg-white shadow-xl">

      <div className="p-3 border-b font-medium">Замовлення (адмін)</div>

      {/* Список позицій */}
      <div className="max-h-[240px] overflow-auto p-3 space-y-2">
        {list.map(i => {
          const atMax = typeof i.max_qty === 'number' && i.qty >= i.max_qty
          return (
            <div key={i.id} className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{i.title}</div>
                <div className="text-xs text-gray-500">
                  {moneyUA.format(i.price_cents / 100)}
                  {typeof i.max_qty === 'number' && <> · макс {i.max_qty}</>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => dec(i.id)}>-</Button>
                <div className="w-7 text-center select-none">{i.qty}</div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={atMax}
                  title={atMax ? 'Досягнуто максимальної кількості' : 'Додати ще 1'}
                  onClick={() => inc(i.id)}
                >
                  +
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(i.id)}>✕</Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Форма покупця */}
      <div className="p-3 border-t space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Прізвище" value={lastName} onChange={e=>setLastName(e.target.value)} />
          <Input placeholder="Імʼя" value={firstName} onChange={e=>setFirstName(e.target.value)} />
          <Input className="col-span-2" placeholder="По-батькові (необовʼязково)" value={patronymic} onChange={e=>setPatronymic(e.target.value)} />
        </div>

        <Input placeholder="Телефон" value={phone} onChange={e=>setPhone(e.target.value)} />

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

      {/* Підвал панелі */}
      <div className="flex items-center justify-between p-3 border-t">
        <div className="font-semibold">{moneyUA.format(total)}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clear}>Очистити</Button>
          <Button disabled={disabledSubmit || saving} onClick={onCreate}>
            {saving ? 'Створення…' : 'Створити'}
          </Button>
        </div>
      </div>
    </div>
  )
}
