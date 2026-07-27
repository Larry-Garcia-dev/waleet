import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Package, Loader2, Eye, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    loadOrders()
    // Polling cada 10 segundos para actualizar órdenes
    const interval = setInterval(loadOrders, 10000)
    return () => clearInterval(interval)
  }, [pagination.page])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/orders?page=${pagination.page}&limit=10`)
      const data = res.data.data
      setOrders(data.orders || [])
      setPagination(prev => ({
        ...prev,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || 0,
      }))
    } catch (err) {
      toast.error('Error cargando ordenes')
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = {
    pending_payment: { label: 'Pendiente de pago', class: 'badge-warning' },
    awaiting_confirmation: { label: 'Confirmando', class: 'badge-info' },
    paid: { label: 'Pagada', class: 'badge-success' },
    completed: { label: 'Completada', class: 'badge-success' },
    cancelled: { label: 'Cancelada', class: 'badge-danger' },
    refunded: { label: 'Reembolsada', class: 'badge-neutral' },
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mis Ordenes</h1>
        <p className="page-description">Historial de compras y estado de pagos</p>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : orders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Package size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <div className="empty-state-title">Sin ordenes</div>
            <div className="empty-state-text">
              No has realizado ninguna compra aun.
            </div>
            <button onClick={() => navigate('/store')} className="btn btn-primary mt-4">
              Ir a la tienda
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Producto</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const st = statusConfig[order.status] || statusConfig.pending_payment
                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600 }}>#{order.id}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          {order.productImage && (
                            <img
                              src={order.productImage}
                              alt={order.productName}
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                              }}
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '14px' }}>{order.productName}</div>
                            <div className="text-sm text-muted">x{order.quantity}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {order.totalAmount.toFixed(2)} USDT
                      </td>
                      <td>
                        <span className={`badge ${st.class}`}>{st.label}</span>
                      </td>
                      <td className="text-sm text-muted">
                        {new Date(order.createdAt).toLocaleDateString('es-CO', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/checkout/${order.id}`)}
                          className="btn btn-secondary btn-sm"
                        >
                          <Eye size={14} /> Ver
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center" style={{ padding: '16px 20px' }}>
              <span className="text-sm text-muted">
                Pagina {pagination.page} de {pagination.totalPages} ({pagination.total} ordenes)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="btn btn-secondary btn-sm"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
