package com.example.expensebackend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component; // ഈ import line അത്യാവശ്യമാണ്

@Component // Spring-ന് ഈ ക്ലാസ് ഉപയോഗിക്കാൻ വേണ്ടത്
public class RestAuthenticationSuccessHandler implements AuthenticationSuccessHandler {
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        // റീഡയറക്ട് ഒഴിവാക്കി 200 OK റെസ്പോൺസ് നൽകുന്നു
        response.setStatus(HttpServletResponse.SC_OK);
    }
}