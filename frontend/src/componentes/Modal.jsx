import { IconoCerrar } from './IconosProductos';

// Reemplaza a abrirModal/cerrarModal y al "clic fuera para cerrar".
// En React el modal se muestra solo si el padre lo renderiza.
export default function Modal({ titulo, onCerrar, className = '', children }) {
    return (
        <div
            className="pr-modal"
            style={{ display: 'flex' }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onCerrar();
            }}
        >
            <div className={`pr-modal-box ${className}`}>
                <div className="pr-modal-head">
                    <h2>{titulo}</h2>
                    <button
                        type="button"
                        className="pr-modal-x"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                    >
                        <IconoCerrar />
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}
