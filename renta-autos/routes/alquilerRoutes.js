const express = require('express');
const router = express.Router();
const Alquiler = require('../models/Alquiler');
const Auto = require('../models/Auto');
const { verificarToken, verificarRol } = require('../middlewares/auth');

// Crear nuevo alquiler (empleados pueden registrar)
router.post('/', verificarToken, verificarRol(['empleado', 'encargado', 'Dueno']), async (req, res) => {
  try {
    console.log('Creando nuevo alquiler:', req.body);
    
    // Verificar que el auto esté disponible
    const auto = await Auto.findById(req.body.autoId);
    if (!auto) {
      return res.status(404).json({ mensaje: 'Auto no encontrado' });
    }
    if (!auto.disponible) {
      return res.status(400).json({ mensaje: 'El auto no está disponible para alquiler' });
    }

    const nuevoAlquiler = new Alquiler(req.body);
    await nuevoAlquiler.save();
    
    // Marcar el auto como no disponible
    await Auto.findByIdAndUpdate(req.body.autoId, { disponible: false });
    
    const alquilerCompleto = await Alquiler.findById(nuevoAlquiler._id)
      .populate('clienteId')
      .populate('autoId');
    
    console.log('Alquiler creado exitosamente:', alquilerCompleto._id);
    res.status(201).json(alquilerCompleto);
  } catch (error) {
    console.error('Error al crear alquiler:', error);
    res.status(500).json({ mensaje: 'Error al crear alquiler', error: error.message });
  }
});

// Actualizar alquiler (empleados pueden actualizar)
router.put('/:id', verificarToken, verificarRol(['empleado', 'encargado', 'Dueno']), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Actualizando alquiler:', id, req.body);
    
    const alquilerAnterior = await Alquiler.findById(id);
    if (!alquilerAnterior) {
      return res.status(404).json({ mensaje: 'Alquiler no encontrado' });
    }

    const actualizado = await Alquiler.findByIdAndUpdate(id, req.body, { new: true })
      .populate('clienteId')
      .populate('autoId');
    
    // Si se está finalizando el alquiler, marcar auto como disponible
    if (req.body.estado === 'finalizado' && alquilerAnterior.estado !== 'finalizado') {
      await Auto.findByIdAndUpdate(alquilerAnterior.autoId, { disponible: true });
      console.log('Auto marcado como disponible:', alquilerAnterior.autoId);
    }
    
    console.log('Alquiler actualizado exitosamente');
    res.json(actualizado);
  } catch (error) {
    console.error('Error al actualizar alquiler:', error);
    res.status(500).json({ mensaje: 'Error al actualizar alquiler', error: error.message });
  }
});

// Listar todos los alquileres (empleados pueden ver)
router.get('/', verificarToken, verificarRol(['empleado', 'encargado', 'Dueno']), async (req, res) => {
  try {
    console.log('Listando alquileres para usuario con rol:', req.usuario.rol);
    const alquileres = await Alquiler.find()
      .populate('clienteId')
      .populate('autoId')
      .sort({ fechaInicio: -1 });
    
    console.log('Alquileres encontrados:', alquileres.length);
    res.json(alquileres);
  } catch (error) {
    console.error('Error al listar alquileres:', error);
    res.status(500).json({ mensaje: 'Error al obtener alquileres', error: error.message });
  }
});

// Obtener alquileres activos para devolución (solo encargados)
router.get('/activos', verificarToken, verificarRol(['encargado']), async (req, res) => {
  try {
    console.log('Obteniendo alquileres activos para devolución...');
    
    const alquileresActivos = await Alquiler.find({ estado: 'activo' })
      .populate('clienteId')
      .populate('autoId')
      .sort({ fechaInicio: -1 });
    
    console.log('Alquileres activos encontrados:', alquileresActivos.length);
    res.json(alquileresActivos);
    
  } catch (error) {
    console.error('Error al obtener alquileres activos:', error);
    res.status(500).json({ mensaje: 'Error al obtener alquileres activos', error: error.message });
  }
});

