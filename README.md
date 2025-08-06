# Documentação da API - Projeto HTML/CSS/JavaScript

Este projeto fornece uma interface web moderna e interativa para documentar uma API REST (sigape-api-docs) com 647 endpoints organizados em 82 categorias.

## 🚀 Funcionalidades

- **Interface Moderna**: Design responsivo com tema claro/escuro
- **Busca Inteligente**: Pesquisa em tempo real por endpoints, métodos ou categorias
- **Filtros por Método**: Filtragem por GET, POST, PUT, DELETE
- **Navegação Intuitiva**: Sidebar com categorias organizadas por número de endpoints
- **Detalhes Completos**: Expansão de endpoints com parâmetros e exemplos de código
- **Syntax Highlighting**: Código JavaScript com destaque de sintaxe
- **Responsivo**: Funciona perfeitamente em desktop e mobile

## 📁 Estrutura do Projeto

```
sigape-api-docs/
├── index.html          # Página principal
├── styles.css          # Estilos CSS responsivos
├── script.js           # Funcionalidades JavaScript
├── organized_api.json  # Dados da API organizados
└── README.md          # Esta documentação
```

## 🛠️ Como Usar

### 1. Servidor Local (Recomendado)

```bash
# Navegue até o diretório do projeto
cd sigape-api-docs

# Inicie um servidor HTTP local
python3 -m http.server 8000

# Acesse no navegador
http://localhost:8000
```

### 2. Servidor Web

Faça upload dos arquivos para qualquer servidor web (Apache, Nginx, etc.) e acesse via URL.

## 🎯 Funcionalidades Principais

### Busca e Filtros
- Use a barra de pesquisa para encontrar endpoints específicos
- Filtre por método HTTP usando os botões coloridos
- Combine busca e filtros para resultados precisos

### Navegação
- Clique em qualquer categoria na sidebar para ver seus endpoints
- Use "Expandir Todos" / "Colapsar Todos" para controlar a visualização
- Cada endpoint mostra método, caminho e detalhes completos

### Temas
- Clique no ícone de lua/sol no cabeçalho para alternar temas
- Preferência salva automaticamente no navegador

## 📊 Estatísticas da API

- **Total de Endpoints**: 664
- **Categorias**: 74
- **Métodos Suportados**: GET, POST, PUT, DELETE, PATCH
- **Principais Categorias**:
  - Estatísticas: 51 endpoints
  - Inscrição: 34 endpoints
  - Pautas: 26 endpoints
  - Matrículas: 24 endpoints

## 🔧 Tecnologias Utilizadas

- **HTML5**: Estrutura semântica moderna
- **CSS3**: Grid, Flexbox, Custom Properties, Animações
- **JavaScript ES6+**: Async/Await, Modules, DOM Manipulation
- **Font Awesome**: Ícones vetoriais
- **Prism.js**: Syntax highlighting para código

## 📱 Responsividade

O projeto é totalmente responsivo e funciona em:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (até 767px)

## 🎨 Personalização

### Cores e Temas
Edite as variáveis CSS em `styles.css`:

```css
:root {
    --primary-color: #2563eb;
    --accent-color: #10b981;
    /* ... outras variáveis */
}
```

### Dados da API
Para usar com sua própria API, substitua o arquivo `organized_api.json` seguindo a estrutura:

```json
{
    "total_endpoints": 647,
    "categories": {
        "categoria_nome": {
            "name": "Nome Exibido",
            "description": "Descrição da categoria",
            "endpoint_count": 10,
            "endpoints": [
                {
                    "function_name": "getNome",
                    "path": "/api/recurso",
                    "method": "GET",
                    "parameters": [
                        {
                            "name": "id",
                            "type": "path",
                            "description": "ID do recurso"
                        }
                    ]
                }
            ]
        }
    }
}
```

## 🐛 Solução de Problemas

### Erro CORS
Se encontrar erros CORS, certifique-se de servir os arquivos via HTTP server, não file://.

### JavaScript não funciona
Verifique se todos os arquivos estão no mesmo diretório e o servidor está funcionando.

### Dados não carregam
Confirme que o arquivo `organized_api.json` está presente e válido.

## 📄 Licença

Este projeto foi criado para documentação de API e pode ser usado livremente para fins educacionais e comerciais.

## 🤝 Contribuições

Para melhorias ou correções:
1. Identifique o problema ou melhoria
2. Edite os arquivos apropriados
3. Teste localmente
4. Documente as mudanças

---

**Desenvolvido com ❤️ para facilitar a documentação de APIs**
