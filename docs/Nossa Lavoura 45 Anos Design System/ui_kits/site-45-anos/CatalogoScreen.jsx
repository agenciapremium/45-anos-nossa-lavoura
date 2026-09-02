const { Button, IconButton, Badge, Panel, Card, Icon, Tag, Tabs, Select, Input, Switch, Tooltip } = window.NossaLavoura45AnosDesignSystem_30d0cd;

const PRODUTOS = [
  { nome: 'Proteinado Cria 30', linha: 'Bovinos', tipo: 'Nutrição animal', icon: 'saco', badge: 'Mais vendido', desc: 'Proteína para bezerros em pasto seco.', peso: '30 kg' },
  { nome: 'Mineral Seca 90', linha: 'Bovinos', tipo: 'Sal mineral', icon: 'saco', desc: 'Núcleo mineral para os meses críticos.', peso: '25 kg' },
  { nome: 'Ração Engorda Alta', linha: 'Bovinos', tipo: 'Nutrição animal', icon: 'boi', desc: 'Terminação em confinamento, 90 dias.', peso: '40 kg' },
  { nome: 'Braquiária Brizantha', linha: 'Sementes', tipo: 'Sementes', icon: 'grama', badge: 'Safra 26', desc: 'Pureza 98%, VC 80%.', peso: '10 kg' },
  { nome: 'Panicum Mombaça', linha: 'Sementes', tipo: 'Sementes', icon: 'grama', desc: 'Alta produção de massa verde.', peso: '10 kg' },
  { nome: 'Núcleo Leite Plus', linha: 'Leite', tipo: 'Nutrição animal', icon: 'boi', desc: 'Suporte de produção para vacas em lactação.', peso: '25 kg' },
];

function CatalogoScreen({ onLead }) {
  const [tab, setTab] = React.useState('Bovinos');
  const [tipo, setTipo] = React.useState('');
  const [promo, setPromo] = React.useState(false);
  const [busca, setBusca] = React.useState('');
  const [tags, setTags] = React.useState(['Fase cria']);

  const lista = PRODUTOS.filter((p) => p.linha === tab)
    .filter((p) => !tipo || p.tipo === tipo)
    .filter((p) => !busca || p.nome.toLowerCase().includes(busca.toLowerCase()))
    .filter((p) => !promo || p.badge);

  return (
    <main>
      <section style={{ background: 'var(--terra-700)', padding: 'var(--space-8) var(--gutter-page) var(--space-7)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <SectionHead inverse eyebrow="Catálogo" title="Produtos para cada fase do rebanho" description="Filtre por linha e receba o preço do dia com o consultor da sua região." />
          <Tabs tone="dark" items={['Bovinos', 'Leite', 'Sementes']} value={tab} onChange={setTab} />
        </div>
      </section>

      <section style={{ padding: 'var(--space-7) var(--gutter-page) var(--section-y)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: 'var(--space-7)', alignItems: 'start' }}>
          <Panel tone="card" radius="var(--radius-card)" padding="var(--space-5)" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', position: 'sticky', top: 100 }}>
            <Input label="Buscar" placeholder="Nome do produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <Select label="Categoria" placeholder="Todas" value={tipo} onChange={(e) => setTipo(e.target.value)} options={['Nutrição animal', 'Sal mineral', 'Sementes']} />
            <Switch label="Só ofertas 45 anos" checked={promo} onChange={(e) => setPromo(e.target.checked)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <span className="nl-eyebrow" style={{ color: 'var(--text-muted)' }}>Filtros ativos</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {tags.map((t) => <Tag key={t} onRemove={() => setTags(tags.filter((x) => x !== t))}>{t}</Tag>)}
                <Tag onClick={() => setTags([...new Set([...tags, 'Entrega 24h'])])}>+ Entrega 24h</Tag>
              </div>
            </div>
            <Button variant="secondary" fullWidth onClick={onLead}>Pedir cotação</Button>
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)' }}>{lista.length} produto(s) em {tab}</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <Tooltip label="Entrega em até 24h na fazenda"><Icon name="saco" size={22} color="var(--terra-500)" /></Tooltip>
                <IconButton icon="seta" iconRotate={180} variant="outline" size="sm" label="Anterior" />
                <IconButton icon="seta" size="sm" label="Próximo" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 'var(--space-5)' }}>
              {lista.map((p, i) => (
                <Card key={p.nome} icon={p.icon} eyebrow={p.tipo} title={p.nome} description={p.desc} badge={p.badge}
                  footer={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{p.peso}</span>
                    <Button size="sm" variant="primary" icon="seta" onClick={onLead}>Cotar</Button>
                  </div>} />
              ))}
              {!lista.length && (
                <Panel tone="creme" radius="var(--radius-card)" padding="var(--space-6)" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Nenhum produto com esses filtros. Fale com um consultor.</p>
                </Panel>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

Object.assign(window, { CatalogoScreen });
