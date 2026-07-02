package com.example.Garage.service;

import com.example.Garage.Model.Booking;
import com.example.Garage.Model.Garage;
import com.example.Garage.Model.GarageMember;
import com.example.Garage.Repository.GarageMemberRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final GarageMemberRepo garageMemberRepo;

    /**
     * Picks the best available technician at the booking's garage, ranked by
     * rating (highest first), then by current workload (least busy first).
     * Returns null if no technician is available.
     */
    public GarageMember assignTechnician(Booking booking) {
        Garage garage = booking.getGarage();
        List<GarageMember> candidates = garageMemberRepo.findByGarageAndAvailable(garage, true);
        if (candidates.isEmpty()) return null;

        candidates.sort(
                Comparator.comparing((GarageMember m) -> m.getRating() == null ? 0.0 : m.getRating()).reversed()
                        .thenComparing(m -> m.getActiveJobs() == null ? 0 : m.getActiveJobs())
                        .thenComparing(GarageMember::getId)
        );

        return candidates.get(0);
    }
}
