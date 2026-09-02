/* @ds-bundle: {"format":4,"namespace":"NossaLavoura45AnosDesignSystem_30d0cd","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Octagon","sourcePath":"components/core/Octagon.jsx"},{"name":"Panel","sourcePath":"components/core/Panel.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"a93ab4998fe9","components/core/Button.jsx":"8f5ac6d98490","components/core/Card.jsx":"da5ffd4b8dbf","components/core/Icon.jsx":"aec4347e42ea","components/core/IconButton.jsx":"3766c51e3f80","components/core/Octagon.jsx":"fe1eabf8a8ba","components/core/Panel.jsx":"63a2913c4de5","components/core/Tag.jsx":"3c27cea02452","components/feedback/Dialog.jsx":"e1ea854312c2","components/feedback/Toast.jsx":"2e6a45ff928a","components/feedback/Tooltip.jsx":"d6b566ea9060","components/forms/Checkbox.jsx":"e36af6b124e3","components/forms/Input.jsx":"c28ec9dfc37a","components/forms/Radio.jsx":"6debcef7fdc9","components/forms/Select.jsx":"feb88f528779","components/forms/Switch.jsx":"9d9afaaeeffc","components/navigation/Tabs.jsx":"b51448f8c7ac","ui_kits/site-45-anos/CampanhaScreen.jsx":"64fc96a5340c","ui_kits/site-45-anos/CatalogoScreen.jsx":"a7586f32844d","ui_kits/site-45-anos/HomeScreen.jsx":"9a66eafc31e2","ui_kits/site-45-anos/SiteChrome.jsx":"315d06379fff"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.NossaLavoura45AnosDesignSystem_30d0cd = window.NossaLavoura45AnosDesignSystem_30d0cd || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  accent: ['var(--lima-500)', 'var(--terra-900)'],
  terra: ['var(--terra-700)', 'var(--creme-500)'],
  creme: ['var(--creme-700)', 'var(--terra-700)'],
  success: ['var(--status-success-soft)', 'var(--status-success)'],
  warning: ['var(--status-warning-soft)', 'var(--status-warning)'],
  danger: ['var(--status-danger-soft)', 'var(--status-danger)']
};

/** Small rounded status/label chip. */
function Badge({
  tone = 'accent',
  children,
  style,
  ...rest
}) {
  const [bg, fg] = TONES[tone] || TONES.accent;
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    style: {
      borderRadius: 'var(--radius-sm)',
      display: 'inline-flex',
      alignItems: 'center',
      padding: '5px 12px',
      background: bg,
      color: fg,
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      lineHeight: 1,
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Inner markup of the four brand SVGs, copied verbatim from the supplied
   files (metadata stripped) so the glyphs inherit currentColor. */
const ICONS = {
  boi: {
    viewBox: '0 0 512 413.81',
    body: "<g>\n    <g>\n      <path d=\"M422.13,191.31c-8.06,32.45-36,56.09-69.33,58.67l4.11-16.43c1.11-2.73-.21-5.84-2.93-6.95-2.73-1.11-5.84.21-6.95,2.93-.18.45-.3.92-.36,1.4-6.08,24.21-3.25,13.01-12.53,50.03-.48,1.97-1.01-6.13,8.53,96h-37.33l7.36-29.07c-8.11-90.67-7.73-85.92-7.73-86.45l-7.89-11.52-18.67-27.95c-1.47-2.55-4.73-3.43-7.28-1.96-.14.08-.27.16-.4.25-2.47,1.6-3.18,4.9-1.57,7.38.04.07.09.13.13.2l14.56,21.87H93.71l20.21-15.41c2.37-1.74,2.89-5.08,1.14-7.46-.04-.06-.09-.12-.13-.17-1.72-2.39-5.06-2.93-7.45-1.2-.06.04-.12.09-.18.14-78.29,59.79-76.32,56.75-75.95,58.03,4.16,14.88-.69-2.4,25.92,92.91H17.87l4.59-47.52-17.12-44.27c8.91-24.85,12.43-32,12.43-45.23V56.43c-4.34,3.57-6.84,8.89-6.83,14.51v167.47c0,2.95-2.39,5.33-5.33,5.33s-5.33-2.39-5.33-5.33V70.93c.03-11.73,6.91-22.37,17.6-27.2,2.13-.99,4.39-1.66,6.72-1.97h29.6v4.21l59.09,66.08c14.15,15.8,34.36,24.84,55.57,24.85h54.67c19.8.05,38.79-7.83,52.75-21.87l7.15-7.2c5.1-5.05,11.97-7.91,19.15-7.95,12.98.03,25.44-5.11,34.61-14.29l4.8-4.8c7.1,3.87,15.19,5.56,23.25,4.85v10.67c-.02,12.72,5.42,24.84,14.93,33.28,2.39,2.07,3.78,5.06,3.84,8.21v17.6c.03,19.89,16.16,36,36.05,36,.7.03,1.39,0,2.08-.11h0Z\"></path>\n      <path d=\"M441.97,155.04c.95.76,2.14,1.18,3.36,1.17-.64,13.86-12.39,24.58-26.25,23.94-12.96-.6-23.34-10.97-23.94-23.94,1.2,0,2.37-.42,3.31-1.17,12.83-9.87,30.69-9.87,43.52,0h0Z\"></path>\n      <path d=\"M464.32,85.87v10.67c.04,9.5-3.95,18.58-10.99,24.96-8.53,7.57-7.68,15.52-7.68,22.61-15.25-10.08-35.04-10.08-50.29,0,0-6.72,1.01-14.88-7.73-22.61-7.14-6.35-11.21-15.46-11.2-25.01v-10.67c.85-24.34,21.27-43.39,45.61-42.55,23.16.81,41.74,19.39,42.55,42.55l-.27.05Z\"></path>\n      <path d=\"M420.32,44l-.05.05-.11-.05.11-.05.05.05Z\"></path>\n      <path d=\"M384.32,60.27c-15.57-16.32-18.16-41.09-6.29-60.27-3.51,18.74,5.74,37.56,22.72,46.24l-16.43,14.03Z\"></path>\n      <path d=\"M420.32,44l-.05.05-.11-.05.11-.05.05.05Z\"></path>\n      <path d=\"M439.68,46.29c17.07-8.59,26.36-27.48,22.72-46.24,11.85,19.16,9.28,43.89-6.24,60.21l-16.48-13.97Z\"></path>\n      <path d=\"M370.99,61.28c-2.1,4.2-3.66,8.64-4.64,13.23-7.04,1.09-14.24-.28-20.37-3.89l-17.07-10.03,16.43-10.19c5.24-3.37,11.38-5.04,17.6-4.8,1.9,5.6,4.61,10.88,8.05,15.68h0Z\"></path>\n      <path d=\"M512,60.59l-17.07,10.03c-6.3,3.7-13.7,5.06-20.91,3.84-.94-4.59-2.52-9.02-4.69-13.17,3.43-4.73,6.14-9.94,8.05-15.47,6.34-.44,12.66,1.17,18.03,4.59l16.59,10.19Z\"></path>\n      <path d=\"M444.96,43.09c-3.5-13.67-17.42-21.91-31.09-18.4-9.03,2.32-16.09,9.37-18.4,18.4l1.87,18.19,41.49,1.07,6.13-19.25Z\"></path>\n      <path d=\"M107.57,376.53h-30.45l-15.36-71.68c8.65,2.56,17.78,3.09,26.67,1.55l19.15,70.13Z\"></path>\n      <path d=\"M123.25,260.85c-6.09,24.92-31.22,40.19-56.15,34.11-7.32-1.79-14.1-5.33-19.75-10.32l32-23.79h43.89Z\"></path>\n      <path d=\"M380.05,376.53h-26.67l-8.75-93.71,5.33-22.03c10.1-.34,20.06-2.43,29.44-6.19l-5.33,21.33,5.97,100.59Z\"></path>\n      <path d=\"M70.99,408.43H23.52v-20.96h32.85l14.61,20.96Z\"></path>\n      <path d=\"M124.59,408.43h-47.47v-20.96h32.8l14.67,20.96Z\"></path>\n      <path d=\"M357.39,408.43h-47.41v-20.96h32.8l14.61,20.96Z\"></path>\n      <path d=\"M397.97,408.43h-47.52v-20.96h32.91l14.61,20.96Z\"></path>\n      <path d=\"M307.73,60.85l24.43,14.24-2.72,2.77c-7.06,7.1-16.65,11.11-26.67,11.15-10,.04-19.59,4.02-26.67,11.09l-7.25,7.25c-11.93,11.91-28.1,18.61-44.96,18.61h-55.04c-18.14-.03-35.4-7.79-47.47-21.33l-56.32-62.88h273.49l-30.83,19.09Z\"></path>\n      <path d=\"M445.39,413.81h-171.57c-2.95,0-5.33-2.39-5.33-5.33s2.39-5.33,5.33-5.33h171.57c2.95,0,5.33,2.39,5.33,5.33s-2.39,5.33-5.33,5.33Z\"></path>\n      <path d=\"M169.81,413.81H5.33c-2.95,0-5.33-2.39-5.33-5.33s2.39-5.33,5.33-5.33h164.48c2.95,0,5.33,2.39,5.33,5.33s-2.39,5.33-5.33,5.33Z\"></path>\n    </g>\n  </g>"
  },
  saco: {
    viewBox: '0 0 302.4 383.36',
    body: "<g>\n    <g>\n      <path d=\"M255.64,383.36H23.2c-8.01-2.26-13.62-10.5-10.64-18.97,1.8-5.13,5.25-9.4,9.01-13.37-13.79-29.6-18.76-63.76-20.54-96.54-1.91-35.08-1.16-69.54,2.14-104.55,2.5-26.57,7.42-51.74,14.68-77.33.29-4.82-1.18-10.19-2.09-14.87l-5.38-27.61c-1.54-7.89,8.06-10.69,17.03-12.38,13.03-2.45,25.73-4.24,38.89-5.95,6.22-.81,12-1.9,18.01-3.74,35.75-10.92,74.5-10.62,110.25.31,3.52,1.08,5.46,4.12,4.23,7.53-1.01,2.8-4.23,4.38-7.54,3.3-32.16-10.52-71.3-10.39-103.65-.38-7.47,2.31-14.74,3.46-22.51,4.47-14.76,1.93-28.84,3.87-43.34,7.31l3.84,19.13,48.95-8.83c3.21-.58,6.18,1.39,6.84,4.03.74,2.96-.97,6.32-4.26,6.92l-49.4,8.93c1.87,6.82,1.72,12.76-.16,19.36-6.53,22.82-10.65,45.54-13.01,69.29-3.54,35.76-4.2,71.1-2.15,106.94.87,15.16,2.58,29.38,5.22,44.25,2.85,16.02,7.52,31,14.12,45.72,4.46,9.95-4.39,12.61-8.49,21.39-.95,2.03.82,4.43,3.14,4.43h225.71c1.33,0,2.97-.89,3.37-1.64,1.49-2.82-2.66-8.04-6.29-11.67-3.28-3.28-4.15-7.91-2.17-12.25,7.7-16.88,12.47-34.12,15.4-52.65,3.94-24.99,5.13-49.67,5.16-74.91,0-3.75,2.78-6.39,5.99-6.15,3.5.26,5.31,3,5.29,6.59-.27,43.49-3.19,91.99-21.58,131.58,7.25,7.64,12.35,15.23,8.38,24.08-1.63,3.64-5.35,6.55-9.98,8.24Z\"></path>\n      <path d=\"M278.58,195.84c.14,3.86-2.04,6.21-5.01,6.58-3.14.39-6.08-1.89-6.21-5.51-1.44-40.57-4.74-77.33-16-116.52-1.92-6.7-2.08-12.66-.26-19.73l-54.26-9.67-21.3-5.77c-25.37-5.59-51.72-5.36-76.92.94-3.76.94-7.04-.12-7.95-3.86-.82-3.39,1.42-6.19,5.21-7.12,26.03-6.35,53.03-6.83,79.36-1.58l23.02,6.18,54.94,9.93,3.73-19.29c-14.23-3.16-27.08-5.05-40.79-6.87-3.53-.47-5.75-3.06-5.29-6.54s3.62-5.14,7.31-4.6c11.78,1.71,23.17,3.32,34.85,5.63,9.11,1.8,16.9,4.67,15.34,12.86l-3.9,20.45c6.23,1.45,11.66,4.91,14.3,10.61l4.72,10.2c2.33,5.04,6.51,7.74,12.16,7.5,3.66-.15,6.75,2.24,6.77,5.45.03,3.77-2.88,6.03-6.71,5.9-8.07-.28-15.88-3.04-20.14-10.17-5.3-8.87-5.8-17.1-13.39-18.44-.54,3.41-1.91,7.53-.93,11.03,12.1,43.45,15.66,76.96,17.36,122.4Z\"></path>\n      <path d=\"M119.59,106.19c-14.83,3.42-28.72,9.75-37.89,21.95-8.38,11.14-7.65,25.38,1.45,35.99,25.51,29.75,89.62,29.35,113.69-1.5,8.5-10.89,8.1-24.91-.44-35.64-12.79-16.08-35.85-22.61-56.4-22.83-3.59-.04-6.16-2.44-6.17-5.63s2.56-5.7,6.17-5.65c24.84.35,52.04,8.75,66.67,29.12,10.42,14.51,10.08,33.15-.85,47.38-28.23,36.78-102.27,37.49-131.98,1.07-11.75-14.4-12.38-33.71-1.52-48.66,10.61-14.6,27.05-22.45,44.58-26.53,3.45-.8,6.4.95,7.17,4.19.72,3-1.08,5.95-4.48,6.74Z\"></path>\n      <path d=\"M80.75,232.61c1.3,11.05-23.38,4.84-36.38-2.12-10.8-5.78-27.01-19.76-18.76-25.44,2.63-1.81,6.07-1.34,8.08,1.71,8.31,12.59,25.83,20.22,41.15,20.67,3.3.1,5.54,2.09,5.9,5.18Z\"></path>\n      <path d=\"M204.03,289.99c-3.76.1-5.9-2.34-6.17-5.21-.24-2.63,1.82-5.84,5.14-5.93,15.48-.43,33.36-7.86,41.7-20.49,1.96-2.96,5.03-3.89,7.92-2.2,2.62,1.54,3.66,5.1,1.7,8.05-10.45,15.69-30.81,25.26-50.29,25.78Z\"></path>\n      <path d=\"M91.62,342.25c3.82.13,5.68,3.44,5.35,6.12-.39,3.25-2.95,5.22-6.42,5.09-19.12-.71-39.88-10.17-50.19-26.13-1.79-2.77-.56-6.37,1.76-7.71,2.8-1.62,5.74-.77,7.83,1.86l4.3,5.4c10.03,9.58,23.08,14.88,37.37,15.37Z\"></path>\n    </g>\n  </g>"
  },
  grama: {
    viewBox: '0 0 64 64',
    body: "<g><path d=\"m60 52.72a32.56 32.56 0 0 1 -9-1.08c-1.16-.27-2.34-.55-3.8-.77a10.55 10.55 0 0 1 7-9.14c2.16-.19 1.53-3.66-.58-3a15.23 15.23 0 0 0 -12.3 7 28.07 28.07 0 0 1 19.15-24.47 1.5 1.5 0 0 0 -.47-2.92 34.8 34.8 0 0 0 -29.19 16.34 21.49 21.49 0 0 1 14.38-23.48 1.5 1.5 0 0 0 -.49-2.92 27.61 27.61 0 0 0 -24.84 16.51 30.44 30.44 0 0 0 -15.86-4.65 1.52 1.52 0 0 0 -1.5 1.25 1.5 1.5 0 0 0 1 1.67 24.12 24.12 0 0 1 14.25 12.54 24.16 24.16 0 0 1 2.38 11.17 15.2 15.2 0 0 0 -12.88-8 1.52 1.52 0 1 0 -.61 3 10.45 10.45 0 0 1 7 9.92 35.84 35.84 0 0 0 -9.64-1.21 1.5 1.5 0 0 0 0 3 33 33 0 0 1 9 1.08c3.58 1.46 15.79 1.46 19.37 0s14.49-1.36 18 0a35.84 35.84 0 0 0 9.63 1.16 1.5 1.5 0 0 0 0-3zm-37.67 0a27.2 27.2 0 0 0 -1.88-18.42 27.21 27.21 0 0 0 -7.66-9.62 27.75 27.75 0 0 1 6.91 3.6 27.55 27.55 0 0 1 8.87 10.52 34.73 34.73 0 0 0 -3.16 13.84c-.89.06-2 .09-3.08.08zm21.91-2.15c-.56 0-1.16-.06-1.8-.07a12.08 12.08 0 0 1 3.61-5.68 13.35 13.35 0 0 0 -1.81 5.75z\"></path></g>"
  },
  seta: {
    viewBox: '0 0 492 409.31',
    body: "<g>\n    <path d=\"M484.14,185.54L306.46,7.86c-5.07-5.07-11.83-7.86-19.04-7.86s-13.97,2.79-19.04,7.86l-16.13,16.14c-5.07,5.06-7.86,11.83-7.86,19.04s2.79,14.2,7.86,19.26l103.66,103.88H26.58c-14.85,0-26.58,11.62-26.58,26.48v22.81c0,14.85,11.73,27.65,26.58,27.65h330.5l-104.83,104.46c-5.07,5.07-7.86,11.65-7.86,18.86s2.79,13.88,7.86,18.95l16.13,16.08c5.07,5.07,11.83,7.84,19.04,7.84s13.97-2.8,19.04-7.87l177.68-177.68c5.08-5.09,7.88-11.88,7.86-19.1.02-7.24-2.78-14.04-7.86-19.12Z\"></path>\n  </g>"
  }
};

/** Brand pictogram; a solid silhouette that inherits currentColor. */
function Icon({
  name = 'boi',
  size = 24,
  color = 'currentColor',
  rotate = 0,
  style,
  ...rest
}) {
  const ic = ICONS[name] || ICONS.boi;
  return /*#__PURE__*/React.createElement("svg", _extends({
    role: "img",
    "aria-label": rest['aria-label'] || name,
    viewBox: ic.viewBox,
    width: size,
    height: size,
    fill: color
  }, rest, {
    style: {
      display: 'inline-block',
      flex: '0 0 auto',
      transform: rotate ? 'rotate(' + rotate + 'deg)' : undefined,
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: ic.body
    }
  }));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    fontSize: 'var(--text-body-sm)',
    padding: '8px 16px',
    radius: 'var(--radius-sm)',
    icon: 14
  },
  md: {
    fontSize: 'var(--text-body-md)',
    padding: '13px 26px',
    radius: 'var(--radius-control)',
    icon: 18
  },
  lg: {
    fontSize: 'var(--text-body-lg)',
    padding: '18px 36px',
    radius: 'var(--radius-md)',
    icon: 22
  }
};
const VARIANTS = {
  primary: {
    background: 'var(--lima-500)',
    color: 'var(--text-on-accent)',
    border: '2px solid var(--lima-500)',
    hoverBg: 'var(--lima-600)',
    hoverBorder: 'var(--lima-600)'
  },
  secondary: {
    background: 'var(--terra-700)',
    color: 'var(--creme-500)',
    border: '2px solid var(--terra-700)',
    hoverBg: 'var(--terra-900)',
    hoverBorder: 'var(--terra-900)'
  },
  outline: {
    background: 'transparent',
    color: 'var(--text-body)',
    border: '2px solid var(--border-strong)',
    hoverBg: 'var(--terra-700)',
    hoverBorder: 'var(--terra-700)',
    hoverColor: 'var(--creme-500)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-body)',
    border: '2px solid transparent',
    hoverBg: 'var(--creme-700)',
    hoverBorder: 'transparent'
  },
  onDark: {
    background: 'var(--creme-500)',
    color: 'var(--terra-900)',
    border: '2px solid var(--creme-500)',
    hoverBg: 'var(--lima-500)',
    hoverBorder: 'var(--lima-500)'
  }
};

/** Rounded action button — the campaign's primary call to action. */
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRotate,
  iconPosition = 'end',
  disabled = false,
  fullWidth = false,
  as = 'button',
  children,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({}, rest, {
    disabled: as === 'button' ? disabled : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      borderRadius: s.radius,
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-bold)',
      fontSize: s.fontSize,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      lineHeight: 1,
      textDecoration: 'none',
      padding: s.padding,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.42 : 1,
      background: hover && !disabled ? v.hoverBg : v.background,
      color: hover && !disabled && v.hoverColor ? v.hoverColor : v.color,
      border: hover && !disabled ? '2px solid ' + v.hoverBorder : v.border,
      transform: press && !disabled ? 'translateY(1px)' : 'none',
      transition: 'var(--transition-control)',
      ...style
    }
  }), icon && iconPosition === 'start' && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon,
    rotate: iconRotate
  }), children, icon && iconPosition === 'end' && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon,
    rotate: iconRotate
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 34,
  md: 44,
  lg: 56
};

