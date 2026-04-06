package com.example.demo.notification.controller;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.notification.entity.Notification;
import com.example.demo.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get current user notifications")
    public ResponseEntity<Page<Notification>> list(@AuthenticationPrincipal UserPrincipal user,
                                                    @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(notificationService.getUserNotifications(user.getId(), pageable));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(user.getId())));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllRead(@AuthenticationPrincipal UserPrincipal user) {
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a single notification")
    public ResponseEntity<Map<String, String>> deleteOne(@PathVariable Long id,
                                                         @AuthenticationPrincipal UserPrincipal user) {
        notificationService.deleteNotification(id, user.getId());
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }

    @DeleteMapping
    @Operation(summary = "Delete all notifications for the current user")
    public ResponseEntity<Map<String, String>> deleteAll(@AuthenticationPrincipal UserPrincipal user) {
        notificationService.deleteAllNotifications(user.getId());
        return ResponseEntity.ok(Map.of("message", "All notifications deleted"));
    }
}
