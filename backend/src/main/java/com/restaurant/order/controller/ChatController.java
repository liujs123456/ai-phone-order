package com.restaurant.order.controller;

import com.restaurant.order.dto.ChatRequest;
import com.restaurant.order.dto.ChatResponse;
import com.restaurant.order.service.AiChatService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final AiChatService aiChatService;

    public ChatController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    @PostMapping
    public ChatResponse chat(@RequestBody ChatRequest request) {
        return aiChatService.chat(request);
    }
}
