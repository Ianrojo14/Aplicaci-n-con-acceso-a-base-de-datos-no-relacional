const mongoose = require('mongoose');

const alquilerSchema = new mongoose.Schema({
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  autoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auto',
    required: true
  },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date },
  fechaDevolucion: { type: Date },
  observaciones: { type: String, default: '' },
  monto: { type: Number, required: true },
  estado: { type: String, enum: ['activo', 'finalizado'], default: 'activo' }
});

module.exports = mongoose.model('Alquiler', alquilerSchema);
