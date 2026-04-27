package com.example.demo.auth.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class LoginResponse {
    private final String token;
    private final String tokenType = "Bearer";
    private final Long userId;
    private final String username;
    private final String email;
    private final List<String> roles;
    private final Long companyId;
    private final String companyName;
    private final Long employeeId;

    public LoginResponse(String token, Long userId, String username, String email, List<String> roles, Long companyId, String companyName, Long employeeId) {
        this.token = token;
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.roles = roles;
        this.companyId = companyId;
        this.companyName = companyName;
        this.employeeId = employeeId;
    }
}
