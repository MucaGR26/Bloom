# Bloom

O Bloom é um app de finanças pessoais. Você cadastra seu salário, as despesas fixas e os gastos do dia a dia, e o app mostra quanto sobra no mês, o que vence nos próximos dias e como estão suas metas.

O front-end é feito em Angular. A API é feita em Spring Boot e guarda os dados de cada conta no MySQL.

## O que o app faz

| Tela | Para que serve |
|---|---|
| **Visão geral** | Resumo do mês: salário, gastos, saldo e meta de poupança |
| **Finanças** | Salário, meta de poupança e despesas fixas (aluguel, luz, internet…) |
| **Histórico** | Gastos avulsos por categoria e data |
| **Parcelas** | Compras parceladas, que aparecem no calendário do menu lateral |
| **Dívidas** | Dívidas com juros, pagamento mensal e dia de vencimento |
| **Sonhos** | Metas de economia, com foto ou GIF |
| **Lembretes** | Contas a pagar, separadas entre as que vencem em até 7 dias e as que vencem depois |
| **Modo Emergência** | Um plano para quando o dinheiro do mês aperta |
| **Conselho** | Assistente que responde perguntas sobre o seu mês e sobre finanças |
| **Temas** | Cores, modo claro/escuro, foto de perfil, banner, ícones e os dados de exemplo |
| **Suporte** | Perguntas frequentes e ajuda |

Para ver o app já preenchido, vá em **Temas → Dados de exemplo → Carregar dados de exemplo**. As datas, os vencimentos e as parcelas de exemplo são calculados a partir do dia de hoje, então sempre aparecem no calendário e nos lembretes.

A conta tem cadastro, login e recuperação de senha por código. As senhas são guardadas com bcrypt, e as rotas privadas usam token JWT.

## Versões usadas

| Ferramenta | Versão |
|---|---|
| Node.js | 24.16.0 |
| npm | 10.9.7 (definido em `packageManager`) |
| Angular / Angular CLI | 21.2 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.3.3 |
| RxJS | 7.8.2 |
| Java | 17 ou mais novo (testado com o 25.0.1) |
| Spring Boot | 4.1.2 |
| Maven | 3.10.0 (baixado pelo `mvnw`, não precisa instalar) |
| JJWT (tokens JWT) | 0.13.0 |
| MySQL Connector/J | 9.7.0 |
| Banco de dados | MariaDB 10.4.32 do XAMPP (também funciona com MySQL 8.0.16 ou mais novo) |
| H2 (só nos testes) | 2.4.240 |

## Como rodar

### 1. O que instalar

