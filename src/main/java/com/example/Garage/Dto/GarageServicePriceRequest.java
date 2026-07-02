package com.example.Garage.Dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class GarageServicePriceRequest {
    @NotNull
    private Long faultTypeId;

    @NotNull
    private Long vehicleTypeId;

    @NotNull
    @Positive
    private Double price;
}
