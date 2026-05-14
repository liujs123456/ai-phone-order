package com.restaurant.order.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "demo_booking")
@Data
@NoArgsConstructor
public class DemoBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "restaurant_name", nullable = false)
    private String restaurantName;

    @Column(name = "contact_name", nullable = false)
    private String contactName;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column(name = "preferred_time", nullable = false)
    private String preferredTime;

    @Column(length = 1000)
    private String notes;

    /** NEW · CONTACTED · SCHEDULED · COMPLETED · ARCHIVED */
    @Column(nullable = false)
    private String status = "NEW";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
