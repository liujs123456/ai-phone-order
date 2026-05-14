package com.restaurant.order.service;

import com.restaurant.order.dto.DemoBookingRequest;
import com.restaurant.order.model.DemoBooking;
import com.restaurant.order.repository.DemoBookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;

@Service
public class DemoBookingService {

    private static final Logger log = LoggerFactory.getLogger(DemoBookingService.class);
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final DemoBookingRepository repo;

    public DemoBookingService(DemoBookingRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public DemoBooking submit(DemoBookingRequest req) {
        validate(req);

        DemoBooking b = new DemoBooking();
        b.setRestaurantName(req.restaurantName().trim());
        b.setContactName(req.contactName().trim());
        b.setEmail(req.email().trim());
        b.setPhone(req.phone().trim());
        b.setPreferredTime(req.preferredTime().trim());
        b.setNotes(req.notes() == null || req.notes().isBlank() ? null : req.notes().trim());

        DemoBooking saved = repo.save(b);
        log.info("Demo booking #{} submitted: {} <{}> for {}",
                saved.getId(), saved.getContactName(), saved.getEmail(), saved.getRestaurantName());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<DemoBooking> all() {
        return repo.findAllByOrderByCreatedAtDesc();
    }

    private void validate(DemoBookingRequest req) {
        if (req == null) throw new IllegalArgumentException("Request body is required.");
        requireNonBlank(req.restaurantName(), "Restaurant name");
        requireNonBlank(req.contactName(), "Contact name");
        requireNonBlank(req.email(), "Email");
        requireNonBlank(req.phone(), "Phone");
        requireNonBlank(req.preferredTime(), "Preferred demo time");

        if (!EMAIL.matcher(req.email().trim()).matches()) {
            throw new IllegalArgumentException("Email format looks wrong.");
        }
        String digits = req.phone().replaceAll("\\D", "");
        if (digits.length() < 7) {
            throw new IllegalArgumentException("Phone number must contain at least 7 digits.");
        }
    }

    private static void requireNonBlank(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " is required.");
        }
    }
}
