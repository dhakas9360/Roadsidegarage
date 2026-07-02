package com.example.Garage.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // the ROLE_USER account that placed the booking
    private Long userId;

    @ManyToOne
    private Garage garage;

    @ManyToOne
    private Vehicle vehicle;

    @ManyToOne
    private FaultType faultType;

    @ManyToOne
    private GarageMember assignedMember;

    private LocalDate appointmentDate;

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    // price snapshot at the time of booking, looked up from GarageServicePrice
    private Double quotedPrice;

    private Integer rating; // 1-5, set once the user rates a completed job
    private String ratingComment;

    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private LocalDateTime ratedAt;
}
