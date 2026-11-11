package br.com.bloom.api.user;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.bloom.api.data.BloomData;
import br.com.bloom.api.data.BloomData.Debt;
import br.com.bloom.api.data.BloomData.Dream;
import br.com.bloom.api.data.BloomData.Expense;
import br.com.bloom.api.data.BloomData.FixedExpense;
import br.com.bloom.api.data.BloomData.Installment;
import br.com.bloom.api.data.BloomData.Preferences;
import br.com.bloom.api.data.BloomData.Reminder;

/**
 * Guarda as contas no MySQL, nas tabelas do schema.sql: a conta em "usuarios" e cada parte dos dados
 * na sua tabela (financas, despesas_fixas, gastos, parcelas, dividas, sonhos, lembretes, preferencias).
 * Uma conta só tem linha em "financas" depois do primeiro salvamento; antes disso, data() é null.
 */
@Repository
public class MySqlUserStore implements UserStore {

    private final JdbcTemplate jdbc;

    public MySqlUserStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<User> findById(String id) {
        return jdbc.query("SELECT * FROM usuarios WHERE id = ?", this::toUser, id).stream().findFirst();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        return jdbc.query("SELECT * FROM usuarios WHERE email = ?", this::toUser, email).stream().findFirst();
    }

    /** Atualiza a conta (ou cria, se ainda não existe) e regrava os dados dela, tudo em uma transação. */
    @Override
    @Transactional
    public void save(User user) {
        try {
            int alteradas = jdbc.update("UPDATE usuarios SET nome = ?, email = ?, senha_hash = ? WHERE id = ?",
                    user.name(), user.email(), user.passwordHash(), user.id());
            if (alteradas == 0) {
                jdbc.update("INSERT INTO usuarios (id, nome, email, senha_hash, criado_em) VALUES (?, ?, ?, ?, ?)",
                        user.id(), user.name(), user.email(), user.passwordHash(), criadoEm(user.createdAt()));
            }
        } catch (DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com esse e-mail.");
        }
        if (user.data() != null) {
            gravarDados(user.id(), user.data());
        }
    }

