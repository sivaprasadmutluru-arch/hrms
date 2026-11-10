package com.example.demo.base.service;
import com.example.demo.base.enums.OrganizationIndustry;
import com.example.demo.auth.service.PositionAccessService;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;
@Service @RequiredArgsConstructor
public class OrganizationTemplateService {
    private final JdbcTemplate jdbc;
    private final StandardCompanySetup setup;
    private final PositionAccessService positionAccess;
    private Map<String,Object> context(Long companyId) {
        StandardCompanySetup.requireCompanyAccess(companyId);
        var rows=jdbc.queryForList("SELECT c.organization_id,coalesce(c.parent_company_id,c.id) root_id,o.name,coalesce(o.industry_type,'SOFTWARE') industry_type FROM public.companies c LEFT JOIN public.organizations o ON o.id=c.organization_id WHERE c.id=?",companyId);
        if(rows.isEmpty()) throw new BadRequestException("Company not found");return rows.getFirst();
    }
    @Transactional(readOnly=true)
    public Map<String,Object> get(Long companyId) {
        var context=context(companyId);
        var result=new LinkedHashMap<String,Object>();result.put("organizationName",context.get("name"));result.put("industry",context.get("industry_type"));
        result.put("canChange",context.get("organization_id")!=null && positionAccess.canAdminister(((Number)context.get("root_id")).longValue()));
        result.put("templates",setup.catalog());return result;
    }
    @Transactional
    public Map<String,Object> apply(Long companyId,OrganizationIndustry industry,OrganizationIndustry expectedIndustry) {
        var context=context(companyId);Long rootId=((Number)context.get("root_id")).longValue();
        positionAccess.requireAdministrator(rootId);
        if(!(context.get("organization_id") instanceof Number orgId)) throw new BadRequestException("Company has no organization");
        var current=jdbc.queryForObject("SELECT industry_type FROM public.organizations WHERE id=? FOR UPDATE",String.class,orgId.longValue());
        if(!industry.name().equals(current) && !expectedIndustry.name().equals(current)) throw new BadRequestException("Organization type changed. Refresh and try again");
        jdbc.update("UPDATE public.organizations SET industry_type=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",industry.name(),orgId.longValue());
        setup.ensureTree(rootId);
        return get(companyId);
    }
}
