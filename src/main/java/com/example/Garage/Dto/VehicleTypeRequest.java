package com.example.Garage.Dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VehicleTypeRequest {
    @NotBlank(message = "Vehicle type name is required")
    private String name;
}
