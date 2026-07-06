package com.example.Garage.Controller;

import com.example.Garage.Dto.BookingRequest;
import com.example.Garage.Dto.RateBookingRequest;
import com.example.Garage.Model.Booking;
import com.example.Garage.Model.Garage;
import com.example.Garage.Repository.BookingRepo;
import com.example.Garage.Repository.GarageRepo;
import com.example.Garage.exception.ForbiddenActionException;
import com.example.Garage.exception.ResourceNotFoundException;
import com.example.Garage.service.BookingContactEnricher;
import com.example.Garage.service.BookingService;
import com.example.Garage.service.CurrentUserService;
import com.example.Garage.service.JobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final JobService jobService;
    private final BookingRepo bookingRepo;
    private final GarageRepo garageRepo;
    private final CurrentUserService currentUserService;
    private final BookingContactEnricher contactEnricher;

    @PostMapping("/place")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<?> placeBooking(@Valid @RequestBody BookingRequest request) {
        Booking booking = bookingService.placeBooking(
                request.getGarageId(), request.getFaultTypeId(), request.getVehicleId(),
                request.getAppointmentDate(), currentUserService.getCurrentUserId(),
                request.getServiceAddress(), request.getServiceLatitude(), request.getServiceLongitude());
        return ResponseEntity.ok(contactEnricher.enrich(booking));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<List<Booking>> myBookings() {
        return ResponseEntity.ok(contactEnricher.enrich(bookingRepo.findByUserId(currentUserService.getCurrentUserId())));
    }

    @GetMapping("/garage/{garageId}")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER')")
    public ResponseEntity<List<Booking>> bookingsByGarage(@PathVariable Long garageId) {
        Garage garage = garageRepo.findById(garageId).orElseThrow(() -> new ResourceNotFoundException("Garage not found"));
        if (!garage.getOwnerUserId().equals(currentUserService.getCurrentUserId())) {
            throw new ForbiddenActionException("You do not own this garage");
        }
        return ResponseEntity.ok(contactEnricher.enrich(bookingRepo.findByGarage(garage)));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('ROLE_USER') or hasAuthority('ROLE_GARAGE_OWNER')")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id) {
        return ResponseEntity.ok(contactEnricher.enrich(bookingService.cancelBooking(id, currentUserService.getCurrentUserId())));
    }

    @PostMapping("/{id}/rate")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<?> rateBooking(@PathVariable Long id, @Valid @RequestBody RateBookingRequest request) {
        Booking booking = jobService.rateBooking(id, currentUserService.getCurrentUserId(), request.getRating(), request.getComment());
        return ResponseEntity.ok(contactEnricher.enrich(booking));
    }
}
