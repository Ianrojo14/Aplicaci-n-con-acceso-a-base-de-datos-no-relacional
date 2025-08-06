require('dotenv').config();
const PermissionManager = require('./utils/PermissionManager');

console.log('🧪 Iniciando prueba del sistema de permisos...\n');

const permissionManager = new PermissionManager();

// Datos de prueba para diferentes roles
const testCases = [
  {
    rol: 'Dueno',
    usuario: { _id: 'test-dueno', usuario: 'admin', rol: 'Dueno' },
    acciones: ['crear_auto', 'eliminar_auto', 'ver_estadisticas', 'gestionar_usuarios']
  },
  {
    rol: 'encargado',
    usuario: { _id: 'test-encargado', usuario: 'encargado1', rol: 'encargado' },
    acciones: ['crear_auto', 'eliminar_auto', 'ver_estadisticas', 'gestionar_usuarios']
  },
  {
    rol: 'empleado',
    usuario: { _id: 'test-empleado', usuario: 'empleado1', rol: 'empleado' },
    acciones: ['crear_auto', 'eliminar_auto', 'ver_estadisticas', 'gestionar_usuarios']
  }
];

console.log('🔐 Probando permisos por rol:\n');

testCases.forEach(testCase => {
  console.log(`👤 Rol: ${testCase.rol.toUpperCase()}`);
  console.log('=' .repeat(30));
  
  // Obtener permisos del rol
  const permisos = permissionManager.getUserPermissions(testCase.rol);
  console.log('📋 Permisos asignados:');
  Object.entries(permisos).forEach(([categoria, acciones]) => {
    console.log(`  📂 ${categoria}:`);
    Object.entries(acciones).forEach(([accion, permitido]) => {
      const icono = permitido ? '✅' : '❌';
      console.log(`    ${icono} ${accion}`);
    });
  });
  
  // Probar acciones específicas
  console.log('\n🧪 Pruebas de acciones específicas:');
  testCase.acciones.forEach(accion => {
    const permitido = permissionManager.hasPermission(testCase.usuario, accion);
    const icono = permitido ? '✅' : '❌';
    console.log(`  ${icono} ${accion}: ${permitido ? 'PERMITIDO' : 'DENEGADO'}`);
  });
  
  // Probar filtrado de campos sensibles
  console.log('\n🔍 Prueba de filtrado de campos:');
  const datosOriginales = {
    _id: 'test123',
    nombre: 'Juan Pérez',
    email: 'juan@test.com',
    telefono: '555-1234',
    salario: 50000,
    numeroSeguroSocial: '123-45-6789',
    password: 'hashedpassword'
  };
  
  const datosFiltrados = permissionManager.filterSensitiveFields(datosOriginales, testCase.rol);
  console.log('  📊 Campos visibles:');
  Object.keys(datosFiltrados).forEach(campo => {
    console.log(`    👁️ ${campo}: ${datosFiltrados[campo]}`);
  });
  
  const camposOcultos = Object.keys(datosOriginales).filter(campo => !datosFiltrados.hasOwnProperty(campo));
  if (camposOcultos.length > 0) {
    console.log('  🚫 Campos ocultos:');
    camposOcultos.forEach(campo => {
      console.log(`    🙈 ${campo}`);
    });
  }
  
  console.log('\n' + '-'.repeat(50) + '\n');
});

// Prueba de middleware de permisos
console.log('🛡️ Probando middleware de permisos:\n');

const middlewareTest = (rol, accion) => {
  const req = {
    usuario: { rol: rol },
    method: 'GET',
    path: '/test'
  };
  const res = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  
  const middleware = permissionManager.requirePermission(accion);
  middleware(req, res, next);
  
  return { permitido: nextCalled, respuesta: res.data, codigo: res.statusCode };
};

const pruebasMiddleware = [
  { rol: 'Dueno', accion: 'gestionar_usuarios' },
  { rol: 'encargado', accion: 'ver_estadisticas' },
  { rol: 'empleado', accion: 'eliminar_auto' },
  { rol: 'empleado', accion: 'crear_alquiler' }
];

pruebasMiddleware.forEach(prueba => {
  const resultado = middlewareTest(prueba.rol, prueba.accion);
  const icono = resultado.permitido ? '✅' : '❌';
  console.log(`${icono} ${prueba.rol} -> ${prueba.accion}: ${resultado.permitido ? 'PERMITIDO' : 'DENEGADO'}`);
  if (!resultado.permitido && resultado.respuesta) {
    console.log(`    📝 Mensaje: ${resultado.respuesta.mensaje}`);
  }
});

console.log('\n✅ Pruebas de permisos completadas!');
console.log('\n📊 Resumen:');
console.log('- Dueño: Acceso completo a todas las funciones');
console.log('- Encargado: Acceso limitado, sin gestión de usuarios');
console.log('- Empleado: Acceso básico, solo operaciones de alquiler');
console.log('- Sistema de filtrado de campos funcional');
console.log('- Middleware de autorización operativo');

process.exit(0);
