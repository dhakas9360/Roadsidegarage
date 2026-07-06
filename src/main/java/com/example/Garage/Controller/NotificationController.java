package com.example.Garage.Controller;

import com.example.Garage.Model.Notification;
import com.example.Garage.Repository.NotificationRepo;
import com.example.Garage.exception.ForbiddenActionException;
import com.example.Garage.exception.ResourceNotFoundException;
import com.example.Garage.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepo notificationRepo;
    private final CurrentUserService currentUserService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Notification>> myNotifications() {
        return ResponseEntity.ok(notificationRepo.findByUserIdOrderByCreatedAtDesc(currentUserService.getCurrentUserId()));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> unreadCount() {
        long count = notificationRepo.countByUserIdAndReadFalse(currentUserService.getCurrentUserId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        Notification notification = notificationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.getUserId().equals(currentUserService.getCurrentUserId())) {
            throw new ForbiddenActionException("This notification does not belong to you");
        }
        notification.setRead(true);
        return ResponseEntity.ok(notificationRepo.save(notification));
    }

    @PatchMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> markAllRead() {
        List<Notification> unread = notificationRepo.findByUserIdAndReadFalse(currentUserService.getCurrentUserId());
        unread.forEach(n -> n.setRead(true));
        notificationRepo.saveAll(unread);
        return ResponseEntity.ok().build();
    }
}
