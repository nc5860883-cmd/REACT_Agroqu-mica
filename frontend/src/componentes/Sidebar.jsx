import { NavLink, useNavigate } from 'react-router-dom';
import { useSesion } from '../contexto/SesionContext';
import { Icono } from './Iconos';

// Igual que MENU en permissions.py: cada opción aparece si el perfil puede consultar ese módulo.
const MENU = [
  { titulo: 'ADMINISTRACIÓN', items: [
    { modulo: 'usuarios', ruta: '/usuarios', icono: 'users', texto: 'Usuarios del sistema' },
  ] },
  { titulo: 'INVENTARIO', items: [
    { modulo: 'productos', ruta: '/productos', icono: 'package', texto: 'Productos y stock' },
    { modulo: 'tipos', ruta: '/tipos-productos', icono: 'layers', texto: 'Tipos de productos' },
    { modulo: 'subtipos', ruta: '/subtipos', icono: 'tags', texto: 'Subtipos' },
    { modulo: 'proveedores', ruta: '/proveedores', icono: 'truck', texto: 'Proveedores' },
    { modulo: 'remitos', ruta: '/remitos', icono: 'inbox', texto: 'Remitos' },
    { modulo: 'lotes', ruta: '/lotes', icono: 'package', texto: 'Lotes' },
    { modulo: 'movimientos', ruta: '/movimientos-stock', icono: 'swap', texto: 'Movimientos de stock' },
    { modulo: 'alertas', ruta: '/historial-alertas', icono: 'bell', texto: 'Historial de alertas' },
  ] },
  { titulo: 'ANÁLISIS', items: [
    { modulo: 'reportes', ruta: '/reportes', icono: 'chart', texto: 'Reportes' },
  ] },
  { titulo: 'SEGURIDAD', items: [
    { modulo: 'perfiles', ruta: '/perfiles', icono: 'shield', texto: 'Perfiles de acceso' },
    { modulo: 'permisos', ruta: '/permisos', icono: 'key', texto: 'Permisos del sistema' },
    { modulo: 'auditoria', ruta: '/auditoria', icono: 'shield', texto: 'Auditoría' },
  ] },
];

function Enlace({ ruta, icono, texto }) {
  return (
    <div className="nav-item">
      <NavLink to={ruta} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
        <Icono nombre={icono} />
        <span>{texto}</span>
      </NavLink>
    </div>
  );
}

export default function Sidebar({ oculto }) {
  const { usuario, cerrarSesion, puede } = useSesion();
  const navigate = useNavigate();

  const inicial = (usuario.email || usuario.usuario || '?').charAt(0).toUpperCase();

  const secciones = MENU
    .map((s) => ({ ...s, items: s.items.filter((i) => puede(i.modulo)) }))
    .filter((s) => s.items.length > 0);

  if (!usuario.es_administrador) {
    secciones.push({
      titulo: 'MI CUENTA',
      items: [{ ruta: '/mis-permisos', icono: 'key', texto: 'Mis permisos' }],
    });
  }

  async function salir(evento) {
    evento.preventDefault();
    await cerrarSesion();
    navigate('/login', { replace: true });
  }

  return (
    <aside className={'sidebar' + (oculto ? ' sidebar-hidden' : '')} id="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"><Icono nombre="leaf" clase="logo-svg" /></div>
        <div className="logo-text">
          <strong>Agroquímica</strong>
          <span>del Valle</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Enlace ruta="/panel" icono="panel" texto="Panel Principal" />

        {secciones.map((s) => (
          <div key={s.titulo}>
            <div className="nav-section">
              <span className="nav-section-title">{s.titulo}</span>
            </div>
            {s.items.map((i) => <Enlace key={i.ruta} {...i} />)}
          </div>
        ))}
      </nav>

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