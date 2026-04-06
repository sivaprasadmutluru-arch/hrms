package com.example.demo.pms.controller;

import com.example.demo.pms.entity.*;
import com.example.demo.pms.service.PmsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pms")
@RequiredArgsConstructor
@Tag(name = "Performance Management")
public class PmsController {

    private final PmsService pmsService;

    // ─── Performance Cycles ───────────────────────────────────────────────────

    @GetMapping("/cycles")
    @PreAuthorize("hasAuthority('pms:view')")
    public ResponseEntity<List<PerformanceCycle>> listCycles() {
        return ResponseEntity.ok(pmsService.listCycles());
    }

    @PostMapping("/cycles")
    @PreAuthorize("hasAuthority('pms:create')")
    public ResponseEntity<PerformanceCycle> createCycle(@RequestBody PerformanceCycle cycle) {
        return ResponseEntity.ok(pmsService.createCycle(cycle));
    }

    @PutMapping("/cycles/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    public ResponseEntity<PerformanceCycle> updateCycle(@PathVariable Long id,
                                                         @RequestBody PerformanceCycle updated) {
        return ResponseEntity.ok(pmsService.updateCycle(id, updated));
    }

    // ─── Objectives ───────────────────────────────────────────────────────────

    @GetMapping("/objectives")
    @PreAuthorize("hasAuthority('pms:view')")
    public ResponseEntity<List<Objective>> listObjectives(@RequestParam(required = false) Long employeeId) {
        return ResponseEntity.ok(pmsService.listObjectives(employeeId));
    }

    @PostMapping("/objectives")
    @PreAuthorize("hasAuthority('pms:create')")
    public ResponseEntity<Objective> createObjective(@RequestBody Objective objective) {
        return ResponseEntity.ok(pmsService.createObjective(objective));
    }

    @PutMapping("/objectives/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    public ResponseEntity<Objective> updateObjective(@PathVariable Long id, @RequestBody Objective updated) {
        return ResponseEntity.ok(pmsService.updateObjective(id, updated));
    }

    @PostMapping("/objectives/{id}/archive")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Archive an objective")
    public ResponseEntity<Map<String, Object>> archiveObjective(@PathVariable Long id) {
        Objective obj = pmsService.archiveObjective(id);
        Map<String, Object> result = new HashMap<>();
        result.put("id", id);
        result.put("message", "Objective archived");
        result.put("status", obj.getStatus());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/objectives/{id}/unarchive")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Unarchive an objective")
    public ResponseEntity<Map<String, Object>> unarchiveObjective(@PathVariable Long id) {
        Objective obj = pmsService.unarchiveObjective(id);
        Map<String, Object> result = new HashMap<>();
        result.put("id", id);
        result.put("message", "Objective unarchived");
        result.put("status", obj.getStatus());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/objectives/{objectiveId}/comments")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List comments on an objective")
    public ResponseEntity<List<ObjectiveComment>> listObjectiveComments(@PathVariable Long objectiveId) {
        return ResponseEntity.ok(pmsService.listObjectiveComments(objectiveId));
    }

    @PostMapping("/objectives/{objectiveId}/comments")
    @PreAuthorize("hasAuthority('pms:create')")
    @Operation(summary = "Add a comment to an objective")
    public ResponseEntity<ObjectiveComment> addObjectiveComment(@PathVariable Long objectiveId,
                                                                 @RequestBody ObjectiveComment comment) {
        return ResponseEntity.ok(pmsService.addObjectiveComment(objectiveId, comment));
    }

