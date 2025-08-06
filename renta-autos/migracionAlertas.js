const mongoose = require('mongoose');

// Script para actualizar los documentos existentes de Alquiler con los nuevos campos
async function migrarAlquileres() {
  try {
    // Conectar a la base de datos (ajustar la URL según tu configuración)
    await mongoose.connect('mongodb://localhost:27017/renta-autos', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Conectado a la base de datos');

    // Actualizar todos los alquileres existentes que no tengan los nuevos campos
    const result = await mongoose.connection.db.collection('alquilers').updateMany(
      {
        $or: [
          { estadoVehiculo: { $exists: false } },
          { danos: { $exists: false } },
          { requiereAtencion: { $exists: false } }
        ]
      },
      {
        $set: {
          estadoVehiculo: 'bueno',
          danos: '',
          requiereAtencion: false
        }
      }
    );

    console.log(`Migración completada. Documentos actualizados: ${result.modifiedCount}`);

    // Cerrar conexión
    await mongoose.connection.close();
    console.log('Conexión cerrada');

  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  migrarAlquileres();
}

module.exports = migrarAlquileres;
