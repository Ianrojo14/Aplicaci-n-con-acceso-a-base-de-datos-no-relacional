require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Importar sistema de tareas y permisos
const TaskScheduler = require('./utils/TaskScheduler');
const PermissionManager = require('./utils/PermissionManager');

// Inicialización
const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar sistemas de automatización
const taskScheduler = new TaskScheduler();
const permissionManager = new PermissionManager();

// Middlewares básicos
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Servir archivos estáticos ANTES de otros middlewares
app.use(express.static('public'));

// Middleware de auditoría (después de archivos estáticos)
app.use(permissionManager.auditMiddleware());

// Middleware de rate limiting
app.use(permissionManager.rateLimitByRole()); 

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

// Configurar rutas de administración (solo APIs, sin interfaz web)
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// Ruta raíz que redirecciona a login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    mensaje: 'Ruta no encontrada',
    ruta: req.path,
    metodo: req.method 
  });
});




// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Conectado a MongoDB');
  
  // Inicializar sistema de tareas automatizadas después de conectar a la DB
  try {
    await taskScheduler.initialize();
    console.log('🤖 Sistema de automatización iniciado');
  } catch (error) {
    console.error('❌ Error iniciando sistema de automatización:', error);
  }
  
}).catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Rutas de ejemplo
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Levantar servidor
app.listen(PORT, () => {
  console.log(`🚗 Servidor en http://localhost:${PORT}`);
  console.log('🔐 Sistema de permisos activo');
  console.log('📊 Sistema de logging automático activo');
  console.log('💾 Sistema de backup automático programado');
});

// Manejar cierre graceful del servidor
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  
  // Detener tareas programadas
  taskScheduler.detenerTareas();
  
  // Cerrar conexión a MongoDB (sin callback en versiones nuevas)
  mongoose.connection.close().then(() => {
    console.log('✅ Conexión a MongoDB cerrada');
    process.exit(0);
  }).catch((err) => {
    console.error('❌ Error cerrando MongoDB:', err);
    process.exit(1);
  });
});

// Manejar errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Error no manejado:', err);
  if (global.backupManager) {
    global.backupManager.logActivity('CRITICAL', `Error no manejado: ${err.message}`);
  }
});

// Exportar para uso en otros módulos
module.exports = { app, taskScheduler, permissionManager };
