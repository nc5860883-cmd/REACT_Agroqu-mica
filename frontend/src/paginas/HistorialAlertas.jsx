import { useCallback, useEffect, useState } from 'react';
import { obtenerAlertas, atenderAlerta } from '../servicios/stock';
import { fechaHora } from '../utilidades/fechas';
import Toasts, { useToasts } from '../componentes/Toasts';

import '../estilos/alertas.css';

const VACIO = { tipo: '', producto: '', usuario: '', fecha_desde: '', fecha_hasta: '' };

const IconoCheck = () => (
    <svg className="al-icon" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
);

export default function HistorialAlertas() {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState(VACIO);
    const [aplicados, setAplicados] = useState(VACIO);

    const { toasts, mostrarToast, quitar } = useToasts();

    const cargar = useCallback(async (filtros) => {
        try {
            setDatos(await obtenerAlertas(filtros));
            setError('');
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        cargar(VACIO);
    }, [cargar]);

    const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

    function consultar(e) {
        e.preventDefault();
        setAplicados(form);
        cargar(form);
    }

    function limpiar() {
        setForm(VACIO);
        setAplicados(VACIO);
        cargar(VACIO);
    }

    async function atender(alerta) {
        try {
            const r = await atenderAlerta(alerta.id);
            mostrarToast(r.mensaje);
            cargar(aplicados);
        } catch (e) {
            mostrarToast(e.message, 'error');
        }
    }

    if (error && !datos) return <div className="al-page"><p className="al-vacio">Error: {error}</p></div>;
    if (!datos) return <div className="al-page"><p className="al-vacio">Cargando alertas...</p></div>;

    const n = datos.alertas.length;
    const s = n === 1 ? '' : 's';

    return (
        <>
            <Toasts toasts={toasts} onQuitar={quitar} />

            <div className="al-page">
                <header className="al-header">
                    <h1 className="al-title">Historial de alertas</h1>
                </header>

                <form className="al-filtros" onSubmit={consultar}>
                    <div className="al-filtros-grid">
                        <div className="al-campo">
                            <label htmlFor="al_tipo">Tipo de alerta</label>
                            <select id="al_tipo" value={form.tipo} onChange={cambiar('tipo')}>
                                <option value="">Todos los tipos</option>
                                <option value="Vencimiento">Vencimiento</option>
                                {/* En la base se guarda como "Stock bajo" */}
                                <option value="Stock bajo">Stock mínimo</option>
                            </select>
                        </div>

                        <div className="al-campo">
                            <label htmlFor="al_producto">Producto</label>
                            <select id="al_producto" value={form.producto} onChange={cambiar('producto')}>
                                <option value="">Todos los productos</option>
                                {datos.productos.map((p) => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="al-campo">
                            <label htmlFor="al_usuario">Atendida por</label>
                            <select id="al_usuario" value={form.usuario} onChange={cambiar('usuario')}>
                                <option value="">Todos los usuarios</option>
                                {datos.usuarios.map((u) => (
                                    <option key={u.id} value={u.id}>{u.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="al-campo">
                            <label htmlFor="al_desde">Desde</label>
                            <input id="al_desde" type="date" value={form.fecha_desde} onChange={cambiar('fecha_desde')} />
                        </div>

                        <div className="al-campo">
                            <label htmlFor="al_hasta">Hasta</label>
                            <input id="al_hasta" type="date" value={form.fecha_hasta} onChange={cambiar('fecha_hasta')} />
                        </div>
                    </div>

                    <div className="al-filtros-acc">
                        <button type="submit" className="al-btn al-btn-primary">
                            <svg className="al-icon" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            Consultar
                        </button>

                        <button type="button" className="al-btn al-btn-claro" onClick={limpiar}>
                            Limpiar
                        </button>
                    </div>
                </form>

                <section className="al-card">
                    <div className="al-table-wrap">
                        <table className="al-table">
                            <thead>
                                <tr>
                                    <th className="al-centro">Fecha</th>
                                    <th className="al-centro">Hora</th>
                                    <th>Tipo</th>
                                    <th>Producto</th>
                                    <th>Lote</th>
                                    <th>Mensaje</th>
                                    <th>Cantidad</th>
                                    <th>Stock mínimo</th>
                                    <th>Estado</th>
                                    <th>Atendida por</th>
                                    <th className="al-centro">Fecha de atención</th>
                                    <th className="al-centro">Hora de atención</th>
                                    <th className="al-col-acciones">Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {datos.alertas.map((a) => {
                                    const creada = fechaHora(a.fecha);
                                    const atencion = a.fecha_atencion ? fechaHora(a.fecha_atencion) : null;

                                    return (
                                        <tr key={a.id} className={a.atendida ? '' : 'al-fila-pendiente'}>
                                            <td className="al-centro">{creada.fecha}</td>
                                            <td className="al-centro">{creada.hora}</td>

                                            <td>
                                                {a.tipo === 'Vencimiento' ? (
                                                    <span className="al-badge al-vencimiento">Vencimiento</span>
                                                ) : (
                                                    <span className="al-badge al-stock-minimo">Stock mínimo</span>
                                                )}
                                            </td>

                                            <td><span className="al-producto">{a.producto || '—'}</span></td>
                                            <td className="al-muted">{a.lote || 'Sin lote asociado'}</td>
                                            <td className="al-mensaje">{a.mensaje || '—'}</td>
                                            <td className="al-num">{a.cantidad ?? '—'}</td>
                                            <td className="al-num al-muted">{a.stock_minimo ?? '—'}</td>

                                            <td>
                                                {a.atendida ? (
                                                    <span className="al-estado al-atendida">Atendida</span>
                                                ) : (
                                                    <span className="al-estado al-pendiente">Pendiente</span>
                                                )}
                                            </td>

                                            <td className="al-muted">
                                                {a.atendida && a.usuario ? a.usuario : 'Pendiente de atención'}
                                            </td>

                                            <td className="al-centro">
                                                {atencion ? atencion.fecha : <span className="al-muted">Sin atender</span>}
                                            </td>

                                            <td className="al-centro">
                                                {atencion ? atencion.hora : <span className="al-muted">Sin atender</span>}
                                            </td>

                                            <td className="al-col-acciones">
                                                {a.atendida ? (
                                                    <span className="al-hecho" title="Alerta atendida"><IconoCheck /></span>
                                                ) : (
                                                    datos.puede_atender && (
                                                        <button
                                                            type="button"
                                                            className="al-btn-atender"
                                                            onClick={() => atender(a)}
                                                        >
                                                            <IconoCheck /> Atender
                                                        </button>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {n === 0 && (
                                    <tr>
                                        <td colSpan={13} className="al-vacio">
                                            No se encontraron alertas con los criterios seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="al-pie">
                        <span>{n} alerta{s} encontrada{s}</span>
                        <span>Agroquímicos del Valle</span>
                    </div>
                </section>
            </div>
        </>
    );
}