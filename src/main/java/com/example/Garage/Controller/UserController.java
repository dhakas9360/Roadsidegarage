package com.example.Garage.Controller;

import com.example.Garage.Dto.UpdateProfileRequest;
import com.example.Garage.Dto.UserProfileResponse;
import com.example.Garage.Model.Role;
import com.example.Garage.Model.User;
import com.example.Garage.Repository.UserRepository;
import com.example.Garage.service.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me() {
        return ResponseEntity.ok(toResponse(currentUserService.getCurrentUser()));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@Valid @RequestBody UpdateProfileRequest request) {
        User user = currentUserService.getCurrentUser();

        if (!user.getEmail().equalsIgnoreCase(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email is already in use");
        }

        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setNationality(request.getNationality());
        user.setResidentialAddress(request.getResidentialAddress());
        userRepository.save(user);

        return ResponseEntity.ok(toResponse(user));
    }

    private UserProfileResponse toResponse(User user) {
        List<String> roles = user.getRoles().stream().map(Role::getName).collect(Collectors.toList());
        return new UserProfileResponse(user.getId(), user.getUsername(), user.getEmail(), user.getPhone(), user.getNationality(), user.getResidentialAddress(), roles);
    }
}
