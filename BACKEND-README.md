# Back-end do Bloom

O back-end usa Spring Boot (Java 21+) e fica na pasta `backend`. Por enquanto as contas e os dados ficam em `backend/data/users.json`; o MySQL vai entrar no lugar desse arquivo, implementando a interface `UserStore`.

Não é preciso instalar o Maven: o projeto usa o `mvnw.cmd`, que baixa o que precisa na primeira execução.

## Iniciar o back-end

Na pasta raiz do projeto:

```bash
npm run backend
```

A API fica em `http://localhost:3000`. Para verificar, abra `http://localhost:3000/api/health`.

## Iniciar o Angular

Em outro terminal, na pasta raiz do projeto:

```bash
npm install
npm start
```

Abra `http://localhost:4200`.

## Rotas

- `GET /api/health`
- `POST /api/auth/register` com `{ "name": "Nome", "email": "email@exemplo.com", "password": "123456" }`
- `POST /api/auth/login` com `{ "email": "email@exemplo.com", "password": "123456" }`
- `POST /api/auth/forgot-password` com `{ "email": "email@exemplo.com" }`
- `POST /api/auth/reset-password` com `{ "email": "email@exemplo.com", "code": "123456", "password": "nova-senha" }`
- `GET /api/auth/me` com token Bearer
- `GET /api/data` com token Bearer
- `PUT /api/data` com token Bearer e o objeto de dados do Bloom

Erros voltam como `{ "message": "..." }`.

## Validações

As regras ficam nos services, no método `validar`: cada `if` que falha lança `erro("mensagem")`.

- `auth/AuthService.java`: cadastro e login.
- `data/DataService.java`: salário, gastos, parcelas, dívidas, sonhos, lembretes e preferências.

Ao criar um campo novo em `BloomData` no Angular (`expense.model.ts`), crie também em `data/BloomData.java` e valide em `DataService`. Campo que não existe lá não é salvo.

## Configuração

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3000` | Porta da API |
| `JWT_SECRET` | chave de desenvolvimento | Assina os tokens (mínimo de 32 caracteres) |
| `FRONTEND_ORIGIN` | `http://localhost:4200` | Endereço autorizado a chamar a API |
| `BLOOM_DATA_FILE` | `data/users.json` | Arquivo de dados |
| `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | sem e-mail | Servidor que envia o código de recuperação de senha |
| `MAIL_FROM` | `nao-responda@bloom.local` | Remetente do e-mail |

Sem `SPRING_MAIL_HOST`, o código de recuperação aparece no console do Spring, o que serve só para desenvolvimento.

As senhas são armazenadas como hash bcrypt e as rotas privadas usam token JWT. Fora do ambiente local, defina `JWT_SECRET` com uma chave longa e aleatória.
