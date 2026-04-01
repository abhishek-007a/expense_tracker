package com.example.expensebackend.repository;

import com.example.expensebackend.model.Goal;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.sql.Date;
import java.util.List;

@Repository
public class GoalRepository {

    private final JdbcClient jdbcClient;

    private final RowMapper<Goal> goalRowMapper = (rs, rowNum) -> {
        Goal goal = new Goal();
        goal.setId(rs.getLong("id"));
        goal.setUserId(rs.getInt("user_id"));
        goal.setName(rs.getString("name"));
        goal.setTargetAmount(rs.getDouble("target_amount"));
        goal.setMonthlyContribution(rs.getDouble("monthly_contribution"));
        goal.setTargetDate(rs.getDate("target_date").toLocalDate());
        return goal;
    };

    public Optional<Goal> findById(Long id, Integer userId) {
        String sql = "SELECT * FROM goals WHERE id = ? AND user_id = ?";
        return jdbcClient.sql(sql)
                .params(id, userId)
                .query(goalRowMapper)
                .optional();
    }


    public GoalRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<Goal> findAllByUserId(Integer userId) {
        String sql = "SELECT * FROM goals WHERE user_id = ?";
        return jdbcClient.sql(sql)
                .param(userId)
                .query(goalRowMapper)
                .list();
    }

    public Goal save(Goal goal) {
        String sql = "INSERT INTO goals (user_id, name, target_amount, monthly_contribution, target_date) VALUES (?, ?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcClient.sql(sql)
                .params(
                        goal.getUserId(),
                        goal.getName(),
                        goal.getTargetAmount(),
                        goal.getMonthlyContribution(),
                        Date.valueOf(goal.getTargetDate())
                )
                .update(keyHolder, "id");

        goal.setId(keyHolder.getKey().longValue());
        return goal;
    }

    public void update(Goal goal) {
        String sql = "UPDATE goals SET name = ?, target_amount = ?, monthly_contribution = ?, target_date = ? WHERE id = ? AND user_id = ?";

        jdbcClient.sql(sql)
                .params(
                        goal.getName(),
                        goal.getTargetAmount(),
                        goal.getMonthlyContribution(),
                        Date.valueOf(goal.getTargetDate()),
                        goal.getId(),
                        goal.getUserId()
                )
                .update();
    }

    public void deleteById(Long id, Integer userId) {
        String sql = "DELETE FROM goals WHERE id = ? AND user_id = ?";

        jdbcClient.sql(sql)
                .params(id, userId)
                .update();
    }
}