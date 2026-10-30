import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { SesionProvider, useSesion } from './contexto/SesionContext';
import Layout from './componentes/Layout';
import Login from './paginas/Login';
import Panel from './paginas/Panel';
import Pendiente from './paginas/Pendiente';
import TiposProductos from './paginas/TiposProductos';

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

              {/* Secciones del menú que todavía no pasamos a React */}
              <Route path="*" element={<Pendiente />} />
            </Route>
          </Route>
        </Routes>
      </SesionProvider>
    </BrowserRouter>
  );
}import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { SesionProvider, useSesion } from './contexto/SesionContext';
import Layout from './componentes/Layout';
import Login from './paginas/Login';
import Panel from './paginas/Panel';
import Pendiente from './paginas/Pendiente';
import TiposProductos from './paginas/TiposProductos';

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

              {/* Secciones del menú que todavía no pasamos a React */}
              <Route path="*" element={<Pendiente />} />
            </Route>
          </Route>
        </Routes>
      </SesionProvider>
    </BrowserRouter>
  );
}