const express = require('express');
const router = express.Router();

const ubicacionesRoutes = require('./ubicacionesRoutes');

router.use('/ubicaciones', ubicacionesRoutes);

module.exports = router;
