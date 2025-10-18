
export type Product = {
  id: string
  title: string
  price: number
  category?: string
  rating?: number | null
  image?: string
  tags?: string[]
}
