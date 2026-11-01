function Icono({ children }) {
    return (
        <svg className="pr-icon" viewBox="0 0 24 24">
            {children}
        </svg>
    );
}

export const IconoMas = () => (
    <Icono><path d="M12 5v14M5 12h14" /></Icono>
);

export const IconoMenos = () => (
    <Icono><path d="M5 12h14" /></Icono>
);

export const IconoCerrar = () => (
    <Icono><path d="M18 6 6 18M6 6l12 12" /></Icono>
);

export const IconoCheck = () => (
    <Icono><path d="M20 6 9 17l-5-5" /></Icono>
);

export const IconoBuscar = () => (
    <Icono>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
    </Icono>
);

export const IconoCaja = () => (
    <Icono>
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
    </Icono>
);

export const IconoOjo = () => (
    <Icono>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
    </Icono>
);

export const IconoEditar = () => (
    <Icono>
        <path d="M12 20h9" />
        <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
    </Icono>
);

export const IconoBasura = () => (
    <Icono>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
    </Icono>
);
