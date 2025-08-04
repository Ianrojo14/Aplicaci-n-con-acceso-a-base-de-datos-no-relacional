const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  nombre: String,
  apellido: String,
  telefono: String,
  email: String,
  direccion: String
});

module.exports = mongoose.model('Cliente', clienteSchema);
