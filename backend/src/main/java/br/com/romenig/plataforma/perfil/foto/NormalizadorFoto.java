package br.com.romenig.plataforma.perfil.foto;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Component;
import br.com.romenig.plataforma.planner.ErroDePlanoException;
@Component
public class NormalizadorFoto {
 public static final int LIMITE_BYTES=2*1024*1024;
 private ErroDePlanoException invalida(String m){return new ErroDePlanoException("foto",m);}
 public byte[] normalizar(byte[] bytes){
  if(bytes.length==0||bytes.length>LIMITE_BYTES)throw invalida("Selecione uma imagem PNG ou JPEG de até 2 MB.");
  try(var entrada=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))){
   var leitores=ImageIO.getImageReaders(entrada);if(!leitores.hasNext())throw invalida("O arquivo não contém uma imagem PNG ou JPEG válida.");
   var leitor=leitores.next();
   try{
    String formato=leitor.getFormatName();if(!formato.equalsIgnoreCase("PNG")&&!formato.equalsIgnoreCase("JPEG"))throw invalida("Use uma imagem PNG ou JPEG.");
    leitor.setInput(entrada,true,true);int largura=leitor.getWidth(0),altura=leitor.getHeight(0);
    if(largura<1||altura<1||largura>4096||altura>4096||(long)largura*altura>8_000_000)throw invalida("A imagem deve ter até 4096 pixels por lado e no máximo 8 milhões de pixels.");
    BufferedImage original=leitor.read(0);if(original==null)throw invalida("Não foi possível ler a imagem.");
    double escala=Math.min(1.0,512.0/Math.max(largura,altura));
    BufferedImage reduzida=new BufferedImage(Math.max(1,(int)Math.round(largura*escala)),Math.max(1,(int)Math.round(altura*escala)),BufferedImage.TYPE_INT_ARGB);
    Graphics2D g=reduzida.createGraphics();try{g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);g.drawImage(original,0,0,reduzida.getWidth(),reduzida.getHeight(),null);}finally{g.dispose();}
    ByteArrayOutputStream saida=new ByteArrayOutputStream();if(!ImageIO.write(reduzida,"png",saida))throw invalida("Não foi possível salvar a imagem.");
    if(saida.size()>LIMITE_BYTES)throw invalida("A imagem resultante excedeu 2 MB.");return saida.toByteArray();
   }finally{leitor.dispose();}
  }catch(IOException|IllegalArgumentException e){throw invalida("O arquivo não contém uma imagem PNG ou JPEG válida.");}
 }
}
