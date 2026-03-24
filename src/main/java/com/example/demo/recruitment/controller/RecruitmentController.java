package com.example.demo.recruitment.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.recruitment.entity.*;
import com.example.demo.recruitment.repository.*;
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
@RequestMapping("/api/recruitment")
@RequiredArgsConstructor
@Tag(name = "Recruitment")
public class RecruitmentController {

    private final RecruitmentPostRepository recruitmentPostRepository;
    private final ApplicantRepository applicantRepository;
    private final InterviewScheduleRepository interviewScheduleRepository;
    private final CandidateRatingRepository candidateRatingRepository;
    private final SkillZoneRepository skillZoneRepository;
    private final SkillZoneCandidateRepository skillZoneCandidateRepository;
    private final StageNoteRepository stageNoteRepository;
    private final RejectReasonRepository rejectReasonRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final SurveyTemplateRepository surveyTemplateRepository;
    private final SkillRepository skillRepository;
    private final RejectedCandidateRepository rejectedCandidateRepository;
    private final StageFileRepository stageFileRepository;
    private final RecruitmentSurveyRepository recruitmentSurveyRepository;
    private final QuestionOrderingRepository questionOrderingRepository;
    private final SurveyAnswerRepository surveyAnswerRepository;
    private final RecruitmentGeneralSettingRepository recruitmentGeneralSettingRepository;
    private final ResumeRepository resumeRepository;
    private final CandidateDocumentRequestRepository candidateDocumentRequestRepository;
    private final CandidateDocumentRepository candidateDocumentRepository;

    @GetMapping("/posts")
    @PreAuthorize("hasAuthority('recruitment:view')")
    public ResponseEntity<List<RecruitmentPost>> listPosts() {
        var spec = ScopeFilter.<RecruitmentPost>byCompany();
        return ResponseEntity.ok(spec != null ? recruitmentPostRepository.findAll(spec) : recruitmentPostRepository.findAll());
    }

