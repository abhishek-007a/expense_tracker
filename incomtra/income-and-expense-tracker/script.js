// Global variables to hold references for edit submit functions
let currentEditTransactionSubmitHandler = null;
let currentEditCategorySubmitHandler = null;
let currentEditGoalSubmitHandler = null; 

// Application State
let state = {
    transactions: [],
    categories: [
        { id: 1, name: 'Food', budget: 300, icon: 'fa-utensils', color: '#FF6384' },
        { id: 2, name: 'Transportation', budget: 150, icon: 'fa-car', color: '#36A2EB' },
        { id: 3, name: 'Housing', budget: 1000, icon: 'fa-home', color: '#FFCE56' },
        { id: 4, name: 'Entertainment', budget: 100, icon: 'fa-film', color: '#4BC0C0' },
        { id: 5, name: 'Shopping', budget: 200, icon: 'fa-shopping-cart', color: '#9966FF' },
        { id: 6, name: 'Income', budget: 0, icon: 'fa-money-bill-wave', color: '#00CC99' }
    ],
    goals: [],
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear()
};

// Chart references
let categoryChart, monthlyChart, incomeExpenseChart, trendsChart;

// ----------------------------------------------------------------------
// --- AUTHENTICATION & UI CONTROL FUNCTIONS ---
// ----------------------------------------------------------------------

/**
 * Saves the user's name, email, and password to localStorage.
 * @param {string} name 
 * @param {string} email 
 * @param {string} password 
 */
function registerUser(name, email, password) {
    const user = { name: name.trim(), email: email.trim(), password: password.trim(), isLoggedIn: false };
    localStorage.setItem('userCredentials', JSON.stringify(user));
}

/**
 * Retrieves the stored user account for comparison.
 * @returns {object|null}
 */
function getStoredUser() {
    const stored = localStorage.getItem('userCredentials');
    return stored ? JSON.parse(stored) : null;
}

function verifyCredentials(email, password) {
    const user = getStoredUser();
    if (!user) return false;
    return email === user.email.trim() && password === user.password.trim();
}

/**
 * Checks localStorage for login status and redirects to dashboard if active.
 */
function checkLoginStatus() {
    const user = getStoredUser();
    
    if (user && user.isLoggedIn === true) {
        showDashboard();
    } else {
        showLoginScreen();
    }
}

/**
 * Sets up the body and login container to display the login form.
 */
function showLoginScreen() {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('app-dashboard');
    const body = document.body;
    
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    
    body.classList.add('bg-gray-50', 'flex', 'items-center', 'justify-center', 'min-h-screen');
    
    showLogin();
}

/**
 * FIX: Modified to ensure chart rendering occurs after the dashboard is visible
 * and ready in the DOM using a slight delay.
 */
function showDashboard() {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('app-dashboard');
    const body = document.body;

    const user = getStoredUser();
    if (user) {
        user.isLoggedIn = true;
        localStorage.setItem('userCredentials', JSON.stringify(user));
    }
    
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    
    body.classList.remove('flex', 'items-center', 'justify-center', 'min-h-screen');
    
    // 1. Initialize app logic (load data, set up listeners)
    init(); 

    // 2. CRITICAL FIX: Use a brief delay and explicitly call all rendering functions.
    setTimeout(() => {
        updateSummaryCards(); 
        renderRecentTransactions();
        renderCharts(); // This is the call that draws the graphs
        renderDashboard(); 
        renderGoals();
    }, 50); 
}

window.logout = function() {
    const user = getStoredUser();
    if (user) {
        user.isLoggedIn = false;
        localStorage.setItem('userCredentials', JSON.stringify(user));
    }
    
    showLoginScreen();
    displayMessage("Successfully logged out.", 'success');
}

function displayMessage(text, type) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = text;
    messageBox.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');

    if (type === 'error') {
        messageBox.classList.add('bg-red-100', 'text-red-700');
    } else if (type === 'success') {
        messageBox.classList.add('bg-green-100', 'text-green-700');
    }
    messageBox.classList.remove('hidden');
}

window.showSignup = function() {
    const form = document.getElementById('loginForm');
    const backToLoginLink = document.getElementById('backToLogin');
    const signUpLinkContainer = document.querySelector('.mt-6:not(#backToLogin)');
    const messageBox = document.getElementById('messageBox');
    
    document.querySelector('#login-container h1').textContent = 'Create Account';
    document.querySelector('#login-container p.text-gray-500').textContent = 'Join us to start tracking your finances';
    
    const passwordDiv = document.getElementById('password').closest('div');
    const emailInputDiv = document.querySelector('#loginForm div:has(input#email)');

    // 1. Add Name field (inserted before the email field)
    let nameDiv = document.getElementById('name-field');
    if (!nameDiv) {
        nameDiv = document.createElement('div');
        nameDiv.id = 'name-field';
        nameDiv.innerHTML = `
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
                type="text"
                id="name"
                name="name"
                placeholder="Enter your name"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 input-focus-teal transition duration-150 ease-in-out"
            >
        `;
        if (emailInputDiv) {
             emailInputDiv.before(nameDiv);
        }
    }
    
    // 2. Add Confirm Password Field
    let confirmPasswordDiv = document.getElementById('confirm-password-field');
    if (!confirmPasswordDiv) {
        confirmPasswordDiv = document.createElement('div');
        confirmPasswordDiv.innerHTML = `
            <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
                type="password"
                id="confirm-password"
                name="confirm-password"
                placeholder="Confirm your password"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 input-focus-teal transition duration-150 ease-in-out"
            >
        `;
        confirmPasswordDiv.id = 'confirm-password-field';
        passwordDiv.after(confirmPasswordDiv);
    }
    
    document.querySelector('#loginForm button[type="submit"]').textContent = 'Sign Up';
    form.classList.add('signup-form');
    
    backToLoginLink.classList.remove('hidden');
    signUpLinkContainer.classList.add('hidden');

    messageBox.classList.add('hidden');
}

