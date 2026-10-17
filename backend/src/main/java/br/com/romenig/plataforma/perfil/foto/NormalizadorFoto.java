package br.com.romenig.plataforma.perfil.foto;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Component;
import br.com.romenig.plataforma.planner.ErroDePlanoException;
/**
 * Valida e reduz imagens enviadas (PNG ou JPEG de ate 2 MB). A foto do perfil
 * sai em PNG de ate 512 px; o banner do curso sai em JPEG de ate 1600 px, que
 * guarda fotos largas em bem menos bytes.
 */
@Component
public class NormalizadorFoto {
 public static final int LIMITE_BYTES=2*1024*1024;
 public byte[] normalizar(byte[] bytes){return normalizar(bytes,"foto",512,"png",BufferedImage.TYPE_INT_ARGB);}
 public byte[] normalizarBanner(byte[] bytes){return normalizar(bytes,"banner",1600,"jpg",BufferedImage.TYPE_INT_RGB);}
 private byte[] normalizar(byte[] bytes,String campo,int ladoMaximo,String formatoSaida,int tipo){
  if(bytes.length==0||bytes.length>LIMITE_BYTES)throw invalida(campo,"Selecione uma imagem PNG ou JPEG de até 2 MB.");
  try(var entrada=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))){
   var leitores=ImageIO.getImageReaders(entrada);if(!leitores.hasNext())throw invalida(campo,"O arquivo não contém uma imagem PNG ou JPEG válida.");
   var leitor=leitores.next();
   try{
    String formato=leitor.getFormatName();if(!formato.equalsIgnoreCase("PNG")&&!formato.equalsIgnoreCase("JPEG"))throw invalida(campo,"Use uma imagem PNG ou JPEG.");
    leitor.setInput(entrada,true,true);int largura=leitor.getWidth(0),altura=leitor.getHeight(0);
    if(largura<1||altura<1||largura>4096||altura>4096||(long)largura*altura>8_000_000)throw invalida(campo,"A imagem deve ter até 4096 pixels por lado e no máximo 8 milhões de pixels.");
    BufferedImage original=leitor.read(0);if(original==null)throw invalida(campo,"Não foi possível ler a imagem.");
    double escala=Math.min(1.0,(double)ladoMaximo/Math.max(largura,altura));
    BufferedImage reduzida=new BufferedImage(Math.max(1,(int)Math.round(largura*escala)),Math.max(1,(int)Math.round(altura*escala)),tipo);
    Graphics2D g=reduzida.createGraphics();try{
     // JPEG nao tem transparencia: o fundo vira branco em vez de preto.
     if(tipo==BufferedImage.TYPE_INT_RGB){g.setColor(Color.WHITE);g.fillRect(0,0,reduzida.getWidth(),reduzida.getHeight());}
     g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);g.drawImage(original,0,0,reduzida.getWidth(),reduzida.getHeight(),null);
    }finally{g.dispose();}
    ByteArrayOutputStream saida=new ByteArrayOutputStream();if(!ImageIO.write(reduzida,formatoSaida,saida))throw invalida(campo,"Não foi possível salvar a imagem.");
    if(saida.size()>LIMITE_BYTES)throw invalida(campo,"A imagem resultante excedeu 2 MB.");return saida.toByteArray();
   }finally{leitor.dispose();}
  }catch(IOException|IllegalArgumentException e){throw invalida(campo,"O arquivo não contém uma imagem PNG ou JPEG válida.");}
 }
 private ErroDePlanoException invalida(String campo,String m){return new ErroDePlanoException(campo,m);}
}
