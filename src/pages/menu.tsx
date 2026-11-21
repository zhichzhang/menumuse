import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { catalog, categories, formatPrice, menuPhotoPosition, optionPriceCents } from '../data/catalog'
import { seo } from '../seo'
import { PublicAuthActions, useOrderSignIn } from '../components/OrderSignIn'

const sectionNotes: Record<string, string> = {
  Sandwiches: 'Between good bread',
  Sides: 'For the table',
  Drinks: 'Something to sip',
  Desserts: 'A sweet finish',
}

export default function MenuPage() {
  const { begin, modal } = useOrderSignIn()
  return (
    <>
      <Seo {...seo} title="The Menu | MenuMuse Bistro" description="Explore the MenuMuse Bistro menu: sandwiches, sides, drinks, and desserts." path="/menu" />
      <div className="print-menu">
        <header className="print-nav"><Link to="/" className="landing-brand" aria-label="MenuMuse home"><span className="brand-mark">M</span><strong>MenuMuse</strong></Link><PublicAuthActions page="menu" begin={begin} /></header>
        <div className="print-masthead"><p>MENUMUSE BISTRO</p><h1>THE MENU<span>◆</span></h1><div><span>GOOD FOOD, MADE YOURS</span><span>MENUMUSE · SINCE 2026</span></div></div>
        <nav className="print-index" aria-label="Menu categories">
          {categories.map((category, index) => <a key={category} href={`#${category.toLowerCase()}`}>{String(index + 1).padStart(2, '0')} / {category}</a>)}
        </nav>
        <main className="print-content">
          {categories.map((category, index) => <section key={category} id={category.toLowerCase()} className={`print-section print-${category.toLowerCase()}`}>
            <div className="print-section-heading"><span>{String(index + 1).padStart(2, '0')}</span><h2>{category}</h2><em>{sectionNotes[category]}</em></div>
            <div className="print-items">{catalog.filter((item) => item.category === category).map((item) =>
              <article key={item.id} className="print-item"><div className="print-photo" role="img" aria-label={item.name} style={{ backgroundPosition: menuPhotoPosition(item.id) }} />
                <div className="print-item-copy"><h3>{item.name}</h3><strong>{formatPrice(item.priceCents)}</strong></div>
                <div className="print-options"><p>Options & extras</p>
                  {Object.entries(item.modifiers).map(([group, choices]) => <div className="print-option-row" key={group}>
                    <b>{group.replaceAll('_', ' ')}</b>
                    <span className="print-option-choices">{[item.defaults[group], ...choices.filter((choice) => choice !== item.defaults[group])].map((choice) =>
                      <span key={choice}>{choice} {item.defaults[group] === choice ? <small>(default)</small> : optionPriceCents(item, group, choice) > 0 ? <small>(+{formatPrice(optionPriceCents(item, group, choice))})</small> : null}</span>,
                    )}</span>
                  </div>)}
                </div></article>,
            )}</div>
          </section>)}
        </main>
        <footer className="print-footer">© 2026 Zhicheng Zhang. All rights reserved.</footer>
      </div>
      {modal}
    </>
  )
}
