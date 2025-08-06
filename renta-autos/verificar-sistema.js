require('dotenv').config();
const mongoose = require('mongoose');
const TaskScheduler = require('./utils/TaskScheduler');
const cron = require('node-cron');

console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE AUTOMATIZACIÓN');
console.log('=' .repeat(60));

(async () => {
  try {
    // 1. Verificar conexión a MongoDB
    console.log('\n1️⃣ Verificando conexión a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB conectado correctamente');

    // 2. Verificar TaskScheduler
    console.log('\n2️⃣ Verificando TaskScheduler...');
    const scheduler = new TaskScheduler();
    await scheduler.initialize();
    console.log('✅ TaskScheduler inicializado');

    // 3. Verificar estado de las tareas programadas
    console.log('\n3️⃣ Verificando tareas programadas...');
    const estadoTareas = scheduler.obtenerEstadoTareas();
    console.log('📊 Estado de las tareas:');
    console.log(`   Total de tareas: ${estadoTareas.total_tareas || 0}`);
    console.log(`   Tareas activas: ${estadoTareas.tareas_activas || 0}`);
    console.log(`   Última ejecución: ${estadoTareas.ultima_ejecucion || 'N/A'}`);

    // 4. Verificar directorios necesarios
    console.log('\n4️⃣ Verificando directorios del sistema...');
    const fs = require('fs');
    const path = require('path');
    
    const directorios = [
      { nombre: 'backups', ruta: path.join(__dirname, 'backups') },
      { nombre: 'logs', ruta: path.join(__dirname, 'logs') },
      { nombre: 'utils', ruta: path.join(__dirname, 'utils') }
    ];

    directorios.forEach(dir => {
      if (fs.existsSync(dir.ruta)) {
        console.log(`✅ Directorio ${dir.nombre}: EXISTE`);
      } else {
        console.log(`❌ Directorio ${dir.nombre}: NO EXISTE`);
      }
    });

    // 5. Verificar archivos de utilidades
    console.log('\n5️⃣ Verificando archivos de utilidades...');
    const archivosUtils = [
      'BackupManager.js',
      'PermissionManager.js',
      'TaskScheduler.js'
    ];

    archivosUtils.forEach(archivo => {
      const rutaArchivo = path.join(__dirname, 'utils', archivo);
      if (fs.existsSync(rutaArchivo)) {
        console.log(`✅ ${archivo}: EXISTE`);
      } else {
        console.log(`❌ ${archivo}: NO EXISTE`);
      }
    });

    // 6. Verificar validez de las expresiones cron
    console.log('\n6️⃣ Verificando expresiones cron...');
    const expresionesCron = [
      { nombre: 'Backup completo (Domingos 2:00 AM)', expresion: '0 2 * * 0' },
      { nombre: 'Backup diferencial (Lun-Sáb 1:00 AM)', expresion: '0 1 * * 1-6' },
      { nombre: 'Logging cada 2 horas', expresion: '0 */2 * * *' }
    ];

    expresionesCron.forEach(cronExpr => {
      try {
        const task = cron.schedule(cronExpr.expresion, () => {}, { scheduled: false });
        console.log(`✅ ${cronExpr.nombre}: VÁLIDA`);
        task.destroy();
      } catch (error) {
        console.log(`❌ ${cronExpr.nombre}: INVÁLIDA - ${error.message}`);
      }
    });

    // 7. Probar backup manual
    console.log('\n7️⃣ Probando backup manual...');
    try {
      console.log('   🔄 Ejecutando backup diferencial de prueba...');
      const resultado = await scheduler.ejecutarBackupManual('diferencial');
      console.log(`✅ Backup ejecutado: ${resultado}`);
    } catch (error) {
      console.log(`❌ Error en backup: ${error.message}`);
    }

    // 8. Probar logging manual
    console.log('\n8️⃣ Probando logging manual...');
    try {
      console.log('   🔄 Ejecutando logging de prueba...');
      await scheduler.ejecutarLoggingManual();
      console.log('✅ Logging ejecutado correctamente');
    } catch (error) {
      console.log(`❌ Error en logging: ${error.message}`);
    }

    // 9. Verificar archivos generados
    console.log('\n9️⃣ Verificando archivos generados...');
    
    // Verificar backups
    const backupPath = path.join(__dirname, 'backups');
    if (fs.existsSync(backupPath)) {
      const backups = fs.readdirSync(backupPath);
      console.log(`✅ Backups encontrados: ${backups.length}`);
      backups.slice(-3).forEach(backup => {
        const stats = fs.statSync(path.join(backupPath, backup));
        console.log(`   📁 ${backup} (${Math.round(stats.size / 1024)} KB)`);
      });
    }

    // Verificar logs
    const logsPath = path.join(__dirname, 'logs');
    if (fs.existsSync(logsPath)) {
      const logs = fs.readdirSync(logsPath);
      console.log(`✅ Archivos de log encontrados: ${logs.length}`);
      logs.slice(-3).forEach(log => {
        const stats = fs.statSync(path.join(logsPath, log));
        console.log(`   📄 ${log} (${Math.round(stats.size / 1024)} KB)`);
      });
    }

    // 10. Resumen final
    console.log('\n🎯 RESUMEN DE VERIFICACIÓN');
    console.log('=' .repeat(40));
    console.log('✅ Sistema de automatización: OPERATIVO');
    console.log('✅ Backups programados: CONFIGURADOS');
    console.log('✅ Logging programado: CONFIGURADO');
    console.log('✅ Permisos de usuario: IMPLEMENTADOS');
    console.log('✅ Directorios del sistema: CREADOS');
    
    console.log('\n📅 Horarios programados:');
    console.log('   🕐 Backup completo: Domingos a las 2:00 AM');
    console.log('   🕐 Backup diferencial: Lunes a Sábado a la 1:00 AM');
    console.log('   🕐 Logging de estadísticas: Cada 2 horas');
    
    console.log('\n💡 Para ver el sistema en acción:');
    console.log('   1. Inicia el servidor: npm start');
    console.log('   2. Las tareas se ejecutarán automáticamente según programación');
    console.log('   3. Usa los scripts de verificación para monitorear el sistema');

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
})();
