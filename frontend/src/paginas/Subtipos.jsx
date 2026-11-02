import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSesion } from '../contexto/SesionContext';
import { obtenerSubtipos, crearSubtipo, editarSubtipo } from '../servicios/subtipos';
import Toasts, { useToasts } from '../componentes/Toasts';

import '../estilos/subtipos.css';

function Icono({ children }) {
    return <svg className="ts-icon" viewBox="0 0 24 24">{children}</svg>;
}

/* ===================== MODAL CREAR / EDITAR ===================== */

function SubtipoModal({ subtipo, tipos, onCerrar, onGuardar }) {
    const [form, setForm] = useState({
        Nombre_subtipo: subtipo?.nombre ?? '',
        ID_Tipo_producto: subtipo ? String(subtipo.tipo_id) : '',
        Descripcion_subtipo: subtipo?.descripcion ?? '',
    });
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        const alTeclear = (e) => e.key === 'Escape' && onCerrar();
        document.addEventListener('keydown', alTeclear);
        return () => document.removeEventListener('keydown', alTeclear);
    }, [onCerrar]);

    const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

    async function enviar(e) {
        e.preventDefault();
        setEnviando(true);
        await onGuardar(form);
        setEnviando(false);
    }

    // Solo tipos activos (más el actual si se está editando)
    const tiposDisponibles = tipos.filter(
        (t) => t.activo || String(t.id) === form.ID_Tipo_producto
    );

    return (
        <div className="ts-modal" style={{ display: 'flex' }} onClick={(e) => e.target === e.currentTarget && onCerrar()}>
            <div className="ts-modal-box">
                <div className="ts-modal-head">
                    <h2>{subtipo ? 'Modificar subtipo' : 'Registrar subtipo'}</h2>
                    <button type="button" className="ts-modal-x" onClick={onCerrar} aria-label="Cerrar">
                        <Icono><path d="M18 6 6 18M6 6l12 12" /></Icono>
                    </button>
                </div>

                <form onSubmit={enviar}>
                    <div className="ts-modal-body">
                        <div className="ts-grupo">
                            <label htmlFor="nombre_subtipo">Nombre</label>
                            <input
                                type="text"
                                id="nombre_subtipo"
                                maxLength={50}
                                required
                                value={form.Nombre_subtipo}
                                onChange={cambiar('Nombre_subtipo')}
                            />
                        </div>

                        <div className="ts-grupo">
                            <label htmlFor="tipo_producto">Tipo de producto</label>
                            <select
                                id="tipo_producto"
                                required
                                value={form.ID_Tipo_producto}
                                onChange={cambiar('ID_Tipo_producto')}
                            >
                                <option value="">Seleccionar tipo</option>
                                {tiposDisponibles.map((t) => (
                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="ts-grupo">
                            <label htmlFor="descripcion_subtipo">Descripción</label>
                            <input
                                type="text"
                                id="descripcion_subtipo"
                                maxLength={200}
                                value={form.Descripcion_subtipo}
                                onChange={cambiar('Descripcion_subtipo')}
                            />
                        </div>
                    </div>

                    <div className="ts-modal-pie">
                        <button type="button" className="ts-btn ts-btn-claro" onClick={onCerrar}>
                            Cancelar
                        </button>
                        <button type="submit" className="ts-btn ts-btn-primary" disabled={enviando}>
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ===================== PÁGINA ===================== */

export default function Subtipos() {
    const { puede } = useSesion();
    const puedeGestionar = puede('subtipos', true);

    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // null | { subtipo: null } (crear) | { subtipo } (editar)
    const [modal, setModal] = useState(null);

    const { toasts, mostrarToast, quitar } = useToasts();

    const cargar = useCallback(async () => {
        try {
            setDatos(await obtenerSubtipos());
            setError('');
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const filtrados = useMemo(() => {
        if (!datos) return [];
        const q = busqueda.toLowerCase().trim();

        return datos.subtipos.filter((s) =>
            `${s.nombre} ${s.tipo_nombre} ${s.descripcion}`.toLowerCase().includes(q)
        );
    }, [datos, busqueda]);

    async function guardar(form) {
        try {
            const r = modal.subtipo
                ? await editarSubtipo(modal.subtipo.id, form)
                : await crearSubtipo(form);

            mostrarToast(r.mensaje);
            setModal(null);
            cargar();
        } catch (e) {
            mostrarToast(e.message, 'error');
        }
    }

    if (error) return <div className="ts-page"><p className="ts-vacio">Error: {error}</p></div>;
    if (!datos) return <div className="ts-page"><p className="ts-vacio">Cargando subtipos...</p></div>;

    const n = filtrados.length;
    const s = n === 1 ? '' : 's';

    return (
        <>
            <Toasts toasts={toasts} onQuitar={quitar} />

            <div className="ts-page">
                <header className="ts-header">
                    <div>
                        <h1 className="ts-title">Gestión de subtipos</h1>
                    </div>

                    {puedeGestionar && (
                        <button type="button" className="ts-btn ts-btn-primary" onClick={() => setModal({ subtipo: null })}>
                            <Icono><path d="M12 5v14M5 12h14" /></Icono>
                            Nuevo subtipo
                        </button>
                    )}
                </header>

                <nav className="ts-tabs">
                    <span className="ts-tab activa">
                        Subtipos
                        <span className="ts-contador">{datos.subtipos.length}</span>
                    </span>
                </nav>

                <form className="ts-search" onSubmit={(e) => e.preventDefault()}>
                    <Icono><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icono>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar clasificación..."
                    />
                </form>

                <section className="ts-card">
                    <div className="ts-table-wrap">
                        <table className="ts-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Tipo de producto</th>
                                    <th>Descripción</th>
                                    {puedeGestionar && <th>Acciones</th>}
                                </tr>
                            </thead>

                            <tbody>
                                {filtrados.map((sub) => (
                                    <tr key={sub.id}>
                                        <td><span className="ts-nombre">{sub.nombre}</span></td>
                                        <td className="ts-muted">{sub.tipo_nombre}</td>
                                        <td className="ts-muted">{sub.descripcion || '—'}</td>

                                        {puedeGestionar && (
                                            <td>
                                                <div className="ts-acciones">
                                                    <button
                                                        type="button"
                                                        className="ts-icon-btn"
                                                        title="Modificar subtipo"
                                                        aria-label="Modificar subtipo"
                                                        onClick={() => setModal({ subtipo: sub })}
                                                    >
                                                        <Icono>
                                                            <path d="M12 20h9" />
                                                            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                                                        </Icono>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}

                                {n === 0 && (
                                    <tr>
                                        <td colSpan={puedeGestionar ? 4 : 3} className="ts-vacio">
                                            No hay subtipos registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="ts-pie">
                        <span>{n} registro{s} encontrado{s}</span>
                        <span>Agroquímica del Valle</span>
                    </div>
                </section>
            </div>

            {modal && (
                <SubtipoModal
                    key={modal.subtipo?.id ?? 'nuevo'}
                    subtipo={modal.subtipo}
                    tipos={datos.tipos}
                    onCerrar={() => setModal(null)}
                    onGuardar={guardar}
                />
            )}
        </>
    );
}