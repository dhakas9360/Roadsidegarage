package com.example.Garage.service;

import com.example.Garage.Model.Booking;
import com.example.Garage.Model.Garage;
import com.example.Garage.Model.GarageMember;
import com.example.Garage.Repository.GarageMemberRepo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class AssignmentService {

    private final GarageMemberRepo garageMemberRepo;
    private final int maxActiveJobs;

    public AssignmentService(GarageMemberRepo garageMemberRepo,
                             @Value("${garage.assignment.max-active-jobs:3}") int maxActiveJobs) {
        this.garageMemberRepo = garageMemberRepo;
        this.maxActiveJobs = maxActiveJobs;
    }

    /**
     * Picks the best available technician at the booking's garage, ranked by
     * rating (highest first), then by current workload (least busy first).
     * Technicians already at the concurrent-job cap are skipped, so the top-rated
     * technician doesn't receive every job while others sit idle.
     * Returns null if no technician has capacity — the booking then waits in the
     * UNASSIGNED queue and is auto-dispatched once someone frees up.
     */
    public GarageMember assignTechnician(Booking booking) {
        Garage garage = booking.getGarage();
        List<GarageMember> candidates = garageMemberRepo.findByGarageAndAvailable(garage, true).stream()
                .filter(m -> activeJobs(m) < maxActiveJobs)
                .sorted(Comparator.comparing((GarageMember m) -> m.getRating() == null ? 0.0 : m.getRating()).reversed()
                        .thenComparing(AssignmentService::activeJobs)
                        .thenComparing(GarageMember::getId))
                .toList();
        return candidates.isEmpty() ? null : candidates.get(0);
    }

    private static int activeJobs(GarageMember m) {
        return m.getActiveJobs() == null ? 0 : m.getActiveJobs();
    }
}
