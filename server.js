const express = require('express');
const connectDB = require('../rogerBank-backend/config/db');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const bankRoutes = require('./routes/bank');
const userRoutes = require('./routes/user'); // Importe a nova rota de usuários

const app = express();

// Conectar ao banco de dados
connectDB();

// Middleware
app.use(cors({
    origin: 'http://localhost:4200', // 🔥 Permite apenas requisições do Angular
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type,Authorization'
  }));
app.use(bodyParser.json());

// Rotas
app.use('/api/auth', authRoutes);

app.use('/api/bank', bankRoutes);
app.use('/api/users', userRoutes); // Adicionando a rota de usuários


// Iniciar o servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));