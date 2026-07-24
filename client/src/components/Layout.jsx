import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Wallet, ArrowDownToLine, Shield, LogOut, Coins, Store, Package
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Coins size={22} color="white" />
          </div>
          <div>
            <div className="sidebar-title">CryptoPay</div>
            <div className="sidebar-subtitle">USDT TRC-20</div>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Principal</div>
          <NavLink to="/store" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Store size={18} />
            Tienda
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Package size={18} />
            Mis Ordenes
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Wallet size={18} />
            Mi Wallet
          </NavLink>
          <NavLink to="/deposits" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ArrowDownToLine size={18} />
            Depositos
          </NavLink>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Administracion</div>
          <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Shield size={18} />
            Panel Admin
          </NavLink>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{
            padding: '16px 12px',
            borderTop: '1px solid var(--border)',
            marginBottom: '8px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.fullName || user?.email}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {user?.email}
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--accent)',
              marginTop: '8px',
            }}>
              Balance: {parseFloat(user?.balance || 0).toFixed(2)} USDT
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-link"
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              color: 'var(--danger)',
            }}
          >
            <LogOut size={18} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
