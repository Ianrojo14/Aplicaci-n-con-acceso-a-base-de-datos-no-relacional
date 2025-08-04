const mongoose = require('mongoose');

const reparacionSchema = new mongoose.Schema({
  autoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auto',
    required: true
  },
  descripcion: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  costo: { type: Number, required: true },
  taller: { type: String }
});

module.exports = mongoose.model('Reparacion', reparacionSchema);
