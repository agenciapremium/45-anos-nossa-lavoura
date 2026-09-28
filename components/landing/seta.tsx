/**
 * A seta dos botões. Aponta para o `<symbol id="pict-seta">` declarado uma
 * única vez em `<GeometriaDoSistema />`, como fazia a landing estática.
 */
export function Seta() {
  return (
    <svg className="btn__seta" aria-hidden="true">
      <use href="#pict-seta" />
    </svg>
  );
}

/**
 * Definições SVG do design system: o fragmento de canto do octógono (duas
 * faces) e o pictograma da seta. Renderizado uma vez, no topo do documento.
 */
export function GeometriaDoSistema() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{ position: 'absolute' }}
    >
      <defs>
        <path
          id="oct-solid"
          d="M0,100 L0,42 Q0,39 3,39 L39,39 Q42,39 44.1,41.1 L98,95 Q100,97 100,100 Z"
        />
        <path
          id="oct-line"
          d="M0,42 Q0,39 3,39 L39,39 Q42,39 44.1,41.1 L98,95 Q100,97 100,100"
        />
        <symbol id="pict-seta" viewBox="0 0 492 409.31">
          <path d="M484.14,185.54L306.46,7.86c-5.07-5.07-11.83-7.86-19.04-7.86s-13.97,2.79-19.04,7.86l-16.13,16.14c-5.07,5.06-7.86,11.83-7.86,19.04s2.79,14.2,7.86,19.26l103.66,103.88H26.58c-14.85,0-26.58,11.62-26.58,26.48v22.81c0,14.85,11.73,27.65,26.58,27.65h330.5l-104.83,104.46c-5.07,5.07-7.86,11.65-7.86,18.86s2.79,13.88,7.86,18.95l16.13,16.08c5.07,5.07,11.83,7.84,19.04,7.84s13.97-2.8,19.04-7.87l177.68-177.68c5.08-5.09,7.87-11.88,7.86-19.11,0-7.24-2.79-14.05-7.86-19.11Z" />
        </symbol>
      </defs>
    </svg>
  );
}
