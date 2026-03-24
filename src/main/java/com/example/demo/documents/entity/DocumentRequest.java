package com.example.demo.documents.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "document_requests")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class DocumentRequest extends BaseEntity {

    @Column(name = "title", nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_format")
    private DocumentFormat documentFormat = DocumentFormat.ANY;

    @Column(name = "max_size_mb")
    private Integer maxSizeMb;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "document_request_employees",
            joinColumns = @JoinColumn(name = "document_request_id"),
            inverseJoinColumns = @JoinColumn(name = "employee_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private List<Employee> employees = new ArrayList<>();

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    public enum DocumentFormat {
        ANY, PDF, DOCX, XLSX, JPG, PNG
    }
}
