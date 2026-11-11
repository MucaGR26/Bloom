package br.com.bloom.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;

/** Sobe a API com um banco H2 em memória no modo MySQL, sem precisar do MySQL instalado. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:bloom;MODE=MySQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.username=sa",
        "spring.datasource.password=" })
class BloomApiApplicationTests {

    @LocalServerPort
    int port;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> chamar(String metodo, String rota, String corpo, String token) throws Exception {
        HttpRequest.Builder req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + rota))
                .header("Content-Type", "application/json")
                .method(metodo, corpo == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(corpo));
        if (token != null) {
            req.header("Authorization", "Bearer " + token);
        }
        return http.send(req.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String token(String json) {
        return json.replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");
    }

    @Test
    void cadastroLoginEDadosNoBanco() throws Exception {
        var cadastro = chamar("POST", "/auth/register",
                "{\"name\":\"Ana Souza\",\"email\":\"Ana@Bloom.test\",\"password\":\"teste123\"}", null);
        assertEquals(201, cadastro.statusCode(), cadastro.body());

        var repetido = chamar("POST", "/auth/register",
                "{\"name\":\"Outra\",\"email\":\"ana@bloom.test\",\"password\":\"teste123\"}", null);
        assertEquals(409, repetido.statusCode());

        var login = chamar("POST", "/auth/login", "{\"email\":\"ana@bloom.test\",\"password\":\"teste123\"}", null);
        assertEquals(200, login.statusCode());
        String token = token(login.body());

        var vazio = chamar("GET", "/data", null, token);
        assertEquals("null", vazio.body());

        String dados = """
                {"salary":2600,"savingsGoal":350,"emergencyMode":false,
                 "fixedExpenses":[{"id":1,"name":"Aluguel","amount":900}],
                 "expenses":[{"id":2,"description":"Mercado","category":"Alimentação","amount":120.5,"date":"2026-11-03"}],
                 "installments":[{"id":3,"description":"Notebook","installmentAmount":250,"paidCount":2,"totalCount":10,
                   "lastPaidMonth":"2026-11","paidInLastMonth":1,"dueDay":14,"color":"#7c5cff"}],
                 "debts":[],"dreams":[],"reminders":[{"id":4,"name":"Luz","amount":90,"dueDay":10,"category":"Moradia","paid":false}],
                 "preferences":{"displayName":"Ana","appName":"Bloom","theme":"rosa","mode":"claro","customColor":"#e91e8c",
                   "photo":"","balanceImage":"","headerBanner":"","headerImage":"","iconTheme":"padrao",
                   "secretAdventure":false,"secretLogo":false,"alarmSound":false}}
                """;
        assertEquals(200, chamar("PUT", "/data", dados, token).statusCode());
        var salvo = chamar("GET", "/data", null, token);
        assertTrue(salvo.body().contains("\"salary\":2600") && salvo.body().contains("Alimentação"), salvo.body());

        var me = chamar("GET", "/auth/me", null, token);
        assertTrue(me.body().contains("Ana Souza"), me.body());

        assertEquals(401, chamar("GET", "/data", null, "token-falso").statusCode());
    }
}
