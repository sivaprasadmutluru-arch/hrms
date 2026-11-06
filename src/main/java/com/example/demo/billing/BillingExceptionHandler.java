package com.example.demo.billing;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import java.util.Map;
@RestControllerAdvice @Order(-1)
public class BillingExceptionHandler {
    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class, jakarta.validation.ConstraintViolationException.class})
    public ResponseEntity<?> invalid(Exception e) { return ResponseEntity.badRequest().body(Map.of("status",400,"message","Invalid billing request")); }
    @ExceptionHandler(BillingFailure.class)
    public ResponseEntity<?> handle(BillingFailure e) { return ResponseEntity.status(e.status()).body(Map.of("status",e.status(),"message",e.getMessage())); }
}
