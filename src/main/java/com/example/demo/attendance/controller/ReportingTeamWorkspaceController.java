package com.example.demo.attendance.controller;

import com.example.demo.attendance.service.ReportingTeamWorkspaceService;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.leave.dto.LeaveRequestDTO;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/team")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ReportingTeamWorkspaceController {
    private final ReportingTeamWorkspaceService service;
    public record Decision(String reason) {}

    @GetMapping("/employees")
    public List<ReportingTeamWorkspaceService.TeamMember> employees(@AuthenticationPrincipal UserPrincipal principal) {
        return service.employees(principal.getId());
    }

    @GetMapping("/leaves")
    public List<LeaveRequestDTO> leaves(@AuthenticationPrincipal UserPrincipal principal) {
        return service.leaves(principal.getId());
    }

    @PostMapping("/leaves/{id}/approve")
    public LeaveRequestDTO approve(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return service.decideLeave(principal.getId(), id, null, true);
    }

    @PostMapping("/leaves/{id}/reject")
    public LeaveRequestDTO reject(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                  @RequestBody Decision body) {
        return service.decideLeave(principal.getId(), id, body.reason(), false);
    }
}
