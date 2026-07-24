import { useState, useEffect } from 'react'
import api from '../services/api'
import { QRCodeCanvas } from 'qrcode.react'
import { Wallet, Copy, Check, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WalletPage() {
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadWallets()
  }, [])

  const loadWallets = async () => {
    try {
      const res = await api.get('/api/wallet/my-wallets')
      setWallets(res.data.data || [])
    } catch (err) {
      console.error('Error cargando wallets:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateWallet = async () => {
    setGenerating(true)
    try {
      await api.post('/api/wallet/generate')
      toast.success('Wallet generada exitosamente')
      await loadWallets()
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al generar wallet'
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address)
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mi Wallet</h1>
        <p className="page-description">
          Tu direccion unica para recibir depositos en USDT (TRC-20)
        </p>
      </div>

      {wallets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{
            width: '72px', height: '72px',
            background: 'var(--accent-light)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Wallet size={32} color="var(--accent)" />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            Genera tu wallet de deposito
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 24px' }}>
            Se generara una direccion TRC-20 unica asociada a tu cuenta.
            Usa esta direccion para recibir USDT.
          </p>
          <button
            onClick={generateWallet}
            className="btn btn-primary btn-lg"
            disabled={generating}
          >
            {generating ? (
              <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</>
            ) : (
              <><Wallet size={18} /> Generar Mi Wallet</>
            )}
          </button>
        </div>
      ) : (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Codigo QR de Deposito</h3>
            </div>

            <div className="qr-container">
              <QRCodeCanvas
                value={wallets[0].address}
                size={220}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
              <div className="qr-address">
                {wallets[0].address}
              </div>
              <button
                className="copy-btn"
                onClick={() => copyAddress(wallets[0].address)}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiada!' : 'Copiar direccion'}
              </button>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div className="flex gap-2 items-center" style={{ marginBottom: '8px' }}>
                <AlertCircle size={16} color="#f59e0b" />
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#f59e0b' }}>
                  Importante
                </span>
              </div>
              <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                <li>Envia solo <strong>USDT</strong> por la red <strong>TRC-20 (TRON)</strong></li>
                <li>No enviar otras criptomonedas a esta direccion</li>
                <li>El deposito se acreditara tras 19+ confirmaciones de bloque</li>
                <li>Esta direccion es exclusiva para tu cuenta</li>
              </ul>
            </div>
          </div>

          <div>
            <div className="card mb-4">
              <div className="card-header">
                <h3 className="card-title">Informacion de Wallet</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <InfoRow label="Direccion" value={wallets[0].address} mono />
                <InfoRow label="Red" value="TRC-20 (TRON)" />
                <InfoRow label="Token" value="USDT (Tether)" />
                <InfoRow label="Balance actual" value={`${parseFloat(wallets[0].currentBalance || 0).toFixed(2)} USDT`} accent />
                <InfoRow label="Total recibido" value={`${parseFloat(wallets[0].totalReceived || 0).toFixed(2)} USDT`} />
                <InfoRow label="Estado" value={wallets[0].isActive ? 'Activa' : 'Inactiva'} badge={wallets[0].isActive ? 'success' : 'neutral'} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Como depositar</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Step number={1} title="Abre tu wallet" desc="Binance, Trust Wallet, u otra wallet que soporte TRC-20" />
                <Step number={2} title="Selecciona USDT (TRC-20)" desc="Asegurate de elegir la red TRON/TRC-20" />
                <Step number={3} title="Escanea el QR o copia la direccion" desc="Usa el codigo QR o la direccion de arriba" />
                <Step number={4} title="Envia el monto deseado" desc="El deposito se acreditara automaticamente" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, mono, accent, badge }) {
  return (
    <div className="flex justify-between items-center" style={{
      padding: '8px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span className="text-sm text-muted">{label}</span>
      {badge ? (
        <span className={`badge badge-${badge}`}>{value}</span>
      ) : (
        <span className={`text-sm ${mono ? 'mono' : ''} ${accent ? 'text-accent font-bold' : ''}`}
          style={mono ? { maxWidth: '220px', wordBreak: 'break-all', textAlign: 'right' } : {}}>
          {value}
        </span>
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
