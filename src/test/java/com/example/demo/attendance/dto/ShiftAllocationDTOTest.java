package com.example.demo.attendance.dto;

import com.example.demo.base.entity.ShiftAllocationRequest;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.employee.entity.Employee;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ShiftAllocationDTOTest {
    @Test
    void keepsNamesForEveryAllocationSharingTheSameShift() {
        ShiftSchedule shift = new ShiftSchedule();
        shift.setId(4L);
        shift.setName("General Shift");
        for (String name : new String[]{"First Employee", "Second Employee", "David"}) {
            Employee employee = new Employee();
            employee.setId(5L);
            employee.setFirstName(name);
            ShiftAllocationRequest allocation = new ShiftAllocationRequest();
            allocation.setEmployee(employee);
            allocation.setAllocatedShift(shift);
            var dto = ShiftAllocationDTO.from(allocation);
            assertEquals(name, dto.employee().firstName());
            assertEquals("General Shift", dto.allocatedShift().name());
            assertEquals(ShiftAllocationRequest.AllocationStatus.PENDING, dto.status());
            assertNull(dto.previousShift());
            assertNull(dto.allocatedBy());
        }
    }
}
