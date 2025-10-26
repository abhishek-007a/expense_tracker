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

    // AuthService മാത്രമേ ഇവിടെ ആവശ്യപ്പെടുന്നുള്ളൂ
    @Autowired
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // രജിസ്ട്രേഷൻ (Sign Up) ലോജിക്
    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody User registrationRequest) {
        try {
            User registeredUser = authService.register(
                    registrationRequest.getName(),
                    registrationRequest.getEmail(),
                    registrationRequest.getPassword()
            );
            // സുരക്ഷയ്ക്ക് വേണ്ടി പാസ്‌വേർഡ് ഹാഷ് null ആക്കി തിരികെ അയക്കുന്നു
            registeredUser.setPassword(null);
            return new ResponseEntity<>(registeredUser, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            // ഇമെയിൽ നിലവിലുണ്ടെങ്കിൽ 409 Conflict നൽകുന്നു
            if (e.getMessage().contains("Email already in use")) {
                return new ResponseEntity<>(HttpStatus.CONFLICT);
            }
            // മറ്റ് പിശകുകൾ വന്നാൽ 500 Internal Server Error നൽകുന്നു
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // /api/login എൻഡ്‌പോയിന്റ് Spring Security സ്വയം കൈകാര്യം ചെയ്യും.
    // ഇവിടെ കസ്റ്റം കോഡ് ആവശ്യമില്ല.

    // നിലവിലെ യൂസർ ഡീറ്റെയിൽസ് എടുക്കാനുള്ള എൻഡ്‌പോയിന്റ്
    @GetMapping("/user/me")
    public ResponseEntity<User> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        // ഇവിടെ userDetails.getUsername() (ഇമെയിൽ) ഉപയോഗിച്ച് യൂസറെ കണ്ടെത്തണം.
        // തൽക്കാലം ഡമ്മി വിവരങ്ങൾ നൽകുന്നു.
        User currentUser = new User();
        if (userDetails != null) {
            currentUser.setEmail(userDetails.getUsername());
            // ഡാറ്റാബേസിൽ നിന്ന് പേര് എടുക്കാനുള്ള ലോജിക്ക് ചേർക്കുക
            currentUser.setName(userDetails.getUsername().split("@")[0]);
        }
        return ResponseEntity.ok(currentUser);
    }
}