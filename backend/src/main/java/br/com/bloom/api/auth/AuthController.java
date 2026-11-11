package br.com.bloom.api.auth;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.bloom.api.auth.AuthDtos.AuthResponse;
import br.com.bloom.api.auth.AuthDtos.ForgotPasswordRequest;
import br.com.bloom.api.auth.AuthDtos.LoginRequest;
import br.com.bloom.api.auth.AuthDtos.RegisterRequest;
import br.com.bloom.api.auth.AuthDtos.ResetPasswordRequest;
import br.com.bloom.api.auth.AuthDtos.UserResponse;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "app", "Bloom API");
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/auth/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /** A resposta é sempre a mesma, para não revelar quais e-mails têm conta. */
    @PostMapping("/auth/forgot-password")
    public Map<String, String> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        passwordResetService.solicitar(request);
        return Map.of("message", "Se o e-mail tiver conta no Bloom, enviamos um código de 6 dígitos.");
    }

    @PostMapping("/auth/reset-password")
    public AuthResponse resetPassword(@RequestBody ResetPasswordRequest request) {
        return passwordResetService.redefinir(request);
    }

    @GetMapping("/auth/me")
    public UserResponse me(@RequestAttribute(AuthInterceptor.USER_ID) String userId) {
        return authService.me(userId);
    }
}
