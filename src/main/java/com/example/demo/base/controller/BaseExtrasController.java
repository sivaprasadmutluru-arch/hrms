package com.example.demo.base.controller;

import com.example.demo.auth.repository.UserRepository;
import com.example.demo.base.entity.*;
import com.example.demo.base.repository.*;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Base Extras")
public class BaseExtrasController {

    private final EmployeeTypeRepository employeeTypeRepository;
    private final EmployeeShiftRepository employeeShiftRepository;
    private final EmployeeShiftDayRepository employeeShiftDayRepository;
    private final WorkTypeRequestCommentRepository workTypeRequestCommentRepository;
    private final ShiftRequestCommentRepository shiftRequestCommentRepository;
    private final TagRepository tagRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final WorkTypeRepository workTypeRepository;
    private final JobPositionRepository jobPositionRepository;
    private final JobRoleRepository jobRoleRepository;
    private final DepartmentRepository departmentRepository;
    private final MailTemplateRepository mailTemplateRepository;
    private final DynamicEmailConfigRepository dynamicEmailConfigRepository;
    private final AnnouncementViewRepository announcementViewRepository;
    private final EmailLogRepository emailLogRepository;
    private final TrackLateComeEarlyOutRepository trackLateComeEarlyOutRepository;
    private final PenaltyAccountRepository penaltyAccountRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftRequestRepository shiftRequestRepository;
    private final WorkTypeRequestRepository workTypeRequestRepository;
    private final AnnouncementRepository announcementRepository;
    private final CompanyAccessControlRepository companyAccessControlRepository;
    private final EmployeeShiftScheduleRepository employeeShiftScheduleRepository;
    private final NotificationSoundRepository notificationSoundRepository;
    private final DynamicPaginationRepository dynamicPaginationRepository;
    private final BiometricAttendanceRepository biometricAttendanceRepository;
    private final UserRepository userRepository;

    // ---- Employee Types ----

    @GetMapping("/employee-types")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<EmployeeType>> listEmployeeTypes() {
        var spec = ScopeFilter.<EmployeeType>byCompany();
        return ResponseEntity.ok(spec != null ? employeeTypeRepository.findAll(spec) : employeeTypeRepository.findAll());
    }

    @PostMapping("/employee-types")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<EmployeeType> createEmployeeType(@RequestBody EmployeeType et) {
        if (et.getCompany() != null && et.getCompany().getId() != null) {
            et.setCompany(companyRepository.getReferenceById(et.getCompany().getId()));
        }
        return ResponseEntity.ok(employeeTypeRepository.save(et));
    }

    @PutMapping("/employee-types/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<EmployeeType> updateEmployeeType(@PathVariable Long id, @RequestBody EmployeeType updated) {
        EmployeeType et = employeeTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeType", id));
        et.setName(updated.getName());
        et.setDescription(updated.getDescription());
        return ResponseEntity.ok(employeeTypeRepository.save(et));
    }