/** Square rounded button holding a single pictogram. */
function IconButton({
  icon = 'seta',
  iconRotate,
  variant = 'primary',
  size = 'md',
  label,
  disabled = false,
  style,
  ...rest
}) {
  const box = SIZES[size] || SIZES.md;
  const [hover, setHover] = React.useState(false);
  const palette = {
    primary: ['var(--lima-500)', 'var(--terra-900)', 'var(--lima-600)'],
    secondary: ['var(--terra-700)', 'var(--creme-500)', 'var(--terra-900)'],
    outline: ['transparent', 'var(--text-body)', 'var(--creme-700)']
  }[variant] || ['var(--lima-500)', 'var(--terra-900)', 'var(--lima-600)'];
  return /*#__PURE__*/React.createElement("button", _extends({}, rest, {
    "aria-label": label || icon,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderRadius: size === 'sm' ? 'var(--radius-sm)' : 'var(--radius-control)',
      width: box,
      height: box,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: hover && !disabled ? palette[2] : palette[0],
      color: palette[1],
      border: variant === 'outline' ? '2px solid var(--border-strong)' : '2px solid transparent',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.42 : 1,
      transition: 'var(--transition-control)',
      ...style
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    rotate: iconRotate,
    size: Math.round(box * 0.46)
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Octagon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Corner fragment of the brand octagon: exactly two faces are ever visible —
   one straight edge and one 45° edge, matching the supplied
   assets/shapes/octogono-*.svg geometry (soft 2% corner radius).
   Coordinates are in a 0–100 box anchored at the bottom-left corner;
   the remaining edges sit flush against the container edges. */
const SOLID = 'M0,100 L0,42 Q0,39 3,39 L39,39 Q42,39 44.1,41.1 L98,95 Q100,97 100,100 Z';
const LINE = 'M0,42 Q0,39 3,39 L39,39 Q42,39 44.1,41.1 L98,95 Q100,97 100,100';
const ROTATION = {
  'bottom-left': 0,
  'top-left': 90,
  'top-right': 180,
  'bottom-right': 270
};
const ANCHOR = {
  'bottom-left': {
    left: 0,
    bottom: 0
  },
  'top-left': {
    left: 0,
    top: 0
  },
  'top-right': {
    right: 0,
    top: 0
  },
  'bottom-right': {
    right: 0,
    bottom: 0
  }
};

/**
 * Decorative background element: a corner of the brand octagon, solid or
 * outline. Anchors itself to a corner of the nearest positioned ancestor
 * (which must have overflow:hidden) so only two faces ever show.
 */
function Octagon({
  corner = 'bottom-left',
  size = 320,
  variant = 'solid',
  color = 'var(--lima-500)',
  strokeWidth = 2,
  opacity = 1,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    "aria-hidden": "true",
    focusable: "false",
    viewBox: "0 0 100 100",
    width: size,
    height: size
  }, rest, {
    style: {
      position: 'absolute',
      ...ANCHOR[corner],
      display: 'block',
      pointerEvents: 'none',
      opacity,
      transform: 'rotate(' + (ROTATION[corner] || 0) + 'deg)',
      ...style
    }
  }), variant === 'solid' ? /*#__PURE__*/React.createElement("path", {
    d: SOLID,
    fill: color
  }) : /*#__PURE__*/React.createElement("path", {
    d: LINE,
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    vectorEffect: "non-scaling-stroke"
  }));
}
Object.assign(__ds_scope, { Octagon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Octagon.jsx", error: String((e && e.message) || e) }); }

// components/core/Panel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  page: ['var(--surface-page)', 'var(--text-body)'],
  card: ['var(--surface-card)', 'var(--text-body)'],
  creme: ['var(--creme-600)', 'var(--text-body)'],
  terra: ['var(--surface-inverse)', 'var(--text-on-inverse)'],
  accent: ['var(--surface-accent)', 'var(--text-on-accent)']
};

/** Rounded surface primitive — every block in the system sits on one. */
function Panel({
  tone = 'card',
  radius = 'var(--radius-card)',
  padding = 'var(--space-6)',
  bordered = false,
  children,
  style,
  ...rest
}) {
  const [bg, fg] = TONES[tone] || TONES.card;
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    style: {
      borderRadius: radius,
      background: bg,
      color: fg,
      padding,
      border: bordered ? '2px solid var(--border-strong)' : undefined,
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { Panel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Panel.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Product / content card on the rounded Panel surface. */
function Card({
  title,
  eyebrow,
  description,
  badge,
  icon,
  image,
  imageAlt = '',
  tone = 'card',
  radius = 'var(--radius-card)',
  footer,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const inverse = tone === 'terra';
  return /*#__PURE__*/React.createElement(__ds_scope.Panel, _extends({}, rest, {
    tone: tone,
    radius: radius,
    padding: "0",
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transform: hover && onClick ? 'translateY(-3px)' : 'none',
      transition: 'transform var(--dur-fast) var(--ease-standard)',
      ...style
    }
  }), image && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 168,
      background: 'var(--creme-700)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: imageAlt,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-5)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      flex: 1
    }
  }, (badge || icon) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-3)'
    }
  }, badge ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: inverse ? 'accent' : 'creme'
  }, badge) : /*#__PURE__*/React.createElement("span", null), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 28,
    color: inverse ? 'var(--lima-500)' : 'var(--terra-700)'
  })), eyebrow && /*#__PURE__*/React.createElement("span", {
    className: "nl-eyebrow",
    style: {
      color: inverse ? 'var(--lima-500)' : 'var(--text-accent)'
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("h3", {
    style: {
      color: inverse ? 'var(--creme-500)' : 'var(--text-strong)',
      fontSize: 'var(--text-h3)'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      color: inverse ? 'var(--text-on-inverse-muted)' : 'var(--text-body)',
      fontSize: 'var(--text-body-md)'
    }
  }, description), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 'var(--space-3)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Selectable / removable rounded chip. */
function Tag({
  selected = false,
  onRemove,
  onClick,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderRadius: 'var(--radius-pill)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '7px 14px',
      background: selected ? 'var(--terra-700)' : hover ? 'var(--creme-700)' : 'var(--creme-600)',
      color: selected ? 'var(--creme-500)' : 'var(--text-body)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-body-sm)',
      lineHeight: 1,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'var(--transition-control)',
      ...style
    }
  }), children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onRemove();
    },
    "aria-label": "Remover",
    style: {
      all: 'unset',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      lineHeight: 1,
      opacity: 0.7
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Centred rounded modal over a terra scrim. */
function Dialog({
  open = false,
  title,
  description,
  children,
  footer,
  onClose,
  width = 520,
  style,
  ...rest
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "presentation",
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 60,
      background: 'var(--surface-scrim)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("div", _extends({
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    onClick: e => e.stopPropagation()
  }, rest, {
    style: {
      borderRadius: 'var(--radius-surface)',
      width: '100%',
      maxWidth: width,
      background: 'var(--surface-card)',
      padding: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      animation: 'none',
      ...style
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--text-h3)'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)'
    }
  }, description)), onClose && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "seta",
    iconRotate: 180,
    variant: "outline",
    size: "sm",
    label: "Fechar",
    onClick: onClose
  })), children, footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      justifyContent: 'flex-end'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: ['var(--terra-700)', 'var(--creme-500)', 'var(--lima-500)'],
  success: ['var(--status-success)', 'var(--branco)', 'var(--branco)'],
  danger: ['var(--status-danger)', 'var(--branco)', 'var(--branco)']
};

