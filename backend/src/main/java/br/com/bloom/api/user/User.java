package br.com.bloom.api.user;

import br.com.bloom.api.data.BloomData;

/** Conta de usuário. Os dados financeiros ficam em "data" (null até o primeiro salvamento). */
public record User(String id, String name, String email, String passwordHash, BloomData data, String createdAt) {

    public User withPasswordHash(String newHash) {
        return new User(id, name, email, newHash, data, createdAt);
    }

    public User withData(BloomData newData) {
        return new User(id, name, email, passwordHash, newData, createdAt);
    }
}
