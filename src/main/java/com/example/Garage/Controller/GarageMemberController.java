package com.example.Garage.Controller;

import com.example.Garage.Dto.GarageMemberRequest;
import com.example.Garage.Dto.UserSummaryResponse;
import com.example.Garage.Model.Garage;
import com.example.Garage.Model.GarageMember;
import com.example.Garage.Model.Role;
import com.example.Garage.Model.User;
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
import java.util.Set;
import java.util.stream.Collectors;

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

    @GetMapping("/available-technicians")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER')")
    public ResponseEntity<List<UserSummaryResponse>> availableTechnicians() {
        Set<Long> alreadyAssigned = garageMemberRepo.findAll().stream()
                .map(GarageMember::getUserId)
                .collect(Collectors.toSet());

        List<UserSummaryResponse> result = userRepository.findByRoles_Name("ROLE_GARAGE_MEMBER").stream()
                .filter(u -> !alreadyAssigned.contains(u.getId()))
                .map(u -> new UserSummaryResponse(u.getId(), u.getUsername()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/garage/{garageId}")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER') or hasAuthority('ROLE_GARAGE_MEMBER')")
    public ResponseEntity<List<GarageMember>> listByGarage(@PathVariable Long garageId) {
        List<GarageMember> members = garageMemberRepo.findByGarage_Id(garageId);
        members.forEach(this::attachContactInfo);
        return ResponseEntity.ok(members);
    }

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('ROLE_GARAGE_MEMBER')")
    public ResponseEntity<?> myProfile() {
        GarageMember member = garageMemberRepo.findByUserId(currentUserService.getCurrentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("No technician profile found for this account"));
        attachContactInfo(member);
        return ResponseEntity.ok(member);
    }

    private void attachContactInfo(GarageMember member) {
        userRepository.findById(member.getUserId()).ifPresent(u -> {
            member.setUsername(u.getUsername());
            member.setPhone(u.getPhone());
        });
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
