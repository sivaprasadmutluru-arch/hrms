package com.example.demo.recruitment.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.recruitment.entity.*;
import com.example.demo.recruitment.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecruitmentService {

    private final RecruitmentPostRepository recruitmentPostRepository;
    private final RecruitmentStageRepository recruitmentStageRepository;
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
    private final LinkedInAccountRepository linkedInAccountRepository;

    // ─── Recruitment Posts ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RecruitmentPost> listPosts() {
        Specification<RecruitmentPost> spec = ScopeFilter.byCompany();
        return spec != null ? recruitmentPostRepository.findAll(spec) : recruitmentPostRepository.findAll();
    }

    @Transactional(readOnly = true)
    public RecruitmentPost getPost(Long id) {
        return recruitmentPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", id));
    }

    @Transactional
    public RecruitmentPost createPost(RecruitmentPost post) {
        log.info("Creating recruitment post: {}", post.getName());
        return recruitmentPostRepository.save(post);
    }

    @Transactional
    public RecruitmentPost updatePost(Long id, RecruitmentPost updated) {
        RecruitmentPost post = recruitmentPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", id));
        post.setName(updated.getName());
        post.setStatus(updated.getStatus());
        post.setNoOfRecruitment(updated.getNoOfRecruitment());
        post.setStartDate(updated.getStartDate());
        post.setEndDate(updated.getEndDate());
        post.setDescription(updated.getDescription());
        post.setIsPublished(updated.getIsPublished());
        log.info("Updating recruitment post id={}", id);
        return recruitmentPostRepository.save(post);
    }

    @Transactional
    public void deletePost(Long id) {
        RecruitmentPost post = recruitmentPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", id));
        post.setActive(false);
        recruitmentPostRepository.save(post);
        log.info("Soft-deleted recruitment post id={}", id);
    }

    @Transactional
    public RecruitmentPost closePost(Long id) {
        RecruitmentPost post = recruitmentPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", id));
        post.setClosed(true);
        post.setActive(false);
        post.setEndDate(LocalDate.now());
        post.setStatus(RecruitmentPost.RecruitmentStatus.CLOSED);
        log.info("Closing recruitment post id={}", id);
        return recruitmentPostRepository.save(post);
    }

    @Transactional
    public RecruitmentPost reopenPost(Long id) {
        RecruitmentPost post = recruitmentPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", id));
        post.setClosed(false);
        post.setActive(true);
        post.setStatus(RecruitmentPost.RecruitmentStatus.OPEN);
        log.info("Reopening recruitment post id={}", id);
        return recruitmentPostRepository.save(post);
    }

    @Transactional
    public RecruitmentPost archivePost(Long id) {
        RecruitmentPost post = recruitmentPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", id));
        post.setActive(false);
        log.info("Archiving recruitment post id={}", id);
        return recruitmentPostRepository.save(post);
    }

    @Transactional
    public RecruitmentPost unarchivePost(Long id) {
        RecruitmentPost post = recruitmentPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", id));
        post.setActive(true);
        log.info("Unarchiving recruitment post id={}", id);
        return recruitmentPostRepository.save(post);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPostPipeline(Long postId) {
        recruitmentPostRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentPost", postId));
        List<RecruitmentStage> stages = recruitmentStageRepository.findByRecruitmentIdOrderBySequenceAsc(postId);
        List<Applicant> allApplicants = applicantRepository.findByRecruitmentId(postId);

        return stages.stream().map(stage -> {
            List<Applicant> inStage = allApplicants.stream()
                    .filter(a -> a.getStage() != null && stage.getId().equals(a.getStage().getId()))
                    .collect(Collectors.toList());
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("stageId", stage.getId());
            entry.put("stageName", stage.getName());
            entry.put("stageType", stage.getStageType());
            entry.put("applicants", inStage);
            return entry;
        }).collect(Collectors.toList());
    }

    // ─── Recruitment Stages ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RecruitmentStage> listStagesByPost(Long postId) {
        return recruitmentStageRepository.findByRecruitmentIdOrderBySequenceAsc(postId);
    }

    @Transactional
    public RecruitmentStage createStage(RecruitmentStage stage) {
        log.info("Creating recruitment stage: {}", stage.getName());
        return recruitmentStageRepository.save(stage);
    }

    @Transactional
    public RecruitmentStage updateStage(Long id, RecruitmentStage updated) {
        RecruitmentStage stage = recruitmentStageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentStage", id));
        stage.setName(updated.getName());
        stage.setSequence(updated.getSequence());
        stage.setStageType(updated.getStageType());
        return recruitmentStageRepository.save(stage);
    }

    @Transactional
    public RecruitmentStage duplicateStage(Long id) {
        RecruitmentStage original = recruitmentStageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentStage", id));
        RecruitmentStage copy = new RecruitmentStage();
        copy.setName(original.getName() + " (Copy)");
        copy.setSequence(original.getSequence());
        copy.setStageType(original.getStageType());
        copy.setRecruitment(original.getRecruitment());
        log.info("Duplicating recruitment stage id={}", id);
        return recruitmentStageRepository.save(copy);
    }

    @Transactional
    public RecruitmentStage archiveStage(Long id) {
        RecruitmentStage stage = recruitmentStageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentStage", id));
        stage.setActive(false);
        log.info("Archiving recruitment stage id={}", id);
        return recruitmentStageRepository.save(stage);
    }

    // ─── Applicants ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Applicant> listApplicants() {
        Specification<Applicant> spec = ScopeFilter.byCompany();
        return spec != null ? applicantRepository.findAll(spec) : applicantRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Applicant> listApplicantsByPost(Long postId) {
        return applicantRepository.findByRecruitmentId(postId);
    }

    @Transactional
    public Applicant createApplicant(Applicant applicant) {
        log.info("Creating applicant for candidate id={}", applicant.getCandidate() != null ? applicant.getCandidate().getId() : null);
        return applicantRepository.save(applicant);
    }

    @Transactional
    public Applicant moveApplicantToStage(Long applicantId, Long stageId) {
        Applicant applicant = applicantRepository.findById(applicantId)
                .orElseThrow(() -> new ResourceNotFoundException("Applicant", applicantId));
        RecruitmentStage stage = recruitmentStageRepository.findById(stageId)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentStage", stageId));
        applicant.setStage(stage);
        log.info("Moving applicant id={} to stage id={}", applicantId, stageId);
        return applicantRepository.save(applicant);
    }

    @Transactional
    public Applicant hireApplicant(Long id) {
        Applicant applicant = applicantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Applicant", id));
        applicant.setStatus(Applicant.ApplicantStatus.HIRED);
        log.info("Hiring applicant id={}", id);
        return applicantRepository.save(applicant);
    }

    @Transactional
    public Applicant rejectApplicant(Long id) {
        Applicant applicant = applicantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Applicant", id));
        applicant.setStatus(Applicant.ApplicantStatus.REJECTED);
        log.info("Rejecting applicant id={}", id);
        return applicantRepository.save(applicant);
    }

    @Transactional
    public Map<String, Object> bulkApplicantAction(String action, List<Long> ids) {
        if (action == null || ids == null || ids.isEmpty()) {
            throw new IllegalArgumentException("action and ids are required");
        }
        List<Applicant> applicants = applicantRepository.findAllById(ids);
        switch (action.toLowerCase()) {
            case "hire" -> applicants.forEach(a -> a.setStatus(Applicant.ApplicantStatus.HIRED));
            case "reject" -> applicants.forEach(a -> a.setStatus(Applicant.ApplicantStatus.REJECTED));
            case "archive" -> applicants.forEach(a -> a.setActive(false));
            default -> log.warn("Unknown bulk action: {}", action);
        }
        applicantRepository.saveAll(applicants);
        log.info("Bulk action '{}' applied to {} applicants", action, applicants.size());
        return Map.of("count", applicants.size(), "action", action);
    }

    @Transactional
    public Map<String, Object> convertToEmployee(Long applicantId) {
        Applicant applicant = applicantRepository.findById(applicantId)
                .orElseThrow(() -> new ResourceNotFoundException("Applicant", applicantId));
        Candidate candidate = applicant.getCandidate();
        Company company = applicant.getCompany();

        Employee employee = new Employee();
        if (candidate != null && candidate.getName() != null) {
            String[] parts = candidate.getName().trim().split("\\s+", 2);
            employee.setFirstName(parts[0]);
            if (parts.length > 1) employee.setLastName(parts[1]);
        }
        employee.setEmail(candidate != null ? candidate.getEmail() : null);
        employee.setCompany(company);
        employee.setActive(true);

        Employee saved = employeeRepository.save(employee);
        applicant.setStatus(Applicant.ApplicantStatus.HIRED);
        applicantRepository.save(applicant);

        log.info("Converted applicant id={} to employee id={}", applicantId, saved.getId());
        return Map.of("employeeId", saved.getId(), "message", "Employee created successfully");
    }

    public void sendApplicationEmail(Long applicantId, Map<String, Object> mailRequest) {
        Applicant applicant = applicantRepository.findById(applicantId)
                .orElseThrow(() -> new ResourceNotFoundException("Applicant", applicantId));
        String candidateEmail = applicant.getCandidate() != null ? applicant.getCandidate().getEmail() : null;
        String subject = mailRequest.get("subject") != null ? (String) mailRequest.get("subject") : "(no subject)";
        String body = mailRequest.get("body") != null ? (String) mailRequest.get("body") : "";
        log.info("Sending application email to applicant id={} (email={}), subject='{}'", applicantId, candidateEmail, subject);
        // Email dispatch would be wired to an actual mail sender here.
        // For now we log the intent so the stub becomes a traceable no-op.
        if (candidateEmail == null || candidateEmail.isBlank()) {
            log.warn("No email address found for applicant id={}; skipping send", applicantId);
        } else {
            log.info("Email queued: to={}, subject='{}', body length={}", candidateEmail, subject, body.length());
        }
    }

    // ─── Interview Schedules ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<InterviewSchedule> listInterviews() {
        Specification<InterviewSchedule> spec = ScopeFilter.byCompany();
        return spec != null ? interviewScheduleRepository.findAll(spec) : interviewScheduleRepository.findAll();
    }

    @Transactional
    public InterviewSchedule scheduleInterview(InterviewSchedule interview) {
        if (interview.getCompany() != null && interview.getCompany().getId() != null) {
            interview.setCompany(companyRepository.getReferenceById(interview.getCompany().getId()));
        }
        log.info("Scheduling interview for candidate id={}", interview.getCandidate() != null ? interview.getCandidate().getId() : null);
        return interviewScheduleRepository.save(interview);
    }

    @Transactional
    public InterviewSchedule updateInterview(Long id, InterviewSchedule updated) {
        InterviewSchedule interview = interviewScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InterviewSchedule", id));
        interview.setInterviewDate(updated.getInterviewDate());
        interview.setInterviewTime(updated.getInterviewTime());
        interview.setDescription(updated.getDescription());
        return interviewScheduleRepository.save(interview);
    }

    @Transactional
    public InterviewSchedule completeInterview(Long id) {
        InterviewSchedule interview = interviewScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InterviewSchedule", id));
        interview.setCompleted(true);
        log.info("Marking interview id={} as completed", id);
        return interviewScheduleRepository.save(interview);
    }

    @Transactional
    public void deleteInterview(Long id) {
        if (!interviewScheduleRepository.existsById(id)) {
            throw new ResourceNotFoundException("InterviewSchedule", id);
        }
        interviewScheduleRepository.deleteById(id);
        log.info("Deleted interview schedule id={}", id);
    }

    // ─── Candidate Ratings ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CandidateRating> getRatings(Long candidateId) {
        return candidateRatingRepository.findByCandidateId(candidateId);
    }

    @Transactional
    public CandidateRating rateCandidate(CandidateRating rating) {
        if (rating.getRater() != null && rating.getRater().getId() != null) {
            rating.setRater(employeeRepository.getReferenceById(rating.getRater().getId()));
        }
        if (rating.getCompany() != null && rating.getCompany().getId() != null) {
            rating.setCompany(companyRepository.getReferenceById(rating.getCompany().getId()));
        }
        log.info("Saving candidate rating for candidate id={}", rating.getCandidate() != null ? rating.getCandidate().getId() : null);
        return candidateRatingRepository.save(rating);
    }

    // ─── Skill Zones ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SkillZone> listSkillZones() {
        Specification<SkillZone> spec = ScopeFilter.byCompany();
        return spec != null ? skillZoneRepository.findAll(spec) : skillZoneRepository.findAll();
    }

    @Transactional
    public SkillZone createSkillZone(SkillZone skillZone) {
        if (skillZone.getCompany() != null && skillZone.getCompany().getId() != null) {
            skillZone.setCompany(companyRepository.getReferenceById(skillZone.getCompany().getId()));
        }
        log.info("Creating skill zone: {}", skillZone.getTitle());
        return skillZoneRepository.save(skillZone);
    }

    @Transactional
    public SkillZone updateSkillZone(Long id, SkillZone updated) {
        SkillZone skillZone = skillZoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SkillZone", id));
        skillZone.setTitle(updated.getTitle());
        skillZone.setDescription(updated.getDescription());
        return skillZoneRepository.save(skillZone);
    }

    @Transactional
    public void deleteSkillZone(Long id) {
        if (!skillZoneRepository.existsById(id)) {
            throw new ResourceNotFoundException("SkillZone", id);
        }
        skillZoneRepository.deleteById(id);
        log.info("Deleted skill zone id={}", id);
    }

    @Transactional(readOnly = true)
    public List<SkillZoneCandidate> listSkillZoneCandidates(Long skillZoneId) {
        return skillZoneCandidateRepository.findBySkillZoneId(skillZoneId);
    }

    @Transactional
    public SkillZoneCandidate addSkillZoneCandidate(Long skillZoneId, SkillZoneCandidate szc) {
        szc.setSkillZone(skillZoneRepository.getReferenceById(skillZoneId));
        if (szc.getCompany() != null && szc.getCompany().getId() != null) {
            szc.setCompany(companyRepository.getReferenceById(szc.getCompany().getId()));
        }
        log.info("Adding candidate to skill zone id={}", skillZoneId);
        return skillZoneCandidateRepository.save(szc);
    }

    // ─── Stage Notes ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<StageNote> listStageNotes(Long candidateId) {
        if (candidateId != null) {
            return stageNoteRepository.findByCandidateId(candidateId);
        }
        Specification<StageNote> spec = ScopeFilter.byCompany();
        return spec != null ? stageNoteRepository.findAll(spec) : stageNoteRepository.findAll();
    }

    @Transactional
    public StageNote createStageNote(StageNote note) {
        if (note.getUpdatedBy() != null && note.getUpdatedBy().getId() != null) {
            note.setUpdatedBy(employeeRepository.getReferenceById(note.getUpdatedBy().getId()));
        }
        if (note.getCompany() != null && note.getCompany().getId() != null) {
            note.setCompany(companyRepository.getReferenceById(note.getCompany().getId()));
        }
        log.info("Creating stage note for candidate id={}", note.getCandidate() != null ? note.getCandidate().getId() : null);
        return stageNoteRepository.save(note);
    }

    @Transactional
    public void deleteStageNote(Long id) {
        if (!stageNoteRepository.existsById(id)) {
            throw new ResourceNotFoundException("StageNote", id);
        }
        stageNoteRepository.deleteById(id);
        log.info("Deleted stage note id={}", id);
    }

    // ─── Reject Reasons ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RejectReason> listRejectReasons() {
        Specification<RejectReason> spec = ScopeFilter.byCompany();
        return spec != null ? rejectReasonRepository.findAll(spec) : rejectReasonRepository.findAll();
    }

    @Transactional
    public RejectReason createRejectReason(RejectReason reason) {
        if (reason.getCompany() != null && reason.getCompany().getId() != null) {
            reason.setCompany(companyRepository.getReferenceById(reason.getCompany().getId()));
        }
        log.info("Creating reject reason: {}", reason.getTitle());
        return rejectReasonRepository.save(reason);
    }

    @Transactional
    public RejectReason updateRejectReason(Long id, RejectReason updated) {
        RejectReason reason = rejectReasonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RejectReason", id));
        reason.setTitle(updated.getTitle());
        reason.setDescription(updated.getDescription());
        return rejectReasonRepository.save(reason);
    }

    @Transactional
    public void deleteRejectReason(Long id) {
        if (!rejectReasonRepository.existsById(id)) {
            throw new ResourceNotFoundException("RejectReason", id);
        }
        rejectReasonRepository.deleteById(id);
        log.info("Deleted reject reason id={}", id);
    }

    // ─── Rejected Candidates ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RejectedCandidate> listRejectedCandidates(Long companyId) {
        if (companyId != null) {
            return rejectedCandidateRepository.findByCompanyId(companyId);
        }
        Specification<RejectedCandidate> spec = ScopeFilter.byCompany();
        return spec != null ? rejectedCandidateRepository.findAll(spec) : rejectedCandidateRepository.findAll();
    }

    @Transactional
    public RejectedCandidate rejectCandidate(RejectedCandidate rejected) {
        if (rejected.getCompany() != null && rejected.getCompany().getId() != null) {
            rejected.setCompany(companyRepository.getReferenceById(rejected.getCompany().getId()));
        }
        log.info("Recording rejected candidate id={}", rejected.getCandidate() != null ? rejected.getCandidate().getId() : null);
        return rejectedCandidateRepository.save(rejected);
    }

    // ─── Skills ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Skill> listSkills(Long companyId) {
        if (companyId != null) {
            return skillRepository.findByCompanyId(companyId);
        }
        Specification<Skill> spec = ScopeFilter.byCompany();
        return spec != null ? skillRepository.findAll(spec) : skillRepository.findAll();
    }

    @Transactional
    public Skill createSkill(Skill skill) {
        if (skill.getCompany() != null && skill.getCompany().getId() != null) {
            skill.setCompany(companyRepository.getReferenceById(skill.getCompany().getId()));
        }
        log.info("Creating skill: {}", skill.getTitle());
        return skillRepository.save(skill);
    }

    @Transactional
    public void deleteSkill(Long id) {
        if (!skillRepository.existsById(id)) {
            throw new ResourceNotFoundException("Skill", id);
        }
        skillRepository.deleteById(id);
        log.info("Deleted skill id={}", id);
    }

    // ─── Survey Templates ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SurveyTemplate> listSurveyTemplates(Long companyId) {
        if (companyId != null) {
            return surveyTemplateRepository.findByCompanyId(companyId);
        }
        Specification<SurveyTemplate> spec = ScopeFilter.byCompany();
        return spec != null ? surveyTemplateRepository.findAll(spec) : surveyTemplateRepository.findAll();
    }

    @Transactional
    public SurveyTemplate createSurveyTemplate(SurveyTemplate template) {
        if (template.getCompany() != null && template.getCompany().getId() != null) {
            template.setCompany(companyRepository.getReferenceById(template.getCompany().getId()));
        }
        log.info("Creating survey template: {}", template.getTitle());
        return surveyTemplateRepository.save(template);
    }

    @Transactional
    public SurveyTemplate updateSurveyTemplate(Long id, SurveyTemplate updated) {
        SurveyTemplate template = surveyTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SurveyTemplate", id));
        template.setTitle(updated.getTitle());
        template.setDescription(updated.getDescription());
        return surveyTemplateRepository.save(template);
    }

    @Transactional
    public void deleteSurveyTemplate(Long id) {
        if (!surveyTemplateRepository.existsById(id)) {
            throw new ResourceNotFoundException("SurveyTemplate", id);
        }
        surveyTemplateRepository.deleteById(id);
        log.info("Deleted survey template id={}", id);
    }

    // ─── Recruitment Surveys ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RecruitmentSurvey> listSurveys(Long postId) {
        return recruitmentSurveyRepository.findByRecruitmentPostId(postId);
    }

    @Transactional
    public RecruitmentSurvey createSurvey(Long postId, RecruitmentSurvey survey) {
        survey.setRecruitmentPost(recruitmentPostRepository.getReferenceById(postId));
        if (survey.getSurveyTemplate() != null && survey.getSurveyTemplate().getId() != null) {
            survey.setSurveyTemplate(surveyTemplateRepository.getReferenceById(survey.getSurveyTemplate().getId()));
        }
        log.info("Creating survey for post id={}", postId);
        return recruitmentSurveyRepository.save(survey);
    }

    // ─── Survey Questions ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<QuestionOrdering> listQuestions(Long surveyId) {
        return questionOrderingRepository.findBySurveyIdOrderByOrderingAsc(surveyId);
    }

    @Transactional
    public QuestionOrdering addQuestion(Long surveyId, QuestionOrdering question) {
        question.setSurvey(recruitmentSurveyRepository.getReferenceById(surveyId));
        log.info("Adding question to survey id={}", surveyId);
        return questionOrderingRepository.save(question);
    }

    @Transactional
    public void deleteQuestion(Long id) {
        if (!questionOrderingRepository.existsById(id)) {
            throw new ResourceNotFoundException("QuestionOrdering", id);
        }
        questionOrderingRepository.deleteById(id);
        log.info("Deleted survey question id={}", id);
    }

    @Transactional
    public SurveyAnswer submitAnswer(Long surveyId, SurveyAnswer answer) {
        answer.setSurvey(recruitmentSurveyRepository.getReferenceById(surveyId));
        if (answer.getQuestion() != null && answer.getQuestion().getId() != null) {
            answer.setQuestion(questionOrderingRepository.getReferenceById(answer.getQuestion().getId()));
        }
        log.info("Submitting survey answer for survey id={}", surveyId);
        return surveyAnswerRepository.save(answer);
    }

    // ─── Stage Files ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<StageFile> listStageFiles(Long stageId) {
        return stageFileRepository.findByStageId(stageId);
    }

    @Transactional
    public StageFile addStageFile(Long stageId, StageFile file) {
        RecruitmentStage stage = recruitmentStageRepository.findById(stageId)
                .orElseThrow(() -> new ResourceNotFoundException("RecruitmentStage", stageId));
        file.setStage(stage);
        log.info("Adding file to stage id={}", stageId);
        return stageFileRepository.save(file);
    }

    @Transactional
    public void deleteStageFile(Long id) {
        if (!stageFileRepository.existsById(id)) {
            throw new ResourceNotFoundException("StageFile", id);
        }
        stageFileRepository.deleteById(id);
        log.info("Deleted stage file id={}", id);
    }

    // ─── Resumes ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Resume> listResumes(Long candidateId) {
        return resumeRepository.findByCandidateId(candidateId);
    }

    @Transactional
    public Resume addResume(Long candidateId, Resume resume) {
        resume.setCandidate(resumeRepository.getReferenceById(candidateId) instanceof Resume r ? null
                : new Candidate() {{ setId(candidateId); }});
        // Use a proper candidate reference
        Candidate candidateRef = new Candidate();
        candidateRef.setId(candidateId);
        resume.setCandidate(candidateRef);
        log.info("Adding resume for candidate id={}", candidateId);
        return resumeRepository.save(resume);
    }

    @Transactional
    public void deleteResume(Long id) {
        if (!resumeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Resume", id);
        }
        resumeRepository.deleteById(id);
        log.info("Deleted resume id={}", id);
    }

    // ─── Candidate Documents ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CandidateDocumentRequest> listDocumentRequests(Long candidateId) {
        return candidateDocumentRequestRepository.findByCandidateId(candidateId);
    }

    @Transactional
    public CandidateDocumentRequest createDocumentRequest(Long candidateId, CandidateDocumentRequest request) {
        Candidate candidateRef = new Candidate();
        candidateRef.setId(candidateId);
        request.setCandidate(candidateRef);
        if (request.getCompany() != null && request.getCompany().getId() != null) {
            request.setCompany(companyRepository.getReferenceById(request.getCompany().getId()));
        }
        log.info("Creating document request for candidate id={}", candidateId);
        return candidateDocumentRequestRepository.save(request);
    }

    @Transactional(readOnly = true)
    public List<CandidateDocument> listDocuments(Long candidateId) {
        return candidateDocumentRepository.findByCandidateId(candidateId);
    }

    @Transactional
    public CandidateDocument uploadDocument(Long candidateId, CandidateDocument document) {
        Candidate candidateRef = new Candidate();
        candidateRef.setId(candidateId);
        document.setCandidate(candidateRef);
        if (document.getRequest() != null && document.getRequest().getId() != null) {
            document.setRequest(candidateDocumentRequestRepository.getReferenceById(document.getRequest().getId()));
        }
        log.info("Uploading document for candidate id={}", candidateId);
        return candidateDocumentRepository.save(document);
    }

    // ─── Recruitment General Settings ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public Optional<RecruitmentGeneralSetting> getSettings(Long companyId) {
        return recruitmentGeneralSettingRepository.findByCompanyId(companyId);
    }

    @Transactional
    public RecruitmentGeneralSetting upsertSettings(Long companyId, RecruitmentGeneralSetting body) {
        RecruitmentGeneralSetting settings = recruitmentGeneralSettingRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    RecruitmentGeneralSetting n = new RecruitmentGeneralSetting();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    return n;
                });
        settings.setSendConfirmationEmail(body.getSendConfirmationEmail());
        settings.setShowSalaryRange(body.getShowSalaryRange());
        settings.setAutoAdvanceOnInterview(body.getAutoAdvanceOnInterview());
        log.info("Upserting recruitment settings for company id={}", companyId);
        return recruitmentGeneralSettingRepository.save(settings);
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats(Long companyId) {
        List<RecruitmentPost> posts = recruitmentPostRepository.findByCompanyId(companyId);
        long totalPosts = posts.size();
        long activePosts = posts.stream().filter(p -> p.isActive() && !p.isClosed()).count();

        List<Applicant> applicants = applicantRepository.findByCompanyId(companyId);
        long totalApplicants = applicants.size();
        long shortlisted = applicants.stream()
                .filter(a -> Applicant.ApplicantStatus.IN_PROGRESS == a.getStatus()).count();
        long rejected = applicants.stream()
                .filter(a -> Applicant.ApplicantStatus.REJECTED == a.getStatus()).count();
        long hired = applicants.stream()
                .filter(a -> Applicant.ApplicantStatus.HIRED == a.getStatus()).count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalPosts", totalPosts);
        result.put("activePosts", activePosts);
        result.put("totalApplicants", totalApplicants);
        result.put("shortlistedApplicants", shortlisted);
        result.put("rejectedApplicants", rejected);
        result.put("hiredApplicants", hired);
        log.debug("Dashboard stats for company id={}: posts={}, applicants={}", companyId, totalPosts, totalApplicants);
        return result;
    }

    // ─── LinkedIn ─────────────────────────────────────────────────────────────

    @Transactional
    public LinkedInAccount saveLinkedInAccount(LinkedInAccount account) {
        log.info("Saving LinkedIn account for username={}", account.getUsername());
        return linkedInAccountRepository.save(account);
    }

    public Map<String, Object> validateLinkedInCredentials(Long companyId, String apiToken) {
        if (companyId == null) {
            log.warn("validateLinkedInCredentials called without companyId");
            return Map.of("valid", false, "status", "missing_company");
        }
        List<LinkedInAccount> accounts = linkedInAccountRepository.findByCompanyId(companyId);
        boolean hasAccount = !accounts.isEmpty();
        boolean tokenMatches = hasAccount && apiToken != null
                && accounts.stream().anyMatch(a -> apiToken.equals(a.getApiToken()));
        String status = tokenMatches ? "connected" : (hasAccount ? "token_mismatch" : "not_configured");
        log.info("LinkedIn validation for company id={}: status={}", companyId, status);
        return Map.of("valid", tokenMatches, "status", status);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> syncLinkedInCandidates(Long companyId) {
        if (companyId == null) {
            log.warn("syncLinkedInCandidates called without companyId");
            return Map.of("synced", 0, "message", "No company specified");
        }
        List<LinkedInAccount> accounts = linkedInAccountRepository.findByCompanyId(companyId);
        if (accounts.isEmpty()) {
            log.warn("No LinkedIn account configured for company id={}", companyId);
            return Map.of("synced", 0, "message", "No LinkedIn account configured for this company");
        }
        LinkedInAccount account = accounts.get(0);
        if (account.getApiToken() == null || account.getApiToken().isBlank()) {
            log.warn("LinkedIn account id={} has no API token; skipping sync", account.getId());
            return Map.of("synced", 0, "message", "LinkedIn API token not set");
        }
        // Actual LinkedIn API integration would be invoked here via a dedicated HTTP client.
        // The account's apiToken would be used as the Bearer token for the LinkedIn Jobs API.
        log.info("LinkedIn sync triggered for company id={} via account id={}", companyId, account.getId());
        return Map.of("synced", 0, "message", "LinkedIn sync completed — API integration pending");
    }
}
