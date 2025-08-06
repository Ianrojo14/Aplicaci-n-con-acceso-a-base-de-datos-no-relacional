// Sistema de permisos granular para base de datos
const mongoose = require('mongoose');

class PermissionManager {
  constructor() {
    // Definir permisos por rol y acción
    this.permissions = {
      'Dueno': {
        // El dueño tiene acceso total
        alquileres: ['read', 'create', 'update', 'delete'],
        autos: ['read', 'create', 'update', 'delete'],
        clientes: ['read', 'create', 'update', 'delete'],
        reparaciones: ['read', 'create', 'update', 'delete'],
        usuarios: ['read', 'create', 'update', 'delete'],
        estadisticas: ['read'],
        backups: ['read', 'create'],
        logs: ['read'],
        sistema: ['read', 'update']
      },
      'encargado': {
        // Encargado maneja operaciones y supervisa
        alquileres: ['read', 'create', 'update'],
        autos: ['read', 'create', 'update'],
        clientes: ['read'],
        reparaciones: ['read', 'create', 'update'],
        usuarios: ['read'],
        estadisticas: ['read'],
        alertas: ['read', 'update'],
        devoluciones: ['read', 'create', 'update']
      },
      'empleado': {
        // Empleado maneja clientes y alquileres básicos
        alquileres: ['read', 'create', 'update'],
        autos: ['read'],
        clientes: ['read', 'create', 'update'],
        reparaciones: ['read'],
        vehiculos_disponibles: ['read']
      }
    };

    // Restricciones específicas por campo
    this.fieldRestrictions = {
      'empleado': {
        'usuarios': ['password', 'rol'], // No puede ver/editar contraseñas ni roles
        'alquileres': [], // Puede ver todo
        'autos': ['disponible'] // No puede cambiar disponibilidad
      },
      'encargado': {
        'usuarios': ['password'], // No puede ver contraseñas pero sí roles
        'clientes': [] // Puede ver todo pero no modificar
      }
    };
  }

  // Verificar si un usuario tiene permiso para una acción específica
  hasPermission(userRole, resource, action) {
    const rolePermissions = this.permissions[userRole];
    if (!rolePermissions) {
      return false;
    }

    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) {
      return false;
    }

    return resourcePermissions.includes(action);
  }

  // Middleware para verificar permisos en rutas
  requirePermission(resource, action) {
    return (req, res, next) => {
      const userRole = req.usuario?.rol;
      
      if (!userRole) {
        return res.status(401).json({ 
          mensaje: 'Usuario no autenticado',
          codigo: 'AUTH_REQUIRED'
        });
      }

      if (!this.hasPermission(userRole, resource, action)) {
        return res.status(403).json({ 
          mensaje: `Acceso denegado. Rol '${userRole}' no tiene permiso '${action}' en '${resource}'`,
          codigo: 'INSUFFICIENT_PERMISSIONS',
          requerido: { resource, action },
          rol_actual: userRole
        });
      }

      next();
    };
  }

  // Filtrar campos sensibles según el rol del usuario
  filterSensitiveFields(data, userRole, resource) {
    const restrictions = this.fieldRestrictions[userRole];
    if (!restrictions || !restrictions[resource]) {
      return data;
    }

    const restrictedFields = restrictions[resource];
    
    if (Array.isArray(data)) {
      return data.map(item => this.removeRestrictedFields(item, restrictedFields));
    } else {
      return this.removeRestrictedFields(data, restrictedFields);
    }
  }

  removeRestrictedFields(obj, restrictedFields) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const filtered = { ...obj };
    
    restrictedFields.forEach(field => {
      if (filtered[field] !== undefined) {
        delete filtered[field];
      }
    });

    return filtered;
  }

  // Obtener permisos del usuario actual
  getUserPermissions(userRole) {
    return this.permissions[userRole] || {};
  }

  // Middleware para logging de accesos
  logAccess(resource, action) {
    return (req, res, next) => {
      const userRole = req.usuario?.rol;
      const userId = req.usuario?._id;
      const ip = req.ip || req.connection.remoteAddress;
      
      console.log(`🔐 Acceso: ${userRole} (${userId}) - ${action} en ${resource} desde ${ip}`);
      
      // Log a archivo si existe BackupManager
      if (global.backupManager) {
        global.backupManager.logActivity('ACCESS', 
          `Usuario ${userRole} (${userId}) realizó ${action} en ${resource} desde ${ip}`
        );
      }

      next();
    };
  }

  // Middleware para rate limiting por rol
  rateLimitByRole() {
    const rateLimits = {
      'empleado': 100, // 100 requests por minuto
      'encargado': 200, // 200 requests por minuto
      'Dueno': 500 // 500 requests por minuto
    };

    const requestCounts = {};

    return (req, res, next) => {
      const userRole = req.usuario?.rol;
      const userId = req.usuario?._id;
      const now = Date.now();
      const windowStart = now - 60000; // Ventana de 1 minuto

      if (!requestCounts[userId]) {
        requestCounts[userId] = [];
      }

      // Limpiar requests antiguos
      requestCounts[userId] = requestCounts[userId].filter(time => time > windowStart);

      const limit = rateLimits[userRole] || 50;
      
      if (requestCounts[userId].length >= limit) {
        return res.status(429).json({
          mensaje: `Límite de requests excedido para rol ${userRole}`,
          limite: limit,
          ventana: '1 minuto'
        });
      }

      requestCounts[userId].push(now);
      next();
    };
  }

  // Validar operaciones en cascada (para mantener integridad)
  validateCascadeOperation(resource, action, data) {
    const validations = {
      'autos': {
        'delete': async (autoId) => {
          // No permitir eliminar autos con alquileres activos
          const alquileresActivos = await mongoose.model('Alquiler').countDocuments({
            autoId: autoId,
            estado: 'activo'
          });
          
          if (alquileresActivos > 0) {
            throw new Error('No se puede eliminar un auto con alquileres activos');
          }
        }
      },
      'clientes': {
        'delete': async (clienteId) => {
          // No permitir eliminar clientes con alquileres activos
          const alquileresActivos = await mongoose.model('Alquiler').countDocuments({
            clienteId: clienteId,
            estado: 'activo'
          });
          
          if (alquileresActivos > 0) {
            throw new Error('No se puede eliminar un cliente con alquileres activos');
          }
        }
      },
      'usuarios': {
        'delete': async (usuarioId, currentUserId) => {
          // No permitir que un usuario se elimine a sí mismo
          if (usuarioId.toString() === currentUserId.toString()) {
            throw new Error('No puedes eliminar tu propia cuenta');
          }
        }
      }
    };

    const validator = validations[resource]?.[action];
    if (validator) {
      return validator(data);
    }
  }

  // Middleware para auditoría completa
  auditMiddleware() {
    return (req, res, next) => {
      const originalSend = res.send;
      const startTime = Date.now();

      res.send = function(data) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const auditLog = {
          timestamp: new Date().toISOString(),
          usuario: req.usuario?.rol || 'anonimo',
          userId: req.usuario?._id,
          metodo: req.method,
          ruta: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          statusCode: res.statusCode,
          duracion: duration,
          tamaño_respuesta: Buffer.byteLength(data)
        };

        // Log a archivo si existe BackupManager
        if (global.backupManager) {
          global.backupManager.logActivity('AUDIT', JSON.stringify(auditLog));
        }

        originalSend.call(this, data);
      };

      next();
    };
  }
}

module.exports = PermissionManager;
