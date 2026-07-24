import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { QRCodeCanvas } from 'qrcode.react'
import { Copy, Check, Clock, Loader2, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    loadOrder()
  }, [id])

  useEffect(() => {
    if (!order?.expiresAt) return
    const interval = setInterval(() => {
      const expires = new Date(order.expiresAt).getTime()
      const now = Date.now()
      const diff = expires - now
      if (diff <= 0) {
        setTimeLeft('Expirada')
        clearInterval(interval)
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${mins}m ${secs}s`)
    }, 1000)
    return () => clearInterval(interval)
  }, [order?.expiresAt])

  useEffect(() => {
    if (!order || order.status === 'pending_payment') return
    const interval = setInterval(loadOrder, 10000)
    return () => clearInterval(interval)
  }, [order?.status])

  const loadOrder = async () => {
    try {
      const res = await api.get(`/api/orders/${id}`)
      const data = res.data.data
      setOrder({
        id: data.id,
        productName: data.productName,
        totalAmount: data.totalAmount,
        status: data.status,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
      })
      if (data.payment) {
        setPayment(data.payment)
      }
    } catch (err) {
      toast.error('Orden no encontrada')
      navigate('/store')
    } finally {
      setLoading(false)
    }
  }

  const copyAddress = () => {
    if (!payment?.address) return
    navigator.clipboard.writeText(payment.address)
    setCopied(true)
    toast.success('Direccion copiada')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  const statusConfig = {
    pending_payment: { label: 'Esperando pago', color: 'warning', icon: Clock },
    awaiting_confirmation: { label: 'Confirmando en blockchain', color: 'info', icon: Loader2 },
    paid: { label: 'Pago confirmado', color: 'success', icon: CheckCircle },
    completed: { label: 'Completada', color: 'success', icon: CheckCircle },
    cancelled: { label: 'Cancelada', color: 'danger', icon: AlertCircle },
  }

  const st = statusConfig[order.status] || statusConfig.pending_payment
  const StatusIcon = st.icon

  return (
    <div>
      <button
        onClick={() => navigate('/store')}
        className="btn btn-secondary btn-sm mb-4"
      >
        <ArrowLeft size={16} /> Volver a la tienda
      </button>

      <div className="page-header">
        <h1 className="page-title">Checkout - Orden #{order.id}</h1>
        <p className="page-description">{order.productName}</p>
      </div>

      {/* Status banner */}
      <div className={`card mb-4`} style={{
        border: `1px solid var(--${st.color === 'warning' ? 'warning' : st.color === 'success' ? 'accent' : 'danger'})`,
        background: st.color === 'warning' ? 'rgba(245,158,11,0.08)' :
                    st.color === 'success' ? 'rgba(16,185,129,0.08)' :
                    'rgba(59,130,246,0.08)',
      }}>
        <div className="flex items-center gap-3">
          <StatusIcon size={24} style={{
            color: st.color === 'warning' ? '#f59e0b' : st.color === 'success' ? '#10b981' : '#3b82f6',
            animation: st.label.includes('Confirmando') ? 'spin 1s linear infinite' : 'none',
          }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>{st.label}</div>
            {order.status === 'pending_payment' && timeLeft && (
              <div className="text-sm" style={{ color: timeLeft === 'Expirada' ? 'var(--danger)' : 'var(--text-muted)' }}>
                {timeLeft === 'Expirada' ? 'La orden ha expirado' : `Tiempo restante: ${timeLeft}`}
              </div>
            )}
            {order.status === 'paid' && (
              <div className="text-sm text-muted">Tu pago fue confirmado. Orden en proceso.</div>
            )}
          </div>
        </div>
      </div>

      {order.status === 'pending_payment' && payment && (
        <div className="grid-2">
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 className="card-title mb-4" style={{ alignSelf: 'flex-start' }}>Paga con USDT</h3>

            <div className="qr-container" style={{ width: '100%' }}>
              <QRCodeCanvas
                value={payment.paymentUri || payment.address}
                size={240}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            <div style={{
              width: '100%',
              marginTop: '16px',
              padding: '16px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div className="text-sm text-muted" style={{ marginBottom: '4px' }}>
                Monto exacto a enviar
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)' }}>
                {payment.amount.toFixed(2)} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>USDT</span>
              </div>
            </div>

            <div style={{
              width: '100%',
              marginTop: '12px',
              padding: '12px 16px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div className="text-sm text-muted" style={{ marginBottom: '4px' }}>
                Direccion de envio
              </div>
              <div className="mono" style={{
                wordBreak: 'break-all',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}>
                {payment.address}
              </div>
            </div>

            <button onClick={copyAddress} className="copy-btn" style={{ marginTop: '12px' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiada!' : 'Copiar direccion'}
            </button>
          </div>

          <div>
            <div className="card mb-4">
              <h3 className="card-title mb-4">Resumen de orden</h3>
              <div className="flex justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm text-muted">Producto</span>
                <span className="text-sm font-bold">{order.productName}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm text-muted">Cantidad</span>
                <span className="text-sm">1</span>
              </div>
              <div className="flex justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm text-muted">Total</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{order.totalAmount.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm text-muted">Red</span>
                <span className="text-sm">{payment.network}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '8px 0' }}>
                <span className="text-sm text-muted">Token</span>
                <span className="text-sm">{payment.token}</span>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title mb-4">Instrucciones</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Step number={1} title="Abre tu wallet" desc="Binance, Trust Wallet u otra compatible con TRC-20" />
                <Step number={2} title="Envia USDT (TRC-20)" desc={`Exactamente ${order.totalAmount.toFixed(2)} USDT a la direccion mostrada`} />
                <Step number={3} title="Espera confirmacion" desc="Se necesitan 19 confirmaciones de bloque (~3 min)" />
                <Step number={4} title="Listo!" desc="Tu orden se marcara como pagada automaticamente" />
              </div>

              <div style={{
                marginTop: '20px',
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div className="flex gap-2 items-center" style={{ marginBottom: '4px' }}>
                  <AlertCircle size={14} color="#ef4444" />
                  <span style={{ fontWeight: 600, fontSize: '12px', color: '#ef4444' }}>Importante</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Envia solo USDT por la red TRC-20. Enviar otro token o por otra red resultara en perdida de fondos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {(order.status === 'paid' || order.status === 'completed') && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <CheckCircle size={64} color="var(--accent)" style={{ marginBottom: '20px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Pago Confirmado!</h2>
          <p className="text-muted mb-4">Tu orden ha sido procesada exitosamente.</p>
          <button onClick={() => navigate('/orders')} className="btn btn-primary">
            Ver mis ordenes
          </button>
        </div>
      )}

      {order.status === 'cancelled' && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <AlertCircle size={64} color="var(--danger)" style={{ marginBottom: '20px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Orden Cancelada</h2>
          <p className="text-muted mb-4">El tiempo de pago ha expirado.</p>
          <button onClick={() => navigate('/store')} className="btn btn-primary">
            Volver a la tienda
          </button>
        </div>
      )}
    </div>
  )
}

function Step({ number, title, desc }) {
  return (
    <div className="flex gap-3">
      <div style={{
        width: '32px', height: '32px',
        background: 'var(--accent-light)',
        borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '14px', color: 'var(--accent)',
        flexShrink: 0,
      }}>
        {number}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{title}</div>
        <div className="text-sm text-muted">{desc}</div>
      </div>
    </div>
  )
}
