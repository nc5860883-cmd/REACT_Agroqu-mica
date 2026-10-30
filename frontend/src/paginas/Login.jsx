import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSesion } from '../contexto/SesionContext';
import '../estilos/login.css';

export default function Login() {
  const { usuario, iniciarSesion } = useSesion();
  const navigate = useNavigate();

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Marca el body mientras se muestra el login, para que
  // los estilos de login.css no afecten a las demás pantallas.
  useEffect(() => {
    document.body.classList.add('pagina-login');
    return () => document.body.classList.remove('pagina-login');
  }, []);

  // Si ya hay sesión iniciada, no tiene sentido mostrar el login.
  if (usuario) {
    return <Navigate to="/panel" replace />;
  }

  async function ingresar(evento) {
    evento.preventDefault();
    setError('');
    setEnviando(true);

    try {
      await iniciarSesion(nombreUsuario.trim(), password);
      navigate('/panel', { replace: true });
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-container">
      <h1>Agroquímicos del Valle</h1>

      <div className="subtitle">Sistema de Gestión Interno</div>

      <div className="card">
        <form onSubmit={ingresar}>
          <div className="form-group">
            <label htmlFor="usuario">Usuario</label>
            <input
              type="text"
              id="usuario"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              required
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="btn-submit" disabled={enviando}>
            {enviando ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>

          <div className="footer-text">
            Acceso restringido — solo personal autorizado
          </div>
        </form>
      </div>
    </div>
  );
}import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSesion } from '../contexto/SesionContext';
import '../estilos/login.css';

export default function Login() {
  const { usuario, iniciarSesion } = useSesion();
  const navigate = useNavigate();

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Marca el body mientras se muestra el login, para que
  // los estilos de login.css no afecten a las demás pantallas.
  useEffect(() => {
    document.body.classList.add('pagina-login');
    return () => document.body.classList.remove('pagina-login');
  }, []);

  // Si ya hay sesión iniciada, no tiene sentido mostrar el login.
  if (usuario) {
    return <Navigate to="/panel" replace />;
  }

  async function ingresar(evento) {
    evento.preventDefault();
    setError('');
    setEnviando(true);

    try {
      await iniciarSesion(nombreUsuario.trim(), password);
      navigate('/panel', { replace: true });
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-container">
      <h1>Agroquímicos del Valle</h1>

      <div className="subtitle">Sistema de Gestión Interno</div>

      <div className="card">
        <form onSubmit={ingresar}>
          <div className="form-group">
            <label htmlFor="usuario">Usuario</label>
            <input
              type="text"
              id="usuario"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              required
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="btn-submit" disabled={enviando}>
            {enviando ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>

          <div className="footer-text">
            Acceso restringido — solo personal autorizado
          </div>
        </form>
      </div>
    </div>
  );
}