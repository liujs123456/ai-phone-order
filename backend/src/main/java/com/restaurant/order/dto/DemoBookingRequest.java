package com.restaurant.order.dto;

public record DemoBookingRequest(
        String restaurantName,
        String contactName,
        String email,
        String phone,
        String preferredTime,
        String notes
) {}
