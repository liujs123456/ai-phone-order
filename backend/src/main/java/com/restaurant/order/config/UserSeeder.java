package com.restaurant.order.config;

import com.restaurant.order.model.AppUser;
import com.restaurant.order.repository.AppUserRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class UserSeeder {

    /**
     * Seed the staff account on first boot. Customers don't have accounts —
     * the customer side of the app is anonymous.
     *   staff / staff123  → ROLE_STAFF
     */
    @Bean
    ApplicationRunner seedUsers(AppUserRepository repo, PasswordEncoder enc) {
        return args -> {
            if (repo.findByUsername("staff").isEmpty()) {
                AppUser s = new AppUser();
                s.setUsername("staff");
                s.setPasswordHash(enc.encode("staff123"));
                s.setRole("STAFF");
                s.setDisplayName("Kitchen Staff");
                repo.save(s);
            }
        };
    }
}
