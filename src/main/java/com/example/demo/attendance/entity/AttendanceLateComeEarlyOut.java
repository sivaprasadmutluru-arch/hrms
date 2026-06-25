package com.example.demo.attendance.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "attendance_late_come_early_out",
        uniqueConstraints = @UniqueConstraint(columnNames = {"attendance_id", "type"}))
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AttendanceLateComeEarlyOut extends BaseEntity {

    public enum EntryType {
        LATE_COME, EARLY_OUT
    }

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "attendance_id", nullable = false)
    private Attendance attendance;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private EntryType type;

    @Column(name = "late_come", length = 10)
    private String lateCome;

    @Column(name = "early_out", length = 10)
    private String earlyOut;

    @Column(name = "late_come_second")
    private Integer lateComeSecond;

    @Column(name = "early_out_second")
    private Integer earlyOutSecond;

    /**
     * Set to true when the linked attendance is regularised.
     * Payroll queries exclude records where this is true.
     */
    @Column(name = "is_regularised")
    private Boolean isRegularised = false;
}
