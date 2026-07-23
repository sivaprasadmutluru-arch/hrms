package com.example.demo.chatbot.controller;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.chatbot.dto.ChatAnswerResponse;
import com.example.demo.chatbot.dto.ChatQuestionRequest;
import com.example.demo.chatbot.service.ChatbotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
@Tag(name = "Chatbot")
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/ask")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Ask the self-service chatbot a supported question, answered from the caller's own data")
    public ResponseEntity<ChatAnswerResponse> ask(@RequestBody ChatQuestionRequest req) {
        String answer = chatbotService.answer(req.getIntent(), getCurrentUserId());
        return ResponseEntity.ok(new ChatAnswerResponse(answer));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getId();
        }
        throw new IllegalStateException("No authenticated user");
    }
}
