package com.restaurant.order.dto;

import com.restaurant.order.model.MenuItem;

import java.util.List;

public record ChatResponse(String reply, List<MenuItem> suggestedItems) {
}
