package com.example.Garage.service;

import com.example.Garage.Model.*;
import com.example.Garage.Repository.*;
import com.example.Garage.exception.ForbiddenActionException;
import com.example.Garage.exception.GarageFullException;
import com.example.Garage.exception.InvalidStateTransitionException;
import com.example.Garage.exception.ResourceNotFoundException;
import com.example.Garage.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class BookingService {

    /** Statuses in which a booking still occupies the vehicle (job not finished or cancelled). */
    public static final Set<BookingStatus> ACTIVE_STATUSES =
            EnumSet.of(BookingStatus.PENDING, BookingStatus.UNASSIGNED, BookingStatus.ASSIGNED, BookingStatus.IN_PROGRESS);

    private final BookingRepo bookingRepo;
    private final GarageRepo garageRepo;
    private final VehicleRepo vehicleRepo;
    private final FaultTypeRepo faultTypeRepo;
    private final GarageServicePriceRepo garageServicePriceRepo;
    private final AssignmentService assignmentService;
    private final GarageMemberRepo garageMemberRepo;
    private final NotificationService notificationService;

    public Booking placeBooking(Long garageId, Long faultTypeId, Long vehicleId, LocalDate date, Long currentUserId,
                                 String serviceAddress, Double serviceLatitude, Double serviceLongitude) {
        Garage garage = garageRepo.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found"));

        Vehicle vehicle = vehicleRepo.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        if (!vehicle.getUserId().equals(currentUserId)) {
            throw new ForbiddenActionException("This vehicle does not belong to you");
        }

        FaultType faultType = faultTypeRepo.findById(faultTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Fault type not found"));

        // one day of grace so a customer whose local "today" is behind the server's timezone isn't rejected
        if (date.isBefore(LocalDate.now().minusDays(1))) {
            throw new BadRequestException("Appointment date cannot be in the past");
        }

        if (bookingRepo.existsByVehicle_IdAndStatusIn(vehicleId, ACTIVE_STATUSES)) {
            throw new InvalidStateTransitionException(
                    "This vehicle already has an active booking. Cancel it or wait until it's completed.");
        }

        long activeCount = bookingRepo.countByGarageAndAppointmentDateAndStatusNot(garage, date, BookingStatus.CANCELLED);
        if (garage.getDailyCapacity() != null && activeCount >= garage.getDailyCapacity()) {
            throw new GarageFullException("Slot unavailable for this date!");
        }

        Double price = garageServicePriceRepo
                .findByGarage_IdAndFaultType_IdAndVehicleType_Id(garageId, faultTypeId, vehicle.getVehicleType().getId())
                .map(GarageServicePrice::getPrice)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "This garage does not offer a price for the selected fault and vehicle type"));

        Booking booking = new Booking();
        booking.setGarage(garage);
        booking.setVehicle(vehicle);
        booking.setFaultType(faultType);
        booking.setAppointmentDate(date);
        booking.setUserId(currentUserId);
        booking.setQuotedPrice(price);
        booking.setServiceAddress(serviceAddress);
        booking.setServiceLatitude(serviceLatitude);
        booking.setServiceLongitude(serviceLongitude);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setStatus(BookingStatus.PENDING);

        Booking saved = bookingRepo.save(booking);

        GarageMember assigned = assignmentService.assignTechnician(saved);
        if (assigned != null) {
            saved = assignToBooking(saved, assigned);
        } else {
            saved.setStatus(BookingStatus.UNASSIGNED);
            saved = bookingRepo.save(saved);
            notificationService.notify(currentUserId,
                    "Your booking at " + garage.getName() + " is pending — we're finding you a technician.", saved.getId());
            notificationService.notify(garage.getOwnerUserId(),
                    "New booking needs a technician: " + faultType.getName().replace("_", " ").toLowerCase() + " at " + garage.getName() + ".",
                    saved.getId());
        }

        return saved;
    }

    public Booking cancelBooking(Long bookingId, Long currentUserId) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        boolean isBookingOwner = booking.getUserId().equals(currentUserId);
        boolean isGarageOwner = booking.getGarage().getOwnerUserId() != null
                && booking.getGarage().getOwnerUserId().equals(currentUserId);
        if (!isBookingOwner && !isGarageOwner) {
            throw new ForbiddenActionException("You cannot cancel this booking");
        }

        if (booking.getStatus() == BookingStatus.COMPLETED || booking.getStatus() == BookingStatus.RATED
                || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new InvalidStateTransitionException("Cannot cancel a booking that is " + booking.getStatus());
        }

        GarageMember member = booking.getAssignedMember();
        if (member != null && (booking.getStatus() == BookingStatus.ASSIGNED || booking.getStatus() == BookingStatus.IN_PROGRESS)) {
            member.setActiveJobs(Math.max(0, (member.getActiveJobs() == null ? 0 : member.getActiveJobs()) - 1));
            garageMemberRepo.save(member);
        }

        booking.setStatus(BookingStatus.CANCELLED);
        Booking saved = bookingRepo.save(booking);

        if (isGarageOwner && !isBookingOwner) {
            notificationService.notify(saved.getUserId(),
                    "Your booking at " + saved.getGarage().getName() + " was cancelled by the garage.", saved.getId());
        }
        if (member != null) {
            notificationService.notify(member.getUserId(),
                    "A job assigned to you was cancelled by the " + (isBookingOwner ? "customer" : "garage") + ".",
                    saved.getId());
            // the technician just freed up a slot -> hand them the next waiting booking, if any
            dispatchWaitingBookings(saved.getGarage().getId());
        }

        return saved;
    }

    /**
     * Auto-dispatch: hands UNASSIGNED bookings at a garage (oldest first) to available technicians.
     * Called whenever technician capacity may have appeared — a technician joins, comes back online,
     * finishes a job, or has a job cancelled — so customers don't sit waiting for the owner to press
     * "retry" manually. Returns the bookings that got assigned.
     */
    @Transactional
    public List<Booking> dispatchWaitingBookings(Long garageId) {
        List<Booking> dispatched = new ArrayList<>();
        for (Booking waiting : bookingRepo.findByGarage_IdAndStatusOrderByCreatedAtAsc(garageId, BookingStatus.UNASSIGNED)) {
            GarageMember technician = assignmentService.assignTechnician(waiting);
            if (technician == null) break; // nobody available, the rest keep waiting
            dispatched.add(assignToBooking(waiting, technician));
        }
        return dispatched;
    }

    /** Retries auto-assignment (by rating) for a booking that was left UNASSIGNED because every technician was busy. */
    public Booking reassign(Long bookingId, Long currentOwnerId) {
        Booking booking = loadOwnedUnassignedBooking(bookingId, currentOwnerId);

        GarageMember assigned = assignmentService.assignTechnician(booking);
        if (assigned == null) {
            return booking; // still nobody available
        }
        return assignToBooking(booking, assigned);
    }

    /** Lets the owner pick a specific technician from their own garage for a stuck booking. */
    public Booking assignTechnicianManually(Long bookingId, Long technicianId, Long currentOwnerId) {
        Booking booking = loadOwnedUnassignedBooking(bookingId, currentOwnerId);

        GarageMember technician = garageMemberRepo.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found"));
        if (!technician.getGarage().getId().equals(booking.getGarage().getId())) {
            throw new ForbiddenActionException("This technician does not belong to the booking's garage");
        }

        return assignToBooking(booking, technician);
    }

    private Booking loadOwnedUnassignedBooking(Long bookingId, Long currentOwnerId) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (booking.getGarage().getOwnerUserId() == null || !booking.getGarage().getOwnerUserId().equals(currentOwnerId)) {
            throw new ForbiddenActionException("You do not own this garage");
        }
        if (booking.getStatus() != BookingStatus.UNASSIGNED) {
            throw new InvalidStateTransitionException("Only an UNASSIGNED booking can be (re)assigned (current status: " + booking.getStatus() + ")");
        }
        return booking;
    }

    private Booking assignToBooking(Booking booking, GarageMember technician) {
        booking.setAssignedMember(technician);
        booking.setStatus(BookingStatus.ASSIGNED);
        technician.setActiveJobs((technician.getActiveJobs() == null ? 0 : technician.getActiveJobs()) + 1);
        garageMemberRepo.save(technician);
        Booking saved = bookingRepo.save(booking);

        String faultLabel = saved.getFaultType().getName().replace("_", " ").toLowerCase();
        notificationService.notify(saved.getUserId(),
                "Your " + faultLabel + " booking at " + saved.getGarage().getName() + " has been assigned to a technician.",
                saved.getId());
        notificationService.notify(technician.getUserId(),
                "New job: " + faultLabel + (saved.getServiceAddress() != null ? " at " + saved.getServiceAddress() : ""),
                saved.getId());

        return saved;
    }
}
