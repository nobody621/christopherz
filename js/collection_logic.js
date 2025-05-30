document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://hpdwgkumlmszdkpacddw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZHdna3VtbG1zemRrcGFjZGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0OTQ5NTMsImV4cCI6MjA2NDA3MDk1M30.1PLGPOUtGTEWrvpQVfM_l7cQMfyzcb2QL_4YRQb7EQc';

    const productGrid = document.getElementById('product-grid-dynamic');
    const sortSelect = document.getElementById('sort-products');
    const searchInput = document.getElementById('search-products-input'); // New search input
    // const searchButton = document.getElementById('search-products-btn'); // Optional search button
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');

    let allProducts = []; // To store all fetched products for client-side filtering/sorting

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('Supabase client is not loaded. Ensure CDN script is included.');
        if (errorMessage) {
            errorMessage.textContent = 'Error: Could not initialize data services.';
            errorMessage.style.display = 'block';
        }
        if (loadingMessage) loadingMessage.style.display = 'none';
        return;
    }
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let productCardObserver;
    if (window.IntersectionObserver) {
        productCardObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); 
                }
            });
        }, { threshold: 0.1 }); 
    }

    async function initialFetchProducts() {
        if (!loadingMessage || !errorMessage) return;

        loadingMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        const selectColumns = 'id, name, description, price, available_options, main_image, image2, image3, "image 4"'; 

        try {
            const { data: products, error } = await supabase
                .from('products')
                .select(selectColumns); // Fetch all initially, sorting will be client-side for simplicity here

            if (error) {
                console.error('Supabase error:', error);
                throw new Error(`Supabase query failed: ${error.message} (Details: ${error.details})`);
            }

            allProducts = products || []; // Store all products
            renderFilteredAndSortedProducts(); // Initial render

        } catch (error) {
            console.error('Error fetching products:', error);
            if (errorMessage) {
                errorMessage.textContent = `Failed to load products. ${error.message}`;
                errorMessage.style.display = 'block';
            }
            allProducts = []; // Clear products on error
        } finally {
            if (loadingMessage) loadingMessage.style.display = 'none';
        }
    } 

    function renderFilteredAndSortedProducts() {
        if (!productGrid || !sortSelect || !searchInput) return;

        let productsToDisplay = [...allProducts]; // Start with a copy of all products

        // 1. Apply Search Filter
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            productsToDisplay = productsToDisplay.filter(product => {
                const nameMatch = product.name ? product.name.toLowerCase().includes(searchTerm) : false;
                const descriptionMatch = product.description ? product.description.toLowerCase().includes(searchTerm) : false;
                // Add more fields to search if desired, e.g., product.available_options
                return nameMatch || descriptionMatch;
            });
        }

        // 2. Apply Sorting
        const sortValue = sortSelect.value.split('-');
        const sortField = sortValue[0];
        const sortAscending = sortValue[1] === 'asc';

        productsToDisplay.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Handle numeric vs string sorting
            if (sortField === 'price') {
                valA = Number(valA);
                valB = Number(valB);
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortAscending ? -1 : 1;
            if (valA > valB) return sortAscending ? 1 : -1;
            return 0;
        });
        
        // 3. Display Products
        displayProductsHTML(productsToDisplay);
    }

    function displayProductsHTML(products) { // Renamed from displayProducts to avoid confusion
        if (!productGrid) return;
        productGrid.innerHTML = ''; 
        
        if (products.length === 0) {
            const currentSearchTerm = searchInput.value.trim();
            if (currentSearchTerm) {
                productGrid.innerHTML = `<p class="no-products-message">No products found matching "${escapeHTML(currentSearchTerm)}".</p>`;
            } else {
                productGrid.innerHTML = '<p class="no-products-message">No products currently available.</p>';
            }
            return;
        }

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-item-card', 'animated'); 

            const name = product.name ? escapeHTML(product.name) : 'Unnamed Product';
            const price = product.price !== null ? `$${Number(product.price).toFixed(2)}` : 'Price not available';
            const hasDescription = product.description && product.description.trim() !== '';
            const imageUrl = product.main_image && product.main_image.trim() !== '' 
                ? escapeHTML(product.main_image) 
                : 'https://via.placeholder.com/300x300.png?text=No+Image';
            
            productCard.innerHTML = `
                <a href="product-detail.html?id=${product.id}" class="product-item-link">
                    <div class="product-item-image-wrapper">
                        <img src="${imageUrl}" alt="${name}" class="product-item-image" loading="lazy">
                    </div>
                    <div class="product-item-info">
                        <h3 class="product-item-name">${name}</h3>
                        ${!hasDescription ? '<p class="product-item-description-placeholder">no description</p>' : ''}
                        <p class="product-item-price">${price}</p>
                        <button class="btn-view-product">Add To Inquiry</button>
                    </div>
                </a>`;

            productGrid.appendChild(productCard);

            if (productCardObserver) {
                productCardObserver.observe(productCard);
            } else {
                productCard.classList.add('visible');
            }
        }); 
    } 

    function escapeHTML(str) { 
        if (str === null || str === undefined) return '';
        return String(str) 
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            
    }

    // Event Listeners
    if (sortSelect) {
        sortSelect.addEventListener('change', renderFilteredAndSortedProducts);
    }
    if (searchInput) {
        searchInput.addEventListener('input', renderFilteredAndSortedProducts); // Filter as user types
    }
    // Optional: If you have a search button
    // const searchButton = document.getElementById('search-products-btn');
    // if (searchButton) {
    //     searchButton.addEventListener('click', renderFilteredAndSortedProducts);
    // }

    // Initial Fetch
    initialFetchProducts();

});