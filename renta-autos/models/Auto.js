const mongoose = require('mongoose');

const autoSchema = new mongoose.Schema({
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  anio: { type: Number, required: true },
  color: { type: String },
  placas: { type: String, required: true, unique: true },
  disponible: { type: Boolean, default: true }
});

module.exports = mongoose.model('Auto', autoSchema);
