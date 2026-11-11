package br.com.bloom.api.data;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import br.com.bloom.api.data.BloomData.Debt;
import br.com.bloom.api.data.BloomData.Dream;
import br.com.bloom.api.data.BloomData.Expense;
import br.com.bloom.api.data.BloomData.FixedExpense;
import br.com.bloom.api.data.BloomData.Installment;
import br.com.bloom.api.data.BloomData.Preferences;
import br.com.bloom.api.data.BloomData.Reminder;
import br.com.bloom.api.user.User;
import br.com.bloom.api.user.UserStore;

@Service
public class DataService {

    private static final BigDecimal VALOR_MAXIMO = new BigDecimal("999999999.99");
    private static final int MAX_ITENS = 20000;

    /** Um GIF de 5 MB depois de codificado em base64. */
    private static final int MAX_IMAGEM = 7_000_000;

    private static final List<String> CATEGORIAS = List.of("Alimentação", "Transporte", "Moradia", "Saúde", "Educação",
            "Celular", "Assinaturas", "Lazer", "Compras", "Outros", "Dívida");
    private static final List<String> TEMAS = List.of("rosa", "roxo", "lilas", "azul", "turquesa", "verde", "dourado",
            "laranja", "vermelho", "grafite", "personalizada");
    private static final List<String> MODOS = List.of("claro", "escuro");
    private static final List<String> BANNERS = List.of("", "tema", "por-do-sol", "oceano", "floresta", "aurora",
            "galaxia", "flores", "listras", "imagem");
    private static final List<String> TEMAS_ICONE = List.of("padrao", "fino", "negrito", "colorido", "emoji", "aventura");
    private static final List<String> FORMATOS_IMAGEM = List.of("data:image/png;base64,", "data:image/jpeg;base64,",
            "data:image/gif;base64,", "data:image/webp;base64,");

    private final UserStore users;

    public DataService(UserStore users) {
        this.users = users;
    }

    public BloomData findByUser(String userId) {
        return findUser(userId).data();
    }

    public void gravar(String userId, BloomData dados) {
        validar(dados);
        users.save(findUser(userId).withData(dados));
    }

    private User findUser(String userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
    }

    private void validar(BloomData dados) {
        naoNegativo(dados.salary(), "o salário");
        naoNegativo(dados.savingsGoal(), "a meta de poupança");

        lista(dados.fixedExpenses(), "despesas fixas");
        lista(dados.expenses(), "gastos");
        lista(dados.installments(), "parcelas");
        lista(dados.debts(), "dívidas");
        lista(dados.dreams(), "sonhos");
        lista(dados.reminders(), "lembretes");

        dados.fixedExpenses().forEach(this::validar);
        dados.expenses().forEach(this::validar);
        dados.installments().forEach(this::validar);
        dados.debts().forEach(this::validar);
        dados.dreams().forEach(this::validar);
        dados.reminders().forEach(this::validar);

        if (dados.preferences() == null) {
            throw erro("Preferências ausentes.");
        }
        validar(dados.preferences());
    }

    private void validar(FixedExpense despesa) {
        id(despesa.id());
        texto(despesa.name(), "o nome da despesa fixa", 100);
        positivo(despesa.amount(), "o valor da despesa fixa");
    }

    private void validar(Expense gasto) {
        id(gasto.id());
        texto(gasto.description(), "a descrição do gasto", 200);
        if (gasto.category() == null || !CATEGORIAS.contains(gasto.category())) {
            throw erro("Categoria de gasto inválida.");
        }
        positivo(gasto.amount(), "o valor do gasto");
        if (gasto.date() == null) {
            throw erro("Informe a data do gasto.");
        }
    }

    private void validar(Installment parcela) {
        id(parcela.id());
        texto(parcela.description(), "a descrição da parcela", 200);
        positivo(parcela.installmentAmount(), "o valor da parcela");
        if (parcela.paidCount() < 0) {
            throw erro("O número de parcelas pagas não pode ser negativo.");
        }
        if (parcela.totalCount() < 1 || parcela.totalCount() > 1000) {
            throw erro("O número de parcelas precisa ser de 1 a 1000.");
        }
        if (parcela.paidCount() > parcela.totalCount()) {
            throw erro("As parcelas pagas não podem passar do total de parcelas.");
        }
        mesDePagamento(parcela.lastPaidMonth());
        if (parcela.paidInLastMonth() != null
                && (parcela.paidInLastMonth() < 0 || parcela.paidInLastMonth() > parcela.paidCount())) {
            throw erro("Quantidade de parcelas pagas no mês inválida.");
        }
        if (parcela.dueDay() != null) {
            diaDoMes(parcela.dueDay(), "da parcela");
        }
        if (parcela.color() != null && !parcela.color().matches("#[0-9a-fA-F]{6}")) {
            throw erro("Cor da parcela inválida.");
        }
    }

    private void validar(Debt divida) {
        id(divida.id());
        texto(divida.creditor(), "o credor da dívida", 100);
        positivo(divida.totalAmount(), "o valor total da dívida");
        naoNegativo(divida.paidAmount(), "o valor pago da dívida");
        if (divida.paidAmount().compareTo(divida.totalAmount()) > 0) {
            throw erro("O valor pago não pode passar do total da dívida.");
        }
        if (divida.interestRate() == null || divida.interestRate().signum() < 0
                || divida.interestRate().compareTo(new BigDecimal("1000")) > 0) {
            throw erro("Os juros da dívida precisam ser de 0 a 1000% ao mês.");
        }
        positivo(divida.monthlyPayment(), "o pagamento mensal da dívida");
        diaDoMes(divida.dueDay(), "da dívida");
        mesDePagamento(divida.lastPaidMonth());
        if (divida.paidInLastMonth() != null && (divida.paidInLastMonth().signum() < 0
                || divida.paidInLastMonth().compareTo(divida.paidAmount()) > 0)) {
            throw erro("Valor pago no mês inválido.");
        }
    }

