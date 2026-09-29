import { Aviso, LinkBotao } from '@/components/ui';

/* =========================================================
   Telas de estado do convite

   > **Regra de segurança, não de interface.** Nenhuma destas telas recebe
   > dado nenhum do titular. Não é disciplina de quem escreve o JSX: o
   > componente simplesmente **não tem** por onde receber nome, CPF,
   > WhatsApp, acompanhante ou QR. A única entrada é o nome da variante.
   >
   > Isso vale para o HTML e para a carga de hidratação do React: como não
   > existe prop com dado pessoal, não existe nada a serializar. Vazar
   > dados aqui exigiria alterar a assinatura do componente.

   D10 do design: a variante `indisponivel` atende **tanto** o convite
   cancelado quanto o código que não existe, com exatamente o mesmo texto e
   a mesma marcação, para que tentativa e erro não descubra códigos
   válidos. O texto precisa fazer sentido nos dois casos, daí "pode ter
   sido cancelado, ou o endereço pode estar incompleto".
   ========================================================= */

export type VarianteDeEstado =
  | 'ja-utilizado'
  | 'expirado'
  | 'indisponivel'
  | 'muitas-tentativas';

type Conteudo = {
  titulo: string;
  paragrafos: string[];
  acao?: { rotulo: string; href: string };
  acaoSecundaria?: { rotulo: string; href: string };
};

const CONTEUDOS: Record<VarianteDeEstado, Conteudo> = {
  'ja-utilizado': {
    titulo: 'Este convite já foi utilizado.',
    paragrafos: [
      'Alguém já confirmou presença com este link. Cada convite vale para uma pessoa e um acompanhante.',
      'Se a confirmação foi sua e você está em outro celular, recupere o seu ingresso informando o CPF que você usou e o código do convite.',
      'Se não foi você, fale com o colaborador da Nossa Lavoura que enviou o convite.',
    ],
    acao: { rotulo: 'Recuperar meu ingresso', href: '/palestras/ingresso' },
    acaoSecundaria: {
      rotulo: 'Ver as palestras do circuito',
      href: '/palestras',
    },
  },

  expirado: {
    titulo: 'O prazo de confirmação encerrou.',
    paragrafos: [
      'Este convite não foi confirmado até o prazo da palestra, e por isso não vale mais.',
      'Fale com o colaborador da Nossa Lavoura que enviou o convite: ele pode verificar se ainda há convites para outra data do circuito.',
    ],
    acao: { rotulo: 'Ver as palestras do circuito', href: '/palestras' },
  },

  indisponivel: {
    titulo: 'Este convite não vale mais.',
    paragrafos: [
      'Ele pode ter sido cancelado, ou o endereço pode estar incompleto (links copiados pela metade são a causa mais comum).',
      'Confira a mensagem que você recebeu e, se o problema continuar, fale com o colaborador da Nossa Lavoura que enviou o convite.',
    ],
    acao: { rotulo: 'Ver as palestras do circuito', href: '/palestras' },
  },

  'muitas-tentativas': {
    titulo: 'Muitas tentativas em pouco tempo.',
    paragrafos: [
      'Para proteger os convites, o acesso foi pausado por alguns minutos.',
      'Aguarde e tente de novo com o link exatamente como você recebeu.',
    ],
  },
};

export function TelaDeEstado({ variante }: { variante: VarianteDeEstado }) {
  const conteudo = CONTEUDOS[variante];

  return (
    <>
      <div className="rounded-cartao border-2 border-terra-700 bg-cartao p-6 shadow-laje-sm">
        <h2 className="m-0 font-titulo text-t2 font-bold leading-justo tracking-destaque text-texto-forte text-balance">
          {conteudo.titulo}
        </h2>
        {conteudo.paragrafos.map((texto) => (
          <p
            key={texto}
            className="mt-3 mb-0 font-corpo text-corpo text-texto"
          >
            {texto}
          </p>
        ))}
        {conteudo.acao ? (
          <div className="mt-6">
            <LinkBotao
              href={conteudo.acao.href}
              variante="secundario"
              tamanho="lg"
              className="w-full"
            >
              {conteudo.acao.rotulo}
            </LinkBotao>
          </div>
        ) : null}
      </div>

      {/*
        Nota de privacidade: a mesma frase vale para as quatro variantes,
        porque nenhuma delas recebe dado pessoal (ver comentário no topo do
        arquivo). Fica visível para quem estranhar a tela sem nome nem CPF.
      */}
      <Aviso tom="informacao" className="mt-4">
        <p>
          Esta tela não mostra nome, CPF nem telefone de ninguém, nem para
          quem abriu o link. Ela é a mesma para convite cancelado e para
          endereço incompleto, de propósito.
        </p>
      </Aviso>

      {conteudo.acaoSecundaria ? (
        <div className="mt-4">
          <LinkBotao
            href={conteudo.acaoSecundaria.href}
            variante="contorno"
            tamanho="lg"
            className="w-full"
          >
            {conteudo.acaoSecundaria.rotulo}
          </LinkBotao>
        </div>
      ) : null}
    </>
  );
}
