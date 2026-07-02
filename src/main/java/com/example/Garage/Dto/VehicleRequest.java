package com.example.Garage.Dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VehicleRequest {
    @NotNull
    private Long vehicleTypeId;

    private String model;
    private Integer year;
    private String licensePlate;
}
