package com.example.Garage.Controller;

import com.example.Garage.Dto.GarageMemberRequest;
import com.example.Garage.Model.Garage;
import com.example.Garage.Model.GarageMember;
import com.example.Garage.Model.Role;
import com.example.Garage.Repository.GarageMemberRepo;
import com.example.Garage.Repository.GarageRepo;
import com.example.Garage.Repository.UserRepository;
import com.example.Garage.exception.ForbiddenActionException;
import com.example.Garage.exception.ResourceNotFoundException;
import com.example.Garage.service.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/garage-members")
@RequiredArgsConstructor
public class GarageMemberController {

    private final GarageMemberRepo garageMemberRepo;
    private final GarageRepo garageRepo;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER')")
    public ResponseEntity<?> addTechnician(@Valid @RequestBody GarageMemberRequest request) {
        Garage garage = garageRepo.findById(request.getGarageId())
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found"));
        if (!garage.getOwnerUserId().equals(currentUserService.getCurrentUserId())) {
            throw new ForbiddenActionException("You do not own this garage");
        }

        var user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isGarageMember = user.getRoles().stream().map(Role::getName).anyMatch("ROLE_GARAGE_MEMBER"::equals);
        if (!isGarageMember) {
            throw new ForbiddenActionException("Target user does not have the ROLE_GARAGE_MEMBER role");
        }
        if (garageMemberRepo.findByUserId(user.getId()).isPresent()) {
            return ResponseEntity.badRequest().body("This user is already a technician");
        }

        GarageMember member = new GarageMember();
        member.setGarage(garage);
        member.setUserId(user.getId());
        member.setLatitude(request.getLatitude());
        member.setLongitude(request.getLongitude());

        return ResponseEntity.ok(garageMemberRepo.save(member));
    }

    @GetMapping("/garage/{garageId}")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER') or hasAuthority('ROLE_GARAGE_MEMBER')")
    public ResponseEntity<List<GarageMember>> listByGarage(@PathVariable Long garageId) {
        return ResponseEntity.ok(garageMemberRepo.findByGarage_Id(garageId));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_MEMBER')")
    public ResponseEntity<?> myProfile() {
        GarageMember member = garageMemberRepo.findByUserId(currentUserService.getCurrentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("No technician profile found for this account"));
        return ResponseEntity.ok(member);
    }

    @PatchMapping("/me/availability")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_MEMBER')")
    public ResponseEntity<?> setAvailability(@RequestParam boolean available) {
        GarageMember member = garageMemberRepo.findByUserId(currentUserService.getCurrentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("No technician profile found for this account"));
        member.setAvailable(available);
        return ResponseEntity.ok(garageMemberRepo.save(member));
    }
}
