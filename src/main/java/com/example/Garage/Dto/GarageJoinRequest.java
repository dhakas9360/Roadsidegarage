package com.example.Garage.Dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GarageJoinRequest {
    @NotNull
    private Long garageId;

    private Double latitude;
    private Double longitude;
}
