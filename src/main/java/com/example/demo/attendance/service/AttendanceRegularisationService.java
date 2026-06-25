package com.example.demo.attendance.service;

import com.example.demo.attendance.dto.RegularisationRequestDto;
import com.example.demo.attendance.dto.RegularisationSubmitRequest;
import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.entity.AttendanceRegularisationRequest;
import com.example.demo.attendance.entity.AttendanceRegularisationRequest.RequestStatus;
import com.example.demo.attendance.entity.AttendanceRegularisationRequest.RequestType;
import com.example.demo.attendance.repository.AttendanceRegularisationRequestRepository;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.notification.entity.Notification;
import com.example.demo.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceRegularisationService {

    private final AttendanceRegularisationRequestRepository requestRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final AttendanceService attendanceService;
    private final NotificationService notificationService;

    // ─── Employee: Submit Request ─────────────────────────────────────────────

    @Transactional
    public RegularisationRequestDto submitRequest(RegularisationSubmitRequest req, Long submittingUserId) {
        Employee employee = employeeRepository.findByUserId(submittingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", submittingUserId));

        Attendance att = attendanceRepository.findById(req.getAttendanceId())
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", req.getAttendanceId()));

        // Only IRREGULAR attendance can be regularised
        if (att.getAttendanceStatus() != Attendance.AttendanceQualityStatus.IRREGULAR) {
            throw new BadRequestException("Only IRREGULAR attendance records can be regularised");
        }

        // Ownership check
        if (!att.getEmployee().getId().equals(employee.getId())) {
            throw new BadRequestException("You can only submit requests for your own attendance");
        }

        // Block duplicate pending requests
        boolean hasPending = requestRepository.findByAttendanceId(att.getId()).stream()
                .anyMatch(r -> r.getStatus() == RequestStatus.PENDING_MANAGER
                            || r.getStatus() == RequestStatus.APPROVED_BY_MANAGER
                            || r.getStatus() == RequestStatus.PENDING_HR);
        if (hasPending) {
            throw new BadRequestException("A regularisation request is already pending for this attendance");
        }

        RequestType requestType;
        try {
            requestType = RequestType.valueOf(req.getRequestType());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid request type: " + req.getRequestType());
        }

        // Resolve reporting manager
        Employee manager = employee.getReportingManager();
        if (manager == null) {
            throw new BadRequestException("No reporting manager assigned to employee");
        }

        AttendanceRegularisationRequest request = new AttendanceRegularisationRequest();
        request.setAttendance(att);
        request.setEmployee(employee);
        request.setCompany(att.getCompany());
        request.setRequestType(requestType);
        request.setReason(req.getReason());
        request.setAttachmentUrl(req.getAttachmentUrl());
        request.setRequestedCheckIn(req.getRequestedCheckIn());
        request.setRequestedCheckOut(req.getRequestedCheckOut());
        request.setRequestedOvertimeHours(req.getRequestedOvertimeHours());
        request.setManager(manager);
        request.setStatus(RequestStatus.PENDING_MANAGER);

        AttendanceRegularisationRequest saved = requestRepository.save(request);

        // Update attendance quick-flag
        att.setRegularisationStatus(Attendance.RegularisationStatus.HAS_PENDING);
        attendanceRepository.save(att);

        // Notify manager
        notifyManager(manager, employee, saved);

        return RegularisationRequestDto.from(saved);
    }

    // ─── Manager: Approve ────────────────────────────────────────────────────

    @Transactional
    public RegularisationRequestDto approveByManager(Long requestId, String remarks, Long managerUserId) {
        AttendanceRegularisationRequest request = findRequest(requestId);
        Employee managerEmployee = employeeRepository.findByUserId(managerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", managerUserId));

        if (request.getStatus() != RequestStatus.PENDING_MANAGER) {
            throw new BadRequestException("Request is not pending manager approval");
        }

        request.setManagerApprovedBy(managerEmployee);
        request.setManagerApprovedAt(LocalDateTime.now());
        request.setManagerRemarks(remarks);
        request.setStatus(RequestStatus.PENDING_HR);

        AttendanceRegularisationRequest saved = requestRepository.save(request);

        // Notify employee: manager approved, pending HR
        notifyEmployee(request.getEmployee(), saved,
                Notification.NotificationType.REGULARISATION_APPROVED_BY_MANAGER,
                "Regularisation Request: Manager Approved",
                "Your regularisation request for " + request.getAttendance().getAttendanceDate()
                        + " has been approved by your manager and is now pending HR verification.");

        return RegularisationRequestDto.from(saved);
    }

    // ─── Manager: Reject ─────────────────────────────────────────────────────

    @Transactional
    public RegularisationRequestDto rejectByManager(Long requestId, String remarks, Long managerUserId) {
        AttendanceRegularisationRequest request = findRequest(requestId);
        Employee managerEmployee = employeeRepository.findByUserId(managerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", managerUserId));

        if (request.getStatus() != RequestStatus.PENDING_MANAGER) {
            throw new BadRequestException("Request is not pending manager approval");
        }

        request.setRejectedBy(managerEmployee);
        request.setRejectedAt(LocalDateTime.now());
        request.setRejectionRemarks(remarks);
        request.setRejectionStage(AttendanceRegularisationRequest.RejectionStage.MANAGER);
        request.setStatus(RequestStatus.REJECTED);

        AttendanceRegularisationRequest saved = requestRepository.save(request);
        resetAttendanceRegularisationFlag(request.getAttendance());

        notifyEmployee(request.getEmployee(), saved,
                Notification.NotificationType.REGULARISATION_REJECTED_BY_MANAGER,
                "Regularisation Request: Rejected",
                "Your regularisation request for " + request.getAttendance().getAttendanceDate()
                        + " was rejected by your manager."
                        + (remarks != null ? " Reason: " + remarks : ""));

        return RegularisationRequestDto.from(saved);
    }

    // ─── HR: Approve ─────────────────────────────────────────────────────────

    @Transactional
    public RegularisationRequestDto approveByHR(Long requestId, String remarks, Long hrUserId) {
        AttendanceRegularisationRequest request = findRequest(requestId);
        Employee hrEmployee = employeeRepository.findByUserId(hrUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", hrUserId));

        if (request.getStatus() != RequestStatus.PENDING_HR && request.getStatus() != RequestStatus.PENDING_MANAGER) {
            throw new BadRequestException("Request is not pending approval");
        }

        request.setHrApprovedBy(hrEmployee);
        request.setHrApprovedAt(LocalDateTime.now());
        request.setHrRemarks(remarks);
        request.setStatus(RequestStatus.APPROVED);

        AttendanceRegularisationRequest saved = requestRepository.save(request);

        // Apply effect on attendance record
        attendanceService.applyRegularisationApproval(saved);

        notifyEmployee(request.getEmployee(), saved,
                Notification.NotificationType.REGULARISATION_APPROVED,
                "Regularisation Request: Fully Approved",
                "Your regularisation request for " + request.getAttendance().getAttendanceDate()
                        + " has been fully approved. Your attendance record has been updated.");

        return RegularisationRequestDto.from(saved);
    }

    // ─── HR: Reject ──────────────────────────────────────────────────────────

    @Transactional
    public RegularisationRequestDto rejectByHR(Long requestId, String remarks, Long hrUserId) {
        AttendanceRegularisationRequest request = findRequest(requestId);
        Employee hrEmployee = employeeRepository.findByUserId(hrUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", hrUserId));

        if (request.getStatus() != RequestStatus.PENDING_HR && request.getStatus() != RequestStatus.PENDING_MANAGER) {
            throw new BadRequestException("Request is not pending approval");
        }

        request.setRejectedBy(hrEmployee);
        request.setRejectedAt(LocalDateTime.now());
        request.setRejectionRemarks(remarks);
        request.setRejectionStage(AttendanceRegularisationRequest.RejectionStage.HR);
        request.setStatus(RequestStatus.REJECTED);

        AttendanceRegularisationRequest saved = requestRepository.save(request);
        resetAttendanceRegularisationFlag(request.getAttendance());

        notifyEmployee(request.getEmployee(), saved,
                Notification.NotificationType.REGULARISATION_REJECTED,
                "Regularisation Request: Rejected",
                "Your regularisation request for " + request.getAttendance().getAttendanceDate()
                        + " was rejected by HR."
                        + (remarks != null ? " Reason: " + remarks : ""));

        return RegularisationRequestDto.from(saved);
    }

    // ─── Queries ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RegularisationRequestDto> getPendingForManager(Long managerUserId) {
        Employee manager = employeeRepository.findByUserId(managerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", managerUserId));
        return requestRepository.findPendingForManager(manager.getId())
                .stream().map(RegularisationRequestDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RegularisationRequestDto> getPendingForHR(Long companyId) {
        return requestRepository.findPendingForHR(companyId)
                .stream().map(RegularisationRequestDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RegularisationRequestDto> getMyRequests(Long userId) {
        Employee employee = employeeRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", userId));
        return requestRepository.findByEmployeeIdOrderByCreatedAtDesc(employee.getId())
                .stream().map(RegularisationRequestDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RegularisationRequestDto> getAllForCompany(Long companyId) {
        return requestRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
                .stream().map(RegularisationRequestDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RegularisationRequestDto getById(Long requestId) {
        return RegularisationRequestDto.from(findRequest(requestId));
    }

    @Transactional(readOnly = true)
    public long countPendingForManager(Long managerUserId) {
        Employee manager = employeeRepository.findByUserId(managerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee for user", managerUserId));
        return requestRepository.countPendingForManager(manager.getId());
    }

    @Transactional(readOnly = true)
    public long countPendingForHR(Long companyId) {
        return requestRepository.countPendingForHR(companyId);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private AttendanceRegularisationRequest findRequest(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RegularisationRequest", id));
    }

    /** Reset attendance quick-flag when a request is rejected (no pending request anymore). */
    private void resetAttendanceRegularisationFlag(Attendance att) {
        if (att == null) return;
        // Check if any other pending request exists before clearing the flag
        boolean stillPending = requestRepository.findByAttendanceId(att.getId()).stream()
                .anyMatch(r -> r.getStatus() == RequestStatus.PENDING_MANAGER
                            || r.getStatus() == RequestStatus.APPROVED_BY_MANAGER
                            || r.getStatus() == RequestStatus.PENDING_HR);
        if (!stillPending) {
            att.setRegularisationStatus(Attendance.RegularisationStatus.NONE);
            attendanceRepository.save(att);
        }
    }

    private void notifyManager(Employee manager, Employee employee, AttendanceRegularisationRequest request) {
        if (manager.getUser() == null) return;
        notificationService.send(
                manager.getUser().getId(),
                "New Regularisation Request",
                employee.getFirstName() + " " + employee.getLastName()
                        + " submitted a regularisation request for "
                        + request.getAttendance().getAttendanceDate()
                        + " (" + request.getRequestType().name().replace("_", " ") + ")",
                Notification.NotificationType.REGULARISATION_SUBMITTED,
                "REGULARISATION_REQUEST",
                request.getId(),
                request.getCompany()
        );
    }

    private void notifyEmployee(Employee employee, AttendanceRegularisationRequest request,
                                 Notification.NotificationType type, String title, String message) {
        if (employee.getUser() == null) return;
        notificationService.send(
                employee.getUser().getId(),
                title,
                message,
                type,
                "REGULARISATION_REQUEST",
                request.getId(),
                request.getCompany()
        );
    }
}
