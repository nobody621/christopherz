document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://hpdwgkumlmszdkpacddw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZHdna3VtbG1zemRrcGFjZGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0OTQ5NTMsImV4cCI6MjA2NDA3MDk1M30.1PLGPOUtGTEWrvpQVfM_l7cQMfyzcb2QL_4YRQb7EQc';

    // Main page elements
    const productGrid = document.getElementById('shop-product-grid');
    const productCountSpan = document.getElementById('product-count');
    const loadingProductsMessage = document.getElementById('loading-products-message');
    const errorProductsMessage = document.getElementById('error-products-message');
    const initialGridPlaceholder = document.getElementById('grid-placeholder-initial');

    // Filter and Sort controls
    const searchInput = document.getElementById('shop-search-input');
    const sortSelect = document.getElementById('sort-options');
    
    // Sidebar Filter Elements
    const categoryFilterList = document.getElementById('category-filter-list');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const materialFilterList = document.getElementById('material-filter-list'); 
    const applyFiltersButton = document.getElementById('apply-filters-btn');
    const clearFiltersButton = document.getElementById('clear-filters-btn');
    const filtersSidebar = document.getElementById('filters-sidebar'); 

    // Cart Elements
    const cartBody = document.getElementById('cart-body');
    const cartSubtotalAmountSpan = document.getElementById('cart-subtotal-amount');
    const cartItemCountBadge = document.getElementById('cart-item-count-badge');
    const cartEmptyMessagePlaceholder = document.getElementById('cart-empty-message-placeholder');
    const checkoutButton = document.getElementById('checkout-btn');


    let allProducts = []; 
    let currentlyDisplayedProducts = []; 
    let cart = []; // Our cart array

    // --- Initialize Supabase Client ---
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('Supabase client is not loaded.');
        if (errorProductsMessage) {
            errorProductsMessage.textContent = 'Error: Data services unavailable.';
            errorProductsMessage.style.display = 'block';
        }
        if (loadingProductsMessage) loadingProductsMessage.style.display = 'none';
        if (initialGridPlaceholder) initialGridPlaceholder.style.display = 'none';
        return;
    }
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- Intersection Observer for Animations ---
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

    // --- Helper: HTML Escaping ---
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            
    }

    // --- Cart Management Functions ---
    function loadCartFromLocalStorage() {
        const storedCart = localStorage.getItem('christopherZCart');
        cart = storedCart ? JSON.parse(storedCart) : [];
        updateCartIconBadge();
        renderCartSidebar();
    }

    function saveCartToLocalStorage() {
        localStorage.setItem('christopherZCart', JSON.stringify(cart));
        updateCartIconBadge();
        renderCartSidebar();
    }

    function addToCart(productId) {
        const productToAdd = allProducts.find(p => p.id.toString() === productId.toString());
        if (!productToAdd) {
            console.error("Product not found to add to cart:", productId);
            return;
        }

        const existingCartItem = cart.find(item => item.id === productToAdd.id);
        if (existingCartItem) {
            existingCartItem.quantity += 1;
        } else {
            cart.push({ 
                id: productToAdd.id, 
                name: productToAdd.name, 
                price: productToAdd.price, 
                image: productToAdd.main_image, // Assuming main_image is what you want in cart
                quantity: 1 
            });
        }
        saveCartToLocalStorage();
        // Optional: Show a success message or animation
        console.log(`${productToAdd.name} added to cart.`);
    }

    function updateCartItemQuantity(productId, newQuantity) {
        const itemIndex = cart.findIndex(item => item.id.toString() === productId.toString());
        if (itemIndex > -1) {
            if (newQuantity > 0) {
                cart[itemIndex].quantity = newQuantity;
            } else {
                cart.splice(itemIndex, 1); // Remove if quantity is 0 or less
            }
            saveCartToLocalStorage();
        }
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => item.id.toString() !== productId.toString());
        saveCartToLocalStorage();
    }

    function updateCartIconBadge() {
        if (!cartItemCountBadge) return;
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartItemCountBadge.textContent = totalItems;
        cartItemCountBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    function renderCartSidebar() {
        if (!cartBody || !cartSubtotalAmountSpan || !cartEmptyMessagePlaceholder) return;

        cartBody.innerHTML = ''; // Clear previous items

        if (cart.length === 0) {
            cartEmptyMessagePlaceholder.style.display = 'block';
            cartSubtotalAmountSpan.textContent = '$0.00';
            return;
        }
        
        cartEmptyMessagePlaceholder.style.display = 'none';
        let subtotal = 0;

        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            itemElement.dataset.productId = item.id;

            const itemImageUrl = item.image && item.image.trim() !== '' 
                ? escapeHTML(item.image)
                : 'https://via.placeholder.com/80x80.png?text=No+Img';

            itemElement.innerHTML = `
                <img src="${itemImageUrl}" alt="${escapeHTML(item.name)}" class="cart-item-image">
                <div class="cart-item-details">
                    <p class="cart-item-name">${escapeHTML(item.name)}</p>
                    <p class="cart-item-price">$${Number(item.price).toFixed(2)}</p>
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" data-id="${item.id}" aria-label="Decrease quantity">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-id="${item.id}" aria-label="Quantity">
                        <button class="quantity-btn plus" data-id="${item.id}" aria-label="Increase quantity">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove item"><i class="fas fa-trash-alt"></i></button>
            `;
            cartBody.appendChild(itemElement);
            subtotal += item.price * item.quantity;
        });
        cartSubtotalAmountSpan.textContent = `$${subtotal.toFixed(2)}`;
    }


    // --- Dynamic Filter List Population ---
    function populateGenericFilterList(products, listElement, propertyName) {
        if (!listElement) return;
        const values = [...new Set(products.map(p => p[propertyName]).filter(Boolean).map(val => String(val).trim()).filter(val => val !== ''))].sort();
        
        listElement.innerHTML = ''; 
        if (values.length === 0) {
            const singularPropertyName = propertyName === 'category' ? 'categorie' : (propertyName.endsWith('ies') ? propertyName.slice(0, -3) + 'y' : (propertyName === "Material" ? "material" : propertyName.slice(0,-1) ));
            listElement.innerHTML = `<li>No ${singularPropertyName.toLowerCase()}s found.</li>`;
            return;
        }
        values.forEach(value => {
            const listItem = document.createElement('li');
            const inputName = propertyName === "Material" ? "material" : propertyName.toLowerCase();
            listItem.innerHTML = `<label><input type="checkbox" name="${inputName}" value="${escapeHTML(value)}"> ${escapeHTML(value)}</label>`;
            listElement.appendChild(listItem);
        });
    }
    
    // --- Product Rendering on Shop Page ---
    function renderProducts(productsToRender) {
        if (!productGrid) return;
        productGrid.innerHTML = ''; 
        if (initialGridPlaceholder) initialGridPlaceholder.style.display = 'none';

        if (productsToRender.length === 0) {
            const searchTerm = searchInput.value.trim();
            let message = "No products found matching your criteria.";
            if (!searchTerm && !getActiveFilters().length) { 
                message = "No products currently available for this selection.";
            }
            productGrid.innerHTML = `<p class="no-products-message">${escapeHTML(message)}</p>`;
            if (productCountSpan) productCountSpan.textContent = "Showing 0 results";
            return;
        }

        if (productCountSpan) productCountSpan.textContent = `Showing ${productsToRender.length} result${productsToRender.length === 1 ? '' : 's'}`;

        productsToRender.forEach(product => {
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
                        <!-- Add data attributes for cart functionality -->
                        <button class="btn-view-product add-to-cart-btn" 
                                data-product-id="${product.id}"> 
                            Add to Cart
                        </button> 
                    </div>
                </a>`;
            productGrid.appendChild(productCard);
            if (productCardObserver) productCardObserver.observe(productCard);
        });
    }

    // --- Get Active Filters (from sidebar) ---
    function getActiveFilters() {
        const active = [];
        if(categoryFilterList) {
            const selectedCategories = Array.from(categoryFilterList.querySelectorAll('input[name="category"]:checked'))
                                         .map(cb => cb.value);
            if (selectedCategories.length > 0) active.push('category');
        }
        if(minPriceInput && maxPriceInput) {
            const minPrice = parseFloat(minPriceInput.value);
            const maxPrice = parseFloat(maxPriceInput.value);
            if (!isNaN(minPrice) && minPrice >= 0) active.push('price_min');
            if (!isNaN(maxPrice) && maxPrice > 0) active.push('price_max');
        }
        if(materialFilterList) {
            const selectedMaterials = Array.from(materialFilterList.querySelectorAll('input[name="material"]:checked'))
                                          .map(cb => cb.value);
            if (selectedMaterials.length > 0) active.push('material');
        }
        return active;
    }

    // --- Filtering and Sorting Logic ---
    function applyAllFiltersAndSort() {
        if (loadingProductsMessage) loadingProductsMessage.style.display = 'block';
        if (productGrid) productGrid.innerHTML = ''; 

        let filteredProducts = [...allProducts];

        if (searchInput) {
            const searchTerm = searchInput.value.toLowerCase().trim();
            if (searchTerm) {
                filteredProducts = filteredProducts.filter(p => 
                    (p.name && p.name.toLowerCase().includes(searchTerm)) ||
                    (p.description && p.description.toLowerCase().includes(searchTerm))
                );
            }
        }
        if (categoryFilterList) {
            const selectedCategories = Array.from(categoryFilterList.querySelectorAll('input[name="category"]:checked'))
                                         .map(cb => cb.value);
            if (selectedCategories.length > 0) {
                filteredProducts = filteredProducts.filter(p => p.category && selectedCategories.includes(p.category));
            }
        }
        if (minPriceInput && maxPriceInput) {
            const minPrice = parseFloat(minPriceInput.value);
            const maxPrice = parseFloat(maxPriceInput.value);
            if (!isNaN(minPrice) && minPrice >= 0) {
                filteredProducts = filteredProducts.filter(p => p.price !== null && p.price >= minPrice);
            }
            if (!isNaN(maxPrice) && maxPrice > 0) { 
                filteredProducts = filteredProducts.filter(p => p.price !== null && p.price <= maxPrice);
            }
        }
        if (materialFilterList) {
            const selectedMaterials = Array.from(materialFilterList.querySelectorAll('input[name="material"]:checked'))
                                          .map(cb => cb.value);
            if (selectedMaterials.length > 0) {
                filteredProducts = filteredProducts.filter(p => 
                    p["Material"] && selectedMaterials.some(mat => String(p["Material"]).toLowerCase().includes(mat.toLowerCase()))
                );
            }
        }
        
        if (sortSelect) {
            const sortValueParts = sortSelect.value.split('-');
            const sortField = sortValueParts[0];
            const sortAscending = sortValueParts[1] === 'asc';
            filteredProducts.sort((a, b) => {
                let valA = a[sortField];
                let valB = b[sortField];
                if (sortField === 'price') { 
                    valA = Number(valA); valB = Number(valB);
                } else if (sortField === 'created_at') {
                     valA = new Date(valA).getTime(); valB = new Date(valB).getTime();
                } else if (typeof valA === 'string' && typeof valB === 'string') {
                    valA = valA.toLowerCase(); valB = valB.toLowerCase();
                }
                if (valA < valB) return sortAscending ? -1 : 1;
                if (valA > valB) return sortAscending ? 1 : -1;
                return 0;
            });
        }
        
        currentlyDisplayedProducts = filteredProducts; 
        renderProducts(currentlyDisplayedProducts);
        if (loadingProductsMessage) loadingProductsMessage.style.display = 'none';
    }

    // --- Initial Data Fetch from Supabase ---
    async function fetchInitialShopData() {
        if (loadingProductsMessage) loadingProductsMessage.style.display = 'block';
        if (errorProductsMessage) errorProductsMessage.style.display = 'none';
        if (initialGridPlaceholder) initialGridPlaceholder.style.display = 'block';
        
        const selectColumns = 'id, name, description, price, category, "Material", main_image, created_at'; 
        // Removed image2, image3, "image 4" as they are not used on the card for now. Add back if needed.

        try {
            const { data, error } = await supabase
                .from('products')
                .select(selectColumns)
                .order('created_at', { ascending: false }); 

            if (error) {
                console.error('Supabase fetch error object:', error); 
                throw error; 
            }

            allProducts = data || [];
            populateGenericFilterList(allProducts, categoryFilterList, 'category');
            populateGenericFilterList(allProducts, materialFilterList, 'Material');
            applyAllFiltersAndSort(); 

        } catch (error) { 
            console.error("Error fetching initial shop data:", error); 
            if (errorProductsMessage) {
                let displayErrorMessage = "Failed to load products.";
                if (error.message) { 
                    displayErrorMessage += ` Details: ${error.message}`;
                }
                errorProductsMessage.textContent = displayErrorMessage;
                errorProductsMessage.style.display = 'block';
            }
            allProducts = [];
            renderProducts([]); 
        } finally {
            if (loadingProductsMessage) loadingProductsMessage.style.display = 'none';
            if (initialGridPlaceholder && (allProducts.length > 0 || (errorProductsMessage && errorProductsMessage.style.display === 'block'))) {
                 initialGridPlaceholder.style.display = 'none';
            }
        }
    }

    // --- Event Listeners Setup ---
    if (searchInput) {
        searchInput.addEventListener('input', () => applyAllFiltersAndSort());
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', applyAllFiltersAndSort);
    }
    if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', () => {
            applyAllFiltersAndSort();
            if (filtersSidebar && filtersSidebar.classList.contains('active')) {
                const closeFiltersButton = document.getElementById('close-filters-btn');
                if (closeFiltersButton) closeFiltersButton.click();
            }
        });
    }
    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if(categoryFilterList) categoryFilterList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            if (minPriceInput) minPriceInput.value = '';
            if (maxPriceInput) maxPriceInput.value = '';
            if(materialFilterList) materialFilterList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            applyAllFiltersAndSort(); 
        });
    }

    // Event delegation for "Add to Cart" buttons
    if (productGrid) {
        productGrid.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.add-to-cart-btn');
            if (targetButton) {
                event.preventDefault(); // Prevent link navigation if button is inside <a>
                const productId = targetButton.dataset.productId;
                if (productId) {
                    addToCart(productId);
                }
            }
        });
    }

    // Event delegation for cart sidebar interactions
    if (cartBody) {
        cartBody.addEventListener('click', (event) => {
            const target = event.target;
            const productId = target.dataset.id || target.closest('[data-id]')?.dataset.id;

            if (!productId) return;

            if (target.classList.contains('quantity-btn') && target.classList.contains('plus')) {
                const item = cart.find(i => i.id.toString() === productId);
                if (item) updateCartItemQuantity(productId, item.quantity + 1);
            } else if (target.classList.contains('quantity-btn') && target.classList.contains('minus')) {
                const item = cart.find(i => i.id.toString() === productId);
                if (item) updateCartItemQuantity(productId, item.quantity - 1);
            } else if (target.classList.contains('cart-item-remove') || target.closest('.cart-item-remove')) {
                removeFromCart(productId);
            }
        });

        cartBody.addEventListener('change', (event) => {
            const target = event.target;
            if (target.classList.contains('quantity-input')) {
                const productId = target.dataset.id;
                const newQuantity = parseInt(target.value, 10);
                if (productId && !isNaN(newQuantity)) {
                    updateCartItemQuantity(productId, newQuantity);
                } else if (productId) {
                    // Revert to old quantity if input is invalid
                    const item = cart.find(i => i.id.toString() === productId);
                    if(item) target.value = item.quantity; 
                }
            }
        });
    }
    
    if(checkoutButton) {
        checkoutButton.addEventListener('click', () => {
            if (cart.length > 0) {
                console.log("Proceeding to checkout with cart:", JSON.stringify(cart, null, 2));
                alert("Proceeding to checkout! (See console for cart details)");
                // Here you would typically redirect to a checkout page or trigger a payment modal
                // For now, we can clear the cart as a placeholder action
                // cart = [];
                // saveCartToLocalStorage();
            } else {
                alert("Your cart is empty.");
            }
        });
    }

    // --- Initial Load ---
    loadCartFromLocalStorage(); // Load cart first
    fetchInitialShopData();     // Then fetch products
});