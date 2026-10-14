package br.com.romenig.plataforma.perfil.foto;
import jakarta.persistence.*;
@Entity @Table(name="foto_perfil")
public class FotoPerfil {
 @Id @Column(name="usuario_id") private Long usuarioId;
 @Column(nullable=false,columnDefinition="bytea") private byte[] imagem;
 protected FotoPerfil(){}
 public FotoPerfil(Long id,byte[] bytes){usuarioId=id;imagem=bytes;}
 public byte[] getImagem(){return imagem;}
}
