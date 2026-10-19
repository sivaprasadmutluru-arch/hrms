package com.example.demo.carr.service;
import com.example.demo.carr.entity.CarrKpi;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

class KpiScoringTest {
    CarrKpi k(String target,String actual,int weight,CarrKpi.Direction direction){CarrKpi k=new CarrKpi();k.setTargetValue(new BigDecimal(target));k.setActualValue(actual==null?null:new BigDecimal(actual));k.setWeight(weight);k.setDirection(direction);return k;}
    @Test void missingActualIsDifferentFromMeasuredZero(){assertThat(KpiScoring.score(k("100",null,100,CarrKpi.Direction.INCREASE))).isNull();assertThat(KpiScoring.score(k("100","0",100,CarrKpi.Direction.INCREASE))).isEqualByComparingTo("0");}
    @Test void higherIsBetterIsCappedAtOneHundred(){assertThat(KpiScoring.score(k("80","100",100,CarrKpi.Direction.INCREASE))).isEqualByComparingTo("100");assertThat(KpiScoring.score(k("80","40",100,CarrKpi.Direction.INCREASE))).isEqualByComparingTo("50");}
    @Test void lowerIsBetterTreatsObservedZeroAsMeetingPositiveTarget(){assertThat(KpiScoring.score(k("5","0",100,CarrKpi.Direction.DECREASE))).isEqualByComparingTo("100");assertThat(KpiScoring.score(k("5","10",100,CarrKpi.Direction.DECREASE))).isEqualByComparingTo("50");}
    @Test void maintainingTheTargetPenalizesDeviationInEitherDirection(){assertThat(KpiScoring.score(k("100","120",100,CarrKpi.Direction.MAINTAIN))).isEqualByComparingTo("80");assertThat(KpiScoring.score(k("100","80",100,CarrKpi.Direction.MAINTAIN))).isEqualByComparingTo("80");assertThat(KpiScoring.score(k("100","300",100,CarrKpi.Direction.MAINTAIN))).isEqualByComparingTo("0");}
    @Test void overallRequiresCompleteCoverageAndBalancedWeights(){var a=k("100","80",40,CarrKpi.Direction.INCREASE);var b=k("100","100",60,CarrKpi.Direction.INCREASE);assertThat(KpiScoring.overall(List.of(a,b))).isEqualByComparingTo("92");b.setActualValue(null);assertThat(KpiScoring.overall(List.of(a,b))).isNull();assertThat(KpiScoring.overall(List.of(a))).isNull();assertThat(KpiScoring.overall(List.of())).isNull();}
}
