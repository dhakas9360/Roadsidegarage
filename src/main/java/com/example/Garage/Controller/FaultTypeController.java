package com.example.Garage.Controller;

import com.example.Garage.Dto.FaultTypeRequest;
import com.example.Garage.Model.FaultType;
import com.example.Garage.Repository.FaultTypeRepo;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fault-types")
@RequiredArgsConstructor
public class FaultTypeController {

    private final FaultTypeRepo faultTypeRepo;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<FaultType>> list() {
        return ResponseEntity.ok(faultTypeRepo.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER')")
    public ResponseEntity<?> create(@Valid @RequestBody FaultTypeRequest request) {
        if (faultTypeRepo.findByName(request.getName()).isPresent()) {
            return ResponseEntity.badRequest().body("Fault type already exists");
        }
        FaultType faultType = new FaultType(request.getName(), request.getDescription());
        return ResponseEntity.ok(faultTypeRepo.save(faultType));
    }
}
