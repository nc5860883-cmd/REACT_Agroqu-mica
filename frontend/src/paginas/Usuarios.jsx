import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSesion } from '../contexto/SesionContext';
import {
    obtenerUsuarios,
    crearUsuario,
    editarUsuario,
    darBajaUsuario,
    activarUsuario,
    restablecerContrasena,
} from '../servicios/usuarios';
import Toasts, { useToasts } from '../componentes/Toasts';

import '../estilos/usuarios.css';

function Icono({ children }) {
    return <svg className="us-icon" viewBox="0 0 24 24">{children}</svg>;
}

function sinTildes(texto) {
    return texto.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Apellido + primera letra del nombre (igual que el backend)
function generarUsuario(apellido, nombre) {
    const a = sinTildes(apellido);
    const n = sinTildes(nombre);
    return a && n ? a.toLowerCase() + n.charAt(0).toLowerCase() : '';
}

/* ===================== PIEZAS COMUNES ===================== */

function ModalUs({ titulo, ancho, onCerrar, children }) {
    useEffect(() => {
        const alTeclear = (e) => e.key === 'Escape' && onCerrar();
        document.addEventListener('keydown', alTeclear);
        return () => document.removeEventListener('keydown', alTeclear);
    }, [onCerrar]);

    return (
        <div
            className="us-modal"
            style={{ display: 'flex' }}
            onClick={(e) => e.target === e.currentTarget && onCerrar()}
        >
            <div className={'us-modal-box' + (ancho ? ' us-ancho' : '')}>
                <div className="us-modal-head">
                    <h2>{titulo}</h2>
                    <button type="button" className="us-modal-x" onClick={onCerrar} aria-label="Cerrar">
                        <Icono><path d="M18 6 6 18M6 6l12 12" /></Icono>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Campo({ etiqueta, valor, completo }) {
    return (
        <div className={'us-grupo' + (completo ? ' us-full' : '')}>
            <label>{etiqueta}</label>
            <input type="text" value={valor ?? ''} readOnly />
        </div>
    );
}

/* ===================== MODAL REGISTRAR ===================== */

function CrearModal({ perfiles, enviando, onCerrar, onGuardar }) {
    const [form, setForm] = useState({
        Nombre_usuario: '',
        Apellido_usuario: '',
        DNI: '',
        ID_Perfil: '',
        Contrasena: '',
        Email_usuario: '',
    });

    const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

    function enviar(e) {
        e.preventDefault();
        onGuardar(form);
    }

    return (
        <ModalUs titulo="Registrar usuario" onCerrar={onCerrar}>
            <form onSubmit={enviar}>
                <div className="us-grid">
                    <div className="us-grupo">
                        <label>Nombre</label>
                        <input type="text" required value={form.Nombre_usuario} onChange={cambiar('Nombre_usuario')} />
                    </div>

                    <div className="us-grupo">
                        <label>Apellido</label>
                        <input type="text" required value={form.Apellido_usuario} onChange={cambiar('Apellido_usuario')} />
                    </div>

                    <div className="us-grupo us-full">
                        <label>DNI</label>
                        <input type="number" required value={form.DNI} onChange={cambiar('DNI')} />
                    </div>

                    <div className="us-grupo us-full">
                        <label>Perfil de acceso</label>
                        <select required value={form.ID_Perfil} onChange={cambiar('ID_Perfil')}>
                            <option value="">Seleccionar perfil</option>
                            {perfiles.filter((p) => p.activo).map((p) => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="us-grupo us-full">
                        <label>Nombre de usuario</label>
                        <input
                            type="text"
                            readOnly
                            placeholder="Se genera a partir del apellido y nombre"
                            value={generarUsuario(form.Apellido_usuario, form.Nombre_usuario)}
                        />
                    </div>

                    <div className="us-grupo us-full">
                        <label>Contraseña</label>
                        <input type="password" required value={form.Contrasena} onChange={cambiar('Contrasena')} />
                        <span className="us-hint">
                            Mínimo 8 caracteres. El usuario deberá cambiarla en su primer ingreso.
                        </span>
                    </div>

                    <div className="us-grupo us-full">
                        <label>Email</label>
                        <input
                            type="email"
                            required
                            placeholder="usuario@agrovalle.com"
                            value={form.Email_usuario}
                            onChange={cambiar('Email_usuario')}
                        />
                    </div>
                </div>

                <div className="us-modal-pie">
                    <button type="button" className="us-btn us-btn-claro" onClick={onCerrar}>Cancelar</button>
                    <button type="submit" className="us-btn us-btn-primary" disabled={enviando}>Guardar</button>
                </div>
            </form>
        </ModalUs>
    );
}

/* ===================== MODAL MODIFICAR ===================== */

function EditarModal({ usuario, enviando, onCerrar, onGuardar }) {
    const [email, setEmail] = useState(usuario.email);

    function enviar(e) {
        e.preventDefault();
        onGuardar({ Email_usuario: email.trim() });
    }

    return (
        <ModalUs titulo="Modificar usuario" ancho onCerrar={onCerrar}>
            <form onSubmit={enviar}>
                <div className="us-grid">
                    <Campo etiqueta="ID_usuario" valor={usuario.id} />
                    <Campo etiqueta="Perfil" valor={`${usuario.perfil_id} — ${usuario.perfil_nombre}`} />
                    <Campo etiqueta="DNI" valor={usuario.dni} />
                    <Campo etiqueta="Usuario" valor={usuario.usuario} />
                    <Campo etiqueta="Apellido" valor={usuario.apellido} />
                    <Campo etiqueta="Nombre" valor={usuario.nombre} />
                    <Campo etiqueta="Estado" valor={usuario.activo ? 'Activo' : 'Inactivo'} />
                    <Campo etiqueta="Última modificación" valor={usuario.ultima_modificacion} />

                    <div className="us-grupo us-full">
                        <label>Email</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                </div>

                <div className="us-modal-pie">
                    <button type="button" className="us-btn us-btn-claro" onClick={onCerrar}>Cancelar</button>
                    <button type="submit" className="us-btn us-btn-primary" disabled={enviando}>Actualizar</button>
                </div>
            </form>
        </ModalUs>
    );
}

/* ===================== MODAL RESTABLECER CONTRASEÑA ===================== */

function RestablecerModal({ usuario, enviando, onCerrar, onGuardar }) {
    const [form, setForm] = useState({ nueva_contrasena: '', confirmar_contrasena: '' });

    const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

    function enviar(e) {
        e.preventDefault();
        onGuardar(form);
    }

    return (
        <ModalUs titulo="Restablecer contraseña" onCerrar={onCerrar}>
            <form onSubmit={enviar}>
                <div className="us-grid">
                    <div className="us-info us-full">
                        Usuario: <strong>{usuario.usuario}</strong>
                    </div>

                    <div className="us-grupo us-full">
                        <label>Nueva contraseña</label>
                        <input type="password" required value={form.nueva_contrasena} onChange={cambiar('nueva_contrasena')} />
                    </div>

                    <div className="us-grupo us-full">
                        <label>Confirmar contraseña</label>
                        <input type="password" required value={form.confirmar_contrasena} onChange={cambiar('confirmar_contrasena')} />
                    </div>
                </div>

                <div className="us-modal-pie">
                    <button type="button" className="us-btn us-btn-claro" onClick={onCerrar}>Cancelar</button>
                    <button type="submit" className="us-btn us-btn-primary" disabled={enviando}>
                        Restablecer contraseña
                    </button>
                </div>
            </form>
        </ModalUs>
    );
}

/* ===================== MODAL DAR DE BAJA ===================== */

function BajaModal({ usuario, enviando, onCerrar, onConfirmar }) {
    const hoy = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    function enviar(e) {
        e.preventDefault();
        onConfirmar();
    }

    return (
        <ModalUs titulo="Dar de baja usuario" ancho onCerrar={onCerrar}>
            <form onSubmit={enviar}>
                <div className="us-grid">
                    <Campo etiqueta="ID_usuario" valor={usuario.id} />
                    <Campo etiqueta="Perfil" valor={`${usuario.perfil_id} — ${usuario.perfil_nombre}`} />
                    <Campo etiqueta="DNI" valor={usuario.dni} />
                    <Campo etiqueta="Usuario" valor={usuario.usuario} />
                    <Campo etiqueta="Apellido" valor={usuario.apellido} />
                    <Campo etiqueta="Nombre" valor={usuario.nombre} />
                    <Campo etiqueta="Email" valor={usuario.email} />
                    <Campo etiqueta="Estado" valor="Activo" />
                    <Campo etiqueta="Última modificación" valor={usuario.ultima_modificacion} />
                    <Campo etiqueta="Fecha de baja actual" valor={usuario.fecha_baja || '—'} />
                    <Campo etiqueta="Fecha de baja a registrar" valor={hoy} completo />

                    <div className="us-info us-alerta us-full">
                        <strong>Importante:</strong> el usuario quedará inactivo y no podrá ingresar al sistema.
                    </div>
                </div>

                <div className="us-modal-pie">
                    <button type="button" className="us-btn us-btn-claro" onClick={onCerrar}>Cancelar</button>
                    <button type="submit" className="us-btn us-btn-peligro" disabled={enviando}>Dar de baja</button>
                </div>
            </form>
        </ModalUs>
    );
}

/* ===================== PÁGINA ===================== */

export default function Usuarios() {
    const { usuario: yo, puede } = useSesion();
    const puedeGestionar = puede('usuarios', true);

    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [enviando, setEnviando] = useState(false);

    // null | { tipo: 'crear' | 'editar' | 'restablecer' | 'baja', usuario? }
    const [modal, setModal] = useState(null);

    const { toasts, mostrarToast, quitar } = useToasts();

    const cargar = useCallback(async () => {
        try {
            setDatos(await obtenerUsuarios());
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

        return datos.usuarios.filter((u) =>
            `${u.nombre} ${u.apellido} ${u.usuario} ${u.email} ${u.dni}`.toLowerCase().includes(q)
        );
    }, [datos, busqueda]);

    // Ejecuta una acción de la API, muestra el mensaje y recarga la lista.
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

    if (error) return <div className="us-page"><p className="us-vacio">Error: {error}</p></div>;
    if (!datos) return <div className="us-page"><p className="us-vacio">Cargando usuarios...</p></div>;

    const n = filtrados.length;
    const s = n === 1 ? '' : 's';

    return (
        <>
            <Toasts toasts={toasts} onQuitar={quitar} />

            <div className="us-page">
                <header className="us-header">
                    <div>
                        <h1 className="us-title">Gestión de usuarios</h1>
                    </div>

                    {puedeGestionar && (
                        <button type="button" className="us-btn us-btn-primary" onClick={() => setModal({ tipo: 'crear' })}>
                            <Icono><path d="M12 5v14M5 12h14" /></Icono>
                            Nuevo usuario
                        </button>
                    )}
                </header>

                <form className="us-search" onSubmit={(e) => e.preventDefault()}>
                    <Icono><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icono>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre, usuario, DNI o correo..."
                    />
                </form>

                <section className="us-card">
                    <div className="us-table-wrap">
                        <table className="us-table">
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Nombre y apellido</th>
                                    <th>DNI</th>
                                    <th>Email</th>
                                    <th>Perfil</th>
                                    <th>Estado</th>
                                    <th>Última modificación</th>
                                    <th>Fecha de baja</th>
                                    {puedeGestionar && <th>Acciones</th>}
                                </tr>
                            </thead>

                            <tbody>
                                {filtrados.map((u) => (
                                    <tr key={u.id}>
                                        <td><span className="us-username">{u.usuario}</span></td>
                                        <td>{u.nombre} {u.apellido}</td>
                                        <td className="us-muted">{u.dni}</td>
                                        <td className="us-muted">{u.email}</td>
                                        <td className="us-muted">{u.perfil_nombre}</td>
                                        <td>
                                            <span className={'us-badge ' + (u.activo ? 'us-activo' : 'us-inactivo')}>
                                                {u.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="us-muted">{u.ultima_modificacion}</td>
                                        <td className="us-muted">{u.fecha_baja || '—'}</td>

                                        {puedeGestionar && (
                                            <td>
                                                <div className="us-acciones">
                                                    <button
                                                        type="button"
                                                        className="us-icon-btn"
                                                        title="Editar usuario"
                                                        aria-label="Editar usuario"
                                                        onClick={() => setModal({ tipo: 'editar', usuario: u })}
                                                    >
                                                        <Icono>
                                                            <path d="M12 20h9" />
                                                            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                                                        </Icono>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="us-icon-btn"
                                                        title="Restablecer contraseña"
                                                        aria-label="Restablecer contraseña"
                                                        onClick={() => setModal({ tipo: 'restablecer', usuario: u })}
                                                    >
                                                        <Icono>
                                                            <circle cx="7.5" cy="15.5" r="5.5" />
                                                            <path d="m21 2-9.6 9.6" />
                                                            <path d="m15.5 7.5 3 3L22 7l-3-3" />
                                                        </Icono>
                                                    </button>

                                                    {u.activo ? (
                                                        u.id !== yo.id && (
                                                            <button
                                                                type="button"
                                                                className="us-icon-btn us-peligro"
                                                                title="Dar de baja"
                                                                aria-label="Dar de baja"
                                                                onClick={() => setModal({ tipo: 'baja', usuario: u })}
                                                            >
                                                                <Icono>
                                                                    <path d="M3 6h18" />
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                </Icono>
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="us-icon-btn us-activar"
                                                            title="Activar usuario"
                                                            aria-label="Activar usuario"
                                                            onClick={() => ejecutar(() => activarUsuario(u.id))}
                                                        >
                                                            <Icono>
                                                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                                                <circle cx="9" cy="7" r="4" />
                                                                <polyline points="16 11 18 13 22 9" />
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
                                        <td colSpan={puedeGestionar ? 9 : 8} className="us-vacio">
                                            No hay usuarios registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="us-pie">{n} registro{s} encontrado{s}</div>
                </section>
            </div>

            {modal?.tipo === 'crear' && (
                <CrearModal
                    perfiles={datos.perfiles}
                    enviando={enviando}
                    onCerrar={() => setModal(null)}
                    onGuardar={(form) => ejecutar(() => crearUsuario(form))}
                />
            )}

            {modal?.tipo === 'editar' && (
                <EditarModal
                    key={modal.usuario.id}
                    usuario={modal.usuario}
                    enviando={enviando}
                    onCerrar={() => setModal(null)}
                    onGuardar={(form) => ejecutar(() => editarUsuario(modal.usuario.id, form))}
                />
            )}

            {modal?.tipo === 'restablecer' && (
                <RestablecerModal
                    key={modal.usuario.id}
                    usuario={modal.usuario}
                    enviando={enviando}
                    onCerrar={() => setModal(null)}
                    onGuardar={(form) => ejecutar(() => restablecerContrasena(modal.usuario.id, form))}
                />
            )}

            {modal?.tipo === 'baja' && (
                <BajaModal
                    usuario={modal.usuario}
                    enviando={enviando}
                    onCerrar={() => setModal(null)}
                    onConfirmar={() => ejecutar(() => darBajaUsuario(modal.usuario.id), 'warning')}
                />
            )}
        </>
    );
}