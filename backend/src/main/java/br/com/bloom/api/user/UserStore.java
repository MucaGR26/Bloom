package br.com.bloom.api.user;

import java.util.Optional;

/** Onde as contas ficam guardadas (MySQL, em MySqlUserStore). */
public interface UserStore {

    Optional<User> findById(String id);

    Optional<User> findByEmail(String email);

    /** Cria a conta ou substitui a que já tem o mesmo id. */
    void save(User user);
}
