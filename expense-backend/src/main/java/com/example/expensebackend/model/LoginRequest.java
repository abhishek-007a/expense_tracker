package com.example.expensebackend.model;

public class LoginRequest {

    private String username; // ഫ്രണ്ട്എൻഡ് അയക്കുന്ന ഇമെയിലിനെ സൂചിപ്പിക്കുന്നു
    private String password;

    // Getters and Setters

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}