package com.example.expensebackend.service;

import com.example.expensebackend.model.User;
import com.example.expensebackend.repository.UserRepository;
import com.example.expensebackend.model.Category;
import com.example.expensebackend.repository.CategoryRepository;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CategoryRepository categoryRepository;

    public AuthService(UserRepository userRepository, CategoryRepository categoryRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public com.example.expensebackend.model.User register(String name, String email, String password) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already in use");
        }

        String hashedPassword = passwordEncoder.encode(password);

        com.example.expensebackend.model.User newUser = new com.example.expensebackend.model.User();
        newUser.setName(name);
        newUser.setEmail(email);
        newUser.setPassword(hashedPassword);
        newUser = userRepository.save(newUser);

        createDefaultCategories(newUser.getId());

        return newUser;
    }

    private void createDefaultCategories(Integer userId) {
        // Income കാറ്റഗറി
        Category income = new Category();
        income.setUserId(userId);
        income.setName("Income");
        income.setBudget(0.0);
        income.setIcon("fa-money-bill-wave");
        income.setColor("#10b981");
        categoryRepository.save(income);

        // Food കാറ്റഗറി
        Category food = new Category();
        food.setUserId(userId);
        food.setName("Food");
        food.setBudget(5000.00);
        food.setIcon("fa-utensils");
        food.setColor("#ef4444");
        categoryRepository.save(food);

        // (ഇവിടെ ആവശ്യമായ മറ്റ് ഡിഫോൾട്ട് കാറ്റഗറികൾ ചേർക്കുക)
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        com.example.expensebackend.model.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        List<GrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }
}