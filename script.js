// ===================================================================
// DOCUMENTAÇÃO DA API - VERSÃO MELHORADA 2.0
// ===================================================================
// Funcionalidades principais:
// - Navegação intuitiva por categorias
// - Pesquisa avançada com filtros
// - Documentação detalhada de parâmetros
// - Exemplos de código melhorados
// - Interface responsiva e acessível
// - Exportação de documentação
// - Sistema de notificações
// ===================================================================

// Configurações globais
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000',
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 300,
    MAX_RECENT_SEARCHES: 5,
    STORAGE_KEYS: {
        THEME: 'api-docs-theme',
        RECENT_SEARCHES: 'api-docs-recent-searches',
        COLLAPSED_ENDPOINTS: 'api-docs-collapsed-endpoints'
    }
};

// Estado global da aplicação
const AppState = {
    apiData: null,
    filteredData: null,
    currentCategory: null,
    currentMethod: 'all',
    currentView: 'cards',
    searchTerm: '',
    sortBy: 'name',
    isLoading: false,
    recentSearches: [],
    collapsedEndpoints: new Set()
};

// Cache para melhorar performance
const Cache = {
    renderedCategories: new Map(),
    renderedEndpoints: new Map(),
    searchResults: new Map()
};

// Elementos DOM (carregados uma vez)
let DOMElements = {};

// ===================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ===================================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        initializeDOMElements();
        initializeEventListeners();
        initializeTheme();
        loadUserPreferences();
        await loadApiData();
        hideLoading();
        showToast('Documentação carregada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar a aplicação');
    }
});

