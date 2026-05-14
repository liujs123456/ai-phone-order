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
     * Seed the two internal accounts on first boot. Customers (restaurant
     * patrons) are anonymous — only the operator's people have accounts.
     *   staff / staff123  → ROLE_STAFF  (kitchen — handles incoming orders)
     *   admin / admin123  → ROLE_ADMIN  (UP sales — follows up demo-booking leads)
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
            if (repo.findByUsername("admin").isEmpty()) {
                AppUser a = new AppUser();
                a.setUsername("admin");
                a.setPasswordHash(enc.encode("admin123"));
                a.setRole("ADMIN");
                a.setDisplayName("UP Sales");
                repo.save(a);
            }
        };
    }
}
