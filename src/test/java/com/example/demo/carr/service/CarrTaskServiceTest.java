package com.example.demo.carr.service;

import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Department;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.carr.dto.CarrTaskDtos.*;
import com.example.demo.carr.entity.*;
import com.example.demo.carr.repository.*;
import com.example.demo.common.context.*;
import com.example.demo.employee.entity.*;
import com.example.demo.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CarrTaskServiceTest {
    CarrResponsibilityRepository tasks = mock(CarrResponsibilityRepository.class);
    CarrRecordRepository records = mock(CarrRecordRepository.class);
    CarrAuditEventRepository history = mock(CarrAuditEventRepository.class);
    EmployeeRepository employees = mock(EmployeeRepository.class);
    CompanyRepository companies = mock(CompanyRepository.class);
    CarrTaskAttachmentRepository attachments=mock(CarrTaskAttachmentRepository.class);
    CarrTaskNotifier notifications=mock(CarrTaskNotifier.class);
    com.example.demo.common.service.FileUploadService files=mock(com.example.demo.common.service.FileUploadService.class);
    com.example.demo.employee.service.ReportingManagerService reporting=mock(com.example.demo.employee.service.ReportingManagerService.class);
    CarrTaskService service = new CarrTaskService(tasks, records, history, employees, companies,attachments,notifications,files,reporting,new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules());
    Company company = new Company();
    Employee employee = new Employee();
    CarrRecord record = new CarrRecord();
    CarrResponsibility task = new CarrResponsibility();

    Authentication auth(String role, long id) {
        User user = new User(); user.setId(id); user.setUsername("user" + id); user.setEmail("user" + id + "@test.invalid");
        return new UsernamePasswordAuthenticationToken(new UserPrincipal(user), null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }
    @BeforeEach void setup() {
        CompanyContext.set(10L);
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L, 10L, UserRole.AccessScope.BRANCH, List.of(10L)));
        company.setId(10L); company.setName("Test company");
        employee.setId(20L); employee.setCompany(company); employee.setFirstName("Employee");
        User owner = new User(); owner.setId(2L); employee.setUser(owner);
        record.setId(30L); record.setCompany(company); record.setEmployee(employee); record.setTitle("Legacy record");
        task.setId(40L); task.setCarr(record); task.setAccountableEmployee(employee); task.setStatement("Task");
        when(tasks.findById(40L)).thenReturn(Optional.of(task));
        when(employees.findById(20L)).thenReturn(Optional.of(employee));
        when(companies.findByIdPublic(10L)).thenReturn(Optional.of(company));
    }
    @AfterEach void cleanup() { CompanyContext.clear(); AccessScopeContext.clear(); }
    TaskRequest request(long employeeId) { return new TaskRequest("New title", "Details", employeeId, null, "HIGH", LocalDate.now().minusDays(1), CarrResponsibility.TaskStatus.IN_PROGRESS, 35); }

    @Test void createsDynamicAssignmentAndHistory() {
        when(records.save(any())).thenAnswer(i -> { CarrRecord r = i.getArgument(0); r.setId(50L); return r; });
        when(tasks.save(any())).thenAnswer(i -> { CarrResponsibility t = i.getArgument(0); t.setId(60L); return t; });
        var response = service.create(request(20L), auth("HR_MANAGER", 1));
        assertThat(response.companyName()).isEqualTo("Test company");
        assertThat(response.employeeId()).isEqualTo(20L);
        assertThat(response.overdue()).isTrue();
        verify(records).save(argThat(CarrRecord::isTaskRecord));
        verify(history).save(argThat(e -> e.getAction().equals("TASK_CREATED") && e.getDetails().contains("Task #60:")));
    }
    @Test void employeeCanUpdateOwnProgressButCannotReassign() {
        var owner = auth("EMPLOYEE", 2);
        assertThat(service.progress(40L, new ProgressRequest(CarrResponsibility.TaskStatus.COMPLETED, 35, "Done"), owner).progress()).isEqualTo(100);
        assertThatThrownBy(() -> service.update(40L, request(20L), owner)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.create(request(20L), owner)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void employeeCanSaveOwnDetailsWithoutChangingAssignmentOrProgress() {
        record.setTaskRecord(true);
        var response = service.details(40L, new DetailsRequest("Updated task", "New description", LocalDate.of(2027, 1, 10)), auth("EMPLOYEE", 2));
        assertThat(response.title()).isEqualTo("Updated task");
        assertThat(response.description()).isEqualTo("New description");
        assertThat(response.dueDate()).isEqualTo(LocalDate.of(2027, 1, 10));
        assertThat(task.getAccountableEmployee()).isSameAs(employee);
        assertThat(record.getTitle()).isEqualTo("Updated task");
        verify(tasks).save(task);
        verify(history).save(argThat(event -> event.getAction().equals("TASK_UPDATED")));
    }
    @Test void employeeDetailsRejectOtherOwnersCompaniesAndLockedStatuses() {
        var request = new DetailsRequest("Updated", "Description", null);
        assertThatThrownBy(() -> service.details(40L, request, auth("EMPLOYEE", 3))).isInstanceOf(com.example.demo.common.exception.ResourceNotFoundException.class);
        for (var status : List.of(CarrResponsibility.TaskStatus.READY_FOR_REVIEW, CarrResponsibility.TaskStatus.COMPLETED, CarrResponsibility.TaskStatus.CANCELLED)) {
            task.setTaskStatus(status);
            assertThatThrownBy(() -> service.details(40L, request, auth("EMPLOYEE", 2))).isInstanceOf(ResponseStatusException.class);
        }
        Company other = new Company(); other.setId(11L); record.setCompany(other);
        assertThatThrownBy(() -> service.details(40L, request, auth("EMPLOYEE", 2))).isInstanceOf(com.example.demo.common.exception.ResourceNotFoundException.class);
        verify(tasks, never()).save(any());
    }
    @Test void employeeCannotSeeOrUpdateSomeoneElsesTask() {
        when(tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(10L)).thenReturn(List.of(task));
        assertThat(service.list(auth("EMPLOYEE", 3))).isEmpty();
        assertThatThrownBy(() -> service.progress(40L, new ProgressRequest(CarrResponsibility.TaskStatus.IN_PROGRESS, 10, null), auth("EMPLOYEE", 3)))
                .isInstanceOf(com.example.demo.common.exception.ResourceNotFoundException.class);
    }
    @Test void rejectsCrossCompanyAssignmentAndRetrieval() {
        Company other = new Company(); other.setId(11L); employee.setCompany(other);
        assertThatThrownBy(() -> service.create(request(20L), auth("HR_MANAGER", 1))).isInstanceOf(com.example.demo.common.exception.ResourceNotFoundException.class);
        record.setCompany(other);
        assertThatThrownBy(() -> service.activity(40L, auth("HR_MANAGER", 1))).isInstanceOf(com.example.demo.common.exception.ResourceNotFoundException.class);
    }
    @Test void rejectsMismatchedDepartment() {
        var request = new TaskRequest("Task", null, 20L, 999L, "LOW", null, CarrResponsibility.TaskStatus.TODO, 0);
        assertThatThrownBy(() -> service.create(request, auth("HR_MANAGER", 1))).isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("department");
    }
    @Test void reassignsStandaloneWrapperButPreservesLegacyRecord() {
        task.setTaskStatus(CarrResponsibility.TaskStatus.IN_PROGRESS); task.setProgress(35);
        Employee next = new Employee(); next.setId(21L); next.setCompany(company); next.setFirstName("Next");
        when(employees.findById(21L)).thenReturn(Optional.of(next));
        service.update(40L, request(21L), auth("HR_MANAGER", 1));
        assertThat(record.getEmployee()).isSameAs(employee);
        assertThat(record.getTitle()).isEqualTo("Legacy record");
        record.setTaskRecord(true);
        task.setTaskStatus(CarrResponsibility.TaskStatus.IN_PROGRESS); task.setProgress(35);
        service.update(40L, request(21L), auth("HR_MANAGER", 1));
        assertThat(record.getEmployee()).isSameAs(next);
        assertThat(record.getTitle()).isEqualTo("New title");
    }
    @Test void cancelledTasksRequireManagerToReopenOrCancel() {
        var owner = auth("EMPLOYEE", 2);
        assertThatThrownBy(() -> service.progress(40L, new ProgressRequest(CarrResponsibility.TaskStatus.CANCELLED, 0, null), owner)).isInstanceOf(ResponseStatusException.class);
        task.setTaskStatus(CarrResponsibility.TaskStatus.CANCELLED);
        assertThatThrownBy(() -> service.progress(40L, new ProgressRequest(CarrResponsibility.TaskStatus.TODO, 0, null), owner)).isInstanceOf(ResponseStatusException.class);
        assertThat(service.progress(40L, new ProgressRequest(CarrResponsibility.TaskStatus.TODO, 0, null), auth("HR_MANAGER", 1)).status()).isEqualTo(CarrResponsibility.TaskStatus.TODO);
    }
    @Test void validatesStatusAndProgressConsistency() {
        assertThatThrownBy(() -> service.progress(40L, new ProgressRequest(CarrResponsibility.TaskStatus.TODO, 10, null), auth("EMPLOYEE", 2))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.progress(40L, new ProgressRequest(CarrResponsibility.TaskStatus.IN_PROGRESS, 100, null), auth("EMPLOYEE", 2))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void departmentManagerOnlyAssignsWithinDepartment() {
        task.setTaskStatus(CarrResponsibility.TaskStatus.IN_PROGRESS); task.setProgress(35);
        Department department = new Department(); department.setId(70L); employee.setDepartment(department);
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,10L,UserRole.AccessScope.DEPARTMENT,List.of(10L),70L));
        assertThat(service.update(40L, request(20L), auth("DEPARTMENT_MANAGER", 1)).canEdit()).isTrue();
        department.setId(71L);
        assertThatThrownBy(() -> service.update(40L, request(20L), auth("DEPARTMENT_MANAGER", 1))).isInstanceOf(com.example.demo.common.exception.ResourceNotFoundException.class);
    }
    @Test void requiresAccessibleCompanyAndExcludesArchivedTasks() {
        record.setStatus(CarrStatus.ARCHIVED);
        when(tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(10L)).thenReturn(List.of(task));
        assertThat(service.list(auth("HR_MANAGER",1))).isEmpty();
        AccessScopeContext.clear();
        assertThatThrownBy(() -> service.list(auth("HR_MANAGER",1))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void myTasksAlwaysFiltersByAssigneeEvenForManagers() {
        when(tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(10L)).thenReturn(List.of(task));
        assertThat(service.list(auth("HR_MANAGER",1),true)).isEmpty();
        assertThat(service.list(auth("EMPLOYEE",2),true)).hasSize(1);
        assertThat(service.list(auth("HR_MANAGER",1),false)).hasSize(1);
    }
    @Test void submissionRequiresStartedWorkSummaryDateAndOwnEvidence() {
        task.setRequiresReview(true);task.setRequiresEvidence(true);
        var owner=auth("EMPLOYEE",2);
        var submit=new ProgressRequest(CarrResponsibility.TaskStatus.READY_FOR_REVIEW,100,null,"Finished",null,LocalDate.now());
        assertThatThrownBy(()->service.progress(40L,submit,owner)).hasMessageContaining("Start");
        service.progress(40L,new ProgressRequest(CarrResponsibility.TaskStatus.IN_PROGRESS,45,null),owner);
        assertThatThrownBy(()->service.progress(40L,new ProgressRequest(CarrResponsibility.TaskStatus.COMPLETED,100,null),owner)).hasMessageContaining("approval");
        assertThatThrownBy(()->service.progress(40L,submit,auth("HR_MANAGER",1))).hasMessageContaining("assigned employee");
        assertThatThrownBy(()->service.progress(40L,new ProgressRequest(CarrResponsibility.TaskStatus.READY_FOR_REVIEW,100,null),owner)).hasMessageContaining("details");
        assertThatThrownBy(()->service.progress(40L,submit,owner)).hasMessageContaining("deliverable");
        when(attachments.existsByTaskIdAndUploadedByUserIdAndKindAndIsActiveTrue(40L,2L,CarrTaskAttachment.Kind.DELIVERABLE)).thenReturn(true);
        assertThat(service.progress(40L,submit,owner).status()).isEqualTo(CarrResponsibility.TaskStatus.READY_FOR_REVIEW);
        verify(notifications).manager(eq(task),eq("Task ready for review"),anyString());
        assertThatThrownBy(()->service.progress(40L,submit,owner)).hasMessageContaining("reviewed");
    }
    @Test void reviewCorrectionResubmissionAndFinalization() {
        task.setRequiresReview(true);task.setTaskStatus(CarrResponsibility.TaskStatus.READY_FOR_REVIEW);task.setProgress(100);
        task.setWorkDetails("Finished work");task.setActualCompletionDate(LocalDate.now());
        var manager=auth("HR_MANAGER",1);
        assertThatThrownBy(()->service.review(40L,new ReviewRequest(true,"Self"),auth("HR_MANAGER",2))).hasMessageContaining("manager");
        assertThatThrownBy(()->service.review(40L,new ReviewRequest(false," "),manager)).hasMessageContaining("corrections");
        assertThat(service.review(40L,new ReviewRequest(false,"Add missing test results"),manager).status()).isEqualTo(CarrResponsibility.TaskStatus.IN_PROGRESS);
        assertThat(task.getReviewFeedback()).isEqualTo("Add missing test results");
        service.progress(40L,new ProgressRequest(CarrResponsibility.TaskStatus.READY_FOR_REVIEW,100,null,"Updated evidence",null,LocalDate.now()),auth("EMPLOYEE",2));
        assertThat(service.review(40L,new ReviewRequest(true,"Accepted"),manager).progress()).isEqualTo(100);
        assertThat(task.getCompletedAt()).isNotNull();
        assertThatThrownBy(()->service.review(40L,new ReviewRequest(true,"Again"),manager)).hasMessageContaining("not been submitted");
    }
    @Test void blockersNeedReasonAndNotifyManagerWithPersistentHistory() {
        var owner=auth("EMPLOYEE",2);
        assertThatThrownBy(()->service.progress(40L,new ProgressRequest(CarrResponsibility.TaskStatus.BLOCKED,0,null),owner)).hasMessageContaining("blocker");
        service.progress(40L,new ProgressRequest(CarrResponsibility.TaskStatus.BLOCKED,20,null,"Partial implementation","Need API access",null),owner);
        verify(notifications).manager(eq(task),eq("Task blocked"),contains("Need API access"));
        verify(history).save(argThat(a->a.getDetails().contains("Partial implementation") && a.getDetails().contains("Need API access")));
    }
    @Test void deadlineRemindersDeduplicateAndSkipClosedTasks() {
        task.setDueDate(LocalDate.now().plusDays(1));
        when(tasks.findByDueDateLessThanEqualAndIsActiveTrue(any())).thenReturn(List.of(task));
        service.remindDeadlines(LocalDate.now());service.remindDeadlines(LocalDate.now());
        verify(notifications,times(1)).employee(eq(task),eq("Task deadline approaching"),anyString());
        service.remindDeadlines(LocalDate.now().plusDays(2));
        verify(notifications).employee(eq(task),eq("Task overdue"),anyString());
        verify(notifications).manager(eq(task),eq("Task overdue"),anyString());
        task.setTaskStatus(CarrResponsibility.TaskStatus.COMPLETED);service.remindDeadlines(LocalDate.now().plusDays(3));
        verifyNoMoreInteractions(notifications);
    }
    @Test void completionEvidenceAndFutureDateCannotBeBypassed() {
        task.setRequiresEvidence(true);task.setTaskStatus(CarrResponsibility.TaskStatus.IN_PROGRESS);
        var owner=auth("EMPLOYEE",2);
        assertThatThrownBy(()->service.progress(40L,new ProgressRequest(CarrResponsibility.TaskStatus.COMPLETED,100,null,"Done",null,LocalDate.now().plusDays(1)),owner)).hasMessageContaining("future");
        assertThatThrownBy(()->service.progress(40L,new ProgressRequest(CarrResponsibility.TaskStatus.COMPLETED,100,null,"Done",null,LocalDate.now()),owner)).hasMessageContaining("deliverable");
        assertThatThrownBy(()->service.update(40L,new TaskRequest("Task",null,20L,null,"HIGH",null,CarrResponsibility.TaskStatus.COMPLETED,100),auth("HR_MANAGER",1))).hasMessageContaining("work update");
    }
    @Test void privateFilesRequireTaskAccessAndAppropriateUploader() {
        var file=new org.springframework.mock.web.MockMultipartFile("file","results.txt","text/plain","Results".getBytes());
        assertThatThrownBy(()->service.upload(40L,file,CarrTaskAttachment.Kind.DELIVERABLE,auth("HR_MANAGER",1))).hasMessageContaining("cannot upload");
        assertThatThrownBy(()->service.upload(40L,file,CarrTaskAttachment.Kind.INSTRUCTION,auth("EMPLOYEE",2))).hasMessageContaining("cannot upload");
        assertThatThrownBy(()->service.attachment(40L,1L,auth("EMPLOYEE",3))).isInstanceOf(com.example.demo.common.exception.ResourceNotFoundException.class);
        var unsafe=new org.springframework.mock.web.MockMultipartFile("file","..\\escape.txt","text/plain","x".getBytes());
        assertThatThrownBy(()->service.upload(40L,unsafe,CarrTaskAttachment.Kind.DELIVERABLE,auth("EMPLOYEE",2))).hasMessageContaining("safe filename");
        verifyNoInteractions(files);
    }

    @Test void checklistPersistsOwnerStateAndRejectsManagerCompletion() {
        task.setChecklistItems("[{\"id\":\"step-1\",\"label\":\"Check output\",\"completed\":false}]");
        assertThatThrownBy(() -> service.checklist(40L,"step-1",new ChecklistRequest(true),auth("HR_MANAGER",1)))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("assigned employee");
        var result=service.checklist(40L,"step-1",new ChecklistRequest(true),auth("EMPLOYEE",2));
        assertThat(result.checklist().get(0).completed()).isTrue();
        assertThat(result.checklist().get(0).completedByUserId()).isEqualTo(2L);
        assertThat(result.checklist().get(0).completedAt()).isNotNull();
        assertThat(task.getChecklistItems()).contains("Check output");
        verify(history).save(argThat(event -> event.getAction().equals("TASK_CHECKLIST")));
        task.setTaskStatus(CarrResponsibility.TaskStatus.READY_FOR_REVIEW);
        assertThatThrownBy(() -> service.checklist(40L,"step-1",new ChecklistRequest(false),auth("EMPLOYEE",2)))
            .isInstanceOf(ResponseStatusException.class);
    }
    @Test void incompleteChecklistPreventsSubmission() {
        task.setTaskStatus(CarrResponsibility.TaskStatus.IN_PROGRESS); task.setRequiresReview(true);
        task.setChecklistItems("[{\"id\":\"step-1\",\"label\":\"Check output\",\"completed\":false}]");
        assertThatThrownBy(() -> service.progress(40L,new ProgressRequest(CarrResponsibility.TaskStatus.READY_FOR_REVIEW,100,null,"Done",null,LocalDate.now()),auth("EMPLOYEE",2)))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("checklist");
    }
}
