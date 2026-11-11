package br.com.bloom.api.user;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import br.com.bloom.api.data.BloomData;
import tools.jackson.databind.ObjectMapper;

/** Guarda as contas no MySQL. Os dados financeiros ficam em JSON na coluna "data". */
@Repository
public class MySqlUserStore implements UserStore {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public MySqlUserStore(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @Override
    public Optional<User> findById(String id) {
        return jdbc.query("SELECT * FROM users WHERE id = ?", this::toUser, id).stream().findFirst();
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jdbc.query("SELECT * FROM users WHERE email = ?", this::toUser, email).stream().findFirst();
    }

    @Override
    public void save(User user) {
        String json = user.data() == null ? null : mapper.writeValueAsString(user.data());
        jdbc.update("""
                INSERT INTO users (id, name, email, password_hash, data, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name), email = VALUES(email),
                    password_hash = VALUES(password_hash), data = VALUES(data)
                """,
                user.id(), user.name(), user.email(), user.passwordHash(), json,
                Timestamp.from(Instant.parse(user.createdAt())));
    }

    public int count() {
        Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
        return total == null ? 0 : total;
    }

    private User toUser(ResultSet rs, int linha) throws SQLException {
        String json = rs.getString("data");
        BloomData data = json == null ? null : mapper.readValue(json, BloomData.class);
        return new User(rs.getString("id"), rs.getString("name"), rs.getString("email"),
                rs.getString("password_hash"), data,
                rs.getTimestamp("created_at").toInstant().toString());
    }
}