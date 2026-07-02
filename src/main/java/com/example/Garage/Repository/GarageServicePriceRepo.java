package com.example.Garage.Repository;

import com.example.Garage.Model.GarageServicePrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageServicePriceRepo extends JpaRepository<GarageServicePrice, Long> {
    List<GarageServicePrice> findByGarage_Id(Long garageId);
    Optional<GarageServicePrice> findByGarage_IdAndFaultType_IdAndVehicleType_Id(Long garageId, Long faultTypeId, Long vehicleTypeId);
}
