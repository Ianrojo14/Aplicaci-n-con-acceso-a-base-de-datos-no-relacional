require('dotenv').config();
const mongoose = require('mongoose');
const TaskScheduler = require('./utils/TaskScheduler');

console.log('🧪 Iniciando prueba de backup completo...\n');

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

    console.log('🔄 Ejecutando backup completo de prueba...');
    const resultado = await scheduler.ejecutarBackupManual('completo');
    
    console.log('✅ Backup completo ejecutado exitosamente!');
    console.log('📁 Archivo generado:', resultado);
    
    // Verificar que el archivo se creó
    const fs = require('fs');
    const path = require('path');
    
    if (resultado && fs.existsSync(resultado)) {
      const stats = fs.statSync(resultado);
      console.log('📊 Tamaño del backup:', Math.round(stats.size / 1024 / 1024 * 100) / 100, 'MB');
      console.log('🕒 Fecha de creación:', stats.birthtime.toLocaleString());
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
})();