window.showLogin = function() {
    const form = document.getElementById('loginForm');
    const backToLoginLink = document.getElementById('backToLogin');
    const signUpLinkContainer = document.querySelector('.mt-6:not(#backToLogin)');
    const messageBox = document.getElementById('messageBox');

    document.querySelector('#login-container h1').textContent = 'Welcome Back';
    document.querySelector('#login-container p.text-gray-500').textContent = 'Sign in to track your expenses';
    
    // 1. Remove Name Field
    const nameField = document.getElementById('name-field');
    if (nameField) {
        nameField.remove();
    }
    
    // 2. Remove Confirm Password Field
    const confirmPasswordField = document.getElementById('confirm-password-field');
    if (confirmPasswordField) {
        confirmPasswordField.remove();
    }
    
    document.querySelector('#loginForm button[type="submit"]').textContent = 'Sign In';
    form.classList.remove('signup-form');

    backToLoginLink.classList.add('hidden');
    signUpLinkContainer.classList.remove('hidden');
    
    messageBox.classList.add('hidden');
}

window.handleGoogleSignIn = function() {
    displayMessage("Simulating Google Sign-In... (Not implemented in this demo)", 'error');
    setTimeout(() => {
        document.getElementById('messageBox').classList.add('hidden');
    }, 3000);
}

// ----------------------------------------------------------------------
// --- APP DASHBOARD HELPER FUNCTIONS ---
// ----------------------------------------------------------------------

/**
 * Helper function to format numbers as Indian Rupee (₹).
 */
function formatCurrency(value) {
    if (value === null || value === undefined) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
}

// ----------------------------------------------------------------------
// --- APP DATA & UI CORE FUNCTIONS ---
// ----------------------------------------------------------------------

function loadData() {
    const savedState = localStorage.getItem('budgetPlannerState');
    if (savedState) {
        state = JSON.parse(savedState);
        state.transactions.forEach(trans => {
            trans.date = new Date(trans.date);
        });
        state.goals.forEach(goal => {
            goal.date = new Date(goal.date);
        });
    }
    // IMPORTANT: Recalculate 'saved' amounts for goals based on linked transactions on load
    state.goals = state.goals.map(goal => ({
        ...goal,
        saved: calculateGoalProgress(goal.id)
    }));
}

function saveData() {
    const transactionsWithStringDates = state.transactions.map(trans => ({
        ...trans,
        date: trans.date.toISOString()
    }));
    
    const goalsWithStringDates = state.goals.map(goal => ({
        ...goal,
        date: goal.date.toISOString()
    }));
    
    const stateToSave = {
        ...state,
        transactions: transactionsWithStringDates,
        goals: goalsWithStringDates
    };
    
    localStorage.setItem('budgetPlannerState', JSON.stringify(stateToSave));
}

function toggleTheme() {
    const themeToggle = document.getElementById('theme-icon');
    const body = document.body;
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggle.classList.remove('fa-sun');
        themeToggle.classList.add('fa-moon');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.classList.remove('fa-moon');
        themeToggle.classList.add('fa-sun');
    }
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    resetGoalFormListener();
    resetTransactionFormListener();
    resetCategoryFormListener(); 
}

function openModal(type) {
    resetGoalFormListener(); 
    resetTransactionFormListener();
    resetCategoryFormListener();
    
    closeModal(); 
    
    if (type === 'transaction') {
        prepareTransactionModal();
        document.getElementById('transaction-modal').classList.add('active');
    } else if (type === 'category') {
        prepareCategoryModal();
        document.getElementById('category-modal').classList.add('active');
    } else if (type === 'goal') {
        prepareGoalModal();
        document.getElementById('goal-modal').classList.add('active');
    }
}

function resetGoalFormListener() {
    const goalForm = document.getElementById('goal-form');
    if (currentEditGoalSubmitHandler) {
        goalForm.removeEventListener('submit', currentEditGoalSubmitHandler);
        currentEditGoalSubmitHandler = null;
    }
    goalForm.removeEventListener('submit', handleGoalSubmit); 
    goalForm.addEventListener('submit', handleGoalSubmit);
    goalForm.reset();
}

function resetTransactionFormListener() {
    const transactionForm = document.getElementById('transaction-form');
    if (currentEditTransactionSubmitHandler) {
        transactionForm.removeEventListener('submit', currentEditTransactionSubmitHandler);
        currentEditTransactionSubmitHandler = null;
    }
    transactionForm.removeEventListener('submit', handleTransactionSubmit); 
    transactionForm.addEventListener('submit', handleTransactionSubmit);
    transactionForm.reset();
}

function resetCategoryFormListener() {
    const categoryForm = document.getElementById('category-form');
    if (currentEditCategorySubmitHandler) {
        categoryForm.removeEventListener('submit', currentEditCategorySubmitHandler);
        currentEditCategorySubmitHandler = null;
    }
    categoryForm.removeEventListener('submit', handleCategorySubmit); 
    categoryForm.addEventListener('submit', handleCategorySubmit);
    categoryForm.reset();
}

