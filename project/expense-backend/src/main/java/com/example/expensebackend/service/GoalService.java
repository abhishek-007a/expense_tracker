package com.example.expensebackend.service;

import com.example.expensebackend.model.Goal;
import com.example.expensebackend.repository.GoalRepository;
import com.example.expensebackend.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GoalService {

    private final GoalRepository goalRepository;
    private final TransactionRepository transactionRepository;

    public GoalService(GoalRepository goalRepository, TransactionRepository transactionRepository) {
        this.goalRepository = goalRepository;
        this.transactionRepository = transactionRepository;
    }

    public List<Goal> findAllByUserId(Integer userId) {
        List<Goal> goals = goalRepository.findAllByUserId(userId);

        // GoalProgress
        return goals.stream().map(goal -> {
            Double savedAmount = transactionRepository.getGoalProgress(goal.getId(), userId);

            // NullPointerException
            goal.setSaved(savedAmount != null ? savedAmount : 0.0);

            return goal;
        }).collect(Collectors.toList());
    }

    public Goal save(Goal goal) {
        return goalRepository.save(goal);
    }

    public void update(Goal goal) {
        goalRepository.update(goal);
    }

    public void deleteById(Long id, Integer userId) {
        goalRepository.deleteById(id, userId);
    }
}