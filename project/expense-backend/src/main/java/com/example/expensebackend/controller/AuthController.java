package com.example.expensebackend.controller;

import com.example.expensebackend.model.User;
import com.example.expensebackend.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;


    @Autowired
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    //  (Sign Up)
    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody User registrationRequest) {
        try {
            User registeredUser = authService.register(
                    registrationRequest.getName(),
                    registrationRequest.getEmail(),
                    registrationRequest.getPassword()
            );

            registeredUser.setPassword(null);
            return new ResponseEntity<>(registeredUser, HttpStatus.CREATED);
        } catch (RuntimeException e) {

            if (e.getMessage().contains("Email already in use")) {
                return new ResponseEntity<>(HttpStatus.CONFLICT);
            }

            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // /api/login



    @GetMapping("/user/me")
    public ResponseEntity<User> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {


        User currentUser = new User();
        if (userDetails != null) {
            currentUser.setEmail(userDetails.getUsername());

            currentUser.setName(userDetails.getUsername().split("@")[0]);
        }
        return ResponseEntity.ok(currentUser);
    }
}