/** Inline confirmation strip with a lime slab marker. */
function Toast({
  tone = 'neutral',
  title,
  message,
  icon = 'grama',
  onClose,
  style,
  ...rest
}) {
  const [bg, fg, accent] = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status"
  }, rest, {
    style: {
      borderRadius: 'var(--radius-card)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      background: bg,
      color: fg,
      padding: '16px 20px',
      minWidth: 320,
      fontFamily: 'var(--font-body)',
      ...style
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 26,
    color: accent
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      flex: 1
    }
  }, title && /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: 'var(--text-body-md)',
      fontWeight: 'var(--weight-bold)'
    }
  }, title), message && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      opacity: 0.85
    }
  }, message)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Fechar",
    style: {
      all: 'unset',
      cursor: 'pointer',
      fontWeight: 700,
      opacity: 0.7,
      padding: '0 4px'
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Hover/focus tooltip on a rounded terra slab. */
function Tooltip({
  label,
  placement = 'top',
  children,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const pos = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translate(-50%,-8px)'
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translate(-50%,8px)'
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translate(-8px,-50%)'
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translate(8px,-50%)'
    }
  }[placement];
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    style: {
      position: 'relative',
      display: 'inline-flex',
      ...style
    }
  }), children, /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      borderRadius: 'var(--radius-xs)',
      position: 'absolute',
      ...pos,
      background: 'var(--terra-900)',
      color: 'var(--creme-500)',
      padding: '8px 12px',
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-body-sm)',
      opacity: open ? 1 : 0,
      visibility: open ? 'visible' : 'hidden',
      transition: 'opacity var(--dur-fast) var(--ease-standard)',
      pointerEvents: 'none',
      zIndex: 40
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Rounded checkbox with a terra tick. */
function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const fid = id || 'nl-cb-' + React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({}, rest, {
    id: fid,
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  })), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      borderRadius: 'var(--radius-xs)',
      width: 22,
      height: 22,
      flex: '0 0 auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: checked ? 'var(--lima-500)' : 'var(--surface-field)',
      boxShadow: 'inset 0 0 0 2px ' + (checked ? 'var(--lima-500)' : 'var(--border-hairline)'),
      transition: 'var(--transition-control)'
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "10",
    viewBox: "0 0 13 10",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 5.2 4.6 8.8 12 1.4",
    fill: "none",
    stroke: "var(--terra-900)",
    strokeWidth: "2.4",
    strokeLinecap: "square"
  }))), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Rounded text field with label, hint and error states. */
