package com.example.demo.carr.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name="carr_kpis") @Getter @Setter
public class CarrKpi extends BaseEntity {
    public enum Type { KPI, OKR }
    public enum Direction { INCREASE, DECREASE, MAINTAIN }
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="carr_id", nullable=false) private CarrRecord carr;
    @Column(nullable=false, length=220) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=10) private Type type = Type.KPI;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=15) private Direction direction = Direction.INCREASE;
    @Column(name="target_value", nullable=false, precision=19, scale=4) private BigDecimal targetValue;
    @Column(name="actual_value", precision=19, scale=4) private BigDecimal actualValue;
    @Column(name="metric_definition", length=1000) private String metricDefinition;
    @Column(name="generation_key", length=100) private String generationKey;
    @Column(name="manually_edited") private boolean manuallyEdited;
    @Column(length=40) private String unit;
    @Column(name="review_frequency", length=40) private String reviewFrequency = "Monthly";
    @Column(nullable=false) private int weight;
    @Column(name="due_date") private LocalDate dueDate;
    @Column(name="data_source", length=300) private String dataSource;
    @Column(length=1000) private String evidence;
}
