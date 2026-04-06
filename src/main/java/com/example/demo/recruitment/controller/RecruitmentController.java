package com.example.demo.recruitment.controller;

import com.example.demo.recruitment.entity.*;
import com.example.demo.recruitment.service.RecruitmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recruitment")
@RequiredArgsConstructor
@Tag(name = "Recruitment")
public class RecruitmentController {

    private final RecruitmentService recruitmentService;

    // ─── Recruitment Posts ────────────────────────────────────────────────────

    @GetMapping("/posts")
    @PreAuthorize("hasAuthority('recruitment:view')")
    public ResponseEntity<List<RecruitmentPost>> listPosts() {
        return ResponseEntity.ok(recruitmentService.listPosts());
    }

    @GetMapping("/posts/{id}")
    @PreAuthorize("hasAuthority('recruitment:view')")
    public ResponseEntity<RecruitmentPost> getPost(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.getPost(id));
    }

    @PostMapping("/posts")
    @PreAuthorize("hasAuthority('recruitment:create')")
    public ResponseEntity<RecruitmentPost> createPost(@RequestBody RecruitmentPost post) {
        return ResponseEntity.ok(recruitmentService.createPost(post));
    }

    @PutMapping("/posts/{id}")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    public ResponseEntity<RecruitmentPost> updatePost(@PathVariable Long id,
                                                       @RequestBody RecruitmentPost updated) {
        return ResponseEntity.ok(recruitmentService.updatePost(id, updated));
    }

    @DeleteMapping("/posts/{id}")
    @PreAuthorize("hasAuthority('recruitment:delete')")
    public ResponseEntity<Map<String, String>> deletePost(@PathVariable Long id) {
        recruitmentService.deletePost(id);
        return ResponseEntity.ok(Map.of("message", "Recruitment post deactivated"));
    }

    @PostMapping("/posts/{id}/close")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Close a recruitment post")
    public ResponseEntity<RecruitmentPost> closePost(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.closePost(id));
    }

    @PostMapping("/posts/{id}/reopen")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Reopen a recruitment post")
    public ResponseEntity<RecruitmentPost> reopenPost(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.reopenPost(id));
    }

    @PostMapping("/posts/{id}/archive")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Archive a recruitment post")
    public ResponseEntity<RecruitmentPost> archivePost(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.archivePost(id));
    }

    @PostMapping("/posts/{id}/unarchive")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Unarchive a recruitment post")
    public ResponseEntity<RecruitmentPost> unarchivePost(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.unarchivePost(id));
    }

    @GetMapping("/posts/{id}/pipeline")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "Get pipeline (stages with applicants) for a recruitment post")
    public ResponseEntity<List<Map<String, Object>>> getPostPipeline(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.getPostPipeline(id));
    }

    // ─── Recruitment Stages ───────────────────────────────────────────────────

    @GetMapping("/posts/{postId}/stages")
    @PreAuthorize("hasAuthority('recruitment:view')")
    public ResponseEntity<List<RecruitmentStage>> listStagesByPost(@PathVariable Long postId) {
        return ResponseEntity.ok(recruitmentService.listStagesByPost(postId));
    }

    @PostMapping("/stages")
    @PreAuthorize("hasAuthority('recruitment:create')")
    public ResponseEntity<RecruitmentStage> createStage(@RequestBody RecruitmentStage stage) {
        return ResponseEntity.ok(recruitmentService.createStage(stage));
    }

    @PutMapping("/stages/{id}")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    public ResponseEntity<RecruitmentStage> updateStage(@PathVariable Long id,
                                                         @RequestBody RecruitmentStage updated) {
        return ResponseEntity.ok(recruitmentService.updateStage(id, updated));
    }

    @PostMapping("/stages/{id}/duplicate")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Operation(summary = "Duplicate a recruitment stage")
    public ResponseEntity<RecruitmentStage> duplicateStage(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.duplicateStage(id));
    }

    @PostMapping("/stages/{id}/archive")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Archive a recruitment stage")
    public ResponseEntity<RecruitmentStage> archiveStage(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.archiveStage(id));
    }

    @GetMapping("/stages/{stageId}/files")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List files for a stage")
    public ResponseEntity<List<StageFile>> listStageFiles(@PathVariable Long stageId) {
        return ResponseEntity.ok(recruitmentService.listStageFiles(stageId));
    }

    @PostMapping("/stages/{stageId}/files")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Add a file to a stage")
    public ResponseEntity<StageFile> addStageFile(@PathVariable Long stageId, @RequestBody StageFile file) {
        return ResponseEntity.ok(recruitmentService.addStageFile(stageId, file));
    }

    @DeleteMapping("/stages/files/{id}")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Delete a stage file")
    public ResponseEntity<Map<String, String>> deleteStageFile(@PathVariable Long id) {
        recruitmentService.deleteStageFile(id);
        return ResponseEntity.ok(Map.of("message", "File deleted"));
    }

    // ─── Applicants ───────────────────────────────────────────────────────────

    @GetMapping("/applicants")
    @PreAuthorize("hasAuthority('recruitment:view')")
    public ResponseEntity<List<Applicant>> listApplicants() {
        return ResponseEntity.ok(recruitmentService.listApplicants());
    }

    @GetMapping("/posts/{postId}/applicants")
    @PreAuthorize("hasAuthority('recruitment:view')")
    public ResponseEntity<List<Applicant>> applicantsByPost(@PathVariable Long postId) {
        return ResponseEntity.ok(recruitmentService.listApplicantsByPost(postId));
    }

    @PostMapping("/applicants")
    @PreAuthorize("hasAuthority('recruitment:create')")
    public ResponseEntity<Applicant> createApplicant(@RequestBody Applicant applicant) {
        return ResponseEntity.ok(recruitmentService.createApplicant(applicant));
    }

    @PutMapping("/applicants/{id}/stage")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    public ResponseEntity<Applicant> updateStage(@PathVariable Long id, @RequestParam Long stageId) {
        return ResponseEntity.ok(recruitmentService.moveApplicantToStage(id, stageId));
    }

    @PutMapping("/applicants/{id}/hire")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    public ResponseEntity<Applicant> hire(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.hireApplicant(id));
    }

    @PutMapping("/applicants/{id}/reject")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    public ResponseEntity<Applicant> rejectApplicant(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.rejectApplicant(id));
    }

    @PostMapping("/applicants/{id}/convert-employee")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Convert an applicant/candidate to an employee")
    public ResponseEntity<Map<String, Object>> convertToEmployee(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.convertToEmployee(id));
    }

    @PostMapping("/applicants/bulk-action")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Apply a bulk action to a list of applicants")
    public ResponseEntity<Map<String, Object>> bulkApplicantAction(@RequestBody Map<String, Object> body) {
        String action = (String) body.get("action");
        @SuppressWarnings("unchecked")
        List<Integer> rawIds = (List<Integer>) body.get("ids");
        if (action == null || rawIds == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "action and ids are required"));
        }
        List<Long> ids = rawIds.stream().map(Integer::longValue).toList();
        return ResponseEntity.ok(recruitmentService.bulkApplicantAction(action, ids));
    }

    @PostMapping("/applicants/{id}/send-mail")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Send an email to an applicant")
    public ResponseEntity<Map<String, Object>> sendApplicantMail(@PathVariable Long id,
                                                                   @RequestBody Map<String, Object> mailRequest) {
        recruitmentService.sendApplicationEmail(id, mailRequest);
        return ResponseEntity.ok(Map.of("message", "Mail sent successfully", "applicantId", id));
    }

    // ─── Interview Schedules ──────────────────────────────────────────────────

    @GetMapping("/interviews")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List interview schedules (company-scoped)")
    public ResponseEntity<List<InterviewSchedule>> listInterviews() {
        return ResponseEntity.ok(recruitmentService.listInterviews());
    }

    @PostMapping("/interviews")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Operation(summary = "Create an interview schedule")
    public ResponseEntity<InterviewSchedule> createInterview(@RequestBody InterviewSchedule interview) {
        return ResponseEntity.ok(recruitmentService.scheduleInterview(interview));
    }

    @PutMapping("/interviews/{id}")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Update an interview schedule")
    public ResponseEntity<InterviewSchedule> updateInterview(@PathVariable Long id,
                                                              @RequestBody InterviewSchedule updated) {
        return ResponseEntity.ok(recruitmentService.updateInterview(id, updated));
    }

    @PostMapping("/interviews/{id}/complete")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Mark interview as completed")
    public ResponseEntity<InterviewSchedule> completeInterview(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.completeInterview(id));
    }

    @DeleteMapping("/interviews/{id}")
    @PreAuthorize("hasAuthority('recruitment:delete')")
    @Operation(summary = "Delete an interview schedule")
    public ResponseEntity<Map<String, String>> deleteInterview(@PathVariable Long id) {
        recruitmentService.deleteInterview(id);
        return ResponseEntity.ok(Map.of("message", "Interview deleted"));
    }

    // ─── Candidate Ratings ────────────────────────────────────────────────────

    @GetMapping("/ratings")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "Get ratings for a candidate")
    public ResponseEntity<List<CandidateRating>> getRatings(@RequestParam Long candidateId) {
        return ResponseEntity.ok(recruitmentService.getRatings(candidateId));
    }

    @PostMapping("/ratings")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Operation(summary = "Rate a candidate")
    public ResponseEntity<CandidateRating> rateCandidate(@RequestBody CandidateRating rating) {
        return ResponseEntity.ok(recruitmentService.rateCandidate(rating));
    }

    // ─── Skill Zones ──────────────────────────────────────────────────────────

    @GetMapping("/skill-zones")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List skill zones (company-scoped)")
    public ResponseEntity<List<SkillZone>> listSkillZones() {
        return ResponseEntity.ok(recruitmentService.listSkillZones());
    }

    @PostMapping("/skill-zones")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a skill zone")
    public ResponseEntity<SkillZone> createSkillZone(@RequestBody SkillZone skillZone) {
        return ResponseEntity.ok(recruitmentService.createSkillZone(skillZone));
    }

    @PutMapping("/skill-zones/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update a skill zone")
    public ResponseEntity<SkillZone> updateSkillZone(@PathVariable Long id, @RequestBody SkillZone updated) {
        return ResponseEntity.ok(recruitmentService.updateSkillZone(id, updated));
    }

    @DeleteMapping("/skill-zones/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a skill zone")
    public ResponseEntity<Map<String, String>> deleteSkillZone(@PathVariable Long id) {
        recruitmentService.deleteSkillZone(id);
        return ResponseEntity.ok(Map.of("message", "Skill zone deleted"));
    }

    @GetMapping("/skill-zones/{id}/candidates")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List candidates in a skill zone")
    public ResponseEntity<List<SkillZoneCandidate>> listSkillZoneCandidates(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentService.listSkillZoneCandidates(id));
    }

    @PostMapping("/skill-zones/{id}/candidates")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Operation(summary = "Add a candidate to a skill zone")
    public ResponseEntity<SkillZoneCandidate> addSkillZoneCandidate(@PathVariable Long id,
                                                                     @RequestBody SkillZoneCandidate szc) {
        return ResponseEntity.ok(recruitmentService.addSkillZoneCandidate(id, szc));
    }

    // ─── Stage Notes ──────────────────────────────────────────────────────────

    @GetMapping("/stage-notes")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List stage notes for a candidate")
    public ResponseEntity<List<StageNote>> listStageNotes(@RequestParam(required = false) Long candidateId) {
        return ResponseEntity.ok(recruitmentService.listStageNotes(candidateId));
    }

    @PostMapping("/stage-notes")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Operation(summary = "Create a stage note")
    public ResponseEntity<StageNote> createStageNote(@RequestBody StageNote note) {
        return ResponseEntity.ok(recruitmentService.createStageNote(note));
    }

    @DeleteMapping("/stage-notes/{id}")
    @PreAuthorize("hasAuthority('recruitment:delete')")
    @Operation(summary = "Delete a stage note")
    public ResponseEntity<Map<String, String>> deleteStageNote(@PathVariable Long id) {
        recruitmentService.deleteStageNote(id);
        return ResponseEntity.ok(Map.of("message", "Stage note deleted"));
    }

    // ─── Reject Reasons ───────────────────────────────────────────────────────

    @GetMapping("/reject-reasons")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List reject reasons (company-scoped)")
    public ResponseEntity<List<RejectReason>> listRejectReasons() {
        return ResponseEntity.ok(recruitmentService.listRejectReasons());
    }

    @PostMapping("/reject-reasons")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a reject reason")
    public ResponseEntity<RejectReason> createRejectReason(@RequestBody RejectReason reason) {
        return ResponseEntity.ok(recruitmentService.createRejectReason(reason));
    }

    @PutMapping("/reject-reasons/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update a reject reason")
    public ResponseEntity<RejectReason> updateRejectReason(@PathVariable Long id,
                                                            @RequestBody RejectReason updated) {
        return ResponseEntity.ok(recruitmentService.updateRejectReason(id, updated));
    }

    @DeleteMapping("/reject-reasons/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a reject reason")
    public ResponseEntity<Map<String, String>> deleteRejectReason(@PathVariable Long id) {
        recruitmentService.deleteRejectReason(id);
        return ResponseEntity.ok(Map.of("message", "Reject reason deleted"));
    }

    // ─── Rejected Candidates ──────────────────────────────────────────────────

    @GetMapping("/rejected-candidates")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List rejected candidates")
    public ResponseEntity<List<RejectedCandidate>> listRejected(
            @RequestParam(required = false) Long companyId) {
        return ResponseEntity.ok(recruitmentService.listRejectedCandidates(companyId));
    }

    @PostMapping("/rejected-candidates")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Mark a candidate as rejected")
    public ResponseEntity<RejectedCandidate> rejectCandidate(@RequestBody RejectedCandidate rejected) {
        return ResponseEntity.ok(recruitmentService.rejectCandidate(rejected));
    }

    // ─── Skills ───────────────────────────────────────────────────────────────

    @GetMapping("/skills")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List skills")
    public ResponseEntity<List<Skill>> listSkills(@RequestParam(required = false) Long companyId) {
        return ResponseEntity.ok(recruitmentService.listSkills(companyId));
    }

    @PostMapping("/skills")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a skill")
    public ResponseEntity<Skill> createSkill(@RequestBody Skill skill) {
        return ResponseEntity.ok(recruitmentService.createSkill(skill));
    }

    @DeleteMapping("/skills/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a skill")
    public ResponseEntity<Map<String, String>> deleteSkill(@PathVariable Long id) {
        recruitmentService.deleteSkill(id);
        return ResponseEntity.ok(Map.of("message", "Skill deleted"));
    }

    // ─── Survey Templates ─────────────────────────────────────────────────────

    @GetMapping("/survey-templates")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List survey templates")
    public ResponseEntity<List<SurveyTemplate>> listSurveyTemplates(
            @RequestParam(required = false) Long companyId) {
        return ResponseEntity.ok(recruitmentService.listSurveyTemplates(companyId));
    }

    @PostMapping("/survey-templates")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a survey template")
    public ResponseEntity<SurveyTemplate> createSurveyTemplate(@RequestBody SurveyTemplate template) {
        return ResponseEntity.ok(recruitmentService.createSurveyTemplate(template));
    }

    @PutMapping("/survey-templates/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update a survey template")
    public ResponseEntity<SurveyTemplate> updateSurveyTemplate(@PathVariable Long id,
                                                                 @RequestBody SurveyTemplate updated) {
        return ResponseEntity.ok(recruitmentService.updateSurveyTemplate(id, updated));
    }

    @DeleteMapping("/survey-templates/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a survey template")
    public ResponseEntity<Map<String, String>> deleteSurveyTemplate(@PathVariable Long id) {
        recruitmentService.deleteSurveyTemplate(id);
        return ResponseEntity.ok(Map.of("message", "Survey template deleted"));
    }

    // ─── Recruitment Surveys ──────────────────────────────────────────────────

    @GetMapping("/posts/{postId}/surveys")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List surveys for a recruitment post")
    public ResponseEntity<List<RecruitmentSurvey>> listSurveys(@PathVariable Long postId) {
        return ResponseEntity.ok(recruitmentService.listSurveys(postId));
    }

    @PostMapping("/posts/{postId}/surveys")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a survey for a post")
    public ResponseEntity<RecruitmentSurvey> createSurvey(@PathVariable Long postId,
                                                           @RequestBody RecruitmentSurvey survey) {
        return ResponseEntity.ok(recruitmentService.createSurvey(postId, survey));
    }

    @GetMapping("/surveys/{surveyId}/questions")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List questions for a survey")
    public ResponseEntity<List<QuestionOrdering>> listQuestions(@PathVariable Long surveyId) {
        return ResponseEntity.ok(recruitmentService.listQuestions(surveyId));
    }

    @PostMapping("/surveys/{surveyId}/questions")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Add a question to a survey")
    public ResponseEntity<QuestionOrdering> addQuestion(@PathVariable Long surveyId,
                                                         @RequestBody QuestionOrdering question) {
        return ResponseEntity.ok(recruitmentService.addQuestion(surveyId, question));
    }

    @DeleteMapping("/surveys/questions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a survey question")
    public ResponseEntity<Map<String, String>> deleteQuestion(@PathVariable Long id) {
        recruitmentService.deleteQuestion(id);
        return ResponseEntity.ok(Map.of("message", "Question deleted"));
    }

    @PostMapping("/surveys/{surveyId}/answers")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Operation(summary = "Submit answers to a survey")
    public ResponseEntity<SurveyAnswer> submitAnswer(@PathVariable Long surveyId,
                                                      @RequestBody SurveyAnswer answer) {
        return ResponseEntity.ok(recruitmentService.submitAnswer(surveyId, answer));
    }

    // ─── Resumes ──────────────────────────────────────────────────────────────

    @GetMapping("/candidates/{candidateId}/resumes")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List resumes for a candidate")
    public ResponseEntity<List<Resume>> listResumes(@PathVariable Long candidateId) {
        return ResponseEntity.ok(recruitmentService.listResumes(candidateId));
    }

    @PostMapping("/candidates/{candidateId}/resumes")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Operation(summary = "Upload a resume for a candidate")
    public ResponseEntity<Resume> addResume(@PathVariable Long candidateId, @RequestBody Resume resume) {
        return ResponseEntity.ok(recruitmentService.addResume(candidateId, resume));
    }

    @DeleteMapping("/candidates/resumes/{id}")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Delete a candidate resume")
    public ResponseEntity<Map<String, String>> deleteResume(@PathVariable Long id) {
        recruitmentService.deleteResume(id);
        return ResponseEntity.ok(Map.of("message", "Resume deleted"));
    }

    // ─── Candidate Documents ──────────────────────────────────────────────────

    @GetMapping("/candidates/{candidateId}/document-requests")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List document requests for a candidate")
    public ResponseEntity<List<CandidateDocumentRequest>> listDocumentRequests(
            @PathVariable Long candidateId) {
        return ResponseEntity.ok(recruitmentService.listDocumentRequests(candidateId));
    }

    @PostMapping("/candidates/{candidateId}/document-requests")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Request a document from a candidate")
    public ResponseEntity<CandidateDocumentRequest> createDocumentRequest(
            @PathVariable Long candidateId,
            @RequestBody CandidateDocumentRequest request) {
        return ResponseEntity.ok(recruitmentService.createDocumentRequest(candidateId, request));
    }

    @GetMapping("/candidates/{candidateId}/documents")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List documents submitted by a candidate")
    public ResponseEntity<List<CandidateDocument>> listDocuments(@PathVariable Long candidateId) {
        return ResponseEntity.ok(recruitmentService.listDocuments(candidateId));
    }

    @PostMapping("/candidates/{candidateId}/documents")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Operation(summary = "Upload a document for a candidate")
    public ResponseEntity<CandidateDocument> uploadDocument(@PathVariable Long candidateId,
                                                             @RequestBody CandidateDocument document) {
        return ResponseEntity.ok(recruitmentService.uploadDocument(candidateId, document));
    }

    // ─── Recruitment General Settings ─────────────────────────────────────────

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "Get recruitment general settings")
    public ResponseEntity<RecruitmentGeneralSetting> getSettings(@RequestParam Long companyId) {
        return recruitmentService.getSettings(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Upsert recruitment general settings")
    public ResponseEntity<RecruitmentGeneralSetting> upsertSettings(
            @RequestParam Long companyId,
            @RequestBody RecruitmentGeneralSetting body) {
        return ResponseEntity.ok(recruitmentService.upsertSettings(companyId, body));
    }

    // ─── Recruitment Dashboard ────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "Get recruitment dashboard stats for a company")
    public ResponseEntity<Map<String, Object>> recruitmentDashboard(@RequestParam Long companyId) {
        return ResponseEntity.ok(recruitmentService.getDashboardStats(companyId));
    }
}
