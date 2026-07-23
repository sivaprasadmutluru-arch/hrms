package com.example.demo.chatbot.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatQuestionRequest {
    /** One of ChatbotService.Intent — the frontend sends a fixed intent id per suggested question. */
    private String intent;
}
