const { verificarToken, verificarRol } = require('../middlewares/auth');

const express = require('express');
const router = express.Router();
const Auto = require('../models/Auto');

// Obtener todos los autos (temporalmente sin autenticación)
router.get('/', async (req, res) => {
  try {
    const autos = await Auto.find();
    res.json(autos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener autos' });
  }
});

// Obtener autos disponibles para empleados
router.get('/disponibles', verificarToken, verificarRol(['empleado', 'encargado']), async (req, res) => {
  try {
    console.log('Consultando autos disponibles para empleado');
    const autosDisponibles = await Auto.find({ disponible: true });
    console.log('Autos disponibles encontrados:', autosDisponibles.length);
    res.json(autosDisponibles);
  } catch (error) {
    console.error('Error al consultar autos disponibles:', error);
    res.status(500).json({ error: 'Error al obtener autos disponibles' });
  }
});

// Obtener marcas y modelos únicos para filtros
router.get('/marcas-modelos', verificarToken, verificarRol(['empleado', 'encargado']), async (req, res) => {
  try {
    console.log('Obteniendo marcas y modelos únicos');
    
    // Obtener todos los autos para debug
    const todosLosAutos = await Auto.find({}, 'marca modelo');
    console.log('Todos los autos encontrados:', todosLosAutos);
    
    // Obtener marcas únicas
    const marcas = await Auto.distinct('marca');
    console.log('Marcas distintas:', marcas);
    
    // Obtener modelos agrupados por marca
    const modelosPorMarca = {};
    
    todosLosAutos.forEach(auto => {
      console.log(`Procesando auto: ${auto.marca} - ${auto.modelo}`);
      if (!modelosPorMarca[auto.marca]) {
        modelosPorMarca[auto.marca] = new Set();
      }
      modelosPorMarca[auto.marca].add(auto.modelo);
    });
    
    // Convertir Sets a arrays
    Object.keys(modelosPorMarca).forEach(marca => {
      modelosPorMarca[marca] = Array.from(modelosPorMarca[marca]);
      console.log(`Marca ${marca} tiene modelos:`, modelosPorMarca[marca]);
    });
    
    console.log('Marcas encontradas:', marcas.length);
    console.log('Estructura final modelosPorMarca:', modelosPorMarca);
    res.json({ marcas, modelosPorMarca });
  } catch (error) {
    console.error('Error al obtener marcas y modelos:', error);
    res.status(500).json({ error: 'Error al obtener marcas y modelos' });
  }
});

// Crear nuevo auto (temporalmente sin autenticación)
router.post('/', async (req, res) => {
  try {
    const nuevoAuto = new Auto(req.body);
    const autoGuardado = await nuevoAuto.save();
    res.json(autoGuardado);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear auto' });
  }
});

// Actualizar auto
router.put('/:id', verificarToken, verificarRol(['encargado']), async (req, res) => {
  try {
    const autoActualizado = await Auto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!autoActualizado) return res.status(404).json({ mensaje: 'Auto no encontrado' });
    res.json(autoActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar auto' });
  }
});

// Eliminar auto
router.delete('/:id', verificarToken, verificarRol(['encargado']), async (req, res) => {
  try {
    const eliminado = await Auto.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ mensaje: 'Auto no encontrado' });
    res.json({ mensaje: 'Auto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar auto' });
  }
});

module.exports = router;
