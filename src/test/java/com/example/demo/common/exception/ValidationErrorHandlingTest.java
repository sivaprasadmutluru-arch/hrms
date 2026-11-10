package com.example.demo.common.exception;
import jakarta.validation.Valid;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.validation.*;
import com.example.demo.employee.dto.EmployeeRequest;
import com.example.demo.base.dto.CreateOrganizationRequest;
import java.sql.SQLException;
import java.time.LocalDate;
import java.math.BigDecimal;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.*;

class ValidationErrorHandlingTest {
 MockMvc mvc;
 @RestController static class Probe {
  @PostMapping("/employee") Object employee(@Valid @RequestBody EmployeeRequest request){return java.util.Map.of("ok",true);}
  @GetMapping("/record/{id}") Object record(@PathVariable("id") Long id,@RequestParam("month") String month){return id;}
  @GetMapping("/duplicate") void duplicate(){throw new DataIntegrityViolationException("private SQL details",new SQLException("secret SQL values","23505"));}
  @GetMapping("/unexpected") void unexpected(){throw new IllegalStateException("private password SQL internals");}
  @PostMapping("/upload") void upload(@RequestPart("file") org.springframework.web.multipart.MultipartFile file){}
  @GetMapping("/company") void company(@RequestHeader("X-Company-Id") Long company){}
  @GetMapping("/busy") void busy(){throw new org.springframework.dao.CannotAcquireLockException("SQL internals");}
 }
 @BeforeEach void setup(){mvc=MockMvcBuilders.standaloneSetup(new Probe()).setControllerAdvice(new GlobalExceptionHandler()).build();}
 @Test void invalidFieldsReturnUsableSummaryAndFieldErrors()throws Exception{
  mvc.perform(post("/employee").contentType(MediaType.APPLICATION_JSON).content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(java.util.Map.of("firstName"," ","email","bad-email"))))
   .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Please correct the highlighted fields."))
   .andExpect(jsonPath("$.errors.firstName").value("Enter the employee’s first name"))
   .andExpect(jsonPath("$.errors.email").value("Enter a valid email address"));
 }
 @Test void futureBirthDateAndNegativeSalaryAreRejected()throws Exception{
  mvc.perform(post("/employee").contentType(MediaType.APPLICATION_JSON).content("{\"firstName\":\"Test\",\"dateOfBirth\":\""+LocalDate.now().plusDays(1)+"\",\"basicPay\":-1}"))
   .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.dateOfBirth").value("Date of birth cannot be in the future"))
   .andExpect(jsonPath("$.errors.basicPay").value("Basic pay cannot be negative"));
 }
 @Test void invalidJsonFieldFormatReturns400WithoutEchoingValues()throws Exception{
  mvc.perform(post("/employee").contentType(MediaType.APPLICATION_JSON).content("{\"firstName\":\"Test\",\"dateOfBirth\":\"secret-invalid-date\"}"))
   .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.dateOfBirth").exists())
   .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("secret-invalid-date"))));
 }
 @Test void malformedJsonReturns400InsteadOf500()throws Exception{mvc.perform(post("/employee").contentType(MediaType.APPLICATION_JSON).content("{")).andExpect(status().isBadRequest());}
 @Test void wrongIdTypeReturnsAFieldError()throws Exception{mvc.perform(get("/record/wrong?month=2026-11")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.id").exists());}
 @Test void missingParameterReturnsAFieldError()throws Exception{mvc.perform(get("/record/1")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.month").value("Month is required."));}
 @Test void duplicateIsAConflictWithoutDatabaseDetails()throws Exception{mvc.perform(get("/duplicate")).andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("A record with these details already exists. Check for duplicates.")).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("SQL"))));}
 @Test void unexpectedFailuresStay500AndDoNotExposeInternals()throws Exception{mvc.perform(get("/unexpected")).andExpect(status().isInternalServerError()).andExpect(jsonPath("$.message").value("An unexpected error occurred. Please contact support."));}
 @Test void databaseBusyIsRetryable503WithoutSqlDetails()throws Exception{mvc.perform(get("/busy")).andExpect(status().isServiceUnavailable()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("SQL"))));}
 @Test void wrongMethodAndMediaTypeHaveAccurateStatuses()throws Exception{
  mvc.perform(get("/employee")).andExpect(status().isMethodNotAllowed());
  mvc.perform(post("/employee").contentType(MediaType.TEXT_PLAIN).content("test")).andExpect(status().isUnsupportedMediaType());
 }
 @Test void objectLevelValidationDoesNotCastToFieldError(){
  var binding=new BeanPropertyBindingResult(new Object(),"form");binding.addError(new ObjectError("form","End date must follow start date"));
  var response=new GlobalExceptionHandler().handleValidation(new BindException(binding));
  assertThat(response.getBody().get("errors")).isEqualTo(java.util.Map.of("_global","End date must follow start date"));
 }
 @Test void employeeMoneyPrecisionMatchesDatabaseWithoutRejectingOptionalEmail(){
  try(var factory=Validation.buildDefaultValidatorFactory()){
   var employee=new EmployeeRequest();employee.setFirstName("Test");employee.setSalaryPerHour(new BigDecimal("12.3456"));
   assertThat(factory.getValidator().validate(employee)).isEmpty();
   employee.setBasicPay(new BigDecimal("100.123"));assertThat(factory.getValidator().validate(employee)).anyMatch(v->v.getPropertyPath().toString().equals("basicPay"));
  }
 }
 @Test void organizationChecksOptionalEmailsWhenProvided(){
  try(var factory=Validation.buildDefaultValidatorFactory()){
   var request=new CreateOrganizationRequest();request.setName("Test");request.setCountry("India");request.setEmployeeRange(com.example.demo.base.enums.EmployeeRange.values()[0]);request.setContactEmail("invalid");request.setAdminEmail("invalid");
   assertThat(factory.getValidator().validate(request)).extracting(v->v.getPropertyPath().toString()).contains("contactEmail","adminEmail");
  }
 }
 @Test void missingUploadIs400WithFileMessage()throws Exception{mvc.perform(multipart("/upload")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.file").value("Choose a file to upload."));}
 @Test void missingCompanyHeaderAsksForCompanySelection()throws Exception{mvc.perform(get("/company")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Select a company and try again."));}
 @Test void unknownRouteIs404InsteadOf500()throws Exception{mvc.perform(get("/missing-page")).andExpect(status().isNotFound());}

}
