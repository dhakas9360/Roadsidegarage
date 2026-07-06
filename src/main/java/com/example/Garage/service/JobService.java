package com.example.Garage.service;

import com.example.Garage.Model.Booking;
import com.example.Garage.Model.BookingStatus;
import com.example.Garage.Model.Garage;
import com.example.Garage.Model.GarageMember;
import com.example.Garage.Repository.BookingRepo;
import com.example.Garage.Repository.GarageMemberRepo;
import com.example.Garage.Repository.GarageRepo;
import com.example.Garage.exception.ForbiddenActionException;
import com.example.Garage.exception.InvalidStateTransitionException;
import com.example.Garage.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class JobService {

    private final BookingRepo bookingRepo;
    private final GarageMemberRepo garageMemberRepo;
    private final GarageRepo garageRepo;
    private final NotificationService notificationService;

    public GarageMember getTechnicianForUser(Long userId) {
        return garageMemberRepo.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No technician profile found for this account"));
    }

    private Booking loadAssignedBooking(Long bookingId, GarageMember technician) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (booking.getAssignedMember() == null || !booking.getAssignedMember().getId().equals(technician.getId())) {
            throw new ForbiddenActionException("This job is not assigned to you");
        }
        return booking;
    }

    public Booking acceptJob(Long bookingId, Long technicianUserId) {
        GarageMember technician = getTechnicianForUser(technicianUserId);
        Booking booking = loadAssignedBooking(bookingId, technician);

        if (booking.getStatus() != BookingStatus.ASSIGNED) {
            throw new InvalidStateTransitionException("Only an ASSIGNED job can be accepted (current status: " + booking.getStatus() + ")");
        }

        booking.setStatus(BookingStatus.IN_PROGRESS);
        Booking saved = bookingRepo.save(booking);
        notificationService.notify(saved.getUserId(),
                "Your technician has started working on your " + saved.getFaultType().getName().replace("_", " ") + ".",
                saved.getId());
        return saved;
    }

    public Booking completeJob(Long bookingId, Long technicianUserId) {
        GarageMember technician = getTechnicianForUser(technicianUserId);
        Booking booking = loadAssignedBooking(bookingId, technician);

        if (booking.getStatus() != BookingStatus.IN_PROGRESS) {
            throw new InvalidStateTransitionException("Only an IN_PROGRESS job can be completed (current status: " + booking.getStatus() + ")");
        }

        booking.setStatus(BookingStatus.COMPLETED);
        booking.setCompletedAt(LocalDateTime.now());

        technician.setActiveJobs(Math.max(0, (technician.getActiveJobs() == null ? 0 : technician.getActiveJobs()) - 1));
        garageMemberRepo.save(technician);

        Booking saved = bookingRepo.save(booking);
        notificationService.notify(saved.getUserId(),
                "Your " + saved.getFaultType().getName().replace("_", " ") + " job is complete! Please rate your technician.",
                saved.getId());
        return saved;
    }

    public Booking rateBooking(Long bookingId, Long currentUserId, int rating, String comment) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (!booking.getUserId().equals(currentUserId)) {
            throw new ForbiddenActionException("You can only rate your own bookings");
        }
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new InvalidStateTransitionException("Only a COMPLETED job can be rated (current status: " + booking.getStatus() + ")");
        }

        booking.setRating(rating);
        booking.setRatingComment(comment);
        booking.setRatedAt(LocalDateTime.now());
        booking.setStatus(BookingStatus.RATED);
        Booking saved = bookingRepo.save(booking);

        GarageMember technician = booking.getAssignedMember();
        if (technician != null) {
            applyRunningAverage(technician, rating);
            garageMemberRepo.save(technician);

            Garage garage = booking.getGarage();
            applyRunningAverage(garage, rating);
            garageRepo.save(garage);

            notificationService.notify(technician.getUserId(), "You received a " + rating + "★ rating from a customer.", saved.getId());
        }

        return saved;
    }

    private void applyRunningAverage(GarageMember technician, int rating) {
        int count = technician.getRatingCount() == null ? 0 : technician.getRatingCount();
        double avg = technician.getRating() == null ? 0.0 : technician.getRating();
        technician.setRating(((avg * count) + rating) / (count + 1));
        technician.setRatingCount(count + 1);
    }

    private void applyRunningAverage(Garage garage, int rating) {
        int count = garage.getRatingCount() == null ? 0 : garage.getRatingCount();
        double avg = garage.getRating() == null ? 0.0 : garage.getRating();
        garage.setRating(((avg * count) + rating) / (count + 1));
        garage.setRatingCount(count + 1);
    }
}