    @GetMapping("/posts/{id}")
    @PreAuthorize("hasAuthority('recruitment:view')")
    public ResponseEntity<RecruitmentPost> getPost(@PathVariable Long id) {
        return ResponseEntity.ok(recruitmentPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", id)));
    }

    @PostMapping("/posts")
    @PreAuthorize("hasAuthority('recruitment:create')")
    public ResponseEntity<RecruitmentPost> createPost(@RequestBody RecruitmentPost post) {
        return ResponseEntity.ok(recruitmentPostRepository.save(post));
    }

    @PutMapping("/posts/{id}")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    public ResponseEntity<RecruitmentPost> updatePost(@PathVariable Long id, @RequestBody RecruitmentPost updated) {
        RecruitmentPost post = recruitmentPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", id));
        post.setName(updated.getName());
        post.setStatus(updated.getStatus());
        post.setNoOfRecruitment(updated.getNoOfRecruitment());
        post.setStartDate(updated.getStartDate());
        post.setEndDate(updated.getEndDate());
        post.setDescription(updated.getDescription());
        post.setIsPublished(updated.getIsPublished());
        return ResponseEntity.ok(recruitmentPostRepository.save(post));
    }

    @DeleteMapping("/posts/{id}")
    @PreAuthorize("hasAuthority('recruitment:delete')")
    public ResponseEntity<Map<String, String>> deletePost(@PathVariable Long id) {
        RecruitmentPost post = recruitmentPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", id));
        post.setActive(false);
        recruitmentPostRepository.save(post);
        return ResponseEntity.ok(Map.of("message", "Recruitment post deactivated"));
    }

    @GetMapping("/applicants")
    @PreAuthorize("hasAuthority('recruitment:view')")
    public ResponseEntity<List<Applicant>> listApplicants() {
        var spec = ScopeFilter.<Applicant>byCompany();
        return ResponseEntity.ok(spec != null ? applicantRepository.findAll(spec) : applicantRepository.findAll());
    }

    @GetMapping("/posts/{postId}/applicants")
    @PreAuthorize("hasAuthority('recruitment:view')")
    public ResponseEntity<List<Applicant>> applicantsByPost(@PathVariable Long postId) {
        return ResponseEntity.ok(applicantRepository.findByRecruitmentId(postId));
    }

    @PostMapping("/applicants")
    @PreAuthorize("hasAuthority('recruitment:create')")
    public ResponseEntity<Applicant> createApplicant(@RequestBody Applicant applicant) {
        return ResponseEntity.ok(applicantRepository.save(applicant));
    }

    @PutMapping("/applicants/{id}/stage")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    public ResponseEntity<Applicant> updateStage(@PathVariable Long id, @RequestParam Long stageId) {
        Applicant applicant = applicantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Applicant", id));
        // Stage lookup would be done here
        return ResponseEntity.ok(applicantRepository.save(applicant));
    }

    @PutMapping("/applicants/{id}/hire")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    public ResponseEntity<Applicant> hire(@PathVariable Long id) {
        Applicant applicant = applicantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Applicant", id));
        applicant.setStatus(Applicant.ApplicantStatus.HIRED);
        return ResponseEntity.ok(applicantRepository.save(applicant));
    }

    @PutMapping("/applicants/{id}/reject")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    public ResponseEntity<Applicant> rejectApplicant(@PathVariable Long id) {
        Applicant applicant = applicantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Applicant", id));
        applicant.setStatus(Applicant.ApplicantStatus.REJECTED);
        return ResponseEntity.ok(applicantRepository.save(applicant));
    }

    // ─── Interview Schedules ──────────────────────────────────────────────────

    @GetMapping("/interviews")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List interview schedules (company-scoped)")
    public ResponseEntity<List<InterviewSchedule>> listInterviews() {
        var spec = ScopeFilter.<InterviewSchedule>byCompany();
        return ResponseEntity.ok(spec != null ? interviewScheduleRepository.findAll(spec) : interviewScheduleRepository.findAll());
    }

    @PostMapping("/interviews")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Transactional
    @Operation(summary = "Create an interview schedule")
    public ResponseEntity<InterviewSchedule> createInterview(@RequestBody InterviewSchedule interview) {
        if (interview.getCandidate() != null && interview.getCandidate().getId() != null) {
            // Candidate reference
        }
        if (interview.getCompany() != null && interview.getCompany().getId() != null) {
            interview.setCompany(companyRepository.getReferenceById(interview.getCompany().getId()));
        }
        return ResponseEntity.ok(interviewScheduleRepository.save(interview));
    }

    @PutMapping("/interviews/{id}")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Transactional
    @Operation(summary = "Update an interview schedule")
    public ResponseEntity<InterviewSchedule> updateInterview(@PathVariable Long id, @RequestBody InterviewSchedule updated) {
        InterviewSchedule i = interviewScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InterviewSchedule", id));
        i.setInterviewDate(updated.getInterviewDate());
        i.setInterviewTime(updated.getInterviewTime());
        i.setDescription(updated.getDescription());
        return ResponseEntity.ok(interviewScheduleRepository.save(i));
    }

    @PostMapping("/interviews/{id}/complete")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Transactional
    @Operation(summary = "Mark interview as completed")
    public ResponseEntity<InterviewSchedule> completeInterview(@PathVariable Long id) {
        InterviewSchedule i = interviewScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InterviewSchedule", id));
        i.setCompleted(true);
        return ResponseEntity.ok(interviewScheduleRepository.save(i));
    }

    @DeleteMapping("/interviews/{id}")
    @PreAuthorize("hasAuthority('recruitment:delete')")
    @Operation(summary = "Delete an interview schedule")
    public ResponseEntity<Map<String, String>> deleteInterview(@PathVariable Long id) {
        interviewScheduleRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Interview deleted"));
    }

    // ─── Candidate Ratings ────────────────────────────────────────────────────

    @GetMapping("/ratings")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get ratings for a candidate")
    public ResponseEntity<List<CandidateRating>> getRatings(@RequestParam Long candidateId) {
        return ResponseEntity.ok(candidateRatingRepository.findByCandidateId(candidateId));
    }

    @PostMapping("/ratings")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Transactional
    @Operation(summary = "Rate a candidate")
    public ResponseEntity<CandidateRating> rateCandidate(@RequestBody CandidateRating rating) {
        if (rating.getRater() != null && rating.getRater().getId() != null) {
            rating.setRater(employeeRepository.getReferenceById(rating.getRater().getId()));
        }
        if (rating.getCompany() != null && rating.getCompany().getId() != null) {
            rating.setCompany(companyRepository.getReferenceById(rating.getCompany().getId()));
        }
        return ResponseEntity.ok(candidateRatingRepository.save(rating));
    }

    // ─── Skill Zones ──────────────────────────────────────────────────────────

    @GetMapping("/skill-zones")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List skill zones (company-scoped)")
    public ResponseEntity<List<SkillZone>> listSkillZones() {
        var spec = ScopeFilter.<SkillZone>byCompany();
        return ResponseEntity.ok(spec != null ? skillZoneRepository.findAll(spec) : skillZoneRepository.findAll());
    }

    @PostMapping("/skill-zones")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a skill zone")
    public ResponseEntity<SkillZone> createSkillZone(@RequestBody SkillZone skillZone) {
        if (skillZone.getCompany() != null && skillZone.getCompany().getId() != null) {
            skillZone.setCompany(companyRepository.getReferenceById(skillZone.getCompany().getId()));
        }
        return ResponseEntity.ok(skillZoneRepository.save(skillZone));
    }

    @PutMapping("/skill-zones/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a skill zone")
    public ResponseEntity<SkillZone> updateSkillZone(@PathVariable Long id, @RequestBody SkillZone updated) {
        SkillZone sz = skillZoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SkillZone", id));
        sz.setTitle(updated.getTitle());
        sz.setDescription(updated.getDescription());
        return ResponseEntity.ok(skillZoneRepository.save(sz));
    }

    @DeleteMapping("/skill-zones/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a skill zone")
    public ResponseEntity<Map<String, String>> deleteSkillZone(@PathVariable Long id) {
        skillZoneRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Skill zone deleted"));
    }

    @GetMapping("/skill-zones/{id}/candidates")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List candidates in a skill zone")
    public ResponseEntity<List<SkillZoneCandidate>> listSkillZoneCandidates(@PathVariable Long id) {
        return ResponseEntity.ok(skillZoneCandidateRepository.findBySkillZoneId(id));
    }

    @PostMapping("/skill-zones/{id}/candidates")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Transactional
    @Operation(summary = "Add a candidate to a skill zone")
    public ResponseEntity<SkillZoneCandidate> addSkillZoneCandidate(@PathVariable Long id, @RequestBody SkillZoneCandidate szc) {
        szc.setSkillZone(skillZoneRepository.getReferenceById(id));
        if (szc.getCompany() != null && szc.getCompany().getId() != null) {
            szc.setCompany(companyRepository.getReferenceById(szc.getCompany().getId()));
        }
        return ResponseEntity.ok(skillZoneCandidateRepository.save(szc));
    }

    // ─── Stage Notes ──────────────────────────────────────────────────────────

    @GetMapping("/stage-notes")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List stage notes for a candidate")
    public ResponseEntity<List<StageNote>> listStageNotes(@RequestParam(required = false) Long candidateId) {
        if (candidateId != null) return ResponseEntity.ok(stageNoteRepository.findByCandidateId(candidateId));
        var spec = ScopeFilter.<StageNote>byCompany();
        return ResponseEntity.ok(spec != null ? stageNoteRepository.findAll(spec) : stageNoteRepository.findAll());
    }

    @PostMapping("/stage-notes")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Transactional
    @Operation(summary = "Create a stage note")
    public ResponseEntity<StageNote> createStageNote(@RequestBody StageNote note) {
        if (note.getUpdatedBy() != null && note.getUpdatedBy().getId() != null) {
            note.setUpdatedBy(employeeRepository.getReferenceById(note.getUpdatedBy().getId()));
        }
        if (note.getCompany() != null && note.getCompany().getId() != null) {
            note.setCompany(companyRepository.getReferenceById(note.getCompany().getId()));
        }
        return ResponseEntity.ok(stageNoteRepository.save(note));
    }

    @DeleteMapping("/stage-notes/{id}")
    @PreAuthorize("hasAuthority('recruitment:delete')")
    @Operation(summary = "Delete a stage note")
    public ResponseEntity<Map<String, String>> deleteStageNote(@PathVariable Long id) {
        stageNoteRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Stage note deleted"));
    }

    // ─── Reject Reasons ───────────────────────────────────────────────────────

    @GetMapping("/reject-reasons")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List reject reasons (company-scoped)")
    public ResponseEntity<List<RejectReason>> listRejectReasons() {
        var spec = ScopeFilter.<RejectReason>byCompany();
        return ResponseEntity.ok(spec != null ? rejectReasonRepository.findAll(spec) : rejectReasonRepository.findAll());
    }

    @PostMapping("/reject-reasons")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a reject reason")
    public ResponseEntity<RejectReason> createRejectReason(@RequestBody RejectReason reason) {
        if (reason.getCompany() != null && reason.getCompany().getId() != null) {
            reason.setCompany(companyRepository.getReferenceById(reason.getCompany().getId()));
        }
        return ResponseEntity.ok(rejectReasonRepository.save(reason));
    }

    @PutMapping("/reject-reasons/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a reject reason")
    public ResponseEntity<RejectReason> updateRejectReason(@PathVariable Long id, @RequestBody RejectReason updated) {
        RejectReason r = rejectReasonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RejectReason", id));
        r.setTitle(updated.getTitle());
        r.setDescription(updated.getDescription());
        return ResponseEntity.ok(rejectReasonRepository.save(r));
    }

    @DeleteMapping("/reject-reasons/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a reject reason")
    public ResponseEntity<Map<String, String>> deleteRejectReason(@PathVariable Long id) {
        rejectReasonRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Reject reason deleted"));
    }

    // ─── Skills ───────────────────────────────────────────────────────────────

    @GetMapping("/skills")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List skills")
    public ResponseEntity<List<Skill>> listSkills(@RequestParam(required = false) Long companyId) {
        if (companyId != null) return ResponseEntity.ok(skillRepository.findByCompanyId(companyId));
        var spec = ScopeFilter.<Skill>byCompany();
        return ResponseEntity.ok(spec != null ? skillRepository.findAll(spec) : skillRepository.findAll());
    }

    @PostMapping("/skills")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a skill")
    public ResponseEntity<Skill> createSkill(@RequestBody Skill skill) {
        if (skill.getCompany() != null && skill.getCompany().getId() != null) {
            skill.setCompany(companyRepository.getReferenceById(skill.getCompany().getId()));
        }
        return ResponseEntity.ok(skillRepository.save(skill));
    }

    @DeleteMapping("/skills/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a skill")
    public ResponseEntity<Map<String, String>> deleteSkill(@PathVariable Long id) {
        skillRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Skill deleted"));
    }

    // ─── Survey Templates ─────────────────────────────────────────────────────

    @GetMapping("/survey-templates")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List survey templates")
    public ResponseEntity<List<SurveyTemplate>> listSurveyTemplates(@RequestParam(required = false) Long companyId) {
        if (companyId != null) return ResponseEntity.ok(surveyTemplateRepository.findByCompanyId(companyId));
        var spec = ScopeFilter.<SurveyTemplate>byCompany();
        return ResponseEntity.ok(spec != null ? surveyTemplateRepository.findAll(spec) : surveyTemplateRepository.findAll());
    }

    @PostMapping("/survey-templates")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a survey template")
    public ResponseEntity<SurveyTemplate> createSurveyTemplate(@RequestBody SurveyTemplate template) {
        if (template.getCompany() != null && template.getCompany().getId() != null) {
            template.setCompany(companyRepository.getReferenceById(template.getCompany().getId()));
        }
        return ResponseEntity.ok(surveyTemplateRepository.save(template));
    }

    @PutMapping("/survey-templates/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a survey template")
    public ResponseEntity<SurveyTemplate> updateSurveyTemplate(@PathVariable Long id, @RequestBody SurveyTemplate updated) {
        SurveyTemplate t = surveyTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SurveyTemplate", id));
        t.setTitle(updated.getTitle());
        t.setDescription(updated.getDescription());
        return ResponseEntity.ok(surveyTemplateRepository.save(t));
    }

    @DeleteMapping("/survey-templates/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a survey template")
    public ResponseEntity<Map<String, String>> deleteSurveyTemplate(@PathVariable Long id) {
        surveyTemplateRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Survey template deleted"));
    }

    // ─── Recruitment Surveys ──────────────────────────────────────────────────

    @GetMapping("/posts/{postId}/surveys")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List surveys for a recruitment post")
    public ResponseEntity<List<RecruitmentSurvey>> listSurveys(@PathVariable Long postId) {
        return ResponseEntity.ok(recruitmentSurveyRepository.findByRecruitmentPostId(postId));
    }

    @PostMapping("/posts/{postId}/surveys")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a survey for a post")
    public ResponseEntity<RecruitmentSurvey> createSurvey(@PathVariable Long postId, @RequestBody RecruitmentSurvey survey) {
        survey.setRecruitmentPost(recruitmentPostRepository.getReferenceById(postId));
        if (survey.getSurveyTemplate() != null && survey.getSurveyTemplate().getId() != null) {
            survey.setSurveyTemplate(surveyTemplateRepository.getReferenceById(survey.getSurveyTemplate().getId()));
        }
        return ResponseEntity.ok(recruitmentSurveyRepository.save(survey));
    }

    @GetMapping("/surveys/{surveyId}/questions")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List questions for a survey")
    public ResponseEntity<List<QuestionOrdering>> listQuestions(@PathVariable Long surveyId) {
        return ResponseEntity.ok(questionOrderingRepository.findBySurveyIdOrderByOrderingAsc(surveyId));
    }

    @PostMapping("/surveys/{surveyId}/questions")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Add a question to a survey")
    public ResponseEntity<QuestionOrdering> addQuestion(@PathVariable Long surveyId, @RequestBody QuestionOrdering question) {
        question.setSurvey(recruitmentSurveyRepository.getReferenceById(surveyId));
        return ResponseEntity.ok(questionOrderingRepository.save(question));
    }

    @DeleteMapping("/surveys/questions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a survey question")
    public ResponseEntity<Map<String, String>> deleteQuestion(@PathVariable Long id) {
        questionOrderingRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Question deleted"));
    }

    @PostMapping("/surveys/{surveyId}/answers")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Transactional
    @Operation(summary = "Submit answers to a survey")
    public ResponseEntity<SurveyAnswer> submitAnswer(@PathVariable Long surveyId, @RequestBody SurveyAnswer answer) {
        answer.setSurvey(recruitmentSurveyRepository.getReferenceById(surveyId));
        if (answer.getQuestion() != null && answer.getQuestion().getId() != null) {
            answer.setQuestion(questionOrderingRepository.getReferenceById(answer.getQuestion().getId()));
        }
        if (answer.getCandidate() != null && answer.getCandidate().getId() != null) {
            // candidate is a Candidate entity; no repo injection needed - use pass-through
        }
        return ResponseEntity.ok(surveyAnswerRepository.save(answer));
    }

    // ─── Rejected Candidates ──────────────────────────────────────────────────

    @GetMapping("/rejected-candidates")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List rejected candidates")
    public ResponseEntity<List<RejectedCandidate>> listRejected(@RequestParam(required = false) Long companyId) {
        if (companyId != null) return ResponseEntity.ok(rejectedCandidateRepository.findByCompanyId(companyId));
        var spec = ScopeFilter.<RejectedCandidate>byCompany();
        return ResponseEntity.ok(spec != null ? rejectedCandidateRepository.findAll(spec) : rejectedCandidateRepository.findAll());
    }

    @PostMapping("/rejected-candidates")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Transactional
    @Operation(summary = "Mark a candidate as rejected")
    public ResponseEntity<RejectedCandidate> rejectCandidate(@RequestBody RejectedCandidate rejected) {
        if (rejected.getCompany() != null && rejected.getCompany().getId() != null) {
            rejected.setCompany(companyRepository.getReferenceById(rejected.getCompany().getId()));
        }
        return ResponseEntity.ok(rejectedCandidateRepository.save(rejected));
    }

    // ─── Stage Files ──────────────────────────────────────────────────────────

    @GetMapping("/stages/{stageId}/files")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List files for a stage")
    public ResponseEntity<List<StageFile>> listStageFiles(@PathVariable Long stageId) {
        return ResponseEntity.ok(stageFileRepository.findByStageId(stageId));
    }

    @PostMapping("/stages/{stageId}/files")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Transactional
    @Operation(summary = "Add a file to a stage")
    public ResponseEntity<StageFile> addStageFile(@PathVariable Long stageId, @RequestBody StageFile file) {
        // RecruitmentStage is referenced by stageId
        file.setStage(new RecruitmentStage() {{ setId(stageId); }});
        return ResponseEntity.ok(stageFileRepository.save(file));
    }

    @DeleteMapping("/stages/files/{id}")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Delete a stage file")
    public ResponseEntity<Map<String, String>> deleteStageFile(@PathVariable Long id) {
        stageFileRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "File deleted"));
    }

    // ─── Resumes ──────────────────────────────────────────────────────────────

    @GetMapping("/candidates/{candidateId}/resumes")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List resumes for a candidate")
    public ResponseEntity<List<Resume>> listResumes(@PathVariable Long candidateId) {
        return ResponseEntity.ok(resumeRepository.findByCandidateId(candidateId));
    }

    @PostMapping("/candidates/{candidateId}/resumes")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Transactional
    @Operation(summary = "Upload a resume for a candidate")
    public ResponseEntity<Resume> addResume(@PathVariable Long candidateId, @RequestBody Resume resume) {
        resume.setCandidate(new Candidate() {{ setId(candidateId); }});
        return ResponseEntity.ok(resumeRepository.save(resume));
    }

    @DeleteMapping("/candidates/resumes/{id}")
    @PreAuthorize("hasAuthority('recruitment:edit')")
    @Operation(summary = "Delete a candidate resume")
    public ResponseEntity<Map<String, String>> deleteResume(@PathVariable Long id) {
        resumeRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Resume deleted"));
    }

    // ─── Candidate Documents ──────────────────────────────────────────────────

    @GetMapping("/candidates/{candidateId}/document-requests")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List document requests for a candidate")
    public ResponseEntity<List<CandidateDocumentRequest>> listDocumentRequests(@PathVariable Long candidateId) {
        return ResponseEntity.ok(candidateDocumentRequestRepository.findByCandidateId(candidateId));
    }

    @PostMapping("/candidates/{candidateId}/document-requests")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Request a document from a candidate")
    public ResponseEntity<CandidateDocumentRequest> createDocumentRequest(@PathVariable Long candidateId,
                                                                           @RequestBody CandidateDocumentRequest request) {
        request.setCandidate(new Candidate() {{ setId(candidateId); }});
        if (request.getCompany() != null && request.getCompany().getId() != null) {
            request.setCompany(companyRepository.getReferenceById(request.getCompany().getId()));
        }
        return ResponseEntity.ok(candidateDocumentRequestRepository.save(request));
    }

    @GetMapping("/candidates/{candidateId}/documents")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Operation(summary = "List documents submitted by a candidate")
    public ResponseEntity<List<CandidateDocument>> listDocuments(@PathVariable Long candidateId) {
        return ResponseEntity.ok(candidateDocumentRepository.findByCandidateId(candidateId));
    }

    @PostMapping("/candidates/{candidateId}/documents")
    @PreAuthorize("hasAuthority('recruitment:create')")
    @Transactional
    @Operation(summary = "Upload a document for a candidate")
    public ResponseEntity<CandidateDocument> uploadDocument(@PathVariable Long candidateId,
                                                             @RequestBody CandidateDocument document) {
        document.setCandidate(new Candidate() {{ setId(candidateId); }});
        if (document.getRequest() != null && document.getRequest().getId() != null) {
            document.setRequest(candidateDocumentRequestRepository.getReferenceById(document.getRequest().getId()));
        }
        return ResponseEntity.ok(candidateDocumentRepository.save(document));
    }

    // ─── Recruitment General Settings ─────────────────────────────────────────

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('recruitment:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get recruitment general settings")
    public ResponseEntity<RecruitmentGeneralSetting> getSettings(@RequestParam Long companyId) {
        return recruitmentGeneralSettingRepository.findByCompanyId(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Upsert recruitment general settings")
    public ResponseEntity<RecruitmentGeneralSetting> upsertSettings(@RequestParam Long companyId,
                                                                      @RequestBody RecruitmentGeneralSetting body) {
        RecruitmentGeneralSetting s = recruitmentGeneralSettingRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    RecruitmentGeneralSetting n = new RecruitmentGeneralSetting();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    return n;
                });
        s.setSendConfirmationEmail(body.getSendConfirmationEmail());
        s.setShowSalaryRange(body.getShowSalaryRange());
        s.setAutoAdvanceOnInterview(body.getAutoAdvanceOnInterview());
        return ResponseEntity.ok(recruitmentGeneralSettingRepository.save(s));
    }
}
