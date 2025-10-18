import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card' // якщо немає shadcn, заміни на свій div-верстку
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import type { Product } from '@/types/product'
import { moneyUA } from '@/lib/money'

type Props = { p: Product; onAdd: () => void }

export default function ProductCard({ p, onAdd }: Props) {
  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm">
      <div className="relative aspect-[3/2] w-full bg-gray-100">
        <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
        <div className="absolute right-2 top-2 flex gap-1">
          {p.tags?.map(t => <Badge key={t} className="backdrop-blur bg-white/80">{t}</Badge>)}
        </div>
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{p.title}</CardTitle>
        <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
          <Star className="h-4 w-4" /> {p.rating} <span className="text-gray-400">•</span> {p.category}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-lg font-semibold">{moneyUA.format(p.price)}</div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={onAdd}>Додати в кошик</Button>
      </CardFooter>
    </Card>
  )
}
