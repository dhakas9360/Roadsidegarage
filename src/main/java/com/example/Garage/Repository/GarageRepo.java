package com.example.Garage.Repository;

import com.example.Garage.Model.Garage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageRepo extends JpaRepository<Garage, Long> {
    List<Garage> findByOwnerUserId(Long ownerUserId);
}
