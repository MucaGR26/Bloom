-- Mesmas tabelas do "Script do banco/criar_tabelas.sql" (sem CREATE DATABASE/USE).

-- -------------------------------------------------------------
-- Usuários (cadastro e login)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id          VARCHAR(36)  NOT NULL,            -- UUID gerado no cadastro
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(254) NOT NULL,
    senha_hash  VARCHAR(100) NOT NULL,            -- bcrypt, nunca a senha em texto
    criado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_usuarios_email (email),
    CONSTRAINT ck_usuarios_nome CHECK (CHAR_LENGTH(nome) BETWEEN 2 AND 100)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Finanças do mês: salário, meta de poupança e Modo Emergência
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financas (
    usuario_id       VARCHAR(36)   NOT NULL,
    salario          DECIMAL(12,2) NOT NULL DEFAULT 0,
    meta_poupanca    DECIMAL(12,2) NOT NULL DEFAULT 0,
    modo_emergencia  BOOLEAN       NOT NULL DEFAULT FALSE,
    PRIMARY KEY (usuario_id),
    CONSTRAINT fk_financas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_financas_valores CHECK (salario >= 0 AND meta_poupanca >= 0)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Despesas fixas (aluguel, luz, internet...)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS despesas_fixas (
    usuario_id  VARCHAR(36)   NOT NULL,
    id          BIGINT        NOT NULL,
    nome        VARCHAR(100)  NOT NULL,
    valor       DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (usuario_id, id),
    CONSTRAINT fk_despesas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_despesas_valor CHECK (valor > 0)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Gastos avulsos (Histórico)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gastos (
    usuario_id  VARCHAR(36)   NOT NULL,
    id          BIGINT        NOT NULL,
    descricao   VARCHAR(200)  NOT NULL,
    categoria   VARCHAR(20)   NOT NULL,
    valor       DECIMAL(12,2) NOT NULL,
    data        DATE          NOT NULL,
    PRIMARY KEY (usuario_id, id),
    KEY ix_gastos_data (usuario_id, data),
    CONSTRAINT fk_gastos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_gastos_valor CHECK (valor > 0)
    -- As categorias são conferidas no back-end (DataService). Não há CHECK aqui porque
    -- o MariaDB do XAMPP estraga os acentos de 'Alimentação', 'Saúde' etc. dentro do CHECK.
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Parcelas (compras parceladas e o calendário)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parcelas (
    usuario_id           VARCHAR(36)   NOT NULL,
    id                   BIGINT        NOT NULL,
    descricao            VARCHAR(200)  NOT NULL,
    valor_parcela        DECIMAL(12,2) NOT NULL,
    parcelas_pagas       INT           NOT NULL DEFAULT 0,
    total_parcelas       INT           NOT NULL,
    dia_pagamento        TINYINT       NULL,      -- dia no calendário (1 a 31)
    cor                  CHAR(7)       NULL,      -- cor no calendário, ex.: #22a06b
    ultimo_mes_pago      CHAR(7)       NULL,      -- AAAA-MM
    pagas_no_ultimo_mes  INT           NULL,
    PRIMARY KEY (usuario_id, id),
    CONSTRAINT fk_parcelas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_parcelas_valor CHECK (valor_parcela > 0),
    CONSTRAINT ck_parcelas_total CHECK (total_parcelas BETWEEN 1 AND 1000),
    CONSTRAINT ck_parcelas_pagas CHECK (parcelas_pagas BETWEEN 0 AND total_parcelas),
    CONSTRAINT ck_parcelas_dia CHECK (dia_pagamento IS NULL OR dia_pagamento BETWEEN 1 AND 31)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Dívidas
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dividas (
    usuario_id          VARCHAR(36)   NOT NULL,
    id                  BIGINT        NOT NULL,
    credor              VARCHAR(100)  NOT NULL,
    valor_total         DECIMAL(12,2) NOT NULL,
    valor_pago          DECIMAL(12,2) NOT NULL DEFAULT 0,
    juros_mes           DECIMAL(7,2)  NOT NULL DEFAULT 0,  -- % ao mês
    pagamento_mensal    DECIMAL(12,2) NOT NULL,
    dia_vencimento      TINYINT       NOT NULL,
    ultimo_mes_pago     CHAR(7)       NULL,                -- AAAA-MM
    pago_no_ultimo_mes  DECIMAL(12,2) NULL,
    PRIMARY KEY (usuario_id, id),
    CONSTRAINT fk_dividas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_dividas_valores CHECK (valor_total > 0 AND valor_pago BETWEEN 0 AND valor_total AND pagamento_mensal > 0),
    CONSTRAINT ck_dividas_juros CHECK (juros_mes BETWEEN 0 AND 1000),
    CONSTRAINT ck_dividas_dia CHECK (dia_vencimento BETWEEN 1 AND 31)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Sonhos (metas de economia)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sonhos (
    usuario_id      VARCHAR(36)   NOT NULL,
    id              BIGINT        NOT NULL,
    nome            VARCHAR(100)  NOT NULL,
    icone           VARCHAR(30)   NOT NULL DEFAULT 'sparkles',
    valor_meta      DECIMAL(12,2) NOT NULL,
    valor_guardado  DECIMAL(12,2) NOT NULL DEFAULT 0,
    prazo           VARCHAR(30)   NOT NULL DEFAULT 'A definir',
    imagem          LONGTEXT      NULL,           -- foto ou GIF em data URL
    PRIMARY KEY (usuario_id, id),
    CONSTRAINT fk_sonhos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_sonhos_valores CHECK (valor_meta > 0 AND valor_guardado >= 0)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Lembretes (contas a pagar)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lembretes (
    usuario_id      VARCHAR(36)   NOT NULL,
    id              BIGINT        NOT NULL,
    nome            VARCHAR(100)  NOT NULL,
    valor           DECIMAL(12,2) NOT NULL,
    dia_vencimento  TINYINT       NOT NULL,
    categoria       VARCHAR(20)   NOT NULL,
    pago            BOOLEAN       NOT NULL DEFAULT FALSE,
    PRIMARY KEY (usuario_id, id),
    CONSTRAINT fk_lembretes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_lembretes_valor CHECK (valor > 0),
    CONSTRAINT ck_lembretes_dia CHECK (dia_vencimento BETWEEN 1 AND 31)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Preferências (Temas e preferências)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS preferencias (
    usuario_id         VARCHAR(36)  NOT NULL,
    nome_exibicao      VARCHAR(100) NOT NULL DEFAULT '',
    nome_app           VARCHAR(20)  NOT NULL DEFAULT 'Bloom',
    tema               VARCHAR(20)  NOT NULL DEFAULT 'rosa',
    modo               VARCHAR(10)  NOT NULL DEFAULT 'claro',
    cor_personalizada  CHAR(7)      NOT NULL DEFAULT '#e91e8c',
    foto               LONGTEXT     NULL,
    imagem_card        LONGTEXT     NULL,
    banner             VARCHAR(20)  NOT NULL DEFAULT '',
    imagem_banner      LONGTEXT     NULL,
    tema_icones        VARCHAR(20)  NOT NULL DEFAULT 'padrao',
    segredo_aventura   BOOLEAN      NOT NULL DEFAULT FALSE,
    logo_secreto       BOOLEAN      NOT NULL DEFAULT FALSE,
    som_sirene         BOOLEAN      NOT NULL DEFAULT FALSE,
    PRIMARY KEY (usuario_id),
    CONSTRAINT fk_preferencias_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_preferencias_modo CHECK (modo IN ('claro', 'escuro')),
    CONSTRAINT ck_preferencias_icones CHECK (tema_icones IN ('padrao', 'fino', 'negrito', 'colorido', 'emoji', 'aventura'))
) ENGINE = InnoDB;
