// Equivale a |floatformat:"-2" (y "-2g" con separador de miles)
export function formatoNumero(valor, conMiles = false) {
    const n = Number(valor);
    if (Number.isNaN(n)) return '';
    const decimales = Number.isInteger(n) ? 0 : 2;
    return n.toLocaleString('es-AR', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
        useGrouping: conMiles,
    });
}

// "2026-05-31" -> "31/05/2026"  (equivale a |date:"d/m/Y")
export function formatoFecha(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
}
