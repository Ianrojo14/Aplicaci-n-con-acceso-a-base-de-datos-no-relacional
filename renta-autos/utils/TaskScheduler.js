const cron = require('node-cron');
const BackupManager = require('./BackupManager');
const PermissionManager = require('./PermissionManager');

class TaskScheduler {
  constructor() {
    this.backupManager = new BackupManager();
    this.permissionManager = new PermissionManager();
    this.tasks = [];
    this.isRunning = false;
  }

  // Inicializar todas las tareas programadas
  async initialize() {
    try {
      console.log('🚀 Inicializando sistema de tareas automatizadas...');
      
      // Hacer disponible el backupManager globalmente para logging
      global.backupManager = this.backupManager;

      // Configurar todas las tareas
      this.setupBackupCompleto();
      this.setupBackupDiferencial();
      this.setupLogging();
      this.setupMantenimiento();
      
      this.isRunning = true;
      console.log('✅ Sistema de tareas automatizadas iniciado');
      
      // Log inicial
      this.backupManager.logActivity('SYSTEM', 'Sistema de tareas automatizadas iniciado');
      
    } catch (error) {
      console.error('❌ Error inicializando tareas:', error);
    }
  }

  // Backup completo cada domingo a las 02:00
  setupBackupCompleto() {
    const task = cron.schedule('0 2 * * 0', async () => {
      try {
        console.log('🔄 Ejecutando backup completo semanal...');
        const nombreBackup = await this.backupManager.backupCompleto();
        
        // Verificar integridad después del backup
        await this.backupManager.verificarIntegridad();
        
        // Limpiar backups antiguos
        await this.backupManager.limpiarBackupsAntiguos();
        
        console.log(`✅ Backup completo semanal completado: ${nombreBackup}`);
        
      } catch (error) {
        console.error('❌ Error en backup completo:', error);
      }
    }, {
      scheduled: false, // No iniciar automáticamente
      timezone: "America/Mexico_City"
    });

    this.tasks.push({
      name: 'Backup Completo Semanal',
      schedule: 'Domingos 02:00',
      task: task
    });

    task.start();
    console.log('📅 Programado: Backup completo semanal (Domingos 02:00)');
  }

  // Backup diferencial todos los días a las 01:00 (excepto domingos)
  setupBackupDiferencial() {
    const task = cron.schedule('0 1 * * 1-6', async () => {
      try {
        console.log('🔄 Ejecutando backup diferencial diario...');
        const nombreBackup = await this.backupManager.backupDiferencial();
        console.log(`✅ Backup diferencial completado: ${nombreBackup}`);
        
      } catch (error) {
        console.error('❌ Error en backup diferencial:', error);
      }
    }, {
      scheduled: false,
      timezone: "America/Mexico_City"
    });

    this.tasks.push({
      name: 'Backup Diferencial Diario',
      schedule: 'Lunes-Sábado 01:00',
      task: task
    });

    task.start();
    console.log('📅 Programado: Backup diferencial diario (Lunes-Sábado 01:00)');
  }

  // Logging de registros cada 2 horas
  setupLogging() {
    const task = cron.schedule('0 */2 * * *', async () => {
      try {
        console.log('📊 Registrando estadísticas del sistema...');
        const estadisticas = await this.backupManager.logActividades();
        
        // Log adicional con información del sistema
        const infoSistema = {
          timestamp: new Date().toISOString(),
          tareas_activas: this.tasks.length,
          memoria_libre: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          uptime: Math.round(process.uptime() / 3600) + ' horas'
        };
        
        this.backupManager.logActivity('SYSTEM_STATS', JSON.stringify(infoSistema));
        console.log('✅ Estadísticas registradas');
        
      } catch (error) {
        console.error('❌ Error en logging:', error);
      }
    }, {
      scheduled: false,
      timezone: "America/Mexico_City"
    });

    this.tasks.push({
      name: 'Logging de Estadísticas',
      schedule: 'Cada 2 horas',
      task: task
    });

    task.start();
    console.log('📅 Programado: Logging cada 2 horas');
  }

