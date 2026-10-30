import { NavLink, useNavigate } from 'react-router-dom';
import { useSesion } from '../contexto/SesionContext';
import { Icono } from './Iconos';

// Opciones del menú según el perfil, iguales a _sidebar.html.
// { seccion } es un título; { ruta, icono, texto } es un enlace.

const MENU_ADMINISTRACION = [
  { seccion: 'ADMINISTRACIÓN' },
  { ruta: '/usuarios', icono: 'users', texto: 'Usuarios del sistema' },

  { seccion: 'INVENTARIO' },
  { ruta: '/productos', icono: 'package', texto: 'Productos y stock' },
  { ruta: '/tipos-productos', icono: 'layers', texto: 'Tipos de productos' },
  { ruta: '/subtipos', icono: 'tags', texto: 'Subtipos' },
  { ruta: '/proveedores', icono: 'truck', texto: 'Proveedores' },
  { ruta: '/remitos', icono: 'inbox', texto: 'Remitos' },
  { ruta: '/lotes', icono: 'package', texto: 'Lotes' },
  { ruta: '/movimientos-stock', icono: 'swap', texto: 'Movimientos de stock' },
  { ruta: '/historial-alertas', icono: 'bell', texto: 'Historial de alertas' },

  { seccion: 'SEGURIDAD' },
  { ruta: '/perfiles', icono: 'shield', texto: 'Perfiles de acceso' },
  { ruta: '/permisos', icono: 'key', texto: 'Permisos del sistema' },
];

const MENU_AUDITORIA = [
  { ruta: '/auditoria', icono: 'shield', texto: 'Auditoría' },
];

const MENU_SECRETARIA = [
  { seccion: 'ENTRADAS DE PRODUCTOS' },
  { ruta: '/remitos', icono: 'inbox', texto: 'Remitos' },
  { ruta: '/proveedores', icono: 'truck', texto: 'Consultar proveedores' },

  { seccion: 'CONSULTAS DE STOCK' },
  { ruta: '/productos', icono: 'package', texto: 'Consultar productos' },
  { ruta: '/movimientos-stock', icono: 'swap', texto: 'Movimientos de stock' },
];

const MENU_VENDEDOR = [
  { seccion: 'CONSULTAS DE STOCK' },
  { ruta: '/productos', icono: 'package', texto: 'Productos y stock' },
  { ruta: '/lotes', icono: 'package', texto: 'Consultar lotes' },
  { ruta: '/tipos-productos', icono: 'layers', texto: 'Tipos de productos' },
  { ruta: '/subtipos', icono: 'tags', texto: 'Subtipos' },
  { ruta: '/mis-permisos', icono: 'key', texto: 'Mis permisos' },
];

function opcionesSegunPerfil(perfil) {
  if (perfil === 'administrador') {
    return [...MENU_ADMINISTRACION, ...MENU_AUDITORIA];
  }
  if (perfil === 'jefe') return MENU_ADMINISTRACION;
  if (perfil === 'secretaria') return MENU_SECRETARIA;
  if (perfil === 'vendedor') return MENU_VENDEDOR;
  return [];
}

function Enlace({ ruta, icono, texto }) {
  return (
    <div className="nav-item">
      <NavLink
        to={ruta}
        className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
      >
        <Icono nombre={icono} />
        <span>{texto}</span>
      </NavLink>
    </div>
  );
}

export default function Sidebar({ oculto }) {
  const { usuario, cerrarSesion } = useSesion();
  const navigate = useNavigate();

  const perfil = (usuario.perfil || '').toLowerCase();
  const opciones = opcionesSegunPerfil(perfil);
  const inicial = (usuario.email || usuario.usuario || '?').charAt(0).toUpperCase();

  async function salir(evento) {
    evento.preventDefault();
    await cerrarSesion();
    navigate('/login', { replace: true });
  }

  return (
    <aside className={'sidebar' + (oculto ? ' sidebar-hidden' : '')} id="sidebar">
      {/* LOGO */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Icono nombre="leaf" clase="logo-svg" />
        </div>
        <div className="logo-text">
          <strong>Agroquímica</strong>
          <span>del Valle</span>
        </div>
      </div>

      {/* MENÚ SEGÚN PERFIL */}
      <nav className="sidebar-nav">
        <Enlace ruta="/panel" icono="panel" texto="Panel Principal" />

        {opciones.map((opcion, i) =>
          opcion.seccion ? (
            <div className="nav-section" key={'s' + i}>
              <span className="nav-section-title">{opcion.seccion}</span>
            </div>
          ) : (
            <Enlace key={opcion.ruta + i} {...opcion} />
          )
        )}
      </nav>

      {/* PIE DEL SIDEBAR */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{inicial}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{usuario.email}</span>
            <span className="sidebar-user-role">{usuario.perfil}</span>
          </div>
        </div>

        <a href="/login" className="logout-link" onClick={salir}>
          <Icono nombre="logout" />
          <span>Cerrar sesión</span>
        </a>
      </div>
    </aside>
  );
}