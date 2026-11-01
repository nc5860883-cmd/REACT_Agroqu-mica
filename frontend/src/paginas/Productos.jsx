import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    obtenerProductos,
    crearProducto,
    editarProducto,
    eliminarProducto,
    registrarEgreso,
} from '../servicios/productos';

import Toasts, { useToasts } from '../componentes/Toasts';
import FilaProducto from '../componentes/FilaProducto';
import ProductoModal from '../componentes/ProductoModal';
import EgresoModal from '../componentes/EgresoModal';
import { IconoMas, IconoMenos, IconoCaja, IconoBuscar } from '../componentes/IconosProductos';

import '../estilos/productos.css';  // copiado de inventario/static/inventario/styles/
import '../estilos/egreso.css';      // los estilos que estaban dentro de <style>

export default function Productos() {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');

    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    const [lotesAbiertos, setLotesAbiertos] = useState(() => new Set());

    // null | { tipo: 'crear' } | { tipo: 'editar', producto } | { tipo: 'egreso' }
    const [modal, setModal] = useState(null);

    const { toasts, mostrarToast, quitar } = useToasts();

    /* ===================== CARGA DE DATOS ===================== */

    const cargar = useCallback(async () => {
        try {
            setDatos(await obtenerProductos());
            setError('');
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // Igual que antes: ?egreso=1 abre el modal de egreso al entrar
    useEffect(() => {
        if (datos && new URLSearchParams(window.location.search).get('egreso') === '1') {
            abrirEgreso();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datos === null]);

    /* ===================== FILTROS ===================== */

    const productosFiltrados = useMemo(() => {
        if (!datos) return [];
        const q = busqueda.toLowerCase().trim();

        return datos.productos.filter((p) => {
            const texto = `${p.id} ${p.nombre} ${p.marca || ''} ${p.subtipo_nombre || ''}`.toLowerCase();
            return (
                texto.includes(q) &&
                (!filtroTipo || String(p.tipo_id) === filtroTipo) &&
                (!filtroEstado || p.estado === filtroEstado)
            );
        });
    }, [datos, busqueda, filtroTipo, filtroEstado]);

    // Al filtrar se cierran los detalles de lotes (como en la versión anterior)
    useEffect(() => {
        setLotesAbiertos(new Set());
    }, [busqueda, filtroTipo, filtroEstado]);

    function toggleLotes(id) {
        setLotesAbiertos((actual) => {
            const nuevo = new Set(actual);
            nuevo.has(id) ? nuevo.delete(id) : nuevo.add(id);
            return nuevo;
        });
    }

    /* ===================== ACCIONES ===================== */

    async function guardarProducto(form) {
        try {
            if (modal.tipo === 'editar') {
                const r = await editarProducto(modal.producto.id, form);
                mostrarToast(r.mensaje || 'Producto modificado correctamente.');
            } else {
                const r = await crearProducto(form);
                mostrarToast(r.mensaje || 'Producto registrado correctamente.');
            }
            setModal(null);
            cargar();
        } catch (e) {
            mostrarToast(e.message, 'error');
        }
    }

    async function eliminar(producto) {
        const ok = window.confirm(
            '¿Eliminar este producto definitivamente? Solo es posible si no tiene lotes asociados.'
        );
        if (!ok) return;

        try {
            const r = await eliminarProducto(producto.id);
            mostrarToast(r.mensaje || 'Producto eliminado.');
            cargar();
        } catch (e) {
            mostrarToast(e.message, 'error');
        }
    }

    function abrirEgreso() {
        if (!datos?.datos_egreso?.length) {
            mostrarToast('No hay productos con lotes disponibles para egresar.', 'warning');
            return;
        }
        setModal({ tipo: 'egreso' });
    }

    async function guardarEgreso(form) {
        try {
            const r = await registrarEgreso(form);
            mostrarToast(r.mensaje || 'Egreso registrado correctamente.');
            if (r.advertencia) mostrarToast(r.advertencia, 'warning');
            setModal(null);
            cargar();
        } catch (e) {
            mostrarToast(e.message, 'error');
        }
    }

    /* ===================== RENDER ===================== */

    if (error) return <div className="pr-page"><p className="pr-vacio">Error: {error}</p></div>;
    if (!datos) return <div className="pr-page"><p className="pr-vacio">Cargando productos...</p></div>;

    const totalActivos = datos.productos.filter((p) => p.estado === 'Activo').length;
    const n = productosFiltrados.length;
    const s = n === 1 ? '' : 's';

    return (
        <>
            <Toasts toasts={toasts} onQuitar={quitar} />

            <div className="pr-page">

                {/* ===================== ENCABEZADO ===================== */}
                <header className="pr-header">
                    <div>
                        <h1 className="pr-title">Gestión de productos</h1>
                    </div>

                    <div className="pr-header-acciones">
                        <button
                            type="button"
                            className="pr-btn pr-btn-primary"
                            onClick={() => setModal({ tipo: 'crear' })}
                        >
                            <IconoMas /> Registrar producto
                        </button>

                        {datos.puede_egresar && (
                            <button type="button" className="pr-btn pr-btn-rojo" onClick={abrirEgreso}>
                                <IconoMenos /> Registrar egreso
                            </button>
                        )}
                    </div>
                </header>

                {/* ===================== RESUMEN ===================== */}
                <div className="pr-barra">
                    <div className="pr-barra-datos">
                        <span className="pr-barra-dato">
                            <IconoCaja />
                            <strong>{totalActivos}</strong> productos activos
                        </span>
                    </div>
                </div>

                {/* ===================== BÚSQUEDA Y FILTROS ===================== */}
                <form className="pr-filtros" onSubmit={(e) => e.preventDefault()}>
                    <div className="pr-search">
                        <IconoBuscar />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre, marca o subtipo..."
                        />
                    </div>

                    <select className="pr-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                        <option value="">Todos los tipos</option>
                        {datos.tipos.map((t) => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                    </select>

                    <select className="pr-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                        <option value="">Todos los estados</option>
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                    </select>
                </form>

                {/* ===================== TABLA ===================== */}
                <section className="pr-card">
                    <div className="pr-table-wrap">
                        <table className="pr-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Tipo de producto</th>
                                    <th>Marca</th>
                                    <th>Subtipo</th>
                                    <th>Precio</th>
                                    <th>Cantidad presentación</th>
                                    <th>Unidad medida</th>
                                    <th>Unidades por presentación</th>
                                    <th>Stock disponible</th>
                                    <th>Stock mínimo</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {productosFiltrados.map((p) => (
                                    <FilaProducto
                                        key={p.id}
                                        producto={p}
                                        lotesAbiertos={lotesAbiertos.has(p.id)}
                                        onToggleLotes={toggleLotes}
                                        onEditar={(prod) => setModal({ tipo: 'editar', producto: prod })}
                                        onEliminar={eliminar}
                                    />
                                ))}

                                {n === 0 && (
                                    <tr>
                                        <td colSpan={12} className="pr-vacio">
                                            No se encontraron productos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ===================== PIE ===================== */}
                    <div className="pr-pie">
                        <span>{n} producto{s} encontrado{s}</span>
                        <span>Agroquímica del Valle</span>
                    </div>
                </section>
            </div>

            {/* ===================== MODALES ===================== */}
            {(modal?.tipo === 'crear' || modal?.tipo === 'editar') && (
                <ProductoModal
                    key={modal.producto?.id ?? 'nuevo'}
                    producto={modal.producto}
                    tipos={datos.tipos}
                    subtipos={datos.subtipos}
                    proveedores={datos.proveedores}
                    onCerrar={() => setModal(null)}
                    onGuardar={guardarProducto}
                />
            )}

            {modal?.tipo === 'egreso' && (
                <EgresoModal
                    datos={datos.datos_egreso}
                    usuario={datos.usuario}
                    onCerrar={() => setModal(null)}
                    onRegistrar={guardarEgreso}
                />
            )}
        </>
    );
}
