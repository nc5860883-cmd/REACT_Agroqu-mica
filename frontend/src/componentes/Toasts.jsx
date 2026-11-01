import { useCallback, useState } from 'react';

// Hook que reemplaza a mostrarToast() y a los mensajes de Django
export function useToasts() {
    const [toasts, setToasts] = useState([]);

    const quitar = useCallback((id) => {
        setToasts((lista) => lista.filter((t) => t.id !== id));
    }, []);

    const mostrarToast = useCallback((mensaje, tipo = 'success') => {
        const id = Date.now() + Math.random();
        setToasts((lista) => [...lista, { id, mensaje, tipo }]);
        setTimeout(() => quitar(id), 4000);
    }, [quitar]);

    return { toasts, mostrarToast, quitar };
}

export default function Toasts({ toasts, onQuitar }) {
    return (
        <div className="pr-toasts">
            {toasts.map((t) => (
                <div key={t.id} className={`pr-toast ${t.tipo}`}>
                    <span>{t.mensaje}</span>
                    <span className="pr-toast-x" onClick={() => onQuitar(t.id)}>
                        ✕
                    </span>
                </div>
            ))}
        </div>
    );
}
