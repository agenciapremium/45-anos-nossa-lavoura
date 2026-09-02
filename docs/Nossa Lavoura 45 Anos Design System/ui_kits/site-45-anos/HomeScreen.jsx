const { Button, Badge, Panel, Card, Icon, Tag, Octagon } = window.NossaLavoura45AnosDesignSystem_30d0cd;

function HomeScreen({ onRoute, onLead }) {
  return (
    <main>
      {/* HERO */}
      <section style={{ position: 'relative', minHeight: 620, display: 'flex', alignItems: 'center', overflow: 'hidden', background: 'var(--terra-700)' }}>
        <img src="../../assets/images/kv-gado-pasto.png" alt="Gado nelore no pasto ao amanhecer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(96deg, var(--terra-900) 0%, color-mix(in srgb, var(--terra-900) 78%, transparent) 46%, transparent 76%)' }} />
        <Octagon corner="bottom-left" size={300} color="var(--lima-500)" opacity={0.9} />
        <Octagon corner="top-right" size={260} variant="outline" color="var(--creme-500)" opacity={0.35} />
        <div style={{ position: 'relative', maxWidth: 1400, margin: '0 auto', padding: 'var(--space-9) var(--gutter-page)', width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)', gap: 'var(--space-7)', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', alignItems: 'flex-start' }}>
            <Badge tone="accent">1980 — 2026</Badge>
            <h1 className="nl-hero" style={{ color: 'var(--creme-500)', maxWidth: '18ch' }}>45 anos ao lado de quem <span style={{ color: 'var(--lima-500)' }}>faz o campo</span></h1>
            <p style={{ fontSize: 'var(--text-lead)', fontWeight: 300, color: 'var(--creme-500)', maxWidth: '46ch' }}>
              Nutrição animal, sal mineral, sementes e insumos com consultoria técnica na porteira — do plantio ao pasto.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Button variant="primary" size="lg" icon="seta" onClick={() => onRoute('campanha')}>Ofertas de aniversário</Button>
              <Button variant="onDark" size="lg" onClick={() => onRoute('catalogo')}>Ver produtos</Button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img src="../../assets/selo-45-anos.png" alt="Selo 45 anos Nossa Lavoura" style={{ width: '100%', maxWidth: 420, filter: 'drop-shadow(0 24px 48px rgba(42,21,18,.45))' }} />
          </div>
        </div>
      </section>

      {/* NUMBERS STRIP */}
      <section style={{ background: 'var(--lima-500)', color: 'var(--terra-900)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: 'var(--space-6) var(--gutter-page)', display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 'var(--space-6)' }}>
          {[['45', 'anos de estrada'], ['6', 'unidades em Rondônia'], ['+3.200', 'produtores atendidos'], ['24h', 'para entrega na fazenda']].map(([n, l]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 46, lineHeight: 1, letterSpacing: '-0.02em' }}>{n}</span>
              <span className="nl-eyebrow" style={{ color: 'var(--terra-700)' }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* LINHAS */}
      <section style={{ padding: 'var(--section-y) var(--gutter-page)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
            <SectionHead eyebrow="O que fazemos" title="Linhas que sustentam o seu rebanho" description="Formulações por fase, insumos de plantio e assistência técnica no campo." />
            <Button variant="outline" icon="seta" onClick={() => onRoute('catalogo')}>Catálogo completo</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 'var(--space-5)' }}>
            <Card icon="boi" eyebrow="Nutrição animal" title="Linha Cria & Recria" description="Proteinados e rações para bezerros e novilhas em qualquer estação." badge="Mais vendida" onClick={() => onRoute('catalogo')} />
            <Card icon="saco" eyebrow="Sal mineral" title="Mineral Seca 90" description="Suplementação ajustada para os meses de pasto seco." onClick={() => onRoute('catalogo')} />
            <Card icon="grama" eyebrow="Sementes" title="Pastagem & forragem" description="Braquiária, panicum e mix de forrageiras com garantia de pureza." onClick={() => onRoute('catalogo')} />
          </div>
        </div>
      </section>

      {/* HISTORIA */}
      <section style={{ background: 'var(--surface-page-alt)', padding: 'var(--section-y) var(--gutter-page)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,0.9fr) minmax(0,1.1fr)', gap: 'var(--space-8)', alignItems: 'center' }}>
          <Panel tone="terra" radius="var(--radius-surface)" padding="0" style={{ overflow: 'hidden', height: 420 }}>
            <img src="../../assets/images/kv-gado-pasto.png" alt="Rebanho no pasto" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '60% 70%' }} />
          </Panel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <SectionHead eyebrow="Nossa história" title="Começou com um armazém. Virou parceria de gerações." description="Em 1980 abrimos as portas com sacaria de semente e um caminhão. Hoje somos seis unidades, uma equipe de agrônomos e zootecnistas e a mesma conversa direta com o produtor." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 'var(--space-4)' }}>
              {[['1980', 'Primeira loja em Ji-Paraná'], ['1998', 'Fábrica de sal mineral'], ['2012', 'Equipe técnica em campo'], ['2026', '45 anos e seis unidades']].map(([y, t]) => (
                <Panel key={y} tone="card" radius="var(--radius-control)" padding="var(--space-4)">
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--text-accent)' }}>{y}</span>
                  <p style={{ fontSize: 'var(--text-body-sm)', marginTop: 4 }}>{t}</p>
                </Panel>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: 'var(--section-y) var(--gutter-page)' }}>
        <Panel tone="terra" radius="var(--radius-surface)" padding="var(--space-8)" style={{ position: 'relative', overflow: 'hidden', maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-7)', flexWrap: 'wrap' }}>
          <Octagon corner="top-right" size={280} variant="outline" color="var(--lima-500)" opacity={0.5} />
          <Octagon corner="bottom-left" size={200} color="var(--lima-500)" opacity={0.14} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: '40ch' }}>
            <span className="nl-eyebrow" style={{ color: 'var(--lima-500)' }}>Consultoria na porteira</span>
            <h2 style={{ color: 'var(--creme-500)', fontSize: 'var(--text-h1)', lineHeight: 1.05 }}>Um técnico na sua fazenda, sem custo</h2>
            <p style={{ color: 'var(--text-on-inverse-muted)' }}>Agende uma visita e receba um plano nutricional para a próxima safra.</p>
          </div>
          <div style={{ position: 'relative', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <Icon name="grama" size={72} color="var(--lima-500)" />
            <Button variant="primary" size="lg" icon="seta" onClick={onLead}>Agendar visita</Button>
          </div>
        </Panel>
      </section>
    </main>
  );
}

Object.assign(window, { HomeScreen });