function Input({
  label,
  hint,
  error,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  required = false,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || 'nl-in-' + React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-body)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--status-danger)'
    }
  }, " *")), /*#__PURE__*/React.createElement("input", _extends({}, rest, {
    id: fid,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    required: required,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      borderRadius: 'var(--radius-control)',
      font: 'inherit',
      fontSize: 'var(--text-body-md)',
      padding: '13px 16px',
      background: disabled ? 'var(--creme-600)' : 'var(--surface-field)',
      color: 'var(--text-body)',
      border: '2px solid ' + (error ? 'var(--status-danger)' : focus ? 'var(--lima-500)' : 'var(--border-hairline)'),
      outline: 'none',
      transition: 'var(--transition-control)'
    }
  })), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: error ? 'var(--status-danger)' : 'var(--text-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Radio group with round markers. */
function Radio({
  name,
  options = [],
  value,
  onChange,
  disabled = false,
  direction = 'column',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "radiogroup"
  }, rest, {
    style: {
      display: 'flex',
      flexDirection: direction,
      gap: direction === 'row' ? 'var(--space-5)' : 'var(--space-3)',
      ...style
    }
  }), options.map(o => {
    const val = typeof o === 'string' ? o : o.value;
    const lab = typeof o === 'string' ? o : o.label;
    const on = value === val;
    return /*#__PURE__*/React.createElement("label", {
      key: val,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-body-md)',
        color: 'var(--text-body)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: name,
      value: val,
      checked: on,
      disabled: disabled,
      onChange: () => onChange && onChange(val),
      style: {
        position: 'absolute',
        opacity: 0,
        width: 0,
        height: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        borderRadius: 'var(--radius-pill)',
        width: 22,
        height: 22,
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: on ? 'var(--terra-700)' : 'var(--surface-field)',
        boxShadow: 'inset 0 0 0 2px ' + (on ? 'var(--terra-700)' : 'var(--border-hairline)'),
        transition: 'var(--transition-control)'
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        background: 'var(--lima-500)',
        borderRadius: 'var(--radius-pill)'
      }
    })), lab);
  }));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Rounded native select styled with the brand pictogram arrow. */