// Obtener alquiler por ID
router.get('/:id', verificarToken, verificarRol(['empleado', 'encargado', 'Dueno']), async (req, res) => {
  try {
    const { id } = req.params;
    const alquiler = await Alquiler.findById(id)
      .populate('clienteId')
      .populate('autoId');
    
    if (!alquiler) {
      return res.status(404).json({ mensaje: 'Alquiler no encontrado' });
    }
    
    res.json(alquiler);
  } catch (error) {
    console.error('Error al obtener alquiler:', error);
    res.status(500).json({ mensaje: 'Error al obtener alquiler', error: error.message });
  }
});

// Obtener estadísticas de autos más rentados en los últimos 2 meses (solo encargados)
router.get('/estadisticas/autos-mas-rentados', verificarToken, verificarRol(['encargado']), async (req, res) => {
  try {
    console.log('Obteniendo estadísticas de autos más rentados...');
    
    // Calcular fecha de hace 2 meses
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 2);
    
    console.log('Consultando alquileres desde:', fechaLimite);
    
    // Agregar pipeline para obtener estadísticas
    const estadisticas = await Alquiler.aggregate([
      {
        // Filtrar alquileres de los últimos 2 meses
        $match: {
          fechaInicio: { $gte: fechaLimite }
        }
      },
      {
        // Agrupar por auto y contar
        $group: {
          _id: '$autoId',
          totalRentas: { $sum: 1 },
          ingresoTotal: { $sum: '$monto' },
          ultimaRenta: { $max: '$fechaInicio' },
          primeraRenta: { $min: '$fechaInicio' }
        }
      },
      {
        // Buscar información del auto
        $lookup: {
          from: 'autos',
          localField: '_id',
          foreignField: '_id',
          as: 'autoInfo'
        }
      },
      {
        // Desenrollar el array de autoInfo
        $unwind: '$autoInfo'
      },
      {
        // Proyectar campos necesarios
        $project: {
          _id: 1,
          totalRentas: 1,
          ingresoTotal: 1,
          ultimaRenta: 1,
          primeraRenta: 1,
          marca: '$autoInfo.marca',
          modelo: '$autoInfo.modelo',
          anio: '$autoInfo.anio',
          color: '$autoInfo.color',
          placas: '$autoInfo.placas'
        }
      },
      {
        // Ordenar por total de rentas (descendente)
        $sort: { totalRentas: -1 }
      }
    ]);
    
    console.log('Estadísticas obtenidas:', estadisticas.length, 'autos con rentas');
    res.json(estadisticas);
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas', error: error.message });
  }
});

// Registrar devolución de auto (solo encargados)
router.patch('/:id/devolucion', verificarToken, verificarRol(['encargado']), async (req, res) => {
  try {
    console.log('Procesando devolución de alquiler:', req.params.id);
    
    const { fechaDevolucion, observaciones, estadoAuto } = req.body;
    
    // Buscar el alquiler
    const alquiler = await Alquiler.findById(req.params.id).populate('autoId');
    if (!alquiler) {
      return res.status(404).json({ mensaje: 'Alquiler no encontrado' });
    }
    
    // Verificar que el alquiler esté activo
    if (alquiler.estado !== 'activo') {
      return res.status(400).json({ mensaje: 'El alquiler ya está finalizado o cancelado' });
    }
    
    // Actualizar el alquiler con la información de devolución
    alquiler.estado = 'finalizado';
    alquiler.fechaDevolucion = fechaDevolucion || new Date();
    alquiler.observaciones = observaciones || '';
    await alquiler.save();
    
    // Actualizar el estado del auto
    const auto = await Auto.findById(alquiler.autoId._id);
    if (auto) {
      // Si no se especifica estado del auto, se asume que está disponible
      auto.disponible = estadoAuto !== 'reparacion';
      await auto.save();
      
      console.log(`Auto ${auto.placas} actualizado - Disponible: ${auto.disponible}`);
    }
    
    // Retornar el alquiler actualizado con información completa
    const alquilerActualizado = await Alquiler.findById(req.params.id)
      .populate('clienteId')
      .populate('autoId');
    
    console.log('Devolución registrada exitosamente');
    res.json({ 
      mensaje: 'Devolución registrada exitosamente', 
      alquiler: alquilerActualizado 
    });
    
  } catch (error) {
    console.error('Error al registrar devolución:', error);
    res.status(500).json({ mensaje: 'Error al registrar devolución', error: error.message });
  }
});

module.exports = router;
