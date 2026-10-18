package br.com.romenig.plataforma.perfil.foto;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.romenig.plataforma.planner.ErroDePlanoException;

/**
 * {@code POST /api/perfil/foto} recebe a imagem (multipart, campo
 * {@code arquivo}) e devolve {@code {"avatarUrl": "..."}};
 * {@code DELETE /api/perfil/foto} remove a foto. A imagem e exibida pela URL
 * publica do Supabase Storage.
 */
@RestController
@RequestMapping("/api/perfil/foto")
public class FotoPerfilController {

    public record FotoPerfilResponse(String avatarUrl) {
    }

    private final FotoPerfilService service;

    public FotoPerfilController(FotoPerfilService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FotoPerfilResponse salvar(@RequestPart("arquivo") MultipartFile arquivo) {
        if (arquivo.getSize() > NormalizadorFoto.LIMITE_BYTES) {
            throw new ErroDePlanoException("foto", "Selecione uma imagem PNG ou JPEG de até 2 MB.");
        }
        try {
            return new FotoPerfilResponse(service.salvar(arquivo.getBytes()));
        } catch (IOException e) {
            throw new ErroDePlanoException("foto", "Não foi possível ler o arquivo enviado.");
        }
    }

    @DeleteMapping
    public ResponseEntity<Void> remover() {
        service.remover();
        return ResponseEntity.noContent().build();
    }
}
