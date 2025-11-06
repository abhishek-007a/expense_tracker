package com.example.expensebackend.controller;

import com.example.expensebackend.model.Transaction;
import com.example.expensebackend.model.User;
import com.example.expensebackend.repository.UserRepository;
import com.example.expensebackend.service.TransactionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final UserRepository userRepository;

    public TransactionController(TransactionService transactionService, UserRepository userRepository) {
        this.transactionService = transactionService;
        this.userRepository = userRepository;
    }

    private Integer getUserId(UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    @GetMapping
    public ResponseEntity<List<Transaction>> getTransactions(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(transactionService.findAllByUserId(getUserId(userDetails)));
    }

    @PostMapping
    public ResponseEntity<Transaction> addTransaction(@RequestBody Transaction transaction, @AuthenticationPrincipal UserDetails userDetails) {
        transaction.setUserId(getUserId(userDetails));
        Transaction savedTransaction = transactionService.save(transaction);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedTransaction);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Transaction> updateTransaction(@PathVariable Long id, @RequestBody Transaction transaction, @AuthenticationPrincipal UserDetails userDetails) {
        Integer userId = getUserId(userDetails);
        transaction.setId(id);
        Transaction updatedTransaction = transactionService.update(transaction, userId);
        return ResponseEntity.ok(updatedTransaction);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        transactionService.deleteById(id, getUserId(userDetails));
        return ResponseEntity.noContent().build();
    }
}