import type { Metadata } from 'next';

import './landing.css';

import { ContagemRegressiva } from '@/components/landing/contagem-regressiva';
import {
  DadosEstruturados,
  grafoDaLanding,
} from '@/components/landing/dados-estruturados';
import { PlayerVt } from '@/components/landing/player-vt';
import { RevelarAoRolar } from '@/components/landing/revelar-ao-rolar';
import { GeometriaDoSistema, Seta } from '@/components/landing/seta';
import { TarjaCampanha } from '@/components/landing/tarja-campanha';
import { DOMINIO_CANONICO } from '@/lib/urls';

const TITULO =
  'Nossa Lavoura 45 Anos | Uma história construída com quem faz o campo acontecer';
const DESCRICAO =
  'A Nossa Lavoura celebra 45 anos ao lado do produtor rural em Rondônia, Acre e Amazonas. Conheça a história e aproveite a semana de aniversário, de 19 a 24 de outubro.';
const OG = `${DOMINIO_CANONICO}/assets/img/og.jpg`;

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  robots:
    'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Nossa Lavoura',
    title: 'Nossa Lavoura 45 Anos | 45 anos cultivando confiança',
    description:
      'São 45 anos ao lado de quem faz o campo acontecer. Semana de aniversário de 19 a 24 de outubro, em todas as lojas Nossa Lavoura de Rondônia, Acre e Amazonas.',
    images: [
      {
        url: OG,
        secureUrl: OG,
        type: 'image/jpeg',
        width: 1200,
        height: 630,
        alt: 'Produtor rural sorrindo ao lado do selo dos 45 anos da Nossa Lavoura. 45 anos cultivando confiança. Semana de aniversário de 19 a 24 de outubro.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nossa Lavoura 45 Anos | 45 anos cultivando confiança',
    description:
      'São 45 anos ao lado de quem faz o campo acontecer. Semana de aniversário de 19 a 24 de outubro, em todas as lojas.',
    images: [
      {
        url: OG,
        alt: 'Produtor rural sorrindo ao lado do selo dos 45 anos da Nossa Lavoura.',
      },
    ],
  },
};

const CATEGORIAS = [
  {
    chapeu: 'Nutrição animal',
    titulo: 'Nutrição que leva o seu rebanho mais longe.',
    texto:
      'Soluções Supremax para cada fase do rebanho, com nutrição pensada para mais desempenho no campo.',
  },
  {
    chapeu: 'Saúde animal',
    titulo: 'Cuidado com o rebanho também é produtividade.',
    texto:
      'Soluções para prevenção, proteção e manejo sanitário que ajudam a manter a saúde e o desempenho do seu rebanho.',
  },
  {
    chapeu: 'Pastagem e herbicidas',
    titulo: 'Proteção para uma pastagem mais produtiva.',
    texto:
      'Tecnologia e inovação para proteger a sua pastagem com a linha exclusiva de herbicidas Corteva.',
  },
  {
    chapeu: 'Sementes de pastagem',
    titulo: 'Um pasto forte começa com uma boa escolha.',
    texto:
      'Sementes de qualidade para formar pastagens produtivas e preparar a propriedade para produzir mais.',
  },
  {
    chapeu: 'Arames e cercas',
    titulo: 'Resistência para proteger o que você produz.',
    texto:
      'Soluções para cercamento que entregam segurança, resistência e praticidade para a rotina da propriedade.',
  },
  {
    chapeu: 'Máquinas e implementos',
    titulo: 'Força para fazer o campo acontecer.',
    texto:
      'Máquinas e equipamentos para facilitar o trabalho e aumentar a eficiência nas atividades da propriedade.',
  },
];

