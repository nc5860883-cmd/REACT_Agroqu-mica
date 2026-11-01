import { useState } from 'react';
import Modal from './Modal';
import { IconoCheck } from './IconosProductos';

const FORM_VACIO = {
    Nombre_producto: '',
    Marca: '',
    Descripcion_producto: '',
    ID_Tipo_producto: '',
    ID_Subtipo: '',
    Precio: '',
    Stock_minimo: 10,
    Cantidad_presentacion: 1,
    Unidad_medida_producto: '',
    Unidades_por_presentacion: 1,
    Estado_producto: 'Activo',
    proveedores: [],
};

function desdeProducto(p) {
    return {
        Nombre_producto: p.nombre,
        Marca: p.marca || '',
        Descripcion_producto: p.descripcion || '',
        ID_Tipo_producto: String(p.tipo_id),
        ID_Subtipo: p.subtipo_id ? String(p.subtipo_id) : '',
        Precio: p.precio,
        Stock_minimo: p.stock ? p.stock.minimo : '',
        Cantidad_presentacion: p.cantidad_presentacion ?? '',
        Unidad_medida_producto: p.unidad_medida || '',
        Unidades_por_presentacion: p.unidades_por_presentacion || 1,
        Estado_producto: p.estado,
        proveedores: (p.proveedores_ids || []).map(String),
    };
}

/**
 * Un solo componente para "Registrar producto" y "Modificar producto".
 * Si recibe `producto`, funciona en modo edición.
 */
