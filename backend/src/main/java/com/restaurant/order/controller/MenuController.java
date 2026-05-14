package com.restaurant.order.controller;

import com.restaurant.order.model.MenuItem;
import com.restaurant.order.service.MenuService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/menu")
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    // READ — list
    @GetMapping
    public List<MenuItem> list(@RequestParam(required = false) String category,
                               @RequestParam(required = false) String q) {
        if (q != null && !q.isBlank()) return menuService.search(q);
        if (category != null && !category.isBlank()) return menuService.byCategory(category);
        return menuService.all();
    }

    // READ — one
    @GetMapping("/{id}")
    public MenuItem get(@PathVariable Long id) {
        return menuService.byId(id);
    }

    // CREATE
    @PostMapping
    public ResponseEntity<MenuItem> create(@RequestBody MenuItem item) {
        MenuItem saved = menuService.create(item);
        return ResponseEntity.created(URI.create("/api/menu/" + saved.getId())).body(saved);
    }

    // UPDATE
    @PutMapping("/{id}")
    public MenuItem update(@PathVariable Long id, @RequestBody MenuItem patch) {
        return menuService.update(id, patch);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        menuService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
