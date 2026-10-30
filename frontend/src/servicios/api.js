// Funciones para comunicarse con la API de Django.
// Todas las rutas empiezan con /api; Vite las reenvía a Django.

function leerCookie(nombre) {
  const fila = document.cookie
    .split('; ')
    .find((c) => c.startsWith(nombre + '='));

  return fila ? decodeURIComponent(fila.split('=')[1]) : '';
}

export async function pedir(ruta, { metodo = 'GET', datos } = {}) {
  const opciones = {
    method: metodo,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': leerCookie('csrftoken'),
    },
  };

  if (datos !== undefined) {
    opciones.body = JSON.stringify(datos);
  }

  let respuesta;

  try {
    respuesta = await fetch('/api' + ruta, opciones);
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisá que Django esté corriendo.');
  }

  let json = {};

  try {
    json = await respuesta.json();
  } catch {
    // Respuesta sin contenido JSON (por ejemplo, 204).
  }

  if (!respuesta.ok) {
    const error = new Error(json.error || 'Ocurrió un error inesperado.');
    error.status = respuesta.status;
    throw error;
  }

  return json;
}