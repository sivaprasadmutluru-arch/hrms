package com.example.demo.common.exception;

public class LoginHeldException extends org.springframework.security.authentication.DisabledException {
    public LoginHeldException() {
        super("Your account is on hold. Please contact HR.");
    }
}