// Inicializar referências dos elementos DOM
function initializeDOMElements() {
    DOMElements = {
        // Elementos principais
        loading: document.getElementById('loading'),
        loadingProgress: document.getElementById('loadingProgress'),
        loadingSteps: document.getElementById('loadingSteps'),
        welcomeSection: document.getElementById('welcomeSection'),
        endpointsSection: document.getElementById('endpointsSection'),
        noResults: document.getElementById('noResults'),
        
        // Navegação e pesquisa
        categoriesNav: document.getElementById('categoriesNav'),
        searchInput: document.getElementById('searchInput'),
        clearSearch: document.getElementById('clearSearch'),
        sortSelect: document.getElementById('sortSelect'),
        
        // Filtros e controles
        methodFilters: document.querySelectorAll('.method-filter'),
        viewToggles: document.querySelectorAll('.view-toggle'),
        themeToggle: document.getElementById('themeToggle'),
        
        // Botões de ação
        expandAllBtn: document.getElementById('expandAll'),
        collapseAllBtn: document.getElementById('collapseAll'),
        copyAllEndpoints: document.getElementById('copyAllEndpoints'),
        exportBtn: document.getElementById('exportBtn'),
        clearFilters: document.getElementById('clearFilters'),
        helpToggle: document.getElementById('helpToggle'),
        
        // Conteúdo dinâmico
        endpointsList: document.getElementById('endpointsList'),
        sectionTitle: document.getElementById('sectionTitle'),
        sectionBreadcrumb: document.getElementById('sectionBreadcrumb'),
        categoryInfo: document.getElementById('categoryInfo'),
        categoryDescription: document.getElementById('categoryDescription'),
        categoryStats: document.getElementById('categoryStats'),
        
        // Estatísticas
        totalEndpoints: document.getElementById('totalEndpoints'),
        totalCategories: document.getElementById('totalCategories'),
        totalEndpointsMain: document.getElementById('totalEndpointsMain'),
        totalCategoriesMain: document.getElementById('totalCategoriesMain'),
        totalMethodsMain: document.getElementById('totalMethodsMain'),
        
        // Modal
        endpointModal: document.getElementById('endpointModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalBody: document.getElementById('modalBody'),
        modalClose: document.getElementById('modalClose'),
        
        // Notificações
        toastContainer: document.getElementById('toastContainer'),
        helpContent: document.getElementById('helpContent')
    };
}

// ===================================================================
// CARREGAMENTO E PROCESSAMENTO DE DADOS
// ===================================================================

async function loadApiData() {
    try {
        showLoadingStep(0);
        AppState.isLoading = true;
        
        const response = await fetch('organized_api.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        showLoadingStep(1);
        AppState.apiData = await response.json();
        
        // Processar e enriquecer dados
        processApiData();
        
        showLoadingStep(2);
        AppState.filteredData = AppState.apiData;
        
        // Renderizar interface inicial
        updateStats();
        updateMethodCounts();
        renderCategories();
        showWelcomeSection();
        
        AppState.isLoading = false;
        
    } catch (error) {
        console.error('Erro ao carregar dados da API:', error);
        AppState.isLoading = false;
        showError(`Erro ao carregar dados da API: ${error.message}`);
    }
}

// Processar e enriquecer dados da API
function processApiData() {
    if (!AppState.apiData) return;
    
    // Adicionar metadados úteis
    Object.entries(AppState.apiData.categories).forEach(([key, category]) => {
        category.key = key;
        category.methodCounts = getMethodCounts(category.endpoints);
        
        // Enriquecer endpoints com informações adicionais
        category.endpoints.forEach(endpoint => {
            endpoint.categoryKey = key;
            endpoint.categoryName = category.name;
            endpoint.hasParameters = endpoint.parameters && endpoint.parameters.length > 0;
            endpoint.hasBodyParameters = endpoint.parameters && 
                endpoint.parameters.some(p => p.type === 'body');
            endpoint.hasPathParameters = endpoint.parameters && 
                endpoint.parameters.some(p => p.type === 'path');
            endpoint.hasQueryParameters = endpoint.parameters && 
                endpoint.parameters.some(p => p.type === 'query');
            endpoint.requiresAuth = endpoint.path.includes('/auth/') || 
                endpoint.method !== 'GET';
        });
    });
}

// Contar métodos HTTP por categoria
function getMethodCounts(endpoints) {
    const counts = { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 };
    endpoints.forEach(endpoint => {
        if (counts.hasOwnProperty(endpoint.method)) {
            counts[endpoint.method]++;
        }
    });
    return counts;
}

// ===================================================================
// GESTÃO DE EVENTOS
// ===================================================================

function initializeEventListeners() {
    // Pesquisa
    DOMElements.searchInput?.addEventListener('input', debounce(handleSearch, CONFIG.DEBOUNCE_DELAY));
    DOMElements.clearSearch?.addEventListener('click', clearSearch);
    
    // Tema
    DOMElements.themeToggle?.addEventListener('click', toggleTheme);
    
    // Filtros de método
    DOMElements.methodFilters?.forEach(filter => {
        filter.addEventListener('click', () => handleMethodFilter(filter));
    });
    
    // Ordenação
    DOMElements.sortSelect?.addEventListener('change', handleSortChange);
    
    // Vista (cartões/lista)
    DOMElements.viewToggles?.forEach(toggle => {
        toggle.addEventListener('click', () => handleViewToggle(toggle));
    });
    
    // Botões de ação
    DOMElements.expandAllBtn?.addEventListener('click', () => toggleAllEndpoints(true));
    DOMElements.collapseAllBtn?.addEventListener('click', () => toggleAllEndpoints(false));
    DOMElements.copyAllEndpoints?.addEventListener('click', copyEndpointsList);
    DOMElements.exportBtn?.addEventListener('click', exportDocumentation);
    DOMElements.clearFilters?.addEventListener('click', clearAllFilters);
    DOMElements.helpToggle?.addEventListener('click', toggleHelp);
    
    // Modal
    DOMElements.modalClose?.addEventListener('click', closeModal);
    DOMElements.endpointModal?.addEventListener('click', (e) => {
        if (e.target === DOMElements.endpointModal) closeModal();
    });
    
    // Atalhos de teclado
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Eventos de redimensionamento
    window.addEventListener('resize', debounce(handleResize, 250));
}

// ===================================================================
// FUNCIONALIDADES DE PESQUISA E FILTROS
// ===================================================================

function handleSearch(event) {
    const newSearchTerm = event.target.value.toLowerCase().trim();
    
    if (newSearchTerm === AppState.searchTerm) return;
    
    AppState.searchTerm = newSearchTerm;
    
    // Mostrar/ocultar botão de limpar pesquisa
    if (DOMElements.clearSearch) {
        DOMElements.clearSearch.style.display = newSearchTerm ? 'block' : 'none';
    }
    
    // Adicionar aos termos recentes se não estiver vazio
    if (newSearchTerm && !AppState.recentSearches.includes(newSearchTerm)) {
        AppState.recentSearches.unshift(newSearchTerm);
        AppState.recentSearches = AppState.recentSearches.slice(0, CONFIG.MAX_RECENT_SEARCHES);
        saveUserPreferences();
    }
    
    applyFilters();
}

function clearSearch() {
    DOMElements.searchInput.value = '';
    AppState.searchTerm = '';
    DOMElements.clearSearch.style.display = 'none';
    applyFilters();
}

function handleMethodFilter(filterElement) {
    // Atualizar estado ativo
    DOMElements.methodFilters.forEach(f => {
        f.classList.remove('active');
        f.setAttribute('aria-pressed', 'false');
    });
    filterElement.classList.add('active');
    filterElement.setAttribute('aria-pressed', 'true');
    
    AppState.currentMethod = filterElement.dataset.method;
    applyFilters();
}

function handleSortChange(event) {
    AppState.sortBy = event.target.value;
    applyFilters();
}

function handleViewToggle(toggleElement) {
    DOMElements.viewToggles.forEach(t => t.classList.remove('active'));
    toggleElement.classList.add('active');
    
    AppState.currentView = toggleElement.dataset.view;
    
    // Aplicar classe CSS correspondente
    DOMElements.endpointsList.className = `endpoints-list view-${AppState.currentView}`;
    
    saveUserPreferences();
}

// ===================================================================
// APLICAÇÃO DE FILTROS E ORDENAÇÃO
// ===================================================================

function applyFilters() {
    if (!AppState.apiData) return;
    
    let filtered = JSON.parse(JSON.stringify(AppState.apiData)); // Deep clone
    
    // Aplicar filtro de pesquisa
    if (AppState.searchTerm) {
        filtered = applySearchFilter(filtered, AppState.searchTerm);
    }
    
    // Aplicar filtro de método
    if (AppState.currentMethod !== 'all') {
        filtered = applyMethodFilter(filtered, AppState.currentMethod);
    }
    
    // Aplicar ordenação
    filtered = applySorting(filtered, AppState.sortBy);
    
    // Atualizar contagem total
    filtered.total_endpoints = Object.values(filtered.categories)
        .reduce((sum, category) => sum + category.endpoint_count, 0);
    
    AppState.filteredData = filtered;
    
    // Atualizar interface
    updateStats();
    updateMethodCounts();
    renderCategories();
    
    // Atualizar vista atual
    if (AppState.currentCategory && filtered.categories[AppState.currentCategory]) {
        showEndpointsSection(AppState.currentCategory);
    } else if (AppState.currentCategory) {
        showWelcomeSection();
    }
    
    // Mostrar mensagem de sem resultados se necessário
    if (Object.keys(filtered.categories).length === 0) {
        showNoResults();
    }
}

function applySearchFilter(data, searchTerm) {
    const filteredCategories = {};
    
    Object.entries(data.categories).forEach(([categoryKey, categoryData]) => {
        const filteredEndpoints = categoryData.endpoints.filter(endpoint => {
            return (
                endpoint.path.toLowerCase().includes(searchTerm) ||
                endpoint.method.toLowerCase().includes(searchTerm) ||
                endpoint.function_name.toLowerCase().includes(searchTerm) ||
                categoryData.name.toLowerCase().includes(searchTerm) ||
                categoryData.description.toLowerCase().includes(searchTerm) ||
                (endpoint.parameters && endpoint.parameters.some(param => 
                    param.name.toLowerCase().includes(searchTerm) ||
                    (param.description && param.description.toLowerCase().includes(searchTerm))
                ))
            );
        });
        
        if (filteredEndpoints.length > 0) {
            filteredCategories[categoryKey] = {
                ...categoryData,
                endpoints: filteredEndpoints,
                endpoint_count: filteredEndpoints.length,
                methodCounts: getMethodCounts(filteredEndpoints)
            };
        }
    });
    
    return { ...data, categories: filteredCategories };
}

function applyMethodFilter(data, method) {
    const filteredCategories = {};
    
    Object.entries(data.categories).forEach(([categoryKey, categoryData]) => {
        const filteredEndpoints = categoryData.endpoints.filter(endpoint => 
            endpoint.method === method
        );
        
        if (filteredEndpoints.length > 0) {
            filteredCategories[categoryKey] = {
                ...categoryData,
                endpoints: filteredEndpoints,
                endpoint_count: filteredEndpoints.length,
                methodCounts: getMethodCounts(filteredEndpoints)
            };
        }
    });
    
    return { ...data, categories: filteredCategories };
}

function applySorting(data, sortBy) {
    const sortedCategories = {};
    let entries = Object.entries(data.categories);
    
    switch (sortBy) {
        case 'name':
            entries.sort(([,a], [,b]) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            entries.sort(([,a], [,b]) => b.name.localeCompare(a.name));
            break;
        case 'endpoints':
            entries.sort(([,a], [,b]) => b.endpoint_count - a.endpoint_count);
            break;
        case 'endpoints-desc':
            entries.sort(([,a], [,b]) => a.endpoint_count - b.endpoint_count);
            break;
    }
    
    entries.forEach(([key, category]) => {
        sortedCategories[key] = category;
    });
    
    return { ...data, categories: sortedCategories };
}

// ===================================================================
// RENDERIZAÇÃO DA INTERFACE
// ===================================================================

function renderCategories() {
    if (!AppState.filteredData || !DOMElements.categoriesNav) return;
    
    const categories = Object.entries(AppState.filteredData.categories);
    
    if (categories.length === 0) {
        DOMElements.categoriesNav.innerHTML = '<p class="no-categories">Nenhuma categoria encontrada</p>';
        return;
    }
    
    DOMElements.categoriesNav.innerHTML = categories.map(([key, category]) => `
        <a href="#" class="category-item ${AppState.currentCategory === key ? 'active' : ''}" 
           data-category="${key}" 
           role="button" 
           tabindex="0"
           aria-label="Categoria ${category.name} com ${category.endpoint_count} endpoints">
            <div class="category-header">
                <div class="category-name">${escapeHtml(category.name)}</div>
                <div class="category-count">
                    <span class="count-number">${category.endpoint_count}</span>
                    <span class="count-label">endpoints</span>
                </div>
            </div>
            <div class="category-description">${escapeHtml(category.description)}</div>
            <div class="category-methods">
                ${Object.entries(category.methodCounts)
                    .filter(([, count]) => count > 0)
                    .map(([method, count]) => `
                        <span class="method-tag ${method.toLowerCase()}" title="${count} ${method}">
                            ${method} <span class="method-count">${count}</span>
                        </span>
                    `).join('')}
            </div>
        </a>
    `).join('');
    
    // Adicionar event listeners
    DOMElements.categoriesNav.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', handleCategoryClick);
        item.addEventListener('keydown', handleCategoryKeydown);
    });
}

function handleCategoryClick(e) {
    e.preventDefault();
    const categoryKey = e.currentTarget.dataset.category;
    showEndpointsSection(categoryKey);
}

function handleCategoryKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCategoryClick(e);
    }
}

// ===================================================================
// GESTÃO DE SECÇÕES
// ===================================================================

