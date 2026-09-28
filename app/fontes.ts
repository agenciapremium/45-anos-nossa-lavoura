import localFont from 'next/font/local';

/**
 * As duas famílias do design system Nossa Lavoura 45 Anos, carregadas dos
 * WOFF2 que já estavam em `assets/fonts/` (hoje `public/assets/fonts/`).
 *
 * `next/font/local` cuida do `@font-face`, do `font-display: swap` e do
 * preload das variações usadas acima da dobra — o que a landing estática
 * fazia à mão com `<link rel="preload">`.
 */
export const parkinsans = localFont({
  src: [
    {
      path: '../public/assets/fonts/Parkinsans-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/Parkinsans-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--fonte-parkinsans',
  display: 'swap',
  fallback: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
});

export const hankenGrotesk = localFont({
  src: [
    {
      path: '../public/assets/fonts/HankenGrotesk-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/HankenGrotesk-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/assets/fonts/HankenGrotesk-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--fonte-hanken',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const classesDeFonte = `${parkinsans.variable} ${hankenGrotesk.variable}`;