export default function ProductoModal({
    producto,
    tipos,
    subtipos,
    proveedores,
    onCerrar,
    onGuardar,
}) {
    const esEdicion = Boolean(producto);
    const [form, setForm] = useState(() =>
        esEdicion ? desdeProducto(producto) : FORM_VACIO
    );
    const [enviando, setEnviando] = useState(false);

    function cambiar(e) {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    }

    // Reemplaza a actualizarSubtipos(): al cambiar el tipo,
    // se borra el subtipo si no corresponde al tipo nuevo.
    function cambiarTipo(e) {
        const tipo = e.target.value;
        setForm((f) => {
            const sub = subtipos.find((s) => String(s.id) === f.ID_Subtipo);
            const subtipoValido = sub && String(sub.tipo_id) === tipo;
            return {
                ...f,
                ID_Tipo_producto: tipo,
                ID_Subtipo: subtipoValido ? f.ID_Subtipo : '',
            };
        });
    }

    function toggleProveedor(id) {
        const valor = String(id);
        setForm((f) => ({
            ...f,
            proveedores: f.proveedores.includes(valor)
                ? f.proveedores.filter((x) => x !== valor)
                : [...f.proveedores, valor],
        }));
    }

    async function enviar(e) {
        e.preventDefault();
        setEnviando(true);
        try {
            await onGuardar(form);
        } finally {
            setEnviando(false);
        }
    }

    const subtiposDelTipo = subtipos.filter(
        (s) => form.ID_Tipo_producto !== '' && String(s.tipo_id) === form.ID_Tipo_producto
    );

    // Si el producto tiene una unidad que no está en la lista, se agrega
    const unidades = ['kg', 'litros'];
    if (form.Unidad_medida_producto && !unidades.includes(form.Unidad_medida_producto)) {
        unidades.push(form.Unidad_medida_producto);
    }
    const nombreUnidad = { kg: 'Kilogramos (kg)', litros: 'Litros (L)' };

    return (
        <Modal
            titulo={esEdicion ? 'Modificar producto' : 'Registrar producto'}
            onCerrar={onCerrar}
        >
            <form onSubmit={enviar}>
                <div className="pr-modal-body">
                    <div className="pr-grid">

                        {esEdicion && (
                            <>
                                <div className="pr-grupo">
                                    <label>Código</label>
                                    <input type="text" value={'PROD' + producto.id} readOnly />
                                </div>

                                <div className="pr-grupo">
                                    <label>Estado</label>
                                    <select
                                        name="Estado_producto"
                                        value={form.Estado_producto}
                                        onChange={cambiar}
                                    >
                                        <option value="Activo">Activo</option>
                                        <option value="Inactivo">Inactivo</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="pr-grupo">
                            <label>Nombre del producto</label>
                            <input
                                type="text"
                                name="Nombre_producto"
                                placeholder="Ej. Glifosato 48%"
                                value={form.Nombre_producto}
                                onChange={cambiar}
                                required
                            />
                        </div>

                        <div className="pr-grupo">
                            <label>Marca</label>
                            <input
                                type="text"
                                name="Marca"
                                placeholder="Marca comercial"
                                value={form.Marca}
                                onChange={cambiar}
                                required={!esEdicion}
                            />
                        </div>

                        <div className="pr-grupo pr-full">
                            <label>Descripción</label>
                            <input
                                type="text"
                                name="Descripcion_producto"
                                placeholder="Características del producto"
                                value={form.Descripcion_producto}
                                onChange={cambiar}
                            />
                        </div>

                        <div className="pr-grupo pr-full">
                            <label>Tipo de producto</label>
                            <select
                                name="ID_Tipo_producto"
                                value={form.ID_Tipo_producto}
                                onChange={cambiarTipo}
                                required
                            >
                                {!esEdicion && <option value="">Seleccione un tipo</option>}
                                {/* Al registrar solo se ofrecen tipos activos */}
                                {tipos.filter((t) => esEdicion || t.activo).map((t) => (
                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="pr-grupo pr-full">
                            <label>Subtipo</label>
                            {/* Si el tipo tiene subtipos, elegir uno es obligatorio (igual que en views.py) */}
                            <select
                                name="ID_Subtipo"
                                value={form.ID_Subtipo}
                                onChange={cambiar}
                                required={subtiposDelTipo.length > 0}
                            >
                                <option value="">
                                    {subtiposDelTipo.length > 0 ? 'Seleccione un subtipo' : 'Sin subtipo'}
                                </option>
                                {subtiposDelTipo.map((s) => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                            <span className="pr-hint">
                                Los subtipos disponibles dependen del tipo de producto seleccionado.
                            </span>
                        </div>

                        <div className="pr-grupo">
                            <label>Precio por presentación</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                name="Precio"
                                value={form.Precio}
                                onChange={cambiar}
                                required
                            />
                        </div>

                        <div className="pr-grupo">
                            <label>Stock mínimo (unidades)</label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                name="Stock_minimo"
                                value={form.Stock_minimo}
                                onChange={cambiar}
                                required={!esEdicion}
                            />
                        </div>

                        <div className="pr-grupo">
                            <label>Cantidad de presentación</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                name="Cantidad_presentacion"
                                value={form.Cantidad_presentacion}
                                onChange={cambiar}
                                required
                            />
                        </div>

                        <div className="pr-grupo">
                            <label>Unidad de medida</label>
                            <select
                                name="Unidad_medida_producto"
                                value={form.Unidad_medida_producto}
                                onChange={cambiar}
                                required
                            >
                                {!esEdicion && <option value="">Seleccione una unidad</option>}
                                {unidades.map((u) => (
                                    <option key={u} value={u}>{nombreUnidad[u] || u}</option>
                                ))}
                            </select>
                        </div>

                        <div className="pr-grupo">
                            <label>Unidades por presentación</label>
                            <input
                                type="number"
                                step="1"
                                min="1"
                                name="Unidades_por_presentacion"
                                value={form.Unidades_por_presentacion}
                                onChange={cambiar}
                                required
                            />
                            {!esEdicion && (
                                <span className="pr-hint">
                                    Envases por caja (ej.: 4 en "4X 5L").
                                </span>
                            )}
                        </div>

                        <div className="pr-grupo pr-full">
                            <label>Proveedores que lo suministran</label>
                            <div
                                style={{
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    padding: '8px 12px',
                                    maxHeight: 130,
                                    overflowY: 'auto',
                                }}
                            >
                                {proveedores.length === 0 && (
                                    <span className="pr-hint">
                                        No hay proveedores activos. Registrá uno primero.
                                    </span>
                                )}
                                {proveedores.map((prov) => (
                                    <label
                                        key={prov.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            fontWeight: 400,
                                            padding: '2px 0',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            style={{ width: 'auto' }}
                                            checked={form.proveedores.includes(String(prov.id))}
                                            onChange={() => toggleProveedor(prov.id)}
                                        />
                                        {prov.nombre}
                                    </label>
                                ))}
                            </div>
                            <span className="pr-hint">
                                Solo estos proveedores podrán ingresar este producto en un remito.
                            </span>
                        </div>
                    </div>

                    {!esEdicion && (
                        <div className="pr-info">
                            <IconoCheck />
                            El stock inicial es 0. Registrá un lote para ingresar mercadería.
                        </div>
                    )}
                </div>

                <div className="pr-modal-pie">
                    <button type="button" className="pr-btn pr-btn-claro" onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button type="submit" className="pr-btn pr-btn-primary" disabled={enviando}>
                        {esEdicion ? 'Guardar cambios' : <><IconoCheck /> Registrar producto</>}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