function showWelcomeSection() {
    AppState.currentCategory = null;
    
    if (DOMElements.welcomeSection) DOMElements.welcomeSection.style.display = 'block';
    if (DOMElements.endpointsSection) DOMElements.endpointsSection.style.display = 'none';
    if (DOMElements.noResults) DOMElements.noResults.style.display = 'none';
    
    // Remover estado ativo das categorias
    DOMElements.categoriesNav?.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    updateStats();
    updateBreadcrumb();
}

function showEndpointsSection(categoryKey) {
    if (!AppState.filteredData.categories[categoryKey]) return;
    
    AppState.currentCategory = categoryKey;
    const category = AppState.filteredData.categories[categoryKey];
    
    if (DOMElements.welcomeSection) DOMElements.welcomeSection.style.display = 'none';
    if (DOMElements.endpointsSection) DOMElements.endpointsSection.style.display = 'block';
    if (DOMElements.noResults) DOMElements.noResults.style.display = 'none';
    
    // Atualizar título e informações
    if (DOMElements.sectionTitle) {
        DOMElements.sectionTitle.textContent = `${category.name}`;
    }
    
    updateBreadcrumb(category);
    updateCategoryInfo(category);
    renderEndpoints(category.endpoints);
    
    // Atualizar categoria ativa
    DOMElements.categoriesNav?.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = DOMElements.categoriesNav?.querySelector(`[data-category="${categoryKey}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Scroll para o topo da secção
    DOMElements.endpointsSection?.scrollIntoView({ behavior: 'smooth' });
}

function showNoResults() {
    if (DOMElements.welcomeSection) DOMElements.welcomeSection.style.display = 'none';
    if (DOMElements.endpointsSection) DOMElements.endpointsSection.style.display = 'none';
    if (DOMElements.noResults) DOMElements.noResults.style.display = 'block';
}

function updateBreadcrumb(category = null) {
    if (!DOMElements.sectionBreadcrumb) return;
    
    if (category) {
        DOMElements.sectionBreadcrumb.innerHTML = `
            <span class="breadcrumb-item">
                <a href="#" onclick="showWelcomeSection()">Início</a>
            </span>
            <span class="breadcrumb-separator">
                <i class="fas fa-chevron-right"></i>
            </span>
            <span class="breadcrumb-item active">
                ${escapeHtml(category.name)}
            </span>
        `;
    } else {
        DOMElements.sectionBreadcrumb.innerHTML = '';
    }
}

function updateCategoryInfo(category) {
    if (!DOMElements.categoryInfo || !category) return;
    
    DOMElements.categoryInfo.style.display = 'block';
    
    if (DOMElements.categoryDescription) {
        DOMElements.categoryDescription.innerHTML = `
            <h3>
                <i class="fas fa-info-circle"></i>
                Sobre esta categoria
            </h3>
            <p>${escapeHtml(category.description)}</p>
        `;
    }
    
    if (DOMElements.categoryStats) {
        const methodStats = Object.entries(category.methodCounts)
            .filter(([, count]) => count > 0)
            .map(([method, count]) => `
                <div class="stat-item">
                    <span class="method-badge ${method.toLowerCase()}">${method}</span>
                    <span class="stat-value">${count}</span>
                </div>
            `).join('');
        
        DOMElements.categoryStats.innerHTML = `
            <h4>Distribuição por Método HTTP</h4>
            <div class="method-stats">
                ${methodStats}
            </div>
        `;
    }
}

// ===================================================================
// RENDERIZAÇÃO DE ENDPOINTS
// ===================================================================

function renderEndpoints(endpoints) {
    if (!DOMElements.endpointsList || !endpoints) return;
    
    if (endpoints.length === 0) {
        DOMElements.endpointsList.innerHTML = '<p class="no-endpoints">Nenhum endpoint encontrado</p>';
        return;
    }
    
    DOMElements.endpointsList.innerHTML = endpoints.map(endpoint => 
        renderEndpointCard(endpoint)
    ).join('');
    
    // Adicionar event listeners
    DOMElements.endpointsList.querySelectorAll('.endpoint-header').forEach(header => {
        header.addEventListener('click', handleEndpointToggle);
    });
    
    DOMElements.endpointsList.querySelectorAll('.copy-code-btn').forEach(btn => {
        btn.addEventListener('click', handleCopyCode);
    });
    
    DOMElements.endpointsList.querySelectorAll('.test-endpoint-btn').forEach(btn => {
        btn.addEventListener('click', handleTestEndpoint);
    });
    
    // Aplicar syntax highlighting
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
    
    // Restaurar estado de endpoints colapsados
    restoreEndpointStates();
}

function renderEndpointCard(endpoint) {
    const isExpanded = !AppState.collapsedEndpoints.has(endpoint.function_name);
    const hasBodyParams = endpoint.hasBodyParameters;
    const hasPathParams = endpoint.hasPathParameters;
    const hasQueryParams = endpoint.hasQueryParameters;
    
    return `
        <div class="endpoint-card ${isExpanded ? 'expanded' : ''}" 
             data-endpoint-id="${endpoint.function_name}"
             data-method="${endpoint.method}">
            <div class="endpoint-header" role="button" tabindex="0" aria-expanded="${isExpanded}">
                <div class="endpoint-info">
                    <span class="method-badge ${endpoint.method.toLowerCase()}" 
                          title="Método HTTP ${endpoint.method}">
                        ${endpoint.method}
                    </span>
                    <span class="endpoint-path" title="Caminho do endpoint">
                        ${escapeHtml(endpoint.path)}
                    </span>
                    <span class="endpoint-function" title="Nome da função">
                        ${escapeHtml(endpoint.function_name)}
                    </span>
                </div>
                <div class="endpoint-actions">
                    ${endpoint.hasParameters ? '<span class="has-params-indicator" title="Tem parâmetros"><i class="fas fa-cog"></i></span>' : ''}
                    ${endpoint.requiresAuth ? '<span class="auth-required-indicator" title="Requer autenticação"><i class="fas fa-lock"></i></span>' : ''}
                    <i class="fas fa-chevron-down expand-icon" aria-hidden="true"></i>
                </div>
            </div>
            
            <div class="endpoint-details">
                <div class="endpoint-description">
                    <h4>
                        <i class="fas fa-info-circle"></i>
                        Descrição
                    </h4>
                    <p>${generateEndpointDescription(endpoint)}</p>
                    
                    <div class="endpoint-metadata">
                        <div class="metadata-item">
                            <strong>Categoria:</strong> 
                            <span class="category-link" onclick="showEndpointsSection('${endpoint.categoryKey}')">
                                ${escapeHtml(endpoint.categoryName)}
                            </span>
                        </div>
                        <div class="metadata-item">
                            <strong>Tipo de Conteúdo:</strong> 
                            <code>${endpoint.request_body_type || 'Nenhum'}</code>
                        </div>
                        ${endpoint.requiresAuth ? '<div class="metadata-item auth-warning"><i class="fas fa-exclamation-triangle"></i> <strong>Requer autenticação</strong></div>' : ''}
                    </div>
                </div>
                
                ${renderParametersSection(endpoint)}
                ${renderExampleSection(endpoint)}
                ${renderResponseSection(endpoint)}
                
                <div class="endpoint-actions-section">
                    <button class="btn-secondary copy-code-btn" data-endpoint="${endpoint.function_name}">
                        <i class="fas fa-copy"></i>
                        Copiar Código
                    </button>
                    <button class="btn-primary test-endpoint-btn" data-endpoint="${endpoint.function_name}">
                        <i class="fas fa-play"></i>
                        Testar Endpoint
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderParametersSection(endpoint) {
    if (!endpoint.parameters || endpoint.parameters.length === 0) {
        return `
            <div class="parameters-section">
                <h4><i class="fas fa-cog"></i> Parâmetros</h4>
                <div class="no-parameters">
                    <i class="fas fa-check-circle"></i>
                    <span>Este endpoint não requer parâmetros</span>
                </div>
            </div>
        `;
    }
    
    // Agrupar parâmetros por tipo
    const paramsByType = {
        path: endpoint.parameters.filter(p => p.type === 'path'),
        query: endpoint.parameters.filter(p => p.type === 'query'),
        body: endpoint.parameters.filter(p => p.type === 'body')
    };
    
    let parametersHtml = `
        <div class="parameters-section">
            <h4><i class="fas fa-cog"></i> Parâmetros</h4>
            <div class="parameters-summary">
                <span class="param-count">Total: ${endpoint.parameters.length} parâmetros</span>
                ${paramsByType.path.length > 0 ? `<span class="param-type-count">Caminho: ${paramsByType.path.length}</span>` : ''}
                ${paramsByType.query.length > 0 ? `<span class="param-type-count">Query: ${paramsByType.query.length}</span>` : ''}
                ${paramsByType.body.length > 0 ? `<span class="param-type-count">Corpo: ${paramsByType.body.length}</span>` : ''}
            </div>
    `;
    
    // Renderizar cada tipo de parâmetro
    Object.entries(paramsByType).forEach(([type, params]) => {
        if (params.length === 0) return;
        
        const typeInfo = {
            path: { icon: 'fas fa-route', title: 'Parâmetros do Caminho', description: 'Valores incluídos no URL do endpoint' },
            query: { icon: 'fas fa-search', title: 'Parâmetros de Query', description: 'Parâmetros enviados na query string (?param=value)' },
            body: { icon: 'fas fa-file-code', title: 'Parâmetros do Corpo', description: 'Dados enviados no corpo da requisição (JSON)' }
        };
        
        parametersHtml += `
            <div class="parameter-group">
                <h5 class="parameter-group-title">
                    <i class="${typeInfo[type].icon}"></i>
                    ${typeInfo[type].title}
                    <span class="parameter-group-count">(${params.length})</span>
                </h5>
                <p class="parameter-group-description">${typeInfo[type].description}</p>
                
                <div class="parameters-list">
                    ${params.map(param => `
                        <div class="parameter-item ${type}">
                            <div class="parameter-header">
                                <span class="parameter-name">${escapeHtml(param.name)}</span>
                                <span class="parameter-type">${escapeHtml(param.type || 'string')}</span>
                                <span class="parameter-location">${type}</span>
                            </div>
                            ${param.description ? `
                                <div class="parameter-description">
                                    ${escapeHtml(param.description)}
                                </div>
                            ` : ''}
                            ${type === 'body' ? `
                                <div class="parameter-example">
                                    <strong>Exemplo:</strong>
                                    <code>${generateParameterExample(param)}</code>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    // Adicionar exemplo de estrutura JSON para parâmetros do corpo
    if (paramsByType.body.length > 0) {
        parametersHtml += `
            <div class="body-structure-example">
                <h6>
                    <i class="fas fa-code"></i>
                    Estrutura do Corpo da Requisição
                </h6>
                <div class="code-block">
                    <pre><code class="language-json">${generateBodyStructureExample(paramsByType.body)}</code></pre>
                </div>
            </div>
        `;
    }
    
    parametersHtml += '</div>';
    return parametersHtml;
}

function renderExampleSection(endpoint) {
    return `
        <div class="example-section">
            <h4><i class="fas fa-code"></i> Exemplos de Uso</h4>
            
            <div class="example-tabs">
                <button class="example-tab active" data-tab="javascript">
                    <i class="fab fa-js-square"></i>
                    JavaScript
                </button>
                <button class="example-tab" data-tab="curl">
                    <i class="fas fa-terminal"></i>
                    cURL
                </button>
                <button class="example-tab" data-tab="python">
                    <i class="fab fa-python"></i>
                    Python
                </button>
            </div>
            
            <div class="example-content">
                <div class="example-panel active" data-panel="javascript">
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-title">Exemplo em JavaScript</span>
                            <button class="copy-btn" onclick="copyToClipboard(this)">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        <pre><code class="language-javascript">${generateJavaScriptExample(endpoint)}</code></pre>
                    </div>
                </div>
                
                <div class="example-panel" data-panel="curl">
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-title">Exemplo em cURL</span>
                            <button class="copy-btn" onclick="copyToClipboard(this)">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        <pre><code class="language-bash">${generateCurlExample(endpoint)}</code></pre>
                    </div>
                </div>
                
                <div class="example-panel" data-panel="python">
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-title">Exemplo em Python</span>
                            <button class="copy-btn" onclick="copyToClipboard(this)">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        <pre><code class="language-python">${generatePythonExample(endpoint)}</code></pre>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderResponseSection(endpoint) {
    return `
        <div class="response-section">
            <h4><i class="fas fa-arrow-left"></i> Resposta Esperada</h4>
            
            <div class="response-info">
                <div class="response-codes">
                    <h5>Códigos de Status HTTP</h5>
                    <div class="status-codes">
                        ${generateStatusCodes(endpoint).map(code => `
                            <div class="status-code ${code.type}">
                                <span class="code">${code.code}</span>
                                <span class="description">${code.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="response-example">
                    <h5>Exemplo de Resposta</h5>
                    <div class="code-block">
                        <pre><code class="language-json">${generateResponseExample(endpoint)}</code></pre>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===================================================================
// GERAÇÃO DE EXEMPLOS DE CÓDIGO
// ===================================================================

function generateJavaScriptExample(endpoint) {
    const baseUrl = CONFIG.API_BASE_URL;
    const url = `${baseUrl}${endpoint.path}`;
    
    let example = `// Função para ${endpoint.function_name}\n`;
    example += `// ${generateEndpointDescription(endpoint)}\n\n`;
    
    // Parâmetros da função
    const pathParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'path') : [];
    const queryParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'query') : [];
    const bodyParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'body') : [];
    
    const allParams = [
        ...pathParams.map(p => p.name),
        ...queryParams.map(p => p.name),
        ...(bodyParams.length > 0 ? ['requestBody'] : [])
    ];
    
    example += `async function ${endpoint.function_name}(${allParams.join(', ')}) {\n`;
    
    // Construir URL com parâmetros de caminho
    let finalUrl = url;
    if (pathParams.length > 0) {
        pathParams.forEach(param => {
            finalUrl = finalUrl.replace(`{${param.name}}`, `\${${param.name}}`);
        });
        example += `    const url = \`${finalUrl}\`;\n`;
    } else {
        example += `    const url = '${finalUrl}';\n`;
    }
    
    // Adicionar query parameters se existirem
    if (queryParams.length > 0) {
        example += `    \n    // Construir query parameters\n`;
        example += `    const queryParams = new URLSearchParams();\n`;
        queryParams.forEach(param => {
            example += `    if (${param.name}) queryParams.append('${param.name}', ${param.name});\n`;
        });
        example += `    const finalUrl = queryParams.toString() ? \`\${url}?\${queryParams}\` : url;\n`;
    }
    
    // Configurar opções da requisição
    example += `\n    const options = {\n`;
    example += `        method: '${endpoint.method}',\n`;
    example += `        headers: {\n`;
    
    if (bodyParams.length > 0) {
        example += `            'Content-Type': 'application/json',\n`;
    }
    
    example += `            'Accept': 'application/json'\n`;
    example += `        }`;
    
    if (bodyParams.length > 0) {
        example += `,\n        body: JSON.stringify(requestBody)`;
    }
    
    example += `\n    };\n\n`;
    
    // Fazer a requisição
    const urlVar = queryParams.length > 0 ? 'finalUrl' : 'url';
    example += `    try {\n`;
    example += `        const response = await fetch(${urlVar}, options);\n`;
    example += `        \n`;
    example += `        if (!response.ok) {\n`;
    example += `            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);\n`;
    example += `        }\n`;
    example += `        \n`;
    
    if (endpoint.method === 'DELETE') {
        example += `        return { success: true, status: response.status };\n`;
    } else {
        example += `        const data = await response.json();\n`;
        example += `        return data;\n`;
    }
    
    example += `        \n`;
    example += `    } catch (error) {\n`;
    example += `        console.error('Erro na requisição:', error);\n`;
    example += `        throw error;\n`;
    example += `    }\n`;
    example += `}\n\n`;
    
    // Exemplo de uso
    example += `// Exemplo de uso:\n`;
    if (allParams.length > 0) {
        example += `// const resultado = await ${endpoint.function_name}(${generateExampleValues(endpoint).join(', ')});\n`;
    } else {
        example += `// const resultado = await ${endpoint.function_name}();\n`;
    }
    example += `// console.log(resultado);`;
    
    return example;
}

function generateCurlExample(endpoint) {
    const baseUrl = CONFIG.API_BASE_URL;
    let url = `${baseUrl}${endpoint.path}`;
    
    // Substituir parâmetros de caminho por valores de exemplo
    const pathParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'path') : [];
    pathParams.forEach(param => {
        const exampleValue = getExampleValue(param);
        url = url.replace(`{${param.name}}`, exampleValue);
    });
    
    let curlCommand = `curl -X ${endpoint.method} \\\n`;
    curlCommand += `  "${url}" \\\n`;
    curlCommand += `  -H "Accept: application/json"`;
    
    // Adicionar cabeçalhos para requisições com corpo
    const bodyParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'body') : [];
    if (bodyParams.length > 0) {
        curlCommand += ` \\\n  -H "Content-Type: application/json"`;
        
        // Adicionar corpo da requisição
        const bodyExample = generateBodyExample(bodyParams);
        curlCommand += ` \\\n  -d '${JSON.stringify(bodyExample, null, 2)}'`;
    }
    
    // Adicionar query parameters se existirem
    const queryParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'query') : [];
    if (queryParams.length > 0) {
        const queryString = queryParams.map(param => `${param.name}=${getExampleValue(param)}`).join('&');
        curlCommand = curlCommand.replace(`"${url}"`, `"${url}?${queryString}"`);
    }
    
    return curlCommand;
}

function generatePythonExample(endpoint) {
    const baseUrl = CONFIG.API_BASE_URL;
    let url = `${baseUrl}${endpoint.path}`;
    
    let example = `import requests\nimport json\n\n`;
    example += `def ${endpoint.function_name}(`;
    
    // Parâmetros da função
    const pathParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'path') : [];
    const queryParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'query') : [];
    const bodyParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'body') : [];
    
    const allParams = [
        ...pathParams.map(p => p.name),
        ...queryParams.map(p => p.name),
        ...(bodyParams.length > 0 ? ['request_body'] : [])
    ];
    
    example += `${allParams.join(', ')}):\n`;
    example += `    """\n`;
    example += `    ${generateEndpointDescription(endpoint)}\n`;
    example += `    """\n`;
    
    // Construir URL
    if (pathParams.length > 0) {
        pathParams.forEach(param => {
            url = url.replace(`{${param.name}}`, `{${param.name}}`);
        });
        example += `    url = f"${url}"\n`;
    } else {
        example += `    url = "${url}"\n`;
    }
    
    // Cabeçalhos
    example += `    headers = {\n`;
    example += `        'Accept': 'application/json'`;
    if (bodyParams.length > 0) {
        example += `,\n        'Content-Type': 'application/json'`;
    }
    example += `\n    }\n`;
    
    // Query parameters
    if (queryParams.length > 0) {
        example += `    \n    params = {}\n`;
        queryParams.forEach(param => {
            example += `    if ${param.name}:\n`;
            example += `        params['${param.name}'] = ${param.name}\n`;
        });
    }
    
    // Fazer requisição
    example += `    \n    try:\n`;
    example += `        response = requests.${endpoint.method.toLowerCase()}(\n`;
    example += `            url,\n`;
    example += `            headers=headers`;
    
    if (queryParams.length > 0) {
        example += `,\n            params=params`;
    }
    
    if (bodyParams.length > 0) {
        example += `,\n            json=request_body`;
    }
    
    example += `\n        )\n`;
    example += `        \n`;
    example += `        response.raise_for_status()\n`;
    
    if (endpoint.method === 'DELETE') {
        example += `        return {'success': True, 'status': response.status_code}\n`;
    } else {
        example += `        return response.json()\n`;
    }
    
    example += `        \n`;
    example += `    except requests.exceptions.RequestException as e:\n`;
    example += `        print(f"Erro na requisição: {e}")\n`;
    example += `        raise\n\n`;
    
    // Exemplo de uso
    example += `# Exemplo de uso:\n`;
    if (allParams.length > 0) {
        const exampleValues = generateExampleValues(endpoint, 'python');
        example += `# resultado = ${endpoint.function_name}(${exampleValues.join(', ')})\n`;
    } else {
        example += `# resultado = ${endpoint.function_name}()\n`;
    }
    example += `# print(resultado)`;
    
    return example;
}

