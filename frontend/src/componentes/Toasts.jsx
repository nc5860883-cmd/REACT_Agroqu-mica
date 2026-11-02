import { createContext, useCallback, useContext, useState } from "react";

// Reemplaza el bloque {% if messages %} de Django y la función mostrarToast().
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const cerrar = useCallback((id) => {
    setToasts((lista) => lista.filter((t) => t.id !== id));
  }, []);

  const mostrarToast = useCallback(
    (mensaje, tipo = "success") => {
      const id = crypto.randomUUID();
      setToasts((lista) => [...lista, { id, mensaje, tipo }]);
      setTimeout(() => cerrar(id), 4000);
    },
    [cerrar]
  );

  return (
    <ToastContext.Provider value={mostrarToast}>
      {children}
      <div className="pr-toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`pr-toast ${t.tipo}`}>
            <span>{t.mensaje}</span>
            <span className="pr-toast-x" onClick={() => cerrar(t.id)}>✕</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}