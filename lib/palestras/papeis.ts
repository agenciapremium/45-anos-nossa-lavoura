import { PAPEIS, type Papel } from '@/lib/db/schema';

export { PAPEIS };
export type { Papel };

/* =========================================================
   Matriz de permissões · fonte da verdade é o PRD

   A tabela "Papéis e permissões" do PRD está transcrita aqui célula a
   célula. É deliberado que ela seja **dado**, não uma sequência de `if`
   espalhada pelas telas: a matriz é o artefato que a cliente aprovou, e um
   teste consegue percorrer linha por linha do documento (ver
   `tests/papeis.test.ts`).

   Nenhuma célula é "sim" ou "não": toda permissão carrega junto o seu
   **alcance**. É a diferença entre "o gerente de loja pode ver convites" e
   "o gerente de loja pode ver os convites da loja dele" — a primeira
   afirmação, sozinha, já é um vazamento.
   ========================================================= */

/**
 * Até onde a permissão vai.
 *
 * - `nenhum`   — a ação é proibida para o papel; 403.
 * - `proprios` — só os recursos gerados para o próprio usuário.
 * - `loja`     — os recursos da loja a que o usuário está vinculado.
 * - `regional` — os recursos das lojas da regional do usuário.
 * - `palestra` — os confirmados de uma palestra, sem filtro de origem, mas
 *                com a visão reduzida da recepção.
 * - `todos`    — sem limite (Admin).
 */
export const ALCANCES = [
  'nenhum',
  'proprios',
  'loja',
  'regional',
  'palestra',
  'todos',
] as const;
export type Alcance = (typeof ALCANCES)[number];

/** Uma linha da matriz do PRD. */
export const ACOES_PROTEGIDAS = [
  'cadastrarPalestras',
  'cadastrarEImportarEstrutura',
  'atribuirPapeis',
  'gerarLotes',
  'baixarPdfDeColaborador',
  'verConvitesEConfirmacoes',
  'enviarConvitePorWhatsapp',
  'cancelarConvite',
  'fazerCheckin',
  'listaImpressaECsv',
  'exportarCsv',
  'verCpfCompleto',
] as const;
export type AcaoProtegida = (typeof ACOES_PROTEGIDAS)[number];

/** O rótulo de cada ação como está escrito no PRD. Usado em mensagens e testes. */
export const ROTULO_DA_ACAO: Record<AcaoProtegida, string> = {
  cadastrarPalestras: 'Cadastrar palestras',
  cadastrarEImportarEstrutura:
    'Cadastrar e importar usuários, regionais e lojas',
  atribuirPapeis: 'Atribuir papéis',
  gerarLotes: 'Gerar lotes de links',
  baixarPdfDeColaborador: 'Baixar PDF de links de um colaborador',
  verConvitesEConfirmacoes: 'Ver links e confirmações',
  enviarConvitePorWhatsapp: 'Enviar convite pelo WhatsApp',
  cancelarConvite: 'Cancelar convite',
  fazerCheckin: 'Fazer check-in',
  listaImpressaECsv: 'Lista de impressão e CSV',
  exportarCsv: 'Exportar CSV da palestra',
  verCpfCompleto: 'Ver o CPF completo do convidado',
};

type LinhaDaMatriz = Record<Papel, Alcance>;

const NINGUEM: LinhaDaMatriz = {
  admin: 'nenhum',
  gerente_regional: 'nenhum',
  gerente_loja: 'nenhum',
  colaborador: 'nenhum',
  recepcao: 'nenhum',
};

const SO_O_ADMIN: LinhaDaMatriz = { ...NINGUEM, admin: 'todos' };

/**
 * A matriz. Cada entrada corresponde a uma linha da tabela do PRD, na mesma
 * ordem em que ela aparece no documento.
 */
