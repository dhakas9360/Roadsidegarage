package com.example.Garage.service;

import com.example.Garage.Model.Booking;
import com.example.Garage.Model.GarageMember;
import com.example.Garage.Model.User;
import com.example.Garage.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Booking only stores userId / GarageMember.userId, so contact details (name, phone) aren't
 * available on the entity as fetched from the DB. This fills in the @Transient contact fields
 * before a Booking is serialized back to a controller response.
 */
@Service
@RequiredArgsConstructor
public class BookingContactEnricher {

    private final UserRepository userRepository;

    public Booking enrich(Booking booking) {
        if (booking == null) return null;

        userRepository.findById(booking.getUserId()).ifPresent(customer -> {
            booking.setCustomerName(customer.getUsername());
            booking.setCustomerPhone(customer.getPhone());
        });

        GarageMember technician = booking.getAssignedMember();
        if (technician != null) {
            userRepository.findById(technician.getUserId()).ifPresent((User u) -> {
                booking.setTechnicianName(u.getUsername());
                booking.setTechnicianPhone(u.getPhone());
            });
        }

        return booking;
    }

    public List<Booking> enrich(List<Booking> bookings) {
        bookings.forEach(this::enrich);
        return bookings;
    }
}
