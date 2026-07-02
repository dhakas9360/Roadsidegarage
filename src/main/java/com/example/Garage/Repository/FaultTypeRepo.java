package com.example.Garage.Repository;

import com.example.Garage.Model.FaultType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FaultTypeRepo extends JpaRepository<FaultType, Long> {
    Optional<FaultType> findByName(String name);
}
