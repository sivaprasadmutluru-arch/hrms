package com.example.demo.attendance.dto;

import com.example.demo.attendance.entity.Attendance;
import com.example.demo.base.entity.Company;
import com.example.demo.employee.entity.Employee;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AttendanceResponseTest {

    @Test
    void biometricAttendanceUsesEmployeeBranchWhenAttendanceCompanyIsMissing() {
        Company branch = new Company();
        branch.setId(22L);
        branch.setName("Dubai Branch");

        Employee employee = new Employee();
        employee.setId(7L);
        employee.setFirstName("Test");
        employee.setLastName("Employee");
        employee.setCompany(branch);

        Attendance attendance = new Attendance();
        attendance.setId(4L);
        attendance.setEmployee(employee);
        attendance.setClockInSource("biometric");

        AttendanceResponse response = AttendanceResponse.from(attendance);

        assertThat(response.getCompanyId()).isEqualTo(22L);
        assertThat(response.getCompanyName()).isEqualTo("Dubai Branch");
    }
}
