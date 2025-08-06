const jwt = require('jsonwebtoken');
const PermissionManager = require('../utils/PermissionManager');
const permissionManager = new PermissionManager();

const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ mensaje: 'Token requerido', codigo: 'AUTH_REQUIRED' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ mensaje: 'Token no proporcionado', codigo: 'TOKEN_MISSING' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;

    if (global.backupManager) {
      global.backupManager.logActivity('AUTH', `Usuario ${decoded.rol} (${decoded._id}) autenticado`);
    }

    next();
  } catch (error) {
    if (global.backupManager) {
      global.backupManager.logActivity('AUTH_FAILURE', `Token inválido desde ${req.ip}`);
    }
    return res.status(403).json({ mensaje: 'Token inválido', codigo: 'TOKEN_INVALID' });
  }
};

const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado', codigo: 'AUTH_REQUIRED' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      if (global.backupManager) {
        global.backupManager.logActivity('UNAUTHORIZED_ACCESS', 
          `Rol ${req.usuario.rol} intentó acceder a ${req.originalUrl}`);
      }

      return res.status(403).json({
        mensaje: `No tienes permisos para esta acción. Rol requerido: ${rolesPermitidos.join(', ')}`,
        codigo: 'INSUFFICIENT_ROLE',
        rol_actual: req.usuario.rol,
        roles_requeridos: rolesPermitidos
      });
    }

    next();
  };
};

const verificarPermiso = permissionManager.requirePermission;
const rateLimitUsuario = permissionManager.rateLimitByRole();

module.exports = {
  verificarToken,
  verificarRol,
  verificarPermiso,
  rateLimitUsuario,
  logAcceso: permissionManager.logAccess,
  auditar: permissionManager.auditMiddleware
};
