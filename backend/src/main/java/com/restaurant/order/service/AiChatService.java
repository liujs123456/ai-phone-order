package com.restaurant.order.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.restaurant.order.dto.ChatRequest;
import com.restaurant.order.dto.ChatResponse;
import com.restaurant.order.model.MenuItem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Calls Groq's OpenAI-compatible Chat Completions API with a `search_menu`
 * function. The model decides when to query the live menu; we run the function
 * against MenuService and feed the JSON back so replies are grounded in real data.
 *
 * Get a free Groq API key at https://console.groq.com/keys.
 */
@Service
public class AiChatService {

    private static final int MAX_TOOL_ROUNDS = 6;

    private static final String SYSTEM_PROMPT = """
            You are an AI phone-order assistant for a Chinese-American restaurant.
            Greet the caller, help them choose dishes, and confirm the order.

            Rules:
            - When the user mentions a dish, ingredient, dietary preference, or budget,
              call the `search_menu` function with a concise query and rely ONLY on its
              results — never invent dishes or prices.
            - Keep replies short and natural, suitable for a phone call.
              Prices belong in USD with two decimals.
            - When unsure, ask one clarifying question.
              Before finalizing, read back the order and total.
            - You may answer in the same language the user used (English or Chinese).
            """;

    private final MenuService menuService;
    private final WebClient webClient;
    private final ObjectMapper json = new ObjectMapper();
    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final int maxTokens;

    public AiChatService(MenuService menuService,
                         WebClient.Builder webClientBuilder,
                         @Value("${groq.api-key:}") String apiKey,
                         @Value("${groq.base-url:https://api.groq.com/openai/v1}") String baseUrl,
                         @Value("${groq.model:llama-3.3-70b-versatile}") String model,
                         @Value("${groq.max-tokens:1024}") int maxTokens) {
        this.menuService = menuService;
        this.webClient = webClientBuilder.build();
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.maxTokens = maxTokens;
    }

    public ChatResponse chat(ChatRequest req) {
        if (req == null || req.messages() == null || req.messages().isEmpty()) {
            return new ChatResponse("Hi! What can I get started for you today?", List.of());
        }
        if (apiKey == null || apiKey.isBlank()) {
            return offlineFallback(req);
        }

        ArrayNode messages = json.createArrayNode();
        ObjectNode system = json.createObjectNode();
        system.put("role", "system");
        system.put("content", SYSTEM_PROMPT);
        messages.add(system);
        for (ChatRequest.Message m : req.messages()) {
            ObjectNode node = json.createObjectNode();
            node.put("role", m.role());
            node.put("content", m.content());
            messages.add(node);
        }

        Map<Long, MenuItem> surfaced = new LinkedHashMap<>();

        for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
            JsonNode response = callGroq(messages);
            JsonNode choice = response.path("choices").path(0);
            JsonNode message = choice.path("message");
            String finishReason = choice.path("finish_reason").asText("stop");

            // Echo the assistant message back into the conversation, including any tool_calls.
            messages.add(message.deepCopy());

            if (!"tool_calls".equals(finishReason) || !message.has("tool_calls")) {
                String reply = message.path("content").asText("(no reply)");
                return new ChatResponse(reply, List.copyOf(surfaced.values()));
            }

            for (JsonNode call : message.path("tool_calls")) {
                String callId = call.path("id").asText();
                String name = call.path("function").path("name").asText();
                String argsJson = call.path("function").path("arguments").asText("{}");

                String resultJson = runTool(name, argsJson, surfaced);

                ObjectNode toolMsg = json.createObjectNode();
                toolMsg.put("role", "tool");
                toolMsg.put("tool_call_id", callId);
                toolMsg.put("name", name);
                toolMsg.put("content", resultJson);
                messages.add(toolMsg);
            }
        }

