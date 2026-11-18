# 🏦 Silver Bank

**Silver Bank** é um projeto Full Stack de uma plataforma bancária digital fictícia, desenvolvido com o objetivo de aplicar conhecimentos de desenvolvimento Web, integração entre Front-End e Back-End, autenticação, banco de dados e operações financeiras simuladas.

O projeto possui uma interface moderna, com identidade visual minimalista em preto e dourado, proporcionando uma experiência semelhante à de um banco digital.

> ⚠️ **Aviso:** Este projeto possui finalidade educacional. Todas as operações financeiras são simuladas e não envolvem dinheiro real.

## ✨ Funcionalidades

### 🔐 Autenticação e segurança
- Cadastro de usuários.
- Login com autenticação JWT.
- Criptografia de senhas com bcrypt.
- Recuperação de senha por e-mail.
- Alteração de senha.
- Central de segurança com histórico de atividades.

### 💰 Operações bancárias
- Consulta de saldo.
- Depósitos.
- Saques.
- Transferências entre contas.
- Transferências via Pix.
- Gerenciamento de chaves Pix.
- Histórico de transações.
- Exportação de extrato em PDF.

### 💳 Cartão virtual
- Geração de cartão virtual demonstrativo.
- Visualização dos dados mascarados.
- Bloqueio e desbloqueio do cartão.

### 📊 Dashboard
- Resumo financeiro.
- Gráficos e indicadores.
- Histórico de movimentações.
- Filtros e pesquisa de transações.
- Sistema de notificações.
- Gerenciamento de perfil.

## 🛠️ Tecnologias utilizadas

### Front-End
- React
- TypeScript
- Vite
- CSS
- Recharts

### Back-End
- Node.js
- TypeScript
- Express
- Prisma ORM
- PostgreSQL
- JWT
- bcryptjs
- Nodemailer
- PDFKit

### Banco de dados
- PostgreSQL 18
- Prisma ORM 7

## 📁 Estrutura do projeto

```text
silver-bank/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
│
├── .gitignore
└── README.md
```

## 🚀 Objetivo do projeto

O Silver Bank foi desenvolvido para consolidar conhecimentos em desenvolvimento Full Stack, trabalhando com:

- Desenvolvimento de interfaces com React e TypeScript.
- Criação de APIs REST com Node.js e Express.
- Integração entre Front-End e Back-End.
- Modelagem e manipulação de dados com PostgreSQL e Prisma.
- Autenticação e autorização de usuários.
- Implementação de operações financeiras simuladas.
- Organização de código e separação de responsabilidades.

## 🎨 Identidade visual

A interface utiliza uma identidade visual minimalista, baseada em tons de preto, dourado e branco, buscando transmitir sofisticação e modernidade.

## 👨‍💻 Autor

Desenvolvido por Eduardo Silveira como projeto de estudo e evolução profissional na área de Desenvolvimento Full Stack.