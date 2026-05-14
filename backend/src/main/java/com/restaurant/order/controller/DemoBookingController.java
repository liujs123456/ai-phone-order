package com.restaurant.order.controller;

import com.restaurant.order.dto.DemoBookingRequest;
import com.restaurant.order.model.DemoBooking;
import com.restaurant.order.service.DemoBookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/demo-bookings")
public class DemoBookingController {

    private final DemoBookingService service;

    public DemoBookingController(DemoBookingService service) {
        this.service = service;
    }

    // PUBLIC — restaurant owners submit a lead
    @PostMapping
    public ResponseEntity<DemoBooking> submit(@RequestBody DemoBookingRequest req) {
        DemoBooking saved = service.submit(req);
        return ResponseEntity.created(URI.create("/api/demo-bookings/" + saved.getId())).body(saved);
    }

    // STAFF — view all leads
    @GetMapping
    public List<DemoBooking> list() {
        return service.all();
    }
}
