package com.example.demo.pms.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.pms.entity.*;
import com.example.demo.pms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PmsService {

    private final PerformanceCycleRepository cycleRepository;
    private final ObjectiveRepository objectiveRepository;
    private final KeyResultRepository keyResultRepository;
    private final EmployeeFeedbackRepository feedbackRepository;
    private final AnonymousFeedbackRepository anonymousFeedbackRepository;
    private final MeetingRepository meetingRepository;
    private final EmployeeBonusPointRepository bonusPointRepository;
    private final EmployeeObjectiveRepository employeeObjectiveRepository;
    private final EmployeeKeyResultRepository employeeKeyResultRepository;
    private final ObjectiveCommentRepository objectiveCommentRepository;
    private final QuestionTemplateRepository questionTemplateRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AnswerRepository answerRepository;
    private final KeyResultFeedbackRepository keyResultFeedbackRepository;
    private final MeetingAnswerRepository meetingAnswerRepository;
    private final BonusPointSettingRepository bonusPointSettingRepository;
    private final PeriodRepository periodRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    // ─── Performance Cycles ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PerformanceCycle> listCycles() {
        Specification<PerformanceCycle> spec = ScopeFilter.byCompany();
        return spec != null ? cycleRepository.findAll(spec) : cycleRepository.findAll();
    }

    @Transactional
    public PerformanceCycle createCycle(PerformanceCycle cycle) {
        if (cycle.getCompany() != null && cycle.getCompany().getId() != null) {
            cycle.setCompany(companyRepository.getReferenceById(cycle.getCompany().getId()));
        } else {
            AccessScopeContext.ScopeData scope = AccessScopeContext.get();
            if (scope != null && scope.getCompanyId() != null) {
                cycle.setCompany(companyRepository.getReferenceById(scope.getCompanyId()));
            }
        }
        log.info("Creating performance cycle: {}", cycle.getName());
        return cycleRepository.save(cycle);
    }

    @Transactional
    public PerformanceCycle updateCycle(Long id, PerformanceCycle updated) {
        PerformanceCycle cycle = cycleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PerformanceCycle", id));
        cycle.setName(updated.getName());
        cycle.setStartDate(updated.getStartDate());
        cycle.setEndDate(updated.getEndDate());
        cycle.setStatus(updated.getStatus());
        log.info("Updating performance cycle id={}", id);
        return cycleRepository.save(cycle);
    }

    @Transactional
    public void deleteCycle(Long id) {
        PerformanceCycle cycle = cycleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PerformanceCycle", id));
        cycle.setStatus(PerformanceCycle.CycleStatus.CLOSED);
        cycleRepository.save(cycle);
        log.info("Soft-deleted (closed) performance cycle id={}", id);
    }

    // ─── Objectives ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Objective> listObjectives(Long employeeId) {
        if (employeeId != null) {
            return objectiveRepository.findByEmployeeId(employeeId);
        }
        Specification<Objective> spec = byEmployeeCompany();
        return spec != null ? objectiveRepository.findAll(spec) : objectiveRepository.findAll();
    }

    @Transactional
    public Objective createObjective(Objective objective) {
        if (objective.getEmployee() != null && objective.getEmployee().getId() != null) {
            objective.setEmployee(employeeRepository.getReferenceById(objective.getEmployee().getId()));
        }
        if (objective.getCycle() != null && objective.getCycle().getId() != null) {
            objective.setCycle(cycleRepository.getReferenceById(objective.getCycle().getId()));
        }
        log.info("Creating objective: {}", objective.getTitle());
        return objectiveRepository.save(objective);
    }

    @Transactional
    public Objective updateObjective(Long id, Objective updated) {
        Objective obj = objectiveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objective", id));
        obj.setTitle(updated.getTitle());
        obj.setDescription(updated.getDescription());
        obj.setStatus(updated.getStatus());
        obj.setProgress(updated.getProgress());
        obj.setDueDate(updated.getDueDate());
        log.info("Updating objective id={}", id);
        return objectiveRepository.save(obj);
    }

    @Transactional
    public void deleteObjective(Long id) {
        if (!objectiveRepository.existsById(id)) {
            throw new ResourceNotFoundException("Objective", id);
        }
        objectiveRepository.deleteById(id);
        log.info("Deleted objective id={}", id);
    }

    @Transactional
    public Objective archiveObjective(Long id) {
        Objective obj = objectiveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objective", id));
        obj.setStatus(Objective.ObjectiveStatus.ARCHIVED);
        log.info("Archiving objective id={}", id);
        return objectiveRepository.save(obj);
    }

    @Transactional
    public Objective unarchiveObjective(Long id) {
        Objective obj = objectiveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objective", id));
        obj.setStatus(Objective.ObjectiveStatus.IN_PROGRESS);
        log.info("Unarchiving objective id={}", id);
        return objectiveRepository.save(obj);
    }

    // ─── Key Results ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<KeyResult> listKeyResults(Long objectiveId) {
        if (objectiveId != null) {
            return keyResultRepository.findByObjectiveId(objectiveId);
        }
        return keyResultRepository.findAll();
    }

    @Transactional
    public KeyResult createKeyResult(KeyResult keyResult) {
        if (keyResult.getObjective() != null && keyResult.getObjective().getId() != null) {
            keyResult.setObjective(objectiveRepository.getReferenceById(keyResult.getObjective().getId()));
        }
        log.info("Creating key result: {}", keyResult.getTitle());
        return keyResultRepository.save(keyResult);
    }

    @Transactional
    public KeyResult updateKeyResult(Long id, KeyResult updated) {
        KeyResult kr = keyResultRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KeyResult", id));
        kr.setTitle(updated.getTitle());
        kr.setTargetValue(updated.getTargetValue());
        kr.setCurrentValue(updated.getCurrentValue());
        kr.setProgress(updated.getProgress());
        log.info("Updating key result id={}", id);
        return keyResultRepository.save(kr);
    }

    @Transactional
    public void deleteKeyResult(Long id) {
        if (!keyResultRepository.existsById(id)) {
            throw new ResourceNotFoundException("KeyResult", id);
        }
        keyResultRepository.deleteById(id);
        log.info("Deleted key result id={}", id);
    }

    @Transactional
    public KeyResult updateKeyResultProgress(Long keyResultId, Double currentValue) {
        KeyResult kr = keyResultRepository.findById(keyResultId)
                .orElseThrow(() -> new ResourceNotFoundException("KeyResult", keyResultId));
        kr.setCurrentValue(currentValue);
        if (kr.getTargetValue() != null && kr.getTargetValue() > 0) {
            int progressPercent = (int) Math.min(100, (currentValue / kr.getTargetValue()) * 100);
            kr.setProgress(progressPercent);
        }
        log.info("Updating progress for key result id={}, currentValue={}", keyResultId, currentValue);
        return keyResultRepository.save(kr);
    }

    // ─── Employee Feedback ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeFeedback> listFeedback(Long employeeId) {
        if (employeeId != null) {
            return feedbackRepository.findByEmployeeId(employeeId);
        }
        Specification<EmployeeFeedback> spec = byEmployeeCompany();
        return spec != null ? feedbackRepository.findAll(spec) : feedbackRepository.findAll();
    }

    @Transactional
    public EmployeeFeedback createFeedback(EmployeeFeedback feedback) {
        if (feedback.getEmployee() != null && feedback.getEmployee().getId() != null) {
            feedback.setEmployee(employeeRepository.getReferenceById(feedback.getEmployee().getId()));
        }
        if (feedback.getReviewer() != null && feedback.getReviewer().getId() != null) {
            feedback.setReviewer(employeeRepository.getReferenceById(feedback.getReviewer().getId()));
        }
        if (feedback.getCycle() != null && feedback.getCycle().getId() != null) {
            feedback.setCycle(cycleRepository.getReferenceById(feedback.getCycle().getId()));
        }
        log.info("Creating employee feedback for employee id={}", feedback.getEmployee() != null ? feedback.getEmployee().getId() : null);
        return feedbackRepository.save(feedback);
    }

    @Transactional
    public EmployeeFeedback updateFeedback(Long id, EmployeeFeedback updated) {
        EmployeeFeedback fb = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeFeedback", id));
        fb.setRating(updated.getRating());
        fb.setFeedback(updated.getFeedback());
        fb.setStatus(updated.getStatus());
        fb.setFeedbackType(updated.getFeedbackType());
        log.info("Updating employee feedback id={}", id);
        return feedbackRepository.save(fb);
    }

    @Transactional
    public EmployeeFeedback archiveFeedback(Long id) {
        EmployeeFeedback fb = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeFeedback", id));
        fb.setStatus(EmployeeFeedback.FeedbackStatus.COMPLETED);
        log.info("Archiving feedback id={}", id);
        return feedbackRepository.save(fb);
    }

    @Transactional
    public int bulkCreateFeedback(List<Map<String, Object>> feedbackList) {
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
                } catch (IllegalArgumentException ignored) {
                    log.warn("Unknown feedbackType value: {}", typeStr);
                }
            }
            feedbackRepository.save(fb);
            count++;
        }
        log.info("Bulk created {} feedback records", count);
        return count;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> feedbackOverview() {
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
        Map<String, Object> result = new HashMap<>();
        result.put("totalFeedback", total);
        result.put("completedFeedback", completed);
        result.put("pendingFeedback", pending);
        result.put("averageScore", averageScore);
        return result;
    }

    // ─── Anonymous Feedback ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AnonymousFeedback> listAnonymousFeedback() {
        Specification<AnonymousFeedback> spec = ScopeFilter.byCompany();
        return spec != null ? anonymousFeedbackRepository.findAll(spec) : anonymousFeedbackRepository.findAll();
    }

    @Transactional
    public AnonymousFeedback createAnonymousFeedback(AnonymousFeedback feedback) {
        if (feedback.getCompany() != null && feedback.getCompany().getId() != null) {
            feedback.setCompany(companyRepository.getReferenceById(feedback.getCompany().getId()));
        }
        if (feedback.getTargetEmployee() != null && feedback.getTargetEmployee().getId() != null) {
            feedback.setTargetEmployee(employeeRepository.getReferenceById(feedback.getTargetEmployee().getId()));
        }
        log.info("Creating anonymous feedback: {}", feedback.getFeedbackSubject());
        return anonymousFeedbackRepository.save(feedback);
    }

    @Transactional
    public AnonymousFeedback updateAnonymousFeedback(Long id, AnonymousFeedback updated) {
        AnonymousFeedback fb = anonymousFeedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AnonymousFeedback", id));
        fb.setFeedbackSubject(updated.getFeedbackSubject());
        fb.setFeedbackDescription(updated.getFeedbackDescription());
        fb.setStatus(updated.getStatus());
        fb.setArchive(updated.getArchive());
        log.info("Updating anonymous feedback id={}", id);
        return anonymousFeedbackRepository.save(fb);
    }

    @Transactional
    public void deleteAnonymousFeedback(Long id) {
        if (!anonymousFeedbackRepository.existsById(id)) {
            throw new ResourceNotFoundException("AnonymousFeedback", id);
        }
        anonymousFeedbackRepository.deleteById(id);
        log.info("Deleted anonymous feedback id={}", id);
    }

    // ─── Meetings ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Meeting> listMeetings() {
        Specification<Meeting> spec = ScopeFilter.byCompany();
        return spec != null ? meetingRepository.findAll(spec) : meetingRepository.findAll();
    }

    @Transactional
    public Meeting createMeeting(Meeting meeting) {
        if (meeting.getManager() != null && meeting.getManager().getId() != null) {
            meeting.setManager(employeeRepository.getReferenceById(meeting.getManager().getId()));
        }
        if (meeting.getCompany() != null && meeting.getCompany().getId() != null) {
            meeting.setCompany(companyRepository.getReferenceById(meeting.getCompany().getId()));
        }
        log.info("Creating meeting: {}", meeting.getTitle());
        return meetingRepository.save(meeting);
    }

    @Transactional
    public Meeting updateMeeting(Long id, Meeting updated) {
        Meeting m = meetingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting", id));
        m.setTitle(updated.getTitle());
        m.setDate(updated.getDate());
        m.setResponse(updated.getResponse());
        log.info("Updating meeting id={}", id);
        return meetingRepository.save(m);
    }

    @Transactional
    public void deleteMeeting(Long id) {
        if (!meetingRepository.existsById(id)) {
            throw new ResourceNotFoundException("Meeting", id);
        }
        meetingRepository.deleteById(id);
        log.info("Deleted meeting id={}", id);
    }

    // ─── Bonus Points ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeBonusPoint> listBonusPoints(Long employeeId) {
        if (employeeId != null) {
            return bonusPointRepository.findByEmployeeId(employeeId);
        }
        Specification<EmployeeBonusPoint> spec = ScopeFilter.byEmployee();
        return spec != null ? bonusPointRepository.findAll(spec) : bonusPointRepository.findAll();
    }

    @Transactional
    public EmployeeBonusPoint awardBonusPoints(EmployeeBonusPoint bp) {
        if (bp.getEmployee() != null && bp.getEmployee().getId() != null) {
            bp.setEmployee(employeeRepository.getReferenceById(bp.getEmployee().getId()));
        }
        if (bp.getCompany() != null && bp.getCompany().getId() != null) {
            bp.setCompany(companyRepository.getReferenceById(bp.getCompany().getId()));
        }
        log.info("Awarding {} bonus points to employee id={}", bp.getBonusPoint(), bp.getEmployee() != null ? bp.getEmployee().getId() : null);
        return bonusPointRepository.save(bp);
    }

    // ─── Employee Objectives ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeObjective> listEmployeeObjectives(Long employeeId, Long objectiveId) {
        if (employeeId != null) {
            return employeeObjectiveRepository.findByEmployeeId(employeeId);
        }
        if (objectiveId != null) {
            return employeeObjectiveRepository.findByObjectiveId(objectiveId);
        }
        return employeeObjectiveRepository.findAll();
    }

    @Transactional
    public EmployeeObjective assignEmployeeObjective(EmployeeObjective eo) {
        if (eo.getEmployee() != null && eo.getEmployee().getId() != null) {
            eo.setEmployee(employeeRepository.getReferenceById(eo.getEmployee().getId()));
        }
        if (eo.getObjective() != null && eo.getObjective().getId() != null) {
            eo.setObjective(objectiveRepository.getReferenceById(eo.getObjective().getId()));
        }
        log.info("Assigning employee id={} to objective id={}", eo.getEmployee() != null ? eo.getEmployee().getId() : null, eo.getObjective() != null ? eo.getObjective().getId() : null);
        return employeeObjectiveRepository.save(eo);
    }

    @Transactional
    public void removeEmployeeObjective(Long id) {
        if (!employeeObjectiveRepository.existsById(id)) {
            throw new ResourceNotFoundException("EmployeeObjective", id);
        }
        employeeObjectiveRepository.deleteById(id);
        log.info("Removed employee-objective assignment id={}", id);
    }

    // ─── Employee Key Results ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeKeyResult> listKeyResultProgress(Long keyResultId) {
        return employeeKeyResultRepository.findByKeyResultId(keyResultId);
    }

    @Transactional
    public EmployeeKeyResult recordEmployeeKeyResultProgress(EmployeeKeyResult ekr) {
        if (ekr.getEmployee() != null && ekr.getEmployee().getId() != null) {
            ekr.setEmployee(employeeRepository.getReferenceById(ekr.getEmployee().getId()));
        }
        if (ekr.getKeyResult() != null && ekr.getKeyResult().getId() != null) {
            ekr.setKeyResult(keyResultRepository.getReferenceById(ekr.getKeyResult().getId()));
        }
        log.info("Recording employee key result progress for employee id={}", ekr.getEmployee() != null ? ekr.getEmployee().getId() : null);
        return employeeKeyResultRepository.save(ekr);
    }

    @Transactional
    public EmployeeKeyResult updateEmployeeKeyResultProgress(Long id, EmployeeKeyResult updated) {
        EmployeeKeyResult ekr = employeeKeyResultRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EmployeeKeyResult", id));
        ekr.setCurrentValue(updated.getCurrentValue());
        ekr.setProgress(updated.getProgress());
        ekr.setNotes(updated.getNotes());
        log.info("Updating employee key result id={}", id);
        return employeeKeyResultRepository.save(ekr);
    }

    // ─── Objective Comments ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ObjectiveComment> listObjectiveComments(Long objectiveId) {
        return objectiveCommentRepository.findByObjectiveId(objectiveId);
    }

    @Transactional
    public ObjectiveComment addObjectiveComment(Long objectiveId, ObjectiveComment comment) {
        comment.setObjective(objectiveRepository.getReferenceById(objectiveId));
        if (comment.getCreatedBy() != null && comment.getCreatedBy().getId() != null) {
            comment.setCreatedBy(employeeRepository.getReferenceById(comment.getCreatedBy().getId()));
        }
        log.info("Adding comment to objective id={}", objectiveId);
        return objectiveCommentRepository.save(comment);
    }

    @Transactional
    public void deleteObjectiveComment(Long id) {
        if (!objectiveCommentRepository.existsById(id)) {
            throw new ResourceNotFoundException("ObjectiveComment", id);
        }
        objectiveCommentRepository.deleteById(id);
        log.info("Deleted objective comment id={}", id);
    }

    // ─── Question Templates ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<QuestionTemplate> listQuestionTemplates() {
        Specification<QuestionTemplate> spec = ScopeFilter.byCompany();
        return spec != null ? questionTemplateRepository.findAll(spec) : questionTemplateRepository.findAll();
    }

    @Transactional
    public QuestionTemplate createQuestionTemplate(QuestionTemplate template) {
        if (template.getCompany() != null && template.getCompany().getId() != null) {
            template.setCompany(companyRepository.getReferenceById(template.getCompany().getId()));
        }
        log.info("Creating question template: {}", template.getTitle());
        return questionTemplateRepository.save(template);
    }

    @Transactional
    public QuestionTemplate updateQuestionTemplate(Long id, QuestionTemplate updated) {
        QuestionTemplate tmpl = questionTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QuestionTemplate", id));
        tmpl.setTitle(updated.getTitle());
        tmpl.setDescription(updated.getDescription());
        log.info("Updating question template id={}", id);
        return questionTemplateRepository.save(tmpl);
    }

    @Transactional
    public void deleteQuestionTemplate(Long id) {
        if (!questionTemplateRepository.existsById(id)) {
            throw new ResourceNotFoundException("QuestionTemplate", id);
        }
        questionTemplateRepository.deleteById(id);
        log.info("Deleted question template id={}", id);
    }

    // ─── Questions ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Question> listQuestions(Long templateId) {
        return questionRepository.findByTemplateIdOrderBySequenceAsc(templateId);
    }

    @Transactional
    public Question addQuestion(Long templateId, Question question) {
        question.setTemplate(questionTemplateRepository.getReferenceById(templateId));
        log.info("Adding question to template id={}", templateId);
        return questionRepository.save(question);
    }

    @Transactional
    public void deleteQuestion(Long id) {
        if (!questionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Question", id);
        }
        questionRepository.deleteById(id);
        log.info("Deleted question id={}", id);
    }

    // ─── Question Options ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<QuestionOption> listOptions(Long questionId) {
        return questionOptionRepository.findByQuestionIdOrderBySequenceAsc(questionId);
    }

    @Transactional
    public QuestionOption addOption(Long questionId, QuestionOption option) {
        option.setQuestion(questionRepository.getReferenceById(questionId));
        log.info("Adding option to question id={}", questionId);
        return questionOptionRepository.save(option);
    }

    @Transactional
    public void deleteOption(Long id) {
        if (!questionOptionRepository.existsById(id)) {
            throw new ResourceNotFoundException("QuestionOption", id);
        }
        questionOptionRepository.deleteById(id);
        log.info("Deleted question option id={}", id);
    }

    // ─── Answers ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Answer> listAnswers(Long questionId) {
        return answerRepository.findByQuestionId(questionId);
    }

    @Transactional
    public Answer submitAnswer(Long questionId, Answer answer) {
        answer.setQuestion(questionRepository.getReferenceById(questionId));
        if (answer.getRespondent() != null && answer.getRespondent().getId() != null) {
            answer.setRespondent(employeeRepository.getReferenceById(answer.getRespondent().getId()));
        }
        if (answer.getSelectedOption() != null && answer.getSelectedOption().getId() != null) {
            answer.setSelectedOption(questionOptionRepository.getReferenceById(answer.getSelectedOption().getId()));
        }
        log.info("Submitting answer for question id={}", questionId);
        return answerRepository.save(answer);
    }

    // ─── Key Result Feedback ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<KeyResultFeedback> listKeyResultFeedback(Long keyResultId) {
        return keyResultFeedbackRepository.findByKeyResultId(keyResultId);
    }

    @Transactional
    public KeyResultFeedback addKeyResultFeedback(Long keyResultId, KeyResultFeedback krf) {
        krf.setKeyResult(keyResultRepository.getReferenceById(keyResultId));
        if (krf.getGivenBy() != null && krf.getGivenBy().getId() != null) {
            krf.setGivenBy(employeeRepository.getReferenceById(krf.getGivenBy().getId()));
        }
        log.info("Adding feedback to key result id={}", keyResultId);
        return keyResultFeedbackRepository.save(krf);
    }

    // ─── Meeting Answers ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MeetingAnswer> listMeetingAnswers(Long meetingId) {
        return meetingAnswerRepository.findByMeetingId(meetingId);
    }

    @Transactional
    public MeetingAnswer addMeetingAnswer(Long meetingId, MeetingAnswer ma) {
        ma.setMeeting(meetingRepository.getReferenceById(meetingId));
        log.info("Adding answer to meeting id={}", meetingId);
        return meetingAnswerRepository.save(ma);
    }

    @Transactional
    public void deleteMeetingAnswer(Long id) {
        if (!meetingAnswerRepository.existsById(id)) {
            throw new ResourceNotFoundException("MeetingAnswer", id);
        }
        meetingAnswerRepository.deleteById(id);
        log.info("Deleted meeting answer id={}", id);
    }

    // ─── Bonus Point Settings ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public BonusPointSetting getBonusPointSettings() {
        List<BonusPointSetting> list = bonusPointSettingRepository.findAll();
        return list.isEmpty() ? new BonusPointSetting() : list.get(0);
    }

    @Transactional
    public BonusPointSetting upsertBonusPointSettings(BonusPointSetting incoming) {
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
        log.info("Upserting bonus point settings for company id={}", incoming.getCompany() != null ? incoming.getCompany().getId() : null);
        return bonusPointSettingRepository.save(setting);
    }

    // ─── Periods ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Period> listPeriods() {
        return periodRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Period getPeriod(Long id) {
        return periodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Period", id));
    }

    @Transactional
    public Period createPeriod(Period period) {
        log.info("Creating PMS period: {}", period.getPeriodName());
        return periodRepository.save(period);
    }

    @Transactional
    public Period updatePeriod(Long id, Period updated) {
        Period p = periodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Period", id));
        p.setPeriodName(updated.getPeriodName());
        p.setStartDate(updated.getStartDate());
        p.setEndDate(updated.getEndDate());
        log.info("Updating PMS period id={}", id);
        return periodRepository.save(p);
    }

    @Transactional
    public void deletePeriod(Long id) {
        if (!periodRepository.existsById(id)) {
            throw new ResourceNotFoundException("Period", id);
        }
        periodRepository.deleteById(id);
        log.info("Deleted PMS period id={}", id);
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard() {
        Specification<Objective> objSpec = byEmployeeCompany();
        List<Objective> objectives = objSpec != null ? objectiveRepository.findAll(objSpec) : objectiveRepository.findAll();
        long totalObjectives = objectives.size();
        long completedObjectives = objectives.stream()
                .filter(o -> Objective.ObjectiveStatus.COMPLETED.equals(o.getStatus()))
                .count();
        long pendingObjectives = objectives.stream()
                .filter(o -> !Objective.ObjectiveStatus.COMPLETED.equals(o.getStatus()))
                .count();
        Specification<EmployeeFeedback> fbSpec = byEmployeeCompany();
        List<EmployeeFeedback> allFeedback = fbSpec != null ? feedbackRepository.findAll(fbSpec) : feedbackRepository.findAll();
        long totalFeedback = allFeedback.size();
        long completedFeedback = allFeedback.stream()
                .filter(f -> EmployeeFeedback.FeedbackStatus.COMPLETED.equals(f.getStatus()))
                .count();
        long pendingFeedback = totalFeedback - completedFeedback;
        double averageRating = allFeedback.stream()
                .filter(f -> f.getRating() != null)
                .mapToDouble(EmployeeFeedback::getRating)
                .average()
                .orElse(0.0);
        double overallProgress = objectives.stream()
                .filter(o -> o.getProgress() != null)
                .mapToInt(Objective::getProgress)
                .average()
                .orElse(0.0);

        Map<String, Object> result = new HashMap<>();
        result.put("totalObjectives", totalObjectives);
        result.put("completedObjectives", completedObjectives);
        result.put("pendingObjectives", pendingObjectives);
        result.put("totalFeedback", totalFeedback);
        result.put("completedFeedback", completedFeedback);
        result.put("pendingFeedback", pendingFeedback);
        result.put("averageRating", averageRating);
        result.put("goalsProgress", overallProgress);
        return result;
    }

    // ─── Employee Performance Summary ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getEmployeePerformanceSummary(Long employeeId) {
        if (!employeeRepository.existsById(employeeId)) {
            throw new ResourceNotFoundException("Employee", employeeId);
        }

        List<Objective> objectives = objectiveRepository.findByEmployeeId(employeeId);
        long totalObjectives = objectives.size();
        long completedObjectives = objectives.stream()
                .filter(o -> Objective.ObjectiveStatus.COMPLETED.equals(o.getStatus()))
                .count();
        double avgObjectiveProgress = objectives.stream()
                .filter(o -> o.getProgress() != null)
                .mapToInt(Objective::getProgress)
                .average()
                .orElse(0.0);

        List<EmployeeFeedback> feedbacks = feedbackRepository.findByEmployeeId(employeeId);
        long totalFeedback = feedbacks.size();
        long completedFeedbackCount = feedbacks.stream()
                .filter(f -> EmployeeFeedback.FeedbackStatus.COMPLETED.equals(f.getStatus()))
                .count();
        double avgRating = feedbacks.stream()
                .filter(f -> f.getRating() != null)
                .mapToDouble(EmployeeFeedback::getRating)
                .average()
                .orElse(0.0);

        List<EmployeeObjective> employeeObjectives = employeeObjectiveRepository.findByEmployeeId(employeeId);
        long assignedObjectivesCount = employeeObjectives.size();
        long completedAssignedCount = employeeObjectives.stream()
                .filter(eo -> Objective.ObjectiveStatus.COMPLETED.equals(eo.getStatus()))
                .count();

        List<EmployeeKeyResult> keyResults = employeeKeyResultRepository.findByEmployeeId(employeeId);
        double avgKeyResultProgress = keyResults.stream()
                .filter(ekr -> ekr.getProgress() != null)
                .mapToInt(EmployeeKeyResult::getProgress)
                .average()
                .orElse(0.0);

        List<EmployeeBonusPoint> bonusPoints = bonusPointRepository.findByEmployeeId(employeeId);
        int totalBonusPoints = bonusPoints.stream()
                .filter(bp -> bp.getBonusPoint() != null)
                .mapToInt(EmployeeBonusPoint::getBonusPoint)
                .sum();

        Map<String, Object> summary = new HashMap<>();
        summary.put("employeeId", employeeId);
        summary.put("totalObjectives", totalObjectives);
        summary.put("completedObjectives", completedObjectives);
        summary.put("averageObjectiveProgress", avgObjectiveProgress);
        summary.put("totalFeedbackReceived", totalFeedback);
        summary.put("completedFeedback", completedFeedbackCount);
        summary.put("averageRating", avgRating);
        summary.put("assignedObjectives", assignedObjectivesCount);
        summary.put("completedAssignedObjectives", completedAssignedCount);
        summary.put("averageKeyResultProgress", avgKeyResultProgress);
        summary.put("totalBonusPoints", totalBonusPoints);
        return summary;
    }

    /**
     * Builds a Specification filtering by employee.company.id for entities that
     * are linked to company through an employee association (Objective, EmployeeFeedback, etc.).
     */
    private <T> Specification<T> byEmployeeCompany() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null) return null;
        if (scope.hasUnrestrictedAccess()) {
            if (scope.getCompanyId() != null) {
                Long cId = scope.getCompanyId();
                return (root, q, cb) -> cb.equal(root.get("employee").get("company").get("id"), cId);
            }
            return null;
        }
        java.util.List<Long> ids = scope.getAccessibleCompanyIds();
        if (ids.isEmpty()) {
            return (root, q, cb) -> cb.disjunction();
        }
        if (ids.size() == 1) {
            Long cId = ids.get(0);
            return (root, q, cb) -> cb.equal(root.get("employee").get("company").get("id"), cId);
        }
        return (root, q, cb) -> root.get("employee").get("company").get("id").in(ids);
    }
}
