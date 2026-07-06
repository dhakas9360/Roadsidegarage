package com.example.Garage.Controller;

import com.example.Garage.Model.Booking;
import com.example.Garage.Repository.BookingRepo;
import com.example.Garage.service.BookingContactEnricher;
import com.example.Garage.service.CurrentUserService;
import com.example.Garage.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final BookingRepo bookingRepo;
    private final JobService jobService;
    private final CurrentUserService currentUserService;
    private final BookingContactEnricher contactEnricher;

    @GetMapping("/assigned")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_MEMBER')")
    public ResponseEntity<List<Booking>> myAssignedJobs() {
        var technician = jobService.getTechnicianForUser(currentUserService.getCurrentUserId());
        return ResponseEntity.ok(contactEnricher.enrich(bookingRepo.findByAssignedMember(technician)));
    }

    @PatchMapping("/{id}/accept")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_MEMBER')")
    public ResponseEntity<?> acceptJob(@PathVariable Long id) {
        return ResponseEntity.ok(contactEnricher.enrich(jobService.acceptJob(id, currentUserService.getCurrentUserId())));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_MEMBER')")
    public ResponseEntity<?> completeJob(@PathVariable Long id) {
        return ResponseEntity.ok(contactEnricher.enrich(jobService.completeJob(id, currentUserService.getCurrentUserId())));
    }
}
