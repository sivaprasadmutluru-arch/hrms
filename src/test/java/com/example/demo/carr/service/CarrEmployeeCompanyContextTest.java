package com.example.demo.carr.service;

import com.example.demo.base.entity.*;
import com.example.demo.carr.dto.CarrDtos.*;
import com.example.demo.carr.repository.CarrRoleTemplateRepository;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CarrEmployeeCompanyContextTest {
    @Mock EmployeeRepository employeeRepo;
    @Mock CarrKpiEngine engine;
    @Mock CarrRoleTemplateRepository templateRepo;
    @InjectMocks CarrService service;
    Employee employee=new Employee();
    @BeforeEach void setup(){var company=new Company();company.setId(2L);employee.setId(13L);employee.setCompany(company);var department=new Department();department.setId(1L);employee.setDepartment(department);var position=new JobPosition();position.setName("Software Engineer");employee.setJobPosition(position);when(employeeRepo.findById(13L)).thenReturn(Optional.of(employee));}
    @AfterEach void clear(){CompanyContext.clear();}
    KpiSuggestionRequest request(){return new KpiSuggestionRequest(13L,1L,null,"Software Engineer",null,LocalDate.of(2026,10,1),LocalDate.of(2026,10,31),"Monthly");}
    @Test void correctCompanyHeaderResolvesExistingEmployee13(){CompanyContext.set(2L);when(engine.suggest(eq(employee),any(),eq(""))).thenReturn(List.of());assertThat(service.suggestKpis(request())).isEmpty();verify(engine).suggest(eq(employee),any(),eq(""));}
    @Test void anotherCompanyStillCannotReadTheEmployee(){CompanyContext.set(3L);assertThatThrownBy(()->service.suggestKpis(request())).isInstanceOf(ResourceNotFoundException.class);verifyNoInteractions(engine);}
}
