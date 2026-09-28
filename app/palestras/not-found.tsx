import { SeloDoCircuito } from '@/components/palestras/selo';
import { LinkBotao } from '@/components/ui';

/**
 * 404 do módulo, com a identidade do Acelera no Campo 3.0.
 *
 * É também a resposta de `/palestras/admin` para quem **não tem sessão**:
 * o middleware reescreve para cá em vez de responder 401 ou de mandar ao
 * login, porque qualquer uma das duas confirmaria que existe uma área
 * administrativa naquele caminho. Por isso o texto não menciona
 * administração nem login.
 *
 * Quem tem sessão e não é Admin recebe 403, não esta página: a essa altura
 * a existência da rota já não é segredo.
 */
export default function NaoEncontrado() {
  return (
    <main className="flex flex-1 items-center justify-center bg-inverso-fundo px-[var(--gutter-page)] py-24 text-center text-creme-500">
      <div className="flex max-w-prosa flex-col items-center gap-6">
        <SeloDoCircuito tamanho={140} />
        <p className="m-0 font-corpo text-rotulo font-bold uppercase tracking-sobrancelha text-lima-500">
          Acelera no Campo 3.0
        </p>
        <h1 className="m-0 font-titulo text-destaque font-bold leading-justo tracking-destaque text-creme-500 text-balance">
          Esta página não existe.
        </h1>
        <p className="m-0 font-corpo text-chamada font-light text-texto-inverso-suave">
          O endereço pode ter sido digitado errado ou o link pode estar
          incompleto. Confira a mensagem que você recebeu e tente de novo.
        </p>
        <LinkBotao href="/palestras" variante="primario" tamanho="lg">
          Ver o circuito
        </LinkBotao>
      </div>
    </main>
  );
}
