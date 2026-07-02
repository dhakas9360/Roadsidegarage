package com.example.Garage.Controller;

import com.example.Garage.Dto.VehicleRequest;
import com.example.Garage.Model.Vehicle;
import com.example.Garage.Model.VehicleType;
import com.example.Garage.Repository.VehicleRepo;
import com.example.Garage.Repository.VehicleTypeRepo;
import com.example.Garage.exception.ResourceNotFoundException;
import com.example.Garage.service.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleRepo vehicleRepo;
    private final VehicleTypeRepo vehicleTypeRepo;
    private final CurrentUserService currentUserService;

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<?> registerVehicle(@Valid @RequestBody VehicleRequest request) {
        VehicleType vehicleType = vehicleTypeRepo.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle type not found"));

        Vehicle vehicle = new Vehicle();
        vehicle.setUserId(currentUserService.getCurrentUserId());
        vehicle.setVehicleType(vehicleType);
        vehicle.setModel(request.getModel());
        vehicle.setYear(request.getYear());
        vehicle.setLicensePlate(request.getLicensePlate());

        return ResponseEntity.ok(vehicleRepo.save(vehicle));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<List<Vehicle>> myVehicles() {
        return ResponseEntity.ok(vehicleRepo.findByUserId(currentUserService.getCurrentUserId()));
    }
}
