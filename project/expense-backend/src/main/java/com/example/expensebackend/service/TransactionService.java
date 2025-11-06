package com.example.expensebackend.service;

import com.example.expensebackend.model.Transaction;
import com.example.expensebackend.repository.TransactionRepository;
import com.example.expensebackend.repository.CategoryRepository;
import com.example.expensebackend.repository.GoalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final GoalRepository goalRepository;

    public TransactionService(TransactionRepository transactionRepository, CategoryRepository categoryRepository, GoalRepository goalRepository) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.goalRepository = goalRepository;
    }

    public List<Transaction> findAllByUserId(Integer userId) {
        return transactionRepository.findAllByUserId(userId);
    }

    public Optional<Transaction> findById(Long id, Integer userId) {
        return transactionRepository.findById(id, userId);
    }

    @Transactional
    public Transaction save(Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    @Transactional
    public Transaction update(Transaction transaction, Integer userId) {
        transaction.setUserId(userId);
        transactionRepository.update(transaction);
        return transaction;
    }

    @Transactional
    public void deleteById(Long id, Integer userId) {
        transactionRepository.deleteById(id, userId);
    }
}