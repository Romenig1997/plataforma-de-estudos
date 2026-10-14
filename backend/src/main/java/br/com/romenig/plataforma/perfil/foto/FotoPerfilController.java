package br.com.romenig.plataforma.perfil.foto;
import java.io.IOException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import br.com.romenig.plataforma.planner.ErroDePlanoException;
@RestController @RequestMapping("/api/perfil/foto")
public class FotoPerfilController {
 private final FotoPerfilService service;public FotoPerfilController(FotoPerfilService s){service=s;}
 private ResponseEntity<byte[]> imagem(byte[] bytes){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG).contentLength(bytes.length).body(bytes);}
 @GetMapping public ResponseEntity<byte[]> buscar(){return service.buscar().map(this::imagem).orElseGet(()->ResponseEntity.noContent().build());}
 @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE) public ResponseEntity<byte[]> salvar(@RequestPart("arquivo") MultipartFile arquivo){
  if(arquivo.getSize()>NormalizadorFoto.LIMITE_BYTES)throw new ErroDePlanoException("foto","Selecione uma imagem PNG ou JPEG de até 2 MB.");
  try{return imagem(service.salvar(arquivo.getBytes()));}catch(IOException e){throw new ErroDePlanoException("foto","Não foi possível ler o arquivo enviado.");}
 }
 @DeleteMapping public ResponseEntity<Void> remover(){service.remover();return ResponseEntity.noContent().build();}
}
