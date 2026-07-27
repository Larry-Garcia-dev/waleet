import { useState, useEffect } from 'react'
import api from '../services/api'
import { ArrowDownToLine, Loader2, RefreshCw, Search, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DepositsPage() {
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [filter, setFilter] = useState('')

  useEffect(() => {
    loadDeposits()
    // Polling cada 10 segundos para actualizar depósitos
    const interval = setInterval(loadDeposits, 10000)
    return () => clearInterval(interval)
  }, [pagination.page])

  const loadDeposits = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/deposits?page=${pagination.page}&limit=10`)
      const data = res.data.data
      setDeposits(data.deposits || [])
      setPagination(prev => ({
        ...prev,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || 0,
      }))
    } catch (err) {
      toast.error('Error cargando depositos')
    } finally {
      setLoading(false)
    }
  }

  const checkDeposits = async () => {
    try {
      const walletRes = await api.get('/api/wallet/my-wallets')
      const wallets = walletRes.data.data || []
      if (wallets.length === 0) {
        toast.error('No tienes wallet asignada')
        return
      }
      await api.get(`/api/deposits/check/${wallets[0].address}`)
      toast.success('Verificacion completada')
      await loadDeposits()
    } catch (err) {
      toast.error('Error verificando depositos')
    }
  }

  const filteredDeposits = filter
    ? deposits.filter(d => d.status === filter)
    : deposits

  const tronScanUrl = (txHash) => `https://tronscan.org/#/transaction/${txHash}`

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Depositos</h1>
          <p className="page-description">
            Historial de todos tus depositos USDT TRC-20
          </p>
        </div>
        <button onClick={checkDeposits} className="btn btn-secondary">
          <RefreshCw size={16} />
          Verificar ahora
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setFilter('')}
          className={`btn btn-sm ${!filter ? 'btn-primary' : 'btn-secondary'}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('credited')}
          className={`btn btn-sm ${filter === 'credited' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Acreditados
        </button>
        <button
          onClick={() => setFilter('confirming')}
          className={`btn btn-sm ${filter === 'confirming' ? 'btn-primary' : 'btn-secondary'}`}
        >
          En proceso
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Pendientes
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredDeposits.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <ArrowDownToLine size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <div className="empty-state-title">Sin depositos</div>
            <div className="empty-state-text">
              {filter
                ? 'No hay depositos con este filtro'
                : 'Aun no tienes depositos. Genera tu wallet y envia USDT para comenzar.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Monto</th>
                  <th>Transaction Hash</th>
                  <th>Confirmaciones</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredDeposits.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                        +{parseFloat(d.amount).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted" style={{ marginLeft: '4px' }}>USDT</span>
                    </td>
                    <td>
                      <span className="mono text-sm">{d.txHash?.substring(0, 12)}...{d.txHash?.substring(d.txHash.length - 6)}</span>
                    </td>
                    <td>
                      <span className="text-sm">
                        {d.confirmations || 0} / 19
                      </span>
                      <div style={{
                        width: '60px', height: '4px',
                        background: 'var(--bg-input)',
                        borderRadius: '2px',
                        marginTop: '4px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min((d.confirmations || 0) / 19 * 100, 100)}%`,
                          height: '100%',
                          background: (d.confirmations || 0) >= 19 ? 'var(--accent)' : 'var(--warning)',
                          borderRadius: '2px',
                          transition: 'width 0.3s',
                        }} />
                      </div>
                    </td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="text-sm text-muted">
                      {new Date(d.detectedAt).toLocaleDateString('es-CO', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <a
                        href={tronScanUrl(d.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text-muted)' }}
                        title="Ver en TronScan"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center" style={{ padding: '16px 20px' }}>
              <span className="text-sm text-muted">
                Pagina {pagination.page} de {pagination.totalPages} ({pagination.total} depositos)
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

function StatusBadge({ status }) {
  const config = {
    pending: { label: 'Pendiente', class: 'badge-warning' },
    confirming: { label: 'Confirmando', class: 'badge-info' },
    confirmed: { label: 'Confirmado', class: 'badge-success' },
    credited: { label: 'Acreditado', class: 'badge-success' },
    failed: { label: 'Fallido', class: 'badge-danger' },
  }
  const c = config[status] || config.pending
  return <span className={`badge ${c.class}`}>{c.label}</span>
}
