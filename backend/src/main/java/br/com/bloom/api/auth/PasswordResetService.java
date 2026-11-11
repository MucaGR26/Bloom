package br.com.bloom.api.auth;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import br.com.bloom.api.auth.AuthDtos.AuthResponse;
import br.com.bloom.api.auth.AuthDtos.ForgotPasswordRequest;
import br.com.bloom.api.auth.AuthDtos.ResetPasswordRequest;
import br.com.bloom.api.user.User;
import br.com.bloom.api.user.UserStore;

/**
 * Recuperação de senha por código de 6 dígitos enviado por e-mail.
 * Sem servidor de e-mail configurado (spring.mail.host), o código aparece no console do Spring.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final Duration VALIDADE = Duration.ofMinutes(15);
    private static final Duration ESPERA_REENVIO = Duration.ofSeconds(60);
    private static final int MAX_TENTATIVAS = 5;

    private record CodigoPendente(String hash, Instant expiraEm, Instant enviadoEm, int tentativas) {
    }

    private final Map<String, CodigoPendente> pendentes = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    private final UserStore users;
    private final BCryptPasswordEncoder encoder;
    private final AuthService authService;
    private final ObjectProvider<JavaMailSender> mailSender;
    private final String remetente;

    public PasswordResetService(UserStore users, BCryptPasswordEncoder encoder, AuthService authService,
            ObjectProvider<JavaMailSender> mailSender, @Value("${bloom.mail-from}") String remetente) {
        this.users = users;
        this.encoder = encoder;
        this.authService = authService;
        this.mailSender = mailSender;
        this.remetente = remetente;
    }

    /** Roda em segundo plano para a resposta não revelar, pelo tempo, se o e-mail tem conta. */
    public void solicitar(ForgotPasswordRequest request) {
        String email = authService.limparEmail(request.email());
        if (!authService.emailValido(email)) {
            throw erro("Informe um e-mail válido.");
        }
        CompletableFuture.runAsync(() -> gerarEEnviar(email));
    }

    public AuthResponse redefinir(ResetPasswordRequest request) {
        String email = authService.limparEmail(request.email());
        if (!authService.senhaValida(request.password())) {
            throw erro("A senha precisa ter entre 6 e 72 caracteres.");
        }
        if (request.code() == null || !request.code().matches("[0-9]{6}")) {
            throw codigoInvalido();
        }
        CodigoPendente pendente = pendentes.get(email);
        if (pendente == null || Instant.now().isAfter(pendente.expiraEm())) {
            pendentes.remove(email);
            throw codigoInvalido();
        }
        if (!encoder.matches(request.code(), pendente.hash())) {
            registrarErro(email, pendente);
            throw codigoInvalido();
        }
        User user = users.findByEmail(email).orElseThrow(this::codigoInvalido);
        pendentes.remove(email);
        User atualizado = user.withPasswordHash(encoder.encode(request.password()));
        users.save(atualizado);
        return authService.toResponse(atualizado);
    }

    private void gerarEEnviar(String email) {
        try {
            limparExpirados();
            CodigoPendente anterior = pendentes.get(email);
            Instant agora = Instant.now();
            if (users.findByEmail(email).isEmpty()
                    || (anterior != null && agora.isBefore(anterior.enviadoEm().plus(ESPERA_REENVIO)))) {
                return;
            }
            String codigo = String.format("%06d", random.nextInt(1_000_000));
            pendentes.put(email, new CodigoPendente(encoder.encode(codigo), agora.plus(VALIDADE), agora, 0));
            enviar(email, codigo);
        } catch (Exception e) {
            pendentes.remove(email);
            log.error("Não foi possível enviar o código de recuperação de senha", e);
        }
    }

    private void enviar(String email, String codigo) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("E-mail não configurado. Código de recuperação de {}: {}", email, codigo);
            return;
        }
        SimpleMailMessage mensagem = new SimpleMailMessage();
        mensagem.setFrom(remetente);
        mensagem.setTo(email);
        mensagem.setSubject("Seu código de recuperação do Bloom");
        mensagem.setText("Use este código para criar uma nova senha no Bloom: " + codigo
                + "\n\nEle vale por 15 minutos. Se você não pediu, ignore este e-mail.");
        sender.send(mensagem);
    }

    private void registrarErro(String email, CodigoPendente pendente) {
        int tentativas = pendente.tentativas() + 1;
        if (tentativas >= MAX_TENTATIVAS) {
            pendentes.remove(email);
        } else {
            pendentes.put(email, new CodigoPendente(pendente.hash(), pendente.expiraEm(), pendente.enviadoEm(), tentativas));
        }
    }

    private void limparExpirados() {
        Instant agora = Instant.now();
        pendentes.values().removeIf(p -> agora.isAfter(p.expiraEm()));
    }

    private ResponseStatusException codigoInvalido() {
        return erro("Código inválido ou expirado.");
    }

    private ResponseStatusException erro(String mensagem) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensagem);
    }
}
