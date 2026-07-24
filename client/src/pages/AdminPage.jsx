import { useState, useEffect } from 'react'
import api from '../services/api'
import {
  Shield, Users, Wallet, ArrowDownToLine, DollarSign,
  Loader2, RefreshCw, Activity, CheckCircle, XCircle, Search
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [deposits, setDeposits] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      const [statsRes, usersRes, depositsRes, logsRes] = await Promise.allSettled([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users?limit=20'),
        api.get('/api/admin/deposits?limit=20'),
        api.get('/api/admin/audit-logs?limit=30'),
      ])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data)
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.data?.users || [])
      if (depositsRes.status === 'fulfilled') setDeposits(depositsRes.value.data.data?.deposits || [])
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value.data.data?.logs || [])
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('No tienes permisos de administrador')
      }
    } finally {
      setLoading(false)
    }
  }

  const triggerSweep = async () => {
    try {
      await api.post('/api/admin/sweep/trigger')
      toast.success('Sweep ejecutado')
    } catch (err) {
      toast.error('Error ejecutando sweep')
    }
  }

  const triggerDepositCheck = async () => {
    try {
      const res = await api.post('/api/admin/deposits/check-all')
      const data = res.data.data
      toast.success(`Verificacion completada: ${data.newDeposits} nuevos depositos`)
      await loadAll()
    } catch (err) {
      toast.error('Error verificando depositos')
    }
  }

  const updateKyc = async (userId) => {
    try {
      await api.put(`/api/admin/users/${userId}/kyc`)
      toast.success('KYC verificado')
      await loadAll()
    } catch (err) {
      toast.error('Error actualizando KYC')
    }
  }

  const updateStatus = async (userId, status) => {
    try {
      await api.put(`/api/admin/users/${userId}/status`, { status })
      toast.success(`Estado actualizado a ${status}`)
      await loadAll()
    } catch (err) {
      toast.error('Error actualizando estado')
    }
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Panel de Administracion</h1>
          <p className="page-description">Gestion de la pasarela de pagos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={triggerDepositCheck} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Verificar Depositos
          </button>
          <button onClick={triggerSweep} className="btn btn-primary btn-sm">
            <Activity size={14} /> Ejecutar Sweep
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green"><Users size={24} /></div>
            <div className="stat-info">
              <div className="stat-label">Usuarios</div>
              <div className="stat-value">{stats.users?.total || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><Wallet size={24} /></div>
            <div className="stat-info">
              <div className="stat-label">Wallets Activas</div>
              <div className="stat-value">{stats.wallets?.active || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><ArrowDownToLine size={24} /></div>
            <div className="stat-info">
              <div className="stat-label">Total Depositado</div>
              <div className="stat-value">
                {parseFloat(stats.deposits?.totalAmount || 0).toFixed(2)}
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '4px' }}>USDT</span>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><DollarSign size={24} /></div>
            <div className="stat-info">
              <div className="stat-label">Balance Total en Plataforma</div>
              <div className="stat-value">
                {parseFloat(stats.balances?.totalHeld || 0).toFixed(2)}
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '4px' }}>USDT</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['overview', 'users', 'deposits', 'audit'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tab === 'overview' && 'Resumen'}
            {tab === 'users' && 'Usuarios'}
            {tab === 'deposits' && 'Depositos'}
            {tab === 'audit' && 'Audit Log'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="card-title mb-4">Ultimos Depositos</h3>
            {deposits.length > 0 ? deposits.slice(0, 5).map(d => (
              <div key={d.id} className="flex justify-between items-center" style={{
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>
                    {parseFloat(d.amount).toFixed(2)} USDT
                  </div>
                  <div className="text-sm text-muted">{d.user_email}</div>
                </div>
                <StatusBadge status={d.status} />
              </div>
            )) : <div className="text-muted text-sm">Sin depositos</div>}
          </div>
          <div className="card">
            <h3 className="card-title mb-4">Actividad Reciente</h3>
            {auditLogs.length > 0 ? auditLogs.slice(0, 8).map((log, i) => (
              <div key={i} style={{
                padding: '8px 0', borderBottom: '1px solid var(--border)',
                fontSize: '13px',
              }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {log.action}
                  </span>
                  <span className="text-muted text-sm">
                    {new Date(log.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {log.user_email && (
                  <div className="text-sm text-muted">{log.user_email}</div>
                )}
              </div>
            )) : <div className="text-muted text-sm">Sin actividad</div>}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Balance</th>
                  <th>KYC</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td className="text-sm">{u.email}</td>
                    <td className="text-sm">{u.full_name}</td>
                    <td style={{ fontWeight: 600 }}>{parseFloat(u.balance).toFixed(2)}</td>
                    <td>
                      {u.kyc_verified ? (
                        <span className="badge badge-success"><CheckCircle size={12} /> Verificado</span>
                      ) : (
                        <span className="badge badge-warning">Pendiente</span>
                      )}
                    </td>
                    <td><StatusBadge status={u.status} /></td>
                    <td>
                      <div className="flex gap-2">
                        {!u.kyc_verified && (
                          <button onClick={() => updateKyc(u.id)} className="btn btn-primary btn-sm">
                            Verificar KYC
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}
                          className="btn btn-secondary btn-sm"
                        >
                          {u.status === 'active' ? 'Suspender' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'deposits' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Monto</th>
                  <th>Tx Hash</th>
                  <th>Confirm.</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map(d => (
                  <tr key={d.id}>
                    <td>{d.id}</td>
                    <td className="text-sm">{d.user_email}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      {parseFloat(d.amount).toFixed(2)}
                    </td>
                    <td className="mono text-sm">
                      {d.tx_hash?.substring(0, 10)}...
                    </td>
                    <td>{d.confirmations}/19</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="text-sm text-muted">
                      {new Date(d.detected_at).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Accion</th>
                  <th>Usuario</th>
                  <th>Recurso</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, i) => (
                  <tr key={i}>
                    <td className="text-sm text-muted">
                      {new Date(log.created_at).toLocaleString('es-CO')}
                    </td>
                    <td>
                      <span className="badge badge-neutral">{log.action}</span>
                    </td>
                    <td className="text-sm">{log.user_email || '-'}</td>
                    <td className="text-sm">{log.resource_type} #{log.resource_id}</td>
                    <td className="mono text-sm">{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    active: { label: 'Activo', class: 'badge-success' },
    suspended: { label: 'Suspendido', class: 'badge-danger' },
    pending_kyc: { label: 'KYC Pendiente', class: 'badge-warning' },
    pending: { label: 'Pendiente', class: 'badge-warning' },
    confirming: { label: 'Confirmando', class: 'badge-info' },
    confirmed: { label: 'Confirmado', class: 'badge-success' },
    credited: { label: 'Acreditado', class: 'badge-success' },
    failed: { label: 'Fallido', class: 'badge-danger' },
  }
  const c = config[status] || config.pending
  return <span className={`badge ${c.class}`}>{c.label}</span>
}
