import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Coins, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName || !form.email || !form.password) {
      toast.error('Complete todos los campos')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Las contrasenas no coinciden')
      return
    }
    if (form.password.length < 8) {
      toast.error('La contrasena debe tener minimo 8 caracteres')
      return
    }
    setLoading(true)
    try {
      await register(form.email, form.password, form.fullName)
      toast.success('Cuenta creada. Inicia sesion.')
      navigate('/login')
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al registrar'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Coins size={28} color="white" />
          </div>
          <h1 className="auth-title">Crear Cuenta</h1>
          <p className="auth-subtitle">Registrate para recibir pagos en USDT</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input
              type="text"
              className="form-input"
              placeholder="Tu nombre"
              value={form.fullName}
              onChange={handleChange('fullName')}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="tu@email.com"
              value={form.email}
              onChange={handleChange('email')}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contrasena</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Minimo 8 caracteres"
                value={form.password}
                onChange={handleChange('password')}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirmar contrasena</label>
            <input
              type="password"
              className="form-input"
              placeholder="Repite tu contrasena"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Creando cuenta...</>
            ) : 'Crear Cuenta'}
          </button>
        </form>

        <div className="auth-footer">
          Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Inicia sesion
          </Link>
        </div>
      </div>
    </div>
  )
}
