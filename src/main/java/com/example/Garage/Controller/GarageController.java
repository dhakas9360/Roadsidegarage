package com.example.Garage.Controller;

import com.example.Garage.Dto.GarageRequest;
import com.example.Garage.Dto.NearbyGarageResponse;
import com.example.Garage.Model.Garage;
import com.example.Garage.Repository.GarageRepo;
import com.example.Garage.Repository.GarageServicePriceRepo;
import com.example.Garage.service.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/garages")
@RequiredArgsConstructor
public class GarageController {

    private final GarageRepo garageRepo;
    private final GarageServicePriceRepo garageServicePriceRepo;
    private final CurrentUserService currentUserService;

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER')")
    public ResponseEntity<?> createGarage(@Valid @RequestBody GarageRequest request) {
        Garage garage = new Garage();
        garage.setOwnerUserId(currentUserService.getCurrentUserId());
        garage.setName(request.getName());
        garage.setAddress(request.getAddress());
        garage.setLatitude(request.getLatitude());
        garage.setLongitude(request.getLongitude());
        garage.setDailyCapacity(request.getDailyCapacity());
        return ResponseEntity.ok(garageRepo.save(garage));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Garage>> listGarages() {
        return ResponseEntity.ok(garageRepo.findAll());
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER')")
    public ResponseEntity<List<Garage>> myGarages() {
        return ResponseEntity.ok(garageRepo.findByOwnerUserId(currentUserService.getCurrentUserId()));
    }

    /**
     * Finds nearby garages within radiusKm. If faultTypeId and vehicleTypeId are both supplied,
     * only garages that price that fault for that vehicle type are returned, with their price.
     */
    @GetMapping("/nearby")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NearbyGarageResponse>> nearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "50") double radiusKm,
            @RequestParam(required = false) Long faultTypeId,
            @RequestParam(required = false) Long vehicleTypeId) {

        List<Garage> all = garageRepo.findAll();
        boolean priceRequested = faultTypeId != null && vehicleTypeId != null;

        List<NearbyGarageResponse> result = all.stream()
                .map(g -> new NearbyGarageResponse(g, haversineKm(lat, lng, g.getLatitude(), g.getLongitude()), null))
                .filter(gd -> gd.getDistanceKm() <= radiusKm)
                .map(gd -> {
                    if (!priceRequested) return gd;
                    Double price = garageServicePriceRepo
                            .findByGarage_IdAndFaultType_IdAndVehicleType_Id(gd.getGarage().getId(), faultTypeId, vehicleTypeId)
                            .map(com.example.Garage.Model.GarageServicePrice::getPrice)
                            .orElse(null);
                    return new NearbyGarageResponse(gd.getGarage(), gd.getDistanceKm(), price);
                })
                .filter(gd -> !priceRequested || gd.getPrice() != null)
                .sorted(Comparator.comparingDouble(NearbyGarageResponse::getDistanceKm))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    private static double haversineKm(double lat1, double lon1, Double lat2, Double lon2) {
        if (lat2 == null || lon2 == null) return Double.MAX_VALUE;
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
