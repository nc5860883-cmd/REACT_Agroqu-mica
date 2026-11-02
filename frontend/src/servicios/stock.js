import { pedir } from './api';

export const obtenerLotes = () => pedir('/lotes/');

export const obtenerMovimientos = () => pedir('/movimientos-stock/');

export function obtenerAlertas(filtros = {}) {
  const qs = new URLSearchParams(
    Object.entries(filtros).filter(([, valor]) => valor)
  ).toString();

  return pedir('/alertas/' + (qs ? '?' + qs : ''));
}

export const atenderAlerta = (id) =>
  pedir(`/alertas/${id}/atender/`, { metodo: 'POST' });