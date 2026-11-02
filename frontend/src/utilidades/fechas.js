// "2026-10-30" -> "30/10/2026"
export function fechaCorta(iso) {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

// "2026-10-30T14:05:00-03:00" -> { fecha: "30/10/2026", hora: "14:05" }
export function fechaHora(iso) {
  if (!iso) return { fecha: '—', hora: '—' };

  const d = new Date(iso);

  return {
    fecha: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}