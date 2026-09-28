'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  criarMotor,
  FORMATOS,
  type IdFormato,
  type Motor,
} from './motor';

type Tela = 'escolha' | 'ajuste';

/**
 * Invólucro React do motor de canvas. A marcação é a mesma da página
 * estática — mesmas classes, mesma ordem, mesmo CSS — porque a folha de
 * estilo foi migrada sem alteração.
 */
export function AplicativoFotoComemorativa() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const motorRef = useRef<Motor | null>(null);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fluxoRef = useRef<MediaStream | null>(null);
  const botaoCameraRef = useRef<HTMLButtonElement | null>(null);
  const formatoAnteriorRef = useRef<IdFormato | null>(null);

  const [formato, setFormato] = useState<IdFormato>('perfil');
  const [tela, setTela] = useState<Tela>('escolha');
  const [temFoto, setTemFoto] = useState(false);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [modoCamera, setModoCamera] = useState<'user' | 'environment'>('user');
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [podeCompartilhar, setPodeCompartilhar] = useState(false);

  const f = FORMATOS[formato];

  /* ---------------- motor ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const motor = criarMotor(canvas);
    motorRef.current = motor;
    motor.selecionarFormato('perfil');
    formatoAnteriorRef.current = 'perfil';
    const desligar = motor.ligarInteracoes();
    return () => {
      desligar();
      motorRef.current = null;
    };
  }, []);

  /* O canvas troca de dimensão via React; o motor reenquadra em seguida. */
  useEffect(() => {
    const motor = motorRef.current;
    if (!motor) return;
    if (formatoAnteriorRef.current === formato) {
      motor.desenhar();
      return;
    }
    formatoAnteriorRef.current = formato;
    motor.selecionarFormato(formato);
  }, [formato]);

  /* ---------------- compartilhamento nativo ---------------- */
  useEffect(() => {
    try {
      const teste = new File([new Blob()], 't.jpg', { type: 'image/jpeg' });
      setPodeCompartilhar(
        Boolean(navigator.canShare && navigator.canShare({ files: [teste] })),
      );
    } catch {
      setPodeCompartilhar(false);
    }
  }, []);

  /* ---------------- telas ---------------- */
  const irPara = useCallback((destino: Tela) => {
    setTela(destino);
    window.scrollTo(0, 0);
    if (destino === 'ajuste') {
      // Depois do commit, para o canvas já estar visível.
      requestAnimationFrame(() =>
        canvasRef.current?.focus({ preventScroll: true }),
      );
    }
  }, []);

  const carregarFoto = useCallback(
    async (src: string) => {
      const motor = motorRef.current;
      if (!motor) return;
      try {
        await motor.carregarFoto(src);
        setTemFoto(true);
        irPara('ajuste');
      } catch {
        window.alert('Não foi possível abrir essa imagem. Tente outra foto.');
      }
    },
    [irPara],
  );

  /* ---------------- câmera ---------------- */
  const pararCamera = useCallback(() => {
    fluxoRef.current?.getTracks().forEach((t) => t.stop());
    fluxoRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const iniciarCamera = useCallback(
    async (novoModo: 'user' | 'environment') => {
      pararCamera();
      setErroCamera(null);
      try {
        const fluxo = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: novoModo,
            width: { ideal: 1920 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
        fluxoRef.current = fluxo;
        if (videoRef.current) videoRef.current.srcObject = fluxo;
        setModoCamera(novoModo);
      } catch {
        setErroCamera(
          'Não foi possível acessar a câmera. Verifique a permissão do navegador ou escolha uma foto da galeria.',
        );
      }
    },
    [pararCamera],
  );

  const fecharCamera = useCallback(() => {
    pararCamera();
    setCameraAberta(false);
    botaoCameraRef.current?.focus();
  }, [pararCamera]);

  useEffect(() => {
    if (!cameraAberta) return;
    void iniciarCamera(modoCamera);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharCamera();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // `modoCamera` é trocado pelo botão "Trocar câmera", que já chama
    // `iniciarCamera` diretamente — não entra nas dependências para a câmera
    // não reiniciar duas vezes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraAberta, fecharCamera]);

  useEffect(() => () => pararCamera(), [pararCamera]);

  const abrirCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      /* Sem getUserMedia (http, navegador antigo): cai na galeria, que no
         celular também oferece a câmera. */
      inputFotoRef.current?.click();
      return;
    }
    setCameraAberta(true);
  };

  const capturar = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const cc = c.getContext('2d')!;
    /* A pré-visualização da câmera frontal é espelhada; a foto sai igual ao
       que a pessoa viu. */
    if (modoCamera === 'user') {
      cc.translate(c.width, 0);
      cc.scale(-1, 1);
    }
    cc.drawImage(video, 0, 0, c.width, c.height);
    fecharCamera();
    void carregarFoto(c.toDataURL('image/jpeg', 0.92));
  };

  /* ---------------- ações finais ---------------- */
  const baixar = async () => {
    const motor = motorRef.current;
    if (!motor || !temFoto) return;
    const { blob } = await motor.gerarArquivo();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = motor.nomeDoArquivo();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const compartilhar = async () => {
    const motor = motorRef.current;
    if (!motor || !temFoto) return;
    const { file } = await motor.gerarArquivo();
    try {
      await navigator.share({ files: [file], title: 'Nossa Lavoura 45 anos' });
    } catch {
      /* a pessoa fechou a folha de compartilhar */
    }
  };

  const trocarFoto = () => {
    motorRef.current?.limparFoto();
    setTemFoto(false);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
    irPara('escolha');
  };

  return (
    <>
      <main className="app">
        {/* ================= TELA 1 · escolha ================= */}
        <section
          className="tela"
          id="telaEscolha"
          hidden={tela !== 'escolha'}
          aria-labelledby="titulo"
        >
          <header className="topo">
            <img
              className="topo__selo"
              src="/assets/img/selo-600.webp"
              alt="Selo 45 anos Nossa Lavoura"
              width={600}
              height={501}
              decoding="async"
            />
            <p className="eyebrow">Nossa Lavoura · 45 anos</p>
            <h1 className="topo__h1" id="titulo">
              Crie sua foto comemorativa dos 45&nbsp;anos da Nossa Lavoura
            </h1>
            <p className="topo__lead">
              Coloque sua foto na moldura do aniversário e use no seu perfil ou
              no seu story.
            </p>
          </header>

          <section className="passo" aria-labelledby="passo1">
            <div className="passo__cab">
              <span className="passo__num" aria-hidden="true">
                1
              </span>
              <h2 className="passo__t" id="passo1">
                Escolha o formato
              </h2>
            </div>

            <div
              className="formatos"
              role="radiogroup"
              aria-label="Formato da foto comemorativa"
            >
              <button
                className="formato"
                type="button"
                role="radio"
                aria-checked={formato === 'perfil'}
                data-formato="perfil"
                onClick={() => setFormato('perfil')}
              >
                <span className="formato__prev">
                  <img
                    src="/foto-comemorativa/assets/preview-perfil.webp"
                    alt=""
                    width={640}
                    height={640}
                    decoding="async"
                  />
                </span>
                <span className="formato__nome">Foto de perfil</span>
                <span className="formato__uso">WhatsApp e Instagram</span>
              </button>
              <button
                className="formato"
                type="button"
                role="radio"
                aria-checked={formato === 'story'}
                data-formato="story"
                onClick={() => setFormato('story')}
              >
                <span className="formato__prev">
                  <img
                    src="/foto-comemorativa/assets/preview-story.webp"
                    alt=""
                    width={540}
                    height={960}
                    decoding="async"
                  />
                </span>
                <span className="formato__nome">Story</span>
                <span className="formato__uso">Instagram e WhatsApp</span>
              </button>
            </div>
          </section>

          <section className="passo" aria-labelledby="passo2">
            <div className="passo__cab">
              <span className="passo__num" aria-hidden="true">
                2
              </span>
              <h2 className="passo__t" id="passo2">
                Adicione sua foto
              </h2>
            </div>
            <p className="passo__txt">
              Escolha uma foto da galeria ou tire uma agora. No próximo passo
              você ajusta o tamanho e a posição.
            </p>

            <div className="acoes">
              <label className="btn btn--lg btn--primary">
                <input
                  ref={inputFotoRef}
                  id="inputFoto"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void carregarFoto(URL.createObjectURL(file));
                  }}
                />
                Escolher da galeria
              </label>
              <button
                ref={botaoCameraRef}
                className="btn btn--lg btn--secondary"
                type="button"
                id="abrirCamera"
                onClick={abrirCamera}
              >
                Tirar foto agora
              </button>
            </div>
          </section>

          <p className="privacidade">
            Sua foto não sai do seu aparelho: a moldura é aplicada no próprio
            navegador, sem envio para nenhum servidor.
          </p>
        </section>

        {/* ================= TELA 2 · ajuste ================= */}
        <section
          className="tela"
          id="telaAjuste"
          hidden={tela !== 'ajuste'}
          aria-labelledby="tituloAjuste"
        >
          <header className="topo topo--compacto">
            <p className="eyebrow" id="rotuloFormato">
              {f.rotulo} · pré-visualização
            </p>
            <h1 className="topo__h1" id="tituloAjuste">
              Ajuste sua foto
            </h1>
          </header>

          <div className="palco">
            <canvas
              ref={canvasRef}
              id="tela"
              width={f.w}
              height={f.h}
              tabIndex={0}
              role="img"
              aria-label="Pré-visualização da sua foto na moldura dos 45 anos. Use as setas para mover e as teclas mais e menos para aproximar."
            />
          </div>

          <div className="zoom">
            <button
              className="zoom__btn"
              type="button"
              id="zoomMenos"
              aria-label="Afastar"
              onClick={() => motorRef.current?.zoomPeloBotao(1 / 1.1)}
            >
              −
            </button>
            <button
              className="zoom__btn"
              type="button"
              id="zoomMais"
              aria-label="Aproximar"
              onClick={() => motorRef.current?.zoomPeloBotao(1.1)}
            >
              +
            </button>
          </div>
          <p className="dica">
            Arraste para posicionar · use dois dedos para aproximar
          </p>

          <div className="troca" role="radiogroup" aria-label="Formato">
            <button
              className="troca__btn"
              type="button"
              role="radio"
              aria-checked={formato === 'perfil'}
              data-formato="perfil"
              onClick={() => setFormato('perfil')}
            >
              Perfil
            </button>
            <button
              className="troca__btn"
              type="button"
              role="radio"
              aria-checked={formato === 'story'}
              data-formato="story"
              onClick={() => setFormato('story')}
            >
              Story
            </button>
          </div>

          <div className="acoes">
            {/* Com compartilhamento nativo, ele é a ação principal e baixar
                vira secundária. */}
            <button
              className="btn btn--lg btn--primary"
              type="button"
              id="compartilhar"
              hidden={!podeCompartilhar}
              onClick={() => void compartilhar()}
            >
              Compartilhar
            </button>
            <button
              className={
                podeCompartilhar
                  ? 'btn btn--lg btn--on-dark'
                  : 'btn btn--lg btn--primary'
              }
              type="button"
              id="baixar"
              onClick={() => void baixar()}
            >
              Baixar imagem
            </button>
            <button
              className="btn btn--lg btn--texto"
              type="button"
              id="trocarFoto"
              onClick={trocarFoto}
            >
              Trocar foto
            </button>
          </div>
        </section>

        <footer className="rodape">
          <a href="/">Conheça os 45 anos da Nossa Lavoura</a>
          <p>Nossa Lavoura, amiga de quem planta, cria e produz</p>
        </footer>
      </main>

      {/* ================= Câmera ================= */}
      <div
        className="camera"
        id="camera"
        hidden={!cameraAberta}
        role="dialog"
        aria-modal="true"
        aria-label="Câmera"
      >
        <button
          className="camera__fechar"
          type="button"
          id="fecharCamera"
          aria-label="Fechar câmera"
          onClick={fecharCamera}
        >
          ×
        </button>
        <p className="camera__erro" id="erroCamera" hidden={!erroCamera}>
          {erroCamera}
        </p>
        <video
          ref={videoRef}
          className={
            modoCamera === 'user' ? 'camera__video espelho' : 'camera__video'
          }
          id="video"
          autoPlay
          playsInline
          muted
        />
        <div className="camera__acoes">
          <button
            className="btn btn--on-dark"
            type="button"
            id="virarCamera"
            onClick={() =>
              void iniciarCamera(modoCamera === 'user' ? 'environment' : 'user')
            }
          >
            Trocar câmera
          </button>
          <button
            className="btn btn--lg btn--primary"
            type="button"
            id="capturar"
            onClick={capturar}
            autoFocus={cameraAberta}
          >
            Capturar
          </button>
        </div>
      </div>
    </>
  );
}
