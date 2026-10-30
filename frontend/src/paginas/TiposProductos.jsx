import { useEffect, useMemo, useState } from 'react';
import { useSesion } from '../contexto/SesionContext';
import { pedir } from '../servicios/api';
import '../estilos/tipos_productos.css';

/* =====================================================
   ÍCONOS (los mismos SVG de tipos_productos.html)
===================================================== */
const Svg = ({ children }) => (
  <svg className="pr-icon" viewBox="0 0 24 24">{children}</svg>
);
const IconoMas = () => <Svg><path d="M12 5v14M5 12h14" /></Svg>;
const IconoBuscar = () => <Svg><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>;
const IconoCerrar = () => <Svg><path d="M18 6 6 18M6 6l12 12" /></Svg>;
const IconoCheck = () => <Svg><path d="M20 6 9 17l-5-5" /></Svg>;
const IconoCaja = () => (
  <Svg>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </Svg>
);
const IconoEditar = () => (
  <Svg>
    <path d="M12 20h9" />
    <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
  </Svg>
);
const IconoBorrar = () => (
  <Svg>
    <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v5" /><path d="M14 11v5" />
  </Svg>
);
const IconoAlerta = () => (
  <Svg><path d="M12 9v4" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="10" /></Svg>
);

/* =====================================================
   MODAL (se cierra al hacer clic fuera)
===================================================== */
function Modal({ titulo, onCerrar, claseCaja = '', children }) {
  return (
    <div
      className="pr-modal"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className={'pr-modal-box ' + claseCaja}>
        <div className="pr-modal-head">
          <h2>{titulo}</h2>
          <button type="button" className="pr-modal-x" onClick={onCerrar} aria-label="Cerrar">
            <IconoCerrar />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =====================================================
   PANTALLA
===================================================== */
export default function TiposProductos() {
  const { usuario, puede } = useSesion();
  const puedeGestionar = puede('tipos', true);

  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [toasts, setToasts] = useState([]);

  // modal: null | 'crear' | 'editar' | 'eliminar'
  const [modal, setModal] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [form, setForm] = useState({ nombre: '', estado: true });
  const [enviando, setEnviando] = useState(false);

  /* ---------- MENSAJES ---------- */
  function cerrarToast(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  function mostrarToast(mensaje, tipo = 'warning') {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, mensaje, tipo }]);
    setTimeout(() => cerrarToast(id), 4000);
  }

  /* ---------- CARGAR DATOS ---------- */
  async function cargarTipos() {
    try {
      setTipos(await pedir('/tipos-productos/'));
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTipos();
  }, []);

  /* ---------- BUSCAR ---------- */
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return tipos.filter((t) => t.Nombre_tipo_producto.toLowerCase().includes(q));
  }, [tipos, busqueda]);

  const n = filtrados.length;

  /* ---------- MODALES ---------- */
  function abrirCrear() {
    setForm({ nombre: '', estado: true });
    setModal('crear');
  }

  function abrirEditar(tipo) {
    setSeleccionado(tipo);
    setForm({ nombre: tipo.Nombre_tipo_producto, estado: tipo.Estado_tipo_producto });
    setModal('editar');
  }

  function abrirEliminar(tipo) {
    if (tipo.cantidad_productos > 0) {
      return mostrarToast('No se puede eliminar este tipo porque tiene productos asociados.');
    }
    if (tipo.cantidad_subtipos > 0) {
      return mostrarToast('No se puede eliminar este tipo porque tiene subtipos asociados.');
    }
    setSeleccionado(tipo);
    setModal('eliminar');
  }

  function cerrarModal() {
    setModal(null);
    setSeleccionado(null);
  }

  /* ---------- ACCIONES ---------- */
  async function guardar(evento) {
    evento.preventDefault();
    setEnviando(true);

    const datos = {
      Nombre_tipo_producto: form.nombre.trim(),
      Estado_tipo_producto: form.estado,
    };

    try {
      if (modal === 'crear') {
        await pedir('/tipos-productos/', { metodo: 'POST', datos });
        mostrarToast('Tipo de producto registrado correctamente.', 'success');
      } else {
        await pedir(`/tipos-productos/${seleccionado.ID_Tipo_producto}/`, {
          metodo: 'PUT',
          datos,
        });
        mostrarToast('Tipo de producto actualizado correctamente.', 'success');
      }
      cerrarModal();
      cargarTipos();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar() {
    setEnviando(true);

    try {
      const respuesta = await pedir(
        `/tipos-productos/${seleccionado.ID_Tipo_producto}/`,
        { metodo: 'DELETE' }
      );
      setTipos((t) => t.filter((x) => x.ID_Tipo_producto !== seleccionado.ID_Tipo_producto));
      mostrarToast(respuesta.mensaje, 'success');
      cerrarModal();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setEnviando(false);
    }
  }

  /* ---------- PANTALLA ---------- */
  return (
    <>
      {/* MENSAJES */}
      <div className="pr-toasts">
        {toasts.map((t) => (
          <div key={t.id} className={'pr-toast ' + t.tipo}>
            <span>{t.mensaje}</span>
            <span className="pr-toast-x" onClick={() => cerrarToast(t.id)}>✕</span>
          </div>
        ))}
      </div>

      <div className="pr-page">
        <header className="pr-header">
          <div><h1 className="pr-title">Gestión de tipos de producto</h1></div>

          {puedeGestionar && (
            <button type="button" className="pr-btn pr-btn-primary" onClick={abrirCrear}>
              <IconoMas /> Nuevo tipo
            </button>
          )}
        </header>

        <div className="pr-filtros">
          <div className="pr-search">
            <IconoBuscar />
            <input
              type="text"
              value={busqueda}
              placeholder="Buscar por nombre..."
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <section className="pr-card">
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead>
                <tr>
                  <th>Tipo de producto</th>
                  <th>Productos asociados</th>
                  <th>Estado</th>
                  {puedeGestionar && <th style={{ textAlign: 'right' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={4}>Cargando tipos de producto...</td></tr>
                ) : n === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      {tipos.length === 0
                        ? 'No hay tipos de productos registrados.'
                        : 'Ningún tipo coincide con la búsqueda.'}
                    </td>
                  </tr>
                ) : (
                  filtrados.map((tipo) => (
                    <tr key={tipo.ID_Tipo_producto} className="tipo-card">
                      <td>
                        <div className="pr-prod">
                          <span className="pr-prod-icono"><IconoCaja /></span>
                          <div><span className="pr-nombre">{tipo.Nombre_tipo_producto}</span></div>
                        </div>
                      </td>
                      <td><span className="pr-badge">{tipo.cantidad_productos}</span></td>
                      <td>
                        {tipo.Estado_tipo_producto
                          ? <span className="pr-estado pr-estado-activo">Activo</span>
                          : <span className="pr-estado pr-estado-inactivo">Inactivo</span>}
                      </td>
                      {puedeGestionar && (
                        <td>
                          <div className="pr-acciones">
                            <button
                              type="button"
                              className="pr-icon-btn"
                              title="Editar tipo de producto"
                              aria-label="Editar tipo de producto"
                              onClick={() => abrirEditar(tipo)}
                            >
                              <IconoEditar />
                            </button>

                            {/* Solo el administrador puede eliminar (igual que en Django) */}
                            {usuario.es_administrador && (
                              <button
                                type="button"
                                className="pr-icon-btn pr-baja"
                                title="Eliminar tipo de producto"
                                aria-label="Eliminar tipo de producto"
                                onClick={() => abrirEliminar(tipo)}
                              >
                                <IconoBorrar />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pr-pie">
            <span>{n} tipo{n === 1 ? '' : 's'} encontrado{n === 1 ? '' : 's'}</span>
            <span>Agroquímica del Valle</span>
          </div>
        </section>
      </div>

      {/* MODAL CREAR / EDITAR */}
      {(modal === 'crear' || modal === 'editar') && (
        <Modal
          titulo={modal === 'crear' ? 'Nuevo tipo de producto' : 'Editar tipo de producto'}
          onCerrar={cerrarModal}
        >
          <form onSubmit={guardar}>
            <div className="pr-modal-body">
              <div className="pr-grid">
                <div className="pr-grupo pr-full">
                  <label htmlFor="tipo_nombre">Nombre del tipo de producto</label>
                  <input
                    id="tipo_nombre"
                    type="text"
                    maxLength={50}
                    required
                    autoFocus
                    placeholder="Ingrese el tipo de producto"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>

                {/* Los tipos nuevos se crean activos; el estado solo se edita */}
                {modal === 'editar' && (
                  <div className="pr-grupo pr-full">
                    <label htmlFor="tipo_estado">Estado</label>
                    <select
                      id="tipo_estado"
                      value={form.estado ? 'True' : 'False'}
                      onChange={(e) => setForm({ ...form, estado: e.target.value === 'True' })}
                    >
                      <option value="True">Activo</option>
                      <option value="False">Inactivo</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="pr-modal-pie">
              <button type="button" className="pr-btn pr-btn-claro" onClick={cerrarModal}>
                Cancelar
              </button>
              <button type="submit" className="pr-btn pr-btn-primary" disabled={enviando}>
                {modal === 'crear' ? <><IconoCheck /> Registrar</> : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL ELIMINAR */}
      {modal === 'eliminar' && seleccionado && (
        <Modal titulo="Eliminar tipo de producto" onCerrar={cerrarModal} claseCaja="pr-modal-eliminar-box">
          <div className="pr-modal-body pr-eliminar-body">
            <div className="pr-eliminar-icono"><IconoAlerta /></div>
            <p className="pr-eliminar-mensaje">
              ¿Deseas eliminar el tipo de producto “{seleccionado.Nombre_tipo_producto}” definitivamente?
            </p>
            <p className="pr-eliminar-advertencia">Esta acción no se puede deshacer.</p>
          </div>
          <div className="pr-modal-pie">
            <button type="button" className="pr-btn pr-btn-claro" onClick={cerrarModal}>
              Cancelar
            </button>
            <button type="button" className="pr-btn pr-btn-eliminar" onClick={eliminar} disabled={enviando}>
              Sí, eliminar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}