    @DeleteMapping("/employee-types/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteEmployeeType(@PathVariable Long id) {
        employeeTypeRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Employee Shifts ----

    @GetMapping("/employee-shifts")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<EmployeeShift>> listEmployeeShifts() {
        var spec = ScopeFilter.<EmployeeShift>byCompany();
        return ResponseEntity.ok(spec != null ? employeeShiftRepository.findAll(spec) : employeeShiftRepository.findAll());
    }

    @PostMapping("/employee-shifts")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<EmployeeShift> createEmployeeShift(@RequestBody EmployeeShift shift) {
        if (shift.getCompany() != null && shift.getCompany().getId() != null) {
            shift.setCompany(companyRepository.getReferenceById(shift.getCompany().getId()));
        }
        return ResponseEntity.ok(employeeShiftRepository.save(shift));
    }

    @PutMapping("/employee-shifts/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<EmployeeShift> updateEmployeeShift(@PathVariable Long id, @RequestBody EmployeeShift updated) {
        EmployeeShift shift = employeeShiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeShift", id));
        shift.setName(updated.getName());
        shift.setStartTime(updated.getStartTime());
        shift.setEndTime(updated.getEndTime());
        shift.setMinimumWorkingHour(updated.getMinimumWorkingHour());
        return ResponseEntity.ok(employeeShiftRepository.save(shift));
    }

    @DeleteMapping("/employee-shifts/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteEmployeeShift(@PathVariable Long id) {
        employeeShiftRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @GetMapping("/employee-shifts/{id}/days")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<EmployeeShiftDay>> listShiftDays(@PathVariable Long id) {
        return ResponseEntity.ok(employeeShiftDayRepository.findByShiftId(id));
    }

    @PostMapping("/employee-shifts/{id}/days")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<EmployeeShiftDay> addShiftDay(@PathVariable Long id, @RequestBody EmployeeShiftDay day) {
        day.setShift(employeeShiftRepository.getReferenceById(id));
        return ResponseEntity.ok(employeeShiftDayRepository.save(day));
    }

    @DeleteMapping("/employee-shifts/days/{dayId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteShiftDay(@PathVariable Long dayId) {
        employeeShiftDayRepository.deleteById(dayId);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Tags ----

    @GetMapping("/tags")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<com.example.demo.base.entity.Tag>> listTags() {
        var spec = ScopeFilter.<com.example.demo.base.entity.Tag>byCompany();
        return ResponseEntity.ok(spec != null ? tagRepository.findAll(spec) : tagRepository.findAll());
    }

    @PostMapping("/tags")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<com.example.demo.base.entity.Tag> createTag(@RequestBody com.example.demo.base.entity.Tag tag) {
        if (tag.getCompany() != null && tag.getCompany().getId() != null) {
            tag.setCompany(companyRepository.getReferenceById(tag.getCompany().getId()));
        }
        return ResponseEntity.ok(tagRepository.save(tag));
    }

    @PutMapping("/tags/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<com.example.demo.base.entity.Tag> updateTag(@PathVariable Long id, @RequestBody com.example.demo.base.entity.Tag updated) {
        com.example.demo.base.entity.Tag tag = tagRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Tag", id));
        tag.setName(updated.getName());
        tag.setColor(updated.getColor());
        return ResponseEntity.ok(tagRepository.save(tag));
    }

    @DeleteMapping("/tags/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteTag(@PathVariable Long id) {
        tagRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Mail Templates ----

    @GetMapping("/mail-templates")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<MailTemplate>> listMailTemplates() {
        var spec = ScopeFilter.<MailTemplate>byCompany();
        return ResponseEntity.ok(spec != null ? mailTemplateRepository.findAll(spec) : mailTemplateRepository.findAll());
    }

    @PostMapping("/mail-templates")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<MailTemplate> createMailTemplate(@RequestBody MailTemplate template) {
        if (template.getCompany() != null && template.getCompany().getId() != null) {
            template.setCompany(companyRepository.getReferenceById(template.getCompany().getId()));
        }
        return ResponseEntity.ok(mailTemplateRepository.save(template));
    }

    @PutMapping("/mail-templates/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<MailTemplate> updateMailTemplate(@PathVariable Long id, @RequestBody MailTemplate updated) {
        MailTemplate t = mailTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MailTemplate", id));
        t.setTitle(updated.getTitle());
        t.setSubject(updated.getSubject());
        t.setBody(updated.getBody());
        t.setTemplateType(updated.getTemplateType());
        return ResponseEntity.ok(mailTemplateRepository.save(t));
    }

    @DeleteMapping("/mail-templates/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteMailTemplate(@PathVariable Long id) {
        mailTemplateRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Dynamic Email Config ----

    @GetMapping("/email-config")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<DynamicEmailConfig> getEmailConfig(@RequestParam Long companyId) {
        return ResponseEntity.ok(dynamicEmailConfigRepository.findFirstByCompanyId(companyId).orElse(new DynamicEmailConfig()));
    }

    @PostMapping("/email-config")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    public ResponseEntity<DynamicEmailConfig> saveEmailConfig(@RequestParam Long companyId, @RequestBody DynamicEmailConfig config) {
        DynamicEmailConfig existing = dynamicEmailConfigRepository.findFirstByCompanyId(companyId).orElse(config);
        existing.setHost(config.getHost());
        existing.setPort(config.getPort());
        existing.setUsername(config.getUsername());
        if (config.getPassword() != null) existing.setPassword(config.getPassword());
        existing.setFromEmail(config.getFromEmail());
        existing.setFromName(config.getFromName());
        existing.setUseTls(config.getUseTls());
        existing.setUseSsl(config.getUseSsl());
        existing.setIsActive(config.getIsActive());
        if (existing.getCompany() == null) {
            existing.setCompany(companyRepository.getReferenceById(companyId));
        }
        return ResponseEntity.ok(dynamicEmailConfigRepository.save(existing));
    }

    // ---- Email Logs ----

    @GetMapping("/email-logs")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<EmailLog>> listEmailLogs(@RequestParam Long companyId) {
        return ResponseEntity.ok(emailLogRepository.findByCompanyIdOrderBySentAtDesc(companyId));
    }

    // ---- Announcement Views ----

    @PostMapping("/announcements/{id}/view")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<Map<String, Object>> markAnnouncementViewed(
            @PathVariable Long id, @RequestParam Long employeeId) {
        var existing = announcementViewRepository.findByAnnouncementIdAndEmployeeId(id, employeeId);
        if (existing.isEmpty()) {
            AnnouncementView view = new AnnouncementView();
            view.setAnnouncement(announcementRepository.getReferenceById(id));
            view.setEmployee(employeeRepository.getReferenceById(employeeId));
            view.setViewedAt(LocalDateTime.now());
            announcementViewRepository.save(view);
        }
        long count = announcementViewRepository.countByAnnouncementId(id);
        return ResponseEntity.ok(Map.of("viewCount", count));
    }

    @GetMapping("/announcements/{id}/views")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AnnouncementView>> getAnnouncementViews(@PathVariable Long id) {
        return ResponseEntity.ok(announcementViewRepository.findByAnnouncementId(id));
    }

    // ---- Track Late Come / Early Out Settings ----

    @GetMapping("/attendance/track-settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    public ResponseEntity<TrackLateComeEarlyOut> getTrackSettings(@RequestParam Long companyId) {
        return ResponseEntity.ok(trackLateComeEarlyOutRepository.findFirstByCompanyId(companyId)
                .orElse(new TrackLateComeEarlyOut()));
    }

    @PostMapping("/attendance/track-settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<TrackLateComeEarlyOut> saveTrackSettings(
            @RequestParam Long companyId, @RequestBody TrackLateComeEarlyOut settings) {
        TrackLateComeEarlyOut existing = trackLateComeEarlyOutRepository.findFirstByCompanyId(companyId).orElse(settings);
        existing.setMinimumLateComeMinutes(settings.getMinimumLateComeMinutes());
        existing.setMinimumEarlyOutMinutes(settings.getMinimumEarlyOutMinutes());
        existing.setEnableLateComeTracking(settings.getEnableLateComeTracking());
        existing.setEnableEarlyOutTracking(settings.getEnableEarlyOutTracking());
        if (existing.getCompany() == null) {
            existing.setCompany(companyRepository.getReferenceById(companyId));
        }
        return ResponseEntity.ok(trackLateComeEarlyOutRepository.save(existing));
    }

    // ---- Penalty Accounts ----

    @GetMapping("/penalty-accounts")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PenaltyAccount>> listPenaltyAccounts() {
        var spec = ScopeFilter.<PenaltyAccount>byCompany();
        return ResponseEntity.ok(spec != null ? penaltyAccountRepository.findAll(spec) : penaltyAccountRepository.findAll());
    }

    @PostMapping("/penalty-accounts")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<PenaltyAccount> createPenaltyAccount(@RequestBody PenaltyAccount account) {
        if (account.getCompany() != null && account.getCompany().getId() != null) {
            account.setCompany(companyRepository.getReferenceById(account.getCompany().getId()));
        }
        return ResponseEntity.ok(penaltyAccountRepository.save(account));
    }

    @PutMapping("/penalty-accounts/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<PenaltyAccount> updatePenaltyAccount(@PathVariable Long id, @RequestBody PenaltyAccount updated) {
        PenaltyAccount account = penaltyAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PenaltyAccount", id));
        account.setTitle(updated.getTitle());
        account.setDeductFrom(updated.getDeductFrom());
        account.setDeductionAmount(updated.getDeductionAmount());
        account.setDescription(updated.getDescription());
        return ResponseEntity.ok(penaltyAccountRepository.save(account));
    }

    @DeleteMapping("/penalty-accounts/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deletePenaltyAccount(@PathVariable Long id) {
        penaltyAccountRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Shift Request Comments ----

    @GetMapping("/shift-requests/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ShiftRequestComment>> listShiftRequestComments(@PathVariable Long id) {
        return ResponseEntity.ok(shiftRequestCommentRepository.findByShiftRequestId(id));
    }

    @PostMapping("/shift-requests/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ShiftRequestComment> addShiftRequestComment(
            @PathVariable Long id, @RequestBody ShiftRequestComment comment) {
        comment.setShiftRequest(shiftRequestRepository.getReferenceById(id));
        if (comment.getEmployee() != null && comment.getEmployee().getId() != null) {
            comment.setEmployee(employeeRepository.getReferenceById(comment.getEmployee().getId()));
        }
        return ResponseEntity.ok(shiftRequestCommentRepository.save(comment));
    }

    // ---- Shift Schedules ----

    @GetMapping("/shift-schedules")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ShiftSchedule>> listShiftSchedules() {
        var spec = ScopeFilter.<ShiftSchedule>byCompany();
        return ResponseEntity.ok(spec != null ? shiftScheduleRepository.findAll(spec) : shiftScheduleRepository.findAll());
    }

    @PostMapping("/shift-schedules")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<ShiftSchedule> createShiftSchedule(@RequestBody ShiftSchedule s) {
        // The interceptor resolves this from X-Company-Id before the controller
        // runs. Never trust a client-supplied company here: a multi-company admin
        // can have a different profile company than the company selected in the UI.
        Long activeCompanyId = CompanyContext.get();
        if (activeCompanyId == null) {
            throw new IllegalArgumentException("Select a company before creating a shift schedule");
        }
        s.setCompany(companyRepository.getReferenceById(activeCompanyId));
        return ResponseEntity.ok(shiftScheduleRepository.save(s));
    }

    @PutMapping("/shift-schedules/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<ShiftSchedule> updateShiftSchedule(@PathVariable Long id, @RequestBody ShiftSchedule updated) {
        ShiftSchedule s = shiftScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftSchedule", id));
        s.setName(updated.getName());
        s.setStartTime(updated.getStartTime());
        s.setEndTime(updated.getEndTime());
        s.setMinimumWorkingHour(updated.getMinimumWorkingHour());
        s.setFullTime(updated.getFullTime());
        s.setOvertimeCutoff(updated.getOvertimeCutoff());
        s.setMinimumOvertimeToApprove(updated.getMinimumOvertimeToApprove());
        s.setWeeklyOffDays(updated.getWeeklyOffDays());
        return ResponseEntity.ok(shiftScheduleRepository.save(s));
    }

    @DeleteMapping("/shift-schedules/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteShiftSchedule(@PathVariable Long id) {
        shiftScheduleRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Work Types ----

    @GetMapping("/work-types")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<WorkType>> listWorkTypes() {
        var spec = ScopeFilter.<WorkType>byCompany();
        return ResponseEntity.ok(spec != null ? workTypeRepository.findAll(spec) : workTypeRepository.findAll());
    }

    @PostMapping("/work-types")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<WorkType> createWorkType(@RequestBody WorkType wt) {
        if (wt.getCompany() != null && wt.getCompany().getId() != null)
            wt.setCompany(companyRepository.getReferenceById(wt.getCompany().getId()));
        return ResponseEntity.ok(workTypeRepository.save(wt));
    }

    @PutMapping("/work-types/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<WorkType> updateWorkType(@PathVariable Long id, @RequestBody WorkType updated) {
        WorkType wt = workTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkType", id));
        wt.setName(updated.getName());
        return ResponseEntity.ok(workTypeRepository.save(wt));
    }

    @DeleteMapping("/work-types/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteWorkType(@PathVariable Long id) {
        workTypeRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Job Positions ----

    @GetMapping("/job-positions")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<JobPosition>> listJobPositions() {
        var spec = ScopeFilter.<JobPosition>byCompany();
        return ResponseEntity.ok(spec != null ? jobPositionRepository.findAll(spec) : jobPositionRepository.findAll());
    }

    @PostMapping("/job-positions")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<JobPosition> createJobPosition(@RequestBody JobPosition jp) {
        if (jp.getCompany() != null && jp.getCompany().getId() != null)
            jp.setCompany(companyRepository.getReferenceById(jp.getCompany().getId()));
        if (jp.getDepartment() != null && jp.getDepartment().getId() != null)
            jp.setDepartment(departmentRepository.getReferenceById(jp.getDepartment().getId()));
        return ResponseEntity.ok(jobPositionRepository.save(jp));
    }

    @PutMapping("/job-positions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<JobPosition> updateJobPosition(@PathVariable Long id, @RequestBody JobPosition updated) {
        JobPosition jp = jobPositionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("JobPosition", id));
        jp.setName(updated.getName());
        if (updated.getDepartment() != null && updated.getDepartment().getId() != null)
            jp.setDepartment(departmentRepository.getReferenceById(updated.getDepartment().getId()));
        return ResponseEntity.ok(jobPositionRepository.save(jp));
    }

    @DeleteMapping("/job-positions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteJobPosition(@PathVariable Long id) {
        jobPositionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Job Roles ----

    @GetMapping("/job-roles")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<JobRole>> listJobRoles() {
        var spec = ScopeFilter.<JobRole>byCompany();
        return ResponseEntity.ok(spec != null ? jobRoleRepository.findAll(spec) : jobRoleRepository.findAll());
    }

    @PostMapping("/job-roles")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<JobRole> createJobRole(@RequestBody JobRole jr) {
        if (jr.getCompany() != null && jr.getCompany().getId() != null)
            jr.setCompany(companyRepository.getReferenceById(jr.getCompany().getId()));
        if (jr.getJobPosition() != null && jr.getJobPosition().getId() != null)
            jr.setJobPosition(jobPositionRepository.getReferenceById(jr.getJobPosition().getId()));
        return ResponseEntity.ok(jobRoleRepository.save(jr));
    }

    @PutMapping("/job-roles/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<JobRole> updateJobRole(@PathVariable Long id, @RequestBody JobRole updated) {
        JobRole jr = jobRoleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("JobRole", id));
        jr.setName(updated.getName());
        if (updated.getJobPosition() != null && updated.getJobPosition().getId() != null)
            jr.setJobPosition(jobPositionRepository.getReferenceById(updated.getJobPosition().getId()));
        return ResponseEntity.ok(jobRoleRepository.save(jr));
    }

    @DeleteMapping("/job-roles/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteJobRole(@PathVariable Long id) {
        jobRoleRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Work Type Request Comments ----

    @GetMapping("/work-type-requests/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<WorkTypeRequestComment>> listWorkTypeRequestComments(@PathVariable Long id) {
        return ResponseEntity.ok(workTypeRequestCommentRepository.findByWorkTypeRequestId(id));
    }

    @PostMapping("/work-type-requests/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<WorkTypeRequestComment> addWorkTypeRequestComment(
            @PathVariable Long id, @RequestBody WorkTypeRequestComment comment) {
        comment.setWorkTypeRequest(workTypeRequestRepository.getReferenceById(id));
        if (comment.getEmployee() != null && comment.getEmployee().getId() != null) {
            comment.setEmployee(employeeRepository.getReferenceById(comment.getEmployee().getId()));
        }
        return ResponseEntity.ok(workTypeRequestCommentRepository.save(comment));
    }

    // ---- Company Access Controls ----

    @GetMapping("/company-access-controls/user/{userId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getCompanyAccessControl(@PathVariable Long userId) {
        return ResponseEntity.ok(companyAccessControlRepository.findByUserId(userId).orElse(null));
    }

    @PostMapping("/company-access-controls")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN')")
    @Transactional
    public ResponseEntity<CompanyAccessControl> saveCompanyAccessControl(@RequestBody CompanyAccessControl ctrl) {
        return ResponseEntity.ok(companyAccessControlRepository.save(ctrl));
    }

    // ---- Employee Shift Schedules ----

    @GetMapping("/shift-schedules/{shiftId}/day-schedules")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<EmployeeShiftSchedule>> listShiftDaySchedules(@PathVariable Long shiftId) {
        return ResponseEntity.ok(employeeShiftScheduleRepository.findByShiftId(shiftId));
    }

    @PostMapping("/shift-schedules/{shiftId}/day-schedules")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')")
    @Transactional
    public ResponseEntity<EmployeeShiftSchedule> createShiftDaySchedule(
            @PathVariable Long shiftId, @RequestBody EmployeeShiftSchedule schedule) {
        schedule.setShift(employeeShiftRepository.getReferenceById(shiftId));
        return ResponseEntity.ok(employeeShiftScheduleRepository.save(schedule));
    }

    // ---- Notification Sounds ----

    @GetMapping("/notification-sound/employee/{employeeId}")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getNotificationSound(@PathVariable Long employeeId) {
        return ResponseEntity.ok(notificationSoundRepository.findByEmployeeId(employeeId).orElse(null));
    }

    @PostMapping("/notification-sound/employee/{employeeId}/toggle")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<NotificationSound> toggleNotificationSound(@PathVariable Long employeeId) {
        NotificationSound sound = notificationSoundRepository.findByEmployeeId(employeeId).orElseGet(() -> {
            NotificationSound ns = new NotificationSound();
            ns.setEmployee(employeeRepository.getReferenceById(employeeId));
            return ns;
        });
        sound.setSoundEnabled(!sound.isSoundEnabled());
        return ResponseEntity.ok(notificationSoundRepository.save(sound));
    }

    // ---- Dynamic Pagination ----

    @GetMapping("/pagination/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getDynamicPagination(@PathVariable Long userId) {
        return ResponseEntity.ok(dynamicPaginationRepository.findByUserId(userId).orElse(null));
    }

    @PostMapping("/pagination/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<DynamicPagination> saveDynamicPagination(
            @PathVariable Long userId, @RequestParam Integer pageSize) {
        DynamicPagination dp = dynamicPaginationRepository.findByUserId(userId).orElseGet(() -> {
            DynamicPagination d = new DynamicPagination();
            d.setUser(userRepository.getReferenceById(userId));
            return d;
        });
        dp.setPagination(pageSize);
        return ResponseEntity.ok(dynamicPaginationRepository.save(dp));
    }

    // ---- Biometric Attendance Settings ----

    @GetMapping("/biometric-attendance/company/{companyId}")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getBiometricAttendance(@PathVariable Long companyId) {
        return ResponseEntity.ok(biometricAttendanceRepository.findByCompanyId(companyId).orElse(null));
    }

    @PostMapping("/biometric-attendance/company/{companyId}/toggle")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN')")
    @Transactional
    public ResponseEntity<BiometricAttendance> toggleBiometricAttendance(@PathVariable Long companyId) {
        BiometricAttendance ba = biometricAttendanceRepository.findByCompanyId(companyId).orElseGet(() -> {
            BiometricAttendance b = new BiometricAttendance();
            b.setCompany(companyRepository.getReferenceById(companyId));
            return b;
        });
        ba.setInstalled(!ba.isInstalled());
        return ResponseEntity.ok(biometricAttendanceRepository.save(ba));
    }
}
