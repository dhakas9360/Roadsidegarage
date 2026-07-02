package com.example.Garage;

import com.example.Garage.Model.FaultType;
import com.example.Garage.Model.Role;
import com.example.Garage.Model.VehicleType;
import com.example.Garage.Repository.FaultTypeRepo;
import com.example.Garage.Repository.RoleRepository;
import com.example.Garage.Repository.VehicleTypeRepo;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer {

    private final RoleRepository roleRepository;
    private final VehicleTypeRepo vehicleTypeRepo;
    private final FaultTypeRepo faultTypeRepo;

    @PostConstruct
    public void init() {
        seedRole("ROLE_USER");
        seedRole("ROLE_GARAGE_OWNER");
        seedRole("ROLE_GARAGE_MEMBER");

        seedVehicleType("HATCHBACK");
        seedVehicleType("SEDAN");
        seedVehicleType("SUV");
        seedVehicleType("BIKE");
        seedVehicleType("TRUCK");

        seedFaultType("BATTERY_ISSUE", "Battery not holding charge or dead battery");
        seedFaultType("FLAT_TYRE", "Punctured or flat tyre");
        seedFaultType("BRAKE_PROBLEM", "Worn or unresponsive brakes");
        seedFaultType("ENGINE_OVERHEATING", "Engine running hotter than normal");
        seedFaultType("ELECTRICAL_FAULT", "Wiring, lights, or electronics malfunction");
    }

    private void seedRole(String name) {
        if (roleRepository.findByName(name).isEmpty()) {
            roleRepository.save(new Role(name));
        }
    }

    private void seedVehicleType(String name) {
        if (vehicleTypeRepo.findByName(name).isEmpty()) {
            vehicleTypeRepo.save(new VehicleType(name));
        }
    }

    private void seedFaultType(String name, String description) {
        if (faultTypeRepo.findByName(name).isEmpty()) {
            faultTypeRepo.save(new FaultType(name, description));
        }
    }
}
