import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { SesionProvider, useSesion } from './contexto/SesionContext';
import Layout from './componentes/Layout';
import Login from './paginas/Login';
import Panel from './paginas/Panel';
import Pendiente from './paginas/Pendiente';
import TiposProductos from './paginas/TiposProductos';
import Productos from './paginas/Productos';
import Subtipos from './paginas/Subtipos';
import Proveedores from './paginas/Proveedores';
import Usuarios from './paginas/Usuarios';
import Perfiles from './paginas/Perfiles';
import Permisos from './paginas/Permisos';
import MisPermisos from './paginas/MisPermisos';
import Lotes from './paginas/Lotes';
import MovimientosStock from './paginas/MovimientosStock';
import HistorialAlertas from './paginas/HistorialAlertas';

// Deja pasar solo si hay sesión iniciada; si no, manda al login.
function RutaProtegida() {
  const { usuario, cargando } = useSesion();

  if (cargando) {
    return <p style={{ padding: '2rem' }}>Cargando...</p>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <SesionProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/panel" replace />} />

          {/* Todo lo de adentro necesita sesión y se muestra con el menú */}
          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              <Route path="/panel" element={<Panel />} />
              <Route path="/tipos-productos" element={<TiposProductos />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/subtipos" element={<Subtipos />} />
              <Route path="/proveedores" element={<Proveedores />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/perfiles" element={<Perfiles />} />
              <Route path="/permisos" element={<Permisos />} />
              <Route path="/mis-permisos" element={<MisPermisos />} />
              <Route path="/lotes" element={<Lotes />} />
              <Route path="/movimientos-stock" element={<MovimientosStock />} />
              <Route path="/historial-alertas" element={<HistorialAlertas />} />

              {/* Secciones del menú que todavía no pasamos a React */}
              <Route path="*" element={<Pendiente />} />
            </Route>
          </Route>
        </Routes>
      </SesionProvider>
    </BrowserRouter>
  );
}