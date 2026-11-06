package com.example.demo.billing;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.service.EmailService;
import com.example.demo.common.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** SMTP is not transactional. Persist claims before sending, and do not blindly
 * retry abandoned SENDING claims: delivery may already have occurred. */
@Component @RequiredArgsConstructor @Slf4j
public class BillingNoticeDispatcher {
 private final JdbcTemplate jdbc;
 private final BillingSubscriptionRepository subscriptions;
 private final EmailService email;
 @Value("${app.billing.notices.enabled:true}") private boolean enabled;
 @Value("${app.frontend-url:http://localhost:5173}") private String frontendUrl;
 private static final ZoneId IST=ZoneId.of("Asia/Kolkata");
 private final java.util.concurrent.atomic.AtomicBoolean running=new java.util.concurrent.atomic.AtomicBoolean();
 private final java.util.concurrent.ExecutorService worker=java.util.concurrent.Executors.newSingleThreadExecutor(r->{var t=new Thread(r,"billing-notice-delivery");t.setDaemon(true);return t;});
 @jakarta.annotation.PreDestroy void stop(){worker.shutdownNow();}
 @Scheduled(fixedDelayString="${app.billing.notices.scan-ms:3600000}",initialDelayString="${app.billing.notices.initial-delay-ms:60000}")
 public void scheduled(){if(!enabled || !running.compareAndSet(false,true))return;worker.execute(()->{try{processBatch();}finally{running.set(false);}});}
 static Instant end(BillingSubscription s){var end=s.getPaidUntil();if(!s.isManualAccess() && s.getEndedAt()!=null && (end==null || s.getEndedAt().isBefore(end)))end=s.getEndedAt();return end;}
 static String due(BillingSubscription s,Instant now){
  if(s==null || s.isLegacyAccess() || s.getPlan()==null || s.getPlan()==SubscriptionPlan.FREE || (!s.isManualAccess() && (!s.isLiveMode() || s.getRazorpaySubscriptionId()==null)))return null;
  var end=end(s);if(end==null)return null;
  if(!end.isAfter(now))return "ACCESS_EXPIRED";
  if("pending".equalsIgnoreCase(s.getStatus()) || "halted".equalsIgnoreCase(s.getStatus()) || "past_due".equalsIgnoreCase(s.getStatus()) || "unpaid".equalsIgnoreCase(s.getStatus()))return "PAYMENT_DUE";
  long days=ChronoUnit.DAYS.between(now.atZone(IST).toLocalDate(),end.atZone(IST).toLocalDate());
  return Set.of(7L,3L,1L,0L).contains(days)?"RENEWAL_"+days+"_DAYS":null;
 }
 public void processBatch(){
  var ids=jdbc.queryForList("SELECT s.organization_id FROM public.billing_subscriptions s JOIN public.organizations o ON o.id=s.organization_id WHERE o.is_active=true AND o.status='ACTIVE' AND s.legacy_access=false AND s.plan<>'FREE' AND s.paid_until IS NOT NULL AND (s.manual_access=true OR (s.live_mode=true AND s.razorpay_subscription_id IS NOT NULL)) ORDER BY s.organization_id",Long.class);
  int attempts=0;
  for(Long org:ids){if(Thread.currentThread().isInterrupted() || attempts>=100)break;try{if(processOrganization(org))attempts++;}catch(Exception error){log.warn("Billing notice processing failed for organization {}",org);}finally{TenantContext.clear();}}
 }
 boolean processOrganization(Long org){
  Instant now=Instant.now();var s=subscriptions.findById(org).orElse(null);String kind=due(s,now);if(kind==null)return false;
  var rows=jdbc.queryForList("SELECT o.name,coalesce(nullif(trim(o.contact_email),''),nullif(trim(c.email),'')) AS recipient,c.id AS company_id,c.schema_name FROM public.organizations o JOIN public.companies c ON c.organization_id=o.id AND c.company_type='HEAD_OFFICE' AND c.is_active=true AND c.schema_ready=true WHERE o.id=? AND o.is_active=true AND o.status='ACTIVE' ORDER BY c.id LIMIT 1",org);
  if(rows.isEmpty())return false;var row=rows.getFirst();var deadline=end(s);String recipient=(String)row.get("recipient");
  String schema=(String)row.get("schema_name");if(schema==null || !schema.matches("[a-zA-Z_][a-zA-Z0-9_]*"))return false;
  jdbc.update("UPDATE public.billing_notices SET status='SUPERSEDED',next_attempt_at=NULL WHERE organization_id=? AND status IN ('PENDING','FAILED') AND (period_end<>? OR kind<>?)",org,java.sql.Timestamp.from(deadline),kind);
  jdbc.update("INSERT INTO public.billing_notices(id,organization_id,kind,period_end,recipient,status,attempts,created_at,next_attempt_at) VALUES(?,?,?,?,?,'PENDING',0,?,?) ON CONFLICT(organization_id,kind,period_end) DO NOTHING",UUID.randomUUID().toString(),org,kind,java.sql.Timestamp.from(deadline),recipient,java.sql.Timestamp.from(now),java.sql.Timestamp.from(now));
  // Autocommit this claim before SMTP; concurrent nodes can claim a notice only once.
  var claimed=jdbc.queryForList("UPDATE public.billing_notices SET status='SENDING',recipient=?,attempts=attempts+1,last_error=NULL WHERE organization_id=? AND kind=? AND period_end=? AND status IN ('PENDING','FAILED') AND attempts<5 AND next_attempt_at<=? RETURNING id,attempts",recipient,org,kind,java.sql.Timestamp.from(deadline),java.sql.Timestamp.from(now));
  if(claimed.isEmpty())return false;String id=(String)claimed.getFirst().get("id");int attempts=((Number)claimed.getFirst().get("attempts")).intValue();
  var fresh=subscriptions.findById(org).orElse(null);
  if(!Objects.equals(kind,due(fresh,Instant.now())) || !Objects.equals(deadline,end(fresh))){jdbc.update("UPDATE public.billing_notices SET status='SUPERSEDED',next_attempt_at=NULL WHERE id=?",id);return false;}
  boolean sent=false;String error="Email delivery failed. Review the organization's SMTP/email logs.";
  try{
   if(recipient==null || !recipient.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")){error="No valid organization contact email or head-office email is configured.";}
   else{
    TenantContext.setTenant(schema);String date=java.time.format.DateTimeFormatter.ofPattern("dd MMM uuuu, hh:mm a 'IST'",Locale.ENGLISH).withZone(IST).format(deadline);
    String subject=kind.equals("ACCESS_EXPIRED")?"AccrueHR subscription access has expired":kind.equals("PAYMENT_DUE")?"Action needed: AccrueHR payment due":"AccrueHR subscription reminder";
    String explanation=kind.equals("ACCESS_EXPIRED")?"Your organization's subscription access ended on "+date+".":kind.equals("PAYMENT_DUE")?"Your subscription has a payment requiring attention. Review your billing details.":"Your current subscription period ends on "+date+".";
    String renewal=fresh.isManualAccess()?"Your access was activated manually. Renew with the AccrueHR team before it expires; this email does not collect payment or set up automatic charges.":fresh.isCancelAtPeriodEnd()?"Your subscription is set to end at the current period's expiry. Contact your administrator if you want to continue.":"Review your subscription and payment method in Manage billing. Any automatic renewal follows your existing Razorpay subscription settings.";
    String link=frontendUrl.replaceAll("/+$", "")+"/subscription";
    String body="<h2>AccrueHR billing update</h2><p>Hello "+escape((String)row.get("name"))+",</p><p>"+escape(explanation)+"</p><p>Plan: "+fresh.getPlan()+".</p><p>"+escape(renewal)+"</p><p><a href='"+escape(link)+"' style='display:inline-block;background:#2f73b7;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;'>Review subscription</a></p><p>Your organization administrator can sign in to review billing or contact AccrueHR support.</p>";
sent=email.sendPlatformEmail(((Number)row.get("company_id")).longValue(),recipient,subject,body,null);
   }
  }catch(Exception ignored){error="Email delivery failed. Review the organization's SMTP/email logs.";}
  finally{TenantContext.clear();}
  if(sent)jdbc.update("UPDATE public.billing_notices SET status='SENT',sent_at=?,next_attempt_at=NULL,last_error=NULL WHERE id=?",java.sql.Timestamp.from(Instant.now()),id);
  else jdbc.update("UPDATE public.billing_notices SET status='FAILED',last_error=?,next_attempt_at=? WHERE id=?",error,java.sql.Timestamp.from(Instant.now().plusSeconds(Math.min(21600,900L*(1L<<(attempts-1))))),id);
  return true;
 }
 private static String escape(String s){return s==null?"":s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("'","&#39;").replace("\"","&quot;");}
}
