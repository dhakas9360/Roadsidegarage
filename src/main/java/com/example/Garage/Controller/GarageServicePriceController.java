package com.example.Garage.Controller;

import com.example.Garage.Dto.GarageServicePriceRequest;
import com.example.Garage.Model.FaultType;
import com.example.Garage.Model.Garage;
import com.example.Garage.Model.GarageServicePrice;
import com.example.Garage.Model.VehicleType;
import com.example.Garage.Repository.FaultTypeRepo;
import com.example.Garage.Repository.GarageRepo;
import com.example.Garage.Repository.GarageServicePriceRepo;
import com.example.Garage.Repository.VehicleTypeRepo;
import com.example.Garage.exception.ForbiddenActionException;
import com.example.Garage.exception.ResourceNotFoundException;
import com.example.Garage.service.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/garages/{garageId}/prices")
@RequiredArgsConstructor
public class GarageServicePriceController {

    private final GarageServicePriceRepo garageServicePriceRepo;
    private final GarageRepo garageRepo;
    private final FaultTypeRepo faultTypeRepo;
    private final VehicleTypeRepo vehicleTypeRepo;
    private final CurrentUserService currentUserService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<GarageServicePrice>> list(@PathVariable Long garageId) {
        return ResponseEntity.ok(garageServicePriceRepo.findByGarage_Id(garageId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER')")
    public ResponseEntity<?> setPrice(@PathVariable Long garageId, @Valid @RequestBody GarageServicePriceRequest request) {
        Garage garage = garageRepo.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found"));
        if (!garage.getOwnerUserId().equals(currentUserService.getCurrentUserId())) {
            throw new ForbiddenActionException("You do not own this garage");
        }

        FaultType faultType = faultTypeRepo.findById(request.getFaultTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Fault type not found"));
        VehicleType vehicleType = vehicleTypeRepo.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle type not found"));

        GarageServicePrice price = garageServicePriceRepo
                .findByGarage_IdAndFaultType_IdAndVehicleType_Id(garageId, faultType.getId(), vehicleType.getId())
                .orElseGet(GarageServicePrice::new);
        price.setGarage(garage);
        price.setFaultType(faultType);
        price.setVehicleType(vehicleType);
        price.setPrice(request.getPrice());

        return ResponseEntity.ok(garageServicePriceRepo.save(price));
    }
}
