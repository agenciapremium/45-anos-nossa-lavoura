import Link from 'next/link';

/* =========================================================
   403 · acesso recusado

   Renderizada pelo `forbidden()` do Next (App Router, `authInterrupts`),
   que é o que faz a resposta sair com **status 403 de verdade** — e não um
   200 com cara de erro.

   Vive na raiz de `app/` porque é ali que o Next a procura, o que significa
   que ela herda o layout raiz e **não** tem o Tailwind do módulo (que é
   carregado só em `/palestras`). Daí o estilo embutido, apoiado nas
   variáveis de `tokens.css`, que o layout raiz importa.

   O que a página **não** diz, por exigência da spec: nada sobre o recurso
   que a pessoa tentou alcançar. Nem o nome, nem o tipo, nem se ele existe.
   A mensagem é a mesma para "seu papel não faz isso" e para "isso é de
   outra loja".
   ========================================================= */

export default function Proibido() {
  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '96px 24px',
        background: 'var(--terra-900, #2a1512)',
        color: 'var(--creme-500, #fffadc)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '46ch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <img
          src="/assets/img/selo_circuito_acelera_no_campo.webp"
          alt="Selo do Circuito de Palestras Acelera no Campo 3.0, com as marcas Virbac e Supremax"
          width={120}
          height={120}
          style={{ width: 120, height: 120, objectFit: 'contain' }}
          decoding="async"
        />
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--fonte-corpo, sans-serif)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--lima-500, #b8db3d)',
          }}
        >
          Acelera no Campo 3.0
        </p>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--fonte-titulo, sans-serif)',
            fontSize: 'clamp(2rem, 6vw, 3rem)',
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          Você não tem acesso a esta página.
        </h1>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--fonte-corpo, sans-serif)',
            fontSize: '1.0625rem',
            lineHeight: 1.6,
            color: 'var(--creme-600, #f6eec6)',
          }}
        >
          O seu perfil não alcança este conteúdo. Se você precisa dele para
          trabalhar, fale com a administração do circuito.
        </p>
        <Link
          href="/palestras/painel"
          style={{
            display: 'inline-block',
            background: 'var(--lima-500, #b8db3d)',
            color: 'var(--terra-900, #2a1512)',
            fontFamily: 'var(--fonte-corpo, sans-serif)',
            fontSize: '1rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textDecoration: 'none',
            padding: '16px 32px',
            borderRadius: '12px',
          }}
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
