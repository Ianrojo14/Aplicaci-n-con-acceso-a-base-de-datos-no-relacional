const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol, verificarPermiso } = require('../middlewares/auth');

// Obtener estado del sistema (solo dueño)
router.get('/estado', verificarToken, verificarRol(['Dueno']), async (req, res) => {
  try {
    const { taskScheduler } = require('../app');
    
    const estado = {
      servidor: {
        uptime: Math.round(process.uptime()),
        memoria: {
          usada: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        version_node: process.version,
        plataforma: process.platform
      },
      base_datos: {
        estado: require('mongoose').connection.readyState === 1 ? 'Conectada' : 'Desconectada',
        host: require('mongoose').connection.host || 'localhost',
        puerto: require('mongoose').connection.port || 27017
      },
      tareas_automatizadas: taskScheduler.obtenerEstadoTareas(),
      timestamp: new Date().toISOString()
    };
    
    res.json(estado);
    
  } catch (error) {
    console.error('Error obteniendo estado del sistema:', error);
    res.status(500).json({ 
      mensaje: 'Error obteniendo estado del sistema',
      error: error.message 
    });
  }
});

// Ejecutar backup manual (solo dueño)
router.post('/backup', verificarToken, verificarRol(['Dueno']), async (req, res) => {
  try {
    const { tipo = 'diferencial' } = req.body;
    const { taskScheduler } = require('../app');
    
    if (!['completo', 'diferencial'].includes(tipo)) {
      return res.status(400).json({
        mensaje: 'Tipo de backup inválido. Use "completo" o "diferencial"'
      });
    }
    
    const resultado = await taskScheduler.ejecutarBackupManual(tipo);
    
    res.json({
      mensaje: `Backup ${tipo} ejecutado exitosamente`,
      archivo: resultado,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error ejecutando backup manual:', error);
    res.status(500).json({
      mensaje: 'Error ejecutando backup manual',
      error: error.message
    });
  }
});

// Obtener logs del sistema (solo dueño)
router.get('/logs', verificarToken, verificarRol(['Dueno']), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { fecha, tipo = 'sistema' } = req.query;
    
    const logsPath = path.join(__dirname, '..', 'logs');
    
    if (!fs.existsSync(logsPath)) {
      return res.json({ logs: [], mensaje: 'No hay logs disponibles' });
    }
    
    const fechaLog = fecha || new Date().toISOString().slice(0, 10);
    const nombreArchivo = `${tipo}_${fechaLog}.log`;
    const rutaLog = path.join(logsPath, nombreArchivo);
    
    if (!fs.existsSync(rutaLog)) {
      return res.json({ 
        logs: [], 
        mensaje: `No se encontraron logs para ${fechaLog}`,
        archivo: nombreArchivo
      });
    }
    
    const contenidoLog = fs.readFileSync(rutaLog, 'utf8');
    const lineas = contenidoLog.split('\n').filter(linea => linea.trim() !== '');
    
    const logs = lineas.map(linea => {
      try {
        const match = linea.match(/^(.*?) - \[(.*?)\] (.*)$/);
        if (match) {
          return {
            timestamp: match[1],
            tipo: match[2],
            mensaje: match[3]
          };
        }
        return { mensaje: linea };
      } catch (error) {
        return { mensaje: linea };
      }
    });
    
    res.json({
      logs: logs.slice(-100), // Últimas 100 entradas
      total: logs.length,
      archivo: nombreArchivo,
      fecha: fechaLog
    });
    
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({
      mensaje: 'Error obteniendo logs',
      error: error.message
    });
  }
});

// Obtener estadísticas detalladas (dueño y encargado)
router.get('/estadisticas', verificarToken, verificarRol(['Dueno', 'encargado']), async (req, res) => {
  try {
    const { taskScheduler } = require('../app');
    
    if (!global.backupManager) {
      return res.status(503).json({
        mensaje: 'Sistema de estadísticas no disponible'
      });
    }
    
    const estadisticas = await global.backupManager.obtenerEstadisticasDB();
    
    // Estadísticas adicionales del sistema
    const estadisticasCompletas = {
      ...estadisticas,
      sistema: {
        uptime: process.uptime(),
        memoria_usada_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        tareas_programadas: taskScheduler.obtenerEstadoTareas().total_tareas,
        version_app: '1.0.0'
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(estadisticasCompletas);
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      mensaje: 'Error obteniendo estadísticas',
      error: error.message
    });
  }
});

// Controlar tareas programadas (solo dueño)
router.post('/tareas/:accion', verificarToken, verificarRol(['Dueno']), async (req, res) => {
  try {
    const { accion } = req.params;
    const { taskScheduler } = require('../app');
    
    switch (accion) {
      case 'detener':
        taskScheduler.detenerTareas();
        res.json({ mensaje: 'Tareas detenidas exitosamente' });
        break;
        
      case 'reiniciar':
        taskScheduler.reiniciarTareas();
        res.json({ mensaje: 'Tareas reiniciadas exitosamente' });
        break;
        
      case 'estado':
        const estado = taskScheduler.obtenerEstadoTareas();
        res.json(estado);
        break;
        
      default:
        res.status(400).json({
          mensaje: 'Acción inválida. Use: detener, reiniciar, estado'
        });
    }
    
  } catch (error) {
    console.error('Error controlando tareas:', error);
    res.status(500).json({
      mensaje: 'Error controlando tareas',
      error: error.message
    });
  }
});

// Obtener información de permisos del usuario actual
router.get('/permisos', verificarToken, async (req, res) => {
  try {
    const PermissionManager = require('../utils/PermissionManager');
    const permissionManager = new PermissionManager();
    
    const permisos = permissionManager.getUserPermissions(req.usuario.rol);
    
    res.json({
      usuario: {
        id: req.usuario._id,
        rol: req.usuario.rol,
        usuario: req.usuario.usuario
      },
      permisos: permisos,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error obteniendo permisos:', error);
    res.status(500).json({
      mensaje: 'Error obteniendo permisos',
      error: error.message
    });
  }
});

// Lista de archivos de backup disponibles (solo dueño)
router.get('/backups', verificarToken, verificarRol(['Dueno']), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const backupPath = path.join(__dirname, '..', 'backups');
    
    if (!fs.existsSync(backupPath)) {
      return res.json({ backups: [], mensaje: 'No hay backups disponibles' });
    }
    
    const archivos = fs.readdirSync(backupPath);
    
    const backups = archivos.map(archivo => {
      const rutaArchivo = path.join(backupPath, archivo);
      const stats = fs.statSync(rutaArchivo);
      
      const tipo = archivo.includes('completo') ? 'completo' : 'diferencial';
      const fecha = archivo.match(/\d{4}-\d{2}-\d{2}/)?.[0] || 'desconocida';
      
      return {
        nombre: archivo,
        tipo: tipo,
        fecha: fecha,
        tamaño_mb: Math.round(stats.size / 1024 / 1024 * 100) / 100,
        fecha_creacion: stats.birthtime,
        fecha_modificacion: stats.mtime
      };
    }).sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    
    res.json({
      backups: backups,
      total: backups.length,
      tamaño_total_mb: Math.round(backups.reduce((sum, b) => sum + b.tamaño_mb, 0) * 100) / 100
    });
    
  } catch (error) {
    console.error('Error listando backups:', error);
    res.status(500).json({
      mensaje: 'Error listando backups',
      error: error.message
    });
  }
});

module.exports = router;
