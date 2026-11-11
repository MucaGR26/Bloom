package br.com.bloom.api.data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Tudo o que o Bloom guarda de um usuário. As regras de cada campo ficam em DataService.
 * Precisa ter os mesmos campos da interface BloomData do Angular (expense.model.ts).
 */
public record BloomData(
        BigDecimal salary,
        BigDecimal savingsGoal,
        List<FixedExpense> fixedExpenses,
        List<Expense> expenses,
        List<Installment> installments,
        List<Debt> debts,
        List<Dream> dreams,
        List<Reminder> reminders,
        boolean emergencyMode,
        Preferences preferences) {

    public record FixedExpense(Long id, String name, BigDecimal amount) {
    }

    public record Expense(Long id, String description, String category, BigDecimal amount, LocalDate date) {
    }

    public record Installment(
            Long id,
            String description,
            BigDecimal installmentAmount,
            int paidCount,
            int totalCount,
            String lastPaidMonth,
            Integer paidInLastMonth,
            Integer dueDay,
            String color) {
    }

    public record Debt(
            Long id,
            String creditor,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal interestRate,
            BigDecimal monthlyPayment,
            int dueDay,
            String lastPaidMonth,
            BigDecimal paidInLastMonth) {
    }

    public record Dream(
            Long id,
            String name,
            String icon,
            BigDecimal targetAmount,
            BigDecimal savedAmount,
            String targetDate,
            String image) {
    }

    public record Reminder(Long id, String name, BigDecimal amount, int dueDay, String category, boolean paid) {
    }

    public record Preferences(
            String displayName,
            String appName,
            String theme,
            String mode,
            String customColor,
            String photo,
            String balanceImage,
            String headerBanner,
            String headerImage,
            String iconTheme,
            boolean secretAdventure,
            boolean secretLogo,
            Boolean alarmSound) {
    }
}
