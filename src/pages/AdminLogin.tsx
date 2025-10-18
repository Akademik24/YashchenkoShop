import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminLogin(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
  e.preventDefault()
  setMsg(null)

  // 1) логін
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signErr) { setMsg(signErr.message); return }

  // 2) отримати user
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) { setMsg('Не вдалося отримати користувача'); return }

  // 3) ПРОБА №1 — прочитати свій профіль (із RLS фільтром по id)
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // 4) Якщо профілю немає — створюємо (разово робимо цього юзера адміном)
  if (!profile) {
    const { error: upErr } = await supabase
      .from('profiles')
      .upsert({ id: user.id, role: 'admin' })   // 👈 робимо перший профіль — адміністратором
    if (upErr) { setMsg('Помилка створення профілю: ' + upErr.message); return }
  }

  // 5) ПРОБА №2 — читаємо знову (має бути role=admin)
  const { data: profile2, error: p2Err } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (p2Err) { setMsg('Помилка читання профілю: ' + p2Err.message); return }
  if (profile2?.role !== 'admin') {
    setMsg('Немає прав адміністратора'); 
    await supabase.auth.signOut(); 
    return
  }

  // 6) усе ок — йдемо в адмінку
  window.location.href = '/admin/products'
}



  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-2xl font-bold">Вхід адміністратора</h1>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <input className="w-full rounded border px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="Пароль" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full rounded bg-black px-4 py-2 text-white">Увійти</button>
        {msg && <div className="text-sm text-red-600">{msg}</div>}
      </form>
    </div>
  )
}
