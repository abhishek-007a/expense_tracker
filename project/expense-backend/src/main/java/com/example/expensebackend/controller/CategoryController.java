package com.example.expensebackend.controller;

import com.example.expensebackend.model.Category;
import com.example.expensebackend.model.User;
import com.example.expensebackend.repository.UserRepository;
import com.example.expensebackend.service.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final UserRepository userRepository; // Need this to find the user ID

    public CategoryController(CategoryService categoryService, UserRepository userRepository) {
        this.categoryService = categoryService;
        this.userRepository = userRepository;
    }

    // Helper to get the authenticated user's ID
    private Integer getUserId(UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    @GetMapping
    public ResponseEntity<List<Category>> getCategories(@AuthenticationPrincipal UserDetails userDetails) {
        Integer userId = getUserId(userDetails);
        return ResponseEntity.ok(categoryService.findAllByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<Category> addCategory(@RequestBody Category category, @AuthenticationPrincipal UserDetails userDetails) {
        category.setUserId(getUserId(userDetails));
        Category savedCategory = categoryService.save(category);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedCategory);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Category> updateCategory(@PathVariable Long id, @RequestBody Category category, @AuthenticationPrincipal UserDetails userDetails) {
        Integer userId = getUserId(userDetails);
        category.setId(id);
        category.setUserId(userId);
        categoryService.update(category);
        return ResponseEntity.ok(category);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        categoryService.deleteById(id, getUserId(userDetails));
        return ResponseEntity.noContent().build();
    }
}