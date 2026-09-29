import {
  Document,
  Font,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { join } from 'node:path';

/* =========================================================
   PDF de distribuição

   Um arquivo por colaborador, montado sob demanda e nunca armazenado
   (D6 do design). O PDF fotografa os convites disponíveis no instante do
   pedido — por isso o carimbo de geração é impresso.

   As cores são as de `tokens.css`, escritas aqui em literal: o
   `@react-pdf/renderer` não lê CSS variables, e o alternativo seria um
   parser de CSS no servidor só para isto.
   ========================================================= */

const TERRA_900 = '#2a1512';
const TERRA_700 = '#3d201b';
const TERRA_300 = '#8a5b4f';
const LIMA_500 = '#b8db3d';
const CREME_500 = '#fffadc';
const CREME_600 = '#f6eec6';
const BRANCO = '#ffffff';

/**
 * Os recursos do PDF ficam em `recursos/`, e não em `public/`, por duas
 * razões técnicas e uma de deploy:
 *
 * - `@react-pdf/renderer` **não lê WebP**; o selo precisa ser PNG. O arquivo
 *   é a conversão pixel a pixel do `.webp`, mesma dimensão (500×500) e sem
 *   recorte — as marcas Virbac e Supremax saem inteiras.
 * - Ele também **não lê WOFF2**; as fontes precisam ser TTF. Os TTF são os
 *   originais do design system, de `docs/FONT/`.
 * - `public/` é servido pela CDN e não entra no pacote da função na Vercel.
 *   Estes arquivos são lidos do disco em tempo de execução, então entram por
 *   `outputFileTracingIncludes` no `next.config.ts`.
 */
const RECURSOS = join(process.cwd(), 'lib/palestras/pdf/recursos');
const SELO = join(RECURSOS, 'selo-circuito.png');

Font.register({
  family: 'Parkinsans',
  fonts: [{ src: join(RECURSOS, 'Parkinsans-Bold.ttf'), fontWeight: 700 }],
});
Font.register({
  family: 'Hanken Grotesk',
  fonts: [
    { src: join(RECURSOS, 'HankenGrotesk-Regular.ttf'), fontWeight: 400 },
    { src: join(RECURSOS, 'HankenGrotesk-Bold.ttf'), fontWeight: 700 },
  ],
});

// O link do convite não pode quebrar em lugar nenhum: ele é para ser
// selecionado e copiado inteiro.
Font.registerHyphenationCallback((palavra) => [palavra]);

const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 34,
    backgroundColor: CREME_500,
    fontFamily: 'Hanken Grotesk',
    fontSize: 9.5,
    color: TERRA_700,
  },

  /* ---------- cabeçalho ---------- */
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: TERRA_700,
    borderRadius: 12,
    padding: 14,
  },
  selo: { width: 58, height: 58 },
  chapeu: {
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: LIMA_500,
    marginBottom: 3,
  },
  tituloCabecalho: {
    fontFamily: 'Parkinsans',
    fontWeight: 700,
    fontSize: 15,
    color: CREME_500,
  },
  subtituloCabecalho: { fontSize: 9.5, color: CREME_600, marginTop: 2 },
  carimbo: { fontSize: 7.5, color: CREME_600, marginTop: 4 },

  /* ---------- instruções ---------- */
  instrucoes: {
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: LIMA_500,
    paddingLeft: 9,
    fontSize: 8.5,
    color: TERRA_700,
  },

  /* ---------- bloco de palestra ---------- */
  bloco: { marginTop: 18 },
  blocoTopo: {
    backgroundColor: LIMA_500,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  blocoCidade: {
    fontFamily: 'Parkinsans',
    fontWeight: 700,
    fontSize: 13,
    color: TERRA_900,
  },
  blocoLinha: { fontSize: 8.5, color: TERRA_900, marginTop: 2 },
  blocoPrazo: { fontSize: 8.5, fontWeight: 700, color: TERRA_900, marginTop: 3 },

  /* ---------- linha de convite ---------- */
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRANCO,
    borderWidth: 1,
    borderColor: CREME_600,
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 5,
  },
  numero: {
    width: 20,
    fontFamily: 'Parkinsans',
    fontWeight: 700,
    fontSize: 11,
    color: TERRA_300,
    textAlign: 'right',
  },
  urlBloco: { flexGrow: 1, flexShrink: 1 },
  codigo: {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: TERRA_300,
  },
  url: { fontSize: 8.5, color: TERRA_900, marginTop: 1 },
  botao: {
    backgroundColor: TERRA_700,
    color: CREME_500,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    fontSize: 8,
    fontWeight: 700,
    textDecoration: 'none',
    textAlign: 'center',
    width: 108,
  },

  /* ---------- rodapé ---------- */
  rodape: {
    position: 'absolute',
    bottom: 18,
    left: 34,
    right: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: TERRA_300,
  },
  vazio: {
    marginTop: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: TERRA_300,
    borderRadius: 8,
    padding: 14,
    fontSize: 9,
  },
});

