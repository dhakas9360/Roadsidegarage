package com.example.Garage.Repository;

import com.example.Garage.Model.Booking;
import com.example.Garage.Model.BookingStatus;
import com.example.Garage.Model.Garage;
import com.example.Garage.Model.GarageMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepo extends JpaRepository<Booking, Long> {
    long countByGarageAndAppointmentDateAndStatusNot(Garage garage, java.time.LocalDate appointmentDate, BookingStatus excludedStatus);
    List<Booking> findByAssignedMember(GarageMember assignedMember);
    List<Booking> findByGarage(Garage garage);
    List<Booking> findByUserId(Long userId);
    List<Booking> findByGarage_IdAndStatusAndRatedAtBetween(Long garageId, BookingStatus status, LocalDateTime start, LocalDateTime end);
}
