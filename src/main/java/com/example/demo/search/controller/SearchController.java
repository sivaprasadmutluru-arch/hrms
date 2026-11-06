package com.example.demo.search.controller;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.search.dto.SearchResultDto;
import com.example.demo.search.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Global multi-entity unified search")
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Unified global search across employees, departments, tickets, assets, projects, documents, etc.")
    public ResponseEntity<SearchResultDto> search(
            @RequestParam String q,
            @RequestParam(required = false) String type,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(searchService.search(q, companyId, currentUser, type));
    }
}
