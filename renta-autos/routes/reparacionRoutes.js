const express = require('express');
const router = express.Router();
const Reparacion = require('../models/Reparacion');
const { verificarToken, verificarRol } = require('../middlewares/auth');

// Obtener todas las reparaciones de un auto
router.get('/auto/:id', verificarToken, verificarRol(['encargado', 'empleado']), async (req, res) => {
  const { id } = req.params;
  const reparaciones = await Reparacion.find({ autoId: id });
  res.json(reparaciones);
});

// Registrar nueva reparación
router.post('/', verificarToken, verificarRol(['encargado']), async (req, res) => {
  const nuevaReparacion = new Reparacion(req.body);
  await nuevaReparacion.save();
  res.status(201).json(nuevaReparacion);
});

// Actualizar una reparación existente
router.put('/:id', verificarToken, verificarRol(['encargado']), async (req, res) => {
  const { id } = req.params;
  const actualizada = await Reparacion.findByIdAndUpdate(id, req.body, { new: true });
  if (!actualizada) {
    return res.status(404).json({ mensaje: 'Reparación no encontrada' });
  }
  res.json(actualizada);
});

// Buscar reparaciones por rango de fecha
router.get('/filtro', verificarToken, verificarRol(['Dueno']), async (req, res) => {
  try {
    console.log('Parámetros recibidos:', req.query);
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
      return res.status(400).json({ mensaje: 'Se requieren las fechas desde y hasta' });
    }

    const filtro = {
      fecha: {
        $gte: new Date(desde),
        $lte: new Date(hasta)
      }
    };

    console.log('Filtro aplicado:', filtro);
    const reparaciones = await Reparacion.find(filtro).populate('autoId');
    console.log('Reparaciones encontradas:', reparaciones.length);
    res.json(reparaciones);
  } catch (err) {
    console.error('Error en filtro de reparaciones:', err);
    res.status(500).json({ mensaje: 'Error al consultar reparaciones', error: err.message });
  }
});

module.exports = router;
