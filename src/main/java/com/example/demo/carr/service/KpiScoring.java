package com.example.demo.carr.service;

import com.example.demo.carr.entity.CarrKpi;
import java.math.*;
import java.util.List;

/** Missing observations stay missing; an overall score requires complete coverage. */
public final class KpiScoring {
    private KpiScoring() {}
    public static BigDecimal score(CarrKpi k) {
        if(k.getMetricDefinition()==null||k.getMetricDefinition().isBlank()||k.getMetricDefinition().toLowerCase(java.util.Locale.ROOT).contains("configure "))return null;
        if (k.getActualValue()==null || k.getTargetValue()==null || k.getTargetValue().signum()<=0) return null;
        BigDecimal actual=k.getActualValue(), target=k.getTargetValue(), ratio;
        if (k.getDirection()==CarrKpi.Direction.DECREASE)
            ratio=actual.signum()==0?BigDecimal.ONE:target.divide(actual,8,RoundingMode.HALF_UP);
        else if (k.getDirection()==CarrKpi.Direction.MAINTAIN)
            ratio=BigDecimal.ONE.subtract(actual.subtract(target).abs().divide(target,8,RoundingMode.HALF_UP));
        else ratio=actual.divide(target,8,RoundingMode.HALF_UP);
        return ratio.multiply(BigDecimal.valueOf(100)).max(BigDecimal.ZERO).min(BigDecimal.valueOf(100)).setScale(2,RoundingMode.HALF_UP);
    }
    public static String status(CarrKpi k,java.time.LocalDate start,java.time.LocalDate end,java.time.LocalDate today) {
        if(start!=null&&today.isBefore(start))return "NOT_STARTED";
        BigDecimal score=score(k);if(score!=null&&score.compareTo(BigDecimal.valueOf(100))>=0)return "COMPLETED";
        java.time.LocalDate due=k.getDueDate()==null?end:k.getDueDate();
        if(due!=null&&today.isAfter(due))return "OVERDUE";
        if("IN_PROGRESS".equals(k.getTrackingStatus()))return "IN_PROGRESS";
        return k.getActualValue()==null||k.getActualValue().signum()==0?"NOT_STARTED":"IN_PROGRESS";
    }
    public static BigDecimal weighted(CarrKpi k) {
        BigDecimal score=score(k);
        return score==null?null:score.multiply(BigDecimal.valueOf(k.getWeight())).divide(BigDecimal.valueOf(100),4,RoundingMode.HALF_UP);
    }
    public static BigDecimal overall(List<CarrKpi> kpis) {
        if(kpis.isEmpty() || kpis.stream().mapToInt(CarrKpi::getWeight).sum()!=100 || kpis.stream().anyMatch(k->score(k)==null)) return null;
        return kpis.stream().map(KpiScoring::weighted).reduce(BigDecimal.ZERO,BigDecimal::add).setScale(2,RoundingMode.HALF_UP);
    }
}
