package com.example.demo.carr.service;

import com.example.demo.auth.repository.UserRepository;
import com.example.demo.base.service.EmailService;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.event.*;
import org.springframework.web.util.HtmlUtils;

/** Mail is optional and runs only after a successful task transaction commits. */
@Component @RequiredArgsConstructor @Slf4j
public class CarrTaskEmailListener {
    private final EmailService mail;
    private final UserRepository users;
    private final EmployeeRepository employees;
    private final PlatformTransactionManager transactionManager;
    @Value("${carr.tasks.email-enabled:true}") private boolean enabled;

    @Async @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT)
    public void deliver(CarrTaskNotifier.TaskMail event) {
        if (!enabled) return;
        String previous = TenantContext.getTenant();
        try {
            TenantContext.setTenant(event.schema());
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                if (!mail.hasActiveSmtpConfig(event.companyId())) return;
                users.findById(event.recipientId()).filter(u -> u.isActive() && u.getEmail()!=null).ifPresent(user ->
                    mail.sendEmail(event.companyId(), user.getEmail(), event.title(),
                        "<p>" + HtmlUtils.htmlEscape(event.message()) + "</p><p>Open My Tasks in GRECHA HRMS to view the task.</p>",
                        employees.findByUserId(user.getId()).orElse(null)));
            });
        } catch (Exception error) { log.warn("CARR task mail failed for company {}: {}", event.companyId(), error.getClass().getSimpleName()); }
        finally { TenantContext.setTenant(previous); }
    }
}
