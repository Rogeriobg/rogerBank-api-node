const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Rota para retornar todos os usuários
router.get('/', async (req, res) => {
  try {
    const users = await User.find(); // Buscando todos os usuários
    res.json(users); // Retornando os usuários em formato JSON
  } catch (err) {
    res.status(500).send('Erro ao buscar os usuários');
  }
});

// Rota para buscar um usuário específico pelo ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id); // Buscando o usuário pelo ID
    if (!user) {
      return res.status(404).send('Usuário não encontrado');
    }
    res.json(user); // Retornando o usuário encontrado
  } catch (err) {
    res.status(500).send('Erro ao buscar o usuário');
  }
});

module.exports = router;