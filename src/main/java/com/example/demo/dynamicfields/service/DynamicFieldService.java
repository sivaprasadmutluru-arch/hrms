package com.example.demo.dynamicfields.service;

import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.dynamicfields.entity.Choice;
import com.example.demo.dynamicfields.entity.DynamicField;
import com.example.demo.dynamicfields.repository.ChoiceRepository;
import com.example.demo.dynamicfields.repository.DynamicFieldRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class DynamicFieldService {

    private final DynamicFieldRepository dynamicFieldRepository;
    private final ChoiceRepository choiceRepository;

    // ---- Dynamic Fields ----

    @Transactional(readOnly = true)
    public List<DynamicField> listDynamicFields(String model) {
        if (model != null && !model.isBlank()) {
            return dynamicFieldRepository.findByModel(model);
        }
        return dynamicFieldRepository.findAll();
    }

    @Transactional(readOnly = true)
    public DynamicField getDynamicField(Long id) {
        return dynamicFieldRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DynamicField", id));
    }

    public DynamicField createDynamicField(Map<String, Object> body) {
        DynamicField field = new DynamicField();
        applyBody(field, body);
        return dynamicFieldRepository.save(field);
    }

    public DynamicField updateDynamicField(Long id, Map<String, Object> body) {
        DynamicField field = dynamicFieldRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DynamicField", id));
        applyBody(field, body);
        return dynamicFieldRepository.save(field);
    }

    public void deleteDynamicField(Long id) {
        dynamicFieldRepository.deleteById(id);
    }

    private void applyBody(DynamicField field, Map<String, Object> body) {
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
    }

    // ---- Choices ----

    @Transactional(readOnly = true)
    public List<Choice> listChoices() {
        return choiceRepository.findAll();
    }

    public Choice createChoice(String title) {
        Choice choice = new Choice();
        choice.setTitle(title);
        return choiceRepository.save(choice);
    }

    public void deleteChoice(Long id) {
        choiceRepository.deleteById(id);
    }
}