        return new ChatResponse("Sorry, I had trouble finalizing that. Let me transfer you.",
                List.copyOf(surfaced.values()));
    }

    private JsonNode callGroq(ArrayNode messages) {
        ObjectNode body = json.createObjectNode();
        body.put("model", model);
        body.put("max_tokens", maxTokens);
        body.put("temperature", 0.4);
        body.set("messages", messages);
        body.set("tools", buildTools());
        body.put("tool_choice", "auto");

        try {
            return webClient.post()
                    .uri(baseUrl + "/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body.toString())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            // Llama 3.3 sometimes emits the legacy <function=name {args} </function> syntax
            // that Groq's parser rejects as tool_use_failed. Recover by extracting it manually.
            JsonNode recovered = recoverFromToolUseFailure(e.getResponseBodyAsString());
            if (recovered != null) return recovered;
            return errorResponse(e.getStatusCode() + ": " + e.getResponseBodyAsString());
        } catch (Exception e) {
            return errorResponse(e.getMessage());
        }
    }

    private static final Pattern LEGACY_TOOL_CALL =
            Pattern.compile("<function=(\\w+)\\s*(\\{.*?\\})\\s*(?:</function>|>)", Pattern.DOTALL);

    private JsonNode recoverFromToolUseFailure(String responseBody) {
        try {
            JsonNode root = json.readTree(responseBody);
            if (!"tool_use_failed".equals(root.path("error").path("code").asText())) return null;
            String failed = root.path("error").path("failed_generation").asText("");
            Matcher m = LEGACY_TOOL_CALL.matcher(failed);
            if (!m.find()) return null;
            String fnName = m.group(1);
            String fnArgs = m.group(2);

            ObjectNode toolCall = json.createObjectNode();
            toolCall.put("id", "recovered_" + System.nanoTime());
            toolCall.put("type", "function");
            ObjectNode fn = json.createObjectNode();
            fn.put("name", fnName);
            fn.put("arguments", fnArgs);
            toolCall.set("function", fn);

            ArrayNode toolCalls = json.createArrayNode();
            toolCalls.add(toolCall);

            ObjectNode message = json.createObjectNode();
            message.put("role", "assistant");
            message.set("tool_calls", toolCalls);

            ObjectNode choice = json.createObjectNode();
            choice.set("message", message);
            choice.put("finish_reason", "tool_calls");

            ArrayNode choices = json.createArrayNode();
            choices.add(choice);
            ObjectNode wrapper = json.createObjectNode();
            wrapper.set("choices", choices);
            return wrapper;
        } catch (Exception ignored) {
            return null;
        }
    }

    private JsonNode errorResponse(String message) {
        ObjectNode err = json.createObjectNode();
        ObjectNode msg = json.createObjectNode();
        msg.put("role", "assistant");
        msg.put("content", "Sorry, the AI service is unreachable right now: " + message);
        ObjectNode choice = json.createObjectNode();
        choice.set("message", msg);
        choice.put("finish_reason", "stop");
        ArrayNode choices = json.createArrayNode();
        choices.add(choice);
        err.set("choices", choices);
        return err;
    }

    private ArrayNode buildTools() {
        ArrayNode tools = json.createArrayNode();
        ObjectNode tool = json.createObjectNode();
        tool.put("type", "function");

        ObjectNode fn = json.createObjectNode();
        fn.put("name", "search_menu");
        fn.put("description",
                "Search the live restaurant menu for dishes matching a query. " +
                        "Returns id, name, name_cn, description, price (USD), category, spicy_level (0-3). " +
                        "Use one concise query like 'spicy noodle' or 'tofu'.");

        ObjectNode params = json.createObjectNode();
        params.put("type", "object");
        ObjectNode props = json.createObjectNode();
        ObjectNode q = json.createObjectNode();
        q.put("type", "string");
        q.put("description", "Keywords to search the menu (name, category, or ingredient).");
        props.set("query", q);
        params.set("properties", props);
        ArrayNode required = json.createArrayNode();
        required.add("query");
        params.set("required", required);
        fn.set("parameters", params);

        tool.set("function", fn);
        tools.add(tool);
        return tools;
    }

    private String runTool(String name, String argsJson, Map<Long, MenuItem> surfaced) {
        if (!"search_menu".equals(name)) return "{\"error\":\"unknown tool\"}";
        String query;
        try {
            query = json.readTree(argsJson).path("query").asText("");
        } catch (Exception e) {
            query = "";
        }
        List<MenuItem> hits = menuService.search(query);

        ArrayNode arr = json.createArrayNode();
        for (MenuItem m : hits) {
            ObjectNode n = json.createObjectNode();
            n.put("id", m.getId());
            n.put("name", m.getName());
            if (m.getNameCn() != null) n.put("name_cn", m.getNameCn());
            n.put("description", m.getDescription());
            n.put("price", m.getPrice().toPlainString());
            n.put("category", m.getCategory());
            if (m.getSpicyLevel() != null) n.put("spicy_level", m.getSpicyLevel());
            arr.add(n);
            surfaced.putIfAbsent(m.getId(), m);
        }
        ObjectNode wrapper = json.createObjectNode();
        wrapper.put("query", query);
        wrapper.put("count", hits.size());
        wrapper.set("results", arr);
        return wrapper.toString();
    }

    /** Used when GROQ_API_KEY isn't set so the demo still runs. */
    private ChatResponse offlineFallback(ChatRequest req) {
        String last = req.messages().get(req.messages().size() - 1).content();
        List<MenuItem> hits = menuService.search(last);
        List<MenuItem> top = hits.size() > 3 ? hits.subList(0, 3) : hits;
        StringBuilder reply = new StringBuilder("(Demo mode — no GROQ_API_KEY set.) ");
        if (top.isEmpty()) {
            reply.append("I couldn't find anything matching that. Want me to read the menu?");
        } else {
            reply.append("Here's what I found: ");
            for (int i = 0; i < top.size(); i++) {
                MenuItem m = top.get(i);
                reply.append(m.getName()).append(" ($").append(m.getPrice()).append(")");
                if (i < top.size() - 1) reply.append(", ");
            }
            reply.append(". Want to add any?");
        }
        return new ChatResponse(reply.toString(), List.copyOf(top));
    }
}
