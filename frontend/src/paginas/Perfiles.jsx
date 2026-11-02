import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useSesion } from '../contexto/SesionContext';
import {
    obtenerPerfiles,
    crearPerfil,
    editarPerfil,
    cambiarEstadoPerfil,
} from '../servicios/perfiles';
import Toasts, { useToasts } from '../componentes/Toasts';

import '../estilos/perfiles.css';

function Icono({ children, ancho = 2 }) {
    return (
        <svg
            className="pf-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={ancho}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

function useEscape(onCerrar) {
    useEffect(() => {
        const alTeclear = (e) => e.key === 'Escape' && onCerrar();
        document.addEventListener('keydown', alTeclear);
        return () => document.removeEventListener('keydown', alTeclear);
    }, [onCerrar]);
}

function ModalPf({ titulo, onCerrar, children }) {
    useEscape(onCerrar);

    return (
        <div className="pf-modal show" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
            <div className="pf-modal-box">
                <div className="pf-modal-head">
                    <h2>{titulo}</h2>
                    <button type="button" className="pf-modal-x" onClick={onCerrar} aria-label="Cerrar">
                        <Icono><path d="M18 6 6 18M6 6l12 12" /></Icono>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

/* ===================== MODAL CREAR / EDITAR ===================== */

function PerfilModal({ perfil, permisos, enviando, onCerrar, onGuardar }) {
    const [nombre, setNombre] = useState(perfil?.nombre ?? '');
    const [seleccion, setSeleccion] = useState(
        () => new Set(perfil ? perfil.permisos.map((p) => p.id) : [])
    );

    function alternar(id) {
        setSeleccion((actual) => {
            const nuevo = new Set(actual);
            nuevo.has(id) ? nuevo.delete(id) : nuevo.add(id);
            return nuevo;
        });
    }

    function enviar(e) {
        e.preventDefault();
        onGuardar({ Nombre_perfil: nombre.trim(), permisos: [...seleccion] });
    }

    return (
        <ModalPf titulo={perfil ? 'Modificar perfil' : 'Registrar perfil'} onCerrar={onCerrar}>
            <form onSubmit={enviar}>
                <div className="pf-modal-body">
                    <div className="pf-grupo">
                        <label htmlFor="pf_nombre">Nombre</label>
                        <input
                            type="text"
                            id="pf_nombre"
                            maxLength={50}
                            required
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                    </div>

                    <div className="pf-grupo">
                        <label>Permisos asignados</label>

                        <div className="pf-permisos-lista">
                            {permisos.length === 0 && (
                                <p className="pf-sin">No hay permisos registrados.</p>
                            )}

                            {permisos.map((permiso) => (
                                <label className="pf-permiso" key={permiso.id}>
                                    <input
                                        type="checkbox"
                                        checked={seleccion.has(permiso.id)}
                                        onChange={() => alternar(permiso.id)}
                                    />
                                    <span className="pf-permiso-info">
                                        <strong>{permiso.nombre}</strong>
                                        {permiso.descripcion && <small>{permiso.descripcion}</small>}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pf-modal-pie">
                    <button type="button" className="pf-btn pf-btn-claro" onClick={onCerrar}>Cancelar</button>
                    <button type="submit" className="pf-btn pf-btn-primary" disabled={enviando}>
                        {perfil ? 'Guardar cambios' : 'Guardar'}
                    </button>
                </div>
            </form>
        </ModalPf>
    );
}

/* ===================== MODAL CONFIRMAR BAJA ===================== */

function BajaModal({ perfil, enviando, onCerrar, onConfirmar }) {
    const bloqueada = perfil.usuarios_activos > 0;
    const n = perfil.usuarios_activos;
    const cantPermisos = perfil.permisos.length;

    const iniciales = perfil.nombre.trim().split(/\s+/)
        .map((p) => p.charAt(0)).join('').slice(0, 2).toUpperCase();

    function enviar(e) {
        e.preventDefault();
        if (!bloqueada) onConfirmar();
    }

    return (
        <ModalPf titulo="Confirmar baja" onCerrar={onCerrar}>
            <form onSubmit={enviar}>
                <div className="pf-modal-body">
                    <div className="pf-aviso-peligro">
                        <Icono>
                            <path d="M12 8v5M12 17h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                        </Icono>
                        <span>
                            {bloqueada
                                ? `No se puede dar de baja: tiene ${n} usuario${n === 1 ? ' activo asignado' : 's activos asignados'}. Reasignalos a otro perfil antes de continuar.`
                                : 'Verificá que sea el perfil correcto antes de confirmar la baja.'}
                        </span>
                    </div>

                    <div className="pf-resumen">
                        <div className="pf-resumen-cab">
                            <div className="pf-avatar">{iniciales}</div>
                            <div>
                                <h4>{perfil.nombre}</h4>
                                <p>Perfil registrado</p>
                            </div>
                        </div>

                        <div className="pf-resumen-grid">
                            <div className="pf-dato"><span className="lbl">ID</span><span className="val">{perfil.id}</span></div>
                            <div className="pf-dato"><span className="lbl">Nombre</span><span className="val">{perfil.nombre}</span></div>
                            <div className="pf-dato">
                                <span className="lbl">Permisos</span>
                                <span className="val">{cantPermisos} {cantPermisos === 1 ? 'permiso' : 'permisos'}</span>
                            </div>
                            <div className="pf-dato"><span className="lbl">Usuarios activos</span><span className="val">{n}</span></div>
                            <div className="pf-dato"><span className="lbl">Estado</span><span className="val val-ok">Activo</span></div>
                        </div>
                    </div>
                </div>

                <div className="pf-modal-pie">
                    <button type="button" className="pf-btn pf-btn-claro" onClick={onCerrar}>Cancelar</button>

                    {bloqueada && (
                        <Link to="/usuarios" className="pf-btn pf-btn-claro" style={{ display: 'inline-flex' }}>
                            Ver usuarios
                        </Link>
                    )}

                    <button type="submit" className="pf-btn pf-btn-peligro" disabled={bloqueada || enviando}>
                        Confirmar baja
                    </button>
                </div>
            </form>
        </ModalPf>
    );
}

/* ===================== POPOVER "+N más" ===================== */
// Se dibuja en <body> para que ningún contenedor lo recorte.

function PopoverPermisos({ datos, puedeEditar, onEditar }) {
    const ref = useRef(null);
    const [pos, setPos] = useState({ left: datos.left, top: datos.top });
    const { perfil } = datos;

    // Lo acomoda para que no se salga de la pantalla (abajo o a la derecha).
    useLayoutEffect(() => {
        const { offsetWidth: ancho, offsetHeight: alto } = ref.current;
        let top = datos.top;

        if (top + alto > window.innerHeight - 12) {
            top = Math.max(12, datos.arriba - alto - 6);
        }

        setPos({
            left: Math.max(12, Math.min(datos.left, window.innerWidth - ancho - 12)),
            top,
        });
    }, [datos]);

    return createPortal(
        <div
            ref={ref}
            className="pf-popover"
            role="dialog"
            aria-label={`Permisos de ${perfil.nombre}`}
            style={{ left: pos.left, top: pos.top }}
        >
            <div className="pf-popover-titulo">
                Permisos de {perfil.nombre} · {perfil.permisos.length}
            </div>

            <ul className="pf-popover-lista">
                {perfil.permisos.map((p) => (
                    <li key={p.id}>
                        <Icono ancho={2.2}><path d="M5 12l5 5 9-10" /></Icono>
                        {p.nombre}
                    </li>
                ))}
            </ul>

            {puedeEditar && (
                <div className="pf-popover-pie">
                    <button type="button" className="pf-popover-link" onClick={() => onEditar(perfil)}>
                        Editar permisos →
                    </button>
                </div>
            )}
        </div>,
        document.body
    );
}

/* ===================== PÁGINA ===================== */

export default function Perfiles() {
    const { puede } = useSesion();
    const puedeGestionar = puede('perfiles', true);

    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [enviando, setEnviando] = useState(false);

    // null | { tipo: 'form', perfil: null | {...} } | { tipo: 'baja', perfil }
    const [modal, setModal] = useState(null);
    const [popover, setPopover] = useState(null);

    const { toasts, mostrarToast, quitar } = useToasts();

    const cargar = useCallback(async () => {
        try {
            setDatos(await obtenerPerfiles());
            setError('');
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // El popover se cierra al hacer clic afuera, scroll, resize o Escape.
    useEffect(() => {
        if (!popover) return;

        const cerrar = () => setPopover(null);
        const alClic = (e) => {
            if (!e.target.closest('.pf-chip-mas, .pf-popover')) cerrar();
        };
        const alScroll = (e) => {
            if (e.target.closest && e.target.closest('.pf-popover')) return;
            cerrar();
        };
        const alTeclear = (e) => e.key === 'Escape' && cerrar();

        window.addEventListener('click', alClic);
        window.addEventListener('scroll', alScroll, true);
        window.addEventListener('resize', cerrar);
        document.addEventListener('keydown', alTeclear);

        return () => {
            window.removeEventListener('click', alClic);
            window.removeEventListener('scroll', alScroll, true);
            window.removeEventListener('resize', cerrar);
            document.removeEventListener('keydown', alTeclear);
        };
    }, [popover]);

    const filtrados = useMemo(() => {
        if (!datos) return [];
        const q = busqueda.toLowerCase().trim();
        return datos.perfiles.filter((p) => p.nombre.toLowerCase().includes(q));
    }, [datos, busqueda]);

    function abrirPopover(evento, perfil) {
        if (popover?.perfil.id === perfil.id) {
            setPopover(null);
            return;
        }

        const rect = evento.currentTarget.getBoundingClientRect();

        setPopover({ perfil, left: rect.left, top: rect.bottom + 6, arriba: rect.top });
    }

    function editarDesdePopover(perfil) {
        setPopover(null);
        setModal({ tipo: 'form', perfil });
    }

    async function ejecutar(accion, tipoToast = 'success') {
        setEnviando(true);

        try {
            const r = await accion();
            mostrarToast(r.mensaje, tipoToast);
            setModal(null);
            cargar();
        } catch (e) {
            mostrarToast(e.message, 'error');
        } finally {
            setEnviando(false);
        }
    }

    if (error) return <div className="pf-page"><p className="pf-vacio">Error: {error}</p></div>;
    if (!datos) return <div className="pf-page"><p className="pf-vacio">Cargando perfiles...</p></div>;

    const n = filtrados.length;
    const s = n === 1 ? '' : 's';

    return (
        <>
            <Toasts toasts={toasts} onQuitar={quitar} />

            <div className="pf-page">
                <header className="pf-header">
                    <div>
                        <h1 className="pf-title">Perfiles de acceso</h1>
                    </div>

                    {puedeGestionar && (
                        <button
                            type="button"
                            className="pf-btn pf-btn-primary"
                            onClick={() => setModal({ tipo: 'form', perfil: null })}
                        >
                            <Icono><path d="M12 5v14M5 12h14" /></Icono>
                            Nuevo perfil
                        </button>
                    )}
                </header>

                <form className="pf-search" onSubmit={(e) => e.preventDefault()}>
                    <Icono><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icono>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar perfil..."
                    />
                    {busqueda && (
                        <button type="button" className="pf-limpiar" onClick={() => setBusqueda('')}>
                            Limpiar
                        </button>
                    )}
                </form>

                <section className="pf-card">
                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th>Perfil</th>
                                    <th>Permisos asignados</th>
                                    <th>Usuarios</th>
                                    <th>Estado</th>
                                    {puedeGestionar && <th>Acciones</th>}
                                </tr>
                            </thead>

                            <tbody>
                                {filtrados.map((perfil) => (
                                    <tr key={perfil.id} className={'perfil-fila' + (perfil.activo ? '' : ' inactivo')}>
                                        <td><span className="pf-nombre">{perfil.nombre}</span></td>

                                        <td className="pf-permisos">
                                            {perfil.permisos.length > 0 ? (
                                                <div className="pf-chips">
                                                    {perfil.permisos.slice(0, 3).map((p) => (
                                                        <span className="pf-chip" key={p.id} title={p.descripcion}>
                                                            {p.nombre}
                                                        </span>
                                                    ))}

                                                    {perfil.permisos.length > 3 && (
                                                        <button
                                                            type="button"
                                                            className="pf-chip pf-chip-mas"
                                                            aria-haspopup="true"
                                                            aria-expanded={popover?.perfil.id === perfil.id}
                                                            onClick={(e) => abrirPopover(e, perfil)}
                                                        >
                                                            +{perfil.permisos.length - 3} más
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="pf-chip pf-chip-aviso">Sin permisos asignados</span>
                                            )}
                                        </td>

                                        <td>{perfil.usuarios_activos}</td>

                                        <td>
                                            <span className={'pf-badge ' + (perfil.activo ? 'pf-activo' : 'pf-inactivo')}>
                                                {perfil.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>

                                        {puedeGestionar && (
                                            <td>
                                                <div className="pf-acciones">
                                                    <button
                                                        type="button"
                                                        className="pf-accion pf-btn-editar"
                                                        title="Modificar perfil"
                                                        aria-label={`Modificar perfil ${perfil.nombre}`}
                                                        onClick={() => setModal({ tipo: 'form', perfil })}
                                                    >
                                                        <Icono>
                                                            <path d="M12 20h9" />
                                                            <path d="M16.376 3.622a2.1 2.1 0 0 1 2.97 2.97L7.368 18.57a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                                                        </Icono>
                                                    </button>

                                                    {perfil.activo ? (
                                                        !perfil.es_sistema && (
                                                            <button
                                                                type="button"
                                                                className="pf-accion pf-baja"
                                                                title="Dar de baja perfil"
                                                                aria-label={`Dar de baja perfil ${perfil.nombre}`}
                                                                onClick={() => setModal({ tipo: 'baja', perfil })}
                                                            >
                                                                <Icono>
                                                                    <path d="M3 6h18" />
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                    <path d="M10 11v6M14 11v6" />
                                                                </Icono>
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="pf-accion pf-activar"
                                                            title="Activar perfil"
                                                            aria-label={`Activar perfil ${perfil.nombre}`}
                                                            onClick={() => ejecutar(() => cambiarEstadoPerfil(perfil.id, true))}
                                                        >
                                                            <Icono>
                                                                <circle cx="12" cy="12" r="10" />
                                                                <path d="m9 12 2 2 4-4" />
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
                                        <td colSpan={puedeGestionar ? 5 : 4} className="pf-vacio">
                                            {busqueda
                                                ? 'No se encontraron perfiles con esa búsqueda.'
                                                : 'Todavía no existen perfiles registrados.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pf-pie">
                        <span>{n} registro{s} encontrado{s}</span>
                        <span>Agroquímica del Valle</span>
                    </div>
                </section>
            </div>

            {popover && (
                <PopoverPermisos datos={popover} puedeEditar={puedeGestionar} onEditar={editarDesdePopover} />
            )}

            {modal?.tipo === 'form' && (
                <PerfilModal
                    key={modal.perfil?.id ?? 'nuevo'}
                    perfil={modal.perfil}
                    permisos={datos.permisos}
                    enviando={enviando}
                    onCerrar={() => setModal(null)}
                    onGuardar={(form) =>
                        ejecutar(() =>
                            modal.perfil ? editarPerfil(modal.perfil.id, form) : crearPerfil(form)
                        )
                    }
                />
            )}

            {modal?.tipo === 'baja' && (
                <BajaModal
                    perfil={modal.perfil}
                    enviando={enviando}
                    onCerrar={() => setModal(null)}
                    onConfirmar={() => ejecutar(() => cambiarEstadoPerfil(modal.perfil.id, false), 'warning')}
                />
            )}
        </>
    );
}