function Select({
  label,
  hint,
  error,
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || 'nl-sel-' + React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({}, rest, {
    id: fid,
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      borderRadius: 'var(--radius-control)',
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      font: 'inherit',
      fontSize: 'var(--text-body-md)',
      padding: '13px 46px 13px 16px',
      background: disabled ? 'var(--creme-600)' : 'var(--surface-field)',
      color: 'var(--text-body)',
      border: '2px solid ' + (error ? 'var(--status-danger)' : focus ? 'var(--lima-500)' : 'var(--border-hairline)'),
      outline: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'var(--transition-control)'
    }
  }), placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => {
    const val = typeof o === 'string' ? o : o.value;
    const lab = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lab);
  })), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "seta",
    size: 14,
    rotate: 90,
    color: "var(--terra-700)",
    style: {
      position: 'absolute',
      right: 16,
      top: '50%',
      marginTop: -7,
      pointerEvents: 'none'
    }
  })), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: error ? 'var(--status-danger)' : 'var(--text-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Pill-track toggle. */
function Switch({
  label,
  checked = false,
  onChange,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const fid = id || 'nl-sw-' + React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({}, rest, {
    id: fid,
    type: "checkbox",
    role: "switch",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  })), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      borderRadius: 'var(--radius-pill)',
      width: 52,
      height: 28,
      padding: 3,
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: checked ? 'flex-end' : 'flex-start',
      background: checked ? 'var(--lima-500)' : 'var(--creme-700)',
      transition: 'background-color var(--dur-fast) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      background: 'var(--terra-700)',
      borderRadius: 'var(--radius-pill)',
      transition: 'all var(--dur-fast) var(--ease-standard)'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Tab strip with rounded top corners on a slab rule. */
function Tabs({
  items = [],
  value,
  onChange,
  tone = 'light',
  style,
  ...rest
}) {
  const inverse = tone === 'dark';
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist"
  }, rest, {
    style: {
      display: 'flex',
      gap: 'var(--space-1)',
      borderBottom: '2px solid ' + (inverse ? 'var(--border-on-inverse)' : 'var(--border-hairline)'),
      ...style
    }
  }), items.map(it => {
    const val = typeof it === 'string' ? it : it.value;
    const lab = typeof it === 'string' ? it : it.label;
    const on = value === val;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      role: "tab",
      "aria-selected": on,
      onClick: () => onChange && onChange(val),
      style: {
        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
        border: 'none',
        cursor: 'pointer',
        padding: '13px 22px',
        marginBottom: -2,
        fontFamily: 'var(--font-body)',
        fontWeight: 'var(--weight-bold)',
        fontSize: 'var(--text-body-sm)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: on ? inverse ? 'var(--lima-500)' : 'var(--terra-700)' : 'transparent',
        color: on ? inverse ? 'var(--terra-900)' : 'var(--creme-500)' : inverse ? 'var(--text-on-inverse-muted)' : 'var(--text-muted)',
        transition: 'var(--transition-control)'
      }
    }, lab);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site-45-anos/CampanhaScreen.jsx
