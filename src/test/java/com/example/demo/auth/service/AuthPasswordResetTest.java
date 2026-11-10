package com.example.demo.auth.service;

import com.example.demo.auth.entity.User;
import com.example.demo.auth.repository.*;
import com.example.demo.auth.security.JwtTokenProvider;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.service.EmailService;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthPasswordResetTest {
 @Mock AuthenticationManager authenticationManager;
 @Mock UserRepository userRepository;
 @Mock RoleRepository roleRepository;
 @Mock UserRoleRepository userRoleRepository;
 @Mock CompanyRepository companyRepository;
 @Mock EmployeeRepository employeeRepository;
 @Mock PasswordEncoder passwordEncoder;
 @Mock JwtTokenProvider jwtTokenProvider;
 @Mock EmployeeCompanyGuard employeeCompanyGuard;
 @Mock EmailService emailService;
 @InjectMocks AuthService service;
 @Test void heldAccountWithCorrectPasswordGetsContactHrMessage() {
  User u=account();u.setUsername("person");u.setPassword("encoded");u.setLoginHeld(true);
  var request=new com.example.demo.auth.dto.LoginRequest();request.setUsernameOrEmail("person");request.setPassword("synthetic-password");
  when(authenticationManager.authenticate(any())).thenThrow(new org.springframework.security.authentication.DisabledException("User is disabled"));
  when(userRepository.findForLogin("person")).thenReturn(Optional.of(u));when(passwordEncoder.matches("synthetic-password","encoded")).thenReturn(true);
  assertThatThrownBy(()->service.login(request)).isInstanceOf(com.example.demo.common.exception.LoginHeldException.class).hasMessage("Your account is on hold. Please contact HR.");
  verifyNoInteractions(jwtTokenProvider);verify(userRepository,never()).save(any());
 }
 @Test void heldAccountWithWrongPasswordDoesNotRevealHoldStatus() {
  User u=account();u.setUsername("person");u.setPassword("encoded");u.setLoginHeld(true);
  var request=new com.example.demo.auth.dto.LoginRequest();request.setUsernameOrEmail("person");request.setPassword("wrong-password");
  when(authenticationManager.authenticate(any())).thenThrow(new org.springframework.security.authentication.DisabledException("User is disabled"));
  when(userRepository.findForLogin("person")).thenReturn(Optional.of(u));when(passwordEncoder.matches("wrong-password","encoded")).thenReturn(false);
  assertThatThrownBy(()->service.login(request)).isExactlyInstanceOf(org.springframework.security.authentication.DisabledException.class);
  verifyNoInteractions(jwtTokenProvider);
 }
 @Test void holdResponseHasStableCodeAndMessage() {
  var response=new com.example.demo.common.exception.GlobalExceptionHandler().handleLoginHeld(new com.example.demo.common.exception.LoginHeldException());
  assertThat(response.getStatusCode().value()).isEqualTo(401);assertThat(response.getBody()).containsEntry("code","ACCOUNT_ON_HOLD").containsEntry("message","Your account is on hold. Please contact HR.");
 }
 private User account() { User u=new User();u.setId(42L);u.setEmail("person@example.test");u.setFirstName("Person");return u; }
 @Test void sendsLinkForTheRegisteredAccountUsingPlatformFallback() {
  User u=account();when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
  when(emailService.hasActiveSmtpConfig(null)).thenReturn(true);
  when(emailService.passwordResetUrl()).thenReturn("http://localhost:5173/forgot-password");
  when(emailService.sendEmail(isNull(),eq(u.getEmail()),anyString(),anyString(),isNull())).thenReturn(true);
  service.requestPasswordReset(u.getEmail());
  assertThat(u.getResetToken()).isNotBlank();assertThat(u.getResetTokenExpiry()).isAfter(LocalDateTime.now());
  verify(emailService).sendEmail(isNull(),eq(u.getEmail()),eq("Reset your AccrueHr password"),contains("?token="+u.getResetToken()),isNull());
 }
 @Test void failedDeliveryDoesNotReportSuccessOrLeaveUsableToken() {
  User u=account();when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));when(emailService.hasActiveSmtpConfig(null)).thenReturn(true);
  assertThatThrownBy(()->service.requestPasswordReset(u.getEmail())).isInstanceOf(BadRequestException.class).hasMessageContaining("Unable to send");
  assertThat(u.getResetToken()).isNull();assertThat(u.getResetTokenExpiry()).isNull();
 }
 @Test void successfulResetConsumesTokenAndAllowsInitialPasswordSetup() {
  User u=account();u.setResetToken("test-token");u.setResetTokenExpiry(LocalDateTime.now().plusMinutes(15));u.setMustChangePassword(true);
  when(userRepository.findByResetToken("test-token")).thenReturn(Optional.of(u));when(passwordEncoder.encode("synthetic-password")).thenReturn("encoded");
  service.resetPassword("test-token","synthetic-password");
  assertThat(u.getPassword()).isEqualTo("encoded");assertThat(u.getResetToken()).isNull();assertThat(u.getResetTokenExpiry()).isNull();assertThat(u.isMustChangePassword()).isFalse();
 }
 @Test void expiredTokenCannotChangePassword() {
  User u=account();u.setResetTokenExpiry(LocalDateTime.now().minusMinutes(1));when(userRepository.findByResetToken("expired")).thenReturn(Optional.of(u));
  assertThatThrownBy(()->service.resetPassword("expired","synthetic-password")).isInstanceOf(BadRequestException.class);verifyNoInteractions(passwordEncoder);
 }
}
