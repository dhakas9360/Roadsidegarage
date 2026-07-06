package com.example.Garage.service;

import com.example.Garage.Model.*;
import com.example.Garage.Repository.*;
import com.example.Garage.exception.ForbiddenActionException;
import com.example.Garage.exception.GarageFullException;
import com.example.Garage.exception.InvalidStateTransitionException;
import com.example.Garage.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepo bookingRepo;
    private final GarageRepo garageRepo;
    private final VehicleRepo vehicleRepo;
    private final FaultTypeRepo faultTypeRepo;
    private final GarageServicePriceRepo garageServicePriceRepo;
    private final AssignmentService assignmentService;
    private final GarageMemberRepo garageMemberRepo;

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
            saved.setAssignedMember(assigned);
            saved.setStatus(BookingStatus.ASSIGNED);
            assigned.setActiveJobs((assigned.getActiveJobs() == null ? 0 : assigned.getActiveJobs()) + 1);
            garageMemberRepo.save(assigned);
        } else {
            saved.setStatus(BookingStatus.UNASSIGNED);
        }

        return bookingRepo.save(saved);
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
        return bookingRepo.save(booking);
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
        return bookingRepo.save(booking);
    }
}
