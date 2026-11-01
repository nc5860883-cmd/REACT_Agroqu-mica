import { IconoCaja, IconoOjo, IconoEditar, IconoBasura } from './IconosProductos';
import { formatoNumero, formatoFecha } from '../utilidades/formato';

export default function FilaProducto({ producto: p, lotesAbiertos, onToggleLotes, onEditar, onEliminar }) {
    const activo = p.estado === 'Activo';
    const stockBajo = p.stock && p.stock.cantidad <= p.stock.minimo;
    const textoLotes = lotesAbiertos ? 'Ocultar lotes' : 'Consultar lotes';

    return (
        <>
            <tr className={'producto-card' + (activo ? '' : ' inactivo')}>

                <td>
                    <div className="pr-prod">
                        <span className="pr-prod-icono"><IconoCaja /></span>
                        <div><span className="pr-nombre">{p.nombre}</span></div>
                    </div>
                </td>

                <td><span className="pr-tipo">{p.tipo_nombre}</span></td>

                <td><span className="pr-tipo">{p.marca || 'Sin marca'}</span></td>

                <td><span className="pr-subtipos">{p.subtipo_nombre || 'Sin subtipo'}</span></td>

                <td className="pr-precio">$ {formatoNumero(p.precio, true)}</td>

                <td>{p.cantidad_presentacion != null ? formatoNumero(p.cantidad_presentacion) : ''}</td>

                <td>{p.unidad_medida || '—'}</td>

                <td>{p.unidades_por_presentacion}</td>

                <td>
                    <span className={'pr-stock' + (stockBajo ? ' pr-bajo' : '')}>
                        {p.stock ? p.stock.cantidad : 0}
                    </span>
                </td>

                <td className="pr-minimo">
                    {p.stock
                        ? <>{p.stock.minimo} <small>un.</small></>
                        : <span className="pr-muted">—</span>}
                </td>

                <td>
                    <span className={'pr-badge ' + (activo ? 'pr-activo' : 'pr-inactivo')}>
                        {activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>

                <td>
                    <div className="pr-acciones">
                        {p.lotes.length > 0 && (
                            <button
                                type="button"
                                className="pr-icon-btn pr-ver-lotes"
                                title={textoLotes}
                                aria-label={textoLotes}
                                aria-expanded={lotesAbiertos}
                                aria-controls={`lotes-${p.id}`}
                                onClick={() => onToggleLotes(p.id)}
                            >
                                <IconoOjo />
                            </button>
                        )}

                        <button
                            type="button"
                            className="pr-icon-btn"
                            title="Editar producto"
                            aria-label="Editar producto"
                            onClick={() => onEditar(p)}
                        >
                            <IconoEditar />
                        </button>

                        <button
                            type="button"
                            className="pr-icon-btn pr-baja"
                            title="Eliminar producto"
                            aria-label="Eliminar producto"
                            onClick={() => onEliminar(p)}
                        >
                            <IconoBasura />
                        </button>
                    </div>
                </td>
            </tr>

            {lotesAbiertos && (
                <tr id={`lotes-${p.id}`} className="pr-fila-lotes">
                    <td colSpan={12}>
                        <div className="pr-lotes-contenido">
                            <h4>Lotes de {p.nombre}</h4>

                            <div className="pr-lotes-tabla-contenedor">
                                <table className="pr-lotes-tabla">
                                    <thead>
                                        <tr>
                                            <th>Número de lote</th>
                                            <th>Remito</th>
                                            <th>Proveedor</th>
                                            <th>Fecha de vencimiento</th>
                                            <th>Cantidad ingresada</th>
                                            <th>Cantidad actual</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {p.lotes.map((lote) => (
                                            <tr key={lote.numero + '-' + lote.remito}>
                                                <td>{lote.numero}</td>
                                                <td>{lote.remito}</td>
                                                <td>{lote.proveedor}</td>
                                                <td>{formatoFecha(lote.vencimiento)}</td>
                                                <td>{lote.cantidad_ingresada}</td>
                                                <td>{lote.cantidad_actual}</td>
                                                <td>
                                                    <span className={`pr-lote-estado pr-estado-${String(lote.estado).toLowerCase()}`}>
                                                        {lote.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
