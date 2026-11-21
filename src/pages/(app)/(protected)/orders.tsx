import { Link } from 'react-router-dom'
import { useAuthProfileReady, useQuery } from 'deepspace'
import { ArrowLeft } from 'lucide-react'
import { catalogById, formatPrice, type OrderData } from '../../../data/catalog'

export default function OrdersPage() {
  const { user } = useAuthProfileReady({ requireUser: true })
  const { records, status, error } = useQuery<OrderData>('orders', { orderBy: 'placedAt', orderDir: 'desc', limit: 100 })
  const ownOrders = records.filter((record) => record.data.ownerId === user?.id)

  return (
    <div className="orders-page">
      <Link className="orders-back" to="/order"><ArrowLeft size={16} /> Explore menu</Link>
      <header><p className="eyebrow">Your table</p><h1>My orders</h1></header>
      {status === 'loading' && <p className="orders-state">Loading orders…</p>}
      {status === 'error' && <p className="orders-state" role="alert">Could not load orders: {String(error)}</p>}
      {status === 'ready' && ownOrders.length === 0 && <div className="orders-empty"><p>No orders yet.</p><Link to="/order">Explore menu →</Link></div>}
      <div className="orders-list">
        {ownOrders.map((record) => {
          const order = record.data
          const date = new Date(order.placedAt)
          return <article className="order-receipt" key={record.recordId}>
            <div className="receipt-heading"><div><span className="eyebrow">Preview order</span>
              <h2>{Number.isNaN(date.getTime()) ? 'Order' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</h2>
              <small>{Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</small></div>
              <strong>{formatPrice(order.totalCents)}</strong></div>
            <ul className="receipt-lines">{order.lines.map((line) => {
              const item = catalogById.get(line.itemId)
              return <li key={line.id}><div><strong>{line.quantity} × {line.itemName ?? item?.name ?? 'Menu item'}</strong>
                <p>{Object.entries(line.modifiers).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'Classic'}</p></div>
                <span>{formatPrice((line.unitPriceCents ?? item?.priceCents ?? 0) * line.quantity)}</span></li>
            })}</ul>
          </article>
        })}
      </div>
    </div>
  )
}