// ===================================================================
// FUNÇÕES AUXILIARES PARA GERAÇÃO DE EXEMPLOS
// ===================================================================

function generateEndpointDescription(endpoint) {
    const methodDescriptions = {
        'GET': 'Consultar/obter dados',
        'POST': 'Criar novos dados',
        'PUT': 'Atualizar dados existentes',
        'PATCH': 'Atualizar parcialmente dados existentes',
        'DELETE': 'Remover dados'
    };
    
    const action = methodDescriptions[endpoint.method] || 'Operação';
    return `${action} relacionados com ${endpoint.categoryName.toLowerCase()}`;
}

function generateParameterExample(param) {
    return getExampleValue(param);
}

function getExampleValue(param, language = 'javascript') {
    const type = param.type || 'string';
    const name = param.name.toLowerCase();
    
    // Valores específicos baseados no nome do parâmetro
    if (name.includes('id')) return language === 'python' ? '1' : '1';
    if (name.includes('email')) return language === 'python' ? '"user@example.com"' : '"user@example.com"';
    if (name.includes('nome')) return language === 'python' ? '"João Silva"' : '"João Silva"';
    if (name.includes('telefone')) return language === 'python' ? '"+258 84 123 4567"' : '"+258 84 123 4567"';
    if (name.includes('data')) return language === 'python' ? '"2024-01-15"' : '"2024-01-15"';
    if (name.includes('ano')) return language === 'python' ? '2024' : '2024';
    if (name.includes('password')) return language === 'python' ? '"senha123"' : '"senha123"';
    
    // Valores baseados no tipo
    switch (type) {
        case 'integer':
        case 'number':
            return language === 'python' ? '1' : '1';
        case 'boolean':
            return language === 'python' ? 'True' : 'true';
        case 'array':
            return language === 'python' ? '[]' : '[]';
        case 'object':
            return language === 'python' ? '{}' : '{}';
        default:
            return language === 'python' ? '"exemplo"' : '"exemplo"';
    }
}

