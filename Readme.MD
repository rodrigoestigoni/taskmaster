# TaskMaster - Sistema de Gerenciamento de Tarefas e Metas

TaskMaster é uma aplicação web completa para gerenciamento de tarefas, metas e produtividade pessoal. O sistema permite o controle detalhado de tarefas recorrentes, métricas de progresso, integração com metas de longo prazo e gerenciamento de energia para otimizar a produtividade ao longo do dia.

## 🚀 Funcionalidades

- **Gerenciamento de Tarefas**: Crie, edite e exclua tarefas com categorias, prioridades e níveis de energia
- **Visualizações Temporais**: Veja suas tarefas em modo diário, semanal e mensal
- **Metas de Longo Prazo**: Defina e acompanhe progresso de metas com diferentes períodos
- **Tarefas Recorrentes**: Configure padrões de recorrência (diário, semanal, mensal, personalizado)
- **Time Blocking**: Organize suas tarefas em blocos de tempo para melhor produtividade
- **Técnica Pomodoro**: Integração com timer Pomodoro para gestão de tempo
- **Gerenciamento de Energia**: Otimize suas tarefas com base em seu perfil de energia ao longo do dia
- **Análise de Produtividade**: Relatórios e métricas para acompanhar seu progresso
- **Tema Claro/Escuro**: Interface adaptável às suas preferências visuais

## 🏗️ Arquitetura

```
TaskMaster/
├── frontend/                  # Interface React
│   ├── public/                # Arquivos estáticos
│   ├── src/
│   │   ├── components/        # Componentes reutilizáveis
│   │   │   ├── auth/          # Componentes de autenticação
│   │   │   ├── common/        # Componentes genéricos
│   │   │   ├── energy/        # Componentes de gestão de energia
│   │   │   ├── layout/        # Componentes de estrutura
│   │   │   └── tasks/         # Componentes de tarefas
│   │   ├── context/           # Contextos React para estado global
│   │   ├── pages/             # Páginas da aplicação
│   │   │   ├── auth/          # Páginas de autenticação
│   │   │   └── ...            # Outras páginas
│   │   ├── services/          # Serviços e comunicação com API
│   │   ├── App.js             # Componente principal
│   │   └── index.js           # Ponto de entrada
│   ├── nginx/                 # Configuração Nginx (produção)
│   ├── package.json           # Dependências do frontend
│   └── tailwind.config.js     # Configuração do Tailwind CSS
│
├── backend/                   # Servidor Django/DRF
│   ├── app/
│   │   ├── accounts/          # Funcionalidades de contas/autenticação
│   │   ├── tasks/             # Funcionalidades de tarefas e metas
│   │   └── ...                # Outros módulos
│   ├── core/                  # Configurações principais do Django
│   ├── manage.py              # Script de gerenciamento do Django
│   ├── requirements.txt       # Dependências do backend
│   └── Dockerfile             # Configuração de imagem Docker
│
├── docker-compose.yml         # Configuração Docker Compose
└── .gitignore                 # Arquivos ignorados pelo Git
```

## 🔄 Fluxo de Dados

1. **Autenticação**:
   - Registro → Login → Token JWT → Autorização de requisições

2. **Gerenciamento de Tarefas**:
   - Componentes de UI → Contexto de Tarefas → Serviços de API → Backend → Banco de Dados

3. **Sessão de Usuário**:
   - Contexto de Autenticação → Interceptores de API → Tokens JWT → Renovação Automática

## 💻 Tecnologias

### Frontend
- **React**: Framework JavaScript para construção da interface
- **Tailwind CSS**: Framework CSS para estilização
- **Headless UI**: Componentes acessíveis não-estilizados
- **Formik**: Gerenciamento de formulários
- **Yup**: Validação de esquemas
- **Chart.js**: Visualização de dados e relatórios
- **Axios**: Cliente HTTP para comunicação com API
- **date-fns**: Manipulação de datas
- **React Router**: Navegação

### Backend
- **Django**: Framework Python para o backend
- **Django REST Framework**: API RESTful
- **JWT**: Autenticação baseada em tokens
- **SQLite/PostgreSQL**: Banco de dados

### Infraestrutura
- **Docker**: Containerização
- **Nginx**: Servidor web e proxy reverso

## 🚪 Endpoints da API

### Autenticação
- `POST /api/auth/token/`: Obter token JWT
- `POST /api/auth/token/refresh/`: Renovar token JWT
- `POST /api/auth/register/`: Registrar novo usuário

### Tarefas
- `GET /api/tasks/`: Listar tarefas
- `POST /api/tasks/`: Criar tarefa
- `GET /api/tasks/today/`: Tarefas do dia
- `GET /api/tasks/week/`: Tarefas da semana
- `GET /api/tasks/month/`: Tarefas do mês
- `GET /api/tasks/dashboard/`: Dados para o dashboard
- `GET /api/tasks/report/`: Relatório de tarefas
- `POST /api/tasks/{id}/update_status/`: Atualizar status da tarefa
- `POST /api/tasks/{id}/complete/`: Completar tarefa

### Metas
- `GET /api/goals/`: Listar metas
- `POST /api/goals/`: Criar meta
- `GET /api/goals/report/`: Relatório de metas
- `POST /api/goals/{id}/update_progress/`: Atualizar progresso da meta
- `GET /api/goals/{id}/related_tasks/`: Listar tarefas relacionadas à meta

### Categorias
- `GET /api/categories/`: Listar categorias
- `POST /api/categories/`: Criar categoria

## 📊 Modelos de Dados

### Tarefa (Task)
- ID, título, descrição, categoria
- Data, hora início, hora fim, duração
- Prioridade, status, nível de energia
- Padrão de repetição, meta associada
- Valor alvo, valor realizado

### Meta (Goal)
- ID, título, descrição, categoria
- Período, data início, data fim
- Valor alvo, valor atual, unidade de medida
- Porcentagem de progresso

### Categoria (Category)
- ID, nome, ícone, cor

### Preferências de Usuário (UserPreference)
- Visualização padrão, tema, horários
- Dia inicial da semana, configurações de notificações

## 🔒 Segurança
- Autenticação baseada em JWT
- Tokens com expiração automática e renovação
- Criptografia de senhas
- Validação de entrada de dados
- Contextos de usuário isolados

## 📝 Instalação e Configuração

### Pré-requisitos
- Docker e Docker Compose
- Node.js (para desenvolvimento)
- Python (para desenvolvimento)

### Passos para Instalação

1. Clone o repositório
   ```bash
   git clone https://github.com/seu-usuario/taskmaster.git
   cd taskmaster
   ```

2. Configuração do ambiente
   ```bash
   # Crie um arquivo .env na raiz do projeto (copie do .env.example)
   cp .env.example .env
   # Edite as variáveis conforme necessário
   ```

3. Inicie os containers
   ```bash
   docker-compose up -d
   ```

4. Acesse a aplicação
   ```
   Frontend: http://localhost:8081
   Backend API: http://localhost:8440
   ```

## 💼 Uso em Desenvolvimento

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\activate)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## 🌟 Recursos Adicionais

- Técnica Pomodoro integrada
- Visualização de conflitos de horários
- Perfil de energia personalizado
- Dashboards e relatórios de produtividade
- Gerenciamento de ocorrências para tarefas recorrentes

---

Esta documentação fornece uma visão geral do sistema TaskMaster. Para mais detalhes, consulte os comentários e docstrings no código-fonte.