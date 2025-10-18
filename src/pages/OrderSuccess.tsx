// src/pages/OrderSuccess.tsx
import { useSearchParams, Link } from 'react-router-dom'

export default function OrderSuccess() {
  const [sp] = useSearchParams()
  const code = sp.get('code') || '—'
  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <h1 className="text-2xl font-bold mb-2">Дякуємо за замовлення!</h1>
      <p className="text-gray-600 mb-6">Номер вашого замовлення: <b>{code}</b></p>
      <Link to="/" className="underline">Повернутися на головну</Link>
    </div>
  )
}