export const MATRIZ: Record<AcaoProtegida, LinhaDaMatriz> = {
  // | Cadastrar palestras | Sim | Não | Não | Não | Não |
  cadastrarPalestras: SO_O_ADMIN,

  // | Cadastrar e importar usuários, regionais e lojas | Sim | Não | … |
  cadastrarEImportarEstrutura: SO_O_ADMIN,

  // | Atribuir papéis | Sim | Não | Não | Não | Não |
  atribuirPapeis: SO_O_ADMIN,

  // | Gerar lotes de links | Sim | Não | Não | Não | Não |
  gerarLotes: SO_O_ADMIN,

  // | Baixar PDF de links de um colaborador | Sim | Não | Não | Só os próprios | Não |
  baixarPdfDeColaborador: { ...NINGUEM, admin: 'todos', colaborador: 'proprios' },

  // | Ver links e confirmações | Todos | Da regional | Da loja | Só os próprios | Não |
  verConvitesEConfirmacoes: {
    admin: 'todos',
    gerente_regional: 'regional',
    gerente_loja: 'loja',
    colaborador: 'proprios',
    recepcao: 'nenhum',
  },

  // | Enviar convite pelo WhatsApp | Sim | Não | Não | Só os próprios | Não |
  enviarConvitePorWhatsapp: {
    ...NINGUEM,
    admin: 'todos',
    colaborador: 'proprios',
  },

  // | Cancelar convite | Todos | Não | Não | Só os próprios | Não |
  cancelarConvite: { ...NINGUEM, admin: 'todos', colaborador: 'proprios' },

  // | Fazer check-in | Sim | Não | Não | Não | Sim |
  fazerCheckin: { ...NINGUEM, admin: 'todos', recepcao: 'palestra' },

  // | Lista de impressão e CSV | Todos | Da regional | Da loja | Não | Por palestra |
  //
  // O PRD junta lista impressa e CSV numa única linha da matriz, e é essa
  // linha que governa a LISTA IMPRESSA. A recepção tem alcance `palestra`
  // aqui porque ela gera a lista de contingência da própria palestra.
  listaImpressaECsv: {
    admin: 'todos',
    gerente_regional: 'regional',
    gerente_loja: 'loja',
    colaborador: 'nenhum',
    recepcao: 'palestra',
  },

  // Não é uma linha do PRD: é o refinamento que a spec `exportacao-csv` de
  // `operacao-evento` pede explicitamente — "quando um colaborador OU A
  // RECEPÇÃO tenta exportar, o sistema responde 403". A recepção opera a
  // porta com a lista impressa (ação acima); o CSV tem destino controlado
  // (análise, fora do salão) e por isso é mais estrito que a linha combinada
  // do PRD sugere à primeira vista.
  exportarCsv: {
    admin: 'todos',
    gerente_regional: 'regional',
    gerente_loja: 'loja',
    colaborador: 'nenhum',
    recepcao: 'nenhum',
  },

  /*
     Não é uma linha da tabela, e sim a regra escrita logo abaixo dela e
     repetida na seção de LGPD: "CPF completo visível apenas para o Admin".
     Fica na matriz porque é o mesmo tipo de decisão e precisa ser
     consultável pelo mesmo caminho (ver D6 do design).
  */
  verCpfCompleto: SO_O_ADMIN,
};

/** Até onde o papel vai nesta ação. */
export function alcanceDe(papel: Papel, acao: AcaoProtegida): Alcance {
  return MATRIZ[acao][papel] ?? 'nenhum';
}

/** A ação é permitida ao papel, em qualquer alcance? */
export function pode(papel: Papel, acao: AcaoProtegida): boolean {
  return alcanceDe(papel, acao) !== 'nenhum';
}

/**
 * Métodos de autenticação aceitos por papel.
 *
 * Regra do PRD: "Admin e gerentes entram só por métodos baseados em e-mail".
 * A verificação acontece **depois** de resolver o usuário, no servidor —
 * um gerente com CPF e data de nascimento corretos é recusado.
 */
export const METODOS = [
  'senha',
  'link-magico',
  'otp-por-cpf',
  'cpf-e-nascimento',
] as const;
export type Metodo = (typeof METODOS)[number];

const PAPEIS_DE_GESTAO: readonly Papel[] = [
  'admin',
  'gerente_regional',
  'gerente_loja',
];

/** O papel é de gestão (visão ampla) e por isso só entra por e-mail? */
export function ePapelDeGestao(papel: Papel): boolean {
  return PAPEIS_DE_GESTAO.includes(papel);
}

/** O papel pode entrar por este método? */
export function metodoPermitido(papel: Papel, metodo: Metodo): boolean {
  if (metodo === 'cpf-e-nascimento') return !ePapelDeGestao(papel);
  return true;
}

/**
 * Duração da sessão, em segundos, por papel.
 *
 * PRD: 12 horas para Colaborador e Recepção, 7 dias para Admin e gerentes.
 * Vale para todos os métodos: uma sessão aberta por CPF + nascimento dura o
 * mesmo que a aberta por senha pelo mesmo papel, nem mais nem menos.
 */
export const DOZE_HORAS_EM_SEGUNDOS = 12 * 60 * 60;
export const SETE_DIAS_EM_SEGUNDOS = 7 * 24 * 60 * 60;

export function duracaoDaSessao(papel: Papel): number {
  return ePapelDeGestao(papel)
    ? SETE_DIAS_EM_SEGUNDOS
    : DOZE_HORAS_EM_SEGUNDOS;
}

/**
 * Para onde mandar cada papel depois de entrar.
 *
 * O Admin cai direto na administração, que é onde ele trabalha. Todos os
 * demais caem no painel, que já se adapta ao papel — inclusive a recepção,
 * cuja tela de check-in só nasce em `operacao-evento`. Mandar alguém para
 * uma rota que ainda não existe é pior que um clique a mais.
 */
export function painelInicial(papel: Papel): string {
  return papel === 'admin' ? '/palestras/admin' : '/palestras/painel';
}

/** Rótulo do papel para a interface. */
export const ROTULO_DO_PAPEL: Record<Papel, string> = {
  admin: 'Administração',
  gerente_regional: 'Gerência regional',
  gerente_loja: 'Gerência de loja',
  colaborador: 'Colaborador',
  recepcao: 'Recepção',
};
