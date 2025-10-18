// src/lib/orders.ts
import { supabase } from '@/lib/supabase'

/* ======================== Типи ======================== */

export type AdminOrderItemInput = {
  product_id: string
  title: string
  price_cents: number
  qty: number
}

export type CreateAdminOrderInput = {
  customer_last_name: string
  customer_first_name: string
  customer_patronymic?: string
  phone: string
  delivery_method: 'ukrposhta' | 'novaposhta'
  delivery_data: { city: string; branch: string }
  items: AdminOrderItemInput[]
}

export type DbOrder = {
  id: string
  created_at: string
  status: 'new' | 'processing' | 'done' | 'cancelled'
  customer_last_name: string
  customer_first_name: string
  customer_patronymic?: string | null
  phone: string
  delivery_method: 'ukrposhta' | 'novaposhta'
  delivery_data: any
  total_cents: number
}

export type DbOrderWithItems = DbOrder & {
  order_items: {
    id: number
    product_id: string
    title: string
    price_cents: number
    qty: number
  }[]
}

export type PublicOrderItem = {
  product_id: string
  title: string
  price_cents: number
  qty: number
}

export type CreatePublicOrderInput = {
  customer_last_name: string
  customer_first_name: string
  customer_patronymic?: string
  phone: string
  delivery_method: 'ukrposhta' | 'novaposhta'
  delivery_data: { city: string; branch: string }
  items: PublicOrderItem[]
}

/* ==================== Helpers ==================== */

const normPhone = (p: string) => p.replace(/\s+/g, '')

/* ================== Admin Orders ================== */

// Викликаємо саме admin_create_order з тими ж іменами параметрів, що в SQL
export async function createAdminOrder(payload: CreateAdminOrderInput) {
  const { data, error } = await supabase.rpc('admin_create_order', {
    p_last_name: payload.customer_last_name,
    p_first_name: payload.customer_first_name,
    p_patronymic: payload.customer_patronymic ?? '',
    p_phone: normPhone(payload.phone),
    p_delivery_method: payload.delivery_method, // ENUM у БД (orders_delivery_method)
    p_delivery_data: payload.delivery_data,     // jsonb
    p_items: payload.items,                     // jsonb[]
  })
  if (error) throw error
  // очікуємо, що функція повертає order_id (uuid)
  return data as string
}

export async function listOrders(opts?: { status?: DbOrder['status'] | 'all' }) {
  let q = supabase
    .from('orders')
    .select(
      'id, created_at, status, customer_last_name, customer_first_name, phone, total_cents'
    )
    .order('created_at', { ascending: false })

  if (opts?.status && opts.status !== 'all') {
    q = q.eq('status', opts.status)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as DbOrder[]
}

export async function getOrder(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, created_at, status, customer_last_name, customer_first_name, customer_patronymic, phone,
      delivery_method, delivery_data, total_cents,
      order_items ( id, product_id, title, price_cents, qty )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as DbOrderWithItems
}

export async function updateOrderStatus(id: string, status: DbOrder['status']) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

/* ================== Public Orders ================== */

/**
 * Викликає RPC create_public_order та повертає:
 * { id: string; code: string }
 * де code — людський номер замовлення (наприклад, ORD-2024-000123)
 */
export async function createPublicOrder(payload: CreatePublicOrderInput) {
  const { data, error } = await supabase.rpc('create_public_order', {
    p_customer_last_name: payload.customer_last_name,
    p_customer_first_name: payload.customer_first_name,
    p_customer_patronymic: payload.customer_patronymic ?? '',
    p_phone: normPhone(payload.phone),
    p_delivery_method: payload.delivery_method, // ENUM orders_delivery_method
    p_delivery_data: payload.delivery_data,     // jsonb
    p_items: payload.items,                     // jsonb[]
  })

  if (error) {
    // трошки дружелюбніші повідомлення
    if (error.message?.toLowerCase().includes('forbidden')) {
      throw new Error('Операція заборонена політиками доступу (RLS).')
    }
    throw error
  }

  // API Supabase для RPC може віддати:
  // 1) один об'єкт; 2) масив з одним об'єктом; 3) null при помилці
  const row: any = Array.isArray(data) ? data[0] : data
  if (!row || (!row.order_id && !row.id)) {
    throw new Error('Сервер не повернув ідентифікатор замовлення.')
  }

  const id = row.order_id ?? row.id
  const code = row.order_code ?? row.code
  if (!code) {
    // якщо код не повернули — все одно повернемо id
    return { id: String(id), code: String(id) }
  }
  return { id: String(id), code: String(code) }
}

/**
 * Утиліта: отримати замовлення за його публічним кодом (якщо маєш такий індекс/представлення).
 * Опціонально — якщо реалізуєш у БД представлення orders_by_code (або колонку code).
 */
export async function getOrderByCode(code: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, created_at, status, customer_last_name, customer_first_name, customer_patronymic, phone,
      delivery_method, delivery_data, total_cents,
      order_items ( id, product_id, title, price_cents, qty )
    `)
    .eq('code', code)
    .single()

  if (error) throw error
  return data as DbOrderWithItems
}
