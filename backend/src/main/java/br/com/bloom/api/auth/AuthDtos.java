package br.com.bloom.api.auth;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(String name, String email, String password) {
    }

    public record LoginRequest(String email, String password) {
    }

    public record ForgotPasswordRequest(String email) {
    }

    public record ResetPasswordRequest(String email, String code, String password) {
    }

    public record UserResponse(String name, String email) {
    }

    public record AuthResponse(String token, UserResponse user) {
    }
}
