package com.example.expensebackend.repository;

import com.example.expensebackend.model.Transaction;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.util.List;
import java.util.Optional; // findById മെത്തേഡിന് ഇത് ആവശ്യമാണ്

@Repository
public class TransactionRepository {

    private final JdbcClient jdbcClient;

    private final RowMapper<Transaction> transactionRowMapper = (rs, rowNum) -> {
        Transaction transaction = new Transaction();
        transaction.setId(rs.getLong("t.id"));
        transaction.setUserId(rs.getInt("t.user_id"));
        transaction.setCategoryId(rs.getLong("t.category_id"));
        transaction.setGoalId(rs.getLong("t.goal_id"));
        if (rs.wasNull()) {
            transaction.setGoalId(null);
        }
        transaction.setType(rs.getString("t.type"));
        transaction.setAmount(rs.getDouble("t.amount"));
        transaction.setDescription(rs.getString("t.description"));
        transaction.setTransactionDate(rs.getDate("t.transaction_date").toLocalDate());

        transaction.setCategory(rs.getString("c.name"));
        transaction.setIcon(rs.getString("c.icon"));
        return transaction;
    };

    public TransactionRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<Transaction> findAllByUserId(Integer userId) {
        String sql = "SELECT t.*, c.name, c.icon FROM transactions t " +
                "JOIN categories c ON t.category_id = c.id " +
                "WHERE t.user_id = ? ORDER BY t.transaction_date DESC";

        return jdbcClient.sql(sql)
                .param(userId)
                .query(transactionRowMapper)
                .list();
    }

    // -----------------------------------------------------------
    // *TransactionService-ന് ആവശ്യമായ findById മെത്തേഡ് ചേർക്കുന്നു*
    // -----------------------------------------------------------
    public Optional<Transaction> findById(Long id, Integer userId) {
        String sql = "SELECT t.*, c.name, c.icon FROM transactions t " +
                "JOIN categories c ON t.category_id = c.id " +
                "WHERE t.id = ? AND t.user_id = ?";

        return jdbcClient.sql(sql)
                .params(id, userId)
                .query(transactionRowMapper)
                .optional();
    }
    // -----------------------------------------------------------

    public Double getGoalProgress(Long goalId, Integer userId) {
        String sql = "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE goal_id = ? AND user_id = ? AND type = 'income'";

        return jdbcClient.sql(sql)
                .params(goalId, userId)
                .query(Double.class)
                .single();
    }

    public Transaction save(Transaction transaction) {
        String sql = "INSERT INTO transactions (user_id, category_id, goal_id, type, amount, description, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcClient.sql(sql)
                .params(
                        transaction.getUserId(),
                        transaction.getCategoryId(),
                        transaction.getGoalId(),
                        transaction.getType(),
                        transaction.getAmount(),
                        transaction.getDescription(),
                        Date.valueOf(transaction.getTransactionDate())
                )
                .update(keyHolder, "id");

        transaction.setId(keyHolder.getKey().longValue());
        return transaction;
    }

    public void update(Transaction transaction) {
        String sql = "UPDATE transactions SET category_id = ?, goal_id = ?, type = ?, amount = ?, description = ?, transaction_date = ? WHERE id = ? AND user_id = ?";

        jdbcClient.sql(sql)
                .params(
                        transaction.getCategoryId(),
                        transaction.getGoalId(),
                        transaction.getType(),
                        transaction.getAmount(),
                        transaction.getDescription(),
                        Date.valueOf(transaction.getTransactionDate()),
                        transaction.getId(),
                        transaction.getUserId()
                )
                .update();
    }

    public void deleteById(Long id, Integer userId) {
        String sql = "DELETE FROM transactions WHERE id = ? AND user_id = ?";

        jdbcClient.sql(sql)
                .params(id, userId)
                .update();
    }
}