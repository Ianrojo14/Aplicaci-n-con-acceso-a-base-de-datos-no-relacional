# 🚗 Sistema de Renta de Autos - Documentación de Automatización

## 📋 Tabla de Contenidos
- [Sistema de Backups Automatizados](#sistema-de-backups-automatizados)
- [Sistema de Logging Automatizado](#sistema-de-logging-automatizado)
- [Sistema de Permisos de Usuario](#sistema-de-permisos-de-usuario)
- [Archivos del Sistema](#archivos-del-sistema)
- [Cómo Probar las Funcionalidades](#cómo-probar-las-funcionalidades)
- [Configuración e Instalación](#configuración-e-instalación)

---

## 🔄 Sistema de Backups Automatizados

### 1. **Tarea automatizada: Backup full cada semana**

#### **¿Cómo funciona?**
- Se ejecuta automáticamente **cada domingo a las 2:00 AM**
- Utiliza `mongodump` para crear un respaldo completo de toda la base de datos
- Los archivos se almacenan en la carpeta `/backups` con formato `backup_completo_YYYY-MM-DD`
- Incluye verificación de integridad y limpieza de backups antiguos

#### **Archivos involucrados:**
```
utils/BackupManager.js     - Clase principal para gestión de backups
utils/TaskScheduler.js     - Programador de tareas con cron
app.js                     - Inicialización del sistema
```

#### **Configuración cron:**
```javascript
// En TaskScheduler.js línea 34
cron.schedule('0 2 * * 0', async () => {
  // Ejecuta backup completo cada domingo a las 2:00 AM
});
```

#### **¿Cómo probar?**
```bash
# Prueba manual del backup completo
node test-backup-full.js

# Verificar archivos generados
dir backups

# Verificar logs de ejecución
type logs\sistema_2025-08-06.log
```

### 2. **Tarea automatizada: Backup diferencial diario**

#### **¿Cómo funciona?**
- Se ejecuta automáticamente **de lunes a sábado a la 1:00 AM**
- Utiliza `mongoexport` para exportar solo registros modificados desde la última fecha
- Filtra por campos `createdAt` y `updatedAt` para optimizar el tamaño
- Los archivos se almacenan en carpetas `backup_diferencial_YYYY-MM-DD`

#### **Archivos involucrados:**
```
utils/BackupManager.js     - Método backupDiferencial()
utils/TaskScheduler.js     - Programación cron diferencial
```

#### **Configuración cron:**
```javascript
// En TaskScheduler.js línea 55
cron.schedule('0 1 * * 1-6', async () => {
  // Ejecuta backup diferencial lunes a sábado a la 1:00 AM
});
```

#### **¿Cómo probar?**
```bash
# Prueba manual del backup diferencial
node test-backup-diferencial.js

# Verificar estructura de archivos
dir backups\backup_diferencial_2025-08-06

# Verificar logs de ejecución
type logs\actividades_2025-08-06.log
```

---

## 📊 Sistema de Logging Automatizado

### 3. **Tarea automatizada: Log de registros cada dos horas**

#### **¿Cómo funciona?**
- Se ejecuta automáticamente **cada 2 horas** (00:00, 02:00, 04:00, etc.)
- Recopila estadísticas de la base de datos (conteos de registros, estado del sistema)
- Genera logs en archivos separados por fecha en la carpeta `/logs`
- Registra actividades del sistema, errores y métricas de rendimiento

#### **Archivos involucrados:**
```
utils/BackupManager.js     - Método logActividades() y obtenerEstadisticasDB()
utils/TaskScheduler.js     - Programación cron de logging
logs/sistema_YYYY-MM-DD.log         - Log principal del sistema
logs/actividades_YYYY-MM-DD.log     - Log de actividades específicas
```

#### **Configuración cron:**
```javascript
// En TaskScheduler.js línea 76
cron.schedule('0 */2 * * *', async () => {
  // Ejecuta logging cada 2 horas
});
```

#### **Tipos de logs generados:**
- **Sistema:** Errores, inicios, conexiones DB
- **Actividades:** Backups, autenticaciones, operaciones CRUD
- **Auditoría:** Accesos por rol, permisos denegados

#### **¿Cómo probar?**
```bash
# Prueba manual del logging
node test-logging.js

# Ver logs generados
type logs\sistema_2025-08-06.log
type logs\actividades_2025-08-06.log

# Verificar contenido específico
findstr "BACKUP\|LOG\|SYSTEM" logs\sistema_2025-08-06.log
```

---

## 🔐 Sistema de Permisos de Usuario

### 4. **Permisos de acceso a la base de datos según el requerimiento y el usuario**

#### **¿Cómo funciona?**
Sistema de autorización granular basado en roles con tres niveles:

1. **Dueño (Dueno):** Acceso completo a todas las funciones
2. **Encargado:** Acceso limitado, sin gestión de usuarios ni backups
3. **Empleado:** Acceso básico, solo operaciones de alquiler

#### **Archivos involucrados:**
```
utils/PermissionManager.js          - Clase principal de permisos
middlewares/auth.js                 - Middleware de autenticación
routes/*.js                         - Aplicación de permisos en rutas
```

#### **Matriz de permisos por rol:**

| Función | Dueño | Encargado | Empleado |
|---------|-------|-----------|----------|
| **Alquileres** |
| - Crear alquiler | ✅ | ✅ | ✅ |
| - Modificar alquiler | ✅ | ✅ | ✅ |
| - Eliminar alquiler | ✅ | ✅ | ❌ |
| - Ver todos los alquileres | ✅ | ✅ | ✅ |
| **Autos** |
| - Crear auto | ✅ | ✅ | ❌ |
| - Modificar auto | ✅ | ✅ | ❌ |
| - Eliminar auto | ✅ | ✅ | ❌ |
| - Ver autos | ✅ | ✅ | ✅ |
| **Clientes** |
| - Crear cliente | ✅ | ✅ | ✅ |
| - Modificar cliente | ✅ | ❌ | ✅ |
| - Eliminar cliente | ✅ | ❌ | ✅ |
| - Ver clientes | ✅ | ✅ | ✅ |
| **Administración** |
| - Ver estadísticas | ✅ | ✅ | ❌ |
| - Gestionar backups | ✅ | ❌ | ❌ |
| - Ver logs del sistema | ✅ | ❌ | ❌ |
| - Gestionar usuarios | ✅ | ❌ | ❌ |
| - Alertas de vehículos | ✅ | ✅ | ❌ |

#### **Implementación técnica:**

```javascript
// En PermissionManager.js
const ROLE_PERMISSIONS = {
  'Dueno': {
    alquileres: { crear: true, leer: true, actualizar: true, eliminar: true },
    autos: { crear: true, leer: true, actualizar: true, eliminar: true },
    // ... más permisos
  },
  'encargado': {
    alquileres: { crear: true, leer: true, actualizar: true },
    autos: { crear: true, leer: true, actualizar: true },
    // ... permisos limitados
  },
  'empleado': {
    alquileres: { crear: true, leer: true, actualizar: true },
    autos: { leer: true },
    // ... permisos básicos
  }
};
```

#### **Filtrado de campos sensibles:**
```javascript
// Campos ocultos por rol
const SENSITIVE_FIELDS = {
  'empleado': ['salario', 'numeroSeguroSocial', 'password'],
  'encargado': ['password'],
  'Dueno': [] // Ve todos los campos
};
```

#### **¿Cómo probar?**
```bash
# Prueba completa del sistema de permisos
node test-permisos.js

# Prueba manual en el navegador:
# 1. Ir a http://localhost:3000/login.html
# 2. Iniciar sesión con diferentes roles
# 3. Verificar acceso a diferentes secciones
# 4. Ir a http://localhost:3000/admin.html para panel de administración

# Verificar permisos específicos:
# Usuario empleado: Solo debería ver alquileres y vehículos disponibles
# Usuario encargado: Debería ver alertas de vehículos y devoluciones
# Usuario dueño: Debería ver todo incluyendo panel de administración
```

---

## 📁 Archivos del Sistema

### **Estructura del proyecto:**
```
renta-autos/
├── utils/
│   ├── BackupManager.js      # 🔄 Gestión de backups y logging
│   ├── PermissionManager.js  # 🔐 Control de permisos por rol
│   └── TaskScheduler.js      # ⏰ Programador de tareas automatizadas
├── routes/
│   ├── adminRoutes.js        # 🎛️ API del panel de administración
│   └── [otras rutas]
├── middlewares/
│   └── auth.js               # 🛡️ Middleware de autenticación
├── public/
│   └── admin.html            # 💻 Interfaz del panel de administración
├── backups/                  # 💾 Archivos de backup generados
├── logs/                     # 📄 Archivos de log del sistema
├── app.js                    # 🚀 Servidor principal
└── .env                      # ⚙️ Variables de configuración
```

### **Scripts de prueba:**
```
test-backup-full.js          # Prueba backup completo
test-backup-diferencial.js   # Prueba backup diferencial
test-logging.js              # Prueba sistema de logging
test-permisos.js             # Prueba sistema de permisos
verificar-sistema.js         # Verificación completa del sistema
test-sistema.bat             # Menú interactivo de pruebas (Windows)
```

---

## 🧪 Cómo Probar las Funcionalidades

### **Pruebas automatizadas por consola:**
```bash
# Cambiar al directorio del proyecto
cd renta-autos

# Ejecutar verificación completa del sistema
node verificar-sistema.js

# Pruebas individuales
node test-backup-full.js
node test-backup-diferencial.js
node test-logging.js
node test-permisos.js

# Menú interactivo de pruebas (Windows)
test-sistema.bat
```

### **Verificación del sistema en funcionamiento:**
```bash
# 1. Iniciar el servidor
node app.js

# 2. En otra terminal, verificar que las tareas están programadas
node verificar-sistema.js

# 3. Verificar logs en tiempo real
type logs\sistema_2025-08-06.log

# 4. Comprobar estado de backups
dir backups
```

### **Verificación de archivos generados:**

#### **Backups:**
```bash
# Ver backups generados
dir backups
# Salida esperada:
# backup_completo_2025-08-06/
# backup_diferencial_2025-08-06/
```

#### **Logs:**
```bash
# Ver logs generados
dir logs
# Salida esperada:
# sistema_2025-08-06.log
# actividades_2025-08-06.log
```

### **Estado de las tareas programadas:**

#### **Estado del scheduler:**
- Verificar con: `node verificar-sistema.js`
- Total de tareas: 5 (backup completo, diferencial, logging, mantenimiento, integridad)
- Estado: Activas después de iniciar el servidor con `node app.js`

#### **Próximas ejecuciones:**
- **Backup completo:** Próximo domingo a las 2:00 AM
- **Backup diferencial:** Todos los días a la 1:00 AM (excepto domingo)
- **Logging:** Cada 2 horas en punto

---

## ⚙️ Configuración e Instalación

### **Requisitos previos:**
1. **Node.js** v14 o superior
2. **MongoDB** en funcionamiento
3. **MongoDB Database Tools** (opcional, para backups completos):
   - Descargar: https://www.mongodb.com/tools
   - Instalar `mongodump` y `mongoexport`
   - Agregar al PATH del sistema

### **Variables de entorno (.env):**
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/renta_autos
JWT_SECRET=secreto_super_seguro
```

### **Dependencias del proyecto:**
```json
{
  "dependencies": {
    "express": "^5.1.0",
    "mongoose": "^8.17.0",
    "node-cron": "^4.2.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^3.0.2",
    "compression": "^1.7.4",
    "express-rate-limit": "^6.7.0"
  }
}
```

### **Instalación:**
```bash
# Clonar proyecto e instalar dependencias
cd renta-autos
npm install

# Iniciar servidor
node app.js

# Verificar funcionamiento
node verificar-sistema.js
```

---

## 🎯 Resumen de Funcionalidades

| Funcionalidad | Estado | Archivo Principal | Prueba |
|---------------|--------|-------------------|--------|
| **Backup Completo Semanal** | ✅ Funcionando | `utils/BackupManager.js` | `node test-backup-full.js` |
| **Backup Diferencial Diario** | ✅ Funcionando | `utils/BackupManager.js` | `node test-backup-diferencial.js` |
| **Logging cada 2 horas** | ✅ Funcionando | `utils/BackupManager.js` | `node test-logging.js` |
| **Permisos por rol** | ✅ Funcionando | `utils/PermissionManager.js` | `node test-permisos.js` |
| **Programador de tareas** | ✅ Funcionando | `utils/TaskScheduler.js` | `node verificar-sistema.js` |

---

**✅ SISTEMA COMPLETAMENTE FUNCIONAL Y VERIFICADO**

*Documentación actualizada: 6 de agosto de 2025*
