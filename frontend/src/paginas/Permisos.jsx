import { useEffect, useMemo, useState } from 'react';
import { obtenerPermisos } from '../servicios/perfiles';

import '../estilos/perfiles.css';

export default function Permisos() {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        obtenerPermisos()
            .then(setDatos)
            .catch((e) => setError(e.message));
    }, []);

    const grupos = useMemo(() => {
        if (!datos) return [];
        const q = busqueda.toLowerCase().trim();

        return datos.grupos
            .map((g) => ({
                ...g,
                permisos: g.permisos.filter((p) =>
                    `${p.nombre} ${p.descripcion}`.toLowerCase().includes(q)
                ),
            }))
            .filter((g) => g.permisos.length > 0);
    }, [datos, busqueda]);

    if (error) return <div className="pf-page"><p className="pf-vacio">Error: {error}</p></div>;
    if (!datos) return <div className="pf-page"><p className="pf-vacio">Cargando permisos...</p></div>;

    const total = grupos.reduce((suma, g) => suma + g.permisos.length, 0);
    const s = total === 1 ? '' : 's';

    return (
        <div className="pf-page">
            <header className="pf-header">
                <div>
                    <h1 className="pf-title">Permisos del sistema</h1>
                </div>
            </header>

            <form className="pf-search" onSubmit={(e) => e.preventDefault()}>
                <svg className="pf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar permiso..."
                />
            </form>

            <section className="pf-card">
                <div className="pf-table-wrap">
                    <table className="pf-table">
                        <thead>
                            <tr>
                                <th>Permiso</th>
                                <th>Perfiles asociados</th>
                                <th>Estado</th>
                            </tr>
                        </thead>

                        <tbody>
                            {grupos.map((grupo) => [
                                <tr key={'g-' + grupo.titulo}>
                                    <td colSpan={3} style={{ fontWeight: 700, background: 'rgba(0,0,0,0.04)' }}>
                                        {grupo.titulo}
                                    </td>
                                </tr>,

                                ...grupo.permisos.map((p) => (
                                    <tr key={grupo.titulo + p.nombre}>
                                        <td>
                                            <span className="pf-nombre">{p.nombre}</span>
                                            <br />
                                            <small>{p.descripcion}</small>
                                        </td>

                                        <td className="pf-permisos">
                                            {p.perfiles.length > 0 ? (
                                                <div className="pf-chips">
                                                    {p.perfiles.map((nombre) => (
                                                        <span className="pf-chip" key={nombre}>{nombre}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="pf-chip pf-chip-aviso">Sin perfiles asociados</span>
                                            )}
                                        </td>

                                        <td>
                                            <span className={'pf-badge ' + (p.sincronizado ? 'pf-activo' : 'pf-inactivo')}>
                                                {p.sincronizado ? 'Sincronizado' : 'Sin sincronizar'}
                                            </span>
                                        </td>
                                    </tr>
                                )),
                            ])}

                            {total === 0 && (
                                <tr>
                                    <td colSpan={3} className="pf-vacio">No se encontraron permisos.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pf-pie">
                    <span>{total} permiso{s} encontrado{s}</span>
                    <span>Agroquímica del Valle</span>
                </div>
            </section>
        </div>
    );
}