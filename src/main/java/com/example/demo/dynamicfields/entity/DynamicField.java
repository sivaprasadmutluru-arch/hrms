package com.example.demo.dynamicfields.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "dynamic_fields")
@Getter
@Setter
public class DynamicField extends BaseEntity {

    @Column(name = "model", length = 100)
    private String model;

    @Column(name = "verbose_name", length = 30)
    private String verboseName;

    @Column(name = "field_name", length = 30)
    private String fieldName;

    /**
     * Type values: "1"=char, "2"=int, "3"=text, "4"=date, "5"=file
     */
    @Column(name = "type", length = 50)
    private String type;

    @Column(name = "is_required")
    private boolean isRequired = false;

    @Column(name = "remove_column")
    private boolean removeColumn = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "dynamic_field_choices",
        joinColumns = @JoinColumn(name = "field_id"),
        inverseJoinColumns = @JoinColumn(name = "choice_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private List<Choice> choices = new ArrayList<>();
}
