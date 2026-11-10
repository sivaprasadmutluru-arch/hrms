package com.example.demo.base.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.base.enums.OrganizationIndustry;
import java.util.*;
import java.util.stream.Collectors;

/** Master catalog of industry templates. Titles never create accounts or security grants. */
@Service @RequiredArgsConstructor
public class StandardCompanySetup {
    private final JdbcTemplate jdbc;
    private final com.example.demo.leave.service.DefaultLeaveTypeService defaultLeaveTypes;
    public record DepartmentTemplate(String name,List<String> aliases,List<String> positions) {}
    public static final List<DepartmentTemplate> CATALOG=List.of(
        new DepartmentTemplate("Executive / Management", List.of("Management"), List.of("CEO","COO","CTO","CFO","Managing Director","General Manager")),
        new DepartmentTemplate("Human Resources", List.of("HR"), List.of("HR Head","HR Manager","HR Executive","Recruiter")),
        new DepartmentTemplate("Finance", List.of("Finance & Accounts","Accounts"), List.of("Finance Manager","Accounts Manager","Accountant","Payroll Executive")),
        new DepartmentTemplate("Engineering", List.of("Engineering / IT","IT"), List.of("Engineering Manager","Technical Lead","Senior Software Engineer","Software Engineer","QA Engineer","DevOps Engineer","IT Administrator")),
        new DepartmentTemplate("Operations", List.of(), List.of("Operations Manager","Branch Manager","Team Lead","Operations Executive")),
        new DepartmentTemplate("Sales & Marketing", List.of("Sales and Marketing"), List.of("Sales Head","Sales Manager","Sales Executive","Marketing Manager","Marketing Executive")),
        new DepartmentTemplate("Administration", List.of("Admin"), List.of("Admin Manager","Admin Executive","Receptionist","Office Assistant")),
        new DepartmentTemplate("Customer Support", List.of("Support"), List.of("Support Manager","Support Team Lead","Customer Support Executive")),
        new DepartmentTemplate("Entry Level", List.of(), List.of("Intern","Trainee","Apprentice"))
    );

