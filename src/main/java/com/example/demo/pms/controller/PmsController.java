package com.example.demo.pms.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.pms.entity.*;
import com.example.demo.pms.repository.*;
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
@RequestMapping("/api/pms")
@RequiredArgsConstructor
@Tag(name = "Performance Management")
public class PmsController {

    private final PerformanceCycleRepository cycleRepository;
    private final ObjectiveRepository objectiveRepository;
    private final EmployeeFeedbackRepository feedbackRepository;
    private final AnonymousFeedbackRepository anonymousFeedbackRepository;
    private final MeetingRepository meetingRepository;
    private final EmployeeBonusPointRepository bonusPointRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeObjectiveRepository employeeObjectiveRepository;
    private final EmployeeKeyResultRepository employeeKeyResultRepository;
    private final ObjectiveCommentRepository objectiveCommentRepository;
    private final QuestionTemplateRepository questionTemplateRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AnswerRepository answerRepository;
    private final KeyResultFeedbackRepository keyResultFeedbackRepository;
    private final KeyResultRepository keyResultRepository;
    private final MeetingAnswerRepository meetingAnswerRepository;
    private final BonusPointSettingRepository bonusPointSettingRepository;
    private final PeriodRepository periodRepository;

    @GetMapping("/cycles")
    @PreAuthorize("hasAuthority('pms:view')")
    public ResponseEntity<List<PerformanceCycle>> listCycles() {
        var spec = ScopeFilter.<PerformanceCycle>byCompany();
        return ResponseEntity.ok(spec != null ? cycleRepository.findAll(spec) : cycleRepository.findAll());
    }

    @PostMapping("/cycles")
    @PreAuthorize("hasAuthority('pms:create')")
    public ResponseEntity<PerformanceCycle> createCycle(@RequestBody PerformanceCycle cycle) {
        return ResponseEntity.ok(cycleRepository.save(cycle));
    }

    @PutMapping("/cycles/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    public ResponseEntity<PerformanceCycle> updateCycle(@PathVariable Long id, @RequestBody PerformanceCycle updated) {
        PerformanceCycle cycle = cycleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PerformanceCycle", id));
        cycle.setName(updated.getName());
        cycle.setStartDate(updated.getStartDate());
        cycle.setEndDate(updated.getEndDate());
        cycle.setStatus(updated.getStatus());
        return ResponseEntity.ok(cycleRepository.save(cycle));
    }

    @GetMapping("/objectives")
    @PreAuthorize("hasAuthority('pms:view')")
    public ResponseEntity<List<Objective>> listObjectives(@RequestParam(required = false) Long employeeId) {
        return ResponseEntity.ok(employeeId != null
                ? objectiveRepository.findByEmployeeId(employeeId)
                : objectiveRepository.findAll());
    }

    @PostMapping("/objectives")
    @PreAuthorize("hasAuthority('pms:create')")
    public ResponseEntity<Objective> createObjective(@RequestBody Objective objective) {
        return ResponseEntity.ok(objectiveRepository.save(objective));
    }

    @PutMapping("/objectives/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    public ResponseEntity<Objective> updateObjective(@PathVariable Long id, @RequestBody Objective updated) {
        Objective obj = objectiveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objective", id));
        obj.setTitle(updated.getTitle());
        obj.setDescription(updated.getDescription());
        obj.setStatus(updated.getStatus());
        obj.setProgress(updated.getProgress());
        obj.setDueDate(updated.getDueDate());
        return ResponseEntity.ok(objectiveRepository.save(obj));
    }

    @GetMapping("/feedback")
    @PreAuthorize("hasAuthority('pms:view')")
    public ResponseEntity<List<EmployeeFeedback>> listFeedback(@RequestParam(required = false) Long employeeId) {
        return ResponseEntity.ok(employeeId != null
                ? feedbackRepository.findByEmployeeId(employeeId)
                : feedbackRepository.findAll());
    }

    @PostMapping("/feedback")
    @PreAuthorize("hasAuthority('pms:create')")
    public ResponseEntity<EmployeeFeedback> createFeedback(@RequestBody EmployeeFeedback feedback) {
        return ResponseEntity.ok(feedbackRepository.save(feedback));
    }

