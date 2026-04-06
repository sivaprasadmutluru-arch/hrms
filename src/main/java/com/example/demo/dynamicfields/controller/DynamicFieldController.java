package com.example.demo.dynamicfields.controller;

import com.example.demo.dynamicfields.entity.Choice;
import com.example.demo.dynamicfields.entity.DynamicField;
import com.example.demo.dynamicfields.service.DynamicFieldService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dynamic-fields")
@RequiredArgsConstructor
@Tag(name = "Dynamic Fields")
public class DynamicFieldController {

    private final DynamicFieldService dynamicFieldService;

    // ---- Dynamic Fields ----

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DynamicField>> listDynamicFields(
            @RequestParam(required = false) String model) {
        return ResponseEntity.ok(dynamicFieldService.listDynamicFields(model));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DynamicField> getDynamicField(@PathVariable Long id) {
        return ResponseEntity.ok(dynamicFieldService.getDynamicField(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<DynamicField> createDynamicField(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(dynamicFieldService.createDynamicField(body));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<DynamicField> updateDynamicField(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(dynamicFieldService.updateDynamicField(id, body));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteDynamicField(@PathVariable Long id) {
        dynamicFieldService.deleteDynamicField(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Choices ----

    @GetMapping("/choices")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Choice>> listChoices() {
        return ResponseEntity.ok(dynamicFieldService.listChoices());
    }

    @PostMapping("/choices")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Choice> createChoice(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(dynamicFieldService.createChoice(body.get("title")));
    }

    @DeleteMapping("/choices/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteChoice(@PathVariable Long id) {
        dynamicFieldService.deleteChoice(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}
