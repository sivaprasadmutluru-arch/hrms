package com.example.demo.common.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(HttpStatus.NOT_FOUND.value(), ex.getMessage()));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(HttpStatus.UNAUTHORIZED.value(), "Invalid username or password"));
    }

    @ExceptionHandler(LoginHeldException.class)
    public ResponseEntity<Map<String,Object>> handleLoginHeld(LoginHeldException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "status", 401, "code", "ACCOUNT_ON_HOLD", "message", ex.getMessage()));
    }

    @ExceptionHandler({DisabledException.class, LockedException.class})
    public ResponseEntity<ErrorResponse> handleDisabledOrLocked(Exception ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(HttpStatus.UNAUTHORIZED.value(), ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(HttpStatus.FORBIDDEN.value(), "Access denied"));
    }

    private ResponseEntity<Map<String,Object>> invalid(Map<String,String> errors) {
        var body=new java.util.LinkedHashMap<String,Object>();
        body.put("status",400);body.put("message","Please correct the highlighted fields.");
        body.put("errors",errors);body.put("timestamp",LocalDateTime.now());
        return ResponseEntity.badRequest().body(body);
    }
    private String label(String field) {
        if(field==null || field.isBlank())return "Value";
        if(field.equals("employeeRange"))return "Organization size";
        String text=field.replaceAll("([a-z])([A-Z])","$1 $2").replace('_',' ');
        return Character.toUpperCase(text.charAt(0))+text.substring(1);
    }
    private String fieldMessage(String field,String message) {
        if(message==null)return "Check "+label(field).toLowerCase(java.util.Locale.ROOT)+".";
        if(java.util.Set.of("must not be blank","must not be null","must not be empty").contains(message))return label(field)+" is required.";
        return message;
    }
    @ExceptionHandler(org.springframework.validation.BindException.class)
    public ResponseEntity<Map<String,Object>> handleValidation(org.springframework.validation.BindException ex) {
        Map<String,String> errors=new java.util.LinkedHashMap<>();
        ex.getBindingResult().getAllErrors().forEach(e->{
            String field=e instanceof FieldError f ? f.getField() : "_global";
            errors.putIfAbsent(field,fieldMessage(field,e.getDefaultMessage()));
        });
        return invalid(errors);
    }
    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<Map<String,Object>> handleConstraint(jakarta.validation.ConstraintViolationException ex) {
        Map<String,String> errors=new java.util.LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v->{String field=v.getPropertyPath().toString();field=field.substring(field.lastIndexOf('.')+1);errors.putIfAbsent(field,fieldMessage(field,v.getMessage()));});
        return invalid(errors);
    }
    @ExceptionHandler(org.springframework.web.method.annotation.HandlerMethodValidationException.class)
    public ResponseEntity<Map<String,Object>> handleMethodValidation(org.springframework.web.method.annotation.HandlerMethodValidationException ex) {
        if(ex.isForReturnValue()) {
            log.error("Server response validation failed",ex);
            return ResponseEntity.status(500).body(Map.of("status",500,"message","An unexpected error occurred. Please contact support."));
        }
        Map<String,String> errors=new java.util.LinkedHashMap<>();
        ex.getAllValidationResults().forEach(result->{String field=result.getMethodParameter().getParameterName();if(field==null)field="_global";final String key=field;result.getResolvableErrors().forEach(e->errors.putIfAbsent(key,fieldMessage(key,e.getDefaultMessage())));});
        return invalid(errors);
    }
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<?> handleUnreadable(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        Throwable cause=ex;while(cause!=null){
            if(cause instanceof com.fasterxml.jackson.databind.exc.InvalidFormatException format && !format.getPath().isEmpty()) {
                String field=format.getPath().getLast().getFieldName();
                if(field!=null)return invalid(Map.of(field,"Enter a valid value for "+label(field).toLowerCase(java.util.Locale.ROOT)+"."));
            }
            cause=cause.getCause();
        }
        return ResponseEntity.badRequest().body(new ErrorResponse(400,"The request could not be read. Check the submitted values and try again."));
    }
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String,Object>> handleType(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        return invalid(Map.of(ex.getName(),"Enter a valid value for "+label(ex.getName()).toLowerCase(java.util.Locale.ROOT)+"."));
    }
    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String,Object>> handleMissingParameter(org.springframework.web.bind.MissingServletRequestParameterException ex) {
        return invalid(Map.of(ex.getParameterName(),label(ex.getParameterName())+" is required."));
    }
    @ExceptionHandler(org.springframework.web.bind.MissingRequestHeaderException.class)
    public ResponseEntity<ErrorResponse> handleMissingHeader(org.springframework.web.bind.MissingRequestHeaderException ex) {
        return ResponseEntity.badRequest().body(new ErrorResponse(400,ex.getHeaderName().equalsIgnoreCase("X-Company-Id") ? "Select a company and try again." : "Required request information is missing. Refresh the page and try again."));
    }
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleIntegrity(org.springframework.dao.DataIntegrityViolationException ex) {
        String state=null;for(Throwable cause=ex;cause!=null;cause=cause.getCause())if(cause instanceof java.sql.SQLException sql){state=sql.getSQLState();break;}
        if("23505".equals(state))return ResponseEntity.status(409).body(new ErrorResponse(409,"A record with these details already exists. Check for duplicates."));
        if("23503".equals(state))return ResponseEntity.status(409).body(new ErrorResponse(409,"A related record is missing or still in use. Refresh the page and check linked records."));
        if("23502".equals(state))return ResponseEntity.badRequest().body(new ErrorResponse(400,"Complete all required fields and try again."));
        if("22001".equals(state))return ResponseEntity.badRequest().body(new ErrorResponse(400,"One or more values exceed the allowed length. Shorten them and try again."));
        if("22003".equals(state))return ResponseEntity.badRequest().body(new ErrorResponse(400,"A number is outside the allowed range. Check the amounts and try again."));
        log.error("Unexpected data integrity failure",ex);
        return ResponseEntity.status(500).body(new ErrorResponse(500,"An unexpected error occurred. Please contact support."));
    }
    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleConflict(org.springframework.dao.OptimisticLockingFailureException ex) {
        return ResponseEntity.status(409).body(new ErrorResponse(409,"This record was changed by someone else. Refresh it before saving again."));
    }
    @ExceptionHandler({org.springframework.dao.CannotAcquireLockException.class,org.springframework.dao.QueryTimeoutException.class,org.springframework.dao.DataAccessResourceFailureException.class,org.springframework.transaction.CannotCreateTransactionException.class})
    public ResponseEntity<ErrorResponse> handleBusy(Exception ex) {
        log.warn("Database temporarily unavailable",ex);
        return ResponseEntity.status(503).body(new ErrorResponse(503,"The service is temporarily unavailable. Check whether your changes were saved before trying again."));
    }
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleLargeUpload(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(413).body(new ErrorResponse(413,"The uploaded file is too large. Choose a smaller file."));
    }
    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethod(org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(405).body(new ErrorResponse(405,"This action is not supported for this page."));
    }
    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMedia(org.springframework.web.HttpMediaTypeNotSupportedException ex) {
        return ResponseEntity.status(415).body(new ErrorResponse(415,"This file or request format is not supported."));
    }

    @ExceptionHandler(org.springframework.web.multipart.support.MissingServletRequestPartException.class)
    public ResponseEntity<Map<String,Object>> handleMissingPart(org.springframework.web.multipart.support.MissingServletRequestPartException ex) {
        return invalid(Map.of(ex.getRequestPartName(),"Choose a file to upload."));
    }
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleMissingResource(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        return ResponseEntity.status(404).body(new ErrorResponse(404,"This page or record could not be found."));
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoHandler(NoHandlerFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(HttpStatus.NOT_FOUND.value(),
                        "This page or record could not be found."));
    }

    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public void handleBrokenPipe(AsyncRequestNotUsableException ex) {
        // Client disconnected mid-transfer (broken pipe) — nothing to respond to, suppress noisy logging
        log.debug("Client disconnected before response was fully written: {}", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        log.error("Unhandled server exception: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "An unexpected error occurred. Please contact support."));
    }

    public record ErrorResponse(int status, String message) {
        public LocalDateTime timestamp() { return LocalDateTime.now(); }
    }
}
