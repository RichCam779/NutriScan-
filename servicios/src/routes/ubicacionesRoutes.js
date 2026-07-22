const express = require('express');
const router = express.Router();
const ubicacionesController = require('../controllers/ubicacionesController');

// Ruta Pública, exclusivamente provee acceso a datos geográficos
router.get('/', ubicacionesController.getUbicaciones);

module.exports = router;
