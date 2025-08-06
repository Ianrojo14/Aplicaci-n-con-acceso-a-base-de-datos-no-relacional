const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const mongoose = require('mongoose');

class BackupManager {
  constructor() {
    this.backupPath = path.join(__dirname, '..', 'backups');
    this.logsPath = path.join(__dirname, '..', 'logs');
    this.initializeDirectories();
  }

  initializeDirectories() {
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
    if (!fs.existsSync(this.logsPath)) {
      fs.mkdirSync(this.logsPath, { recursive: true });
    }
  }

  // Backup completo semanal
  async backupCompleto() {
    try {
      const fecha = new Date().toISOString().slice(0, 10);
      const nombreArchivo = `backup_completo_${fecha}`;
      const rutaBackup = path.join(this.backupPath, nombreArchivo);

      console.log('🔄 Iniciando backup completo...');

      // Comando mongodump para backup completo
      const comando = `mongodump --uri="${process.env.MONGO_URI}" --out="${rutaBackup}"`;

      return new Promise((resolve, reject) => {
        exec(comando, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Error en backup completo:', error);
            this.logActivity('ERROR', `Backup completo falló: ${error.message}`);
            reject(error);
            return;
          }

          console.log('✅ Backup completo completado');
          this.logActivity('SUCCESS', `Backup completo creado: ${nombreArchivo}`);
          
          // Comprimir el backup
          this.comprimirBackup(rutaBackup)
            .then(() => resolve(nombreArchivo))
            .catch(reject);
        });
      });
    } catch (error) {
      console.error('❌ Error en backup completo:', error);
      this.logActivity('ERROR', `Error en backup completo: ${error.message}`);
      throw error;
    }
  }

  // Backup diferencial diario
  async backupDiferencial() {
    try {
      const fecha = new Date().toISOString().slice(0, 10);
      const nombreArchivo = `backup_diferencial_${fecha}`;
      const rutaBackup = path.join(this.backupPath, nombreArchivo);

      console.log('🔄 Iniciando backup diferencial...');

      // Obtener fecha del último backup
      const fechaUltimoBackup = await this.obtenerFechaUltimoBackup();
      
      // Backup solo de documentos modificados desde el último backup
      const query = fechaUltimoBackup ? { 
        $or: [
          { createdAt: { $gte: fechaUltimoBackup } },
          { updatedAt: { $gte: fechaUltimoBackup } }
        ]
      } : {};

      // Exportar colecciones con filtro de fecha
      await this.exportarColeccionesDiferenciales(rutaBackup, fechaUltimoBackup);

      console.log('✅ Backup diferencial completado');
      this.logActivity('SUCCESS', `Backup diferencial creado: ${nombreArchivo}`);
      
      return nombreArchivo;
    } catch (error) {
      console.error('❌ Error en backup diferencial:', error);
      this.logActivity('ERROR', `Error en backup diferencial: ${error.message}`);
      throw error;
    }
  }

  async exportarColeccionesDiferenciales(rutaBackup, fechaDesde) {
    const colecciones = ['alquileres', 'autos', 'clientes', 'reparaciones', 'usuarios'];
    
    if (!fs.existsSync(rutaBackup)) {
      fs.mkdirSync(rutaBackup, { recursive: true });
    }

    for (const coleccion of colecciones) {
      try {
        let query = '';
        if (fechaDesde) {
          const fechaISO = fechaDesde.toISOString();
          query = `--query "{\\"\\$or\\":[{\\"createdAt\\":{\\"\\$gte\\":{\\"\\$date\\":\\"${fechaISO}\\"}}},{\\"updatedAt\\":{\\"\\$gte\\":{\\"\\$date\\":\\"${fechaISO}\\"}}}]}"`;
        }

        const comando = `mongoexport --uri="${process.env.MONGO_URI}" --collection="${coleccion}" ${query} --out="${path.join(rutaBackup, coleccion + '.json')}"`;
        
        await new Promise((resolve, reject) => {
          exec(comando, (error, stdout, stderr) => {
            if (error) {
              console.warn(`⚠️ Advertencia en colección ${coleccion}:`, error.message);
            }
            resolve();
          });
        });
      } catch (error) {
        console.warn(`⚠️ Error exportando ${coleccion}:`, error.message);
      }
    }
  }

  async comprimirBackup(rutaBackup) {
    return new Promise((resolve, reject) => {
      const comando = `tar -czf "${rutaBackup}.tar.gz" -C "${path.dirname(rutaBackup)}" "${path.basename(rutaBackup)}"`;
      
      exec(comando, (error, stdout, stderr) => {
        if (error) {
          console.warn('⚠️ No se pudo comprimir el backup:', error.message);
          resolve(); // No es crítico si falla la compresión
          return;
        }
        
        // Eliminar carpeta sin comprimir
        fs.rmSync(rutaBackup, { recursive: true, force: true });
        console.log('🗜️ Backup comprimido exitosamente');
        resolve();
      });
    });
  }

  async obtenerFechaUltimoBackup() {
    try {
      const archivos = fs.readdirSync(this.backupPath);
      const backupsDiferenciales = archivos
        .filter(archivo => archivo.startsWith('backup_diferencial_'))
        .sort()
        .reverse();

      if (backupsDiferenciales.length === 0) {
        return null; // Primer backup diferencial
      }

      const ultimoBackup = backupsDiferenciales[0];
      const fechaStr = ultimoBackup.match(/\d{4}-\d{2}-\d{2}/)[0];
      return new Date(fechaStr);
    } catch (error) {
      console.warn('⚠️ No se pudo obtener fecha del último backup:', error.message);
      return null;
    }
  }

  // Logging de actividades cada 2 horas
  async logActividades() {
    try {
      const fecha = new Date();
      const nombreLog = `actividades_${fecha.toISOString().slice(0, 10)}.log`;
      const rutaLog = path.join(this.logsPath, nombreLog);

      const estadisticas = await this.obtenerEstadisticasDB();
      
      const logEntry = {
        timestamp: fecha.toISOString(),
        tipo: 'ESTADISTICAS',
        estadisticas: estadisticas,
        memoria: process.memoryUsage(),
        uptime: process.uptime()
      };

      const logText = `${fecha.toISOString()} - ${JSON.stringify(logEntry)}\n`;
      
      fs.appendFileSync(rutaLog, logText);
      console.log('📊 Log de actividades registrado');
      
      return estadisticas;
    } catch (error) {
      console.error('❌ Error en logging:', error);
      throw error;
    }
  }

  async obtenerEstadisticasDB() {
    try {
      const db = mongoose.connection.db;
      
      const estadisticas = {
        alquileres: {
          total: await db.collection('alquileres').countDocuments(),
          activos: await db.collection('alquileres').countDocuments({ estado: 'activo' }),
          finalizados: await db.collection('alquileres').countDocuments({ estado: 'finalizado' })
        },
        autos: {
          total: await db.collection('autos').countDocuments(),
          disponibles: await db.collection('autos').countDocuments({ disponible: true }),
          en_reparacion: await db.collection('autos').countDocuments({ disponible: false })
        },
        clientes: {
          total: await db.collection('clientes').countDocuments()
        },
        reparaciones: {
          total: await db.collection('reparaciones').countDocuments()
        },
        usuarios: {
          total: await db.collection('usuarios').countDocuments(),
          por_rol: await db.collection('usuarios').aggregate([
            { $group: { _id: '$rol', count: { $sum: 1 } } }
          ]).toArray()
        },
        alertas: {
          activas: await db.collection('alquileres').countDocuments({ requiereAtencion: true })
        }
      };

      return estadisticas;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return { error: error.message };
    }
  }

  logActivity(tipo, mensaje) {
    try {
      const fecha = new Date();
      const nombreLog = `sistema_${fecha.toISOString().slice(0, 10)}.log`;
      const rutaLog = path.join(this.logsPath, nombreLog);
      
      const logEntry = `${fecha.toISOString()} - [${tipo}] ${mensaje}\n`;
      fs.appendFileSync(rutaLog, logEntry);
    } catch (error) {
      console.error('❌ Error escribiendo log:', error);
    }
  }

  // Limpiar backups antiguos (mantener solo los últimos 30 días)
  async limpiarBackupsAntiguos() {
    try {
      const archivos = fs.readdirSync(this.backupPath);
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);

      let eliminados = 0;
      for (const archivo of archivos) {
        const rutaArchivo = path.join(this.backupPath, archivo);
        const stats = fs.statSync(rutaArchivo);
        
        if (stats.mtime < fechaLimite) {
          fs.unlinkSync(rutaArchivo);
          eliminados++;
        }
      }

      if (eliminados > 0) {
        console.log(`🗑️ Eliminados ${eliminados} backups antiguos`);
        this.logActivity('INFO', `Limpieza automática: ${eliminados} backups eliminados`);
      }
    } catch (error) {
      console.error('❌ Error limpiando backups:', error);
    }
  }

  // Verificar integridad de backups
  async verificarIntegridad() {
    try {
      const archivos = fs.readdirSync(this.backupPath);
      const backupsCorruptos = [];

      for (const archivo of archivos) {
        if (archivo.endsWith('.tar.gz')) {
          const rutaArchivo = path.join(this.backupPath, archivo);
          
          // Verificar si el archivo tar.gz es válido
          const comando = `tar -tzf "${rutaArchivo}"`;
          
          try {
            await new Promise((resolve, reject) => {
              exec(comando, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve();
              });
            });
          } catch (error) {
            backupsCorruptos.push(archivo);
          }
        }
      }

      if (backupsCorruptos.length > 0) {
        console.warn('⚠️ Backups corruptos detectados:', backupsCorruptos);
        this.logActivity('WARNING', `Backups corruptos: ${backupsCorruptos.join(', ')}`);
      }

      return backupsCorruptos;
    } catch (error) {
      console.error('❌ Error verificando integridad:', error);
      return [];
    }
  }
}

module.exports = BackupManager;