    private void gravarDados(String id, BloomData d) {
        jdbc.update("""
                INSERT INTO financas (usuario_id, salario, meta_poupanca, modo_emergencia) VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE salario = VALUES(salario), meta_poupanca = VALUES(meta_poupanca),
                    modo_emergencia = VALUES(modo_emergencia)""",
                id, d.salary(), d.savingsGoal(), d.emergencyMode());

        // As listas são regravadas inteiras: o app sempre manda o estado completo.
        for (String tabela : List.of("despesas_fixas", "gastos", "parcelas", "dividas", "sonhos", "lembretes")) {
            jdbc.update("DELETE FROM " + tabela + " WHERE usuario_id = ?", id);
        }
        for (FixedExpense f : d.fixedExpenses()) {
            jdbc.update("INSERT INTO despesas_fixas (usuario_id, id, nome, valor) VALUES (?, ?, ?, ?)",
                    id, f.id(), f.name(), f.amount());
        }
        for (Expense e : d.expenses()) {
            jdbc.update("INSERT INTO gastos (usuario_id, id, descricao, categoria, valor, data) VALUES (?, ?, ?, ?, ?, ?)",
                    id, e.id(), e.description(), e.category(), e.amount(), e.date());
        }
        for (Installment p : d.installments()) {
            jdbc.update("""
                    INSERT INTO parcelas (usuario_id, id, descricao, valor_parcela, parcelas_pagas, total_parcelas,
                        dia_pagamento, cor, ultimo_mes_pago, pagas_no_ultimo_mes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    id, p.id(), p.description(), p.installmentAmount(), p.paidCount(), p.totalCount(),
                    p.dueDay(), p.color(), p.lastPaidMonth(), p.paidInLastMonth());
        }
        for (Debt v : d.debts()) {
            jdbc.update("""
                    INSERT INTO dividas (usuario_id, id, credor, valor_total, valor_pago, juros_mes, pagamento_mensal,
                        dia_vencimento, ultimo_mes_pago, pago_no_ultimo_mes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    id, v.id(), v.creditor(), v.totalAmount(), v.paidAmount(), v.interestRate(), v.monthlyPayment(),
                    v.dueDay(), v.lastPaidMonth(), v.paidInLastMonth());
        }
        for (Dream s : d.dreams()) {
            jdbc.update("""
                    INSERT INTO sonhos (usuario_id, id, nome, icone, valor_meta, valor_guardado, prazo, imagem)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    id, s.id(), s.name(), s.icon(), s.targetAmount(), s.savedAmount(), s.targetDate(), s.image());
        }
        for (Reminder l : d.reminders()) {
            jdbc.update("""
                    INSERT INTO lembretes (usuario_id, id, nome, valor, dia_vencimento, categoria, pago)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    id, l.id(), l.name(), l.amount(), l.dueDay(), l.category(), l.paid());
        }

        Preferences p = d.preferences();
        jdbc.update("""
                REPLACE INTO preferencias (usuario_id, nome_exibicao, nome_app, tema, modo, cor_personalizada, foto,
                    imagem_card, banner, imagem_banner, tema_icones, segredo_aventura, logo_secreto, som_sirene)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                id, p.displayName(), p.appName(), p.theme(), p.mode(), p.customColor(), p.photo(),
                p.balanceImage(), p.headerBanner(), p.headerImage(), p.iconTheme(), p.secretAdventure(),
                p.secretLogo(), Boolean.TRUE.equals(p.alarmSound()));
    }

    private User toUser(ResultSet rs, int linha) throws SQLException {
        String id = rs.getString("id");
        return new User(id, rs.getString("nome"), rs.getString("email"), rs.getString("senha_hash"),
                carregarDados(id), rs.getTimestamp("criado_em").toInstant().toString());
    }

    private BloomData carregarDados(String id) {
        List<Object[]> financas = jdbc.query(
                "SELECT salario, meta_poupanca, modo_emergencia FROM financas WHERE usuario_id = ?",
                (rs, i) -> new Object[] { rs.getBigDecimal(1), rs.getBigDecimal(2), rs.getBoolean(3) }, id);
        if (financas.isEmpty()) {
            return null;
        }
        Object[] f = financas.get(0);

        List<FixedExpense> fixas = jdbc.query("SELECT * FROM despesas_fixas WHERE usuario_id = ? ORDER BY id",
                (rs, i) -> new FixedExpense(rs.getLong("id"), rs.getString("nome"), rs.getBigDecimal("valor")), id);
        List<Expense> gastos = jdbc.query("SELECT * FROM gastos WHERE usuario_id = ? ORDER BY id",
                (rs, i) -> new Expense(rs.getLong("id"), rs.getString("descricao"), rs.getString("categoria"),
                        rs.getBigDecimal("valor"), rs.getObject("data", java.time.LocalDate.class)), id);
        List<Installment> parcelas = jdbc.query("SELECT * FROM parcelas WHERE usuario_id = ? ORDER BY id",
                (rs, i) -> new Installment(rs.getLong("id"), rs.getString("descricao"),
                        rs.getBigDecimal("valor_parcela"), rs.getInt("parcelas_pagas"), rs.getInt("total_parcelas"),
                        rs.getString("ultimo_mes_pago"), rs.getObject("pagas_no_ultimo_mes", Integer.class),
                        rs.getObject("dia_pagamento", Integer.class), rs.getString("cor")), id);
        List<Debt> dividas = jdbc.query("SELECT * FROM dividas WHERE usuario_id = ? ORDER BY id",
                (rs, i) -> new Debt(rs.getLong("id"), rs.getString("credor"), rs.getBigDecimal("valor_total"),
                        rs.getBigDecimal("valor_pago"), rs.getBigDecimal("juros_mes"),
                        rs.getBigDecimal("pagamento_mensal"), rs.getInt("dia_vencimento"),
                        rs.getString("ultimo_mes_pago"), rs.getBigDecimal("pago_no_ultimo_mes")), id);
        List<Dream> sonhos = jdbc.query("SELECT * FROM sonhos WHERE usuario_id = ? ORDER BY id",
                (rs, i) -> new Dream(rs.getLong("id"), rs.getString("nome"), rs.getString("icone"),
                        rs.getBigDecimal("valor_meta"), rs.getBigDecimal("valor_guardado"), rs.getString("prazo"),
                        rs.getString("imagem")), id);
        List<Reminder> lembretes = jdbc.query("SELECT * FROM lembretes WHERE usuario_id = ? ORDER BY id",
                (rs, i) -> new Reminder(rs.getLong("id"), rs.getString("nome"), rs.getBigDecimal("valor"),
                        rs.getInt("dia_vencimento"), rs.getString("categoria"), rs.getBoolean("pago")), id);
        Preferences preferencias = jdbc.query("SELECT * FROM preferencias WHERE usuario_id = ?",
                (rs, i) -> new Preferences(rs.getString("nome_exibicao"), rs.getString("nome_app"),
                        rs.getString("tema"), rs.getString("modo"), rs.getString("cor_personalizada"),
                        vazioSeNulo(rs.getString("foto")), vazioSeNulo(rs.getString("imagem_card")),
                        rs.getString("banner"), vazioSeNulo(rs.getString("imagem_banner")),
                        rs.getString("tema_icones"), rs.getBoolean("segredo_aventura"),
                        rs.getBoolean("logo_secreto"), rs.getBoolean("som_sirene")), id)
                .stream().findFirst().orElse(null);

        return new BloomData((BigDecimal) f[0], (BigDecimal) f[1], fixas, gastos, parcelas, dividas, sonhos,
                lembretes, (Boolean) f[2], preferencias);
    }

    private static String vazioSeNulo(String valor) {
        return valor == null ? "" : valor;
    }

    private static Timestamp criadoEm(String createdAt) {
        try {
            return Timestamp.from(createdAt == null ? Instant.now() : Instant.parse(createdAt));
        } catch (RuntimeException e) {
            return Timestamp.from(Instant.now());
        }
    }
}