function prepareTransactionModal() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trans-date').value = today;

    // Populate category dropdown
    const categorySelect = document.getElementById('trans-category');
    categorySelect.innerHTML = '';
    state.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });

    // Populate NEW Goal dropdown
    const goalSelect = document.getElementById('trans-goal');
    goalSelect.innerHTML = '<option value="">No Goal Contribution</option>';
    state.goals
        .filter(g => g.target > g.saved) // Only show incomplete goals
        .forEach(goal => {
            const option = document.createElement('option');
            option.value = goal.id;
            option.textContent = `${goal.name} (Target: ${formatCurrency(goal.target)})`;
            goalSelect.appendChild(option);
        });
    
    // Show/hide Goal dropdown based on type
    const transTypeSelect = document.getElementById('trans-type');
    transTypeSelect.addEventListener('change', function() {
        const goalGroup = document.getElementById('goal-selection-group');
        // Only show Goal option if transaction type is NOT an expense
        if (this.value === 'income' || this.value === '') { 
            goalGroup.style.display = 'block';
        } else {
            goalGroup.style.display = 'none';
            goalSelect.value = ''; // Reset selection
        }
    });

    // Initial check (in case modal opens with 'income' selected)
    const goalGroup = document.getElementById('goal-selection-group');
    if (transTypeSelect.value === 'income' || transTypeSelect.value === '') { 
         goalGroup.style.display = 'block';
    } else {
         goalGroup.style.display = 'none';
    }
}

function prepareCategoryModal() {
    document.getElementById('category-name').value = '';
    document.getElementById('category-budget').value = '';
    document.getElementById('category-icon').value = 'fa-utensils';
}

function prepareGoalModal() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthFormatted = nextMonth.toISOString().split('T')[0];
    
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-target').value = '';
    document.getElementById('goal-monthly-contribution').value = '0'; // NEW FIELD
    document.getElementById('goal-date').value = nextMonthFormatted;
}

// NEW: Calculates the current total saved for a specific goal
function calculateGoalProgress(goalId) {
    const contributions = state.transactions
        .filter(trans => trans.goalId === goalId)
        .reduce((sum, trans) => sum + trans.amount, 0);
    return contributions;
}

// NEW: Updates the actual 'saved' amount in the state for a specific goal
function updateGoalContribution(goalId) {
    const goalIndex = state.goals.findIndex(g => g.id === goalId);
    if (goalIndex !== -1) {
        state.goals[goalIndex].saved = calculateGoalProgress(goalId);
        // Ensure goal is marked complete if target is reached
        if (state.goals[goalIndex].saved >= state.goals[goalIndex].target) {
            displayMessage(`Congratulations! Goal "${state.goals[goalIndex].name}" completed!`, 'success');
        }
    }
}


function handleTransactionSubmit(e) {
    e.preventDefault();
    const transactionForm = document.getElementById('transaction-form');
    
    const type = document.getElementById('trans-type').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const description = document.getElementById('trans-description').value;
    const categoryId = parseInt(document.getElementById('trans-category').value);
    const date = new Date(document.getElementById('trans-date').value); 
    const goalId = document.getElementById('trans-goal').value ? parseInt(document.getElementById('trans-goal').value) : null;
    
    const category = state.categories.find(cat => cat.id === categoryId);

    if (goalId && type === 'expense') {
        displayMessage("Goal contributions should be linked to Income or a specific Savings transfer transaction.", 'error');
        return;
    }
    
    const newTransaction = {
        id: Date.now(),
        type,
        amount,
        description,
        category: category.name,
        categoryId,
        date,
        icon: category.icon,
        goalId: goalId // NEW
    };
    
    state.transactions.push(newTransaction);

    if (goalId) {
        updateGoalContribution(goalId);
    }
    
    saveData();
    
    closeModal();
    updateSummaryCards();
    renderRecentTransactions();
    renderTransactionsTable();
    renderCharts();
    renderGoals(); // RENDER GOALS to update progress
    
    transactionForm.reset();
}

function handleCategorySubmit(e) {
    e.preventDefault();
    const categoryForm = document.getElementById('category-form');
    
    const name = document.getElementById('category-name').value;
    const budget = parseFloat(document.getElementById('category-budget').value);
    const icon = document.getElementById('category-icon').value;
    
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#00CC99', '#FF9F40'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const newCategory = {
        id: Date.now(),
        name,
        budget,
        icon,
        color
    };
    
    state.categories.push(newCategory);
    saveData();
    
    closeModal();
    renderCategories();
    renderCharts();
    
    categoryForm.reset();
}

function handleGoalSubmit(e) {
    e.preventDefault();
    const goalForm = document.getElementById('goal-form');
    
    const name = document.getElementById('goal-name').value;
    const target = parseFloat(document.getElementById('goal-target').value);
    const date = new Date(document.getElementById('goal-date').value);
    const monthlyContribution = parseFloat(document.getElementById('goal-monthly-contribution').value);
    
    const newGoal = {
        id: Date.now(),
        name,
        target,
        saved: calculateGoalProgress(Date.now()),
        monthlyContribution,
        date
    };
    
    state.goals.push(newGoal);
    saveData();
    
    closeModal();
    renderGoals();
    
    goalForm.reset();
}

function updateSummaryCards() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyTransactions = state.transactions.filter(trans => {
        return trans.date.getMonth() === currentMonth && trans.date.getFullYear() === currentYear;
    });
    
    const income = monthlyTransactions
        .filter(trans => trans.type === 'income')
        .reduce((sum, trans) => sum + trans.amount, 0);
    
    const expenses = monthlyTransactions
        .filter(trans => trans.type === 'expense')
        .reduce((sum, trans) => sum + trans.amount, 0);
    
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0;
    
    document.getElementById('total-balance').textContent = formatCurrency(balance);
    document.getElementById('monthly-income').textContent = formatCurrency(income);
    document.getElementById('monthly-expenses').textContent = formatCurrency(expenses);
    document.getElementById('savings-rate').textContent = `${savingsRate}%`;
    
    const changeElement = document.querySelector('#total-balance + .change');
    if (changeElement) { 
        if (balance > 0) {
            changeElement.classList.add('positive');
            changeElement.classList.remove('negative');
        } else if (balance < 0) {
            changeElement.classList.add('negative');
            changeElement.classList.remove('positive');
        } else {
            changeElement.classList.remove('positive', 'negative');
        }
    }
}

