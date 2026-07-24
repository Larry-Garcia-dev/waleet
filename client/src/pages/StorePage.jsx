import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ShoppingCart, Loader2, Package, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StorePage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadProducts()
  }, [selectedCategory])

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/products/categories'),
      ])
      setProducts(prodRes.data.data || [])
      setCategories(catRes.data.data || [])
    } catch (err) {
      toast.error('Error cargando productos')
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const url = selectedCategory
        ? `/api/products?category=${encodeURIComponent(selectedCategory)}`
        : '/api/products'
      const res = await api.get(url)
      setProducts(res.data.data || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handlePurchase = async (product) => {
    setPurchasing(product.id)
    try {
      const res = await api.post('/api/orders', { productId: product.id, quantity: 1 })
      toast.success('Orden creada! Redirigiendo al pago...')
      navigate(`/checkout/${res.data.data.order.id}`)
    } catch (err) {
      const msg = err.response?.data?.error || 'Error creando orden'
      toast.error(msg)
    } finally {
      setPurchasing(null)
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
      <div className="page-header">
        <h1 className="page-title">Tienda</h1>
        <p className="page-description">
          Compra con USDT (TRC-20). Pago seguro con crypto.
        </p>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedCategory('')}
          className={`btn btn-sm ${!selectedCategory ? 'btn-primary' : 'btn-secondary'}`}
        >
          Todos
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Package size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <div className="empty-state-title">Sin productos</div>
            <div className="empty-state-text">No hay productos disponibles en esta categoria</div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {products.map(product => (
            <div key={product.id} className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 0,
            }}>
              <div style={{
                height: '200px',
                background: 'var(--bg-input)',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.parentElement.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>`
                  }}
                />
                {!product.available && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'var(--danger)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    Sin stock
                  </div>
                )}
              </div>

              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span className="badge badge-neutral" style={{ alignSelf: 'flex-start', marginBottom: '8px' }}>
                  {product.category}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                  {product.name}
                </h3>
                <p className="text-sm text-muted" style={{
                  marginBottom: '16px',
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {product.description}
                </p>

                <div className="flex justify-between items-center" style={{ marginTop: 'auto' }}>
                  <div>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent)' }}>
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted" style={{ marginLeft: '4px' }}>USDT</span>
                  </div>
                  <button
                    onClick={() => handlePurchase(product)}
                    disabled={!product.available || purchasing === product.id}
                    className="btn btn-primary btn-sm"
                  >
                    {purchasing === product.id ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <><ShoppingCart size={16} /> Comprar</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