- [Node.js](https://nodejs.org/) 24 ou mais novo
- [Java](https://adoptium.net/) 17 ou mais novo
- [XAMPP](https://www.apachefriends.org/) (para o MySQL) ou um MySQL 8

### 2. Ligar o banco

No painel do XAMPP, clique em **Start** na linha do **MySQL**.

O back-end se conecta em `localhost:3306` com o usuário `root` e **senha vazia**, que é o padrão do XAMPP. Se o seu MySQL tem senha, defina a variável `DB_PASSWORD` antes de iniciar o back-end (veja [Configuração](#configuração)).

Não é preciso criar o banco nem as tabelas: na primeira vez que o back-end sobe, ele cria o banco `bloom` e todas as tabelas sozinho.

### 3. Iniciar o back-end

Na pasta raiz do projeto:

```bash
npm run backend
```

Esse comando usa o `mvnw.cmd` (Windows). No Linux ou no macOS, rode `cd backend && ./mvnw spring-boot:run`.

A API fica em http://localhost:3000. Para conferir se ela está no ar, abra http://localhost:3000/api/health.

### 4. Iniciar o front-end

Em outro terminal, na pasta raiz do projeto:

```bash
npm install
npm start
```

Abra http://localhost:4200, crie uma conta e pronto.

### Testes

O teste do back-end sobe a API com um banco H2 em memória (no modo MySQL), então não precisa do XAMPP ligado:

```bash
cd backend
mvnw.cmd test
```

Ele cadastra uma conta, faz login, confere o bloqueio de e-mail repetido e verifica se os dados são gravados e lidos de volta das tabelas.

## Script do banco

O arquivo [`Script do banco/criar_tabelas.sql`](Script%20do%20banco/criar_tabelas.sql) cria o banco `bloom` e todas as tabelas. São as mesmas tabelas do `backend/src/main/resources/schema.sql`, que o back-end roda sozinho ao iniciar. O script serve para criar o banco à mão (por exemplo, no phpMyAdmin ou no MySQL Workbench) ou para consultar a estrutura.

Cada conta tem uma linha em `usuarios`, e tudo o que ela cadastra no app fica nas outras tabelas, ligado pelo `usuario_id`:

| Tabela | O que guarda |
|---|---|
| `usuarios` | Nome, e-mail, hash da senha (bcrypt) e data de cadastro |
| `financas` | Salário, meta de poupança e se o Modo Emergência está ligado |
| `despesas_fixas` | Despesas fixas do mês |
| `gastos` | Gastos avulsos (descrição, categoria, valor e data) |
| `parcelas` | Compras parceladas, com dia de pagamento e cor no calendário |
| `dividas` | Dívidas, com juros ao mês, pagamento mensal e vencimento |
| `sonhos` | Metas de economia, com a imagem em data URL |
| `lembretes` | Contas a pagar e se já foram pagas |
| `preferencias` | Tema, cores, fotos, banner e outras preferências |

Algumas coisas sobre o script:

- Os ids dos registros vêm do próprio app (`Date.now()`), por isso a chave de cada tabela é `(usuario_id, id)`.
- Todas as tabelas ligadas a `usuarios` usam `ON DELETE CASCADE`: se uma conta for apagada, os dados dela vão junto.
- As regras de valor (valores positivos, dia de 1 a 31, parcelas pagas até o total…) estão em `CHECK`s.
- A categoria dos gastos **não** tem `CHECK` no banco, porque o MariaDB do XAMPP estraga os acentos de "Alimentação", "Saúde" etc. dentro dele. Quem confere a categoria é o back-end (`DataService`).

Para ver as contas cadastradas:

```sql
SELECT nome, email, criado_em FROM bloom.usuarios;
```

### Fotos e GIFs grandes

O app aceita imagens de até 5 MB, mas o MySQL do XAMPP só aceita 1 MB por envio. Para não dar erro ao salvar uma imagem grande, aumente o limite:

1. No painel do XAMPP, clique em **Config** na linha do MySQL e abra o **my.ini**.
2. Logo abaixo de `[mysqld]`, troque `max_allowed_packet=1M` por `max_allowed_packet=64M`.
3. Salve e reinicie o MySQL (**Stop** e depois **Start**).

## Configuração

Tudo tem um valor padrão que funciona no XAMPP. Para mudar, defina a variável de ambiente antes de rodar `npm run backend`.

| Variável | Padrão | Uso |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/bloom?...` | Endereço do banco |
| `DB_USER` | `root` | Usuário do MySQL |
| `DB_PASSWORD` | vazia | Senha do MySQL |
| `PORT` | `3000` | Porta da API |
| `JWT_SECRET` | chave de desenvolvimento | Assina os tokens (mínimo de 32 caracteres) |
| `FRONTEND_ORIGIN` | `http://localhost:4200` | Endereço autorizado a chamar a API |
| `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | sem e-mail | Servidor que envia o código de recuperação de senha |
| `MAIL_FROM` | `nao-responda@bloom.local` | Remetente do e-mail |

No PowerShell, por exemplo:

```powershell
$env:DB_PASSWORD = "sua-senha"
npm run backend
```

Sem `SPRING_MAIL_HOST`, o código de recuperação de senha aparece no console do Spring, o que serve só para desenvolvimento. Fora do ambiente local, defina `JWT_SECRET` com uma chave longa e aleatória.

## Estrutura

```
├── src/app/                  Front-end Angular
│   ├── auth/                 Telas de login, cadastro e recuperação de senha
│   ├── bloom-dashboard/      O app (uma pasta por tela em sections/)
│   └── core/                 Comunicação com a API, proteção das rotas e sons
├── backend/                  API Spring Boot
│   └── src/main/java/br/com/bloom/api/
│       ├── auth/             Cadastro, login, JWT e recuperação de senha
│       ├── data/             Leitura, gravação e validação dos dados do app
│       └── user/             Gravação das contas no MySQL (MySqlUserStore)
└── Script do banco/          Script SQL que cria o banco e as tabelas
```

Detalhes da API (rotas e validações) estão no [BACKEND-README.md](BACKEND-README.md).
