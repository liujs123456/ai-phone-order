package com.restaurant.order.config;

import com.restaurant.order.model.MenuItem;
import com.restaurant.order.repository.MenuItemRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.List;

/**
 * Seeds the menu on first boot regardless of profile, so a fresh production
 * deployment to a brand-new Supabase database has data immediately. Idempotent —
 * does nothing once at least one row exists.
 */
@Configuration
public class MenuSeeder {

    @Bean
    ApplicationRunner seedMenu(MenuItemRepository repo) {
        return args -> {
            if (repo.count() > 0) return;
            repo.saveAll(List.of(
                    item("Kung Pao Chicken", "宫保鸡丁", "Diced chicken with peanuts, dried chili, and Sichuan peppercorn", "14.95", "Chicken", 2),
                    item("Mapo Tofu", "麻婆豆腐", "Silken tofu in a spicy fermented bean sauce with minced pork", "12.95", "Tofu", 3),
                    item("Sweet and Sour Pork", "咕咾肉", "Crispy battered pork with bell peppers and pineapple", "15.95", "Pork", 0),
                    item("Beef with Broccoli", "芥兰牛肉", "Sliced beef stir-fried with broccoli in oyster sauce", "16.95", "Beef", 0),
                    item("Egg Fried Rice", "蛋炒饭", "Wok-tossed rice with egg, scallions, and soy sauce", "9.95", "Rice", 0),
                    item("Chow Mein", "炒面", "Stir-fried noodles with vegetables and your choice of protein", "11.95", "Noodles", 0),
                    item("Hot and Sour Soup", "酸辣汤", "Classic sour and spicy soup with tofu and bamboo shoots", "6.95", "Soup", 2),
                    item("Spring Rolls (4)", "春卷", "Crispy vegetable spring rolls with sweet chili dip", "5.95", "Appetizer", 0),
                    item("Salt and Pepper Shrimp", "椒盐虾", "Wok-fried shrimp with garlic, chili, and Sichuan pepper salt", "18.95", "Seafood", 1),
                    item("Dan Dan Noodles", "担担面", "Spicy Sichuan noodles with minced pork and chili oil", "13.95", "Noodles", 3),
                    item("Steamed Dumplings (8)", "蒸饺", "Pork and chive dumplings with black vinegar dip", "8.95", "Appetizer", 0),
                    item("Mango Pudding", "芒果布丁", "Chilled mango pudding with fresh mango cubes", "4.95", "Dessert", 0)
            ));
        };
    }

    private static MenuItem item(String name, String nameCn, String desc, String price, String category, int spicy) {
        MenuItem m = new MenuItem();
        m.setName(name);
        m.setNameCn(nameCn);
        m.setDescription(desc);
        m.setPrice(new BigDecimal(price));
        m.setCategory(category);
        m.setSpicyLevel(spicy);
        m.setAvailable(true);
        return m;
    }
}
