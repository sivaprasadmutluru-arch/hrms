package com.example.demo.billing;
import com.example.demo.base.enums.SubscriptionPlan;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.*;
@Component @RequiredArgsConstructor
public class BillingUsage {
    private final JdbcTemplate jdbc;
    public Map<String,Object> forOrganization(Long id,SubscriptionPlan plan) {
        return forOrganizationIncluding(id,plan,List.of());
    }
    Map<String,Object> forOrganizationIncluding(Long id,SubscriptionPlan plan,List<Long> restoredCompanyIds) {
        var parameters=new ArrayList<Object>(); parameters.add(id);
        String restored="";
        if (!restoredCompanyIds.isEmpty()) {
            restored=" OR id IN ("+String.join(",",Collections.nCopies(restoredCompanyIds.size(),"?"))+")";
            parameters.addAll(restoredCompanyIds);
        }
        var rows=jdbc.queryForList("SELECT id, schema_name, company_type FROM public.companies WHERE organization_id=? AND (is_active=true"+restored+")",parameters.toArray());
        var ids=rows.stream().map(r -> ((Number)r.get("id")).longValue()).toList();
        long employees=0;
        var schemas=new HashSet<String>();
        for (var row:rows) if (row.get("schema_name") instanceof String schema && !schema.isBlank()) schemas.add(schema);
        for (String schema:schemas) {
            if (!schema.matches("[A-Za-z_][A-Za-z0-9_]*")) throw new BillingFailure(409,"Invalid workspace schema configuration");
            Boolean exists=jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=? AND table_name='employees')",Boolean.class,schema);
            if (Boolean.TRUE.equals(exists) && !ids.isEmpty()) {
                String placeholders=String.join(",",Collections.nCopies(ids.size(),"?"));
                employees+=jdbc.queryForObject("SELECT count(*) FROM \""+schema+"\".employees WHERE is_active=true AND company_id IN ("+placeholders+")",Long.class,ids.toArray());
            }
        }
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("plan",plan.name());
        result.put("currentEmployees",employees);
        result.put("currentBranches",rows.stream().filter(r -> "BRANCH".equals(r.get("company_type"))).count());
        result.put("maxEmployees",plan.getMaxEmployees()==Integer.MAX_VALUE ? null : plan.getMaxEmployees());
        result.put("maxBranches",plan.getMaxBranches()==Integer.MAX_VALUE ? null : plan.getMaxBranches());
        result.put("crossBranchAccessAllowed",plan.isCrossBranchAccessAllowed());
        return result;
    }
    public void lockBillingOrganization(Long id) {
        // Same advisory key as destructive organization deletion. Acquire before
        // row locks so checkout and deletion cannot deadlock or race over DDL.
        jdbc.queryForList("SELECT pg_advisory_xact_lock(?)",id);
    }
    public void applyPlanLimits(Long id, SubscriptionPlan plan) {
        jdbc.update("UPDATE public.companies SET branch_limit=? WHERE organization_id=? AND company_type='HEAD_OFFICE'",plan.getMaxBranches(),id);
    }
    public void validateRestoration(Long id,SubscriptionPlan plan,List<Long> restoredCompanyIds,Integer existingSeatLimit) {
        var projected=forOrganizationIncluding(id,plan,restoredCompanyIds);
        int maxEmployees=existingSeatLimit==null ? plan.getMaxEmployees() : Math.min(plan.getMaxEmployees(),existingSeatLimit);
        if (((Number)projected.get("currentEmployees")).longValue()>maxEmployees
                || ((Number)projected.get("currentBranches")).longValue()>plan.getMaxBranches())
            throw new BillingFailure(409,"Restoring these companies would exceed the organization's employee or branch limit. Upgrade the plan or reduce usage before restoring.");
    }
    public void validateFit(Long id,SubscriptionPlan plan) {
        var usage=forOrganization(id,plan);
        if (((Number)usage.get("currentEmployees")).longValue()>plan.getMaxEmployees()
                || ((Number)usage.get("currentBranches")).longValue()>plan.getMaxBranches())
            throw new BillingFailure(409,"This plan cannot accommodate the organization's current employee or branch usage");
    }
}
