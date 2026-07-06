package com.example.Garage.service;

import com.example.Garage.Model.Notification;
import com.example.Garage.Repository.NotificationRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepo notificationRepo;

    public void notify(Long userId, String message, Long bookingId) {
        if (userId == null) return;

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setMessage(message);
        notification.setBookingId(bookingId);
        notification.setCreatedAt(LocalDateTime.now());
        notificationRepo.save(notification);
    }
}
