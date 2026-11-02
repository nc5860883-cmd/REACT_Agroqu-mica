import { pedir } from './api';

export const obtenerUsuarios = () => pedir('/usuarios/');

export const crearUsuario = (datos) =>
  pedir('/usuarios/', { metodo: 'POST', datos });

export const editarUsuario = (id, datos) =>
  pedir(`/usuarios/${id}/`, { metodo: 'PUT', datos });

export const darBajaUsuario = (id) =>
  pedir(`/usuarios/${id}/baja/`, { metodo: 'POST' });

export const activarUsuario = (id) =>
  pedir(`/usuarios/${id}/activar/`, { metodo: 'POST' });

export const restablecerContrasena = (id, datos) =>
  pedir(`/usuarios/${id}/restablecer/`, { metodo: 'POST', datos });