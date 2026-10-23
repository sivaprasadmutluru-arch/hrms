package com.example.demo.attendance.controller;

import com.example.demo.attendance.dto.AttendanceResponse;
import com.example.demo.attendance.dto.RegularisationRequestDto;
import com.example.demo.attendance.dto.RegularisationApprovalRequest;
import com.example.demo.attendance.service.ReportingTeamAttendanceService;
import com.example.demo.auth.security.UserPrincipal;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/team")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ReportingTeamAttendanceController {
    private final ReportingTeamAttendanceService service;

    @GetMapping("/attendance")
    public List<AttendanceResponse> attendance(@AuthenticationPrincipal UserPrincipal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.attendance(principal.getId(), from, to);
    }

    @GetMapping("/regularisation")
    public List<RegularisationRequestDto> requests(@AuthenticationPrincipal UserPrincipal principal) {
        return service.requests(principal.getId());
    }

    @PostMapping("/regularisation/{id}/approve")
    public RegularisationRequestDto approve(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id, @RequestBody(required = false) RegularisationApprovalRequest body) {
        return service.decide(principal.getId(), id, body == null ? null : body.getRemarks(), true);
    }

    @PostMapping("/regularisation/{id}/reject")
    public RegularisationRequestDto reject(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id, @RequestBody RegularisationApprovalRequest body) {
        return service.decide(principal.getId(), id, body.getRemarks(), false);
    }
}
