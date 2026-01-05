import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing">
      <header className="header">
        <div className="container">
          <div className="header-inner">
            <Link to="/" className="logo">
              <div className="logo-icon">
                <i className="fas fa-sailboat"></i>
              </div>
              SailPlan
            </Link>
            
            <nav className="nav">
              <ul className="nav-links">
                <li><a href="#features" className="nav-link">Funkce</a></li>
                <li><a href="#how-it-works" className="nav-link">Jak to funguje</a></li>
                <li><a href="#pricing" className="nav-link">Ceník</a></li>
              </ul>
            </nav>
            
            <div className="header-actions">
              <Link to="/login" className="btn btn-ghost">Přihlásit se</Link>
              <Link to="/register" className="btn btn-primary">Registrace</Link>
            </div>
          </div>
        </div>
      </header>

      <section className="hero">
        {/* Floating decorative elements */}
        <div className="floating-element" style={{fontSize: '4rem', color: 'var(--turquoise)'}}>
          <i className="fas fa-anchor"></i>
        </div>
        <div className="floating-element" style={{fontSize: '3rem', color: 'var(--coral)'}}>
          <i className="fas fa-compass"></i>
        </div>
        <div className="floating-element" style={{fontSize: '3.5rem', color: 'var(--turquoise-light)'}}>
          <i className="fas fa-life-ring"></i>
        </div>
        
        <div className="container">
          <div className="hero-content animate-in">
            <h1>Organizujte plavby <span>bez stresu</span></h1>
            <p>Kompletní platforma pro správu jachtových plaveb. Od plánování přes rozdělení posádky až po předávání lodí – vše na jednom místě.</p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-coral btn-lg">
                <i className="fas fa-rocket"></i>
                Začít zdarma
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <div className="section-header animate-in">
            <h2>Vše co potřebujete pro úspěšnou plavbu</h2>
            <p>SailPlan nabízí kompletní sadu nástrojů pro organizátory, kapitány i účastníky plaveb.</p>
          </div>
          
          <div className="features-grid">
            <div className="card feature-card animate-in delay-1">
              <div className="feature-icon">⛵</div>
              <h4>Správa plaveb</h4>
              <p>Organizujte plavby s jednou nebo více loděmi. Přiřazujte účastníky, sledujte kapacity a spravujte posádky.</p>
            </div>
            
            <div className="card feature-card animate-in delay-2">
              <div className="feature-icon">📋</div>
              <h4>Chytré checklisty</h4>
              <p>Vytvořte si vlastní checklisty pro předávání lodí, balení zavazadel nebo cokoliv jiného. Vše přehledně na jednom místě.</p>
            </div>
            
            <div className="card feature-card animate-in delay-3">
              <div className="feature-icon">👥</div>
              <h4>Crew listy</h4>
              <p>Sbírejte důležité údaje od účastníků automaticky. Definujte jaké informace potřebujete od posádky i kapitánů.</p>
            </div>
            
            <div className="card feature-card animate-in delay-4">
              <div className="feature-icon">💳</div>
              <h4>Sledování plateb</h4>
              <p>Mějte přehled o zálohách a platbách. Připomínky termínů a jasný přehled kdo co zaplatil.</p>
            </div>
            
            <div className="card feature-card animate-in delay-1">
              <div className="feature-icon">🗺️</div>
              <h4>Trasy a lokace</h4>
              <p>Sdílejte informace o místě startu, trase i cíli plavby. Včetně tipů na dopravu a praktických informací.</p>
            </div>
            
            <div className="card feature-card animate-in delay-2">
              <div className="feature-icon">⏱️</div>
              <h4>Časová osa</h4>
              <p>Hlavní timeline s důležitými termíny. Od zaplacení zálohy přes vyplnění crew listu až po den odjezdu.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{padding: 'var(--space-3xl) 0', background: 'white'}}>
        <div className="container">
          <div className="section-header">
            <h2>Tři pohledy, jeden systém</h2>
            <p>Každý uživatel vidí to, co potřebuje. Ať už jste organizátor, kapitán nebo účastník.</p>
          </div>
          
          <div className="features-grid" style={{marginTop: 'var(--space-2xl)'}}>
            <div className="card" style={{border: '2px solid transparent', transition: 'all 0.3s'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)'}}>
                <div style={{width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--coral), var(--coral-light))', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem'}}>
                  <i className="fas fa-crown"></i>
                </div>
                <div>
                  <h4 style={{margin: 0}}>Organizátor</h4>
                  <span className="text-muted text-sm">Plná kontrola</span>
                </div>
              </div>
              <p className="text-muted">Vytvářejte plavby, přiřazujte účastníky do lodí, sledujte platby a crew listy. Kompletní přehled o všech lodích a posádkách.</p>
            </div>
            
            <div className="card" style={{border: '2px solid transparent', transition: 'all 0.3s'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)'}}>
                <div style={{width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--turquoise), var(--ocean-light))', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem'}}>
                  <i className="fas fa-ship"></i>
                </div>
                <div>
                  <h4 style={{margin: 0}}>Kapitán</h4>
                  <span className="text-muted text-sm">Vedení lodě</span>
                </div>
              </div>
              <p className="text-muted">Přístup ke crew listu vaší lodě, checklisty pro předání a vracení lodě. Všechny informace o vaší posádce.</p>
            </div>
            
            <div className="card" style={{border: '2px solid transparent', transition: 'all 0.3s'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)'}}>
                <div style={{width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--ocean-mid), var(--ocean-light))', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem'}}>
                  <i className="fas fa-user"></i>
                </div>
                <div>
                  <h4 style={{margin: 0}}>Účastník</h4>
                  <span className="text-muted text-sm">Posádka</span>
                </div>
              </div>
              <p className="text-muted">Vyplňte crew list, sledujte termíny, zjistěte do které lodě patříte a kdo je vaše posádka. Vše přehledně na jednom místě.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="features">
        <div className="container container-narrow">
          <div className="section-header">
            <h2>Jednoduchý ceník</h2>
            <p>Aktuálně je SailPlan zcela zdarma. Do budoucna plánujeme prémiové funkce.</p>
          </div>
          
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)', border: '2px solid var(--turquoise)' }}>
            <div style={{ display: 'inline-block', background: 'var(--success-light)', color: 'var(--success)', padding: '4px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>
              Aktuálně dostupné
            </div>
            <h3 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>Zdarma</h3>
            <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>Všechny funkce bez omezení</p>
            
            <ul style={{ listStyle: 'none', textAlign: 'left', maxWidth: '300px', margin: '0 auto var(--space-xl)' }}>
              <li style={{ padding: 'var(--space-sm) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <i className="fas fa-check" style={{color: 'var(--success)'}}></i>
                Neomezený počet plaveb
              </li>
              <li style={{ padding: 'var(--space-sm) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <i className="fas fa-check" style={{color: 'var(--success)'}}></i>
                Neomezený počet účastníků
              </li>
              <li style={{ padding: 'var(--space-sm) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <i className="fas fa-check" style={{color: 'var(--success)'}}></i>
                Vlastní checklisty a templaty
              </li>
              <li style={{ padding: 'var(--space-sm) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <i className="fas fa-check" style={{color: 'var(--success)'}}></i>
                Crew listy a správa posádky
              </li>
              <li style={{ padding: 'var(--space-sm) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <i className="fas fa-check" style={{color: 'var(--success)'}}></i>
                Sledování plateb
              </li>
            </ul>
            
            <Link to="/register" className="btn btn-primary btn-lg">
              <i className="fas fa-rocket"></i>
              Začít používat
            </Link>
          </div>
        </div>
      </section>

      <section style={{ background: 'linear-gradient(135deg, var(--ocean-deep), var(--ocean-mid))', padding: 'var(--space-3xl) 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ color: 'white', marginBottom: 'var(--space-md)' }}>Připraveni vyplout?</h2>
          <p style={{ color: 'var(--gray-400)', marginBottom: 'var(--space-xl)', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
            Zaregistrujte se zdarma a začněte organizovat své plavby profesionálně.
          </p>
          <Link to="/register" className="btn btn-coral btn-lg">
            <i className="fas fa-sailboat"></i>
            Vytvořit účet zdarma
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="logo">
                <div className="logo-icon">
                  <i className="fas fa-sailboat"></i>
                </div>
                SailPlan
              </Link>
              <p>Moderní platforma pro organizaci jachtových plaveb. Vytvořeno s láskou pro námořníky.</p>
            </div>
            
            <div className="footer-links">
              <h5>Produkt</h5>
              <ul>
                <li><a href="#features">Funkce</a></li>
                <li><a href="#pricing">Ceník</a></li>
              </ul>
            </div>
            
            <div className="footer-links">
              <h5>Podpora</h5>
              <ul>
                <li><a href="#">Nápověda</a></li>
                <li><a href="#">Kontakt</a></li>
                <li><a href="#">FAQ</a></li>
              </ul>
            </div>
            
            <div className="footer-links">
              <h5>Právní</h5>
              <ul>
                <li><a href="#">Podmínky použití</a></li>
                <li><a href="#">Ochrana soukromí</a></li>
                <li><a href="#">GDPR</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2025 SailPlan. Všechna práva vyhrazena.</p>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <a href="#" style={{ color: 'var(--gray-400)' }}><i className="fab fa-facebook"></i></a>
              <a href="#" style={{ color: 'var(--gray-400)' }}><i className="fab fa-instagram"></i></a>
              <a href="#" style={{ color: 'var(--gray-400)' }}><i className="fab fa-twitter"></i></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

