import { useState } from 'react';
import Modal from './Modal';

/**
 * Modal "Registrar egreso por venta".
 * `datos` tiene la misma forma que datos_egreso en tu vista de Django:
 * [{ nombre, marca, stock, stock_minimo, lotes: [{ id, numero, remito, proveedor, vence, cantidad }] }]
 */
export default function EgresoModal({ datos, usuario, onCerrar, onRegistrar }) {
    const [prodIdx, setProdIdx] = useState(0);
    const [loteId, setLoteId] = useState(datos[0]?.lotes[0]?.id ?? '');
    const [cantidad, setCantidad] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [fecha] = useState(() =>
        new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    );

    const p = datos[prodIdx];
    const l = p?.lotes.find((x) => x.id === Number(loteId));

    function cambiarProducto(e) {
        const i = Number(e.target.value);
        setProdIdx(i);
        setLoteId(datos[i].lotes[0]?.id ?? '');
    }

    // Reemplaza a egActualizar(): todo se calcula en cada render
    const cant = parseInt(cantidad, 10);
    let resLote = '—';
    let resStock = '—';
    let claseLote = 'eg-res';
    let claseStock = 'eg-res';
    let aviso = '';
    let deshabilitado = true;

    if (p && l && !Number.isNaN(cant) && cant > 0) {
        const restoLote = l.cantidad - cant;
        const restoStock = p.stock - cant;
        resLote = restoLote;
        resStock = restoStock;

        if (restoLote < 0 || restoStock < 0) {
            claseLote = 'eg-res eg-error';
            claseStock = 'eg-res eg-error';
            aviso = 'La cantidad supera lo disponible en el lote o en el stock.';
        } else {
            if (restoStock <= p.stock_minimo) {
                claseStock = 'eg-res eg-alerta';
                aviso = `El stock quedará en o por debajo del mínimo (${p.stock_minimo}).`;
            }
            deshabilitado = false;
        }
    }

    async function enviar(e) {
        e.preventDefault();
        setEnviando(true);
        try {
            await onRegistrar({ lote: loteId, cantidad, descripcion });
        } finally {
            setEnviando(false);
        }
    }

    return (
        <Modal titulo="Registrar egreso por venta" onCerrar={onCerrar} className="pr-modal-egreso">
            <form onSubmit={enviar}>
                <div className="pr-modal-body">
                    <div className="pr-grid">

                        <div className="pr-grupo">
                            <label>Tipo de movimiento</label>
                            <input type="text" value="Egreso por venta" readOnly />
                        </div>

                        <div className="pr-grupo">
                            <label>Fecha y hora (automático)</label>
                            <input type="text" value={fecha} readOnly />
                        </div>

                        <div className="pr-grupo pr-full">
                            <label>Usuario y perfil (automático, según la sesión)</label>
                            <input
                                type="text"
                                value={usuario ? `${usuario.nombre} ${usuario.apellido} - ${usuario.perfil}` : ''}
                                readOnly
                            />
                        </div>

                        <div className="pr-grupo">
                            <label>Producto</label>
                            <select value={prodIdx} onChange={cambiarProducto} required>
                                {datos.map((prod, i) => (
                                    <option key={i} value={i}>
                                        {prod.nombre + (prod.marca ? ' - ' + prod.marca : '')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pr-grupo">
                            <label>Lote</label>
                            <select value={loteId} onChange={(e) => setLoteId(e.target.value)} required>
                                {p?.lotes.map((lote) => (
                                    <option key={lote.id} value={lote.id}>{lote.numero}</option>
                                ))}
                            </select>
                        </div>

                        <div className="pr-grupo pr-full">
                            <div className="eg-datos">
                                <p className="eg-datos-titulo">Datos del lote (solo lectura)</p>
                                <div className="eg-datos-grid">
                                    <Dato etiqueta="Remito de origen" valor={l?.remito} />
                                    <Dato etiqueta="Proveedor" valor={l?.proveedor} />
                                    <Dato etiqueta="Vencimiento" valor={l?.vence} />
                                    <Dato etiqueta="Cantidad actual del lote" valor={l?.cantidad} />
                                </div>
                            </div>
                        </div>

                        <div className="pr-grupo pr-full">
                            <label>Cantidad a vender</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                max={p && l ? Math.min(l.cantidad, p.stock) : undefined}
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                required
                            />
                        </div>

                        <div className="pr-grupo pr-full">
                            <div className="eg-resultado">
                                <div className={claseLote}>
                                    <span className="eg-res-label">Lote quedará en</span>
                                    <span className="eg-res-valor">{resLote}</span>
                                </div>
                                <div className={claseStock}>
                                    <span className="eg-res-label">Stock del producto quedará en</span>
                                    <span className="eg-res-valor">{resStock}</span>
                                </div>
                            </div>
                            <span className="pr-hint">{aviso}</span>
                        </div>

                        <div className="pr-grupo pr-full">
                            <label>Descripción</label>
                            <textarea
                                rows={2}
                                maxLength={200}
                                placeholder="Ej. Venta a cliente, factura 0001-00123"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="pr-modal-pie">
                    <button type="button" className="pr-btn pr-btn-claro" onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="pr-btn pr-btn-rojo"
                        disabled={deshabilitado || enviando}
                    >
                        Registrar egreso
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function Dato({ etiqueta, valor }) {
    return (
        <div className="eg-dato">
            <span className="eg-dato-label">{etiqueta}</span>
            <span className="eg-dato-valor">{valor ?? '—'}</span>
        </div>
    );
}
