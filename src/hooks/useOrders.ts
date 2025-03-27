// hooks/useOrders.ts
import { Order, OrderFiltersTypes, OrderSortOption } from '@/lib/db/order.search.engine'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API_BASE_URL = '/api/orders'

async function fetchJson<T>(...args: Parameters<typeof fetch>): Promise<T> {
  const response = await fetch(...args)
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}

export const useOrders = (
  filters: OrderFiltersTypes = {},
  sort: OrderSortOption = 'newest',
  page: number = 1,
  perPage: number = 10
) => {
  const queryClient = useQueryClient()

  // Fonction helper pour construire les paramètres de recherche
  const buildSearchParams = () => {
    const params = new URLSearchParams()
    
    if (filters.status) params.append('status', filters.status.join(','))
    if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus.join(','))
    if (filters.userId) params.append('userId', filters.userId.toString())
    if (filters.storeId) params.append('storeId', filters.storeId.toString())
    if (filters.driverId) params.append('driverId', filters.driverId.toString())
    if (filters.searchTerm) params.append('searchTerm', filters.searchTerm)
    if (filters.dateRange?.start) params.append('startDate', filters.dateRange.start.toISOString())
    if (filters.dateRange?.end) params.append('endDate', filters.dateRange.end.toISOString())

    params.append('sort', sort)
    params.append('page', page.toString())
    params.append('perPage', perPage.toString())

    return params
  }

  // Recherche des commandes
  const ordersQuery = useQuery({
    queryKey: ['orders', filters, sort, page, perPage],
    queryFn: async () => {
      const params = buildSearchParams()
      return fetchJson<{ orders: Order[]; total: number }>(`${API_BASE_URL}?${params.toString()}`)
    },
    staleTime: 5000
  })

  // Mutation pour mettre à jour le statut
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return fetchJson<Order>(`${API_BASE_URL}/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders'] as any)
    }
  })

  // Mutation pour assigner un chauffeur
  const assignDriver = useMutation({
    mutationFn: async ({ orderId, driverId }: { orderId: number; driverId: number }) => {
      return fetchJson<Order>(`${API_BASE_URL}/${orderId}/assign-driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders'] as any)
    }
  })

  // Mutation pour annuler une commande
  const cancelOrder = useMutation({
    mutationFn: async (orderId: number) => {
      return fetchJson<void>(`${API_BASE_URL}/${orderId}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders'] as any)
    }
  })

  return {
    ordersQuery,
    updateOrderStatus,
    assignDriver,
    cancelOrder,
    pagination: {
      page,
      perPage,
      total: ordersQuery.data?.total || 0,
    }
  }
}