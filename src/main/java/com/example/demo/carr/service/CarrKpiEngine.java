package com.example.demo.carr.service;

import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.carr.dto.CarrDtos.*;
import com.example.demo.carr.entity.*;
import com.example.demo.carr.repository.*;
import com.example.demo.employee.entity.Employee;
import com.example.demo.pms.entity.*;
import com.example.demo.pms.repository.*;
import com.example.demo.project.entity.Task;
import com.example.demo.project.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.*;
import java.time.*;
import java.util.*;

/** Source-backed outcomes. Unknown business targets require authorised configuration. */
@Service @RequiredArgsConstructor
public class CarrKpiEngine {
    private final CarrResponsibilityRepository tasks;
    private final AttendanceRepository attendance;
    private final CarrRecordRepository records;
    private final CarrKpiRepository kpis;
    private final ObjectiveRepository objectives;
    private final EmployeeObjectiveRepository objectiveAssignments;
    private final TaskRepository projectTasks;
    public static final Set<String> AUTOMATIC=Set.of("TASK_COMPLETION","TASK_ON_TIME","ATTENDANCE_COMPLIANCE");
    public record Measurement(BigDecimal actual,String evidence,String status) {
        public Measurement(BigDecimal actual,String evidence){this(actual,evidence,null);}
    }
    private record Candidate(String key,String name,String description,String metric,String source,
                             CarrKpi.Direction direction,String unit,BigDecimal target,LocalDate due,String evidence) {}
    public static boolean isAutomatic(String source) {
        return AUTOMATIC.contains(Objects.toString(source,"")) || source!=null && source.matches("(CARR_TASK|PMS_OBJECTIVE|PROJECT_TASK):[1-9][0-9]{0,17}");
    }
    private static String shortText(String text,int max){String value=Objects.toString(text,"").trim();return value.substring(0,Math.min(max,value.length()));}
    private static String cycle(KpiSuggestionRequest r){return r.reviewFrequency()==null?"Monthly":r.reviewFrequency();}
    private static boolean inPeriod(LocalDate due,KpiSuggestionRequest r){return due==null||((r.effectiveFrom()==null||!due.isBefore(r.effectiveFrom()))&&(r.effectiveTo()==null||!due.isAfter(r.effectiveTo())));}
    private static boolean sameEmployee(Employee a,Employee b){return a!=null&&a.getCompany()!=null&&Objects.equals(a.getId(),b.getId())&&Objects.equals(a.getCompany().getId(),b.getCompany().getId());}
    private boolean ownsObjective(Employee employee,Objective objective) {
        if(objective==null||!objective.isActive()||objective.getEmployee()==null||objective.getEmployee().getCompany()==null||!Objects.equals(objective.getEmployee().getCompany().getId(),employee.getCompany().getId()))return false;
        return sameEmployee(objective.getEmployee(),employee)||objectiveAssignments.findByEmployeeId(employee.getId()).stream()
            .anyMatch(a->a.isActive()&&a.getStatus()!=Objective.ObjectiveStatus.ARCHIVED&&sameEmployee(a.getEmployee(),employee)&&a.getObjective()!=null&&Objects.equals(a.getObjective().getId(),objective.getId()));
    }
    private boolean ownsTask(Employee employee,CarrResponsibility task){return task!=null&&task.isActive()&&sameEmployee(task.getAccountableEmployee(),employee)&&task.getCarr()!=null&&task.getCarr().getCompany()!=null&&Objects.equals(task.getCarr().getCompany().getId(),employee.getCompany().getId());}
    private boolean ownsProjectTask(Employee employee,Task task){return task!=null&&task.isActive()&&sameEmployee(task.getAssignedTo(),employee)&&task.getProject()!=null&&task.getProject().isActive()&&task.getProject().getStatus()!=com.example.demo.project.entity.Project.ProjectStatus.CANCELLED&&task.getProject().getCompany()!=null&&Objects.equals(task.getProject().getCompany().getId(),employee.getCompany().getId());}
    private Candidate outcome(String key,String name,String description,String source,LocalDate due,String metric){
        return new Candidate(key,shortText(name,220),shortText(description,1000),metric,source,CarrKpi.Direction.INCREASE,"%",new BigDecimal("100"),due,
            "Target basis: 100% means all agreed outcomes accepted. No partial achievement is inferred from a task label or stage.");
    }
    public List<KpiRequest> suggest(Employee employee,KpiSuggestionRequest request,String templateContext) {
        if(employee.getJobPosition()==null||employee.getJobPosition().getName()==null||employee.getJobPosition().getName().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Configure this employee's Job Position in the Employee module before generating KPIs");
        String designation=employee.getJobPosition().getName().trim();
        List<Candidate> candidates=new ArrayList<>();
        Map<Long,Objective> assigned=new LinkedHashMap<>();
        objectives.findByEmployeeId(employee.getId()).forEach(o->assigned.put(o.getId(),o));
        objectiveAssignments.findByEmployeeId(employee.getId()).stream().filter(a->a.isActive()&&a.getStatus()!=Objective.ObjectiveStatus.ARCHIVED&&sameEmployee(a.getEmployee(),employee)&&a.getObjective()!=null).forEach(a->assigned.put(a.getObjective().getId(),a.getObjective()));
        assigned.values().stream().filter(o->ownsObjective(employee,o)&&o.getStatus()!=Objective.ObjectiveStatus.ARCHIVED&&inPeriod(o.getDueDate(),request)).forEach(o->candidates.add(outcome(
            "objective-"+o.getId(),"Achieve objective: "+o.getTitle(),o.getDescription(),"PMS_OBJECTIVE:"+o.getId(),o.getDueDate()==null?request.effectiveTo():o.getDueDate(),
            "Recorded objective progress (0-100%); COMPLETED = 100%. The assigned objective defines the outcome and acceptance criteria. Missing progress remains unscored.")));
        tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(employee.getCompany().getId()).stream()
            .filter(t->ownsTask(employee,t)&&t.getTaskStatus()!=CarrResponsibility.TaskStatus.CANCELLED&&t.getAssignedAt()!=null&&inPeriod(t.getDueDate(),request))
            .forEach(t->candidates.add(outcome("task-"+t.getId(),"Deliver accepted outcome: "+t.getStatement(),Objects.toString(t.getRequiredDeliverables(),t.getDescription()),
                "CARR_TASK:"+t.getId(),t.getDueDate()==null?request.effectiveTo():t.getDueDate(),
                "Accepted assigned deliverable = 100%; otherwise 0%. Only COMPLETED with a completion date on or before the KPI deadline counts. Pending review is not completion.")));
        projectTasks.findByAssignedToId(employee.getId()).stream().filter(t->ownsProjectTask(employee,t)&&inPeriod(t.getDeadline(),request)).forEach(t->candidates.add(outcome(
            "project-task-"+t.getId(),"Deliver accepted project outcome: "+t.getTitle(),t.getDescription(),"PROJECT_TASK:"+t.getId(),t.getDeadline()==null?request.effectiveTo():t.getDeadline(),
            "Project deliverable in DONE stage = 100%; other stages = 0%. Historical achievement is unscored if a dated source snapshot is unavailable.")));
        // Approved role measures are company policy. Never copy another employee's bound deliverables or achievements.
        for(CarrRecord record:records.findByCompanyIdOrderByUpdatedAtDesc(employee.getCompany().getId())) {
            if(!record.isActive()||record.getCompany()==null||!Objects.equals(record.getCompany().getId(),employee.getCompany().getId())||!Set.of(CarrStatus.APPROVED,CarrStatus.PUBLISHED).contains(record.getStatus())||!designation.equalsIgnoreCase(record.getTitle()))continue;
            if(record.getEmployee()!=null&&record.getEmployee().getDepartment()!=null&&employee.getDepartment()!=null&&!Objects.equals(record.getEmployee().getDepartment().getId(),employee.getDepartment().getId()))continue;
            var configured=kpis.findByCarrIdOrderById(record.getId()).stream().filter(k->k.getMetricDefinition()!=null&&!k.getMetricDefinition().isBlank()&&k.getTargetValue()!=null&&k.getTargetValue().signum()>0)
                .filter(k->k.getDataSource()==null||!k.getDataSource().contains(":"))
                .filter(k->k.getGenerationKey()==null||!k.getGenerationKey().startsWith("deliverable-")).toList();
            for(CarrKpi k:configured)candidates.add(new Candidate(k.getGenerationKey()==null?"company-rule-"+k.getId():k.getGenerationKey(),k.getName(),k.getDescription(),k.getMetricDefinition(),
                Objects.toString(k.getDataSource(),"MANUAL"),k.getDirection()==null?CarrKpi.Direction.INCREASE:k.getDirection(),k.getUnit(),k.getTargetValue(),request.effectiveTo(),
                "Target basis: approved company CAR #"+record.getId()+" for "+designation+". Confirm applicability to this review period."));
            if(!configured.isEmpty())break;
        }
        String responsibilities=Objects.toString(request.responsibilities(),"");
        String family=family(designation);
        if(family.isEmpty())family=family((employee.getDepartment()==null?"":employee.getDepartment().getName())+" "+(employee.getJobRole()==null?"":employee.getJobRole().getName()));
        for(String raw:responsibilities.split("[\\n;]")) {
            String responsibility=raw.trim();if(responsibility.isBlank())continue;
            if(candidates.stream().anyMatch(c->c.name().toLowerCase(Locale.ROOT).contains(responsibility.toLowerCase(Locale.ROOT))))continue;
            String lower=responsibility.toLowerCase(Locale.ROOT);
            String[] recurring=responsibilityRule(lower);
            if(recurring!=null) {
                LocalDate due=explicitDeadline(responsibility,request.effectiveTo());if(!inPeriod(due,request))continue;
                var percentage=java.util.regex.Pattern.compile("([0-9]+(?:[.][0-9]+)?)\\s*%").matcher(responsibility);
                BigDecimal target=percentage.find()?new BigDecimal(percentage.group(1)):null;
                if(target!=null&&(target.signum()<=0||target.compareTo(BigDecimal.valueOf(100))>0))target=null;
                candidates.add(new Candidate(recurring[0],shortText("Outcome standard: "+responsibility,220),shortText(responsibility,1000),recurring[1],"MANUAL",CarrKpi.Direction.INCREASE,"%",target,due,
                    target==null?"Target requires company approval.":"Target basis: explicitly specified in assigned responsibility. Attach measured source evidence."));
                continue;
            }
            // Concrete deliverables have a defined full-acceptance target; recurring activities require a configured standard.
            if(responsibility.toLowerCase(Locale.ROOT).matches("^(complete|deliver|implement|launch|finish)\\b.*")) {
                LocalDate due=explicitDeadline(responsibility,request.effectiveTo());if(!inPeriod(due,request))continue;
                candidates.add(outcome("deliverable-"+Integer.toHexString(responsibility.toLowerCase(Locale.ROOT).hashCode()),"Accepted delivery: "+responsibility,responsibility,"MANUAL",due,
                    "Manager-accepted deliverables / agreed deliverables due x 100. Agree the deliverable scope and acceptance criteria before recording actuals; attach acceptance evidence."));
            }
        }
        if(candidates.isEmpty())addRoleStandards(candidates,family,request.effectiveTo(),responsibilities,templateContext);
        // Deduplicate by stable source or metric key. Equal initial weights are editable configuration, never observed scores.
        Map<String,Candidate> unique=new LinkedHashMap<>();for(Candidate c:candidates)unique.putIfAbsent(c.key(),c);
        var selected=unique.values().stream().limit(50).toList();int n=selected.size();List<KpiRequest> result=new ArrayList<>();
        Set<String> names=new HashSet<>();
        for(int i=0;i<n;i++) {
            Candidate c=selected.get(i);var m=measure(employee,c.source(),request.effectiveFrom(),c.due());
            String note=shortText(c.evidence()+" "+m.evidence()+(c.target()==null?" Configuration required: agree a realistic target and any SLA or quota parameters before saving.":""),1000);
            String title=c.name();if(!names.add(title.toLowerCase(Locale.ROOT))){String suffix=" ("+c.key()+")";title=shortText(title,220-suffix.length())+suffix;names.add(title.toLowerCase(Locale.ROOT));}
            result.add(new KpiRequest(null,title,CarrKpi.Type.KPI,c.direction(),c.target(),m.actual(),c.unit(),100/n+(i<100%n?1:0),c.due(),c.source(),note,cycle(request),c.metric(),c.key(),false,c.description()));
        }
        return result;
    }
    private static String[] responsibilityRule(String text) {
        if(text.contains("onboard"))return new String[]{"onboarding-completion","Onboarding milestones accepted by their due date / onboarding milestones due x 100"};
        if(text.contains("milestone"))return new String[]{"milestone-achievement","Accepted milestones completed on or before their deadline / milestones due x 100"};
        if(text.contains("quer")&&(text.contains("respond")||text.contains("response")))return new String[]{"client-response","Client queries answered within the response window specified in the KPI description / queries received x 100"+(text.matches(".*within [0-9]+ (hour|hours|day|days).*")?"":". Configure the response window in the measurement criteria")};
        if(text.contains("sales")&&(text.contains("target")||text.contains("quota")))return new String[]{"sales-target","Verified recognised sales / approved quota for the selected period x 100. Configure quota, currency and recognition rules"};
        return null;
    }
    private static void addRoleStandards(List<Candidate> list,String family,LocalDate due,String responsibilities,String templateContext) {
        String[][] standards=switch(family) {
            case "hr" -> new String[][]{{"onboarding-completion","Employee onboarding completion rate","Onboarding milestones accepted by their due date / onboarding milestones due x 100"},{"recruitment-efficiency","Recruitment service-level attainment","Vacancies filled within the approved hiring window / vacancies due x 100. Configure the hiring window"}};
            case "software" -> new String[][]{{"code-quality","Accepted software change quality","Changes passing agreed tests and code review / reviewed changes x 100"},{"bug-resolution","Defect resolution service-level attainment","Defects resolved within the approved severity-specific SLA / defects due x 100. Configure severity windows"}};
            case "project" -> new String[][]{{"milestone-achievement","On-time project milestone completion","Accepted milestones completed on or before their deadline / milestones due x 100"},{"budget-adherence","Project budget adherence","Projects delivered within their approved budgets / projects completed x 100"}};
            case "sales" -> new String[][]{{"sales-target","Monthly sales target attainment","Verified sales in the review period / company-approved monthly sales quota x 100. Configure quota, currency and recognition rules"},{"sales-conversion","Qualified opportunity conversion","Won qualified opportunities / qualified opportunities closed x 100"}};
            case "support" -> new String[][]{{"client-response","Client query response service-level attainment","Queries receiving a first response within the company-approved SLA / queries received x 100. Configure the response window in hours"},{"query-resolution","Client query resolution service-level attainment","Queries resolved within the approved resolution window / queries due x 100. Configure the resolution window"}};
            case "finance" -> new String[][]{{"budget-accuracy","Budget accuracy","Accurate budget lines / reviewed budget lines x 100"},{"reporting-timeliness","On-time financial reporting","Financial reports accepted on or before their deadlines / reports due x 100"}};
            case "marketing" -> new String[][]{{"campaign-delivery","On-time campaign delivery","Campaigns launched by approved launch dates / campaigns due x 100"},{"marketing-conversion","Campaign conversion rate","Verified campaign conversions / attributable campaign visitors x 100. Configure attribution window"}};
            case "operations" -> new String[][]{{"service-delivery","Operational service-level attainment","Operational requests accepted within the approved service window / requests due x 100. Configure service window"},{"process-accuracy","Operational accuracy","Outputs accepted without rework / outputs reviewed x 100"}};
            default -> new String[][]{{"role-outcome","Role outcome attainment","Configure a countable expected outcome, acceptance criteria and measurement formula for this role before saving"}};
        };
        for(String[] rule:standards)list.add(new Candidate(rule[0],rule[1],shortText("Expected outcome for assigned responsibilities: "+responsibilities+". Role context: "+Objects.toString(templateContext,""),1000),rule[2],"MANUAL",CarrKpi.Direction.INCREASE,"%",null,due,"No approved company target is available; target intentionally left unconfigured."));
    }
    static LocalDate explicitDeadline(String text,LocalDate fallback) {
        var iso=java.util.regex.Pattern.compile("\\b\\d{4}-\\d{2}-\\d{2}\\b").matcher(text);
        if(iso.find())try{return LocalDate.parse(iso.group());}catch(java.time.format.DateTimeParseException ignored){}
        var words=java.util.regex.Pattern.compile("\\b\\d{1,2} [A-Za-z]+ \\d{4}\\b").matcher(text);
        if(words.find())try{return LocalDate.parse(words.group(),new java.time.format.DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d MMMM uuuu").toFormatter(Locale.ENGLISH).withResolverStyle(java.time.format.ResolverStyle.STRICT));}catch(java.time.format.DateTimeParseException ignored){}
        return fallback;
    }
    static String family(String value) {
        String s=Objects.toString(value,"").toLowerCase(Locale.ROOT);
        if(s.matches(".*(support|customer service|client service|helpdesk|service desk).*"))return "support";
        if(s.matches(".*(project|program manager|delivery manager).*"))return "project";
        if(s.matches(".*(sales|business development|account executive|account manager).*"))return "sales";
        if(s.matches(".*(human resource|\\bhr\\b|recruit|people operation).*"))return "hr";
        if(s.matches(".*(financ|account|budget|treasury|audit).*"))return "finance";
        if(s.matches(".*(software|developer|engineer|programmer|devops).*"))return "software";
        if(s.matches(".*(marketing|campaign|seo|content).*"))return "marketing";
        if(s.matches(".*(operation|administration|logistics|procurement).*"))return "operations";
        return "";
    }
    public Measurement measure(Employee employee,String source,LocalDate from,LocalDate to) {
        if(!isAutomatic(source)) return new Measurement(null,"Manual input required: attach verified source evidence; no automatic integration is configured for this measure.");
        if(from==null||to==null) return new Measurement(null,"Choose a review start and end date before calculating actuals.");
        LocalDate cutoff=to.isBefore(LocalDate.now())?to:LocalDate.now();
        if(cutoff.isBefore(from)) return new Measurement(null,"The review period has not started.");
        if(source.contains(":"))return measureLinked(employee,source,from,cutoff);
        if(source.equals("ATTENDANCE_COMPLIANCE")) {
            List<Attendance> rows=attendance.findByCompanyIdAndEmployeeIdInAndAttendanceDateBetween(employee.getCompany().getId(),List.of(employee.getId()),from,cutoff).stream()
                .filter(a->a.isActive() && a.getCheckOut()!=null && a.getAttendanceStatus()!=null)
                .filter(a->!Boolean.TRUE.equals(a.getIsHoliday())).toList();
            long regular=rows.stream().filter(a->a.getAttendanceStatus()!=Attendance.AttendanceQualityStatus.IRREGULAR).count();
            return measurement(regular,rows.size(),"attendances",rows.stream().map(Attendance::getId).toList(),from,cutoff,"processed days; holidays, approved leave and unprocessed days excluded");
        }
        List<CarrResponsibility> rows=tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(employee.getCompany().getId()).stream()
            .filter(t->ownsTask(employee,t))
            .filter(t->t.getTaskStatus()!=CarrResponsibility.TaskStatus.CANCELLED && t.getDueDate()!=null && !t.getDueDate().isBefore(from) && !t.getDueDate().isAfter(cutoff)).toList();
        // Missing completion dates make on-time performance unknowable, rather than counting as late.
        if(rows.stream().anyMatch(t->t.getTaskStatus()==CarrResponsibility.TaskStatus.COMPLETED && t.getActualCompletionDate()==null && t.getCompletedAt()==null))
            return new Measurement(null,"Completion dates are missing on completed tasks. Correct the source task dates before scoring on-time delivery.");
        long complete=rows.stream().filter(t->t.getTaskStatus()==CarrResponsibility.TaskStatus.COMPLETED)
            .filter(t->!(t.getActualCompletionDate()!=null?t.getActualCompletionDate():t.getCompletedAt().toLocalDate()).isAfter(cutoff))
            .filter(t->!source.equals("TASK_ON_TIME") || !(t.getActualCompletionDate()!=null?t.getActualCompletionDate():t.getCompletedAt().toLocalDate()).isAfter(t.getDueDate())).count();
        return measurement(complete,rows.size(),"carr_responsibilities",rows.stream().map(CarrResponsibility::getId).toList(),from,cutoff,"tasks due; cancelled tasks excluded");
    }
    public void validateSource(Employee employee,String source) {
        if(source==null||!source.contains(":"))return;
        if(!isAutomatic(source))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid linked KPI data source");
        long id=Long.parseLong(source.substring(source.indexOf(':')+1));
        boolean valid=switch(source.substring(0,source.indexOf(':'))) {
            case "CARR_TASK" -> tasks.findById(id).filter(t->ownsTask(employee,t)&&t.getTaskStatus()!=CarrResponsibility.TaskStatus.CANCELLED).isPresent();
            case "PROJECT_TASK" -> projectTasks.findById(id).filter(t->ownsProjectTask(employee,t)).isPresent();
            case "PMS_OBJECTIVE" -> objectives.findById(id).filter(o->ownsObjective(employee,o)&&o.getStatus()!=Objective.ObjectiveStatus.ARCHIVED).isPresent();
            default -> false;
        };
        if(!valid)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Linked KPI source is unavailable for this employee and company");
    }
    private Measurement measureLinked(Employee employee,String source,LocalDate from,LocalDate cutoff) {
        try{validateSource(employee,source);}catch(ResponseStatusException|NumberFormatException ex){return new Measurement(null,"Linked source is unavailable for this employee and company; not scored.");}
        long id=Long.parseLong(source.substring(source.indexOf(':')+1));
        if(source.startsWith("CARR_TASK:")) {
            var t=tasks.findById(id).orElseThrow();
            if(t.getAssignedAt()!=null&&t.getAssignedAt().toLocalDate().isAfter(cutoff))return new Measurement(null,"Deliverable was assigned after the measurement cutoff; not scored.");
            LocalDate completed=t.getActualCompletionDate()!=null?t.getActualCompletionDate():t.getCompletedAt()==null?null:t.getCompletedAt().toLocalDate();
            if(t.getTaskStatus()==CarrResponsibility.TaskStatus.COMPLETED&&completed==null)return new Measurement(null,"Completion date is missing; not scored.");
            boolean accepted=t.getTaskStatus()==CarrResponsibility.TaskStatus.COMPLETED&&!completed.isAfter(cutoff);
            return new Measurement(accepted?new BigDecimal("100"):BigDecimal.ZERO,"carr_responsibilities #"+id+"; accepted by "+cutoff+" = "+accepted+"; completion date "+completed+". Rule: accepted = 100%, otherwise 0%.",accepted?"COMPLETED":t.getTaskStatus()==CarrResponsibility.TaskStatus.TODO?"NOT_STARTED":"IN_PROGRESS");
        }
        if(source.startsWith("PROJECT_TASK:")) {
            var t=projectTasks.findById(id).orElseThrow();
            if(cutoff.isBefore(LocalDate.now())&&(t.getUpdatedAt()==null||t.getUpdatedAt().toLocalDate().isAfter(cutoff)))return new Measurement(null,"Historical project task snapshot unavailable; attach verified evidence through a manual measure.");
            if(t.getCreatedAt()!=null&&t.getCreatedAt().toLocalDate().isAfter(cutoff))return new Measurement(null,"Project deliverable did not exist at cutoff; not scored.");
            return new Measurement(t.getStage()==Task.TaskStage.DONE?new BigDecimal("100"):BigDecimal.ZERO,"tasks #"+id+"; stage "+t.getStage()+" as of "+cutoff+". Rule: DONE = 100%, otherwise 0%; no partial progress inferred.",t.getStage()==Task.TaskStage.DONE?"COMPLETED":t.getStage()==Task.TaskStage.TODO?"NOT_STARTED":"IN_PROGRESS");
        }
        var o=objectives.findById(id).orElseThrow();
        if(cutoff.isBefore(LocalDate.now())&&(o.getUpdatedAt()==null||o.getUpdatedAt().toLocalDate().isAfter(cutoff)))return new Measurement(null,"Historical objective progress unavailable; not scored.");
        if(o.getCreatedAt()!=null&&o.getCreatedAt().toLocalDate().isAfter(cutoff))return new Measurement(null,"Objective did not exist at cutoff; not scored.");
        var assignment=objectiveAssignments.findByEmployeeId(employee.getId()).stream().filter(a->a.isActive()&&a.getStatus()!=Objective.ObjectiveStatus.ARCHIVED&&sameEmployee(a.getEmployee(),employee)&&a.getObjective()!=null&&Objects.equals(a.getObjective().getId(),id)).findFirst();
        if(!sameEmployee(o.getEmployee(),employee)) {
            var a=assignment.orElseThrow();
            if(cutoff.isBefore(LocalDate.now())&&(a.getUpdatedAt()==null||a.getUpdatedAt().toLocalDate().isAfter(cutoff)))return new Measurement(null,"Historical employee objective status unavailable; not scored.");
            BigDecimal actual=a.getStatus()==Objective.ObjectiveStatus.COMPLETED?new BigDecimal("100"):a.getStatus()==Objective.ObjectiveStatus.NOT_STARTED?BigDecimal.ZERO:null;
            return new Measurement(actual,"employee_objectives #"+a.getId()+"; status "+a.getStatus()+". Completed = 100%; not started = 0%; in-progress percentage is unavailable.",a.getStatus()==Objective.ObjectiveStatus.NOT_STARTED?"NOT_STARTED":a.getStatus()==Objective.ObjectiveStatus.COMPLETED?"COMPLETED":"IN_PROGRESS");
        }
        Integer progress=o.getProgress();
        BigDecimal actual=o.getStatus()==Objective.ObjectiveStatus.COMPLETED?new BigDecimal("100"):progress==null||progress<0||progress>100?null:BigDecimal.valueOf(progress);
        return new Measurement(actual,"objectives #"+id+"; recorded progress "+progress+"; status "+o.getStatus()+"; cutoff "+cutoff+". Completed = 100%; otherwise recorded progress, without inferring missing progress.",o.getStatus()==Objective.ObjectiveStatus.NOT_STARTED?"NOT_STARTED":o.getStatus()==Objective.ObjectiveStatus.COMPLETED?"COMPLETED":"IN_PROGRESS");
    }
    private Measurement measurement(long numerator,long denominator,String table,List<Long> ids,LocalDate from,LocalDate to,String scope) {
        String evidence=table+"; "+from+" to "+to+"; "+numerator+" / "+denominator+" "+scope+"; IDs "+ids.stream().limit(40).toList()+"; calculated "+LocalDateTime.now();
        return new Measurement(denominator==0?null:BigDecimal.valueOf(numerator*100).divide(BigDecimal.valueOf(denominator),4,RoundingMode.HALF_UP),evidence+(denominator==0?". No eligible records; not scored.":"."));
    }
}
