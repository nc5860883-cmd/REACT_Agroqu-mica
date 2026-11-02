// Íconos SVG que se repiten en todas las plantillas.
const trazos = {
  mas: ["M12 5v14M5 12h14"],
  buscar: ["m21 21-4.3-4.3"],
  editar: [
    "M12 20h9",
    "M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",
  ],
  eliminar: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v5", "M14 11v5"],
  cerrar: ["M18 6 6 18M6 6l12 12"],
  check: ["M20 6 9 17l-5-5"],
  alerta: ["M12 9v4", "M12 17h.01"],
  caja: [
    "m7.5 4.27 9 5.15",
    "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
    "m3.3 7 8.7 5 8.7-5",
    "M12 22V12",
  ],
};

export default function Icono({ nombre }) {
  return (
    <svg className="pr-icon" viewBox="0 0 24 24">
      {nombre === "buscar" && <circle cx="11" cy="11" r="7" />}
      {nombre === "alerta" && <circle cx="12" cy="12" r="10" />}
      {(trazos[nombre] ?? []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}