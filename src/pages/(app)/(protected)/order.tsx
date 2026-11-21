import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { getAuthToken, useAuthProfileReady, useQuery } from 'deepspace'
import { ArrowRight, Check, ChevronRight, Minus, PanelRightClose, Pencil, Plus, Search, ShoppingBag, Sparkles, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { catalog, catalogById, cartTotal, categories, formatPrice, menuPhotoPosition, optionPriceCents, unitPriceCents, type CartData, type CatalogItem, type OrderData } from '../../../data/catalog'

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
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthProfileReady({ requireUser: true })
  const { records, status } = useQuery<CartData>('carts')
  const { records: orders, status: ordersStatus } = useQuery<OrderData>('orders')
  const cart = records.find((record) => record.data.ownerId === user?.id)?.data
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const selected = catalogById.get(new URLSearchParams(location.search).get('item') ?? '') ?? null
  const [options, setOptions] = useState<Record<string, string>>({})
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [bootError, setBootError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [placedTotal, setPlacedTotal] = useState<number | null>(null)
  const [newOrderStarted, setNewOrderStarted] = useState(false)
  const [request, setRequest] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiFeedback, setAiFeedback] = useState('')
  const [clarification, setClarification] = useState<{ question: string; choices: string[]; original: string } | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(true)

  useEffect(() => {
    if (window.matchMedia('(max-width: 850px)').matches) setCartOpen(false)
  }, [])

  useEffect(() => {
    if (!selected) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (window.history.state?.idx > 0) navigate(-1)
      else navigate('/order', { replace: true })
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [selected, navigate])

  function closeItem() {
    setEditingLineId(null)
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/order', { replace: true })
  }

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
  const ordering = placedTotal === null && (lines.length > 0 || newOrderStarted || (ordersStatus === 'ready' && orderCount === 0))
  const selectedOptions = selected ? { ...selected.defaults, ...options } : {}

  function startAnotherOrder() {
    setPlacedTotal(null)
    setNewOrderStarted(true)
    setFeedback('')
    setAiFeedback('')
    setClarification(null)
    setSelectedChoice(null)
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
      if (result.success && selected) closeItem()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The request failed.')
    } finally {
      setBusy(false)
    }
  }

  async function placeOrder() {
    if (busy || aiBusy || !cart?.lines.length) return
    const total = cartTotal(cart.lines)
    setBusy(true)
    setFeedback('')
    try {
      const result = await callAction('placeOrder', {})
      if (result.success) {
        setPlacedTotal(total)
        setNewOrderStarted(false)
        setAiFeedback('')
        setRequest('')
        setClarification(null)
        setSelectedChoice(null)
      } else setFeedback(result.error)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not place the order.')
    } finally { setBusy(false) }
  }

  function openItem(item: CatalogItem) {
    setPlacedTotal(null)
    setNewOrderStarted(true)
    setOptions({})
    setEditingLineId(null)
    setNote('')
    setFeedback('')
    navigate(`/order?item=${encodeURIComponent(item.id)}`)
  }

  function openCartItem(lineId: string) {
    const line = lines.find((entry) => entry.id === lineId)
    if (!line || !catalogById.has(line.itemId)) return
    setEditingLineId(line.id)
    setOptions({ ...line.modifiers })
    setNote(line.note ?? '')
    setFeedback('')
    navigate(`/order?item=${encodeURIComponent(line.itemId)}`)
  }

  async function orderWithAI(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (clarification?.choices.length) {
      if (selectedChoice) await sendAgentRequest(`${clarification.original}. My choice is ${selectedChoice}.`)
      return
    }
    await sendAgentRequest(request.trim())
  }

  async function sendAgentRequest(message: string) {
    if (!message || aiBusy || busy || !cart) return
    setAiBusy(true)
    setAiFeedback('')
    setClarification(null)
    setSelectedChoice(null)
    try {
      const result = await callAction('orderWithAI', { message })
      if (result.success) {
        setRequest('')
        const data = result.data as { reply: string; status: string; choices?: string[] }
        if (data.status === 'clarify') setClarification({ question: data.reply, choices: data.choices ?? [], original: message })
      } else setAiFeedback(result.error)
    } catch (error) {
      setAiFeedback(error instanceof Error ? error.message : 'The assistant is unavailable.')
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className={cartOpen ? 'order-shell' : 'order-shell cart-collapsed'}>
      <section id="menu" className="order-main">
        <header className="order-intro">
          <div><p className="eyebrow">ORDER YOUR WAY</p><h1>Make it <em>yours.</em></h1></div>
        </header>

        <section className={`cart-assistant agent-main${!ordering ? ' agent-disabled' : ''}${clarification?.choices.length ? ' agent-clarifying' : ''}`} aria-label="Order with our agent" aria-busy={aiBusy} aria-disabled={!ordering}>
          <label htmlFor="ai-request"><Sparkles size={18} /> Order with our agent</label>
          <form onSubmit={orderWithAI}>
            <input id="ai-request" value={request} maxLength={400} disabled={!ordering || aiBusy || !!clarification?.choices.length} onChange={(event) => setRequest(event.target.value)} placeholder={ordering ? clarification?.choices.length ? 'Choose an option below' : 'Tell us what you’d like…' : 'Start another order to continue'} />
            <button type="submit" aria-label="Send order request" disabled={!ordering || !cart || aiBusy || busy || (clarification?.choices.length ? !selectedChoice : !request.trim())}>{aiBusy ? <span className="agent-spinner" /> : <ArrowRight size={18} />}</button>
          </form>
          {aiBusy && <p role="status" className="agent-processing"><span className="agent-dots"><i /><i /><i /></span> Putting your order together…</p>}
          {aiFeedback && <p role="alert" className="cart-ai-reply">{aiFeedback}</p>}
          {clarification && <div className="agent-clarification" role="status"><p>{clarification.question}</p>
            {clarification.choices.length > 0 && <div className="agent-choices" role="group" aria-label="Choose one option">{clarification.choices.map((choice) =>
              <button key={choice} type="button" disabled={aiBusy || !ordering} className={selectedChoice === choice ? 'selected' : ''} aria-pressed={selectedChoice === choice} onClick={() => setSelectedChoice(choice)}>{choice} <ChevronRight size={15} /></button>,
            )}</div>}</div>}
        </section>

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

      {cartOpen && <button className="cart-drawer-backdrop" type="button" aria-label="Close cart" onClick={() => setCartOpen(false)} />}
      <aside className="cart-panel" aria-label="Cart">
        <button className="cart-rail-toggle" type="button" onClick={() => setCartOpen((open) => !open)} aria-label={cartOpen ? 'Collapse cart' : 'Open cart'} aria-expanded={cartOpen}>
          {cartOpen ? <PanelRightClose size={21} /> : <><ShoppingBag size={22} /><span>{placedTotal === null ? count : 0}</span></>}
        </button>
        <div className="cart-panel-inner">
        <div className="cart-top"><span className="cart-icon"><ShoppingBag size={21} /></span>
          <div><p className="eyebrow">YOUR ORDER</p><h2>Cart {placedTotal === null && <em>{count}</em>}</h2></div></div>
        <div className="cart-scroll">
        {bootError && <p className="order-error" role="alert">{bootError}</p>}
        {!cart && !bootError && <p className="cart-empty">{status === 'loading' ? 'Loading your order…' : 'Opening your order…'}</p>}
        {placedTotal !== null && <div className="cart-success" role="status"><span className="cart-success-mark"><Check size={26} /></span>
          <h3>Order placed</h3><p>Total <strong>{formatPrice(placedTotal)}</strong></p>
          <Link to="/orders">View order history <ArrowRight size={17} /></Link>
          <button type="button" onClick={startAnotherOrder}>Start another order <ArrowRight size={17} /></button></div>}
        {cart && lines.length === 0 && placedTotal === null && !newOrderStarted && orderCount > 0 && <div className="cart-empty-state"><h3>Ready for another?</h3>
          <button type="button" onClick={startAnotherOrder}>Start another order <ArrowRight size={16} /></button>
          <Link to="/orders">View order history <ArrowRight size={16} /></Link></div>}
        {cart && lines.length === 0 && ordering && <p className="cart-empty">Your cart is empty. Pick a favorite or tell our agent what you’d like.</p>}
        {placedTotal === null && <div className="cart-lines">{lines.map((line) => {
          const item = catalogById.get(line.itemId)
          if (!item) return null
          return <div className="cart-line" key={line.id}>
            <div className="cart-line-title"><strong>{item.name}</strong><span>{formatPrice(unitPriceCents(item, line.modifiers) * line.quantity)}</span></div>
            <p>{Object.entries(line.modifiers).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'Classic'}</p>
            {line.note && <p className="cart-line-note">Note: {line.note}</p>}
            <div className="cart-line-actions"><div className="quantity-control">
              <button type="button" disabled={busy} aria-label={`Decrease ${item.name}`} onClick={() =>
                edit(line.quantity === 1 ? { operation: 'remove', lineId: line.id } : { operation: 'setQuantity', lineId: line.id, quantity: line.quantity - 1 }, 'Order updated.')}><Minus size={15} /></button>
              <span>{line.quantity}</span>
              <button type="button" disabled={busy || line.quantity >= 20} aria-label={`Increase ${item.name}`} onClick={() =>
                edit({ operation: 'setQuantity', lineId: line.id, quantity: line.quantity + 1 }, 'Order updated.')}><Plus size={15} /></button>
            </div><div className="cart-item-tools"><button type="button" className="edit-line" disabled={busy} onClick={() => openCartItem(line.id)} aria-label={`Edit ${item.name} options`}><Pencil size={16} /></button>
            <button type="button" className="remove-line" disabled={busy} onClick={() => edit({ operation: 'remove', lineId: line.id }, 'Item removed.')} aria-label={`Remove ${item.name}`}><Trash2 size={16} /></button></div></div>
          </div>
        })}</div>}
        </div>
        {placedTotal === null && <div className="cart-bottom">
          {feedback && <p role="status" className="cart-feedback">{feedback}</p>}
          <div className="cart-total"><span>Subtotal</span><strong>{formatPrice(cartTotal(lines))}</strong></div>
          <button type="button" className="place-order" disabled={!cart || lines.length === 0 || busy || aiBusy} onClick={placeOrder}>{busy ? 'Placing order…' : 'Place order'} <ArrowRight size={16} /></button>
          <button type="button" className="clear-cart" disabled={!cart || lines.length === 0 || busy} onClick={() => edit({ operation: 'clear' }, 'Your cart is clear.')}>Clear cart</button>
        </div>}
        </div>
      </aside>

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeItem() }}>
        <section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="item-dialog-title">
          <button type="button" className="modal-close" onClick={closeItem} aria-label="Close">×</button>
          <h2 id="item-dialog-title">{editingLineId ? `Edit ${selected.name}` : selected.name}</h2>
          {Object.entries(selected.modifiers).map(([group, choices]) => <div className="option-group" role="group" aria-label={group.replaceAll('_', ' ')} key={group}>
            <h3>{group.replaceAll('_', ' ')}</h3><div className="option-choices">
              {choices.map((choice) => <button type="button" key={choice} className={selectedOptions[group] === choice ? 'option-choice picked' : 'option-choice'}
                aria-pressed={selectedOptions[group] === choice} onClick={() => setOptions((current) => ({ ...current, [group]: choice }))}>{choice}{optionPriceCents(selected, group, choice) > 0 && <small>+{formatPrice(optionPriceCents(selected, group, choice))}</small>}{selectedOptions[group] === choice && <Check size={15} />}</button>)}
            </div></div>)}
          <label className="item-note">Note for the kitchen <textarea value={note} maxLength={180} onChange={(event) => setNote(event.target.value)} placeholder="Any requests?" rows={2} /></label>
          <button type="button" className="add-to-order" disabled={busy || !cart} onClick={() => editingLineId
            ? edit({ operation: 'updateItem', lineId: editingLineId, modifiers: selectedOptions, note }, 'Item updated.')
            : edit({ operation: 'add', itemId: selected.id, modifiers: selectedOptions, note }, `${selected.name} added.`)}>
            {busy ? 'Saving…' : `${editingLineId ? 'Save changes' : 'Add to cart'} · ${formatPrice(unitPriceCents(selected, selectedOptions))}`} <ArrowRight size={18} />
          </button>
          {feedback && <p className="item-feedback" role="alert">{feedback}</p>}
        </section>
      </div>}
    </div>
  )
}
