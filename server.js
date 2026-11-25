
 // Arquivo principal do servidor CarbonMob.

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');

const authRoutes = require('./auth');
const appRoutes = require('./app');
const pool = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Configura o EJS para montar as páginas HTML.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Permite receber dados enviados pelos formulários.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Arquivos de aparência, imagens e scripts ficam na pasta public.
app.use(express.static(path.join(__dirname, 'public')));

// Guarda a sessão de login enquanto a pessoa usa o sistema.
const sessionStore = new MySQLStore({}, pool);

app.use(session({
    secret: process.env.SESSION_SECRET || 'carbonmob-chave-local-altere-depois',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 8
    }
}));

// Deixa o usuário disponível em todas as páginas EJS.
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    res.locals.mensagem = req.session.mensagem || null;
    delete req.session.mensagem;
    next();
});

app.get('/', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/painel');
    }

    res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/', appRoutes);

// Mostra uma mensagem simples caso uma rota não exista.
app.use((req, res) => {
    res.status(404).send('Página não encontrada. Volte para o CarbonMob.');
});

// Confere a conexão com o banco antes de iniciar o servidor.
async function iniciarServidor() {
    try {
        const conexao = await pool.getConnection();
        console.log('Conexão com o banco de dados realizada.');
        conexao.release();

        app.listen(PORT, () => {
            console.log(`CarbonMob rodando na porta ${PORT}`);
        });
    } catch (erro) {
        console.error('Não foi possível conectar ao MySQL.');
        console.error('Confira as variáveis de ambiente e se o banco foi criado.');
        console.error(erro.message);
        process.exit(1);
    }
}

iniciarServidor();
