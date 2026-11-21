import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { catalog, categories, formatPrice, menuPhotoPosition } from '../data/catalog'
import { seo } from '../seo'

const sectionNotes: Record<string, string> = {
  Sandwiches: 'Between good bread',
  Sides: 'For the table',
  Drinks: 'Something to sip',
  Desserts: 'A sweet finish',
}

export default function MenuPage() {
  return (
    <>
      <Seo {...seo} title="The Menu | MenuMuse Bistro" description="Explore the MenuMuse Bistro menu: sandwiches, sides, drinks, and desserts." path="/menu" />
      <div className="print-menu">
        <header className="print-nav"><Link to="/">MenuMuse</Link><span>THE BISTRO EDITION</span><Link className="header-action" to="/signin?next=%2Forder">Start an order ↗</Link></header>
        <div className="print-masthead"><p>FRESHLY MADE · MADE YOURS</p><h1>THE MENU<span>◆</span></h1><div><span>GOOD FOOD, GOOD COMPANY</span><span>EST. MENU MUSE</span></div></div>
        <nav className="print-index" aria-label="Menu categories">
          {categories.map((category, index) => <a key={category} href={`#${category.toLowerCase()}`}>{String(index + 1).padStart(2, '0')} / {category}</a>)}
        </nav>
        <main className="print-content">
          {categories.map((category, index) => <section key={category} id={category.toLowerCase()} className={`print-section print-${category.toLowerCase()}`}>
            <div className="print-section-heading"><span>{String(index + 1).padStart(2, '0')}</span><h2>{category}</h2><em>{sectionNotes[category]}</em></div>
            <div className="print-items">{catalog.filter((item) => item.category === category).map((item) =>
              <article key={item.id} className="print-item"><div className="print-photo" role="img" aria-label={item.name} style={{ backgroundPosition: menuPhotoPosition(item.id) }} />
                <div className="print-item-copy"><h3>{item.name}</h3><strong>{formatPrice(item.priceCents)}</strong></div></article>,
            )}</div>
          </section>)}
        </main>
        <footer className="print-footer"><span>MENU MUSE · THE BISTRO</span><Link to="/signin?next=%2Forder">MAKE IT YOURS ↗</Link></footer>
      </div>
    </>
  )
}
