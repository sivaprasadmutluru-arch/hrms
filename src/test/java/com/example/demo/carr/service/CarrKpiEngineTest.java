package com.example.demo.carr.service;
import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.JobPosition;
import com.example.demo.pms.entity.*;
import com.example.demo.pms.repository.*;
import com.example.demo.project.repository.TaskRepository;
import com.example.demo.carr.dto.CarrDtos.*;
import com.example.demo.carr.entity.*;
import com.example.demo.carr.repository.*;
import com.example.demo.employee.entity.Employee;
import org.junit.jupiter.api.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CarrKpiEngineTest {
    CarrResponsibilityRepository tasks=mock(CarrResponsibilityRepository.class);
    AttendanceRepository attendance=mock(AttendanceRepository.class);
    CarrRecordRepository records=mock(CarrRecordRepository.class);
    CarrKpiRepository kpis=mock(CarrKpiRepository.class);
    ObjectiveRepository objectives=mock(ObjectiveRepository.class);
    EmployeeObjectiveRepository assignments=mock(EmployeeObjectiveRepository.class);
    TaskRepository projectTasks=mock(TaskRepository.class);
    CarrKpiEngine engine=new CarrKpiEngine(tasks,attendance,records,kpis,objectives,assignments,projectTasks);
    Employee employee=new Employee();Company company=new Company();
    LocalDate from=LocalDate.now().minusDays(20),to=LocalDate.now().minusDays(1);
    @BeforeEach void setup(){company.setId(10L);employee.setId(20L);employee.setCompany(company);var position=new JobPosition();position.setName("Software Developer");employee.setJobPosition(position);}
    KpiSuggestionRequest request(String role){employee.getJobPosition().setName(role);return new KpiSuggestionRequest(20L,null,null,role,null,from,to,"Monthly");}
    @Test void roleFamiliesProduceDistinctBalancedSuggestionsWithoutInventingActuals(){
        var examples=Map.of("Finance Manager","Budget accuracy","HR Manager","Employee onboarding completion rate","Software Developer","Accepted software change quality","Sales Executive","Monthly sales target attainment","Marketing Executive","On-time campaign delivery","Project Manager","On-time project milestone completion");
        examples.forEach((role,name)->{var result=engine.suggest(employee,request(role),"");assertThat(result).extracting(KpiRequest::name).contains(name).doesNotHaveDuplicates();assertThat(result.stream().mapToInt(KpiRequest::weight).sum()).isEqualTo(100);assertThat(result).allMatch(k->k.actualValue()==null && k.targetValue()==null);});
    }
    @Test void companyApprovedConfigurationTakesPriorityAndNeverCopiesAnotherEmployeesActual(){
        var record=new CarrRecord();record.setId(5L);record.setCompany(company);record.setTitle("Finance Manager");record.setStatus(CarrStatus.APPROVED);var configured=new CarrKpi();configured.setName("Company treasury policy");configured.setTargetValue(new BigDecimal("98"));configured.setActualValue(new BigDecimal("88"));configured.setWeight(100);configured.setUnit("%");configured.setMetricDefinition("Compliant treasury controls / controls reviewed x 100");
        when(records.findByCompanyIdOrderByUpdatedAtDesc(10L)).thenReturn(List.of(record));when(kpis.findByCarrIdOrderById(5L)).thenReturn(List.of(configured));
        var result=engine.suggest(employee,request("Finance Manager"),"");assertThat(result).hasSize(1);assertThat(result.getFirst().name()).isEqualTo("Company treasury policy");assertThat(result.getFirst().actualValue()).isNull();assertThat(result.getFirst().evidence()).contains("#5");verify(records).findByCompanyIdOrderByUpdatedAtDesc(10L);
    }
    @Test void supportGoalsRequireCompanyApprovedServiceWindowAndTarget(){
        var result=engine.suggest(employee,request("Customer Support Executive"),"");
        assertThat(result).anyMatch(k->k.name().contains("response service-level") && k.dueDate().equals(to) && k.targetValue()==null && k.metricDefinition().contains("response window in hours"));
        assertThat(result.stream().mapToInt(KpiRequest::weight).sum()).isEqualTo(100);
    }
    @Test void deliverablesBecomeMeasurableGoalsAcrossDepartments(){
        var req=new KpiSuggestionRequest(20L,null,null,"Developer","Complete payroll integration",from,to,"Monthly");
        var result=engine.suggest(employee,req,"");
        assertThat(result.getFirst().name()).isEqualTo("Accepted delivery: Complete payroll integration");
        assertThat(result.getFirst().actualValue()).isNull();
        assertThat(result.getFirst().metricDefinition()).contains("Manager-accepted deliverables");
    }
    @Test void explicitDeliverableDeadlineIsPreserved(){
        var req=new KpiSuggestionRequest(20L,null,null,"Developer","Complete core HR modules by 31 October 2026",LocalDate.of(2026,10,1),LocalDate.of(2026,12,31),"Monthly");
        var result=engine.suggest(employee,req,"");
        assertThat(result.getFirst().dueDate()).isEqualTo(LocalDate.of(2026,10,31));
        assertThat(result.getFirst().targetValue()).isEqualByComparingTo("100");
    }
    @Test void designationComesFromEmployeeInsteadOfRequestTasks(){
        employee.getJobPosition().setName("HR Manager");
        var req=new KpiSuggestionRequest(20L,null,null,"Build a payroll project",null,from,to,"Monthly");
        assertThat(engine.suggest(employee,req,"")).extracting(KpiRequest::name).contains("Employee onboarding completion rate");
        employee.setJobPosition(null);
        assertThatThrownBy(()->engine.suggest(employee,req,"")).isInstanceOf(org.springframework.web.server.ResponseStatusException.class).hasMessageContaining("Job Position");
    }
    @Test void linkedDeliverableUsesAcceptedStateDeadlineAndEmployeeOwnership(){
        var task=task(101L,CarrResponsibility.TaskStatus.READY_FOR_REVIEW,to,null);task.setAssignedAt(from.atStartOfDay());task.setRequiredDeliverables("Accepted payroll integration and passing tests");task.setStatement("Payroll integration");
        when(tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(10L)).thenReturn(List.of(task));when(tasks.findById(101L)).thenReturn(Optional.of(task));
        var result=engine.suggest(employee,request("Software Developer"),"");
        assertThat(result).hasSize(1);assertThat(result.getFirst().dataSource()).isEqualTo("CARR_TASK:101");assertThat(result.getFirst().actualValue()).isEqualByComparingTo("0");
        task.setTaskStatus(CarrResponsibility.TaskStatus.COMPLETED);task.setActualCompletionDate(to);
        assertThat(engine.measure(employee,"CARR_TASK:101",from,to).actual()).isEqualByComparingTo("100");
        task.setActualCompletionDate(to.plusDays(1));assertThat(engine.measure(employee,"CARR_TASK:101",from,to).actual()).isEqualByComparingTo("0");
        var outsider=new Employee();outsider.setId(999L);outsider.setCompany(company);task.setAccountableEmployee(outsider);
        assertThat(engine.measure(employee,"CARR_TASK:101",from,to).actual()).isNull();
        assertThatThrownBy(()->engine.validateSource(employee,"CARR_TASK:101")).hasMessageContaining("unavailable");
    }
    @Test void employeeObjectivesUseStoredProgressWithoutInventingHistoricalValues(){
        var o=new Objective();o.setId(77L);o.setTitle("Deliver client portal");o.setDescription("Portal accepted against approved release criteria");o.setEmployee(employee);o.setDueDate(LocalDate.now().plusDays(10));o.setProgress(40);o.setStatus(Objective.ObjectiveStatus.IN_PROGRESS);o.setUpdatedAt(LocalDateTime.now());
        when(objectives.findByEmployeeId(20L)).thenReturn(List.of(o));when(objectives.findById(77L)).thenReturn(Optional.of(o));
        var req=new KpiSuggestionRequest(20L,null,null,"Developer",null,LocalDate.now().minusDays(1),LocalDate.now().plusDays(20),"Monthly");
        var result=engine.suggest(employee,req,"");assertThat(result).hasSize(1);assertThat(result.getFirst().actualValue()).isEqualByComparingTo("40");
        assertThat(result.getFirst().dueDate()).isEqualTo(o.getDueDate());
        assertThat(engine.measure(employee,"PMS_OBJECTIVE:77",from,to).actual()).isNull();
        o.setProgress(null);assertThat(engine.measure(employee,"PMS_OBJECTIVE:77",from,LocalDate.now()).actual()).isNull();
    }
    @Test void companyPolicyAndLinkedSourcesNeverCrossCompanies(){
        var other=new Company();other.setId(99L);var record=new CarrRecord();record.setId(500L);record.setCompany(other);record.setTitle("Software Developer");record.setStatus(CarrStatus.APPROVED);
        when(records.findByCompanyIdOrderByUpdatedAtDesc(10L)).thenReturn(List.of(record));
        assertThat(engine.suggest(employee,request("Software Developer"),"")).allMatch(k->k.targetValue()==null);
        verify(kpis,never()).findByCarrIdOrderById(500L);
        var o=new Objective();o.setId(88L);o.setTitle("Other company confidential objective");var otherEmployee=new Employee();otherEmployee.setId(20L);otherEmployee.setCompany(other);o.setEmployee(otherEmployee);
        when(objectives.findByEmployeeId(20L)).thenReturn(List.of(o));when(objectives.findById(88L)).thenReturn(Optional.of(o));
        assertThat(engine.suggest(employee,request("Software Developer"),"")).noneMatch(k->k.name().contains("confidential"));
        assertThat(engine.measure(employee,"PMS_OBJECTIVE:88",from,to).actual()).isNull();
    }
    @Test void roleClassifiersDoNotTreatAccountManagersAsAccountantsOrProjectEngineersAsGenericEngineers(){
        assertThat(CarrKpiEngine.family("Account Manager")).isEqualTo("sales");
        assertThat(CarrKpiEngine.family("Project Engineer")).isEqualTo("project");
    }
    @Test void explicitResponsibilityTargetAndMeasurementRuleArePreserved(){
        employee.getJobPosition().setName("HR Manager");
        var req=new KpiSuggestionRequest(20L,null,null,"HR Manager","Complete employee onboarding with at least a 95% completion rate",from,to,"Monthly");
        var result=engine.suggest(employee,req,"");
        assertThat(result).hasSize(1);assertThat(result.getFirst().targetValue()).isEqualByComparingTo("95");
        assertThat(result.getFirst().metricDefinition()).contains("Onboarding milestones accepted");
        assertThat(result.getFirst().actualValue()).isNull();
    }
    @Test void assignedCompanyObjectiveNeverInheritsTheOwnersProgress(){
        var owner=new Employee();owner.setId(999L);owner.setCompany(company);
        var objective=new Objective();objective.setId(123L);objective.setEmployee(owner);objective.setTitle("Company adoption objective");objective.setProgress(95);objective.setDueDate(LocalDate.now().plusDays(5));
        var assignment=new EmployeeObjective();assignment.setId(234L);assignment.setEmployee(employee);assignment.setObjective(objective);assignment.setStatus(Objective.ObjectiveStatus.IN_PROGRESS);
        when(assignments.findByEmployeeId(20L)).thenReturn(List.of(assignment));when(objectives.findById(123L)).thenReturn(Optional.of(objective));
        var req=new KpiSuggestionRequest(20L,null,null,"Developer",null,LocalDate.now(),LocalDate.now().plusDays(10),"Monthly");
        var result=engine.suggest(employee,req,"");assertThat(result).hasSize(1);assertThat(result.getFirst().actualValue()).isNull();
        var measured=engine.measure(employee,"PMS_OBJECTIVE:123",LocalDate.now(),LocalDate.now());assertThat(measured.status()).isEqualTo("IN_PROGRESS");
        assignment.setStatus(Objective.ObjectiveStatus.COMPLETED);
        assertThat(engine.measure(employee,"PMS_OBJECTIVE:123",LocalDate.now(),LocalDate.now()).actual()).isEqualByComparingTo("100");
    }
    @Test void projectDeliverableUsesDoneStateWithoutInventingStagePercentages(){
        var project=new com.example.demo.project.entity.Project();project.setId(4L);project.setCompany(company);
        var task=new com.example.demo.project.entity.Task();task.setId(5L);task.setProject(project);task.setAssignedTo(employee);task.setStage(com.example.demo.project.entity.Task.TaskStage.TESTING);task.setTitle("Payroll release");task.setDeadline(LocalDate.now().plusDays(10));
        when(projectTasks.findByAssignedToId(20L)).thenReturn(List.of(task));when(projectTasks.findById(5L)).thenReturn(Optional.of(task));
        var req=new KpiSuggestionRequest(20L,null,null,"Developer",null,from,LocalDate.now().plusDays(20),"Monthly");
        var result=engine.suggest(employee,req,"");assertThat(result.getFirst().actualValue()).isEqualByComparingTo("0");
        assertThat(engine.measure(employee,"PROJECT_TASK:5",from,to).actual()).isNull();
        task.setStage(com.example.demo.project.entity.Task.TaskStage.DONE);assertThat(engine.measure(employee,"PROJECT_TASK:5",from,LocalDate.now()).actual()).isEqualByComparingTo("100");
    }
    CarrResponsibility task(long id,CarrResponsibility.TaskStatus status,LocalDate due,LocalDate completed){var t=new CarrResponsibility();t.setId(id);t.setAccountableEmployee(employee);var c=new CarrRecord();c.setCompany(company);t.setCarr(c);t.setDueDate(due);t.setActualCompletionDate(completed);t.setTaskStatus(status);return t;}
    @Test void taskRatesUseEmployeeDueDatesCancellationAndHistoricalCompletionCutoff(){
        var a=task(1,CarrResponsibility.TaskStatus.COMPLETED,to,to);var b=task(2,CarrResponsibility.TaskStatus.COMPLETED,to.minusDays(2),to);var late=task(3,CarrResponsibility.TaskStatus.COMPLETED,to,LocalDate.now());var cancelled=task(4,CarrResponsibility.TaskStatus.CANCELLED,to,null);var other=task(5,CarrResponsibility.TaskStatus.COMPLETED,to,to);var e=new Employee();e.setId(99L);other.setAccountableEmployee(e);
        when(tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(10L)).thenReturn(List.of(a,b,late,cancelled,other));
        assertThat(engine.measure(employee,"TASK_COMPLETION",from,to).actual()).isEqualByComparingTo("66.6667");var measured=engine.measure(employee,"TASK_ON_TIME",from,to);assertThat(measured.actual()).isEqualByComparingTo("33.3333");assertThat(measured.evidence()).contains("1 / 3","[1, 2, 3]",from.toString(),to.toString());
    }
    @Test void missingDatesOrEmptyDenominatorRemainUnscored(){assertThat(engine.measure(employee,"TASK_COMPLETION",null,to).actual()).isNull();assertThat(engine.measure(employee,"TASK_COMPLETION",from,to).actual()).isNull();when(tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(10L)).thenReturn(List.of(task(1,CarrResponsibility.TaskStatus.COMPLETED,to,null)));assertThat(engine.measure(employee,"TASK_ON_TIME",from,to).actual()).isNull();}
    @Test void attendanceUsesOnlyProcessedNonHolidayDays(){var regular=new Attendance();regular.setId(1L);regular.setCheckOut(LocalTime.of(18,0));var irregular=new Attendance();irregular.setId(2L);irregular.setCheckOut(LocalTime.of(18,0));irregular.setAttendanceStatus(Attendance.AttendanceQualityStatus.IRREGULAR);var holiday=new Attendance();holiday.setId(3L);holiday.setCheckOut(LocalTime.of(18,0));holiday.setIsHoliday(true);var open=new Attendance();open.setId(4L);when(attendance.findByCompanyIdAndEmployeeIdInAndAttendanceDateBetween(10L,List.of(20L),from,to)).thenReturn(List.of(regular,irregular,holiday,open));var result=engine.measure(employee,"ATTENDANCE_COMPLIANCE",from,to);assertThat(result.actual()).isEqualByComparingTo("50");assertThat(result.evidence()).contains("1 / 2","attendances");}
}
