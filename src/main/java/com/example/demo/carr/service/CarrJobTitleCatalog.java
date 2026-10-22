package com.example.demo.carr.service;

import com.example.demo.base.entity.Department;
import com.example.demo.base.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

/** Predefined department designations and their role descriptions; never employee tasks. */
@Service @RequiredArgsConstructor
public class CarrJobTitleCatalog {
    private final DepartmentRepository departments;
    private final JobPositionRepository positions;
    private final JobRoleRepository roles;
    public record Definition(String name,String purpose,List<String> responsibilities) {}
    public record Entry(Long departmentId,String departmentName,String name,String purpose,List<String> responsibilities,List<String> roles,String source) {}
    private record Family(Set<String> names,List<Definition> definitions) {}
    private static final List<Family> FAMILIES=List.of(
        new Family(Set.of("hr","human resources","human resource","people","people operations"),List.of(
                new Definition("HR Manager","Lead recruitment, employee relations and HR policy.",List.of("Approve hiring plans and HR policies","Resolve escalated employee relations cases","Review statutory HR compliance")),
                new Definition("HR Executive","Administer employee lifecycle processes.",List.of("Maintain employee records","Complete onboarding and exit formalities","Respond to employee queries")),
                new Definition("Recruiter","Fill approved vacancies with qualified candidates.",List.of("Source and screen candidates","Coordinate interviews","Maintain recruitment pipeline and offers")),
                new Definition("Learning and Development Specialist","Build employee capability.",List.of("Identify training needs","Deliver training plans","Evaluate learning outcomes")))),
        new Family(Set.of("engineering","technology","software","development","it","information technology","technical"),List.of(
                new Definition("Engineering Manager","Lead engineering delivery and technical standards.",List.of("Plan engineering capacity","Review architecture and delivery risks","Coach engineers and enforce quality standards")),
                new Definition("Developer","Build and maintain reliable software.",List.of("Implement agreed software features","Review and test code","Resolve defects and maintain documentation")),
                new Definition("Senior Developer","Own complex software delivery and technical guidance.",List.of("Design maintainable solutions","Review code and mentor developers","Resolve complex defects")),
                new Definition("QA Engineer","Verify software quality and release readiness.",List.of("Define and execute test cases","Report and verify defects","Maintain regression test coverage")),
                new Definition("DevOps Engineer","Maintain reliable delivery pipelines and infrastructure.",List.of("Maintain deployment pipelines","Monitor service availability","Manage infrastructure and incident recovery")),
                new Definition("IT Support Engineer","Maintain employee technology and access.",List.of("Resolve IT support requests","Provision devices and approved access","Maintain IT assets and security updates")))),
        new Family(Set.of("finance","accounts","accounting","finance and accounts"),List.of(
                new Definition("Finance Manager","Lead financial planning, reporting and controls.",List.of("Review budgets and forecasts","Approve financial reporting","Monitor cash flow and financial compliance")),
                new Definition("Accountant","Maintain accurate financial records.",List.of("Post and reconcile transactions","Prepare financial statements","Maintain tax and audit records")),
                new Definition("Accounts Executive","Administer daily accounting operations.",List.of("Process invoices and payments","Reconcile bank and ledger balances","Track receivables and payables")),
                new Definition("Payroll Specialist","Deliver accurate and timely payroll.",List.of("Validate payroll inputs","Process salary and statutory deductions","Resolve payroll discrepancies")))),
        new Family(Set.of("sales","business development","sales and business development"),List.of(
                new Definition("Sales Manager","Lead sales planning and revenue delivery.",List.of("Set and review sales plans","Coach the sales team","Manage pipeline and forecast accuracy")),
                new Definition("Sales Executive","Convert qualified opportunities into customer orders.",List.of("Qualify opportunities","Present proposals and follow up prospects","Maintain opportunity records")),
                new Definition("Business Development Executive","Develop new customer and partner opportunities.",List.of("Research target accounts","Build prospect relationships","Qualify new business opportunities")),
                new Definition("Account Manager","Develop and retain customer accounts.",List.of("Maintain account plans","Coordinate customer commitments","Manage renewals and expansion opportunities")))),
        new Family(Set.of("marketing","digital marketing","communications","marketing and communications"),List.of(
                new Definition("Marketing Manager","Lead marketing strategy and campaign performance.",List.of("Plan campaigns and budgets","Review campaign results","Coordinate brand and marketing delivery")),
                new Definition("Digital Marketing Executive","Deliver digital campaigns and improve conversion.",List.of("Run approved digital campaigns","Track conversions and campaign spend","Optimise channel performance")),
                new Definition("Content Writer","Create accurate and useful brand content.",List.of("Write and edit approved content","Maintain the content calendar","Review content quality and engagement")),
                new Definition("SEO Specialist","Improve organic search visibility.",List.of("Audit website search performance","Implement approved SEO improvements","Track keyword and organic conversion trends")))),
        new Family(Set.of("project","projects","project management","pmo","delivery"),List.of(
                new Definition("Project Manager","Deliver agreed project scope within schedule and budget.",List.of("Maintain project scope and delivery plan","Coordinate stakeholders and dependencies","Resolve delivery risks and track milestones")),
                new Definition("Project Coordinator","Coordinate project activities and reporting.",List.of("Maintain schedules and action logs","Coordinate meetings and dependencies","Publish project progress updates")),
                new Definition("Program Manager","Coordinate delivery across related projects.",List.of("Align project outcomes and priorities","Manage cross-project risks","Report program benefits and delivery performance")))),
        new Family(Set.of("support","customer support","customer service","client services","customer success"),List.of(
                new Definition("Customer Support Manager","Lead customer query resolution and service quality.",List.of("Review service levels and escalations","Coach support staff","Improve support processes")),
                new Definition("Customer Support Executive","Respond to and resolve customer queries.",List.of("Respond to client queries","Resolve or escalate support cases","Maintain accurate case records")),
                new Definition("Customer Success Manager","Help customers achieve agreed outcomes.",List.of("Maintain customer success plans","Coordinate adoption and customer reviews","Manage renewal risks")))),
        new Family(Set.of("operations","ops","business operations"),List.of(
                new Definition("Operations Manager","Lead reliable and efficient operational delivery.",List.of("Plan operational capacity","Review process performance","Resolve service and delivery risks")),
                new Definition("Operations Executive","Deliver assigned operational services.",List.of("Process operational requests","Maintain operational records","Escalate service exceptions")),
                new Definition("Process Analyst","Improve operational processes.",List.of("Document processes and controls","Analyse operational bottlenecks","Verify process improvements")))),
        new Family(Set.of("administration","admin","facilities","admin and facilities"),List.of(
                new Definition("Administration Manager","Manage office administration and service providers.",List.of("Plan office services and budgets","Review vendor performance","Maintain workplace policies")),
                new Definition("Admin Executive","Coordinate daily office administration.",List.of("Process administrative requests","Maintain office records and supplies","Coordinate office vendors")),
                new Definition("Facilities Coordinator","Maintain safe and functional workplace facilities.",List.of("Schedule maintenance","Track facility issues and repairs","Coordinate safety inspections")))),
        new Family(Set.of("design","creative","product design","ux","ui ux"),List.of(
                new Definition("Design Manager","Lead design quality and team delivery.",List.of("Plan design priorities","Review design quality and consistency","Coach designers and coordinate stakeholders")),
                new Definition("UI/UX Designer","Design usable and accessible product experiences.",List.of("Research user needs","Create and validate design prototypes","Maintain interface specifications")),
                new Definition("Graphic Designer","Create visual communication assets.",List.of("Design approved marketing assets","Maintain brand consistency","Prepare production-ready artwork")))),
        new Family(Set.of("product","product management"),List.of(
                new Definition("Product Manager","Define product priorities and outcomes.",List.of("Maintain product roadmap","Define requirements and acceptance criteria","Review product adoption and outcomes")),
                new Definition("Product Owner","Maintain delivery priorities and accepted outcomes.",List.of("Prioritise the product backlog","Clarify requirements","Accept delivered work against agreed criteria")),
                new Definition("Business Analyst","Translate business needs into clear requirements.",List.of("Gather stakeholder requirements","Document business processes","Validate solutions against requirements")))),
        new Family(Set.of("legal","compliance","legal and compliance"),List.of(
                new Definition("Legal Manager","Manage legal matters and contractual risk.",List.of("Review contracts","Advise on legal risks","Coordinate external legal matters")),
                new Definition("Compliance Officer","Maintain regulatory and policy compliance.",List.of("Maintain compliance obligations","Conduct compliance checks","Track remediation actions")))),
        new Family(Set.of("procurement","purchase","purchasing"),List.of(
                new Definition("Procurement Manager","Lead purchasing and supplier performance.",List.of("Review sourcing plans","Approve supplier evaluations","Monitor procurement cost and risk")),
                new Definition("Procurement Executive","Coordinate approved purchasing.",List.of("Obtain supplier quotations","Process purchase orders","Track supplier deliveries")))),
        new Family(Set.of("logistics","supply chain","warehouse","supply chain and logistics"),List.of(
                new Definition("Logistics Manager","Lead reliable movement and storage of goods.",List.of("Plan logistics capacity","Review delivery performance","Resolve shipment risks")),
                new Definition("Logistics Coordinator","Coordinate shipments and delivery records.",List.of("Schedule dispatches","Track shipment status","Resolve delivery exceptions")),
                new Definition("Warehouse Executive","Maintain accurate warehouse operations.",List.of("Receive and dispatch inventory","Maintain stock records","Conduct inventory checks")))),
        new Family(Set.of("quality","quality assurance","quality control","qa","qc"),List.of(
                new Definition("Quality Manager","Lead quality controls and corrective actions.",List.of("Maintain quality standards","Review audits and defects","Approve corrective action plans")),
                new Definition("Quality Analyst","Verify outputs against agreed quality standards.",List.of("Execute quality checks","Document nonconformances","Verify corrective actions")))),
        new Family(Set.of("manufacturing","production"),List.of(
                new Definition("Production Manager","Lead safe and reliable production.",List.of("Plan production schedules","Monitor throughput and quality","Resolve production constraints")),
                new Definition("Production Supervisor","Coordinate production shifts and standards.",List.of("Allocate shift work","Monitor safety and quality","Report production exceptions")),
                new Definition("Production Executive","Execute assigned production activities.",List.of("Complete scheduled production work","Maintain production records","Report quality and safety issues")))));

