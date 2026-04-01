package com.example.expensebackend.service;

import com.example.expensebackend.model.Category;
import com.example.expensebackend.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> findAllByUserId(Integer userId) {
        return categoryRepository.findAllByUserId(userId);
    }

    public Optional<Category> findById(Long id, Integer userId) {
        return categoryRepository.findById(id, userId);
    }

    @Transactional
    public Category save(Category category) {
        return categoryRepository.save(category);
    }

    @Transactional
    public Category update(Category category) {
        categoryRepository.update(category);
        return category;
    }

    @Transactional
    public void deleteById(Long id, Integer userId) {
        categoryRepository.deleteById(id, userId);
    }
}