function renderRecentTransactions() {
    const container = document.getElementById('recent-transactions');
    container.innerHTML = '';
    
    const recentTransactions = [...state.transactions]
        .sort((a, b) => b.date - a.date)
        .slice(0, 5);
    
    if (recentTransactions.length === 0) {
        container.innerHTML = '<p class="no-transactions">No transactions yet. Add your first transaction!</p>';
        return;
    }
    
    recentTransactions.forEach(trans => {
        const transactionEl = document.createElement('div');
        transactionEl.className = 'transaction-item';
        
        const category = state.categories.find(cat => cat.id === trans.categoryId);
        
        transactionEl.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-icon">
                    <i class="fas ${trans.icon || 'fa-money-bill-wave'}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${trans.description}</h4>
                    <p>${category?.name || trans.category} • ${formatDate(trans.date)}</p>
                </div>
            </div>
            <div class="transaction-amount ${trans.type}">
                ${trans.type === 'income' ? '+' : '-'}₹${formatCurrency(trans.amount).replace('₹', '')}
            </div>
        `;
        
        container.appendChild(transactionEl);
    });
}

function renderTransactionsTable() {
    const container = document.getElementById('transactions-list');
    container.innerHTML = '';
    
    const typeFilter = document.getElementById('transaction-type').value;
    const categoryFilter = document.getElementById('transaction-category').value;
    const monthFilter = document.getElementById('transaction-month').value;
    
    const categorySelect = document.getElementById('transaction-category');
    categorySelect.querySelectorAll('option:not(:first-child)').forEach(option => option.remove()); 
    
    state.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
    
    const monthSelect = document.getElementById('transaction-month');
    monthSelect.querySelectorAll('option:not(:first-child)').forEach(option => option.remove()); 

    const months = {}; 
    state.transactions
        .sort((a, b) => b.date - a.date) 
        .forEach(trans => {
            const monthYear = `${trans.date.getFullYear()}-${trans.date.getMonth()}`;
            if (!months[monthYear]) {
                months[monthYear] = true;
                
                const option = document.createElement('option');
                option.value = monthYear;
                option.textContent = `${getMonthName(trans.date.getMonth())} ${trans.date.getFullYear()}`;
                monthSelect.appendChild(option);
            }
        });
    
    let filteredTransactions = [...state.transactions];
    
    if (typeFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(trans => trans.type === typeFilter);
    }
    
    if (categoryFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(trans => trans.categoryId === parseInt(categoryFilter));
    }
    
    if (monthFilter !== 'all') {
        const [year, month] = monthFilter.split('-').map(Number);
        filteredTransactions = filteredTransactions.filter(trans => {
            return trans.date.getFullYear() === year && trans.date.getMonth() === month; 
        });
    }
    
    filteredTransactions.sort((a, b) => b.date - a.date);
    
    if (filteredTransactions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="no-transactions">No transactions found matching your filters.</td>
            </tr>
        `;
        return;
    }
    
    filteredTransactions.forEach(trans => {
        const row = document.createElement('tr');
        const category = state.categories.find(cat => cat.id === trans.categoryId);
        
        row.innerHTML = `
            <td>${formatDate(trans.date)}</td>
            <td>${trans.description}</td>
            <td>
                <i class="fas ${trans.icon || 'fa-money-bill-wave'}"></i>
                ${category?.name || trans.category}
            </td>
            <td>
                <span class="badge ${trans.type === 'income' ? 'income' : 'expense'}">
                    ${trans.type === 'income' ? 'Income' : 'Expense'}
                </span>
            </td>
            <td class="${trans.type === 'income' ? 'income' : 'expense'}">
                ${trans.type === 'income' ? '+' : '-'} ${formatCurrency(trans.amount)}
            </td>
            <td class="action-buttons">
                <button class="action-btn edit-btn" data-id="${trans.id}" title="Edit Transaction">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${trans.id}" title="Delete Transaction">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        container.appendChild(row);
    });
}

function editTransaction(id) {
    const transaction = state.transactions.find(trans => trans.id === id);
    if (!transaction) return;
    const transactionForm = document.getElementById('transaction-form');
    
    openModal('transaction'); 
    
    document.getElementById('trans-type').value = transaction.type;
    document.getElementById('trans-amount').value = transaction.amount;
    document.getElementById('trans-description').value = transaction.description;
    document.getElementById('trans-category').value = transaction.categoryId;
    document.getElementById('trans-date').value = transaction.date.toISOString().split('T')[0]; 
    
    const goalSelect = document.getElementById('trans-goal');
    goalSelect.value = transaction.goalId || '';
    
    currentEditTransactionSubmitHandler = function handleEditSubmit(e) {
        e.preventDefault();
        
        const oldGoalId = transaction.goalId;

        transaction.type = document.getElementById('trans-type').value;
        transaction.amount = parseFloat(document.getElementById('trans-amount').value);
        transaction.description = document.getElementById('trans-description').value;
        transaction.categoryId = parseInt(document.getElementById('trans-category').value);
        transaction.date = new Date(document.getElementById('trans-date').value);
        transaction.goalId = document.getElementById('trans-goal').value ? parseInt(document.getElementById('trans-goal').value) : null;
        
        const category = state.categories.find(cat => cat.id === transaction.categoryId);
        if (category) {
            transaction.category = category.name;
            transaction.icon = category.icon;
        }

        if (oldGoalId) updateGoalContribution(oldGoalId);
        if (transaction.goalId) updateGoalContribution(transaction.goalId);
        
        saveData();
        
        closeModal(); 
        updateSummaryCards();
        renderRecentTransactions();
        renderTransactionsTable();
        renderCharts();
        renderGoals();
    };

    transactionForm.removeEventListener('submit', handleTransactionSubmit);
    transactionForm.addEventListener('submit', currentEditTransactionSubmitHandler);
}

function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        const transaction = state.transactions.find(trans => trans.id === id);
        const goalId = transaction.goalId;

        state.transactions = state.transactions.filter(trans => trans.id !== id);
        
        if (goalId) updateGoalContribution(goalId);

        saveData();
        
        updateSummaryCards();
        renderRecentTransactions();
        renderTransactionsTable();
        renderCharts();
        renderGoals();
    }
}

function renderCategories() {
    const container = document.getElementById('budget-categories');
    container.innerHTML = '';
    const budgetCategoriesContainer = document.getElementById('budget-categories');

    if (state.categories.length === 0) {
        container.innerHTML = '<p class="no-categories">No categories yet. Add your first category!</p>';
        return;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const categorySpending = {};
    state.transactions
        .filter(trans => trans.type === 'expense' &&
            trans.date.getMonth() === currentMonth &&
            trans.date.getFullYear() === currentYear)
        .forEach(trans => {
            const categoryId = parseInt(trans.categoryId); 
            if (!categorySpending[categoryId]) {
                categorySpending[categoryId] = 0;
            }
            categorySpending[categoryId] += trans.amount;
        });

    state.categories.forEach(category => {
        if (category.name === 'Income') return; 

        const spent = categorySpending[category.id] || 0;
        const percentage = category.budget > 0 ? Math.min((spent / category.budget) * 100, 100) : 0;
        const remaining = category.budget - spent;

        const categoryEl = document.createElement('div');
        categoryEl.className = 'budget-category';

        categoryEl.innerHTML = `
            <div class="budget-category-header">
                <div class="budget-icon" style="background-color: ${category.color || '#4361ee'}">
                    <i class="fas ${category.icon}"></i>
                </div>
                <div class="budget-title">
                    <h3>${category.name}</h3>
                    <p>Budget: ${formatCurrency(category.budget)}</p>
                </div>
                <div class="category-actions">
                    <button class="edit-category-btn" data-id="${category.id}" title="Edit Category">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-category-btn" data-id="${category.id}" title="Delete Category">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="budget-amount">
                Spent: ${formatCurrency(spent)} / Remaining: 
                ${formatCurrency(remaining)}
            </div>
            <div class="budget-progress">
                <div class="budget-progress-bar" style="width: ${percentage}%; background-color: ${category.color || '#4361ee'}"></div>
            </div>
            <div class="budget-stats">
                <span>${percentage.toFixed(0)}% of budget</span>
                <span class="${remaining < 0 ? 'negative-text' : ''}">${formatCurrency(remaining)} left</span>
            </div>
        `;

        container.appendChild(categoryEl);
    });
}

function editCategory(id) {
    const category = state.categories.find(cat => cat.id === id);
    if (!category) return;
    const categoryForm = document.getElementById('category-form');

    openModal('category'); 

    document.getElementById('category-name').value = category.name;
    document.getElementById('category-budget').value = category.budget;
    document.getElementById('category-icon').value = category.icon;

    categoryForm.removeEventListener('submit', handleCategorySubmit); 

    currentEditCategorySubmitHandler = function handleCategoryEdit(e) {
        e.preventDefault();

        category.name = document.getElementById('category-name').value;
        category.budget = parseFloat(document.getElementById('category-budget').value);
        category.icon = document.getElementById('category-icon').value;

        saveData();
        
        closeModal();
        renderCategories();
        renderCharts();
    };
    categoryForm.addEventListener('submit', currentEditCategorySubmitHandler);
}

function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category? This will also remove all associated transactions.')) {
        state.categories = state.categories.filter(cat => cat.id !== id);
        state.transactions = state.transactions.filter(trans => trans.categoryId !== id);

        saveData();
        renderCategories();
        renderTransactionsTable();
        renderCharts();
    }
}

function renderGoals() {
    const container = document.getElementById('savings-goals');
    container.innerHTML = '';
    const goalsContainer = document.getElementById('savings-goals');
    
    if (state.goals.length === 0) {
        container.innerHTML = '<p class="no-goals">No savings goals yet. Add your first goal!</p>';
        return;
    }
    
    state.goals.forEach(goal => {
        const percentage = (goal.saved / goal.target) * 100;
        const remainingToSave = goal.target - goal.saved;
        const daysLeft = Math.ceil(Math.max(0, (new Date(goal.date) - new Date()) / (1000 * 60 * 60 * 24)));
        const monthsLeft = daysLeft / 30.44; 

        let statusText = 'On Track';
        let statusColor = '#10b981'; 
        const requiredMonthlySaving = remainingToSave / monthsLeft;

        if (goal.saved >= goal.target) {
            statusText = 'Completed!';
            statusColor = '#059669';
        } else if (monthsLeft <= 0) {
            statusText = 'Overdue';
            statusColor = '#f94144'; 
        } else if (goal.monthlyContribution > 0 && goal.monthlyContribution < requiredMonthlySaving) {
             statusText = 'Behind Schedule';
             statusColor = '#f59e0b'; 
        } else if (goal.monthlyContribution === 0 && remainingToSave > 0) {
             statusText = 'Needs Contribution';
             statusColor = '#ef4444'; 
        }


        const goalEl = document.createElement('div');
        goalEl.className = 'goal-card';
        goalEl.style.borderLeft = `4px solid ${statusColor}`;

        goalEl.innerHTML = `
            <div class="goal-header">
                <div class="goal-title">
                    <h3>${goal.name}</h3>
                    <p>Target: ${formatCurrency(goal.target)}</p>
                </div>
                <div class="goal-actions">
                    <button class="action-btn edit-goal-btn" data-id="${goal.id}" title="Edit Goal">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-goal-btn" data-id="${goal.id}" title="Delete Goal">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="goal-amount-status">
                <span class="goal-saved-amount">Saved: ${formatCurrency(goal.saved)}</span>
                <span class="goal-percentage">${percentage.toFixed(1)}%</span>
            </div>
            <div class="goal-progress">
                <div class="goal-progress-bar" style="width: ${Math.min(percentage, 100)}%; background-color: ${statusColor}"></div>
            </div>
            <div class="goal-details">
                <span class="goal-status" style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
                <span class="goal-date">Target Date: ${formatDate(goal.date)}</span>
            </div>
        `;
        
        container.appendChild(goalEl);
    });
}

function editGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;
    const goalForm = document.getElementById('goal-form');

    openModal('goal'); 

    document.getElementById('goal-name').value = goal.name;
    document.getElementById('goal-target').value = goal.target;
    document.getElementById('goal-monthly-contribution').value = goal.monthlyContribution;
    document.getElementById('goal-date').value = goal.date.toISOString().split('T')[0];
    
    goalForm.removeEventListener('submit', handleGoalSubmit); 

    currentEditGoalSubmitHandler = function handleGoalEdit(e) {
        e.preventDefault();

        goal.name = document.getElementById('goal-name').value;
        goal.target = parseFloat(document.getElementById('goal-target').value);
        goal.monthlyContribution = parseFloat(document.getElementById('goal-monthly-contribution').value);
        goal.date = new Date(document.getElementById('goal-date').value);
        
        saveData();
        
        closeModal();
        renderGoals();
    };
    goalForm.addEventListener('submit', currentEditGoalSubmitHandler);
}

function deleteGoal(id) {
    if (confirm('Are you sure you want to delete this savings goal? All associated transaction links will be cleared.')) {
        state.transactions.forEach(trans => {
            if (trans.goalId === id) {
                trans.goalId = null; 
            }
        });
        
        state.goals = state.goals.filter(g => g.id !== id);
        
        saveData();
        renderGoals();
    }
}


function renderCharts() {
    renderCategoryChart();
    renderMonthlyChart();
    renderIncomeExpenseChart();
    renderTrendsChart();
    renderTopExpenses();
    renderCategoryBreakdown();
}

function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const categorySpending = {};
    state.transactions
        .filter(trans => trans.type === 'expense' && 
            trans.date.getMonth() === currentMonth && 
            trans.date.getFullYear() === currentYear)
        .forEach(trans => {
            if (!categorySpending[trans.categoryId]) {
                categorySpending[trans.categoryId] = 0;
            }
            categorySpending[trans.categoryId] += trans.amount;
        });
    
    const categories = state.categories.filter(cat => cat.name !== 'Income');
    const labels = categories.map(cat => cat.name);
    const data = categories.map(cat => categorySpending[cat.id] || 0);
    const backgroundColors = categories.map(cat => cat.color || '#4361ee');
    
    if (categoryChart) {
        categoryChart.destroy();
    }

    const totalSpending = data.reduce((sum, val) => sum + val, 0);
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            aspectRatio: 1.5,
            // FIX: Added animation block to restore the visual sweep
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000, 
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { 
                    position: 'right',
                    labels: {
                        font: {
                            family: 'Poppins',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = totalSpending > 0 ? ((value / totalSpending) * 100).toFixed(1) : 0;
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                },
                title: {
                    display: totalSpending === 0,
                    text: 'No expenses recorded this month.',
                    font: { size: 14 }
                }
            }
        }
    });
}

function renderMonthlyChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    const monthlyData = {};
    
    state.transactions.forEach(trans => {
        const monthYear = `${trans.date.getFullYear()}-${trans.date.getMonth()}`;
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
                income: 0, expenses: 0, month: trans.date.getMonth(), year: trans.date.getFullYear()
            };
        }
        if (trans.type === 'income') {
            monthlyData[monthYear].income += trans.amount;
        } else {
            monthlyData[monthYear].expenses += trans.amount;
        }
    });

    const sortedMonths = Object.values(monthlyData).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });
    
    const last6Months = sortedMonths.slice(-6);
    const labels = last6Months.map(month => 
        `${getMonthName(month.month)} ${month.year.toString().slice(2)}`
    );
    const incomeData = last6Months.map(month => month.income);
    const expensesData = last6Months.map(month => month.expenses);
    
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Income', data: incomeData, backgroundColor: '#4cc9f0', borderColor: '#4cc9f0', borderWidth: 1 },
                { label: 'Expenses', data: expensesData, backgroundColor: '#f94144', borderColor: '#f94144', borderWidth: 1 }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    // NEW: Add currency formatting to Y-axis
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value).replace('₹', '₹');
                        },
                        font: { family: 'Poppins' }
                    },
                    grid: { drawOnChartArea: false }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Poppins' } }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { font: { family: 'Poppins' } } },
                tooltip: {
                    callbacks: {
                        // NEW: Add currency formatting to tooltips
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${formatCurrency(value)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
    const monthTransactions = state.transactions.filter(trans => {
        return trans.date.getMonth() === state.currentMonth && trans.date.getFullYear() === state.currentYear;
    });
    
    const income = monthTransactions
        .filter(trans => trans.type === 'income').reduce((sum, trans) => sum + trans.amount, 0);
    const expenses = monthTransactions
        .filter(trans => trans.type === 'expense').reduce((sum, trans) => sum + trans.amount, 0);
    
    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }
    
    incomeExpenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [income, expenses],
                backgroundColor: ['#4cc9f0', '#f94144'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            // FIX: Added animation block to restore the visual sweep
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000, 
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderTrendsChart() {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    const monthlyTrendsMap = {};

    state.transactions.forEach(trans => {
        const dateKey = `${trans.date.getFullYear()}-${trans.date.getMonth()}`;
        if (!monthlyTrendsMap[dateKey]) {
             monthlyTrendsMap[dateKey] = {
                month: trans.date.getMonth(), year: trans.date.getFullYear(), income: 0, expenses: 0, balance: 0,
                label: `${getMonthName(trans.date.getMonth())} ${trans.date.getFullYear().toString().slice(2)}`
            };
        }
        if (trans.type === 'income') {
            monthlyTrendsMap[dateKey].income += trans.amount;
        } else {
            monthlyTrendsMap[dateKey].expenses += trans.amount;
        }
    });

    const monthlyTrends = Object.values(monthlyTrendsMap).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    }).map(monthData => ({ ...monthData, balance: monthData.income - monthData.expenses }));
    
    const last12Months = monthlyTrends.slice(-12);
    const labels = last12Months.map(month => month.label);
    const incomeData = last12Months.map(month => month.income);
    const expensesData = last12Months.map(month => month.expenses);
    const balanceData = last12Months.map(month => month.balance);
    
    // Check if a chart already exists on this canvas and destroy it safely
    if (trendsChart) {
        trendsChart.destroy();
    }
    
    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'Income', 
                    data: incomeData, 
                    backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                    borderColor: '#10b981', 
                    borderWidth: 2, 
                    tension: 0.4, 
                    fill: true, 
                    // FIX: Hides the dots to match the smooth look
                    pointRadius: 0, 
                    pointHitRadius: 5 // Keep hit area visible for tooltips
                },
                { 
                    label: 'Expenses', 
                    data: expensesData, 
                    backgroundColor: 'rgba(239, 68, 68, 0.2)', 
                    borderColor: '#ef4444', 
                    borderWidth: 2, 
                    tension: 0.4, 
                    fill: true, 
                    // FIX: Hides the dots
                    pointRadius: 0,
                    pointHitRadius: 5
                },
                { 
                    label: 'Balance', 
                    data: balanceData, 
                    backgroundColor: 'rgba(75, 192, 192, 0.2)', 
                    borderColor: '#4bc0c0', 
                    borderWidth: 3, 
                    tension: 0.4, 
                    fill: false, 
                    // FIX: Hides the dots
                    pointRadius: 0, 
                    pointHitRadius: 5,
                    borderDash: [5, 5],
                    // Fix for legend: uses a line segment instead of a dot for Balance
                    pointStyle: 'line' 
                } 
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Ensures chart fills its container size
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value).replace('₹', '₹');
                        },
                        font: { family: 'Poppins' }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Poppins' } }
                }
            },
            plugins: {
                legend: { 
                    position: 'top', 
                    labels: { 
                        font: { family: 'Poppins' },
                        // NEW: Ensure legend displays the correct style (line for balance)
                        usePointStyle: true,
                        // Set specific box style for Balance line to show the dash
                        generateLabels: function(chart) {
                            const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                            // Customization for the Balance line's legend item
                            if (labels.length > 2) {
                                labels[2].fillStyle = 'rgba(0, 0, 0, 0)'; 
                                labels[2].strokeStyle = '#4bc0c0';
                                labels[2].lineWidth = 3;
                                labels[2].lineDash = [5, 5];
                                labels[2].pointStyle = false; 
                            }
                            return labels;
                        }
                    } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${formatCurrency(value)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderTopExpenses() {
    const container = document.getElementById('top-expenses');
    container.innerHTML = '';
    const monthExpenses = state.transactions.filter(trans => {
        return trans.date.getMonth() === state.currentMonth && trans.date.getFullYear() === state.currentYear;
    });
    const sortedExpenses = [...monthExpenses].sort((a, b) => b.amount - a.amount);
    const topExpenses = sortedExpenses.slice(0, 5);
    
    if (topExpenses.length === 0) {
        container.innerHTML = '<li>No expenses this month</li>';
        return;
    }
    
    topExpenses.forEach(expense => {
        const li = document.createElement('li');
        const category = state.categories.find(cat => cat.id === expense.categoryId);
        li.innerHTML = `
            <span>
                <i class="fas ${expense.icon || 'fa-money-bill-wave'}"></i>
                ${expense.description} (${category?.name || expense.category})
            </span>
            <span class="expense">${formatCurrency(expense.amount)}</span>
        `;
        container.appendChild(li);
    });
}

function renderCategoryBreakdown() {
    const container = document.getElementById('category-breakdown');
    container.innerHTML = '';
    const monthExpenses = state.transactions.filter(trans => {
        return trans.type === 'expense' && trans.date.getMonth() === state.currentMonth && trans.date.getFullYear() === state.currentYear;
    });
    
    const totalExpenses = monthExpenses.reduce((sum, trans) => sum + trans.amount, 0);
    const categoryTotals = {};
    monthExpenses.forEach(expense => {
        if (!categoryTotals[expense.categoryId]) {
            categoryTotals[expense.categoryId] = 0;
        }
        categoryTotals[expense.categoryId] += expense.amount;
    });
    
    const categoryArray = Object.entries(categoryTotals)
        .map(([categoryId, amount]) => {
            const category = state.categories.find(cat => cat.id === parseInt(categoryId));
            return {
                name: category?.name || 'Unknown', amount,
                percentage: totalExpenses > 0 ? (amount / totalExpenses * 100) : 0,
                color: category?.color || '#4361ee'
            };
        })
        .sort((a, b) => b.amount - a.amount);
    
    if (categoryArray.length === 0) {
        container.innerHTML = '<li>No expenses this month</li>';
        return;
    }
    
    categoryArray.forEach(category => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>
                <span class="color-indicator" style="background-color: ${category.color}"></span>
                ${category.name}
            </span>
            <span>${category.percentage.toFixed(1)}% (${formatCurrency(category.amount)})</span>
        `;
        container.appendChild(li);
    });
}

function setCurrentMonthYear() {
    const monthName = getMonthName(state.currentMonth);
    document.getElementById('current-month').textContent = `${monthName} ${state.currentYear}`;
}

function renderDashboard() {
    updateSummaryCards();
    renderRecentTransactions();
    // Charts are rendered by showDashboard timeout
    
    // NEW: Update username on dashboard
    const stored = localStorage.getItem('userCredentials');
    if (stored) {
        const user = JSON.parse(stored);
        if (user.name) {
            // Displays the first name only, e.g., "Welcome, Alex!"
            document.querySelector('.user-profile h3').textContent = `Welcome, ${user.name.split(' ')[0]}!`;
        } else {
             document.querySelector('.user-profile h3').textContent = `Welcome!`;
        }
    }
}

function handleTransactionAction(e) {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
        const id = parseInt(editBtn.dataset.id);
        editTransaction(id);
    }

    if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        deleteTransaction(id);
    }
}
function handleCategoryAction(e) {
    const editBtn = e.target.closest('.edit-category-btn');
    const deleteBtn = e.target.closest('.delete-category-btn');

    if (editBtn) {
        const id = parseInt(editBtn.dataset.id);
        editCategory(id);
    }

    if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        deleteCategory(id);
    }
}

