package com.example.expensebackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;
import java.time.LocalDate;

@Data
@Table("transactions")
public class Transaction {
    @Id
    private Long id;
    private Integer userId;
    private Long categoryId;
    private Long goalId; // Can be null, so use wrapper Long
    private String type;
    private double amount;
    private String description;
    private LocalDate transactionDate;

    // We'll add these fields for the frontend, but they aren't in the DB
    @org.springframework.data.annotation.Transient
    private String category;
    @org.springframework.data.annotation.Transient
    private String icon;
}