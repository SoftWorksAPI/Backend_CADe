# MER Completo - Desafio Exército CAD Automatização

## Diagrama Mermaid (cole em mermaid.live para PNG)
```mermaid
erDiagram
    USUARIO {
        BIGINT id PK "ID único"
        string nome "Nome completo"
        string email "Email"
        enum funcao "engenheiro/analista"
    }
    PLANTACAD {
        BIGINT id PK
        string nome_arquivo "DWG/PDF"
        enum formato "DWG/PDF"
        datetime data_upload
        json dimensoes "W/H"
    }
    PROJETO {
        BIGINT id PK
        string nome "Nome projeto"
        BIGINT usuario_id FK
        BIGINT planta_id FK
        date data_inicio
        enum status "ativo/finalizado"
    }
    ELEMENTOESTRUTURAL {
        BIGINT id PK
        BIGINT projeto_id FK
        enum tipo "viga/pilar/laje"
        decimal coord_x "X CAD"
        decimal coord_y "Y CAD"
        decimal comprimento "m"
        decimal largura "cm"
        decimal altura "cm"
    }
    MATERIAL {
        BIGINT id PK
        string nome "Concreto Aço"
        decimal densidade "kg/m3"
        decimal resistencia "MPa"
        decimal custo_m3 "R$"
    }
    CALCULO {
        BIGINT id PK
        BIGINT elemento_id FK
        enum tipo "carga/flecha"
        string formula "Fórmula"
        decimal resultado "Valor"
    }
    MEMORIAL {
        BIGINT id PK
        BIGINT projeto_id FK
        string versao "v1.0"
        longtext conteudo "PDF texto"
        datetime data_geracao
    }
    ESPECIFICACAOTECNICA {
        BIGINT id PK
        BIGINT projeto_id FK
        string secao
        longtext conteudo
    }
    USUARIO ||--o{ PROJETO : cria
    PLANTACAD ||--o{ PROJETO : base
    PROJETO ||--o{ ELEMENTOESTRUTURAL : elementos
    ELEMENTOESTRUTURAL ||--o{ CALCULO : cálculos
    PROJETO ||--o{ MEMORIAL : memorandos
    PROJETO ||--o{ ESPECIFICACAOTECNICA : specs
    ELEMENTOESTRUTURAL }o--o{ MATERIAL : materiais

## Como usar
1. Copie código ```mermaid``` acima.
2. Cole em https://mermaid.live/edit
3. Export PNG para relatório Fatec.

## Tabelas N:M
- **ElementoMaterial** (elemento_id, material_id, quantidade DECIMAL)

**Agora Mermaid renderiza completo - sem labels com aspas especiais!**