function generateExampleValues(endpoint, language = 'javascript') {
    if (!endpoint.parameters) return [];
    
    const pathParams = endpoint.parameters.filter(p => p.type === 'path');
    const queryParams = endpoint.parameters.filter(p => p.type === 'query');
    const bodyParams = endpoint.parameters.filter(p => p.type === 'body');
    
    const values = [];
    
    // Valores para parâmetros de caminho
    pathParams.forEach(param => {
        values.push(getExampleValue(param, language));
    });
    
    // Valores para parâmetros de query
    queryParams.forEach(param => {
        values.push(getExampleValue(param, language));
    });
    
    // Objeto para parâmetros do corpo
    if (bodyParams.length > 0) {
        if (language === 'python') {
            values.push('request_body');
        } else {
            values.push('requestBody');
        }
    }
    
    return values;
}

function generateBodyExample(bodyParams) {
    const example = {};
    bodyParams.forEach(param => {
        example[param.name] = getExampleValue(param).replace(/"/g, '');
    });
    return example;
}

function generateBodyStructureExample(bodyParams) {
    const structure = {};
    bodyParams.forEach(param => {
        const type = param.type || 'string';
        structure[param.name] = `<${type}>`;
    });
    return JSON.stringify(structure, null, 2);
}

function generateStatusCodes(endpoint) {
    const codes = [
        { code: '200', description: 'Sucesso', type: 'success' }
    ];
    
    if (endpoint.method === 'POST') {
        codes[0] = { code: '201', description: 'Criado com sucesso', type: 'success' };
    }
    
    if (endpoint.method === 'DELETE') {
        codes[0] = { code: '204', description: 'Removido com sucesso', type: 'success' };
    }
    
    codes.push(
        { code: '400', description: 'Requisição inválida', type: 'error' },
        { code: '401', description: 'Não autorizado', type: 'error' },
        { code: '404', description: 'Não encontrado', type: 'error' },
        { code: '500', description: 'Erro interno do servidor', type: 'error' }
    );
    
    return codes;
}

function generateResponseExample(endpoint) {
    if (endpoint.method === 'DELETE') {
        return JSON.stringify({
            success: true,
            message: "Recurso removido com sucesso"
        }, null, 2);
    }
    
    if (endpoint.method === 'POST') {
        return JSON.stringify({
            id: 1,
            message: "Recurso criado com sucesso",
            data: {
                // Estrutura baseada nos parâmetros do corpo
                ...generateSampleResponseData(endpoint)
            }
        }, null, 2);
    }
    
    if (endpoint.method === 'GET') {
        if (endpoint.path.includes('{id}')) {
            return JSON.stringify({
                id: 1,
                ...generateSampleResponseData(endpoint)
            }, null, 2);
        } else {
            return JSON.stringify({
                data: [
                    {
                        id: 1,
                        ...generateSampleResponseData(endpoint)
                    }
                ],
                total: 1,
                page: 1,
                limit: 10
            }, null, 2);
        }
    }
    
    return JSON.stringify({
        success: true,
        data: generateSampleResponseData(endpoint)
    }, null, 2);
}

function generateSampleResponseData(endpoint) {
    const sampleData = {};
    
    // Gerar dados baseados na categoria
    const categoryName = endpoint.categoryName.toLowerCase();
    
    if (categoryName.includes('user') || categoryName.includes('utilizador')) {
        sampleData.nome = "João Silva";
        sampleData.email = "joao@example.com";
        sampleData.telefone = "+258 84 123 4567";
    } else if (categoryName.includes('curso')) {
        sampleData.nome = "Engenharia Informática";
        sampleData.codigo = "EI2024";
        sampleData.duracao = 4;
    } else {
        sampleData.nome = "Exemplo";
        sampleData.descricao = "Descrição de exemplo";
    }
    
    sampleData.createdAt = "2024-01-15T10:30:00Z";
    sampleData.updatedAt = "2024-01-15T10:30:00Z";
    
    return sampleData;
}

// ===================================================================
// FUNCIONALIDADES INTERATIVAS
// ===================================================================

function handleEndpointToggle(event) {
    const card = event.currentTarget.closest('.endpoint-card');
    const isExpanded = card.classList.contains('expanded');
    const endpointId = card.dataset.endpointId;
    
    if (isExpanded) {
        card.classList.remove('expanded');
        AppState.collapsedEndpoints.add(endpointId);
    } else {
        card.classList.add('expanded');
        AppState.collapsedEndpoints.delete(endpointId);
    }
    
    // Atualizar aria-expanded
    const header = card.querySelector('.endpoint-header');
    header.setAttribute('aria-expanded', !isExpanded);
    
    saveUserPreferences();
}

function toggleAllEndpoints(expand) {
    const cards = DOMElements.endpointsList?.querySelectorAll('.endpoint-card');
    if (!cards) return;
    
    cards.forEach(card => {
        const endpointId = card.dataset.endpointId;
        
        if (expand) {
            card.classList.add('expanded');
            AppState.collapsedEndpoints.delete(endpointId);
        } else {
            card.classList.remove('expanded');
            AppState.collapsedEndpoints.add(endpointId);
        }
        
        const header = card.querySelector('.endpoint-header');
        header?.setAttribute('aria-expanded', expand);
    });
    
    saveUserPreferences();
}

function restoreEndpointStates() {
    const cards = DOMElements.endpointsList?.querySelectorAll('.endpoint-card');
    if (!cards) return;
    
    cards.forEach(card => {
        const endpointId = card.dataset.endpointId;
        const shouldBeCollapsed = AppState.collapsedEndpoints.has(endpointId);
        
        if (shouldBeCollapsed) {
            card.classList.remove('expanded');
        } else {
            card.classList.add('expanded');
        }
        
        const header = card.querySelector('.endpoint-header');
        header?.setAttribute('aria-expanded', !shouldBeCollapsed);
    });
}

function handleCopyCode(event) {
    const endpointId = event.currentTarget.dataset.endpoint;
    const endpoint = findEndpointById(endpointId);
    
    if (!endpoint) return;
    
    const code = generateJavaScriptExample(endpoint);
    copyToClipboard(code);
    showToast('Código copiado para a área de transferência!', 'success');
}

function handleTestEndpoint(event) {
    const endpointId = event.currentTarget.dataset.endpoint;
    const endpoint = findEndpointById(endpointId);
    
    if (!endpoint) return;
    
    // Abrir modal com interface de teste
    openTestModal(endpoint);
}

function copyEndpointsList() {
    if (!AppState.currentCategory || !AppState.filteredData.categories[AppState.currentCategory]) {
        showToast('Nenhuma categoria selecionada', 'warning');
        return;
    }
    
    const category = AppState.filteredData.categories[AppState.currentCategory];
    const endpointsList = category.endpoints.map(endpoint => 
        `${endpoint.method} ${endpoint.path} - ${endpoint.function_name}`
    ).join('\n');
    
    copyToClipboard(endpointsList);
    showToast('Lista de endpoints copiada!', 'success');
}

function exportDocumentation() {
    if (!AppState.filteredData) {
        showToast('Nenhum dado disponível para exportar', 'warning');
        return;
    }
    
    // Gerar documentação em formato Markdown
    let markdown = `# Documentação da API\n\n`;
    markdown += `Gerado em: ${new Date().toLocaleString('pt-PT')}\n\n`;
    markdown += `## Estatísticas\n\n`;
    markdown += `- **Total de Categorias:** ${Object.keys(AppState.filteredData.categories).length}\n`;
    markdown += `- **Total de Endpoints:** ${AppState.filteredData.total_endpoints}\n\n`;
    
    Object.entries(AppState.filteredData.categories).forEach(([key, category]) => {
        markdown += `## ${category.name}\n\n`;
        markdown += `${category.description}\n\n`;
        markdown += `**Endpoints:** ${category.endpoint_count}\n\n`;
        
        category.endpoints.forEach(endpoint => {
            markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
            markdown += `**Função:** \`${endpoint.function_name}\`\n\n`;
            
            if (endpoint.parameters && endpoint.parameters.length > 0) {
                markdown += `**Parâmetros:**\n\n`;
                endpoint.parameters.forEach(param => {
                    markdown += `- **${param.name}** (${param.type}): ${param.description || 'Sem descrição'}\n`;
                });
                markdown += `\n`;
            }
            
            markdown += `**Exemplo:**\n\n`;
            markdown += `\`\`\`javascript\n${generateJavaScriptExample(endpoint)}\n\`\`\`\n\n`;
        });
    });
    
    // Criar e baixar arquivo
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-documentation-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Documentação exportada com sucesso!', 'success');
}

function clearAllFilters() {
    // Limpar pesquisa
    DOMElements.searchInput.value = '';
    AppState.searchTerm = '';
    DOMElements.clearSearch.style.display = 'none';
    
    // Resetar filtro de método
    DOMElements.methodFilters.forEach(f => {
        f.classList.remove('active');
        f.setAttribute('aria-pressed', 'false');
    });
    DOMElements.methodFilters[0]?.classList.add('active');
    DOMElements.methodFilters[0]?.setAttribute('aria-pressed', 'true');
    AppState.currentMethod = 'all';
    
    // Resetar ordenação
    DOMElements.sortSelect.value = 'name';
    AppState.sortBy = 'name';
    
    // Aplicar filtros
    applyFilters();
    
    showToast('Filtros limpos', 'info');
}

function toggleHelp() {
    const helpContent = DOMElements.helpContent;
    if (!helpContent) return;
    
    const isVisible = helpContent.style.display !== 'none';
    helpContent.style.display = isVisible ? 'none' : 'block';
    
    const icon = DOMElements.helpToggle?.querySelector('i');
    if (icon) {
        icon.className = isVisible ? 'fas fa-question-circle' : 'fas fa-times-circle';
    }
}

// ===================================================================
// MODAL E INTERFACE DE TESTE
// ===================================================================

function openTestModal(endpoint) {
    if (!DOMElements.endpointModal) return;
    
    DOMElements.modalTitle.textContent = `Testar: ${endpoint.method} ${endpoint.path}`;
    DOMElements.modalBody.innerHTML = generateTestInterface(endpoint);
    DOMElements.endpointModal.style.display = 'flex';
    
    // Adicionar event listeners para o formulário de teste
    setupTestForm(endpoint);
}

function closeModal() {
    if (DOMElements.endpointModal) {
        DOMElements.endpointModal.style.display = 'none';
    }
}

function generateTestInterface(endpoint) {
    let html = `
        <div class="test-interface">
            <div class="test-info">
                <h4>Informações do Endpoint</h4>
                <div class="endpoint-summary">
                    <span class="method-badge ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                    <code class="endpoint-url">${CONFIG.API_BASE_URL}${endpoint.path}</code>
                </div>
            </div>
    `;
    
    if (endpoint.parameters && endpoint.parameters.length > 0) {
        html += `<div class="test-form">`;
        html += `<h4>Parâmetros</h4>`;
        html += `<form id="testForm">`;
        
        // Agrupar parâmetros por tipo
        const paramsByType = {
            path: endpoint.parameters.filter(p => p.type === 'path'),
            query: endpoint.parameters.filter(p => p.type === 'query'),
            body: endpoint.parameters.filter(p => p.type === 'body')
        };
        
        Object.entries(paramsByType).forEach(([type, params]) => {
            if (params.length === 0) return;
            
            html += `<div class="param-group">`;
            html += `<h5>Parâmetros ${type === 'path' ? 'do Caminho' : type === 'query' ? 'de Query' : 'do Corpo'}</h5>`;
            
            params.forEach(param => {
                html += `
                    <div class="form-field">
                        <label for="param_${param.name}">${param.name}</label>
                        <input type="text" 
                               id="param_${param.name}" 
                               name="${param.name}" 
                               data-type="${type}"
                               placeholder="${getExampleValue(param).replace(/"/g, '')}"
                               ${type === 'path' ? 'required' : ''}>
                        ${param.description ? `<small>${param.description}</small>` : ''}
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        html += `</form>`;
        html += `</div>`;
    }
    
    html += `
        <div class="test-actions">
            <button class="btn-primary" id="executeTest">
                <i class="fas fa-play"></i>
                Executar Teste
            </button>
            <button class="btn-secondary" id="generateCurl">
                <i class="fas fa-terminal"></i>
                Gerar cURL
            </button>
        </div>
        
        <div class="test-results" id="testResults" style="display: none;">
            <h4>Resultado</h4>
            <div class="result-content" id="resultContent"></div>
        </div>
    `;
    
    html += `</div>`;
    return html;
}

function setupTestForm(endpoint) {
    const executeBtn = document.getElementById('executeTest');
    const generateCurlBtn = document.getElementById('generateCurl');
    
    executeBtn?.addEventListener('click', () => executeEndpointTest(endpoint));
    generateCurlBtn?.addEventListener('click', () => generateTestCurl(endpoint));
}

async function executeEndpointTest(endpoint) {
    const form = document.getElementById('testForm');
    const resultsDiv = document.getElementById('testResults');
    const resultContent = document.getElementById('resultContent');
    
    if (!resultsDiv || !resultContent) return;
    
    try {
        // Coletar dados do formulário
        const formData = new FormData(form);
        const params = {};
        
        for (let [key, value] of formData.entries()) {
            const input = form.querySelector(`[name="${key}"]`);
            const type = input?.dataset.type;
            
            if (type) {
                if (!params[type]) params[type] = {};
                params[type][key] = value;
            }
        }
        
        // Construir URL
        let url = `${CONFIG.API_BASE_URL}${endpoint.path}`;
        
        // Substituir parâmetros de caminho
        if (params.path) {
            Object.entries(params.path).forEach(([key, value]) => {
                url = url.replace(`{${key}}`, encodeURIComponent(value));
            });
        }
        
        // Adicionar query parameters
        if (params.query) {
            const queryString = new URLSearchParams(params.query).toString();
            if (queryString) url += `?${queryString}`;
        }
        
        // Configurar requisição
        const options = {
            method: endpoint.method,
            headers: {
                'Accept': 'application/json'
            }
        };
        
        // Adicionar corpo se necessário
        if (params.body && Object.keys(params.body).length > 0) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(params.body);
        }
        
        // Mostrar loading
        resultContent.innerHTML = `
            <div class="loading-result">
                <i class="fas fa-spinner fa-spin"></i>
                Executando requisição...
            </div>
        `;
        resultsDiv.style.display = 'block';
        
        // Executar requisição
        const response = await fetch(url, options);
        const responseText = await response.text();
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }
        
        // Mostrar resultado
        resultContent.innerHTML = `
            <div class="result-status ${response.ok ? 'success' : 'error'}">
                <strong>Status:</strong> ${response.status} ${response.statusText}
            </div>
            <div class="result-headers">
                <strong>Cabeçalhos de Resposta:</strong>
                <pre><code>${JSON.stringify(Object.fromEntries(response.headers), null, 2)}</code></pre>
            </div>
            <div class="result-body">
                <strong>Corpo da Resposta:</strong>
                <pre><code class="language-json">${typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData}</code></pre>
            </div>
        `;
        
        // Aplicar syntax highlighting
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }
        
    } catch (error) {
        resultContent.innerHTML = `
            <div class="result-status error">
                <strong>Erro:</strong> ${error.message}
            </div>
        `;
    }
}

function generateTestCurl(endpoint) {
    const form = document.getElementById('testForm');
    const resultContent = document.getElementById('resultContent');
    const resultsDiv = document.getElementById('testResults');
    
    if (!form || !resultContent || !resultsDiv) return;
    
    // Coletar dados do formulário
    const formData = new FormData(form);
    const params = {};
    
    for (let [key, value] of formData.entries()) {
        const input = form.querySelector(`[name="${key}"]`);
        const type = input?.dataset.type;
        
        if (type && value.trim()) {
            if (!params[type]) params[type] = {};
            params[type][key] = value;
        }
    }
    
    // Gerar comando cURL
    let url = `${CONFIG.API_BASE_URL}${endpoint.path}`;
    
    // Substituir parâmetros de caminho
    if (params.path) {
        Object.entries(params.path).forEach(([key, value]) => {
            url = url.replace(`{${key}}`, value);
        });
    }
    
    // Adicionar query parameters
    if (params.query) {
        const queryString = new URLSearchParams(params.query).toString();
        if (queryString) url += `?${queryString}`;
    }
    
    let curlCommand = `curl -X ${endpoint.method} \\\n`;
    curlCommand += `  "${url}" \\\n`;
    curlCommand += `  -H "Accept: application/json"`;
    
    // Adicionar corpo se necessário
    if (params.body && Object.keys(params.body).length > 0) {
        curlCommand += ` \\\n  -H "Content-Type: application/json"`;
        curlCommand += ` \\\n  -d '${JSON.stringify(params.body, null, 2)}'`;
    }
    
    // Mostrar resultado
    resultContent.innerHTML = `
        <div class="curl-result">
            <div class="curl-header">
                <strong>Comando cURL Gerado:</strong>
                <button class="copy-btn" onclick="copyToClipboard('${curlCommand.replace(/'/g, "\\'")}')">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            <pre><code class="language-bash">${curlCommand}</code></pre>
        </div>
    `;
    
    resultsDiv.style.display = 'block';
    
    // Aplicar syntax highlighting
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
}

// ===================================================================
// GESTÃO DE ESTATÍSTICAS E CONTADORES
// ===================================================================

function updateStats() {
    if (!AppState.filteredData) return;
    
    const totalCats = Object.keys(AppState.filteredData.categories).length;
    const totalEps = AppState.filteredData.total_endpoints;
    
    // Contar métodos únicos
    const uniqueMethods = new Set();
    Object.values(AppState.filteredData.categories).forEach(category => {
        category.endpoints.forEach(endpoint => {
            uniqueMethods.add(endpoint.method);
        });
    });
    
    // Atualizar elementos
    if (DOMElements.totalCategories) DOMElements.totalCategories.textContent = totalCats;
    if (DOMElements.totalEndpoints) DOMElements.totalEndpoints.textContent = totalEps;
    if (DOMElements.totalEndpointsMain) DOMElements.totalEndpointsMain.textContent = totalEps;
    if (DOMElements.totalCategoriesMain) DOMElements.totalCategoriesMain.textContent = totalCats;
    if (DOMElements.totalMethodsMain) DOMElements.totalMethodsMain.textContent = uniqueMethods.size;
}

function updateMethodCounts() {
    if (!AppState.filteredData) return;
    
    const methodCounts = { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 };
    let totalEndpoints = 0;
    
    Object.values(AppState.filteredData.categories).forEach(category => {
        category.endpoints.forEach(endpoint => {
            if (methodCounts.hasOwnProperty(endpoint.method)) {
                methodCounts[endpoint.method]++;
            }
            totalEndpoints++;
        });
    });
    
    // Atualizar contadores nos filtros
    Object.entries(methodCounts).forEach(([method, count]) => {
        const countElement = document.getElementById(`count${method}`);
        if (countElement) {
            countElement.textContent = count;
        }
    });
    
    const countAllElement = document.getElementById('countAll');
    if (countAllElement) {
        countAllElement.textContent = totalEndpoints;
    }
}

// ===================================================================
// GESTÃO DE TEMA E PREFERÊNCIAS
// ===================================================================

function initializeTheme() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, newTheme);
    updateThemeIcon(newTheme);
    
    showToast(`Tema alterado para ${newTheme === 'dark' ? 'escuro' : 'claro'}`, 'info');
}

function updateThemeIcon(theme) {
    const icon = DOMElements.themeToggle?.querySelector('i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function loadUserPreferences() {
    // Carregar pesquisas recentes
    const recentSearches = localStorage.getItem(CONFIG.STORAGE_KEYS.RECENT_SEARCHES);
    if (recentSearches) {
        AppState.recentSearches = JSON.parse(recentSearches);
    }
    
    // Carregar endpoints colapsados
    const collapsedEndpoints = localStorage.getItem(CONFIG.STORAGE_KEYS.COLLAPSED_ENDPOINTS);
    if (collapsedEndpoints) {
        AppState.collapsedEndpoints = new Set(JSON.parse(collapsedEndpoints));
    }
}

function saveUserPreferences() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(AppState.recentSearches));
    localStorage.setItem(CONFIG.STORAGE_KEYS.COLLAPSED_ENDPOINTS, JSON.stringify([...AppState.collapsedEndpoints]));
}

// ===================================================================
// SISTEMA DE NOTIFICAÇÕES
// ===================================================================

function showToast(message, type = 'info', duration = 3000) {
    if (!DOMElements.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    }[type] || 'fas fa-info-circle';
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    DOMElements.toastContainer.appendChild(toast);
    
    // Remover automaticamente após o tempo especificado
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, duration);
}

// ===================================================================
// CARREGAMENTO E PROGRESSO
// ===================================================================

function showLoadingStep(stepIndex) {
    const steps = DOMElements.loadingSteps?.querySelectorAll('.loading-step');
    if (!steps) return;
    
    steps.forEach((step, index) => {
        if (index <= stepIndex) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

function hideLoading() {
    if (DOMElements.loading) {
        DOMElements.loading.style.display = 'none';
    }
}

function showError(message) {
    hideLoading();
    
    document.body.innerHTML = `
        <div class="error-page">
            <div class="error-content">
                <i class="fas fa-exclamation-triangle error-icon"></i>
                <h2>Erro</h2>
                <p>${escapeHtml(message)}</p>
                <button class="btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh"></i>
                    Tentar Novamente
                </button>
            </div>
        </div>
    `;
}

// ===================================================================
// ATALHOS DE TECLADO E ACESSIBILIDADE
// ===================================================================

function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + K para focar na pesquisa
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        DOMElements.searchInput?.focus();
    }
    
    // Escape para fechar modal
    if (event.key === 'Escape') {
        closeModal();
    }
    
    // Ctrl/Cmd + E para exportar
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        exportDocumentation();
    }
}

function handleResize() {
    // Ajustar layout responsivo se necessário
    // Implementar lógica específica de redimensionamento
}

// ===================================================================
// FUNÇÕES UTILITÁRIAS
// ===================================================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } else {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            textArea.remove();
            return Promise.resolve();
        } catch (error) {
            textArea.remove();
            return Promise.reject(error);
        }
    }
}

function findEndpointById(endpointId) {
    if (!AppState.filteredData) return null;
    
    for (const category of Object.values(AppState.filteredData.categories)) {
        const endpoint = category.endpoints.find(ep => ep.function_name === endpointId);
        if (endpoint) return endpoint;
    }
    
    return null;
}

// ===================================================================
// EVENTOS GLOBAIS PARA TABS E INTERAÇÕES
// ===================================================================

// Event delegation para tabs de exemplo
document.addEventListener('click', (event) => {
    if (event.target.matches('.example-tab')) {
        const tab = event.target;
        const tabContainer = tab.closest('.example-tabs');
        const contentContainer = tab.closest('.example-section').querySelector('.example-content');
        
        // Remover active de todas as tabs
        tabContainer.querySelectorAll('.example-tab').forEach(t => t.classList.remove('active'));
        contentContainer.querySelectorAll('.example-panel').forEach(p => p.classList.remove('active'));
        
        // Ativar tab clicada
        tab.classList.add('active');
        const targetPanel = contentContainer.querySelector(`[data-panel="${tab.dataset.tab}"]`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }
});

// Função global para copiar código (chamada pelos botões)
window.copyToClipboard = function(text) {
    copyToClipboard(text).then(() => {
        showToast('Código copiado!', 'success');
    }).catch(() => {
        showToast('Erro ao copiar código', 'error');
    });
};

// ===================================================================
// INICIALIZAÇÃO FINAL
// ===================================================================

// Garantir que as funções globais estão disponíveis
window.showWelcomeSection = showWelcomeSection;
window.showEndpointsSection = showEndpointsSection;

console.log('📚 Documentação da API v2.0 carregada com sucesso!');
console.log('🚀 Funcionalidades disponíveis:');
console.log('   - Navegação intuitiva por categorias');
console.log('   - Pesquisa avançada com filtros');
console.log('   - Documentação detalhada de parâmetros');
console.log('   - Exemplos de código em múltiplas linguagens');
console.log('   - Interface de teste interativa');
console.log('   - Exportação de documentação');
console.log('   - Tema escuro/claro');
console.log('   - Atalhos de teclado (Ctrl+K, Ctrl+E)');
