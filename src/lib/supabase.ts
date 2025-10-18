import { createClient } from '@supabase/supabase-js'

// ✅ беремо налаштування з .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Помилка: немає змінних середовища для Supabase')
}

// ✅ створюємо клієнт
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // зберігає сесію після перезавантаження
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// --- 🔍 Тест логів при запуску ---
;(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('🔑 Поточний користувач:', user)

    if (user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (error) console.error('❌ Помилка отримання профілю:', error)
      else console.log('👤 Профіль користувача:', profile)
    }
  } catch (err) {
    console.error('⚠️ Помилка ініціалізації Supabase:', err)
  }
})()
