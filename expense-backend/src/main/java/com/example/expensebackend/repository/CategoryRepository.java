package com.example.expensebackend.repository;

import com.example.expensebackend.model.Category;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional; // findById നായി ഇത് ആവശ്യമാണ്

@Repository
public class CategoryRepository {

    private final JdbcClient jdbcClient;

    // RowMapper: ഡാറ്റാബേസ് ഫലങ്ങളെ Category ഒബ്ജക്റ്റാക്കി മാറ്റുന്നു
    private final RowMapper<Category> categoryRowMapper = (rs, rowNum) -> {
        Category category = new Category();
        // ID Long ടൈപ്പായതുകൊണ്ട് setUserId Integer ആക്കി മാറ്റേണ്ടി വരും
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

    // ഡാഷ്‌ബോർഡിന് വേണ്ടി എല്ലാ കാറ്റഗറികളും കണ്ടെത്താൻ
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

    // പുതിയ കാറ്റഗറി സേവ് ചെയ്യാൻ (AuthService, CategoryService-ന് വേണ്ടി)
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

        // സേവ് ചെയ്ത ശേഷം generated ID ഒബ്ജക്റ്റിലേക്ക് തിരികെ ചേർക്കുന്നു
        category.setId(keyHolder.getKey().longValue());
        return category;
    }

    // കാറ്റഗറി അപ്ഡേറ്റ് ചെയ്യാൻ
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

    // കാറ്റഗറി ഡിലീറ്റ് ചെയ്യാൻ
    public void deleteById(Long id, Integer userId) {
        String sql = "DELETE FROM categories WHERE id = ? AND user_id = ?";

        jdbcClient.sql(sql)
                .params(id, userId)
                .update();
    }
}