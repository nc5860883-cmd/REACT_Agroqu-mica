import { pedir } from './api';

export function obtenerSubtipos() {
  return pedir('/subtipos/');
}

export function crearSubtipo(datos) {
  return pedir('/subtipos/', { metodo: 'POST', datos });
}

export function editarSubtipo(id, datos) {
  return pedir(`/subtipos/${id}/`, { metodo: 'PUT', datos });
}