import { supabase } from './supabase'

/* -------------------------------------------------
 * Тип моделі продукту з БД
 * ------------------------------------------------- */
export type DbProduct = {
  id: string
  title: string
  slug: string
  sku?: string
  price_cents: number
  category_id: string | null
  rating?: number
  is_active?: boolean
  stock_qty?: number
  created_at?: string
  description?: string | null
  product_images?: { path: string }[]
}

/* -------------------------------------------------
 * Завантаження списку товарів з фільтрами, пошуком, сортуванням
 * ------------------------------------------------- */
export async function listProducts({
  q,
  sort = 'created_desc',
  onlyActive = false,
}: {
  q?: string
  sort?: string
  onlyActive?: boolean
}) {
  let query = supabase
    .from('products')
    .select(`
      id, title, slug, sku,
      price_cents, rating, is_active, category_id,stock_qty,
      description, 
      product_images ( path )
    `)

  // 🔍 Пошук по назві, slug і артикулу (SKU)
  if (q && q.trim()) {
    const text = q.trim()
    query = query.or(
      `title.ilike.%${text}%,slug.ilike.%${text}%,sku.ilike.%${text}%`
    )
  }

  if (onlyActive) query = query.eq('is_active', true)

  switch (sort) {
    case 'price_asc':
      query = query.order('price_cents', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price_cents', { ascending: false })
      break
    case 'rating_desc':
      query = query.order('rating', { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/* -------------------------------------------------
 * Гарантує унікальність slug (для уникнення дублювань)
 * ------------------------------------------------- */
export async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const prefix = base.trim()
  if (!prefix) return ''

  // Шукаємо усі товари, slug яких починається з base
  const { data, error } = await supabase
    .from('products')
    .select('id, slug')
    .ilike('slug', `${prefix}%`)

  if (error) throw error

  const taken = new Set(
    (data || [])
      .filter(p => !excludeId || p.id !== excludeId)
      .map(p => p.slug)
  )

  // Якщо базовий slug вільний
  if (!taken.has(prefix)) return prefix

  // Додаємо суфікси -2, -3, ...
  for (let i = 2; i < 10000; i++) {
    const candidate = `${prefix}-${i}`
    if (!taken.has(candidate)) return candidate
  }

  // fallback (на крайній випадок)
  return `${prefix}-${Date.now()}`
}

/* -------------------------------------------------
 * Створення / оновлення товару
 * ------------------------------------------------- */
export async function upsertProduct(p: Partial<DbProduct> & {
  title: string
  slug: string
  price_cents: number
}) {
  const { data, error } = await supabase
    .from('products')
    .upsert(p)
    .select()
    .single()
  if (error) throw error
  return data as DbProduct
}

/* -------------------------------------------------
 * Видалення товару
 * ------------------------------------------------- */
export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

/* -------------------------------------------------
 * Завантаження зображення товару
 * ------------------------------------------------- */
export async function uploadProductImage(file: File, productId: string) {
  const fileName = `${productId}/${Date.now()}_${file.name}`
  const { error } = await supabase
    .storage
    .from('product-images')
    .upload(fileName, file)

  if (error) throw error

  const { data, error: e2 } = await supabase
    .from('product_images')
    .insert({ product_id: productId, path: fileName })
    .select()
    .single()

  if (e2) throw e2
  return data
}

/* -------------------------------------------------
 * Отримання публічного URL для зображення
 * ------------------------------------------------- */
export function publicImageUrl(path: string) {
  return supabase
    .storage
    .from('product-images')
    .getPublicUrl(path)
    .data
    .publicUrl
}
// === ПУБЛІЧНИЙ ЛІСТИНГ ДЛЯ ВІТРИНи ===
export type PublicProduct = {
  id: string
  title: string
  price: number
  rating?: number | null
  category?: string
  image?: string
  stock_qty?: number | null
}



export async function listProductsPublic(opts?: {
  q?: string
  category_id?: string | 'all'
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating_desc'
}): Promise<PublicProduct[]> {
  const { q, category_id, sort = 'newest' } = opts ?? {}

  let query = supabase
    .from('products')
    .select(`
      id,
      title,
      price_cents,
      rating,
      is_active,
      category_id,
      sku,
      stock_qty,
      product_images ( path )
    `)
    .eq('is_active', true)

  // фільтр за категорією
  if (category_id && category_id !== 'all') {
    query = query.eq('category_id', category_id)
  }

  // пошук: назва / sku / slug
  if (q && q.trim()) {
    const s = q.trim()
    // якщо хочеш прибрати slug з пошуку — видали slug.ilike... з рядка нижче
    query = query.or(`title.ilike.%${s}%,sku.ilike.%${s}%,slug.ilike.%${s}%`)
  }

  // сортування
  switch (sort) {
    case 'price_asc':
      query = query.order('price_cents', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price_cents', { ascending: false })
      break
    case 'rating_desc':
      query = query.order('rating', { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  // ліміт для сторінки
  query = query.limit(48)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((p: any) => {
    const firstImagePath: string | undefined = Array.isArray(p.product_images) && p.product_images.length > 0
      ? p.product_images[0]?.path
      : undefined

    return {
      id: p.id,
      title: p.title,
      price: Math.round((p.price_cents ?? 0) / 100),
      rating: p.rating ?? null,
      category_id: p.category_id ?? null,
      sku: p.sku ?? null,
      stock_qty: typeof p.stock_qty === 'number' ? p.stock_qty : 0,
      image: firstImagePath ? publicImageUrl(firstImagePath) : undefined,
    } as PublicProduct
  })
}

// Тип для детальної сторінки
export type PublicProductDetails = {
  id: string
  title: string
  price: number
  rating?: number | null
  sku?: string | null
  stock_qty?: number | null
  category_id?: string | null
  images: string[] // вже з публічними URL
  description?: string | null
}

// Завантажити товар за id (для простоти використовуємо id)
export async function getProductPublic(id: string): Promise<PublicProductDetails | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, title, price_cents, rating, sku, stock_qty, category_id, description,
      product_images ( path )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }

  const images = (data?.product_images ?? [])
    .map((pi: any) => pi?.path)
    .filter(Boolean)
    .map((path: string) => publicImageUrl(path))

  return {
    id: data.id,
    title: data.title,
    price: Math.round((data.price_cents ?? 0) / 100),
    rating: data.rating ?? null,
    sku: data.sku ?? null,
    stock_qty: data.stock_qty ?? null,
    category_id: data.category_id ?? null,
    description: data.description ?? null,
    images,
  }
}
