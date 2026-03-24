-- Modelo SQL
CREATE DATABASE cad_automatizacao;
USE cad_automatizacao;

-- 1. USUARIO
CREATE TABLE USUARIO (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  funcao ENUM('engenheiro','analista') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PLANTACAD
CREATE TABLE PLANTACAD (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nome_arquivo VARCHAR(255) NOT NULL,
  formato ENUM('DWG','PDF') NOT NULL,
  data_upload DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dimensoes JSON
);

-- 3. PROJETO
CREATE TABLE PROJETO (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(200) NOT NULL,
  usuario_id BIGINT NOT NULL,
  planta_id BIGINT NOT NULL,
  data_inicio DATE NOT NULL,
  status ENUM('ativo','finalizado') DEFAULT 'ativo',
  FOREIGN KEY (usuario_id) REFERENCES USUARIO(id) ON DELETE CASCADE,
  FOREIGN KEY (planta_id) REFERENCES PLANTACAD(id) ON DELETE CASCADE
);

-- 4. ELEMENTOESTRUTURAL
CREATE TABLE ELEMENTOESTRUTURAL (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  projeto_id BIGINT NOT NULL,
  tipo ENUM('viga','pilar','laje') NOT NULL,
  coord_x DECIMAL(10,2) NOT NULL,
  coord_y DECIMAL(10,2) NOT NULL,
  comprimento DECIMAL(8,2) NOT NULL,
  largura DECIMAL(6,2) NOT NULL,
  altura DECIMAL(6,2) NOT NULL,
  FOREIGN KEY (projeto_id) REFERENCES PROJETO(id) ON DELETE CASCADE,
  INDEX idx_projeto_tipo (projeto_id, tipo)
);

-- 5. MATERIAL
CREATE TABLE MATERIAL (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL UNIQUE,
  densidade DECIMAL(8,2) NOT NULL,
  resistencia DECIMAL(6,2) NOT NULL,
  custo_m3 DECIMAL(8,2) NOT NULL
);

-- 6. CALCULO
CREATE TABLE CALCULO (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  elemento_id BIGINT NOT NULL,
  tipo ENUM('carga','flecha') NOT NULL,
  formula VARCHAR(500) NOT NULL,
  resultado DECIMAL(10,4) NOT NULL,
  FOREIGN KEY (elemento_id) REFERENCES ELEMENTOESTRUTURAL(id) ON DELETE CASCADE,
  INDEX idx_elemento_tipo (elemento_id, tipo)
);

-- 7. MEMORIAL
CREATE TABLE MEMORIAL (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  projeto_id BIGINT NOT NULL,
  versao VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  conteudo LONGTEXT NOT NULL,
  data_geracao DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projeto_id) REFERENCES PROJETO(id) ON DELETE CASCADE
);

-- 8. ESPECIFICACAOTECNICA
CREATE TABLE ESPECIFICACAOTECNICA (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  projeto_id BIGINT NOT NULL,
  secao VARCHAR(100) NOT NULL,
  conteudo LONGTEXT NOT NULL,
  FOREIGN KEY (projeto_id) REFERENCES PROJETO(id) ON DELETE CASCADE
);

-- N:M ELEMENTOMATERIAL
CREATE TABLE ELEMENTOMATERIAL (
  elemento_id BIGINT,
  material_id BIGINT,
  quantidade DECIMAL(8,2) NOT NULL,
  PRIMARY KEY (elemento_id, material_id),
  FOREIGN KEY (elemento_id) REFERENCES ELEMENTOESTRUTURAL(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES MATERIAL(id)
);

-- VIEW exemplo relatório
CREATE VIEW VW_PROJETO_RESUMO AS
SELECT 
  p.nome, u.nome usuario, COUNT(e.id) elementos, 
  SUM(em.quantidade) total_material_kg
FROM PROJETO p
JOIN USUARIO u ON p.usuario_id = u.id
LEFT JOIN ELEMENTOESTRUTURAL e ON p.id = e.projeto_id
LEFT JOIN ELEMENTOMATERIAL em ON e.id = elemento_id
GROUP BY p.id;

-- INSERT dados teste
INSERT USUARIO (nome, email, funcao) VALUES ('João Eng', 'joao@ex.br', 'engenheiro');
INSERT MATERIAL VALUES (NULL, 'Concreto C25', 2400, 25, 350.50);



