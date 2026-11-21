import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { getAuthToken, useAuthProfileReady, useQuery } from 'deepspace'
import { ArrowRight, Check, Minus, Plus, Search, ShoppingBag, Sparkles, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { catalog, catalogById, cartTotal, categories, formatPrice, menuPhotoPosition, type CartData, type CatalogItem, type OrderData } from '../../../data/catalog'

type ActionResponse = { success: true; data: unknown } | { success: false; error: string }

async function callAction(name: string, params: Record<string, unknown>): Promise<ActionResponse> {
  const token = await getAuthToken()
  if (!token) throw new Error('Please sign in again.')
  const response = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error(response.status === 401 ? 'Please sign in again.' : 'The request failed. Try again.')
  return response.json() as Promise<ActionResponse>
}

export default function OrderPage() {
  const { user } = useAuthProfileReady({ requireUser: true })
  const { records, status } = useQuery<CartData>('carts')
  const { records: orders } = useQuery<OrderData>('orders')
  const cart = records.find((record) => record.data.ownerId === user?.id)?.data
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CatalogItem | null>(null)
  const [options, setOptions] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [bootError, setBootError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [request, setRequest] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiFeedback, setAiFeedback] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let mounted = true
    callAction('ensureCart', {}).then((result) => {
      if (!result.success && mounted) setBootError(result.error)
    }).catch((error: unknown) => {
      if (mounted) setBootError(error instanceof Error ? error.message : 'Could not open your cart.')
    })
    return () => { mounted = false }
  }, [user?.id])

  const visible = useMemo(() => catalog.filter((item) =>
    (category === 'All' || item.category === category) &&
    item.name.toLowerCase().includes(search.trim().toLowerCase()),
  ), [category, search])

  const lines = cart?.lines ?? []
  const count = lines.reduce((sum, line) => sum + line.quantity, 0)
  const orderCount = orders.filter((entry) => entry.data.ownerId === user?.id).length

  function startAnotherOrder() {
    setFeedback('')
    setAiFeedback('')
    setCategory('All')
    setSearch('')
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function edit(params: Record<string, unknown>, successMessage: string) {
    if (busy || !cart) return
    setBusy(true)
    setFeedback('')
    try {
      const result = await callAction('editCart', params)
      setFeedback(result.success ? successMessage : result.error)
      if (result.success) setSelected(null)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The request failed.')
    } finally {
      setBusy(false)
    }
  }

  async function placeOrder() {
    if (busy || !cart?.lines.length) return
    setBusy(true)
    setFeedback('')
    try {
      const result = await callAction('placeOrder', {})
      setFeedback(result.success ? 'Order placed! This is a demo; no payment was collected.' : result.error)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not place the order.')
    } finally { setBusy(false) }
  }

  function openItem(item: CatalogItem) {
    setSelected(item)
    setOptions({})
    setFeedback('')
  }

  async function orderWithAI(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!request.trim() || aiBusy || !cart) return
    setAiBusy(true)
    setAiFeedback('')
    try {
      const result = await callAction('orderWithAI', { message: request.trim() })
      if (result.success) {
        setRequest('')
        setAiFeedback((result.data as { reply: string }).reply)
      } else setAiFeedback(result.error)
    } catch (error) {
      setAiFeedback(error instanceof Error ? error.message : 'The assistant is unavailable.')
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="order-shell">
      <section id="menu" className="order-main">
        <header className="order-intro">
          <div><p className="eyebrow">At the bistro · Your table</p><h1>Make it <em>yours.</em></h1></div>
          <Link className="order-menu-link" to="/menu">See the printed menu ↗</Link>
        </header>

        <div className="order-toolbar">
          <div className="category-list" role="group" aria-label="Menu categories">
            {['All', ...categories].map((name) => <button key={name} type="button"
              className={category === name ? 'category-pill active' : 'category-pill'}
              onClick={() => setCategory(name)}>{name}</button>)}
          </div>
          <label className="menu-search"><Search size={18} /><span className="sr-only">Search menu</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the menu" /></label>
        </div>

        <div className="menu-heading"><span>{category === 'All' ? 'Choose a favorite' : category}</span><small>{visible.length} choices</small></div>
        <div className="menu-grid">
          {visible.map((item) => <article className="menu-card" key={item.id}>
            <div className="menu-art" aria-hidden="true" style={{ backgroundPosition: menuPhotoPosition(item.id) }} />
            <div className="menu-card-body"><p className="menu-category">{item.category}</p>
              <h2>{item.name}</h2>
              <div className="menu-card-bottom"><strong>{formatPrice(item.priceCents)}</strong>
                <button className="round-add" type="button" onClick={() => openItem(item)} aria-label={`Choose ${item.name}`}><Plus size={19} /></button></div>
            </div>
          </article>)}
          {visible.length === 0 && <p className="empty-search">No menu items match your search.</p>}
        </div>
      </section>

      <aside className="cart-panel" aria-label="Your order">
        <div className="cart-top"><span className="cart-icon"><ShoppingBag size={21} /></span>
          <div><p className="eyebrow">Your table</p><h2>Your order <em>{count}</em></h2></div></div>
        {bootError && <p className="order-error" role="alert">{bootError}</p>}
        {!cart && !bootError && <p className="cart-empty">{status === 'loading' ? 'Loading your order…' : 'Opening your order…'}</p>}
        {cart && lines.length === 0 && <div className="cart-empty-state"><span>M</span><h3>{orderCount ? 'Ready for another?' : 'Your table is ready.'}</h3>
          <button type="button" onClick={startAnotherOrder}>{orderCount ? 'Start another order' : 'Explore the menu'} <ArrowRight size={15} /></button></div>}
        <div className="cart-lines">{lines.map((line) => {
          const item = catalogById.get(line.itemId)
          if (!item) return null
          return <div className="cart-line" key={line.id}>
            <div className="cart-line-title"><strong>{item.name}</strong><span>{formatPrice(item.priceCents * line.quantity)}</span></div>
            <p>{Object.entries(line.modifiers).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'Classic'}</p>
            <div className="cart-line-actions"><div className="quantity-control">
              <button type="button" disabled={busy} aria-label={`Decrease ${item.name}`} onClick={() =>
                edit(line.quantity === 1 ? { operation: 'remove', lineId: line.id } : { operation: 'setQuantity', lineId: line.id, quantity: line.quantity - 1 }, 'Order updated.')}><Minus size={15} /></button>
              <span>{line.quantity}</span>
              <button type="button" disabled={busy || line.quantity >= 20} aria-label={`Increase ${item.name}`} onClick={() =>
                edit({ operation: 'setQuantity', lineId: line.id, quantity: line.quantity + 1 }, 'Order updated.')}><Plus size={15} /></button>
            </div><button type="button" className="remove-line" disabled={busy} onClick={() => edit({ operation: 'remove', lineId: line.id }, 'Item removed.')} aria-label={`Remove ${item.name}`}><Trash2 size={16} /></button></div>
          </div>
        })}</div>
        <section className="cart-assistant" aria-label="Order with MenuMuse">
          <label htmlFor="ai-request"><Sparkles size={15} /> Order with MenuMuse</label>
          <form onSubmit={orderWithAI}>
            <input id="ai-request" value={request} maxLength={400} onChange={(event) => setRequest(event.target.value)} placeholder="Try: two spicy chicken sandwiches" />
            <button type="submit" aria-label="Send order request" disabled={!cart || aiBusy || !request.trim()}>{aiBusy ? '…' : <ArrowRight size={18} />}</button>
          </form>
          {aiFeedback && <p role="status" className="cart-ai-reply">{aiFeedback}</p>}
        </section>
        <div className="cart-bottom">
          {feedback && <p role="status" className="cart-feedback">{feedback}</p>}
          <div className="cart-total"><span>Subtotal</span><strong>{formatPrice(cartTotal(lines))}</strong></div>
          <p className="cart-footnote">A preview order · No payment is collected</p>
          {lines.length > 0 && <button type="button" className="place-order" disabled={busy} onClick={placeOrder}>{busy ? 'Updating…' : 'Place preview order'} <ArrowRight size={16} /></button>}
          {lines.length > 0 && <button type="button" className="clear-cart" disabled={busy} onClick={() => edit({ operation: 'clear' }, 'Your order is clear.')}>Clear order</button>}
          {orderCount > 0 && <Link className="order-history" to="/orders">View {orderCount} {orderCount === 1 ? 'order' : 'orders'} <ArrowRight size={15} /></Link>}
        </div>
      </aside>

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
        <section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="item-dialog-title">
          <button type="button" className="modal-close" onClick={() => setSelected(null)} aria-label="Close">×</button>
          <p className="eyebrow">{selected.category} · Make it yours</p><h2 id="item-dialog-title">{selected.name}</h2>
          <p className="modal-subtitle">Select any options you like. The classic version works just as well.</p>
          {Object.entries(selected.modifiers).map(([group, choices]) => <fieldset className="option-group" key={group}>
            <legend>{group.replaceAll('_', ' ')}</legend><div className="option-choices">
              {choices.map((choice) => <button type="button" key={choice} className={options[group] === choice ? 'option-choice picked' : 'option-choice'}
                onClick={() => setOptions((current) => ({ ...current, [group]: choice }))}>{choice}{options[group] === choice && <Check size={15} />}</button>)}
            </div></fieldset>)}
          <button type="button" className="add-to-order" disabled={busy || !cart} onClick={() => edit({ operation: 'add', itemId: selected.id, modifiers: options }, `${selected.name} added.`)}>
            {busy ? 'Adding…' : `Add to order · ${formatPrice(selected.priceCents)}`} <ArrowRight size={18} />
          </button>
        </section>
      </div>}
    </div>
  )
}
