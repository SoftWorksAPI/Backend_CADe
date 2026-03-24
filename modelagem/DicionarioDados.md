# Dicionário de Dados Completo

**Convencão**: 3FN | PK=Primária | FK=Chave Estrangeira | NN=Não Nulo | UNIQUE=Única

## 1. USUARIO
| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | BIGINT | PK, AUTO_INCREMENT | ID único usuário |
| nome | VARCHAR(100) | NN | Nome completo |
| email | VARCHAR(100) | NN, UNIQUE | Login |
| funcao | ENUM('engenheiro','analista') | NN | Cargo |

## 2. PLANTACAD
| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | BIGINT | PK, AUTO_INCREMENT | ID arquivo |
| nome_arquivo | VARCHAR(255) | NN | DWG/PDF |
| formato | ENUM('DWG','PDF') | NN | Extensão |
| data_upload | DATETIME | NN | Upload |

## 3. PROJETO
| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | BIGINT | PK | ID projeto |
| nome | VARCHAR(200) | NN | Nome projeto |
| usuario_id | BIGINT | FK(USUARIO.id) | Responsável |
| planta_id | BIGINT | FK(PLANTACAD.id) | Base CAD |
| data_inicio | DATE | NN | Início |

## 4. ELEMENTOESTRUTURAL
| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | BIGINT | PK | ID elemento |
| projeto_id | BIGINT | FK(PROJETO.id) | Projeto |
| tipo | ENUM('viga','pilar','laje') | NN | Tipo |
| coord_x | DECIMAL(10,2) | NN | Pos X CAD |
| coord_y | DECIMAL(10,2) | NN | Pos Y CAD |
| comprimento | DECIMAL(8,2) | NN | m |
| largura | DECIMAL(6,2) | NN | cm |
| altura | DECIMAL(6,2) | NN | cm |

## 5. MATERIAL
| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | BIGINT | PK | ID material |
| nome | VARCHAR(100) | NN, UNIQUE | "Concreto C25" |
| densidade | DECIMAL(8,2) | NN | kg/m³ |
| resistencia | DECIMAL(6,2) | NN | MPa |
| custo_m3 | DECIMAL(8,2) | NN | R$/m³ |

## 6. CALCULO
| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | BIGINT | PK | ID cálculo |
| elemento_id | BIGINT | FK(ELEMENTOESTRUTURAL.id) | Elemento |
| tipo | ENUM('carga','flecha') | NN | Tipo |
| formula | VARCHAR(500) | NN | Eq matemática |
| resultado | DECIMAL(10,4) | NN | Valor |

## 7. MEMORIAL
| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | BIGINT | PK | ID memorial |
| projeto_id | BIGINT | FK(PROJETO.id) | Projeto |
| versao | VARCHAR(20) | NN | v1.0 |
| conteudo | LONGTEXT | NN | Texto PDF |

## 8. ESPECIFICACAOTECNICA
| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | BIGINT | PK | ID spec |
| projeto_id | BIGINT | FK(PROJETO.id) | Projeto |
| secao | VARCHAR(100) | NN | "Estruturas" |
| conteudo | LONGTEXT | NN | Specs técnicas |

## Tabela N:M - ELEMENTOMATERIAL
| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| elemento_id | BIGINT | PK, FK(ELEMENTOESTRUTURAL.id) | |
| material_id | BIGINT | PK, FK(MATERIAL.id) | |
| quantidade | DECIMAL(8,2) | NN | kg usado |

