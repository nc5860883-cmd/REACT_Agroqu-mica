import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSesion } from '../contexto/SesionContext';
import {
    obtenerProveedores,
    crearProveedor,
    editarProveedor,
    cambiarEstadoProveedor,
} from '../servicios/proveedores';
import Toasts, { useToasts } from '../componentes/Toasts';

import '../estilos/proveedores.css';

function Icono({ children }) {
    return <svg className="pv-icon" viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}

const ICONO_CERRAR = <Icono><path d="M18 6 6 18M6 6l12 12" /></Icono>;

function useEscape(onCerrar) {
    useEffect(() => {
        const alTeclear = (e) => e.key === 'Escape' && onCerrar();
        document.addEventListener('keydown', alTeclear);
        return () => document.removeEventListener('keydown', alTeclear);
    }, [onCerrar]);
}

/* ===================== MODAL CREAR / EDITAR ===================== */

function ProveedorModal({ proveedor, onCerrar, onGuardar }) {
    const [form, setForm] = useState({
        nombre_proveedor: proveedor?.nombre ?? '',
        telefono_proveedor: proveedor?.telefono ?? '',
        email_proveedor: proveedor?.email ?? '',
        direccion_proveedor: proveedor?.direccion ?? '',
    });
    const [conflicto, setConflicto] = useState(null);
    const [enviando, setEnviando] = useState(false);

    useEscape(onCerrar);

    const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

    async function enviar(e) {
        e.preventDefault();
        setEnviando(true);
        setConflicto(await onGuardar(form));
        setEnviando(false);
    }

    return (
        <div className="pv-modal" style={{ display: 'flex' }} onClick={(e) => e.target === e.currentTarget && onCerrar()}>
            <div className="pv-modal-box" role="dialog" aria-modal="true">
                <div className="pv-modal-head">
                    <h2>{proveedor ? 'Modificar proveedor' : 'Registrar proveedor'}</h2>
                    <button type="button" className="pv-modal-x" onClick={onCerrar} aria-label="Cerrar">
                        {ICONO_CERRAR}
                    </button>
                </div>

                <form onSubmit={enviar}>
                    <div className="pv-modal-body">
                        {conflicto && (
                            <div className="pv-conflicto">
                                <div className="pv-conflicto-t">
                                    {proveedor
                                        ? 'Ya existe otro proveedor con esos datos'
                                        : 'El proveedor ya se encuentra registrado'}
                                </div>

                                <div className="pv-conflicto-d">
                                    <div><strong>Nombre:</strong> {conflicto.nombre}</div>
                                    <div><strong>Teléfono:</strong> {conflicto.telefono || '--'}</div>
                                    <div><strong>Email:</strong> {conflicto.email || '--'}</div>
                                </div>
                            </div>
                        )}

                        <div className="pv-grid">
                            <div className="pv-grupo pv-full">
                                <label htmlFor="pv_nombre">Nombre del proveedor</label>
                                <input
                                    type="text"
                                    id="pv_nombre"
                                    maxLength={150}
                                    required
                                    value={form.nombre_proveedor}
                                    onChange={cambiar('nombre_proveedor')}
                                />
                            </div>

                            <div className="pv-grupo">
                                <label htmlFor="pv_telefono">Teléfono</label>
                                <input
                                    type="text"
                                    id="pv_telefono"
                                    maxLength={50}
                                    value={form.telefono_proveedor}
                                    onChange={cambiar('telefono_proveedor')}
                                />
                            </div>

                            <div className="pv-grupo">
                                <label htmlFor="pv_email">Email</label>
                                <input
                                    type="email"
                                    id="pv_email"
                                    value={form.email_proveedor}
                                    onChange={cambiar('email_proveedor')}
                                />
                            </div>

                            <div className="pv-grupo pv-full">
                                <label htmlFor="pv_direccion">Dirección</label>
                                <input
                                    type="text"
                                    id="pv_direccion"
                                    maxLength={255}
                                    value={form.direccion_proveedor}
                                    onChange={cambiar('direccion_proveedor')}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pv-modal-pie">
                        <button type="button" className="pv-btn pv-btn-claro" onClick={onCerrar}>
                            Cancelar
                        </button>
                        <button type="submit" className="pv-btn pv-btn-primary" disabled={enviando}>
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ===================== MODAL CONFIRMAR BAJA ===================== */

function BajaModal({ proveedor, onCerrar, onConfirmar }) {
    useEscape(onCerrar);

    return (
        <div className="pv-modal" style={{ display: 'flex' }} onClick={(e) => e.target === e.currentTarget && onCerrar()}>
            <div className="pv-modal-box" role="dialog" aria-modal="true">
                <div className="pv-modal-head">
                    <h2>Confirmar baja</h2>
                    <button type="button" className="pv-modal-x" onClick={onCerrar} aria-label="Cerrar">
                        {ICONO_CERRAR}
                    </button>
                </div>

                <div className="pv-modal-body">
                    <div className="pv-aviso">
                        <Icono>
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                            <path d="M12 9v4" />
                            <path d="M12 17h.01" />
                        </Icono>
                        <span>Verificá que sea el proveedor correcto antes de confirmar la baja.</span>
                    </div>

                    <div className="pv-resumen">
                        <div className="pv-resumen-cab">
                            <div className="pv-avatar">
                                {proveedor.nombre.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h4>{proveedor.nombre}</h4>
                                <p>Proveedor registrado</p>
                            </div>
                        </div>

                        <div className="pv-resumen-grid">
                            <div className="pv-dato">
                                <span className="lbl">Teléfono</span>
                                <span className="val">{proveedor.telefono || '--'}</span>
                            </div>
                            <div className="pv-dato">
                                <span className="lbl">Email</span>
                                <span className="val">{proveedor.email || '--'}</span>
                            </div>
                            <div className="pv-dato">
                                <span className="lbl">Dirección</span>
                                <span className="val">{proveedor.direccion || '--'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pv-modal-pie">
                    <button type="button" className="pv-btn pv-btn-claro" onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button type="button" className="pv-btn pv-btn-peligro" onClick={() => onConfirmar(proveedor)}>
                        Confirmar baja
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ===================== PÁGINA ===================== */

export default function Proveedores() {
    const { puede } = useSesion();
    const puedeGestionar = puede('proveedores', true);

    const [lista, setLista] = useState(null);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // null | { tipo: 'form', proveedor: null | {...} } | { tipo: 'baja', proveedor }
    const [modal, setModal] = useState(null);

    const { toasts, mostrarToast, quitar } = useToasts();

    const cargar = useCallback(async () => {
        try {
            const r = await obtenerProveedores();
            setLista(r.proveedores);
            setError('');
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const filtrados = useMemo(() => {
        if (!lista) return [];
        const q = busqueda.toLowerCase().trim();

        return lista.filter((p) =>
            `${p.nombre} ${p.email} ${p.direccion} ${p.telefono}`.toLowerCase().includes(q)
        );
    }, [lista, busqueda]);

    // Devuelve el proveedor en conflicto (si lo hay) para mostrarlo en el modal.
    async function guardar(form) {
        try {
            const proveedor = modal.proveedor;
            const r = proveedor
                ? await editarProveedor(proveedor.id, form)
                : await crearProveedor(form);

            mostrarToast(r.mensaje);
            setModal(null);
            cargar();
            return null;
        } catch (e) {
            if (e.status === 409 && e.datos?.conflicto) {
                return e.datos.conflicto;
            }
            mostrarToast(e.message, 'error');
            return null;
        }
    }

    async function cambiarEstado(proveedor, activo) {
        try {
            const r = await cambiarEstadoProveedor(proveedor.id, activo);
            mostrarToast(r.mensaje, activo ? 'success' : 'warning');
            setModal(null);
            cargar();
        } catch (e) {
            mostrarToast(e.message, 'error');
        }
    }

    if (error) return <div className="pv-page"><p className="pv-vacio">Error: {error}</p></div>;
    if (!lista) return <div className="pv-page"><p className="pv-vacio">Cargando proveedores...</p></div>;

    const n = filtrados.length;
    const s = n === 1 ? '' : 's';

    return (
        <>
            <Toasts toasts={toasts} onQuitar={quitar} />

            <div className="pv-page">
                <header className="pv-header">
                    <div>
                        <h1 className="pv-title">Gestión de proveedores</h1>
                    </div>

                    {puedeGestionar && (
                        <button
                            type="button"
                            className="pv-btn pv-btn-primary"
                            onClick={() => setModal({ tipo: 'form', proveedor: null })}
                        >
                            <Icono><path d="M12 5v14M5 12h14" /></Icono>
                            Nuevo proveedor
                        </button>
                    )}
                </header>

                <form className="pv-search" onSubmit={(e) => e.preventDefault()}>
                    <Icono><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icono>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre, correo, dirección o teléfono..."
                    />
                </form>

                <section className="pv-card">
                    <div className="pv-table-wrap">
                        <table className="pv-table">
                            <thead>
                                <tr>
                                    <th>Proveedor</th>
                                    <th>Teléfono</th>
                                    <th>Email</th>
                                    <th>Dirección</th>
                                    <th>Estado</th>
                                    {puedeGestionar && <th>Acciones</th>}
                                </tr>
                            </thead>

                            <tbody>
                                {filtrados.map((p) => (
                                    <tr key={p.id} className={p.activo ? '' : 'inactivo'}>
                                        <td><span className="pv-nombre">{p.nombre}</span></td>
                                        <td className="pv-muted">{p.telefono || '—'}</td>
                                        <td className="pv-muted">{p.email || '—'}</td>
                                        <td className="pv-muted pv-dir">{p.direccion || '—'}</td>
                                        <td>
                                            <span className={'pv-badge ' + (p.activo ? 'pv-activo' : 'pv-inactivo')}>
                                                {p.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>

                                        {puedeGestionar && (
                                            <td>
                                                <div className="pv-acciones">
                                                    <button
                                                        type="button"
                                                        className="pv-accion pv-accion-icono"
                                                        aria-label="Editar proveedor"
                                                        onClick={() => setModal({ tipo: 'form', proveedor: p })}
                                                    >
                                                        <Icono>
                                                            <path d="M12 20h9" />
                                                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                                                        </Icono>
                                                    </button>

                                                    {p.activo ? (
                                                        <button
                                                            type="button"
                                                            className="pv-accion pv-accion-icono pv-baja"
                                                            aria-label="Dar de baja proveedor"
                                                            onClick={() => setModal({ tipo: 'baja', proveedor: p })}
                                                        >
                                                            <Icono>
                                                                <path d="M3 6h18" />
                                                                <path d="M8 6V4h8v2" />
                                                                <path d="m19 6-1 14H6L5 6" />
                                                                <path d="M10 11v5M14 11v5" />
                                                            </Icono>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="pv-accion pv-accion-icono pv-activar"
                                                            aria-label="Activar proveedor"
                                                            onClick={() => cambiarEstado(p, true)}
                                                        >
                                                            <Icono>
                                                                <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                                                                <path d="m9 11 3 3L22 4" />
                                                            </Icono>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}

                                {n === 0 && (
                                    <tr>
                                        <td colSpan={puedeGestionar ? 6 : 5} className="pv-vacio">
                                            No se encontraron proveedores.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pv-pie">
                        <span>{n} registro{s} encontrado{s}</span>
                        <span>Agroquímica del Valle</span>
                    </div>
                </section>
            </div>

            {modal?.tipo === 'form' && (
                <ProveedorModal
                    key={modal.proveedor?.id ?? 'nuevo'}
                    proveedor={modal.proveedor}
                    onCerrar={() => setModal(null)}
                    onGuardar={guardar}
                />
            )}

            {modal?.tipo === 'baja' && (
                <BajaModal
                    proveedor={modal.proveedor}
                    onCerrar={() => setModal(null)}
                    onConfirmar={(p) => cambiarEstado(p, false)}
                />
            )}
        </>
    );
}