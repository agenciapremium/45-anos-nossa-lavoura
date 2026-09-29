'use client';

import { useEffect, useRef, useState } from 'react';

/* =========================================================
   Leitor de QR pela câmera do navegador (D1, D2 do design, tarefa 6.3)

   `@zxing/browser`/`@zxing/library` só são importados dentro do efeito,
   sob demanda: quem abre a tela em "busca manual" nunca baixa o decodificador.

   O `token` lido não é validado aqui: nenhuma decisão de validade
   acontece no cliente (D2). O componente só devolve o texto lido; quem
   decide verde/amarelo/vermelho é sempre o servidor.

   `NotFoundException` do zxing dispara a cada quadro sem código
   encontrado, o caminho normal de "ainda não achei", não uma falha.
   Tratá-la como erro faria a tela "piscar" um estado de erro a cada frame
   (mantém a leitura ativa depois de um código ilegível, sem travar a
   tela).
   ========================================================= */

type Estado = 'pedindo' | 'ativo' | 'negada' | 'sem-camera' | 'inseguro' | 'erro';

type ControlesDeLeitura = { stop: () => void };

export function Leitor({
  onLido,
  ocupado,
}: {
  onLido: (token: string) => void;
  /** Enquanto true (aguardando o resultado de uma leitura anterior), ignora novas detecções. */
  ocupado: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<Estado>('pedindo');
  const [mensagemErro, setMensagemErro] = useState('');
  const ocupadoRef = useRef(ocupado);
  const ultimaLeituraRef = useRef<{ texto: string; em: number } | null>(null);
  ocupadoRef.current = ocupado;

  useEffect(() => {
    let cancelado = false;
    let controlesAtuais: ControlesDeLeitura | null = null;

    async function iniciar() {
      if (typeof window === 'undefined') return;

      if (!window.isSecureContext) {
        setEstado('inseguro');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado('sem-camera');
        return;
      }

      const [{ BrowserQRCodeReader }, { NotFoundException }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ]);
      if (cancelado) return;

      const leitor = new BrowserQRCodeReader();

      try {
        const controles = await leitor.decodeFromVideoDevice(
          undefined,
          videoRef.current ?? undefined,
          (resultado, erro) => {
            if (cancelado || ocupadoRef.current) return;

            if (resultado) {
              const texto = resultado.getText();
              // Evita chamar `onLido` várias vezes seguidas para o MESMO
              // QR enquanto ele continua na frente da câmera: a pessoa não
              // tira o celular instantaneamente depois de ouvir "pode
              // entrar" (volta a ler sem travar, mas sem repetir a mesma
              // leitura à toa).
              const agora = performance.now();
              const anterior = ultimaLeituraRef.current;
              if (anterior && anterior.texto === texto && agora - anterior.em < 4000) {
                return;
              }
              ultimaLeituraRef.current = { texto, em: agora };
              onLido(texto);
              return;
            }

            if (erro && !(erro instanceof NotFoundException)) {
              // Erro de verdade (formato ilegível, checksum): ainda assim a
              // leitura continua ativa, só registra para diagnóstico.
              // eslint-disable-next-line no-console
              console.warn('[checkin] leitura de QR:', erro);
            }
          },
        );

        if (cancelado) {
          controles.stop();
          return;
        }
        controlesAtuais = controles;
        setEstado('ativo');
      } catch (erro) {
        if (cancelado) return;
        const nome = (erro as { name?: string } | undefined)?.name;
        if (nome === 'NotAllowedError' || nome === 'SecurityError') {
          setEstado('negada');
        } else if (nome === 'NotFoundError' || nome === 'OverconstrainedError') {
          setEstado('sem-camera');
        } else {
          setEstado('erro');
          setMensagemErro(erro instanceof Error ? erro.message : String(erro));
        }
      }
    }

    void iniciar();

    return () => {
      cancelado = true;
      controlesAtuais?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden rounded-cartao border-2 border-terra-700 bg-terra-900">
      <div className="relative aspect-square w-full bg-terra-900">
        <video
          ref={videoRef}
          className="absolute inset-0 size-full object-cover"
          muted
          playsInline
        />
        {estado === 'ativo' ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-8">
            <span className="absolute left-0 top-0 size-10 rounded-tl-md border-l-4 border-t-4 border-lima-500" />
            <span className="absolute right-0 top-0 size-10 rounded-tr-md border-r-4 border-t-4 border-lima-500" />
            <span className="absolute bottom-0 left-0 size-10 rounded-bl-md border-b-4 border-l-4 border-lima-500" />
            <span className="absolute bottom-0 right-0 size-10 rounded-br-md border-b-4 border-r-4 border-lima-500" />
          </div>
        ) : null}
      </div>
      <div className="p-4">
        {estado === 'pedindo' && (
          <p className="m-0 font-corpo text-corpo text-creme-500">Pedindo acesso à câmera…</p>
        )}
        {estado === 'ativo' && (
          <p className="m-0 font-corpo text-corpo-sm text-texto-inverso-suave">
            <strong className="text-creme-500">Aponte para o QR do ingresso.</strong> Fica
            lendo sozinho, não precisa tocar em nada.
          </p>
        )}
        {estado === 'negada' && (
          <div>
            <p className="m-0 font-corpo text-corpo font-bold text-creme-500">
              A câmera não foi liberada para este site.
            </p>
            <p className="mt-2 mb-0 font-corpo text-corpo-sm text-texto-inverso-suave">
              Toque no ícone de cadeado ao lado do endereço, abra as permissões do site
              e libere a câmera. Depois, recarregue a página. Enquanto isso, toque em{' '}
              <strong>Busca manual</strong>, no topo da tela.
            </p>
          </div>
        )}
        {estado === 'sem-camera' && (
          <p className="m-0 font-corpo text-corpo text-creme-500">
            Nenhuma câmera foi encontrada neste aparelho. Toque em Busca manual, no topo
            da tela.
          </p>
        )}
        {estado === 'inseguro' && (
          <p className="m-0 font-corpo text-corpo text-creme-500">
            Esta página precisa ser aberta por HTTPS para usar a câmera. Toque em Busca
            manual, no topo da tela.
          </p>
        )}
        {estado === 'erro' && (
          <p className="m-0 font-corpo text-corpo text-creme-500">
            Não foi possível abrir a câmera{mensagemErro ? `: ${mensagemErro}` : '.'} Toque
            em Busca manual, no topo da tela.
          </p>
        )}
      </div>
    </div>
  );
}
