The octagon motif as background ornament: a corner fragment showing **exactly two faces** — one straight edge and one 45° edge — solid or outlined with a transparent centre. Never a container, never a clip, never more than two faces.

```jsx
<Octagon corner="bottom-left" size={420} color="var(--lima-500)" />
<Octagon corner="top-right" size={300} variant="outline" color="var(--creme-500)" opacity={0.35} />
```

- The parent needs `position: relative` and `overflow: hidden`; the element anchors itself to the named corner.
- Outline thickness is non-scaling: 2px stays 2px at any size — never thicken or thin it to compensate for scale.
- One or two per section, in lima, creme or terra. Reference geometry: `assets/shapes/octogono-*.svg`.
