const express = require('express');
const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware de autenticação
const auth = (req, res, next) => {
  const token = req.headers['authorization'];
  console.log('Token recebido:', token); // 👀 Para ver se o token está vindo corretamente

  if (!token) return res.status(401).json({ msg: 'Acesso negado, token ausente' });

  try {
    const tokenWithoutBearer = token.replace('Bearer ', '');
    console.log('Token formatado:', tokenWithoutBearer); // 👀 Para verificar o token formatado

    const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (err) {
    console.error('Erro ao verificar token:', err.message); // 👀 Para depurar o erro
    res.status(400).json({ msg: 'Token inválido', error: err.message });
  }
};
// Visualizar saldo
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user); // Aqui, `req.user` já contém o ID do usuário

    if (!user) return res.status(404).json({ msg: 'Usuário não encontrado' });

    res.json({ balance: user.balance });
  } catch (err) {
    res.status(500).json({ msg: 'Erro no servidor' });
  }
});

// Realizar depósito


router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    console.log('Valor recebido no backend:', amount); // Debug do valor recebido

    // Garantir que amount está sendo recebido corretamente
    if (!amount) {
      return res.status(400).json({ msg: 'O valor do depósito é obrigatório.' });
    }

    // Converter amount para número e validar
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ msg: 'Valor inválido. Insira um número maior que zero.' });
    }

    // Buscar usuário
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ msg: 'Usuário não encontrado.' });
    }

    // Atualizar saldo
    user.balance += depositAmount;
    await user.save();

    const transaction = new Transaction({
      user: req.user,
      type: 'deposit', // ✅ Agora está em inglês, conforme esperado
      amount: depositAmount,
      date: new Date()
    });
    await transaction.save();

    console.log(`Depósito de R$${depositAmount} realizado com sucesso para o usuário: ${user._id}`);

    res.json({ balance: user.balance, msg: 'Depósito realizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao realizar depósito:', error);
    res.status(500).json({ msg: 'Erro interno do servidor. Tente novamente mais tarde.' });
  }
});

// Realizar saque
router.post('/withdraw', auth, async (req, res) => {
  const { amount } = req.body;
  if (amount <= 0) return res.status(400).json({ msg: 'Valor inválido' });

  const user = await User.findById(req.user);
  if (user.balance < amount) return res.status(400).json({ msg: 'Saldo insuficiente' });

  user.balance -= amount;
  await user.save();

  // Salvar a transação
  const transaction = new Transaction({
    user: req.user,
    type: 'withdraw',
    amount
  });
  await transaction.save();

  res.json({ balance: user.balance });
});

router.get('/transactions', auth, async (req, res) => {
  const transactions = await Transaction.find({ user: req.user }).sort({ date: -1 });
  res.json(transactions);
});

// Rota para gerar extrato bancário (PDF)
router.get('/generate-statement', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);

    if (!user) {
      return res.status(404).json({ msg: 'Usuário não encontrado' });
    }

    const transactions = await Transaction.find({ user: req.user }).sort({ date: -1 });

    // Criar o documento PDF
    const doc = new PDFDocument();
    let filename = `extrato_${user.name}_${Date.now()}.pdf`;
    filename = encodeURIComponent(filename);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Cabeçalho do extrato
    doc.fontSize(18).text('Extrato Bancário', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Usuário: ${user.name}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Saldo atual: R$ ${user.balance.toFixed(2)}`);
    doc.moveDown();

    // Tabela de transações
    doc.text('Últimas transações:');
    doc.moveDown();

    transactions.forEach((transaction, index) => {
      // Mapeando tipo de transação
      let tipoTransacao = '';
      if (transaction.type === 'deposit') {
        tipoTransacao = 'Depósito'; // Para depósitos
      } else if (transaction.type === 'withdraw') {
        tipoTransacao = 'Retirada'; // Para retiradas
      } else {
        tipoTransacao = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1); // Qualquer outro tipo
      }

      doc.text(`${index + 1}. ${tipoTransacao}: R$ ${transaction.amount.toFixed(2)} - Data: ${transaction.date.toLocaleString()}`);
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Erro ao gerar extrato', error: err.message });
  }
});

module.exports = router;