    private void validar(Dream sonho) {
        id(sonho.id());
        texto(sonho.name(), "o nome do sonho", 100);
        texto(sonho.icon(), "o ícone do sonho", 30);
        positivo(sonho.targetAmount(), "o valor-meta do sonho");
        naoNegativo(sonho.savedAmount(), "o valor guardado no sonho");
        texto(sonho.targetDate(), "o prazo do sonho", 30);
        if (sonho.image() != null && !imagemValida(sonho.image())) {
            throw erro("Foto do sonho inválida ou grande demais.");
        }
    }

    private void validar(Reminder lembrete) {
        id(lembrete.id());
        texto(lembrete.name(), "o nome do lembrete", 100);
        positivo(lembrete.amount(), "o valor do lembrete");
        diaDoMes(lembrete.dueDay(), "do lembrete");
        if (lembrete.category() == null || !CATEGORIAS.contains(lembrete.category())) {
            throw erro("Categoria de lembrete inválida.");
        }
    }

    private void validar(Preferences preferencias) {
        if (preferencias.displayName() == null || preferencias.displayName().length() > 100) {
            throw erro("O nome de exibição pode ter até 100 caracteres.");
        }
        if (preferencias.appName() == null || preferencias.appName().length() > 20) {
            throw erro("O nome do aplicativo pode ter até 20 caracteres.");
        }
        if (!TEMAS.contains(String.valueOf(preferencias.theme()))) {
            throw erro("Tema de cor inválido.");
        }
        if (!MODOS.contains(String.valueOf(preferencias.mode()))) {
            throw erro("Modo de aparência inválido.");
        }
        if (preferencias.customColor() == null || !preferencias.customColor().matches("#[0-9a-fA-F]{6}")) {
            throw erro("Cor personalizada inválida.");
        }
        if (!BANNERS.contains(String.valueOf(preferencias.headerBanner()))) {
            throw erro("Banner inválido.");
        }
        if (!TEMAS_ICONE.contains(String.valueOf(preferencias.iconTheme()))) {
            throw erro("Tema de ícones inválido.");
        }
        if (!imagemValida(preferencias.photo())) {
            throw erro("Foto de perfil inválida ou grande demais.");
        }
        if (!imagemValida(preferencias.balanceImage())) {
            throw erro("Imagem do card inválida ou grande demais.");
        }
        if (!imagemValida(preferencias.headerImage())) {
            throw erro("Imagem do banner inválida ou grande demais.");
        }
    }

    private void lista(List<?> itens, String nome) {
        if (itens == null || itens.contains(null)) {
            throw erro("Lista de " + nome + " inválida.");
        }
        if (itens.size() > MAX_ITENS) {
            throw erro("Limite de " + nome + " atingido.");
        }
    }

    private void id(Long id) {
        if (id == null) {
            throw erro("Registro sem identificação.");
        }
    }

    private void texto(String valor, String nome, int maximo) {
        if (vazio(valor)) {
            throw erro("Informe " + nome + ".");
        }
        if (valor.length() > maximo) {
            throw erro(maiuscula(nome) + " pode ter até " + maximo + " caracteres.");
        }
    }

    private void positivo(BigDecimal valor, String nome) {
        if (valor == null) {
            throw erro("Informe " + nome + ".");
        }
        if (valor.signum() <= 0) {
            throw erro(maiuscula(nome) + " precisa ser maior que zero.");
        }
        limite(valor, nome);
    }

    private void naoNegativo(BigDecimal valor, String nome) {
        if (valor == null) {
            throw erro("Informe " + nome + ".");
        }
        if (valor.signum() < 0) {
            throw erro(maiuscula(nome) + " não pode ter valor negativo.");
        }
        limite(valor, nome);
    }

    private void limite(BigDecimal valor, String nome) {
        if (valor.compareTo(VALOR_MAXIMO) > 0) {
            throw erro(maiuscula(nome) + " está acima do limite permitido.");
        }
    }

    /** Opcional: registros antigos não têm o mês do último pagamento. */
    private void mesDePagamento(String mes) {
        if (mes != null && !mes.matches("[0-9]{4}-(0[1-9]|1[0-2])")) {
            throw erro("Mês de pagamento inválido.");
        }
    }

    private void diaDoMes(int dia, String nome) {
        if (dia < 1 || dia > 31) {
            throw erro("O dia de vencimento " + nome + " precisa ser de 1 a 31.");
        }
    }

    /** Aceita vazio (sem imagem) ou uma data URL em base64 de um formato conhecido. */
    private boolean imagemValida(String imagem) {
        if (imagem == null) {
            return false;
        }
        if (imagem.isEmpty()) {
            return true;
        }
        if (imagem.length() > MAX_IMAGEM) {
            return false;
        }
        for (String formato : FORMATOS_IMAGEM) {
            if (imagem.startsWith(formato)) {
                return base64(imagem, formato.length());
            }
        }
        return false;
    }

    private boolean base64(String valor, int inicio) {
        if (valor.length() == inicio) {
            return false;
        }
        for (int i = inicio; i < valor.length(); i++) {
            char c = valor.charAt(i);
            boolean valido = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
                    || c == '+' || c == '/' || c == '=';
            if (!valido) {
                return false;
            }
        }
        return true;
    }

    private String maiuscula(String texto) {
        return texto.substring(0, 1).toUpperCase() + texto.substring(1);
    }

    private boolean vazio(String valor) {
        return valor == null || valor.trim().isEmpty();
    }

    private ResponseStatusException erro(String mensagem) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensagem);
    }
}
