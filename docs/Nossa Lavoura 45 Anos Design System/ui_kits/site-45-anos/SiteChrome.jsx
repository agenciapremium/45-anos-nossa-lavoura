const { Button, IconButton, Badge, Panel, Icon } = window.NossaLavoura45AnosDesignSystem_30d0cd;

const NAV = [
  { id: 'home', label: 'Início' },
  { id: 'catalogo', label: 'Produtos' },
  { id: 'campanha', label: '45 Anos' },
];

function SiteHeader({ route, onRoute, onLead }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--terra-700)', color: 'var(--creme-500)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-6)', padding: '0 var(--gutter-page)', height: 76, maxWidth: 1400, margin: '0 auto' }}>
        <button onClick={() => onRoute('home')} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em', lineHeight: 1, color: 'var(--creme-500)' }}>
            NOSSA<br /><span style={{ color: 'var(--lima-500)' }}>LAVOURA</span>
          </span>
          <span style={{ width: 2, height: 34, background: 'var(--border-on-inverse)' }} />
          <span className="nl-eyebrow" style={{ color: 'var(--lima-500)' }}>45 anos</span>
        </button>
        <nav style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => onRoute(n.id)}
              style={{
                borderRadius: 'var(--radius-control)',
                border: 'none', cursor: 'pointer', padding: '10px 18px',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-body-sm)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: route === n.id ? 'var(--lima-500)' : 'transparent',
                color: route === n.id ? 'var(--terra-900)' : 'var(--text-on-inverse-muted)',
                transition: 'var(--transition-control)',
              }}>{n.label}</button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-on-inverse-muted)' }}>(69) 3441-0045</span>
          <Button variant="primary" size="sm" icon="seta" onClick={onLead}>Falar com consultor</Button>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer style={{ background: 'var(--terra-900)', color: 'var(--text-on-inverse)', padding: 'var(--space-8) var(--gutter-page) var(--space-6)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 'var(--space-7)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, lineHeight: 1.05 }}>NOSSA<br /><span style={{ color: 'var(--lima-500)' }}>LAVOURA</span></span>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-on-inverse-muted)', maxWidth: '32ch' }}>Nutrição animal, sal mineral, sementes e insumos para o produtor rural desde 1980.</p>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Icon name="boi" size={26} color="var(--lima-500)" />
            <Icon name="saco" size={26} color="var(--lima-500)" />
            <Icon name="grama" size={26} color="var(--lima-500)" />
          </div>
        </div>
        {[['Produtos', ['Nutrição animal', 'Sal mineral', 'Sementes', 'Defensivos']],
          ['Institucional', ['Nossa história', '45 anos', 'Trabalhe conosco', 'Unidades']],
          ['Atendimento', ['Fale com um consultor', 'Central de pedidos', 'Assistência técnica', 'WhatsApp']]].map(([t, items]) => (
          <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <span className="nl-eyebrow" style={{ color: 'var(--lima-500)' }}>{t}</span>
            {items.map((i) => <a key={i} href="#" style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-on-inverse-muted)', textDecoration: 'none' }}>{i}</a>)}
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1400, margin: '0 auto', marginTop: 'var(--space-7)', paddingTop: 'var(--space-4)', borderTop: '2px solid var(--border-on-inverse)', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-body-sm)', color: 'var(--text-on-inverse-muted)' }}>
        <span>© 2026 Nossa Lavoura · 45 anos no campo</span>
        <span>Ji-Paraná · Cacoal · Vilhena — RO</span>
      </div>
    </footer>
  );
}

function SectionHead({ eyebrow, title, description, align = 'left', inverse = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', textAlign: align, alignItems: align === 'center' ? 'center' : 'flex-start', maxWidth: align === 'center' ? '58ch' : '48ch', margin: align === 'center' ? '0 auto' : undefined }}>
      {eyebrow && <span className="nl-eyebrow" style={{ color: inverse ? 'var(--lima-500)' : 'var(--text-accent)' }}>{eyebrow}</span>}
      <h2 style={{ fontSize: 'var(--text-display)', lineHeight: 1.05, color: inverse ? 'var(--creme-500)' : 'var(--text-strong)' }}>{title}</h2>
      {description && <p style={{ fontSize: 'var(--text-lead)', fontWeight: 300, color: inverse ? 'var(--text-on-inverse-muted)' : 'var(--text-body)' }}>{description}</p>}
    </div>
  );
}

Object.assign(window, { SiteHeader, SiteFooter, SectionHead, NAV });
