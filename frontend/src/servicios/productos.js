// Llamadas a la API de productos, usando el pedir() de api.js
import { pedir } from './api';

export function obtenerProductos() {
  return pedir('/productos/');
}

export function crearProducto(datos) {
  return pedir('/productos/', { metodo: 'POST', datos });
}

export function editarProducto(id, datos) {
  return pedir(`/productos/${id}/`, { metodo: 'PUT', datos });
}

export function eliminarProducto(id) {
  return pedir(`/productos/${id}/`, { metodo: 'DELETE' });
}

export function registrarEgreso(datos) {
  return pedir('/egresos/', { metodo: 'POST', datos });
}
