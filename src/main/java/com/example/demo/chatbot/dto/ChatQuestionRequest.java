package com.example.demo.chatbot.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatQuestionRequest {
    /** One of ChatbotService.Intent or a free-form question string. */
    private String intent;
    private String question;
}
