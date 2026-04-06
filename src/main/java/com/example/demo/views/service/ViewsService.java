package com.example.demo.views.service;

import com.example.demo.auth.repository.UserRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.views.entity.*;
import com.example.demo.views.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ViewsService {

    private final ToggleColumnRepository toggleColumnRepository;
    private final ActiveTabRepository activeTabRepository;
    private final ActiveGroupRepository activeGroupRepository;
    private final SavedFilterRepository savedFilterRepository;
    private final ActiveViewRepository activeViewRepository;
    private final UserRepository userRepository;

    // ---- Toggle Columns ----

    @Transactional(readOnly = true)
    public List<ToggleColumn> getToggleColumns(Long userId) {
        return toggleColumnRepository.findByUserId(userId);
    }

    public ToggleColumn saveToggleColumn(Long userId, String path, String excludedColumns) {
        ToggleColumn toggleColumn = toggleColumnRepository.findByUserIdAndPath(userId, path)
                .orElse(new ToggleColumn());
        toggleColumn.setUser(userRepository.getReferenceById(userId));
        toggleColumn.setPath(path);
        toggleColumn.setExcludedColumns(excludedColumns);
        return toggleColumnRepository.save(toggleColumn);
    }

    // ---- Active Tabs ----

    @Transactional(readOnly = true)
    public ActiveTab getActiveTab(Long userId, String path) {
        return activeTabRepository.findByUserIdAndPath(userId, path).orElse(new ActiveTab());
    }

    public ActiveTab saveActiveTab(Long userId, String path, String tabTarget) {
        ActiveTab activeTab = activeTabRepository.findByUserIdAndPath(userId, path)
                .orElse(new ActiveTab());
        activeTab.setUser(userRepository.getReferenceById(userId));
        activeTab.setPath(path);
        activeTab.setTabTarget(tabTarget);
        return activeTabRepository.save(activeTab);
    }

    // ---- Active Groups ----

    @Transactional(readOnly = true)
    public ActiveGroup getActiveGroup(Long userId, String path) {
        return activeGroupRepository.findByUserIdAndPath(userId, path).orElse(new ActiveGroup());
    }

    public ActiveGroup saveActiveGroup(Long userId, String path, String groupTarget, String groupByField) {
        ActiveGroup activeGroup = activeGroupRepository.findByUserIdAndPath(userId, path)
                .orElse(new ActiveGroup());
        activeGroup.setUser(userRepository.getReferenceById(userId));
        activeGroup.setPath(path);
        activeGroup.setGroupTarget(groupTarget);
        activeGroup.setGroupByField(groupByField);
        return activeGroupRepository.save(activeGroup);
    }

    // ---- Saved Filters ----

    @Transactional(readOnly = true)
    public List<SavedFilter> getSavedFilters(Long userId) {
        return savedFilterRepository.findByUserId(userId);
    }

    public SavedFilter createSavedFilter(SavedFilter savedFilter) {
        if (savedFilter.getUser() != null && savedFilter.getUser().getId() != null) {
            savedFilter.setUser(userRepository.getReferenceById(savedFilter.getUser().getId()));
        }
        return savedFilterRepository.save(savedFilter);
    }

    public SavedFilter updateSavedFilter(Long id, SavedFilter updated) {
        SavedFilter existing = savedFilterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SavedFilter", id));
        existing.setTitle(updated.getTitle());
        existing.setColor(updated.getColor());
        existing.setDefault(updated.isDefault());
        existing.setFilter(updated.getFilter());
        existing.setUrlencode(updated.getUrlencode());
        existing.setPath(updated.getPath());
        existing.setReferrer(updated.getReferrer());
        return savedFilterRepository.save(existing);
    }

    public void deleteSavedFilter(Long id) {
        savedFilterRepository.deleteById(id);
    }

    // ---- Active Views ----

    @Transactional(readOnly = true)
    public ActiveView getActiveView(Long userId, String path) {
        return activeViewRepository.findByUserIdAndPath(userId, path).orElse(new ActiveView());
    }

    public ActiveView saveActiveView(Long userId, String path, String type) {
        ActiveView activeView = activeViewRepository.findByUserIdAndPath(userId, path)
                .orElse(new ActiveView());
        activeView.setUser(userRepository.getReferenceById(userId));
        activeView.setPath(path);
        activeView.setType(type);
        return activeViewRepository.save(activeView);
    }
}