    @PutMapping("/feedback/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    public ResponseEntity<EmployeeFeedback> updateFeedback(@PathVariable Long id, @RequestBody EmployeeFeedback updated) {
        EmployeeFeedback fb = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeFeedback", id));
        fb.setRating(updated.getRating());
        fb.setFeedback(updated.getFeedback());
        fb.setStatus(updated.getStatus());
        return ResponseEntity.ok(feedbackRepository.save(fb));
    }

    // ─── Anonymous Feedback ───────────────────────────────────────────────────

    @GetMapping("/anonymous-feedback")
    @PreAuthorize("hasAuthority('pms:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List anonymous feedback (company-scoped)")
    public ResponseEntity<List<AnonymousFeedback>> listAnonymousFeedback() {
        var spec = ScopeFilter.<AnonymousFeedback>byCompany();
        return ResponseEntity.ok(spec != null ? anonymousFeedbackRepository.findAll(spec) : anonymousFeedbackRepository.findAll());
    }

    @PostMapping("/anonymous-feedback")
    @PreAuthorize("hasAuthority('pms:create')")
    @Transactional
    @Operation(summary = "Submit anonymous feedback")
    public ResponseEntity<AnonymousFeedback> createAnonymousFeedback(@RequestBody AnonymousFeedback feedback) {
        if (feedback.getCompany() != null && feedback.getCompany().getId() != null) {
            feedback.setCompany(companyRepository.getReferenceById(feedback.getCompany().getId()));
        }
        return ResponseEntity.ok(anonymousFeedbackRepository.save(feedback));
    }

