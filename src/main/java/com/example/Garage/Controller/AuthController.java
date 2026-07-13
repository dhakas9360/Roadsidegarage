package com.example.Garage.Controller;

import com.example.Garage.Dto.AuthResponse;
import com.example.Garage.Dto.LoginRequest;
import com.example.Garage.Dto.RegisterRequest;
import com.example.Garage.Model.Role;
import com.example.Garage.Model.User;
import com.example.Garage.Repository.RoleRepository;
import com.example.Garage.Repository.UserRepository;
import com.example.Garage.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final Set<String> ALLOWED_ROLES = Set.of("ROLE_USER", "ROLE_GARAGE_OWNER", "ROLE_GARAGE_MEMBER");

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.badRequest().body("Username is already taken");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email is already in use");
        }

        Set<String> roles = request.getRoles();
        if (roles != null && !ALLOWED_ROLES.containsAll(roles)) {
            return ResponseEntity.badRequest().body("Roles must be a subset of " + ALLOWED_ROLES);
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhone(request.getPhone());

        if (roles == null || roles.isEmpty()) {
            Role userRole = roleRepository.findByName("ROLE_USER").orElseGet(() -> roleRepository.save(new Role("ROLE_USER")));
            user.getRoles().add(userRole);
        } else {
            for (String r : roles) {
                Role role = roleRepository.findByName(r).orElseGet(() -> roleRepository.save(new Role(r)));
                user.getRoles().add(role);
            }
        }

        userRepository.save(user);
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        User user = userRepository.findByUsername(request.getUsername()).orElseThrow(() -> new RuntimeException("User not found"));

        List<String> roles = user.getRoles().stream().map(Role::getName).collect(Collectors.toList());
        String token = jwtUtils.generateJwtToken(user.getUsername(), roles);
        return ResponseEntity.ok(new AuthResponse(token, "Bearer", user.getId(), user.getUsername(), roles));
    }
}
