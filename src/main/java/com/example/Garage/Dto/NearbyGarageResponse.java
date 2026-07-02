package com.example.Garage.Dto;

import com.example.Garage.Model.Garage;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class NearbyGarageResponse {
    private Garage garage;
    private double distanceKm;
    // minimum price for the requested fault + vehicle type; null if not offered or not requested
    private Double price;
}
