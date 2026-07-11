package com.example.Garage.Dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FaultClassifyRequest {
    @NotBlank
    private String description;
}
