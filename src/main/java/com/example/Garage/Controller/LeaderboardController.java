package com.example.Garage.Controller;

import com.example.Garage.Dto.LeaderboardEntryResponse;
import com.example.Garage.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/garages/{garageId}/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    /** Monthly "employee of the month" leaderboard for a garage's technicians. Defaults to the current month. nice  */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<LeaderboardEntryResponse>> monthly(
            @PathVariable Long garageId,
            @RequestParam(required = false) String month) {
        YearMonth yearMonth = (month == null || month.isBlank()) ? YearMonth.now() : YearMonth.parse(month);
        return ResponseEntity.ok(leaderboardService.monthlyLeaderboard(garageId, yearMonth));
    }
}
