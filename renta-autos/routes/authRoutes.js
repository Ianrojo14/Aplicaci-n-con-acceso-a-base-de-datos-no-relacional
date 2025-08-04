const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Usuario = require('../models/Usuario');

// Ruta para login
router.post('/login', async (req, res) => {
  try {
    const { nombre, password } = req.body;

    // Buscar usuario en la base de datos
    const usuario = await Usuario.findOne({ nombre: nombre });
    
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Usuario no encontrado' });
    }

    // Verificar contraseña
    const passwordValido = await bcryptjs.compare(password, usuario.password);
    
    if (!passwordValido) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // Crear token JWT
    const token = jwt.sign(
      { 
        id: usuario._id,
        nombre: usuario.nombre,
        rol: usuario.rol 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      mensaje: 'Login exitoso',
      token: token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        correo: usuario.correo
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para registro de usuarios (opcional, para crear nuevos usuarios)
router.post('/registro', async (req, res) => {
  try {
    const { nombre, correo, password, rol } = req.body;

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ 
      $or: [{ nombre }, { correo }] 
    });
    
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'Usuario o correo ya existe' });
    }

    // Hashear contraseña
    const passwordHash = await bcryptjs.hash(password, 10);

    // Crear nuevo usuario
    const nuevoUsuario = new Usuario({
      nombre,
      correo,
      password: passwordHash,
      rol: rol || 'empleado' // rol por defecto
    });

    await nuevoUsuario.save();

    res.status(201).json({ 
      mensaje: 'Usuario creado exitosamente',
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
