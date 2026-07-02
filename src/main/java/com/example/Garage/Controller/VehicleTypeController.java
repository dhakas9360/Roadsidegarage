package com.example.Garage.Controller;

import com.example.Garage.Dto.VehicleTypeRequest;
import com.example.Garage.Model.VehicleType;
import com.example.Garage.Repository.VehicleTypeRepo;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicle-types")
@RequiredArgsConstructor
public class VehicleTypeController {

    private final VehicleTypeRepo vehicleTypeRepo;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<VehicleType>> list() {
        return ResponseEntity.ok(vehicleTypeRepo.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER')")
    public ResponseEntity<?> create(@Valid @RequestBody VehicleTypeRequest request) {
        if (vehicleTypeRepo.findByName(request.getName()).isPresent()) {
            return ResponseEntity.badRequest().body("Vehicle type already exists");
        }
        return ResponseEntity.ok(vehicleTypeRepo.save(new VehicleType(request.getName())));
    }
}