function handleGoalAction(e) {
    const editBtn = e.target.closest('.edit-goal-btn');
    const deleteBtn = e.target.closest('.delete-goal-btn');

    if (editBtn) {
        const id = parseInt(editBtn.dataset.id);
        editGoal(id);
    }

    if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        deleteGoal(id);
    }
}


function setupEventListeners() {
    const navItems = document.querySelectorAll('.main-nav li');
    const contentSections = document.querySelectorAll('.content-section');
    const transactionsListContainer = document.getElementById('transactions-list'); 
    const budgetCategoriesContainer = document.getElementById('budget-categories');
    const goalsContainer = document.getElementById('savings-goals'); 
    const transactionForm = document.getElementById('transaction-form');
    const categoryForm = document.getElementById('category-form');
    const goalForm = document.getElementById('goal-form');

    document.getElementById('theme-icon').addEventListener('click', toggleTheme);
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const section = item.getAttribute('data-section');
            contentSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(section).classList.add('active');
            
            if (section === 'transactions') { renderTransactionsTable(); } 
            else if (section === 'budgets') { renderCategories(); } 
            else if (section === 'reports') { renderCharts(); } 
            else if (section === 'goals') { renderGoals(); }
        });
    });
    
    document.getElementById('add-transaction').addEventListener('click', () => openModal('transaction'));
    document.getElementById('add-category').addEventListener('click', () => openModal('category'));
    document.getElementById('add-goal').addEventListener('click', () => openModal('goal'));
    document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) { closeModal(); }
    });
    
    transactionForm.addEventListener('submit', handleTransactionSubmit);
    categoryForm.addEventListener('submit', handleCategorySubmit);
    goalForm.addEventListener('submit', handleGoalSubmit);

    transactionsListContainer.addEventListener('click', handleTransactionAction);
    budgetCategoriesContainer.addEventListener('click', handleCategoryAction);
    goalsContainer.addEventListener('click', handleGoalAction);
    
    document.getElementById('prev-month').addEventListener('click', () => {
        if (state.currentMonth === 0) { state.currentMonth = 11; state.currentYear--; } 
        else { state.currentMonth--; }
        setCurrentMonthYear(); renderCharts();
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        if (state.currentMonth === 11) { state.currentMonth = 0; state.currentYear++; } 
        else { state.currentMonth++; }
        setCurrentMonthYear(); renderCharts();
    });
    
    document.getElementById('transaction-type').addEventListener('change', renderTransactionsTable);
    document.getElementById('transaction-category').addEventListener('change', renderTransactionsTable);
    document.getElementById('transaction-month').addEventListener('change', renderTransactionsTable);
}


