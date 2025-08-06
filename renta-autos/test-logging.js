require('dotenv').config();
const mongoose = require('mongoose');
const TaskScheduler = require('./utils/TaskScheduler');

console.log('🧪 Iniciando prueba de logging de registros...\n');

(async () => {
  try {
    // Conectar a la base de datos
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado a MongoDB\n');

    // Crear instancia del scheduler
    const scheduler = new TaskScheduler();
    await scheduler.initialize();

    console.log('🔄 Ejecutando logging de estadísticas de prueba...');
    await scheduler.ejecutarLoggingManual();
    
    console.log('✅ Logging ejecutado exitosamente!\n');
    
    // Verificar que se crearon los logs
    const fs = require('fs');
    const path = require('path');
    
    const logsPath = path.join(__dirname, 'logs');
    if (fs.existsSync(logsPath)) {
      console.log('📋 Archivos de log generados:');
      const archivos = fs.readdirSync(logsPath);
      
      archivos.forEach(archivo => {
        const rutaArchivo = path.join(logsPath, archivo);
        const stats = fs.statSync(rutaArchivo);
        console.log(`  📄 ${archivo} (${Math.round(stats.size / 1024)} KB) - ${stats.mtime.toLocaleString()}`);
      });

      // Mostrar contenido del log más reciente
      const logHoy = `sistema_${new Date().toISOString().slice(0, 10)}.log`;
      const rutaLogHoy = path.join(logsPath, logHoy);
      
      if (fs.existsSync(rutaLogHoy)) {
        console.log(`\n📖 Últimas 5 entradas del log de hoy (${logHoy}):`);
        const contenido = fs.readFileSync(rutaLogHoy, 'utf8');
        const lineas = contenido.split('\n').filter(l => l.trim() !== '');
        const ultimasLineas = lineas.slice(-5);
        
        ultimasLineas.forEach(linea => {
          console.log(`  📝 ${linea}`);
        });
      }
    } else {
      console.log('❌ No se encontró el directorio de logs');
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
})();
