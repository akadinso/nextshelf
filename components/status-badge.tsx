import { Badge } from '@/components/ui/badge'
import type { Order } from '@/lib/types'

const VARIANT: Record<Order['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  paid: 'default',
  processing: 'default',
  shipped: 'secondary',
  delivered: 'secondary',
  cancelled: 'destructive',
  refunded: 'destructive',
}

export default function StatusBadge({ status }: { status: Order['status'] }) {
  return (
    <Badge variant={VARIANT[status]} className="capitalize">
      {status}
    </Badge>
  )
}
