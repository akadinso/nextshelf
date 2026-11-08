'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/format'

// Every action re-checks admin: server actions are public endpoints.

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

function parseProduct(fd: FormData) {
  const compare = parseFloat(String(fd.get('compare_at') ?? ''))
  return {
    name: String(fd.get('name') ?? '').trim(),
    description: String(fd.get('description') ?? '').trim() || null,
    price_cents: Math.round(parseFloat(String(fd.get('price') ?? '')) * 100),
    compare_at_price_cents: Number.isFinite(compare) ? Math.round(compare * 100) : null,
    sku: String(fd.get('sku') ?? '').trim() || null,
    stock_quantity: Math.max(0, parseInt(String(fd.get('stock') ?? '0'), 10) || 0),
    category_id: String(fd.get('category_id') ?? '') || null,
    tags: String(fd.get('tags') ?? '').split(',').map((t) => slugify(t)).filter(Boolean),
    is_featured: fd.get('is_featured') === 'on',
    is_active: fd.get('is_active') === 'on',
  }
}

async function uploadImages(files: FormDataEntryValue[]) {
  const urls: string[] = []
  for (const f of files) {
    if (!(f instanceof File) || f.size === 0) continue
    if (!f.type.startsWith('image/') || f.size > 5 * 1024 * 1024) continue
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(path, f, { contentType: f.type })
    if (error) throw new Error(error.message)
    urls.push(supabaseAdmin.storage.from('product-images').getPublicUrl(path).data.publicUrl)
  }
  return urls
}

export async function createProduct(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const p = parseProduct(formData)
  if (!p.name || !Number.isFinite(p.price_cents) || p.price_cents < 0) {
    fail('/admin/products/new', 'Name and a valid price are required.')
  }

  const images = await uploadImages(formData.getAll('images'))
  const slug = slugify(p.name)

  let res = await supabase.from('products').insert({ ...p, slug, images }).select('id').single()
  if (res.error?.code === '23505') {
    const suffix = Math.random().toString(36).slice(2, 6)
    res = await supabase.from('products').insert({ ...p, slug: `${slug}-${suffix}`, images }).select('id').single()
  }
  if (res.error || !res.data) fail('/admin/products/new', res.error?.message ?? 'Could not create product.')

  revalidatePath('/', 'layout')
  redirect(`/admin/products/${res.data.id}?saved=1`)
}

export async function updateProduct(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const back = `/admin/products/${id}`
  const p = parseProduct(formData)
  if (!p.name || !Number.isFinite(p.price_cents) || p.price_cents < 0) {
    fail(back, 'Name and a valid price are required.')
  }

  const { data: existing } = await supabase.from('products').select('images').eq('id', id).single()
  const removed = new Set(formData.getAll('remove_image').map(String))
  const kept = ((existing?.images ?? []) as string[]).filter((u) => !removed.has(u))
  const added = await uploadImages(formData.getAll('images'))

  const { error } = await supabase
    .from('products')
    .update({ ...p, images: [...kept, ...added] })
    .eq('id', id)
  if (error) fail(back, error.message)

  revalidatePath('/', 'layout')
  redirect(`${back}?saved=1`)
}

export async function addVariant(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const productId = String(formData.get('productId') ?? '')
  const price = parseFloat(String(formData.get('price') ?? ''))
  const name = String(formData.get('name') ?? '').trim()
  if (!name) fail(`/admin/products/${productId}`, 'Variant name is required.')

  const { error } = await supabase.from('product_variants').insert({
    product_id: productId,
    name,
    stock_quantity: Math.max(0, parseInt(String(formData.get('stock') ?? '0'), 10) || 0),
    price_cents: Number.isFinite(price) ? Math.round(price * 100) : null,
  })
  if (error) fail(`/admin/products/${productId}`, error.message)

  revalidatePath('/', 'layout')
  redirect(`/admin/products/${productId}?saved=1`)
}

export async function updateVariant(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const productId = String(formData.get('productId') ?? '')
  const price = parseFloat(String(formData.get('price') ?? ''))
  await supabase
    .from('product_variants')
    .update({
      stock_quantity: Math.max(0, parseInt(String(formData.get('stock') ?? '0'), 10) || 0),
      price_cents: Number.isFinite(price) ? Math.round(price * 100) : null,
    })
    .eq('id', String(formData.get('id') ?? ''))
  revalidatePath('/', 'layout')
  redirect(`/admin/products/${productId}?saved=1`)
}

export async function deleteVariant(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const productId = String(formData.get('productId') ?? '')
  await supabase.from('product_variants').delete().eq('id', String(formData.get('id') ?? ''))
  revalidatePath('/', 'layout')
  redirect(`/admin/products/${productId}?saved=1`)
}

export async function createCategory(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) fail('/admin/categories', 'Category name is required.')

  const { error } = await supabase.from('categories').insert({
    name,
    slug: slugify(name),
    parent_id: String(formData.get('parent_id') ?? '') || null,
  })
  if (error) fail('/admin/categories', error.message)

  revalidatePath('/', 'layout')
  redirect('/admin/categories')
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('categories').delete().eq('id', String(formData.get('id') ?? ''))
  revalidatePath('/', 'layout')
  redirect('/admin/categories')
}

const FULFILMENT = ['processing', 'shipped', 'delivered']

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!FULFILMENT.includes(status)) return

  // only move orders that are already paid
  await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .in('status', ['paid', 'processing', 'shipped', 'delivered'])

  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}
