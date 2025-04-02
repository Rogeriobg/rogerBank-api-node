const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) return res.status(401).json({ msg: 'Acesso negado, token não fornecido' });

  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded.id; // Armazena o ID do usuário no request
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token inválido' });
  }
};

router.post('/verificar-email', async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await User.findOne({ email });

    if (usuario) {
      return res.json({ emailExiste: true });
    } else {
      return res.status(404).json({ emailExiste: false });
    }
  } catch (err) {
    res.status(500).json({ msg: 'Erro no servidor', error: err.message });
  }
});

// Registro de usuário
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: 'Usuário já existe!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      balance: 0 // 🔥 Definindo saldo inicial como 0
    });

    await newUser.save();
    res.json({ msg: 'Usuário registrado com sucesso!' });
  } catch (err) {
    res.status(500).json({ msg: 'Erro no servidor', error: err.message });
  }
});

// Login de usuário
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("🔍 Buscando usuário:", email);
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Usuário não encontrado!' });

    console.log("🔑 Comparando senha...");
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Credenciais inválidas!' });

    console.log("✅ Criando token...");
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ 
      msg: "Login bem-sucedido!",
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error("🚨 Erro no login:", err);
    res.status(500).json({ msg: 'Erro no servidor', error: err.message });
  }
});

module.exports = router; // Exportando apenas o router