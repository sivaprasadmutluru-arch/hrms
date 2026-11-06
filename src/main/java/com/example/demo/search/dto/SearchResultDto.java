package com.example.demo.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultDto {
    private String query;
    private int totalMatches;
    private List<SearchItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchItem {
        private String id;
        private String type;       // employee, department, position, role, ticket, asset, project, recruitment, document, company
        private String category;   // Employees, Departments, Designations, Helpdesk, Assets, Projects, Recruitment, Documents, Companies
        private String title;      // Name, Title, etc.
        private String subtitle;   // Role, Code, Department, Status
        private String path;       // /employees/1, /departments, /helpdesk, etc.
        private String badge;      // optional code (e.g. EMP-001, AST-102)
        private String status;     // optional badge (e.g. Active, Pending, Resolved)
    }
}
