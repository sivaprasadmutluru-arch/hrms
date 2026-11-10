package com.example.demo.recruitment.dto;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;
@Getter @Setter
public class CandidateApplicationRequest {
 @NotBlank @Size(max=200) private String name;
 @NotBlank @Email @Size(max=254) private String email;
 @Size(max=40) private String phone;
 private boolean consent;
 @Size(max=200) private String website; // honeypot, never stored
 private MultipartFile resume;
}