    @PutMapping("/anonymous-feedback/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Transactional
    @Operation(summary = "Update anonymous feedback")
    public ResponseEntity<AnonymousFeedback> updateAnonymousFeedback(@PathVariable Long id, @RequestBody AnonymousFeedback updated) {
        AnonymousFeedback fb = anonymousFeedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AnonymousFeedback", id));
        fb.setFeedbackSubject(updated.getFeedbackSubject());
        fb.setFeedbackDescription(updated.getFeedbackDescription());
        fb.setStatus(updated.getStatus());
        fb.setArchive(updated.getArchive());
        return ResponseEntity.ok(anonymousFeedbackRepository.save(fb));
    }

    @DeleteMapping("/anonymous-feedback/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Delete anonymous feedback")
    public ResponseEntity<Map<String, String>> deleteAnonymousFeedback(@PathVariable Long id) {
        anonymousFeedbackRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Feedback deleted"));
    }

    // ─── Meetings ─────────────────────────────────────────────────────────────

    @GetMapping("/meetings")
    @PreAuthorize("hasAuthority('pms:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List meetings (company-scoped)")
    public ResponseEntity<List<Meeting>> listMeetings() {
        var spec = ScopeFilter.<Meeting>byCompany();
        return ResponseEntity.ok(spec != null ? meetingRepository.findAll(spec) : meetingRepository.findAll());
    }

    @PostMapping("/meetings")
    @PreAuthorize("hasAuthority('pms:create')")
    @Transactional
    @Operation(summary = "Create a meeting")
    public ResponseEntity<Meeting> createMeeting(@RequestBody Meeting meeting) {
        if (meeting.getManager() != null && meeting.getManager().getId() != null) {
            meeting.setManager(employeeRepository.getReferenceById(meeting.getManager().getId()));
        }
        if (meeting.getCompany() != null && meeting.getCompany().getId() != null) {
            meeting.setCompany(companyRepository.getReferenceById(meeting.getCompany().getId()));
        }
        return ResponseEntity.ok(meetingRepository.save(meeting));
    }

    @PutMapping("/meetings/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Transactional
    @Operation(summary = "Update a meeting")
    public ResponseEntity<Meeting> updateMeeting(@PathVariable Long id, @RequestBody Meeting updated) {
        Meeting m = meetingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting", id));
        m.setTitle(updated.getTitle());
        m.setDate(updated.getDate());
        m.setResponse(updated.getResponse());
        return ResponseEntity.ok(meetingRepository.save(m));
    }

    @DeleteMapping("/meetings/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Delete a meeting")
    public ResponseEntity<Map<String, String>> deleteMeeting(@PathVariable Long id) {
        meetingRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Meeting deleted"));
    }

    // ─── Bonus Points ─────────────────────────────────────────────────────────

    @GetMapping("/bonus-points")
    @PreAuthorize("hasAuthority('pms:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List bonus points (company-scoped)")
    public ResponseEntity<List<EmployeeBonusPoint>> listBonusPoints(@RequestParam(required = false) Long employeeId) {
        if (employeeId != null) return ResponseEntity.ok(bonusPointRepository.findByEmployeeId(employeeId));
        var spec = ScopeFilter.<EmployeeBonusPoint>byEmployee();
        return ResponseEntity.ok(spec != null ? bonusPointRepository.findAll(spec) : bonusPointRepository.findAll());
    }

    @PostMapping("/bonus-points")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Award bonus points to an employee")
    public ResponseEntity<EmployeeBonusPoint> awardBonusPoints(@RequestBody EmployeeBonusPoint bp) {
        if (bp.getEmployee() != null && bp.getEmployee().getId() != null) {
            bp.setEmployee(employeeRepository.getReferenceById(bp.getEmployee().getId()));
        }
        if (bp.getCompany() != null && bp.getCompany().getId() != null) {
            bp.setCompany(companyRepository.getReferenceById(bp.getCompany().getId()));
        }
        return ResponseEntity.ok(bonusPointRepository.save(bp));
    }

    // ─── Employee Objectives ──────────────────────────────────────────────────

    @GetMapping("/employee-objectives")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List employee-objective assignments")
    public ResponseEntity<List<EmployeeObjective>> listEmployeeObjectives(@RequestParam(required = false) Long employeeId,
                                                                           @RequestParam(required = false) Long objectiveId) {
        if (employeeId != null) return ResponseEntity.ok(employeeObjectiveRepository.findByEmployeeId(employeeId));
        if (objectiveId != null) return ResponseEntity.ok(employeeObjectiveRepository.findByObjectiveId(objectiveId));
        return ResponseEntity.ok(employeeObjectiveRepository.findAll());
    }

    @PostMapping("/employee-objectives")
    @PreAuthorize("hasAuthority('pms:create')")
    @Transactional
    @Operation(summary = "Assign employee to an objective")
    public ResponseEntity<EmployeeObjective> assignEmployeeObjective(@RequestBody EmployeeObjective eo) {
        if (eo.getEmployee() != null && eo.getEmployee().getId() != null) {
            eo.setEmployee(employeeRepository.getReferenceById(eo.getEmployee().getId()));
        }
        return ResponseEntity.ok(employeeObjectiveRepository.save(eo));
    }

    @DeleteMapping("/employee-objectives/{id}")
    @PreAuthorize("hasAuthority('pms:delete')")
    @Operation(summary = "Remove employee-objective assignment")
    public ResponseEntity<Void> removeEmployeeObjective(@PathVariable Long id) {
        employeeObjectiveRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Employee Key Results ─────────────────────────────────────────────────

    @GetMapping("/key-results/{keyResultId}/employee-progress")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "Get employee progress on a key result")
    public ResponseEntity<List<EmployeeKeyResult>> listKeyResultProgress(@PathVariable Long keyResultId) {
        return ResponseEntity.ok(employeeKeyResultRepository.findByKeyResultId(keyResultId));
    }

    @PostMapping("/employee-key-results")
    @PreAuthorize("hasAuthority('pms:create')")
    @Transactional
    @Operation(summary = "Record employee key result progress")
    public ResponseEntity<EmployeeKeyResult> recordKeyResultProgress(@RequestBody EmployeeKeyResult ekr) {
        if (ekr.getEmployee() != null && ekr.getEmployee().getId() != null) {
            ekr.setEmployee(employeeRepository.getReferenceById(ekr.getEmployee().getId()));
        }
        return ResponseEntity.ok(employeeKeyResultRepository.save(ekr));
    }

    @PutMapping("/employee-key-results/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Transactional
    @Operation(summary = "Update employee key result progress")
    public ResponseEntity<EmployeeKeyResult> updateKeyResultProgress(@PathVariable Long id,
                                                                      @RequestBody EmployeeKeyResult updated) {
        EmployeeKeyResult ekr = employeeKeyResultRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeKeyResult", id));
        ekr.setCurrentValue(updated.getCurrentValue());
        ekr.setProgress(updated.getProgress());
        ekr.setNotes(updated.getNotes());
        return ResponseEntity.ok(employeeKeyResultRepository.save(ekr));
    }

    // ─── Objective Comments ───────────────────────────────────────────────────

    @GetMapping("/objectives/{objectiveId}/comments")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List comments on an objective")
    public ResponseEntity<List<ObjectiveComment>> listObjectiveComments(@PathVariable Long objectiveId) {
        return ResponseEntity.ok(objectiveCommentRepository.findByObjectiveId(objectiveId));
    }

    @PostMapping("/objectives/{objectiveId}/comments")
    @PreAuthorize("hasAuthority('pms:create')")
    @Transactional
    @Operation(summary = "Add a comment to an objective")
    public ResponseEntity<ObjectiveComment> addObjectiveComment(@PathVariable Long objectiveId,
                                                                 @RequestBody ObjectiveComment comment) {
        comment.setObjective(objectiveRepository.getReferenceById(objectiveId));
        if (comment.getCreatedBy() != null && comment.getCreatedBy().getId() != null) {
            comment.setCreatedBy(employeeRepository.getReferenceById(comment.getCreatedBy().getId()));
        }
        return ResponseEntity.ok(objectiveCommentRepository.save(comment));
    }

    @DeleteMapping("/objective-comments/{id}")
    @PreAuthorize("hasAuthority('pms:delete')")
    @Operation(summary = "Delete an objective comment")
    public ResponseEntity<Void> deleteObjectiveComment(@PathVariable Long id) {
        objectiveCommentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Question Templates ───────────────────────────────────────────────────

    @GetMapping("/question-templates")
    @PreAuthorize("hasAuthority('pms:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List question templates (company-scoped)")
    public ResponseEntity<List<QuestionTemplate>> listQuestionTemplates() {
        var spec = ScopeFilter.<QuestionTemplate>byCompany();
        return ResponseEntity.ok(spec != null ? questionTemplateRepository.findAll(spec) : questionTemplateRepository.findAll());
    }

    @PostMapping("/question-templates")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a question template")
    public ResponseEntity<QuestionTemplate> createQuestionTemplate(@RequestBody QuestionTemplate template) {
        if (template.getCompany() != null && template.getCompany().getId() != null) {
            template.setCompany(companyRepository.getReferenceById(template.getCompany().getId()));
        }
        return ResponseEntity.ok(questionTemplateRepository.save(template));
    }

    @PutMapping("/question-templates/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a question template")
    public ResponseEntity<QuestionTemplate> updateQuestionTemplate(@PathVariable Long id,
                                                                    @RequestBody QuestionTemplate updated) {
        QuestionTemplate tmpl = questionTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QuestionTemplate", id));
        tmpl.setTitle(updated.getTitle());
        tmpl.setDescription(updated.getDescription());
        return ResponseEntity.ok(questionTemplateRepository.save(tmpl));
    }

    @DeleteMapping("/question-templates/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a question template")
    public ResponseEntity<Void> deleteQuestionTemplate(@PathVariable Long id) {
        questionTemplateRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Questions ────────────────────────────────────────────────────────────

    @GetMapping("/question-templates/{templateId}/questions")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List questions for a template")
    public ResponseEntity<List<Question>> listQuestions(@PathVariable Long templateId) {
        return ResponseEntity.ok(questionRepository.findByTemplateIdOrderBySequenceAsc(templateId));
    }

    @PostMapping("/question-templates/{templateId}/questions")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Add a question to a template")
    public ResponseEntity<Question> addQuestion(@PathVariable Long templateId, @RequestBody Question question) {
        question.setTemplate(questionTemplateRepository.getReferenceById(templateId));
        return ResponseEntity.ok(questionRepository.save(question));
    }

    @DeleteMapping("/questions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a question")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        questionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Question Options ─────────────────────────────────────────────────────

    @GetMapping("/questions/{questionId}/options")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List options for a question")
    public ResponseEntity<List<QuestionOption>> listOptions(@PathVariable Long questionId) {
        return ResponseEntity.ok(questionOptionRepository.findByQuestionIdOrderBySequenceAsc(questionId));
    }

    @PostMapping("/questions/{questionId}/options")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Add an option to a question")
    public ResponseEntity<QuestionOption> addOption(@PathVariable Long questionId, @RequestBody QuestionOption option) {
        option.setQuestion(questionRepository.getReferenceById(questionId));
        return ResponseEntity.ok(questionOptionRepository.save(option));
    }

    @DeleteMapping("/question-options/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a question option")
    public ResponseEntity<Void> deleteOption(@PathVariable Long id) {
        questionOptionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Answers ──────────────────────────────────────────────────────────────

    @GetMapping("/questions/{questionId}/answers")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List answers for a question")
    public ResponseEntity<List<Answer>> listAnswers(@PathVariable Long questionId) {
        return ResponseEntity.ok(answerRepository.findByQuestionId(questionId));
    }

    @PostMapping("/questions/{questionId}/answers")
    @PreAuthorize("hasAuthority('pms:create')")
    @Transactional
    @Operation(summary = "Submit an answer to a question")
    public ResponseEntity<Answer> submitAnswer(@PathVariable Long questionId, @RequestBody Answer answer) {
        answer.setQuestion(questionRepository.getReferenceById(questionId));
        if (answer.getRespondent() != null && answer.getRespondent().getId() != null) {
            answer.setRespondent(employeeRepository.getReferenceById(answer.getRespondent().getId()));
        }
        return ResponseEntity.ok(answerRepository.save(answer));
    }

    // ─── Key Result Feedback ──────────────────────────────────────────────────

    @GetMapping("/key-results/{keyResultId}/feedback")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List feedback for a key result")
    public ResponseEntity<List<KeyResultFeedback>> listKeyResultFeedback(@PathVariable Long keyResultId) {
        return ResponseEntity.ok(keyResultFeedbackRepository.findByKeyResultId(keyResultId));
    }

    @PostMapping("/key-results/{keyResultId}/feedback")
    @PreAuthorize("hasAuthority('pms:create')")
    @Transactional
    @Operation(summary = "Add feedback for a key result")
    public ResponseEntity<KeyResultFeedback> addKeyResultFeedback(@PathVariable Long keyResultId,
                                                                   @RequestBody KeyResultFeedback krf) {
        krf.setKeyResult(keyResultRepository.getReferenceById(keyResultId));
        if (krf.getGivenBy() != null && krf.getGivenBy().getId() != null) {
            krf.setGivenBy(employeeRepository.getReferenceById(krf.getGivenBy().getId()));
        }
        return ResponseEntity.ok(keyResultFeedbackRepository.save(krf));
    }

    // ─── Meeting Answers ──────────────────────────────────────────────────────

    @GetMapping("/meetings/{meetingId}/answers")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List notes/answers for a meeting")
    public ResponseEntity<List<MeetingAnswer>> listMeetingAnswers(@PathVariable Long meetingId) {
        return ResponseEntity.ok(meetingAnswerRepository.findByMeetingId(meetingId));
    }

    @PostMapping("/meetings/{meetingId}/answers")
    @PreAuthorize("hasAuthority('pms:create')")
    @Transactional
    @Operation(summary = "Add a note/answer to a meeting")
    public ResponseEntity<MeetingAnswer> addMeetingAnswer(@PathVariable Long meetingId,
                                                           @RequestBody MeetingAnswer ma) {
        ma.setMeeting(meetingRepository.getReferenceById(meetingId));
        return ResponseEntity.ok(meetingAnswerRepository.save(ma));
    }

    @DeleteMapping("/meeting-answers/{id}")
    @PreAuthorize("hasAuthority('pms:delete')")
    @Operation(summary = "Delete a meeting answer")
    public ResponseEntity<Void> deleteMeetingAnswer(@PathVariable Long id) {
        meetingAnswerRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Bonus Point Settings ─────────────────────────────────────────────────

    @GetMapping("/bonus-point-settings")
    @PreAuthorize("hasAuthority('pms:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get bonus point settings for current company")
    public ResponseEntity<BonusPointSetting> getBonusPointSettings() {
        var list = bonusPointSettingRepository.findAll();
        return ResponseEntity.ok(list.isEmpty() ? new BonusPointSetting() : list.get(0));
    }

    @PutMapping("/bonus-point-settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Upsert bonus point settings")
    public ResponseEntity<BonusPointSetting> upsertBonusPointSettings(@RequestBody BonusPointSetting incoming) {
        BonusPointSetting setting;
        if (incoming.getCompany() != null && incoming.getCompany().getId() != null) {
            setting = bonusPointSettingRepository.findByCompanyId(incoming.getCompany().getId())
                    .orElse(new BonusPointSetting());
            setting.setCompany(companyRepository.getReferenceById(incoming.getCompany().getId()));
        } else {
            setting = bonusPointSettingRepository.findAll().stream().findFirst().orElse(new BonusPointSetting());
        }
        setting.setPointsPerCompletion(incoming.getPointsPerCompletion());
        setting.setEnableBonusPoints(incoming.getEnableBonusPoints());
        setting.setMaxRedeemablePoints(incoming.getMaxRedeemablePoints());
        setting.setRedemptionRate(incoming.getRedemptionRate());
        return ResponseEntity.ok(bonusPointSettingRepository.save(setting));
    }

    // ─── Periods ──────────────────────────────────────────────────────────────

    @GetMapping("/periods")
    @PreAuthorize("hasAuthority('pms:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List all PMS periods")
    public ResponseEntity<List<Period>> listPeriods() {
        return ResponseEntity.ok(periodRepository.findAll());
    }

    @GetMapping("/periods/{id}")
    @PreAuthorize("hasAuthority('pms:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get a PMS period by ID")
    public ResponseEntity<Period> getPeriod(@PathVariable Long id) {
        return ResponseEntity.ok(periodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Period", id)));
    }

    @PostMapping("/periods")
    @PreAuthorize("hasAuthority('pms:create')")
    @Transactional
    @Operation(summary = "Create a PMS period")
    public ResponseEntity<Period> createPeriod(@RequestBody Period period) {
        return ResponseEntity.ok(periodRepository.save(period));
    }

    @PutMapping("/periods/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Transactional
    @Operation(summary = "Update a PMS period")
    public ResponseEntity<Period> updatePeriod(@PathVariable Long id, @RequestBody Period updated) {
        Period p = periodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Period", id));
        p.setPeriodName(updated.getPeriodName());
        p.setStartDate(updated.getStartDate());
        p.setEndDate(updated.getEndDate());
        return ResponseEntity.ok(periodRepository.save(p));
    }

    @DeleteMapping("/periods/{id}")
    @PreAuthorize("hasAuthority('pms:delete')")
    @Operation(summary = "Delete a PMS period")
    public ResponseEntity<Map<String, String>> deletePeriod(@PathVariable Long id) {
        periodRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Period deleted"));
    }

    // ─── Feedback Overview ────────────────────────────────────────────────────

    @GetMapping("/feedback/overview")
    @PreAuthorize("hasAuthority('pms:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get feedback overview KPIs for a company")
    public ResponseEntity<Map<String, Object>> feedbackOverview(@RequestParam(required = false) Long companyId) {
        List<EmployeeFeedback> all = feedbackRepository.findAll();
        long total = all.size();
        long completed = all.stream()
                .filter(f -> EmployeeFeedback.FeedbackStatus.COMPLETED.equals(f.getStatus()))
                .count();
        long pending = all.stream()
                .filter(f -> EmployeeFeedback.FeedbackStatus.REQUESTED.equals(f.getStatus()))
                .count();
        double averageScore = all.stream()
                .filter(f -> f.getRating() != null)
                .mapToDouble(EmployeeFeedback::getRating)
                .average()
                .orElse(0.0);
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("totalFeedback", total);
        result.put("completedFeedback", completed);
        result.put("pendingFeedback", pending);
        result.put("averageScore", averageScore);
        return ResponseEntity.ok(result);
    }

    // ─── Bulk Create Feedback ─────────────────────────────────────────────────

    @PostMapping("/feedback/bulk-create")
    @PreAuthorize("hasAuthority('pms:create')")
    @Transactional
    @Operation(summary = "Bulk create employee feedback records")
    public ResponseEntity<Map<String, Object>> bulkCreateFeedback(@RequestBody List<Map<String, Object>> feedbackList) {
        int count = 0;
        for (Map<String, Object> entry : feedbackList) {
            EmployeeFeedback fb = new EmployeeFeedback();
            if (entry.get("employeeId") instanceof Number empId) {
                fb.setEmployee(employeeRepository.getReferenceById(((Number) empId).longValue()));
            }
            if (entry.get("reviewerId") instanceof Number revId) {
                fb.setReviewer(employeeRepository.getReferenceById(((Number) revId).longValue()));
            }
            if (entry.get("rating") instanceof Number rating) {
                fb.setRating(((Number) rating).doubleValue());
            }
            if (entry.get("feedback") instanceof String feedbackText) {
                fb.setFeedback(feedbackText);
            }
            if (entry.get("feedbackType") instanceof String typeStr) {
                try {
                    fb.setFeedbackType(EmployeeFeedback.FeedbackType.valueOf(typeStr));
                } catch (IllegalArgumentException ignored) {}
            }
            feedbackRepository.save(fb);
            count++;
        }
        return ResponseEntity.ok(Map.of("created", count));
    }

    // ─── Archive / Unarchive Objective ───────────────────────────────────────

    @PostMapping("/objectives/{id}/archive")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Transactional
    @Operation(summary = "Archive an objective (sets status to AT_RISK as archived marker)")
    public ResponseEntity<Map<String, Object>> archiveObjective(@PathVariable Long id) {
        Objective obj = objectiveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objective", id));
        obj.setStatus(Objective.ObjectiveStatus.AT_RISK);
        objectiveRepository.save(obj);
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", id);
        result.put("message", "Objective archived");
        result.put("status", obj.getStatus());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/objectives/{id}/unarchive")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Transactional
    @Operation(summary = "Unarchive an objective (sets status back to IN_PROGRESS)")
    public ResponseEntity<Map<String, Object>> unarchiveObjective(@PathVariable Long id) {
        Objective obj = objectiveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objective", id));
        obj.setStatus(Objective.ObjectiveStatus.IN_PROGRESS);
        objectiveRepository.save(obj);
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", id);
        result.put("message", "Objective unarchived");
        result.put("status", obj.getStatus());
        return ResponseEntity.ok(result);
    }

    // ─── Archive Feedback ─────────────────────────────────────────────────────

    @PostMapping("/feedback/{id}/archive")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Transactional
    @Operation(summary = "Archive a feedback record (marks as COMPLETED)")
    public ResponseEntity<Map<String, Object>> archiveFeedback(@PathVariable Long id) {
        EmployeeFeedback fb = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeFeedback", id));
        fb.setStatus(EmployeeFeedback.FeedbackStatus.COMPLETED);
        feedbackRepository.save(fb);
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", id);
        result.put("message", "Feedback archived");
        result.put("status", fb.getStatus());
        return ResponseEntity.ok(result);
    }

    // ─── PMS Dashboard ────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('pms:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "PMS dashboard KPIs")
    public ResponseEntity<Map<String, Object>> pmsDashboard(@RequestParam(required = false) Long companyId) {
        List<Objective> objectives = objectiveRepository.findAll();
        long totalObjectives = objectives.size();
        long completedObjectives = objectives.stream()
                .filter(o -> Objective.ObjectiveStatus.COMPLETED.equals(o.getStatus()))
                .count();
        long pendingObjectives = objectives.stream()
                .filter(o -> !Objective.ObjectiveStatus.COMPLETED.equals(o.getStatus()))
                .count();
        long totalFeedback = feedbackRepository.count();
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("totalObjectives", totalObjectives);
        result.put("completedObjectives", completedObjectives);
        result.put("pendingObjectives", pendingObjectives);
        result.put("totalFeedback", totalFeedback);
        return ResponseEntity.ok(result);
    }
}
