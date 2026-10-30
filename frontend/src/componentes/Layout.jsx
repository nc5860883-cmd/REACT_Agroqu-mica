import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSesion } from '../contexto/SesionContext';
import { IconosSprite } from './Iconos';
import Sidebar from './Sidebar';
import '../estilos/sidebar.css';
import '../estilos/topbar.css';

// Equivale a base.html: menú lateral, barra superior y,
// en <Outlet />, la pantalla que corresponda (lo que antes
// era {% block contenido %}).
export default function Layout() {
  const { usuario } = useSesion();
  const [menuOculto, setMenuOculto] = useState(false);

  const inicial = (usuario.email || usuario.usuario || '?').charAt(0).toUpperCase();

  return (
    <div className="layout">
      <IconosSprite />

      <Sidebar oculto={menuOculto} />

      <div className="page-area">
        {/* TOPBAR */}
        <header className="topbar">
          <button
            className="topbar-menu"
            type="button"
            aria-label={menuOculto ? 'Abrir menú' : 'Cerrar menú'}
            onClick={() => setMenuOculto(!menuOculto)}
          >
            ☰
          </button>

          <div className="topbar-brand">
            <span className="topbar-title">Agroquímica del Valle</span>
          </div>

          <div className="topbar-user">
            <div className="topbar-user-info">
              <strong>{usuario.email}</strong>
              <span>{usuario.perfil}</span>
            </div>
            <div className="topbar-avatar">{inicial}</div>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}