import { createContext, useContext, useEffect, useState } from 'react';
import { pedir } from '../servicios/api';

// Guarda el usuario logueado y lo comparte con toda la app.
const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la app, pregunta a Django si ya hay una sesión iniciada.
  // Esta llamada también deja la cookie csrftoken que necesita el login.
  useEffect(() => {
    pedir('/sesion/')
      .then((datos) => setUsuario(datos.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  async function iniciarSesion(nombreUsuario, password) {
    const datos = await pedir('/login/', {
      metodo: 'POST',
      datos: { usuario: nombreUsuario, password },
    });

    setUsuario(datos.usuario);
    return datos.usuario;
  }

  async function cerrarSesion() {
    try {
      await pedir('/logout/', { metodo: 'POST' });
    } finally {
      setUsuario(null);
    }
  }

  // Mismas reglas que permissions.py: puede('tipos') o puede('tipos', true)
  function puede(modulo, gestionar = false) {
    const permiso = usuario?.permisos?.[modulo];

    if (!permiso) return false;

    return gestionar ? permiso.gestionar : permiso.consultar;
  }

  return (
    <SesionContext.Provider
      value={{ usuario, cargando, iniciarSesion, cerrarSesion, puede }}
    >
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  return useContext(SesionContext);
}