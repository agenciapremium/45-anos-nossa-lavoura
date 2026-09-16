/* =========================================================
   FOTO COMEMORATIVA DOS 45 ANOS
   Porta para JS puro o motor da "Moldura Perfil" do projeto
   utilidades-nossa-lavoura (useMolduraEngine + CameraModal):
   a foto é recortada na janela da moldura e a moldura é
   desenhada por cima. Tudo no navegador, nada é enviado.
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     Formatos
     Geometria medida por varredura de alpha nas molduras já
     normalizadas para 1080 de largura (ver README). Se a arte
     mudar, é aqui que os números mudam.
     --------------------------------------------------------- */
  const FORMATOS = {
    perfil: {
      rotulo: 'Foto de perfil',
      w: 1080, h: 1080,
      janela: { tipo: 'circulo', cx: 526, cy: 564, r: 507.5 },
      moldura: '/foto-comemorativa/assets/moldura-perfil.webp',
      arquivo: 'nossa-lavoura-45-anos-perfil.jpg'
    },
    story: {
      rotulo: 'Story',
      w: 1080, h: 1920,
      janela: { tipo: 'retangulo', x: 68, y: 80, w: 944, h: 1759 },
      moldura: '/foto-comemorativa/assets/moldura-story.webp',
      arquivo: 'nossa-lavoura-45-anos-story.jpg'
    }
  };

  /* A foto passa alguns pixels por baixo da borda da janela: sem costura. */
  const SANGRIA = 6;
  /* Fotos de celular chegam com 12 MP ou mais. Redesenhar isso a cada
     movimento do dedo trava o aparelho; a saída tem 1080 de largura,
     então 2400 no lado maior sobra mesmo com zoom. */
  const LADO_MAX = 2400;
  const ZOOM_MIN = 0.1, ZOOM_MAX = 10;

  const $ = id => document.getElementById(id);
  const css = nome => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

  const canvas = $('tela');
  const ctx = canvas.getContext('2d');

  const estado = {
    formato: 'perfil',
    foto: null,               // canvas com a foto já reduzida
    escala: 1,
    offset: { x: 0, y: 0 },
    molduras: {}              // Image carregada por formato
  };

  const fmt = () => FORMATOS[estado.formato];

  /* ---------------------------------------------------------
     Molduras: pré-carrega as duas, a troca de formato é imediata
     --------------------------------------------------------- */
  Object.entries(FORMATOS).forEach(([id, f]) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { if (estado.formato === id) desenhar(); };
    img.src = f.moldura;
    estado.molduras[id] = img;
  });

  /* ---------------------------------------------------------
     Janela: caminho de recorte, caixa a cobrir e teste de toque
     --------------------------------------------------------- */
  const caminhoJanela = () => {
    const j = fmt().janela;
    ctx.beginPath();
    if (j.tipo === 'circulo') ctx.arc(j.cx, j.cy, j.r + SANGRIA, 0, Math.PI * 2);
    else ctx.rect(j.x - SANGRIA, j.y - SANGRIA, j.w + SANGRIA * 2, j.h + SANGRIA * 2);
  };

  const caixaJanela = () => {
    const j = fmt().janela;
    if (j.tipo === 'circulo') {
      const R = j.r + SANGRIA;
      return { x: j.cx - R, y: j.cy - R, w: R * 2, h: R * 2 };
    }
    return { x: j.x - SANGRIA, y: j.y - SANGRIA, w: j.w + SANGRIA * 2, h: j.h + SANGRIA * 2 };
  };

  const dentroDaJanela = (x, y) => {
    const j = fmt().janela;
    if (j.tipo === 'circulo') return Math.hypot(x - j.cx, y - j.cy) <= j.r + SANGRIA;
    return x >= j.x - SANGRIA && x <= j.x + j.w + SANGRIA && y >= j.y - SANGRIA && y <= j.y + j.h + SANGRIA;
  };

  /* ---------------------------------------------------------
     Desenho
     --------------------------------------------------------- */
  let pedido = 0;
  const desenhar = () => {
    if (pedido) return;
    pedido = requestAnimationFrame(() => {
      pedido = 0;
      const f = fmt();
      ctx.clearRect(0, 0, f.w, f.h);

      /* Fundo creme: se a pessoa afastar demais a foto, o vão fica
         creme em vez de transparente (que viraria preto no JPEG). */
      ctx.fillStyle = css('--creme-500');
      ctx.fillRect(0, 0, f.w, f.h);

      ctx.save();
      caminhoJanela();
      ctx.clip();
      if (estado.foto) {
        const s = estado.escala;
        ctx.drawImage(estado.foto, estado.offset.x, estado.offset.y, estado.foto.width * s, estado.foto.height * s);
      } else {
        ctx.fillStyle = css('--creme-700');
        ctx.fillRect(0, 0, f.w, f.h);
      }
      ctx.restore();

      const m = estado.molduras[estado.formato];
      if (m && m.complete && m.naturalWidth) ctx.drawImage(m, 0, 0, f.w, f.h);
    });
  };

  /* Enquadra a foto cobrindo a janela inteira, centralizada. */
  const centralizar = () => {
    const foto = estado.foto;
    if (!foto) return;
    const b = caixaJanela();
    const r = Math.max(b.w / foto.width, b.h / foto.height);
    estado.escala = r;
    estado.offset = {
      x: b.x + (b.w - foto.width * r) / 2,
      y: b.y + (b.h - foto.height * r) / 2
    };
  };

  const zoomEm = (fator, fx, fy) => {
    const nova = Math.min(Math.max(estado.escala * fator, ZOOM_MIN), ZOOM_MAX);
    const real = nova / estado.escala;
    estado.offset.x = fx - (fx - estado.offset.x) * real;
    estado.offset.y = fy - (fy - estado.offset.y) * real;
    estado.escala = nova;
  };

  const centroJanela = () => {
    const b = caixaJanela();
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  };

  /* ---------------------------------------------------------
     Formato
     --------------------------------------------------------- */
  const selecionarFormato = id => {
    if (!FORMATOS[id]) return;
    const mudou = estado.formato !== id;
    estado.formato = id;

    document.querySelectorAll('[data-formato]').forEach(b => {
      b.setAttribute('aria-checked', String(b.dataset.formato === id));
    });
    $('rotuloFormato').textContent = `${FORMATOS[id].rotulo} · pré-visualização`;

    const f = fmt();
    if (canvas.width !== f.w || canvas.height !== f.h) {
      canvas.width = f.w;
      canvas.height = f.h;
    }
    /* A janela muda de forma e de lugar: reenquadra a foto. */
    if (mudou) centralizar();
    desenhar();
  };

  document.querySelectorAll('[data-formato]').forEach(b => {
    b.addEventListener('click', () => selecionarFormato(b.dataset.formato));
  });

  /* ---------------------------------------------------------
     Carregar foto
     --------------------------------------------------------- */
  const reduzir = img => {
    const w = img.naturalWidth, h = img.naturalHeight;
    const k = Math.min(1, LADO_MAX / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  };

  const carregarFoto = src => {
    const img = new Image();
    img.onload = () => {
      estado.foto = reduzir(img);
      if (src.startsWith('blob:')) URL.revokeObjectURL(src);
      centralizar();
      irPara('ajuste');
      desenhar();
    };
    img.onerror = () => {
      alert('Não foi possível abrir essa imagem. Tente outra foto.');
    };
    img.src = src;
  };

  const inputFoto = $('inputFoto');
  inputFoto.addEventListener('change', () => {
    const file = inputFoto.files && inputFoto.files[0];
    if (file) carregarFoto(URL.createObjectURL(file));
  });

  /* ---------------------------------------------------------
     Telas
     --------------------------------------------------------- */
  const irPara = tela => {
    $('telaEscolha').hidden = tela !== 'escolha';
    $('telaAjuste').hidden = tela !== 'ajuste';
    window.scrollTo(0, 0);
    if (tela === 'ajuste') canvas.focus({ preventScroll: true });
  };

  $('trocarFoto').addEventListener('click', () => {
    estado.foto = null;
    estado.escala = 1;
    estado.offset = { x: 0, y: 0 };
    inputFoto.value = '';
    irPara('escolha');
    desenhar();
  });

  /* ---------------------------------------------------------
     Interação: arrastar, pinça, roda do mouse e teclado
     --------------------------------------------------------- */
  const noCanvas = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (canvas.width / r.width),
      y: (clientY - r.top) * (canvas.height / r.height)
    };
  };

  let arrastando = false, ini = { x: 0, y: 0 };
  let distInicial = null, pinca = false, meio = { x: 0, y: 0 };

  canvas.addEventListener('mousedown', e => {
    if (!estado.foto) return;
    const p = noCanvas(e.clientX, e.clientY);
    if (!dentroDaJanela(p.x, p.y)) return;
    arrastando = true;
    ini = p;
  });
  window.addEventListener('mousemove', e => {
    if (!arrastando) return;
    const p = noCanvas(e.clientX, e.clientY);
    estado.offset.x += p.x - ini.x;
    estado.offset.y += p.y - ini.y;
    ini = p;
    desenhar();
  });
  window.addEventListener('mouseup', () => { arrastando = false; });

  canvas.addEventListener('touchstart', e => {
    if (!estado.foto) return;
    if (e.touches.length === 1) {
      const p = noCanvas(e.touches[0].clientX, e.touches[0].clientY);
      arrastando = dentroDaJanela(p.x, p.y);
      ini = p;
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = e.touches;
      distInicial = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      meio = noCanvas((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      pinca = true;
      arrastando = false;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && arrastando) {
      e.preventDefault();
      const p = noCanvas(e.touches[0].clientX, e.touches[0].clientY);
      estado.offset.x += p.x - ini.x;
      estado.offset.y += p.y - ini.y;
      ini = p;
      desenhar();
    } else if (e.touches.length === 2 && pinca && estado.foto) {
      e.preventDefault();
      const [a, b] = e.touches;
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const m = noCanvas((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      if (distInicial) {
        zoomEm(d / distInicial, m.x, m.y);
        estado.offset.x += m.x - meio.x;
        estado.offset.y += m.y - meio.y;
        desenhar();
      }
      distInicial = d;
      meio = m;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    arrastando = false;
    if (e.touches.length < 2) { distInicial = null; pinca = false; }
  });

  canvas.addEventListener('wheel', e => {
    if (!estado.foto) return;
    e.preventDefault();
    const p = noCanvas(e.clientX, e.clientY);
    zoomEm(e.deltaY < 0 ? 1.08 : 1 / 1.08, p.x, p.y);
    desenhar();
  }, { passive: false });

  canvas.addEventListener('keydown', e => {
    if (!estado.foto) return;
    const passo = e.shiftKey ? 60 : 16;
    const c = centroJanela();
    const acoes = {
      ArrowLeft:  () => { estado.offset.x -= passo; },
      ArrowRight: () => { estado.offset.x += passo; },
      ArrowUp:    () => { estado.offset.y -= passo; },
      ArrowDown:  () => { estado.offset.y += passo; },
      '+':        () => zoomEm(1.1, c.x, c.y),
      '=':        () => zoomEm(1.1, c.x, c.y),
      '-':        () => zoomEm(1 / 1.1, c.x, c.y)
    };
    if (!acoes[e.key]) return;
    e.preventDefault();
    acoes[e.key]();
    desenhar();
  });

  /* Os botões de zoom aproximam em torno do centro da janela,
     para a foto não "fugir" para o canto. */
  $('zoomMais').addEventListener('click', () => {
    if (!estado.foto) return;
    const c = centroJanela();
    zoomEm(1.1, c.x, c.y);
    desenhar();
  });
  $('zoomMenos').addEventListener('click', () => {
    if (!estado.foto) return;
    const c = centroJanela();
    zoomEm(1 / 1.1, c.x, c.y);
    desenhar();
  });

  /* ---------------------------------------------------------
     Exportar
     JPEG: é foto, então fica bem menor que PNG, e é o formato
     que WhatsApp e Instagram aceitam sem conversão.
     --------------------------------------------------------- */
  const gerarArquivo = () => new Promise((resolve, reject) => {
    /* Garante que o último quadro pendente já foi desenhado. */
    requestAnimationFrame(() => {
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('toBlob falhou'));
        resolve({ blob, file: new File([blob], fmt().arquivo, { type: 'image/jpeg' }) });
      }, 'image/jpeg', 0.92);
    });
  });

  $('baixar').addEventListener('click', async () => {
    if (!estado.foto) return;
    const { blob } = await gerarArquivo();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fmt().arquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });

  const podeCompartilhar = (() => {
    try {
      const teste = new File([new Blob()], 't.jpg', { type: 'image/jpeg' });
      return !!(navigator.canShare && navigator.canShare({ files: [teste] }));
    } catch { return false; }
  })();

  if (podeCompartilhar) {
    const btn = $('compartilhar');
    btn.hidden = false;
    /* Com compartilhamento nativo, ele é a ação principal e
       baixar vira secundária. */
    $('baixar').classList.replace('btn--primary', 'btn--on-dark');
    btn.addEventListener('click', async () => {
      if (!estado.foto) return;
      const { file } = await gerarArquivo();
      try {
        await navigator.share({ files: [file], title: 'Nossa Lavoura 45 anos' });
      } catch { /* a pessoa fechou a folha de compartilhar */ }
    });
  }

  /* ---------------------------------------------------------
     Câmera
     --------------------------------------------------------- */
  const camera = $('camera');
  const video = $('video');
  const erro = $('erroCamera');
  let fluxo = null;
  let modo = 'user';

  const pararCamera = () => {
    if (fluxo) fluxo.getTracks().forEach(t => t.stop());
    fluxo = null;
    video.srcObject = null;
  };

  const iniciarCamera = async novoModo => {
    pararCamera();
    erro.hidden = true;
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: novoModo, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false
      });
      video.srcObject = fluxo;
      modo = novoModo;
      video.classList.toggle('espelho', modo === 'user');
    } catch {
      erro.textContent = 'Não foi possível acessar a câmera. Verifique a permissão do navegador ou escolha uma foto da galeria.';
      erro.hidden = false;
    }
  };

  const fecharCamera = () => {
    pararCamera();
    camera.hidden = true;
    $('abrirCamera').focus();
  };

  $('abrirCamera').addEventListener('click', () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      /* Sem getUserMedia (http, navegador antigo): cai na galeria,
         que no celular também oferece a câmera. */
      inputFoto.click();
      return;
    }
    camera.hidden = false;
    iniciarCamera(modo);
    $('capturar').focus();
  });

  $('fecharCamera').addEventListener('click', fecharCamera);
  $('virarCamera').addEventListener('click', () => iniciarCamera(modo === 'user' ? 'environment' : 'user'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !camera.hidden) fecharCamera();
  });

  $('capturar').addEventListener('click', () => {
    if (!video.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const cc = c.getContext('2d');
    /* A pré-visualização da câmera frontal é espelhada; a foto sai
       igual ao que a pessoa viu. */
    if (modo === 'user') { cc.translate(c.width, 0); cc.scale(-1, 1); }
    cc.drawImage(video, 0, 0, c.width, c.height);
    fecharCamera();
    carregarFoto(c.toDataURL('image/jpeg', 0.92));
  });

  /* ---------------------------------------------------------
     Início
     --------------------------------------------------------- */
  selecionarFormato('perfil');
})();