function init() {
    loadData();
    setupEventListeners();
    // FIX: Render categories and set month, but DON'T render charts here 
    // because the canvas may still be hidden/unmeasured.
    renderCategories(); 
    setCurrentMonthYear();
}


// --- DOMContentLoaded for initial setup and Login/Signup form handling ---
document.addEventListener('DOMContentLoaded', function() {
    
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    checkLoginStatus();

    // Handle form submission (Login/Sign Up)
    form.addEventListener('submit', function(event) {
        event.preventDefault(); 
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (email === '' || password === '') {
            displayMessage("Please enter both email and password.", 'error');
            return;
        }
        
        if (form.classList.contains('signup-form')) {
            // --- SIGN UP LOGIC (User Registration) ---
            const nameInput = document.getElementById('name');
            const name = nameInput ? nameInput.value.trim() : 'User'; // Safely get name
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (password !== confirmPassword) {
                displayMessage('Passwords do not match.', 'error');
                return;
            }
            
            const existingUser = getStoredUser();

            if (existingUser) {
                 displayMessage('An account is already registered. Please sign in or clear local storage to register a new user.', 'error');
                 return;
            }

            // Register the user and save credentials, including NAME
            registerUser(name, email, password); 
            
            displayMessage(`Account created for ${name}! You can now sign in with your new credentials.`, 'success');
            
            emailInput.value = '';
            passwordInput.value = '';
            const confirmPasswordField = document.getElementById('confirm-password');
            if (confirmPasswordField) {
                 confirmPasswordField.value = '';
            }
            
            setTimeout(showLogin, 2000); 

        } else {
            // --- SIGN IN LOGIC (User Authentication) ---
            
            if (verifyCredentials(email, password)) {
                
                displayMessage("Sign In Successful! Loading your dashboard...", 'success');
                
                setTimeout(() => {
                    document.getElementById('messageBox').classList.add('hidden');
                    emailInput.value = '';
                    passwordInput.value = '';
                    showDashboard(); 
                }, 1000); 
            } else {
                if (!getStoredUser()) {
                    displayMessage(`No account registered. Please sign up first.`, 'error');
                } else {
                    displayMessage(`Invalid email or password.`, 'error');
                }
            }
        }
    });

});