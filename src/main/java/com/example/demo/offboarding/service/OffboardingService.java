package com.example.demo.offboarding.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.offboarding.entity.*;
import com.example.demo.offboarding.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class OffboardingService {

    private final EmployeeOffboardingRepository offboardingRepository;
    private final ResignationLetterRepository resignationRepository;
    private final ExitReasonRepository exitReasonRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final OffboardingPlanRepository planRepository;
    private final OffboardingStageRepository stageRepository;
    private final OffboardingStageFileRepository stageFileRepository;
    private final OffboardingEmployeeTaskRepository employeeTaskRepository;
    private final OffboardingNoteRepository noteRepository;
    private final OffboardingGeneralSettingRepository generalSettingRepository;

    // ─── Employee Offboarding ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeOffboarding> getByEmployee(Long employeeId) {
        return offboardingRepository.findByEmployeeId(employeeId);
    }

    public EmployeeOffboarding create(EmployeeOffboarding offboarding) {
        return offboardingRepository.save(offboarding);
    }

    public EmployeeOffboarding complete(Long id) {
        EmployeeOffboarding eo = offboardingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeOffboarding", id));
        eo.setStatus(EmployeeOffboarding.OffboardingStatus.COMPLETED);
        return offboardingRepository.save(eo);
    }

    public void delete(Long id) {
        offboardingRepository.deleteById(id);
    }

    // ─── Resignation Letters ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ResignationLetter> listResignations() {
        var spec = ScopeFilter.<ResignationLetter>byEmployee();
        return spec != null ? resignationRepository.findAll(spec) : resignationRepository.findAll();
    }

    public ResignationLetter createResignation(ResignationLetter letter) {
        if (letter.getEmployee() != null && letter.getEmployee().getId() != null) {
            letter.setEmployee(employeeRepository.getReferenceById(letter.getEmployee().getId()));
        }
        if (letter.getCompany() != null && letter.getCompany().getId() != null) {
            letter.setCompany(companyRepository.getReferenceById(letter.getCompany().getId()));
        }
        return resignationRepository.save(letter);
    }

    public ResignationLetter approveResignation(Long id) {
        ResignationLetter r = resignationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ResignationLetter", id));
        r.setStatus(ResignationLetter.ResignationStatus.APPROVED);
        return resignationRepository.save(r);
    }

    public ResignationLetter rejectResignation(Long id) {
        ResignationLetter r = resignationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ResignationLetter", id));
        r.setStatus(ResignationLetter.ResignationStatus.REJECTED);
        return resignationRepository.save(r);
    }

    // ─── Exit Reasons ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ExitReason> listExitReasons() {
        var spec = ScopeFilter.<ExitReason>byCompany();
        return spec != null ? exitReasonRepository.findAll(spec) : exitReasonRepository.findAll();
    }

    public ExitReason createExitReason(ExitReason reason) {
        if (reason.getCompany() != null && reason.getCompany().getId() != null) {
            reason.setCompany(companyRepository.getReferenceById(reason.getCompany().getId()));
        }
        return exitReasonRepository.save(reason);
    }

    public void deleteExitReason(Long id) {
        exitReasonRepository.deleteById(id);
    }

    // ─── Offboarding Plans ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingPlan> listPlans() {
        var spec = ScopeFilter.<OffboardingPlan>byCompany();
        return spec != null ? planRepository.findAll(spec) : planRepository.findAll();
    }

    public OffboardingPlan createPlan(OffboardingPlan plan) {
        if (plan.getCompany() != null && plan.getCompany().getId() != null) {
            plan.setCompany(companyRepository.getReferenceById(plan.getCompany().getId()));
        }
        return planRepository.save(plan);
    }

    public OffboardingPlan updatePlan(Long id, OffboardingPlan updated) {
        OffboardingPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OffboardingPlan", id));
        plan.setTitle(updated.getTitle());
        plan.setDescription(updated.getDescription());
        plan.setIsActive(updated.getIsActive());
        return planRepository.save(plan);
    }

    public void deletePlan(Long id) {
        planRepository.deleteById(id);
    }

    // ─── Offboarding Stages ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingStage> listStages(Long planId) {
        return stageRepository.findByPlanIdOrderBySequenceAsc(planId);
    }

    public OffboardingStage createStage(Long planId, OffboardingStage stage) {
        stage.setPlan(planRepository.getReferenceById(planId));
        return stageRepository.save(stage);
    }

    public OffboardingStage updateStage(Long id, OffboardingStage updated) {
        OffboardingStage stage = stageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OffboardingStage", id));
        stage.setTitle(updated.getTitle());
        stage.setSequence(updated.getSequence());
        return stageRepository.save(stage);
    }

    public void deleteStage(Long id) {
        stageRepository.deleteById(id);
    }

    // ─── Stage Files ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingStageFile> listStageFiles(Long stageId) {
        return stageFileRepository.findByStageId(stageId);
    }

    public OffboardingStageFile addStageFile(Long stageId, OffboardingStageFile file) {
        file.setStage(stageRepository.getReferenceById(stageId));
        return stageFileRepository.save(file);
    }

    public void deleteStageFile(Long id) {
        stageFileRepository.deleteById(id);
    }

    // ─── Employee Tasks ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingEmployeeTask> listEmployeeTasks(Long offboardingId) {
        return employeeTaskRepository.findByEmployeeOffboardingId(offboardingId);
    }

    public OffboardingEmployeeTask assignEmployeeTask(Long offboardingId, OffboardingEmployeeTask task) {
        task.setEmployeeOffboarding(offboardingRepository.getReferenceById(offboardingId));
        if (task.getAssignedTo() != null && task.getAssignedTo().getId() != null) {
            task.setAssignedTo(employeeRepository.getReferenceById(task.getAssignedTo().getId()));
        }
        return employeeTaskRepository.save(task);
    }

    public OffboardingEmployeeTask completeEmployeeTask(Long id) {
        OffboardingEmployeeTask task = employeeTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OffboardingEmployeeTask", id));
        task.setIsCompleted(true);
        return employeeTaskRepository.save(task);
    }

    // ─── Notes ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OffboardingNote> listNotes(Long offboardingId) {
        return noteRepository.findByEmployeeOffboardingId(offboardingId);
    }

    public OffboardingNote addNote(Long offboardingId, OffboardingNote note) {
        note.setEmployeeOffboarding(offboardingRepository.getReferenceById(offboardingId));
        if (note.getCreatedBy() != null && note.getCreatedBy().getId() != null) {
            note.setCreatedBy(employeeRepository.getReferenceById(note.getCreatedBy().getId()));
        }
        return noteRepository.save(note);
    }

    public void deleteNote(Long id) {
        noteRepository.deleteById(id);
    }

    // ─── General Settings ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public OffboardingGeneralSetting getSettings() {
        Long companyId = com.example.demo.common.context.CompanyContext.get();
        var result = companyId != null
                ? generalSettingRepository.findByCompanyId(companyId)
                : generalSettingRepository.findAll().stream().findFirst();
        return result.orElse(new OffboardingGeneralSetting());
    }

    public OffboardingGeneralSetting upsertSettings(OffboardingGeneralSetting incoming) {
        OffboardingGeneralSetting setting;
        if (incoming.getCompany() != null && incoming.getCompany().getId() != null) {
            setting = generalSettingRepository.findByCompanyId(incoming.getCompany().getId())
                    .orElse(new OffboardingGeneralSetting());
            setting.setCompany(companyRepository.getReferenceById(incoming.getCompany().getId()));
        } else {
            setting = new OffboardingGeneralSetting();
        }
        setting.setNoticePeriodDays(incoming.getNoticePeriodDays());
        setting.setEnableExitInterview(incoming.getEnableExitInterview());
        setting.setEnableAssetReturnCheck(incoming.getEnableAssetReturnCheck());
        setting.setEnableKnowledgeTransfer(incoming.getEnableKnowledgeTransfer());
        return generalSettingRepository.save(setting);
    }
}
