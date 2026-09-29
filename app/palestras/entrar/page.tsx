import { redirect } from 'next/navigation';

import { AbaSegmentada, AbasSegmentadas, Aviso, Subtitulo } from '@/components/ui';
import { destinoSeguro } from '@/lib/palestras/destino';
import { painelInicial } from '@/lib/palestras/papeis';
import { sessaoAtual } from '@/lib/palestras/sessao';

import {
  FormularioDeCpfENascimento,
  FormularioDeLinkMagico,
  FormularioDePedirCodigo,
  FormularioDeSenha,
} from './formularios';

export const dynamic = 'force-dynamic';

/* =========================================================
   /palestras/entrar: quatro métodos, quatro abas (tarefa 6.4)

   As abas são **links** (`AbaSegmentada`, D7 do design), não botões de
   JavaScript: o método escolhido vive na URL. Assim o endereço é
   compartilhável ("entra pela aba de CPF e nascimento"), o botão voltar
   funciona, e a tela abre mesmo com o script ainda carregando, que é o
   cenário real de um celular na área rural.

   A ordem é a do PRD, e não é acidental: os métodos por e-mail vêm
   primeiro, e o CPF + nascimento fica por último. Ele é a credencial mais
   fraca do sistema e existe para quem não tem e-mail, não é o caminho que
   se oferece primeiro a quem tem escolha.

   Alvo de 48 px nas abas: é a tela de acesso, muitas vezes aberta no
   celular, na primeira tentativa do dia.
   ========================================================= */

const ABAS = [
  { chave: 'senha', rotulo: 'Senha' },
  { chave: 'link', rotulo: 'Link por e-mail' },
  { chave: 'codigo', rotulo: 'Código por CPF' },
  { chave: 'nascimento', rotulo: 'CPF e nascimento' },
] as const;

type Aba = (typeof ABAS)[number]['chave'];

const TITULO: Record<Aba, string> = {
  senha: 'Entrar com senha',
  link: 'Receber um link de acesso',
  codigo: 'Receber um código por CPF',
  nascimento: 'Entrar com CPF e data de nascimento',
};

const AVISOS: Record<string, { tom: 'informacao' | 'atencao'; texto: string }> =
  {
    saiu: { tom: 'informacao', texto: 'Você saiu do sistema.' },
    'saiu-de-todos': {
      tom: 'informacao',
      texto: 'Suas sessões foram encerradas em todos os dispositivos.',
    },
    expirada: {
      tom: 'atencao',
      texto: 'Sua sessão expirou. Entre de novo para continuar.',
    },
    desativado: {
      tom: 'atencao',
      texto:
        'Não foi possível continuar. Fale com a administração do circuito.',
    },
    'senha-definida': {
      tom: 'informacao',
      texto: 'Senha salva. Entre com ela agora.',
    },
  };

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ metodo?: string; destino?: string; aviso?: string }>;
}) {
  const { metodo, destino, aviso } = await searchParams;

  /*
     Quem já está autenticado não precisa da tela de login.

     O `destino` passa por `destinoSeguro` também aqui, e não só na Server
     Action: este caminho redireciona sem que ninguém clique em nada, e um
     `?destino=https://site-falso` transformaria a própria tela de acesso
     em trampolim para fora do domínio.
  */
  const atual = await sessaoAtual();
  if (atual) {
    redirect(destinoSeguro(destino ?? '', painelInicial(atual.papel)));
  }

  const escolhida: Aba =
    ABAS.find((a) => a.chave === metodo)?.chave ?? 'senha';
  const recado = aviso ? AVISOS[aviso] : undefined;

  return (
    <>
      <Subtitulo className="mb-1">{TITULO[escolhida]}</Subtitulo>
      <p className="mt-0 mb-6 font-corpo text-corpo-sm text-texto-suave">
        Escolha como prefere entrar.
      </p>

      <AbasSegmentadas
        aria-label="Formas de entrar"
        className="mb-6 grid w-full grid-cols-2 sm:grid-cols-4"
      >
        {ABAS.map((aba) => {
          const ativa = aba.chave === escolhida;
          const alvo = new URLSearchParams();
          alvo.set('metodo', aba.chave);
          if (destino) alvo.set('destino', destino);
          return (
            <AbaSegmentada
              key={aba.chave}
              href={`/palestras/entrar?${alvo.toString()}`}
              ativo={ativa}
              className="min-h-12 px-2 text-center"
            >
              {aba.rotulo}
            </AbaSegmentada>
          );
        })}
      </AbasSegmentadas>

      {recado ? (
        <Aviso tom={recado.tom} className="mb-6">
          <p className="m-0">{recado.texto}</p>
        </Aviso>
      ) : null}

      {escolhida === 'senha' ? <FormularioDeSenha destino={destino} /> : null}
      {escolhida === 'link' ? <FormularioDeLinkMagico /> : null}
      {escolhida === 'codigo' ? <FormularioDePedirCodigo /> : null}
      {escolhida === 'nascimento' ? (
        <FormularioDeCpfENascimento destino={destino} />
      ) : null}
    </>
  );
}
