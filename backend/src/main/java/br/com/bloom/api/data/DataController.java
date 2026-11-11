package br.com.bloom.api.data;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.bloom.api.auth.AuthInterceptor;

@RestController
@RequestMapping("/api/data")
public class DataController {

    private final DataService dataService;

    public DataController(DataService dataService) {
        this.dataService = dataService;
    }

    /** Conta nova ainda não tem dados: responde o JSON "null", que o Angular trata como vazio. */
    @GetMapping
    public ResponseEntity<?> get(@RequestAttribute(AuthInterceptor.USER_ID) String userId) {
        BloomData data = dataService.findByUser(userId);
        if (data == null) {
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body("null");
        }
        return ResponseEntity.ok(data);
    }

    @PutMapping
    public Map<String, Boolean> put(
            @RequestAttribute(AuthInterceptor.USER_ID) String userId,
            @RequestBody BloomData data) {
        dataService.gravar(userId, data);
        return Map.of("saved", true);
    }
}
