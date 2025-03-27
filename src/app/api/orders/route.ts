// app/api/orders/route.ts
import { NextResponse } from 'next/server'
import { searchOrders, OrderSortOption } from '@/lib/db/order.search.engine'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // Extraction des paramètres
  const filters = {
    status: searchParams.get('status')?.split(','),
    paymentStatus: searchParams.get('paymentStatus')?.split(','),
    userId: searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined,
    // ... autres filtres
  }

  const sort = searchParams.get('sort') as OrderSortOption || 'newest'
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
  const perPage = searchParams.get('perPage') ? parseInt(searchParams.get('perPage')!) : 10

  try {
    const results = await searchOrders({ filters, sort, pagination: { page, perPage } })
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}