export type LinhaDeConvitePdf = {
  codigo: string;
  url: string;
  /**
   * Nulo no lote avulso (`convites-avulsos`): a mensagem do sistema é
   * assinada pelo colaborador que envia, e o convite avulso não tem
   * remetente. Sem link, a linha sai só com o código e o endereço.
   */
  linkWhatsapp: string | null;
};

export type BlocoDePalestraPdf = {
  cidade: string;
  data: string;
  horario: string;
  localNome: string;
  localEndereco: string;
  prazo: string;
  convites: LinhaDeConvitePdf[];
};

export type DadosDoPdf = {
  /** Linha grande do cabeçalho: o colaborador, ou o rótulo do lote avulso. */
  colaborador: string;
  /** Linha menor: a loja, ou "Administração" no lote avulso. */
  loja: string;
  geradoEm: string;
  blocos: BlocoDePalestraPdf[];
  /**
   * Lote avulso (requisito "Sem envio por WhatsApp"): tira o botão de cada
   * linha e troca a instrução do topo, que fala de escolher o contato no
   * WhatsApp. O PDF do lote avulso é para copiar endereço, não para enviar.
   */
  semWhatsapp?: boolean;
};

export function DocumentoDeDistribuicao({ dados }: { dados: DadosDoPdf }) {
  const total = dados.blocos.reduce((s, b) => s + b.convites.length, 0);

  return (
    <Document
      title={`Convites · ${dados.colaborador}`}
      author="Nossa Lavoura"
      subject="Circuito de Palestras Acelera no Campo 3.0"
      language="pt-BR"
    >
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecalho} fixed>
          {/* Selo sempre 1:1: ele carrega as marcas dos patrocinadores e não
              pode ser recortado nem distorcido (D1b do design). */}
          <Image src={SELO} style={estilos.selo} />
          <View>
            <Text style={estilos.chapeu}>
              Circuito de Palestras · Acelera no Campo 3.0
            </Text>
            <Text style={estilos.tituloCabecalho}>{dados.colaborador}</Text>
            <Text style={estilos.subtituloCabecalho}>{dados.loja}</Text>
            <Text style={estilos.carimbo}>
              Gerado em {dados.geradoEm} (horário de Porto Velho) ·{' '}
              {total} convite(s) disponível(is)
            </Text>
          </View>
        </View>

        <View style={estilos.instrucoes}>
          <Text>
            {dados.semWhatsapp
              ? 'Cada linha é um convite diferente, pessoal e intransferível, válido para uma pessoa e mais 1 acompanhante. Copie o endereço em texto e envie pelo canal que preferir. Não envie o mesmo link para duas pessoas: ele trava no primeiro CPF que confirmar.'
              : 'Cada linha é um convite diferente, pessoal e intransferível, válido para uma pessoa e mais 1 acompanhante. Toque em “Enviar via WhatsApp” para abrir a mensagem pronta e escolher o contato, ou copie o endereço em texto. Não envie o mesmo link para duas pessoas: ele trava no primeiro CPF que confirmar.'}
          </Text>
        </View>

        {dados.blocos.map((bloco) => (
          <View key={bloco.cidade + bloco.data} style={estilos.bloco}>
            <View style={estilos.blocoTopo} wrap={false}>
              <Text style={estilos.blocoCidade}>{bloco.cidade}</Text>
              <Text style={estilos.blocoLinha}>
                {bloco.data}, às {bloco.horario} · {bloco.localNome}
              </Text>
              <Text style={estilos.blocoLinha}>{bloco.localEndereco}</Text>
              <Text style={estilos.blocoPrazo}>
                Confirmações até {bloco.prazo}
              </Text>
            </View>

            {bloco.convites.length === 0 ? (
              <Text style={estilos.vazio}>
                Nenhum convite disponível nesta palestra.
              </Text>
            ) : (
              bloco.convites.map((c, i) => (
                <View key={c.codigo} style={estilos.linha} wrap={false}>
                  <Text style={estilos.numero}>{i + 1}</Text>
                  <View style={estilos.urlBloco}>
                    <Text style={estilos.codigo}>convite {c.codigo}</Text>
                    {/* Texto puro, selecionável, sem hifenização. */}
                    <Text style={estilos.url}>{c.url}</Text>
                  </View>
                  {c.linkWhatsapp ? (
                    <Link src={c.linkWhatsapp} style={estilos.botao}>
                      Enviar via WhatsApp
                    </Link>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ))}

        <View style={estilos.rodape} fixed>
          <Text>Nossa Lavoura, amiga de quem planta, cria e produz</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber}/${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
