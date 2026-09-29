'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useRef } from 'react';

import { Selecao } from '@/components/ui';
import type { Evento } from '@/lib/db/schema';
import { definirPalestraAtual } from '@/lib/palestras/acoes-de-contexto';
import { formatarDataCurta } from '@/lib/tempo';

/* =========================================================
   Seletor de palestra da barra de topo (D2 do design)

   Client Component porque precisa do endereço atual completo
   (`usePathname` + `useSearchParams`) para voltar exatamente para onde
   estava, com `?palestra=` já trocado, depois do Server Action gravar o
   cookie de memória — que é `httpOnly` e por isso só um Server Action
   escreve.

   Sem JavaScript o formulário ainda funciona: Enter com o campo focado
   envia o único campo da tela, porque é o único controle do formulário.
   ========================================================= */
export function SeletorDePalestra({
  eventos,
  idPadrao,
}: {
  eventos: Pick<Evento, 'id' | 'cidade' | 'dataHora'>[];
  /**
   * Palestra resolvida no servidor sem olhar a URL (cookie, senão o dia,
   * senão a primeira ativa) — o `layout.tsx` não recebe `searchParams`,
   * só `page.tsx` recebe. O parâmetro da URL, quando existe, é lido aqui
   * mesmo, por `useSearchParams`, e vence esta memória (D2 do design).
   */
  idPadrao: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  if (eventos.length === 0) return null;

  const idDaUrl = searchParams.get('palestra');
  const idEfetivo = eventos.some((e) => e.id === idDaUrl) ? idDaUrl : idPadrao;

  const consulta = searchParams.toString();
  const voltarPara = consulta ? `${pathname}?${consulta}` : pathname;

  return (
    <form
      ref={formRef}
      action={definirPalestraAtual}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="voltarPara" value={voltarPara} />
      <label htmlFor="contexto-da-palestra" className="sr-only">
        Palestra em contexto
      </label>
      <Selecao
        id="contexto-da-palestra"
        name="palestra"
        value={idEfetivo ?? ''}
        onChange={() => formRef.current?.requestSubmit()}
        className="min-h-11 w-auto min-w-[190px] py-0 font-bold"
      >
        {eventos.map((evento) => (
          <option key={evento.id} value={evento.id}>
            {evento.cidade} · {formatarDataCurta(evento.dataHora)}
          </option>
        ))}
      </Selecao>
    </form>
  );
}
