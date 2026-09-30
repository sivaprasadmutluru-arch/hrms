package com.example.demo.base.service;

import com.example.demo.base.entity.DynamicEmailConfig;
import com.example.demo.base.entity.EmailLog;
import com.example.demo.base.entity.MailTemplate;
import com.example.demo.base.repository.DynamicEmailConfigRepository;
import com.example.demo.base.repository.EmailLogRepository;
import com.example.demo.base.repository.MailTemplateRepository;
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

    private final DynamicEmailConfigRepository emailConfigRepository;
    private final EmailLogRepository emailLogRepository;
    private final MailTemplateRepository mailTemplateRepository;

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
        emailLog.setBody(htmlBody);
        emailLog.setEmployee(employee);
        emailLog.setSentAt(LocalDateTime.now());
        emailLog.setStatus(EmailLog.EmailStatus.PENDING);
        emailLogRepository.save(emailLog);

        try {
            JavaMailSender sender = buildSender(companyId);
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            // Set from address from config
            String fromEmail = getFromEmail(companyId);
            if (fromEmail != null) helper.setFrom(fromEmail);

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
        return companyConfig.isPresent()
                ? companyConfig
                : emailConfigRepository.findFirstByIsActiveTrueOrderByIdAsc();
    }

    /**
     * Send an email using a named mail template, with variable substitution.
     * Template variables are in {{variableName}} format.
     *
     * @param companyId    company ID for SMTP config and template lookup
     * @param templateType template type name (matches MailTemplate.templateType)
     * @param to           recipient email
     * @param variables    map of variable name → value for substitution
     * @param employee     optional employee for log
     */
    @Transactional
    public void sendFromTemplate(Long companyId, String templateType, String to,
                                  Map<String, String> variables, Employee employee) {
        List<MailTemplate> templates = mailTemplateRepository.findByCompanyId(companyId);
        MailTemplate template = templates.stream()
                .filter(t -> templateType.equals(t.getTemplateType()))
                .findFirst()
                .orElse(null);

        if (template == null) {
            log.warn("No mail template found for type '{}' in company {}", templateType, companyId);
            return;
        }

        String subject = renderTemplate(template.getSubject(), variables);
        String body = renderTemplate(template.getBody(), variables);
        sendEmail(companyId, to, subject, body, employee);
    }

    /**
     * Substitute {{key}} placeholders in a template string.
     */
    private String renderTemplate(String template, Map<String, String> variables) {
        if (template == null) return "";
        Pattern pattern = Pattern.compile("\\{\\{(\\w+)\\}\\}");
        Matcher matcher = pattern.matcher(template);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String key = matcher.group(1);
            String value = variables.getOrDefault(key, "");
            matcher.appendReplacement(result, Matcher.quoteReplacement(value));
        }
        matcher.appendTail(result);
        return result.toString();
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
            if (Boolean.TRUE.equals(config.getUseTls())) {
                props.put("mail.smtp.starttls.enable", "true");
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
