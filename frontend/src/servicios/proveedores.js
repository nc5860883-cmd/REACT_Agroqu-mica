import { pedir } from './api';

export function obtenerProveedores() {
  return pedir('/proveedores/');
}

export function crearProveedor(datos) {
  return pedir('/proveedores/', { metodo: 'POST', datos });
}

export function editarProveedor(id, datos) {
  return pedir(`/proveedores/${id}/`, { metodo: 'PUT', datos });
}

export function cambiarEstadoProveedor(id, activo) {
  return pedir(`/proveedores/${id}/estado/`, { metodo: 'POST', datos: { activo } });
}