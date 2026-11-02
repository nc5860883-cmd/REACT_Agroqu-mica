import { useEffect, useMemo, useState } from "react";
import { api } from "../api/cliente";
import { useToast } from "../components/Toasts";
import Modal from "../components/Modal";
import Icono from "../components/Icono";
import "../styles/tipos_productos.css"; // copiá acá el CSS de inventario/static/inventario/styles/

const plural = (n, palabra) => `${palabra}${n === 1 ? "" : "s"}`;

export default function TiposProductos() {
  const mostrarToast = useToast();

  const [tipos, setTipos] = useState([]);
  const [puedeGestionar, setPuedeGestionar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // null = cerrado; si no, guarda los datos del modal abierto
  const [modalCrear, setModalCrear] = useState(false);
  const [editando, setEditando] = useState(null);   // { id, nombre, estado }
  const [eliminando, setEliminando] = useState(null); // { id, nombre }
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    try {
      const datos = await api("/tipos-productos/");
      setTipos(datos.resultados);
      setPuedeGestionar(datos.puede_gestionar);
    } catch (e) {
      mostrarToast(e.message, "error");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  // Reemplaza filtrarTipos(): React vuelve a calcular la lista al escribir
  const visibles = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return tipos.filter((t) => t.Nombre_tipo_producto.toLowerCase().includes(q));
  }, [tipos, busqueda]);

  async function ejecutar(accion, mensajeOk, cerrarModal) {
    setEnviando(true);
    try {
      await accion();
      mostrarToast(mensajeOk, "success");
      cerrarModal();
      await cargar();
    } catch (e) {
      mostrarToast(e.message, "error");
    } finally {
      setEnviando(false);
    }
  }

  function crear(e) {
    e.preventDefault();
    const nombre = new FormData(e.currentTarget).get("Nombre_tipo_producto");
    ejecutar(
      () =>
        api("/tipos-productos/", {
          method: "POST",
          body: { Nombre_tipo_producto: nombre, Estado_tipo_producto: true },
        }),
      "Tipo de producto registrado.",
      () => setModalCrear(false)
    );
  }

  function guardarEdicion(e) {
    e.preventDefault();
    ejecutar(
      () =>
        api(`/tipos-productos/${editando.id}/`, {
          method: "PATCH",
          body: {
            Nombre_tipo_producto: editando.nombre,
            Estado_tipo_producto: editando.estado,
          },
        }),
      "Tipo de producto actualizado.",
      () => setEditando(null)
    );
  }

  function confirmarEliminar() {
    ejecutar(
      () => api(`/tipos-productos/${eliminando.id}/`, { method: "DELETE" }),
      "Tipo de producto eliminado.",
      () => setEliminando(null)
    );
  }

  function pedirEliminar(tipo) {
    if (tipo.cantidad_productos > 0) {
      mostrarToast("No se puede eliminar este tipo porque tiene productos asociados.", "warning");
      return;
    }
    if (tipo.cantidad_subtipos > 0) {
      mostrarToast("No se puede eliminar este tipo porque tiene subtipos asociados.", "warning");
      return;
    }
    setEliminando({ id: tipo.ID_Tipo_producto, nombre: tipo.Nombre_tipo_producto });
  }

  return (
    <div className="pr-page">
      <header className="pr-header">
        <div>
          <h1 className="pr-title">Gestión de tipos de producto</h1>
        </div>
        {puedeGestionar && (
          <button type="button" className="pr-btn pr-btn-primary" onClick={() => setModalCrear(true)}>
            <Icono nombre="mas" />
            Nuevo tipo
          </button>
        )}
      </header>

      <div className="pr-filtros">
        <div className="pr-search">
          <Icono nombre="buscar" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
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
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={4}>Cargando…</td></tr>
              ) : visibles.length === 0 ? (
                <tr><td colSpan={4}>No hay tipos de productos registrados.</td></tr>
              ) : (
                visibles.map((tipo) => (
                  <tr key={tipo.ID_Tipo_producto} className="tipo-card">
                    <td>
                      <div className="pr-prod">
                        <span className="pr-prod-icono"><Icono nombre="caja" /></span>
                        <div><span className="pr-nombre">{tipo.Nombre_tipo_producto}</span></div>
                      </div>
                    </td>
                    <td><span className="pr-badge">{tipo.cantidad_productos}</span></td>
                    <td>
                      {tipo.Estado_tipo_producto ? (
                        <span className="pr-estado pr-estado-activo">Activo</span>
                      ) : (
                        <span className="pr-estado pr-estado-inactivo">Inactivo</span>
                      )}
                    </td>
                    <td>
                      <div className="pr-acciones">
                        {puedeGestionar && (
                          <>
                            <button
                              type="button"
                              className="pr-icon-btn"
                              title="Editar tipo de producto"
                              aria-label="Editar tipo de producto"
                              onClick={() =>
                                setEditando({
                                  id: tipo.ID_Tipo_producto,
                                  nombre: tipo.Nombre_tipo_producto,
                                  estado: tipo.Estado_tipo_producto,
                                })
                              }
                            >
                              <Icono nombre="editar" />
                            </button>
                            <button
                              type="button"
                              className="pr-icon-btn pr-baja"
                              title="Eliminar tipo de producto"
                              aria-label="Eliminar tipo de producto"
                              onClick={() => pedirEliminar(tipo)}
                            >
                              <Icono nombre="eliminar" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pr-pie">
          <span>
            {visibles.length} {plural(visibles.length, "tipo")}{" "}
            {plural(visibles.length, "encontrado")}
          </span>
          <span>Agroquímica del Valle</span>
        </div>
      </section>

      {/* MODAL CREAR */}
      <Modal abierto={modalCrear} titulo="Nuevo tipo de producto" onCerrar={() => setModalCrear(false)}>
        <form onSubmit={crear}>
          <div className="pr-modal-body">
            <div className="pr-grid">
              <div className="pr-grupo pr-full">
                <label htmlFor="nuevo_nombre">Nombre del tipo de producto</label>
                <input
                  id="nuevo_nombre"
                  name="Nombre_tipo_producto"
                  placeholder="Ingrese el tipo de producto"
                  maxLength={50}
                  required
                  autoFocus
                />
              </div>
            </div>
          </div>
          <div className="pr-modal-pie">
            <button type="button" className="pr-btn pr-btn-claro" onClick={() => setModalCrear(false)}>
              Cancelar
            </button>
            <button type="submit" className="pr-btn pr-btn-primary" disabled={enviando}>
              <Icono nombre="check" />
              Registrar
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal abierto={!!editando} titulo="Editar tipo de producto" onCerrar={() => setEditando(null)}>
        {editando && (
          <form onSubmit={guardarEdicion}>
            <div className="pr-modal-body">
              <div className="pr-grid">
                <div className="pr-grupo pr-full">
                  <label htmlFor="edit_nombre">Nombre del tipo de producto</label>
                  <input
                    id="edit_nombre"
                    value={editando.nombre}
                    onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                    maxLength={50}
                    required
                  />
                </div>
                <div className="pr-grupo pr-full">
                  <label htmlFor="edit_estado">Estado</label>
                  <select
                    id="edit_estado"
                    value={editando.estado ? "True" : "False"}
                    onChange={(e) => setEditando({ ...editando, estado: e.target.value === "True" })}
                  >
                    <option value="True">Activo</option>
                    <option value="False">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="pr-modal-pie">
              <button type="button" className="pr-btn pr-btn-claro" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button type="submit" className="pr-btn pr-btn-primary" disabled={enviando}>
                Guardar cambios
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL ELIMINAR */}
      <Modal
        abierto={!!eliminando}
        titulo="Eliminar tipo de producto"
        onCerrar={() => setEliminando(null)}
        className="pr-modal-eliminar-box"
      >
        {eliminando && (
          <>
            <div className="pr-modal-body pr-eliminar-body">
              <div className="pr-eliminar-icono"><Icono nombre="alerta" /></div>
              <p className="pr-eliminar-mensaje">
                ¿Deseas eliminar el tipo de producto “{eliminando.nombre}” definitivamente?
              </p>
              <p className="pr-eliminar-advertencia">Esta acción no se puede deshacer.</p>
            </div>
            <div className="pr-modal-pie">
              <button type="button" className="pr-btn pr-btn-claro" onClick={() => setEliminando(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="pr-btn pr-btn-eliminar"
                onClick={confirmarEliminar}
                disabled={enviando}
              >
                Sí, eliminar
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}