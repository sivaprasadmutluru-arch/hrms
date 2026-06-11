package com.example.demo.views.controller;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.views.entity.*;
import com.example.demo.views.service.ViewsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/views")
@RequiredArgsConstructor
@Tag(name = "UI Views")
public class ViewsController {

    private final ViewsService viewsService;

    // ---- Toggle Columns ----

    @GetMapping("/toggle-columns")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ToggleColumn>> getToggleColumns(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(viewsService.getToggleColumns(user.getId()));
    }

    @PostMapping("/toggle-columns")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ToggleColumn> saveToggleColumn(@AuthenticationPrincipal UserPrincipal user,
                                                         @RequestBody Map<String, Object> body) {
        String path = (String) body.get("path");
        String excludedColumns = (String) body.get("excludedColumns");
        return ResponseEntity.ok(viewsService.saveToggleColumn(user.getId(), path, excludedColumns));
    }

    // ---- Active Tabs ----

    @GetMapping("/active-tabs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveTab> getActiveTab(@AuthenticationPrincipal UserPrincipal user,
                                                  @RequestParam String path) {
        return ResponseEntity.ok(viewsService.getActiveTab(user.getId(), path));
    }

    @PostMapping("/active-tabs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveTab> saveActiveTab(@AuthenticationPrincipal UserPrincipal user,
                                                   @RequestBody Map<String, Object> body) {
        String path = (String) body.get("path");
        String tabTarget = (String) body.get("tabTarget");
        return ResponseEntity.ok(viewsService.saveActiveTab(user.getId(), path, tabTarget));
    }

    // ---- Active Groups ----

    @GetMapping("/active-groups")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveGroup> getActiveGroup(@AuthenticationPrincipal UserPrincipal user,
                                                      @RequestParam String path) {
        return ResponseEntity.ok(viewsService.getActiveGroup(user.getId(), path));
    }

    @PostMapping("/active-groups")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveGroup> saveActiveGroup(@AuthenticationPrincipal UserPrincipal user,
                                                       @RequestBody Map<String, Object> body) {
        String path = (String) body.get("path");
        String groupTarget = (String) body.get("groupTarget");
        String groupByField = (String) body.get("groupByField");
        return ResponseEntity.ok(viewsService.saveActiveGroup(user.getId(), path, groupTarget, groupByField));
    }

    // ---- Saved Filters ----

    @GetMapping("/saved-filters")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SavedFilter>> getSavedFilters(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(viewsService.getSavedFilters(user.getId()));
    }

    @PostMapping("/saved-filters")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SavedFilter> createSavedFilter(@RequestBody SavedFilter savedFilter) {
        return ResponseEntity.ok(viewsService.createSavedFilter(savedFilter));
    }

    @PutMapping("/saved-filters/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SavedFilter> updateSavedFilter(@PathVariable Long id, @RequestBody SavedFilter updated) {
        return ResponseEntity.ok(viewsService.updateSavedFilter(id, updated));
    }

    @DeleteMapping("/saved-filters/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> deleteSavedFilter(@PathVariable Long id) {
        viewsService.deleteSavedFilter(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Active Views ----

    @GetMapping("/active-views")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveView> getActiveView(@AuthenticationPrincipal UserPrincipal user,
                                                    @RequestParam String path) {
        return ResponseEntity.ok(viewsService.getActiveView(user.getId(), path));
    }

    @PostMapping("/active-views")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveView> saveActiveView(@AuthenticationPrincipal UserPrincipal user,
                                                     @RequestBody Map<String, Object> body) {
        String path = (String) body.get("path");
        String type = (String) body.get("type");
        return ResponseEntity.ok(viewsService.saveActiveView(user.getId(), path, type));
    }
}
