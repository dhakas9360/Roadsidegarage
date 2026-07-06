package com.example.Garage.service;

import com.example.Garage.Model.*;
import com.example.Garage.Repository.*;
import com.example.Garage.exception.ForbiddenActionException;
import com.example.Garage.exception.GarageFullException;
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
            throw new com.example.Garage.exception.InvalidStateTransitionException(
                    "Cannot cancel a booking that is " + booking.getStatus());
        }

        GarageMember member = booking.getAssignedMember();
        if (member != null && (booking.getStatus() == BookingStatus.ASSIGNED || booking.getStatus() == BookingStatus.IN_PROGRESS)) {
            member.setActiveJobs(Math.max(0, (member.getActiveJobs() == null ? 0 : member.getActiveJobs()) - 1));
            garageMemberRepo.save(member);
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return bookingRepo.save(booking);
    }
}
