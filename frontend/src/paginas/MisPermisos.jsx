import { useEffect, useState } from 'react';
import { obtenerMisPermisos } from '../servicios/perfiles';

import '../estilos/perfiles.css';
import '../estilos/mis_permisos.css';

export default function MisPermisos() {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        obtenerMisPermisos()
            .then(setDatos)
            .catch((e) => setError(e.message));
    }, []);

    if (error) return <p className="no-permissions">Error: {error}</p>;
    if (!datos) return <p className="no-permissions">Cargando permisos...</p>;

    return (
        <>
            <header className="header">
                <h1>MIS PERMISOS</h1>
            </header>

            <section className="profiles-container">
                <div className="profile-card">
                    <div className="profile-header">
                        <div>
                            <h2>{datos.perfil}</h2>
                            <span className="profile-id">Permisos asignados a tu perfil</span>
                        </div>
                    </div>

                    <div className="permissions-section">
                        <h3>Permisos disponibles</h3>

                        <div className="permissions-list">
                            {datos.permisos.map((p) => (
                                <div className="permission-item" key={p.nombre}>
                                    <strong>{p.nombre}</strong>
                                    {p.descripcion && <span>{p.descripcion}</span>}
                                </div>
                            ))}

                            {datos.permisos.length === 0 && (
                                <p className="no-permissions">
                                    Tu perfil todavía no tiene permisos asignados.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}