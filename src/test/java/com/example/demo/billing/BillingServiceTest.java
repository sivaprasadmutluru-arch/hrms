package com.example.demo.billing;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class BillingServiceTest {
    OrganizationRepository orgs=mock(OrganizationRepository.class);
    BillingSubscriptionRepository subscriptions=mock(BillingSubscriptionRepository.class);
    BillingInvoiceRepository invoices=mock(BillingInvoiceRepository.class);
    BillingEventRepository events=mock(BillingEventRepository.class);
    BillingUsage usage=mock(BillingUsage.class);
    BillingProperties config=new BillingProperties();
    RazorpayGateway razorpay=mock(RazorpayGateway.class);
    ObjectMapper json=new ObjectMapper();
    BillingService service=new BillingService(new com.example.demo.platformops.PlatformTeamAccess(mock(org.springframework.jdbc.core.JdbcTemplate.class)),orgs,subscriptions,invoices,events,usage,config,razorpay,new RazorpaySignature(),json);
    Organization org=new Organization();
    BillingServiceTest(){
        config.setKeyId("rzp_test_placeholder");config.setKeySecret("test-secret");config.setWebhookSecret("webhook-secret");
        for(var plan:SubscriptionPlan.values())if(plan!=SubscriptionPlan.FREE)for(var cycle:BillingCycle.values())config.getPrices().put(plan.name().toLowerCase()+"-"+cycle.name().toLowerCase(),"plan_"+plan+"_"+cycle);
        org.setId(2L);org.setName("Acme");org.setStatus(Organization.OrgStatus.ACTIVE);org.setSubscriptionPlan(SubscriptionPlan.BASIC);
        when(orgs.findById(2L)).thenReturn(Optional.of(org));when(orgs.findByIdForUpdate(2L)).thenReturn(Optional.of(org));
        when(invoices.findById(anyString())).thenReturn(Optional.empty());
    }
    BillingSubscription subscription(){var s=new BillingSubscription();s.setOrganizationId(2L);s.setRazorpaySubscriptionId("sub_2");s.setRazorpayPlanId("plan_STANDARD_MONTHLY");return s;}
    JsonNode object(String status)throws Exception{return json.readTree("""
      {"id":"sub_2","plan_id":"plan_STANDARD_MONTHLY","status":"%s","quantity":1,
       "notes":{"organization_id":"2","billing_instance":"hrms"},"created_at":1800000000,
       "current_start":1800000000,"current_end":1802678400,"paid_count":1}
      """.formatted(status));}
    JsonNode invoice(String status)throws Exception{return json.readTree("""
      {"items":[{"id":"inv_2","subscription_id":"sub_2","status":"%s","amount_paid":299900,"amount_due":0,
       "currency":"INR","created_at":1800000000,"paid_at":1800000001,"billing_start":1800000000,"billing_end":1802678400,
       "short_url":"https://rzp.io/i/receipt","line_items":[{"type":"plan","quantity":1,"amount":299900}]}]}
      """.formatted(status));}
    @Test void paidInvoiceActivatesPlanAndRecordsHistory()throws Exception{
        when(razorpay.get("/invoices?subscription_id=sub_2&count=20")).thenReturn(invoice("paid"));
        var s=subscription();service.synchronizeObject(s,object("active"));
        assertThat(s.getPaidUntil()).isEqualTo(Instant.ofEpochSecond(1802678400));assertThat(s.getCycle()).isEqualTo(BillingCycle.MONTHLY);
        assertThat(s.isLegacyAccess()).isFalse();assertThat(org.getSubscriptionPlan()).isEqualTo(SubscriptionPlan.STANDARD);
        verify(invoices).save(argThat(i->i.getId().equals("inv_2")&&i.getAmountPaid()==299900));
    }
    @Test void unpaidInvoiceCannotGrantAccess()throws Exception{
        when(razorpay.get("/invoices?subscription_id=sub_2&count=20")).thenReturn(invoice("issued"));
        var s=subscription();service.synchronizeObject(s,object("active"));
        assertThat(s.getPaidUntil()).isNull();assertThat(s.isLegacyAccess()).isTrue();
    }
    @Test void webhookUsesAuthoritativeStateAndDeduplicates()throws Exception{
        byte[] raw="{\"event\":\"subscription.charged\",\"payload\":{\"subscription\":{\"entity\":{\"id\":\"sub_2\"}}}}".getBytes();
        var s=subscription();when(subscriptions.findById(2L)).thenReturn(Optional.of(s));
        when(razorpay.get("/subscriptions/sub_2")).thenReturn(object("active"));when(razorpay.get("/invoices?subscription_id=sub_2&count=20")).thenReturn(invoice("paid"));
        service.webhook(raw,RazorpaySignatureTest.sign(raw,"webhook-secret"),"evt_2");
        assertThat(s.getPaidUntil()).isNotNull();verify(events).saveAndFlush(argThat(e->e.getId().equals("razorpay_evt_2")&&e.getPayloadHash()!=null));
        when(events.existsById("razorpay_evt_2")).thenReturn(true);service.webhook(raw,RazorpaySignatureTest.sign(raw,"webhook-secret"),"evt_2");
        verify(razorpay,times(1)).get("/subscriptions/sub_2");
    }
    @Test void rejectsForeignSubscriptionAndQuantity()throws Exception{
        var s=subscription();var foreign=(com.fasterxml.jackson.databind.node.ObjectNode)object("active");foreign.put("quantity",2);
        assertThatThrownBy(()->service.synchronizeObject(s,foreign)).isInstanceOf(BillingFailure.class);
        foreign.put("quantity",1);((com.fasterxml.jackson.databind.node.ObjectNode)foreign.path("notes")).put("organization_id","3");
        assertThatThrownBy(()->service.synchronizeObject(s,foreign)).isInstanceOf(BillingFailure.class);
    }
    @Test void checkoutValidatesPlanAndCreatesSinglePackageSubscription()throws Exception{
        var existing=new BillingSubscription();existing.setOrganizationId(2L);when(subscriptions.findById(2L)).thenReturn(Optional.of(existing));
        when(razorpay.get("/plans/plan_STANDARD_MONTHLY")).thenReturn(json.readTree("{\"id\":\"plan_STANDARD_MONTHLY\",\"period\":\"monthly\",\"interval\":1,\"item\":{\"amount\":299900,\"currency\":\"INR\"}}"));
        when(razorpay.post(eq("/subscriptions"),anyMap())).thenReturn(json.readTree("{\"id\":\"sub_new\",\"plan_id\":\"plan_STANDARD_MONTHLY\",\"short_url\":\"https://rzp.io/i/new\"}"));
        assertThat(service.checkout(2L,SubscriptionPlan.STANDARD,BillingCycle.MONTHLY).get("url")).isEqualTo("https://rzp.io/i/new");
        assertThat(existing.getRazorpaySubscriptionId()).isEqualTo("sub_new");
        verify(razorpay).post(eq("/subscriptions"),argThat(m->Integer.valueOf(1).equals(m.get("quantity"))&&"plan_STANDARD_MONTHLY".equals(m.get("plan_id"))));
    }
    @Test void checkoutRejectsMismatchedProviderAmount()throws Exception{
        when(razorpay.get("/plans/plan_STANDARD_MONTHLY")).thenReturn(json.readTree("{\"id\":\"plan_STANDARD_MONTHLY\",\"period\":\"monthly\",\"interval\":1,\"item\":{\"amount\":1,\"currency\":\"INR\"}}"));
        assertThatThrownBy(()->service.checkout(2L,SubscriptionPlan.STANDARD,BillingCycle.MONTHLY)).isInstanceOf(BillingFailure.class);
        verify(razorpay,never()).post(anyString(),anyMap());
    }
    @Test void abandonedStandardCheckoutCanBeReplacedWithBasicWhileFreeMonthIsActive()throws Exception{
        var s=subscription();s.setPlan(SubscriptionPlan.FREE);s.setLegacyAccess(false);s.setStatus("free_active");
        s.setPaidUntil(Instant.now().plusSeconds(86400));
        when(subscriptions.findById(2L)).thenReturn(Optional.of(s));
        when(razorpay.get("/plans/plan_BASIC_MONTHLY")).thenReturn(json.readTree("{\"id\":\"plan_BASIC_MONTHLY\",\"period\":\"monthly\",\"interval\":1,\"item\":{\"amount\":99900,\"currency\":\"INR\"}}"));
        when(razorpay.get("/subscriptions/sub_2")).thenReturn(json.readTree("{\"id\":\"sub_2\",\"plan_id\":\"plan_STANDARD_MONTHLY\",\"status\":\"created\",\"paid_count\":0,\"auth_attempts\":0,\"current_start\":null,\"current_end\":null,\"customer_id\":null,\"notes\":{\"organization_id\":\"2\",\"billing_instance\":\"hrms\"}}"));
        when(razorpay.post(eq("/subscriptions/sub_2/cancel"),anyMap())).thenReturn(json.readTree("{\"id\":\"sub_2\",\"status\":\"cancelled\"}"));
        when(razorpay.post(eq("/subscriptions"),anyMap())).thenReturn(json.readTree("{\"id\":\"sub_basic\",\"plan_id\":\"plan_BASIC_MONTHLY\",\"short_url\":\"https://rzp.io/i/basic\"}"));
        assertThat(service.checkout(2L,SubscriptionPlan.BASIC,BillingCycle.MONTHLY).get("url")).isEqualTo("https://rzp.io/i/basic");
        assertThat(s.getRazorpaySubscriptionId()).isEqualTo("sub_basic");
        assertThat(s.getPlan()).isEqualTo(SubscriptionPlan.FREE);
        var calls=inOrder(razorpay);
        calls.verify(razorpay).post("/subscriptions/sub_2/cancel",Map.of("cancel_at_cycle_end",false));
        calls.verify(razorpay).post(eq("/subscriptions"),anyMap());
        verify(events).saveAndFlush(argThat(e->"checkout_replaced_sub_2".equals(e.getId())));
    }
    @Test void authorizedCheckoutCannotBeSilentlyReplaced()throws Exception{
        var s=subscription();when(subscriptions.findById(2L)).thenReturn(Optional.of(s));
        when(razorpay.get("/plans/plan_BASIC_MONTHLY")).thenReturn(json.readTree("{\"id\":\"plan_BASIC_MONTHLY\",\"period\":\"monthly\",\"interval\":1,\"item\":{\"amount\":99900,\"currency\":\"INR\"}}"));
        when(razorpay.get("/subscriptions/sub_2")).thenReturn(object("authenticated"));
        assertThatThrownBy(()->service.checkout(2L,SubscriptionPlan.BASIC,BillingCycle.MONTHLY))
                .isInstanceOf(BillingFailure.class).hasMessageContaining("already been authorized or paid");
        verify(razorpay,never()).post(anyString(),anyMap());
    }
    @Test void fixedPackageCatalogPricesDoNotMultiplyByEmployees(){
        assertThat(BillingCatalog.plan(SubscriptionPlan.BASIC).monthlyAmountMinor()).isEqualTo(99900L);
        for(var p:BillingCatalog.entries())assertThat(p.yearlyAmountMinor()).isEqualTo(p.id()==SubscriptionPlan.FREE ? 0L : p.monthlyAmountMinor()*10);
    }
    @Test void newAccountStartsInLegacyMode(){service.initializeOrganization(2L);verify(subscriptions).save(argThat(s->s.isLegacyAccess()&&s.getPaidUntil()==null));}
}
