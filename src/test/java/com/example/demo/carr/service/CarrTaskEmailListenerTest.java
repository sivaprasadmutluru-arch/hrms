package com.example.demo.carr.service;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.base.service.EmailService;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class CarrTaskEmailListenerTest {
 private final EmailService mail=mock(EmailService.class);
 private final UserRepository users=mock(UserRepository.class);
 private final EmployeeRepository employees=mock(EmployeeRepository.class);
 private final PlatformTransactionManager transactions=mock(PlatformTransactionManager.class);
 private final CarrTaskEmailListener listener=new CarrTaskEmailListener(mail,users,employees,transactions);
 @BeforeEach void setup(){ReflectionTestUtils.setField(listener,"enabled",true);when(transactions.getTransaction(any())).thenReturn(new SimpleTransactionStatus());TenantContext.setTenant("previous_tenant");}
 @AfterEach void clear(){TenantContext.clear();}
 @Test void usesConfiguredMailInCorrectTenantAndEscapesEmployeeContent(){
  var user=new User();user.setId(11L);user.setEmail("employee@test.invalid");when(users.findById(11L)).thenReturn(Optional.of(user));
  when(mail.hasActiveSmtpConfig(2L)).thenAnswer(call->{assertThat(TenantContext.getTenant()).isEqualTo("yuwa_tech_solutions");return true;});
  listener.deliver(new CarrTaskNotifier.TaskMail("yuwa_tech_solutions",2L,11L,"Task assigned","<script>hello</script>"));
  verify(mail).sendEmail(eq(2L),eq("employee@test.invalid"),eq("Task assigned"),contains("&lt;script&gt;"),isNull());
  assertThat(TenantContext.getTenant()).isEqualTo("previous_tenant");verify(transactions).commit(any());
 }
 @Test void missingEmailConfigurationDoesNotAttemptDelivery(){
  listener.deliver(new CarrTaskNotifier.TaskMail("yuwa_tech_solutions",2L,11L,"Task assigned","Work"));
  verify(mail).hasActiveSmtpConfig(2L);verifyNoMoreInteractions(mail);assertThat(TenantContext.getTenant()).isEqualTo("previous_tenant");
 }
}
