import { useSesion } from '../contexto/SesionContext';

// Panel principal. Por ahora muestra un saludo; las alertas de
// vencimiento que tenía panel_principal.html se agregan más adelante.
export default function Panel() {
  const { usuario } = useSesion();

  return (
    <section>
      <h1>Hola, {usuario.nombre}</h1>
      <p>Bienvenido al sistema de gestión de Agroquímica del Valle.</p>
    </section>
  );
}