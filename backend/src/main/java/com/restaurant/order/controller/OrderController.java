package com.restaurant.order.controller;

import com.restaurant.order.dto.OrderRequest;
import com.restaurant.order.model.CustomerOrder;
import com.restaurant.order.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // CREATE — place a new order
    @PostMapping
    public ResponseEntity<CustomerOrder> place(@RequestBody OrderRequest req) {
        CustomerOrder saved = orderService.placeOrder(req);
        return ResponseEntity.created(URI.create("/api/orders/" + saved.getId())).body(saved);
    }

    // READ — all orders (kitchen view)
    @GetMapping
    public List<CustomerOrder> list() {
        return orderService.findAll();
    }

    // READ — one order (customer or staff view)
    @GetMapping("/{id}")
    public CustomerOrder get(@PathVariable Long id) {
        return orderService.findById(id);
    }

    // UPDATE — kitchen transitions status
    @PutMapping("/{id}/status")
    public CustomerOrder updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return orderService.updateStatus(id, body.get("status"));
    }

    // DELETE — cancel order (soft: status → CANCELLED)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        orderService.cancel(id);
        return ResponseEntity.noContent().build();
    }
}
