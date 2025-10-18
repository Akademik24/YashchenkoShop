import { supabase } from '@/lib/supabase'

export type Category = { id: string; name: string; slug: string }

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id,name,slug')
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function ensureCategoryByName(name: string): Promise<Category> {
  if (!name.trim()) throw new Error('Назва категорії порожня')
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { data, error } = await supabase
    .from('categories')
    .upsert({ name, slug })
    .select()
    .single()
  if (error) throw error
  return data
}
