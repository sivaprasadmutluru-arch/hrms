package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "mail_automations")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MailAutomation extends BaseEntity {

    @Column(name = "title", nullable = false, unique = true, length = 256)
    private String title;

    @Column(name = "model", length = 100)
    private String model;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger", length = 20)
    private AutomationTrigger trigger;

    @Column(name = "mail_to", columnDefinition = "TEXT")
    private String mailTo;

    @Column(name = "mail_details", length = 250)
    private String mailDetails;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_channel", length = 50)
    private DeliveryChannel deliveryChannel = DeliveryChannel.EMAIL;

    @Column(name = "condition_querystring", columnDefinition = "TEXT")
    private String conditionQuerystring;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mail_template_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private MailTemplate mailTemplate;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "mail_automation_also_sent_to",
        joinColumns = @JoinColumn(name = "automation_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<Employee> alsoSentTo = new HashSet<>();

    public enum AutomationTrigger {
        ON_CREATE, ON_UPDATE, ON_DELETE
    }

    public enum DeliveryChannel {
        EMAIL, NOTIFICATION, BOTH
    }
}