    public static List<Definition> defaults(String departmentName) {
        String normalized=Objects.toString(departmentName,"").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+"," ").trim();
        List<Definition> matched=FAMILIES.stream().filter(f->f.names().stream().anyMatch(n->(" "+normalized+" ").contains(" "+n+" "))).flatMap(f->f.definitions().stream()).distinct().toList();
        if(!matched.isEmpty()) return matched;
        String label=Objects.toString(departmentName,"Department").trim();
        if(label.length()>120) label=label.substring(0,120);
        return List.of(
            new Definition(label+" Manager","Lead "+label+" performance and delivery.",List.of("Plan department priorities and capacity","Review department delivery and risks","Coach team members and maintain standards")),
            new Definition(label+" Executive","Deliver assigned "+label+" services.",List.of("Complete agreed department activities","Maintain accurate records and evidence","Escalate delivery risks and exceptions")),
            new Definition(label+" Coordinator","Coordinate "+label+" work and reporting.",List.of("Coordinate schedules and stakeholders","Maintain action and progress records","Track open issues through resolution")));
    }
    @Transactional(readOnly=true)
    public List<Entry> list(Long companyId) {
        List<Entry> result=new ArrayList<>();
        var configured=positions.findByCompanyId(companyId);
        var configuredRoles=roles.findByCompanyId(companyId);
        for(Department department:departments.findByCompanyIdAndIsActiveTrue(companyId)) {
            Map<String,Entry> entries=new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            for(Definition d:defaults(department.getName())) entries.put(d.name(),new Entry(department.getId(),department.getName(),d.name(),d.purpose(),d.responsibilities(),List.of(),"Predefined"));
            configured.stream().filter(p->p.getDepartment()!=null && Objects.equals(p.getDepartment().getId(),department.getId())).forEach(p->{
                Entry predefined=entries.get(p.getName());
                var definition=predefined==null?new Definition(p.getName(),"Deliver the agreed outcomes for "+p.getName()+".",List.of("Deliver approved role responsibilities","Maintain outcome evidence and report progress","Escalate risks to the reporting manager")):new Definition(p.getName(),predefined.purpose(),predefined.responsibilities());
                var roleNames=configuredRoles.stream().filter(r->r.getJobPosition()!=null && Objects.equals(r.getJobPosition().getId(),p.getId())).map(r->r.getName()).distinct().sorted().toList();
                entries.put(p.getName(),new Entry(department.getId(),department.getName(),p.getName(),definition.purpose(),definition.responsibilities(),roleNames,"Company"));
            });
            result.addAll(entries.values());
        }
        return result.stream().sorted(Comparator.comparing(Entry::departmentName).thenComparing(Entry::name)).toList();
    }
    public boolean contains(Long companyId,Long departmentId,String title) {
        return title!=null && list(companyId).stream().anyMatch(e->Objects.equals(e.departmentId(),departmentId) && e.name().equalsIgnoreCase(title.trim()));
    }
}