    @DeleteMapping("/objective-comments/{id}")
    @PreAuthorize("hasAuthority('pms:delete')")
    @Operation(summary = "Delete an objective comment")
    public ResponseEntity<Void> deleteObjectiveComment(@PathVariable Long id) {
        pmsService.deleteObjectiveComment(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Feedback ─────────────────────────────────────────────────────────────

    @GetMapping("/feedback")
    @PreAuthorize("hasAuthority('pms:view')")
    public ResponseEntity<List<EmployeeFeedback>> listFeedback(@RequestParam(required = false) Long employeeId) {
        return ResponseEntity.ok(pmsService.listFeedback(employeeId));
    }

    @PostMapping("/feedback")
    @PreAuthorize("hasAuthority('pms:create')")
    public ResponseEntity<EmployeeFeedback> createFeedback(@RequestBody EmployeeFeedback feedback) {
        return ResponseEntity.ok(pmsService.createFeedback(feedback));
    }

    @PutMapping("/feedback/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    public ResponseEntity<EmployeeFeedback> updateFeedback(@PathVariable Long id,
                                                            @RequestBody EmployeeFeedback updated) {
        return ResponseEntity.ok(pmsService.updateFeedback(id, updated));
    }

    @PostMapping("/feedback/{id}/archive")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Archive a feedback record")
    public ResponseEntity<Map<String, Object>> archiveFeedback(@PathVariable Long id) {
        EmployeeFeedback fb = pmsService.archiveFeedback(id);
        Map<String, Object> result = new HashMap<>();
        result.put("id", id);
        result.put("message", "Feedback archived");
        result.put("status", fb.getStatus());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/feedback/overview")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "Get feedback overview KPIs")
    public ResponseEntity<Map<String, Object>> feedbackOverview() {
        return ResponseEntity.ok(pmsService.feedbackOverview());
    }

    @PostMapping("/feedback/bulk-create")
    @PreAuthorize("hasAuthority('pms:create')")
    @Operation(summary = "Bulk create employee feedback records")
    public ResponseEntity<Map<String, Object>> bulkCreateFeedback(
            @RequestBody List<Map<String, Object>> feedbackList) {
        int count = pmsService.bulkCreateFeedback(feedbackList);
        return ResponseEntity.ok(Map.of("created", count));
    }

    // ─── Anonymous Feedback ───────────────────────────────────────────────────

    @GetMapping("/anonymous-feedback")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List anonymous feedback (company-scoped)")
    public ResponseEntity<List<AnonymousFeedback>> listAnonymousFeedback() {
        return ResponseEntity.ok(pmsService.listAnonymousFeedback());
    }

    @PostMapping("/anonymous-feedback")
    @PreAuthorize("hasAuthority('pms:create')")
    @Operation(summary = "Submit anonymous feedback")
    public ResponseEntity<AnonymousFeedback> createAnonymousFeedback(@RequestBody AnonymousFeedback feedback) {
        return ResponseEntity.ok(pmsService.createAnonymousFeedback(feedback));
    }

    @PutMapping("/anonymous-feedback/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Update anonymous feedback")
    public ResponseEntity<AnonymousFeedback> updateAnonymousFeedback(@PathVariable Long id,
                                                                       @RequestBody AnonymousFeedback updated) {
        return ResponseEntity.ok(pmsService.updateAnonymousFeedback(id, updated));
    }

    @DeleteMapping("/anonymous-feedback/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Delete anonymous feedback")
    public ResponseEntity<Map<String, String>> deleteAnonymousFeedback(@PathVariable Long id) {
        pmsService.deleteAnonymousFeedback(id);
        return ResponseEntity.ok(Map.of("message", "Feedback deleted"));
    }

    // ─── Meetings ─────────────────────────────────────────────────────────────

    @GetMapping("/meetings")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List meetings (company-scoped)")
    public ResponseEntity<List<Meeting>> listMeetings() {
        return ResponseEntity.ok(pmsService.listMeetings());
    }

    @PostMapping("/meetings")
    @PreAuthorize("hasAuthority('pms:create')")
    @Operation(summary = "Create a meeting")
    public ResponseEntity<Meeting> createMeeting(@RequestBody Meeting meeting) {
        return ResponseEntity.ok(pmsService.createMeeting(meeting));
    }

    @PutMapping("/meetings/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Update a meeting")
    public ResponseEntity<Meeting> updateMeeting(@PathVariable Long id, @RequestBody Meeting updated) {
        return ResponseEntity.ok(pmsService.updateMeeting(id, updated));
    }

    @DeleteMapping("/meetings/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Delete a meeting")
    public ResponseEntity<Map<String, String>> deleteMeeting(@PathVariable Long id) {
        pmsService.deleteMeeting(id);
        return ResponseEntity.ok(Map.of("message", "Meeting deleted"));
    }

    @GetMapping("/meetings/{meetingId}/answers")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List notes/answers for a meeting")
    public ResponseEntity<List<MeetingAnswer>> listMeetingAnswers(@PathVariable Long meetingId) {
        return ResponseEntity.ok(pmsService.listMeetingAnswers(meetingId));
    }

    @PostMapping("/meetings/{meetingId}/answers")
    @PreAuthorize("hasAuthority('pms:create')")
    @Operation(summary = "Add a note/answer to a meeting")
    public ResponseEntity<MeetingAnswer> addMeetingAnswer(@PathVariable Long meetingId,
                                                           @RequestBody MeetingAnswer ma) {
        return ResponseEntity.ok(pmsService.addMeetingAnswer(meetingId, ma));
    }

    @DeleteMapping("/meeting-answers/{id}")
    @PreAuthorize("hasAuthority('pms:delete')")
    @Operation(summary = "Delete a meeting answer")
    public ResponseEntity<Void> deleteMeetingAnswer(@PathVariable Long id) {
        pmsService.deleteMeetingAnswer(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Bonus Points ─────────────────────────────────────────────────────────

    @GetMapping("/bonus-points")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List bonus points (company-scoped)")
    public ResponseEntity<List<EmployeeBonusPoint>> listBonusPoints(
            @RequestParam(required = false) Long employeeId) {
        return ResponseEntity.ok(pmsService.listBonusPoints(employeeId));
    }

    @PostMapping("/bonus-points")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Award bonus points to an employee")
    public ResponseEntity<EmployeeBonusPoint> awardBonusPoints(@RequestBody EmployeeBonusPoint bp) {
        return ResponseEntity.ok(pmsService.awardBonusPoints(bp));
    }

    // ─── Employee Objectives ──────────────────────────────────────────────────

    @GetMapping("/employee-objectives")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List employee-objective assignments")
    public ResponseEntity<List<EmployeeObjective>> listEmployeeObjectives(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long objectiveId) {
        return ResponseEntity.ok(pmsService.listEmployeeObjectives(employeeId, objectiveId));
    }

    @PostMapping("/employee-objectives")
    @PreAuthorize("hasAuthority('pms:create')")
    @Operation(summary = "Assign employee to an objective")
    public ResponseEntity<EmployeeObjective> assignEmployeeObjective(@RequestBody EmployeeObjective eo) {
        return ResponseEntity.ok(pmsService.assignEmployeeObjective(eo));
    }

    @DeleteMapping("/employee-objectives/{id}")
    @PreAuthorize("hasAuthority('pms:delete')")
    @Operation(summary = "Remove employee-objective assignment")
    public ResponseEntity<Void> removeEmployeeObjective(@PathVariable Long id) {
        pmsService.removeEmployeeObjective(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Employee Key Results ─────────────────────────────────────────────────

    @GetMapping("/key-results/{keyResultId}/employee-progress")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "Get employee progress on a key result")
    public ResponseEntity<List<EmployeeKeyResult>> listKeyResultProgress(@PathVariable Long keyResultId) {
        return ResponseEntity.ok(pmsService.listKeyResultProgress(keyResultId));
    }

    @PostMapping("/employee-key-results")
    @PreAuthorize("hasAuthority('pms:create')")
    @Operation(summary = "Record employee key result progress")
    public ResponseEntity<EmployeeKeyResult> recordKeyResultProgress(@RequestBody EmployeeKeyResult ekr) {
        return ResponseEntity.ok(pmsService.recordEmployeeKeyResultProgress(ekr));
    }

    @PutMapping("/employee-key-results/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Update employee key result progress")
    public ResponseEntity<EmployeeKeyResult> updateKeyResultProgress(@PathVariable Long id,
                                                                      @RequestBody EmployeeKeyResult updated) {
        return ResponseEntity.ok(pmsService.updateEmployeeKeyResultProgress(id, updated));
    }

    @GetMapping("/key-results/{keyResultId}/feedback")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List feedback for a key result")
    public ResponseEntity<List<KeyResultFeedback>> listKeyResultFeedback(@PathVariable Long keyResultId) {
        return ResponseEntity.ok(pmsService.listKeyResultFeedback(keyResultId));
    }

    @PostMapping("/key-results/{keyResultId}/feedback")
    @PreAuthorize("hasAuthority('pms:create')")
    @Operation(summary = "Add feedback for a key result")
    public ResponseEntity<KeyResultFeedback> addKeyResultFeedback(@PathVariable Long keyResultId,
                                                                   @RequestBody KeyResultFeedback krf) {
        return ResponseEntity.ok(pmsService.addKeyResultFeedback(keyResultId, krf));
    }

    // ─── Question Templates ───────────────────────────────────────────────────

    @GetMapping("/question-templates")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List question templates (company-scoped)")
    public ResponseEntity<List<QuestionTemplate>> listQuestionTemplates() {
        return ResponseEntity.ok(pmsService.listQuestionTemplates());
    }

    @PostMapping("/question-templates")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a question template")
    public ResponseEntity<QuestionTemplate> createQuestionTemplate(@RequestBody QuestionTemplate template) {
        return ResponseEntity.ok(pmsService.createQuestionTemplate(template));
    }

    @PutMapping("/question-templates/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update a question template")
    public ResponseEntity<QuestionTemplate> updateQuestionTemplate(@PathVariable Long id,
                                                                    @RequestBody QuestionTemplate updated) {
        return ResponseEntity.ok(pmsService.updateQuestionTemplate(id, updated));
    }

    @DeleteMapping("/question-templates/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a question template")
    public ResponseEntity<Void> deleteQuestionTemplate(@PathVariable Long id) {
        pmsService.deleteQuestionTemplate(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Questions ────────────────────────────────────────────────────────────

    @GetMapping("/question-templates/{templateId}/questions")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List questions for a template")
    public ResponseEntity<List<Question>> listQuestions(@PathVariable Long templateId) {
        return ResponseEntity.ok(pmsService.listQuestions(templateId));
    }

    @PostMapping("/question-templates/{templateId}/questions")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Add a question to a template")
    public ResponseEntity<Question> addQuestion(@PathVariable Long templateId, @RequestBody Question question) {
        return ResponseEntity.ok(pmsService.addQuestion(templateId, question));
    }

    @DeleteMapping("/questions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a question")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        pmsService.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Question Options ─────────────────────────────────────────────────────

    @GetMapping("/questions/{questionId}/options")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List options for a question")
    public ResponseEntity<List<QuestionOption>> listOptions(@PathVariable Long questionId) {
        return ResponseEntity.ok(pmsService.listOptions(questionId));
    }

    @PostMapping("/questions/{questionId}/options")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Add an option to a question")
    public ResponseEntity<QuestionOption> addOption(@PathVariable Long questionId,
                                                     @RequestBody QuestionOption option) {
        return ResponseEntity.ok(pmsService.addOption(questionId, option));
    }

    @DeleteMapping("/question-options/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a question option")
    public ResponseEntity<Void> deleteOption(@PathVariable Long id) {
        pmsService.deleteOption(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Answers ──────────────────────────────────────────────────────────────

    @GetMapping("/questions/{questionId}/answers")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List answers for a question")
    public ResponseEntity<List<Answer>> listAnswers(@PathVariable Long questionId) {
        return ResponseEntity.ok(pmsService.listAnswers(questionId));
    }

    @PostMapping("/questions/{questionId}/answers")
    @PreAuthorize("hasAuthority('pms:create')")
    @Operation(summary = "Submit an answer to a question")
    public ResponseEntity<Answer> submitAnswer(@PathVariable Long questionId, @RequestBody Answer answer) {
        return ResponseEntity.ok(pmsService.submitAnswer(questionId, answer));
    }

    // ─── Bonus Point Settings ─────────────────────────────────────────────────

    @GetMapping("/bonus-point-settings")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "Get bonus point settings for current company")
    public ResponseEntity<BonusPointSetting> getBonusPointSettings() {
        return ResponseEntity.ok(pmsService.getBonusPointSettings());
    }

    @PutMapping("/bonus-point-settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Upsert bonus point settings")
    public ResponseEntity<BonusPointSetting> upsertBonusPointSettings(@RequestBody BonusPointSetting incoming) {
        return ResponseEntity.ok(pmsService.upsertBonusPointSettings(incoming));
    }

    // ─── Periods ──────────────────────────────────────────────────────────────

    @GetMapping("/periods")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "List all PMS periods")
    public ResponseEntity<List<Period>> listPeriods() {
        return ResponseEntity.ok(pmsService.listPeriods());
    }

    @GetMapping("/periods/{id}")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "Get a PMS period by ID")
    public ResponseEntity<Period> getPeriod(@PathVariable Long id) {
        return ResponseEntity.ok(pmsService.getPeriod(id));
    }

    @PostMapping("/periods")
    @PreAuthorize("hasAuthority('pms:create')")
    @Operation(summary = "Create a PMS period")
    public ResponseEntity<Period> createPeriod(@RequestBody Period period) {
        return ResponseEntity.ok(pmsService.createPeriod(period));
    }

    @PutMapping("/periods/{id}")
    @PreAuthorize("hasAuthority('pms:edit')")
    @Operation(summary = "Update a PMS period")
    public ResponseEntity<Period> updatePeriod(@PathVariable Long id, @RequestBody Period updated) {
        return ResponseEntity.ok(pmsService.updatePeriod(id, updated));
    }

    @DeleteMapping("/periods/{id}")
    @PreAuthorize("hasAuthority('pms:delete')")
    @Operation(summary = "Delete a PMS period")
    public ResponseEntity<Map<String, String>> deletePeriod(@PathVariable Long id) {
        pmsService.deletePeriod(id);
        return ResponseEntity.ok(Map.of("message", "Period deleted"));
    }

    // ─── PMS Dashboard ────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('pms:view')")
    @Operation(summary = "PMS dashboard KPIs")
    public ResponseEntity<Map<String, Object>> pmsDashboard() {
        return ResponseEntity.ok(pmsService.getDashboard());
    }
}
