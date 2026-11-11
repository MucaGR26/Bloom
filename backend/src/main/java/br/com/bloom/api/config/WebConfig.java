package br.com.bloom.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.tomcat.TomcatConnectorCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import br.com.bloom.api.auth.AuthInterceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final String frontendOrigin;

    public WebConfig(AuthInterceptor authInterceptor, @Value("${bloom.frontend-origin}") String frontendOrigin) {
        this.authInterceptor = authInterceptor;
        this.frontendOrigin = frontendOrigin;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(frontendOrigin)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type");
    }

    /** Rotas privadas: exigem o token JWT no cabeçalho Authorization. */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor).addPathPatterns("/api/auth/me", "/api/data");
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /** O limite padrão do Tomcat é 10 idiomas por requisição, e navegadores podem enviar mais. */
    @Bean
    public TomcatConnectorCustomizer maxLocaleCountCustomizer() {
        return connector -> connector.setMaxLocaleCount(100);
    }
}
