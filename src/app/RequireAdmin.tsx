import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setOk(false)
        setLoading(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      console.log('PROFILE:', profile, 'ERROR:', error)

      if (profile?.role === 'admin') setOk(true)
      setLoading(false)
    }
    check()
  }, [])

  if (loading) return <div className="p-8">Завантаження...</div>
  if (!ok) return <div className="p-8 text-red-600">❌ Немає прав адміністратора</div>
  return <>{children}</>
}
