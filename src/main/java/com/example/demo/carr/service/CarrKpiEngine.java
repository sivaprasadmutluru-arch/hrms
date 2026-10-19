package com.example.demo.carr.service;

import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.carr.dto.CarrDtos.*;
import com.example.demo.carr.entity.*;
import com.example.demo.carr.repository.*;
import com.example.demo.employee.entity.Employee;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.*;
import java.time.*;
import java.util.*;

/** Explainable suggestions, not an external AI service. Company configuration takes priority. */
@Service @RequiredArgsConstructor
public class CarrKpiEngine {
    private final CarrResponsibilityRepository tasks;
    private final AttendanceRepository attendance;
    private final CarrRecordRepository records;
    private final CarrKpiRepository kpis;
    public static final Set<String> AUTOMATIC=Set.of("TASK_COMPLETION","TASK_ON_TIME","ATTENDANCE_COMPLIANCE");
    public record Measurement(BigDecimal actual, String evidence) {}
    public record Candidate(String key,String name,String metric,String source,String direction,String unit,String target) {}

    public List<KpiRequest> suggest(Employee employee, KpiSuggestionRequest request, String templateContext) {
        String role=request.designation().toLowerCase(Locale.ROOT).trim();
        // Reuse only this company's approved configuration for the same designation.
        for(CarrRecord record:records.findByCompanyIdOrderByUpdatedAtDesc(employee.getCompany().getId())) {
            if(!Set.of(CarrStatus.APPROVED,CarrStatus.PUBLISHED).contains(record.getStatus())) continue;
            boolean matches=record.getTitle().trim().equalsIgnoreCase(request.designation()) ||
                    (request.templateId()!=null && record.getTemplate()!=null && request.templateId().equals(record.getTemplate().getId()));
            if(!matches) continue;
            List<CarrKpi> configured=kpis.findByCarrIdOrderById(record.getId());
            if(configured.isEmpty()) continue;
            return configured.stream().map(k->new KpiRequest(null,k.getName(),k.getType(),k.getDirection(),k.getTargetValue(),null,
                    k.getUnit(),k.getWeight(),request.effectiveTo(),k.getDataSource(),"Suggested from approved company CAR #"+record.getId()+". Verify targets for this review period.",
                    cycle(request),k.getMetricDefinition(),k.getGenerationKey(),false)).toList();
        }
        String context=role+" "+Optional.ofNullable(request.responsibilities()).orElse("")+" "+templateContext+" "+
                (employee.getDepartment()==null?"":employee.getDepartment().getName());
        if(employee.getJobRole()!=null) context+=" "+employee.getJobRole().getName();
        if(employee.getJobPosition()!=null) context+=" "+employee.getJobPosition().getName();
        context=context.toLowerCase(Locale.ROOT);
        List<Candidate> candidates=new ArrayList<>();
        // The designation has priority; department and responsibilities resolve less specific roles.
        String family=family(role); if(family.isEmpty()) family=family(context);
        switch(family) {
            case "finance" -> {
                add(candidates,"budget-accuracy","Budget Accuracy","Accurate budget lines / reviewed budget lines × 100","95");
                add(candidates,"reporting-timeliness","Financial Reporting Timeliness","Reports submitted on time / reports due × 100","100");
                candidates.add(new Candidate("budget-variance","Budget Variance","Absolute actual-versus-approved budget variance / approved budget × 100","MANUAL","DECREASE","%","5"));
                add(candidates,"financial-compliance","Compliance Rate","Compliant financial checks / completed financial checks × 100","100");
            }
            case "hr" -> {
                add(candidates,"recruitment-efficiency","Recruitment Efficiency","Vacancies filled within approved time to hire / vacancies filled × 100","90");
                add(candidates,"employee-retention","Employee Retention","Starting employees retained / starting headcount × 100; exclude new hires","95");
                add(candidates,"onboarding-completion","Onboarding Completion","Onboarding milestones completed by due date / milestones due × 100","100");
                candidates.add(new Candidate("attendance-compliance","Attendance Compliance","Regular or approved regularised days / processed attendance days × 100. Excludes holidays, approved leave and unprocessed days; not an absence rate.","ATTENDANCE_COMPLIANCE","INCREASE","%","95"));
            }
            case "software" -> {
                add(candidates,"code-quality","Code Quality","Changes passing agreed code-quality checks / reviewed changes × 100","95");
                add(candidates,"bug-resolution","Bug Resolution Rate","Bugs resolved within agreed SLA / bugs due × 100","90");
                add(candidates,"sprint-completion","Sprint Completion","Accepted story points / committed story points × 100","90");
            }
            case "sales" -> {
                add(candidates,"sales-target","Sales Target Achievement","Verified sales / approved sales target × 100","100");
                candidates.add(new Candidate("revenue","Revenue Generated","Verified recognised revenue for this period; configure approved currency and target","MANUAL","INCREASE","currency","1"));
                add(candidates,"sales-conversion","Conversion Rate","Won qualified opportunities / closed qualified opportunities × 100","20");
                add(candidates,"lead-follow-up","Lead Follow-Up","Leads followed up within agreed SLA / leads assigned × 100","95");
                add(candidates,"customer-retention","Customer Retention","Eligible customers retained / customers eligible for renewal × 100","90");
            }
            case "marketing" -> {
                add(candidates,"campaign-roi","Campaign ROI","(Attributed revenue − campaign cost) / campaign cost × 100; agree attribution window","100");
                candidates.add(new Candidate("lead-generation","Lead Generation","Marketing-qualified leads meeting the approved definition; configure a period target","MANUAL","INCREASE","leads","1"));
                add(candidates,"marketing-conversion","Conversion Rate","Qualified conversions / attributable campaign visitors × 100","5");
                add(candidates,"campaign-delivery","On-Time Campaign Delivery","Campaigns launched by agreed date / campaigns due × 100","95");
            }
            case "project" -> {
                add(candidates,"project-delivery","Project Delivery Rate","Accepted projects delivered on time / projects due × 100","95");
                add(candidates,"milestone-achievement","Milestone Achievement","Accepted milestones / milestones due × 100","95");
                add(candidates,"budget-adherence","Budget Adherence","Projects delivered within approved budget / completed projects × 100","95");
                add(candidates,"risk-resolution","Risk Resolution","Risks resolved by agreed deadline / risks due for resolution × 100","90");
            }
            default -> {
                if(request.responsibilities()!=null) Arrays.stream(request.responsibilities().split("[\\n;]")).map(String::trim).filter(s->!s.isBlank()).limit(3)
                    .forEach(s->add(candidates,"responsibility-"+candidates.size(),"Delivery: "+s.substring(0,Math.min(100,s.length())),"Accepted outcomes for ‘"+s.substring(0,Math.min(200,s.length()))+"’ / agreed outcomes due × 100","95"));
            }
        }
        // Employee-owned tasks are available across roles. These never imply code, sales or finance quality.
        candidates.add(new Candidate("task-completion","Task Completion Rate","Completed assigned tasks due in period / non-cancelled assigned tasks due in period × 100","TASK_COMPLETION","INCREASE","%","95"));
        if(candidates.size()<5) candidates.add(new Candidate("on-time-delivery","On-Time Delivery","Tasks due in period completed by deadline / non-cancelled assigned tasks due in period × 100","TASK_ON_TIME","INCREASE","%","95"));
        int n=Math.min(5,candidates.size()); List<KpiRequest> result=new ArrayList<>();
        for(int i=0;i<n;i++) {
            Candidate c=candidates.get(i);
            Measurement m=measure(employee,c.source(),request.effectiveFrom(),request.effectiveTo());
            String note=m.evidence()+" Suggested target requires administrator review.";
            if(c.unit().equals("currency")||c.unit().equals("leads")) note+=" Placeholder target of 1: configure the approved business target before saving.";
            result.add(new KpiRequest(null,c.name(),CarrKpi.Type.KPI,CarrKpi.Direction.valueOf(c.direction()),new BigDecimal(c.target()),m.actual(),c.unit(),100/n+(i<100%n?1:0),request.effectiveTo(),c.source(),note,cycle(request),c.metric(),c.key(),false));
        }
        return result;
    }
    private static String cycle(KpiSuggestionRequest r){return r.reviewFrequency()==null?"Monthly":r.reviewFrequency();}
    private static void add(List<Candidate> list,String key,String name,String metric,String target){list.add(new Candidate(key,name,metric,"MANUAL","INCREASE","%",target));}
    static String family(String s) {
        if(s.matches(".*(financ|account|budget|treasury|audit).*")) return "finance";
        if(s.matches(".*(human resource|\\bhr\\b|recruit|people operation).*")) return "hr";
        if(s.matches(".*(software|developer|engineer|programmer|devops).*")) return "software";
        if(s.matches(".*(marketing|campaign|seo|content).*")) return "marketing";
        if(s.matches(".*(sales|business development|account executive).*")) return "sales";
        if(s.matches(".*(project|program manager|delivery manager).*")) return "project";
        return "";
    }
    public Measurement measure(Employee employee,String source,LocalDate from,LocalDate to) {
        if(!AUTOMATIC.contains(source==null?"":source)) return new Measurement(null,"Manual input required: attach verified source evidence; no automatic integration is configured for this measure.");
        if(from==null||to==null) return new Measurement(null,"Choose a review start and end date before calculating actuals.");
        LocalDate cutoff=to.isBefore(LocalDate.now())?to:LocalDate.now();
        if(cutoff.isBefore(from)) return new Measurement(null,"The review period has not started.");
        if(source.equals("ATTENDANCE_COMPLIANCE")) {
            List<Attendance> rows=attendance.findByCompanyIdAndEmployeeIdInAndAttendanceDateBetween(employee.getCompany().getId(),List.of(employee.getId()),from,cutoff).stream()
                .filter(a->a.isActive() && a.getCheckOut()!=null && a.getAttendanceStatus()!=null)
                .filter(a->!Boolean.TRUE.equals(a.getIsHoliday())).toList();
            long regular=rows.stream().filter(a->a.getAttendanceStatus()!=Attendance.AttendanceQualityStatus.IRREGULAR).count();
            return measurement(regular,rows.size(),"attendances",rows.stream().map(Attendance::getId).toList(),from,cutoff,"processed days; holidays, approved leave and unprocessed days excluded");
        }
        List<CarrResponsibility> rows=tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(employee.getCompany().getId()).stream()
            .filter(t->t.getAccountableEmployee()!=null && employee.getId().equals(t.getAccountableEmployee().getId()))
            .filter(t->t.getTaskStatus()!=CarrResponsibility.TaskStatus.CANCELLED && t.getDueDate()!=null && !t.getDueDate().isBefore(from) && !t.getDueDate().isAfter(cutoff)).toList();
        // Missing completion dates make on-time performance unknowable, rather than counting as late.
        if(rows.stream().anyMatch(t->t.getTaskStatus()==CarrResponsibility.TaskStatus.COMPLETED && t.getActualCompletionDate()==null && t.getCompletedAt()==null))
            return new Measurement(null,"Completion dates are missing on completed tasks. Correct the source task dates before scoring on-time delivery.");
        long complete=rows.stream().filter(t->t.getTaskStatus()==CarrResponsibility.TaskStatus.COMPLETED)
            .filter(t->!(t.getActualCompletionDate()!=null?t.getActualCompletionDate():t.getCompletedAt().toLocalDate()).isAfter(cutoff))
            .filter(t->!source.equals("TASK_ON_TIME") || !(t.getActualCompletionDate()!=null?t.getActualCompletionDate():t.getCompletedAt().toLocalDate()).isAfter(t.getDueDate())).count();
        return measurement(complete,rows.size(),"carr_responsibilities",rows.stream().map(CarrResponsibility::getId).toList(),from,cutoff,"tasks due; cancelled tasks excluded");
    }
    private Measurement measurement(long numerator,long denominator,String table,List<Long> ids,LocalDate from,LocalDate to,String scope) {
        String evidence=table+"; "+from+" to "+to+"; "+numerator+" / "+denominator+" "+scope+"; IDs "+ids.stream().limit(40).toList()+"; calculated "+LocalDateTime.now();
        return new Measurement(denominator==0?null:BigDecimal.valueOf(numerator*100).divide(BigDecimal.valueOf(denominator),4,RoundingMode.HALF_UP),evidence+(denominator==0?". No eligible records; not scored.":"."));
    }
}
