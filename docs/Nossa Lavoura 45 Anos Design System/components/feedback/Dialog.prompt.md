Modal for lead capture and confirmations; uses the largest chamfer in the system (38px) so it reads as a hero shape.

```jsx
<Dialog open={open} title="Fale com um consultor" onClose={close}
  footer={<Button variant="primary">Enviar</Button>}>
  <Input label="Nome" />
</Dialog>
```
