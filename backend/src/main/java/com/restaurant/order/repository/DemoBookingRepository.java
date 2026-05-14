package com.restaurant.order.repository;

import com.restaurant.order.model.DemoBooking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DemoBookingRepository extends JpaRepository<DemoBooking, Long> {
    List<DemoBooking> findAllByOrderByCreatedAtDesc();
}
