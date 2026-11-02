import { pedir } from './api';

export const obtenerPerfiles = () => pedir('/perfiles/');

export const crearPerfil = (datos) =>
  pedir('/perfiles/', { metodo: 'POST', datos });

export const editarPerfil = (id, datos) =>
  pedir(`/perfiles/${id}/`, { metodo: 'PUT', datos });

export const cambiarEstadoPerfil = (id, activo) =>
  pedir(`/perfiles/${id}/estado/`, { metodo: 'POST', datos: { activo } });

export const obtenerPermisos = () => pedir('/permisos/');

export const obtenerMisPermisos = () => pedir('/mis-permisos/');