try { (() => {
const {
  Button,
  Badge,
  Panel,
  Card,
  Icon,
  Input,
  Select,
  Checkbox,
  Radio,
  Toast,
  Octagon
} = window.NossaLavoura45AnosDesignSystem_30d0cd;
function CampanhaScreen({
  onLead
}) {
  const [fase, setFase] = React.useState('Recria');
  const [ok, setOk] = React.useState(true);
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--lima-500)',
      padding: 'var(--space-8) var(--gutter-page)'
    }
  }, /*#__PURE__*/React.createElement(Octagon, {
    corner: "top-left",
    size: 280,
    variant: "outline",
    color: "var(--terra-700)",
    opacity: 0.4
  }), /*#__PURE__*/React.createElement(Octagon, {
    corner: "bottom-right",
    size: 240,
    color: "var(--lima-600)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 1400,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) minmax(0,0.8fr)',
      gap: 'var(--space-7)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "terra"
  }, "Campanha de anivers\xE1rio"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 'var(--text-display)',
      lineHeight: 1.02,
      letterSpacing: '-0.03em',
      color: 'var(--terra-900)',
      maxWidth: '20ch'
    }
  }, "45 ofertas para comemorar 45 anos"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-lead)',
      fontWeight: 300,
      color: 'var(--terra-700)',
      maxWidth: '44ch'
    }
  }, "Condi\xE7\xF5es especiais em nutri\xE7\xE3o, sal mineral e sementes durante todo o m\xEAs \u2014 com frete cortesia acima de 1 tonelada."), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    icon: "seta",
    onClick: onLead
  }, "Quero as condi\xE7\xF5es")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/selo-45-anos.png",
    alt: "Selo 45 anos Nossa Lavoura",
    style: {
      width: '100%',
      maxWidth: 360
    }
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: 'var(--section-y) var(--gutter-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    align: "center",
    eyebrow: "Ofertas do m\xEAs",
    title: "O que est\xE1 em condi\xE7\xE3o especial"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
      gap: 'var(--space-4)'
    }
  }, [['Proteinado Cria 30', 'saco', '-12%'], ['Mineral Seca 90', 'boi', '-15%'], ['Braquiária Brizantha', 'grama', '-10%'], ['Núcleo Leite Plus', 'boi', '-8%']].map(([n, ic, off], i) => /*#__PURE__*/React.createElement(Card, {
    key: n,
    icon: ic,
    eyebrow: "45 anos",
    title: n,
    badge: off,
    tone: i === 1 ? 'terra' : 'card',
    description: "V\xE1lido para pedidos fechados neste m\xEAs."
  }))))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-page-alt)',
      padding: 'var(--section-y) var(--gutter-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
      gap: 'var(--space-7)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    eyebrow: "Consultoria",
    title: "Deixe seu contato",
    description: "Um consultor liga em at\xE9 um dia \xFAtil com pre\xE7o e prazo para a sua fazenda."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "boi",
    size: 46,
    color: "var(--terra-500)"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "saco",
    size: 46,
    color: "var(--terra-500)"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "grama",
    size: 46,
    color: "var(--terra-500)"
  }))), /*#__PURE__*/React.createElement(Panel, {
    tone: "card",
    radius: "var(--radius-surface)",
    padding: "var(--space-6)",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, sent ? /*#__PURE__*/React.createElement(Toast, {
    title: "Recebemos seu contato",
    message: "Nosso consultor liga em at\xE9 1 dia \xFAtil.",
    onClose: () => setSent(false)
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Input, {
    label: "Nome",
    placeholder: "Seu nome"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "WhatsApp",
    placeholder: "(69) 90000-0000"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Munic\xEDpio",
    placeholder: "Selecione",
    options: ['Ji-Paraná', 'Cacoal', 'Vilhena', 'Rolim de Moura']
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "nl-eyebrow",
    style: {
      color: 'var(--text-body)'
    }
  }, "Fase do rebanho"), /*#__PURE__*/React.createElement(Radio, {
    name: "fase",
    direction: "row",
    value: fase,
    onChange: setFase,
    options: ['Cria', 'Recria', 'Engorda']
  })), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Aceito receber ofertas no WhatsApp",
    checked: ok,
    onChange: e => setOk(e.target.checked)
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    icon: "seta",
    onClick: () => setSent(true)
  }, "Enviar contato"))))));
}
Object.assign(window, {
  CampanhaScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site-45-anos/CampanhaScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site-45-anos/CatalogoScreen.jsx
try { (() => {
const {
  Button,
  IconButton,
  Badge,
  Panel,
  Card,
  Icon,
  Tag,
  Tabs,
  Select,
  Input,
  Switch,
  Tooltip
} = window.NossaLavoura45AnosDesignSystem_30d0cd;
const PRODUTOS = [{
  nome: 'Proteinado Cria 30',
  linha: 'Bovinos',
  tipo: 'Nutrição animal',
  icon: 'saco',
  badge: 'Mais vendido',
  desc: 'Proteína para bezerros em pasto seco.',
  peso: '30 kg'
}, {
  nome: 'Mineral Seca 90',
  linha: 'Bovinos',
  tipo: 'Sal mineral',
  icon: 'saco',
  desc: 'Núcleo mineral para os meses críticos.',
  peso: '25 kg'
}, {
  nome: 'Ração Engorda Alta',
  linha: 'Bovinos',
  tipo: 'Nutrição animal',
  icon: 'boi',
  desc: 'Terminação em confinamento, 90 dias.',
  peso: '40 kg'
}, {
  nome: 'Braquiária Brizantha',
  linha: 'Sementes',
  tipo: 'Sementes',
  icon: 'grama',
  badge: 'Safra 26',
  desc: 'Pureza 98%, VC 80%.',
  peso: '10 kg'
}, {
  nome: 'Panicum Mombaça',
  linha: 'Sementes',
  tipo: 'Sementes',
  icon: 'grama',
  desc: 'Alta produção de massa verde.',
  peso: '10 kg'
}, {
  nome: 'Núcleo Leite Plus',
  linha: 'Leite',
  tipo: 'Nutrição animal',
  icon: 'boi',
  desc: 'Suporte de produção para vacas em lactação.',
  peso: '25 kg'
}];
function CatalogoScreen({
  onLead
}) {
  const [tab, setTab] = React.useState('Bovinos');
  const [tipo, setTipo] = React.useState('');
  const [promo, setPromo] = React.useState(false);
  const [busca, setBusca] = React.useState('');
  const [tags, setTags] = React.useState(['Fase cria']);
  const lista = PRODUTOS.filter(p => p.linha === tab).filter(p => !tipo || p.tipo === tipo).filter(p => !busca || p.nome.toLowerCase().includes(busca.toLowerCase())).filter(p => !promo || p.badge);
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--terra-700)',
      padding: 'var(--space-8) var(--gutter-page) var(--space-7)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    inverse: true,
    eyebrow: "Cat\xE1logo",
    title: "Produtos para cada fase do rebanho",
    description: "Filtre por linha e receba o pre\xE7o do dia com o consultor da sua regi\xE3o."
  }), /*#__PURE__*/React.createElement(Tabs, {
    tone: "dark",
    items: ['Bovinos', 'Leite', 'Sementes'],
    value: tab,
    onChange: setTab
  }))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: 'var(--space-7) var(--gutter-page) var(--section-y)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '280px minmax(0,1fr)',
      gap: 'var(--space-7)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    tone: "card",
    radius: "var(--radius-card)",
    padding: "var(--space-5)",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      position: 'sticky',
      top: 100
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Buscar",
    placeholder: "Nome do produto",
    value: busca,
    onChange: e => setBusca(e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Categoria",
    placeholder: "Todas",
    value: tipo,
    onChange: e => setTipo(e.target.value),
    options: ['Nutrição animal', 'Sal mineral', 'Sementes']
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "S\xF3 ofertas 45 anos",
    checked: promo,
    onChange: e => setPromo(e.target.checked)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "nl-eyebrow",
    style: {
      color: 'var(--text-muted)'
    }
  }, "Filtros ativos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, tags.map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t,
    onRemove: () => setTags(tags.filter(x => x !== t))
  }, t)), /*#__PURE__*/React.createElement(Tag, {
    onClick: () => setTags([...new Set([...tags, 'Entrega 24h'])])
  }, "+ Entrega 24h"))), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true,
    onClick: onLead
  }, "Pedir cota\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-muted)'
    }
  }, lista.length, " produto(s) em ", tab), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    label: "Entrega em at\xE9 24h na fazenda"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "saco",
    size: 22,
    color: "var(--terra-500)"
  })), /*#__PURE__*/React.createElement(IconButton, {
    icon: "seta",
    iconRotate: 180,
    variant: "outline",
    size: "sm",
    label: "Anterior"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "seta",
    size: "sm",
    label: "Pr\xF3ximo"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: 'var(--space-5)'
    }
  }, lista.map((p, i) => /*#__PURE__*/React.createElement(Card, {
    key: p.nome,
    icon: p.icon,
    eyebrow: p.tipo,
    title: p.nome,
    description: p.desc,
    badge: p.badge,
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 20
      }
    }, p.peso), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      icon: "seta",
      onClick: onLead
    }, "Cotar"))
  })), !lista.length && /*#__PURE__*/React.createElement(Panel, {
    tone: "creme",
    radius: "var(--radius-card)",
    padding: "var(--space-6)",
    style: {
      gridColumn: '1 / -1',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)'
    }
  }, "Nenhum produto com esses filtros. Fale com um consultor.")))))));
}
Object.assign(window, {
  CatalogoScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site-45-anos/CatalogoScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site-45-anos/HomeScreen.jsx
try { (() => {
const {
  Button,
  Badge,
  Panel,
  Card,
  Icon,
  Tag,
  Octagon
} = window.NossaLavoura45AnosDesignSystem_30d0cd;
function HomeScreen({
  onRoute,
  onLead
}) {
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      minHeight: 620,
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      background: 'var(--terra-700)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/images/kv-gado-pasto.png",
    alt: "Gado nelore no pasto ao amanhecer",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(96deg, var(--terra-900) 0%, color-mix(in srgb, var(--terra-900) 78%, transparent) 46%, transparent 76%)'
    }
  }), /*#__PURE__*/React.createElement(Octagon, {
    corner: "bottom-left",
    size: 300,
    color: "var(--lima-500)",
    opacity: 0.9
  }), /*#__PURE__*/React.createElement(Octagon, {
    corner: "top-right",
    size: 260,
    variant: "outline",
    color: "var(--creme-500)",
    opacity: 0.35
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 1400,
      margin: '0 auto',
      padding: 'var(--space-9) var(--gutter-page)',
      width: '100%',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)',
      gap: 'var(--space-7)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "accent"
  }, "1980 \u2014 2026"), /*#__PURE__*/React.createElement("h1", {
    className: "nl-hero",
    style: {
      color: 'var(--creme-500)',
      maxWidth: '18ch'
    }
  }, "45 anos ao lado de quem ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--lima-500)'
    }
  }, "faz o campo")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-lead)',
      fontWeight: 300,
      color: 'var(--creme-500)',
      maxWidth: '46ch'
    }
  }, "Nutri\xE7\xE3o animal, sal mineral, sementes e insumos com consultoria t\xE9cnica na porteira \u2014 do plantio ao pasto."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: "seta",
    onClick: () => onRoute('campanha')
  }, "Ofertas de anivers\xE1rio"), /*#__PURE__*/React.createElement(Button, {
    variant: "onDark",
    size: "lg",
    onClick: () => onRoute('catalogo')
  }, "Ver produtos"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/selo-45-anos.png",
    alt: "Selo 45 anos Nossa Lavoura",
    style: {
      width: '100%',
      maxWidth: 420,
      filter: 'drop-shadow(0 24px 48px rgba(42,21,18,.45))'
    }
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--lima-500)',
      color: 'var(--terra-900)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      padding: 'var(--space-6) var(--gutter-page)',
      display: 'grid',
      gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
      gap: 'var(--space-6)'
    }
  }, [['45', 'anos de estrada'], ['6', 'unidades em Rondônia'], ['+3.200', 'produtores atendidos'], ['24h', 'para entrega na fazenda']].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 46,
      lineHeight: 1,
      letterSpacing: '-0.02em'
    }
  }, n), /*#__PURE__*/React.createElement("span", {
    className: "nl-eyebrow",
    style: {
      color: 'var(--terra-700)'
    }
  }, l))))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: 'var(--section-y) var(--gutter-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-7)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 'var(--space-6)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    eyebrow: "O que fazemos",
    title: "Linhas que sustentam o seu rebanho",
    description: "Formula\xE7\xF5es por fase, insumos de plantio e assist\xEAncia t\xE9cnica no campo."
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "seta",
    onClick: () => onRoute('catalogo')
  }, "Cat\xE1logo completo")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    icon: "boi",
    eyebrow: "Nutri\xE7\xE3o animal",
    title: "Linha Cria & Recria",
    description: "Proteinados e ra\xE7\xF5es para bezerros e novilhas em qualquer esta\xE7\xE3o.",
    badge: "Mais vendida",
    onClick: () => onRoute('catalogo')
  }), /*#__PURE__*/React.createElement(Card, {
    icon: "saco",
    eyebrow: "Sal mineral",
    title: "Mineral Seca 90",
    description: "Suplementa\xE7\xE3o ajustada para os meses de pasto seco.",
    onClick: () => onRoute('catalogo')
  }), /*#__PURE__*/React.createElement(Card, {
    icon: "grama",
    eyebrow: "Sementes",
    title: "Pastagem & forragem",
    description: "Braqui\xE1ria, panicum e mix de forrageiras com garantia de pureza.",
    onClick: () => onRoute('catalogo')
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-page-alt)',
      padding: 'var(--section-y) var(--gutter-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,0.9fr) minmax(0,1.1fr)',
      gap: 'var(--space-8)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    tone: "terra",
    radius: "var(--radius-surface)",
    padding: "0",
    style: {
      overflow: 'hidden',
      height: 420
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/images/kv-gado-pasto.png",
    alt: "Rebanho no pasto",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: '60% 70%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    eyebrow: "Nossa hist\xF3ria",
    title: "Come\xE7ou com um armaz\xE9m. Virou parceria de gera\xE7\xF5es.",
    description: "Em 1980 abrimos as portas com sacaria de semente e um caminh\xE3o. Hoje somos seis unidades, uma equipe de agr\xF4nomos e zootecnistas e a mesma conversa direta com o produtor."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
      gap: 'var(--space-4)'
    }
  }, [['1980', 'Primeira loja em Ji-Paraná'], ['1998', 'Fábrica de sal mineral'], ['2012', 'Equipe técnica em campo'], ['2026', '45 anos e seis unidades']].map(([y, t]) => /*#__PURE__*/React.createElement(Panel, {
    key: y,
    tone: "card",
    radius: "var(--radius-control)",
    padding: "var(--space-4)"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 26,
      color: 'var(--text-accent)'
    }
  }, y), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-body-sm)',
      marginTop: 4
    }
  }, t))))))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: 'var(--section-y) var(--gutter-page)'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    tone: "terra",
    radius: "var(--radius-surface)",
    padding: "var(--space-8)",
    style: {
      position: 'relative',
      overflow: 'hidden',
      maxWidth: 1400,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-7)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Octagon, {
    corner: "top-right",
    size: 280,
    variant: "outline",
    color: "var(--lima-500)",
    opacity: 0.5
  }), /*#__PURE__*/React.createElement(Octagon, {
    corner: "bottom-left",
    size: 200,
    color: "var(--lima-500)",
    opacity: 0.14
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      maxWidth: '40ch'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "nl-eyebrow",
    style: {
      color: 'var(--lima-500)'
    }
  }, "Consultoria na porteira"), /*#__PURE__*/React.createElement("h2", {
    style: {
      color: 'var(--creme-500)',
      fontSize: 'var(--text-h1)',
      lineHeight: 1.05
    }
  }, "Um t\xE9cnico na sua fazenda, sem custo"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-on-inverse-muted)'
    }
  }, "Agende uma visita e receba um plano nutricional para a pr\xF3xima safra.")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "grama",
    size: 72,
    color: "var(--lima-500)"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: "seta",
    onClick: onLead
  }, "Agendar visita")))));
}
Object.assign(window, {
  HomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site-45-anos/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site-45-anos/SiteChrome.jsx
try { (() => {
const {
  Button,
  IconButton,
  Badge,
  Panel,
  Icon
} = window.NossaLavoura45AnosDesignSystem_30d0cd;
const NAV = [{
  id: 'home',
  label: 'Início'
}, {
  id: 'catalogo',
  label: 'Produtos'
}, {
  id: 'campanha',
  label: '45 Anos'
}];
function SiteHeader({
  route,
  onRoute,
  onLead
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 30,
      background: 'var(--terra-700)',
      color: 'var(--creme-500)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-6)',
      padding: '0 var(--gutter-page)',
      height: 76,
      maxWidth: 1400,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onRoute('home'),
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 20,
      letterSpacing: '-0.01em',
      lineHeight: 1,
      color: 'var(--creme-500)'
    }
  }, "NOSSA", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--lima-500)'
    }
  }, "LAVOURA")), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 2,
      height: 34,
      background: 'var(--border-on-inverse)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "nl-eyebrow",
    style: {
      color: 'var(--lima-500)'
    }
  }, "45 anos")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 'var(--space-1)'
    }
  }, NAV.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    onClick: () => onRoute(n.id),
    style: {
      borderRadius: 'var(--radius-control)',
      border: 'none',
      cursor: 'pointer',
      padding: '10px 18px',
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      fontSize: 'var(--text-body-sm)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      background: route === n.id ? 'var(--lima-500)' : 'transparent',
      color: route === n.id ? 'var(--terra-900)' : 'var(--text-on-inverse-muted)',
      transition: 'var(--transition-control)'
    }
  }, n.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-on-inverse-muted)'
    }
  }, "(69) 3441-0045"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    icon: "seta",
    onClick: onLead
  }, "Falar com consultor"))));
}
function SiteFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--terra-900)',
      color: 'var(--text-on-inverse)',
      padding: 'var(--space-8) var(--gutter-page) var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
      gap: 'var(--space-7)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 24,
      lineHeight: 1.05
    }
  }, "NOSSA", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--lima-500)'
    }
  }, "LAVOURA")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-on-inverse-muted)',
      maxWidth: '32ch'
    }
  }, "Nutri\xE7\xE3o animal, sal mineral, sementes e insumos para o produtor rural desde 1980."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "boi",
    size: 26,
    color: "var(--lima-500)"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "saco",
    size: 26,
    color: "var(--lima-500)"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "grama",
    size: 26,
    color: "var(--lima-500)"
  }))), [['Produtos', ['Nutrição animal', 'Sal mineral', 'Sementes', 'Defensivos']], ['Institucional', ['Nossa história', '45 anos', 'Trabalhe conosco', 'Unidades']], ['Atendimento', ['Fale com um consultor', 'Central de pedidos', 'Assistência técnica', 'WhatsApp']]].map(([t, items]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "nl-eyebrow",
    style: {
      color: 'var(--lima-500)'
    }
  }, t), items.map(i => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-on-inverse-muted)',
      textDecoration: 'none'
    }
  }, i))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      marginTop: 'var(--space-7)',
      paddingTop: 'var(--space-4)',
      borderTop: '2px solid var(--border-on-inverse)',
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-on-inverse-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Nossa Lavoura \xB7 45 anos no campo"), /*#__PURE__*/React.createElement("span", null, "Ji-Paran\xE1 \xB7 Cacoal \xB7 Vilhena \u2014 RO")));
}
function SectionHead({
  eyebrow,
  title,
  description,
  align = 'left',
  inverse = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      textAlign: align,
      alignItems: align === 'center' ? 'center' : 'flex-start',
      maxWidth: align === 'center' ? '58ch' : '48ch',
      margin: align === 'center' ? '0 auto' : undefined
    }
  }, eyebrow && /*#__PURE__*/React.createElement("span", {
    className: "nl-eyebrow",
    style: {
      color: inverse ? 'var(--lima-500)' : 'var(--text-accent)'
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 'var(--text-display)',
      lineHeight: 1.05,
      color: inverse ? 'var(--creme-500)' : 'var(--text-strong)'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-lead)',
      fontWeight: 300,
      color: inverse ? 'var(--text-on-inverse-muted)' : 'var(--text-body)'
    }
  }, description));
}
Object.assign(window, {
  SiteHeader,
  SiteFooter,
  SectionHead,
  NAV
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site-45-anos/SiteChrome.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Octagon = __ds_scope.Octagon;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
