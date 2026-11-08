package com.example.demo.base.service;

import com.example.demo.base.entity.DynamicEmailConfig;
import com.example.demo.base.entity.EmailLog;
import com.example.demo.base.entity.MailTemplate;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.DynamicEmailConfigRepository;
import com.example.demo.base.repository.EmailLogRepository;
import com.example.demo.base.repository.MailTemplateRepository;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.employee.entity.Employee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    public static final String ACCOUNT_READY_TEMPLATE = "ACCOUNT_READY";
    public static final String EMPLOYEE_ACCOUNT_CREATED_TEMPLATE = "EMPLOYEE_ACCOUNT_CREATED";

    private final DynamicEmailConfigRepository emailConfigRepository;
    private final EmailLogRepository emailLogRepository;
    private final MailTemplateRepository mailTemplateRepository;
    private final CompanyRepository companyRepository;
    private final org.springframework.core.env.Environment environment;

    public String loginUrl() { return applicationUrl() + "/login"; }
    public String passwordResetUrl() { return applicationUrl() + "/forgot-password"; }
    public String termsUrl() { return applicationUrl() + "/terms-and-conditions"; }
    public String privacyUrl() { return applicationUrl() + "/privacy-policy"; }

    private String applicationUrl() {
        return environment.getProperty("app.frontend-url", "http://localhost:5173").replaceAll("/+$", "");
    }

    /** Creates editable defaults once per tenant; never overwrites a client's custom copy. */
    @Transactional
    public void ensureOnboardingTemplates(Company company) {
        Company owner = company.isBranch() && company.getParentCompanyId() != null
                ? companyRepository.findByIdPublic(company.getParentCompanyId()).orElse(company) : company;

        String accountReadyBody = "<p>Hello <strong>{{recipientName}}</strong>,</p>"
                + "<p>Welcome to <strong>AccrueHRMS</strong>! Your organization workspace for <strong>{{companyName}}</strong> has been provisioned and is active.</p>"
                + "<div style=\"background:#f8fafc;border:1px solid #dce8f4;border-radius:12px;padding:18px 22px;margin:20px 0;\">"
                + "<p style=\"margin:0 0 12px;font-size:13px;font-weight:700;color:#173858;text-transform:uppercase;letter-spacing:0.5px;\">Workspace Access Details</p>"
                + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"font-size:14px;color:#294762;\">"
                + "<tr><td style=\"padding:5px 0;color:#6b8095;width:38%;\">Organization</td><td style=\"padding:5px 0;font-weight:700;color:#173858;\">{{companyName}}</td></tr>"
                + "<tr><td style=\"padding:5px 0;color:#6b8095;\">Admin Username / Email</td><td style=\"padding:5px 0;font-weight:700;color:#173858;\">{{username}}</td></tr>"
                + "<tr><td style=\"padding:5px 0;color:#6b8095;\">Login Portal</td><td style=\"padding:5px 0;\"><a href=\"{{loginUrl}}\" style=\"color:#286cb2;font-weight:600;text-decoration:none;\">{{loginUrl}}</a></td></tr>"
                + "</table></div>"
                + "<p style=\"text-align:center;margin:28px 0;\">"
                + "<a href=\"{{loginUrl}}\" style=\"display:inline-block;background:#286cb2;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 30px;border-radius:8px;box-shadow:0 4px 14px rgba(40,108,178,0.25);\">Launch Your Workspace</a>"
                + "</p>"
                + "<div style=\"background:#eff6ff;border-left:4px solid #286cb2;padding:12px 16px;border-radius:0 8px 8px 0;margin:22px 0;font-size:13px;color:#1e40af;\">"
                + "<strong>Security Tip:</strong> To set or update your password at any time, use the <a href=\"{{passwordResetUrl}}\" style=\"color:#1d4ed8;font-weight:700;text-decoration:underline;\">Forgot / Reset Password</a> link."
                + "</div>"
                + "<div style=\"margin:28px 0 18px;\">"
                + "<p style=\"margin:0 0 14px;font-size:15px;font-weight:700;color:#173858;\">Getting Started Checklist (4 Quick Steps):</p>"
                + "<ol style=\"margin:0;padding-left:20px;color:#38536e;font-size:13.5px;line-height:1.7;\">"
                + "<li style=\"margin-bottom:8px;\"><strong>Complete Organization Setup:</strong> Upload your company logo, set official working hours, weekend shifts, and holiday calendars under <em>Setup &rarr; Company</em>.</li>"
                + "<li style=\"margin-bottom:8px;\"><strong>Add or Import Employees:</strong> Add team members individually or upload in bulk using Excel/CSV under <em>Workforce &rarr; Employees</em>.</li>"
                + "<li style=\"margin-bottom:8px;\"><strong>Configure Leave &amp; Attendance:</strong> Allocate leave quotas, define shifts, and sync biometric or web check-in policies under <em>Attendance</em> and <em>Leave</em>.</li>"
                + "<li><strong>Run Payroll &amp; Compliance:</strong> Define salary components, compute statutory deductions (PF, ESI, TDS), and generate payslips under <em>Payroll</em>.</li>"
                + "</ol></div>"
                + "<div style=\"border-top:1px solid #dce8f4;padding-top:18px;margin-top:26px;font-size:12px;color:#71879d;line-height:1.6;text-align:center;\">"
                + "<p style=\"margin:0 0 6px;\">By signing in and using AccrueHRMS, you acknowledge and agree to our <a href=\"{{termsUrl}}\" style=\"color:#286cb2;text-decoration:underline;\">Terms and Conditions</a> and <a href=\"{{privacyUrl}}\" style=\"color:#286cb2;text-decoration:underline;\">Privacy Policy</a>.</p>"
                + "<p style=\"margin:0;\">Need assistance getting started? Contact our dedicated support team at <a href=\"mailto:support@accruetechnologies.com\" style=\"color:#286cb2;text-decoration:none;font-weight:600;\">support@accruetechnologies.com</a>.</p>"
                + "</div>";

        ensureTemplate(owner, ACCOUNT_READY_TEMPLATE, "Account ready", "Welcome to AccrueHRMS! Your {{companyName}} workspace is ready", accountReadyBody);

        String employeeCreatedBody = "<p>Hello <strong>{{recipientName}}</strong>,</p>"
                + "<p>Your employee account for <strong>{{companyName}}</strong> has been created on <strong>AccrueHRMS</strong>.</p>"
                + "<div style=\"background:#f8fafc;border:1px solid #dce8f4;border-radius:12px;padding:18px 22px;margin:20px 0;\">"
                + "<p style=\"margin:0 0 10px;font-size:13px;font-weight:700;color:#173858;text-transform:uppercase;letter-spacing:0.5px;\">Account Details</p>"
                + "<p style=\"margin:0 0 6px;font-size:14px;color:#294762;\">Username: <strong>{{username}}</strong></p>"
                + "<p style=\"margin:0;font-size:14px;color:#294762;\">Workspace: <strong>{{companyName}}</strong></p>"
                + "</div>"
                + "<p style=\"text-align:center;margin:24px 0;\">"
                + "<a href=\"{{passwordResetUrl}}\" style=\"display:inline-block;background:#286cb2;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:8px;\">Set Your Password</a>"
                + "</p>"
                + "<p style=\"font-size:13px;color:#6b8095;text-align:center;\">After setting your password, sign in anytime at <a href=\"{{loginUrl}}\" style=\"color:#286cb2;font-weight:600;\">{{loginUrl}}</a> to view payslips, request leave, and check attendance.</p>"
                + "<div style=\"border-top:1px solid #dce8f4;padding-top:14px;margin-top:20px;font-size:12px;color:#71879d;text-align:center;\">"
                + "<p style=\"margin:0;\">Governed by AccrueHRMS <a href=\"{{termsUrl}}\" style=\"color:#286cb2;text-decoration:underline;\">Terms and Conditions</a> and <a href=\"{{privacyUrl}}\" style=\"color:#286cb2;text-decoration:underline;\">Privacy Policy</a>.</p>"
                + "</div>";

        ensureTemplate(owner, EMPLOYEE_ACCOUNT_CREATED_TEMPLATE, "Employee account created", "Your {{companyName}} employee account is ready", employeeCreatedBody);
        ensureTemplate(owner, "LEAVE_APPROVED", "Leave approved", "Your leave request was approved",
                "<p>Hello {{employeeName}},</p><p>Your {{leaveType}} leave from <strong>{{startDate}}</strong> to <strong>{{endDate}}</strong> has been approved.</p>");
        ensureTemplate(owner, "LEAVE_REJECTED", "Leave rejected", "Update on your leave request",
                "<p>Hello {{employeeName}},</p><p>Your {{leaveType}} leave from <strong>{{startDate}}</strong> to <strong>{{endDate}}</strong> was not approved.</p><p>Reason: {{reason}}</p>");
        ensureTemplate(owner, "PAYSLIP_GENERATED", "Payslip available", "Your payslip is ready",
                "<p>Hello {{employeeName}},</p><p>Your payslip for {{period}} is ready in your employee portal.</p><p>Net pay: {{netPay}}</p>");
    }

    private void ensureTemplate(Company company, String type, String title, String subject, String body) {
        var existing = mailTemplateRepository.findAll().stream()
                .filter(template -> type.equals(template.getTemplateType()))
                .findFirst();
        if (existing.isPresent()) {
            MailTemplate template = existing.get();
            if (template.getBody() != null && (template.getBody().length() < 500 || template.getBody().contains("AccrueHr") || template.getBody().contains("legacy"))) {
                template.setTitle(title);
                template.setSubject(subject);
                template.setBody(body);
                mailTemplateRepository.save(template);
            }
            return;
        }
        MailTemplate template = new MailTemplate();
        template.setCompany(company);
        template.setTemplateType(type);
        template.setTitle(title);
        template.setSubject(subject);
        template.setBody(body);
        mailTemplateRepository.save(template);
    }

    /**
     * Send an email using the per-company SMTP configuration.
     * Falls back to the application-level JavaMailSender if no company config is found.
     *
     * @param companyId     company to look up SMTP config for
     * @param to            recipient email address
     * @param subject       email subject
     * @param htmlBody      HTML body
     * @param employee      optional employee to associate with the log
     */
    @Transactional
    public boolean sendEmail(Long companyId, String to, String subject, String htmlBody, Employee employee) {
        EmailLog emailLog = new EmailLog();
        emailLog.setRecipientEmail(to);
        emailLog.setSubject(subject);
        String renderedBody = renderForCompany(companyId, subject, htmlBody);
        emailLog.setBody(renderedBody);
        emailLog.setEmployee(employee);
        emailLog.setSentAt(LocalDateTime.now());
        emailLog.setStatus(EmailLog.EmailStatus.PENDING);
        emailLogRepository.save(emailLog);

        try {
            if(!hasActiveSmtpConfig(companyId)) {
                emailLog.setStatus(EmailLog.EmailStatus.FAILED);emailLog.setErrorMessage("SMTP is not configured for this company or application");emailLogRepository.save(emailLog);return false;
            }
            JavaMailSender sender = buildSender(companyId);
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(renderedBody, true);

            // Set from address from config
            String fromEmail = getFromEmail(companyId);
            String fromName = resolveActiveConfig(companyId).map(DynamicEmailConfig::getFromName).orElse(null);
            if (fromEmail != null) {
                if (fromName != null && !fromName.isBlank()) helper.setFrom(fromEmail, fromName);
                else helper.setFrom(fromEmail);
            }

            sender.send(message);
            emailLog.setStatus(EmailLog.EmailStatus.SENT);
            emailLogRepository.save(emailLog);
            return true;
        } catch (Exception e) {
            emailLog.setStatus(EmailLog.EmailStatus.FAILED);
            emailLog.setErrorMessage(e.getMessage());
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
        emailLogRepository.save(emailLog);
        return false;
    }

    /**
     * Send an email with a file attachment using per-company SMTP configuration.
     */
    @Transactional
    public boolean sendEmailWithAttachment(Long companyId, String to, String subject, String htmlBody,
                                           Employee employee, String attachmentFilename,
                                           byte[] attachmentBytes, String contentType) {
        EmailLog emailLog = new EmailLog();
        emailLog.setRecipientEmail(to);
        emailLog.setSubject(subject);
        String renderedBody = renderForCompany(companyId, subject, htmlBody);
        emailLog.setBody(renderedBody);
        emailLog.setEmployee(employee);
        emailLog.setSentAt(LocalDateTime.now());
        emailLog.setStatus(EmailLog.EmailStatus.PENDING);
        emailLogRepository.save(emailLog);

        try {
            if (!hasActiveSmtpConfig(companyId)) {
                emailLog.setStatus(EmailLog.EmailStatus.FAILED);
                emailLog.setErrorMessage("SMTP is not configured for this company or application");
                emailLogRepository.save(emailLog);
                return false;
            }
            JavaMailSender sender = buildSender(companyId);
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(renderedBody, true);

            String fromEmail = getFromEmail(companyId);
            String fromName = resolveActiveConfig(companyId).map(DynamicEmailConfig::getFromName).orElse(null);
            if (fromEmail != null) {
                if (fromName != null && !fromName.isBlank()) helper.setFrom(fromEmail, fromName);
                else helper.setFrom(fromEmail);
            }

            if (attachmentBytes != null && attachmentFilename != null) {
                helper.addAttachment(attachmentFilename,
                        new org.springframework.core.io.ByteArrayResource(attachmentBytes),
                        contentType != null ? contentType : "application/pdf");
            }

            sender.send(message);
            emailLog.setStatus(EmailLog.EmailStatus.SENT);
            emailLogRepository.save(emailLog);
            return true;
        } catch (Exception e) {
            emailLog.setStatus(EmailLog.EmailStatus.FAILED);
            emailLog.setErrorMessage(e.getMessage());
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
        emailLogRepository.save(emailLog);
        return false;
    }

    /** Whether this company can deliver email rather than falling back to the no-op sender. */
    public boolean hasActiveSmtpConfig(Long companyId) {
        return resolveActiveConfig(companyId)
                .map(config -> Boolean.TRUE.equals(config.getIsActive())
                        && config.getHost() != null && !config.getHost().isBlank()
                        && config.getUsername() != null && !config.getUsername().isBlank()
                        && config.getPassword() != null && !config.getPassword().isBlank())
                .orElse(false);
    }

    private java.util.Optional<DynamicEmailConfig> resolveActiveConfig(Long companyId) {
        java.util.Optional<DynamicEmailConfig> companyConfig = companyId == null
                ? java.util.Optional.empty()
                : emailConfigRepository.findFirstByCompanyId(companyId)
                        .filter(config -> Boolean.TRUE.equals(config.getIsActive()));
        if (companyConfig.isEmpty() && companyId != null) {
            var company = companyRepository.findByIdPublic(companyId).orElse(null);
            if (company != null && company.isBranch() && company.getParentCompanyId() != null)
                companyConfig = emailConfigRepository.findFirstByCompanyId(company.getParentCompanyId())
                        .filter(config -> Boolean.TRUE.equals(config.getIsActive()));
        }
        // Platform SMTP is an explicit fallback; never borrow another company's credentials.
        return companyConfig.isPresent() ? companyConfig : applicationSmtpConfig();
    }

    private java.util.Optional<DynamicEmailConfig> applicationSmtpConfig() {
        String username = environment.getProperty("spring.mail.username", "");
        String password = environment.getProperty("spring.mail.password", "");
        String host = environment.getProperty("spring.mail.host", "");
        if (username.isBlank() || password.isBlank() || host.isBlank()) return java.util.Optional.empty();
        DynamicEmailConfig config = new DynamicEmailConfig();
        config.setHost(host);
        config.setPort(environment.getProperty("spring.mail.port", Integer.class, 587));
        config.setUsername(username);
        config.setPassword(password);
        config.setFromEmail(environment.getProperty("app.mail.from-email", username));
        config.setFromName(environment.getProperty("app.mail.from-name", "AccrueHRMS"));
        config.setUseTls(environment.getProperty("spring.mail.properties.mail.smtp.starttls.enable", Boolean.class, true));
        config.setUseSsl(environment.getProperty("spring.mail.properties.mail.smtp.ssl.enable", Boolean.class, false));
        config.setIsActive(true);
        return java.util.Optional.of(config);
    }

    /**
     * Asynchronously send an email without blocking the calling thread.
     */
    @org.springframework.scheduling.annotation.Async
    public void sendEmailAsync(Long companyId, String to, String subject, String htmlBody, Employee employee) {
        sendEmail(companyId, to, subject, htmlBody, employee);
    }

    /**
     * Asynchronously send an email with an attachment without blocking the calling thread.
     */
    @org.springframework.scheduling.annotation.Async
    public void sendEmailWithAttachmentAsync(Long companyId, String to, String subject, String htmlBody,
                                            Employee employee, String attachmentFilename,
                                            byte[] attachmentBytes, String contentType) {
        sendEmailWithAttachment(companyId, to, subject, htmlBody, employee, attachmentFilename, attachmentBytes, contentType);
    }

    /** Platform subscription and account notices retain the AccrueHRMS sender identity. */
    public boolean sendPlatformEmail(Long companyId, String to, String subject, String htmlBody, Employee employee) {
        return sendEmail(companyId, to, subject, BrandedEmailRenderer.render(subject, htmlBody), employee);
    }

    private String renderForCompany(Long companyId, String subject, String htmlBody) {
        if (companyId == null) return BrandedEmailRenderer.render(subject, htmlBody);
        return companyRepository.findEmailBrand(companyId)
                .map(brand -> BrandedEmailRenderer.render(subject, htmlBody, brand.getName(), brand.getColor()))
                .orElseGet(() -> BrandedEmailRenderer.render(subject, htmlBody));
    }

    /**
     * Send an email using a named mail template, with variable substitution.
     * Template variables are in {{variableName}} format.
     * Executes asynchronously so callers/event listeners are not blocked.
     *
     * @param companyId    company ID for SMTP config and template lookup
     * @param templateType template type name (matches MailTemplate.templateType)
     * @param to           recipient email
     * @param variables    map of variable name → value for substitution
     * @param employee     optional employee for log
     */
    @org.springframework.scheduling.annotation.Async
    public void sendFromTemplate(Long companyId, String templateType, String to,
                                  Map<String, String> variables, Employee employee) {
        Company company = companyId == null ? null : companyRepository.findByIdPublic(companyId).orElse(null);
        if (company == null) {
            log.warn("No company found for mail template type '{}'", templateType);
            return;
        }
        Long headOfficeId = company.isBranch() ? company.getParentCompanyId() : companyId;
        Company headOffice = company.isBranch() ? companyRepository.findByIdPublic(headOfficeId).orElse(null) : company;
        if (headOffice == null || headOffice.getSchemaName() == null) {
            log.warn("No organization workspace found for mail template type '{}' in company {}", templateType, companyId);
            return;
        }
        String previousTenant = TenantContext.getTenant();
        TenantContext.setTenant(headOffice.getSchemaName());
        try {
        List<MailTemplate> templates = mailTemplateRepository.findAll();
        MailTemplate template = templates.stream()
                .filter(t -> templateType.equals(t.getTemplateType()))
                .filter(t -> t.getCompany() != null && t.getCompany().getId() != null)
                .filter(t -> headOfficeId.equals(t.getCompany().getId()) || companyId.equals(t.getCompany().getId()))
                .sorted((left, right) -> {
                    boolean leftHeadOffice = headOfficeId.equals(left.getCompany().getId());
                    boolean rightHeadOffice = headOfficeId.equals(right.getCompany().getId());
                    return Boolean.compare(rightHeadOffice, leftHeadOffice);
                })
                .findFirst().orElse(null);

        if (template == null) {
            log.warn("No mail template found for type '{}' in company {}", templateType, companyId);
            return;
        }

        Map<String, String> merged = new java.util.HashMap<>();
        merged.put("loginUrl", loginUrl());
        merged.put("passwordResetUrl", passwordResetUrl());
        String brandColor = companyRepository.findEmailBrand(companyId)
                .map(brand -> brand.getColor() == null ? "#2F73B7" : brand.getColor()).orElse("#2F73B7");
        merged.put("brandColor", brandColor);
        merged.put("brandTextColor", BrandedEmailRenderer.textColorFor(brandColor));
        merged.putAll(variables);
        String subject = renderTemplate(template.getSubject(), merged, false);
        String body = renderTemplate(template.getBody(), merged, true);
        sendEmail(companyId, to, subject, body, employee);
        } finally {
            if (TenantContext.DEFAULT_TENANT.equals(previousTenant)) TenantContext.clear();
            else TenantContext.setTenant(previousTenant);
        }
    }

    /**
     * Substitute {{key}} placeholders in a template string.
     */
    private String renderTemplate(String template, Map<String, String> variables, boolean htmlBody) {
        if (template == null) return "";
        Pattern pattern = Pattern.compile("\\{\\{(\\w+)\\}\\}");
        Matcher matcher = pattern.matcher(template);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String key = matcher.group(1);
            String value = variables.getOrDefault(key, "");
            if (htmlBody) value = escapeHtml(value);
            matcher.appendReplacement(result, Matcher.quoteReplacement(value));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private static String escapeHtml(String value) {
        return value == null ? "" : value.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }

    /**
     * Build a JavaMailSender configured from the company's DynamicEmailConfig.
     * Falls back to a minimal default SMTP if no config exists.
     */
    private JavaMailSender buildSender(Long companyId) {
        DynamicEmailConfig config = resolveActiveConfig(companyId).orElse(null);
        if (config != null && config.getHost() != null) {
            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(config.getHost());
            sender.setPort(config.getPort() != null ? config.getPort() : 587);
            sender.setUsername(config.getUsername());
            sender.setPassword(config.getPassword());

            Properties props = sender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.connectiontimeout", "10000");
            props.put("mail.smtp.timeout", "10000");
            props.put("mail.smtp.writetimeout", "10000");
            if (Boolean.TRUE.equals(config.getUseTls())) {
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.smtp.starttls.required", "true");
            }
            if (Boolean.TRUE.equals(config.getUseSsl())) {
                props.put("mail.smtp.ssl.enable", "true");
            }
            return sender;
        }
        // Return a no-op sender that logs but does not actually connect
        return new NoOpMailSender();
    }

    private String getFromEmail(Long companyId) {
        return resolveActiveConfig(companyId)
                .map(DynamicEmailConfig::getFromEmail)
                .orElse(null);
    }

    /**
     * A JavaMailSender that does nothing (used when no SMTP config is available).
     */
    private static class NoOpMailSender extends JavaMailSenderImpl {
        @Override
        public void send(MimeMessage mimeMessage) {
            // No-op: silently discard when no SMTP is configured
        }

        @Override
        public MimeMessage createMimeMessage() {
            return new MimeMessage(Session.getDefaultInstance(new Properties()));
        }
    }
}
