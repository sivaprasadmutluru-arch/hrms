package com.example.demo.carr.service;

import com.example.demo.base.entity.*;
import com.example.demo.base.repository.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CarrJobTitleCatalogTest {
    DepartmentRepository departments=mock(DepartmentRepository.class);
    JobPositionRepository positions=mock(JobPositionRepository.class);
    JobRoleRepository roles=mock(JobRoleRepository.class);
    CarrJobTitleCatalog catalog=new CarrJobTitleCatalog(departments,positions,roles);
    Department department(long id,String name){var d=new Department();d.setId(id);d.setName(name);return d;}
    @Test void departmentsHaveSpecificDesignationsAndRoleDescriptions(){
        var examples=Map.of("Human Resources (HR)","HR Manager","IT Department","Developer","Finance and Accounts","Accountant","Sales","Sales Executive","Project Management","Project Manager","Customer Support","Customer Support Executive");
        examples.forEach((department,title)->{
            var defaults=CarrJobTitleCatalog.defaults(department);
            assertThat(defaults).extracting(CarrJobTitleCatalog.Definition::name).contains(title).doesNotHaveDuplicates();
            assertThat(defaults).allSatisfy(d->{assertThat(d.purpose()).isNotBlank();assertThat(d.responsibilities()).hasSizeGreaterThanOrEqualTo(3);});
        });
    }
    @Test void unfamiliarDepartmentsStillHavePredefinedTitles(){
        assertThat(CarrJobTitleCatalog.defaults("Research Services")).extracting(CarrJobTitleCatalog.Definition::name)
            .containsExactly("Research Services Manager","Research Services Executive","Research Services Coordinator");
    }
    @Test void companyTitlesAndRolesAreMergedWithoutDuplicateDefaultTitles(){
        var hr=department(1L,"HR");var engineering=department(2L,"Engineering");
        when(departments.findByCompanyIdAndIsActiveTrue(10L)).thenReturn(List.of(hr,engineering));
        var position=new JobPosition();position.setId(5L);position.setName("HR Manager");position.setDepartment(hr);
        var role=new JobRole();role.setName("HR Business Partner");role.setJobPosition(position);
        when(positions.findByCompanyId(10L)).thenReturn(List.of(position));when(roles.findByCompanyId(10L)).thenReturn(List.of(role));
        var result=catalog.list(10L);
        assertThat(result.stream().filter(e->e.departmentId().equals(1L)&&e.name().equals("HR Manager"))).hasSize(1).allSatisfy(e->{assertThat(e.roles()).containsExactly("HR Business Partner");assertThat(e.source()).isEqualTo("Company");});
        assertThat(catalog.contains(10L,1L," HR Manager ")).isTrue();
        assertThat(catalog.contains(10L,2L,"HR Manager")).isFalse();
        assertThat(catalog.contains(10L,1L,"Respond to queries")).isFalse();
        verify(departments,atLeastOnce()).findByCompanyIdAndIsActiveTrue(10L);
        verify(positions,atLeastOnce()).findByCompanyId(10L);
    }
}