export default function Landing() {
  return (
    <>
      {/* `canonical` e `og:url` escritos à mão, e não pela API de metadata:
          com `trailingSlash: false` o Next normaliza `.../` para `...`, e a
          paridade com a versão estática pede a barra final. As duas formas
          apontam para o mesmo recurso, mas a comparação de tags é literal. */}
      <link rel="canonical" href={`${DOMINIO_CANONICO}/`} />
      <meta property="og:url" content={`${DOMINIO_CANONICO}/`} />

      <DadosEstruturados grafo={grafoDaLanding} />
      <RevelarAoRolar />

      <a className="skip" href="#conteudo">
        Pular para o conteúdo
      </a>

      <GeometriaDoSistema />

      <main id="conteudo">
        {/* ============ 01 · HERO ============ */}
        <section className="hero" id="topo">
          <div className="hero__kv" aria-hidden="true">
            <picture>
              <source
                media="(max-width:760px)"
                srcSet="/assets/img/pasto-900.webp"
              />
              <source
                media="(max-width:1500px)"
                srcSet="/assets/img/pasto-1600.webp"
              />
              <img
                src="/assets/img/pasto-2400.webp"
                alt=""
                width={2400}
                height={1600}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </div>
          <div className="hero__scrim" aria-hidden="true" />

          <div className="hero__in wrap">
            <div className="hero__copy">
              <h1 className="hero__h1">
                São <em>45&nbsp;anos</em> ao lado de quem faz o campo acontecer.
              </h1>
              <p className="hero__sub">
                A Nossa Lavoura celebra 45 anos de história, construídos com
                trabalho, parceria e confiança ao lado do produtor. Esta é a
                nossa festa, e ela é sua também.
              </p>
              <div className="hero__cta">
                <a className="btn btn--primary" href="#semana">
                  Ver a semana
                  <Seta />
                </a>
                <a className="btn btn--on-dark" href="#historia">
                  Nossa história
                </a>
              </div>
            </div>

            <img
              className="hero__selo"
              src="/assets/img/selo-1200.webp"
              alt="Selo comemorativo dos 45 anos da Nossa Lavoura"
              width={1200}
              height={1002}
              fetchPriority="high"
              decoding="async"
            />
          </div>

          <span className="hero__cue" aria-hidden="true">
            role para ver a história
          </span>
        </section>

        {/* ============ 02 · NÚMEROS ============ */}
        <section className="band nums" aria-label="Números da trajetória">
          <div className="wrap nums__grid">
            <div className="num" data-reveal>
              <b className="num__n" data-count="45">
                45
              </b>
              <span className="num__l">anos de história</span>
            </div>
            <div className="num" data-reveal>
              <b className="num__n" data-count="40" data-prefix="+">
                +40
              </b>
              <span className="num__l">
                lojas em Rondônia, Acre e Amazonas
              </span>
            </div>
            <div className="num" data-reveal>
              <b className="num__n" data-count="3">
                3
              </b>
              <span className="num__l">
                estados onde o produtor encontra a Nossa Lavoura
              </span>
            </div>
          </div>
        </section>

        {/* ============ 03 · MANIFESTO ============ */}
        <section className="band band--veil manif" id="historia">
          <div className="wrap manif__grid">
            <figure className="manif__fig" data-reveal>
              {/* Duas versões da mesma foto: retrato na coluna do desktop,
                  paisagem quando a seção empilha no mobile. */}
              <picture>
                <source
                  media="(max-width:900px)"
                  srcSet="/assets/img/unidade_jaru_mobile.webp"
                  width={1200}
                  height={675}
                />
                <img
                  src="/assets/img/unidade_jaru_desktop.webp"
                  alt="Fachada da loja Nossa Lavoura em Jaru ao fim da tarde, com o letreiro da marca e o da Supremax"
                  width={899}
                  height={1599}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <figcaption>
                A unidade de Jaru hoje. Foi nessa cidade que a história começou.
              </figcaption>
            </figure>

            <div className="manif__txt">
              <p className="eyebrow" data-reveal>
                Nossa história
              </p>
              <h2 className="h2" data-reveal>
                Uma história que o campo escreveu junto com a gente.
              </h2>
              <div className="prose">
                <p data-reveal>
                  Começamos pequenos, em Jaru, atendendo quem chegava ao balcão
                  com uma dúvida e um problema para resolver.
                </p>
                <p data-reveal>
                  De lá para cá, quase tudo mudou. Mudou a fachada, mudou o nome
                  na placa, mudaram as ferramentas, cresceu a equipe, cresceu o
                  campo, cresceu a região inteira. Hoje são mais de 40 lojas em
                  Rondônia, Acre e Amazonas.
                </p>
                <p data-reveal>
                  Uma coisa não mudou: o motivo de abrir a porta todo dia. É o
                  produtor que chega procurando a semente certa, a ração que vai
                  render, o remédio que o rebanho precisa, o arame que vai
                  segurar a cerca por mais um ano.
                </p>
                <p data-reveal>
                  São 45 anos compartilhando sonhos, desafios, conquistas e o
                  trabalho que move o campo todos os dias. Uma trajetória
                  construída ao lado de produtores, colaboradores e parceiros
                  que acreditaram, cresceram e ajudaram a escrever cada capítulo
                  dessa história.
                </p>
                <p className="prose__lead" data-reveal>
                  Relações construídas dia após dia, no campo e na vida. Com
                  confiança, parceria e laços que atravessam gerações.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 04 · LINHA DO TEMPO ============ */}
        <section className="band tl" id="trajetoria">
          <div className="wrap">
            <p className="eyebrow eyebrow--center" data-reveal>
              Linha do tempo
            </p>
            <h2 className="h2 h2--center" data-reveal>
              Os capítulos dessa caminhada
            </h2>
          </div>

          <div
            className="tl__scroller"
            role="group"
            aria-label="Linha do tempo da Nossa Lavoura"
            tabIndex={0}
          >
            <ol className="tl__rail">
              <li className="tl__item" data-reveal>
                <span className="tl__dot" aria-hidden="true" />
                <h3 className="tl__t">O começo, em Jaru</h3>
                <p>
                  A primeira loja nasce em Jaru, atendendo os produtores da
                  região.
                </p>
              </li>
              <li className="tl__item" data-reveal>
                <span className="tl__dot" aria-hidden="true" />
                <h3 className="tl__t">A expansão pelo interior</h3>
                <p>
                  A marca chega a novas praças de Rondônia e o atendimento se
                  espalha pelo interior.
                </p>
              </li>
              <li className="tl__item" data-reveal>
                <span className="tl__dot" aria-hidden="true" />
                <b className="tl__y">2023</b>
                <h3 className="tl__t">Entrada da Axia</h3>
                {/* FALTA A DESCRIÇÃO: duas ou três linhas sobre o que a entrada
                    da Axia representou. Não escrevi para não inventar o fato. */}
              </li>
              <li className="tl__item" data-reveal>
                <span className="tl__dot" aria-hidden="true" />
                <b className="tl__y">2025</b>
                <h3 className="tl__t">Nossa Lavoura</h3>
                <p>
                  A marca assume o nome que a acompanha até hoje e a assinatura
                  que traduz o que ela faz: amiga de quem planta, cria e produz.
                </p>
              </li>
              <li className="tl__item tl__item--now" data-reveal>
                <span className="tl__dot" aria-hidden="true" />
                <b className="tl__y">2026</b>
                <h3 className="tl__t">45 anos</h3>
                <p>
                  A celebração de quatro décadas e meia ao lado de quem faz o
                  campo produzir.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* ============ 05 · VT EMOCIONAL ============ */}
        <section className="band band--veil vt" id="filme">
          <div className="wrap">
            <p className="eyebrow eyebrow--center" data-reveal>
              O filme
            </p>
            <h2 className="h2 h2--center" data-reveal>
              45 anos em pouco mais de um minuto
            </h2>
            <p className="lead lead--center" data-reveal>
              O filme que preparamos para contar essa história do jeito que ela
              merece ser contada: pelas pessoas que a construíram.
            </p>

            <PlayerVt />

            <div className="vt__txt" data-reveal>
              <p>
                Há 45 anos, a Nossa Lavoura faz parte da vida de quem vive o
                agro. São 45 anos compartilhando sonhos, desafios, conquistas e
                o trabalho que move o campo todos os dias. A todos que fazem
                parte dessa jornada, o nosso sincero obrigado.
              </p>
            </div>
          </div>
        </section>

        {/* ============ 06 · GRATIDÃO ============ */}
        <section className="band grat" id="gratidao">
          <div className="wrap">
            <p className="eyebrow eyebrow--center" data-reveal>
              Nossa gratidão
            </p>
            <h2 className="h2 h2--center" data-reveal>
              Esses 45 anos são de todos que construíram juntos
            </h2>

            <div className="grat__grid">
              <article className="gcard" data-reveal>
                <h3>Obrigado, produtor. Esses 45 anos são seus também.</h3>
                <p>
                  Cada conquista da Nossa Lavoura tem a marca de quem confia no
                  nosso trabalho. Foi ao seu lado, no dia a dia do campo, que
                  construímos essa história.
                </p>
              </article>

              <article className="gcard" data-reveal>
                <h3>Nada disso seria possível sem o nosso time.</h3>
                <p>
                  Por trás de 45 anos de história existe gente dedicada, que
                  veste a camisa todos os dias e cuida de cada produtor que
                  chega à Nossa Lavoura. A cada colaborador, o nosso muito
                  obrigado.
                </p>
              </article>

              <article className="gcard" data-reveal>
                <h3>A quem constrói o campo com a gente: obrigado.</h3>
                <p>
                  Em 45 anos de história, cada fornecedor e parceiro teve papel
                  na jornada da Nossa Lavoura. É essa rede de confiança que nos
                  permite levar as melhores soluções ao produtor.
                </p>
              </article>
            </div>

            <p className="grat__end" data-reveal>
              Seguimos juntos, fortalecendo o agro!
            </p>
          </div>
        </section>

        {/* ============ 07 · SEMANA DE ANIVERSÁRIO — a virada ============ */}
        <section className="band band--accent semana" id="semana">
          <svg
            className="oct oct--tl"
            viewBox="0 0 100 100"
            width={300}
            height={300}
            aria-hidden="true"
            style={{ opacity: 0.3 }}
          >
            <use
              href="#oct-line"
              fill="none"
              stroke="var(--terra-700)"
              strokeWidth={2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="wrap semana__in">
            <p
              className="eyebrow eyebrow--center eyebrow--on-accent"
              data-reveal
            >
              19 a 24 de outubro
            </p>
            <h2 className="semana__h2" data-reveal>
              45 anos com ofertas especiais para quem faz o campo acontecer.
            </h2>
            <p
              className="lead lead--center lead--on-accent semana__lead"
              data-reveal
            >
              Para comemorar essa história, preparamos uma semana inteira de
              oportunidades para você economizar e produzir mais. São condições
              especiais em produtos para nutrição animal, pastagem, saúde do
              rebanho, sementes, máquinas, equipamentos e muito mais.
            </p>

            <div className="semana__box" data-reveal>
              <strong>De 19 a 24 de outubro, em todas as lojas.</strong>
              <ContagemRegressiva />
            </div>

            <a className="btn btn--lg btn--secondary" href="#lojas" data-reveal>
              Falar com um consultor
              <Seta />
            </a>
          </div>
        </section>

        {/* ============ 08 · OFERTAS DE ANIVERSÁRIO ============ */}
        <section className="band cats" id="ofertas">
          <div className="wrap">
            <p className="eyebrow eyebrow--center" data-reveal>
              Ofertas de aniversário
            </p>
            <h2 className="h2 h2--center" data-reveal>
              O que tem de especial nesta semana
            </h2>
            <p className="lead lead--center" data-reveal>
              As condições de aniversário valem para as categorias que mais
              pesam na sua produção. Fale com o Consultor de Vendas da loja mais
              próxima e aproveite as melhores ofertas.
            </p>

            <div className="cats__grid">
              {CATEGORIAS.map((c) => (
                <article className="cat" data-reveal key={c.chapeu}>
                  <p className="cat__k">{c.chapeu}</p>
                  <h3 className="cat__t">{c.titulo}</h3>
                  <p className="cat__d">{c.texto}</p>
                </article>
              ))}
            </div>

            <p className="cats__note" data-reveal>
              Condições válidas de 19 a 24 de outubro de 2026, nas lojas
              participantes, enquanto durarem os estoques. Consulte o seu
              consultor de vendas.
            </p>
          </div>
        </section>

        {/* ============ 09 · ACELERA NO CAMPO 3.0 ============ */}
        <section className="band band--veil acel" id="acelera">
          <svg
            className="oct oct--br"
            viewBox="0 0 100 100"
            width={340}
            height={340}
            aria-hidden="true"
            style={{ opacity: 0.12 }}
          >
            <use href="#oct-solid" fill="var(--lima-500)" />
          </svg>
          <div className="wrap">
            <p className="eyebrow" data-reveal>
              Acelera no Campo 3.0
            </p>
            <h2 className="acel__h2" data-reveal>
              Nas compras do aniversário, você também pode acelerar rumo a um
              John Deere!
            </h2>
            <p className="lead" data-reveal>
              Comprando produtos Virbac e Supremax na Nossa Lavoura, você recebe
              cupons para concorrer a um Trator John Deere 5080E.
            </p>

            <div className="acel__mec">
              <div className="mec" data-reveal>
                <b className="mec__v">R$ 500</b>
                <span className="mec__l">em produtos Virbac</span>
                <b className="mec__c">1 cupom</b>
              </div>
              <div className="mec" data-reveal>
                <b className="mec__v">R$ 2.000</b>
                <span className="mec__l">em produtos Supremax</span>
                <b className="mec__c">1 cupom</b>
              </div>
            </div>

            <p className="acel__vig" data-reveal>
              Promoção válida até 30 de novembro de 2026.
            </p>
            <a
              className="btn btn--primary"
              href="https://nossalavoura.com.br"
              target="_blank"
              rel="noopener"
              data-reveal
            >
              Ler o regulamento
              <Seta />
            </a>
          </div>
        </section>

        {/* ============ 10 · CAFÉ DA MANHÃ ============ */}
        <section className="band cafe" id="cafe">
          <div className="wrap cafe__in">
            <p className="eyebrow eyebrow--center" data-reveal>
              Convite
            </p>
            <h2 className="h2 h2--center" data-reveal>
              Café da manhã especial
            </h2>
            <p className="cafe__call" data-reveal>
              Há 45 anos, crescemos ao lado de quem faz o agro acontecer.
            </p>
            <p className="lead lead--center" data-reveal>
              Para celebrar essa trajetória construída com confiança, parceria e
              dedicação, preparamos um café da manhã especial para receber você.
            </p>

            <div className="cafe__cards">
              <div className="icard" data-reveal>
                <p className="icard__k">Quando</p>
                <p className="icard__v">Dias 19, 21 e 23 de outubro</p>
              </div>
              <div className="icard" data-reveal>
                <p className="icard__k">Onde</p>
                <p className="icard__v">Em todas as lojas Nossa Lavoura</p>
              </div>
            </div>

            <p className="cafe__end" data-reveal>
              Esperamos você para celebrar conosco e aproveitar as ofertas
              especiais de aniversário.
            </p>
          </div>
        </section>

        {/* ============ 11 · ONDE NOS ENCONTRAR ============ */}
        <section className="band band--veil lojas" id="lojas">
          <div className="wrap lojas__in">
            <p className="eyebrow eyebrow--center" data-reveal>
              Onde nos encontrar
            </p>
            <h2 className="h2 h2--center" data-reveal>
              Perto de você, em três estados
            </h2>
            <p className="lead lead--center" data-reveal>
              São mais de 40 lojas em Rondônia, Acre e Amazonas, com consultores
              de vendas que conhecem a realidade da sua região e da sua
              propriedade.
            </p>

            <div className="lojas__uf">
              <div className="uf" data-reveal>
                <b>RO</b>
                <span>Rondônia</span>
              </div>
              <div className="uf" data-reveal>
                <b>AC</b>
                <span>Acre</span>
              </div>
              <div className="uf" data-reveal>
                <b>AM</b>
                <span>Amazonas</span>
              </div>
            </div>

            <a
              className="btn btn--lg btn--on-dark"
              href="https://lojas.nossalavoura.com.br/?utm_source=lp&utm_medium=button&utm_campaign=45anos"
              target="_blank"
              rel="noopener"
              data-reveal
            >
              Encontrar a loja mais próxima
              <Seta />
            </a>
          </div>
        </section>

        {/* ============ 12 · FECHAMENTO — o selo chega inteiro ============ */}
        <section className="band fim" id="fim">
          <div className="wrap fim__in">
            <div className="prose prose--center">
              <p data-reveal>
                Foram 45 anos de portas abertas, de safra que deu certo e de
                safra que deu trabalho, de conversa no balcão e de visita na
                propriedade.
              </p>
              <p data-reveal>
                Obrigado por caminhar com a gente até aqui. O próximo capítulo a
                gente escreve junto.
              </p>
            </div>

            <p className="lockup" data-reveal>
              <span>Nossa Lavoura,</span>
              <span className="lockup__b">
                amiga de quem planta, cria e produz.
              </span>
            </p>

            <a className="btn btn--lg btn--primary" href="#semana" data-reveal>
              Aproveitar a semana
              <Seta />
            </a>
          </div>
        </section>
      </main>

      {/* ============ 13 · RODAPÉ ============ */}
      <footer className="ft">
        <div className="wrap ft__in">
          <div className="ft__brand">
            <img
              src="/assets/img/selo-600.webp"
              alt="Selo 45 anos Nossa Lavoura"
              width={72}
              height={60}
              loading="lazy"
              decoding="async"
            />
            <p className="ft__sig">
              <b>Nossa Lavoura,</b>
              <br />
              amiga de quem planta, cria e produz
            </p>
          </div>

          <nav className="ft__nav" aria-label="Links institucionais">
            <a href="https://nossalavoura.com.br" target="_blank" rel="noopener">
              Site institucional
            </a>
            <a href="https://nossalavoura.com.br" target="_blank" rel="noopener">
              Regulamento Acelera no Campo 3.0
            </a>
            <a href="#semana">Semana de aniversário</a>
            <a
              href="https://lojas.nossalavoura.com.br/?utm_source=lp&utm_medium=footer&utm_campaign=45anos"
              target="_blank"
              rel="noopener"
            >
              Nossas lojas
            </a>
          </nav>

          <div className="ft__legal">
            <p>LINEAGRO PRODUTOS AGROPECUARIOS SA · CNPJ 21.018.928/0053-02</p>
            <p>
              Rua Rui Barbosa esquina com Avenida dos Bandeirantes, 207, Beira
              Rio, Pimenta Bueno, RO
            </p>
          </div>
        </div>
      </footer>

      {/* Tarja de campanha: publicada automaticamente a partir de 12/10/2026 */}
      <TarjaCampanha />
    </>
  );
}
