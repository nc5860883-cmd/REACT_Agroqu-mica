import { useLocation } from 'react-router-dom';

// Se muestra en las opciones del menú que todavía no pasamos a React.
export default function Pendiente() {
  const { pathname } = useLocation();

  return (
    <section>
      <h1>Pantalla en migración</h1>
      <p>
        La sección <code>{pathname}</code> todavía no está disponible en esta
        versión. Mientras tanto, podés usarla desde el sistema Django.
      </p>
    </section>
  );
}