    public static List<DepartmentTemplate> common() { return CATALOG.stream().filter(d -> !d.name().equals("Engineering")).toList(); }
    public static List<DepartmentTemplate> specialized(OrganizationIndustry industry) {
        return switch(industry) {
        case GENERAL -> List.of();
        case SOFTWARE -> CATALOG.stream().filter(d -> d.name().equals("Engineering")).toList();
        case MEDICAL -> List.of(new DepartmentTemplate("Clinical Services",List.of(),List.of("Medical Director","Consultant Physician","General Physician","Surgeon","Resident Doctor")), new DepartmentTemplate("Nursing",List.of(),List.of("Nursing Superintendent","Nurse Manager","Registered Nurse","Nursing Assistant")), new DepartmentTemplate("Pharmacy",List.of(),List.of("Chief Pharmacist","Pharmacist","Pharmacy Assistant")), new DepartmentTemplate("Laboratory",List.of(),List.of("Laboratory Manager","Lab Technologist","Lab Technician","Phlebotomist")), new DepartmentTemplate("Radiology",List.of(),List.of("Radiologist","Radiology Technician")), new DepartmentTemplate("Patient Services",List.of(),List.of("Patient Services Manager","Patient Coordinator","Medical Receptionist","Medical Records Executive")));
        case EDUCATION -> List.of(new DepartmentTemplate("Academic Leadership",List.of(),List.of("Principal","Vice Principal","Dean","Academic Coordinator")), new DepartmentTemplate("Teaching & Faculty",List.of(),List.of("Professor","Associate Professor","Assistant Professor","School Teacher","Teaching Assistant")), new DepartmentTemplate("Student Services",List.of(),List.of("Student Services Manager","Admissions Officer","Student Counsellor")), new DepartmentTemplate("Library",List.of(),List.of("Librarian","Library Assistant")));
        case MANUFACTURING -> List.of(new DepartmentTemplate("Production",List.of(),List.of("Plant Manager","Production Manager","Production Supervisor","Machine Operator","Production Technician")), new DepartmentTemplate("Quality",List.of(),List.of("Quality Manager","Quality Engineer","Quality Inspector")), new DepartmentTemplate("Maintenance",List.of(),List.of("Maintenance Manager","Maintenance Engineer","Maintenance Technician")), new DepartmentTemplate("Supply Chain & Logistics",List.of(),List.of("Supply Chain Manager","Procurement Executive","Warehouse Supervisor","Logistics Executive")));
        case RETAIL -> List.of(new DepartmentTemplate("Store Operations",List.of(),List.of("Store Manager","Assistant Store Manager","Retail Supervisor","Sales Associate","Cashier")), new DepartmentTemplate("Merchandising",List.of(),List.of("Merchandising Manager","Visual Merchandiser","Buyer")), new DepartmentTemplate("Inventory",List.of(),List.of("Inventory Manager","Inventory Controller","Stock Associate")));
        case HOSPITALITY -> List.of(new DepartmentTemplate("Hotel Operations",List.of(),List.of("Hotel Manager","Duty Manager","Front Office Manager","Guest Relations Executive")), new DepartmentTemplate("Food & Beverage",List.of(),List.of("Food & Beverage Manager","Restaurant Manager","Chef","Cook","Food Service Associate")), new DepartmentTemplate("Housekeeping",List.of(),List.of("Housekeeping Manager","Housekeeping Supervisor","Housekeeping Attendant")), new DepartmentTemplate("Reservations",List.of(),List.of("Reservations Manager","Reservations Executive")));
        case CONSTRUCTION -> List.of(new DepartmentTemplate("Site & Projects",List.of(),List.of("Project Director","Construction Manager","Site Engineer","Site Supervisor")), new DepartmentTemplate("Design & Engineering",List.of(),List.of("Architect","Civil Engineer","Structural Engineer","Quantity Surveyor")), new DepartmentTemplate("Safety",List.of(),List.of("Safety Manager","Safety Officer")), new DepartmentTemplate("Skilled Trades",List.of(),List.of("Electrician","Plumber","Carpenter","Construction Worker")));
        case PROFESSIONAL_SERVICES -> List.of(new DepartmentTemplate("Client Advisory",List.of(),List.of("Practice Head","Engagement Manager","Senior Consultant","Consultant","Business Analyst")), new DepartmentTemplate("Client Delivery",List.of(),List.of("Delivery Manager","Client Account Manager","Project Coordinator")));
        case FINANCIAL_SERVICES -> List.of(new DepartmentTemplate("Banking Operations",List.of(),List.of("Bank Branch Manager","Relationship Manager","Credit Officer")), new DepartmentTemplate("Risk & Compliance",List.of(),List.of("Risk Manager","Compliance Officer","Fraud Analyst")), new DepartmentTemplate("Insurance",List.of(),List.of("Insurance Advisor","Claims Officer","Underwriter")));
        case LOGISTICS -> List.of(new DepartmentTemplate("Warehouse Operations",List.of(),List.of("Warehouse Manager","Warehouse Executive","Storekeeper","Dispatch Coordinator")), new DepartmentTemplate("Transport & Fleet",List.of(),List.of("Fleet Manager","Transport Coordinator","Driver","Delivery Associate")), new DepartmentTemplate("Supply Chain",List.of(),List.of("Procurement Manager","Logistics Coordinator")));
        case MEDIA_ADVERTISING -> List.of(new DepartmentTemplate("Creative",List.of(),List.of("Creative Director","Art Director","Graphic Designer","Copywriter")), new DepartmentTemplate("Advertising",List.of(),List.of("Account Planner","Media Planner","Campaign Manager")), new DepartmentTemplate("Content Production",List.of(),List.of("Content Editor","Content Writer","Video Editor","Photographer")));
        case NONPROFIT -> List.of(new DepartmentTemplate("Programs",List.of(),List.of("Program Director","Program Manager","Program Officer","Field Coordinator")), new DepartmentTemplate("Fundraising & Partnerships",List.of(),List.of("Fundraising Manager","Donor Relations Officer","Grant Writer")), new DepartmentTemplate("Social Services",List.of(),List.of("Social Worker","Community Mobilizer","Volunteer Coordinator")));
        case GOVERNMENT -> List.of(new DepartmentTemplate("Public Administration",List.of(),List.of("Department Officer","Administrative Officer","Public Relations Officer")), new DepartmentTemplate("Public Services",List.of(),List.of("Service Delivery Officer","Community Development Officer","Records Officer")), new DepartmentTemplate("Policy & Planning",List.of(),List.of("Policy Analyst","Planning Officer")));
        case AGRICULTURE -> List.of(new DepartmentTemplate("Farm Operations",List.of(),List.of("Farm Manager","Farm Supervisor","Agricultural Technician","Farm Worker")), new DepartmentTemplate("Agronomy",List.of(),List.of("Agronomist","Crop Specialist","Field Officer")), new DepartmentTemplate("Food Processing",List.of(),List.of("Food Production Manager","Food Quality Officer","Processing Operator")));
        case REAL_ESTATE -> List.of(new DepartmentTemplate("Property Management",List.of(),List.of("Property Manager","Facility Manager","Property Executive")), new DepartmentTemplate("Real Estate Sales",List.of(),List.of("Real Estate Sales Agent","Leasing Consultant","Property Valuer")), new DepartmentTemplate("Estate Maintenance",List.of(),List.of("Maintenance Supervisor","Facilities Technician")));
        case ENERGY_UTILITIES -> List.of(new DepartmentTemplate("Plant Operations",List.of(),List.of("Plant Operations Manager","Control Room Operator","Field Operator")), new DepartmentTemplate("Energy Engineering",List.of(),List.of("Electrical Engineer","Power Systems Engineer","Renewable Energy Engineer")), new DepartmentTemplate("Health, Safety & Environment",List.of(),List.of("HSE Manager","HSE Officer","Environment Officer")));
        };
    }
    public static List<DepartmentTemplate> templates(OrganizationIndustry industry) {
        var result=new ArrayList<>(common());result.addAll(specialized(industry));return result;
    }
    public List<Map<String,Object>> catalog() {
        return Arrays.stream(OrganizationIndustry.values()).map(i -> {
            var groups=templates(i);
            return Map.<String,Object>of("id",i.name(),"label",label(i),"departmentCount",groups.size(),"positionCount",groups.stream().mapToInt(g -> g.positions().size()).sum(),"departments",groups);
        }).toList();
    }
    public static String label(OrganizationIndustry i) { return switch(i) {
        case GENERAL -> "Other / general business";
        case SOFTWARE -> "Software & IT";
        case MEDICAL -> "Medical & healthcare";
        case EDUCATION -> "Education";
        case MANUFACTURING -> "Manufacturing";
        case RETAIL -> "Retail";
        case HOSPITALITY -> "Hospitality";
        case CONSTRUCTION -> "Construction";
        case PROFESSIONAL_SERVICES -> "Professional services";
        case FINANCIAL_SERVICES -> "Banking, finance & insurance";
        case LOGISTICS -> "Logistics, transport & warehousing";
        case MEDIA_ADVERTISING -> "Media & advertising";
        case NONPROFIT -> "Nonprofit & social services";
        case GOVERNMENT -> "Government & public sector";
        case AGRICULTURE -> "Agriculture & food production";
        case REAL_ESTATE -> "Real estate & property management";
        case ENERGY_UTILITIES -> "Energy & utilities";
    }; }
    private Map<String,Object> company(Long id,boolean lock) {
        var rows=jdbc.queryForList("SELECT c.id,c.organization_id,c.company_type,c.parent_company_id,coalesce(c.schema_name,p.schema_name) schema_name,coalesce(o.industry_type,'SOFTWARE') industry_type FROM public.companies c LEFT JOIN public.companies p ON p.id=c.parent_company_id LEFT JOIN public.organizations o ON o.id=c.organization_id WHERE c.id=?"+(lock?" FOR UPDATE OF c":""),id);
        if(rows.isEmpty()) throw new com.example.demo.common.exception.BadRequestException("Company not found");
        return rows.getFirst();
    }
    private String schema(Map<String,Object> company) {
        String name=(String)company.get("schema_name");
        if(name==null || !name.matches("[A-Za-z_][A-Za-z0-9_]*")) throw new IllegalStateException("Company workspace is not ready");
        return "\""+name+"\"";
    }
    private void track(Long companyId,String type,Long id,String group,String name,Long departmentId) {
        jdbc.update("INSERT INTO public.company_setup_items(company_id,item_type,item_id,catalog_group,original_name,original_department_id) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING",companyId,type,id,group,name,departmentId);
    }
    /** Record legacy defaults without recreating entries an organization already removed. */
    private void adoptLegacy(Long id,String schema) {
        for(var d:CATALOG) {
            String group=d.name().equals("Engineering")?"SOFTWARE":"COMMON";
            var names=new ArrayList<>(d.aliases());names.add(d.name());
            var departmentIds=new HashSet<Long>();
            for(var row:jdbc.queryForList("SELECT id,name FROM "+schema+".departments WHERE company_id=?",id)) {
                if(names.stream().anyMatch(n -> n.equalsIgnoreCase(((String)row.get("name")).strip()))) {
                    Long departmentId=((Number)row.get("id")).longValue();departmentIds.add(departmentId);
                    track(id,"DEPARTMENT",departmentId,group,(String)row.get("name"),null);
                }
            }
            for(var row:jdbc.queryForList("SELECT id,name,department_id FROM "+schema+".job_positions WHERE company_id=?",id))
                if(departmentIds.contains(((Number)row.get("department_id")).longValue()) && d.positions().stream().anyMatch(n -> n.equalsIgnoreCase(((String)row.get("name")).strip()))) track(id,"POSITION",((Number)row.get("id")).longValue(),group,(String)row.get("name"),((Number)row.get("department_id")).longValue());
        }
        for(String group:List.of("COMMON","SOFTWARE")) jdbc.update("INSERT INTO public.company_setup_templates(company_id,catalog_group) VALUES(?,?) ON CONFLICT DO NOTHING",id,group);
    }
    private void seedGroup(Long id,String schema,String group,List<DepartmentTemplate> catalog) {
        if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM public.company_setup_templates WHERE company_id=? AND catalog_group=?)",Boolean.class,id,group))) return;
        for(var template:catalog) {
            var departments=jdbc.queryForList("SELECT id,name FROM "+schema+".departments WHERE company_id=? ORDER BY id",id);
            var names=new HashSet<>(template.aliases().stream().map(s -> s.toLowerCase(Locale.ROOT)).toList());names.add(template.name().toLowerCase(Locale.ROOT));
            var existing=departments.stream().filter(d -> names.contains(((String)d.get("name")).strip().toLowerCase(Locale.ROOT))).findFirst().orElse(null);
            Long departmentId=existing==null ? jdbc.queryForObject("INSERT INTO "+schema+".departments(name,company_id,is_active,created_at,updated_at) VALUES(?,?,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,template.name(),id) : ((Number)existing.get("id")).longValue();
            track(id,"DEPARTMENT",departmentId,group,existing==null?template.name():(String)existing.get("name"),null);
            for(String name:template.positions()) {
                var positions=jdbc.queryForList("SELECT id,name,department_id FROM "+schema+".job_positions WHERE company_id=? AND lower(trim(name))=lower(?) ORDER BY id",id,name);
                Long positionId;
                if(positions.isEmpty()) positionId=jdbc.queryForObject("INSERT INTO "+schema+".job_positions(name,department_id,company_id,is_active,created_at,updated_at) VALUES(?,?,?,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,name,departmentId,id);
                else positionId=((Number)positions.getFirst().get("id")).longValue();
                // An existing position in a different/custom department stays custom.
                if(positions.isEmpty() || ((Number)positions.getFirst().get("department_id")).longValue()==departmentId)
                    track(id,"POSITION",positionId,group,positions.isEmpty()?name:(String)positions.getFirst().get("name"),departmentId);
            }
        }
        jdbc.update("INSERT INTO public.company_setup_templates(company_id,catalog_group) VALUES(?,?)",id,group);
    }
    /** Seed once per industry group, preserving custom roles and deliberate removals. */
    private void seedRoles(Long companyId,String schema,String group) {
        String marker="JOB_ROLES_V1_"+group;
        if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM public.company_setup_templates WHERE company_id=? AND catalog_group=?)",Boolean.class,companyId,marker))) return;
        jdbc.update("INSERT INTO "+schema+".job_roles(name,job_position_id,company_id,is_active,created_at,updated_at) " +
                "SELECT p.name,p.id,p.company_id,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM "+schema+".job_positions p " +
                "JOIN public.company_setup_items t ON t.company_id=p.company_id AND t.item_id=p.id AND t.item_type='POSITION' " +
                "WHERE p.company_id=? AND t.catalog_group=? AND p.is_active=true " +
                "AND NOT EXISTS(SELECT 1 FROM "+schema+".job_roles r WHERE r.company_id=p.company_id AND r.job_position_id=p.id AND lower(trim(r.name))=lower(trim(p.name)))",companyId,group);
        jdbc.update("INSERT INTO public.company_setup_templates(company_id,catalog_group) VALUES(?,?)",companyId,marker);
    }
    @Transactional
    public void ensure(Long companyId) {
        var company=company(companyId,true);String schema=schema(company);
        var marker=jdbc.queryForList("SELECT catalog_version FROM public.company_setup_defaults WHERE company_id=?",companyId);
        if(!marker.isEmpty() && ((Number)marker.getFirst().get("catalog_version")).intValue()<2) adoptLegacy(companyId,schema);
        var industry=OrganizationIndustry.valueOf((String)company.get("industry_type"));
        seedGroup(companyId,schema,"COMMON",common());seedGroup(companyId,schema,industry.name(),specialized(industry));
        seedRoles(companyId,schema,"COMMON");seedRoles(companyId,schema,industry.name());
        defaultLeaveTypes.ensureInitial(companyId);
        jdbc.update("INSERT INTO public.company_setup_defaults(company_id,catalog_version) VALUES(?,2) ON CONFLICT(company_id) DO UPDATE SET catalog_version=2",companyId);
    }
    @Transactional
    public void ensureTree(Long rootId) {
        for(Long id:jdbc.queryForList("SELECT id FROM public.companies WHERE is_active=true AND (id=? OR parent_company_id=?) ORDER BY id",Long.class,rootId,rootId)) ensure(id);
    }
    private boolean allowed(Map<String,Object> row,String industry) {
        Object group=row.get("catalogGroup");return group==null || group.equals("COMMON") || group.equals(industry);
    }
    public static void requireCompanyAccess(Long companyId) {
        var scope=AccessScopeContext.get();
        var auth=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean platform=auth!=null && auth.isAuthenticated() && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN"));
        if(!platform && (scope==null || !scope.canAccess(companyId))) throw new AccessDeniedException("Company is outside your access scope");
    }
    /** Keep unrelated templates in storage and expose selected defaults plus customized records. */
    @Transactional(readOnly=true)
    public Map<String,Object> options(Long companyId) {
        requireCompanyAccess(companyId);
        var company=company(companyId,false);String schema=schema(company),industry=(String)company.get("industry_type");
        var positions=jdbc.queryForList("SELECT j.id,j.name,j.department_id AS \"departmentId\",CASE WHEN t.original_name=j.name AND t.original_department_id=j.department_id THEN t.catalog_group END AS \"catalogGroup\" FROM "+schema+".job_positions j JOIN "+schema+".departments d ON d.id=j.department_id AND d.company_id=j.company_id LEFT JOIN public.company_setup_items t ON t.company_id=j.company_id AND t.item_id=j.id AND t.item_type='POSITION' WHERE j.company_id=? AND j.is_active=true AND d.is_active=true ORDER BY lower(j.name),j.id",companyId).stream().filter(row -> allowed(row,industry)).toList();
        var used=positions.stream().map(p -> ((Number)p.get("departmentId")).longValue()).collect(Collectors.toSet());
        var departments=jdbc.queryForList("SELECT d.id,d.name,CASE WHEN t.original_name=d.name THEN t.catalog_group END AS \"catalogGroup\" FROM "+schema+".departments d LEFT JOIN public.company_setup_items t ON t.company_id=d.company_id AND t.item_id=d.id AND t.item_type='DEPARTMENT' WHERE d.company_id=? AND d.is_active=true ORDER BY lower(d.name),d.id",companyId).stream().filter(row -> allowed(row,industry) || used.contains(((Number)row.get("id")).longValue())).toList();
        return Map.of("industry",industry,"industryLabel",label(OrganizationIndustry.valueOf(industry)),"departments",departments,"jobPositions",positions);
    }
    public List<com.example.demo.base.entity.JobPosition> filterPositions(List<com.example.demo.base.entity.JobPosition> rows) {
        var cache=new HashMap<Long,Set<Long>>();
        return rows.stream().filter(p -> cache.computeIfAbsent(p.getCompany().getId(),c -> ids(options(c),"jobPositions")).contains(p.getId())).toList();
    }
    public List<com.example.demo.base.entity.JobRole> filterRoles(List<com.example.demo.base.entity.JobRole> rows) {
        var cache=new HashMap<Long,Set<Long>>();
        return rows.stream().filter(r -> cache.computeIfAbsent(r.getCompany().getId(),c -> ids(options(c),"jobPositions")).contains(r.getJobPosition().getId()))
                .peek(r -> org.hibernate.Hibernate.initialize(r.getJobPosition())).toList();
    }
    public List<com.example.demo.base.entity.Department> filterDepartments(List<com.example.demo.base.entity.Department> rows) {
        var cache=new HashMap<Long,Set<Long>>();
        return rows.stream().filter(d -> cache.computeIfAbsent(d.getCompany().getId(),c -> ids(options(c),"departments")).contains(d.getId())).toList();
    }
    @SuppressWarnings("unchecked") private Set<Long> ids(Map<String,Object> options,String key) {
        return ((List<Map<String,Object>>)options.get(key)).stream().map(row -> ((Number)row.get("id")).longValue()).collect(Collectors.toSet());
    }
}
