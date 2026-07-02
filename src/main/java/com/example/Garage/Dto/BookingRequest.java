package com.example.Garage.Dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class BookingRequest {
    @NotNull
    private Long garageId;

    @NotNull
    private Long faultTypeId;

    @NotNull
    private Long vehicleId;

    @NotNull
    private LocalDate appointmentDate;
}
