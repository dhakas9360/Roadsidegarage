package com.example.Garage.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // recipient
    private Long userId;

    private String message;

    // optional link back to the booking that triggered this notification
    private Long bookingId;

    private boolean read = false;

    private LocalDateTime createdAt;
}
