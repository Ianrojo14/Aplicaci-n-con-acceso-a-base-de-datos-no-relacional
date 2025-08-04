// Script para actualizar las contraseñas de usuarios existentes
// Ejecutar una sola vez: node actualizarPasswords.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Conectado a MongoDB');
  
  try {
    // Obtener la colección de usuarios
    const db = mongoose.connection.db;
    const usuarios = db.collection('usuarios');
    
    // Hashear password "1234"
    const passwordHash = await bcryptjs.hash('1234', 10);
    
    // Actualizar todos los usuarios con la nueva contraseña hasheada
    const resultado = await usuarios.updateMany(
      {}, // Actualizar todos
      { $set: { password: passwordHash } }
    );
    
    console.log(`✅ ${resultado.modifiedCount} usuarios actualizados con contraseña hasheada`);
    
    // Mostrar usuarios actualizados
    const usuariosActualizados = await usuarios.find({}).toArray();
    console.log('Usuarios en la base de datos:');
    usuariosActualizados.forEach(u => {
      console.log(`- ${u.nombre} (${u.rol}) - ${u.correo}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  mongoose.disconnect();
  console.log('🔌 Desconectado de MongoDB');
}).catch(err => {
  console.error('❌ Error de conexión:', err);
});
