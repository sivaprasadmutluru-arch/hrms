package com.example.demo.carr.service;
import com.example.demo.common.tenant.TenantContext;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class CarrTaskDeadlineSchedulerTest {
 @AfterEach void clear(){TenantContext.clear();}
 @Test void waitsForStartupThenSelectsTenantBeforeEachTransactionAndRestoresContext(){
  var jdbc=mock(JdbcTemplate.class);var tasks=mock(CarrTaskService.class);var scheduler=new CarrTaskDeadlineScheduler(jdbc,tasks);
  ReflectionTestUtils.setField(scheduler,"enabled",true);TenantContext.setTenant("original");
  scheduler.remind();verifyNoInteractions(jdbc,tasks);
  when(jdbc.queryForList(anyString(),eq(String.class))).thenReturn(List.of("tenant_one","tenant_two"));
  var seen=new java.util.ArrayList<String>();doAnswer(call->{seen.add(TenantContext.getTenant());return null;}).when(tasks).remindDeadlines(any());
  scheduler.ready();assertThat(seen).containsExactly("tenant_one","tenant_two");assertThat(TenantContext.getTenant()).isEqualTo("original");
 }
 @Test void oneFailedTenantDoesNotPreventOtherTenantReminders(){
  var jdbc=mock(JdbcTemplate.class);var tasks=mock(CarrTaskService.class);var scheduler=new CarrTaskDeadlineScheduler(jdbc,tasks);
  ReflectionTestUtils.setField(scheduler,"enabled",true);when(jdbc.queryForList(anyString(),eq(String.class))).thenReturn(List.of("tenant_one","tenant_two"));
  doAnswer(call->{if(TenantContext.getTenant().equals("tenant_one"))throw new IllegalStateException("Failure");return null;}).when(tasks).remindDeadlines(any());
  scheduler.ready();verify(tasks,times(2)).remindDeadlines(any());assertThat(TenantContext.getTenant()).isEqualTo("public");
 }
}
