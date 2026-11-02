import Icono from "./Icono";

// Reemplaza los <div class="pr-modal"> + abrirModal()/cerrarModal() + "clic fuera para cerrar".
export default function Modal({ abierto, titulo, onCerrar, children, className = "" }) {
  if (!abierto) return null;

  return (
    <div
      className="pr-modal"
      style={{ display: "flex" }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className={`pr-modal-box ${className}`}>
        <div className="pr-modal-head">
          <h2>{titulo}</h2>
          <button type="button" className="pr-modal-x" onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}