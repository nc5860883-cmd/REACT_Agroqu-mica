import { useEffect, useMemo, useState } from 'react';
import { obtenerMovimientos } from '../servicios/stock';
import { fechaHora } from '../utilidades/fechas';

import '../estilos/movimientos_stock.css';

const ENTRADA = 'Entrada de lote';
const VENCIMIENTO = 'Salida por vencimiento de producto';

function etiquetaTipo(nombre) {
    if (nombre === ENTRADA) return 'Ingreso de lote';
    if (nombre === VENCIMIENTO) return 'Egreso por vencimiento';
    return nombre;
}

function claseTipo(nombre) {
    if (nombre === ENTRADA) return 'tag tag-entrada';
    if (nombre === VENCIMIENTO) return 'tag tag-vencimiento';
    return 'tag tag-venta';
}

export default function MovimientosStock() {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [tipo, setTipo] = useState('');

    useEffect(() => {
        obtenerMovimientos().then(setDatos).catch((e) => setError(e.message));
    }, []);

    const filtrados = useMemo(() => {
        if (!datos) return [];
        const q = busqueda.toLowerCase().trim();

        return datos.movimientos.filter(
            (m) =>
                (!tipo || String(m.tipo_id) === tipo) &&
                `${m.producto} ${m.lote} ${m.observaciones}`.toLowerCase().includes(q)
        );
    }, [datos, busqueda, tipo]);

    if (error) return <p className="tabla-vacia">Error: {error}</p>;
    if (!datos) return <p className="tabla-vacia">Cargando movimientos...</p>;

    const n = filtrados.length;
    const s = n === 1 ? '' : 's';
    const verComprobante = datos.puede_comprobante;

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Movimientos de stock</h1>
                    <p>Historial automático de ingresos de lotes, egresos por vencimiento y egresos por venta.</p>
                </div>
            </div>

            <form className="toolbar" onSubmit={(e) => e.preventDefault()}>
                <input
                    type="text"
                    className="search-box"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar producto, lote u observaciones..."
                />

                <select className="filter-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    <option value="">Todos los movimientos</option>
                    {datos.tipos.map((t) => (
                        <option key={t.id} value={t.id}>{etiquetaTipo(t.nombre)}</option>
                    ))}
                </select>
            </form>

            <div className="card">
                <div className="table-wrap">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Fecha y hora</th>
                                <th>Producto</th>
                                <th>Lote</th>
                                <th>Tipo</th>
                                <th>Cantidad</th>
                                <th>Usuario</th>
                                <th>Observaciones</th>
                                {verComprobante && <th>Comprobante</th>}
                            </tr>
                        </thead>

                        <tbody>
                            {filtrados.map((m) => {
                                const { fecha, hora } = fechaHora(m.fecha);
                                const esEntrada = m.tipo === ENTRADA;

                                return (
                                    <tr key={m.id}>
                                        <td>
                                            <span className="mov-fecha">{fecha}</span>
                                            <span className="mov-hora">{hora}</span>
                                        </td>
                                        <td>{m.producto || '—'}</td>
                                        <td>{m.lote || '—'}</td>
                                        <td><span className={claseTipo(m.tipo)}>{etiquetaTipo(m.tipo)}</span></td>
                                        <td>
                                            <span className={'mov-cantidad ' + (esEntrada ? 'pos' : 'neg')}>
                                                {esEntrada ? '+' : '-'}{m.cantidad}
                                            </span>
                                        </td>
                                        <td>{m.usuario || '—'}</td>
                                        <td><span className="mov-obs">{m.observaciones || '—'}</span></td>

                                        {verComprobante && (
                                            <td>
                                                <a
                                                    href={`/movimientos-stock/${m.id}/comprobante/`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-comprobante"
                                                    title="Generar comprobante PDF"
                                                >
                                                    📄 Generar PDF
                                                </a>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}

                            {n === 0 && (
                                <tr>
                                    <td colSpan={verComprobante ? 8 : 7} className="tabla-vacia">
                                        No se encontraron movimientos de stock.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="tabla-pie">
                    <span>{n} movimiento{s}</span>
                    <span>Agroquímica del Valle</span>
                </div>
            </div>
        </>
    );
}