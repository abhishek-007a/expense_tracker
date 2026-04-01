package com.example.expensebackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;
import java.time.LocalDate;

@Data
@Table("goals")
public class Goal {
    @Id
    private Long id;
    private Integer userId;
    private String name;
    private double targetAmount;
    private double monthlyContribution;
    private LocalDate targetDate;

    // This field is calculated, not stored.
    @org.springframework.data.annotation.Transient
    private double saved;
}