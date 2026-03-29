package com.example.demo.views.controller;

import com.example.demo.auth.repository.UserRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.views.entity.*;
import com.example.demo.views.repository.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/views")
@RequiredArgsConstructor
@Tag(name = "UI Views")
public class ViewsController {

    private final ToggleColumnRepository toggleColumnRepository;
    private final ActiveTabRepository activeTabRepository;
    private final ActiveGroupRepository activeGroupRepository;
    private final SavedFilterRepository savedFilterRepository;
    private final ActiveViewRepository activeViewRepository;
    private final UserRepository userRepository;

    // ---- Toggle Columns ----

    @GetMapping("/toggle-columns")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ToggleColumn>> getToggleColumns(@RequestParam Long userId) {
        return ResponseEntity.ok(toggleColumnRepository.findByUserId(userId));
    }

    @PostMapping("/toggle-columns")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ToggleColumn> saveToggleColumn(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String path = (String) body.get("path");
        String excludedColumns = (String) body.get("excludedColumns");

        ToggleColumn toggleColumn = toggleColumnRepository.findByUserIdAndPath(userId, path)
                .orElse(new ToggleColumn());
        toggleColumn.setUser(userRepository.getReferenceById(userId));
        toggleColumn.setPath(path);
        toggleColumn.setExcludedColumns(excludedColumns);
        return ResponseEntity.ok(toggleColumnRepository.save(toggleColumn));
    }

    // ---- Active Tabs ----

    @GetMapping("/active-tabs")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<ActiveTab> getActiveTab(@RequestParam Long userId, @RequestParam String path) {
        return ResponseEntity.ok(
                activeTabRepository.findByUserIdAndPath(userId, path).orElse(new ActiveTab())
        );
    }

    @PostMapping("/active-tabs")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ActiveTab> saveActiveTab(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String path = (String) body.get("path");
        String tabTarget = (String) body.get("tabTarget");

        ActiveTab activeTab = activeTabRepository.findByUserIdAndPath(userId, path)
                .orElse(new ActiveTab());
        activeTab.setUser(userRepository.getReferenceById(userId));
        activeTab.setPath(path);
        activeTab.setTabTarget(tabTarget);
        return ResponseEntity.ok(activeTabRepository.save(activeTab));
    }

    // ---- Active Groups ----

    @GetMapping("/active-groups")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<ActiveGroup> getActiveGroup(@RequestParam Long userId, @RequestParam String path) {
        return ResponseEntity.ok(
                activeGroupRepository.findByUserIdAndPath(userId, path).orElse(new ActiveGroup())
        );
    }

    @PostMapping("/active-groups")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ActiveGroup> saveActiveGroup(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String path = (String) body.get("path");
        String groupTarget = (String) body.get("groupTarget");
        String groupByField = (String) body.get("groupByField");

        ActiveGroup activeGroup = activeGroupRepository.findByUserIdAndPath(userId, path)
                .orElse(new ActiveGroup());
        activeGroup.setUser(userRepository.getReferenceById(userId));
        activeGroup.setPath(path);
        activeGroup.setGroupTarget(groupTarget);
        activeGroup.setGroupByField(groupByField);
        return ResponseEntity.ok(activeGroupRepository.save(activeGroup));
    }

    // ---- Saved Filters ----

    @GetMapping("/saved-filters")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SavedFilter>> getSavedFilters(@RequestParam Long userId) {
        return ResponseEntity.ok(savedFilterRepository.findByUserId(userId));
    }

    @PostMapping("/saved-filters")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<SavedFilter> createSavedFilter(@RequestBody SavedFilter savedFilter) {
        if (savedFilter.getUser() != null && savedFilter.getUser().getId() != null) {
            savedFilter.setUser(userRepository.getReferenceById(savedFilter.getUser().getId()));
        }
        return ResponseEntity.ok(savedFilterRepository.save(savedFilter));
    }

    @PutMapping("/saved-filters/{id}")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<SavedFilter> updateSavedFilter(@PathVariable Long id, @RequestBody SavedFilter updated) {
        SavedFilter existing = savedFilterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SavedFilter", id));
        existing.setTitle(updated.getTitle());
        existing.setColor(updated.getColor());
        existing.setDefault(updated.isDefault());
        existing.setFilter(updated.getFilter());
        existing.setUrlencode(updated.getUrlencode());
        existing.setPath(updated.getPath());
        existing.setReferrer(updated.getReferrer());
        return ResponseEntity.ok(savedFilterRepository.save(existing));
    }

    @DeleteMapping("/saved-filters/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> deleteSavedFilter(@PathVariable Long id) {
        savedFilterRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Active Views ----

    @GetMapping("/active-views")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<ActiveView> getActiveView(@RequestParam Long userId, @RequestParam String path) {
        return ResponseEntity.ok(
                activeViewRepository.findByUserIdAndPath(userId, path).orElse(new ActiveView())
        );
    }

    @PostMapping("/active-views")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<ActiveView> saveActiveView(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String path = (String) body.get("path");
        String type = (String) body.get("type");

        ActiveView activeView = activeViewRepository.findByUserIdAndPath(userId, path)
                .orElse(new ActiveView());
        activeView.setUser(userRepository.getReferenceById(userId));
        activeView.setPath(path);
        activeView.setType(type);
        return ResponseEntity.ok(activeViewRepository.save(activeView));
    }
}
