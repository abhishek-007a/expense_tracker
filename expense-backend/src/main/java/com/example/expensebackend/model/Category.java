package com.example.expensebackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Data
@Table("categories")
public class Category {
    @Id
    private Long id;
    private Integer userId;
    private String name;
    private double budget;
    private String icon;
    private String color;
}