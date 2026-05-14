package com.restaurant.order.service;

import com.restaurant.order.dto.LoginRequest;
import com.restaurant.order.dto.LoginResponse;
import com.restaurant.order.model.AppUser;
import com.restaurant.order.repository.AppUserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AppUserRepository userRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(AppUserRepository userRepo, PasswordEncoder encoder, JwtService jwt) {
        this.userRepo = userRepo;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    public LoginResponse login(LoginRequest req) {
        AppUser user = userRepo.findByUsername(req.username())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        String token = jwt.generate(user);
        return new LoginResponse(token, user.getUsername(), user.getDisplayName(), user.getRole());
    }
}
