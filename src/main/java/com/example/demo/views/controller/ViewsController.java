package com.example.demo.views.controller;

import com.example.demo.views.entity.*;
import com.example.demo.views.service.ViewsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    public ResponseEntity<List<ToggleColumn>> getToggleColumns(@RequestParam Long userId) {
        return ResponseEntity.ok(viewsService.getToggleColumns(userId));
    }

    @PostMapping("/toggle-columns")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ToggleColumn> saveToggleColumn(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String path = (String) body.get("path");
        String excludedColumns = (String) body.get("excludedColumns");
        return ResponseEntity.ok(viewsService.saveToggleColumn(userId, path, excludedColumns));
    }

    // ---- Active Tabs ----

    @GetMapping("/active-tabs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveTab> getActiveTab(@RequestParam Long userId, @RequestParam String path) {
        return ResponseEntity.ok(viewsService.getActiveTab(userId, path));
    }

    @PostMapping("/active-tabs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveTab> saveActiveTab(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String path = (String) body.get("path");
        String tabTarget = (String) body.get("tabTarget");
        return ResponseEntity.ok(viewsService.saveActiveTab(userId, path, tabTarget));
    }

    // ---- Active Groups ----

    @GetMapping("/active-groups")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveGroup> getActiveGroup(@RequestParam Long userId, @RequestParam String path) {
        return ResponseEntity.ok(viewsService.getActiveGroup(userId, path));
    }

    @PostMapping("/active-groups")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveGroup> saveActiveGroup(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String path = (String) body.get("path");
        String groupTarget = (String) body.get("groupTarget");
        String groupByField = (String) body.get("groupByField");
        return ResponseEntity.ok(viewsService.saveActiveGroup(userId, path, groupTarget, groupByField));
    }

    // ---- Saved Filters ----

    @GetMapping("/saved-filters")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SavedFilter>> getSavedFilters(@RequestParam Long userId) {
        return ResponseEntity.ok(viewsService.getSavedFilters(userId));
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
    public ResponseEntity<ActiveView> getActiveView(@RequestParam Long userId, @RequestParam String path) {
        return ResponseEntity.ok(viewsService.getActiveView(userId, path));
    }

    @PostMapping("/active-views")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ActiveView> saveActiveView(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String path = (String) body.get("path");
        String type = (String) body.get("type");
        return ResponseEntity.ok(viewsService.saveActiveView(userId, path, type));
    }
}
