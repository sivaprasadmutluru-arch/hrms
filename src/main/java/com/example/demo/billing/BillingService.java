package com.example.demo.billing;

import com.example.demo.base.entity.Organization;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import java.time.*;
import java.util.*;
import java.security.MessageDigest;
import static com.example.demo.billing.RazorpayGateway.id;
import static com.example.demo.billing.RazorpayGateway.resource;

@Service @RequiredArgsConstructor
public class BillingService {
    private final com.example.demo.platformops.PlatformTeamAccess platformTeam;
    private final OrganizationRepository organizations;
    private final BillingSubscriptionRepository subscriptions;
    private final BillingInvoiceRepository invoices;
    private final BillingEventRepository events;
    private final BillingUsage usage;
    private final BillingProperties config;
    private final RazorpayGateway razorpay;
    private final RazorpaySignature signatures;
    private final ObjectMapper mapper;

    private Organization organization(Long orgId,boolean lock) {
        return (lock ? organizations.findByIdForUpdate(orgId) : organizations.findById(orgId))
                .orElseThrow(() -> new BillingFailure(404,"Organization not found"));
    }
    private BillingSubscription existingOrLegacy(Organization org) {
        return subscriptions.findById(org.getId()).orElseGet(() -> {
            var s=new BillingSubscription(); s.setOrganizationId(org.getId()); s.setPlan(org.getSubscriptionPlan()); return s;
        });
    }
    @Transactional
    public void initializeOrganization(Long id) {
        var s=new BillingSubscription(); s.setOrganizationId(id); s.setLegacyAccess(true); s.setStatus("LEGACY"); subscriptions.save(s);
    }
    @Transactional(readOnly=true)
    public void ensureDeletable(Long orgId) {
        var s=subscriptions.findById(orgId).orElse(null);
        if ((s!=null && (s.getStripeCustomerId()!=null || s.getRazorpaySubscriptionId()!=null)) || invoices.existsByOrganizationId(orgId) || events.existsByOrganizationIdAndType(orgId,"MANUAL_ACTIVATED") || events.existsByOrganizationIdAndType(orgId,"FREE_ACTIVATED"))
            throw new BillingFailure(409,"Organizations with billing records cannot be deleted. Suspend the organization to retain its financial history.");
    }
    @Transactional
    public void removeUnusedOrganization(Long orgId) {
        ensureDeletable(orgId); subscriptions.deleteById(orgId);
    }
    public Map<String,Object> catalog() {
        return Map.of("plans",BillingCatalog.entries(),"currency","INR","checkoutAvailable",config.configured(),
                "automaticTax",false,"provider","RAZORPAY","manualAvailable",manualAvailable());
    }
    @Transactional(readOnly=true)
    public Map<String,Object> summary(Long orgId,int page) {
        var org=organization(orgId,false);
        var s=existingOrLegacy(org);
        Instant now=Instant.now();
        String status=s.isLegacyAccess() ? "LEGACY" : s.isManualAccess() ? "MANUAL_ACTIVE" : s.getStatus().toUpperCase(Locale.ROOT);
        if (!s.isLegacyAccess() && s.getPaidUntil()!=null && !s.hasAccess(now) && Set.of("ACTIVE","PENDING","HALTED","PAST_DUE","MANUAL_ACTIVE","FREE_ACTIVE").contains(status)) status="EXPIRED";
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("organizationId",orgId); result.put("organizationName",org.getName());
        result.put("plan",org.getSubscriptionPlan()); result.put("cycle",s.getCycle()); result.put("status",status);
        result.put("pricingModel",org.getPurchasedSeats()==null ? "FIXED_PACKAGE" : "EXISTING_PER_USER");
        result.put("seats",org.getPurchasedSeats());
        result.put("manualAccess",s.isManualAccess()); result.put("manualAvailable",manualAvailable());
        result.put("manualActivations",events.findTop20ByOrganizationIdAndTypeOrderByProcessedAtDesc(orgId,"MANUAL_ACTIVATED"));
        result.put("legacyAccess",s.isLegacyAccess()); result.put("accessAllowed",s.hasAccess(now));
        result.put("freeUsed", (s.getPlan()==SubscriptionPlan.FREE && !s.isLegacyAccess())
                || events.existsByOrganizationIdAndType(orgId,"FREE_ACTIVATED"));
        result.put("startedAt",s.getStartedAt()); result.put("periodStart",s.getPeriodStart()); result.put("periodEnd",s.getPeriodEnd());
        result.put("paidUntil",s.getPaidUntil()); result.put("nextRenewalAt",s.getPlan()==SubscriptionPlan.FREE ? null : s.isManualAccess() ? s.getPaidUntil() : s.isCancelAtPeriodEnd() || s.getEndedAt()!=null ? null : s.getPeriodEnd());
        result.put("cancelAtPeriodEnd",s.isCancelAtPeriodEnd()); result.put("canceledAt",s.getCanceledAt()); result.put("endedAt",s.getEndedAt());
        result.put("amountMinor",s.getAmountMinor()); result.put("currency",s.getCurrency()); result.put("syncedAt",s.getSyncedAt());
        result.put("syncWarning",s.getSyncError()!=null); result.put("liveMode",s.isLiveMode());
        result.put("checkoutAvailable",config.configured()); result.put("portalAvailable",s.getRazorpaySubscriptionId()!=null);
        result.put("hasPaidSubscription",s.getRazorpaySubscriptionId()!=null && !s.isLegacyAccess() && !s.isManualAccess() && s.getPlan()!=SubscriptionPlan.FREE && s.getPaidUntil()!=null && s.getPaidUntil().isAfter(now));
        result.put("checkoutUrl",s.getCheckoutUrl()); result.put("paymentProvider",s.getRazorpaySubscriptionId()!=null ? "RAZORPAY" : s.getStripeSubscriptionId()!=null ? "LEGACY" : null);
        result.put("usage",usage.forOrganization(orgId,org.getSubscriptionPlan()!=null ? org.getSubscriptionPlan() : SubscriptionPlan.STANDARD));
        if (org.getPurchasedSeats()!=null && result.get("usage") instanceof Map u) u.put("maxEmployees",Math.min(org.getSubscriptionPlan().getMaxEmployees(),org.getPurchasedSeats()));
        var history=invoices.findByOrganizationIdOrderByCreatedAtDesc(orgId,PageRequest.of(Math.max(0,page),10));
        result.put("invoices",history.getContent()); result.put("invoicePage",history.getNumber()); result.put("invoicePages",history.getTotalPages());
        return result;
    }
    private boolean manualAvailable() {return config.isManualEnabled() && platformTeam.billing();}
    @Transactional
    public Map<String,Object> activateFree(Long orgId) {
        usage.lockBillingOrganization(orgId);
        var org=organization(orgId,true);
        if (org.getStatus()!=Organization.OrgStatus.ACTIVE) throw new BillingFailure(409,"The organization must be active");
        var s=existingOrLegacy(org);
        if (s.getRazorpaySubscriptionId()!=null || s.getStripeSubscriptionId()!=null)
            throw new BillingFailure(409,"Cancel the existing paid subscription before switching to Free");
        if (s.getPlan()==SubscriptionPlan.FREE && "free_active".equals(s.getStatus())) {
            return summary(orgId,0);
        }
        usage.validateFit(orgId,SubscriptionPlan.FREE);
        Instant now=Instant.now();
        s.setPlan(SubscriptionPlan.FREE); s.setCycle(null); s.setStatus("free_active");
        s.setLegacyAccess(false); s.setManualAccess(false); s.setStartedAt(now);
        s.setPeriodStart(now); s.setPeriodEnd(null); s.setPaidUntil(null); s.setEndedAt(null);
        s.setCanceledAt(null); s.setCancelAtPeriodEnd(false); s.setAmountMinor(0L); s.setCurrency("inr"); s.setSyncError(null);
        s.setCheckoutSessionId(null); s.setCheckoutUrl(null); s.setCheckoutPriceId(null); s.setCheckoutExpiresAt(null);
        s.setRazorpaySubscriptionId(null); s.setRazorpayPlanId(null);
        subscriptions.saveAndFlush(s);
        s.setSeatCount(null); s.setCheckoutSeats(null); org.setPurchasedSeats(null);
        org.setSubscriptionPlan(SubscriptionPlan.FREE); org.setMaxBranches(SubscriptionPlan.FREE.getMaxBranches());
        usage.applyPlanLimits(orgId,SubscriptionPlan.FREE); organizations.save(org);
        var event=new BillingEvent(); event.setId("free_"+UUID.randomUUID()); event.setOrganizationId(orgId);
        event.setType("FREE_ACTIVATED"); event.setActor(SecurityContextHolder.getContext().getAuthentication().getName());
        event.setProcessedAt(now); event.setDetails("{\"plan\":\"FREE\",\"forever\":true,\"amountCollectedMinor\":0}"); events.saveAndFlush(event);
        return summary(orgId,0);
    }
    @Transactional
    public Map<String,Object> activateManually(Long orgId,SubscriptionPlan plan,BillingCycle cycle,UUID requestId,String reason) {
        if (plan==SubscriptionPlan.FREE) throw new BillingFailure(400,"Use free activation for the Free plan");
        if (!manualAvailable()) throw new BillingFailure(403,"Temporary manual activation is disabled or requires a platform administrator");
        usage.lockBillingOrganization(orgId);
        var org=organization(orgId,true);
        String eventId="manual_"+requestId;
        var previous=events.findById(eventId).orElse(null);
        if (previous!=null) {
            if (!orgId.equals(previous.getOrganizationId()) || !"MANUAL_ACTIVATED".equals(previous.getType()))
                throw new BillingFailure(409,"This activation request has already been used");
            try {
                var details=mapper.readTree(previous.getDetails());
                if (!plan.name().equals(details.path("plan").asText()) || !cycle.name().equals(details.path("cycle").asText()))
                    throw new BillingFailure(409,"This activation request was already used for another plan or term");
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException(e); }
            return summary(orgId,0);
        }
        if (org.getStatus()!=Organization.OrgStatus.ACTIVE) throw new BillingFailure(409,"The organization must be active");
        var s=existingOrLegacy(org);
        if (s.getRazorpaySubscriptionId()!=null || s.getStripeSubscriptionId()!=null || s.getStripeCustomerId()!=null)
            throw new BillingFailure(409,"An organization with an existing payment subscription cannot use manual activation");
        usage.validateFit(orgId,plan);
        Instant now=Instant.now();
        boolean renewal=s.isManualAccess() && s.getPlan()==plan && s.getCycle()==cycle && s.hasAccess(now);
        Instant periodStart=renewal ? s.getPaidUntil() : now;
        Instant anchor=renewal && s.getPeriodStart()!=null ? s.getPeriodStart() : now;
        Instant end=manualPeriodEnd(periodStart,anchor,cycle);
        if (s.getStartedAt()==null) s.setStartedAt(now);
        s.setPlan(plan); s.setSeatCount(null); org.setPurchasedSeats(null); s.setCycle(cycle); s.setStatus("manual_active"); s.setManualAccess(true); s.setLegacyAccess(false);
        if (!renewal) s.setPeriodStart(now);
        s.setPeriodEnd(end); s.setPaidUntil(end); s.setCancelAtPeriodEnd(true);
        s.setCanceledAt(null); s.setEndedAt(null); s.setAmountMinor(0L); s.setCurrency("inr"); s.setSyncError(null);
        subscriptions.saveAndFlush(s);
        org.setSubscriptionPlan(plan); org.setMaxBranches(plan.getMaxBranches()==Integer.MAX_VALUE ? null : plan.getMaxBranches());
        usage.applyPlanLimits(orgId,plan); organizations.save(org);
        var event=new BillingEvent(); event.setId(eventId); event.setOrganizationId(orgId); event.setType("MANUAL_ACTIVATED");
        event.setActor(SecurityContextHolder.getContext().getAuthentication().getName());
        event.setProcessedAt(now);
        try { event.setDetails(mapper.writeValueAsString(Map.of("plan",plan.name(),"cycle",cycle.name(),"startsAt",periodStart.toString(),"endsAt",end.toString(),"reason",reason.trim(),"amountCollectedMinor",0,"renewal",renewal,"pricingModel","FIXED_PACKAGE"))); }
        catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException(e); }
        events.saveAndFlush(event);
        return summary(orgId,0);
    }
    static Instant manualPeriodEnd(Instant base,Instant anchor,BillingCycle cycle) {
        ZoneId zone=ZoneId.of("Asia/Kolkata"); var value=base.atZone(zone); var original=anchor.atZone(zone);
        var month=cycle==BillingCycle.YEARLY ? YearMonth.of(value.getYear()+1,original.getMonth()) : YearMonth.from(value).plusMonths(1);
        return ZonedDateTime.of(month.atDay(Math.min(original.getDayOfMonth(),month.lengthOfMonth())),original.toLocalTime(),zone).toInstant();
    }
    @Transactional
    public Map<String,String> checkout(Long orgId,SubscriptionPlan plan,BillingCycle cycle) {
        if (plan==SubscriptionPlan.FREE) throw new BillingFailure(400,"Free does not require payment");
        if (!config.configured()) throw new BillingFailure(503,"Razorpay billing is not configured. Contact the platform administrator.");
        usage.lockBillingOrganization(orgId);
        var org=organization(orgId,true);
        if (org.getStatus()!=Organization.OrgStatus.ACTIVE) throw new BillingFailure(409,"The organization must be active");
        usage.validateFit(orgId,plan);
        var s=existingOrLegacy(org);
        if (s.getStripeSubscriptionId()!=null && s.hasAccess(Instant.now()))
            throw new BillingFailure(409,"This organization has a historical paid subscription. Contact platform billing to migrate it safely.");
        String planId=config.priceId(plan,cycle);
        var providerPlan=razorpay.get("/plans/"+resource(planId));
        validatePlan(providerPlan,plan,cycle);
        if (s.getRazorpaySubscriptionId()!=null) {
            var existing=razorpay.get("/subscriptions/"+resource(s.getRazorpaySubscriptionId()));
            String status=existing.path("status").asText();
            if (Set.of("created","authenticated").contains(status) && planId.equals(existing.path("plan_id").asText())) {
                String url=checkedUrl(existing.path("short_url").asText());
                s.setCheckoutUrl(url); subscriptions.saveAndFlush(s); return Map.of("url",url);
            }
            if (abandonedCheckout(existing,s,orgId) && !paidAccess(s)) {
                var cancelled=razorpay.post("/subscriptions/"+resource(s.getRazorpaySubscriptionId())+"/cancel",Map.of("cancel_at_cycle_end",false));
                if (!id(existing).equals(id(cancelled)) || !"cancelled".equals(cancelled.path("status").asText()))
                    throw new BillingFailure(502,"Could not cancel the unfinished checkout. Please try again.");
                var replaced=new BillingEvent(); replaced.setId("checkout_replaced_"+id(existing));
                replaced.setOrganizationId(orgId); replaced.setType("CHECKOUT_REPLACED");
                replaced.setProcessedAt(Instant.now()); events.saveAndFlush(replaced);
                status="cancelled";
            }
            if (!Set.of("cancelled","completed","expired").contains(status))
                throw new BillingFailure(409,"This subscription has already been authorized or paid. Cancel it before choosing another package.");
            if (paidAccess(s))
                throw new BillingFailure(409,"The current paid period is still active. Choose a new package after it ends.");
        }
        var request=new LinkedHashMap<String,Object>();
        request.put("plan_id",planId); request.put("total_count",cycle==BillingCycle.MONTHLY ? 120 : 10);
        request.put("quantity",1); request.put("customer_notify",false);
        request.put("expire_by",Instant.now().plus(7,java.time.temporal.ChronoUnit.DAYS).getEpochSecond());
        request.put("notes",Map.of("organization_id",orgId.toString(),"billing_instance",config.getInstanceId()));
        var created=razorpay.post("/subscriptions",request);
        String id=id(created), url=checkedUrl(created.path("short_url").asText());
        if (!id.startsWith("sub_") || !planId.equals(created.path("plan_id").asText())) throw new BillingFailure(502,"Payment provider returned an invalid subscription");
        s.setRazorpaySubscriptionId(id); s.setRazorpayPlanId(planId); s.setCheckoutUrl(url);
        s.setCheckoutExpiresAt(epoch(created.path("expire_by"))); s.setCheckoutGeneration(s.getCheckoutGeneration()+1);
        if (!s.hasAccess(Instant.now())) s.setStatus("created");
        subscriptions.saveAndFlush(s);
        return Map.of("url",url);
    }
    private boolean paidAccess(BillingSubscription s) {
        return !s.isLegacyAccess() && !s.isManualAccess() && s.getPlan()!=SubscriptionPlan.FREE && s.hasAccess(Instant.now());
    }
    private boolean abandonedCheckout(JsonNode object,BillingSubscription s,Long orgId) {
        return "created".equals(object.path("status").asText())
                && id(object).equals(s.getRazorpaySubscriptionId())
                && orgId.equals(parseOrganization(object))
                && object.path("plan_id").asText().equals(s.getRazorpayPlanId())
                && object.path("paid_count").asInt(-1)==0
                && object.path("auth_attempts").asInt(-1)==0
                && object.path("current_start").isNull()
                && object.path("current_end").isNull()
                && object.path("customer_id").isNull();
    }
    @Transactional
    public Map<String,String> portal(Long orgId) {
        var s=existingOrLegacy(organization(orgId,false));
        if (s.getRazorpaySubscriptionId()==null) throw new BillingFailure(409,"No Razorpay subscription exists");
        var object=razorpay.get("/subscriptions/"+resource(s.getRazorpaySubscriptionId()));
        if (!Set.of("created","authenticated").contains(object.path("status").asText()))
            throw new BillingFailure(409,"Use AccrueHR to manage the active subscription");
        return Map.of("url",checkedUrl(object.path("short_url").asText()));
    }
    @Transactional
    public Map<String,Object> cancel(Long orgId) {
        usage.lockBillingOrganization(orgId);
        var s=existingOrLegacy(organization(orgId,true));
        if (s.getRazorpaySubscriptionId()==null) throw new BillingFailure(409,"No Razorpay subscription exists");
        var object=razorpay.get("/subscriptions/"+resource(s.getRazorpaySubscriptionId()));
        String status=object.path("status").asText();
        if (Set.of("cancelled","completed","expired").contains(status)) return summary(orgId,0);
        boolean atCycleEnd=s.getPaidUntil()!=null && s.getPaidUntil().isAfter(Instant.now());
        razorpay.post("/subscriptions/"+resource(s.getRazorpaySubscriptionId())+"/cancel",Map.of("cancel_at_cycle_end",atCycleEnd));
        synchronize(s.getRazorpaySubscriptionId(),orgId);
        s=subscriptions.findById(orgId).orElse(s);
        s.setCancelAtPeriodEnd(atCycleEnd); subscriptions.saveAndFlush(s);
        return summary(orgId,0);
    }
    @Transactional
    public void refresh(Long orgId) {
        var s=existingOrLegacy(organization(orgId,true));
        if (s.getRazorpaySubscriptionId()!=null) synchronize(s.getRazorpaySubscriptionId(),orgId);
        else { s.setSyncedAt(Instant.now()); subscriptions.save(s); }
    }
    @Transactional
    public void webhook(byte[] raw,String signature,String eventId) {
        signatures.verify(raw,signature,config.getWebhookSecret());
        if (eventId==null || !eventId.matches("[A-Za-z0-9_-]{4,255}")) throw new BillingFailure(400,"Missing Razorpay event identifier");
        String key="razorpay_"+eventId;
        if (events.existsById(key)) return;
        JsonNode event;
        try { event=mapper.readTree(raw); } catch (Exception e) { throw new BillingFailure(400,"Invalid webhook body"); }
        String type=event.path("event").asText("");
        String id=id(event.path("payload").path("subscription").path("entity"));
        if (!type.startsWith("subscription.") || id.isBlank()) return;
        var object=razorpay.get("/subscriptions/"+resource(id));
        Long orgId=parseOrganization(object);
        organization(orgId,true);
        if (events.existsById(key)) return;
        var s=subscriptions.findById(orgId).orElseThrow(() -> new BillingFailure(409,"Subscription not registered"));
        if (!id.equals(s.getRazorpaySubscriptionId())) {
            if (!events.existsById("checkout_replaced_"+id)
                    || !"cancelled".equals(object.path("status").asText())
                    || object.path("paid_count").asInt(-1)!=0)
                throw new BillingFailure(400,"Subscription ownership mismatch");
        } else synchronizeObject(s,object);
        var processed=new BillingEvent(); processed.setId(key); processed.setOrganizationId(orgId); processed.setType(type); processed.setProcessedAt(Instant.now());
        try { processed.setPayloadHash(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw))); }
        catch (Exception e) { throw new IllegalStateException(e); }
        events.saveAndFlush(processed);
    }
    private void synchronize(String id,Long orgId) {
        var object=razorpay.get("/subscriptions/"+resource(id));
        if (!orgId.equals(parseOrganization(object))) throw new BillingFailure(400,"Subscription ownership mismatch");
        var s=subscriptions.findById(orgId).orElseThrow(() -> new BillingFailure(409,"Subscription not registered"));
        if (!id.equals(s.getRazorpaySubscriptionId())) throw new BillingFailure(400,"Subscription ownership mismatch");
        synchronizeObject(s,object);
    }
    void synchronizeObject(BillingSubscription s,JsonNode object) {
        String id=id(object), planId=object.path("plan_id").asText();
        if (!id.equals(s.getRazorpaySubscriptionId()) || !s.getOrganizationId().equals(parseOrganization(object))) throw new BillingFailure(400,"Subscription ownership mismatch");
        if (object.path("quantity").asInt()!=1) throw new BillingFailure(409,"Subscription quantity must be one");
        SubscriptionPlan plan=null; BillingCycle cycle=null;
        for (var entry:BillingCatalog.entries()) if (entry.id()!=SubscriptionPlan.FREE) for (var period:BillingCycle.values())
            if (planId.equals(config.priceId(entry.id(),period))) {plan=entry.id();cycle=period;}
        if (plan==null || !planId.equals(s.getRazorpayPlanId())) throw new BillingFailure(409,"Unrecognized subscription plan");
        var invoicesResponse=razorpay.get("/invoices?subscription_id="+resource(id)+"&count=20");
        Instant providerStart=epoch(object.path("current_start")), providerEnd=epoch(object.path("current_end"));
        Instant confirmedEnd=null, confirmedStart=null;
        for (var invoice:invoicesResponse.path("items")) {
            if (!id.equals(invoice.path("subscription_id").asText())) continue;
            saveInvoice(invoice,s.getOrganizationId(),id);
            if (!"paid".equals(invoice.path("status").asText()) || invoice.path("amount_paid").asLong()<BillingCatalog.plan(plan).amount(cycle)
                    || !"INR".equalsIgnoreCase(invoice.path("currency").asText())) continue;
            boolean matchingPlan=false;
            for(var line:invoice.path("line_items")) if("plan".equals(line.path("type").asText())
                    && line.path("quantity").asInt()==1
                    && (line.path("amount").asLong()==BillingCatalog.plan(plan).amount(cycle)
                        || line.path("amount").asLong()==BillingCatalog.plan(plan).totalAmount(cycle))) matchingPlan=true;
            if(!matchingPlan) continue;
            Instant start=epoch(invoice.path("billing_start")), end=epoch(invoice.path("billing_end"));
            if (start!=null && end!=null && (confirmedEnd==null || end.isAfter(confirmedEnd))) {confirmedStart=start; confirmedEnd=end;}
        }
        String status=object.path("status").asText("created");
        if (confirmedEnd!=null && (s.getPaidUntil()==null || confirmedEnd.isAfter(s.getPaidUntil()))) {
            s.setPlan(plan); s.setCycle(cycle); s.setSeatCount(null); s.setManualAccess(false); s.setLegacyAccess(false);
            s.setStartedAt(s.getStartedAt()==null ? epoch(object.path("created_at")) : s.getStartedAt());
            s.setPeriodStart(confirmedStart); s.setPeriodEnd(confirmedEnd); s.setPaidUntil(confirmedEnd);
            s.setAmountMinor(BillingCatalog.plan(plan).totalAmount(cycle)); s.setCurrency("inr");
            var org=organization(s.getOrganizationId(),false); org.setSubscriptionPlan(plan); org.setPurchasedSeats(null);
            org.setMaxBranches(plan.getMaxBranches()==Integer.MAX_VALUE ? null : plan.getMaxBranches());
            usage.applyPlanLimits(org.getId(),plan); organizations.save(org);
        }
        if (!s.isLegacyAccess() && !s.isManualAccess() && s.getPlan()!=SubscriptionPlan.FREE) s.setStatus(status);
        s.setCancelAtPeriodEnd(object.path("cancel_at_cycle_end").asBoolean(s.isCancelAtPeriodEnd()));
        s.setEndedAt(epoch(object.path("ended_at")));
        if (s.getEndedAt()!=null) s.setCanceledAt(s.getEndedAt());
        s.setLiveMode(config.getKeyId().startsWith("rzp_live_")); s.setSyncedAt(Instant.now()); s.setSyncError(null);
        subscriptions.saveAndFlush(s);
    }
    private void saveInvoice(JsonNode invoice,Long orgId,String subscriptionId) {
        String id=id(invoice); if (id.isBlank()) return;
        var record=invoices.findById(id).orElseGet(BillingInvoice::new);
        if (record.getOrganizationId()!=null && !record.getOrganizationId().equals(orgId)) throw new BillingFailure(400,"Invoice ownership mismatch");
        record.setId(id); record.setOrganizationId(orgId); record.setSubscriptionId(subscriptionId);
        record.setNumber(invoice.path("invoice_number").asText(null)); record.setStatus(invoice.path("status").asText("issued"));
        record.setLiveMode(config.getKeyId().startsWith("rzp_live_")); record.setAmountDue(invoice.path("amount_due").asLong());
        record.setAmountPaid(invoice.path("amount_paid").asLong()); record.setCurrency(invoice.path("currency").asText("INR"));
        record.setCreatedAt(epoch(invoice.path("created_at"))); record.setPaidAt(epoch(invoice.path("paid_at")));
        record.setPeriodStart(epoch(invoice.path("billing_start"))); record.setPeriodEnd(epoch(invoice.path("billing_end")));
        String url=invoice.path("short_url").asText("");
        record.setHostedInvoiceUrl(url.isBlank()?null:checkedUrl(url)); record.setInvoicePdf(null); invoices.save(record);
    }
    void validatePlan(JsonNode object,SubscriptionPlan plan,BillingCycle cycle) {
        long amt = object.path("item").path("amount").asLong(-1);
        if (!config.priceId(plan,cycle).equals(id(object)) || object.path("interval").asInt()!=1
                || !(cycle==BillingCycle.YEARLY ? "yearly" : "monthly").equals(object.path("period").asText())
                || !"INR".equalsIgnoreCase(object.path("item").path("currency").asText())
                || (amt!=BillingCatalog.plan(plan).amount(cycle) && amt!=BillingCatalog.plan(plan).totalAmount(cycle)))
            throw new BillingFailure(409,"Razorpay plan amount, currency or period does not match this package");
    }
    private Long parseOrganization(JsonNode object) {
        if (!config.getInstanceId().equals(object.path("notes").path("billing_instance").asText())) throw new BillingFailure(400,"Billing instance mismatch");
        try {return Long.valueOf(object.path("notes").path("organization_id").asText());}
        catch (Exception e) {throw new BillingFailure(400,"Invalid organization metadata");}
    }
    private String checkedUrl(String value) {
        try {var u=java.net.URI.create(value); if ("https".equals(u.getScheme()) && Set.of("rzp.io","razorpay.com").contains(u.getHost())) return value;}
        catch (Exception ignored) {} throw new BillingFailure(502,"Invalid Razorpay payment destination");
    }
    static Instant epoch(JsonNode node) {return node.isNumber() && node.asLong()>0 ? Instant.ofEpochSecond(node.asLong()) : null;}
}
