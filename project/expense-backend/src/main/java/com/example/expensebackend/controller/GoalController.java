package com.example.expensebackend.controller;

import com.example.expensebackend.model.Goal;
import com.example.expensebackend.model.User;
import com.example.expensebackend.repository.UserRepository;
import com.example.expensebackend.service.GoalService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService goalService;
    private final UserRepository userRepository;

    public GoalController(GoalService goalService, UserRepository userRepository) {
        this.goalService = goalService;
        this.userRepository = userRepository;
    }

    private Integer getUserId(UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    @GetMapping
    public ResponseEntity<List<Goal>> getGoals(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(goalService.findAllByUserId(getUserId(userDetails)));
    }

    @PostMapping
    public ResponseEntity<Goal> addGoal(@RequestBody Goal goal, @AuthenticationPrincipal UserDetails userDetails) {
        goal.setUserId(getUserId(userDetails));
        Goal savedGoal = goalService.save(goal);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedGoal);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Goal> updateGoal(@PathVariable Long id, @RequestBody Goal goal, @AuthenticationPrincipal UserDetails userDetails) {
        Integer userId = getUserId(userDetails);
        goal.setId(id);
        goal.setUserId(userId);
        goalService.update(goal);
        return ResponseEntity.ok(goal);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        goalService.deleteById(id, getUserId(userDetails));
        return ResponseEntity.noContent().build();
    }
}