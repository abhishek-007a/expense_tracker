```java
package com.example.expensebackend.repository;

import com.example.expensebackend.model.Transaction;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.util.List;
import java.util.Optional;

@Repository
public class TransactionRepository {

    private final JdbcClient jdbcClient;

    public TransactionRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    private final RowMapper<Transaction> transactionRowMapper = (rs, rowNum) -> {
        Transaction transaction = new Transaction();

        transaction.setId(rs.getLong("id"));
        transaction.setUserId(rs.getInt("user_id"));
        transaction.setCategoryId(rs.getLong("category_id"));

        long goalId = rs.getLong("goal_id");
        transaction.setGoalId(rs.wasNull() ? null : goalId);

        transaction.setType(rs.getString("type"));
        transaction.setAmount(rs.getDouble("amount"));
        transaction.setDescription(rs.getString("description"));

        Date transactionDate = rs.getDate("transaction_date");
        if (transactionDate != null) {
            transaction.setTransactionDate(transactionDate.toLocalDate());
        }

        transaction.setCategory(rs.getString("category_name"));
        transaction.setIcon(rs.getString("category_icon"));

        return transaction;
    };

    public List<Transaction> findAllByUserId(Integer userId) {
        String sql = """
                SELECT t.id,
                       t.user_id,
                       t.category_id,
                       t.goal_id,
                       t.type,
                       t.amount,
                       t.description,
                       t.transaction_date,
                       c.name AS category_name,
                       c.icon AS category_icon
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = ?
                ORDER BY t.transaction_date DESC
                """;

        return jdbcClient.sql(sql)
                .param(userId)
                .query(transactionRowMapper)
                .list();
    }

    public Optional<Transaction> findById(Long id, Integer userId) {
        String sql = """
                SELECT t.id,
                       t.user_id,
                       t.category_id,
                       t.goal_id,
                       t.type,
                       t.amount,
                       t.description,
                       t.transaction_date,
                       c.name AS category_name,
                       c.icon AS category_icon
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.id = ? AND t.user_id = ?
                """;

        return jdbcClient.sql(sql)
                .params(id, userId)
                .query(transactionRowMapper)
                .optional();
    }

    public Double getGoalProgress(Long goalId, Integer userId) {
        String sql = """
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE goal_id = ?
                  AND user_id = ?
                  AND type = 'income'
                """;

        return jdbcClient.sql(sql)
                .params(goalId, userId)
                .query(Double.class)
                .single();
    }

    public Transaction save(Transaction transaction) {
        String sql = """
                INSERT INTO transactions
                    (user_id, category_id, goal_id, type, amount,
                     description, transaction_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """;

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

        if (keyHolder.getKey() != null) {
            transaction.setId(keyHolder.getKey().longValue());
        }

        return transaction;
    }

    public void update(Transaction transaction) {
        String sql = """
                UPDATE transactions
                SET category_id = ?,
                    goal_id = ?,
                    type = ?,
                    amount = ?,
                    description = ?,
                    transaction_date = ?
                WHERE id = ? AND user_id = ?
                """;

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
        String sql = """
                DELETE FROM transactions
                WHERE id = ? AND user_id = ?
                """;

        jdbcClient.sql(sql)
                .params(id, userId)
                .update();
    }
}
```
