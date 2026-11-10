package com.example.demo.leave.service;

import com.example.demo.base.service.StandardCompanySetup;
import com.example.demo.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

/** Regional type names are starter templates, not automatic statutory entitlements. */
@Service
@RequiredArgsConstructor
public class DefaultLeaveTypeService {
    private final JdbcTemplate jdbc;
    public record Template(String name, List<String> aliases, String payment, String color, boolean attachment) {}
    public static final List<Template> COMMON = List.of(
        new Template("Annual Leave",List.of("Earned Leave","Privilege Leave","Privileged Leave","Annual / Earned Leave"),"PAID","#3B82F6",false),
        new Template("Sick Leave",List.of("Medical Leave"),"PAID","#EF4444",true),
        new Template("Maternity Leave",List.of(),"PAID","#EC4899",false),
        new Template("Bereavement Leave",List.of("Compassionate Leave","Compassionate / Bereavement Leave"),"PAID","#64748B",false),
        new Template("Compensatory Off",List.of("Comp Off","Compensatory Leave"),"PAID","#14B8A6",false),
        new Template("Loss of Pay",List.of("Unpaid Leave","Leave Without Pay","LOP"),"UNPAID","#F59E0B",false));
    public static final List<Template> INDIA = List.of(
        new Template("Casual Leave",List.of(),"PAID","#22C55E",false),
        new Template("Paternity Leave",List.of(),"PAID","#8B5CF6",false));
    public static final List<Template> UAE = List.of(
        new Template("Parental Leave",List.of(),"PAID","#A855F7",false),
        new Template("Study Leave",List.of("Examination Leave"),"PAID","#06B6D4",false),
        new Template("Hajj Leave",List.of(),"UNPAID","#78716C",false),
        new Template("National Service Leave",List.of(),"PAID","#0F766E",false));

    public static String regionForCountry(String country) {
        String value=country==null?"":country.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z]", "");
        return switch(value) {
            case "INDIA", "IN", "IND", "BHARAT" -> "INDIA";
            case "AE", "ARE", "UAE", "UNITEDARABEMIRATES", "DUBAI", "ABUDHABI" -> "UAE";
            default -> value.isBlank() ? "BOTH" : "COMMON";
        };
    }
    @Transactional
    public int apply(Long companyId, String region) {
        StandardCompanySetup.requireCompanyAccess(companyId);
        if (!Set.of("INDIA","UAE","BOTH").contains(region)) throw new BadRequestException("Choose INDIA, UAE or BOTH");
        return seed(companyId,region);
    }
    @Transactional
    public int ensureInitial(Long companyId) { return seed(companyId,null); }
    private int seed(Long companyId,String chosen) {
        var rows=jdbc.queryForList("SELECT c.id,coalesce(c.schema_name,p.schema_name) schema_name,coalesce(nullif(trim(c.country),''),p.country) country FROM public.companies c LEFT JOIN public.companies p ON p.id=c.parent_company_id WHERE c.id=? FOR UPDATE OF c",companyId);
        if(rows.isEmpty()) throw new BadRequestException("Company not found");
        String schema=(String)rows.getFirst().get("schema_name");
        if(schema==null || !schema.matches("[a-zA-Z_][a-zA-Z0-9_]*")) throw new BadRequestException("Company workspace is not ready");
        String region=chosen==null?regionForCountry((String)rows.getFirst().get("country")):chosen;
        int added=seedGroup(companyId,schema,"COMMON",COMMON);
        if(region.equals("INDIA") || region.equals("BOTH")) added+=seedGroup(companyId,schema,"INDIA",INDIA);
        if(region.equals("UAE") || region.equals("BOTH")) added+=seedGroup(companyId,schema,"UAE",UAE);
        return added;
    }
    private int seedGroup(Long companyId,String schema,String region,List<Template> templates) {
        String marker="LEAVE_DEFAULTS_V1_"+region;
        if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM public.company_setup_templates WHERE company_id=? AND catalog_group=?)",Boolean.class,companyId,marker))) return 0;
        String table="\""+schema+"\".leave_types";
        var existing=new HashSet<>(jdbc.queryForList("SELECT lower(trim(name)) FROM "+table+" WHERE company_id=? OR (is_organization_wide=true AND company_id IN (SELECT id FROM public.companies WHERE organization_id=(SELECT organization_id FROM public.companies WHERE id=?)))",String.class,companyId,companyId));
        int added=0;
        for(var template:templates) {
            var names=new ArrayList<String>();names.add(template.name());names.addAll(template.aliases());
            if(names.stream().map(n->n.toLowerCase(Locale.ROOT)).anyMatch(existing::contains)) continue;
            added+=jdbc.update("INSERT INTO "+table+" (name,company_id,total_days,payment_type,color_code,carryforward_type,leave_validation_type,is_active,created_at,updated_at,accrual_enabled,mid_year_joiner_mode,negative_balance_allowed,require_attachment,limit_leave,is_encashable,exclude_weekend,exclude_holiday,exclude_company_leave,is_organization_wide,reset,accrual_posting_timing,accrual_calculation_method,accrual_precision,accrual_proration_basis) VALUES (?,?,0,?,?, 'NO_CARRYFORWARD','HR_VALIDATION',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,'MANUAL',false,?,true,false,true,true,true,false,false,'END_OF_MONTH','FIXED_MONTHLY',1,'CALENDAR_DAYS')",template.name(),companyId,template.payment(),template.color(),template.attachment());
            existing.add(template.name().toLowerCase(Locale.ROOT));
        }
        jdbc.update("INSERT INTO public.company_setup_templates(company_id,catalog_group) VALUES(?,?)",companyId,marker);
        return added;
    }
}
