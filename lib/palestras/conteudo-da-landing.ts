/* =========================================================
   Conteúdo fixo da landing do circuito (`landing-do-circuito`, D1)

   O que não muda durante o circuito fica aqui, tipado: os dois
   palestrantes, a promoção e o texto legal. Os textos são os do carrossel
   da campanha (`docs/CARROSSEL CONTEÚDO/`). Cidades, datas e locais NÃO
   ficam aqui: vêm do banco, por `listarPalestrasAtivas()`.
   ========================================================= */

export type VersaoDaImagem = { src: string; largura: number; altura: number };

export type Palestrante = {
  id: string;
  nome: string;
  sobrenome: string;
  credenciais: string[];
  tema: string;
  /**
   * Duas alturas, geradas por `scripts/otimizar-imagens-da-landing.mjs`:
   * a pequena serve o celular e o rosto esmaecido; a grande, o desktop.
   */
  foto: { alt: string; pequena: VersaoDaImagem; grande: VersaoDaImagem };
};

export const PALESTRANTES: Palestrante[] = [
  {
    id: 'ricardo-arantes',
    nome: 'Ricardo',
    sobrenome: 'Arantes',
    credenciais: ['Zootecnista', 'TRI Comunicação'],
    tema: 'Desafios do Agro Moderno: você está preparado?',
    foto: {
      alt: 'Ricardo Arantes, de chapéu e camisa azul-marinho',
      pequena: { src: '/assets/img/palestrantes/ricardo-arantes-500.webp', largura: 421, altura: 500 },
      grande: { src: '/assets/img/palestrantes/ricardo-arantes-900.webp', largura: 758, altura: 900 },
    },
  },
  {
    id: 'giovani-pastre',
    nome: 'Giovani',
    sobrenome: 'Pastre',
    credenciais: [
      'Gerente Técnico da Virbac',
      'Doutorando em Reprodução Animal pela USP',
      'Mestre em Ciência Animal e especialista em Reprodução de Bovinos e Produção de Leite',
    ],
    tema: 'Controle sanitário na reprodução: estratégias para otimizar a rentabilidade na cria',
    foto: {
      alt: 'Giovani Pastre, de óculos e jaqueta escura',
      pequena: { src: '/assets/img/palestrantes/giovani-pastre-500.webp', largura: 495, altura: 500 },
      grande: { src: '/assets/img/palestrantes/giovani-pastre-900.webp', largura: 891, altura: 900 },
    },
  },
];

export const PROMOCAO = {
  chamada:
    'E continue acelerando: a cada R$ 500 em produtos Virbac ou R$ 2.000 em produtos Supremax, você ganha 1 cupom para concorrer a um Trator',
  premio: 'John Deere 5080E.',
  trator: {
    src: '/assets/img/trator-5080e.webp',
    largura: 640,
    altura: 530,
    alt: 'Trator John Deere 5080E, verde com rodas amarelas',
  },
  bordao: ['Acelere conhecimento.', 'Acelere resultados. Acelere no Campo.'],
  textoLegal:
    'Certificado de Autorização SPA/ME nº 06.049607/2026. Promoção "Acelera no Campo 3.0", válida de 01 de maio a 30 de novembro de 2026. A cada R$ 500 em produtos Virbac ou R$ 2.000 em produtos Supremax, o participante recebe 1 cupom para concorrer ao sorteio de 01 Trator John Deere 5080E. Consulte o regulamento completo e as condições de participação em nossalavoura.com.br. Imagens meramente ilustrativas.',
} as const;

/**
 * Busca de mapa para "Abrir no mapa" (D7): sem chave de API nem
 * coordenadas no banco. No celular, abre o aplicativo de mapas.
 */
export function urlDoMapa(local: {
  localNome: string;
  localEndereco: string;
  cidade: string;
}): string {
  const consulta = `${local.localNome}, ${local.localEndereco}, ${local.cidade} - RO`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}
