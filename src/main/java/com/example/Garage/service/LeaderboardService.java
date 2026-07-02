package com.example.Garage.service;

import com.example.Garage.Dto.LeaderboardEntryResponse;
import com.example.Garage.Model.Booking;
import com.example.Garage.Model.BookingStatus;
import com.example.Garage.Model.GarageMember;
import com.example.Garage.Repository.BookingRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final BookingRepo bookingRepo;

    /** Per-garage "employee of the month" leaderboard, ranked by average customer rating. */
    public List<LeaderboardEntryResponse> monthlyLeaderboard(Long garageId, YearMonth month) {
        LocalDateTime start = month.atDay(1).atStartOfDay();
        LocalDateTime end = month.atEndOfMonth().atTime(LocalTime.MAX);

        List<Booking> ratedJobs = bookingRepo.findByGarage_IdAndStatusAndRatedAtBetween(garageId, BookingStatus.RATED, start, end);

        Map<GarageMember, List<Booking>> byTechnician = ratedJobs.stream()
                .filter(b -> b.getAssignedMember() != null)
                .collect(Collectors.groupingBy(Booking::getAssignedMember));

        List<LeaderboardEntryResponse> entries = byTechnician.entrySet().stream()
                .map(entry -> {
                    GarageMember technician = entry.getKey();
                    List<Booking> jobs = entry.getValue();
                    double average = jobs.stream().mapToInt(Booking::getRating).average().orElse(0.0);
                    return new LeaderboardEntryResponse(0, technician.getId(), technician.getUserId(), average, jobs.size());
                })
                .sorted(Comparator.comparingDouble(LeaderboardEntryResponse::getAverageRating).reversed())
                .collect(Collectors.toList());

        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).setRank(i + 1);
        }
        return entries;
    }
}
