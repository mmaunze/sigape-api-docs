// Global variables
let apiData = null;
let filteredData = null;
let currentCategory = null;
let currentMethod = 'all';
let searchTerm = '';

// DOM elements
const loading = document.getElementById('loading');
const welcomeSection = document.getElementById('welcomeSection');
const endpointsSection = document.getElementById('endpointsSection');
const noResults = document.getElementById('noResults');
const categoriesNav = document.getElementById('categoriesNav');
const endpointsList = document.getElementById('endpointsList');
const searchInput = document.getElementById('searchInput');
const themeToggle = document.getElementById('themeToggle');
const methodFilters = document.querySelectorAll('.method-filter');
const expandAllBtn = document.getElementById('expandAll');
const collapseAllBtn = document.getElementById('collapseAll');
const sectionTitle = document.getElementById('sectionTitle');
const totalEndpoints = document.getElementById('totalEndpoints');
const totalCategories = document.getElementById('totalCategories');
const totalEndpointsMain = document.getElementById('totalEndpointsMain');

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadApiData();
    initializeEventListeners();
    initializeTheme();
    hideLoading();
});

// Load API data
async function loadApiData() {
    try {
        const response = await fetch('organized_api.json');
        apiData = await response.json();
        filteredData = apiData;
        
        updateStats();
        renderCategories();
        showWelcomeSection();
    } catch (error) {
        console.error('Erro ao carregar dados da API:', error);
        showError('Erro ao carregar dados da API');
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Method filters
    methodFilters.forEach(filter => {
        filter.addEventListener('click', () => handleMethodFilter(filter));
    });
    
    // Expand/Collapse all
    expandAllBtn.addEventListener('click', () => toggleAllEndpoints(true));
    collapseAllBtn.addEventListener('click', () => toggleAllEndpoints(false));
}

// Handle search
function handleSearch(event) {
    searchTerm = event.target.value.toLowerCase().trim();
    applyFilters();
}

// Handle method filter
function handleMethodFilter(filterElement) {
    // Update active state
    methodFilters.forEach(f => f.classList.remove('active'));
    filterElement.classList.add('active');
    
    currentMethod = filterElement.dataset.method;
    applyFilters();
}

// Apply all filters
function applyFilters() {
    if (!apiData) return;
    
    let filtered = { ...apiData };
    
    // Apply search filter
    if (searchTerm) {
        const filteredCategories = {};
        
        Object.entries(apiData.categories).forEach(([categoryKey, categoryData]) => {
            const filteredEndpoints = categoryData.endpoints.filter(endpoint => {
                return endpoint.path.toLowerCase().includes(searchTerm) ||
                       endpoint.method.toLowerCase().includes(searchTerm) ||
                       endpoint.function_name.toLowerCase().includes(searchTerm) ||
                       categoryData.name.toLowerCase().includes(searchTerm) ||
                       categoryData.description.toLowerCase().includes(searchTerm);
            });
            
            if (filteredEndpoints.length > 0) {
                filteredCategories[categoryKey] = {
                    ...categoryData,
                    endpoints: filteredEndpoints,
                    endpoint_count: filteredEndpoints.length
                };
            }
        });
        
        filtered.categories = filteredCategories;
    }
    
    // Apply method filter
    if (currentMethod !== 'all') {
        const filteredCategories = {};
        
        Object.entries(filtered.categories).forEach(([categoryKey, categoryData]) => {
            const filteredEndpoints = categoryData.endpoints.filter(endpoint => 
                endpoint.method === currentMethod
            );
            
            if (filteredEndpoints.length > 0) {
                filteredCategories[categoryKey] = {
                    ...categoryData,
                    endpoints: filteredEndpoints,
                    endpoint_count: filteredEndpoints.length
                };
            }
        });
        
        filtered.categories = filteredCategories;
    }
    
    // Update total endpoints count
    filtered.total_endpoints = Object.values(filtered.categories)
        .reduce((sum, category) => sum + category.endpoint_count, 0);
    
    filteredData = filtered;
    
    // Update UI
    renderCategories();
    
    if (currentCategory && filtered.categories[currentCategory]) {
        showEndpointsSection(currentCategory);
    } else if (currentCategory) {
        // Current category was filtered out, show welcome
        showWelcomeSection();
    }
    
    // Show no results if needed
    if (Object.keys(filtered.categories).length === 0) {
        showNoResults();
    }
}

// Render categories in sidebar
function renderCategories() {
    if (!filteredData) return;
    
    const categories = Object.entries(filteredData.categories)
        .sort(([,a], [,b]) => b.endpoint_count - a.endpoint_count);
    
    categoriesNav.innerHTML = categories.map(([key, category]) => `
        <a href="#" class="category-item" data-category="${key}">
            <div class="category-name">${category.name}</div>
            <div class="category-description">${category.description}</div>
            <div class="category-count">${category.endpoint_count} endpoints</div>
        </a>
    `).join('');
    
    // Add click listeners to category items
    categoriesNav.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const categoryKey = item.dataset.category;
            showEndpointsSection(categoryKey);
        });
    });
    
    // Update active category
    if (currentCategory) {
        const activeItem = categoriesNav.querySelector(`[data-category="${currentCategory}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

// Show welcome section
function showWelcomeSection() {
    currentCategory = null;
    welcomeSection.style.display = 'block';
    endpointsSection.style.display = 'none';
    noResults.style.display = 'none';
    
    // Remove active state from categories
    categoriesNav.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    updateStats();
}

// Show endpoints section
function showEndpointsSection(categoryKey) {
    if (!filteredData.categories[categoryKey]) return;
    
    currentCategory = categoryKey;
    const category = filteredData.categories[categoryKey];
    
    welcomeSection.style.display = 'none';
    endpointsSection.style.display = 'block';
    noResults.style.display = 'none';
    
    sectionTitle.textContent = `${category.name} (${category.endpoint_count} endpoints)`;
    
    renderEndpoints(category.endpoints);
    
    // Update active category
    categoriesNav.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = categoriesNav.querySelector(`[data-category="${categoryKey}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// Show no results
function showNoResults() {
    welcomeSection.style.display = 'none';
    endpointsSection.style.display = 'none';
    noResults.style.display = 'block';
}

// Render endpoints
function renderEndpoints(endpoints) {
    endpointsList.innerHTML = endpoints.map(endpoint => `
        <div class="endpoint-card" data-endpoint-id="${endpoint.function_name}">
            <div class="endpoint-header">
                <div class="endpoint-info">
                    <span class="method-badge ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                    <span class="endpoint-path">${endpoint.path}</span>
                </div>
                <i class="fas fa-chevron-down expand-icon"></i>
            </div>
            <div class="endpoint-details">
                <div class="endpoint-description">
                    <p><strong>Função:</strong> ${endpoint.function_name}</p>
                    <p>Endpoint para operações ${getMethodDescription(endpoint.method)} no recurso.</p>
                </div>
                
                ${endpoint.parameters && endpoint.parameters.length > 0 ? `
                    <div class="parameters-section">
                        <h4><i class="fas fa-cog"></i> Parâmetros</h4>
                        ${endpoint.parameters.map(param => `
                            <div class="parameter-item">
                                <span class="parameter-name">${param.name}</span>
                                <span class="parameter-type">${param.type}</span>
                                ${param.description ? `<p>${param.description}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : '<p><em>Nenhum parâmetro necessário</em></p>'}
                
                <div class="example-section">
                    <h4><i class="fas fa-code"></i> Exemplo de Uso</h4>
                    <div class="code-block">
                        <pre><code class="language-javascript">${generateCodeExample(endpoint)}</code></pre>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click listeners to endpoint headers
    endpointsList.querySelectorAll('.endpoint-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.endpoint-card');
            card.classList.toggle('expanded');
        });
    });
    
    // Highlight syntax
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
}

// Get method description
function getMethodDescription(method) {
    const descriptions = {
        'GET': 'de consulta/leitura',
        'POST': 'de criação',
        'PUT': 'de atualização',
        'DELETE': 'de exclusão'
    };
    return descriptions[method] || 'genéricas';
}

// Generate code example
function generateCodeExample(endpoint) {
    const baseUrl = 'api.url';
    const url = `${baseUrl}${endpoint.path}`;
    
    let example = `// Exemplo de uso da função ${endpoint.function_name}\n`;
    
    if (endpoint.method === 'GET') {
        example += `async function ${endpoint.function_name}(`;
        if (endpoint.parameters && endpoint.parameters.length > 0) {
            const pathParams = endpoint.parameters.filter(p => p.type === 'path');
            example += pathParams.map(p => p.name).join(', ');
        }
        example += `) {\n`;
        example += `    const response = await fetch('${url}', {\n`;
        example += `        method: '${endpoint.method}'\n`;
        example += `    });\n`;
        example += `    const data = await response.json();\n`;
        example += `    return data;\n`;
        example += `}`;
    } else if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
        example += `async function ${endpoint.function_name}(`;
        const pathParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'path') : [];
        const bodyParams = endpoint.parameters ? endpoint.parameters.filter(p => p.type === 'body') : [];
        
        const allParams = [...pathParams.map(p => p.name), ...bodyParams.map(p => p.name)];
        example += allParams.join(', ');
        
        example += `) {\n`;
        
        if (bodyParams.length > 0) {
            example += `    const body = {\n`;
            example += bodyParams.map(p => `        ${p.name}`).join(',\n');
            example += `\n    };\n\n`;
        }
        
        example += `    const response = await fetch('${url}', {\n`;
        example += `        method: '${endpoint.method}',\n`;
        
        if (bodyParams.length > 0) {
            example += `        headers: {\n`;
            example += `            'Content-Type': 'application/json'\n`;
            example += `        },\n`;
            example += `        body: JSON.stringify(body)\n`;
        }
        
        example += `    });\n`;
        example += `    const data = await response.json();\n`;
        example += `    return data;\n`;
        example += `}`;
    } else if (endpoint.method === 'DELETE') {
        example += `async function ${endpoint.function_name}(`;
        if (endpoint.parameters && endpoint.parameters.length > 0) {
            const pathParams = endpoint.parameters.filter(p => p.type === 'path');
            example += pathParams.map(p => p.name).join(', ');
        }
        example += `) {\n`;
        example += `    const response = await fetch('${url}', {\n`;
        example += `        method: '${endpoint.method}'\n`;
        example += `    });\n`;
        example += `    return response.ok;\n`;
        example += `}`;
    }
    
    return example;
}

// Toggle all endpoints
function toggleAllEndpoints(expand) {
    const cards = endpointsList.querySelectorAll('.endpoint-card');
    cards.forEach(card => {
        if (expand) {
            card.classList.add('expanded');
        } else {
            card.classList.remove('expanded');
        }
    });
}

// Update statistics
function updateStats() {
    if (!filteredData) return;
    
    const totalCats = Object.keys(filteredData.categories).length;
    const totalEps = filteredData.total_endpoints;
    
    totalCategories.textContent = totalCats;
    totalEndpoints.textContent = totalEps;
    totalEndpointsMain.textContent = totalEps;
}

// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Utility functions
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

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    hideLoading();
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; color: var(--text-primary);">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc2626; margin-bottom: 1rem;"></i>
            <h2>Erro</h2>
            <p>${message}</p>
        </div>
    `;
}

