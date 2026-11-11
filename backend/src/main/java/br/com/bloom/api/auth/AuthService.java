package br.com.bloom.api.auth;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import br.com.bloom.api.auth.AuthDtos.AuthResponse;
import br.com.bloom.api.auth.AuthDtos.LoginRequest;
import br.com.bloom.api.auth.AuthDtos.RegisterRequest;
import br.com.bloom.api.auth.AuthDtos.UserResponse;
import br.com.bloom.api.user.User;
import br.com.bloom.api.user.UserStore;

@Service
public class AuthService {

    /** O bcrypt só aceita senhas de até 72 bytes. */
    private static final int SENHA_MAX_BYTES = 72;

    private final UserStore users;
    private final BCryptPasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthService(UserStore users, BCryptPasswordEncoder encoder, JwtService jwtService) {
        this.users = users;
        this.encoder = encoder;
        this.jwtService = jwtService;
    }

    public synchronized AuthResponse register(RegisterRequest request) {
        validar(request);
        String email = limparEmail(request.email());
        if (users.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com esse e-mail.");
        }
        User user = new User(UUID.randomUUID().toString(), request.name().trim(), email,
                encoder.encode(request.password()), null, Instant.now().toString());
        users.save(user);
        return toResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        String senha = request.password();
        User user = users.findByEmail(limparEmail(request.email())).orElse(null);
        if (user == null || senha == null || bytes(senha) > SENHA_MAX_BYTES
                || !encoder.matches(senha, user.passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos.");
        }
        return toResponse(user);
    }

    public UserResponse me(String userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não encontrado."));
        return new UserResponse(user.name(), user.email());
    }

    private void validar(RegisterRequest request) {
        if (vazio(request.name())) {
            throw erro("Informe seu nome completo.");
        }
        int tamanhoNome = request.name().trim().length();
        if (tamanhoNome < 2 || tamanhoNome > 100) {
            throw erro("O nome precisa ter entre 2 e 100 caracteres.");
        }
        if (!emailValido(limparEmail(request.email()))) {
            throw erro("Informe um e-mail válido.");
        }
        if (!senhaValida(request.password())) {
            throw erro("A senha precisa ter entre 6 e 72 caracteres.");
        }
    }

    boolean emailValido(String email) {
        return email.length() <= 254 && email.matches("^\\S+@\\S+\\.\\S+$");
    }

    boolean senhaValida(String senha) {
        return senha != null && senha.length() >= 6 && bytes(senha) <= SENHA_MAX_BYTES;
    }

    AuthResponse toResponse(User user) {
        return new AuthResponse(jwtService.createToken(user), new UserResponse(user.name(), user.email()));
    }

    String limparEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private int bytes(String texto) {
        return texto.getBytes(StandardCharsets.UTF_8).length;
    }

    private boolean vazio(String valor) {
        return valor == null || valor.trim().isEmpty();
    }

    private ResponseStatusException erro(String mensagem) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensagem);
    }
}
