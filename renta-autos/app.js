require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Inicialización
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Rutas
app.use(express.static('public'));
app.use(express.static('models')); 

// Rutas de autenticación
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Rutas de clientes
const clienteRoutes = require('./routes/clienteRoutes');
app.use('/api/clientes', clienteRoutes);

// Rutas de autos
const autoRoutes = require('./routes/autoRoutes');
app.use('/api/autos', autoRoutes);

// Rutas de reparaciones
const reparacionRoutes = require('./routes/reparacionRoutes');
app.use('/api/reparaciones', reparacionRoutes);

// Alquileres
const alquilerRoutes = require('./routes/alquilerRoutes');
app.use('/api/alquileres', alquilerRoutes);




// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Rutas de ejemplo
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Levantar servidor
app.listen(PORT, () => {
  console.log(`🚗 Servidor en http://localhost:${PORT}`);
});
