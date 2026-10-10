package com.example.demo.carr.service;

import com.example.demo.auth.repository.UserRepository;
import com.example.demo.carr.entity.CarrResponsibility;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.notification.entity.Notification.NotificationType;
import com.example.demo.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import java.util.*;

/** Uses the existing HRMS notification store and mail service, with task links. */
@Service @RequiredArgsConstructor
public class CarrTaskNotifier {
    private final NotificationService notifications;
    private final UserRepository users;
    private final ApplicationEventPublisher events;
    public record TaskMail(String schema, Long companyId, Long recipientId, String title, String message) {}

    public void employee(CarrResponsibility task, String title, String message) {
        var user = task.getAccountableEmployee().getUser();
        if (user != null) send(task, List.of(user.getId()), title, message);
    }
    public void manager(CarrResponsibility task, String title, String message) {
        Long id = task.getReviewerUserId();
        if (id == null && task.getCarr().getManager() != null && task.getCarr().getManager().getUser() != null)
            id = task.getCarr().getManager().getUser().getId();
        if (id != null) send(task, List.of(id), title, message);
    }
    private void send(CarrResponsibility task, Collection<Long> recipients, String title, String message) {
        for (Long recipient : new LinkedHashSet<>(recipients)) {
            if (recipient == null || users.findById(recipient).filter(u -> u.isActive()).isEmpty()) continue;
            String body = task.getStatement() + ": " + message;
            notifications.send(recipient, title, body, NotificationType.GENERAL, "carr_task", task.getId(), task.getCarr().getCompany());
            events.publishEvent(new TaskMail(TenantContext.getTenant(), task.getCarr().getCompany().getId(), recipient, title, body));
        }
    }
}
