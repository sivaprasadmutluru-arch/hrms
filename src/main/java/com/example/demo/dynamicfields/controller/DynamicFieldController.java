package com.example.demo.dynamicfields.controller;

import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.dynamicfields.entity.Choice;
import com.example.demo.dynamicfields.entity.DynamicField;
import com.example.demo.dynamicfields.repository.ChoiceRepository;
import com.example.demo.dynamicfields.repository.DynamicFieldRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dynamic-fields")
@RequiredArgsConstructor
@Tag(name = "Dynamic Fields")
public class DynamicFieldController {

    private final DynamicFieldRepository dynamicFieldRepository;
    private final ChoiceRepository choiceRepository;

    // ---- Dynamic Fields ----

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<DynamicField>> listDynamicFields(
            @RequestParam(required = false) String model) {
        if (model != null && !model.isBlank()) {
            return ResponseEntity.ok(dynamicFieldRepository.findByModel(model));
        }
        return ResponseEntity.ok(dynamicFieldRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<DynamicField> getDynamicField(@PathVariable Long id) {
        DynamicField field = dynamicFieldRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DynamicField", id));
        return ResponseEntity.ok(field);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<DynamicField> createDynamicField(@RequestBody Map<String, Object> body) {
        DynamicField field = new DynamicField();
        if (body.get("model") != null) field.setModel(body.get("model").toString());
        if (body.get("verboseName") != null) field.setVerboseName(body.get("verboseName").toString());
        if (body.get("fieldName") != null) field.setFieldName(body.get("fieldName").toString());
        if (body.get("type") != null) field.setType(body.get("type").toString());
        if (body.get("isRequired") != null) field.setRequired(Boolean.parseBoolean(body.get("isRequired").toString()));
        if (body.get("choiceIds") instanceof List<?> choiceIds) {
            List<Choice> choices = choiceIds.stream()
                    .map(cid -> choiceRepository.getReferenceById(Long.parseLong(cid.toString())))
                    .toList();
            field.setChoices(choices);
        }
        return ResponseEntity.ok(dynamicFieldRepository.save(field));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<DynamicField> updateDynamicField(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        DynamicField field = dynamicFieldRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DynamicField", id));
        if (body.get("model") != null) field.setModel(body.get("model").toString());
        if (body.get("verboseName") != null) field.setVerboseName(body.get("verboseName").toString());
        if (body.get("fieldName") != null) field.setFieldName(body.get("fieldName").toString());
        if (body.get("type") != null) field.setType(body.get("type").toString());
        if (body.get("isRequired") != null) field.setRequired(Boolean.parseBoolean(body.get("isRequired").toString()));
        if (body.get("choiceIds") instanceof List<?> choiceIds) {
            List<Choice> choices = choiceIds.stream()
                    .map(cid -> choiceRepository.getReferenceById(Long.parseLong(cid.toString())))
                    .toList();
            field.setChoices(choices);
        }
        return ResponseEntity.ok(dynamicFieldRepository.save(field));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteDynamicField(@PathVariable Long id) {
        dynamicFieldRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Choices ----

    @GetMapping("/choices")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Choice>> listChoices() {
        return ResponseEntity.ok(choiceRepository.findAll());
    }

    @PostMapping("/choices")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<Choice> createChoice(@RequestBody Map<String, String> body) {
        Choice choice = new Choice();
        choice.setTitle(body.get("title"));
        return ResponseEntity.ok(choiceRepository.save(choice));
    }

    @DeleteMapping("/choices/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> deleteChoice(@PathVariable Long id) {
        choiceRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}
