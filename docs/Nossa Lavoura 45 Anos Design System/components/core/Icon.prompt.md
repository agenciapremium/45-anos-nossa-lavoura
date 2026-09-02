Renders one of the four Nossa Lavoura pictograms (boi, saco, grama, seta) as a currentColor-tinted mask; use it anywhere an icon is needed instead of drawing new SVGs.

```jsx
<Icon name="saco" size={32} />
<Icon name="seta" rotate={-45} color="var(--lima-500)" />
```

- The four SVGs are inlined in the component, so no asset path setup is needed; `color` (or inherited `currentColor`) tints them.
- `seta` points right at 0deg; rotate for up/down/left.
