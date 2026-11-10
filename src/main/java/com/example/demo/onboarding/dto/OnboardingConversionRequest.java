package com.example.demo.onboarding.dto;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;import lombok.Setter;import java.time.LocalDate;
@Getter @Setter public class OnboardingConversionRequest {
 @NotNull private LocalDate dateJoining;
 @NotNull private Long departmentId;
 @NotNull private Long jobPositionId;
 private Long jobRoleId;private Long shiftId;private Long reportingManagerId;
}
