package com.example.Garage.Repository;

import com.example.Garage.Model.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleTypeRepo extends JpaRepository<VehicleType, Long> {
    Optional<VehicleType> findByName(String name);
}
