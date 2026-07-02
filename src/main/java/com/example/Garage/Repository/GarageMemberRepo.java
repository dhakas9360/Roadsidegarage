package com.example.Garage.Repository;

import com.example.Garage.Model.Garage;
import com.example.Garage.Model.GarageMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageMemberRepo extends JpaRepository<GarageMember, Long> {
    List<GarageMember> findByGarageAndAvailable(Garage garage, boolean available);
    List<GarageMember> findByGarage_Id(Long garageId);
    Optional<GarageMember> findByUserId(Long userId);
}
