package br.com.bloom.api.user;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/** Guarda as contas em um arquivo JSON local. Desativada: o MySqlUserStore é o que está em uso. */
public class JsonFileUserStore implements UserStore {

        private final ObjectMapper mapper;
        private final Path file;

        public JsonFileUserStore(ObjectMapper mapper, @Value("${bloom.data-file}") String file) {
            this.mapper = mapper;
            this.file = Path.of(file);
        }

        @Override
        public synchronized Optional<User> findById(String id) {
            return readAll().stream().filter(user -> user.id().equals(id)).findFirst();
        }

        @Override
        public synchronized Optional<User> findByEmail(String email) {
            return readAll().stream().filter(user -> user.email().equals(email)).findFirst();
        }

        @Override
        public synchronized void save(User user) {
            List<User> users = new ArrayList<>(readAll());
            users.removeIf(existing -> existing.id().equals(user.id()));
            users.add(user);
            writeAll(users);
        }

        private List<User> readAll() {
            if (!Files.exists(file)) {
                return List.of();
            }
            return mapper.readValue(file.toFile(), new TypeReference<List<User>>() {});
        }

        /** Grava em um arquivo temporário e troca no final, para não corromper os dados se algo falhar. */
        private void writeAll(List<User> users) {
            try {
                Path parent = file.toAbsolutePath().getParent();
                Files.createDirectories(parent);
                Path temp = Files.createTempFile(parent, "users", ".tmp");
                mapper.writerWithDefaultPrettyPrinter().writeValue(temp.toFile(), users);
                Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                throw new IllegalStateException("Não foi possível gravar os dados.", e);
            }
        }
    }
