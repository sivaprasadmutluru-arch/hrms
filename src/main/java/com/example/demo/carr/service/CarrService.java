package com.example.demo.carr.service;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.*;
import com.example.demo.base.repository.*;
import com.example.demo.carr.dto.CarrDtos.*;
import com.example.demo.carr.entity.*;
import com.example.demo.carr.repository.*;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.pms.entity.PerformanceCycle;
import com.example.demo.pms.repository.PerformanceCycleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.math.*;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class CarrService {
    private final CarrRoleTemplateRepository templateRepo;
    private final CarrRecordRepository recordRepo;
    private final CarrResponsibilityRepository responsibilityRepo;
    private final CarrKpiRepository kpiRepo;
    private final CarrRewardRepository rewardRepo;
    private final CarrAuditEventRepository auditRepo;
    private final EmployeeRepository employeeRepo;
    private final CompanyRepository companyRepo;
    private final JobRoleRepository jobRoleRepo;
    private final PerformanceCycleRepository cycleRepo;
    private final CarrKpiEngine kpiEngine;

    private Long companyId() {
        Long id = CompanyContext.get();
        if (id == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a company before using CARR");
        return id;
    }
    private Company company() { return companyRepo.findByIdPublic(companyId()).orElseThrow(() -> new ResourceNotFoundException("Company", companyId())); }
    private Employee employee(Long id) { return employeeRepo.findById(id).filter(e -> Objects.equals(e.getCompany().getId(), companyId())).orElseThrow(() -> new ResourceNotFoundException("Employee", id)); }
    private String name(Employee e) { return ((e.getFirstName()==null?"":e.getFirstName())+" "+(e.getLastName()==null?"":e.getLastName())).trim(); }

    @Transactional(readOnly=true)
    public List<TemplateResponse> templates() { return templateRepo.findByCompanyIdAndIsActiveTrueOrderByTitle(companyId()).stream().map(this::templateDto).toList(); }
    @Transactional
    public TemplateResponse saveTemplate(Long id, TemplateRequest req, Authentication auth) {
        CarrRoleTemplate t = id == null ? new CarrRoleTemplate() : templateRepo.findByIdAndCompanyId(id, companyId()).orElseThrow(() -> new ResourceNotFoundException("CARR template", id));
        if (id == null) t.setCompany(company());
        if (req.jobRoleId()!=null) {
            JobRole role = jobRoleRepo.findById(req.jobRoleId()).filter(r -> Objects.equals(r.getCompany().getId(), companyId())).orElseThrow(() -> new ResourceNotFoundException("Job role", req.jobRoleId()));
            t.setJobRole(role);
        } else t.setJobRole(null);
        t.setTitle(req.title().trim()); t.setPurpose(req.purpose()); t.setScope(req.scope()); t.setCompetencies(req.competencies());
        return templateDto(templateRepo.save(t));
    }

    public String extractJobDescription(MultipartFile file) {
        if(file==null||file.isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a job description file");
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        try {
            if(name.endsWith(".docx")){try(XWPFDocument document=new XWPFDocument(file.getInputStream())){return document.getParagraphs().stream().map(p->p.getText().trim()).filter(s->!s.isBlank()).reduce((a,b)->a+"\n"+b).orElse("");}}
            if(name.endsWith(".txt")||name.endsWith(".md"))return new String(file.getBytes(),StandardCharsets.UTF_8).trim();
        } catch(IOException ex){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unable to read the uploaded job description",ex);}
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Upload a DOCX, TXT, or Markdown job description");
    }

    @Transactional(readOnly=true)
    public List<RecordResponse> records(Authentication auth) {
        if (canViewCompanyCarr(auth)) return recordRepo.findByCompanyIdOrderByUpdatedAtDesc(companyId()).stream().map(this::recordDto).toList();
        UserPrincipal principal=(UserPrincipal)auth.getPrincipal();
        Employee signedIn=employeeRepo.findByUserId(principal.getId()).filter(e->Objects.equals(e.getCompany().getId(),companyId())).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN,"No employee profile is linked to this account"));
        if (hasRole(auth,"ROLE_MANAGER")) return recordRepo.findByCompanyIdAndManagerIdOrderByUpdatedAtDesc(companyId(),signedIn.getId()).stream().map(this::recordDto).toList();
        return recordRepo.findByCompanyIdAndEmployeeIdOrderByUpdatedAtDesc(companyId(),signedIn.getId()).stream().map(this::recordDto).toList();
    }
    @Transactional(readOnly=true)
    public RecordResponse record(Long id,Authentication auth) { CarrRecord record=requireRecord(id);ensureCanView(record,auth);return recordDto(record); }

    private boolean canViewCompanyCarr(Authentication auth){return auth.getAuthorities().stream().map(a->a.getAuthority()).anyMatch(Set.of("ROLE_PLATFORM_SUPER_ADMIN","ROLE_ENTERPRISE_ADMIN","ROLE_BRANCH_ADMIN","ROLE_HR_MANAGER")::contains);}
    private boolean hasRole(Authentication auth,String role){return auth.getAuthorities().stream().anyMatch(a->role.equals(a.getAuthority()));}
    private void ensureCanView(CarrRecord record,Authentication auth){if(canViewCompanyCarr(auth))return;UserPrincipal principal=(UserPrincipal)auth.getPrincipal();Employee signedIn=employeeRepo.findByUserId(principal.getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN,"No employee profile is linked to this account"));if(Objects.equals(record.getEmployee().getId(),signedIn.getId()))return;if(hasRole(auth,"ROLE_MANAGER")&&record.getManager()!=null&&Objects.equals(record.getManager().getId(),signedIn.getId()))return;throw new ResponseStatusException(HttpStatus.FORBIDDEN,"You can only view your own or directly assigned team CARR records");}
    private void ensureCanApprove(CarrRecord record,Authentication auth){if(canViewCompanyCarr(auth))return;UserPrincipal principal=(UserPrincipal)auth.getPrincipal();Employee signedIn=employeeRepo.findByUserId(principal.getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN,"No employee profile is linked to this account"));if(!hasRole(auth,"ROLE_MANAGER")||record.getManager()==null||!Objects.equals(record.getManager().getId(),signedIn.getId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Only the assigned manager or HR administrator can review this CARR");}

    @Transactional
    public RecordResponse create(RecordRequest req, Authentication auth) {
        Employee emp = employee(req.employeeId());
        if (req.cycleId()!=null && recordRepo.existsByCompanyIdAndEmployeeIdAndCycleIdAndStatusNot(companyId(), emp.getId(), req.cycleId(), CarrStatus.ARCHIVED))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This employee already has an active CARR for the selected cycle");
        CarrRecord c = new CarrRecord(); c.setCompany(company()); c.setEmployee(emp); c.setStatus(CarrStatus.DRAFT);
        apply(c, req); c = recordRepo.save(c); replaceChildren(c, req); audit(c,"CREATED","CARR created",auth); audit(c,"KPI_CONFIGURATION_SAVED",kpiAudit(c),auth);
        return recordDto(c);
    }
    @Transactional
    public RecordResponse update(Long id, RecordRequest req, Authentication auth) {
        CarrRecord c=requireRecord(id); ensureEditable(c); apply(c,req); replaceChildren(c,req); audit(c,"UPDATED","Draft content updated",auth); audit(c,"KPI_CONFIGURATION_SAVED",kpiAudit(c),auth); return recordDto(c);
    }
    @Transactional
    public RecordResponse saveKpi(Long carrId, Long kpiId, KpiRequest req, Authentication auth) {
        CarrRecord c = requireRecord(carrId); ensureEditable(c);
        validateKpi(req);
        if(kpiRepo.findByCarrIdOrderById(c.getId()).stream().anyMatch(x->!Objects.equals(x.getId(),kpiId)&&x.getName().trim().equalsIgnoreCase(req.name().trim())))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"A KPI with this name already exists");
        CarrKpi k = kpiId == null ? new CarrKpi() : kpiRepo.findById(kpiId)
                .filter(x -> Objects.equals(x.getCarr().getId(), c.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("CARR KPI", kpiId));
        if (kpiId == null) k.setCarr(c);
        int otherWeight = kpiRepo.findByCarrIdOrderById(c.getId()).stream()
                .filter(x -> !Objects.equals(x.getId(), kpiId)).mapToInt(CarrKpi::getWeight).sum();
        if (otherWeight + req.weight() != 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI weights must total 100. Save the complete configuration to rebalance weights.");
        applyKpi(k,req); kpiRepo.save(k);
        audit(c, kpiId==null?"KPI_CREATED":"KPI_UPDATED", k.getName(), auth);
        return recordDto(c);
    }
    @Transactional
    public void deleteKpi(Long carrId, Long kpiId, Authentication auth) {
        CarrRecord c = requireRecord(carrId); ensureEditable(c);
        CarrKpi k = kpiRepo.findById(kpiId).filter(x -> Objects.equals(x.getCarr().getId(), c.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("CARR KPI", kpiId));
        if(kpiRepo.findByCarrIdOrderById(c.getId()).size()>1)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Remove the KPI in the full configuration and rebalance the remaining weights to 100%");
        String name = k.getName(); kpiRepo.delete(k); audit(c,"KPI_DELETED",name,auth);
    }
    @Transactional(readOnly=true)
    public List<KpiRequest> suggestKpis(KpiSuggestionRequest req) {
        Employee emp=employee(req.employeeId());
        if(req.departmentId()!=null && (emp.getDepartment()==null || !req.departmentId().equals(emp.getDepartment().getId())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Employee does not belong to the selected department");
        if(req.effectiveFrom()!=null && req.effectiveTo()!=null && req.effectiveTo().isBefore(req.effectiveFrom()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Review end date cannot be before start date");
        String context="";
        if(req.templateId()!=null){
            CarrRoleTemplate t=templateRepo.findByIdAndCompanyId(req.templateId(),companyId()).orElseThrow(()->new ResourceNotFoundException("CARR template",req.templateId()));
            context=Objects.toString(t.getScope(),"")+" "+Objects.toString(t.getCompetencies(),"");
        }
        return kpiEngine.suggest(emp,req,context);
    }
    @Transactional
    public RecordResponse configureKpis(Long id,KpiConfigurationRequest req,Authentication auth) {
        CarrRecord c=requireRecord(id);ensureEditable(c);
        if(req.effectiveTo().isBefore(req.effectiveFrom()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Review end date cannot be before start date");
        c.setEffectiveFrom(req.effectiveFrom());c.setEffectiveTo(req.effectiveTo());c.setNextReviewDate(req.nextReviewDate());
        replaceKpis(c,req.kpis());
        audit(c,"KPI_CONFIGURATION_SAVED",kpiAudit(c),auth);
        return recordDto(c);
    }
    @Transactional
    public RecordResponse refreshKpiActuals(Long id,Authentication auth) {
        CarrRecord c=requireRecord(id);ensureCanApprove(c,auth);
        if(c.getStatus()==CarrStatus.ARCHIVED) throw new ResponseStatusException(HttpStatus.CONFLICT,"Archived KPI scores cannot be changed");
        for(CarrKpi k:kpiRepo.findByCarrIdOrderById(c.getId())) {
            if(!CarrKpiEngine.AUTOMATIC.contains(Objects.toString(k.getDataSource(),""))) continue;
            var m=kpiEngine.measure(c.getEmployee(),k.getDataSource(),c.getEffectiveFrom(),c.getEffectiveTo());
            k.setActualValue(m.actual());k.setEvidence(m.evidence());kpiRepo.save(k);
        }
        audit(c,"KPI_SCORES_REFRESHED",kpiAudit(c),auth);
        return recordDto(c);
    }
    private String kpiAudit(CarrRecord c) {
        String value=kpiRepo.findByCarrIdOrderById(c.getId()).stream().map(k->"#"+k.getId()+" "+k.getName()+": metric="+k.getMetricDefinition()+", direction="+k.getDirection()+", target="+k.getTargetValue()+" "+k.getUnit()+", actual="+k.getActualValue()+", weight="+k.getWeight()+", cycle="+k.getReviewFrequency()+", score="+KpiScoring.score(k)+", source="+k.getDataSource()+", evidence="+k.getEvidence()).reduce((a,b)->a+"; "+b).orElse("No KPIs");
        return "Employee #"+c.getEmployee().getId()+"; period "+c.getEffectiveFrom()+" to "+c.getEffectiveTo()+"; "+value;
    }
    private void validateKpi(KpiRequest k) {
        if(k.name()==null||k.name().isBlank()||k.targetValue()==null||k.targetValue().signum()<=0||k.unit()==null||k.unit().isBlank()||k.weight()<1||k.weight()>100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Every KPI needs a name, positive target, unit and weight from 1 to 100");
        if(k.reviewFrequency()!=null&&!Set.of("Monthly","Quarterly","Annually","Yearly","Half-Yearly").contains(k.reviewFrequency()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid KPI review cycle");
        if(k.actualValue()!=null&&k.actualValue().signum()<0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Actual values cannot be negative");
        if(k.actualValue()!=null&&!CarrKpiEngine.AUTOMATIC.contains(Objects.toString(k.dataSource(),""))&&(k.evidence()==null||k.evidence().isBlank()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Provide source evidence for manual actuals");
        if(CarrKpiEngine.AUTOMATIC.contains(Objects.toString(k.dataSource(),"")) && (!"%".equals(k.unit()) || (k.direction()!=null&&k.direction()!=CarrKpi.Direction.INCREASE)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Automatic rate metrics must use % and higher-is-better scoring");
    }
    private void applyKpi(CarrKpi k,KpiRequest req) {
        validateKpi(req);
        k.setName(req.name().trim());k.setType(req.type()==null?CarrKpi.Type.KPI:req.type());k.setDirection(req.direction()==null?CarrKpi.Direction.INCREASE:req.direction());
        k.setTargetValue(req.targetValue());k.setUnit(req.unit().trim());k.setWeight(req.weight());k.setReviewFrequency(req.reviewFrequency()==null?"Monthly":req.reviewFrequency());
        k.setDueDate(req.dueDate());k.setMetricDefinition(req.metricDefinition());k.setGenerationKey(req.generationKey());
        k.setManuallyEdited(k.isManuallyEdited()||Boolean.TRUE.equals(req.manuallyEdited())||req.generationKey()==null);
        k.setDataSource(req.dataSource()==null?"MANUAL":req.dataSource());
        if(CarrKpiEngine.AUTOMATIC.contains(k.getDataSource())) {
            var m=kpiEngine.measure(k.getCarr().getEmployee(),k.getDataSource(),k.getCarr().getEffectiveFrom(),k.getCarr().getEffectiveTo());
            k.setActualValue(m.actual());k.setEvidence(m.evidence());
        } else {k.setActualValue(req.actualValue());k.setEvidence(req.evidence());}
    }
    private void replaceKpis(CarrRecord c,List<KpiRequest> requested) {
        if(!requested.isEmpty()&&(c.getEffectiveFrom()==null||c.getEffectiveTo()==null))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose the KPI review start and end dates");
        if(requested.size()>50)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"At most 50 KPIs can be configured");
        if(!requested.isEmpty()&&requested.stream().mapToInt(KpiRequest::weight).sum()!=100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"KPI weights must total exactly 100%");
        Set<String> names=new HashSet<>();Set<String> keys=new HashSet<>();Set<Long> ids=new HashSet<>();
        List<CarrKpi> existing=kpiRepo.findByCarrIdOrderById(c.getId());
        for(KpiRequest req:requested) {
            validateKpi(req);
            if(!names.add(req.name().trim().toLowerCase(Locale.ROOT)) || (req.id()!=null&&!ids.add(req.id())) || (req.generationKey()!=null&&!req.generationKey().isBlank()&&!keys.add(req.generationKey())))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Duplicate KPI names or identifiers are not allowed");
            CarrKpi k=req.id()==null?new CarrKpi():existing.stream().filter(x->req.id().equals(x.getId())).findFirst().orElseThrow(()->new ResourceNotFoundException("CARR KPI",req.id()));
            k.setCarr(c);applyKpi(k,req);kpiRepo.save(k);
        }
        kpiRepo.deleteAll(existing.stream().filter(k->!ids.contains(k.getId())).toList());
    }
    private void apply(CarrRecord c, RecordRequest req) {
        c.setEmployee(employee(req.employeeId())); c.setTitle(req.title().trim()); c.setPurpose(req.purpose());
        if(req.departmentId()!=null && (c.getEmployee().getDepartment()==null || !Objects.equals(c.getEmployee().getDepartment().getId(),req.departmentId())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Selected employee does not belong to the selected department");
        c.setIndustry(req.industry()); c.setRoleLevel(req.roleLevel()); c.setReportsToTitle(req.reportsToTitle());
        c.setResponsibleFor(req.responsibleFor()); c.setRewardsEnabled(Boolean.TRUE.equals(req.rewardsEnabled()));
        c.setRewardsVisibleToEmployee(req.rewardsVisibleToEmployee()==null || req.rewardsVisibleToEmployee());
        c.setEffectiveFrom(req.effectiveFrom()); c.setEffectiveTo(req.effectiveTo()); c.setNextReviewDate(req.nextReviewDate());
        c.setManager(req.managerId()==null?c.getEmployee().getReportingManager():employee(req.managerId()));
        c.setTemplate(req.templateId()==null?null:templateRepo.findByIdAndCompanyId(req.templateId(),companyId()).orElseThrow(() -> new ResourceNotFoundException("CARR template",req.templateId())));
        if(req.cycleId()!=null) c.setCycle(cycleRepo.findById(req.cycleId()).filter(x->Objects.equals(x.getCompany().getId(),companyId())).orElseThrow(() -> new ResourceNotFoundException("Performance cycle",req.cycleId()))); else c.setCycle(null);
        if(c.getEffectiveFrom()!=null && c.getEffectiveTo()!=null && c.getEffectiveTo().isBefore(c.getEffectiveFrom())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Effective end date cannot be before start date");
    }
    private void replaceChildren(CarrRecord c, RecordRequest req) {
        responsibilityRepo.deleteAll(responsibilityRepo.findByCarrIdOrderById(c.getId()));
        rewardRepo.deleteAll(rewardRepo.findByCarrIdOrderById(c.getId()));
        if(req.responsibilities()!=null) for(ResponsibilityRequest r:req.responsibilities()) {
            CarrResponsibility x=new CarrResponsibility(); x.setCarr(c); x.setStatement(r.statement().trim());
            x.setAccountableEmployee(r.accountableEmployeeId()==null?c.getEmployee():employee(r.accountableEmployeeId()));
            x.setPriority(r.priority()==null?"MEDIUM":r.priority()); x.setFrequency(r.frequency()); x.setEvidenceRequired(r.evidenceRequired()); x.setWeight(r.weight()); responsibilityRepo.save(x);
        }
        replaceKpis(c,req.kpis()==null?List.of():req.kpis());
        if(c.isRewardsEnabled() && req.rewards()!=null) for(RewardRequest reward:req.rewards()) {
            CarrReward x=new CarrReward(); x.setCarr(c); x.setName(reward.name().trim());
            x.setStatus(reward.status()==null?"TO_BE_DISCUSSED":reward.status());
            x.setDiscussionWith(reward.discussionWith()==null?"BOTH":reward.discussionWith()); rewardRepo.save(x);
        }
    }
    @Transactional
    public RecordResponse transition(Long id, TransitionRequest req, Authentication auth) {
        CarrRecord c=requireRecord(id); CarrStatus from=c.getStatus();
        Map<CarrStatus,Set<CarrStatus>> allowed=Map.of(
            CarrStatus.DRAFT,Set.of(CarrStatus.SUBMITTED,CarrStatus.ARCHIVED), CarrStatus.RETURNED,Set.of(CarrStatus.SUBMITTED,CarrStatus.ARCHIVED),
            CarrStatus.SUBMITTED,Set.of(CarrStatus.MANAGER_REVIEW,CarrStatus.RETURNED), CarrStatus.MANAGER_REVIEW,Set.of(CarrStatus.DEPT_HEAD_REVIEW,CarrStatus.HR_REVIEW,CarrStatus.RETURNED),
            CarrStatus.DEPT_HEAD_REVIEW,Set.of(CarrStatus.HR_REVIEW,CarrStatus.RETURNED), CarrStatus.HR_REVIEW,Set.of(CarrStatus.APPROVED,CarrStatus.RETURNED),
            CarrStatus.APPROVED,Set.of(CarrStatus.ACKNOWLEDGEMENT_PENDING,CarrStatus.RETURNED), CarrStatus.PUBLISHED,Set.of(CarrStatus.ARCHIVED),
            CarrStatus.ARCHIVED,Set.of(CarrStatus.PUBLISHED));
        if(!allowed.getOrDefault(from,Set.of()).contains(req.status())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Invalid CARR transition from "+from+" to "+req.status());
        if(req.status()==CarrStatus.SUBMITTED) validateReady(c);
        c.setStatus(req.status()); c.setReturnReason(req.status()==CarrStatus.RETURNED?req.comment():null);
        if(req.status()==CarrStatus.PUBLISHED){UserPrincipal p=(UserPrincipal)auth.getPrincipal();c.setPublishedAt(LocalDateTime.now());c.setPublishedBy(p.getId());}
        recordRepo.save(c); audit(c,"STATUS_CHANGED",from+" -> "+req.status()+(req.comment()==null?"":" | "+req.comment()),auth); return recordDto(c);
    }
    @Transactional
    public RecordResponse approve(Long id, Authentication auth) {
        CarrRecord c=requireRecord(id); ensureCanApprove(c,auth);
        if(!Set.of(CarrStatus.SUBMITTED,CarrStatus.MANAGER_REVIEW,CarrStatus.DEPT_HEAD_REVIEW,CarrStatus.HR_REVIEW,CarrStatus.APPROVED).contains(c.getStatus()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"This CARR is not awaiting approval");
        CarrStatus from=c.getStatus(); c.setStatus(CarrStatus.ACKNOWLEDGEMENT_PENDING); c.setReturnReason(null); recordRepo.save(c);
        audit(c,"APPROVED",from+" -> employee acknowledgement",auth); return recordDto(c);
    }
    @Transactional
    public RecordResponse requestChanges(Long id, ChangeRequest req, Authentication auth) {
        CarrRecord c=requireRecord(id); ensureCanApprove(c,auth);
        if(!Set.of(CarrStatus.SUBMITTED,CarrStatus.MANAGER_REVIEW,CarrStatus.DEPT_HEAD_REVIEW,CarrStatus.HR_REVIEW,CarrStatus.APPROVED,CarrStatus.ACKNOWLEDGEMENT_PENDING).contains(c.getStatus()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"This CARR cannot be returned from its current status");
        c.setStatus(CarrStatus.RETURNED); c.setReturnReason(req.comment().trim()); recordRepo.save(c);
        audit(c,"CHANGES_REQUESTED",req.comment().trim(),auth); return recordDto(c);
    }
    @Transactional
    public RecordResponse acknowledge(Long id, Authentication auth) {
        CarrRecord c=requireRecord(id); UserPrincipal p=(UserPrincipal)auth.getPrincipal();
        Employee signedIn=employeeRepo.findByUserId(p.getId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,"Only the assigned employee can acknowledge this CARR"));
        if(!Objects.equals(signedIn.getId(),c.getEmployee().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Only the assigned employee can acknowledge this CARR");
        if(c.getStatus()!=CarrStatus.ACKNOWLEDGEMENT_PENDING) throw new ResponseStatusException(HttpStatus.CONFLICT,"This CARR is not awaiting employee acknowledgement");
        LocalDateTime now=LocalDateTime.now(); c.setEmployeeAcknowledgedAt(now); c.setPublishedAt(now); c.setPublishedBy(p.getId()); c.setStatus(CarrStatus.PUBLISHED); recordRepo.save(c);
        audit(c,"EMPLOYEE_ACKNOWLEDGED","Employee acknowledged and CARR published",auth); return recordDto(c);
    }
    @Transactional
    public RecordResponse completeReview(Long id, ReviewRequest req, Authentication auth) {
        CarrRecord c=requireRecord(id); ensureCanApprove(c,auth);
        if(c.getStatus()!=CarrStatus.PUBLISHED) throw new ResponseStatusException(HttpStatus.CONFLICT,"Only a published CARR can be reviewed");
        c.setEmployeeReflection(req.employeeReflection()); c.setManagerComments(req.managerComments()); c.setNextReviewDate(req.nextReviewDate()); c.setReviewCompletedAt(LocalDateTime.now()); recordRepo.save(c);
        audit(c,"REVIEW_COMPLETED","Performance review completed",auth); return recordDto(c);
    }
    @Transactional
    public RecordResponse updateActual(Long carrId, Long kpiId, ActualValueRequest req, Authentication auth) {
        CarrRecord c = requireRecord(carrId);
        ensureCanApprove(c,auth);
        if (!Set.of(CarrStatus.APPROVED, CarrStatus.PUBLISHED).contains(c.getStatus()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "KPI actuals can be updated only after approval");
        CarrKpi k = kpiRepo.findById(kpiId).filter(x -> Objects.equals(x.getCarr().getId(), c.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("CARR KPI", kpiId));
        if(CarrKpiEngine.AUTOMATIC.contains(Objects.toString(k.getDataSource(),"")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Refresh automatic actuals from source data; switch to manual in a draft to override");
        k.setActualValue(req.actualValue()); k.setEvidence(req.evidence()); kpiRepo.save(k);
        audit(c, "KPI_ACTUAL_UPDATED", k.getName() + " = " + req.actualValue()+"; evidence="+req.evidence()+"; score="+KpiScoring.score(k), auth);
        return recordDto(c);
    }
    private void validateReady(CarrRecord c){List<CarrKpi> ks=kpiRepo.findByCarrIdOrderById(c.getId());if(ks.isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Add at least one KPI before submission");if(ks.stream().mapToInt(CarrKpi::getWeight).sum()!=100)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"KPI weights must total 100");if(responsibilityRepo.findByCarrIdOrderById(c.getId()).isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Add at least one responsibility before submission");}
    private void ensureEditable(CarrRecord c){if(!Set.of(CarrStatus.DRAFT,CarrStatus.RETURNED).contains(c.getStatus()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Only draft or returned CARR records can be edited");}
    private CarrRecord requireRecord(Long id){return (org.springframework.transaction.support.TransactionSynchronizationManager.isCurrentTransactionReadOnly()?recordRepo.findByIdAndCompanyId(id,companyId()):recordRepo.findForUpdate(id,companyId())).orElseThrow(()->new ResourceNotFoundException("CARR",id));}
    @Transactional(readOnly=true) public List<AuditResponse> audit(Long id){requireRecord(id);return auditRepo.findByCarrIdOrderByCreatedAtDesc(id).stream().map(a->new AuditResponse(a.getId(),a.getAction(),a.getActorUserId(),a.getActorEmail(),a.getDetails(),a.getCreatedAt())).toList();}
    private void audit(CarrRecord c,String action,String details,Authentication auth){UserPrincipal p=(UserPrincipal)auth.getPrincipal();CarrAuditEvent a=new CarrAuditEvent();a.setCarr(c);a.setAction(action);a.setActorUserId(p.getId());a.setActorEmail(p.getEmail());a.setDetails(details);auditRepo.save(a);}

    @Transactional(readOnly=true) public DashboardResponse dashboard(){long active=employeeRepo.countByCompanyIdAndIsActiveTrue(companyId());long covered=recordRepo.countDistinctEmployeesByCompanyAndStatus(companyId(),CarrStatus.PUBLISHED);long published=recordRepo.countByCompanyIdAndStatus(companyId(),CarrStatus.PUBLISHED);long pending=List.of(CarrStatus.SUBMITTED,CarrStatus.MANAGER_REVIEW,CarrStatus.DEPT_HEAD_REVIEW,CarrStatus.HR_REVIEW,CarrStatus.APPROVED,CarrStatus.ACKNOWLEDGEMENT_PENDING).stream().mapToLong(s->recordRepo.countByCompanyIdAndStatus(companyId(),s)).sum();long drafts=recordRepo.countByCompanyIdAndStatus(companyId(),CarrStatus.DRAFT)+recordRepo.countByCompanyIdAndStatus(companyId(),CarrStatus.RETURNED);long overdue=recordRepo.countByCompanyIdAndNextReviewDateBeforeAndStatus(companyId(),LocalDate.now(),CarrStatus.PUBLISHED);long risk=recordRepo.findByCompanyIdOrderByUpdatedAtDesc(companyId()).stream().filter(c->c.getStatus()==CarrStatus.PUBLISHED).flatMap(c->kpiRepo.findByCarrIdOrderById(c.getId()).stream()).filter(k->"AT_RISK".equals(risk(k))).count();BigDecimal coverage=active==0?BigDecimal.ZERO:BigDecimal.valueOf(covered*100.0/active).setScale(1,RoundingMode.HALF_UP);return new DashboardResponse(active,covered,Math.max(0,active-covered),drafts,pending,published,overdue,risk,coverage);}
    private TemplateResponse templateDto(CarrRoleTemplate t){return new TemplateResponse(t.getId(),t.getJobRole()==null?null:t.getJobRole().getId(),t.getJobRole()==null?null:t.getJobRole().getName(),t.getTitle(),t.getPurpose(),t.getScope(),t.getCompetencies(),t.getVersion(),t.isActive());}
    private RecordResponse recordDto(CarrRecord c) {
        List<CarrKpi> ks=kpiRepo.findByCarrIdOrderById(c.getId());
        List<ResponsibilityResponse> responsibilities=responsibilityRepo.findByCarrIdOrderById(c.getId()).stream().map(r->new ResponsibilityResponse(r.getId(),r.getStatement(),r.getAccountableEmployee().getId(),name(r.getAccountableEmployee()),r.getPriority(),r.getFrequency(),r.getEvidenceRequired(),r.getWeight())).toList();
        List<KpiResponse> kpis=ks.stream().map(k->new KpiResponse(k.getId(),k.getName(),k.getType(),k.getDirection(),k.getTargetValue(),k.getActualValue(),k.getUnit(),k.getWeight(),k.getDueDate(),k.getDataSource(),k.getEvidence(),achievement(k),risk(k),k.getReviewFrequency(),k.getMetricDefinition(),k.getGenerationKey(),k.isManuallyEdited(),KpiScoring.weighted(k))).toList();
        List<RewardResponse> rewards=rewardRepo.findByCarrIdOrderById(c.getId()).stream().map(r->new RewardResponse(r.getId(),r.getName(),r.getStatus(),r.getDiscussionWith())).toList();
        return new RecordResponse(c.getId(),c.getEmployee().getId(),c.getEmployee().getBadgeId(),name(c.getEmployee()),c.getEmployee().getDepartment()==null?null:c.getEmployee().getDepartment().getName(),c.getTemplate()==null?null:c.getTemplate().getId(),c.getTemplate()==null?null:c.getTemplate().getTitle(),c.getCycle()==null?null:c.getCycle().getId(),c.getCycle()==null?null:c.getCycle().getName(),c.getManager()==null?null:c.getManager().getId(),c.getManager()==null?null:name(c.getManager()),c.getTitle(),c.getPurpose(),c.getIndustry(),c.getRoleLevel(),c.getReportsToTitle(),c.getResponsibleFor(),c.isRewardsEnabled(),c.isRewardsVisibleToEmployee(),c.getStatus(),c.getVersion(),c.getEffectiveFrom(),c.getEffectiveTo(),c.getNextReviewDate(),c.getPublishedAt(),c.getEmployeeAcknowledgedAt(),c.getReviewCompletedAt(),c.getEmployeeReflection(),c.getManagerComments(),responsibilities,kpis,rewards,score(ks),c.getReturnReason());
    }
    private BigDecimal achievement(CarrKpi k){return KpiScoring.score(k);}
    private String risk(CarrKpi k){BigDecimal a=achievement(k);return a==null?"NOT_SCORED":a.compareTo(BigDecimal.valueOf(70))<0?"AT_RISK":a.compareTo(BigDecimal.valueOf(100))<0?"ON_TRACK":"ACHIEVED";}
    private BigDecimal score(List<CarrKpi> ks){return KpiScoring.overall(ks);}
}
