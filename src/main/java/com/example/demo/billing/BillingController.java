package com.example.demo.billing;
import com.example.demo.base.enums.SubscriptionPlan;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import java.util.Map;
@RestController @RequestMapping("/api/billing") @RequiredArgsConstructor @Validated
public class BillingController {
    private final BillingService billing;
    private final BillingSecurity security;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    public record CheckoutRequest(@NotNull SubscriptionPlan plan,@NotNull BillingCycle cycle) {}
    public record ManualRequest(@NotNull SubscriptionPlan plan,@NotNull BillingCycle cycle,@NotNull java.util.UUID requestId,
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(min=5,max=500) String reason) {}
    @PostMapping("/organizations/{id}/manual-activation") @PreAuthorize("@platformTeam.billing()")
    public Map<String,Object> activate(@PathVariable Long id,@Valid @RequestBody ManualRequest request) {
        security.require(id); return billing.activateManually(id,request.plan(),request.cycle(),request.requestId(),request.reason());
    }
    @PostMapping("/organizations/{id}/free-activation")
    public Map<String,Object> activateFree(@PathVariable Long id) {
        security.require(id); return billing.activateFree(id);
    }
    @GetMapping("/catalog") @PreAuthorize("@platformTeam.billing() or hasRole('ENTERPRISE_ADMIN')")
    public Map<String,Object> catalog() { return billing.catalog(); }
    @GetMapping("/companies/{companyId}")
    public Map<String,Object> company(@PathVariable Long companyId,@RequestParam(defaultValue="0") @Min(0) @Max(10000) int page) {
        var matches=jdbc.queryForList("SELECT name,organization_id FROM public.companies WHERE id=? AND organization_id IS NOT NULL",companyId);
        if (matches.isEmpty()) throw new BillingFailure(404,"Company subscription not found");
        var row=matches.get(0); Long orgId=((Number)row.get("organization_id")).longValue(); security.require(orgId);
        var result=billing.summary(orgId,page); result.put("companyId",companyId); result.put("companyName",row.get("name")); return result;
    }
    @GetMapping("/organizations/{id}")
    public Map<String,Object> summary(@PathVariable Long id,@RequestParam(defaultValue="0") @Min(0) @Max(10000) int page) { security.require(id); return billing.summary(id,page); }
    @PostMapping("/organizations/{id}/checkout")
    public Map<String,String> checkout(@PathVariable Long id,@Valid @RequestBody CheckoutRequest request) { security.require(id); return billing.checkout(id,request.plan(),request.cycle()); }
    @PostMapping("/organizations/{id}/cancel")
    public Map<String,Object> cancel(@PathVariable Long id) { security.require(id); return billing.cancel(id); }
    @PostMapping("/organizations/{id}/portal")
    public Map<String,String> portal(@PathVariable Long id) { security.require(id); return billing.portal(id); }
    @PostMapping("/organizations/{id}/refresh")
    public Map<String,Object> refresh(@PathVariable Long id) { security.require(id); billing.refresh(id); return billing.summary(id,0); }
    @PostMapping("/webhook")
    public Map<String,Boolean> webhook(@RequestBody byte[] raw,@RequestHeader(value="X-Razorpay-Signature",required=false) String signature,@RequestHeader(value="X-Razorpay-Event-Id",required=false) String eventId) { billing.webhook(raw,signature,eventId); return Map.of("received",true); }
}
