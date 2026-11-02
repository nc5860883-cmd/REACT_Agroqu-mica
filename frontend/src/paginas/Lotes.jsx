import { useEffect, useMemo, useState } from 'react';
import { obtenerLotes } from '../servicios/stock';
import { fechaCorta } from '../utilidades/fechas';

import '../estilos/ingreso_lote.css';

function Vencimiento({ lote, hoy, limite }) {
    const texto = fechaCorta(lote.vencimiento);

    if (lote.vencimiento < hoy) {
        return <span className="lt-fecha lt-vencido">{texto}</span>;
    }

    if (lote.vencimiento <= limite) {
        return <span className="lt-fecha lt-por-vencer">{texto}</span>;
    }

    return <span className="lt-muted">{texto}</span>;
}

export default function Lotes() {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [marca, setMarca] = useState('');

    useEffect(() => {
        obtenerLotes().then(setDatos).catch((e) => setError(e.message));
    }, []);

    const marcas = useMemo(() => {
        if (!datos) return [];
        return [...new Set(datos.lotes.map((l) => l.marca).filter(Boolean))].sort();
    }, [datos]);

    const filtrados = useMemo(() => {
        if (!datos) return [];
        const q = busqueda.toLowerCase().trim();

        return datos.lotes.filter(
            (l) =>
                (!marca || l.marca === marca) &&
                `${l.numero} ${l.producto} ${l.proveedor} ${l.remito}`.toLowerCase().includes(q)
        );
    }, [datos, busqueda, marca]);

    if (error) return <div className="lt-page"><p className="lt-vacio">Error: {error}</p></div>;
    if (!datos) return <div className="lt-page"><p className="lt-vacio">Cargando lotes...</p></div>;

    const n = filtrados.length;
    const s = n === 1 ? '' : 's';

    return (
        <div className="lt-page">
            <header className="lt-header">
                <div>
                    <h1 className="lt-title">Consultar lotes</h1>
                </div>
            </header>

            <form className="lt-toolbar" onSubmit={(e) => e.preventDefault()}>
                <div className="lt-search">
                    <svg className="lt-icon" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por lote, producto o proveedor..."
                        aria-label="Buscar lotes"
                    />
                </div>

                <select
                    className="lt-select"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    aria-label="Filtrar por marca"
                >
                    <option value="">Todas las marcas</option>
                    {marcas.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            </form>

            <section className="lt-card">
                <div className="lt-table-wrap">
                    <table className="lt-table">
                        <thead>
                            <tr>
                                <th>Número de lote</th>
                                <th>Producto</th>
                                <th>Marca</th>
                                <th>Proveedor</th>
                                <th>Fecha de ingreso</th>
                                <th>Fecha de vencimiento</th>
                                <th>Cantidad ingresada</th>
                                <th>Cantidad actual</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filtrados.map((l) => (
                                <tr key={l.id}>
                                    <td><span className="lt-num">{l.numero}</span></td>
                                    <td>{l.producto}</td>
                                    <td>{l.marca || 'Sin marca'}</td>
                                    <td className="lt-muted">{l.proveedor}</td>
                                    <td className="lt-muted">{fechaCorta(l.ingreso)}</td>
                                    <td><Vencimiento lote={l} hoy={datos.hoy} limite={datos.limite} /></td>
                                    <td><span className="lt-cant">{l.cantidad_ingresada}</span></td>
                                    <td><span className="lt-cant">{l.cantidad_actual}</span></td>
                                </tr>
                            ))}

                            {n === 0 && (
                                <tr>
                                    <td colSpan={8} className="lt-vacio">No se encontraron lotes.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="lt-pie">
                    <span>{n} lote{s} encontrado{s}</span>
                </div>
            </section>
        </div>
    );
}