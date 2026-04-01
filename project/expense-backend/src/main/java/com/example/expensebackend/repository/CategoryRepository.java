package com.example.expensebackend.repository;

import com.example.expensebackend.model.Category;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional; // findById

@Repository
public class CategoryRepository {

    private final JdbcClient jdbcClient;

    // RowMapper:
    private final RowMapper<Category> categoryRowMapper = (rs, rowNum) -> {
        Category category = new Category();
        // ID Long
        category.setId(rs.getLong("id"));
        category.setUserId(rs.getInt("user_id"));
        category.setName(rs.getString("name"));
        category.setBudget(rs.getDouble("budget"));
        category.setIcon(rs.getString("icon"));
        category.setColor(rs.getString("color"));
        return category;
    };

    public CategoryRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }


    public List<Category> findAllByUserId(Integer userId) {
        String sql = "SELECT id, user_id, name, budget, icon, color FROM categories WHERE user_id = ?";
        return jdbcClient.sql(sql)
                .param(userId)
                .query(categoryRowMapper)
                .list();
    }

    // ഒരു പ്രത്യേക കാറ്റഗറി കണ്ടെത്താൻ (CategoryService-ന് വേണ്ടി)
    public Optional<Category> findById(Long id, Integer userId) {
        String sql = "SELECT id, user_id, name, budget, icon, color FROM categories WHERE id = ? AND user_id = ?";
        return jdbcClient.sql(sql)
                .params(id, userId)
                .query(categoryRowMapper)
                .optional();
    }


    public Category save(Category category) {
        String sql = "INSERT INTO categories (user_id, name, budget, icon, color) VALUES (?, ?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcClient.sql(sql)
                .params(
                        category.getUserId(),
                        category.getName(),
                        category.getBudget(),
                        category.getIcon(),
                        category.getColor()
                )
                .update(keyHolder, "id");


        category.setId(keyHolder.getKey().longValue());
        return category;
    }


    public void update(Category category) {
        String sql = "UPDATE categories SET name = ?, budget = ?, icon = ?, color = ? WHERE id = ? AND user_id = ?";

        jdbcClient.sql(sql)
                .params(
                        category.getName(),
                        category.getBudget(),
                        category.getIcon(),
                        category.getColor(),
                        category.getId(),
                        category.getUserId()
                )
                .update();
    }


    public void deleteById(Long id, Integer userId) {
        String sql = "DELETE FROM categories WHERE id = ? AND user_id = ?";

        jdbcClient.sql(sql)
                .params(id, userId)
                .update();
    }
}