const { Button, Badge, Panel, Card, Icon, Input, Select, Checkbox, Radio, Toast, Octagon } = window.NossaLavoura45AnosDesignSystem_30d0cd;

function CampanhaScreen({ onLead }) {
  const [fase, setFase] = React.useState('Recria');
  const [ok, setOk] = React.useState(true);
  const [sent, setSent] = React.useState(false);

  return (
    <main>
      <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--lima-500)', padding: 'var(--space-8) var(--gutter-page)' }}>
        <Octagon corner="top-left" size={280} variant="outline" color="var(--terra-700)" opacity={0.4} />
        <Octagon corner="bottom-right" size={240} color="var(--lima-600)" />
        <div style={{ position: 'relative', maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,0.8fr)', gap: 'var(--space-7)', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
            <Badge tone="terra">Campanha de aniversário</Badge>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-display)', lineHeight: 1.02, letterSpacing: '-0.03em', color: 'var(--terra-900)', maxWidth: '20ch' }}>
              45 ofertas para comemorar 45 anos
            </h1>
            <p style={{ fontSize: 'var(--text-lead)', fontWeight: 300, color: 'var(--terra-700)', maxWidth: '44ch' }}>
              Condições especiais em nutrição, sal mineral e sementes durante todo o mês — com frete cortesia acima de 1 tonelada.
            </p>
            <Button variant="secondary" size="lg" icon="seta" onClick={onLead}>Quero as condições</Button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img src="../../assets/selo-45-anos.png" alt="Selo 45 anos Nossa Lavoura" style={{ width: '100%', maxWidth: 360 }} />
          </div>
        </div>
      </section>

      <section style={{ padding: 'var(--section-y) var(--gutter-page)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <SectionHead align="center" eyebrow="Ofertas do mês" title="O que está em condição especial" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 'var(--space-4)' }}>
            {[['Proteinado Cria 30', 'saco', '-12%'], ['Mineral Seca 90', 'boi', '-15%'], ['Braquiária Brizantha', 'grama', '-10%'], ['Núcleo Leite Plus', 'boi', '-8%']].map(([n, ic, off], i) => (
              <Card key={n} icon={ic} eyebrow="45 anos" title={n} badge={off} tone={i === 1 ? 'terra' : 'card'} description="Válido para pedidos fechados neste mês." />
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--surface-page-alt)', padding: 'var(--section-y) var(--gutter-page)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 'var(--space-7)', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <SectionHead eyebrow="Consultoria" title="Deixe seu contato" description="Um consultor liga em até um dia útil com preço e prazo para a sua fazenda." />
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <Icon name="boi" size={46} color="var(--terra-500)" />
              <Icon name="saco" size={46} color="var(--terra-500)" />
              <Icon name="grama" size={46} color="var(--terra-500)" />
            </div>
          </div>
          <Panel tone="card" radius="var(--radius-surface)" padding="var(--space-6)" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {sent ? (
              <Toast title="Recebemos seu contato" message="Nosso consultor liga em até 1 dia útil." onClose={() => setSent(false)} />
            ) : (
              <>
                <Input label="Nome" placeholder="Seu nome" />
                <Input label="WhatsApp" placeholder="(69) 90000-0000" />
                <Select label="Município" placeholder="Selecione" options={['Ji-Paraná', 'Cacoal', 'Vilhena', 'Rolim de Moura']} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <span className="nl-eyebrow" style={{ color: 'var(--text-body)' }}>Fase do rebanho</span>
                  <Radio name="fase" direction="row" value={fase} onChange={setFase} options={['Cria', 'Recria', 'Engorda']} />
                </div>
                <Checkbox label="Aceito receber ofertas no WhatsApp" checked={ok} onChange={(e) => setOk(e.target.checked)} />
                <Button variant="primary" fullWidth icon="seta" onClick={() => setSent(true)}>Enviar contato</Button>
              </>
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

Object.assign(window, { CampanhaScreen });
