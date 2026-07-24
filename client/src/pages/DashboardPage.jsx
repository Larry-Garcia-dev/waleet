import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Wallet, ArrowDownToLine, DollarSign, TrendingUp, Loader2, Coins } from 'lucide-react'

export default function DashboardPage() {
  const { user, refreshAuth } = useAuth()
  const [wallets, setWallets] = useState([])
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [walletRes, depositRes] = await Promise.all([
        api.get('/api/wallet/my-wallets'),
        api.get('/api/deposits?limit=5'),
      ])
      setWallets(walletRes.data.data || [])
      setDeposits(depositRes.data.data?.deposits || [])
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  const totalDeposited = deposits
    .filter(d => d.status === 'credited')
    .reduce((sum, d) => sum + parseFloat(d.amount), 0)

  const pendingDeposits = deposits.filter(d =>
    d.status === 'pending' || d.status === 'confirming'
  ).length

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Resumen de tu cuenta y actividad reciente
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Balance disponible</div>
            <div className="stat-value">
              {parseFloat(user?.balance || 0).toFixed(2)}
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '4px' }}>USDT</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <ArrowDownToLine size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total depositado</div>
            <div className="stat-value">
              {totalDeposited.toFixed(2)}
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '4px' }}>USDT</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <Wallet size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Wallets activas</div>
            <div className="stat-value">{wallets.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Depositos pendientes</div>
            <div className="stat-value">{pendingDeposits}</div>
            {pendingDeposits > 0 && (
              <div className="stat-change">Esperando confirmaciones</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tu Wallet</h3>
            <Link to="/wallet" className="btn btn-secondary btn-sm">Ver mas</Link>
          </div>
          {wallets.length > 0 ? (
            <div>
              <div style={{
                padding: '16px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '12px',
              }}>
                <div className="text-sm text-muted" style={{ marginBottom: '4px' }}>
                  Direccion de deposito
                </div>
                <div className="mono" style={{ wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                  {wallets[0].address}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Red: TRC-20 (TRON)</span>
                <span className="badge badge-success">Activa</span>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <Coins size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div className="empty-state-title">Sin wallet</div>
              <div className="empty-state-text">
                Genera tu primera wallet para recibir depositos
              </div>
              <Link to="/wallet" className="btn btn-primary mt-4">
                Generar Wallet
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Depositos Recientes</h3>
            <Link to="/deposits" className="btn btn-secondary btn-sm">Ver todos</Link>
          </div>
          {deposits.length > 0 ? (
            <div>
              {deposits.map((d) => (
                <div key={d.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                      +{parseFloat(d.amount).toFixed(2)} USDT
                    </div>
                    <div className="mono text-sm text-muted" style={{ maxWidth: '200px' }}>
                      {d.txHash?.substring(0, 16)}...
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <ArrowDownToLine size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div className="empty-state-title">Sin depositos</div>
              <div className="empty-state-text">
                Tus depositos USDT apareceran aqui
              </div>
            </div>
          )}
        </div>
      </div>
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
