const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  correo: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 4
  },
  rol: {
    type: String,
    required: true,
    enum: ['empleado', 'encargado'],
    default: 'empleado'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Usuario', usuarioSchema);
