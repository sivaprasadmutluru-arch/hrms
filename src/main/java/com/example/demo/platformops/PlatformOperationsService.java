package com.example.demo.platformops;

import com.example.demo.billing.*;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class PlatformOperationsService {
 private final PlatformTeamAccess platformTeam;
 private final JdbcTemplate jdbc;
 private final BillingSecurity security;
 private final PlatformSupportRepository tickets;
 private final PlatformSupportMessageRepository messages;
 private final BillingService billing;
 public boolean platform() {return platformTeam.support();}
 private String actor(){var a=SecurityContextHolder.getContext().getAuthentication();if(a==null || !a.isAuthenticated() || a.getName().equals("anonymousUser")) throw new AccessDeniedException("Please sign in");return a.getName();}
 private void platformOnly(){platformTeam.requireSupport();}
 private Long organization(Long requested) {
  Long id=requested;
  if(id==null && !platform()) {var company=CompanyContext.get();if(company!=null) id=jdbc.queryForObject("SELECT organization_id FROM public.companies WHERE id=?",Long.class,company);}
  if(id!=null && !platform()) security.requireTenantOwner(id);else if(!platform())throw new BadRequestException("Select your organization company first");
  return id;
 }
 private String name(Long id){var rows=jdbc.queryForList("SELECT name FROM public.organizations WHERE id=? AND is_active=true",String.class,id);if(rows.isEmpty())throw new ResourceNotFoundException("Organization",id);return rows.getFirst();}
 @Transactional(readOnly=true) public Map<String,Object> context(){
  var org=organization(null);var choices=platform()?jdbc.queryForList("SELECT id,name FROM public.organizations WHERE is_active=true ORDER BY name LIMIT 1000"):jdbc.queryForList("SELECT id,name FROM public.organizations WHERE id=?",org);
  return Map.of("platform",platform(),"organizations",choices);
 }
 @Transactional(readOnly=true) public Map<String,Object> billingList(int page,String search) {
  platformTeam.requireBilling();String q="%"+search.toLowerCase(Locale.ROOT)+"%";
  String where=" FROM public.organizations o LEFT JOIN public.billing_subscriptions s ON s.organization_id=o.id WHERE lower(o.name) LIKE ?";
  var total=jdbc.queryForObject("SELECT count(*)"+where,Long.class,q);
  var rows=jdbc.queryForList("SELECT o.id,o.name,o.is_active AS record_active,o.status AS organization_status,coalesce(s.plan,o.subscription_plan) AS plan,s.cycle,CASE WHEN s.organization_id IS NULL OR s.legacy_access THEN 'LEGACY' WHEN s.manual_access AND (s.paid_until IS NULL OR s.paid_until<=CURRENT_TIMESTAMP) THEN 'EXPIRED' WHEN s.manual_access THEN 'MANUAL_ACTIVE' WHEN s.plan='FREE' AND s.status='free_active' AND s.paid_until>CURRENT_TIMESTAMP AND s.ended_at IS NULL THEN 'FREE_ACTIVE' WHEN s.paid_until<=CURRENT_TIMESTAMP THEN 'EXPIRED' ELSE upper(s.status) END AS billing_status,s.manual_access,s.live_mode,s.amount_minor,s.currency,s.started_at,s.paid_until,s.period_end,s.synced_at,(s.sync_error IS NOT NULL) AS sync_warning,(SELECT count(*) FROM public.billing_invoices i WHERE i.organization_id=o.id AND i.status IN ('open','uncollectible') AND i.amount_due>i.amount_paid) AS unpaid_invoices,(SELECT count(*) FROM public.platform_support_tickets t WHERE t.organization_id=o.id AND t.status NOT IN ('RESOLVED','CLOSED')) AS open_support"+where+" ORDER BY o.id DESC LIMIT 25 OFFSET ?",q,page*25);
  return Map.of("items",rows,"total",total,"page",page,"size",25);
 }
 @Transactional(readOnly=true) public Map<String,Object> billingDetail(Long id,int page) {
  platformTeam.requireBilling();var result=new LinkedHashMap<>(billing.summary(id,page));
  result.put("events",jdbc.queryForList("SELECT id,type,actor,details,processed_at FROM public.billing_events WHERE organization_id=? ORDER BY processed_at DESC NULLS LAST,id DESC LIMIT 25 OFFSET ?",id,page*25));
  result.put("eventTotal",jdbc.queryForObject("SELECT count(*) FROM public.billing_events WHERE organization_id=?",Long.class,id));
  result.put("emailNotices",jdbc.queryForList("SELECT kind,period_end,recipient,status,attempts,created_at,sent_at,next_attempt_at,last_error FROM public.billing_notices WHERE organization_id=? ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?",id,page*25));
  result.put("emailNoticeTotal",jdbc.queryForObject("SELECT count(*) FROM public.billing_notices WHERE organization_id=?",Long.class,id));
  result.put("recordedPayments",jdbc.queryForList("SELECT upper(currency) AS currency,CASE WHEN live_mode=true THEN 'LIVE' WHEN live_mode=false THEN 'TEST' ELSE 'UNKNOWN' END AS mode,coalesce(sum(amount_paid),0) AS amount_minor FROM public.billing_invoices WHERE organization_id=? AND status='paid' GROUP BY upper(currency),live_mode ORDER BY upper(currency),mode",id));
  return result;
 }
 @Transactional(readOnly=true) public Map<String,Object> supportList(Long requested,int page,String status) {
  Long id=organization(requested);var args=new ArrayList<Object>();String where=" WHERE 1=1";
  if(id!=null){where+=" AND organization_id=?";args.add(id);}
  if(!status.isBlank()){where+=" AND status=?";args.add(status);}
  Long total=jdbc.queryForObject("SELECT count(*) FROM public.platform_support_tickets"+where,Long.class,args.toArray());
  args.add(25);args.add(page*25);
  var rows=jdbc.queryForList("SELECT id,organization_id,organization_name,subject,category,priority,status,assigned_to,created_by,created_at,updated_at,first_response_at,resolved_at FROM public.platform_support_tickets"+where+" ORDER BY updated_at DESC,id DESC LIMIT ? OFFSET ?",args.toArray());
  return Map.of("items",rows,"total",total,"page",page,"size",25);
 }
 private PlatformSupportTicket ticket(Long id,boolean lock){var t=(lock?tickets.lockById(id):tickets.findById(id)).orElseThrow(()->new ResourceNotFoundException("Support request",id));if(!platform())security.requireTenantOwner(t.getOrganizationId());return t;}
 @Transactional(readOnly=true) public Map<String,Object> detail(Long id,int page){var t=ticket(id,false);var replies=messages.findByTicketIdOrderByIdDesc(id,PageRequest.of(page,25));return Map.of("ticket",t,"messages",replies.getContent(),"messageTotal",replies.getTotalElements(),"page",page);}
 private void message(PlatformSupportTicket t,String body,String kind){var m=new PlatformSupportMessage();m.setTicketId(t.getId());m.setBody(body);m.setAuthor(actor());m.setPlatformReply(platform());m.setKind(kind);m.setCreatedAt(Instant.now());messages.save(m);}
 @Transactional public Map<String,Object> create(Long orgId,String subject,String category,String priority,String body){
  Long org=organization(orgId);if(org==null)throw new BadRequestException("Select an organization");
  var now=Instant.now();var t=new PlatformSupportTicket();t.setOrganizationId(org);t.setOrganizationName(name(org));t.setSubject(subject.strip());t.setCategory(category);t.setPriority(priority);t.setStatus("OPEN");t.setCreatedBy(actor());t.setCreatedAt(now);t.setUpdatedAt(now);tickets.save(t);message(t,body.strip(),"MESSAGE");return detail(t.getId(),0);
 }
 @Transactional public Map<String,Object> reply(Long id,String body){var t=ticket(id,true);if(t.getStatus().equals("CLOSED"))throw new BadRequestException("This request is closed. Ask the platform team to reopen it.");
  if(platform() && t.getFirstResponseAt()==null)t.setFirstResponseAt(Instant.now());
  t.setStatus(platform()?"WAITING_CUSTOMER":"WAITING_SUPPORT");t.setResolvedAt(null);t.setUpdatedAt(Instant.now());message(t,body.strip(),"MESSAGE");return detail(id,0);
 }
 @Transactional public Map<String,Object> update(Long id,String status,String priority,boolean assignToMe,String reason){platformOnly();var t=ticket(id,true);String previous=t.getStatus();String previousPriority=t.getPriority();t.setStatus(status);t.setPriority(priority);if(assignToMe)t.setAssignedTo(actor());t.setUpdatedAt(Instant.now());
  t.setResolvedAt(Set.of("RESOLVED","CLOSED").contains(status)?(t.getResolvedAt()==null?Instant.now():t.getResolvedAt()):null);
  message(t,"Status: "+previous+" → "+status+"; priority: "+previousPriority+" → "+priority+(assignToMe?"; assigned to "+actor():"")+". "+reason.strip(),"UPDATE");return detail(id,0);
 }
}
