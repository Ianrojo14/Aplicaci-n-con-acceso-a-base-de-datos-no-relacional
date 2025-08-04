const { verificarToken, verificarRol } = require('../middlewares/auth');

const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');

// Obtener todos los clientes (temporalmente sin autenticación)
router.get('/', async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Crear nuevo cliente (temporalmente sin autenticación)
router.post('/', async (req, res) => {
  try {
    const nuevoCliente = new Cliente(req.body);
    const clienteGuardado = await nuevoCliente.save();
    res.json(clienteGuardado);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// Actualizar cliente (temporalmente sin autenticación)
router.put('/:id', async (req, res) => {
  try {
    const clienteActualizado = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!clienteActualizado) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json(clienteActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// Eliminar cliente (temporalmente sin autenticación)
router.delete('/:id', async (req, res) => {
  try {
    const eliminado = await Cliente.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

module.exports = router;
