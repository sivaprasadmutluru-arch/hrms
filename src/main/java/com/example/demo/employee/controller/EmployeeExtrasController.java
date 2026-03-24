package com.example.demo.employee.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.*;
import com.example.demo.employee.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Employee Extras")
public class EmployeeExtrasController {

    private final EmployeeRepository employeeRepository;
    private final EmployeeWorkInformationRepository workInfoRepository;
    private final EmployeeBankDetailsRepository bankDetailsRepository;
    private final DisciplinaryActionRepository disciplinaryRepository;
    private final BonusPointRepository bonusPointRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeTagRepository employeeTagRepository;
    private final EmployeeNoteRepository employeeNoteRepository;
    private final NoteFileRepository noteFileRepository;
    private final ActionTypeRepository actionTypeRepository;
    private final EmployeeGeneralSettingRepository employeeGeneralSettingRepository;
    private final ProfileEditFeatureRepository profileEditFeatureRepository;

    // ─── Work Information ────────────────────────────────────────────────────

    @GetMapping("/employees/{id}/work-info")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get work information for an employee")
    public ResponseEntity<EmployeeWorkInformation> getWorkInfo(@PathVariable Long id) {
        return workInfoRepository.findByEmployeeId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/employees/{id}/work-info")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Transactional
    @Operation(summary = "Create work information for an employee")
    public ResponseEntity<EmployeeWorkInformation> createWorkInfo(@PathVariable Long id,
                                                                   @RequestBody EmployeeWorkInformation workInfo) {
        workInfo.setEmployee(employeeRepository.getReferenceById(id));
        return ResponseEntity.ok(workInfoRepository.save(workInfo));
    }

    @PutMapping("/employees/{id}/work-info")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Transactional
    @Operation(summary = "Update work information for an employee")
    public ResponseEntity<EmployeeWorkInformation> updateWorkInfo(@PathVariable Long id,
                                                                   @RequestBody EmployeeWorkInformation updated) {
        EmployeeWorkInformation wi = workInfoRepository.findByEmployeeId(id)
                .orElseGet(() -> {
                    EmployeeWorkInformation n = new EmployeeWorkInformation();
                    n.setEmployee(employeeRepository.getReferenceById(id));
                    return n;
                });
        wi.setDepartment(updated.getDepartment());
        wi.setJobPosition(updated.getJobPosition());
        wi.setJobRole(updated.getJobRole());
        wi.setShift(updated.getShift());
        wi.setWorkType(updated.getWorkType());
        wi.setReportingManager(updated.getReportingManager());
        wi.setLocation(updated.getLocation());
        wi.setBasicSalary(updated.getBasicSalary());
        wi.setHousingAllowance(updated.getHousingAllowance());
        wi.setTransportAllowance(updated.getTransportAllowance());
        wi.setOtherAllowance(updated.getOtherAllowance());
        wi.setDateJoining(updated.getDateJoining());
        wi.setContractEndDate(updated.getContractEndDate());
        return ResponseEntity.ok(workInfoRepository.save(wi));
    }

    // ─── Bank Details ─────────────────────────────────────────────────────────

    @GetMapping("/employees/{id}/bank-details")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get bank details for an employee")
    public ResponseEntity<EmployeeBankDetails> getBankDetails(@PathVariable Long id) {
        return bankDetailsRepository.findByEmployeeId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/employees/{id}/bank-details")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Transactional
    @Operation(summary = "Create bank details for an employee")
    public ResponseEntity<EmployeeBankDetails> createBankDetails(@PathVariable Long id,
                                                                   @RequestBody EmployeeBankDetails bankDetails) {
        bankDetails.setEmployee(employeeRepository.getReferenceById(id));
        return ResponseEntity.ok(bankDetailsRepository.save(bankDetails));
    }

    @PutMapping("/employees/{id}/bank-details")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Transactional
    @Operation(summary = "Update bank details for an employee")
    public ResponseEntity<EmployeeBankDetails> updateBankDetails(@PathVariable Long id,
                                                                   @RequestBody EmployeeBankDetails updated) {
        EmployeeBankDetails bd = bankDetailsRepository.findByEmployeeId(id)
                .orElseGet(() -> {
                    EmployeeBankDetails n = new EmployeeBankDetails();
                    n.setEmployee(employeeRepository.getReferenceById(id));
                    return n;
                });
        bd.setBankName(updated.getBankName());
        bd.setAccountNumber(updated.getAccountNumber());
        bd.setBranch(updated.getBranch());
        bd.setCountry(updated.getCountry());
        bd.setState(updated.getState());
        bd.setCity(updated.getCity());
        bd.setIfscCode(updated.getIfscCode());
        bd.setSwiftCode(updated.getSwiftCode());
        bd.setAddress(updated.getAddress());
        return ResponseEntity.ok(bankDetailsRepository.save(bd));
    }

    // ─── Disciplinary Actions ─────────────────────────────────────────────────

    @GetMapping("/disciplinary-actions")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List disciplinary actions (company-scoped)")
    public ResponseEntity<List<DisciplinaryAction>> listDisciplinary() {
        var spec = ScopeFilter.<DisciplinaryAction>byCompany();
        return ResponseEntity.ok(spec != null ? disciplinaryRepository.findAll(spec) : disciplinaryRepository.findAll());
    }

    @PostMapping("/disciplinary-actions")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a disciplinary action")
    public ResponseEntity<DisciplinaryAction> createDisciplinary(@RequestBody DisciplinaryAction action) {
        if (action.getCompany() != null && action.getCompany().getId() != null) {
            action.setCompany(companyRepository.getReferenceById(action.getCompany().getId()));
        }
        return ResponseEntity.ok(disciplinaryRepository.save(action));
    }

    @PutMapping("/disciplinary-actions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a disciplinary action")
    public ResponseEntity<DisciplinaryAction> updateDisciplinary(@PathVariable Long id,
                                                                   @RequestBody DisciplinaryAction updated) {
        DisciplinaryAction action = disciplinaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DisciplinaryAction", id));
        action.setActionType(updated.getActionType());
        action.setStartDate(updated.getStartDate());
        action.setDays(updated.getDays());
        action.setDescription(updated.getDescription());
        action.setEmployees(updated.getEmployees());
        return ResponseEntity.ok(disciplinaryRepository.save(action));
    }

    @DeleteMapping("/disciplinary-actions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a disciplinary action")
    public ResponseEntity<Map<String, String>> deleteDisciplinary(@PathVariable Long id) {
        disciplinaryRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Disciplinary action deleted"));
    }

    // ─── Bonus Points ─────────────────────────────────────────────────────────

    @GetMapping("/employees/{id}/bonus-points")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get bonus points for an employee")
    public ResponseEntity<BonusPoint> getBonusPoints(@PathVariable Long id) {
        return bonusPointRepository.findByEmployeeId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/employees/{id}/bonus-points")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update/create bonus points for an employee")
    public ResponseEntity<BonusPoint> updateBonusPoints(@PathVariable Long id,
                                                         @RequestBody BonusPoint updated) {
        BonusPoint bp = bonusPointRepository.findByEmployeeId(id)
                .orElseGet(() -> {
                    BonusPoint n = new BonusPoint();
                    n.setEmployee(employeeRepository.getReferenceById(id));
                    if (updated.getCompany() != null && updated.getCompany().getId() != null) {
                        n.setCompany(companyRepository.getReferenceById(updated.getCompany().getId()));
                    }
                    return n;
                });
        bp.setPoints(updated.getPoints());
        bp.setReason(updated.getReason());
        return ResponseEntity.ok(bonusPointRepository.save(bp));
    }

    // ─── Employee Tags ────────────────────────────────────────────────────────

    @GetMapping("/employee-tags")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List employee tags for company")
    public ResponseEntity<List<EmployeeTag>> listTags(@RequestParam(required = false) Long companyId) {
        if (companyId != null) return ResponseEntity.ok(employeeTagRepository.findByCompanyId(companyId));
        var spec = ScopeFilter.<EmployeeTag>byCompany();
        return ResponseEntity.ok(spec != null ? employeeTagRepository.findAll(spec) : employeeTagRepository.findAll());
    }

    @PostMapping("/employee-tags")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create an employee tag")
    public ResponseEntity<EmployeeTag> createTag(@RequestBody EmployeeTag tag) {
        if (tag.getCompany() != null && tag.getCompany().getId() != null) {
            tag.setCompany(companyRepository.getReferenceById(tag.getCompany().getId()));
        }
        return ResponseEntity.ok(employeeTagRepository.save(tag));
    }

    @PutMapping("/employee-tags/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update an employee tag")
    public ResponseEntity<EmployeeTag> updateTag(@PathVariable Long id, @RequestBody EmployeeTag updated) {
        EmployeeTag t = employeeTagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeTag", id));
        t.setTitle(updated.getTitle());
        t.setColor(updated.getColor());
        return ResponseEntity.ok(employeeTagRepository.save(t));
    }

    @DeleteMapping("/employee-tags/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an employee tag")
    public ResponseEntity<Map<String, String>> deleteTag(@PathVariable Long id) {
        employeeTagRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Tag deleted"));
    }

    // ─── Employee Notes ───────────────────────────────────────────────────────

    @GetMapping("/employees/{id}/notes")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List notes for an employee")
    public ResponseEntity<List<EmployeeNote>> listNotes(@PathVariable Long id) {
        return ResponseEntity.ok(employeeNoteRepository.findByEmployeeId(id));
    }

    @PostMapping("/employees/{id}/notes")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Transactional
    @Operation(summary = "Add a note to an employee")
    public ResponseEntity<EmployeeNote> createNote(@PathVariable Long id, @RequestBody EmployeeNote note) {
        note.setEmployee(employeeRepository.getReferenceById(id));
        if (note.getCreatedBy() != null && note.getCreatedBy().getId() != null) {
            note.setCreatedBy(employeeRepository.getReferenceById(note.getCreatedBy().getId()));
        }
        return ResponseEntity.ok(employeeNoteRepository.save(note));
    }

    @PutMapping("/employees/notes/{noteId}")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Transactional
    @Operation(summary = "Update an employee note")
    public ResponseEntity<EmployeeNote> updateNote(@PathVariable Long noteId, @RequestBody EmployeeNote updated) {
        EmployeeNote n = employeeNoteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeNote", noteId));
        n.setTitle(updated.getTitle());
        n.setNote(updated.getNote());
        return ResponseEntity.ok(employeeNoteRepository.save(n));
    }

    @DeleteMapping("/employees/notes/{noteId}")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Operation(summary = "Delete an employee note")
    public ResponseEntity<Map<String, String>> deleteNote(@PathVariable Long noteId) {
        employeeNoteRepository.deleteById(noteId);
        return ResponseEntity.ok(Map.of("message", "Note deleted"));
    }

    @GetMapping("/employees/notes/{noteId}/files")
    @PreAuthorize("hasAuthority('employee:view')")
    @Operation(summary = "List files for a note")
    public ResponseEntity<List<NoteFile>> listNoteFiles(@PathVariable Long noteId) {
        return ResponseEntity.ok(noteFileRepository.findByNoteId(noteId));
    }

    @PostMapping("/employees/notes/{noteId}/files")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Transactional
    @Operation(summary = "Add a file to a note")
    public ResponseEntity<NoteFile> addNoteFile(@PathVariable Long noteId, @RequestBody NoteFile file) {
        file.setNote(employeeNoteRepository.getReferenceById(noteId));
        return ResponseEntity.ok(noteFileRepository.save(file));
    }

    @DeleteMapping("/employees/notes/files/{fileId}")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Operation(summary = "Delete a note file")
    public ResponseEntity<Map<String, String>> deleteNoteFile(@PathVariable Long fileId) {
        noteFileRepository.deleteById(fileId);
        return ResponseEntity.ok(Map.of("message", "File deleted"));
    }

    // ─── Action Types ─────────────────────────────────────────────────────────

    @GetMapping("/action-types")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List disciplinary action types")
    public ResponseEntity<List<ActionType>> listActionTypes(@RequestParam(required = false) Long companyId) {
        if (companyId != null) return ResponseEntity.ok(actionTypeRepository.findByCompanyId(companyId));
        var spec = ScopeFilter.<ActionType>byCompany();
        return ResponseEntity.ok(spec != null ? actionTypeRepository.findAll(spec) : actionTypeRepository.findAll());
    }

    @PostMapping("/action-types")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create an action type")
    public ResponseEntity<ActionType> createActionType(@RequestBody ActionType actionType) {
        if (actionType.getCompany() != null && actionType.getCompany().getId() != null) {
            actionType.setCompany(companyRepository.getReferenceById(actionType.getCompany().getId()));
        }
        return ResponseEntity.ok(actionTypeRepository.save(actionType));
    }

    @PutMapping("/action-types/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update an action type")
    public ResponseEntity<ActionType> updateActionType(@PathVariable Long id, @RequestBody ActionType updated) {
        ActionType at = actionTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ActionType", id));
        at.setTitle(updated.getTitle());
        at.setDescription(updated.getDescription());
        return ResponseEntity.ok(actionTypeRepository.save(at));
    }

    @DeleteMapping("/action-types/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an action type")
    public ResponseEntity<Map<String, String>> deleteActionType(@PathVariable Long id) {
        actionTypeRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Action type deleted"));
    }

    // ─── Employee General Settings ────────────────────────────────────────────

    @GetMapping("/employee-settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get employee module general settings")
    public ResponseEntity<EmployeeGeneralSetting> getEmployeeSettings(@RequestParam Long companyId) {
        return employeeGeneralSettingRepository.findByCompanyId(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/employee-settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Upsert employee module general settings")
    public ResponseEntity<EmployeeGeneralSetting> upsertEmployeeSettings(@RequestParam Long companyId,
                                                                          @RequestBody EmployeeGeneralSetting body) {
        EmployeeGeneralSetting s = employeeGeneralSettingRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    EmployeeGeneralSetting n = new EmployeeGeneralSetting();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    return n;
                });
        s.setShowBadgeId(body.getShowBadgeId());
        s.setAllowProfileView(body.getAllowProfileView());
        s.setContractWarningDays(body.getContractWarningDays());
        return ResponseEntity.ok(employeeGeneralSettingRepository.save(s));
    }

    // ─── Profile Edit Features ─────────────────────────────────────────────────

    @GetMapping("/employee-profile-features")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List profile edit features for company")
    public ResponseEntity<List<ProfileEditFeature>> listProfileFeatures(@RequestParam Long companyId) {
        return ResponseEntity.ok(profileEditFeatureRepository.findByCompanyId(companyId));
    }

    @PutMapping("/employee-profile-features")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Upsert a profile edit feature")
    public ResponseEntity<ProfileEditFeature> upsertProfileFeature(@RequestParam Long companyId,
                                                                    @RequestBody ProfileEditFeature body) {
        ProfileEditFeature f = profileEditFeatureRepository
                .findByCompanyIdAndFeatureName(companyId, body.getFeatureName())
                .orElseGet(() -> {
                    ProfileEditFeature n = new ProfileEditFeature();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    n.setFeatureName(body.getFeatureName());
                    return n;
                });
        f.setIsEditable(body.getIsEditable());
        return ResponseEntity.ok(profileEditFeatureRepository.save(f));
    }
}
