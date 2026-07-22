const pool = require('../config/db');

const getUbicaciones = async (req, res) => {
    try {
        const joinQuery = `
        SELECT c.id_ciudad, p.nombre as pais, d.nombre as departamento, c.nombre as ciudad, c.estado
        FROM ciudades c
        JOIN departamentos d ON c.id_departamento = d.id_departamento
        JOIN paises p ON d.id_pais = p.id_pais
        WHERE c.estado = 'Activo' AND d.estado = 'Activo' AND p.estado = 'Activo'
    `;

        const { rows } = await pool.query(joinQuery);

        res.json({
            total: rows.length,
            data: rows
        });

    } catch (err) {
        console.error('Error en la base de datos:', err);
        res.status(500).json({
            error: 'Error al consultar el servicio de geografía',
            details: err.message
        });
    }
};

module.exports = {
    getUbicaciones
};
