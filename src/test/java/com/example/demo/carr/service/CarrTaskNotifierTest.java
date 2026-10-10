package com.example.demo.carr.service;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.carr.entity.*;
import com.example.demo.employee.entity.Employee;
import com.example.demo.notification.service.NotificationService;
import com.example.demo.common.tenant.TenantContext;
import org.junit.jupiter.api.*;
import org.springframework.context.ApplicationEventPublisher;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class CarrTaskNotifierTest {
 @AfterEach void clear(){TenantContext.clear();}
 @Test void reusesNotificationStoreAndPublishesMailWithCompanyAndTenant() {
  var notifications=mock(NotificationService.class);var users=mock(UserRepository.class);var events=mock(ApplicationEventPublisher.class);
  var service=new CarrTaskNotifier(notifications,users,events);
  var owner=new User();owner.setId(11L);var company=new Company();company.setId(2L);var employee=new Employee();employee.setUser(owner);
  var record=new CarrRecord();record.setCompany(company);var task=new CarrResponsibility();task.setId(40L);task.setCarr(record);task.setAccountableEmployee(employee);task.setStatement("Prepare report");task.setReviewerUserId(5L);
  when(users.findById(11L)).thenReturn(Optional.of(owner));var manager=new User();manager.setId(5L);when(users.findById(5L)).thenReturn(Optional.of(manager));
  TenantContext.setTenant("tenant_test");service.employee(task,"Task assigned","New work");service.manager(task,"Task ready for review","Submitted");
  verify(notifications).send(eq(11L),eq("Task assigned"),contains("New work"),any(),eq("carr_task"),eq(40L),same(company));
  verify(notifications).send(eq(5L),eq("Task ready for review"),contains("Submitted"),any(),eq("carr_task"),eq(40L),same(company));
  var capture=org.mockito.ArgumentCaptor.forClass(CarrTaskNotifier.TaskMail.class);verify(events,times(2)).publishEvent(capture.capture());
  assertThat(capture.getAllValues()).allSatisfy(event->{assertThat(event.schema()).isEqualTo("tenant_test");assertThat(event.companyId()).isEqualTo(2L);});
 }
}