  // Tareas de mantenimiento general
  setupMantenimiento() {
    // Limpieza de logs antiguos - cada día a las 03:00
    const cleanupTask = cron.schedule('0 3 * * *', async () => {
      try {
        console.log('🧹 Ejecutando limpieza de mantenimiento...');
        
        await this.limpiarLogsAntiguos();
        await this.verificarSaludSistema();
        
        console.log('✅ Mantenimiento completado');
        
      } catch (error) {
        console.error('❌ Error en mantenimiento:', error);
      }
    }, {
      scheduled: false,
      timezone: "America/Mexico_City"
    });

    this.tasks.push({
      name: 'Mantenimiento Diario',
      schedule: 'Diario 03:00',
      task: cleanupTask
    });

    cleanupTask.start();
    console.log('📅 Programado: Mantenimiento diario (03:00)');

    // Verificación de integridad - cada 6 horas
    const integrityTask = cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('🔍 Verificando integridad del sistema...');
        
        const backupsCorruptos = await this.backupManager.verificarIntegridad();
        
        if (backupsCorruptos.length > 0) {
          this.backupManager.logActivity('CRITICAL', 
            `Backups corruptos detectados: ${backupsCorruptos.join(', ')}`
          );
        }
        
        console.log('✅ Verificación de integridad completada');
        
      } catch (error) {
        console.error('❌ Error en verificación de integridad:', error);
      }
    }, {
      scheduled: false,
      timezone: "America/Mexico_City"
    });

    this.tasks.push({
      name: 'Verificación de Integridad',
      schedule: 'Cada 6 horas',
      task: integrityTask
    });

    integrityTask.start();
    console.log('📅 Programado: Verificación de integridad cada 6 horas');
  }

  // Ejecutar backup manual (para pruebas)
  async ejecutarBackupManual(tipo = 'diferencial') {
    try {
      console.log(`🔄 Ejecutando backup manual (${tipo})...`);
      
      let resultado;
      if (tipo === 'completo') {
        resultado = await this.backupManager.backupCompleto();
      } else {
        resultado = await this.backupManager.backupDiferencial();
      }
      
      console.log(`✅ Backup manual completado: ${resultado}`);
      return resultado;
      
    } catch (error) {
      console.error('❌ Error en backup manual:', error);
      throw error;
    }
  }

  // Limpiar logs antiguos (mantener solo 7 días)
  async limpiarLogsAntiguos() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const logsPath = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logsPath)) return;

      const archivos = fs.readdirSync(logsPath);
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 7);

      let eliminados = 0;
      for (const archivo of archivos) {
        const rutaArchivo = path.join(logsPath, archivo);
        const stats = fs.statSync(rutaArchivo);
        
        if (stats.mtime < fechaLimite) {
          fs.unlinkSync(rutaArchivo);
          eliminados++;
        }
      }

      if (eliminados > 0) {
        console.log(`🗑️ Eliminados ${eliminados} logs antiguos`);
        this.backupManager.logActivity('MAINTENANCE', `Logs eliminados: ${eliminados}`);
      }
      
    } catch (error) {
      console.error('❌ Error limpiando logs:', error);
    }
  }

  // Verificar salud general del sistema
  async verificarSaludSistema() {
    try {
      const mongoose = require('mongoose');
      
      const salud = {
        base_datos: mongoose.connection.readyState === 1 ? 'OK' : 'ERROR',
        memoria_usada: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        memoria_total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        uptime: Math.round(process.uptime()),
        tareas_programadas: this.tasks.length
      };

      this.backupManager.logActivity('HEALTH_CHECK', JSON.stringify(salud));
      
      // Alertas si algo está mal
      if (salud.base_datos !== 'OK') {
        this.backupManager.logActivity('CRITICAL', 'Base de datos desconectada');
      }
      
      if (salud.memoria_usada > 512) { // Más de 512MB
        this.backupManager.logActivity('WARNING', `Uso alto de memoria: ${salud.memoria_usada}MB`);
      }
      
    } catch (error) {
      console.error('❌ Error verificando salud del sistema:', error);
    }
  }

  // Obtener estado de todas las tareas
  obtenerEstadoTareas() {
    return {
      sistema_activo: this.isRunning,
      total_tareas: this.tasks.length,
      tareas: this.tasks.map(t => ({
        nombre: t.name,
        horario: t.schedule,
        activa: t.task.running
      }))
    };
  }

  // Parar todas las tareas
  detenerTareas() {
    console.log('🛑 Deteniendo todas las tareas programadas...');
    
    this.tasks.forEach(t => {
      if (t.task.running) {
        t.task.stop();
      }
    });
    
    this.isRunning = false;
    this.backupManager.logActivity('SYSTEM', 'Sistema de tareas detenido');
    console.log('✅ Todas las tareas han sido detenidas');
  }

  // Reiniciar todas las tareas
  reiniciarTareas() {
    console.log('🔄 Reiniciando todas las tareas programadas...');
    
    this.tasks.forEach(t => {
      if (!t.task.running) {
        t.task.start();
      }
    });
    
    this.isRunning = true;
    this.backupManager.logActivity('SYSTEM', 'Sistema de tareas reiniciado');
    console.log('✅ Todas las tareas han sido reiniciadas');
  }

  // Métodos para pruebas manuales
  async ejecutarBackupManual(tipo = 'diferencial') {
    console.log(`🧪 Ejecutando backup ${tipo} manual...`);
    try {
      let resultado;
      if (tipo === 'completo') {
        resultado = await this.backupManager.backupCompleto();
      } else {
        resultado = await this.backupManager.backupDiferencial();
      }
      
      this.backupManager.logActivity('BACKUP_MANUAL', `Backup ${tipo} ejecutado manualmente: ${resultado}`);
      return resultado;
    } catch (error) {
      this.backupManager.logActivity('ERROR', `Error en backup manual ${tipo}: ${error.message}`);
      throw error;
    }
  }

  async ejecutarLoggingManual() {
    console.log('🧪 Ejecutando logging manual...');
    try {
      await this.backupManager.logActividades();
      this.backupManager.logActivity('LOG_MANUAL', 'Logging ejecutado manualmente');
      return true;
    } catch (error) {
      this.backupManager.logActivity('ERROR', `Error en logging manual: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TaskScheduler;
