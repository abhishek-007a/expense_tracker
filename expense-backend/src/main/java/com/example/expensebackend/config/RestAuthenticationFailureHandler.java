package com.example.expensebackend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component; // ഈ import line അത്യാവശ്യമാണ്

@Component // Spring-ന് ഈ ക്ലാസ് ഉപയോഗിക്കാൻ വേണ്ടത്
public class RestAuthenticationFailureHandler implements AuthenticationFailureHandler {
    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws java.io.IOException {
        // 401 Unauthorized റെസ്പോൺസ് നൽകുന്നു
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"Invalid email or password.\"}");
    }
}