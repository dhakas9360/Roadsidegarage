package com.example.Garage.Dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FaultTypeRequest {
    @NotBlank(message = "Fault type name is required")
    private String name;
    private String description;
}
