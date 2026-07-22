require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// 1. Ajustes iniciales
app.use(cors());
app.use(express.json());

// 2. Control de rutas principales
const routes = require('./src/routes');
app.use('/api', routes);

// 3. Revisión de funcionamiento
app.get('/', (req, res) => {
  res.send('Servicio de Ubicaciones Externo - NutriScan Pro funcionando CORRECTAMENTE');
});

// 4. Prender el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Ubicaciones corriendo en puerto ${PORT}`);
});

module.exports = app;