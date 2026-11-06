package com.example.demo.billing;
public class BillingFailure extends RuntimeException {
    private final int status;
    public BillingFailure(int status, String message) { super(message); this.status=status; }
    public int status() { return status; }
}
