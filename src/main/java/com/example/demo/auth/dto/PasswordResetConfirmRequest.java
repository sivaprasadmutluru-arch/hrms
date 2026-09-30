package com.example.demo.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordResetConfirmRequest {
    @NotBlank
    private String token;

    @NotBlank
    @Size(min = 8, max = 128)
    private String newPassword;
}
