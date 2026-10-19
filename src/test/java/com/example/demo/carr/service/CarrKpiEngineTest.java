package com.example.demo.carr.service;
import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.carr.dto.CarrDtos.*;
import com.example.demo.carr.entity.*;
import com.example.demo.carr.repository.*;
import com.example.demo.employee.entity.Employee;
import org.junit.jupiter.api.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CarrKpiEngineTest {
    CarrResponsibilityRepository tasks=mock(CarrResponsibilityRepository.class);
    AttendanceRepository attendance=mock(AttendanceRepository.class);
    CarrRecordRepository records=mock(CarrRecordRepository.class);
    CarrKpiRepository kpis=mock(CarrKpiRepository.class);
    CarrKpiEngine engine=new CarrKpiEngine(tasks,attendance,records,kpis);
    Employee employee=new Employee();Company company=new Company();
    LocalDate from=LocalDate.now().minusDays(20),to=LocalDate.now().minusDays(1);
    @BeforeEach void setup(){company.setId(10L);employee.setId(20L);employee.setCompany(company);}
    KpiSuggestionRequest request(String role){return new KpiSuggestionRequest(20L,null,null,role,null,from,to,"Monthly");}
    @Test void roleFamiliesProduceDistinctBalancedSuggestionsWithoutInventingActuals(){
        var examples=Map.of("Finance Manager","Budget Accuracy","HR Manager","Recruitment Efficiency","Software Developer","Code Quality","Sales Executive","Sales Target Achievement","Marketing Executive","Campaign ROI","Project Manager","Project Delivery Rate");
        examples.forEach((role,name)->{var result=engine.suggest(employee,request(role),"");assertThat(result).extracting(KpiRequest::name).contains(name).doesNotHaveDuplicates();assertThat(result.stream().mapToInt(KpiRequest::weight).sum()).isEqualTo(100);assertThat(result).allMatch(k->k.actualValue()==null);});
    }
    @Test void companyApprovedConfigurationTakesPriorityAndNeverCopiesAnotherEmployeesActual(){
        var record=new CarrRecord();record.setId(5L);record.setTitle("Finance Manager");record.setStatus(CarrStatus.APPROVED);var configured=new CarrKpi();configured.setName("Company treasury policy");configured.setTargetValue(new BigDecimal("98"));configured.setActualValue(new BigDecimal("88"));configured.setWeight(100);configured.setUnit("%");
        when(records.findByCompanyIdOrderByUpdatedAtDesc(10L)).thenReturn(List.of(record));when(kpis.findByCarrIdOrderById(5L)).thenReturn(List.of(configured));
        var result=engine.suggest(employee,request("Finance Manager"),"");assertThat(result).hasSize(1);assertThat(result.getFirst().name()).isEqualTo("Company treasury policy");assertThat(result.getFirst().actualValue()).isNull();assertThat(result.getFirst().evidence()).contains("#5");verify(records).findByCompanyIdOrderByUpdatedAtDesc(10L);
    }
    CarrResponsibility task(long id,CarrResponsibility.TaskStatus status,LocalDate due,LocalDate completed){var t=new CarrResponsibility();t.setId(id);t.setAccountableEmployee(employee);t.setDueDate(due);t.setActualCompletionDate(completed);t.setTaskStatus(status);return t;}
    @Test void taskRatesUseEmployeeDueDatesCancellationAndHistoricalCompletionCutoff(){
        var a=task(1,CarrResponsibility.TaskStatus.COMPLETED,to,to);var b=task(2,CarrResponsibility.TaskStatus.COMPLETED,to.minusDays(2),to);var late=task(3,CarrResponsibility.TaskStatus.COMPLETED,to,LocalDate.now());var cancelled=task(4,CarrResponsibility.TaskStatus.CANCELLED,to,null);var other=task(5,CarrResponsibility.TaskStatus.COMPLETED,to,to);var e=new Employee();e.setId(99L);other.setAccountableEmployee(e);
        when(tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(10L)).thenReturn(List.of(a,b,late,cancelled,other));
        assertThat(engine.measure(employee,"TASK_COMPLETION",from,to).actual()).isEqualByComparingTo("66.6667");var measured=engine.measure(employee,"TASK_ON_TIME",from,to);assertThat(measured.actual()).isEqualByComparingTo("33.3333");assertThat(measured.evidence()).contains("1 / 3","[1, 2, 3]",from.toString(),to.toString());
    }
    @Test void missingDatesOrEmptyDenominatorRemainUnscored(){assertThat(engine.measure(employee,"TASK_COMPLETION",null,to).actual()).isNull();assertThat(engine.measure(employee,"TASK_COMPLETION",from,to).actual()).isNull();when(tasks.findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(10L)).thenReturn(List.of(task(1,CarrResponsibility.TaskStatus.COMPLETED,to,null)));assertThat(engine.measure(employee,"TASK_ON_TIME",from,to).actual()).isNull();}
    @Test void attendanceUsesOnlyProcessedNonHolidayDays(){var regular=new Attendance();regular.setId(1L);regular.setCheckOut(LocalTime.of(18,0));var irregular=new Attendance();irregular.setId(2L);irregular.setCheckOut(LocalTime.of(18,0));irregular.setAttendanceStatus(Attendance.AttendanceQualityStatus.IRREGULAR);var holiday=new Attendance();holiday.setId(3L);holiday.setCheckOut(LocalTime.of(18,0));holiday.setIsHoliday(true);var open=new Attendance();open.setId(4L);when(attendance.findByCompanyIdAndEmployeeIdInAndAttendanceDateBetween(10L,List.of(20L),from,to)).thenReturn(List.of(regular,irregular,holiday,open));var result=engine.measure(employee,"ATTENDANCE_COMPLIANCE",from,to);assertThat(result.actual()).isEqualByComparingTo("50");assertThat(result.evidence()).contains("1 / 2","attendances");}
}
